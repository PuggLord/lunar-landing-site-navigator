/*
 * charts.js
 * SVG drawing for the horizon panorama, the elevation timeline, and the
 * visibility strips. No chart library.
 *
 * SI disclosure: this file was written with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. See SI_USE.md.
 */
(function (root) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DAY_MS = 86400000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function el(name, attrs, text) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (text != null) node.textContent = text;
    return node;
  }

  function svgRoot(host, width, height, label) {
    host.textContent = '';
    var svg = el('svg', { viewBox: '0 0 ' + width + ' ' + height, width: width, height: height, role: 'img' });
    svg.setAttribute('aria-label', label);
    host.appendChild(svg);
    return svg;
  }

  function widthOf(host) {
    return Math.max(280, Math.round(host.clientWidth || 520));
  }

  function fmtDeg(v) {
    var r = Math.round(v);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '°';
  }

  function dayLabel(ms) {
    var d = new Date(ms);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }

  /* A symmetric elevation scale that both scenarios share. */
  function elevationScale(maxAbs) {
    var steps = [[10, 5], [20, 10], [30, 15], [45, 15], [60, 30], [90, 30]];
    for (var i = 0; i < steps.length; i++) {
      if (maxAbs <= steps[i][0] * 0.94) return { max: steps[i][0], tick: steps[i][1] };
    }
    return { max: 90, tick: 30 };
  }

  function dayTickStep(windowDays) {
    if (windowDays <= 3) return 1;
    if (windowDays <= 14) return 2;
    if (windowDays <= 30) return 5;
    return 15;
  }

  /* ownGround: the caller draws the ground itself, so leave out the flat one. */
  function drawElevationAxis(svg, box, scale, ownGround) {
    function y(v) { return box.top + (scale.max - v) / (2 * scale.max) * box.height; }
    svg.appendChild(el('rect', { class: 'frame', x: box.left, y: box.top, width: box.width, height: box.height }));
    if (!ownGround) {
      svg.appendChild(el('rect', { class: 'ground', x: box.left, y: y(0), width: box.width, height: box.top + box.height - y(0) }));
    }
    for (var v = -scale.max; v <= scale.max + 0.001; v += scale.tick) {
      if (Math.abs(v) > 0.001) {
        svg.appendChild(el('line', { class: 'grid', x1: box.left, x2: box.left + box.width, y1: y(v), y2: y(v) }));
      }
      svg.appendChild(el('text', { x: box.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, fmtDeg(v)));
    }
    if (!ownGround) {
      svg.appendChild(el('line', { class: 'horizon', x1: box.left, x2: box.left + box.width, y1: y(0), y2: y(0) }));
    }
    return y;
  }

  /* ---------- timeline ---------- */

  /*
   * model: { samples, startMs, windowDays, scale, zeroLabel }
   * Heights are clearDeg: height above the horizon in use, flat or terrain.
   * zeroLabel names the zero line, 'horizon' or 'skyline'.
   * Returns { setCursor(index), indexAt(clientX) }.
   */
  function timeline(host, model) {
    var W = widthOf(host);
    var H = 230;
    var box = { left: 44, top: 10, width: W - 44 - 58, height: H - 10 - 28 };
    var zero = model.zeroLabel || 'horizon';
    var svg = svgRoot(host, W, H, 'Height of the Sun and Earth above the ' + zero + ' over ' + model.windowDays + ' days');
    var y = drawElevationAxis(svg, box, model.scale);
    var spanMs = model.windowDays * DAY_MS;
    function x(ms) { return box.left + (ms - model.startMs) / spanMs * box.width; }

    // Day ticks at UTC midnights.
    var step = dayTickStep(model.windowDays);
    var first = Math.ceil(model.startMs / DAY_MS) * DAY_MS;
    var lastLabelX = -1e9;
    for (var t = first; t <= model.startMs + spanMs; t += step * DAY_MS) {
      var tx = x(t);
      svg.appendChild(el('line', { class: 'axis', x1: tx, x2: tx, y1: box.top + box.height, y2: box.top + box.height + 5 }));
      if (tx - lastLabelX > 46 && tx < box.left + box.width - 14) {
        svg.appendChild(el('text', { x: tx, y: box.top + box.height + 19, 'text-anchor': 'middle' }, dayLabel(t)));
        lastLabelX = tx;
      }
    }

    ['earth', 'sun'].forEach(function (body) {
      var d = '';
      for (var i = 0; i < model.samples.length; i++) {
        var s = model.samples[i];
        d += (i ? 'L' : 'M') + x(s.ms).toFixed(1) + ' ' + y(s[body].clearDeg).toFixed(1);
      }
      svg.appendChild(el('path', { class: 'line ' + body, d: d }));
    });

    // Direct labels at the right end, only when the two lines end far enough apart.
    var last = model.samples[model.samples.length - 1];
    var ySun = y(last.sun.clearDeg);
    var yEarth = y(last.earth.clearDeg);
    var yZero = y(0);
    var clear = Math.abs(ySun - yEarth) >= 14 && Math.abs(ySun - yZero) >= 14 && Math.abs(yEarth - yZero) >= 14;
    if (clear) {
      svg.appendChild(el('text', { class: 'label', x: box.left + box.width + 6, y: ySun + 4 }, 'Sun'));
      svg.appendChild(el('text', { class: 'label', x: box.left + box.width + 6, y: yEarth + 4 }, 'Earth'));
    }
    svg.appendChild(el('text', { class: 'label-2', x: box.left + box.width + 6, y: yZero + 4 }, zero));

    var cursor = el('line', { class: 'cursor', y1: box.top, y2: box.top + box.height, x1: -10, x2: -10 });
    var dotEarth = el('circle', { class: 'marker earth', r: 5, cx: -10, cy: -10 });
    var dotSun = el('circle', { class: 'marker sun', r: 5, cx: -10, cy: -10 });
    svg.appendChild(cursor);
    svg.appendChild(dotEarth);
    svg.appendChild(dotSun);

    function setCursor(index) {
      var s = model.samples[index];
      var cx = x(s.ms);
      cursor.setAttribute('x1', cx);
      cursor.setAttribute('x2', cx);
      dotSun.setAttribute('cx', cx);
      dotSun.setAttribute('cy', y(s.sun.clearDeg));
      dotEarth.setAttribute('cx', cx);
      dotEarth.setAttribute('cy', y(s.earth.clearDeg));
    }

    function indexAt(clientX) {
      var rect = svg.getBoundingClientRect();
      var px = (clientX - rect.left) / rect.width * W;
      var frac = (px - box.left) / box.width;
      frac = Math.min(1, Math.max(0, frac));
      return Math.round(frac * (model.samples.length - 1));
    }

    return { setCursor: setCursor, indexAt: indexAt, box: box, width: W };
  }

  /* ---------- panorama ---------- */

  /*
   * model: { samples, scale, centerAz, skyline }
   * centerAz is 0 (north) or 180 (south). skyline is a function from compass
   * direction to the height of the ground there, in degrees, or null for a
   * flat horizon. Heights here are true heights, so the Sun and Earth paths
   * pass behind the ground where a ridge stands higher than they do.
   * Returns { setCursor(index) }.
   */
  function panorama(host, model) {
    var W = widthOf(host);
    var H = 190;
    var box = { left: 44, top: 10, width: W - 44 - 58, height: H - 10 - 26 };
    var svg = svgRoot(host, W, H, 'Compass direction and height of the Sun and Earth as seen from the site');
    var sky = model.skyline || null;
    var y = drawElevationAxis(svg, box, model.scale, !!sky);
    var c = model.centerAz;
    function rel(az) { return ((az - c + 540) % 360) - 180; } // -180..180 around the centre
    function x(az) { return box.left + (rel(az) + 180) / 360 * box.width; }

    var names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (var k = -4; k <= 4; k++) {
      var az = (c + k * 45 + 360) % 360;
      var tx = box.left + (k + 4) / 8 * box.width;
      var major = k % 2 === 0;
      svg.appendChild(el('line', { class: 'axis', x1: tx, x2: tx, y1: box.top + box.height, y2: box.top + box.height + (major ? 6 : 3) }));
      if (major || box.width > 420) {
        svg.appendChild(el('text', { class: major ? 'label-2' : '', x: tx, y: box.top + box.height + 19, 'text-anchor': 'middle' }, names[Math.round(az / 45) % 8]));
      }
    }

    ['earth', 'sun'].forEach(function (body) {
      var d = '';
      var prev = null;
      for (var i = 0; i < model.samples.length; i++) {
        var s = model.samples[i][body];
        var px = x(s.azimuthDeg);
        var jump = prev !== null && Math.abs(px - prev) > box.width / 2;
        d += (i === 0 || jump ? 'M' : 'L') + px.toFixed(1) + ' ' + y(s.elevationDeg).toFixed(1);
        prev = px;
      }
      svg.appendChild(el('path', { class: 'path ' + body, d: d }));
    });

    // The ground goes over the paths, so a path behind a ridge drops out of sight.
    if (sky) {
      var bottom = box.top + box.height;
      var edge = '';
      for (var a = -180; a <= 180; a += 0.5) {
        var py = Math.min(bottom, Math.max(box.top, y(sky(c + a))));
        edge += (edge ? 'L' : 'M') + (box.left + (a + 180) / 360 * box.width).toFixed(1) + ' ' + py.toFixed(1);
      }
      svg.appendChild(el('path', {
        class: 'terrain',
        d: edge + 'L' + (box.left + box.width) + ' ' + bottom + 'L' + box.left + ' ' + bottom + 'Z'
      }));
      svg.appendChild(el('path', { class: 'skyline', d: edge }));
    }

    var marks = {};
    ['earth', 'sun'].forEach(function (body) {
      var g = el('g', {});
      var dot = el('circle', { class: 'marker ' + body, r: 6 });
      var text = el('text', { class: 'label' }, body === 'sun' ? 'Sun' : 'Earth');
      g.appendChild(dot);
      g.appendChild(text);
      svg.appendChild(g);
      marks[body] = { dot: dot, text: text };
    });

    function setCursor(index) {
      var s = model.samples[index];
      var pos = {};
      ['sun', 'earth'].forEach(function (body) {
        pos[body] = { x: x(s[body].azimuthDeg), y: y(s[body].elevationDeg) };
        marks[body].dot.setAttribute('cx', pos[body].x);
        marks[body].dot.setAttribute('cy', pos[body].y);
        // A body behind the ground is drawn as an empty ring.
        var up = (typeof s[body].clearDeg === 'number' ? s[body].clearDeg : s[body].elevationDeg) > 0;
        marks[body].dot.setAttribute('class', 'marker ' + body + (up ? '' : ' behind'));
        marks[body].text.setAttribute('class', up ? 'label' : 'label-2');
      });
      // Keep the two labels from sitting on each other: one above, one below when close.
      var close = Math.abs(pos.sun.x - pos.earth.x) < 46 && Math.abs(pos.sun.y - pos.earth.y) < 16;
      ['sun', 'earth'].forEach(function (body) {
        var p = pos[body];
        var right = p.x < box.left + box.width - 50;
        var dy = 4;
        if (close) dy = (body === 'sun') === (pos.sun.y <= pos.earth.y) ? -9 : 17;
        marks[body].text.setAttribute('x', p.x + (right ? 10 : -10));
        marks[body].text.setAttribute('y', p.y + dy);
        marks[body].text.setAttribute('text-anchor', right ? 'start' : 'end');
      });
    }

    return { setCursor: setCursor };
  }

  /* ---------- visibility strips ---------- */

  /* Intervals where a test holds, with crossings interpolated between samples. */
  function intervals(samples, test) {
    var out = [];
    var open = null;
    for (var i = 0; i < samples.length; i++) {
      var v = test(samples[i]);
      if (i === 0) {
        if (v > 0) open = samples[0].ms;
        continue;
      }
      var p = test(samples[i - 1]);
      if ((p > 0) !== (v > 0)) {
        var cross = samples[i - 1].ms + (samples[i].ms - samples[i - 1].ms) * (p / (p - v));
        if (v > 0) open = cross;
        else { out.push([open, cross]); open = null; }
      }
    }
    if (open !== null) out.push([open, samples[samples.length - 1].ms]);
    return out;
  }

  function hoursIn(list) {
    var total = 0;
    for (var i = 0; i < list.length; i++) total += list[i][1] - list[i][0];
    return total / 3600000;
  }

  function visibility(samples) {
    var sun = intervals(samples, function (s) { return s.sun.clearDeg; });
    var earth = intervals(samples, function (s) { return s.earth.clearDeg; });
    var both = intervals(samples, function (s) { return Math.min(s.sun.clearDeg, s.earth.clearDeg); });
    return {
      sun: sun, earth: earth, both: both,
      sunHours: hoursIn(sun), earthHours: hoursIn(earth), bothHours: hoursIn(both)
    };
  }

  /* model: { vis, startMs, windowDays }  Aligned with the timeline's plot area. */
  function strips(host, model) {
    var W = widthOf(host);
    var rows = [['Sun up', 'sun'], ['Earth up', 'earth'], ['Both', 'both']];
    var rowH = 18;
    var H = rows.length * rowH + 4;
    var box = { left: 44, width: W - 44 - 58 };
    var svg = svgRoot(host, W, H, 'Bars showing when the Sun, the Earth, and both are above the horizon');
    var spanMs = model.windowDays * DAY_MS;
    rows.forEach(function (row, i) {
      var cy = i * rowH + 4;
      svg.appendChild(el('rect', { class: 'track', x: box.left, y: cy + 3, width: box.width, height: 8, rx: 4 }));
      model.vis[row[1]].forEach(function (iv) {
        var x0 = box.left + (iv[0] - model.startMs) / spanMs * box.width;
        var x1 = box.left + (iv[1] - model.startMs) / spanMs * box.width;
        var w = Math.max(2, x1 - x0);
        svg.appendChild(el('rect', { class: 'bar-' + row[1], x: x0.toFixed(1), y: cy + 3, width: w.toFixed(1), height: 8, rx: Math.min(4, w / 2) }));
      });
      svg.appendChild(el('text', { x: box.left + box.width + 6, y: cy + 11, class: 'label-2' }, row[0]));
    });
  }

  root.LunarCharts = {
    timeline: timeline,
    panorama: panorama,
    strips: strips,
    visibility: visibility,
    elevationScale: elevationScale
  };
})(typeof self !== 'undefined' ? self : this);
