<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->
<!-- Made by tools/record_readalong.mjs from tools/readalong_script.mjs. Edit the script there and run it again. -->

# Read-along video

`demo/Lunar-Landing-Site-Navigator-read-along.mp4` shows the tool with our script in a band under it. It runs 3:26 and has no sound. We play it, read the script out loud as the underline moves, and record our voices. With the voices added it becomes the long version of our demo.

## How to record

1. Read the script below once, and change any line that is not how you would say it. The words are in `tools/readalong_script.mjs`, and Jake can make the video again after a change.
2. Sit together with one phone between you. Start a voice recording on the phone first.
3. Play the video from the start and leave it running. Do not pause it, because the pauses would put the voices out of step with the picture.
4. Three dots fill before each turn. Start on the first word when it gets its underline, and say each word as the underline reaches it. Words turn grey once they are said, and the next line waits underneath.
5. If someone slips, keep going and finish the take. Then record the whole thing again and keep the better take.
6. Send the audio file to Jake.

## Adding the voices

The first word starts at 2.7 seconds. Trim the recording so its first word lands there, then join the two files:

```
ffmpeg -i demo/Lunar-Landing-Site-Navigator-read-along.mp4 -i voice.m4a -map 0:v -map 1:a -c:v copy -c:a aac -shortest demo/Lunar-Landing-Site-Navigator-narrated.mp4
```

## The script

446 words, about 131 words a minute with the pauses counted. The time beside each turn is when its first word starts.

**Reader 1, 0:02** (the title)

Launch dates slip, and landing sites get moved.  
Near the Moon's south pole, a change like that can decide  
whether a lander has sunlight and can still see the Earth.  
We are team Ksig UNT.  
This is Lunar Landing Site Navigator.

**Reader 2, 0:21** (the first screen, IM-1 against the planned IM-2 site)

You give the tool two scenarios.  
Each one is a place on the Moon and a start time.  
Here, A is the site where the IM-1 lander came down.  
B is the planned IM-2 site, 175 kilometres away.  
The sentence beside the Moon is the answer.  
At B, the Earth sets after 9 days.  
At A, it stays in view for the full 90.

**Reader 1, 0:48** (the Moon, with the 90 days running)

The Moon on screen is NASA imagery.  
Our code lights it from the Sun's real direction  
at the time you picked.  
Press Play, and the 90 days run forward.  
The two bars by the slider show when the Sun is up  
at each site.  
The Moon is a picture. We calculate the numbers separately.

**Reader 2, 1:12** (the view from each site)

Further down is the view from each site.  
Compass direction runs across, and height runs up.  
The grey ground is the real skyline.  
We built it from NASA's LOLA laser altimeter data.  
The Sun or the Earth counts as up  
when it is higher than the ground in its direction.

**Reader 1, 1:33** (Shackleton crater, then the numbers table)

Here is why the terrain matters.  
These two points are at Shackleton crater,  
10 kilometres apart.  
Over 90 days, the rim is in sunlight 91 percent of the time.  
The floor gets none.  
With a flat horizon, the tool gives 53 and 47 percent.

**Reader 2, 1:55** (IM-1 on landing day and two weeks later)

The same check works for dates.  
Land at the IM-1 site on its landing day,  
and the Sun stays up for 8 days and 15 hours.  
Land two weeks later, and you arrive in the dark.  
Sunrise is 12 days and 2 hours away.

**Reader 1, 2:13** (the numbers table)

The table also adds up solar energy.  
That is sunlight reaching a panel that follows the Sun.  
It gives the longest dark stretch too,  
which a battery has to cover.  
At the IM-1 site, that is 18 days and 14 hours.

**Reader 2, 2:32** (the slide with our checks)

We checked the numbers.  
The Sun and Earth positions match NASA's JPL Horizons  
within 0.0073 degrees, over 852 time steps.  
The skyline code agrees with a second version  
written in Python.  
All 39 tests run with one command.

**Reader 1, 2:52** (the notes under the charts, then the foot of the page)

The tool stops at geometry.  
It has no solar panel model and no antenna model,  
and the terrain grid smooths out small craters.  
We built it with an AI coding tool, Claude Code.  
The idea is ours, and we directed the work.

**Reader 2, 3:11** (the last slide)

It gives a mission planner a first answer in about a minute,  
before a full terrain study.  
It opens in a browser, with nothing to install.  
Thank you.  
