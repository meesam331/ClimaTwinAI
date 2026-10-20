import json
import math
import os
import time
from pathlib import Path
from urllib.parse import urlencode

import requests
from flask import Flask, jsonify, request
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = Flask(__name__)
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "openai/gpt-oss-120b")
try:
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
except ValueError as error:
    raise RuntimeError("FLASK_PORT must be a valid port number.") from error
if not 1 <= FLASK_PORT <= 65535:
    raise RuntimeError("FLASK_PORT must be between 1 and 65535.")

FALLBACK_ANALYSIS = {
    "climate_score": 72,
    "leed_level": "Gold",
    "carbon_kg_per_year": 1100,
    "solar_kw": 4.2,
    "water_litres": 22000,
    "ventilation_comment": "Wind is 90 deg, ideal for cross ventilation",
    "top_3_problems": [
        "Concrete roof heat trap",
        "Low tree cover",
        "High carbon material",
    ],
    "top_3_fixes": [
        {"fix": "Green Roof System", "score_gain": "+15%", "saving": "Rs 45000/year"},
        {"fix": "3 Neem Trees Plantation", "score_gain": "+10%", "saving": "Rs 12000/year"},
        {"fix": "White Reflective Paint", "score_gain": "+8%", "saving": "Rs 18000/year"},
    ],
    "risk_2050": "In 2050 Islamabad +2.5C, AC cost +35%",
}


def get_weather_free(city):
    """Fetch current conditions from the existing keyless Open-Meteo flow."""
    geocode_query = urlencode({
        "name": city,
        "count": 1,
        "language": "en",
        "format": "json",
        "countryCode": "PK",
    })
    geocode_url = "https://geocoding-api.open-meteo.com/v1/search?" + geocode_query
    geocode_response = requests.get(
        geocode_url, headers={"User-Agent": "ClimatePermit/1.0"}, timeout=25
    )
    geocode_response.raise_for_status()
    places = geocode_response.json().get("results") or []
    if not places:
        raise ValueError("Open-Meteo could not find this place in Pakistan.")

    place = places[0]
    weather_query = urlencode({
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature",
        "timezone": place.get("timezone") or "auto",
    })
    weather_url = "https://api.open-meteo.com/v1/forecast?" + weather_query
    weather_response = requests.get(
        weather_url, headers={"User-Agent": "ClimatePermit/1.0"}, timeout=25
    )
    weather_response.raise_for_status()
    return weather_response.json()


def _get_weather_with_retry(city):
    for attempt in range(3):
        try:
            return get_weather_free(city)
        except requests.HTTPError as error:
            response = error.response
            status_code = response.status_code if response is not None else None
            if status_code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
            delay = 0.5 * (2 ** attempt)
            app.logger.warning(
                "Open-Meteo returned HTTP %s; retrying in %.1f seconds",
                status_code,
                delay,
            )
            time.sleep(delay)


def get_nasa_power_data(lat, lon):
    url = (
        "https://power.larc.nasa.gov/api/temporal/monthly/point"
        "?parameters=ALLSKY_SFC_SW_DWN,PRECTOTCORR,T2M&community=RE"
        "&longitude={}&latitude={}&format=JSON&start=2023&end=2024"
    ).format(lon, lat)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def get_geocode(city):
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": city, "format": "json", "limit": 1},
        headers={"User-Agent": "ClimaTwinAI"},
        timeout=20,
    )
    response.raise_for_status()
    matches = response.json()
    if not matches:
        raise ValueError("OpenStreetMap could not find this location.")
    return {
        "latitude": float(matches[0]["lat"]),
        "longitude": float(matches[0]["lon"]),
        "display_name": matches[0].get("display_name", city),
    }


def _monthly_average(nasa, parameter):
    values = nasa.get("properties", {}).get("parameter", {}).get(parameter, {})
    valid = [
        number for value in values.values()
        if value not in (-999, "-999")
        for number in (float(value),)
        if math.isfinite(number)
    ]
    return round(sum(valid) / len(valid), 2) if valid else None


