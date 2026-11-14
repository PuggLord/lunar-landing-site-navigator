# Submission page copy

Drafts for the eight fields on the Space Apps project page. Drafted with an AI
coding tool (Claude Code) from the project's own files and test results, for
the team to edit before pasting. See SI_USE.md.

Deadline: the global rule is Sunday Nov 15, 2026, 11:59 p.m. Central. The
schedule picture on the Dallas event page reads "11:59 AM", so plan to submit
by Sunday 11:00 a.m. unless the Dallas leads confirm the later time. Both
links must open with no login. The demo is either seven slides or a video of
30 seconds or less; going over either limit takes the project out of Global
Judging.

Still to fill in by the team: the two links, the license line once the team
has picked one, and the list under "What the team decided" in field 6.

---

## 1. Project name

Lunar Landing Site Navigator

## 2. High-level summary

Lunar Landing Site Navigator compares two landing scenarios on the Moon. You
give it two sites on the same date, or one site on two dates, and it tells you
which one loses the Sun or the Earth first and by how long.

We built it because mission schedules slip and landing sites get moved. Near
the south pole the Sun and the Earth both sit within a few degrees of the
horizon, and the horizon is ridges and crater rims. A two-week delay, or a
site 175 km away, can leave a lander without power or without a direct radio
link for days. JPL Horizons, Quickmap and Moon Trek hold the data to check
this, one site and one date at a time. Our tool puts two cases side by side.

For each scenario the tool works out where the Sun and the Earth sit above the
real skyline, how long each stays in view, and how much solar energy arrives.
The skyline comes from NASA's LOLA laser altimeter grids. In a 90-day run the
rim of Shackleton crater gets sunlight 91% of the time and the crater floor
10 km away gets none. We tested the Sun and Earth positions against NASA JPL
Horizons, and the largest difference we found was 0.0073 degrees.

## 3. Link to project demo

`[paste one public link: deck/Lunar-Landing-Site-Navigator.pdf (seven slides), or demo/Lunar-Landing-Site-Navigator-demo.mp4 (29 seconds, silent), or the narrated 30-second video once the team has recorded its voices over demo/Lunar-Landing-Site-Navigator-30s-read-along.mp4. Check that the narrated file is 30 seconds or less before linking it.]`

## 4. Link to final project

`[paste the public link to the live page; the source code link goes in the description below]`

## 5. Detailed project description

**What it does**

You choose scenario A and scenario B. Each one is a place on the Moon and a
start time. You can pick the place from a list, type a latitude and longitude,
or click the 3D Moon. The list has six landing sites with sourced coordinates
(IM-1 Odysseus, the planned IM-2 site, the Blue Ghost Mission 1 landing
region, Apollo 11, 15 and 17) and two reference points at Shackleton crater.

The page then shows both scenarios together:

- A sentence at the top with the result, for example "B loses sight of the
  Earth in 9 d. A keeps it for at least the next 90 days."
- A table of numbers for a look-ahead period of 3, 14, 30 or 90 days. It gives
  the height and compass direction of the Sun and the Earth at the start, the
  time to the next sunset and Earthset, hours of sunlight, solar energy in kWh
  per square metre, hours with the Earth in view, and the longest stretch
  without each.
- A view out from each site. The ground is drawn as the real skyline, with the
  paths of the Sun and the Earth crossing it.
- A timeline of height above the skyline for the whole period, with bars that
  show when the Sun and the Earth are up.
- A 3D Moon with both sites marked, lit from the Sun's real direction. Play
  runs the period forward. You can drag the Moon to turn it or click it to
  move a site.
- A Horizon control that switches between the LOLA skyline and a flat horizon,
  so you can see how much of an answer comes from terrain.

Four worked cases load with one click:

- Move the site 175 km. From the IM-1 landing site the Earth stays in view for
  all 90 days. From the planned IM-2 site it sets after 9 days, and the
  longest stretch without it is 5 d 17 h. The IM-2 site gets more sunlight,
  1,389 kWh per square metre against 1,164.
- Land two weeks late at the IM-1 site. A lander that arrives on landing day
  gets 8 d 15 h before the Sun goes behind the ridges. One that arrives 14
  days later lands in the dark and waits 12 d 2 h for sunrise.
- Compare the rim of Shackleton crater with its floor, about 10 km apart at
  the south pole. Over 90 days the rim is in sunlight 91% of the time and the
  floor gets none. With a flat horizon the tool gives 53% and 47%.
