# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Flask server (`app.py`) that exposes two ICS calendar endpoints:

- `GET /calendar.ics` — scrapes BookAndGlide's private admin calendar API and returns tandem flight events as an ICS feed.
- `GET /meteo.ics` — scrapes meteoalpes.fr and returns a 6-day Alpine weather forecast as an ICS feed (one all-day event per day at 06:00–07:00 Europe/Paris).

Both endpoints accept an optional `?token=<CALENDAR_SECRET>` query param for simple access control.

## Running

```bash
pip install -r requirements.txt
cp .env.example .env  # then fill in credentials
python app.py         # runs on PORT (default 5000)
```

For production use a WSGI runner: `gunicorn app:app`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `BG_EMAIL` | yes | BookAndGlide admin login email |
| `BG_PASSWORD` | yes | BookAndGlide admin login password |
| `CALENDAR_SECRET` | no | Token required in `?token=` to access endpoints |
| `PORT` | no | HTTP port (default 5000) |

## Architecture

Everything lives in `app.py`. Key design decisions:

**Session reuse with lazy re-login.** A single `requests.Session` (`_session`) is kept alive across requests. `_fetch_events()` first tries the API; if the response isn't JSON (session expired), it calls `_login()` and retries once. Login extracts a CSRF token from the HTML form via regex before POSTing credentials.

**BookAndGlide calendar API.** The endpoint is `/admin/tandems/calendar` and requires `X-Requested-With: XMLHttpRequest`. It returns a 2-week window (current Monday → Monday+2). Only events with `"type": "tandem"` are kept.

**Meteo scraping.** The page at `METEO_URL` contains `div.j-module.j-text` blocks with free-form French text. The parser splits on day-header lines (e.g. "Lundi 26 mai 2025") using `_DAY_HEADER` regex, then pairs each header with the following text block.

**No caching, no background jobs.** Each HTTP request triggers a live scrape. The ICS feeds themselves advertise refresh intervals (`REFRESH-INTERVAL`) so calendar clients know how often to poll.

**Timezone.** All datetimes use `Europe/Paris` via `zoneinfo.ZoneInfo`. The `_fmt_date` helper serializes dates with explicit UTC offset for the BookAndGlide API query params.
