"""
build_sunmap.py: a map of how much of one year each place near the Moon's
south pole spends with the Sun above its skyline.

The map has 1.44 km cells (6 by 6 pixels of NASA's 240 m LOLA grid) poleward
of 84 degrees south. Each cell is judged at its highest pixel: the script
finds the skyline seen from there, then counts the hours in one year when the
centre of the Sun is above that skyline. It writes vendor/sunlight-map.js
for the page and reference/terrain/sunmap-report.json with its checks.

The Sun's direction for each hour comes from src/lunar-sky.js, the same code
the page uses, run through Node.

Needs NumPy and Pillow, Node.js, and the files tools/build_terrain.py and
tools/build_moon_maps.py leave in .cache/.

    python -I tools/build_sunmap.py            the full map, about fifteen minutes
    python -I tools/build_sunmap.py --quick    5.76 km cells, about a minute, writes nothing

SI disclosure: written with an AI coding tool (Claude Code, Anthropic) during
the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, directed and reviewed by
team Ksig UNT. See SI_USE.md.
"""
import base64
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import build_terrain as bt  # noqa: E402

R = bt.R
PX_KM = 0.24                 # the LOLA grid
BLOCK = 6                    # map cell = 6 by 6 LOLA pixels, 1.44 km
CROP = 4400                  # LOLA pixels kept, centred on the pole: 528 km each way, which
                             # holds every ray from the map and from the four check sites
EDGE_LAT = 84.0              # the map covers 84 S to the pole
AZ_STEP = 1.0                # one ray per degree for the map
START = "2026-11-15T00:00:00Z"
HOURS = 8766                 # 365.25 days
SPOTS = 5
SPOT_GAP_KM = 12.0
F = np.float32


def distances():
    """Ray distances in km: half a pixel at first, growing with distance, capped at 3 pixels."""
    out, d = [], 0.12
    while d <= bt.MAX_RANGE_KM:
        out.append(d)
        d += min(max(0.012 * d, 0.12), 0.72)
    return np.array(out)


def load_south():
    """The middle of the south grid in km: CROP pixels square, centred on the pole."""
    path = os.path.join(bt.CACHE, "LDEM_60S_240M.IMG")
    if os.path.getsize(path) != bt.IMG_BYTES:
        bt.die("unexpected size of the south grid file")
    raw = np.memmap(path, dtype="<i2", mode="r", shape=(bt.N, bt.N))
    a = (bt.N - CROP) // 2
    km = np.asarray(raw[a:a + CROP, a:a + CROP], dtype=np.float32) * F(0.0005)
    del raw
    tif = np.array(Image.open(bt.GLOBAL_TIF)).astype(np.float64) / 2000.0 - 10.0
    blocks = bt.block_mean(km, 4)
    for label, fn in bt.ORIENTS:
        c, _, _ = bt.corr_gate(fn(blocks), "S", tif, lat_min=74.0)
        if c > 0.95:
            print("orientation:", label, "correlation %.4f" % c)
            return np.ascontiguousarray(fn(km))
    bt.die("no orientation of the south grid matches the global map")


def sun_track():
    code = (
        "const S=require('./src/lunar-sky.js');const t0=Date.parse('%s');const o=[];"
        "for(let i=0;i<%d;i++){o.push(S.subPoints(new Date(t0+i*3600e3)).sun.direction);}"
        "process.stdout.write(JSON.stringify(o));" % (START, HOURS)
    )
    out = subprocess.run(["node", "-e", code], cwd=bt.ROOT, capture_output=True, check=True).stdout
    s = np.array(json.loads(out), dtype=np.float64)
    assert s.shape == (HOURS, 3)
    return s


def bases(x, y):
    """Up, east and north unit vectors for points given in the south cap plane (km)."""
    rho = np.hypot(x, y)
    lat = 2.0 * np.arctan(rho / (2.0 * R)) - np.pi / 2.0
    lon = np.arctan2(x, y)
    cl, sl, co, so = np.cos(lat), np.sin(lat), np.cos(lon), np.sin(lon)
    p = np.stack([cl * co, cl * so, sl], axis=1)
    e = np.stack([-so, co, np.zeros_like(so)], axis=1)
    n = np.stack([-sl * co, -sl * so, cl], axis=1)
    return p, e, n, np.degrees(lat), np.degrees(lon)


