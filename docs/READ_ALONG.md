<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->
<!-- Made by tools/record_readalong.mjs from tools/readalong_script.mjs. Edit the script there and run it again. -->

# Read-along video

`demo/Lunar-Landing-Site-Navigator-read-along.mp4` shows the tool with our script in a band under it. It runs 3:56 and has no sound. We play it, read the script out loud as the underline moves, and record our voices. With the voices added it becomes the long version of our demo.

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

531 words, about 137 words a minute with the pauses counted. The time beside each turn is when its first word starts.

**Reader 1, 0:02** (the title)

Hi, we're team Ksig UNT.  
This is our project, Lunar Landing Site Navigator.  
Say a Moon landing slips two weeks, or the site gets moved.  
Near the south pole, that can mean no sunlight,  
or no view of the Earth.  
Our tool lets you check.

**Reader 2, 0:22** (the first screen, IM-1 against the planned IM-2 site)

You start with two scenarios.  
Each one is a spot on the Moon and a start time.  
A is where the IM-1 lander came down.  
B is the site planned for IM-2, 175 km away.  
The big sentence on the left is the result.  
B loses the Sun first, 23 hours before A.  
B also loses the Earth after 9 days.  
A can see the Earth for all 90.

**Reader 1, 0:52** (the Moon, with the 90 days running)

The Moon on screen is NASA imagery.  
We light it from the Sun's real position  
for the time you picked.  
Hit Play and the 90 days run forward.  
The orange bars by the slider show when the Sun is up.  
Top bar is site A, bottom bar is B.  
The numbers don't come from this picture.  
We calculate them on their own.

**Reader 2, 1:18** (the view from each site)

Scroll down and you get the view from each site.  
Left to right is compass direction, and up is height.  
The grey shape is the ground. It's the real skyline at that site.  
It comes from NASA's LOLA data, laser height readings from orbit.  
When the Sun is above the grey, it's up.  
The chart underneath tracks that over the whole 90 days.

**Reader 1, 1:45** (Shackleton crater, then the numbers table)

This is why we added the terrain.  
These two points are at Shackleton crater, at the south pole.  
They're 10 km apart.  
Over 90 days, the rim gets sunlight 91 percent of the time.  
The floor gets zero.  
Turn the terrain off, and the tool says 53 and 47 percent.  
Without the terrain, you'd get the wrong answer.

**Reader 2, 2:11** (IM-1 on landing day and two weeks later)

You can also compare two dates at the same site.  
Say you land at the IM-1 site on its real landing day.  
You get 8 days and 15 hours of Sun before it sets.  
Now land two weeks late.  
You land in the dark, and sunrise is 12 days and 2 hours away.

**Reader 1, 2:33** (the numbers table)

The table has the rest of the numbers.  
This row is solar energy, how much sunlight hits a panel  
that stays pointed at the Sun.  
And this row is the longest stretch with no Sun.  
At the IM-1 site that's 18 days and 14 hours.  
A battery would have to last that long.

**Reader 2, 2:55** (the slide with our checks)

We checked the numbers a few ways.  
We compared our Sun and Earth positions with NASA's JPL Horizons.  
The biggest difference was 0.0073 degrees.  
A second version of the skyline code, in Python,  
gives the same result within 0.05 degrees.  
There are 39 tests, and one command runs them all.

**Reader 1, 3:20** (the notes under the charts, then the foot of the page)

Here's what it doesn't do.  
It doesn't model the solar panels or the antenna.  
And the terrain data is too coarse to show small craters.  
We used an AI coding tool, Claude Code, to write the code.  
The idea was ours, and we told it what to build.

**Reader 2, 3:40** (the last slide)

It's for a mission planner who needs a quick first answer  
when a date or a site changes.  
It runs in a browser. There's nothing to install.  
Thanks for watching.  
