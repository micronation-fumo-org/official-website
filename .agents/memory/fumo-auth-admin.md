---
name: FUMO Auth & Admin System
description: Password auth with argon2id, admin tier system, and default super-admin seeding for the FUMO website
---

## Auth System

- Passwords hashed with argon2id, timeCost=8, memoryCost=131072 (128 MiB) — user-specified, do not change
- argon2.verify() does NOT accept a `type` option — auto-detects from hash string
- argon2 is in esbuild externals list (build.mjs) — already handled

## Admin Levels

- 0 = regular user
- 1 = tier-1 admin (basic: view voting data, host/close polls)
- 2 = tier-2 admin (additionally: reset passwords, delete ballots)
- 9 = super admin (assign tiers, all permissions)

## Default Super-Admin

- Discord ID: `1406117683220709486`
- Seeded via `seedDefaultAdmin()` called in `artifacts/api-server/src/index.ts` after server starts
- Default password: `changeme` — must be changed on first login
- If account exists but has adminLevel < 9, it is promoted automatically

## DB Migration Note

- `voter_accounts` table changed from `is_admin boolean` to `admin_level integer` in June 2026
- drizzle-kit push requires TTY for column conflict resolution — use raw SQL (via `cd lib/db && node --input-type=module`) for migrations that rename columns

## AuthContext (Frontend)

- Located at `artifacts/fumo-website/src/contexts/AuthContext.tsx`
- Persists user in localStorage under key `fumo_auth_user`
- Exports: `user`, `login()`, `logout()`, `isAdmin` (>=1), `isTier2Admin` (>=2), `isSuperAdmin` (>=9)
- Wrapped around entire app in `App.tsx` inside `AuthProvider`

## Key Routes

**Why:** Knowing which routes need which admin level prevents accidental permission bypass.

- `POST /api/votes` — requires adminLevel >= 1, send `adminId` in body
- `POST /api/votes/:id/close` — requires adminLevel >= 1, send `adminId` in body
- `GET /api/admin/accounts` — requires adminLevel >= 1, pass `?adminId=`
- `POST /api/admin/accounts` — password reset requires >= 2, tier change requires >= 9
- `DELETE /api/admin/ballots/:id` — requires adminLevel >= 2
