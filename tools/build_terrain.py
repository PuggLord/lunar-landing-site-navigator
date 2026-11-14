"""Build the lunar polar terrain data files from NASA's LOLA gridded data.

SI disclosure: this file was written with an AI coding tool (Claude Code,
Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
directed and reviewed by team Ksig UNT. See SI_USE.md.

Source: NASA PDS Geosciences Node, LOLA Gridded Data Records, polar products
        https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/
        LDEM_60S_240M and LDEM_60N_240M: 7760 x 7760 int16, half-metres above
        a 1737.4 km sphere, spherical polar stereographic, 240 m per pixel.

Writes:
  vendor/lola-south.js, vendor/lola-north.js   block-mean grids, poleward of 66 deg
  vendor/site-horizons.js                      skylines from the full 240 m grid
  reference/terrain/check-960m.json            skylines from the stored grid, for tests
  reference/terrain/build-report.json          sizes, gates and resolution sensitivity

Grid contract (shared with the JavaScript reader): sphere radius R = 1737.4 km,
rho = 2 R tan((90 - |lat|) / 2). South: x = rho sin(lon), y = rho cos(lon).
North: x = rho sin(lon), y = -rho cos(lon). data[row * size + col] with
x = (col - (size - 1) / 2) * scaleKm and y = ((size - 1) / 2 - row) * scaleKm.
Azimuths are degrees east of north.

The downloaded files are untrusted data and are only read as raw int16 arrays.

Usage:  py -3.12 -I tools/build_terrain.py
Needs Pillow and NumPy. Downloads about 240 MB into .cache/ the first time.
"""

import base64
import json
import os
import re
import sys
import time
import urllib.request
import zlib

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "lola-gdr-polar")
GLOBAL_TIF = os.path.join(ROOT, ".cache", "nasa-svs-4720", "ldem_4_uint.tif")
VENDOR = os.path.join(ROOT, "vendor")
REF = os.path.join(ROOT, "reference", "terrain")
HOSTS = [
    "https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/",
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/",
]
IMG_BYTES = 120_435_200
N = 7760
R = 1737.4
EDGE_LAT = 66.0
UNIT_M = 4
MAX_FILE_BYTES = 3_500_000
STEP_DEG = 0.5
STEP_KM = 0.1
MAX_RANGE_KM = 200.0
EYE_M = 2.0
SI_NOTE = ("SI disclosure: written with an AI coding tool (Claude Code, Anthropic) during the "
           "2026 NASA Space Apps Challenge, Nov 14-15, 2026, directed and reviewed by team "
           "Ksig UNT. See SI_USE.md.")

SITES = {
    "im1": (-80.13, 1.44),
    "im2": (-84.78, 29.13),
    "shackleton-floor": (-89.67, 129.78),
}
SHACKLETON = (-89.67, 129.78)

# The eight ways a square grid can be turned or flipped, tried in this order.
ORIENTS = [
    ("as stored (contract holds)", lambda a: a),
    ("flip columns", lambda a: a[:, ::-1]),
    ("flip rows", lambda a: a[::-1, :]),
    ("rotate 180", lambda a: a[::-1, ::-1]),
    ("transpose", lambda a: a.T),
    ("transpose, flip columns", lambda a: a.T[:, ::-1]),
    ("transpose, flip rows", lambda a: a.T[::-1, :]),
    ("transpose, rotate 180", lambda a: a.T[::-1, ::-1]),
]


def die(msg):
    print("GATE FAILED: " + msg, file=sys.stderr)
    sys.exit(1)


def fetch(name, size=None):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if os.path.exists(path) and (size is None or os.path.getsize(path) == size):
        return path
    last = None
    for host in HOSTS:
        url = host + (name if host == HOSTS[0] else name.lower())
        try:
            print("downloading", url)
            urllib.request.urlretrieve(url, path + ".part")
            if size is not None and os.path.getsize(path + ".part") != size:
                raise IOError("wrong size from " + url)
            os.replace(path + ".part", path)
            return path
        except Exception as exc:  # try the mirror
            last = exc
            print("failed:", exc)
    die("could not download %s (%s)" % (name, last))


