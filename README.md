<div align="center">

# ClimaTwin AI

### See how your building stands up to Pakistan's changing climate.

Climate screening for Pakistani buildings, combining live weather, NASA climate data, and AI-generated recommendations.

[**Open the live app →**](https://climatwinai.vercel.app/) · [Source code](https://github.com/meesam331/ClimaTwinAI)

![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/API-Flask-000000?logo=flask&logoColor=white)
![AI](https://img.shields.io/badge/AI-Groq-F55036)

</div>

## What it does

Enter a city and building details to get a climate-screening report with:

- A climate score and preliminary LEED-style rating.
- Estimated annual carbon, rooftop solar potential, and rainwater capture.
- Current weather and historical monthly climate indicators.
- Priority risks, practical improvement ideas, and a 2050 climate outlook.
- A location map and downloadable PDF report.

The city suggestions focus on Pakistan, while other city names can also be submitted for geocoding.

## How the API works

The web app sends a same-origin `POST /api/analyze` request to the Flask API. On Vercel, the API and frontend share the same domain, so no separate API URL or browser CORS configuration is needed.

The API combines:

1. **Open-Meteo** for geocoding and current weather.
2. **NASA POWER** for monthly solar radiation, precipitation, and temperature.
3. **Nominatim / OpenStreetMap** for map coordinates.
4. **Groq** for AI-generated analysis and recommendations.

Check the deployed connection at [`/api/health`](https://climatwinai.vercel.app/api/health). A healthy response includes `"status":"ok"` and `"ai_provider":"groq"`; it never returns the API key. If Groq analysis is unavailable, the API labels its result as a demo fallback.

## Run locally

Requirements: Python 3.9+ and Node.js/npm.

1. Create a local environment file and add your own Groq key:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `GROQ_API_KEY` in `.env`. Never put a real API key in `.env.example` or commit it to Git.

2. Install Python dependencies:

   ```powershell
   py -m pip install -r requirements.txt
   ```

3. In one terminal, start the API:

   ```powershell
   py run_local.py
   ```

4. In another terminal, install frontend dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to the Flask server at `FLASK_PORT` (5000 by default).

Check the local API:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

## Deploy to Vercel

Import [the GitHub repository](https://github.com/meesam331/ClimaTwinAI) into Vercel and set `GROQ_API_KEY` in the project’s environment variables for the environments you deploy. Then deploy the project. The Vercel configuration routes `/api/*` to Flask on Python 3.12 and serves the Vite build from `dist`.

After deployment, open `/api/health` on the deployment domain. For example:

```text
https://climatwinai.vercel.app/api/health
```

If the health endpoint is unavailable, check that the latest Git commit has deployed and that Vercel’s function build succeeded. If health works but analysis uses demo fallback, check the Vercel function logs and confirm `GROQ_API_KEY` is set for the Production environment.

## Data and limitations

- Weather and geocoding use external services and require an internet connection.
- NASA POWER monthly indicators currently cover 2023–2024.
- Analysis results are screening estimates, not engineering designs, energy audits, or formal LEED certification.
- The application is stateless; it does not save submitted building details or analysis results.
- Please follow the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Tests

Run the API tests:

```powershell
py -m unittest -v test_climatwin_api
```

Build the frontend:

```powershell
npm run build
```
