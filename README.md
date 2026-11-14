# Lunar Landing Site Navigator

Team Ksig UNT, 2026 NASA Space Apps Challenge (Dallas), challenge
[Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/).
Built during the event, Nov 14-15, 2026.

Live page: https://pugglord.github.io/lunar-landing-site-navigator/

Pick a place on the Moon and a time. The tool tells you where the Sun and the
Earth sit in that sky, whether each is above the horizon, how long until it
sets, and how much solar energy arrives. Near the poles the horizon is the
real skyline, worked out from NASA's LOLA laser altimeter terrain.

Then it does the same for a second scenario and puts the two side by side:
another site on the same date, or the same site on another date. It says which
one loses the Sun or the Earth first, and by how long.

A 3D Moon shows both sites on NASA Lunar Reconnaissance Orbiter imagery, lit
from the Sun's real direction at the chosen time. Drag it to turn it, click it
to move a site, and press Play to watch the look-ahead period run: the day and
night line sweeps the globe while the charts follow.

## Open it

Use the live page above, or download the files and open `index.html` in a
browser. There is nothing to install and no server to start, and the
downloaded copy works with no network connection.

Under the Moon, "Start from a real case" lists four comparisons that load
with one click: a site moved 175 km, a landing two weeks late, the rim of
Shackleton crater against its floor, and the pole beside Apollo 11.

The address bar holds the whole comparison, so a copied link reopens the same
two scenarios. Add `&g=latitude,longitude,zoom` to the end of a link to aim the
globe, for example `&g=-90,0,1.6` for the south pole. `&h=flat` turns the
terrain skyline off.

The page has one dark theme. The Moon fills the first screen with the answer
written beside it, and two bars on the time slider show when the Sun is up at
each site.

The 3D Moon needs WebGL 2, which current browsers have. Without it the rest of
the page still works.

`thinking.html` is a second page, linked from the first. It explains the
choices behind the tool and follows one comparison from its inputs to the
sentence on screen.

## Run the tests

Needs Node.js 20 or newer. Nothing to install.

    node --test

There are 39 tests. The position tests compare our numbers with tables saved
from NASA JPL Horizons in `reference/horizons/`: six tables, 852 time steps,
at four places on the Moon. The largest difference found on 2026-11-14 was
0.0073 degrees, and with a flat horizon the sunset time at the IM-1 site
differs from Horizons by 4 seconds.

The terrain tests build made-up ground with a known answer (flat, a wall, a
bowl) and compare the browser's skyline code with a second calculation in
Python, saved in `reference/terrain/check-960m.json`. The two agree within
0.05 degrees over 2,160 directions. The energy tests check the sunlight sum
and the longest-gap search.

The point where the Sun is overhead lights the 3D Moon, so it is tested too:
278 time steps in `reference/horizons-subpoints/`, largest difference 0.0067
degrees.

To download the reference tables again (Python 3.11 or newer, no packages):

    python tools/fetch_horizons.py
    python tools/fetch_subpoints.py

To rebuild the Moon maps from NASA's files (needs Pillow and NumPy, downloads
about 15 MB):

    python tools/build_moon_maps.py

To rebuild the terrain files from NASA's LOLA grids (needs Pillow and NumPy,
downloads about 240 MB the first time, and needs the Moon maps download above
for its orientation check):

    python -I tools/build_terrain.py

## How it works, and questions a judge might ask

`docs/HOW_IT_WORKS.md` follows the calculation step by step, with each formula
and the function that runs it. `docs/FAQ.md` answers the questions we expect,
and `docs/PITCH.md` has a 60 second and a 3 minute script. The reasons for our
choices are on the site itself, in `thinking.html`.

## Slides and submission text

`deck/index.html` is the seven-slide demo. Open it in a browser and use the
arrow keys. `deck/Lunar-Landing-Site-Navigator.pdf` is the same deck, one
slide per page. To make the PDF again after an edit (Windows, needs Brave,
Chrome or Edge):

    powershell -File tools/build_deck_pdf.ps1

`demo/Lunar-Landing-Site-Navigator-demo.mp4` is a 29-second video of the
tool with no sound. Each frame is a screenshot of the page or the slides. To
record it again (needs Node.js 22 or newer, ffmpeg, and a Chromium browser;
takes about ten minutes):

    node tools/record_demo.mjs

The Space Apps demo is seven slides or a video of 30 seconds or less. Submit
one of the two.

`demo/Lunar-Landing-Site-Navigator-read-along.mp4` is a longer video, 3
minutes 56 seconds, for the team to narrate. It shows the tool with our script
in a band underneath, and an underline moves from word to word at reading
pace. `docs/READ_ALONG.md` has the script and the recording steps. It is too
long for the Demo field, so it would go in the project description or to the
Dallas organisers. The words are in `tools/readalong_script.mjs`. After a
change, record it again (about five minutes):

    node tools/record_readalong.mjs