def _complete_analysis(result):
    if not isinstance(result, dict):
        result = {}

    completed = dict(FALLBACK_ANALYSIS)
    completed.update(result)
    for key, default in (
        ("climate_score", 72),
        ("carbon_kg_per_year", 1100),
        ("solar_kw", 4.2),
        ("water_litres", 22000),
    ):
        try:
            numeric_value = float(completed[key])
            if not math.isfinite(numeric_value):
                raise ValueError
            completed[key] = (
                max(0, min(100, round(numeric_value)))
                if key == "climate_score"
                else max(0, round(numeric_value, 2) if key == "solar_kw" else round(numeric_value))
            )
        except (TypeError, ValueError, OverflowError):
            completed[key] = default

    leed_value = str(completed.get("leed_level", "")).casefold()
    completed["leed_level"] = next(
        (level for level in ("Platinum", "Gold", "Silver", "Certified", "Uncertified")
         if level.casefold() in leed_value),
        "Uncertified",
    )

    problems = completed.get("top_3_problems")
    if not isinstance(problems, list):
        problems = []
    completed["top_3_problems"] = [
        problem if isinstance(problem, str) else json.dumps(problem, ensure_ascii=False)
        for problem in problems[:3]
    ]
    completed["top_3_problems"].extend(
        FALLBACK_ANALYSIS["top_3_problems"][len(completed["top_3_problems"]):3]
    )

    fixes = completed.get("top_3_fixes")
    if not isinstance(fixes, list):
        fixes = []
    normalized_fixes = []
    for index, item in enumerate(fixes[:3]):
        if not isinstance(item, dict) or not isinstance(item.get("fix"), str):
            normalized_fixes.append(FALLBACK_ANALYSIS["top_3_fixes"][index])
            continue
        score_gain = item.get("score_gain", "")
        saving = item.get("saving", "")
        normalized_fixes.append({
            "fix": item["fix"],
            "score_gain": (
                score_gain if isinstance(score_gain, str)
                else "+{} pts".format(score_gain)
            ),
            "saving": (
                saving if isinstance(saving, str)
                else "Rs {:,.0f}/year".format(float(saving))
                if isinstance(saving, (int, float)) and math.isfinite(saving)
                else "Estimate unavailable"
            ),
        })
    normalized_fixes.extend(
        FALLBACK_ANALYSIS["top_3_fixes"][len(normalized_fixes):3]
    )
    completed["top_3_fixes"] = normalized_fixes

    for key in ("ventilation_comment", "risk_2050"):
        if not isinstance(completed.get(key), str):
            completed[key] = FALLBACK_ANALYSIS[key]
    return completed


def _analyze_with_groq(building, weather, nasa):
    from groq import Groq

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    prompt = (
        "You are LEED AP architect + Climate Scientist for Pakistan. "
        "Building: {rooms} rooms, {floors} floors, {trees} trees, "
        "{occupants} daily occupants, {area}sqft, material={material}, "
        "roof={roof}, facade_orientation={orientation}, cooling={cooling}, "
        "insulation={insulation}, city={city}. "
        "Real Data: Weather={weather}, NASA={nasa}. "
        "Calculate: 1. Carbon: Brick=0.9, Concrete=0.7, Mud=0.1 kg/sqft/year "
        "2. Solar kW=(Area*0.6)*(Solar/1000)*0.18 "
        "3. Water Litres=Area*Rainfall*0.8. "
        "Return ONLY JSON: {{climate_score:int, "
        "leed_level:Uncertified/Certified/Silver/Gold/Platinum, "
        "carbon_kg_per_year:int, solar_kw:float, water_litres:int, "
        "ventilation_comment:string, top_3_problems:[], "
        "top_3_fixes:[{{fix, score_gain, saving}}], risk_2050:string}}"
    ).format(
        rooms=building["rooms"],
        floors=building["floors"],
        trees=building["trees"],
        area=building["area"],
        material=building["material"],
        roof=building["roof"],
        occupants=building["occupants"],
        orientation=building["orientation"],
        cooling=building["cooling"],
        insulation=building["insulation"],
        city=building["city"],
        weather=json.dumps(weather, ensure_ascii=False),
        nasa=json.dumps(nasa, ensure_ascii=False),
    )
    def complete(model):
        return client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

    model = GROQ_MODEL
    try:
        completion = complete(model)
    except Exception as error:
        body = getattr(error, "body", None) or {}
        provider_error = body.get("error", {}) if isinstance(body, dict) else {}
        model_missing = (
            getattr(error, "status_code", None) == 404
            and provider_error.get("code") == "model_not_found"
        )
        fallback_model = GROQ_FALLBACK_MODEL
        if not model_missing or fallback_model == model:
            raise
        app.logger.warning(
            "Groq model %s is unavailable; retrying with %s",
            model,
            fallback_model,
        )
        completion = complete(fallback_model)
    return json.loads(completion.choices[0].message.content)


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "ai_provider": "groq",
        "groq_model": GROQ_MODEL,
        "groq_fallback_model": GROQ_FALLBACK_MODEL,
        "flask_port": FLASK_PORT,
        "groq_api_key_configured": bool(os.getenv("GROQ_API_KEY")),
    })


