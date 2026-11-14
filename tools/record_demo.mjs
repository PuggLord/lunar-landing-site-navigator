/*
 * Records the demo video: 29 seconds, 1920 by 1080, no sound.
 *
 * It drives the real page and the real slides in a headless Chromium browser,
 * saves one picture per frame, and joins them with ffmpeg. Nothing in the
 * video is drawn by an image or video model: every frame is a screenshot.
 *
 * SI disclosure: this script was written with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. See SI_USE.md.
 *
 * Needs Node.js 22 or newer, ffmpeg on the PATH, and a Chromium browser.
 *
 *     node tools/record_demo.mjs [path\to\browser.exe]
 *
 * The Space Apps limit for a video demo is 30 seconds. FRAMES below adds up
 * to 870 at 30 a second, which is 29.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'demo', 'Lunar-Landing-Site-Navigator-demo.mp4');
const WORK = join(tmpdir(), 'llsn-demo');
const FRAMES_DIR = join(WORK, 'frames');
const PORT = 8766;
const DEBUG_PORT = 9334;
const FPS = 30;
const VIEW = { width: 1600, height: 900, deviceScaleFactor: 1.2, mobile: false };

const CASE_MOVE = 'a=-80.13,1.44,2.579,im1&ta=2024-02-22T23:24&b=-84.78,29.13,0,im2&tb=same&w=90';
const CASE_LATE = 'a=-80.13,1.44,2.579,im1&ta=2024-02-22T23:24&b=-80.13,1.44,2.579,im1&tb=2024-03-07T23:24&w=30';

const BROWSERS = [
  process.argv[2],
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome'
].filter(Boolean);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A file server for the project folder, so the page and the slides share one address. */
function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const file = join(ROOT, path.endsWith('\\') || path.endsWith('/') ? path + 'index.html' : path);
    if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(PORT, '127.0.0.1', () => ok(server)));
}

/* The smallest DevTools client that does the job. */
async function connect() {
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch (e) { /* the browser is still starting */ }
    if (!target) await sleep(250);
  }
  if (!target) throw new Error('The browser did not open a debugging port.');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let next = 1;
  const waiting = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) {
      const w = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) w.fail(new Error(msg.error.message)); else w.ok(msg.result);
    } else if (msg.method) {
      events.forEach((e) => { if (e.name === msg.method) e.ok(); });
    }
  };
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const id = next++;
    waiting.set(id, { ok, fail });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = (name) => new Promise((ok) => events.push({ name, ok }));
  return { send, once, close: () => ws.close() };
}

