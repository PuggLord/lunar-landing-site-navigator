/*
 * Tests for vendor/sunlight-map.js, the sunlight map tools/build_sunmap.py
 * makes with NumPy. The page's own JavaScript calculation is run on the map's
 * sunniest points for the same year, and the two answers are compared.
 * Run: node --test
 *
 * SI disclosure: written with an AI coding tool (Claude Code, Anthropic)
 * during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, directed and
 * reviewed by team Ksig UNT. See SI_USE.md.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const LunarSky = require('../src/lunar-sky.js');
const LunarTerrain = require('../src/terrain.js');

const MAP_FILE = path.join(__dirname, '..', 'vendor', 'sunlight-map.js');
const REPORT_FILE = path.join(__dirname, '..', 'reference', 'terrain', 'sunmap-report.json');
const R = 1737.4;
const RAD = Math.PI / 180;

function load(t) {
  if (!fs.existsSync(MAP_FILE) || !fs.existsSync(REPORT_FILE)) {
    t.skip('sunlight map not built yet');
    return null;
  }
  return { map: require(MAP_FILE), report: JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8')) };
}

/* Row and column of the map cell that holds a place, by the projection in the file header. */
function cellOf(map, latDeg, lonDeg) {
  const rho = 2 * R * Math.tan((90 - Math.abs(latDeg)) * RAD / 2);
  const x = rho * Math.sin(lonDeg * RAD);
  const y = rho * Math.cos(lonDeg * RAD);
  return {
    row: Math.round((map.size - 1) / 2 - y / map.scaleKm),
    col: Math.round(x / map.scaleKm + (map.size - 1) / 2)
  };
}

test('the sunlight map decodes to a square of the stated size', (t) => {
  const d = load(t);
  if (!d) return;
  const bytes = Buffer.from(d.map.b64, 'base64');
  assert.equal(bytes.length, d.map.size * d.map.size);
  let inside = 0, max = 0, zero = 0;
  for (const v of bytes) {
    if (v === 255) continue;
    assert.ok(v <= 200, 'a value above 100 percent');
    inside++;
    if (v > max) max = v;
    if (v === 0) zero++;
  }
  assert.equal(inside, d.report.cells);
  assert.ok(Math.abs(max / 2 - d.report.percentMax) <= 0.25);
  assert.ok(zero > 0, 'no cell is dark all year, but the south pole has craters the Sun never reaches');
  t.diagnostic(`${inside} cells, ${zero} dark all year, brightest ${max / 2} percent`);
});

test('the floor of Shackleton crater is dark all year on the map', (t) => {
  const d = load(t);
  if (!d) return;
  const bytes = Buffer.from(d.map.b64, 'base64');
  const c = cellOf(d.map, -89.67, 129.78);
  assert.equal(bytes[c.row * d.map.size + c.col], 0);
});

test('the fast skyline agrees with the stored skylines of the listed sites', (t) => {
  const d = load(t);
  if (!d) return;
  assert.ok(d.report.checks.length >= 4);
  for (const c of d.report.checks) {
    assert.ok(Math.abs(c.percentFast - c.percentStored) <= 2,
      `${c.id}: ${c.percentFast} against ${c.percentStored} percent of the year`);
  }
  t.diagnostic(d.report.checks.map((c) => `${c.id} ${c.percentFast} vs ${c.percentStored}`).join(', '));
});

test('the page calculation gives the same yearly sunlight at the sunniest points', (t) => {
  const d = load(t);
  if (!d) return;
  assert.ok(d.map.spots.length >= 3);
  const notes = [];
  for (const s of d.map.spots) {
    const mask = LunarTerrain.maskFromSite(s);
    const site = { latDeg: s.latDeg, lonEastDeg: s.lonEastDeg, elevationKm: s.groundKm };
    const v = LunarSky.visibilityHours(site, d.map.start, d.map.hours, 1, { horizon: LunarTerrain.horizonFn(mask) });
    const percent = 100 * v.sunHours / d.map.hours;
    notes.push(`${s.id} ${percent.toFixed(1)} vs ${s.percent}`);
    assert.ok(Math.abs(percent - s.percent) <= 0.5, `${s.id}: page ${percent.toFixed(2)}, map file ${s.percent}`);
  }
  t.diagnostic(notes.join(', '));
});

/*
 * Mazarico and others (2011) give 89.45 S, 222.69 E as the best-lit place they
 * found at the south pole (Table 1 of Glaeser and others, 2017, lists it with
 * 89.0 percent average illumination). The page says our first point is the same
 * place, so this fails if a rebuilt map moves it.
 */
test('the sunniest point on the map is the best-lit place in the published study', (t) => {
  const d = load(t);
  if (!d) return;
  const s = d.map.spots[0];
  const unit = (lat, lon) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
  const a = unit(s.latDeg, s.lonEastDeg);
  const b = unit(-89.45, 222.69);
  const km = R * Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  assert.ok(km < 0.5, `${km.toFixed(2)} km from the published point`);
  assert.ok(s.percent > 85 && s.percent < 95, `${s.percent} percent of the year`);
  t.diagnostic(`${(km * 1000).toFixed(0)} m from 89.45 S, 222.69 E, sunlit ${s.percent} percent of the year`);

  // The published figures for that place, over about 20 years at the surface: 89.0 percent
  // average illumination, any part of the Sun in view 92.7 percent of the time, and 141 hours
  // for the longest time in shadow. Ours are for one year and a viewer 2 m up, so they
  // should land near those and need not equal them.
  const site = { latDeg: s.latDeg, lonEastDeg: s.lonEastDeg, elevationKm: s.groundKm };
  const samples = LunarSky.timeline(site, d.map.start, d.map.hours, 1, { horizon: LunarTerrain.horizonFn(LunarTerrain.maskFromSite(s)) });
  let any = 0, disk = 0, dark = 0, longestDark = 0;
  for (const q of samples) {
    const radius = Math.asin(695700 / q.sun.distanceKm) / RAD;
    disk += LunarSky.diskFraction(q.sun.clearDeg, radius);
    if (q.sun.clearDeg > -radius) { any++; dark = 0; } else { dark++; longestDark = Math.max(longestDark, dark); }
  }
  const anyPercent = 100 * any / samples.length;
  const diskPercent = 100 * disk / samples.length;
  assert.ok(Math.abs(diskPercent - 89.0) <= 3, `average illumination ${diskPercent.toFixed(1)} percent`);
  assert.ok(Math.abs(anyPercent - 92.7) <= 3, `any part of the Sun in view ${anyPercent.toFixed(1)} percent`);
  assert.ok(Math.abs(longestDark - 141) <= 24, `longest time with the Sun fully hidden ${longestDark} h`);
  t.diagnostic(`average illumination ${diskPercent.toFixed(1)} percent (published 89.0), any part of the Sun ${anyPercent.toFixed(1)} percent (published 92.7), longest time fully hidden ${longestDark} h (published 141)`);
});
