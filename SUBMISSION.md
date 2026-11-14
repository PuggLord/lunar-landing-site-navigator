# Submission page copy

Drafts for the eight fields on the Space Apps project page. Drafted with an AI
coding tool (Claude Code) from the project's own files and test results, for
the team to edit before pasting. See SI_USE.md.

Deadline: Sunday Nov 15, 2026, 11:59 p.m. Central. Both links must open with
no login. The demo is either seven slides or a video of 30 seconds or less;
going over either limit takes the project out of Global Judging.

Still to fill in by the team: the two links, and the license line once the
team has picked one.

---

## 1. Project name

Lunar Landing Site Navigator

## 2. High-level summary

Lunar Landing Site Navigator compares two landing scenarios on the Moon: two
sites on the same date, or one site on two dates. For each it works out where
the Sun and the Earth sit above the local horizon, and it writes the result as
a sentence: which scenario loses the Sun or the Earth first, and by how long.

Mission schedules slip and landing sites move. Near the south pole the Sun and
the Earth both stay within a few degrees of the horizon, so a two-week delay or
a site 175 km away can leave a lander without power or without a direct radio
link for days. The existing tools hold this data, and each answers one site and
one date at a time. Ours puts two side by side.

A 3D Moon built from NASA Lunar Reconnaissance Orbiter imagery shows both sites
lit from the Sun's real direction. Press Play and the line between day and
night crosses the Moon while the charts follow. Every number is tested against
NASA JPL Horizons; the largest difference we found is 0.0073 degrees.

## 3. Link to project demo

`[paste the public link to deck/Lunar-Landing-Site-Navigator.pdf, seven slides]`

## 4. Link to final project

`[paste the public link to the live page; the source code link goes in the description below]`

## 5. Detailed project description

**What it does**

You pick scenario A and scenario B. Each is a place on the Moon and a start
time. The place comes from a list of six landing sites with sourced
coordinates (IM-1 Odysseus, the planned IM-2 site, the Blue Ghost Mission 1
landing region, Apollo 11, 15 and 17), from typed latitude and longitude, or
from a click on the 3D Moon.

The page then shows, for both scenarios together:

- A headline sentence with the result, for example "B loses sight of the Earth
  in 8 d. A keeps it for at least the next 90 days."
- A table of the numbers a planner asks for: Sun and Earth height and compass
  direction at the chosen time, time to the next sunset and Earthset, hours of
  sunlight, hours of Earth visibility, and hours with both, over a look-ahead
  period of 3, 14, 30 or 90 days.
- A view out from each site, with the path of the Sun and the Earth across the
  horizon.
- A timeline of height above the horizon for the whole period, with bars that
  mark when the Sun is up, when the Earth is up, and when both are.
- A 3D Moon with both sites marked, lit from the Sun's real direction. Play
  runs the period forward. Drag turns the Moon, and a click moves a site.

Three worked cases load with one click and show why this matters:

- Move the site 175 km, from the IM-1 landing site to the planned IM-2 site.
  At the first the Earth never sets in 90 days. At the second it sets after 8
  days and is in view 74% of the time.
- Land two weeks late at the IM-1 site. On landing day the Sun stays up for
  9 d 8 h. Fourteen days later the lander arrives in the dark and waits
  9 d 10 h for sunrise.
- Set the pole beside Apollo 11. At the Apollo 11 site the Sun stands 86° up.
  At the IM-1 site it is 10.5° up, and the Earth stays between 3° and 16°.

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
direction for an observer standing on the Moon, finds the horizon crossings,
and builds the timelines. The 3D Moon is our own WebGL code with no library
behind it: a sphere shaded from the NASA colour mosaic and from ground slopes
worked out of the laser altimeter heights.

**How we know the numbers are right**

The tests compare the tool with tables saved from NASA JPL Horizons: 1,032
time steps at four places on the Moon. The largest difference in Sun or Earth
position is 0.0073 degrees, and the sunset time at the IM-1 site differs by 4
seconds. The Sun direction that lights the 3D Moon is tested over 278 more
time steps, with a largest difference of 0.0067 degrees. All 14 tests run with
one command, `node --test`, and nothing to install.

**What it leaves out**

The horizon is flat and the Moon is a smooth sphere of radius 1737.4 km.
Hills, crater rims, lander tilt, solar panel angle and antenna pointing are
not modelled, and the page says so beside the numbers. Near the pole a ridge a
few degrees high can hide the Sun or the Earth for days, so the page tells the
reader to check the terrain for anything under about 5 degrees. The 3D Moon is
a picture and no number comes from it.

**What comes next**

A real horizon for each site from the laser altimeter terrain, so that polar
sunrise and Earthset times account for ridges. Landing sites from other
countries' lunar programs. Solar panel tilt.

**Tools**

HTML, CSS, JavaScript, WebGL 2, Node.js test runner, Python for the data
scripts, Astronomy Engine 2.1.19, Mona Sans typeface.

**Source code**

`[paste the public repository link]`. License: `[the license the team picked]`.

## 6. Use of SI (AI)

We used one AI coding tool, Claude Code (Anthropic, model Claude Fable 5.2).

The idea is the team's: pick a landing site and a time, see where the Sun and
the Earth are, and compare two scenarios. The comparison of sites and dates
comes from the challenge statement.

Under the team's direction the tool wrote the code, the tests, the
documentation, the slides and the first draft of this page. It read the Space
Apps guides, downloaded reference tables from NASA JPL Horizons, converted
NASA's Moon maps, and looked at published websites for design reference. A web
capture service, Firecrawl, took screenshots of those reference sites.

How it is labelled: every AI-written file starts with an "SI disclosure"
comment, the page and the slides carry a `generator` tag in their metadata,
commits made with the tool carry a `Co-Authored-By: Claude` line, and the file
`SI_USE.md` in the repository logs each session with times and files.

No AI-generated images, video or audio are in the project. The Moon on the
page and in the slides is NASA imagery drawn by code. Nothing uses NASA logos,
flags or mission identifiers.

## 7. NASA data

- JPL Horizons System API. Reference positions of the Sun and the Earth for an
  observer on the Moon, and the sub-solar point. Every test compares against
  it. https://ssd.jpl.nasa.gov/api/horizons.api
- CGI Moon Kit, NASA Scientific Visualization Studio. Lunar Reconnaissance
  Orbiter Camera colour mosaic and LOLA laser altimeter elevation, used for
  the 3D Moon. https://svs.gsfc.nasa.gov/4720/
- NASA, "NASA's LRO Images Intuitive Machines' Odysseus Lander". IM-1 resting
  position and landing time.
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
- Mona Sans typeface, copyright 2023 GitHub, SIL Open Font License 1.1.
  https://github.com/github/mona-sans
- Design references, layout and type ideas only, with no code, text or image
  taken: earth.nullschool.net, vastspace.com, app.shadowmap.org.
- The full list, with what each source was used for and the date we checked
  it, is in `SOURCES.md` in the repository.