def heights(full, x, y):
    """Bilinear height in km, float32. The caller keeps every point on the grid."""
    n = full.shape[0]
    c = x * F(1.0 / PX_KM) + F((n - 1) / 2.0)
    r = F((n - 1) / 2.0) - y * F(1.0 / PX_KM)
    c0 = c.astype(np.int32)
    r0 = r.astype(np.int32)
    fc = c - c0
    fr = r - r0
    top = full[r0, c0] * (1 - fc) + full[r0, c0 + 1] * fc
    bot = full[r0 + 1, c0] * (1 - fc) + full[r0 + 1, c0 + 1] * fc
    return top * (1 - fr) + bot * fr


def fast_skylines(full, x, y, chunk=2500, progress=None, keep=None):
    """
    Skyline elevation in degrees, one row per point and one column per degree of azimuth.
    With `keep`, each finished chunk is saved in that folder, and a run that was
    stopped picks up where it left off.
    """
    if keep:
        os.makedirs(keep, exist_ok=True)
    d = distances()
    th = d / R
    cth, sth = np.cos(th).astype(F), np.sin(th).astype(F)
    omc = (2.0 * np.sin(th / 2.0) ** 2).astype(F)      # 1 - cos, kept accurate for small angles
    az = np.radians(np.arange(0.0, 360.0, AZ_STEP))
    out = np.empty((len(x), len(az)), dtype=np.float32)
    t0 = time.time()
    for s in range(0, len(x), chunk):
        xs, ys = x[s:s + chunk], y[s:s + chunk]
        saved = os.path.join(keep, "sky_%06d.npy" % s) if keep else None
        if saved and os.path.exists(saved):
            part = np.load(saved)
            if part.shape == (len(xs), len(az)):
                out[s:s + chunk] = part
                continue
        p, e, n, _, _ = bases(xs, ys)
        ground = heights(full, xs.astype(F), ys.astype(F)).astype(np.float64)
        eye = (ground + bt.EYE_M / 1000.0).astype(F)[:, None]
        p32 = p.astype(F)
        for j, a in enumerate(az):
            u = (np.cos(a) * n + np.sin(a) * e).astype(F)
            qx = cth[None, :] * p32[:, 0:1] + sth[None, :] * u[:, 0:1]
            qy = cth[None, :] * p32[:, 1:2] + sth[None, :] * u[:, 1:2]
            qz = cth[None, :] * p32[:, 2:3] + sth[None, :] * u[:, 2:3]
            k = F(2.0 * R) / (1.0 - qz)
            h1 = heights(full, k * qy, k * qx)
            rad = F(R) + h1
            tp = (h1 - eye) - rad * omc[None, :]
            tn = np.sqrt(tp * tp + (rad * sth[None, :]) ** 2)
            out[s:s + chunk, j] = np.degrees(np.arcsin(np.clip((tp / tn).max(axis=1), -1.0, 1.0)))
        if saved:
            np.save(saved, out[s:s + chunk])
        if progress:
            done = min(s + chunk, len(x))
            print("  %s: %d of %d points, %.0f s" % (progress, done, len(x), time.time() - t0), flush=True)
    return out


def sunlit_percent(p, e, n, sky, sun, step_deg, chunk=300):
    """Percent of the hours in `sun` with the Sun's centre above the skyline."""
    bins = sky.shape[1]
    s32 = sun.astype(F).T                                # 3 by hours
    out = np.empty(len(p))
    for s in range(0, len(p), chunk):
        ps, es, ns = (v[s:s + chunk].astype(F) for v in (p, e, n))
        el = np.degrees(np.arcsin(np.clip(ps @ s32, -1.0, 1.0)))
        az = np.degrees(np.arctan2(es @ s32, ns @ s32)) % 360.0
        b = az / F(step_deg)
        b0 = np.floor(b).astype(np.int32) % bins
        fb = b - np.floor(b)
        rows = np.arange(el.shape[0])[:, None]
        k = sky[s:s + chunk]
        line = k[rows, b0] * (1 - fb) + k[rows, (b0 + 1) % bins] * fb
        out[s:s + chunk] = (el > line).mean(axis=1) * 100.0
    return out


def plane_xy(lat, lon):
    x, y = bt.latlon_to_xy(np.array([lat], dtype=np.float64), np.array([lon], dtype=np.float64), "S")
    return x, y


def read_site_horizons():
    """The four skylines tools/build_terrain.py stored, for the cross-check."""
    text = open(os.path.join(bt.VENDOR, "site-horizons.js"), encoding="utf-8").read()
    out = {}
    for m in re.finditer(r"'([a-z0-9-]+)':\s*\{\s*latDeg:\s*([-0-9.]+),\s*lonDeg:\s*([-0-9.]+),[^\[]*?elevDeg:\s*\[([^\]]*)\]", text):
        out[m.group(1)] = (float(m.group(2)), float(m.group(3)),
                           np.array([float(v) for v in m.group(4).split(",")]))
    return out


