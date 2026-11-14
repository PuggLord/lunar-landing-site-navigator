/*
 * Tests for the skyline option and the power functions in src/lunar-sky.js:
 * solarIrradiance, diskFraction, solarEnergy, longestGap, and the `horizon`
 * option of nextCrossing, timeline and visibilityHours.
 * Run: node --test
 *
 * SI disclosure: written with an AI coding tool (Claude Code, Anthropic)
 * during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, directed and
 * reviewed by team Ksig UNT. See SI_USE.md.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const LunarSky = require('../src/lunar-sky.js');

const AU_KM = 149597870.7;
const IM1 = { latDeg: -80.13, lonEastDeg: 1.44, elevationKm: 2.579 };
const IM1_START = '2024-02-22T23:24:00Z';

function near(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label || 'value'}: ${actual}, expected ${expected}`);
}

// Hand-made timeline samples: one [hoursFromStart, clearDeg] pair each.
function sunSamples(pairs, distanceKm) {
  return pairs.map(([hoursFromStart, clearDeg]) => ({
    hoursFromStart,
    sun: { clearDeg, distanceKm: distanceKm || AU_KM },
    earth: { clearDeg }
  }));
}

test('solarIrradiance is 1361 W/m2 at 1 AU and follows the inverse square law', () => {
  near(LunarSky.solarIrradiance(AU_KM), 1361, 1e-9);
  near(LunarSky.solarIrradiance(AU_KM / 2), 4 * 1361, 1e-9);
  near(LunarSky.solarIrradiance(AU_KM * 2), 1361 / 4, 1e-9);
});

test('diskFraction runs from 0 to 1 as the disk clears a straight horizon', () => {
  const r = 0.266;
  assert.equal(LunarSky.diskFraction(-r, r), 0);
  assert.equal(LunarSky.diskFraction(0, r), 0.5);
  assert.equal(LunarSky.diskFraction(r, r), 1);
  assert.equal(LunarSky.diskFraction(5, r), 1, 'clamps above');
  assert.equal(LunarSky.diskFraction(-5, r), 0, 'clamps below');

  let last = -1;
  for (let i = -30; i <= 30; i++) {
    const m = (i / 20) * r;
    const f = LunarSky.diskFraction(m, r);
    assert.ok(f >= 0 && f <= 1);
    assert.ok(f >= last, `not monotonic at margin ${m}`);
    if (Math.abs(i) < 20) assert.ok(f > last, `flat inside the disk at margin ${m}`);
    near(f + LunarSky.diskFraction(-m, r), 1, 1e-12, 'f(m) + f(-m)');
    last = f;
  }
  // Half the radius up: the known area of a circular segment.
  near(LunarSky.diskFraction(r / 2, r), 0.5 + (0.5 * Math.sqrt(0.75) + Math.PI / 6) / Math.PI, 1e-12);
});

test('timeline samples carry clearDeg and the Sun distance', () => {
  const flat = LunarSky.timeline(IM1, IM1_START, 48, 6);
  const raised = LunarSky.timeline(IM1, IM1_START, 48, 6, { horizon: function () { return 2; } });
  assert.equal(flat.length, 9);
  assert.equal(raised.length, 9);
  for (let i = 0; i < flat.length; i++) {
    for (const body of ['sun', 'earth']) {
      assert.equal(flat[i][body].clearDeg, flat[i][body].elevationDeg);
      assert.equal(raised[i][body].elevationDeg, flat[i][body].elevationDeg);
      assert.equal(raised[i][body].azimuthDeg, flat[i][body].azimuthDeg);
      assert.equal(raised[i][body].clearDeg, flat[i][body].elevationDeg - 2);
    }
    assert.ok(flat[i].sun.distanceKm > 1.45e8 && flat[i].sun.distanceKm < 1.55e8, `Sun at ${flat[i].sun.distanceKm} km`);
    assert.equal(raised[i].hoursFromStart, flat[i].hoursFromStart);
    assert.equal(raised[i].utc, flat[i].utc);
  }
});

test('the skyline function is called with the azimuth of each body', () => {
  const seen = [];
  const samples = LunarSky.timeline(IM1, IM1_START, 6, 6, {
    horizon: function (azDeg) { seen.push(azDeg); return azDeg / 100; }
  });
  assert.equal(seen.length, 4);
  for (const s of samples) {
    near(s.sun.clearDeg, s.sun.elevationDeg - s.sun.azimuthDeg / 100, 1e-12);
    near(s.earth.clearDeg, s.earth.elevationDeg - s.earth.azimuthDeg / 100, 1e-12);
    assert.ok(seen.includes(s.sun.azimuthDeg) && seen.includes(s.earth.azimuthDeg));
  }
});

test('nextCrossing treats a constant 2 degree skyline like horizonDeg 2', () => {
  const flat = LunarSky.nextCrossing(IM1, 'sun', IM1_START, { direction: 'set' });
  const byNumber = LunarSky.nextCrossing(IM1, 'sun', IM1_START, { direction: 'set', horizonDeg: 2 });
  const byFunction = LunarSky.nextCrossing(IM1, 'sun', IM1_START, {
    direction: 'set',
    horizon: function () { return 2; }
  });
  const both = LunarSky.nextCrossing(IM1, 'sun', IM1_START, {
    direction: 'set',
    horizonDeg: 0.5,
    horizon: function () { return 1.5; }
  });
  assert.ok(flat && byNumber && byFunction && both);
  assert.equal(byFunction.direction, 'set');
  assert.ok(Math.abs(Date.parse(byFunction.utc) - Date.parse(byNumber.utc)) <= 2000,
    `${byFunction.utc} vs ${byNumber.utc}`);
  assert.ok(Math.abs(Date.parse(both.utc) - Date.parse(byNumber.utc)) <= 2000, 'horizonDeg and horizon add up');
  assert.ok(Date.parse(byFunction.utc) < Date.parse(flat.utc), 'a raised skyline hides the Sun sooner');
  assert.ok(byFunction.hoursFromStart < flat.hoursFromStart);

  // At the moment found, the Sun's centre is 2 degrees up.
  near(LunarSky.skyAt(IM1, byFunction.utc).sun.elevationDeg, 2, 0.01, 'elevation at the raised sunset');
});

test('visibilityHours counts time above the skyline', () => {
  const site = { latDeg: 0.67, lonEastDeg: 23.47, elevationKm: 0 };
  const start = '2026-11-01T00:00:00Z';
  const flat = LunarSky.visibilityHours(site, start, 24 * 30, 1);
  const zero = LunarSky.visibilityHours(site, start, 24 * 30, 1, { horizon: function () { return 0; } });
  const raised = LunarSky.visibilityHours(site, start, 24 * 30, 1, { horizon: function () { return 10; } });
  const walled = LunarSky.visibilityHours(site, start, 24 * 30, 1, { horizon: function () { return 95; } });
  assert.deepEqual(zero, flat);
  assert.ok(raised.sunHours < flat.sunHours && raised.sunHours > 0, `${raised.sunHours} vs ${flat.sunHours}`);
  assert.equal(walled.sunHours, 0);
  assert.equal(walled.earthHours, 0);
  assert.equal(walled.windowHours, 24 * 30);
});

test('solarEnergy integrates sunlight on a Sun-tracking panel', () => {
  const up = LunarSky.solarEnergy(sunSamples([[0, 5], [10, 5]]));
  near(up.kwhPerM2, 13.61, 1e-9, 'full Sun for 10 hours');
  near(up.meanWPerM2, 1361, 1e-9, 'mean in full Sun');

  const many = LunarSky.solarEnergy(sunSamples([[0, 5], [1, 9], [2.5, 30], [7, 1], [10, 5]]));
  near(many.kwhPerM2, 13.61, 1e-9, 'uneven sample spacing');

  const down = LunarSky.solarEnergy(sunSamples([[0, -5], [10, -5]]));
  assert.equal(down.kwhPerM2, 0);
  assert.equal(down.meanWPerM2, 0);

  const half = LunarSky.solarEnergy(sunSamples([[0, 0], [10, 0]]));
  near(half.kwhPerM2, 13.61 / 2, 1e-9, 'half the disk');
  near(half.meanWPerM2, 1361 / 2, 1e-9, 'mean with half the disk');

  // Full Sun for 2 hours, then a straight-line fade to nothing over 4 hours.
  const fade = LunarSky.solarEnergy(sunSamples([[0, 5], [2, 5], [6, -5]]));
  near(fade.kwhPerM2, (2 * 1361 + 4 * 1361 / 2) / 1000, 1e-9, 'trapezoid rule');
  near(fade.meanWPerM2, (2 * 1361 + 4 * 1361 / 2) / 6, 1e-9, 'mean over the whole span');

  const close = LunarSky.solarEnergy(sunSamples([[0, 5], [10, 5]], AU_KM / 2));
  near(close.kwhPerM2, 4 * 13.61, 1e-9, 'four times the light at half the distance');

  assert.deepEqual(LunarSky.solarEnergy([]), { kwhPerM2: 0, meanWPerM2: 0 });
});

test('solarEnergy over a real timeline stays between dark and full Sun', () => {
  const samples = LunarSky.timeline(IM1, IM1_START, 24 * 30, 1);
  const open = LunarSky.solarEnergy(samples);
  assert.ok(open.meanWPerM2 > 0 && open.meanWPerM2 < 1420, `mean ${open.meanWPerM2}`);
  near(open.kwhPerM2, open.meanWPerM2 * 24 * 30 / 1000, 1e-6, 'energy equals mean power times span');
  const hemmed = LunarSky.solarEnergy(LunarSky.timeline(IM1, IM1_START, 24 * 30, 1, { horizon: function () { return 3; } }));
  assert.ok(hemmed.kwhPerM2 < open.kwhPerM2, 'a higher skyline cannot add energy');
});

test('longestGap finds the longest stretch below the skyline', () => {
  const nothing = { hours: 0, startHours: null, endHours: null, openEnded: false };
  const run = (values, body) => LunarSky.longestGap(sunSamples(values.map((c, i) => [i, c])), body || 'sun');

  assert.deepEqual(run([1, 2, 3, 0.5]), nothing, 'never down');
  assert.deepEqual(LunarSky.longestGap([], 'sun'), nothing, 'no samples');

  // Down in the middle: crossings fall halfway between samples.
  assert.deepEqual(run([2, 1, -1, -3, -1, 1]), { hours: 3, startHours: 1.5, endHours: 4.5, openEnded: false });

  // Uneven slopes move the crossings: 3 to -1 crosses three quarters of the way along.
  assert.deepEqual(run([3, -1, -1, 3]), { hours: 1.5, startHours: 0.75, endHours: 2.25, openEnded: false });

  // Already down at the first sample.
  assert.deepEqual(run([-2, -1, 1, 2]), { hours: 1.5, startHours: 0, endHours: 1.5, openEnded: false });

  // Still down at the last sample.
  assert.deepEqual(run([2, 1, -1, -2]), { hours: 1.5, startHours: 1.5, endHours: 3, openEnded: true });

  // Down the whole time.
  assert.deepEqual(run([-1, -2, -1]), { hours: 2, startHours: 0, endHours: 2, openEnded: true });

  // Two gaps: the longer one wins, wherever it sits.
  assert.deepEqual(run([1, -1, 1, 1, -1, -1, -1, 1]), { hours: 3, startHours: 3.5, endHours: 6.5, openEnded: false });
  assert.deepEqual(run([1, -1, -1, -1, 1, 1, -1, 1]), { hours: 3, startHours: 0.5, endHours: 3.5, openEnded: false });
  assert.deepEqual(run([1, -1, 1, 1, -1, -1, -1]), { hours: 2.5, startHours: 3.5, endHours: 6, openEnded: true });

  // The body is chosen by name, and the time offsets are used as given.
  assert.deepEqual(run([2, 1, -1, -3, -1, 1], 'earth'), { hours: 3, startHours: 1.5, endHours: 4.5, openEnded: false });
  const offset = sunSamples([[10, 1], [12, -1], [16, -1], [18, 1]]);
  assert.deepEqual(LunarSky.longestGap(offset, 'sun'), { hours: 6, startHours: 11, endHours: 17, openEnded: false });
});

test('longestGap on a real timeline matches the sunset and sunrise that nextCrossing finds', () => {
  const samples = LunarSky.timeline(IM1, IM1_START, 24 * 30, 0.5);
  const gap = LunarSky.longestGap(samples, 'sun');
  const sunset = LunarSky.nextCrossing(IM1, 'sun', IM1_START, { direction: 'set' });
  const sunrise = LunarSky.nextCrossing(IM1, 'sun', sunset.utc, { direction: 'rise' });
  assert.equal(gap.openEnded, false);
  near(gap.startHours, sunset.hoursFromStart, 0.05, 'gap start');
  near(gap.endHours, sunset.hoursFromStart + sunrise.hoursFromStart, 0.05, 'gap end');
  near(gap.hours, gap.endHours - gap.startHours, 1e-12, 'gap length');
});
