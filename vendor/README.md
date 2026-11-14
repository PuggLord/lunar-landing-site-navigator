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

## fonts/

`MonaSans-latin-variable.woff2` is Mona Sans by GitHub, the Latin subset that
Google Fonts serves, downloaded 2026-11-14 and not modified.
Source: https://github.com/github/mona-sans
License: SIL Open Font License 1.1, in `fonts/OFL-MonaSans.txt`.

`tools/build_fonts_css.py` stores the same file as text in `css/fonts.css`, so
the page shows the right typeface when opened straight from disk.
