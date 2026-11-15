# Vendored code

`astronomy.browser.js` is Astronomy Engine 2.1.19 by Don Cross, unmodified,
taken from the npm package `astronomy-engine@2.1.19` on 2026-11-14.
Source: https://github.com/cosinekitty/astronomy
License: MIT, in `ASTRONOMY-ENGINE-LICENSE`.

It is copied here so the page runs with no network connection.

## moon-maps.js

NASA imagery and elevation of the Moon from the CGI Moon Kit, NASA Scientific
Visualization Studio, https://svs.gsfc.nasa.gov/4720/. Colour is the LROC Wide
Angle Camera mosaic (NASA/GSFC/Arizona State University). Elevation is the
LOLA 4 pixels per degree grid (NASA/GSFC). `tools/build_moon_maps.py` makes
this file; do not edit it by hand. NASA material is not copyrighted in the
United States; see https://www.nasa.gov/nasa-brand-center/images-and-media/.

## site-horizons.js, lola-south.js, lola-north.js

NASA LOLA elevation of the Moon's polar regions, from the Lunar Orbiter Laser
Altimeter Gridded Data Records `LDEM_60S_240M` and `LDEM_60N_240M`, NASA
Planetary Data System Geosciences Node,
https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/.

`site-horizons.js` holds the skyline of four listed places, worked out from
the full 240 m grid: the height of the ground in 720 compass directions and
the distance to the ground that sets it. `lola-south.js` and `lola-north.js`
hold the elevation itself at 960 m (4 by 4 block means), poleward of 66
degrees, compressed and stored as text. The page loads one of them only when
a typed or clicked polar point needs a skyline.

`tools/build_terrain.py` makes all three; do not edit them by hand. NASA
material is not copyrighted in the United States.

## sunlight-map.js

The share of one year, from 2026-11-15, in which the centre of the Sun is
above the skyline, for 50,220 cells of 1.44 km around the south pole. It also
holds the five sunniest points and their skylines. `tools/build_sunmap.py`
works it out from `LDEM_60S_240M`, the LOLA grid named above; do not edit it
by hand. The checks the build ran are in
`reference/terrain/sunmap-report.json`.

## fonts/

`MonaSans-latin-variable.woff2` is Mona Sans by GitHub, the Latin subset that
Google Fonts serves, downloaded 2026-11-14 and not modified.
Source: https://github.com/github/mona-sans
License: SIL Open Font License 1.1, in `fonts/OFL-MonaSans.txt`.

`tools/build_fonts_css.py` stores the same file as text in `css/fonts.css`, so
the page shows the right typeface when opened straight from disk.
