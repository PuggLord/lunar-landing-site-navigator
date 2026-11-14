# Lunar Landing Site Navigator

Team Ksig UNT, 2026 NASA Space Apps Challenge (Dallas), challenge
[Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/).
Built during the event, Nov 14-15, 2026.

Pick a place on the Moon and a time. The tool tells you where the Sun and the
Earth sit in that sky, whether each is above the horizon, and how long until it
sets.

Then it does the same for a second scenario and puts the two side by side:
another site on the same date, or the same site on another date. It says which
one loses the Sun or the Earth first, and by how long.

A 3D Moon shows both sites on NASA Lunar Reconnaissance Orbiter imagery, lit
from the Sun's real direction at the chosen time. Drag it to turn it, click it
to move a site, and press Play to watch the look-ahead period run: the day and
night line sweeps the globe while the charts follow.

## Open it

Open `index.html` in a browser. There is nothing to install and no server to
start. It works with no network connection.

The address bar holds the whole comparison, so a copied link reopens the same
two scenarios. Add `?theme=light` or `?theme=dark` before the `#` to force a
colour theme. Add `&g=latitude,longitude,zoom` to the end of a link to aim the
globe, for example `&g=-90,0,1.6` for the south pole.

The 3D Moon needs WebGL 2, which every current browser has. Without it the
rest of the page still works.

## Run the tests

Needs Node.js 20 or newer. Nothing to install.

    node --test

The tests compare our numbers with tables saved from NASA JPL Horizons in
`reference/horizons/`. Six cases, 1,032 time steps, at four places on the Moon.
The largest difference found on 2026-11-14 was 0.0073 degrees, and the sunset
time at the IM-1 site differs from Horizons by 4 seconds.

The point where the Sun is overhead lights the 3D Moon, so it is tested too:
278 time steps in `reference/horizons-subpoints/`, largest difference 0.0067
degrees.

To download the reference tables again (Python 3.11 or newer, no packages):

    python tools/fetch_horizons.py
    python tools/fetch_subpoints.py

To rebuild the Moon maps from NASA's files (needs Pillow and NumPy, downloads
about 15 MB):

    python tools/build_moon_maps.py

## What the numbers mean

- Azimuth is measured clockwise from local north. Elevation is the angle above
  a flat horizon, for the centre of the Sun or Earth disk.
- "Above the horizon" is geometry. It does not promise solar power or a radio
  link. Hills, crater rims, lander tilt, and antenna pointing are not modelled.
- The horizon is flat. Near the south pole the real horizon can sit degrees
  higher or lower, which moves sunrise and sunset by hours or days.
- The Moon is treated as a sphere of radius 1737.4 km, the same as Horizons.

- The 3D Moon is a picture, and the numbers do not come from it. It shades
  each point by its slope, drawn 3 times steeper than life, and nothing on it
  casts a shadow. The top of `src/globe.js` lists what it leaves out.

The full list of modelling choices is at the top of `src/lunar-sky.js`.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `css/style.css` | The page |
| `src/lunar-sky.js` | Sun and Earth sky position, horizon crossings, timelines |
| `src/sites.js` | The curated landing sites, each with its source |
| `src/charts.js` | The horizon view, the timeline, and the visibility bars (plain SVG) |
| `src/globe.js` | The 3D Moon: a WebGL sphere with no library behind it |
| `src/app.js` | Reads the form, runs the calculation, writes the page |
| `test/` | Tests against the Horizons tables |
| `tools/fetch_horizons.py`, `tools/fetch_subpoints.py` | Download the reference tables from NASA JPL Horizons |
| `tools/build_moon_maps.py` | Turns NASA's Moon colour and elevation files into `vendor/moon-maps.js` |
| `reference/horizons/`, `reference/horizons-subpoints/` | Saved Horizons answers, with the request URLs inside each file |
| `vendor/astronomy.browser.js` | Astronomy Engine 2.1.19 (MIT), copied in so the page works offline |
| `vendor/moon-maps.js` | NASA LRO colour and elevation maps of the Moon, stored inside a script so the page can open straight from disk |

## Sources and credits

See [SOURCES.md](SOURCES.md). How AI tools were used is in [SI_USE.md](SI_USE.md).

## License

The team picks an OSI-approved license before submission. Astronomy Engine in
`vendor/` keeps its own MIT license.
