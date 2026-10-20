import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from api import index


class ClimateTwinApiTests(unittest.TestCase):
    def setUp(self):
        self.client = index.app.test_client()

    def test_analysis_uses_live_data_and_returns_demo_fallback_when_groq_fails(self):
        nasa = {
            "properties": {
                "parameter": {
                    "ALLSKY_SFC_SW_DWN": {"202301": 4.0},
                    "PRECTOTCORR": {"202301": 1.2},
                    "T2M": {"202301": 20.0},
                }
            }
        }
        with (
            patch.object(index, "get_geocode", return_value={
                "latitude": 33.7,
                "longitude": 73.1,
                "display_name": "Islamabad, Pakistan",
            }) as geocode,
            patch.object(index, "get_weather_free", return_value={
                "current": {"temperature_2m": 23, "relative_humidity_2m": 45}
            }) as weather,
            patch.object(index, "get_nasa_power_data", return_value=nasa) as nasa_data,
            patch.object(index, "_analyze_with_groq", side_effect=RuntimeError("offline")),
        ):
            response = self.client.post("/api/analyze", json={
                "city": "Islamabad",
                "rooms": 8,
                "floors": 2,
                "trees": 4,
                "occupants": 5,
                "area": 2500,
                "material": "Brick",
                "roof": "Concrete",
                "orientation": "South",
                "cooling": "Split AC",
                "insulation": "Basic",
            })

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["ai_source"], "demo_fallback")
        self.assertEqual(payload["analysis"], index.FALLBACK_ANALYSIS)
        self.assertEqual(payload["nasa"]["solar_radiation"], 4.0)
        self.assertEqual(payload["building"]["occupants"], 5)
        self.assertEqual(payload["building"]["orientation"], "South")
        self.assertEqual(payload["building"]["cooling"], "Split AC")
        self.assertEqual(payload["building"]["insulation"], "Basic")
        geocode.assert_called_once_with("Islamabad")
        weather.assert_called_once_with("Islamabad")
        nasa_data.assert_called_once_with(33.7, 73.1)

    def test_weather_uses_existing_open_meteo_search_and_forecast_endpoints(self):
        search_result = {
            "results": [{
                "latitude": 33.7,
                "longitude": 73.1,
                "timezone": "Asia/Karachi",
            }]
        }
        current_result = {"current": {"temperature_2m": 23}}
        with patch.object(index.requests, "get") as get:
            get.side_effect = [
                unittest.mock.Mock(json=lambda: search_result),
                unittest.mock.Mock(json=lambda: current_result),
            ]
            result = index.get_weather_free("Islamabad")

        self.assertEqual(result, current_result)
        self.assertEqual(
            urlsplit(get.call_args_list[0].args[0]).path,
            "/v1/search",
        )
        self.assertEqual(
            urlsplit(get.call_args_list[1].args[0]).path,
            "/v1/forecast",
        )
        self.assertEqual(
            parse_qs(urlsplit(get.call_args_list[1].args[0]).query)["current"],
            ["temperature_2m,relative_humidity_2m,apparent_temperature"],
        )

    def test_invalid_building_input_is_rejected_before_external_requests(self):
        with patch.object(index, "get_geocode") as geocode:
            response = self.client.post("/api/analyze", json={
                "city": "",
                "area": 0,
                "floors": 0,
            })

        self.assertEqual(response.status_code, 400)
        geocode.assert_not_called()

    def test_khairpur_and_karachi_city_names_reach_geocoding(self):
        for city in ("Khairpur", "Karachi"):
            with (
                patch.object(index, "get_geocode", return_value={
                    "latitude": 27.5,
                    "longitude": 68.8,
                    "display_name": city + ", Pakistan",
                }) as geocode,
                patch.object(index, "get_weather_free", return_value={
                    "current": {"temperature_2m": 35}
                }),
                patch.object(index, "get_nasa_power_data", return_value={
                    "properties": {"parameter": {}}
                }),
                patch.object(index, "_analyze_with_groq", side_effect=RuntimeError("offline")),
            ):
                response = self.client.post("/api/analyze", json={"city": city})

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()["building"]["city"], city)
            geocode.assert_called_once_with(city)

    def test_temporary_open_meteo_outage_is_retried(self):
        unavailable = index.requests.HTTPError(
            response=SimpleNamespace(status_code=503)
        )
        conditions = {"current": {"temperature_2m": 31}}
        with (
            patch.object(index, "get_weather_free", side_effect=[unavailable, conditions]) as weather,
            patch.object(index.time, "sleep"),
        ):
            result = index._get_weather_with_retry("Khairpur")

        self.assertEqual(result, conditions)
        self.assertEqual(weather.call_count, 2)

    def test_invalid_new_building_choices_are_rejected(self):
        with patch.object(index, "get_geocode") as geocode:
            response = self.client.post("/api/analyze", json={
                "city": "Karachi",
                "orientation": "Northeast",
                "occupants": 12,
            })

        self.assertEqual(response.status_code, 400)
        geocode.assert_not_called()

    def test_health_returns_model_configuration_without_secrets(self):
        response = self.client.get("/api/health")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["ai_provider"], "groq")
        self.assertEqual(payload["flask_port"], index.FLASK_PORT)
        self.assertNotIn("GROQ_API_KEY", payload)
        self.assertNotIn("gemini_model_primary", payload)

    def test_unavailable_requested_groq_model_retries_with_available_model(self):
        class MissingModel(Exception):
            status_code = 404
            body = {"error": {"code": "model_not_found"}}

        response = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(index.FALLBACK_ANALYSIS)
            ))]
        )
        with patch.dict(os.environ, {
            "GROQ_API_KEY": "test-key",
            "GROQ_MODEL": "llama-3.3-70b-versatile",
            "GROQ_FALLBACK_MODEL": "openai/gpt-oss-120b",
        }), patch("groq.Groq") as groq_client:
            groq_client.return_value.chat.completions.create.side_effect = [
                MissingModel(),
                response,
            ]
            result = index._analyze_with_groq(
                {
                    "rooms": 8,
                    "floors": 2,
                    "trees": 4,
                    "occupants": 5,
                    "area": 2500,
                    "material": "Brick",
                    "roof": "Concrete",
                    "orientation": "South",
                    "cooling": "Split AC",
                    "insulation": "Basic",
                    "city": "Islamabad",
                },
                {"current": {"temperature_2m": 23}},
                {"properties": {"parameter": {}}},
            )

        self.assertEqual(result["climate_score"], 72)
        calls = groq_client.return_value.chat.completions.create.call_args_list
        self.assertEqual(calls[0].kwargs["model"], "llama-3.3-70b-versatile")
        self.assertEqual(calls[1].kwargs["model"], "openai/gpt-oss-120b")
        self.assertEqual(calls[1].kwargs["response_format"], {"type": "json_object"})
        prompt = calls[0].kwargs["messages"][0]["content"]
        self.assertIn("5 daily occupants", prompt)
        self.assertIn("facade_orientation=South", prompt)
        self.assertIn("cooling=Split AC", prompt)
        self.assertIn("insulation=Basic", prompt)

    def test_numeric_mitigation_fields_are_renderable_by_frontend(self):
        result = index._complete_analysis({
            **index.FALLBACK_ANALYSIS,
            "top_3_fixes": [
                {"fix": "Plant shade trees", "score_gain": 8, "saving": 45000},
            ],
        })

        self.assertEqual(result["top_3_fixes"][0]["score_gain"], "+8 pts")
        self.assertEqual(result["top_3_fixes"][0]["saving"], "Rs 45,000/year")
        self.assertEqual(len(result["top_3_fixes"]), 3)


if __name__ == "__main__":
    unittest.main()
