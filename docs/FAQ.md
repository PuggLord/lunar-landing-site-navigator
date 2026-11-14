<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->

# Frequently asked questions

Each answer is short enough to say aloud. The method behind each number is in `docs/HOW_IT_WORKS.md`.

## What does this do that Quickmap, Moon Trek and JPL Horizons do not?

The challenge statement names those three as hard to use for a quick comparison. JPL Horizons gives accurate positions, but each query covers one observer and one time range, so comparing two places means two queries and a manual reading. This tool puts two scenarios side by side, either two sites on one date or one site on two dates, and writes the result as a sentence: which scenario loses the Sun or the Earth first, and by how long. It does not replace the other tools for terrain study, and Horizons is the reference the tool is tested against.

## Who would use this?

The intended users are mission planners who need a first answer when a date or a site changes, teachers and students who want to see why the south pole is hard, and anyone curious about the length of a lunar day. The planner use is a design aim. [team to fill: any feedback from someone outside the team so far, or "none yet".]

## Where do the Sun and Earth positions come from, and why should a judge trust them?

Astronomy Engine 2.1.19, an MIT-licensed library, computes the geometric positions of the Moon, Sun and Earth. The IAU 2009 rotation model inside it turns those vectors into a frame fixed to the Moon. Every position was checked against NASA JPL Horizons, and the largest difference in elevation or azimuth is 0.0073 degrees over 852 time steps at four places. The saved Horizons tables are in `reference/horizons/`, so anyone can rerun the comparison.

## What does "above the horizon" mean?

Within 17 degrees of either pole the horizon is the terrain skyline: the height of the ground in each compass direction, seen from 2 m above the surface. A body counts as up when the centre of its disk stands higher than the skyline in its direction, so the Sun can be partly showing while the tool reports it down. Farther from the poles the horizon is the flat plane that touches the ground at the site. The Horizon control switches the skyline off, which shows how much of an answer comes from terrain. The Moon has no atmosphere, so the tool applies no refraction.

## Where does the terrain come from, and how sharp is it?

The terrain is NASA LOLA data, from the Lunar Orbiter Laser Altimeter on the Lunar Reconnaissance Orbiter. The project uses the polar gridded products LDEM_60S_240M and LDEM_60N_240M, which have 240 m pixels and heights measured from a 1737.4 km sphere. Four named places, IM-1, IM-2 and two points in Shackleton crater, use skylines computed from the full 240 m grid when the data is built. Any other polar point gets its skyline in the browser from a 960 m grid made by averaging 4 by 4 blocks of the same data. Both grids smooth narrow peaks and small craters.

## Why 200 km?

The skyline search walks out to 200 km from the site. On a smooth sphere, the ground at that distance sits about 11.5 km below the observer's flat horizon, which is the distance squared divided by twice the Moon's radius. Ground out there would have to stand about 11.5 km higher than the observer to reach level. The highest ground in the two polar grids is 7.0 km above the sphere in the south and 4.8 km in the north. The four listed places sit between 2.8 km below the sphere and 5.3 km above it, so nothing beyond 200 km reaches level from any of them. The case this limit could miss is a point typed into the deepest polar basin, 9.1 km below the sphere, looking at a peak more than 200 km away.

## Why use terrain only near the poles?

Near the equator the Sun crosses the horizon steeply, so a ridge 2 degrees high moves sunrise by about 4 hours. A sunlit stretch lasts about 354 hours, so that shift is small. Near the poles the Sun skims the horizon, and the same 2 degree ridge can hide it for days. The tool applies terrain poleward of 73 degrees and keeps the flat horizon elsewhere, so a site at 60 degrees with a nearby ridge is not corrected.

## Why does the Earth barely move in the lunar sky, yet still set at polar sites?

The Moon keeps one face toward the Earth, so the Earth stays nearly fixed in the lunar sky. Libration, a slow wobble in the Moon's orientation, moves the Earth a few degrees up and down. At the pole the Earth's centre sits close to the horizon, so a few degrees of wobble is enough to set it for days.

## Why is the pole hard for power?

The Moon's axis is tilted about 1.5 degrees, so from the pole the Sun stays within about 1.5 degrees of the horizon, and it circles the horizon once a month. A lander there gets long low light, long nights, and shadows from ridges and crater walls. The terrain step shows those ridges at polar points, to the limit of the grid.

## How is the energy number computed, and what does it leave out?

Sunlight at 1 AU is 1361 W/m^2. The tool scales that by the inverse square of the Sun's distance from the Moon. At each sample the tool multiplies that by the share of the Sun's disk above the skyline, using the circular-segment formula. It then integrates the result over the look-ahead period with the trapezoid rule, using 720 samples across the window, and converts it to kWh per square metre. The figure assumes a panel that follows the Sun perfectly, so it measures the light that reaches the panel and nothing more. It leaves out panel angle, efficiency, temperature, dust, and shadowing by the lander. The result is light energy, not electricity delivered.

## How accurate are the sunset times once terrain is on?

With the flat horizon, the sunset at the IM-1 site falls 4 seconds from the Horizons value, and the test accepts up to 10 minutes. No outside table gives a sunset time over terrain, and we have not compared one with an outside source. The terrain path is checked in three other ways.

