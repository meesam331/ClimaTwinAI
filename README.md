# ClimaTwin AI

**Live demo:** [Open ClimaTwin AI](https://clima-twin-qvb7alzuv-meesam331.vercel.app/)

Pakistan-focused building climate screening with a React/Vite frontend and a Flask API. The analysis combines Open-Meteo current conditions, NASA POWER monthly data, Nominatim geocoding, and Groq-generated recommendations. If Groq is unavailable, the API returns the labeled demo fallback.

The application is stateless and does not use a database: building inputs and analysis results are processed for the current request and are not persisted by this app.

The city field suggests major Pakistani cities, including Karachi and Khairpur, while still accepting other city names for geocoding. Building inputs include floor area, rooms, floors, trees, daily occupants, primary material, roof type, facade orientation, cooling system, and insulation level.

## Run locally

Requirements: Python 3.9+ and Node.js/npm.

1. Copy `.env.example` to `.env`, then set `GROQ_API_KEY`. The API tries `GROQ_MODEL` first and automatically retries with its built-in fallback model if Groq no longer serves the configured model.
2. Install Python dependencies:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

3. Start the API in one terminal (the runner reads `FLASK_PORT` from `.env`):

   ```powershell
   .\.venv\Scripts\python.exe run_local.py
   ```

4. Install frontend dependencies and start Vite in another terminal:

   ```powershell
   npm install
   npm run dev
   ```

Open http://127.0.0.1:5173. Vite reads `FLASK_PORT` from `.env` and proxies analysis requests to the local Flask API. Check `/api/health` to confirm the API and model configuration without revealing credentials.

## Deploy to Vercel

Import the repository into Vercel, add `GROQ_API_KEY` to the project environment variables, and deploy. `vercel.json` routes `/api/*` to `api/index.py` and serves the Vite production build from `dist`.

## Data and limitations

- Weather is fetched without a key from Open-Meteo's geocoding and forecast endpoints.
- NASA POWER provides monthly solar radiation, precipitation, and temperature for 2023–2024.
- Nominatim/OpenStreetMap resolves coordinates for the map; please respect its usage policy.
- Climate scores and recommendations are preliminary screening estimates, not engineering design or formal LEED certification.

## Tests

```powershell
.\.venv\Scripts\python.exe -m unittest -v test_climatwin_api
```
