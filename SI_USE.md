# Use of SI (AI) tools

The Space Apps site calls AI tools "SI". The Project Submission Guide asks
teams to say where and how they were used, and to label generated code in text
and metadata. This file is the running log.

## Tools

| Tool | Used for |
| --- | --- |
| Claude Code (Anthropic, model Claude Fable 5.2) | Writing code, tests, and documentation under the team's direction; reading the official Space Apps pages and guides; querying NASA JPL Horizons for reference data; downloading and converting NASA's Moon maps and LOLA elevation grids; looking at published websites for design reference and redesigning the page. For the terrain work it ran three helper sessions of the same tool at once, one each for the data script, the skyline code and the documents, and then checked and joined their work |
| Firecrawl (web page capture service) | Taking screenshots and reading the fonts and colours of the reference websites listed in SOURCES.md, and reading past Space Apps project pages. Reading the Dallas event page, the NASA page on the IM-1 lander, one paper abstract, and the NASA page that lists the 5 m grids. No text or image from those sites is in the project beyond the short quotes in SOURCES.md |

## Where the idea came from

The concept is the team's: a visitor picks a lunar landing site and a time and
sees the Sun and Earth positions, whether each is above the horizon, and a
timeline of sunlight and Earth visibility. Site and date comparison comes from
the challenge statement.

## How generated code is labeled

- Every AI-written source file starts with an "SI disclosure" comment.
- Commits made with the tool carry a `Co-Authored-By: Claude` trailer.
- No AI-generated images, video, or audio are in the project so far. If any
  are added they carry a visible watermark. The 3D Moon is NASA imagery drawn
  by code; no image model made any part of it.
- The demo video is screenshots of the page and the slides, joined by a
  script the AI tool wrote. No video model made any frame. Its last card says
  so on screen.
- Nothing generated uses NASA logos, flags, or mission identifiers.

## Log

| When (US Central) | What the tool did | Files |
| --- | --- | --- |
| Sat Nov 14, 10:01-10:07 | Wrote the Sun/Earth sky calculation, the Horizons download script, and the tests. Ran the comparison and reported the errors. | `src/lunar-sky.js`, `tools/fetch_horizons.py`, `test/lunar-sky.test.js` |
| Sat Nov 14, 10:07 | Wrote the first README and this log. | `README.md`, `SI_USE.md`, `SOURCES.md` |
| Sat Nov 14, 10:07-10:22 | Read the NASA and LROC pages for site coordinates. Wrote the comparison page: form, verdict sentences, numbers table, horizon view, timeline, visibility bars. Chose the visual design. Took screenshots to check the layout. | `index.html`, `css/style.css`, `src/sites.js`, `src/charts.js`, `src/app.js` |

| Sat Nov 14, 10:25-11:00 | Added the 3D Moon: wrote the script that converts NASA's colour and elevation maps, the WebGL globe, the sub-solar point calculation and its Horizons tests, the Play button and time slider. Moved the form beside the globe. Checked clicks, drag, zoom, and Play in a browser. | `src/globe.js`, `tools/build_moon_maps.py`, `tools/fetch_subpoints.py`, `src/lunar-sky.js`, `src/app.js`, `index.html`, `css/style.css`, `test/lunar-sky.test.js` |

| Sat Nov 14, 11:05-11:50 | Redesigned the page after the team said the first design looked machine-made. Captured three reference sites and noted their typefaces, colours, and layout. Rebuilt the page around them: the Moon fills the first screen, the answer is the headline, the form is a column on the right, the time slider carries Sun bars for both sites. Dropped the light theme. Chose and embedded the typeface. Loaded the Moon map after the numbers so the page shows sooner. Checked it with screenshots at four sizes, a scripted click and Play test, and a design checker. | `index.html`, `css/style.css`, `css/fonts.css`, `src/app.js`, `src/globe.js`, `tools/build_fonts_css.py`, `vendor/fonts/` |

| Sat Nov 14, 11:50-12:02 | Read the past Space Apps winners a teammate sent (listed in SOURCES.md) to see what a finished project page, demo and write-up contain. Added the three one-click cases under the Moon, with numbers read from the tool. Made the headline easier to read over lit ground. Wrote the seven slides from screenshots of the page, the script that prints them to PDF, and first drafts of the eight submission fields. | `index.html`, `css/style.css`, `src/app.js`, `deck/`, `tools/build_deck_pdf.ps1`, `SUBMISSION.md`, `README.md`, `SOURCES.md` |

| Sat Nov 14, 12:02-12:08 | Wrote the script that records the demo video and ran it: 870 screenshots of the page and the slides, joined into 29 seconds. Tested that a click on a case loads it. | `tools/record_demo.mjs`, `demo/` |

| Sat Nov 14, 12:36-12:50 | The team asked where the project could lose and told the tool to fix those points. The tool listed five weaknesses, found NASA's LOLA polar grids, and wrote a plan the team approved. | none |
| Sat Nov 14, 12:50-13:10 | Added the terrain skyline and the power numbers. Wrote the script that downloads NASA's LOLA grids, checks their orientation and stores them; the skyline code; the energy and longest-gap calculations; 25 new tests. Wired them into the page: the Horizon control, the skyline drawn in the charts, new table rows, the Shackleton places and case. Recomputed every worked case and rewrote the page's notes. Drafted the three documents in `docs/`. | `tools/build_terrain.py`, `src/terrain.js`, `src/lunar-sky.js`, `src/app.js`, `src/charts.js`, `src/sites.js`, `index.html`, `css/style.css`, `test/terrain.test.js`, `test/power.test.js`, `vendor/site-horizons.js`, `vendor/lola-south.js`, `vendor/lola-north.js`, `reference/terrain/`, `docs/` |
| Sat Nov 14, 13:10-13:30 | Recounted the Horizons rows after a helper session found the earlier figure wrong: 852 time steps, not 1,032. Corrected it everywhere. Rebuilt the slides with new screenshots and a terrain slide, filled the documents with numbers read from the tool, rewrote the submission drafts, and recorded the video again. | `deck/`, `docs/`, `SUBMISSION.md`, `README.md`, `SOURCES.md`, `vendor/README.md`, `tools/record_demo.mjs`, `demo/` |

## Not written by AI

- `vendor/astronomy.browser.js`: Astronomy Engine by Don Cross, MIT license.
- `reference/horizons/*.json`, `reference/horizons-subpoints/*.json`: numbers
  returned by NASA JPL Horizons. The scripts only reformat them.
- `vendor/fonts/MonaSans-latin-variable.woff2`: the Mona Sans typeface by
  GitHub, SIL Open Font License 1.1. `css/fonts.css` is the same file stored
  as text.
- `vendor/moon-maps.js`: NASA imagery and elevation. The build script resizes
  the colour map, works out ground slopes from the elevation grid, and stores
  both as text.
- `vendor/lola-south.js`, `vendor/lola-north.js`: NASA LOLA elevation. The
  build script averages 4 by 4 blocks and stores the result as text.
- `vendor/site-horizons.js`, `reference/terrain/*.json`: numbers the build
  script computes from the same NASA elevation.