def read_label(path):
    text = open(path, "r", encoding="ascii", errors="replace").read()

    def val(key):
        m = re.search(r"^\s*%s\s*=\s*\"?([^\"\r\n<]+?)\"?\s*(?:<.*)?$" % key, text, re.M)
        return m.group(1).strip() if m else None

    lab = {k: val(k) for k in ["PRODUCT_VERSION_ID", "LINES", "LINE_SAMPLES", "SAMPLE_TYPE",
                               "SAMPLE_BITS", "SCALING_FACTOR", "MAP_SCALE", "CENTER_LATITUDE",
                               "CENTER_LONGITUDE", "LINE_PROJECTION_OFFSET",
                               "SAMPLE_PROJECTION_OFFSET", "POSITIVE_LONGITUDE_DIRECTION",
                               "OFFSET"]}
    return lab


def check_label(lab, pole):
    ok = (lab["LINES"] == "7760" and lab["LINE_SAMPLES"] == "7760"
          and lab["SAMPLE_TYPE"] == "LSB_INTEGER" and lab["SAMPLE_BITS"] == "16"
          and float(lab["SCALING_FACTOR"]) == 0.5 and float(lab["MAP_SCALE"]) == 240
          and float(lab["CENTER_LATITUDE"]) == (-90 if pole == "S" else 90)
          and float(lab["CENTER_LONGITUDE"]) == 0
          and float(lab["LINE_PROJECTION_OFFSET"]) == 3879.5
          and float(lab["SAMPLE_PROJECTION_OFFSET"]) == 3879.5
          and lab["POSITIVE_LONGITUDE_DIRECTION"] == "EAST"
          and float(lab["OFFSET"].rstrip(".")) == 1737400)
    if not ok:
        die("label for %s does not match the expected product: %r" % (pole, lab))


# ---------------------------------------------------------------- projection

def rho_km(lat_deg):
    return 2.0 * R * np.tan(np.radians(90.0 - np.abs(lat_deg)) / 2.0)


def latlon_to_xy(lat_deg, lon_deg, pole):
    rho = rho_km(np.asarray(lat_deg, dtype=np.float64))
    lon = np.radians(lon_deg)
    x = rho * np.sin(lon)
    y = rho * np.cos(lon) * (1.0 if pole == "S" else -1.0)
    return x, y


def vec_to_xy(q, pole):
    """Project unit vectors (z toward the north pole, x at lon 0) onto the cap plane."""
    qz = np.clip(q[..., 2], -1.0, 1.0)
    colat = np.arccos(-qz) if pole == "S" else np.arccos(qz)
    rho = 2.0 * R * np.tan(colat / 2.0)
    lon = np.arctan2(q[..., 1], q[..., 0])
    return rho * np.sin(lon), rho * np.cos(lon) * (1.0 if pole == "S" else -1.0)


def sample(grid, scale_km, x, y):
    """Bilinear height in km. NaN where the point is off the grid."""
    n = grid.shape[0]
    c = x / scale_km + (n - 1) / 2.0
    r = (n - 1) / 2.0 - y / scale_km
    bad = ~((c >= 0) & (c <= n - 1) & (r >= 0) & (r <= n - 1))
    c = np.clip(c, 0, n - 1)
    r = np.clip(r, 0, n - 1)
    c0 = np.minimum(np.floor(c).astype(np.int64), n - 2)
    r0 = np.minimum(np.floor(r).astype(np.int64), n - 2)
    fc = c - c0
    fr = r - r0
    v = (grid[r0, c0] * (1 - fc) * (1 - fr) + grid[r0, c0 + 1] * fc * (1 - fr)
         + grid[r0 + 1, c0] * (1 - fc) * fr + grid[r0 + 1, c0 + 1] * fc * fr)
    v = np.asarray(v, dtype=np.float64)
    v[bad] = np.nan
    return v