@app.post("/api/analyze")
def analyze():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Send building details as a JSON object."}), 400

    try:
        building = {
            "rooms": int(body.get("rooms", 8)),
            "floors": int(body.get("floors", 2)),
            "trees": int(body.get("trees", 4)),
            "occupants": int(body.get("occupants", 5)),
            "area": float(body.get("area", 2500)),
            "material": str(body.get("material", "Brick")).strip(),
            "roof": str(body.get("roof", "Concrete")).strip(),
            "orientation": str(body.get("orientation", "South")).strip(),
            "cooling": str(body.get("cooling", "Split AC")).strip(),
            "insulation": str(body.get("insulation", "Basic")).strip(),
            "city": str(body.get("city", "")).strip(),
        }
        if (
            not building["city"]
            or len(building["city"]) > 100
            or not math.isfinite(building["area"])
            or not 0 < building["area"] <= 10000000
        ):
            raise ValueError("Enter a city and a building area greater than zero.")
        if (
            building["rooms"] < 0
            or building["floors"] < 1
            or building["trees"] < 0
            or not 0 <= building["occupants"] <= 1000
        ):
            raise ValueError("Rooms and trees must be zero or greater, floors at least one, and occupants between 0 and 1000.")
        if building["material"] not in ("Brick", "Concrete", "Mud"):
            raise ValueError("Choose Brick, Concrete, or Mud as the primary material.")
        if building["roof"] not in ("Concrete", "Metal", "Green roof", "Reflective"):
            raise ValueError("Choose a supported roof type.")
        if building["orientation"] not in ("North", "East", "South", "West"):
            raise ValueError("Choose North, East, South, or West for the main facade orientation.")
        if building["cooling"] not in ("None", "Fans", "Split AC", "Central AC"):
            raise ValueError("Choose a supported cooling system.")
        if building["insulation"] not in ("None", "Basic", "Good", "High performance"):
            raise ValueError("Choose a supported insulation level.")
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400

    try:
        place = get_geocode(building["city"])
        weather = _get_weather_with_retry(building["city"])
        nasa = get_nasa_power_data(place["latitude"], place["longitude"])
    except (requests.RequestException, KeyError, ValueError) as error:
        return jsonify({"error": "Could not retrieve climate data: {}".format(error)}), 502

    try:
        analysis = _complete_analysis(_analyze_with_groq(building, weather, nasa))
        ai_source = "groq"
        ai_error = None
    except Exception as error:
        app.logger.warning(
            "Groq analysis failed; serving demo estimates (%s, status=%s)",
            type(error).__name__,
            getattr(error, "status_code", None),
        )
        analysis = dict(FALLBACK_ANALYSIS)
        ai_source = "demo_fallback"
        ai_error = type(error).__name__

    return jsonify({
        "analysis": analysis,
        "building": building,
        "location": place,
        "weather": weather,
        "nasa": {
            "solar_radiation": _monthly_average(nasa, "ALLSKY_SFC_SW_DWN"),
            "rainfall": _monthly_average(nasa, "PRECTOTCORR"),
            "temperature": _monthly_average(nasa, "T2M"),
        },
        "ai_source": ai_source,
        "ai_error": ai_error,
    })
