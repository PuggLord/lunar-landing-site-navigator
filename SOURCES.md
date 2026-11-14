# Sources

Every dataset, tool, and reference used in this project. Dates are when we
last checked the source.

## NASA data and resources

| What | Where | How we use it | Checked |
| --- | --- | --- | --- |
| JPL Horizons System (API) | https://ssd.jpl.nasa.gov/api/horizons.api, docs at https://ssd-api.jpl.nasa.gov/doc/horizons.html | Reference azimuth and elevation of the Sun and Earth for an observer on the Moon (`CENTER='coord@301'`, ephemeris DE441, frame MEAN_ME). Saved in `reference/horizons/`; every test compares against it | 2026-11-14 |
| IM-1 Odysseus resting position: 80.13 S, 1.44 E, 2,579 m; landed Feb 22, 2024 at 6:24 p.m. EST (23:24 UTC) | https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/ | Curated site and reference cases. "Odysseus came to rest at 80.13 degrees south latitude, 1.44 degrees east longitude, 8,461 feet (2,579 meters) elevation" | 2026-11-14 |
| Apollo 11, 15, and 17 Lunar Module coordinates | https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html | Curated sites. NSSDCA table, Mean Earth/Polar Axis frame, from LRO images (Wagner et al., Icarus 283, 2017). Apollo 11 LM 0.67416 N, 23.47314 E; Apollo 15 LM 26.13239 N, 3.63330 E; Apollo 17 LM 20.1911 N, 30.7723 E | 2026-11-14 |
| IM-2 Athena intended landing site: 84.78 S, 29.13 E, Mons Mouton | https://www.lroc.asu.edu/images/1401 | Curated site, labeled as the planned site. LROC (NASA/GSFC/Arizona State University): "intended landing site (-84.78°, 29.13°E) is 160 kilometers from the south pole" | 2026-11-14 |
| Blue Ghost Mission 1 landing region: 18.56 N, 61.81 E, eastern Mare Crisium | https://www.lroc.asu.edu/images/1400 | Curated site, labeled as a region centre. Read from the search-result excerpt of the LROC page, not the full page; open the page and confirm before submission | 2026-11-14 |
| Challenge statement and Resources tab | https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ | What the tool has to do | 2026-11-14 |

## Other references

| What | Where | How we use it | Checked |
| --- | --- | --- | --- |
| Astronomy Engine 2.1.19, by Don Cross, MIT license | https://github.com/cosinekitty/astronomy | Sun and Moon positions and the Moon's rotation, computed in the browser. Copied into `vendor/` | 2026-11-14 |
| IAU WGCCRE 2009 report, Table 2 (Moon pole and prime meridian) | https://astropedia.astrogeology.usgs.gov/alfresco/d/d/workspace/SpacesStore/28fd9e81-1964-44d6-a58b-fbbf61e64e15/WGCCRE2009reprint.pdf | The Moon orientation formulas inside Astronomy Engine. Cited in its source code; we did not read the report ourselves | 2026-11-14 |

The test points named "Test point" in `tools/fetch_horizons.py` are arbitrary
coordinates chosen to exercise the math. They are not mission sites.
