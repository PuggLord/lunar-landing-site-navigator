/*
 * Records the read-along video: the tool on screen, with the script in a band
 * underneath and an underline that moves from word to word at reading pace.
 * The team plays it, reads along out loud, and records their voices.
 *
 * It drives the real page and the real slides in a headless Chromium browser,
 * saves a picture each time the screen changes, and joins them with ffmpeg.
 * Nothing in the video is drawn by an image or video model: every frame is a
 * screenshot. The video has no sound until the team adds theirs.
 *
 * SI disclosure: this script was written with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. See SI_USE.md.
 *
 * Needs Node.js 22 or newer, ffmpeg on the PATH, and a Chromium browser.
 *
 *     node tools/record_readalong.mjs                     the video and docs/READ_ALONG.md
 *     node tools/record_readalong.mjs --short             the 30-second version
 *     node tools/record_readalong.mjs --doc               only docs/READ_ALONG.md
 *     node tools/record_readalong.mjs --encode            join the pictures from the last run again
 *     node tools/record_readalong.mjs --stills 5,40 DIR   single frames at those seconds, for checking
 *
 * The words are in tools/readalong_script.mjs.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKS, SHORT_BLOCKS, READERS, SAY } from './readalong_script.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/* --short records the 30-second version, which fits the Space Apps limit for a video demo. */
const SHORT = process.argv.includes('--short');
const NAME = SHORT ? 'Lunar-Landing-Site-Navigator-30s-read-along.mp4' : 'Lunar-Landing-Site-Navigator-read-along.mp4';
const OUT = join(ROOT, 'demo', NAME);
const DOC = join(ROOT, 'docs', 'READ_ALONG.md');
const WORK = join(tmpdir(), SHORT ? 'llsn-readalong-30s' : 'llsn-readalong');
const FRAMES_DIR = join(WORK, 'frames');
const PORT = 8767;
const DEBUG_PORT = 9335;
const FPS = 30;
const VIEW = { width: 1600, height: 900, deviceScaleFactor: 1.2, mobile: false };

const TOOL = 'index.html';
const DECK = 'deck/index.html';
const CASE_MOVE = 'a=-80.13,1.44,2.579,im1&ta=2024-02-22T23:24&b=-84.78,29.13,0,im2&tb=same&w=90';
const CASE_LATE = 'a=-80.13,1.44,2.579,im1&ta=2024-02-22T23:24&b=-80.13,1.44,2.579,im1&tb=2024-03-07T23:24&w=30';
const CASE_RIM = 'a=-89.7786,-155.7256,1.735,shackleton-rim&ta=2024-02-22T23:24&b=-89.67,129.78,-2.786,shackleton-floor&tb=same&w=90';
/* The same two points on the day the sunlight map's year starts, with the map switched on and the globe turned to the south pole. */
const CASE_MAP = 'a=-89.7786,-155.7256,1.735,shackleton-rim&ta=2026-11-15T00:00&b=-89.67,129.78,-2.786,shackleton-floor&tb=same&w=90&m=1&g=-90,0,1.6';

const BROWSERS = [
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome'
];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- when each word is said ---------- */

const LEAD = 1.5;    // seconds of title before the first count-in
const DOT = 0.4;     // seconds per count-in dot, three dots before each reader
const TAIL = 0.8;    // seconds after a reader's last word
const END = 3.0;     // seconds on the closing card
const SHORT_LEAD = 0.3;
const SHORT_TAIL = 0.5;
const SHORT_END = 1.5;
const LIMIT = 30;    // the Space Apps limit for a video demo, in seconds

