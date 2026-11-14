/*
 * lunar-sky.js
 * Where the Sun and Earth sit in the sky of a point on the Moon.
 *
 * SI disclosure: this file was written with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. See SI_USE.md.
 *
 * Model, stated so nobody has to guess:
 *   - Positions: Astronomy Engine 2.1.19 (MIT), geometric, no light-time or
 *     aberration correction. The effect is below 0.01 degrees here.
 *   - Moon orientation: IAU WGCCRE 2009 pole and prime meridian series, as
 *     implemented by Astronomy Engine's RotationAxis(Body.Moon).
 *   - Moon shape: sphere of radius 1737.4 km. Site height is added to it.
 *   - Horizon: flat, at 0 degrees elevation. No terrain. A real horizon near
 *     the south pole can sit degrees above or below this.
 *   - Elevation refers to the centre of the Sun or Earth disk.
 *   - No atmosphere, so no refraction.
 * Azimuth is measured clockwise from local north. Longitude is east-positive.
 * Checked against NASA JPL Horizons; see test/ and reference/horizons/.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../vendor/astronomy.browser.js'));
  } else {
    root.LunarSky = factory(root.Astronomy);
  }
})(typeof self !== 'undefined' ? self : this, function (Astronomy) {
  'use strict';

  var MOON_RADIUS_KM = 1737.4;
  var DEG = Math.PI / 180;
  var HOUR_MS = 3600 * 1000;

  // Mean angular radius of each disk as seen from the Moon, for reference.
  var SUN_RADIUS_KM = 695700;
  var EARTH_RADIUS_KM = 6378.137;

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) { return Math.sqrt(dot(a, a)); }

  function toDate(t) {
    var d = t instanceof Date ? t : new Date(t);
    if (isNaN(d.getTime())) throw new Error('Invalid date: ' + t);
    return d;
  }

  function checkSite(site) {
    if (!site || !isFinite(site.latDeg) || !isFinite(site.lonEastDeg)) {
      throw new Error('Site needs latDeg and lonEastDeg');
    }
    if (site.latDeg < -90 || site.latDeg > 90) throw new Error('Latitude must be between -90 and 90');
  }

  /*
   * Axes of the Moon-fixed frame, written in J2000 equatorial coordinates.
   * x points at the prime meridian on the equator, z at the north pole.
   */
  function moonFrame(time) {
    var axis = Astronomy.RotationAxis(Astronomy.Body.Moon, time);
    var z = [axis.north.x, axis.north.y, axis.north.z];
    var alpha = axis.ra * 15 * DEG; // Astronomy Engine reports RA in hours
    var node = [-Math.sin(alpha), Math.cos(alpha), 0]; // ascending node of the Moon's equator
    var m = cross(z, node);
    var w = axis.spin * DEG;
    var x = [
      node[0] * Math.cos(w) + m[0] * Math.sin(w),
      node[1] * Math.cos(w) + m[1] * Math.sin(w),
      node[2] * Math.cos(w) + m[2] * Math.sin(w)
    ];
    var y = cross(z, x);
    return { x: x, y: y, z: z };
  }

  function toMoonFixed(frame, v) {
    return [dot(v, frame.x), dot(v, frame.y), dot(v, frame.z)];
  }

  /* Sun and Earth centres relative to the Moon's centre, Moon-fixed frame, km. */
  function bodiesMoonFixed(date) {
    var time = Astronomy.MakeTime(toDate(date));
    var km = Astronomy.KM_PER_AU;
    var moon = Astronomy.GeoMoon(time);
    var sun = Astronomy.GeoVector(Astronomy.Body.Sun, time, false);
    var frame = moonFrame(time);
    return {
      sun: toMoonFixed(frame, [(sun.x - moon.x) * km, (sun.y - moon.y) * km, (sun.z - moon.z) * km]),
      earth: toMoonFixed(frame, [-moon.x * km, -moon.y * km, -moon.z * km])
    };
  }

  function siteBasis(site) {
    var lat = site.latDeg * DEG;
    var lon = site.lonEastDeg * DEG;
    var r = MOON_RADIUS_KM + (site.elevationKm || 0);
    var up = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    return {
      position: [up[0] * r, up[1] * r, up[2] * r],
      up: up,
      east: [-Math.sin(lon), Math.cos(lon), 0],
      north: [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)]
    };
  }

  function azEl(basis, bodyKm, bodyRadiusKm) {
    var v = [bodyKm[0] - basis.position[0], bodyKm[1] - basis.position[1], bodyKm[2] - basis.position[2]];
    var dist = norm(v);
    var e = dot(v, basis.east);
    var n = dot(v, basis.north);
    var u = dot(v, basis.up);
    var az = Math.atan2(e, n) / DEG;
    if (az < 0) az += 360;
    var el = Math.asin(u / dist) / DEG;
    return {
      azimuthDeg: az,
      elevationDeg: el,
      distanceKm: dist,
      angularRadiusDeg: Math.asin(bodyRadiusKm / dist) / DEG,
      aboveHorizon: el > 0
    };
  }

  /*
   * Sky position of the Sun and Earth at one site and one instant.
   * site: { latDeg, lonEastDeg, elevationKm? }   date: Date or ISO string (UTC)
   */
  function skyAt(site, date) {
    checkSite(site);
    var d = toDate(date);
    var bodies = bodiesMoonFixed(d);
    var basis = siteBasis(site);
    return {
      utc: d.toISOString(),
      sun: azEl(basis, bodies.sun, SUN_RADIUS_KM),
      earth: azEl(basis, bodies.earth, EARTH_RADIUS_KM)
    };
  }

  function elevation(site, body, ms) {
    return skyAt(site, new Date(ms))[body].elevationDeg;
  }

  /*
   * Next time a body crosses the horizon after `date`.
   * body: 'sun' or 'earth'.  options.direction: 'set' (default), 'rise', or 'any'.
   * options.maxDays: how far ahead to look (default 60).
   * options.horizonDeg: elevation that counts as the horizon (default 0).
   * Returns { utc, hoursFromStart, direction } or null when nothing crosses
   * inside the window. Near the poles a body can stay up, or down, for months.
   */
  function nextCrossing(site, body, date, options) {
    checkSite(site);
    if (body !== 'sun' && body !== 'earth') throw new Error("body must be 'sun' or 'earth'");
    var opt = options || {};
    var want = opt.direction || 'set';
    var horizon = opt.horizonDeg || 0;
    var maxMs = (opt.maxDays || 60) * 24 * HOUR_MS;
    var start = toDate(date).getTime();
    var step = HOUR_MS;

    var t0 = start;
    var f0 = elevation(site, body, t0) - horizon;
    for (var t1 = start + step; t1 <= start + maxMs; t1 += step) {
      var f1 = elevation(site, body, t1) - horizon;
      var crossed = (f0 > 0 && f1 <= 0) ? 'set' : (f0 <= 0 && f1 > 0) ? 'rise' : null;
      if (crossed && (want === 'any' || want === crossed)) {
        var lo = t0, hi = t1, flo = f0;
        while (hi - lo > 1000) {
          var mid = (lo + hi) / 2;
          var fm = elevation(site, body, mid) - horizon;
          if ((flo > 0) === (fm > 0)) { lo = mid; flo = fm; } else { hi = mid; }
        }
        var when = Math.round((lo + hi) / 2 / 1000) * 1000;
        return {
          utc: new Date(when).toISOString(),
          hoursFromStart: (when - start) / HOUR_MS,
          direction: crossed
        };
      }
      t0 = t1;
      f0 = f1;
    }
    return null;
  }

  /*
   * Elevation and azimuth samples from `start`, every `stepHours`, for `hours`.
   * Returns [{ utc, hoursFromStart, sun: {azimuthDeg, elevationDeg}, earth: {...} }].
   */
  function timeline(site, start, hours, stepHours) {
    checkSite(site);
    var step = (stepHours || 1) * HOUR_MS;
    var t0 = toDate(start).getTime();
    var basis = siteBasis(site);
    var out = [];
    for (var t = t0; t <= t0 + hours * HOUR_MS + 1; t += step) {
      var bodies = bodiesMoonFixed(new Date(t));
      var sun = azEl(basis, bodies.sun, SUN_RADIUS_KM);
      var earth = azEl(basis, bodies.earth, EARTH_RADIUS_KM);
      out.push({
        utc: new Date(t).toISOString(),
        hoursFromStart: (t - t0) / HOUR_MS,
        sun: { azimuthDeg: sun.azimuthDeg, elevationDeg: sun.elevationDeg },
        earth: { azimuthDeg: earth.azimuthDeg, elevationDeg: earth.elevationDeg }
      });
    }
    return out;
  }

  /*
   * Hours each body spends above the horizon inside a window, from samples.
   * Returns { sunHours, earthHours, bothHours, windowHours }.
   */
  function visibilityHours(site, start, hours, stepHours) {
    var step = stepHours || 0.25;
    var samples = timeline(site, start, hours, step);
    var sun = 0, earth = 0, both = 0;
    for (var i = 0; i < samples.length - 1; i++) {
      var s = samples[i].sun.elevationDeg > 0;
      var e = samples[i].earth.elevationDeg > 0;
      if (s) sun += step;
      if (e) earth += step;
      if (s && e) both += step;
    }
    return { sunHours: sun, earthHours: earth, bothHours: both, windowHours: hours };
  }

  return {
    MOON_RADIUS_KM: MOON_RADIUS_KM,
    skyAt: skyAt,
    nextCrossing: nextCrossing,
    timeline: timeline,
    visibilityHours: visibilityHours
  };
});