def site_height(grid, scale_km, lat, lon, pole):
    x, y = latlon_to_xy(np.array([lat]), np.array([lon]), pole)
    return float(sample(grid, scale_km, x, y)[0])


# ---------------------------------------------------------------- skyline

def skyline(grid, scale_km, lat, lon, ground_km, pole, az_deg, chunk=300):
    """Return (elevation deg, distance km) for each azimuth, exact 3D method."""
    la, lo = np.radians(lat), np.radians(lon)
    p = np.array([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)])
    e = np.array([-np.sin(lo), np.cos(lo), 0.0])
    nn = np.array([-np.sin(la) * np.cos(lo), -np.sin(la) * np.sin(lo), np.cos(la)])
    r0 = R + ground_km + EYE_M / 1000.0
    d = np.arange(1, int(round(MAX_RANGE_KM / STEP_KM)) + 1) * STEP_KM
    th = d / R
    cth, sth = np.cos(th), np.sin(th)
    out_el = np.empty(len(az_deg))
    out_d = np.empty(len(az_deg))
    for s in range(0, len(az_deg), chunk):
        az = np.radians(az_deg[s:s + chunk])
        u = np.cos(az)[:, None] * nn[None, :] + np.sin(az)[:, None] * e[None, :]
        q = cth[None, :, None] * p[None, None, :] + sth[None, :, None] * u[:, None, :]
        x, y = vec_to_xy(q, pole)
        h1 = sample(grid, scale_km, x, y)
        off = np.maximum.accumulate(np.isnan(h1), axis=1)
        ht = R + np.where(off, 0.0, h1)
        tp = ht * cth[None, :] - r0
        tn = np.sqrt(ht * ht + r0 * r0 - 2.0 * ht * r0 * cth[None, :])
        el = np.degrees(np.arcsin(np.clip(tp / tn, -1.0, 1.0)))
        el[off] = -np.inf
        k = np.argmax(el, axis=1)
        out_el[s:s + chunk] = el[np.arange(len(k)), k]
        out_d[s:s + chunk] = d[k]
    return out_el, out_d


def skyline_bins(grid, scale_km, lat, lon, pole, subrays):
    ground = site_height(grid, scale_km, lat, lon, pole)
    base = np.arange(int(round(360 / STEP_DEG))) * STEP_DEG
    best_el = np.full(len(base), -np.inf)
    best_d = np.zeros(len(base))
    for off in subrays:
        el, dd = skyline(grid, scale_km, lat, lon, ground, pole, base + off)
        better = el > best_el
        best_el = np.where(better, el, best_el)
        best_d = np.where(better, dd, best_d)
    return ground, best_el, best_d


def summarize(el, dist):
    hi, lo = int(np.argmax(el)), int(np.argmin(el))
    return {"highestDeg": round(float(el[hi]), 3), "highestAzDeg": hi * STEP_DEG,
            "highestDistKm": round(float(dist[hi]), 1),
            "lowestDeg": round(float(el[lo]), 3), "lowestAzDeg": lo * STEP_DEG,
            "lowestDistKm": round(float(dist[lo]), 1),
            "meanDeg": round(float(np.mean(el)), 3)}


# ---------------------------------------------------------------- grids

def block_mean(arr_km, b):
    n = arr_km.shape[0] // b
    return arr_km[:n * b, :n * b].reshape(n, b, n, b).mean(axis=(1, 3))


def encode_grid(q16):
    flat = q16.reshape(-1).astype("<i2")
    diff = flat.copy()
    diff[1:] = flat[1:] - flat[:-1]  # wraps in int16
    return base64.b64encode(zlib.compress(diff.astype("<i2").tobytes(), 9)).decode("ascii")


def decode_grid(b64, size):
    diff = np.frombuffer(zlib.decompress(base64.b64decode(b64)), dtype="<i2")
    return np.cumsum(diff, dtype=np.int16).reshape(size, size)


