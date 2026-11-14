"""Fetch the sub-solar and sub-Earth points on the Moon from NASA JPL Horizons.

SI disclosure: this file was written with an AI coding tool (Claude Code,
Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
directed and reviewed by team Ksig UNT. See SI_USE.md.

The sub-solar point is the place on the Moon where the Sun is straight
overhead. The sub-Earth point is the same for the Earth. The 3D Moon on the
page lights the globe from the first and marks both, so the tests compare our
values with these.

Data source: NASA/JPL Horizons API, https://ssd.jpl.nasa.gov/api/horizons.api
Usage:  python tools/fetch_subpoints.py
Standard library only.
"""

import datetime
import json
import os
import re
import time
import urllib.parse
import urllib.request

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reference", "horizons-subpoints")

# name, start, stop, step
CASES = [
    ("subpoints_2024", "2024-02-15 00:00", "2024-03-20 00:00", "6 h"),
    ("subpoints_2026", "2026-11-01 00:00", "2026-12-06 00:00", "6 h"),
]

MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def wrap(lon):
    return lon - 360.0 if lon > 180.0 else lon


def fetch_case(name, start, stop, step):
    params = {
        "format": "text",
        "COMMAND": "'301'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'500@399'",
        "START_TIME": "'%s'" % start,
        "STOP_TIME": "'%s'" % stop,
        "STEP_SIZE": "'%s'" % step,
        "QUANTITIES": "'14,15'",
        "CSV_FORMAT": "'YES'",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=60) as resp:
        text = resp.read().decode("utf-8")
    if "$$SOE" not in text:
        raise RuntimeError("Horizons returned no table:\n" + text[:800])
    rows = []
    for line in text.split("$$SOE", 1)[1].split("$$EOE", 1)[0].strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        m = re.match(r"(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})", parts[0])
        utc = "%s-%02d-%sT%s:%s:00Z" % (m.group(1), MONTHS[m.group(2)], m.group(3), m.group(4), m.group(5))
        rows.append({
            "utc": utc,
            "earth": {"lon_east_deg": wrap(float(parts[3])), "lat_deg": float(parts[4])},
            "sun": {"lon_east_deg": wrap(float(parts[5])), "lat_deg": float(parts[6])},
        })
    frame = re.search(r"Target pole/equ\s*:\s*(.+?)\s*\{", text)
    doc = {
        "source": "NASA/JPL Horizons API",
        "retrieved_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "request_url": url,
        "quantities": "14: sub-observer longitude and latitude seen from the Earth's centre; "
                      "15: sub-solar longitude and latitude. Degrees, east-positive.",
        "frame": frame.group(1).strip() if frame else None,
        "rows": rows,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, name + ".json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, indent=1)
        f.write("\n")
    print("%s: %d rows, frame %s" % (name, len(rows), doc["frame"]))


def main():
    for case in CASES:
        fetch_case(*case)
        time.sleep(1)


if __name__ == "__main__":
    main()