`demo/Lunar-Landing-Site-Navigator-30s-read-along.mp4` is the same idea cut to
29.6 seconds, with one turn for each of two readers. With their voices added
it fits the Demo field. To record it again:

    node tools/record_readalong.mjs --short

`SUBMISSION.md` holds drafts of the eight fields on the Space Apps project
page.

## What the numbers mean

- Azimuth is measured clockwise from local north. Heights are for the centre
  of the Sun or Earth disk.
- Within 17 degrees of either pole, "up" means higher than the ground in that
  compass direction. The ground is NASA LOLA terrain out to 200 km, seen from
  2 m above the surface: a 240 m grid for the listed polar sites and a 960 m
  grid for any other polar point. Farther from the poles the horizon is flat.
- The grids smooth narrow ridges. At the IM-1 site the two grids give first
  sunsets 4 hours apart, and on a narrow peak the coarse one can understate
  sunlight by a quarter of the year.
- Solar energy is sunlight arriving on one square metre that faces the Sun,
  before a panel turns any of it into electricity. Panel angle and efficiency
  are left out.
- "Earth in view" is a line-of-sight test. Lander tilt and antenna pointing
  are not modelled.
- For the Sun and Earth geometry the Moon is a sphere of radius 1737.4 km, the
  same as Horizons.

- The 3D Moon is a picture, and the numbers do not come from it. It shades
  each point by its slope, drawn 3 times steeper than life, and nothing on it
  casts a shadow. The top of `src/globe.js` lists what it leaves out.

The full list of modelling choices is at the top of `src/lunar-sky.js`.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `css/style.css` | The page |
| `thinking.html` | "Our thinking": the choices behind the tool, and one comparison traced from inputs to answer |
| `css/fonts.css` | The typeface, Mona Sans, stored inside a stylesheet so the page needs no network. Made by `tools/build_fonts_css.py` |
| `src/lunar-sky.js` | Sun and Earth sky position, horizon crossings, timelines, solar energy, longest gaps |
| `src/terrain.js` | The skyline: reads the LOLA grid and finds the height of the ground in each compass direction |
| `src/sites.js` | The curated landing sites and reference places, each with its source |
| `src/charts.js` | The horizon view with its skyline, the timeline, and the visibility bars (plain SVG) |
| `src/globe.js` | The 3D Moon: a WebGL sphere with no library behind it |
| `src/app.js` | Reads the form, runs the calculation, writes the page |
| `test/` | 39 tests: positions against the Horizons tables, the skyline on made-up terrain and against the Python reference, energy and gaps |
| `tools/fetch_horizons.py`, `tools/fetch_subpoints.py` | Download the reference tables from NASA JPL Horizons |
| `tools/build_moon_maps.py` | Turns NASA's Moon colour and elevation files into `vendor/moon-maps.js` |
| `tools/build_terrain.py` | Downloads NASA's LOLA polar grids, checks their orientation, and writes the three terrain files in `vendor/` and the checks in `reference/terrain/` |
| `reference/horizons/`, `reference/horizons-subpoints/` | Saved Horizons answers, with the request URLs inside each file |
| `reference/terrain/` | The Python skylines the tests compare against, and the build report with every check |
| `vendor/astronomy.browser.js` | Astronomy Engine 2.1.19 (MIT), copied in so the page works offline |
| `vendor/moon-maps.js` | NASA LRO colour and elevation maps of the Moon, stored inside a script so the page can open straight from disk |
| `vendor/site-horizons.js` | Skylines of the four listed polar places from the 240 m LOLA grid |
| `vendor/lola-south.js`, `vendor/lola-north.js` | NASA LOLA polar elevation at 960 m, loaded only when a typed or clicked polar point needs a skyline |
| `docs/` | How the calculation works, questions and answers, and pitch scripts |
| `vendor/fonts/` | Mona Sans (GitHub, SIL Open Font License 1.1) and its license text |
| `deck/` | The seven-slide demo, its PDF, and the screenshots it uses |
| `tools/build_deck_pdf.ps1` | Prints the deck to PDF with a Chromium browser |
| `demo/` | The 29-second demo video, and the read-along video for the team to narrate |
| `tools/record_demo.mjs` | Records the video: drives the page in a headless browser and joins the screenshots with ffmpeg |
| `tools/record_readalong.mjs`, `tools/readalong.html`, `tools/readalong_script.mjs` | Record the read-along video: the recorder, the frame it draws in, and the script |
| `SUBMISSION.md` | Draft text for the Space Apps project page |

## Sources and credits

See [SOURCES.md](SOURCES.md). How AI tools were used is in [SI_USE.md](SI_USE.md).

## License

The team picks an OSI-approved license before submission. Astronomy Engine in
`vendor/` keeps its own MIT license, and Mona Sans in `vendor/fonts/` keeps the
SIL Open Font License.