def write_lola(path, pole, size, scale_km, block, version, b64):
    name = "south" if pole == "S" else "north"
    tag = "60S" if pole == "S" else "60N"
    src = "NASA PDS LOLA GDR LDEM_%s_240M (%s), %dx%d block mean" % (tag, version, block, block)
    d = {"pole": pole, "size": size, "scaleKm": scale_km, "edgeLatDeg": int(EDGE_LAT),
         "unitM": UNIT_M, "radiusKm": R, "source": src,
         "encoding": "int16 LE, units of 4 m, wrapping difference from previous sample, zlib, base64"}
    head = ("/*\n * lola-%s.js (generated by tools/build_terrain.py; do not edit by hand)\n"
            " * %s polar elevation grid from NASA's Lunar Orbiter Laser Altimeter (LOLA),\n"
            " * poleward of %d degrees. %d x %d cells, %.2f km apart, heights in units of %d m\n"
            " * above a %.1f km sphere. Spherical polar stereographic, true scale at the pole.\n"
            " * x = rho sin(lon), y = %srho cos(lon); row 0 is the top (+y).\n"
            " * Source: %s\n"
            " * Rebuild: py -3.12 -I tools/build_terrain.py\n"
            " * %s\n */\n") % (name, "South" if pole == "S" else "North", int(EDGE_LAT), size, size,
                               scale_km, UNIT_M, R, "" if pole == "S" else "-", src, SI_NOTE)
    body = "(function (root) {\n  var d = " + json.dumps(d, indent=2).replace("\n", "\n  ")[:-1].rstrip()
    body += ",\n    \"b64\": \"" + b64 + "\" };\n"
    body = body.replace('"', "'")
    body += ("  if (typeof module === 'object' && module.exports) module.exports = d;\n"
             "  root.LOLA_POLAR = root.LOLA_POLAR || {};\n"
             "  root.LOLA_POLAR.%s = d;\n"
             "})(typeof self !== 'undefined' ? self : this);\n") % name
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(head + body)


def read_b64(path):
    text = open(path, "r", encoding="utf-8").read()
    m = re.search(r"'b64': '([A-Za-z0-9+/=]+)'", text)
    if not m:
        die("could not find b64 in " + path)
    return m.group(1)


def corr_gate(blocks_km, pole, tif_km, lat_min=62.0, scale=0.96):
    rng = np.random.default_rng(20261114)
    lat = rng.uniform(lat_min, 88.0, 300) * (-1.0 if pole == "S" else 1.0)
    lon = rng.uniform(-180.0, 180.0, 300)
    x, y = latlon_to_xy(lat, lon, pole)
    mine = sample(blocks_km, scale, x, y)
    # Bilinear read of the global map: row 0 is the north edge, column 0 is -180 deg.
    c = (lon + 180.0) * 4.0 - 0.5
    r = (90.0 - lat) * 4.0 - 0.5
    r = np.clip(r, 0, 719)
    c0 = np.floor(c).astype(int)
    fc = c - c0
    c0 %= 1440
    c1 = (c0 + 1) % 1440
    r0 = np.minimum(np.floor(r).astype(int), 718)
    fr = r - r0
    ref = (tif_km[r0, c0] * (1 - fc) * (1 - fr) + tif_km[r0, c1] * fc * (1 - fr)
           + tif_km[r0 + 1, c0] * (1 - fc) * fr + tif_km[r0 + 1, c1] * fc * fr)
    ok = ~np.isnan(mine)
    return float(np.corrcoef(mine[ok], ref[ok])[0, 1]), int(ok.sum()), (lat, lon, mine, ref)