- Set the pole beside Apollo 11. At the Apollo 11 site the Sun is 86° up. At
  the IM-1 site it clears the skyline by 10.3°, and the Earth sits between
  2.5° and 16.4° above it.

The address bar holds the whole comparison, so you can copy the link and send
someone the exact case you are looking at.

The site also has a page called "Our thinking". It explains the choices we
made and follows one comparison from its inputs to the sentence on screen.

**Who it is for**

Mission planners who need a first answer when a date or a site changes, before
a full terrain study. It also works for teachers and students who want to see
why the south pole is a hard place to land.

**How it works**

The page is plain HTML, CSS and JavaScript, with no framework and no server.
It opens from a file and works offline. Astronomy Engine supplies the
positions of the Sun, the Earth and the Moon, and the IAU 2009 rotation model
gives the Moon's orientation. Our code turns those into a height and a compass
direction for someone standing at the site.

Within 17 degrees of either pole, the horizon is a skyline worked out from
NASA's LOLA polar elevation grids (LDEM_60S_240M and LDEM_60N_240M). For each
of 720 compass directions we find the highest ground out to 200 km, as seen
from 2 m above the surface. The polar sites in the list use the full 240 m
grid, computed ahead of time. Any other polar point uses a 960 m grid and is
computed in the browser in about 20 milliseconds. The Sun or the Earth counts
as up when it is higher than the ground in its direction. Farther from the
poles we use a flat horizon, because the Sun crosses it steeply there and a
2 degree ridge shifts sunrise by about 4 hours.

Solar energy is the sunlight that reaches one square metre facing the Sun. We
start from 1,361 W per square metre at the Earth's distance from the Sun,
adjust for the Sun's distance that day, and count the share of the Sun's disk
above the skyline.

The 3D Moon is WebGL code written for this project, with no library behind
it. It shades a sphere using the NASA colour mosaic and ground slopes worked
out from the laser altimeter heights.

**How we know the numbers are right**

Positions. Our tests compare the tool with tables saved from NASA JPL
Horizons, 852 time steps at four places on the Moon. The largest difference in
Sun or Earth position is 0.0073 degrees. With a flat horizon, the sunset time
at the IM-1 site is 4 seconds from the Horizons time. We also test the Sun
direction that lights the 3D Moon over another 278 time steps, where the
largest difference is 0.0067 degrees.

Terrain. On made-up terrain where we know the answer (flat ground, a wall, a
bowl), the skyline code gives that answer. On the real grid it agrees with a
second version written in Python within 0.05 degrees, over 2,160 directions at
three sites. The grid puts the IM-1 site at 2,588 m, and NASA gives 2,579 m.
The floor of Shackleton crater is in permanent shadow, and it gets no sunlight
in the tool. Mazarico and others (2011) report a point near the Shackleton rim
that is sunlit for most of the year. Our rim point gets sunlight 87% of the
time over 2024.

All 39 tests run with one command, `node --test`, and need nothing installed.

**What it leaves out**

We use terrain within 17 degrees of a pole and a flat horizon elsewhere. The
240 m and 960 m grids smooth narrow ridges and small craters. At the IM-1 site
the two grids put the first sunset 4 hours apart, and on a narrow peak the
coarse grid can miss about a quarter of the year's sunlight. We treat the
lander as a point 2 m above the ground with no tilt.

The energy figure is sunlight arriving, before any panel turns it into
electricity. We don't model panel angle, efficiency, temperature or dust.
"Earth in view" means the centre of the Earth's disk is above the skyline, and
we don't model an antenna, a ground station or a data rate. The page states
these limits next to the numbers. The 3D Moon is a picture, and the numbers
are calculated separately from it.

**What comes next**

NASA Goddard publishes 5 m LOLA grids for south pole landing sites, and adding
them would resolve the nearest ridges. After that we would add solar panel
tilt and an antenna model. We would also like to add landing sites from other
countries' lunar programs.

**Tools**

HTML, CSS, JavaScript, WebGL 2, Node.js test runner, Python with NumPy and
Pillow for the data scripts, Astronomy Engine 2.1.19, Mona Sans typeface.

**Source code**

`[paste the public repository link]`. License: `[the license the team picked]`.

## 6. Use of SI (AI)

We used one AI coding tool, Claude Code (Anthropic, model Claude Fable 5.2).

The idea is ours: pick a landing site and a time, see where the Sun and the
Earth are, and compare two scenarios. Comparing sites and dates comes from the
challenge statement.

