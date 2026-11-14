<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->

# Pitch scripts

Judges read the project page after submissions close, so these scripts are for a recorded introduction or a conversation at a check-in. We read the figures from the tool on Nov 14, 2026. Read them again from the page if the code changes, and put the lines in your own words before saying them.

## 60-second script (about 150 spoken words)

[Speaker 1] Say a launch slips two weeks, or the landing site moves 175 km. Does the lander still have sunlight? Can it still see Earth? The data to answer that is public, but you pull it one site and one date at a time and compare by hand.

On screen: the Moon turning slowly, with the title.

[Speaker 2] Our tool, Lunar Landing Site Navigator, takes two scenarios and compares them for you. Here A is the IM-1 landing site and B is the planned IM-2 site. At B the Earth sets after 9 days, and the sentence at the top says so.

On screen: scenario A at the IM-1 site, scenario B at the planned IM-2 site, the same day, 90 days ahead, and the headline sentence.

[Speaker 1] We checked the positions against NASA JPL Horizons. The largest difference was 0.0073 degrees.

On screen: the numbers table with both sites.

[Speaker 2] Near the poles the horizon is the real skyline, built from NASA LOLA terrain. On the rim of Shackleton crater the Sun is up 91% of the time over 90 days. On the floor, 10 km away, it doesn't rise at all. The energy number is sunlight reaching a panel that follows the Sun, before any losses.

On screen: the Shackleton case in the charts, then the energy row in the table.

[Speaker 1] It gives a planner a first answer in about a minute, before the full terrain study.

On screen: the title and the project page link.

## 3-minute script (about 420 spoken words)

[Speaker 1] Say a launch slips two weeks, or the landing site moves 175 km. Does the lander still have sunlight? Can it still see Earth? The data to answer that is public, in JPL Horizons, Quickmap and Moon Trek, but you pull it one site and one date at a time and compare by hand.

On screen: the Moon turning slowly, with the title.

[Speaker 2] Lunar Landing Site Navigator takes two scenarios and compares them. Here A is the IM-1 landing site and B is the planned IM-2 site, starting the same day. At B the Earth sets after 9 days, and the longest stretch without it is 5 d 17 h. The sentence at the top says which scenario loses the Sun or the Earth first, and by how long.

On screen: scenario A at the IM-1 site, scenario B at the planned IM-2 site, the same day, 90 days ahead. Then the headline sentence.

[Speaker 1] The 3D Moon is lit from the Sun's real direction at the time you chose. Press Play and the day and night line moves across it while the charts keep up. The globe is only a picture. We calculate the numbers separately.

On screen: the globe lit at the chosen time, then Play running, with the day and night line moving.

[Speaker 2] Our first version used a flat horizon, and at the poles that was wrong. Now the horizon near the poles comes from NASA LOLA laser terrain, at 240 m a pixel for the sites in our list and 960 m for any other point. At Shackleton the floor gets no sunlight in 90 days. The rim, 10 km away, gets 1,974 hours, which is 91% of the time. Switch Horizon to Flat and the floor reads 47% lit, so you can see what the terrain data changes.

On screen: the Horizon switch set to LOLA, the skyline in the view chart, then the Shackleton case with the rim and floor figures.

[Speaker 1] The energy number is sunlight reaching a panel that turns to follow the Sun, in kilowatt hours per square metre. It comes before panel tilt, efficiency and dust, so delivered electricity would be lower. We also report the longest dark stretch. At the IM-1 site that is 18 d 14 h, and a battery would have to cover it.

On screen: the energy row, then the longest-gap row in the numbers table.

[Speaker 2] For accuracy, the Sun and Earth positions match NASA JPL Horizons over 852 time steps at four places, with a largest difference of 0.0073 degrees. With a flat horizon the IM-1 sunset is 4 seconds from the Horizons time. The skyline code agrees with a second version in Python within 0.05 degrees. There are 39 tests, and they run on any laptop with Node installed.

On screen: the "What the numbers assume" section, with the 0.0073 figure in view.

[Speaker 1] The limits are written on the page. The grid smooths narrow peaks and small craters. We treat the lander as a point 2 metres above the ground with no tilt. Earth in view means the centre of its disk is above the skyline, with no antenna or data rate.

On screen: the "The horizon" and "Energy, and Earth in view" notes.

[Speaker 2] The tool is for a planner who needs an answer in about a minute, before a terrain study starts. The code and the tests are in the repository, and anyone can rerun them.

On screen: the title, the project page link, and the repository link.

## If asked

These are the five questions we think are most likely. Each has a full answer in `docs/FAQ.md`.

- What does this do that Quickmap, Moon Trek and JPL Horizons do not?
- Where do the Sun and Earth positions come from, and why should a judge trust them?
- Why 200 km?
- How is the energy number computed, and what does it leave out?
- What is the biggest weakness?
