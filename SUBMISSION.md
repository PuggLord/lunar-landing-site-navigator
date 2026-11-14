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

Lunar Landing Site Navigator compares two landing scenarios on the Moon: two
sites on the same date, or one site on two dates. For each it works out where
the Sun and the Earth sit above the real skyline, how long each stays in view,
and how much solar energy arrives. It writes the result as a sentence: which
scenario loses the Sun or the Earth first, and by how long.

Mission schedules slip and landing sites move. Near the south pole the Sun and
the Earth both stay within a few degrees of the horizon, and that horizon is
ridges and crater rims. A two-week delay or a site 175 km away can leave a
lander without power or without a direct radio link for days. The existing
tools hold this data, and each answers one site and one date at a time. Ours
puts two side by side.

The skyline comes from NASA's LOLA laser altimeter grids. In a 90-day run the
rim of Shackleton crater has sunlight 91% of the time, and the crater floor
10 km away has none. A 3D Moon built from NASA Lunar Reconnaissance Orbiter
imagery shows both sites lit from the Sun's real direction. Sun and Earth
positions are tested against NASA JPL Horizons; the largest difference we
found is 0.0073 degrees.

## 3. Link to project demo

`[paste one public link: deck/Lunar-Landing-Site-Navigator.pdf (seven slides) or demo/Lunar-Landing-Site-Navigator-demo.mp4 (29 seconds)]`

## 4. Link to final project

`[paste the public link to the live page; the source code link goes in the description below]`

## 5. Detailed project description

**What it does**

You pick scenario A and scenario B. Each is a place on the Moon and a start
time. The place comes from a list of six landing sites with sourced
coordinates (IM-1 Odysseus, the planned IM-2 site, the Blue Ghost Mission 1
landing region, Apollo 11, 15 and 17) and two reference places at Shackleton
crater, from typed latitude and longitude, or from a click on the 3D Moon.

The page then shows, for both scenarios together:

- A headline sentence with the result, for example "B loses sight of the Earth
  in 9 d. A keeps it for at least the next 90 days."
- A table of the numbers a planner asks for: Sun and Earth height above the
  skyline and compass direction at the chosen time, time to the next sunset
  and Earthset, hours of sunlight, solar energy in kWh per square metre, the
  longest time without the Sun, hours of Earth visibility, and the longest
  time without the Earth, over a look-ahead period of 3, 14, 30 or 90 days.
- A view out from each site, with the ground drawn as the real skyline and the
  paths of the Sun and the Earth crossing it.
- A timeline of height above the skyline for the whole period, with bars that
  mark when the Sun is up, when the Earth is up, and when both are.
- A 3D Moon with both sites marked, lit from the Sun's real direction. Play
  runs the period forward. Drag turns the Moon, and a click moves a site.
- A Horizon control that switches between the LOLA skyline and a flat horizon,
  to show how much of an answer comes from terrain.

Four worked cases load with one click and show why this matters:

- Move the site 175 km, from the IM-1 landing site to the planned IM-2 site.
  At the first the Earth never sets in 90 days. At the second it sets after 9
  days, and the longest break in the radio link lasts 5 d 17 h. The second
  site gets more sunlight: 1,389 kWh per square metre against 1,164.
- Land two weeks late at the IM-1 site. On landing day the Sun stays above the
  ridges for 8 d 15 h. Fourteen days later the lander arrives in the dark and
  waits 12 d 2 h for sunrise.
- Stand on the rim of Shackleton crater, then on its floor, 10 km apart at the
  south pole. Over 90 days the rim has sunlight 91% of the time and the floor
  has none. With a flat horizon the two read 53% and 47%.
- Set the pole beside Apollo 11. At the Apollo 11 site the Sun stands 86° up.
  At the IM-1 site it clears the skyline by 10.3°, and the Earth stays between
  2.5° and 16.4° above it.

A copied link reopens the same comparison, so a planner can send a colleague
the exact case they are looking at.

**Who it is for**

Mission planners who need a first answer in a minute when a date or a site
changes, before a full terrain study. Teachers and students who want to see
why the south pole is hard. Anyone curious about how long a lunar day lasts.

**How it works**

The page is plain HTML, CSS and JavaScript with no framework and no server.
It opens from a file and works with no network connection. Sun and Moon
positions come from Astronomy Engine, with the Moon's orientation from the
IAU 2009 rotation model. Our code turns those into height and compass
direction for an observer standing on the Moon.

