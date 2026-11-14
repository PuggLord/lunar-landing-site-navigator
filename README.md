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

## Open it

Open `index.html` in a browser. There is nothing to install and no server to
start. It works with no network connection.

The address bar holds the whole comparison, so a copied link reopens the same
two scenarios. Add `?theme=light` or `?theme=dark` before the `#` to force a
colour theme.

## Run the tests

Needs Node.js 20 or newer. Nothing to install.

    node --test

The tests compare our numbers with tables saved from NASA JPL Horizons in
`reference/horizons/`. Six cases, 1,032 time steps, at four places on the Moon.
The largest difference found on 2026-11-14 was 0.0073 degrees, and the sunset
time at the IM-1 site differs from Horizons by 4 seconds.

To download the reference tables again (Python 3.11 or newer, no packages):

    python tools/fetch_horizons.py

## What the numbers mean

- Azimuth is measured clockwise from local north. Elevation is the angle above
  a flat horizon, for the centre of the Sun or Earth disk.
- "Above the horizon" is geometry. It does not promise solar power or a radio
  link. Hills, crater rims, lander tilt, and antenna pointing are not modelled.
- The horizon is flat. Near the south pole the real horizon can sit degrees
  higher or lower, which moves sunrise and sunset by hours or days.
- The Moon is treated as a sphere of radius 1737.4 km, the same as Horizons.

The full list of modelling choices is at the top of `src/lunar-sky.js`.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `css/style.css` | The page |
| `src/lunar-sky.js` | Sun and Earth sky position, horizon crossings, timelines |
| `src/sites.js` | The curated landing sites, each with its source |
| `src/charts.js` | The horizon view, the timeline, and the visibility bars (plain SVG) |
| `src/app.js` | Reads the form, runs the calculation, writes the page |
| `test/` | Tests against the Horizons tables |
| `tools/fetch_horizons.py` | Downloads the reference tables from NASA JPL Horizons |
| `reference/horizons/` | Saved Horizons answers, with the request URLs inside each file |
| `vendor/` | Astronomy Engine 2.1.19 (MIT), copied in so the page works offline |

## Sources and credits

See [SOURCES.md](SOURCES.md). How AI tools were used is in [SI_USE.md](SI_USE.md).

## License

The team picks an OSI-approved license before submission. Astronomy Engine in
`vendor/` keeps its own MIT license.
