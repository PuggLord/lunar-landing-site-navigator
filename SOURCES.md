# Sources

Every dataset, tool, and reference used in this project. Dates are when we
last checked the source.

## NASA data and resources

| What | Where | How we use it | Checked |
| --- | --- | --- | --- |
| JPL Horizons System (API) | https://ssd.jpl.nasa.gov/api/horizons.api, docs at https://ssd-api.jpl.nasa.gov/doc/horizons.html | Reference azimuth and elevation of the Sun and Earth for an observer on the Moon (`CENTER='coord@301'`, ephemeris DE441, frame MEAN_ME). Saved in `reference/horizons/`; every test compares against it | 2026-11-14 |
| IM-1 Odysseus resting position: 80.13 S, 1.44 E, 2,579 m | https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/ | Site used in the reference cases. Position from Lunar Reconnaissance Orbiter imaging | 2026-11-02; re-check before it appears in the app |
| Challenge statement and Resources tab | https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ | What the tool has to do | 2026-11-14 |

## Other references

| What | Where | How we use it | Checked |
| --- | --- | --- | --- |
| Astronomy Engine 2.1.19, by Don Cross, MIT license | https://github.com/cosinekitty/astronomy | Sun and Moon positions and the Moon's rotation, computed in the browser. Copied into `vendor/` | 2026-11-14 |
| IAU WGCCRE 2009 report, Table 2 (Moon pole and prime meridian) | https://astropedia.astrogeology.usgs.gov/alfresco/d/d/workspace/SpacesStore/28fd9e81-1964-44d6-a58b-fbbf61e64e15/WGCCRE2009reprint.pdf | The Moon orientation formulas inside Astronomy Engine. Cited in its source code; we did not read the report ourselves | 2026-11-14 |

The test points named "Test point" in `tools/fetch_horizons.py` are arbitrary
coordinates chosen to exercise the math. They are not mission sites.
