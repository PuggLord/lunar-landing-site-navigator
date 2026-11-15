<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->

# Frequently asked questions

Short answers we can say out loud. The method behind each number is in `docs/HOW_IT_WORKS.md`, and the reasons for our choices are on the site's "Our thinking" page (`thinking.html`).

## What does this do that Quickmap, Moon Trek and JPL Horizons do not?

The challenge statement says those three are hard to use for a quick comparison. Horizons gives accurate positions, but for one observer per query, so comparing two places means two queries and reading the tables against each other yourself. Our tool takes two scenarios at once, either two sites on one date or one site on two dates, and writes out which one loses the Sun or the Earth first and by how long. We still depend on the others. Horizons is the reference our tests compare against, and a full terrain study would use Quickmap or Moon Trek.

## Who would use this?

We designed it for a mission planner who needs a first answer when a date or a site changes. Teachers and students could also use it to see why the south pole is a hard place to land. Nobody outside the team has tried it yet.

## Where do the Sun and Earth positions come from, and why should a judge trust them?

Astronomy Engine 2.1.19, an MIT-licensed library, computes the positions of the Moon, the Sun and the Earth. The IAU 2009 rotation model inside it turns those into a frame fixed to the Moon. We checked the results against NASA JPL Horizons over 852 time steps at four places, and the largest difference in elevation or azimuth was 0.0073 degrees. The saved Horizons tables are in `reference/horizons/`, so anyone can rerun the comparison.

## What does "above the horizon" mean?

Within 17 degrees of either pole, the horizon is the terrain skyline, meaning the height of the ground in each compass direction as seen from 2 m above the surface. The Sun or the Earth counts as up when the centre of its disk is higher than the skyline in its direction. That means the Sun can be partly showing while the tool reports it down. Farther from the poles the horizon is the flat plane touching the ground at the site. The Horizon control switches the skyline off so you can see how much terrain changes an answer. The Moon has no atmosphere, so there is no refraction to correct for.

## Where does the terrain come from, and how sharp is it?

It is NASA LOLA data, from the Lunar Orbiter Laser Altimeter on the Lunar Reconnaissance Orbiter. We use the polar gridded products LDEM_60S_240M and LDEM_60N_240M, which have 240 m pixels and heights measured from a 1737.4 km sphere. Four named places (IM-1, IM-2 and two points in Shackleton crater) get skylines computed from the full 240 m grid when we build the data. Any other polar point gets its skyline in the browser from a 960 m grid, which we made by averaging 4 by 4 blocks of the same data. Both grids smooth out narrow peaks and small craters.

## Why 200 km?

The skyline search goes out 200 km from the site. On a smooth sphere, ground that far away sits about 11.5 km below the observer's flat horizon (the distance squared divided by twice the Moon's radius). Terrain out there would have to stand about 11.5 km higher than the observer to reach level. The highest ground in the polar grids is 7.0 km above the sphere in the south and 4.8 km in the north. Our four listed places sit between 2.8 km below the sphere and 5.3 km above it, so nothing beyond 200 km reaches level from any of them. The limit could miss something for a point typed into the deepest polar basin, 9.1 km below the sphere, with a peak more than 200 km away.

## Why use terrain only near the poles?

Near the equator the Sun crosses the horizon steeply, so a ridge 2 degrees high moves sunrise by about 4 hours. A sunlit stretch there lasts about 354 hours, so the shift is small. Near the poles the Sun skims the horizon and the same ridge can hide it for days. We apply terrain poleward of 73 degrees and keep the flat horizon elsewhere. A site at 60 degrees with a ridge next to it is therefore not corrected.

## Why does the Earth barely move in the lunar sky, yet still set at polar sites?

The Moon keeps one face toward the Earth, so the Earth stays close to one spot in the lunar sky. Libration, a slow wobble in the Moon's orientation, moves it a few degrees up and down. At a pole the Earth's centre sits close to the horizon, so a few degrees is enough to put it below the skyline for days.

## Why is the pole hard for power?

The Moon's axis is tilted about 1.5 degrees. From a pole the Sun stays within about 1.5 degrees of the flat horizon and circles it once a month. A lander there gets long stretches of low light, long nights, and shadows from ridges and crater walls. The skyline shows those ridges at polar points, down to the size the grid can resolve.

## How is the energy number computed, and what does it leave out?

Sunlight at 1 AU is 1361 W/m^2. We scale that by the inverse square of the Sun's distance, then multiply by the share of the Sun's disk above the skyline at each sample, using the circular-segment formula. The tool adds those up over the look-ahead period with the trapezoid rule, 720 samples across the window, and converts the total to kWh per square metre. The figure assumes a panel that follows the Sun, so it is the light reaching the panel. Panel angle, efficiency, temperature, dust and shadowing by the lander itself are left out, so the electricity delivered would be lower.

## How accurate are the sunset times once terrain is on?

With the flat horizon, sunset at the IM-1 site falls 4 seconds from the Horizons value, and our test accepts up to 10 minutes. We have no outside table of sunset times over terrain to compare with, so we check the terrain path three other ways.

The skyline code gives the known answer on made-up terrain: flat ground, a wall, and a bowl. On the real grid it agrees with a second version written in Python within 0.05 degrees, over 2,160 directions at three sites. The results also line up with published facts. The floor of Shackleton, a crater in permanent shadow, gets no sunlight in the tool. At IM-1 the highest skyline is 11.2 degrees, from ground 200 m away, and NASA reports that the lander rests inside a small crater on a 12 degree slope.