def ring_cells(full, lat, lon, pole, r_min, r_max):
    """Heights (km) and positions of 240 m cells whose ground distance is in range."""
    x0, y0 = latlon_to_xy(np.array([lat]), np.array([lon]), pole)
    x0, y0 = float(x0[0]), float(y0[0])
    half = int((r_max + 2.0) / 0.24) + 3
    cc = int(round(x0 / 0.24 + (N - 1) / 2.0))
    rc = int(round((N - 1) / 2.0 - y0 / 0.24))
    rows = np.arange(rc - half, rc + half + 1)
    cols = np.arange(cc - half, cc + half + 1)
    cg, rg = np.meshgrid(cols, rows)
    xs = (cg - (N - 1) / 2.0) * 0.24
    ys = ((N - 1) / 2.0 - rg) * 0.24
    rho = np.hypot(xs, ys)
    colat = 2.0 * np.arctan(rho / (2.0 * R))
    lon_c = np.arctan2(xs, ys if pole == "S" else -ys)
    lat_c = (-1.0 if pole == "S" else 1.0) * (np.pi / 2 - colat)
    la, lo = np.radians(lat), np.radians(lon)
    cosd = (np.sin(la) * np.sin(lat_c)
            + np.cos(la) * np.cos(lat_c) * np.cos(lo - lon_c))
    dist = R * np.arccos(np.clip(cosd, -1.0, 1.0))
    sel = (dist >= r_min) & (dist <= r_max)
    return full[rg[sel], cg[sel]], np.degrees(lat_c[sel]), np.degrees(lon_c[sel])


def js_number_list(vals, nd):
    return "[" + ",".join(("%." + str(nd) + "f") % v for v in vals) + "]"


