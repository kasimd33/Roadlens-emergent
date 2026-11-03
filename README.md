# RoadLens

AI-powered road damage detection and civic complaint management for **Indian municipal infrastructure**.

Citizens photograph road damage (camera/upload + live GPS) → Gemini vision AI detects potholes,
cracks, open manholes, waterlogging and damaged speed breakers with severity, bounding box and
an INR repair-cost estimate → complaints flow through a full municipal lifecycle
(SUBMITTED → ASSIGNED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED) with role-based
access for Citizens, Authorities and Admin.

## Architecture

| Layer | Stack | Path |
|---|---|---|
| Web frontend | Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router 7 · TanStack Query | `web-frontend/` |
| Backend | FastAPI · MongoDB (Motor) · JWT auth · Gemini vision | `backend/` |
| Mobile app (legacy) | Expo Router · React Native | `frontend/` |

## Key features

- **Real AI detection only** — no fabricated results; AI failures return honest HTTP 503 with a retry UI
- **Live GPS** — continuous `watchPosition` tracking with reverse-geocoded Indian place names (OpenStreetMap)
- **Indian municipal context** — Bengaluru demo divisions, +91 contacts, INR repair-cost estimates,
  auto-assignment by Indian locality keywords
- **Role-secure workflows** — citizens report/track/close; authorities acknowledge → repair → resolve
  with photo evidence; admins assign/reassign/force-close
- **Persistent in-app notifications** with unread badges

## Running locally

**Backend** (Python 3.11+, MongoDB at `localhost:27017`):

```bash
cd backend
pip install fastapi "uvicorn[standard]" motor pymongo "passlib[bcrypt]" python-jose httpx python-dotenv
cp .env.example .env   # add your GEMINI_API_KEY from aistudio.google.com
python -m uvicorn server:app --port 8002
```

**Web frontend** (Node 18+):

```bash
cd web-frontend
npm install
npm run dev           # http://localhost:5173
```

Point the frontend at the backend with `VITE_BACKEND_URL` in `web-frontend/.env.local`
(defaults to `http://localhost:8001`).

### Demo accounts (seeded on first backend start)

| Role | Email | Password |
|---|---|---|
| Citizen | citizen@roadlens.gov | Citizen@123 |
| Authority | authority@roadlens.gov | Authority@123 |
| Admin | admin@roadlens.gov | Admin@123 |

## Deploying to production

The stack deploys as three free-tier services:

**1. MongoDB Atlas** (database)

Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), add a
database user, and allow network access from `0.0.0.0/0` (Render's egress IPs are dynamic).
Copy the SRV connection string — this is your `MONGO_URL`.

**2. Render** (backend API)

The repo includes a Render blueprint (`render.yaml`). In the Render dashboard:
**New → Blueprint** → select this repo. Fill in the prompted secret vars:

| Var | Value |
|---|---|
| `MONGO_URL` | your Atlas SRV connection string |
| `GEMINI_API_KEY` | Google AI Studio key |
| `CORS_ORIGINS` | your frontend URL (set after step 3, e.g. `https://roadlens.vercel.app`) |

`JWT_SECRET` is auto-generated; `ALLOW_DEMO_DATA` stays unset (defaults to `false` — no
demo accounts or quick-demo buttons in production).

**3. Vercel** (web frontend)

Import the repo at [vercel.com](https://vercel.com), set the **Root Directory** to
`web-frontend` (Vite is auto-detected), and set:

| Var | Value |
|---|---|
| `VITE_BACKEND_URL` | your Render URL, e.g. `https://roadlens-api.onrender.com` |

Then go back to Render and set `CORS_ORIGINS` to your Vercel URL so the browser can
call the API. No demo accounts exist in production — register a citizen account from
the signup page; authority/admin accounts are created by an Admin after logging in.

## Security notes

- API keys live in `backend/.env` (gitignored) — never commit keys
- Roles are enforced server-side; public registration always creates USER accounts
- Authority accounts can only be created by an Admin
