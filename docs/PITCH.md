<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->

# Pitch scripts

Judging reads the project page after submissions close, so these scripts suit a recorded introduction or a conversation at a check-in. The figures were read from the tool on Nov 14, 2026. Read them again from the page if the code changes.

## 60-second script (about 140 spoken words)

[Speaker 1] A launch slips two weeks, or the landing site moves 175 km. Does the lander still have sunlight, and a radio link to Earth? Quickmap, Moon Trek and JPL Horizons are hard to use for a quick comparison, so a planner runs each case by hand.

On screen: the Moon turning slowly, the title, and the answer line empty.

[Speaker 2] Lunar Landing Site Navigator puts two scenarios side by side. Here the Earth sets at the planned IM-2 site after 9 days, and the sentence on screen says which scenario loses the Earth first.

On screen: scenario A at the IM-1 site, scenario B at the planned IM-2 site, the same day, 90 days ahead, and the headline sentence.

[Speaker 1] Every position is checked against NASA JPL Horizons. The largest difference is 0.0073 degrees.

On screen: the numbers table with both sites and the test count.

[Speaker 2] Near the poles the horizon is the real skyline, from NASA LOLA terrain. On the rim of Shackleton crater the Sun is up 91% of the time, and on the floor it never rises. The power figure is sunlight on a panel that follows the Sun, not delivered electricity.

On screen: the Shackleton case in the charts, then the energy row in the table.

[Speaker 1] It is for the planner who needs the answer in a minute, before a terrain study.

On screen: the title and the project page link.

## 3-minute script (about 420 spoken words)

[Speaker 1] A launch slips two weeks, or the landing site moves 175 km. Does the lander still have sunlight, and a radio link to Earth? Quickmap, Moon Trek and JPL Horizons are hard to use for a quick comparison, so a planner runs each case by hand.

On screen: the Moon turning slowly, the title, and the answer line empty.

[Speaker 2] Lunar Landing Site Navigator puts two scenarios side by side. Here A is the IM-1 site and B is the planned IM-2 site, on the same day. The Earth sets at B after 9 days, and the longest break in the link lasts 5 d 17 h. The sentence on screen says which scenario loses the Sun or the Earth first, and by how long.

On screen: scenario A at the IM-1 site, scenario B at the planned IM-2 site, the same day, 90 days ahead. Then the headline sentence.

[Speaker 1] The 3D Moon is lit from the Sun's real direction at the chosen time. Press Play and the day and night line crosses the globe while the charts follow. The globe is a picture, and no number comes from it.

On screen: the globe lit at the chosen time, then Play running, with the day and night line moving.

[Speaker 2] Near the poles the horizon now comes from NASA LOLA laser terrain, at 240 m a pixel for the named sites and 960 m elsewhere. A crater rim can hide the Sun from its floor. At Shackleton the floor gets no sunlight in 90 days, and the rim, 10 km away, gets 1,974 hours, 91% of the time. The search stops at 200 km, where the curve of the Moon has already dropped the ground about 11.5 km. Flip the Horizon switch to Flat and the floor reads 47% lit, which is the error the terrain removes.

On screen: the Horizon switch set to LOLA, the skyline silhouette in the panorama chart, then the Shackleton case with the rim and floor figures.

[Speaker 1] The power figure is energy: sunlight that reaches a panel that turns to follow the Sun, in kilowatt hours per square metre over the window. It is not electricity delivered, and it leaves out panel tilt, efficiency, temperature and dust. The longest dark stretch, 18 d 14 h at the IM-1 site, is the time a battery must cover.

On screen: the energy row, then the longest-gap row in the numbers table.

[Speaker 2] The Sun and Earth positions match NASA JPL Horizons over 852 time steps at four places, and the largest difference is 0.0073 degrees. With a flat horizon the IM-1 sunset falls 4 seconds from Horizons. The skyline code agrees with a second calculation in Python within 0.05 degrees. The test suite has 39 tests, and they run on any laptop with Node installed.

On screen: the validation line in the "Read this before trusting a number" section, with the 0.0073 figure highlighted.

[Speaker 1] The limits are stated on the page. The skyline grid smooths narrow peaks and small craters. The lander is a point 2 meters above the ground with no tilt. The solar panel has no angle, efficiency, temperature or dust in the model. The Earth in view means the centre of its disk clears the skyline, with no antenna or data rate.

On screen: the "Which horizon the numbers use" and "What the energy number means" notes.

[Speaker 2] Lunar Landing Site Navigator is for the planner who needs an answer in a minute, before a terrain study starts. The code and the tests are in the repository, and anyone can rerun them.

On screen: the title, the project page link, and the repository link.

## If asked

These are the five questions most likely to come up. Each has a full answer in `docs/FAQ.md`.

- What does this do that Quickmap, Moon Trek and JPL Horizons do not?
- Where do the Sun and Earth positions come from, and why should a judge trust them?
- Why 200 km?
- How is the energy number computed, and what does it leave out?
- What is the biggest weakness?