At IM-1 the terrain moves the first sunset from 9 d 8 h after landing to 8 d 15 h. The grid sets the limit on accuracy. The 240 m and 960 m grids smooth narrow ridges, and at IM-1 they put the first sunset 4 hours apart. Even on level ground the skyline sits about 0.09 degrees below the flat plane, because the observer stands 2 m up.

## What happens at a point the grid does not cover?

Equatorward of 73 degrees the horizon is flat and no terrain loads. The last row of the table says which horizon each scenario used. A polar point outside the four named places gets its skyline from the 960 m grid in the browser, so its result is coarser. The grid reaches down to 66 degrees, 212 km past the 73 degree limit, so a 200 km ray from any point that uses terrain stays on the grid. The grid takes about a second to load. Until it arrives the page shows flat results with a note saying so.

## Why no framework and no server?

The page opens from a file, works offline, and needs nothing installed, so bad Wi-Fi at a check-in can't break it. The engine is one plain JavaScript file that runs both in the browser and in Node for the tests. There is no build step to fail on the day.

## What did the AI tool do, and what did the team do?

Claude Code, an AI coding tool, wrote the code, the tests and the documentation under our direction. It also read NASA and LROC pages for coordinates and downloaded the Horizons tables. The concept comes from us and from the challenge statement. Jake Manis ran the sessions with the tool and made the decisions listed in field 6 of `SUBMISSION.md`. Caden Diep and Jeremey Kindle are the two readers in the demo video. The checks on the numbers are automated tests that the tool wrote and ran. `SI_USE.md` logs each session with its times and files.

## What NASA data does the project use?

JPL Horizons supplies the reference positions our tests compare against. The page does not call it when it runs. The CGI Moon Kit from NASA's Scientific Visualization Studio supplies the LROC colour mosaic and a global LOLA height grid for the 3D Moon, and the polar LOLA products supply the skyline. Landing positions come from NASA and LROC pages for IM-1, the planned IM-2 site and the Blue Ghost Mission 1 region, and from the NSSDCA table for Apollo 11, 15 and 17. The Shackleton floor point is the crater centre from the USGS Gazetteer of Planetary Nomenclature. The rim point is the highest 240 m cell within 14 km of that centre in the LOLA grid. NASA has not endorsed this project.

## What would come next?

First, the 5 m LOLA grids that NASA Goddard publishes for south pole landing sites (Barker and others, 2021, https://pgda.gsfc.nasa.gov/products/78). Each covers a small area, so we would use them for the nearest few kilometres of skyline and keep the 240 m grid for the far horizon. After that we would add solar panel tilt, then an antenna and ground station model for the Earth link. Each of those changes a different number, so each would get its own tests.

## What is the biggest weakness?

The tool stops at geometry. A Sun above the skyline doesn't guarantee a working solar array, and an Earth above the horizon doesn't guarantee a radio link. An engineer would need to put a real model on top of our in-view figures before using them in a mission plan. The terrain is also too coarse for small craters, and we only use it near the poles.

## What does "Earth in view" mean?

We count the Earth as in view when the centre of its disk is above the skyline. The disk is about 1.9 degrees across, so part of it can still be behind a ridge while the tool reports it in view. That rule has no antenna pattern, ground station or data rate in it.

## Why does the 3D Moon not feed the numbers?

The 3D Moon is a picture of the surface. We draw slopes three times steeper than they are so craters show up, and the globe has no cast shadows, so a crater floor that looks lit on the globe can be dark on the real Moon. The numbers come from the engine. The globe takes its lighting direction from `subPoints`, and we test that direction against Horizons.

## Why these sites?

The list holds six landing sites and two reference places, each with its coordinates and source written in `src/sites.js`. The two Shackleton entries are there for comparison and are not landing sites. IM-1 came to rest at 80.13 S, 1.44 E. The planned IM-2 site sits at 84.78 S, 29.13 E. The Blue Ghost Mission 1 entry is the centre of its landing region at 18.56 N, 61.81 E, so it marks a region and not the exact landing spot. The Apollo 11, 15 and 17 entries are lunar module positions from the NSSDCA table.

## Are the four worked cases calculated by the tool?

Yes. Each case is a link that loads a comparison, and we read the figures in its description from the tool with the terrain horizon on. Move the site 175 km: the Earth sets at the planned IM-2 site after 9 days, and the longest stretch without it is 5 d 17 h. Land two weeks late at IM-1: the Sun stays up 8 d 15 h on landing day, and a lander arriving 14 days later waits 12 d 2 h in the dark. Shackleton: the rim is in sunlight 91% of 90 days and the floor gets none. Apollo 11 against IM-1: the Sun is 86 degrees up at one and clears the skyline by 10.3 degrees at the other.

## How do the Shackleton figures compare with published work?

Mazarico and others (2011, Icarus 211) studied polar lighting with LOLA terrain. They report a point near the Shackleton rim that is sunlit continuously for 240 days, with a longest period in total darkness of about 1.5 days. Our rim point is a different place on a coarser grid. Over 2024 the tool gives it sunlight 87% of the year counting the centre of the Sun's disk, or 91% counting any part of the disk. Its longest total darkness is 2.7 days, and its longest unbroken sunlight is 94 to 116 days across 2024 to 2026. Both show the same pattern, and our figures are the less favourable of the two.