async function main() {
  const browser = BROWSERS.find((b) => existsSync(b));
  if (!browser) throw new Error('No Chromium browser found. Pass its path.');
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(FRAMES_DIR, { recursive: true });
  mkdirSync(dirname(OUT), { recursive: true });

  const server = await serve();
  const child = spawn(browser, [
    '--headless=new', '--no-first-run', '--hide-scrollbars',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    `--user-data-dir=${join(WORK, 'profile')}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--window-size=${VIEW.width},${VIEW.height}`, 'about:blank'
  ], { stdio: 'ignore' });

  let frame = 0;
  try {
    const cdp = await connect();
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', VIEW);

    const run = async (fn, ...args) => {
      const r = await cdp.send('Runtime.evaluate', {
        expression: `(${fn})(${args.map((a) => JSON.stringify(a)).join(',')})`,
        awaitPromise: true, returnByValue: true
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const open = async (path, settle) => {
      const loaded = cdp.once('Page.loadEventFired');
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${path}` });
      await loaded;
      await sleep(settle);
    };
    const shoot = async () => {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      writeFileSync(join(FRAMES_DIR, `f_${String(frame++).padStart(4, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
      if (frame % 60 === 0) console.log(`${frame} frames`);
    };
    const hold = async (n) => { for (let i = 0; i < n; i++) await shoot(); };
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    /* Runs in the page: put the time slider at one step and wait for the drawing to finish. */
    const setTime = async (i) => {
      const s = document.getElementById('scrub');
      s.value = i;
      s.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    };
    const sweep = async (n, from = 0, to = 720) => {
      for (let i = 0; i < n; i++) {
        await run(setTime, Math.round(from + (to - from) * (i / (n - 1))));
        await shoot();
      }
    };
    /* Runs in the page: a caption in the empty corner under the form. */
    const caption = (title, line) => {
      let c = document.getElementById('demo-caption');
      if (!c) {
        c = document.createElement('div');
        c.id = 'demo-caption';
        c.style.cssText = 'position:fixed;right:40px;bottom:38px;width:372px;z-index:9;padding-top:14px;' +
          'border-top:1px solid rgba(241,242,244,.26);color:#f1f2f4;pointer-events:none';
        document.body.appendChild(c);
      }
      c.style.display = title ? 'block' : 'none';
      c.innerHTML = '<div style="font:600 19px/1.25 \'Mona Sans\';font-stretch:112%;letter-spacing:-0.01em"></div>' +
        '<div style="margin-top:4px;font:400 14px/1.4 \'Mona Sans\';color:#b6bac2"></div>';
      c.children[0].textContent = title || '';
      c.children[1].textContent = line || '';
    };

    /* 1. Title: 2 s. */
    await open('deck/index.html', 1200);
    await run(() => { document.querySelector('.title .chrome').style.visibility = 'hidden'; });
    for (let i = 0; i < 60; i++) {
      await run((k) => {
        const m = document.querySelector('.title .moon');
        m.style.transformOrigin = '60% 60%';
        m.style.transform = `scale(${1 + 0.03 * k})`;
      }, i / 59);
      await shoot();
    }

    /* 2. Move the site 175 km: 9 s. */
    await open(`index.html#${CASE_MOVE}`, 5000);
    await run(caption, 'Move the site 175 km', 'IM-1 landing site against the planned IM-2 site, 90 days');
    await run(setTime, 0);
    await hold(24);
    await sweep(216);
    await hold(30);

    /* 3. The same case in the charts: 5.5 s. */
    await run(caption, '', '');
    const top = await run(() => document.querySelector('.charts').getBoundingClientRect().top + scrollY + 60);
    for (let i = 0; i < 30; i++) {
      await run((y) => { scrollTo(0, y); }, Math.round(top * ease(i / 29)));
      await shoot();
    }
    await run(setTime, 0);
    await hold(15);
    await sweep(105);
    await hold(15);

    /* 4. Land two weeks late: 7.5 s. */
    await run((h) => { scrollTo(0, 0); location.hash = h; }, CASE_LATE);
    await sleep(1500);
    await run(caption, 'Land two weeks late', 'The IM-1 site on its landing day and 14 days after');
    await run(setTime, 0);
    await hold(30);
    await sweep(165);
    await hold(30);

    /* 5. The checks, then the name: 3 s and 2 s. */
    await open('deck/index.html', 1200);
    await run(() => {
      document.documentElement.style.scrollSnapType = 'none';
      document.querySelectorAll('.frame')[5].scrollIntoView();
    });
    await sleep(300);
    await hold(90);
    await run(() => {
      document.querySelectorAll('.frame')[0].scrollIntoView();
      const note = document.querySelector('.title .chrome span');
      note.textContent = 'Screenshots of the live tool, joined by a script written with an AI coding tool';
      note.style.cssText = 'font-weight:400;font-stretch:100%;color:#878c96';
      document.querySelector('.title .credit').style.visibility = 'hidden';
    });
    await sleep(300);
    await hold(60);

    cdp.close();
  } finally {
    child.kill();
    server.close();
  }

  console.log(`${frame} frames, ${(frame / FPS).toFixed(1)} s`);
  if (frame / FPS > 30) throw new Error('Over 30 seconds. Cut frames before using this as the demo.');
  const made = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS),
    '-i', join(FRAMES_DIR, 'f_%04d.jpg'), '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  if (made.status !== 0) throw new Error('ffmpeg failed.');
  console.log(`wrote ${OUT}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