def main():
    quick = "--quick" in sys.argv
    blk = 4 * BLOCK if quick else BLOCK
    cell = blk * PX_KM
    t_start = time.time()
    full = load_south()
    sun = sun_track()
    print("sun track: %d hours from %s, sub-solar latitude %.2f to %.2f deg"
          % (HOURS, START, np.degrees(np.arcsin(sun[:, 2].min())), np.degrees(np.arcsin(sun[:, 2].max()))))

    # ---- check the fast skyline against the stored ones, and the yearly share against both
    stored = read_site_horizons()
    if len(stored) < 4:
        bt.die("could not read the stored skylines from vendor/site-horizons.js")
    checks = []
    for sid, (lat, lon, stored_el) in stored.items():
        x, y = plane_xy(lat, lon)
        p, e, n, _, _ = bases(x, y)
        fast = fast_skylines(full, x, y)
        pct_fast = float(sunlit_percent(p, e, n, fast, sun, AZ_STEP)[0])
        exact = stored_el.astype(np.float32)[None, :]
        pct_exact = float(sunlit_percent(p, e, n, exact, sun, bt.STEP_DEG)[0])
        diff = fast[0] - exact[0][::2]
        row = {"id": sid, "latDeg": lat, "lonEastDeg": lon,
               "percentFast": round(pct_fast, 2), "percentStored": round(pct_exact, 2),
               "skylineMeanAbsDiffDeg": round(float(np.abs(diff).mean()), 3),
               "skylineMaxAbsDiffDeg": round(float(np.abs(diff).max()), 3)}
        checks.append(row)
        print("check", row, flush=True)

    # ---- the map
    half = bt.rho_km(EDGE_LAT)
    size = 2 * int(np.ceil(half / cell))
    npx = full.shape[0]
    first = npx // 2 - (size // 2) * blk              # first LOLA pixel of the map, rows and columns
    sub = full[first:first + size * blk, first:first + size * blk]
    sub = sub.reshape(size, blk, size, blk).transpose(0, 2, 1, 3).reshape(size, size, blk * blk)
    top = sub.argmax(axis=2)                          # the highest pixel of each cell
    prow = first + np.arange(size)[:, None] * blk + top // blk
    pcol = first + np.arange(size)[None, :] * blk + top % blk
    px = (pcol - (npx - 1) / 2.0) * PX_KM
    py = ((npx - 1) / 2.0 - prow) * PX_KM
    cx = (np.arange(size) - (size - 1) / 2.0) * cell
    gx, gy = np.meshgrid(cx, -cx)
    inside = np.hypot(gx, gy) <= half
    x, y = px[inside], py[inside]
    print("map: %d by %d cells of %.2f km, %d inside %.0f S" % (size, size, cell, len(x), EDGE_LAT), flush=True)
    keep = None if quick else os.path.join(bt.ROOT, ".cache", "sunmap", "block%d-crop%d" % (blk, CROP))
    sky = fast_skylines(full, x, y, progress="skylines", keep=keep)
    p, e, n, lat, lon = bases(x, y)
    pct = sunlit_percent(p, e, n, sky, sun, AZ_STEP)
    grid = np.full((size, size), np.nan)
    grid[inside] = pct
    print("map done in %.0f s. Share of the year in sunlight: min %.1f, median %.1f, max %.1f percent"
          % (time.time() - t_start, pct.min(), np.median(pct), pct.max()), flush=True)
    print("cells at 0 percent: %d, cells above 80 percent: %d" % ((pct == 0).sum(), (pct > 80).sum()))

    # ---- the sunniest places, at least SPOT_GAP_KM apart
    order = np.argsort(-pct)
    picked = []
    for i in order:
        if all(np.hypot(x[i] - x[j], y[i] - y[j]) >= SPOT_GAP_KM for j in picked):
            picked.append(i)
        if len(picked) == SPOTS:
            break
    spots = []
    for rank, i in enumerate(picked, 1):
        # every 240 m pixel within 1.44 km of the cell's highest pixel
        off = np.arange(-6, 7) * PX_KM
        ox, oy = np.meshgrid(x[i] + off, y[i] + off)
        ox, oy = ox.ravel(), oy.ravel()
        fsky = fast_skylines(full, ox, oy)
        fp, fe, fn, flat, flon = bases(ox, oy)
        fpct = sunlit_percent(fp, fe, fn, fsky, sun, AZ_STEP)
        b = int(np.argmax(fpct))
        blat, blon = float(round(flat[b], 4)), float(round(flon[b] % 360.0, 4))
        ground, el, dist = bt.skyline_bins(full, PX_KM, blat, blon, "S", [-0.2, -0.1, 0.0, 0.1, 0.2])
        bx, by = plane_xy(blat, blon)
        bp, be, bn, _, _ = bases(bx, by)
        exact_pct = float(sunlit_percent(bp, be, bn, el.astype(np.float32)[None, :], sun, bt.STEP_DEG)[0])
        spot = {
            "id": "sun-%d" % rank, "latDeg": blat, "lonEastDeg": blon,
            "groundKm": round(float(ground), 4),
            "poleKm": round(float(np.hypot(bx[0], by[0])), 1),
            "percent": round(exact_pct, 1),
            "percentCell": round(float(pct[i]), 1),
            "percentFast": round(float(fpct[b]), 1),
            "elevDeg": [round(float(v), 3) for v in el],
            "distKm": [round(float(v), 1) for v in dist],
        }
        spots.append(spot)
        print("spot", {k: v for k, v in spot.items() if k not in ("elevDeg", "distKm")}, flush=True)

    report = {
        "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "start": START, "hours": HOURS, "cellKm": cell, "edgeLatDeg": EDGE_LAT,
        "cells": int(len(x)), "raySteps": int(len(distances())), "azStepDeg": AZ_STEP,
        "percentMin": round(float(pct.min()), 2), "percentMedian": round(float(np.median(pct)), 2),
        "percentMax": round(float(pct.max()), 2),
        "cellsAtZero": int((pct == 0).sum()), "cellsAbove80": int((pct > 80).sum()),
        "checks": checks,
        "spots": [{k: v for k, v in s.items() if k not in ("elevDeg", "distKm")} for s in spots],
        "seconds": round(time.time() - t_start),
    }
    if quick:
        print(json.dumps(report, indent=1))
        return

    q = np.full((size, size), 255, dtype=np.uint8)
    q[inside] = np.clip(np.round(pct * 2.0), 0, 200).astype(np.uint8)
    data = {
        "pole": "south", "size": size, "scaleKm": cell, "edgeLatDeg": EDGE_LAT,
        "start": START, "hours": HOURS, "stepHours": 1,
        "gridM": 240, "azStepDeg": AZ_STEP, "maxRangeKm": bt.MAX_RANGE_KM, "eyeHeightM": bt.EYE_M,
        "encoding": "uint8 rows from the top, value = percent of the year times 2, 255 = outside the map",
        "source": "NASA PDS LOLA GDR LDEM_60S_240M",
        "b64": base64.b64encode(q.tobytes()).decode("ascii"),
        "spots": spots,
    }
    head = "\n".join([
        "/*",
        " * sunlight-map.js (generated by tools/build_sunmap.py; do not edit by hand)",
        " * Share of one year (%d hours from %s) with the centre of the Sun above the" % (HOURS, START),
        " * skyline, for each %.2f km cell poleward of %.0f degrees south. A cell is judged at its" % (cell, EDGE_LAT),
        " * highest pixel of the 240 m LOLA grid. Skylines use that full grid: one ray per degree",
        " * of azimuth out to %.0f km, eye height %.0f m." % (bt.MAX_RANGE_KM, bt.EYE_M),
        " * Projection: polar stereographic, x = rho sin(lon), y = rho cos(lon), row 0 at the top.",
        " * spots are the sunniest 240 m pixels found, at least %.0f km apart, each with a skyline" % SPOT_GAP_KM,
        " * in the same form as vendor/site-horizons.js.",
        " * Rebuild: python -I tools/build_sunmap.py",
        " * " + bt.SI_NOTE,
        " */",
    ])
    body = ("(function (root) {\n  var data = " + json.dumps(data, separators=(",", ":")) + ";\n"
            "  if (typeof module === 'object' && module.exports) module.exports = data;\n"
            "  else root.SUNLIGHT_MAP = data;\n})(typeof self !== 'undefined' ? self : this);\n")
    path = os.path.join(bt.VENDOR, "sunlight-map.js")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(head + "\n" + body)
    with open(os.path.join(bt.REF, "sunmap-report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
        f.write("\n")
    print("wrote %s (%d bytes) in %.0f s" % (path, os.path.getsize(path), time.time() - t_start))


if __name__ == "__main__":
    main()
