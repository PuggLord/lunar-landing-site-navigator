# Use of SI (AI) tools

The Space Apps site calls AI tools "SI". The Project Submission Guide asks
teams to say where and how they were used, and to label generated code in text
and metadata. This file is the running log.

## Tools

| Tool | Used for |
| --- | --- |
| Claude Code (Anthropic, model Claude Fable 5.2) | Writing code, tests, and documentation under the team's direction; reading the official Space Apps pages and guides; querying NASA JPL Horizons for reference data |

## Where the idea came from

The concept is the team's: a visitor picks a lunar landing site and a time and
sees the Sun and Earth positions, whether each is above the horizon, and a
timeline of sunlight and Earth visibility. Site and date comparison comes from
the challenge statement.

## How generated code is labeled

- Every AI-written source file starts with an "SI disclosure" comment.
- Commits made with the tool carry a `Co-Authored-By: Claude` trailer.
- No AI-generated images, video, or audio are in the project so far. If any
  are added they carry a visible watermark.
- Nothing generated uses NASA logos, flags, or mission identifiers.

## Log

| When (US Central) | What the tool did | Files |
| --- | --- | --- |
| Sat Nov 14, 10:00-10:45 | Wrote the Sun/Earth sky calculation, the Horizons download script, and the tests. Ran the comparison and reported the errors. | `src/lunar-sky.js`, `tools/fetch_horizons.py`, `test/lunar-sky.test.js` |
| Sat Nov 14, 10:45 | Wrote the first README and this log. | `README.md`, `SI_USE.md`, `SOURCES.md` |
| Sat Nov 14, 10:50-12:00 | Read the NASA and LROC pages for site coordinates. Wrote the comparison page: form, verdict sentences, numbers table, horizon view, timeline, visibility bars. Chose the visual design. Took screenshots to check the layout. | `index.html`, `css/style.css`, `src/sites.js`, `src/charts.js`, `src/app.js` |

## Not written by AI

- `vendor/astronomy.browser.js`: Astronomy Engine by Don Cross, MIT license.
- `reference/horizons/*.json`: numbers returned by NASA JPL Horizons. The
  script only reformats them.
