/*
 * app.js
 * Reads the two scenarios from the form, runs the calculation, and fills in
 * the verdict, the numbers table, and the charts.
 *
 * SI disclosure: this file was written with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. See SI_USE.md.
 */
(function () {
  'use strict';

  var Sky = window.LunarSky;
  var Charts = window.LunarCharts;
  var SITES = window.LunarSites.SITES;
  var KIND_NOTE = window.LunarSites.KIND_NOTE;
  var Terrain = window.LunarTerrain || null;
  var SITE_HORIZONS = window.SITE_HORIZONS || null;   // skylines for the listed polar sites

  var HOUR_MS = 3600000;
  var DAY_MS = 24 * HOUR_MS;
  var SAMPLES = 720;          // points per timeline
  var SEARCH_DAYS = 90;       // how far ahead to look for the next rise or set
  var PLAY_MS = 16000;        // Play runs the whole look-ahead period in this long
  var TERRAIN_MIN_LAT = 73;   // terrain is used poleward of this latitude, north or south
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  var form = document.getElementById('setup');
  var fieldsets = {
    a: form.querySelector('[data-scenario="a"]'),
    b: form.querySelector('[data-scenario="b"]')
  };
  var chartCols = {
    a: document.querySelector('.chart-col[data-scenario="a"]'),
    b: document.querySelector('.chart-col[data-scenario="b"]')
  };

  var results = null;   // last good { a, b, windowDays, scale }
  var drawn = null;     // chart handles for the cursor
  var cursorIndex = 0;
  var globe = null;     // the 3D Moon, or null when the browser cannot draw it
  var framed = false;   // true once the globe has been turned to show both sites
  var playing = null;   // { from, t0, raf } while Play is running
  var linkView = null;  // a link can aim the globe: g=latitude,longitude,zoom
  var grids = { S: null, N: null };           // LOLA polar grids, loaded when a custom polar point needs one
  var gridState = { S: 'idle', N: 'idle' };   // idle, loading, ready, failed
  var maskCache = {};                         // skylines already worked out
  var playButton = document.getElementById('play');
  var scrub = document.getElementById('scrub');

  /* ---------- small helpers ---------- */

  function $(parent, selector) { return parent.querySelector(selector); }

  function node(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function toInputValue(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
      'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }

  function parseInputValue(v) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v || '')) return NaN;
    return Date.parse(v.slice(0, 16) + ':00Z');
  }

  function fmtUtc(ms, withYear) {
    var d = new Date(ms);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + (withYear ? ', ' + d.getUTCFullYear() : '') +
      ', ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
  }

  function fmtDuration(hours) {
    if (hours < 1) return Math.max(1, Math.round(hours * 60)) + ' min';
    if (hours < 48) return Math.round(hours) + ' h';
    var total = Math.round(hours);
    var d = Math.floor(total / 24);
    var h = total % 24;
    return d + ' d' + (h ? ' ' + h + ' h' : '');
  }

  function fmtHours(hours) {
    return Math.round(hours).toLocaleString('en-US') + ' h';
  }

  function fmtHeight(deg, word) {
    var a = Math.abs(deg).toFixed(1) + '°';
    return a + (deg > 0 ? ' above the ' : ' below the ') + (word || 'horizon');
  }

  function fmtEnergy(kwh) {
    return kwh < 10 ? kwh.toFixed(1) : Math.round(kwh).toLocaleString('en-US');
  }

  function fmtSigned(deg) {
    return (deg > 0 ? '+' : deg < 0 ? '−' : '') + Math.abs(deg).toFixed(1) + '°';
  }

  function compass(az) { return COMPASS[Math.round(az / 22.5) % 16]; }

  function fmtCoord(lat, lon) {
    return Math.abs(lat).toFixed(2) + '°' + (lat < 0 ? 'S' : 'N') + ', ' +
      Math.abs(lon).toFixed(2) + '°' + (lon < 0 ? 'W' : 'E');
  }

  /* ---------- form ---------- */

  function siteById(id) {
    for (var i = 0; i < SITES.length; i++) if (SITES[i].id === id) return SITES[i];
    return null;
  }

  function fillSiteOptions(select) {
    SITES.forEach(function (s) {
      var o = node('option', null, s.name);
      o.value = s.id;
      select.appendChild(o);
    });
    var custom = node('option', null, 'Custom coordinates');
    custom.value = 'custom';
    select.appendChild(custom);
  }

  function applySite(fs, id) {
    var site = siteById(id);
    if (site) {
      $(fs, '[name=lat]').value = site.latDeg;
      $(fs, '[name=lon]').value = site.lonEastDeg;
      $(fs, '[name=elev]').value = site.elevationKm;
    }
    showSource(fs);
  }

  function showSource(fs) {
    var p = $(fs, '[data-role=source]');
    var site = siteById($(fs, '[name=site]').value);
    var landingBtn = $(fs, '[data-action=landing]');
    p.textContent = '';
    if (!site) {
      p.textContent = 'Your own coordinates. Longitude counts east: 90°W is −90. Height is above the 1737.4 km sphere; a click on the 3D Moon fills it in from NASA LOLA data.';
      if (landingBtn) landingBtn.hidden = true;
      return;
    }
    p.appendChild(document.createTextNode(
      site.place.charAt(0).toUpperCase() + site.place.slice(1) + '. ' + KIND_NOTE[site.kind] +
      (site.elevationKm === 0 ? ' The source gives no height, so it is set to 0.' : '') + ' Source: '));
    var a = node('a', null, site.sourceName);
    a.href = site.sourceUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));
    if (landingBtn) landingBtn.hidden = !site.landedUtc;
  }

  /* If the typed coordinates no longer match the chosen site, call it custom. */
  function reconcileSite(fs) {
    var select = $(fs, '[name=site]');
    var site = siteById(select.value);
    if (!site) return;
    var lat = parseFloat($(fs, '[name=lat]').value);
    var lon = parseFloat($(fs, '[name=lon]').value);
    var elev = parseFloat($(fs, '[name=elev]').value || '0');
    if (lat !== site.latDeg || lon !== site.lonEastDeg || elev !== site.elevationKm) {
      select.value = 'custom';
      showSource(fs);
    }
  }

  function readScenario(key) {
    var fs = fieldsets[key];
    var err = $(fs, '[data-role=error]');
    var lat = parseFloat($(fs, '[name=lat]').value);
    var lon = parseFloat($(fs, '[name=lon]').value);
    var elevRaw = $(fs, '[name=elev]').value;
    var elev = elevRaw === '' ? 0 : parseFloat(elevRaw);
    var timeInput = $(fs, '[name=time]');
    if (key === 'b') {
      var same = $(fs, '[name=sameTime]').checked;
      timeInput.disabled = same;
      if (same) timeInput.value = $(fieldsets.a, '[name=time]').value;
    }
    var ms = parseInputValue(timeInput.value);
    var problem = null;
    if (!isFinite(lat) || lat < -90 || lat > 90) problem = 'Latitude must be a number from −90 to 90.';
    else if (!isFinite(lon) || lon < -360 || lon > 360) problem = 'Longitude must be a number from −360 to 360.';
    else if (!isFinite(elev) || elev < -10 || elev > 11) problem = 'Height must be between −10 and 11 km.';
    else if (!isFinite(ms)) problem = 'Pick a date and time.';
    else if (ms < Date.UTC(1900, 0, 1) || ms > Date.UTC(2100, 0, 1)) problem = 'Pick a date between 1900 and 2100.';
    err.hidden = !problem;
    err.textContent = problem || '';
    if (problem) return null;
    var site = siteById($(fs, '[name=site]').value);
    return {
      key: key,
      siteId: site ? site.id : 'custom',
      name: site ? site.name : 'Custom site (' + fmtCoord(lat, lon) + ')',
      site: { latDeg: lat, lonEastDeg: lon, elevationKm: elev },
      startMs: ms
    };
  }

  function windowDays() {
    var checked = form.querySelector('[name=window]:checked');
    return checked ? parseInt(checked.value, 10) : 30;
  }

  /* ---------- horizon: flat, or the skyline from LOLA terrain ---------- */

  function horizonMode() {
    var checked = form.querySelector('[name=horizon]:checked');
    return checked ? checked.value : 'terrain';
  }

  /*
   * The polar grids are a few megabytes each, so one loads only when a point
   * that is not in the site list needs it. They are scripts, not fetched
   * files, so this works with the page opened from disk.
   */
  function loadGrid(pole) {
    if (gridState[pole] !== 'idle') return;
    gridState[pole] = 'loading';
    var name = pole === 'S' ? 'south' : 'north';
    function fail() { gridState[pole] = 'failed'; update(); }
    var script = document.createElement('script');
    script.src = 'vendor/lola-' + name + '.js';
    script.onload = function () {
      var entry = window.LOLA_POLAR && window.LOLA_POLAR[name];
      if (!entry) { fail(); return; }
      Terrain.decodeGrid(entry).then(function (grid) {
        grids[pole] = grid;
        gridState[pole] = 'ready';
        update();
      }, fail);
    };
    script.onerror = fail;
    document.body.appendChild(script);
  }

  /* The highest point of a skyline, for the table. */
  function highest(mask) {
    var best = 0;
    for (var i = 1; i < mask.elevDeg.length; i++) if (mask.elevDeg[i] > mask.elevDeg[best]) best = i;
    return { deg: mask.elevDeg[best], az: best * mask.stepDeg, km: mask.distKm[best] };
  }

  /*
   * The skyline for a scenario: { mask, kind, gridM, high }.
   *   'site'     worked out from the full-resolution grid when the data was built
   *   'grid'     worked out here from the coarser grid in vendor/
   *   'flat'     the reader chose a flat horizon
   *   'far'      too far from a pole; terrain is not used there
   *   'loading'  the grid is on its way; flat until it arrives
   *   'missing'  the terrain code or data did not load; flat
   */
  function skylineFor(scn) {
    if (horizonMode() === 'flat') return { mask: null, kind: 'flat' };
    if (!Terrain) return { mask: null, kind: 'missing' };
    var lat = scn.site.latDeg, lon = scn.site.lonEastDeg;
    var key = scn.siteId + ':' + lat + ',' + lon;
    if (maskCache[key]) return maskCache[key];
    var out;
    var entry = SITE_HORIZONS && SITE_HORIZONS.sites[scn.siteId];
    if (entry) {
      out = { mask: Terrain.maskFromSite(entry, SITE_HORIZONS.stepDeg), kind: 'site', gridM: SITE_HORIZONS.gridM };
    } else if (Math.abs(lat) < TERRAIN_MIN_LAT) {
      out = { mask: null, kind: 'far' };
    } else {
      var pole = lat < 0 ? 'S' : 'N';
      if (gridState[pole] === 'failed') return { mask: null, kind: 'missing' };
      if (gridState[pole] !== 'ready') {
        loadGrid(pole);
        return { mask: null, kind: 'loading' };
      }
      var mask = Terrain.maskFromGrid(grids[pole], lat, lon);
      out = mask
        ? { mask: mask, kind: 'grid', gridM: Math.round(grids[pole].scaleKm * 1000) }
        : { mask: null, kind: 'far' };
    }
    if (out.mask) out.high = highest(out.mask);
    maskCache[key] = out;
    return out;
  }

  /* ---------- calculation ---------- */

  /*
   * Every height below is clearDeg: the body's height minus the height of the
   * horizon in its compass direction. With a flat horizon the two are equal.
   */
  function compute(scn, days) {
    var hours = days * 24;
    var sky = skylineFor(scn);
    var horizon = sky.mask ? Terrain.horizonFn(sky.mask) : null;
    var raw = Sky.timeline(scn.site, new Date(scn.startMs), hours, hours / SAMPLES,
      horizon ? { horizon: horizon } : undefined);
    var samples = raw.map(function (s) {
      return { ms: scn.startMs + s.hoursFromStart * HOUR_MS, hours: s.hoursFromStart, sun: s.sun, earth: s.earth };
    });
    var now = samples[0];
    var out = {
      scn: scn, samples: samples, now: now, vis: Charts.visibility(samples), windowHours: hours,
      sky: sky, horizon: horizon, word: horizon ? 'skyline' : 'horizon',
      energy: Sky.solarEnergy(raw)
    };

    ['sun', 'earth'].forEach(function (body) {
      var up = now[body].clearDeg > 0;
      var search = { direction: up ? 'set' : 'rise', maxDays: SEARCH_DAYS };
      if (horizon) search.horizon = horizon;
      var next = Sky.nextCrossing(scn.site, body, new Date(scn.startMs), search);
      var lo = Infinity, hi = -Infinity, hiMs = scn.startMs, reach = 0;
      samples.forEach(function (s) {
        var e = s[body].clearDeg;
        if (e < lo) lo = e;
        if (e > hi) { hi = e; hiMs = s.ms; }
        reach = Math.max(reach, Math.abs(e), Math.abs(s[body].elevationDeg));
      });
      out[body] = { up: up, next: next, min: lo, max: hi, maxMs: hiMs, reach: reach, gap: Sky.longestGap(raw, body) };
    });

    // How long Sun and Earth stay up together, counted from the chosen time.
    if (out.sun.up && out.earth.up) {
      var ends = [out.sun.next, out.earth.next].filter(Boolean).map(function (c) { return c.hoursFromStart; });
      out.bothFromStart = ends.length ? Math.min.apply(null, ends) : Infinity;
    } else {
      out.bothFromStart = 0;
    }
    return out;
  }

  /* ---------- verdict sentences ---------- */

  var WORDS = {
    sun: {
      has: 'has sunlight', lose: 'loses the Sun', keep: 'keeps it', dark: 'is in the dark',
      regain: 'gets the Sun back', bothDark: 'Both are in the dark', keepBoth: 'Both keep the Sun'
    },
    earth: {
      has: 'has the Earth in view', lose: 'loses sight of the Earth', keep: 'keeps it', dark: 'cannot see the Earth',
      regain: 'gets the Earth back', bothDark: 'Neither can see the Earth', keepBoth: 'Both keep the Earth in view'
    }
  };

  function verdictFor(body, A, B) {
    var w = WORDS[body];
    var a = A[body], b = B[body];
    var horizon = 'at least the next ' + SEARCH_DAYS + ' days';
    function label(x) { return x === A ? 'A' : 'B'; }

    if (a.up && b.up) {
      if (!a.next && !b.next) return w.keepBoth + ' for ' + horizon + '.';
      if (a.next && b.next) {
        var first = a.next.hoursFromStart <= b.next.hoursFromStart ? A : B;
        var second = first === A ? B : A;
        var gap = Math.abs(a.next.hoursFromStart - b.next.hoursFromStart);
        if (gap < 1) return 'A and B ' + w.lose.replace('loses', 'lose') + ' within an hour of each other, in ' + fmtDuration(first[body].next.hoursFromStart) + '.';
        return label(first) + ' ' + w.lose + ' first, in ' + fmtDuration(first[body].next.hoursFromStart) + '. ' +
          label(second) + ' ' + w.keep + ' ' + fmtDuration(gap) + ' longer.';
      }
      var loser = a.next ? A : B;
      var keeper = loser === A ? B : A;
      return label(loser) + ' ' + w.lose + ' in ' + fmtDuration(loser[body].next.hoursFromStart) + '. ' +
        label(keeper) + ' ' + w.keep + ' for ' + horizon + '.';
    }

    if (!a.up && !b.up) {
      if (!a.next && !b.next) return w.bothDark + ' for ' + horizon + '.';
      if (a.next && b.next) {
        var f = a.next.hoursFromStart <= b.next.hoursFromStart ? A : B;
        var s = f === A ? B : A;
        var g = Math.abs(a.next.hoursFromStart - b.next.hoursFromStart);
        if (g < 1) return w.bothDark + '. Both get it back in about ' + fmtDuration(f[body].next.hoursFromStart) + '.';
        return w.bothDark + '. ' + label(f) + ' ' + w.regain + ' first, in ' + fmtDuration(f[body].next.hoursFromStart) +
          '; ' + label(s) + ' waits ' + fmtDuration(g) + ' longer.';
      }
      var riser = a.next ? A : B;
      var stuck = riser === A ? B : A;
      return w.bothDark + '. ' + label(riser) + ' ' + w.regain + ' in ' + fmtDuration(riser[body].next.hoursFromStart) +
        '; ' + label(stuck) + ' does not for ' + horizon + '.';
    }

    var upOne = a.up ? A : B;
    var downOne = a.up ? B : A;
    var first2 = label(upOne) + ' ' + w.has + (upOne[body].next
      ? ' and ' + w.lose + ' in ' + fmtDuration(upOne[body].next.hoursFromStart)
      : ' for ' + horizon) + '. ';
    var second2 = label(downOne) + ' ' + w.dark + (downOne[body].next
      ? ' and ' + w.regain + ' in ' + fmtDuration(downOne[body].next.hoursFromStart)
      : ' for ' + horizon) + '.';
    return first2 + second2;
  }

  /* The longest unbroken time a body stays down in the period. */
  function gapText(g) {
    if (!g.hours) return '0 h';
    return (g.openEnded ? 'at least ' : '') + fmtDuration(g.hours);
  }

  function verdictTotals(A, B, days) {
    var first = 'Over the next ' + days + ' days, A gets ' + fmtHours(A.vis.sunHours) + ' of sunlight and B gets ' +
      fmtHours(B.vis.sunHours) + '. ';
    if (!A.sun.gap.hours && !B.sun.gap.hours) return first + 'Neither goes without the Sun in that time.';
    return first + 'The longest time without the Sun is ' + gapText(A.sun.gap) + ' at A and ' +
      gapText(B.sun.gap) + ' at B.';
  }

  /* The sentences are the page's headline. Durations are set brighter than the words around them. */
  var DURATION = /(\d[\d,]* (?:d \d+ h|days|min|d|h))(?![a-z])/;

  function renderVerdict(A, B, days) {
    var list = document.getElementById('verdict');
    list.textContent = '';
    [verdictFor('sun', A, B), verdictFor('earth', A, B), verdictTotals(A, B, days)].forEach(function (sentence) {
      var li = node('li');
      sentence.split(DURATION).forEach(function (part, i) {
        if (!part) return;
        // A duration never breaks across lines.
        li.appendChild(i % 2 ? node('b', null, part.replace(/ /g, ' ')) : document.createTextNode(part));
      });
      list.appendChild(li);
    });
  }

  /* ---------- numbers table ---------- */

  function cell(main, sub) {
    var td = node('td');
    td.appendChild(node('strong', null, main));
    if (sub) td.appendChild(node('small', null, sub));
    return td;
  }

  function nowCell(R, body) {
    var p = R.now[body];
    var sub = 'toward ' + compass(p.azimuthDeg) + ' (' + Math.round(p.azimuthDeg) + '° from north)';
    if (R.horizon) sub += ', skyline there ' + fmtSigned(R.horizon(p.azimuthDeg));
    return cell(fmtHeight(p.clearDeg, R.word), sub);
  }

  function gapCell(R, body) {
    var g = R[body].gap;
    if (!g.hours) return cell('None', 'in the period');
    var text = gapText(g);
    return cell(text.charAt(0).toUpperCase() + text.slice(1),
      'from ' + fmtUtc(R.scn.startMs + g.startHours * HOUR_MS, false) +
      (g.openEnded ? ', still going when the period ends' : ''));
  }

  function horizonCell(R) {
    var sky = R.sky;
    if (sky.mask) {
      return cell('LOLA terrain, ' + sky.gridM + ' m grid',
        'highest ' + fmtSigned(sky.high.deg) + ' toward ' + compass(sky.high.az) + ', ' +
        (sky.high.km < 10 ? sky.high.km.toFixed(1) : Math.round(sky.high.km)) + ' km away');
    }
    if (sky.kind === 'loading') return cell('Flat for now', 'the terrain grid is loading');
    if (sky.kind === 'missing') return cell('Flat', 'the terrain data did not load');
    if (sky.kind === 'far') return cell('Flat', 'terrain is used within ' + (90 - TERRAIN_MIN_LAT) + '° of a pole');
    return cell('Flat', 'chosen under Horizon');
  }

  function nextCell(R, body) {
    var b = R[body];
    var year = new Date(R.scn.startMs).getUTCFullYear();
    if (!b.next) return cell(b.up ? 'Stays up' : 'Stays down', 'for at least the next ' + SEARCH_DAYS + ' days');
    var ms = Date.parse(b.next.utc);
    return cell((b.up ? 'Sets in ' : 'Rises in ') + fmtDuration(b.next.hoursFromStart),
      fmtUtc(ms, new Date(ms).getUTCFullYear() !== year));
  }

  function shareCell(hours, windowHours) {
    return cell(fmtHours(hours), Math.round(hours / windowHours * 100) + '% of the period');
  }

  function renderMetrics(A, B, days) {
    var body = document.getElementById('metrics-body');
    body.textContent = '';
    var period = 'the next ' + days + ' days';

    function group(dot, title) {
      var tr = node('tr', 'group');
      var th = node('th');
      th.colSpan = 3;
      th.scope = 'colgroup';
      th.appendChild(node('span', 'dot dot-' + dot));
      th.appendChild(document.createTextNode(title));
      tr.appendChild(th);
      body.appendChild(tr);
    }
    function row(label, make) {
      var tr = node('tr');
      var th = node('th', null, label);
      th.scope = 'row';
      tr.appendChild(th);
      tr.appendChild(make(A));
      tr.appendChild(make(B));
      body.appendChild(tr);
    }

    group('sun', 'Sun: power');
    row('Sun at the chosen time', function (R) { return nowCell(R, 'sun'); });
    row('Next sunset or sunrise', function (R) { return nextCell(R, 'sun'); });
    row('Sunlight in ' + period, function (R) { return shareCell(R.vis.sunHours, R.windowHours); });
    row('Highest Sun in ' + period, function (R) {
      return cell(fmtSigned(R.sun.max), fmtUtc(R.sun.maxMs, false));
    });
    row('Solar energy in ' + period, function (R) {
      return cell(fmtEnergy(R.energy.kwhPerM2) + ' kWh per m²',
        'on a panel facing the Sun, average ' + Math.round(R.energy.meanWPerM2).toLocaleString('en-US') + ' W per m²');
    });
    row('Longest time without the Sun', function (R) { return gapCell(R, 'sun'); });

    group('earth', 'Earth: direct radio link');
    row('Earth at the chosen time', function (R) { return nowCell(R, 'earth'); });
    row('Next Earthset or Earthrise', function (R) { return nextCell(R, 'earth'); });
    row('Earth in view in ' + period, function (R) { return shareCell(R.vis.earthHours, R.windowHours); });
    row('Earth height range in ' + period, function (R) {
      return cell(fmtSigned(R.earth.min) + ' to ' + fmtSigned(R.earth.max));
    });
    row('Longest time without the Earth', function (R) { return gapCell(R, 'earth'); });

    group('both', 'Sun and Earth together');
    row('Both up, unbroken from the chosen time', function (R) {
      if (R.bothFromStart === 0) return cell('Not both up', 'at the chosen time');
      if (R.bothFromStart === Infinity) return cell('At least ' + SEARCH_DAYS + ' days');
      return cell(fmtDuration(R.bothFromStart));
    });
    row('Both up in ' + period, function (R) { return shareCell(R.vis.bothHours, R.windowHours); });

    group('ground', 'Horizon');
    row('Horizon used', horizonCell);
  }

  /* ---------- charts ---------- */

  function renderReadout(key, index) {
    var R = results[key];
    var s = R.samples[index];
    var p = $(chartCols[key], '[data-role=readout]');
    p.textContent = '';
    p.appendChild(node('span', 't', fmtUtc(s.ms, true) + (index === 0 ? ', the chosen time' : ', ' + fmtDuration(s.hours) + ' later')));
    [['sun', 'Sun'], ['earth', 'Earth']].forEach(function (b) {
      var v = node('span', 'v');
      v.appendChild(node('span', 'key key-' + b[0]));
      v.appendChild(node('span', 'name', b[1]));
      v.appendChild(node('b', null, fmtSigned(s[b[0]].clearDeg)));
      v.appendChild(node('span', 'name', compass(s[b[0]].azimuthDeg)));
      p.appendChild(v);
    });
  }

  function setCursor(index) {
    if (!results || !drawn) return;
    cursorIndex = Math.min(SAMPLES, Math.max(0, Math.round(index)));
    ['a', 'b'].forEach(function (key) {
      drawn[key].timeline.setCursor(cursorIndex);
      drawn[key].panorama.setCursor(cursorIndex);
      renderReadout(key, cursorIndex);
    });
    renderMoon();
  }

  /* ---------- 3D Moon ---------- */

  /* Light the globe for the time under the cursor and put the markers on it. */
  function renderMoon() {
    var A = results.a, B = results.b;
    var s = A.samples[cursorIndex];
    var text = 'Sunlight as of ' + fmtUtc(s.ms, true) +
      (cursorIndex === 0 ? ', the chosen time' : ', ' + fmtDuration(s.hours) + ' later');
    if (A.scn.startMs !== B.scn.startMs) text += '. The globe follows scenario A’s clock.';
    document.getElementById('moon-clock').textContent = fmtUtc(s.ms, true);
    document.getElementById('moon-offset').textContent =
      (cursorIndex === 0 ? 'the chosen time' : fmtDuration(s.hours) + ' later') +
      (A.scn.startMs !== B.scn.startMs ? ', on scenario A’s clock' : '');
    scrub.value = cursorIndex;
    scrub.setAttribute('aria-valuetext', text);
    if (!globe) return;
    var sub = Sky.subPoints(new Date(s.ms));
    globe.setSun(sub.sun.direction);
    globe.setMarkers([
      { kind: 'sun', label: 'Sun overhead', latDeg: sub.sun.latDeg, lonEastDeg: sub.sun.lonEastDeg },
      { kind: 'earth', label: 'Earth overhead', latDeg: sub.earth.latDeg, lonEastDeg: sub.earth.lonEastDeg },
      { kind: 'site', label: 'A', latDeg: A.scn.site.latDeg, lonEastDeg: A.scn.site.lonEastDeg },
      { kind: 'site', label: 'B', latDeg: B.scn.site.latDeg, lonEastDeg: B.scn.site.lonEastDeg }
    ]);
  }

  /* Turn the globe so both sites show, tipped toward the equator so the Moon stays recognisable. */
  function frameSites(animate) {
    if (!globe || !results) return;
    var rad = Math.PI / 180;
    var sum = [0, 0, 0];
    [results.a, results.b].forEach(function (R) {
      var lat = R.scn.site.latDeg * rad, lon = R.scn.site.lonEastDeg * rad;
      sum[0] += Math.cos(lat) * Math.cos(lon);
      sum[1] += Math.cos(lat) * Math.sin(lon);
      sum[2] += Math.sin(lat);
    });
    var len = Math.sqrt(sum[0] * sum[0] + sum[1] * sum[1] + sum[2] * sum[2]);
    var site = results.a.scn.site;
    var lat = site.latDeg, lon = site.lonEastDeg;
    if (len > 0.5) {
      lat = Math.asin(sum[2] / len) / rad;
      lon = Math.atan2(sum[1], sum[0]) / rad;
    }
    globe.lookAt(lat * 0.62, lon, 1, animate);
    framed = true;
  }

  /* The two bars behind the time slider: when the Sun is above the horizon at A and at B. */
  function renderSunBars() {
    ['a', 'b'].forEach(function (key) {
      var samples = results[key].samples;
      var stops = [];
      var prev = null;
      function colour(up) { return up ? 'var(--sun)' : 'transparent'; }
      for (var i = 0; i <= SAMPLES; i++) {
        var up = samples[i].sun.clearDeg > 0;
        if (up === prev) continue;
        var at = (i / SAMPLES * 100).toFixed(2) + '%';
        if (prev !== null) stops.push(colour(prev) + ' ' + at);
        stops.push(colour(up) + ' ' + at);
        prev = up;
      }
      stops.push(colour(prev) + ' 100%');
      document.getElementById('lit-' + key).style.backgroundImage =
        'linear-gradient(to right, ' + stops.join(', ') + ')';
    });
  }

  function setPlaying(on) {
    if (on === !!playing) return;
    playButton.textContent = on ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) {
      cancelAnimationFrame(playing.raf);
      playing = null;
      return;
    }
    if (cursorIndex >= SAMPLES) setCursor(0);
    playing = { from: cursorIndex, t0: performance.now(), raf: 0 };
    playing.raf = requestAnimationFrame(playStep);
  }

  function playStep(now) {
    if (!playing) return;
    var index = Math.floor(playing.from + (now - playing.t0) / PLAY_MS * SAMPLES);
    if (index >= SAMPLES) {
      setCursor(SAMPLES);
      setPlaying(false);
      return;
    }
    if (index !== cursorIndex) setCursor(index);
    playing.raf = requestAnimationFrame(playStep);
  }

  /*
   * The Moon map is 3.9 MB, so it loads after the numbers are on the page.
   * It is a script, not an image, so the page still works opened from disk.
   */
  function loadMoon() {
    function start() {
      initGlobe();
      if (globe && results) update();
    }
    if (window.MoonMaps) { start(); return; }
    var script = document.createElement('script');
    script.src = 'vendor/moon-maps.js';
    script.onload = start;
    script.onerror = start;
    document.body.appendChild(script);
  }

  function initGlobe() {
    var host = document.getElementById('globe');
    try {
      globe = window.LunarGlobe
        ? window.LunarGlobe.create(host, window.MoonMaps, { slot: document.getElementById('moon-slot') })
        : null;
    } catch (e) {
      globe = null;
    }
    if (!globe) {
      document.getElementById('stage').classList.add('no-globe');
      host.removeAttribute('tabindex');
      document.getElementById('globe-msg').textContent =
        'This browser cannot draw the 3D Moon. Everything else on the page still works.';
      document.querySelector('.views').hidden = true;
      document.querySelectorAll('.pick').forEach(function (label) { label.hidden = true; });
      return;
    }
    document.getElementById('relief-x').textContent = globe.reliefExaggeration;

    globe.onPick = function (place) {
      var fs = fieldsets[document.querySelector('[name=pick]:checked').value];
      $(fs, '[name=site]').value = 'custom';
      $(fs, '[name=lat]').value = Number(place.latDeg.toFixed(2));
      var lon = Number(place.lonEastDeg.toFixed(2));
      $(fs, '[name=lon]').value = lon === -180 ? 180 : lon;
      $(fs, '[name=elev]').value = place.heightKm == null ? 0 : Number(place.heightKm.toFixed(2));
      showSource(fs);
      update();
    };

    document.querySelectorAll('[data-zoom]').forEach(function (b) {
      b.addEventListener('click', function () { globe.zoomBy(b.getAttribute('data-zoom') === 'in' ? 1.6 : 1 / 1.6); });
    });
    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-view');
        if (v === 'near') globe.lookAt(0, 0, 1);
        else if (v === 'far') globe.lookAt(0, 180, 1);
        else if (v === 'south') globe.lookAt(-90, 0, 1.6);
        else if (v === 'north') globe.lookAt(90, 0, 1.6);
        else if (results) globe.lookAt(results[v].scn.site.latDeg, results[v].scn.site.lonEastDeg, 2.5);
      });
    });
  }

  function renderCharts() {
    if (!results) return;
    drawn = {};
    ['a', 'b'].forEach(function (key) {
      var R = results[key];
      var col = chartCols[key];
      $(col, '[data-role=title]').textContent = R.scn.name + ', from ' + fmtUtc(R.scn.startMs, true);
      var base = { samples: R.samples, startMs: R.scn.startMs, windowDays: results.windowDays, scale: R.scale, zeroLabel: R.word };
      $(col, '[data-role=cap-panorama]').textContent = R.horizon
        ? 'The view from the site. Compass direction runs across and height runs up. The grey ground is the skyline from LOLA terrain.'
        : 'The view from the site. Compass direction runs across and height above the horizon runs up.';
      $(col, '[data-role=cap-timeline]').textContent = 'Height above the ' + R.word + ' over time';
      drawn[key] = {
        panorama: Charts.panorama($(col, '[data-role=panorama]'), {
          samples: R.samples, scale: R.scale, centerAz: R.scn.site.latDeg < 0 ? 0 : 180, skyline: R.horizon
        }),
        timeline: Charts.timeline($(col, '[data-role=timeline]'), base)
      };
      Charts.strips($(col, '[data-role=strips]'), { vis: R.vis, startMs: R.scn.startMs, windowDays: results.windowDays });
    });
    setCursor(cursorIndex);
  }

  function wireChart(key) {
    var host = $(chartCols[key], '[data-role=timeline]');
    host.addEventListener('pointermove', function (e) {
      if (drawn && !playing) setCursor(drawn[key].timeline.indexAt(e.clientX));
    });
    host.addEventListener('pointerdown', function (e) {
      setPlaying(false);
      if (drawn) setCursor(drawn[key].timeline.indexAt(e.clientX));
    });
    host.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 24 : 1;
      if (/^(Arrow(Left|Right)|Home|End)$/.test(e.key)) setPlaying(false);
      if (e.key === 'ArrowRight') setCursor(cursorIndex + step);
      else if (e.key === 'ArrowLeft') setCursor(cursorIndex - step);
      else if (e.key === 'Home') setCursor(0);
      else if (e.key === 'End') setCursor(SAMPLES);
      else return;
      e.preventDefault();
    });
  }

  /* ---------- table view ---------- */

  function renderSamples(A, B) {
    var body = document.getElementById('samples-body');
    body.textContent = '';
    var every = SAMPLES / 30;
    for (var i = 0; i <= SAMPLES; i += every) {
      var tr = node('tr');
      tr.appendChild(node('td', null, i === 0 ? 'Chosen time' : fmtDuration(A.samples[i].hours)));
      tr.appendChild(node('td', null, fmtUtc(A.samples[i].ms, false)));
      [A, B].forEach(function (R) {
        tr.appendChild(node('td', null, fmtSigned(R.samples[i].sun.clearDeg)));
        tr.appendChild(node('td', null, fmtSigned(R.samples[i].earth.clearDeg)));
      });
      body.appendChild(tr);
    }
  }

  /* ---------- sources ---------- */

  function renderSources() {
    var list = document.getElementById('sources');
    var items = [
      ['NASA JPL Horizons System', 'https://ssd.jpl.nasa.gov/horizons/', 'the reference positions our tests compare against'],
      ['Astronomy Engine 2.1.19 by Don Cross (MIT license)', 'https://github.com/cosinekitty/astronomy', 'Sun, Earth, and Moon positions and the Moon’s rotation'],
      ['NASA Planetary Data System, LOLA Gridded Data Records, polar grids at 240 m', 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/', 'the skyline at sites near the poles, from the Lunar Orbiter Laser Altimeter on the Lunar Reconnaissance Orbiter'],
      ['NASA Scientific Visualization Studio, CGI Moon Kit', 'https://svs.gsfc.nasa.gov/4720/', 'the 3D Moon’s colour map (LROC wide-angle camera) and heights (LOLA laser altimeter), both from the Lunar Reconnaissance Orbiter']
    ];
    var seen = {};
    SITES.forEach(function (s) {
      // A source already in the list above is not repeated for a site.
      if (items.some(function (it) { return it[1] === s.sourceUrl && !Array.isArray(it[2]); })) return;
      if (seen[s.sourceUrl]) { seen[s.sourceUrl].push(s.name); return; }
      seen[s.sourceUrl] = [s.name];
      items.push([s.sourceName, s.sourceUrl, seen[s.sourceUrl]]);
    });
    items.forEach(function (it) {
      var li = node('li');
      var a = node('a', null, it[0]);
      a.href = it[1];
      a.target = '_blank';
      a.rel = 'noopener';
      li.appendChild(a);
      var what = Array.isArray(it[2]) ? 'coordinates for ' + it[2].join(', ') : it[2];
      li.appendChild(document.createTextNode(': ' + what + '.'));
      list.appendChild(li);
    });
  }

  /* ---------- link state ---------- */

  function writeHash(A, B, days) {
    function part(R) {
      var s = R.scn.site;
      return [s.latDeg, s.lonEastDeg, s.elevationKm, R.scn.siteId].join(',');
    }
    var same = $(fieldsets.b, '[name=sameTime]').checked;
    var hash = 'a=' + part(A) + '&ta=' + toInputValue(A.scn.startMs) +
      '&b=' + part(B) + '&tb=' + (same ? 'same' : toInputValue(B.scn.startMs)) + '&w=' + days +
      (horizonMode() === 'flat' ? '&h=flat' : '');
    try { history.replaceState(null, '', '#' + hash); } catch (e) { /* file:// in some browsers */ }
  }

  function readHash() {
    var out = {};
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) out[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    return out;
  }

  function setScenario(key, spec, time) {
    var fs = fieldsets[key];
    var parts = (spec || '').split(',');
    var site = siteById(parts[3]);
    $(fs, '[name=site]').value = site ? site.id : 'custom';
    if (parts.length >= 2 && isFinite(parseFloat(parts[0])) && isFinite(parseFloat(parts[1]))) {
      $(fs, '[name=lat]').value = parseFloat(parts[0]);
      $(fs, '[name=lon]').value = parseFloat(parts[1]);
      $(fs, '[name=elev]').value = isFinite(parseFloat(parts[2])) ? parseFloat(parts[2]) : 0;
    } else if (site) {
      applySite(fs, site.id);
    }
    if (time && isFinite(parseInputValue(time))) $(fs, '[name=time]').value = time.slice(0, 16);
    showSource(fs);
    reconcileSite(fs);
  }

  /* Starting state: from the link if it carries one, otherwise IM-1 against IM-2, now. */
  function applyLink() {
    var h = readHash();
    var g = (h.g || '').split(',').map(parseFloat);
    linkView = g.length === 3 && g.every(isFinite) ? g : null;
    var nowValue = toInputValue(Date.now());
    $(fieldsets.a, '[name=time]').value = nowValue;
    $(fieldsets.b, '[name=time]').value = nowValue;
    setScenario('a', h.a || ',,,im1', h.ta);
    setScenario('b', h.b || ',,,im2', h.tb === 'same' ? null : h.tb);
    $(fieldsets.b, '[name=sameTime]').checked = !h.tb || h.tb === 'same';
    var radio = form.querySelector('[name=window][value="' + (parseInt(h.w, 10) || 30) + '"]');
    if (radio) radio.checked = true;
    form.querySelector('[name=horizon][value="' + (h.h === 'flat' ? 'flat' : 'terrain') + '"]').checked = true;
  }

  /* ---------- main update ---------- */

  function update() {
    var a = readScenario('a');
    var b = readScenario('b');
    if (!a || !b) return;
    var days = windowDays();
    var A = compute(a, days);
    var B = compute(b, days);
    // Each site gets the tightest scale that fits it. Polar sites live within a
    // few degrees of the horizon and would flatten to nothing on a 90-degree axis.
    [A, B].forEach(function (R) {
      // The skyline's highest point counts too, so a crater wall fits in the picture.
      R.scale = Charts.elevationScale(Math.max(R.sun.reach, R.earth.reach, R.sky.mask ? R.sky.high.deg : 0));
    });
    results = { a: A, b: B, windowDays: days };
    var waiting = A.sky.kind === 'loading' || B.sky.kind === 'loading';
    var lost = A.sky.kind === 'missing' || B.sky.kind === 'missing';
    var status = document.getElementById('terrain-status');
    status.hidden = !waiting && !lost;
    status.textContent = waiting ? 'Loading the LOLA terrain grid. The horizon is flat until it arrives.'
      : lost ? 'The terrain data did not load, so the horizon is flat.' : '';
    document.getElementById('scale-note').hidden = A.scale.max === B.scale.max;
    document.getElementById('verdict-note').hidden = a.startMs === b.startMs;

    document.getElementById('head-a').textContent = a.name;
    document.getElementById('head-b').textContent = b.name + (b.startMs !== a.startMs ? ', ' + fmtUtc(b.startMs, true) : '');
    renderVerdict(A, B, days);
    renderMetrics(A, B, days);
    renderCharts();
    renderSamples(A, B);
    renderSunBars();
    writeHash(A, B, days);
    // Turn the globe when it has not been aimed yet, or when a site has gone round the back.
    var wasFramed = framed;
    if (globe && (!framed ||
        !globe.isVisible(a.site.latDeg, a.site.lonEastDeg) || !globe.isVisible(b.site.latDeg, b.site.lonEastDeg))) {
      frameSites(framed);
      if (!wasFramed && linkView) globe.lookAt(linkView[0], linkView[1], linkView[2], false);
    }
  }

  var pending = null;
  function scheduleUpdate() {
    clearTimeout(pending);
    pending = setTimeout(update, 120);
  }

  function init() {
    ['a', 'b'].forEach(function (key) {
      var fs = fieldsets[key];
      fillSiteOptions($(fs, '[name=site]'));
      $(fs, '[name=site]').addEventListener('change', function (e) {
        applySite(fs, e.target.value);
        scheduleUpdate();
      });
      ['lat', 'lon', 'elev'].forEach(function (name) {
        $(fs, '[name=' + name + ']').addEventListener('input', function () {
          reconcileSite(fs);
          scheduleUpdate();
        });
      });
      $(fs, '[name=time]').addEventListener('input', scheduleUpdate);
      wireChart(key);
    });

    $(fieldsets.a, '[data-action=now]').addEventListener('click', function () {
      $(fieldsets.a, '[name=time]').value = toInputValue(Date.now());
      update();
    });
    $(fieldsets.a, '[data-action=landing]').addEventListener('click', function () {
      var site = siteById($(fieldsets.a, '[name=site]').value);
      if (site && site.landedUtc) {
        $(fieldsets.a, '[name=time]').value = site.landedUtc;
        update();
      }
    });
    $(fieldsets.b, '[name=sameTime]').addEventListener('change', update);
    form.querySelectorAll('[name=window], [name=horizon]').forEach(function (r) { r.addEventListener('change', update); });

    document.getElementById('copy-link').addEventListener('click', function () {
      var status = document.getElementById('copied');
      function done(ok) {
        status.textContent = ok ? 'Copied.' : 'Copy the address from the browser bar.';
        setTimeout(function () { status.textContent = ''; }, 2500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });

    applyLink();
    // A link pasted into a tab that already shows the page changes only the part after the #.
    window.addEventListener('hashchange', function () {
      setPlaying(false);
      cursorIndex = 0;
      framed = false;
      applyLink();
      update();
    });

    // A case link changes the part after the #, which the listener above picks
    // up. The answer is at the top of the page, so go there.
    document.querySelectorAll('[data-case]').forEach(function (a) {
      a.addEventListener('click', function () {
        var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
      });
    });

    playButton.addEventListener('click', function () { setPlaying(!playing); });
    scrub.max = SAMPLES;
    scrub.addEventListener('input', function () {
      setPlaying(false);
      setCursor(parseInt(scrub.value, 10));
    });

    renderSources();
    update();
    loadMoon();

    var resizeTimer = null;
    var lastWidth = document.documentElement.clientWidth;
    window.addEventListener('resize', function () {
      var w = document.documentElement.clientWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderCharts, 150);
    });
  }

  init();
})();
