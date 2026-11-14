/*
 * terrain.js
 * Real skylines for the lunar poles. Decodes a NASA LOLA polar elevation grid
 * and works out how high the ground rises in every compass direction from a
 * site, so the Sun or Earth can be tested against the real horizon instead of
 * a flat one.
 *
 * SI disclosure: written with an AI coding tool (Claude Code, Anthropic)
 * during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, directed and
 * reviewed by team Ksig UNT. See SI_USE.md.
 *
 * Model, stated so nobody has to guess:
 *   - Grid: spherical polar stereographic, true scale at the pole, on a
 *     sphere of radius 1737.4 km. rho = 2 R tan((90 - |lat|) / 2).
 *     South cap: x = rho sin(lon), y = rho cos(lon).
 *     North cap: x = rho sin(lon), y = -rho cos(lon).
 *     data[row * size + col], x = (col - (size - 1) / 2) * scaleKm,
 *     y = ((size - 1) / 2 - row) * scaleKm. Height in km = data * unitM / 1000.
 *   - Skyline ("mask"): for each azimuth, the largest angle above the
 *     observer's horizontal of any ground point along that great circle, out
 *     to maxRangeKm. The curve of the Moon is included. No atmosphere.
 *   - Azimuth is degrees east of north, the same as lunar-sky.js.
 *   - A body is up when its elevation minus horizonAt(mask, azimuth) is above 0.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LunarTerrain = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MOON_RADIUS_KM = 1737.4;
  var DEG = Math.PI / 180;

  /*
   * Turns an encoded grid entry (vendor/lola-south.js or lola-north.js) into
   * a grid with a `data` Int16Array. Returns a Promise.
   * Encoding: int16 little-endian, row-major, each sample stored as the
   * wrapping difference from the one before it (the first is raw), then zlib
   * (RFC 1950), then base64. Assumes a little-endian host.
   */
  function decodeGrid(entry) {
    return new Promise(function (resolve, reject) {
      if (!entry || typeof entry.b64 !== 'string' || !(entry.size > 0)) {
        reject(new Error('decodeGrid needs an entry with size and b64'));
        return;
      }
      if (typeof DecompressionStream !== 'function') {
        reject(new Error('This browser has no DecompressionStream, so the terrain grid cannot be unpacked'));
        return;
      }
      var packed = atob(entry.b64);
      var bytes = new Uint8Array(packed.length);
      for (var i = 0; i < packed.length; i++) bytes[i] = packed.charCodeAt(i);
      var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
      new Response(stream).arrayBuffer().then(function (buffer) {
        var want = entry.size * entry.size * 2;
        if (buffer.byteLength !== want) {
          throw new Error('Terrain grid decoded to ' + buffer.byteLength + ' bytes, expected ' + want);
        }
        var data = new Int16Array(buffer);
        // Undo the differences. Writing into an Int16Array wraps for us.
        for (var k = 1; k < data.length; k++) data[k] = data[k] + data[k - 1];
        var grid = {};
        for (var key in entry) {
          if (Object.prototype.hasOwnProperty.call(entry, key) && key !== 'b64') grid[key] = entry[key];
        }
        if (!grid.radiusKm) grid.radiusKm = MOON_RADIUS_KM;
        grid.data = data;
        resolve(grid);
      }).catch(reject);
    });
  }

  /*
   * Bilinear height in grid units at a fractional column and row.
   * NaN outside the array. Allocates nothing.
   */
  function sampleCell(data, size, col, row) {
    var last = size - 1;
    if (!(col >= 0 && col <= last && row >= 0 && row <= last)) return NaN;
    var c0 = Math.floor(col);
    var r0 = Math.floor(row);
    if (c0 >= last) c0 = last - 1;
    if (r0 >= last) r0 = last - 1;
    var fc = col - c0;
    var fr = row - r0;
    var i = r0 * size + c0;
    return (data[i] * (1 - fc) + data[i + 1] * fc) * (1 - fr) +
      (data[i + size] * (1 - fc) + data[i + size + 1] * fc) * fr;
  }

  /*
   * Height in km above the 1737.4 km sphere at a latitude and east longitude.
   * NaN when the point is on the other pole's hemisphere or off the array.
   */
  function heightKm(grid, latDeg, lonDeg) {
    if (!grid || !grid.data || !isFinite(latDeg) || !isFinite(lonDeg)) return NaN;
    var south = grid.pole === 'S';
    if (south ? latDeg > 0 : latDeg < 0) return NaN;
    var R = grid.radiusKm || MOON_RADIUS_KM;
    var rho = 2 * R * Math.tan((90 - Math.abs(latDeg)) * DEG / 2);
    var lon = lonDeg * DEG;
    var x = rho * Math.sin(lon);
    var y = south ? rho * Math.cos(lon) : -rho * Math.cos(lon);
    var half = (grid.size - 1) / 2;
    var v = sampleCell(grid.data, grid.size, x / grid.scaleKm + half, half - y / grid.scaleKm);
    return v * grid.unitM / 1000;
  }

  /* Next ground distance along a ray. Fine near the site, coarser far away. */
  function nextDistance(d, halfCellKm) {
    var step = 0.02 * d;
    if (step > halfCellKm) step = halfCellKm;
    if (step < 0.1) step = 0.1;
    return d + step;
  }

  /*
   * Skyline seen from a site, from a decoded grid.
   * opts: { stepDeg: 0.5, maxRangeKm: 200, eyeHeightKm: 0.002 }
   * Returns null when the site is off the grid, else
   * { stepDeg, elevDeg: Float32Array, distKm: Float32Array, groundKm, coverage }.
   * elevDeg[i] is the skyline at azimuth i * stepDeg, distKm[i] the ground
   * distance to the point that sets it. coverage is the share of rays that
   * reached maxRangeKm without leaving the grid.
   *
   * Each ray walks a great circle. The ground point at distance d and azimuth
   * az is p = cos(theta) * up + sin(theta) * heading, with theta = d / R. That
   * is the great-circle destination formula written with unit vectors, which
   * saves the inverse trig per sample. The point is then projected onto the
   * cap plane with rho = 2 R tan(colatitude / 2) = 2 R sin(c) / (1 + cos(c)).
   * A ground point of radius r1 sits atan2(r1 cos(theta) - r0, r1 sin(theta))
   * above the horizontal of an observer at radius r0. The loop compares the
   * tangent of that angle and takes one arctangent per ray.
   */
  function maskFromGrid(grid, latDeg, lonDeg, opts) {
    var o = opts || {};
    var stepDeg = o.stepDeg > 0 ? o.stepDeg : 0.5;
    var maxRange = o.maxRangeKm > 0 ? o.maxRangeKm : 200;
    var eye = (typeof o.eyeHeightKm === 'number' && o.eyeHeightKm >= 0) ? o.eyeHeightKm : 0.002;

    var groundKm = heightKm(grid, latDeg, lonDeg);
    if (isNaN(groundKm)) return null;

    var R = grid.radiusKm || MOON_RADIUS_KM;
    var size = grid.size;
    var data = grid.data;
    var scale = grid.scaleKm;
    var unitKm = grid.unitM / 1000;
    var half = (size - 1) / 2;
    var south = grid.pole === 'S';
    var halfCell = 0.5 * scale;
    var r0 = R + groundKm + eye;

    // The distances are the same for every ray, so their sines and cosines
    // are worked out once here and the inner loop needs no trig at all.
    var count = 0;
    var d;
    for (d = 0.1; d <= maxRange; d = nextDistance(d, halfCell)) count++;
    var dist = new Float64Array(count);
    var cosT = new Float64Array(count);
    var sinT = new Float64Array(count);
    var k = 0;
    for (d = 0.1; d <= maxRange; d = nextDistance(d, halfCell)) {
      dist[k] = d;
      cosT[k] = Math.cos(d / R);
      sinT[k] = Math.sin(d / R);
      k++;
    }

    // Site frame in Moon-fixed axes: x through 0 N 0 E, z through the north pole.
    var lat = latDeg * DEG;
    var lon = lonDeg * DEG;
    var ux = Math.cos(lat) * Math.cos(lon), uy = Math.cos(lat) * Math.sin(lon), uz = Math.sin(lat);
    var ex = -Math.sin(lon), ey = Math.cos(lon);
    var nx = -Math.sin(lat) * Math.cos(lon), ny = -Math.sin(lat) * Math.sin(lon), nz = Math.cos(lat);

    // What a ray with no terrain data gets: the edge of a smooth sphere
    // through the site's ground level, seen from the eye height.
    var smooth = Math.acos((R + groundKm) / r0);
    var dipDeg = -smooth / DEG;
    var dipKm = (R + groundKm) * smooth;

    var bins = Math.round(360 / stepDeg);
    var elevDeg = new Float32Array(bins);
    var distKm = new Float32Array(bins);
    var reached = 0;

    for (var b = 0; b < bins; b++) {
      var az = b * stepDeg * DEG;
      var ca = Math.cos(az);
      var sa = Math.sin(az);
      var tx = ca * nx + sa * ex;
      var ty = ca * ny + sa * ey;
      var tz = ca * nz;
      var best = -Infinity;
      var bestKm = 0;
      var j = 0;
      for (; j < count; j++) {
        var ct = cosT[j];
        var st = sinT[j];
        var pz = ct * uz + st * tz;
        var q = south ? -pz : pz; // cosine of the angle from this cap's pole
        if (q < 0) break;
        var f = 2 * R / (1 + q) / scale;
        var px = ct * ux + st * tx;
        var py = ct * uy + st * ty;
        var h = sampleCell(data, size, f * py + half, south ? half - f * px : half + f * px);
        if (h !== h) break; // NaN: the ray left the grid
        var r1 = R + h * unitKm;
        var slope = (r1 * ct - r0) / (r1 * st);
        if (slope > best) { best = slope; bestKm = dist[j]; }
      }
      if (j === count) reached++;
      if (best === -Infinity) {
        elevDeg[b] = dipDeg;
        distKm[b] = dipKm;
      } else {
        elevDeg[b] = Math.atan(best) / DEG;
        distKm[b] = bestKm;
      }
    }

    return {
      stepDeg: stepDeg,
      elevDeg: elevDeg,
      distKm: distKm,
      groundKm: groundKm,
      coverage: bins > 0 ? reached / bins : 0
    };
  }

  /*
   * Wraps one precomputed entry of SITE_HORIZONS.sites into the mask shape.
   * stepDeg defaults to 360 divided by the number of bins (0.5 for 720 bins).
   */
  function maskFromSite(entry, stepDeg) {
    if (!entry || !entry.elevDeg || !entry.elevDeg.length) return null;
    var bins = entry.elevDeg.length;
    var distKm = new Float32Array(bins);
    if (entry.distKm && entry.distKm.length === bins) distKm.set(entry.distKm);
    else for (var i = 0; i < bins; i++) distKm[i] = NaN;
    return {
      stepDeg: stepDeg > 0 ? stepDeg : 360 / bins,
      elevDeg: new Float32Array(entry.elevDeg),
      distKm: distKm,
      groundKm: entry.groundKm,
      coverage: 1
    };
  }

  /* Position of an azimuth on the mask, in bins, wrapped into [0, bins). */
  function binPosition(mask, azDeg) {
    var bins = mask.elevDeg.length;
    var pos = (azDeg / mask.stepDeg) % bins;
    if (pos < 0) pos += bins;
    if (pos >= bins) pos -= bins;
    return pos;
  }

  /*
   * Skyline height in degrees at any azimuth, by linear interpolation between
   * bins. Wraps around 360 and accepts negative or large azimuths.
   * A missing mask means a flat horizon, so this returns 0.
   */
  function horizonAt(mask, azDeg) {
    if (!mask) return 0;
    var bins = mask.elevDeg.length;
    var pos = binPosition(mask, azDeg);
    var i0 = Math.floor(pos);
    if (i0 >= bins) i0 = bins - 1;
    var i1 = i0 + 1 === bins ? 0 : i0 + 1;
    var f = pos - i0;
    return mask.elevDeg[i0] * (1 - f) + mask.elevDeg[i1] * f;
  }

  /* Ground distance in km to whatever sets the skyline at the nearest bin. */
  function blockerKm(mask, azDeg) {
    if (!mask) return NaN;
    var bins = mask.distKm.length;
    var i = Math.round(binPosition(mask, azDeg));
    if (i >= bins) i = 0;
    return mask.distKm[i];
  }

  /* A skyline function of azimuth, ready for LunarSky's `horizon` option. */
  function horizonFn(mask) {
    return function (azDeg) { return horizonAt(mask, azDeg); };
  }

  return {
    MOON_RADIUS_KM: MOON_RADIUS_KM,
    decodeGrid: decodeGrid,
    heightKm: heightKm,
    maskFromGrid: maskFromGrid,
    maskFromSite: maskFromSite,
    horizonAt: horizonAt,
    blockerKm: blockerKm,
    horizonFn: horizonFn
  };
});
