# Quick Demo Access — explanation and decision

## Your two questions, answered

**1. Why is "Quick Demo Access" on the login screen?**
Those three buttons (Citizen / Authority / Admin) are a one-tap shortcut that logs
you straight into a pre-made account for each role, without typing an email or
password. They exist so the full app — citizen reporting, authority repairs, admin
assignment — can be demoed and tested instantly across all three roles. Each button
signs in to a real seeded account (the same ones in the demo credentials).

**2. Will they still be there after you publish?**
Yes — as things stand today, the buttons are part of the app and would appear in the
published app exactly as in preview. The three demo accounts are also copied into the
production database on first deploy. That means, in the live app, anyone who opens it
could tap "Admin" and get full admin access. That is fine for a demo, but not for a
real public release.

## The decision to make
What should happen to Quick Demo Access in the published (production) app? Pick one:

- **Option A — Hide in production, keep in preview (recommended).**
  The buttons stay while you build and demo in preview, but automatically disappear in
  the published app. Regular email/password and Google sign-in remain. This keeps
  testing easy and closes the "anyone becomes admin" hole in production.

- **Option B — Remove the demo buttons entirely (preview and production).**
  Cleanest and most secure, but you lose the one-tap testing convenience in preview
  too; you'd log in with the demo email/passwords instead.

- **Option C — Keep them everywhere, including production.**
  Maximum convenience, but the live app lets any visitor sign in as Admin/Authority.
  Only choose this if the published app is purely a throwaway demo.

Related to all options: the three seeded demo accounts (citizen/authority/admin) also
land in production. If you want, seeded demo accounts can additionally be prevented
from being created in production so no default admin login exists there.

## Assumptions
- Assumes the published app is intended for real users, so the default recommendation
  is Option A (hide demo access in production; keep email/password + Google).
- No change to the actual login, roles, or any other feature — this only concerns the
  visibility of the demo shortcut and, optionally, the seeded demo accounts.

## Out of scope
- No redesign of the login screen or other screens.
- No change to how real accounts, roles, or permissions work.