function syllables(raw) {
  const w = raw.replace(/[,.;:?!]+$/, '');
  if (SAY[w] != null) return SAY[w];
  if (/^\d/.test(w)) return Math.max(1, Math.round(w.replace(/\D/g, '').length * 1.5));
  if (/^[A-Z]{2,}$/.test(w)) return w.length;
  const s = w.toLowerCase().replace(/'s$/, '').replace(/[^a-z]/g, '');
  let n = (s.match(/[aeiouy]+/g) || []).length;
  if (n > 1 && /[^aeioul]e$/.test(s)) n--;
  if (n > 1 && /[^aeioutd]ed$/.test(s)) n--;
  return Math.max(1, n);
}
const wordSeconds = (w) => 0.14 + 0.155 * syllables(w);
const pauseAfter = (w, endOfLine) => (/[.?!]$/.test(w) ? 0.4 : /[,;:]$/.test(w) ? 0.18 : endOfLine ? 0.06 : 0);

function buildTimeline(source, lead, tail, end) {
  let t = 0;
  let count = 0;
  const blocks = source.map((block, b) => {
    const k = { who: block.who, scene: block.scene, t0: t };
    if (b === 0) t += lead;
    k.count0 = t;
    t += 3 * DOT;
    k.speak0 = t;
    k.lines = block.lines.map((text) => {
      const words = text.split(' ');
      const line = { text, t, words: [] };
      words.forEach((w, i) => {
        line.words.push({ t });
        t += wordSeconds(w) + pauseAfter(w, i === words.length - 1);
        count++;
      });
      return line;
    });
    k.speakEnd = t;
    t += tail;
    k.t1 = t;
    return k;
  });
  return { blocks, total: t + end, words: count };
}

/* What is on screen at time t: which block, what the caption shows, and where the reader is in the block. */
function locate(tl, t) {
  const b = tl.blocks.findIndex((k) => t < k.t1);
  if (b < 0) return { b: tl.blocks.length, scene: 'end', cap: null, c: { speak: 0, D: 1, line: 0, on: false, L: () => 0 } };
  const k = tl.blocks[b];
  let cap;
  if (t < k.speak0) {
    cap = { b, line: 0, word: -1, dots: t < k.count0 ? 0 : Math.min(3, Math.floor((t - k.count0) / DOT + 1e-6) + 1) };
  } else if (t >= k.speakEnd) {
    cap = { b, line: k.lines.length - 1, word: k.lines[k.lines.length - 1].words.length };
  } else {
    let line = 0;
    while (line + 1 < k.lines.length && k.lines[line + 1].t <= t) line++;
    let word = 0;
    while (word + 1 < k.lines[line].words.length && k.lines[line].words[word + 1].t <= t) word++;
    cap = { b, line, word };
  }
  const c = {
    speak: t - k.speak0,                 // seconds since this reader's first word, negative in the count-in
    D: k.speakEnd - k.speak0,            // how long this reader speaks
    line: cap.line,
    on: t >= k.speak0,
    L: (i) => k.lines[i].t - k.speak0    // when line i starts
  };
  return { b, scene: k.scene, cap, c };
}

const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function writeDoc(tl, short) {
  const out = [];
  out.push('<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->');
  out.push('<!-- Made by tools/record_readalong.mjs from tools/readalong_script.mjs. Edit the script there and run it again. -->');
  out.push('');
  out.push('# Read-along video');
  out.push('');
  out.push(`\`demo/Lunar-Landing-Site-Navigator-read-along.mp4\` shows the tool with our script in a band under it. It runs ${clock(tl.total)} and has no sound. We play it, read the script out loud as the underline moves, and record our voices. With the voices added it becomes the long version of our demo.`);
  out.push('');
  out.push('## How to record');
  out.push('');
  out.push('1. Read the script below once, and change any line that is not how you would say it. The words are in `tools/readalong_script.mjs`, and the video can be made again after a change.');
  out.push('2. Sit together with one phone between you. Start a voice recording on the phone first.');
  out.push('3. Play the video from the start and leave it running. Do not pause it, because the pauses would put the voices out of step with the picture.');
  out.push('4. Three dots fill before each turn. Start on the first word when it gets its underline, and say each word as the underline reaches it. Words turn grey once they are said, and the next line waits underneath.');
  out.push('5. If someone slips, keep going and finish the take. Then record the whole thing again and keep the better take.');
  out.push('6. Send the audio file to the teammate who runs the recorder.');
  out.push('');
  out.push('## Adding the voices');
  out.push('');
  out.push(`The first word starts at ${tl.blocks[0].speak0.toFixed(1)} seconds. Trim the recording so its first word lands there, then join the two files:`);
  out.push('');
  out.push('```');
  out.push('ffmpeg -i demo/Lunar-Landing-Site-Navigator-read-along.mp4 -i voice.m4a -map 0:v -map 1:a -c:v copy -c:a aac -shortest demo/Lunar-Landing-Site-Navigator-narrated.mp4');
  out.push('```');
  out.push('');
  out.push('## The script');
  out.push('');
  out.push(`${tl.words} words, about ${Math.round(tl.words / ((tl.total - END) / 60))} words a minute with the pauses counted. The time beside each turn is when its first word starts.`);
  tl.blocks.forEach((k) => {
    out.push('');
    out.push(`**${READERS[k.who]}, ${clock(k.speak0)}** (${SCENE_NOTES[k.scene]})`);
    out.push('');
    k.lines.forEach((line) => out.push(line.text + '  '));
  });
  out.push('');
  out.push('## The 30-second version');
  out.push('');
  out.push(`\`demo/Lunar-Landing-Site-Navigator-30s-read-along.mp4\` works the same way and runs ${short.total.toFixed(1)} seconds, so with our voices added it fits the Space Apps limit for a video demo. This is the one we submit. Its first word starts at ${short.blocks[0].speak0.toFixed(1)} seconds. It has ${short.words} words, and there is no room to slow down, so practise it once before recording.`);
  out.push('');
  out.push('To add the voices, trim the recording the same way and run:');
  out.push('');
  out.push('```');
  out.push('ffmpeg -i demo/Lunar-Landing-Site-Navigator-30s-read-along.mp4 -i voice.m4a -map 0:v -map 1:a -c:v copy -c:a aac -shortest demo/Lunar-Landing-Site-Navigator-30s-narrated.mp4');
  out.push('```');
  out.push('');
  out.push('Then check the length. It has to be 30 seconds or less:');
  out.push('');
  out.push('```');
  out.push('ffprobe -v error -show_entries format=duration -of csv=p=0 demo/Lunar-Landing-Site-Navigator-30s-narrated.mp4');
  out.push('```');
  short.blocks.forEach((k) => {
    out.push('');
    out.push(`**${READERS[k.who]}, ${clock(k.speak0)}** (${SCENE_NOTES[k.scene]})`);
    out.push('');
    k.lines.forEach((line) => out.push(line.text + '  '));
  });
  out.push('');
  mkdirSync(dirname(DOC), { recursive: true });
  writeFileSync(DOC, out.join('\n').replace(/ {2}\n\n/g, '\n\n'));
  console.log(`wrote ${DOC}`);
}

/* ---------- what the tool does during each turn ---------- */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/* The time slider moves 15 times a second, which halves the pictures to take. */
const sweep = (c, t0, t1, from = 0, to = 720) =>
  Math.round(from + (to - from) * clamp01((Math.floor(c.speak * 15 + 1e-6) / 15 - t0) / (t1 - t0)));
/* The sunlight map comes in over `seconds`, in 15 steps a second like the slider. */
const fadeIn = (c, t0, seconds) => Number(clamp01((Math.floor(c.speak * 15 + 1e-6) / 15 - t0) / seconds).toFixed(3));
/* The globe moves in on the south pole, from zoom z0 to z1, in the same 15 steps a second. */
const dive = (c, t0, seconds, z0, z1) =>
  Number((z0 * Math.pow(z1 / z0, ease(clamp01((Math.floor(c.speak * 15 + 1e-6) / 15 - t0) / seconds)))).toFixed(3));
const glide = (c, t0, seconds, y0, y1) => Math.round(y0 + (y1 - y0) * ease(clamp01((c.speak - t0) / seconds)));

/* These run in the stage page. */
const topOf = (sel, lift) => Math.round(stage.doc().querySelector(sel).getBoundingClientRect().top + stage.win().scrollY - lift);
const pageEnd = () => stage.doc().documentElement.scrollHeight - 720;
const slide = (i, title) => {
  const d = stage.doc();
  d.documentElement.style.scrollSnapType = 'none';
  d.querySelectorAll('.frame')[i].scrollIntoView();
  if (title === 'plain') d.querySelector('.title .chrome').style.visibility = 'hidden';
  if (title === 'credit') {
    const note = d.querySelector('.title .chrome span');
    note.textContent = 'Screenshots of the live tool, joined by a script written with an AI coding tool';
    note.style.cssText = 'font-weight:400;font-stretch:100%;color:#878c96';
    d.querySelector('.title .chrome').style.visibility = 'visible';
    d.querySelector('.title .credit').style.visibility = 'hidden';
    d.querySelector('.title .moon').style.transform = 'none';
  }
};

const SCENE_NOTES = {
  title: 'the title',
  compare: 'the first screen, IM-1 against the planned IM-2 site',
  play: 'the Moon, with the 90 days running',
  charts: 'the view from each site',
  shackleton: 'Shackleton crater, then the numbers table',
  late: 'IM-1 on landing day and two weeks later',
  energy: 'the numbers table',
  checks: 'the slide with our checks',
  short1: 'the first screen, IM-1 against the planned IM-2 site, with the 90 days running',
  short2: 'Shackleton crater, then the numbers table',
  map: 'the south pole, with our sunlight map',
  shortmap: 'the south pole, with our sunlight map',
  limits: 'the notes under the charts, then the foot of the page',
  close: 'the last slide'
};

/*
 * The south pole with the sunlight map. The globe moves in during the lines
 * before `fade`, the map fades in on line `fade`, site A
 * moves to the sunniest point on line `pick`, and `marks` says what to outline
 * on each line.
 */
function mapScene(fade, pick, marks) {
  return {
    enter: async (x) => { await x.open(TOOL, CASE_MAP, 'tool', 6000); },
    state: (c) => ({
      scroll: 0, scrub: 0, view: [-90, 0, dive(c, 0, c.L(fade) - 0.2, 1.6, 8)],
      mapMix: fadeIn(c, c.L(fade) - 0.3, 1.2),
      spot: c.on && c.line >= pick ? 1 : 0,
      marks: c.on && marks[c.line] ? [marks[c.line]] : []
    })
  };
}
const MARK_SCALE = { sel: '.sunmap-scale' };
const MARK_POINT = { sel: '#sunmap-spots button:first-child' };
const MARK_MATCH = { sel: '#sunmap-match' };
const MARK_RESULT = { sel: '#verdict' };

const SCENES = {
  title: {
    enter: async (x) => { await x.open(DECK, '', 'deck', 1500); await x.run(slide, 0, 'plain'); },
    state: (c) => ({ zoom: Number((1 + 0.03 * clamp01(Math.floor((c.speak + 3) * 5) / 5 / (c.D + 4))).toFixed(5)) })
  },
  compare: {
    enter: async (x) => { await x.open(TOOL, CASE_MOVE, 'tool', 6000); },
    state: (c) => ({
      scroll: 0, scrub: 0,
      marks: !c.on ? [] : c.line <= 1 ? [{ sel: '#setup .scenario' }]
        : c.line === 2 ? [{ sel: '.scenario[data-scenario=a]' }]
        : c.line === 3 ? [{ sel: '.scenario[data-scenario=b]' }]
        : [{ sel: '#verdict' }]
    })
  },
  play: {
    enter: async (x) => {
      await x.open(TOOL, CASE_MOVE, 'tool', 6000);
      x.vars.play = Math.max(0, await x.run(topOf, '.transport', 620));
    },
    state: (c, v) => ({
      scroll: glide(c, c.L(3) - 0.9, 0.8, 0, v.play), scrub: sweep(c, c.L(3), c.D),
      marks: c.on && (c.line === 4 || c.line === 5) ? [{ sel: '.scrubber' }] : []
    })
  },
  charts: {
    enter: async (x) => {
      await x.open(TOOL, CASE_MOVE, 'tool', 6000);
      x.vars.from = Math.max(0, await x.run(topOf, '.transport', 620));
      x.vars.charts = await x.run(topOf, '.charts', -60);
      x.vars.pair = await x.run(topOf, '.chart-pair', 24);
    },
    state: (c, v) => ({
      scroll: c.speak < c.L(5) - 0.9 ? glide(c, -0.9, 1.0, v.from, v.charts) : glide(c, c.L(5) - 0.9, 0.8, v.charts, v.pair),
      scrub: sweep(c, c.L(1), c.D),
      marks: !c.on ? [] : c.line >= 2 && c.line <= 4 ? [{ sel: '[data-role=panorama]' }]
        : c.line >= 5 ? [{ sel: '[data-role=timeline]' }] : []
    })
  },
  shackleton: {
    enter: async (x) => {
      await x.open(TOOL, CASE_RIM, 'tool', 6000);
      x.vars.charts = await x.run(topOf, '.charts', -60);
      x.vars.row = await x.run(topOf, '#numbers-h', 60);
    },
    state: (c, v) => ({
      scroll: glide(c, c.L(3) - 0.8, 0.8, v.charts, v.row), scrub: sweep(c, 0, c.L(3) - 1),
      horizon: c.on && c.line >= 5 ? 'flat' : 'terrain',
      marks: c.on && c.line >= 3 ? [{ row: 'Sunlight in' }] : []
    })
  },
  late: {
    enter: async (x) => { await x.open(TOOL, CASE_LATE, 'tool', 6000); },
    state: (c) => ({
      scroll: 0, scrub: sweep(c, c.L(1), c.D),
      marks: c.on && c.line >= 2 ? [{ sel: '#verdict' }] : []
    })
  },
  energy: {
    enter: async (x) => {
      await x.open(TOOL, CASE_MOVE, 'tool', 6000);
      x.vars.row = await x.run(topOf, '#numbers-h', 60);
    },
    state: (c, v) => ({
      scroll: v.row, scrub: 0,
      marks: !c.on || c.line === 0 ? [] : c.line <= 2 ? [{ row: 'Solar energy in' }] : [{ row: 'Longest time without the Sun' }]
    })
  },
  checks: {
    enter: async (x) => { await x.open(DECK, '', 'deck', 1500); await x.run(slide, 5); },
    state: () => ({})
  },
  limits: {
    enter: async (x) => {
      await x.open(TOOL, CASE_MOVE, 'tool', 6000);
      x.vars.notes = await x.run(topOf, '#notes-h', 50);
      x.vars.end = await x.run(pageEnd);
    },
    state: (c, v) => ({
      scroll: glide(c, c.L(3) - 0.8, 0.8, v.notes, v.end), scrub: 0,
      marks: c.on && c.line >= 3 ? [{ sel: '.foot p', has: 'AI coding tool' }] : []
    })
  },
  close: {
    enter: async (x) => { await x.open(DECK, '', 'deck', 1500); await x.run(slide, 6); },
    state: () => ({})
  },
  short1: {
    enter: async (x) => {
      await x.open(TOOL, CASE_MOVE, 'tool', 6000);
      x.vars.play = Math.max(0, await x.run(topOf, '.transport', 620));
    },
    state: (c, v) => ({
      scroll: v.play, scrub: sweep(c, 0, c.D),
      marks: c.on && c.line >= 2 ? [{ sel: '#verdict' }] : []
    })
  },
  short2: {
    enter: async (x) => {
      await x.open(TOOL, CASE_RIM, 'tool', 6000);
      x.vars.charts = await x.run(topOf, '.charts', -60);
      x.vars.row = await x.run(topOf, '#numbers-h', 60);
    },
    state: (c, v) => ({
      scroll: glide(c, c.L(1) - 0.8, 0.8, v.charts, v.row), scrub: sweep(c, -1.2, c.L(1) - 0.8),
      marks: !c.on ? [] : c.line === 0 ? [{ sel: '[data-role=panorama]' }] : [{ row: 'Sunlight in' }]
    })
  },
  map: mapScene(1, 7, { 3: MARK_SCALE, 4: MARK_POINT, 5: MARK_MATCH, 6: MARK_MATCH, 7: MARK_RESULT }),
  shortmap: mapScene(1, 2, { 2: MARK_POINT, 3: MARK_MATCH }),
  end: {
    enter: async (x) => { await x.open(DECK, '', 'deck', 1500); await x.run(slide, 0, 'credit'); },
    state: () => ({})
  }
};

/* ---------- the browser ---------- */

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
  const args = process.argv.slice(2).filter((a) => a !== '--short');
  const long = buildTimeline(BLOCKS, LEAD, TAIL, END);
  const short = buildTimeline(SHORT_BLOCKS, SHORT_LEAD, SHORT_TAIL, SHORT_END);
  const tl = SHORT ? short : long;
  if (short.total > LIMIT) throw new Error(`The short script runs ${short.total.toFixed(1)} s. Cut words to get under ${LIMIT}.`);
  const spoken = tl.blocks.reduce((sum, k) => sum + k.speakEnd - k.speak0, 0);
  console.log(`${tl.words} words, ${clock(tl.total)} (${tl.total.toFixed(1)} s), ${Math.round(tl.words / spoken * 60)} words a minute while speaking`);
  writeDoc(long, short);
  if (args[0] === '--doc') return;
  const stills = args[0] === '--stills' ? args[1].split(',').map(Number) : null;
  const stillsDir = stills ? resolve(args[2]) : null;

  const frameCount = Math.round(tl.total * FPS);
  if (args[0] === '--encode') { encode(frameCount); return; }

  const browser = BROWSERS.find((b) => existsSync(b));
  if (!browser) throw new Error('No Chromium browser found.');
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(FRAMES_DIR, { recursive: true });
  mkdirSync(dirname(OUT), { recursive: true });
  if (stillsDir) mkdirSync(stillsDir, { recursive: true });

  const server = await serve();
  const child = spawn(browser, [
    '--headless=new', '--no-first-run', '--hide-scrollbars',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    `--user-data-dir=${join(WORK, 'profile')}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--window-size=${VIEW.width},${VIEW.height}`, 'about:blank'
  ], { stdio: 'ignore' });

  let shots = 0;
  try {
    const cdp = await connect();
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', VIEW);

    const run = async (fn, ...args2) => {
      const r = await cdp.send('Runtime.evaluate', {
        expression: `(${fn})(${args2.map((a) => JSON.stringify(a)).join(',')})`,
        awaitPromise: true, returnByValue: true
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/tools/readalong.html` });
    await loaded;
    await sleep(600);
    await run((blocks, readers) => { stage.setScript(blocks, readers); }, SHORT ? SHORT_BLOCKS : BLOCKS, READERS);

    const x = {
      vars: {},
      run,
      open: (page, hash, mode, settle) => run((p, h, m, s) => stage.open(p, h, m, s), page, hash, mode, settle)
    };
    const shoot = async (file) => {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      shots++;
    };
    const show = async (at) => {
      const st = SCENES[at.scene].state(at.c, x.vars);
      st.cap = at.cap;
      return st;
    };

    if (stills) {
      for (const t of stills) {
        const at = locate(tl, t);
        await SCENES[at.scene].enter(x);
        await run((s) => stage.apply(s), await show(at));
        await shoot(join(stillsDir, `t_${String(Math.round(t * 10)).padStart(5, '0')}.jpg`));
        console.log(`still at ${t} s: ${at.scene}`);
      }
    } else {
      let scene = -1;
      let lastKey = null;
      let lastFile = null;
      for (let f = 0; f < frameCount; f++) {
        const at = locate(tl, f / FPS);
        if (at.b !== scene) {
          await SCENES[at.scene].enter(x);
          scene = at.b;
          lastKey = null;
          console.log(`${clock(f / FPS)} ${at.scene}, ${shots} pictures so far`);
        }
        const st = await show(at);
        const key = JSON.stringify(st);
        const file = join(FRAMES_DIR, `f_${String(f).padStart(5, '0')}.jpg`);
        if (key === lastKey) {
          try { linkSync(lastFile, file); } catch (e) { copyFileSync(lastFile, file); }
        } else {
          await run((s) => stage.apply(s), st);
          await shoot(file);
          lastKey = key;
          lastFile = file;
        }
      }
    }
    cdp.close();
  } finally {
    child.kill();
    server.close();
  }
  if (stills) return;

  console.log(`${frameCount} frames from ${shots} pictures, ${(frameCount / FPS).toFixed(1)} s`);
  encode(frameCount);
}

function encode(frameCount) {
  if (!existsSync(join(FRAMES_DIR, `f_${String(frameCount - 1).padStart(5, '0')}.jpg`))) throw new Error('The pictures are incomplete. Record again.');
  const made = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS),
    '-i', join(FRAMES_DIR, 'f_%05d.jpg'), '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  if (made.status !== 0) throw new Error('ffmpeg failed.');
  console.log(`wrote ${OUT}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
