# RoadLens Web Frontend

Browser version of the RoadLens mobile app (Expo) — AI road-damage detection and civic
complaint management. Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router 7 +
TanStack Query.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

Point it at the backend via `VITE_BACKEND_URL` (defaults to `http://localhost:8001`):

```bash
# .env.local
VITE_BACKEND_URL=http://localhost:8001
```

Start the API (`../backend`): `uvicorn server:app --reload --port 8001`

## Pages

| Route | Screen | Access |
|---|---|---|
| `/login` | Email/password, Google, quick demo access (Citizen/Authority/Admin) | public |
| `/signup` | Citizen self-registration (always USER role) | public |
| `/forgot-password` | 2-step email-code reset | public |
| `/dashboard` | Stats, quick actions, recent reports | auth |
| `/inspect` | Preset samples / camera / upload → GPT-5.4 Vision analysis → file complaint | auth |
| `/complaints` | Search + status/severity filters, details with lifecycle timeline | auth |
| `/workspace` | Authority pipeline / Admin governance / Citizen reports | AUTHORITY, ADMIN |
| `/notifications` | Alert center with unread badge (10s polling) | auth |

## Notes

- Images are read via `<input type="file">` (camera via `capture="environment"`),
  downscaled and base64-encoded client-side — same payload shape the mobile app sends.
- GPS comes from the browser Geolocation API; preset sample coordinates are used as
  fallback.
- No fabricated AI detections: the bounding box is only drawn when the model returned
  one; analysis failures show an honest error with Retry.
