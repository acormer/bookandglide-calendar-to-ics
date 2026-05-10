import html
import os
print(dict(os.environ)) 
import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
print(dict(os.environ)) 
from flask import Flask, Response, abort, request
from icalendar import Calendar, Event

load_dotenv()
print(dict(os.environ)) 

BG_EMAIL = os.environ["BG_EMAIL"]
BG_PASSWORD = os.environ["BG_PASSWORD"]
CALENDAR_SECRET = os.environ.get("CALENDAR_SECRET", "")
TZ = ZoneInfo("Europe/Paris")
BASE_URL = "https://bookandglide.com"

app = Flask(__name__)
_session = requests.Session()
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0",
})


def _fmt_date(d: date) -> str:
    dt = datetime(d.year, d.month, d.day, tzinfo=TZ)
    offset = dt.utcoffset()
    total = int(offset.total_seconds())
    sign = "+" if total >= 0 else "-"
    h, m = divmod(abs(total) // 60, 60)
    return dt.strftime(f"%Y-%m-%dT%H:%M:%S{sign}{h:02d}:{m:02d}")


def _week_bounds() -> tuple[date, date]:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday, monday + timedelta(weeks=2)


def _login() -> None:
    r = _session.get(f"{BASE_URL}/admin/login")
    tag = re.search(r'<input[^>]+name="user_login\[_token\]"[^>]*>', r.text)
    match = re.search(r'value="([^"]+)"', tag.group(0)) if tag else None
    if not match:
        raise RuntimeError("CSRF token not found on login page")

    r = _session.post(
        f"{BASE_URL}/admin/login",
        data={
            "user_login[email]": BG_EMAIL,
            "user_login[password]": BG_PASSWORD,
            "user_login[submit]": "",
            "user_login[_token]": match.group(1),
        },
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/admin/login",
        },
        allow_redirects=True,
    )
    if "/admin/login" in r.url:
        raise RuntimeError("Login failed — check BG_EMAIL / BG_PASSWORD")


def _fetch_events() -> list[dict]:
    start, end = _week_bounds()
    params = {"start": _fmt_date(start), "end": _fmt_date(end)}
    headers = {"Accept": "*/*", "X-Requested-With": "XMLHttpRequest"}

    r = _session.get(f"{BASE_URL}/admin/tandems/calendar", params=params, headers=headers)
    try:
        data = r.json()
    except Exception:
        _login()
        data = _session.get(f"{BASE_URL}/admin/tandems/calendar", params=params, headers=headers).json()

    return [e for e in data if e.get("type") == "tandem"]


def _strip_html(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text)).strip()


def _is_red_or_rose(color: str) -> bool:
    color = color.strip().lstrip("#")
    if len(color) == 3:
        color = color[0]*2 + color[1]*2 + color[2]*2
    if len(color) != 6:
        return False
    try:
        r, g, b = int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)
    except ValueError:
        return False
    # Red is dominant channel, green is not too high (excludes orange), blue < green or blue under threshold
    return r > 150 and r > g and g < 150 and (b < 150 or b > g)


def _build_ics(events: list[dict]) -> bytes:
    cal = Calendar()
    cal.add("prodid", "-//BookAndGlide ICS//EN")
    cal.add("version", "2.0")
    cal.add("X-WR-CALNAME", "BookAndGlide Tandems")
    cal.add("X-WR-TIMEZONE", "Europe/Paris")
    cal.add("REFRESH-INTERVAL;VALUE=DURATION", "PT1H")

    for e in events:
        ev = Event()
        title = _strip_html(e["title"])
        event_color = e.get("color") or e.get("backgroundColor") or ""
        if event_color and _is_red_or_rose(event_color):
            title = f"ANNULE {title}"
        ev.add("summary", title)
        ev.add("dtstart", datetime.strptime(e["start"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=TZ))
        ev.add("dtend",   datetime.strptime(e["end"],   "%Y-%m-%d %H:%M:%S").replace(tzinfo=TZ))
        ev.add("dtstamp", datetime.now(tz=TZ))
        ev["uid"] = f"{e['id']}@bookandglide.com"
        cal.add_component(ev)

    return cal.to_ical()


@app.route("/calendar.ics")
def calendar_ics():
    if CALENDAR_SECRET and request.args.get("token") != CALENDAR_SECRET:
        abort(403)

    events = _fetch_events()
    return Response(
        _build_ics(events),
        mimetype="text/calendar",
        headers={"Content-Disposition": "inline; filename=bookandglide.ics"},
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
