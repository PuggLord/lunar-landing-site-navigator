/*
 * globe.js
 * A 3D Moon drawn with WebGL: NASA imagery wrapped on a sphere, lit from the
 * real direction of the Sun, with markers that sit on real coordinates.
 *
 * SI disclosure: this file was written with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. See SI_USE.md.
 *
 * What the picture is, and is not:
 *   - Colour comes from the LROC WAC mosaic, height from LOLA, both through
 *     NASA's CGI Moon Kit (see vendor/moon-maps.js).
 *   - Each point is shaded by the angle between the Sun and the local ground
 *     slope. Slopes are exaggerated (RELIEF_EXAGGERATION) so craters read at
 *     this size.
 *   - Nothing casts a shadow on anything else. A crater floor that a rim would
 *     hide from the Sun still shows as lit here.
 *   - The night side is drawn very faintly instead of black, so places stay
 *     findable.
 *   - The view is from far away with no perspective. Longitude is east-positive.
 *
 * The canvas fills its host. The page marks where the Moon sits with a second
 * element, the slot: at zoom 1 the disk fills the slot, and zooming grows the
 * disk past it, across the whole host.
 */
(function (root) {
  'use strict';

  var DEG = Math.PI / 180;
  var RELIEF_EXAGGERATION = 3;
  var MIN_ZOOM = 1;
  var MAX_ZOOM = 6;

  var VERTEX = '#version 300 es\nin vec2 corner;\nvoid main() { gl_Position = vec4(corner, 0.0, 1.0); }';

  var FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uCenter;',      // centre of the disk, device pixels
    'uniform float uRadius;',     // radius of the disk, device pixels
    'uniform vec3 uRight, uUp, uFwd;',  // screen axes written in the Moon-fixed frame
    'uniform vec3 uSun;',         // direction to the Sun, Moon-fixed frame
    'uniform sampler2D uColor, uRelief;',
    'uniform float uColorRows, uReliefRows, uSlopeMax, uExaggeration;',
    'out vec4 outColor;',
    'const float PI = 3.141592653589793;',
    'void main() {',
    '  vec2 q = (gl_FragCoord.xy - uCenter) / uRadius;',
    '  float d = length(q);',
    '  float px = 1.0 / uRadius;',
    '  if (d > 1.0 + px) { outColor = vec4(0.0); return; }',
    '  float cover = clamp((1.0 - d) / px + 0.5, 0.0, 1.0);',
    '  if (d > 1.0) q /= d;',
    '  float z = sqrt(max(1.0 - dot(q, q), 0.0));',
    '  vec3 n = normalize(q.x * uRight + q.y * uUp + z * uFwd);',
    '  float lat = asin(clamp(n.z, -1.0, 1.0));',
    '  float lon = atan(n.y, n.x);',
    // Both maps are centred on 0 degrees longitude with north at the top.
    '  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);',
    // How much of the Moon one screen pixel covers, in radians. Picks the map detail level.
    '  float foot = px / max(z, 0.18);',
    '  vec3 albedo = pow(textureLod(uColor, uv, max(log2(foot * uColorRows / PI), 0.0)).rgb, vec3(2.2));',
    '  vec3 relief = textureLod(uRelief, uv, max(log2(foot * uReliefRows / PI), 0.0)).rgb;',
    '  vec2 slope = (relief.rg - 0.5) * 2.0 * uSlopeMax * uExaggeration;',
    '  vec3 east = vec3(-n.y, n.x, 0.0) / max(length(n.xy), 1e-4);',
    '  vec3 north = cross(n, east);',
    '  vec3 ground = normalize(n - slope.x * east - slope.y * north);',
    '  float day = smoothstep(-0.012, 0.03, dot(n, uSun));',
    '  float lit = max(dot(ground, uSun), 0.0) * day;',
    '  vec3 c = albedo * (0.03 + 1.7 * pow(lit, 0.7));',
    '  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));',
    // Latitude and longitude lines every 30 degrees.
    '  float cell = PI / 6.0;',
    '  float toLat = abs(fract(lat / cell + 0.5) - 0.5) * cell;',
    '  float toLon = abs(fract(lon / cell + 0.5) - 0.5) * cell * cos(lat);',
    '  float line = 1.0 - smoothstep(0.5 * foot, 1.5 * foot, min(toLat, toLon));',
    '  c = mix(c, vec3(0.84, 0.86, 0.9), line * 0.11);',
    '  outColor = vec4(c * cover, cover);',
    '}'
  ].join('\n');

  function unit(latDeg, lonDeg) {
    var lat = latDeg * DEG, lon = lonDeg * DEG;
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  }

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  function wrapDeg(lon) {
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    return lon;
  }

  /*
   * host: an element with a size. maps: window.MoonMaps.
   * options.slot: an element inside the host that the disk fills at zoom 1.
   * Without it the disk fills the host.
   * Returns null when the browser has no WebGL 2.
   */
  function create(host, maps, options) {
    var slot = (options && options.slot) || null;
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl || !maps) return null;

    var layer = document.createElement('div');
    layer.className = 'globe-markers';
    host.appendChild(canvas);
    host.appendChild(layer);

    var view = { lat: 0, lon: 0, zoom: 1 };
    var sun = [1, 0, 0];
    var markers = [];
    var frame = { w: 0, h: 0, cx: 0, cy: 0, base: 0 };  // CSS pixels, relative to the host
    var dpr = 1;
    var program = null;
    var uniforms = {};
    var images = {};
    var heights = null;       // 2D canvas context holding the relief map, for height lookups
    var frameRequested = false;
    var flight = null;
    var api = { onPick: null, reliefExaggeration: RELIEF_EXAGGERATION };

    function compile(type, source) {
      var s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }

    function upload(slot, img) {
      var limit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      var source = img;
      if (img.width > limit) {
        source = document.createElement('canvas');
        source.width = limit;
        source.height = Math.round(img.height * limit / img.width);
        source.getContext('2d').drawImage(img, 0, 0, source.width, source.height);
      }
      gl.activeTexture(gl.TEXTURE0 + slot);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return source.height;
    }

    function setup() {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      ['uCenter', 'uRadius', 'uRight', 'uUp', 'uFwd', 'uSun', 'uColor', 'uRelief',
        'uColorRows', 'uReliefRows', 'uSlopeMax', 'uExaggeration'].forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, name);
      });
      // One triangle that covers the whole canvas.
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var corner = gl.getAttribLocation(program, 'corner');
      gl.enableVertexAttribArray(corner);
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(uniforms.uColor, 0);
      gl.uniform1i(uniforms.uRelief, 1);
      gl.uniform1f(uniforms.uSlopeMax, maps.slopeMax);
      gl.uniform1f(uniforms.uExaggeration, RELIEF_EXAGGERATION);
      if (images.color) gl.uniform1f(uniforms.uColorRows, upload(0, images.color));
      if (images.relief) gl.uniform1f(uniforms.uReliefRows, upload(1, images.relief));
    }

    function load(name, slot, rowsUniform) {
      var img = new Image();
      img.onload = function () {
        images[name] = img;
        gl.uniform1f(uniforms[rowsUniform], upload(slot, img));
        if (name === 'relief') {
          var c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          heights = c.getContext('2d', { willReadFrequently: true });
          heights.drawImage(img, 0, 0);
        }
        if (images.color && images.relief) host.classList.add('is-ready');
        draw();
      };
      img.src = maps[name];
    }

    /* Screen axes for the current view. The view looks straight down at (lat, lon), north up. */
    function axes() {
      var lat = view.lat * DEG, lon = view.lon * DEG;
      return {
        fwd: unit(view.lat, view.lon),
        right: [-Math.sin(lon), Math.cos(lon), 0],
        up: [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)]
      };
    }

    function radiusCss() { return frame.base * view.zoom; }

    function resize() {
      var box = host.getBoundingClientRect();
      var w = Math.max(1, Math.round(box.width));
      var h = Math.max(1, Math.round(box.height || box.width));
      var s = slot ? slot.getBoundingClientRect() : box;
      if (!s.width || !s.height) s = box;
      var next = {
        w: w,
        h: h,
        cx: s.left - box.left + s.width / 2,
        cy: s.top - box.top + s.height / 2,
        base: Math.max(1, Math.min(s.width, s.height) / 2)
      };
      // At most two device pixels per CSS pixel, and about four million pixels
      // in all, so a large screen stays smooth.
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      ratio = Math.max(0.75, Math.min(ratio, Math.sqrt(4e6 / (w * h))));
      if (next.w === frame.w && next.h === frame.h && next.cx === frame.cx &&
          next.cy === frame.cy && next.base === frame.base && ratio === dpr) return;
      frame = next;
      dpr = ratio;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw();
    }

    function placeMarkers(ax) {
      var r = radiusCss();
      var pairs = { site: [], body: [] };
      markers.forEach(function (m) {
        var p = unit(m.latDeg, m.lonEastDeg);
        var depth = dot(p, ax.fwd);
        var x = frame.cx + dot(p, ax.right) * r;
        var y = frame.cy - dot(p, ax.up) * r;
        var shown = depth > 0.03 && x > -20 && x < frame.w + 20 && y > -20 && y < frame.h + 20;
        m.el.hidden = !shown;
        m.x = x;
        m.shown = shown;
        if (shown) m.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        pairs[m.kind === 'site' ? 'site' : 'body'].push(m);
      });
      // The two site labels open away from each other so they never stack.
      // The same goes for the Sun and Earth labels, which sit close at full Moon.
      [pairs.site, pairs.body].forEach(function (pair) {
        if (pair.length !== 2) return;
        var leftFirst = pair[0].x <= pair[1].x;
        pair[0].el.classList.toggle('label-left', leftFirst);
        pair[1].el.classList.toggle('label-left', !leftFirst);
      });
    }

    function render() {
      frameRequested = false;
      if (!frame.w) return;
      var ax = axes();
      placeMarkers(ax);
      if (!images.color || !images.relief || gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // WebGL counts rows from the bottom of the canvas.
      gl.uniform2f(uniforms.uCenter, frame.cx * dpr, canvas.height - frame.cy * dpr);
      gl.uniform1f(uniforms.uRadius, radiusCss() * dpr);
      gl.uniform3fv(uniforms.uRight, ax.right);
      gl.uniform3fv(uniforms.uUp, ax.up);
      gl.uniform3fv(uniforms.uFwd, ax.fwd);
      gl.uniform3fv(uniforms.uSun, sun);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function draw() {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(render);
    }

    /* Screen position (CSS pixels inside the host) to a place on the Moon, or null off the disk. */
    function placeAt(x, y) {
      var r = radiusCss();
      var qx = (x - frame.cx) / r;
      var qy = -(y - frame.cy) / r;
      var d2 = qx * qx + qy * qy;
      if (d2 > 1) return null;
      var z = Math.sqrt(1 - d2);
      var ax = axes();
      var n = [
        qx * ax.right[0] + qy * ax.up[0] + z * ax.fwd[0],
        qx * ax.right[1] + qy * ax.up[1] + z * ax.fwd[1],
        qx * ax.right[2] + qy * ax.up[2] + z * ax.fwd[2]
      ];
      var lat = Math.asin(Math.max(-1, Math.min(1, n[2]))) / DEG;
      var lon = Math.atan2(n[1], n[0]) / DEG;
      return { latDeg: lat, lonEastDeg: lon, heightKm: heightAt(lat, lon) };
    }

    /* Height above the 1737.4 km sphere from the LOLA grid, or null before the map loads. */
    function heightAt(latDeg, lonEastDeg) {
      if (!heights) return null;
      var w = heights.canvas.width, h = heights.canvas.height;
      var col = Math.floor(((wrapDeg(lonEastDeg) + 180) / 360) * w) % w;
      var row = Math.min(h - 1, Math.max(0, Math.floor(((90 - latDeg) / 180) * h)));
      var blue = heights.getImageData(col, row, 1, 1).data[2];
      var range = maps.elevationRangeKm;
      return range[0] + (blue / 255) * (range[1] - range[0]);
    }

    function setView(lat, lon, zoom) {
      view.lat = Math.max(-90, Math.min(90, lat));
      view.lon = wrapDeg(lon);
      view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      draw();
    }

    function lookAt(lat, lon, zoom, animate) {
      var target = { lat: lat, lon: wrapDeg(lon), zoom: zoom || view.zoom };
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (animate === false || still) {
        flight = null;
        setView(target.lat, target.lon, target.zoom);
        return;
      }
      var from = { lat: view.lat, lon: view.lon, zoom: view.zoom };
      var turn = wrapDeg(target.lon - from.lon);
      var started = performance.now();
      var mine = flight = {};
      function step(now) {
        if (flight !== mine) return;
        var t = Math.min(1, (now - started) / 700);
        var e = 1 - Math.pow(1 - t, 4);
        setView(from.lat + (target.lat - from.lat) * e, from.lon + turn * e,
          from.zoom * Math.pow(target.zoom / from.zoom, e));
        if (t < 1) requestAnimationFrame(step); else flight = null;
      }
      requestAnimationFrame(step);
    }

    function isVisible(latDeg, lonEastDeg) {
      return dot(unit(latDeg, lonEastDeg), axes().fwd) > 0.2;
    }

    /* list: [{ kind: 'site' | 'sun' | 'earth', label, latDeg, lonEastDeg }] */
    function setMarkers(list) {
      while (markers.length > list.length) layer.removeChild(markers.pop().el);
      list.forEach(function (item, i) {
        var m = markers[i];
        if (!m) {
          m = { el: document.createElement('div') };
          m.el.appendChild(document.createElement('i'));
          m.el.appendChild(document.createElement('span'));
          layer.appendChild(m.el);
          markers.push(m);
        }
        if (m.kind !== item.kind) {
          m.el.className = 'globe-marker globe-marker-' + item.kind;
        }
        if (m.label !== item.label) m.el.lastChild.textContent = item.label;
        m.kind = item.kind;
        m.label = item.label;
        m.latDeg = item.latDeg;
        m.lonEastDeg = item.lonEastDeg;
      });
      draw();
    }

    /* ---------- pointer and keyboard ---------- */

    var drag = null;

    function local(e) {
      var box = host.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    }

    host.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('button')) return;
      var p = local(e);
      drag = { id: e.pointerId, x: p.x, y: p.y, startX: p.x, startY: p.y, moved: 0, t: performance.now() };
      flight = null;
      host.setPointerCapture(e.pointerId);
      host.classList.add('is-dragging');
    });
    host.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = local(e);
      var perPixel = 1 / (radiusCss() * DEG);
      drag.moved = Math.max(drag.moved, Math.abs(p.x - drag.startX) + Math.abs(p.y - drag.startY));
      setView(view.lat + (p.y - drag.y) * perPixel, view.lon - (p.x - drag.x) * perPixel, view.zoom);
      drag.x = p.x;
      drag.y = p.y;
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var wasClick = e.type === 'pointerup' && drag.moved < 5 && performance.now() - drag.t < 600;
      var p = local(e);
      drag = null;
      host.classList.remove('is-dragging');
      if (wasClick && api.onPick) {
        var place = placeAt(p.x, p.y);
        if (place) api.onPick(place);
      }
    }
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);

    // Pinch on a trackpad arrives as ctrl + wheel. A plain wheel keeps scrolling the page.
    host.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setView(view.lat, view.lon, view.zoom * Math.exp(-e.deltaY * 0.01));
    }, { passive: false });

    host.addEventListener('keydown', function (e) {
      if (e.target !== host) return;
      var turn = 6 / view.zoom;
      if (e.key === 'ArrowLeft') setView(view.lat, view.lon - turn, view.zoom);
      else if (e.key === 'ArrowRight') setView(view.lat, view.lon + turn, view.zoom);
      else if (e.key === 'ArrowUp') setView(view.lat + turn, view.lon, view.zoom);
      else if (e.key === 'ArrowDown') setView(view.lat - turn, view.lon, view.zoom);
      else if (e.key === '+' || e.key === '=') setView(view.lat, view.lon, view.zoom * 1.4);
      else if (e.key === '-' || e.key === '_') setView(view.lat, view.lon, view.zoom / 1.4);
      else return;
      e.preventDefault();
    });

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
    canvas.addEventListener('webglcontextrestored', function () { setup(); draw(); });

    setup();
    load('color', 0, 'uColorRows');
    load('relief', 1, 'uReliefRows');
    if (window.ResizeObserver) {
      var watcher = new ResizeObserver(resize);
      watcher.observe(host);
      if (slot) watcher.observe(slot);
    }
    window.addEventListener('resize', resize);
    resize();

    api.setSun = function (direction) { sun = direction; draw(); };
    api.setMarkers = setMarkers;
    api.lookAt = lookAt;
    api.zoomBy = function (factor) { lookAt(view.lat, view.lon, Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom * factor))); };
    api.isVisible = isVisible;
    api.heightAt = heightAt;
    api.view = function () { return { lat: view.lat, lon: view.lon, zoom: view.zoom }; };
    return api;
  }

  root.LunarGlobe = { create: create, RELIEF_EXAGGERATION: RELIEF_EXAGGERATION };
})(window);
