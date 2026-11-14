/*
 * Tests for src/terrain.js: grid decoding, height lookup, projection
 * orientation and the skyline ray march, on small made-up grids. The last
 * test compares against the Python reference skylines when the NASA LOLA
 * data files have been built.
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
const zlib = require('node:zlib');
const LunarTerrain = require('../src/terrain.js');

const R = 1737.4;
const RAD = Math.PI / 180;
const EYE_KM = 0.002;
const DIP_DEG = -Math.acos(R / (R + EYE_KM)) / RAD; // about -0.087

const CHECK_FILE = path.join(__dirname, '..', 'reference', 'terrain', 'check-960m.json');
const SOUTH_FILE = path.join(__dirname, '..', 'vendor', 'lola-south.js');

// ---- helpers that follow the grid contract, written apart from src/ ----

// Latitude and longitude to cap-plane km.
function project(pole, latDeg, lonDeg) {
  const rho = 2 * R * Math.tan((90 - Math.abs(latDeg)) * RAD / 2);
  const lon = lonDeg * RAD;
  return { x: rho * Math.sin(lon), y: (pole === 'S' ? 1 : -1) * rho * Math.cos(lon) };
}

// Cap-plane km back to latitude and longitude.
function unproject(pole, x, y) {
  const colat = 2 * Math.atan(Math.hypot(x, y) / (2 * R)) / RAD;
  const lonDeg = Math.atan2(x, pole === 'S' ? y : -y) / RAD;
  return { latDeg: pole === 'S' ? colat - 90 : 90 - colat, lonDeg };
}

// Grid whose height in km at each sample is fill(x, y).
function makeGrid(pole, size, scaleKm, unitM, fill) {
  const data = new Int16Array(size * size);
  const half = (size - 1) / 2;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const km = fill ? fill((col - half) * scaleKm, (half - row) * scaleKm) : 0;
      data[row * size + col] = Math.round(km * 1000 / unitM);
    }
  }
  return { pole, size, scaleKm, unitM, radiusKm: R, edgeLatDeg: pole === 'S' ? -87 : 87, data };
}

// Index of the sample at cap-plane km (x, y), which must be on a sample.
function cellIndex(grid, x, y) {
  const half = (grid.size - 1) / 2;
  const col = x / grid.scaleKm + half;
  const row = half - y / grid.scaleKm;
  assert.ok(Math.abs(col - Math.round(col)) < 1e-9 && Math.abs(row - Math.round(row)) < 1e-9, 'not on a sample');
  return Math.round(row) * grid.size + Math.round(col);
}

// Great-circle destination, the formula from the brief.
function destination(latDeg, lonDeg, azDeg, dKm) {
  const lat = latDeg * RAD;
  const az = azDeg * RAD;
  const theta = dKm / R;
  const lat2 = Math.asin(Math.sin(lat) * Math.cos(theta) + Math.cos(lat) * Math.sin(theta) * Math.cos(az));
  const lon2 = lonDeg * RAD + Math.atan2(
    Math.sin(az) * Math.sin(theta) * Math.cos(lat),
    Math.cos(theta) - Math.sin(lat) * Math.sin(lat2)
  );
  return { latDeg: lat2 / RAD, lonDeg: lon2 / RAD };
}

// Compass bearing from one point to another along the great circle.
function bearing(from, to) {
  const la1 = from.latDeg * RAD;
  const la2 = to.latDeg * RAD;
  const dLon = (to.lonDeg - from.lonDeg) * RAD;
  const az = Math.atan2(
    Math.sin(dLon) * Math.cos(la2),
    Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon)
  ) / RAD;
  return (az + 360) % 360;
}

function angleGap(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function peakAzimuth(mask) {
  let best = 0;
  for (let i = 1; i < mask.elevDeg.length; i++) if (mask.elevDeg[i] > mask.elevDeg[best]) best = i;
  return best * mask.stepDeg;
}

// The ray march exactly as the brief words it, slow and simple, for one azimuth.
function slowSkyline(grid, latDeg, lonDeg, azDeg, maxRangeKm) {
  const r0 = R + LunarTerrain.heightKm(grid, latDeg, lonDeg) + EYE_KM;
  let best = -Infinity;
  for (let d = 0.1; d <= maxRangeKm; d += Math.max(0.1, Math.min(0.02 * d, 0.5 * grid.scaleKm))) {
    const p = destination(latDeg, lonDeg, azDeg, d);
    const h = LunarTerrain.heightKm(grid, p.latDeg, p.lonDeg);
    if (Number.isNaN(h)) break;
    const r1 = R + h;
    best = Math.max(best, Math.atan2(r1 * Math.cos(d / R) - r0, r1 * Math.sin(d / R)) / RAD);
  }
  return best;
}

function encodeGrid(grid) {
  const diff = new Int16Array(grid.data.length);
  diff[0] = grid.data[0];
  for (let i = 1; i < diff.length; i++) diff[i] = grid.data[i] - grid.data[i - 1]; // wraps in int16
  const bytes = Buffer.from(diff.buffer, diff.byteOffset, diff.byteLength);
  const entry = Object.assign({}, grid, { b64: zlib.deflateSync(bytes).toString('base64') });
  delete entry.data;
  return entry;
}

// Small repeatable random number source.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---- tests ----

test('flat ground gives the smooth-sphere dip in every direction', () => {
  const grid = makeGrid('S', 201, 1, 1, null);
  const mask = LunarTerrain.maskFromGrid(grid, -89.6, 40);
  assert.equal(mask.stepDeg, 0.5);
  assert.ok(mask.elevDeg instanceof Float32Array && mask.elevDeg.length === 720);
  assert.ok(mask.distKm instanceof Float32Array && mask.distKm.length === 720);
  assert.equal(mask.groundKm, 0);
  assert.ok(Math.abs(DIP_DEG + 0.087) < 0.001, `dip is ${DIP_DEG}`);
  for (let i = 0; i < 720; i++) {
    assert.ok(Math.abs(mask.elevDeg[i] - DIP_DEG) < 0.01, `bin ${i}: ${mask.elevDeg[i]}`);
    // The edge of a smooth Moon is about 2.6 km away for a 2 m eye height.
    assert.ok(Math.abs(mask.distKm[i] - Math.sqrt(2 * R * EYE_KM)) < 0.2, `bin ${i} distance ${mask.distKm[i]}`);
  }
  // The default range of 200 km runs off this 201 km wide grid.
  assert.equal(mask.coverage, 0);
});

test('rays with no terrain sample fall back to the smooth-sphere dip', () => {
  // A grid 0.1 km across: the first sample of every ray, 0.1 km out, is already off it.
  const grid = makeGrid('S', 3, 0.05, 1, null);
  const mask = LunarTerrain.maskFromGrid(grid, -90, 0);
  assert.equal(mask.coverage, 0);
  for (let i = 0; i < 720; i++) assert.ok(Math.abs(mask.elevDeg[i] - DIP_DEG) < 1e-4);
  assert.equal(LunarTerrain.maskFromGrid(grid, -80, 0), null, 'a site off the grid has no mask');
});

test('a wall to the east sets the skyline to the east and nowhere behind', () => {
  const H = 2; // km
  const D = 50; // km from the site to the near edge of the wall
  // At longitude 0 on the south cap, +x is east and +y is north.
  const grid = makeGrid('S', 201, 1, 1, (x) => (x >= D && x <= D + 10 ? H : 0));
  const site = { latDeg: -89.9, lonDeg: 0 };
  assert.ok(Math.abs(project('S', site.latDeg, site.lonDeg).x) < 1e-9);
  const mask = LunarTerrain.maskFromGrid(grid, site.latDeg, site.lonDeg, { maxRangeKm: 80 });
  const r0 = R + 0 + EYE_KM;
  const expected = Math.atan2((R + H) * Math.cos(D / R) - r0, (R + H) * Math.sin(D / R)) / RAD;
  // A flat world would give atan(2 / 50) = 2.29 degrees. The Moon's curve drops the wall to about 1.46.
  assert.ok(expected > 1.4 && expected < 1.5, `expected skyline ${expected}`);
  const east = LunarTerrain.horizonAt(mask, 90);
  const west = LunarTerrain.horizonAt(mask, 270);
  assert.ok(Math.abs(east - expected) < 0.1, `east skyline ${east}, expected ${expected}`);
  assert.ok(Math.abs(west - DIP_DEG) < 0.01, `west skyline ${west}`);
  assert.ok(Math.abs(LunarTerrain.blockerKm(mask, 90) - D) < 1, `blocker at ${LunarTerrain.blockerKm(mask, 90)} km`);
  assert.equal(mask.coverage, 1);
});

test('a site at the bottom of a bowl sees ground above it all the way round', () => {
  const site = { latDeg: -89.5, lonDeg: 30 };
  const c = project('S', site.latDeg, site.lonDeg);
  // Height grows with the square of distance from the site: 1 km up at 31.6 km out.
  const grid = makeGrid('S', 201, 1, 1, (x, y) => 1e-3 * ((x - c.x) * (x - c.x) + (y - c.y) * (y - c.y)));
  const mask = LunarTerrain.maskFromGrid(grid, site.latDeg, site.lonDeg, { maxRangeKm: 60 });
  assert.ok(Math.abs(mask.groundKm) < 0.001, `ground ${mask.groundKm}`);
  assert.equal(mask.coverage, 1);
  for (let i = 0; i < 720; i++) assert.ok(mask.elevDeg[i] > 0, `bin ${i}: ${mask.elevDeg[i]}`);
  const far = LunarTerrain.maskFromGrid(grid, site.latDeg, site.lonDeg);
  assert.ok(far.coverage < 1, 'a 200 km range does not fit on this grid');
});

test('heightKm interpolates between samples and is NaN off the grid', () => {
  const rand = lcg(7);
  const grid = makeGrid('S', 201, 1, 4, () => (rand() - 0.5) * 8);
  const half = 100;
  const at = (col, row) => grid.data[row * 201 + col] * 4 / 1000;

  const p = unproject('S', 120 - half, half - 80); // column 120, row 80
  assert.ok(Math.abs(LunarTerrain.heightKm(grid, p.latDeg, p.lonDeg) - at(120, 80)) < 1e-9);

  const q = unproject('S', 120.5 - half, half - 80); // halfway to column 121
  assert.ok(Math.abs(LunarTerrain.heightKm(grid, q.latDeg, q.lonDeg) - (at(120, 80) + at(121, 80)) / 2) < 1e-9);

  const r = unproject('S', 120 - half, half - 80.5); // halfway to row 81
  assert.ok(Math.abs(LunarTerrain.heightKm(grid, r.latDeg, r.lonDeg) - (at(120, 80) + at(120, 81)) / 2) < 1e-9);

  const pole = LunarTerrain.heightKm(grid, -90, 123);
  assert.ok(Math.abs(pole - at(100, 100)) < 1e-9, 'the pole is the centre sample');

  assert.ok(Number.isNaN(LunarTerrain.heightKm(grid, -80, 10)), 'outside the array');
  assert.ok(Number.isNaN(LunarTerrain.heightKm(grid, 89.9, 10)), 'northern point on the south grid');
  const north = makeGrid('N', 201, 1, 4, () => 1);
  assert.ok(Number.isNaN(LunarTerrain.heightKm(north, -89.9, 10)), 'southern point on the north grid');
  assert.ok(Math.abs(LunarTerrain.heightKm(north, 89.9, 10) - 1) < 1e-9);
});

// One raised cell, placed with the contract's formulas, must show up at the
// right latitude and longitude and in the right compass direction. The
// longitude has sin 0.6 and cos 0.8, so the chosen points land on samples.
for (const cap of [
  // South cap: north is away from the pole, (0.6, 0.8); east is (0.8, -0.6).
  { pole: 'S', site: [3, 4], north: [18, 24], east: [23, -11] },
  // North cap: north is toward the pole, (-0.6, 0.8); east is (0.8, 0.6).
  { pole: 'N', site: [18, -24], north: [3, -4], east: [38, -9] }
]) {
  for (const [name, wantAz] of [['north', 0], ['east', 90]]) {
    test(`${cap.pole} cap orientation: a peak due ${name} shows at azimuth ${wantAz}`, () => {
      const H = 5;
      const [fx, fy] = cap[name];
      const grid = makeGrid(cap.pole, 201, 1, 1, null);
      grid.data[cellIndex(grid, fx, fy)] = H * 1000;

      const site = unproject(cap.pole, cap.site[0], cap.site[1]);
      const feature = unproject(cap.pole, fx, fy);

      // The contract's forward formulas put the feature back on its sample.
      const back = project(cap.pole, feature.latDeg, feature.lonDeg);
      assert.ok(Math.abs(back.x - fx) < 1e-9 && Math.abs(back.y - fy) < 1e-9);
      assert.ok(Math.abs(LunarTerrain.heightKm(grid, feature.latDeg, feature.lonDeg) - H) < 1e-6);
      assert.ok(Math.abs(LunarTerrain.heightKm(grid, site.latDeg, site.lonDeg)) < 1e-6);

      // Check the set-up itself: the feature really is in that direction.
      if (name === 'north') {
        assert.ok(Math.abs(site.lonDeg - feature.lonDeg) < 1e-9, 'same longitude');
        assert.ok(site.latDeg < feature.latDeg, 'site is farther from the north pole');
      }
      assert.ok(angleGap(bearing(site, feature), wantAz) < 0.1, `bearing ${bearing(site, feature)}`);

      const mask = LunarTerrain.maskFromGrid(grid, site.latDeg, site.lonDeg, { maxRangeKm: 50 });
      const peak = peakAzimuth(mask);
      assert.ok(angleGap(peak, wantAz) <= 1, `skyline peak at azimuth ${peak}`);
      assert.ok(LunarTerrain.horizonAt(mask, wantAz) > 5, 'the peak stands well above the horizon');
      assert.ok(Math.abs(LunarTerrain.horizonAt(mask, wantAz + 180) - DIP_DEG) < 0.01, 'nothing behind');
      assert.ok(Math.abs(LunarTerrain.blockerKm(mask, peak) - 25) < 1);
    });
  }
}

test('the ray march agrees with the lat/lon destination formula on rough ground', () => {
  for (const pole of ['S', 'N']) {
    const rand = lcg(pole === 'S' ? 11 : 12);
    const bumps = [];
    for (let i = 0; i < 40; i++) bumps.push([(rand() - 0.5) * 180, (rand() - 0.5) * 180, 4 + rand() * 12, rand() * 3 - 1]);
    const grid = makeGrid(pole, 201, 1, 1, (x, y) => {
      let h = 0;
      for (const [bx, by, w, a] of bumps) h += a * Math.exp(-((x - bx) * (x - bx) + (y - by) * (y - by)) / (w * w));
      return h;
    });
    const site = { latDeg: pole === 'S' ? -89.2 : 88.9, lonDeg: pole === 'S' ? -70 : 155 };
    const mask = LunarTerrain.maskFromGrid(grid, site.latDeg, site.lonDeg, { maxRangeKm: 60 });
    assert.equal(mask.coverage, 1);
    let spread = 0;
    for (let i = 0; i < 720; i += 7) {
      const slow = slowSkyline(grid, site.latDeg, site.lonDeg, i * 0.5, 60);
      assert.ok(Math.abs(mask.elevDeg[i] - slow) < 1e-4, `${pole} azimuth ${i * 0.5}: ${mask.elevDeg[i]} vs ${slow}`);
      spread = Math.max(spread, Math.abs(slow));
    }
    assert.ok(spread > 0.5, 'the made-up terrain should not be flat');
  }
});

test('maskFromGrid honours stepDeg and eyeHeightKm', () => {
  const grid = makeGrid('N', 201, 1, 1, null);
  const mask = LunarTerrain.maskFromGrid(grid, 89.7, -20, { stepDeg: 2, eyeHeightKm: 0.01, maxRangeKm: 30 });
  assert.equal(mask.stepDeg, 2);
  assert.equal(mask.elevDeg.length, 180);
  const dip = -Math.acos(R / (R + 0.01)) / RAD;
  for (let i = 0; i < 180; i++) assert.ok(Math.abs(mask.elevDeg[i] - dip) < 0.01);
  assert.equal(mask.coverage, 1);
});

test('decodeGrid undoes base64, zlib and the int16 differences', async () => {
  const rand = lcg(3);
  const grid = makeGrid('S', 37, 0.96, 4, null);
  for (let i = 0; i < grid.data.length; i++) grid.data[i] = Math.floor(rand() * 65536) - 32768;
  grid.data[5] = 32767; // neighbours at both extremes force the differences to wrap
  grid.data[6] = -32768;
  grid.data[7] = 32767;
  const entry = encodeGrid(grid);
  assert.equal(typeof entry.b64, 'string');

  const out = await LunarTerrain.decodeGrid(entry);
  assert.ok(out.data instanceof Int16Array);
  assert.deepEqual(out.data, grid.data);
  assert.equal(out.pole, 'S');
  assert.equal(out.size, 37);
  assert.equal(out.scaleKm, 0.96);
  assert.equal(out.unitM, 4);
  assert.equal(out.radiusKm, R);
  assert.equal(out.b64, undefined);
  assert.equal(entry.data, undefined, 'the entry is left alone');
});

test('decodeGrid rejects a grid of the wrong length, and a missing decoder', async () => {
  const entry = encodeGrid(makeGrid('S', 12, 1, 1, (x, y) => x + y));
  await assert.rejects(LunarTerrain.decodeGrid(Object.assign({}, entry, { size: 13 })), /expected 338/);
  await assert.rejects(LunarTerrain.decodeGrid({ size: 12 }), /size and b64/);

  const saved = globalThis.DecompressionStream;
  globalThis.DecompressionStream = undefined;
  try {
    await assert.rejects(LunarTerrain.decodeGrid(entry), /DecompressionStream/);
  } finally {
    globalThis.DecompressionStream = saved;
  }
  assert.equal((await LunarTerrain.decodeGrid(entry)).data.length, 144);
});

test('horizonAt interpolates, wraps around north, and is 0 without a mask', () => {
  const elevDeg = [];
  const distKm = [];
  for (let i = 0; i < 720; i++) {
    elevDeg.push(i * 0.01);
    distKm.push(i + 1);
  }
  const mask = LunarTerrain.maskFromSite({ latDeg: -89.5, lonDeg: 0, groundKm: 1.25, elevDeg, distKm }, 0.5);
  assert.equal(mask.stepDeg, 0.5);
  assert.ok(mask.elevDeg instanceof Float32Array && mask.elevDeg.length === 720);
  assert.ok(mask.distKm instanceof Float32Array && mask.distKm.length === 720);
  assert.equal(mask.groundKm, 1.25);
  assert.equal(mask.coverage, 1);
  assert.equal(LunarTerrain.maskFromSite({ elevDeg, distKm }).stepDeg, 0.5, 'step defaults to 360 / bins');

  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} vs ${b}`);
  near(LunarTerrain.horizonAt(mask, 5), 0.10); // exactly on bin 10
  near(LunarTerrain.horizonAt(mask, 5.25), 0.105); // midway between bins 10 and 11
  near(LunarTerrain.horizonAt(mask, 5.125), 0.1025);
  near(LunarTerrain.horizonAt(mask, 359.75), 7.19 / 2); // midway between bin 719 and bin 0
  near(LunarTerrain.horizonAt(mask, -0.25), 7.19 / 2); // the same direction, written as a negative
  near(LunarTerrain.horizonAt(mask, -354.75), 0.105);
  near(LunarTerrain.horizonAt(mask, 360), 0);
  near(LunarTerrain.horizonAt(mask, 725.25), 0.105);
  assert.equal(LunarTerrain.horizonAt(null, 123), 0);
  assert.equal(LunarTerrain.horizonAt(undefined, 123), 0);

  assert.equal(LunarTerrain.blockerKm(mask, 5.1), 11); // nearest bin is 10
  assert.equal(LunarTerrain.blockerKm(mask, 5.4), 12); // nearest bin is 11
  assert.equal(LunarTerrain.blockerKm(mask, 359.9), 1); // nearest bin is 0, across north
  assert.equal(LunarTerrain.blockerKm(mask, -0.6), 720); // bin 719
  assert.ok(Number.isNaN(LunarTerrain.blockerKm(null, 10)));

  const fn = LunarTerrain.horizonFn(mask);
  assert.equal(fn(5.25), LunarTerrain.horizonAt(mask, 5.25));
  assert.equal(LunarTerrain.horizonFn(null)(77), 0);
});

test('skylines from the stored LOLA grid match the Python reference', async (t) => {
  if (!fs.existsSync(CHECK_FILE) || !fs.existsSync(SOUTH_FILE)) {
    t.skip('terrain data not built yet');
    return;
  }
  const doc = JSON.parse(fs.readFileSync(CHECK_FILE, 'utf8'));
  const grid = await LunarTerrain.decodeGrid(require(SOUTH_FILE));
  const ids = Object.keys(doc.sites);
  assert.ok(ids.length > 0, 'the check file lists no sites');
  const opts = {
    stepDeg: doc.stepDeg || 0.5,
    maxRangeKm: doc.maxRangeKm || 200,
    eyeHeightKm: (doc.eyeHeightM || 2) / 1000
  };
  const diffs = [];
  for (const id of ids) {
    const ref = doc.sites[id];
    const mask = LunarTerrain.maskFromGrid(grid, ref.latDeg, ref.lonDeg, opts);
    assert.ok(mask, `${id} is off the grid`);
    assert.equal(mask.elevDeg.length, ref.elevDeg.length, `${id}: bin count`);
    assert.ok(Math.abs(mask.groundKm - ref.groundKm) < 0.001, `${id}: ground ${mask.groundKm} vs ${ref.groundKm}`);
    for (let i = 0; i < ref.elevDeg.length; i++) diffs.push(Math.abs(mask.elevDeg[i] - ref.elevDeg[i]));
  }
  diffs.sort((a, b) => a - b);
  const median = diffs[Math.floor(diffs.length / 2)];
  const p99 = diffs[Math.floor(diffs.length * 0.99)];
  const max = diffs[diffs.length - 1];
  t.diagnostic(`${ids.length} sites, ${diffs.length} bins: median ${median.toFixed(4)}, 99th percentile ${p99.toFixed(4)}, max ${max.toFixed(4)} degrees`);
  assert.ok(median < 0.05, `median difference ${median.toFixed(4)} degrees`);
  assert.ok(p99 < 0.15, `99th percentile difference ${p99.toFixed(4)} degrees`);
  assert.ok(max < 0.5, `largest difference ${max.toFixed(4)} degrees`);
});