def main():
    t_start = time.time()
    os.makedirs(VENDOR, exist_ok=True)
    os.makedirs(REF, exist_ok=True)

    labels, imgs = {}, {}
    for pole, tag in (("S", "60S"), ("N", "60N")):
        labels[pole] = read_label(fetch("LDEM_%s_240M.LBL" % tag))
        check_label(labels[pole], pole)
        imgs[pole] = fetch("LDEM_%s_240M.IMG" % tag, IMG_BYTES)
    versions = {p: labels[p]["PRODUCT_VERSION_ID"] for p in labels}
    print("product versions", versions)

    if not os.path.exists(GLOBAL_TIF):
        die("missing cross-check file " + GLOBAL_TIF + " (run tools/build_moon_maps.py first)")
    tif = np.array(Image.open(GLOBAL_TIF)).astype(np.float64)
    if tif.shape != (720, 1440):
        die("unexpected global map shape %r" % (tif.shape,))
    tif_km = tif / 2000.0 - 10.0

    # ---- read, orient, gate 1
    fulls, orient_used, corrs = {}, {}, {}
    for pole in ("S", "N"):
        raw = np.fromfile(imgs[pole], dtype="<i2")
        if raw.size != N * N:
            die("unexpected sample count in " + imgs[pole])
        raw = raw.reshape(N, N)
        blocks = block_mean(raw.astype(np.float32) * 0.0005, 4)  # km
        tried = []
        chosen = None
        for i, (label, fn) in enumerate(ORIENTS):
            c, n_ok, _ = corr_gate(fn(blocks), pole, tif_km)
            tried.append((label, round(c, 4)))
            if c > 0.95:
                chosen = i
                break
        print(pole, "orientation trials:", tried)
        if chosen is None:
            die("%s cap: no orientation reaches correlation 0.95 against the global map: %r"
                % (pole, tried))
        orient_used[pole] = ORIENTS[chosen][0]
        corrs[pole] = tried[-1][1]
        fulls[pole] = np.ascontiguousarray(ORIENTS[chosen][1](raw)).astype(np.float32) * 0.0005
        del raw, blocks

    # ---- vendor grids
    block = 4
    while True:
        nb = N // block
        scale = 0.24 * block
        size = int(np.ceil(2.0 * rho_km(EDGE_LAT) / scale))
        size += size % 2
        start = (nb - size) // 2
        sizes, b64s, grids = {}, {}, {}
        for pole, name in (("S", "south"), ("N", "north")):
            bm = block_mean(fulls[pole][:nb * block, :nb * block], block)
            crop = bm[start:start + size, start:start + size]
            q16 = np.rint(crop * 1000.0 / UNIT_M).astype(np.int16)
            b64s[pole] = encode_grid(q16)
            grids[pole] = q16
            path = os.path.join(VENDOR, "lola-%s.js" % name)
            write_lola(path, pole, size, round(scale, 4), block, versions[pole], b64s[pole])
            sizes[pole] = os.path.getsize(path)
        print("block %d: size %d, files %s bytes" % (block, size, sizes))
        if max(sizes.values()) <= MAX_FILE_BYTES or block == 5:
            break
        block = 5
    if max(sizes.values()) > MAX_FILE_BYTES:
        die("vendor files still above %d bytes with 5x5 blocks: %r" % (MAX_FILE_BYTES, sizes))

    # ---- gate 3: round trip from the files on disk
    for pole, name in (("S", "south"), ("N", "north")):
        back = decode_grid(read_b64(os.path.join(VENDOR, "lola-%s.js" % name)), size)
        if not np.array_equal(back, grids[pole]):
            die("round trip failed for " + name)
    print("gate 3 round trip: exact for both files")

    stored_km = {p: grids[p].astype(np.float64) * UNIT_M / 1000.0 for p in grids}

    # ---- stored-grid correlation (extra check on the cropped, quantised data)
    stored_corr = {}
    for pole in ("S", "N"):
        c, n_ok, _ = corr_gate(stored_km[pole], pole, tif_km, lat_min=66.5, scale=scale)
        stored_corr[pole] = round(c, 4)

    # ---- gate 2: Shackleton depth, from the 240 m grid
    s_full = fulls["S"]
    centre_km = site_height(s_full, 0.24, SHACKLETON[0], SHACKLETON[1], "S")
    ring_h, _, _ = ring_cells(s_full, SHACKLETON[0], SHACKLETON[1], "S", 12.0, 16.0)
    depth_km = float(np.mean(ring_h)) - centre_km
    print("gate 2 Shackleton: centre %.3f km, ring mean %.3f km, depth %.3f km"
          % (centre_km, float(np.mean(ring_h)), depth_km))
    if depth_km < 2.0:
        die("Shackleton centre is only %.3f km below the 12 to 16 km ring" % depth_km)

    # ---- shackleton rim: highest cell within 14 km
    near_h, near_lat, near_lon = ring_cells(s_full, SHACKLETON[0], SHACKLETON[1], "S", 0.0, 14.0)
    k = int(np.argmax(near_h))
    rim_lat, rim_lon, rim_h = float(near_lat[k]), float(near_lon[k]), float(near_h[k])
    rim_lat, rim_lon = round(rim_lat, 4), round(rim_lon, 4)
    print("rim: lat %.4f lon %.4f height %.3f km" % (rim_lat, rim_lon, rim_h))
    sites = dict(SITES)
    sites["shackleton-rim"] = (rim_lat, rim_lon)

    # ---- skylines
    subrays = [-0.2, -0.1, 0.0, 0.1, 0.2]
    horizons, check, report_sites = {}, {}, {}
    for sid, (lat, lon) in sites.items():
        g240, el240, d240 = skyline_bins(s_full, 0.24, lat, lon, "S", subrays)
        g960, el960, d960 = skyline_bins(stored_km["S"], scale, lat, lon, "S", [0.0])
        horizons[sid] = (lat, lon, g240, el240, d240)
        diff = np.abs(el240 - el960)
        report_sites[sid] = {
            "latDeg": lat, "lonDeg": lon,
            "grid240": dict(groundKm=round(g240, 4), **summarize(el240, d240)),
            "grid960": dict(groundKm=round(g960, 4), **summarize(el960, d960)),
            "diff240vs960SingleRayDeg": {"meanAbs": round(float(diff.mean()), 4),
                                         "maxAbs": round(float(diff.max()), 4)}}
        if sid != "shackleton-floor":
            check[sid] = (lat, lon, g960, el960, d960)
        print(sid, "240m hi %.2f lo %.2f mean %.2f | diff mean %.3f max %.3f"
              % (el240.max(), el240.min(), el240.mean(), diff.mean(), diff.max()))

    # site-horizons.js
    hs = []
    for sid, (lat, lon, g, el, dd) in horizons.items():
        hs.append("    %s: { latDeg: %s, lonDeg: %s, groundKm: %.4f,\n      elevDeg: %s,\n      distKm: %s }"
                  % (json.dumps(sid).replace('"', "'"), lat, lon, g,
                     js_number_list(el, 2), js_number_list(dd, 1)))
    src = ("NASA PDS LOLA GDR LDEM_60S_240M (%s), full 240 m grid, 5 sub-rays per bin"
           % versions["S"])
    head = ("/*\n * site-horizons.js (generated by tools/build_terrain.py; do not edit by hand)\n"
            " * Skyline of the real lunar terrain seen from four polar places, from the full 240 m\n"
            " * LOLA grid. elevDeg[i] is the skyline height in degrees at azimuth i * 0.5 (degrees\n"
            " * east of north), distKm[i] the ground distance to the point that sets it. Each bin\n"
            " * is the maximum over rays at -0.2, -0.1, 0, +0.1, +0.2 degrees, marched in 0.1 km\n"
            " * steps to 200 km, eye height 2 m. groundKm is height above the 1737.4 km sphere.\n"
            " * Source: %s\n * Rebuild: py -3.12 -I tools/build_terrain.py\n * %s\n */\n") % (src, SI_NOTE)
    body = ("(function (root) {\n  var d = { stepDeg: 0.5, gridM: 240, maxRangeKm: 200, eyeHeightM: 2, "
            "radiusKm: 1737.4,\n    source: '%s',\n    sites: {\n%s\n    } };\n"
            "  if (typeof module === 'object' && module.exports) module.exports = d;\n"
            "  root.SITE_HORIZONS = d;\n})(typeof self !== 'undefined' ? self : this);\n"
            % (src, ",\n".join(hs)))
    hpath = os.path.join(VENDOR, "site-horizons.js")
    with open(hpath, "w", encoding="utf-8", newline="\n") as f:
        f.write(head + body)

    # check-960m.json
    cj = {"_note": SI_NOTE + " Skylines from the stored 960 m grid (vendor/lola-south.js), one ray "
                   "per bin, for testing the JavaScript ray-marcher.",
          "stepDeg": STEP_DEG, "maxRangeKm": 200, "eyeHeightM": 2, "scaleKm": round(scale, 4),
          "sites": {}}
    for sid, (lat, lon, g, el, dd) in check.items():
        cj["sites"][sid] = {"latDeg": lat, "lonDeg": lon, "groundKm": round(g, 5),
                            "elevDeg": [round(float(v), 4) for v in el],
                            "distKm": [round(float(v), 1) for v in dd]}
    with open(os.path.join(REF, "check-960m.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(cj, f, separators=(",", ":"))
        f.write("\n")

    report = {
        "_note": SI_NOTE,
        "productVersions": versions,
        "orientation": orient_used,
        "blockSize": block, "gridSize": size, "scaleKm": round(scale, 4),
        "vendorFileBytes": {"lola-south.js": sizes["S"], "lola-north.js": sizes["N"],
                            "site-horizons.js": os.path.getsize(hpath)},
        "correlationVsGlobalMap": corrs,
        "correlationStoredGridVsGlobalMap": stored_corr,
        "shackleton": {"centreKm": round(centre_km, 4), "ring12to16MeanKm": round(float(np.mean(ring_h)), 4),
                       "depthKm": round(depth_km, 4),
                       "rim": {"latDeg": rim_lat, "lonDeg": rim_lon, "heightKm": round(rim_h, 4)}},
        "sites": report_sites,
    }
    report["buildSeconds"] = round(time.time() - t_start, 1)
    with open(os.path.join(REF, "build-report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=2)
        f.write("\n")
    print("correlations", corrs, "stored", stored_corr)
    print("done in %.1f s" % (time.time() - t_start))


if __name__ == "__main__":
    main()
