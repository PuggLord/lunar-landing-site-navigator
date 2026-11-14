# Use of SI (AI) tools

The Space Apps site calls AI tools "SI". The Project Submission Guide asks
teams to say where and how they were used, and to label generated code in text
and metadata. This file is the running log.

## Tools

| Tool | Used for |
| --- | --- |
| Claude Code (Anthropic, model Claude Fable 5.2) | Writing code, tests, and documentation under the team's direction; reading the official Space Apps pages and guides; querying NASA JPL Horizons for reference data; downloading and converting NASA's Moon maps; looking at published websites for design reference and redesigning the page |
| Firecrawl (web page capture service) | Taking screenshots and reading the fonts and colours of the reference websites listed in SOURCES.md. No text or image from those sites is in the project |

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
- Nothing generated uses NASA logos, flags, or mission identifiers.

## Log

| When (US Central) | What the tool did | Files |
| --- | --- | --- |
| Sat Nov 14, 10:01-10:07 | Wrote the Sun/Earth sky calculation, the Horizons download script, and the tests. Ran the comparison and reported the errors. | `src/lunar-sky.js`, `tools/fetch_horizons.py`, `test/lunar-sky.test.js` |
| Sat Nov 14, 10:07 | Wrote the first README and this log. | `README.md`, `SI_USE.md`, `SOURCES.md` |
| Sat Nov 14, 10:07-10:22 | Read the NASA and LROC pages for site coordinates. Wrote the comparison page: form, verdict sentences, numbers table, horizon view, timeline, visibility bars. Chose the visual design. Took screenshots to check the layout. | `index.html`, `css/style.css`, `src/sites.js`, `src/charts.js`, `src/app.js` |

| Sat Nov 14, 10:25-11:00 | Added the 3D Moon: wrote the script that converts NASA's colour and elevation maps, the WebGL globe, the sub-solar point calculation and its Horizons tests, the Play button and time slider. Moved the form beside the globe. Checked clicks, drag, zoom, and Play in a browser. | `src/globe.js`, `tools/build_moon_maps.py`, `tools/fetch_subpoints.py`, `src/lunar-sky.js`, `src/app.js`, `index.html`, `css/style.css`, `test/lunar-sky.test.js` |

| Sat Nov 14, 11:05-11:50 | Redesigned the page after the team said the first design looked machine-made. Captured three reference sites and noted their typefaces, colours, and layout. Rebuilt the page around them: the Moon fills the first screen, the answer is the headline, the form is a column on the right, the time slider carries Sun bars for both sites. Dropped the light theme. Chose and embedded the typeface. Loaded the Moon map after the numbers so the page shows sooner. Checked it with screenshots at four sizes, a scripted click and Play test, and a design checker. | `index.html`, `css/style.css`, `css/fonts.css`, `src/app.js`, `src/globe.js`, `tools/build_fonts_css.py`, `vendor/fonts/` |

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