Within 17 degrees of either pole the horizon is a skyline worked out from
NASA's LOLA polar elevation grids (LDEM_60S_240M and LDEM_60N_240M): the
height of the ground in 720 compass directions out to 200 km, seen from 2 m
above the surface. The listed polar sites use the full 240 m grid, computed
ahead of time. Any other polar point uses a 960 m grid, computed in the
browser in about 20 milliseconds. The Sun or the Earth counts as up when it
stands higher than the ground in its direction. Farther from the poles the
horizon is flat, because there the Sun crosses it steeply and a ridge moves
sunrise by hours, not days.

Solar energy is the sunlight that reaches one square metre facing the Sun:
1,361 W per square metre at the Earth's distance, scaled for the Sun's
distance that day and for the share of the Sun's disk above the skyline.

The 3D Moon is our own WebGL code with no library behind it: a sphere shaded
from the NASA colour mosaic and from ground slopes worked out of the laser
altimeter heights.

**How we know the numbers are right**

Positions. The tests compare the tool with tables saved from NASA JPL
Horizons: 852 time steps at four places on the Moon. The largest difference
in Sun or Earth position is 0.0073 degrees, and with a flat horizon the sunset
time at the IM-1 site differs by 4 seconds. The Sun direction that lights the
3D Moon is tested over 278 more time steps, with a largest difference of
0.0067 degrees.

Terrain. The skyline code gives the known answer on made-up terrain (flat
ground, a wall, a bowl), and on the real grid it agrees with a second
calculation written in Python within 0.05 degrees over 2,160 directions at
three sites. The grid puts the IM-1 site 2,588 m up, where NASA gives 2,579 m.
The floor of Shackleton crater, a place in permanent shadow, gets no sunlight
in the tool. Mazarico and others (2011) report a point near the Shackleton rim
that is sunlit for most of the year; our rim point reads 87% over 2024.

All 39 tests run with one command, `node --test`, and nothing to install.

**What it leaves out**

Terrain is used within 17 degrees of a pole, and the horizon is flat
elsewhere. The 240 m and 960 m grids smooth narrow ridges and small craters:
at the IM-1 site the two give first sunsets 4 hours apart, and on a narrow
peak the coarse grid can understate sunlight by a quarter of the year. The
lander is a point 2 m above the ground with no tilt. The energy figure is
sunlight arriving, not electricity: panel angle, efficiency, temperature and
dust are not modelled. "Earth in view" means the centre of the Earth's disk
clears the skyline, with no antenna, ground station or data rate. The page
says all of this beside the numbers. The 3D Moon is a picture and no number
comes from it.

**What comes next**

The 5 m LOLA grids that NASA Goddard publishes for south pole landing sites,
so the nearest ridges are exact. Solar panel tilt and an antenna model.
Landing sites from other countries' lunar programs.

**Tools**

HTML, CSS, JavaScript, WebGL 2, Node.js test runner, Python with NumPy and
Pillow for the data scripts, Astronomy Engine 2.1.19, Mona Sans typeface.

**Source code**

`[paste the public repository link]`. License: `[the license the team picked]`.

## 6. Use of SI (AI)

We used one AI coding tool, Claude Code (Anthropic, model Claude Fable 5.2).

The idea is the team's: pick a landing site and a time, see where the Sun and
the Earth are, and compare two scenarios. The comparison of sites and dates
comes from the challenge statement.

What the team decided `[team: edit this list so every line is true, and add who checked which numbers]`:

- The challenge, and the idea of comparing two scenarios side by side.
- To make a new build during the event.
- That the first design looked machine-made, and that the page should be
  rebuilt from published design references.
- Which past Space Apps winners to study before writing the slides.
- What to deliver: the live tool, seven slides, a short video and this page.
- To ask where the project could lose, and then to add the terrain skyline and
  the energy figure in answer.

Under the team's direction the tool wrote the code, the tests, the
documentation, the slides and the first draft of this page. It read the Space
Apps guides, downloaded reference tables from NASA JPL Horizons, downloaded
and converted NASA's Moon maps and LOLA elevation grids, and looked at
published websites for design reference. A web capture service, Firecrawl,
took screenshots of those reference sites and read two NASA pages and one
paper abstract.

How it is labelled: every AI-written file starts with an "SI disclosure"
comment, the page and the slides carry a `generator` tag in their metadata,
commits made with the tool carry a `Co-Authored-By: Claude` line, and the file
`SI_USE.md` in the repository logs each session with times and files.

No AI-generated images, video or audio are in the project. The Moon on the
page and in the slides is NASA imagery drawn by code. The demo video is
screenshots of the page joined by a script the tool wrote, and its last card
says so. Nothing uses NASA logos, flags or mission identifiers.

## 7. NASA data

- LOLA Gridded Data Records, polar products LDEM_60S_240M and LDEM_60N_240M
  (Lunar Orbiter Laser Altimeter on the Lunar Reconnaissance Orbiter), NASA
  Planetary Data System Geosciences Node. The terrain behind every skyline.
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
