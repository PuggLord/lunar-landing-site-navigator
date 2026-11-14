"""Fetch Sun and Earth azimuth/elevation tables from NASA JPL Horizons.

SI disclosure: this file was written with an AI coding tool (Claude Code,
Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
directed and reviewed by team Ksig UNT. See SI_USE.md.

Each case asks Horizons for an observer standing on the Moon and saves the
answer as JSON under reference/horizons/. The tests compare our own
calculation with these files, so the app is never its own referee.

Data source: NASA/JPL Horizons API, https://ssd.jpl.nasa.gov/api/horizons.api
Docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html

Usage:  python tools/fetch_horizons.py            (all cases)
        python tools/fetch_horizons.py im1_landing (one case)
Standard library only.
"""

import datetime
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reference", "horizons")

# name, site label, east longitude (deg), latitude (deg), altitude (km), start, stop, step
# Altitude is height above the 1737.4 km sphere Horizons uses for the Moon.
CASES = [
    ("im1_landing", "IM-1 Odysseus site (NASA/LRO)", 1.44, -80.13, 2.579,
     "2024-02-22 23:00", "2024-02-23 01:00", "1 h"),
    ("im1_lunar_month", "IM-1 Odysseus site (NASA/LRO)", 1.44, -80.13, 2.579,
     "2024-02-15 00:00", "2024-03-20 00:00", "6 h"),
    ("im1_sunset_fine", "IM-1 Odysseus site (NASA/LRO)", 1.44, -80.13, 2.579,
     "2024-03-02 00:00", "2024-03-04 00:00", "10 m"),
    ("south_pole_84s", "Test point 84.78 S, 29.13 E, on the sphere", 29.13, -84.78, 0.0,
     "2025-03-01 00:00", "2025-04-05 00:00", "6 h"),
    ("equator_test", "Test point 0.67 N, 23.47 E, on the sphere", 23.47, 0.67, 0.0,
     "2026-11-01 00:00", "2026-12-06 00:00", "6 h"),
    ("farside_test", "Test point 45 N, 120 W, on the sphere", -120.0, 45.0, 0.0,
     "2027-06-01 00:00", "2027-07-06 00:00", "6 h"),
]

MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def query(command, lon, lat, alt, start, stop, step):
    params = {
        "format": "text",
        "COMMAND": "'%s'" % command,
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": "'%s,%s,%s'" % (lon, lat, alt),
        "START_TIME": "'%s'" % start,
        "STOP_TIME": "'%s'" % stop,
        "STEP_SIZE": "'%s'" % step,
        "QUANTITIES": "'4'",
        "CSV_FORMAT": "'YES'",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=60) as resp:
        return url, resp.read().decode("utf-8")


def parse(text):
    if "$$SOE" not in text:
        raise RuntimeError("Horizons returned no table:\n" + text[:800])
    body = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    rows = {}
    for line in body.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        m = re.match(r"(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})", parts[0])
        utc = "%s-%02d-%sT%s:%s:00Z" % (m.group(1), MONTHS[m.group(2)], m.group(3), m.group(4), m.group(5))
        rows[utc] = {"az": float(parts[3]), "el": float(parts[4])}
    meta = {}
    for key, pattern in [
        ("api_version", r"API VERSION:\s*(\S+)"),
        ("frame", r"Center pole/equ\s*:\s*(.+?)\s*\{"),
        ("ephemeris", r"Center body name:.*\{source:\s*(\w+)\}"),
        ("center_radii_km", r"Center radii\s*:\s*([\d., ]+?)\s*km"),
        ("refraction", r"Atmos refraction:\s*(.+)"),
    ]:
        found = re.search(pattern, text)
        meta[key] = found.group(1).strip() if found else None
    return rows, meta


def fetch_case(case):
    name, label, lon, lat, alt, start, stop, step = case
    sun_url, sun_text = query("10", lon, lat, alt, start, stop, step)
    time.sleep(1)
    earth_url, earth_text = query("399", lon, lat, alt, start, stop, step)
    sun, meta = parse(sun_text)
    earth, _ = parse(earth_text)
    doc = {
        "source": "NASA/JPL Horizons API",
        "retrieved_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "request_urls": {"sun": sun_url, "earth": earth_url},
        "quantity": "4: apparent azimuth and elevation, airless, degrees; azimuth clockwise from north",
        "horizons": meta,
        "site": {"label": label, "lon_east_deg": lon, "lat_deg": lat, "alt_km": alt},
        "rows": [{"utc": t, "sun": sun[t], "earth": earth[t]} for t in sorted(sun)],
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name + ".json")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, indent=1)
        f.write("\n")
    print("%s: %d rows, frame %s, %s" % (name, len(doc["rows"]), meta["frame"], meta["ephemeris"]))


def main():
    wanted = set(sys.argv[1:])
    for case in CASES:
        if not wanted or case[0] in wanted:
            fetch_case(case)
            time.sleep(1)


if __name__ == "__main__":
    main()