What the team decided `[team: edit this list so every line is true, and add who checked which numbers]`:

- The challenge, and the idea of comparing two scenarios side by side.
- To make a new build during the event.
- That the first design looked machine-made, and that the page should be
  rebuilt from published design references.
- Which past Space Apps winners to study before writing the slides.
- What to deliver: the live tool, seven slides, a short video and this page.
- To ask where the project could lose, and then to add the terrain skyline and
  the energy figure in answer.
- That the first drafts of the text read as machine-written, that they should
  be rewritten in plain language, and that the site needed a page explaining
  our thinking.

We directed the tool as it wrote the code, the tests, the documentation, the
slides and the first draft of this page. The tool read the Space Apps guides
and downloaded reference tables from NASA JPL Horizons. It downloaded and
converted NASA's Moon maps and LOLA elevation grids, and it looked at
published websites for design reference. A web capture service, Firecrawl,
took screenshots of those reference sites and read two NASA pages and one
paper abstract.

How we label it. Each AI-written file starts with an "SI disclosure" comment,
and the pages and the slides carry a `generator` tag in their metadata. The
file `SI_USE.md` in the repository logs each session with times and files.

The project has no AI-generated images, video or audio. The Moon on the page
and in the slides is NASA imagery drawn by code. The demo video is screenshots
of the page joined by a script the tool wrote, and its last card says so. We
use no NASA logos, flags or mission identifiers.

## 7. NASA data

- LOLA Gridded Data Records, polar products LDEM_60S_240M and LDEM_60N_240M
  (Lunar Orbiter Laser Altimeter on the Lunar Reconnaissance Orbiter), NASA
  Planetary Data System Geosciences Node. The terrain behind the skylines.
  https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/
- JPL Horizons System API. Reference positions of the Sun and the Earth for an
  observer on the Moon, and the sub-solar point. The position tests compare
  against it. https://ssd.jpl.nasa.gov/api/horizons.api
- CGI Moon Kit, NASA Scientific Visualization Studio. Lunar Reconnaissance
  Orbiter Camera colour mosaic and LOLA laser altimeter elevation, used for
  the 3D Moon. https://svs.gsfc.nasa.gov/4720/
- NASA, "NASA's LRO Images Intuitive Machines' Odysseus Lander". IM-1 resting
  position, height, local slope and landing time.
  https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/
- NASA NSSDCA, Apollo Landing Site Coordinates. Apollo 11, 15 and 17 Lunar
  Module positions. https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html
- LROC (NASA/GSFC/Arizona State University), IM-2 Landing Region. The planned
  IM-2 site. https://www.lroc.asu.edu/images/1401
- LROC, Firefly Blue Ghost Landing Region. The Blue Ghost Mission 1 landing
  region. https://www.lroc.asu.edu/images/1400
- 2026 NASA Space Apps Challenge, Lunar Landing Site Navigator challenge
  statement.
  https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/

## 8. Space Agency Partner data and references

We used no Space Agency Partner data.

Other references:

- Astronomy Engine 2.1.19 by Don Cross, MIT license. Sun and Moon positions
  and the Moon's rotation, computed in the browser.
  https://github.com/cosinekitty/astronomy
- IAU Working Group on Cartographic Coordinates and Rotational Elements, 2009
  report. The Moon orientation model inside Astronomy Engine.
- USGS Gazetteer of Planetary Nomenclature, Shackleton. The crater centre used
  for the floor point. https://planetarynames.wr.usgs.gov/Feature/5450
- Mazarico, Neumann, Smith, Zuber and Torrence (2011), "Illumination
  conditions of the lunar polar regions using LOLA topography", Icarus 211,
  1066-1081. Published lighting figures we compare the Shackleton result with.
  https://doi.org/10.1016/j.icarus.2010.10.030
- Barker and others (2021), "Improved LOLA elevation maps for south pole
  landing sites", Planetary and Space Science 203. The 5 m grids named under
  "What comes next"; not used in the tool.
  https://pgda.gsfc.nasa.gov/products/78
- Mona Sans typeface, copyright 2023 GitHub, SIL Open Font License 1.1.
  https://github.com/github/mona-sans
- Design references, layout and type ideas only, with no code, text or image
  taken: earth.nullschool.net, vastspace.com, app.shadowmap.org.
- The full list, with what each source was used for and the date we checked
  it, is in `SOURCES.md` in the repository.
