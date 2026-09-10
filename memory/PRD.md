# RoadLens — Product Requirements Document

## Original Problem Statement
Mobile-first civic-tech MVP for AI road-damage detection and complaint management. Citizens report road damage via camera/gallery image + GPS; GPT-5.4 Vision performs real damage detection (pothole/crack/surface damage) with confidence, severity, and bounding box; complaints flow through a municipal lifecycle handled by Authorities and Admin, with persistent in-app notifications. Constraint: maximize working core functionality, minimal polish, no fabricated AI detections.

## Architecture
- **Frontend:** Expo Router (React Native, TypeScript), TanStack Query, React Context auth. Tab navigation (Dashboard, Inspect, Complaints, Workspace, Alerts). Theme via `src/theme.ts` (navy/white/gray).
- **Backend:** FastAPI + MongoDB (Motor). JWT auth (bcrypt/passlib) with role claims + server-side permission checks.
- **AI:** GPT-5.4 Vision via Emergent Universal Key (`emergentintegrations`). URL images are downloaded and base64-encoded before being sent as real image content to the model.

## User Personas
- **USER (Citizen):** reports damage, runs AI inspection, files/tracks own complaints, closes resolved complaints.
- **AUTHORITY:** acts only on complaints assigned to their authority — acknowledge → start work → upload repair proof → resolve.
- **ADMIN:** system-wide view, users/authorities, assign/reassign, force-close.

## Core Requirements (static)
- Role-secure access; users cannot self-promote.
- Real AI detection only — no fabricated results; honest failure/no-damage outcomes.
- Lifecycle: SUBMITTED → ASSIGNED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED with full status history.
- Auto-assign by area when possible; otherwise UNASSIGNED for Admin.
- Repair evidence required to resolve.
- Persistent in-app notifications for assignments/status changes.
- Persist users, inspections, complaints, authorities, history, repair evidence, notifications.

## Implemented (2026-09-10)
- Full auth + demo role login (Citizen/Authority/Admin) — see `memory/test_credentials.md`.
- Inspection with camera/gallery + GPS + timestamp.
- **Real GPT-5.4 Vision detection**: URL images downloaded → base64 → sent as image content. Verified: pothole → detected HIGH 96.8% + bbox; clean road → "No supported road damage detected".
- **No fabricated detections**: on AI failure/unavailable, backend returns HTTP 503; frontend shows an error banner with Retry.
- Complaint creation with server guard (blocks complaints on non-detected/invalid inspections), auto-assignment, status history.
- Workflow guards verified via curl: invalid transitions blocked (400), resolve-without-proof blocked (400), authority restricted to own-authority complaints, citizen restricted to closing own resolved complaints, admin force-close.
- Authority repair evidence + resolve; persistent notifications; Admin assign/reassign.
- Removed non-compliant `localhost` fallback in `src/api/client.ts` (uses `EXPO_PUBLIC_BACKEND_URL`).

## Backlog / Remaining
- **P1:** Optional user-facing acceptance walkthrough on real device (Expo Go).
- **P2:** Photo evidence stored as base64 in Mongo — migrate to Emergent Object Storage if image volume grows.
- **P2:** `server.py` is a single large file; split into routers/services only if it grows further.

## Next Tasks
- Await user acceptance testing feedback before further feature work (per user's credit-conscious, core-first priority).
