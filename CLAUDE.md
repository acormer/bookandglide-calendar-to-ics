@AGENTS.md

# BookAndGlide Calendar — Next.js Architecture

## Stack
- **Next.js 16.2.7** (App Router, TypeScript) — build with `next build --webpack` (Turbopack disabled, see below)
- **Better Auth** (email + password) with `pg.Pool` for DB connection
- **Neon PostgreSQL** via `@neondatabase/serverless` + `kysely-neon` + `Kysely`
- **`ical-generator` v11** for ICS generation (field is `id`, not `uid`)
- **`node-html-parser`** for meteo scraping
- **`luxon`** for timezone-aware date handling (Europe/Paris)

## Why `--webpack` (not Turbopack)
`@better-auth/kysely-adapter` imports `DEFAULT_MIGRATION_TABLE` from `kysely` main module, which was moved to `kysely/migration` in v0.28+. Turbopack's static analyzer fails on this; webpack handles it gracefully. Always use `npm run build` (which passes `--webpack`).

## Lazy initialization pattern
Both `db` (Kysely) and `auth` (Better Auth) are wrapped in a JavaScript Proxy so they only initialize on first property access — this avoids build-time DB connection errors since `DATABASE_URL` is not available at build time.

## Stateless scraping
Vercel serverless functions have no shared memory. BookAndGlide session cookie is re-fetched on every request (fresh login → fetch events). This costs ~3 HTTP calls per ICS request but keeps the implementation simple.

## ICS token auth
Per-user tokens are stored in the `user_tokens` DB table. ICS endpoints accept `?token=<value>` so calendar clients (Google Calendar, Apple Calendar) can subscribe without cookie auth. The old global `CALENDAR_SECRET` env var is still supported as a fallback.

## Key files
- `lib/bookandglide.ts` — login + event fetch logic (manual cookie parsing)
- `lib/meteo.ts` — meteoalpes.fr scraper (regex split on French day headers)
- `lib/ics.ts` — ICS builders using `ical-generator`
- `lib/db.ts` — lazy Kysely + NeonDialect proxy
- `lib/auth.ts` — lazy Better Auth with pg.Pool proxy
- `lib/auth-client.ts` — `'use client'` Better Auth React client
- `middleware.ts` — protects all routes except `/api/auth`, ICS endpoints, `/login`
- `db/migrations.sql` — `user_tokens` and `feed_status` tables (run after Better Auth core migration)

## Environment variables
```
BG_EMAIL=              # BookAndGlide admin email
BG_PASSWORD=           # BookAndGlide admin password
CALENDAR_SECRET=       # optional global fallback token
DATABASE_URL=          # Neon PostgreSQL connection string
BETTER_AUTH_SECRET=    # openssl rand -base64 32
BETTER_AUTH_URL=       # https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=   # https://your-app.vercel.app
```
