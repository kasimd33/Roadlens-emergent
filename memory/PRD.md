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

## Auth & Startup Role Routing (2026-09-10)
- **Startup gate**: `app/index.tsx` shows a RoadLens splash while `AuthContext` checks the stored session, then redirects — authenticated → `/(tabs)`, unauthenticated → `/login`.
- **Screens**: `login.tsx` (email/password, Forgot link, Continue with Google, Sign Up link, demo quick-access), `signup.tsx` (name/email/password/confirm), `forgot-password.tsx` (request 6-digit code → reset). Navy/white/gray, keyboard-aware.
- **Google Sign-In**: Emergent-managed OAuth. Frontend opens `auth.emergentagent.com`, extracts `session_id`, backend `POST /api/auth/session` exchanges it via `demobackend.emergentagent.com` and mints our JWT. New Google users are created as USER.
- **Password reset**: `POST /api/auth/forgot-password` (generic response, no enumeration) emails a 6-digit code via Emergent Resend; `POST /api/auth/reset-password` verifies the hashed, single-use, 20-min code.
- **Roles & security**: public `register` always creates USER (role never trusted from client). `POST /api/admin/authority-users` (ADMIN only) creates AUTHORITY accounts linked to a department; admin UI is `CreateAuthorityUserModal` in Workspace. Admin account is seeded. Route protection: server-side `require_roles`; client hides the Workspace tab for USER; `(tabs)/_layout` redirects to `/login` when unauthenticated.
- **Session**: JWT stored via secure storage; persists across restarts; logout clears it and returns to login (profile menu in header).
- **Verified**: backend 15/15 auth/admin tests pass; frontend login (citizen/admin), signup, forgot-password, logout, route protection, and Create-Authority modal confirmed via screenshots.