The skyline code gives the known answer on made-up terrain: flat ground, a wall, and a bowl. On the real grid it agrees with a second calculation written in Python within 0.05 degrees, over 2,160 directions at three sites. The results also match published facts. The floor of Shackleton, a crater in permanent shadow, gets no sunlight in the tool. At IM-1 the highest skyline is 11.2 degrees, from ground 200 m away, and NASA reports that the lander rests inside a small crater on a 12 degree slope.

At IM-1 the terrain moves the first sunset from 9 d 8 h after landing to 8 d 15 h. The limit is the grid. The 240 m and 960 m grids smooth narrow ridges, and at IM-1 the two give first sunsets 4 hours apart. Even on level ground the skyline sits about 0.09 degrees below the flat plane, because the observer stands 2 m up.

## What happens at a point the grid does not cover?

Equatorward of 73 degrees the horizon is flat, and no terrain is loaded. The table's last row says which horizon each scenario used. A polar point that is not one of the four named places gets its skyline from the 960 m grid, computed in the browser, so its result is coarser. The grid reaches down to 66 degrees, 212 km beyond the 73 degree limit, so every 200 km ray from a point that uses terrain stays on the grid. While the grid loads, which takes about a second, the page shows flat results and a note that says so.

## Why no framework and no server?

The page opens from a file, works with no network connection, and needs nothing installed, so a check-in on poor Wi-Fi cannot break it. The engine is one plain JavaScript file that runs in the browser and in Node for the tests, with no build step to break on the day.

## What did the AI tool do, and what did the team do?

Claude Code, an AI coding tool, wrote the code, tests and documentation under the team's direction. It also read NASA and LROC pages for coordinates and downloaded the Horizons tables. The concept comes from the team and the challenge statement. [team to fill: which member directed which part, who checked the numbers against the sources, and who chose the sites and the cases.] `SI_USE.md` logs each session with its times and files.

## What NASA data does the project use?

JPL Horizons supplies the reference positions the tests check against. It is not called when the page runs. The CGI Moon Kit from NASA's Scientific Visualization Studio supplies the LROC colour mosaic and a global LOLA height grid for the 3D Moon. The polar LOLA products supply the skyline. Landing positions come from NASA and LROC pages for IM-1, the planned IM-2 site and the Blue Ghost Mission 1 region, and from the NSSDCA table for Apollo 11, 15 and 17. The Shackleton floor point is the crater centre from the USGS Gazetteer of Planetary Nomenclature, and the rim point is the highest 240 m cell within 14 km of it in the LOLA grid. NASA has not endorsed this project.

## What would come next?

The next data step is the 5 m LOLA grids that NASA Goddard publishes for south pole landing sites (Barker and others, 2021, https://pgda.gsfc.nasa.gov/products/78). Each covers a small area, so it would sharpen the nearest few kilometres of skyline and leave the far horizon to the 240 m grid. After that come solar panel tilt, an antenna and ground station model for the Earth link, and landing sites from other agencies' lunar programs. Each one changes a different number, so each would be a separate step with its own test.

## What is the biggest weakness?

The tool answers geometry, not engineering. A Sun above the skyline does not mean a working solar array, and an Earth above the horizon does not mean a radio link. Any in-view figure needs an engineer's model before it goes into a mission plan. The terrain is also coarse for small craters, and it covers only the poles.

## What does "Earth in view" mean?

The tool counts the Earth as in view when the centre of its disk is above the skyline. The disk is about 1.9 degrees across, so part of it can still sit behind a ridge while the tool reports it in view. The rule has no antenna pattern, no ground station and no data rate.

## Why does the 3D Moon not feed the numbers?

The 3D Moon is a picture of the surface. It draws slopes three times steeper than they are so craters show, and nothing casts a shadow, so a lit crater floor on the globe can be dark on the real Moon. The numbers come from the engine. The globe takes its lighting direction from `subPoints`, and that direction is tested against Horizons.

## Why these sites?

The list holds six landing sites and two reference places. Each one has its coordinates and source written in `src/sites.js`. The two Shackleton entries are places for comparison, not landing sites. IM-1 came to rest at 80.13 S, 1.44 E. The planned IM-2 site sits at 84.78 S, 29.13 E. The Blue Ghost Mission 1 entry is the centre of its landing region at 18.56 N, 61.81 E, not a landing spot. The Apollo 11, 15 and 17 entries are lunar module positions from the NSSDCA table.

## Are the four worked cases calculated by the tool?

Yes. Each case is a link that loads a comparison, and the figures in its description were read from the tool with the terrain horizon on. Move the site 175 km: the Earth sets at the planned IM-2 site after 9 days, and the longest break lasts 5 d 17 h. Land two weeks late at IM-1: the Sun stays up 8 d 15 h on landing day, and a lander arriving 14 days later waits 12 d 2 h in the dark. Shackleton: the rim has sunlight 91% of 90 days and the floor has none. Apollo 11 against IM-1: the Sun stands 86 degrees up at one and clears the skyline by 10.3 degrees at the other.

## How do the Shackleton figures compare with published work?

Mazarico and others (2011, Icarus 211) studied polar lighting with LOLA terrain. They report a point near the Shackleton rim that is sunlit continuously for 240 days each year, with a longest period in total darkness of about 1.5 days. Our rim point is a different place on a coarser grid. Over 2024 the tool gives it sunlight 87% of the year counting the centre of the Sun's disk, or 91% counting any part of the disk. Its longest total darkness is 2.7 days, and its longest unbroken sunlight is 94 to 116 days in 2024 to 2026. The picture is the same, and our figures are the less favourable ones.
