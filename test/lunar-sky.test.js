/*
 * Compares lunar-sky.js with NASA JPL Horizons reference tables.
 * Run: node --test
 *
 * SI disclosure: this file was written with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. See SI_USE.md.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const LunarSky = require('../src/lunar-sky.js');

const REF_DIR = path.join(__dirname, '..', 'reference', 'horizons');
const TOLERANCE_DEG = 0.02; // worst measured difference on 2026-11-14 was 0.0073

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(REF_DIR, name), 'utf8'));
}

function siteOf(doc) {
  return { latDeg: doc.site.lat_deg, lonEastDeg: doc.site.lon_east_deg, elevationKm: doc.site.alt_km };
}

// Azimuth difference measured on the sky, so it does not blow up near the zenith.
function azError(a, b, elDeg) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d * Math.cos(elDeg * Math.PI / 180);
}

for (const file of fs.readdirSync(REF_DIR).filter((f) => f.endsWith('.json'))) {
  test(`matches Horizons within ${TOLERANCE_DEG} deg: ${file}`, () => {
    const doc = load(file);
    const site = siteOf(doc);
    assert.ok(doc.rows.length > 0);
    for (const row of doc.rows) {
      const sky = LunarSky.skyAt(site, row.utc);
      for (const body of ['sun', 'earth']) {
        const elErr = Math.abs(sky[body].elevationDeg - row[body].el);
        const azErr = azError(sky[body].azimuthDeg, row[body].az, row[body].el);
        assert.ok(elErr < TOLERANCE_DEG, `${body} elevation off by ${elErr.toFixed(4)} at ${row.utc}`);
        assert.ok(azErr < TOLERANCE_DEG, `${body} azimuth off by ${azErr.toFixed(4)} at ${row.utc}`);
      }
    }
  });
}

// Zero crossings in a Horizons table, by linear interpolation between rows.
function horizonsCrossings(doc, body) {
  const out = [];
  for (let i = 1; i < doc.rows.length; i++) {
    const a = doc.rows[i - 1];
    const b = doc.rows[i];
    const ea = a[body].el;
    const eb = b[body].el;
    if ((ea > 0) !== (eb > 0)) {
      const ta = Date.parse(a.utc);
      const tb = Date.parse(b.utc);
      out.push({ ms: ta + (tb - ta) * (ea / (ea - eb)), direction: ea > 0 ? 'set' : 'rise' });
    }
  }
  return out;
}

test('sunset at the IM-1 site lands within 10 minutes of Horizons', () => {
  const doc = load('im1_sunset_fine.json');
  const sets = horizonsCrossings(doc, 'sun').filter((c) => c.direction === 'set');
  assert.ok(sets.length >= 1, 'reference table should contain a sunset');
  const got = LunarSky.nextCrossing(siteOf(doc), 'sun', doc.rows[0].utc, { direction: 'set' });
  assert.ok(got, 'nextCrossing found no sunset');
  const diffMin = Math.abs(Date.parse(got.utc) - sets[0].ms) / 60000;
  assert.ok(diffMin < 10, `sunset differs from Horizons by ${diffMin.toFixed(1)} minutes`);
  assert.equal(got.direction, 'set');
});

test('every horizon crossing in the 6-hour tables is found within 30 minutes', () => {
  for (const file of ['im1_lunar_month.json', 'south_pole_84s.json', 'equator_test.json', 'farside_test.json']) {
    const doc = load(file);
    const site = siteOf(doc);
    for (const body of ['sun', 'earth']) {
      for (const ref of horizonsCrossings(doc, body)) {
        // Start the search six hours before the reference crossing.
        const from = new Date(ref.ms - 6 * 3600 * 1000);
        const got = LunarSky.nextCrossing(site, body, from, { direction: ref.direction, maxDays: 2 });
        assert.ok(got, `${file}: no ${body} ${ref.direction} found near ${new Date(ref.ms).toISOString()}`);
        // The reference time is interpolated across a 6-hour step, so allow for its own error.
        const diffMin = Math.abs(Date.parse(got.utc) - ref.ms) / 60000;
        assert.ok(diffMin < 30, `${file}: ${body} ${ref.direction} differs by ${diffMin.toFixed(1)} minutes`);
      }
    }
  }
});

test('timeline returns evenly spaced samples that agree with skyAt', () => {
  const site = { latDeg: -80.13, lonEastDeg: 1.44, elevationKm: 2.579 };
  const samples = LunarSky.timeline(site, '2024-02-22T23:00:00Z', 48, 6);
  assert.equal(samples.length, 9);
  assert.equal(samples[0].hoursFromStart, 0);
  assert.equal(samples[8].hoursFromStart, 48);
  const direct = LunarSky.skyAt(site, samples[3].utc);
  assert.equal(samples[3].sun.elevationDeg, direct.sun.elevationDeg);
  assert.equal(samples[3].earth.azimuthDeg, direct.earth.azimuthDeg);
});

test('visibilityHours stays inside the window', () => {
  const site = { latDeg: 0.67, lonEastDeg: 23.47, elevationKm: 0 };
  const v = LunarSky.visibilityHours(site, '2026-11-01T00:00:00Z', 24 * 30, 1);
  assert.ok(v.sunHours > 300 && v.sunHours < 420, `sun hours over 30 days: ${v.sunHours}`);
  assert.ok(v.earthHours === 24 * 30, 'Earth never sets at a near-side equatorial site');
  assert.ok(v.bothHours <= Math.min(v.sunHours, v.earthHours));
});

test('Earth stays below the horizon at the centre of the far side', () => {
  const site = { latDeg: 0, lonEastDeg: 180, elevationKm: 0 };
  assert.equal(LunarSky.nextCrossing(site, 'earth', '2026-11-01T00:00:00Z', { direction: 'rise', maxDays: 40 }), null);
  assert.equal(LunarSky.skyAt(site, '2026-11-01T00:00:00Z').earth.aboveHorizon, false);
});

test('bad input is rejected with a clear message', () => {
  assert.throws(() => LunarSky.skyAt({ latDeg: 95, lonEastDeg: 0 }, '2026-11-14T00:00:00Z'), /Latitude/);
  assert.throws(() => LunarSky.skyAt({ latDeg: 0 }, '2026-11-14T00:00:00Z'), /latDeg and lonEastDeg/);
  assert.throws(() => LunarSky.skyAt({ latDeg: 0, lonEastDeg: 0 }, 'not a date'), /Invalid date/);
  assert.throws(() => LunarSky.nextCrossing({ latDeg: 0, lonEastDeg: 0 }, 'mars', new Date()), /body must be/);
});
