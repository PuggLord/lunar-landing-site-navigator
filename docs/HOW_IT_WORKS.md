<!-- SI disclosure: drafted with an AI coding tool (Claude Code, Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for team Ksig UNT to check and edit. See SI_USE.md. -->

# How the Lunar Landing Site Navigator works

This page follows the calculation in the order the code runs it. Each step gives the question it answers, the formula, and the function that does the work. The engine is `src/lunar-sky.js`. It exports nine functions (`skyAt`, `subPoints`, `nextCrossing`, `timeline`, `visibilityHours`, `solarIrradiance`, `diskFraction`, `solarEnergy`, `longestGap`) and three constants (`MOON_RADIUS_KM`, `AU_KM`, `SOLAR_CONSTANT_W_M2`). The other helpers are private to the file. The terrain code is in `src/terrain.js`, and its build script is `tools/build_terrain.py`.

The engine runs in the browser and in Node. In the page it sets a global named `LunarSky`. In the tests it uses `module.exports`, so the same code produces the numbers that the tests check.

The maths needs four ideas. A vector has three components. The dot product `a . b` measures how far one vector points along another. The cross product `a x b` gives a vector at right angles to both. The inverse trigonometric functions `asin` and `atan2` turn ratios into angles. The public functions return degrees, and the formulas below work in radians.

## 1. Where the Sun and the Earth are

The first question is where the Sun and the Earth are, measured from the centre of the Moon, at one instant.

```
sun_from_moon   = (sun_geo - moon_geo) * KM_PER_AU
earth_from_moon = -moon_geo * KM_PER_AU
```

`sun_geo` and `moon_geo` are vectors from the centre of the Earth, in astronomical units. Astronomy Engine supplies them through `Astronomy.GeoMoon` and `Astronomy.GeoVector(Astronomy.Body.Sun, time, false)`. The `false` switches off aberration. The positions are geometric, with no light-time correction. The file header puts that effect below 0.01 degrees.

Function: `bodiesMoonFixed(date)` in `src/lunar-sky.js`. It returns the Sun and Earth vectors already turned into the Moon-fixed frame of step 2.

## 2. Turning the Moon so the axes stay on its surface

The Moon turns once per sidereal month, about 27.3 days. A direction on the surface only means something after that turn is removed. The frame has its z axis through the north pole and its x axis through the prime meridian on the equator.

```
z     = pole direction from Astronomy.RotationAxis(Body.Moon, time)
alpha = 15 * ra_hours                      (RA arrives in hours, converted to degrees)
node  = (-sin alpha, cos alpha, 0)
m     = z x node
x     = node * cos(spin) + m * sin(spin)   (spin is the prime meridian angle)
y     = z x x
moon_fixed(v) = (v . x, v . y, v . z)
```

Functions: `moonFrame(time)` builds the three axes from the IAU 2009 pole and spin that Astronomy Engine supplies. `toMoonFixed(frame, v)` takes the three dot products. Both are private to `src/lunar-sky.js`.

`subPoints(date)` uses the same frame. It returns the latitude and longitude of the sub-solar and sub-Earth points, and a unit direction vector for each. The page passes that direction to the 3D Moon, which lights its surface along it.

## 3. The site's up, north and east

The second question is which way is up, north and east at the site. These three are perpendicular unit vectors. The site sits at radius R from the Moon's centre.

```
R        = 1737.4 + elevation_km
up       = (cos lat * cos lon, cos lat * sin lon, sin lat)
east     = (-sin lon, cos lon, 0)
north    = (-sin lat * cos lon, -sin lat * sin lon, cos lat)
position = R * up
```

Latitude and longitude are in radians, with east-positive longitude. The Moon is a sphere in this model, so the latitude is the same angle whether it is measured from the centre or from a flattened surface. No flattening term appears.

Function: `siteBasis(site)`, private to `src/lunar-sky.js`. The site height in `elevationKm` is added to the sphere radius.

## 4. Compass direction and height of a body

The third question is where the Sun or the Earth sits in the site's sky: which compass direction, and how far above the flat horizon.

```
v          = body_position - site_position
east_part  = v . east
north_part = v . north
up_part    = v . up
azimuth    = atan2(east_part, north_part)     (0 to 360 degrees, clockwise from north)
elevation  = asin(up_part / |v|)
angular_radius = asin(body_radius / |v|)
```

Function: `azEl(basis, bodyKm, bodyRadiusKm)`, private, called by `skyAt` and `timeline`. The radii are `SUN_RADIUS_KM` (695,700 km) and `EARTH_RADIUS_KM` (6,378.137 km). The result has `azimuthDeg`, `elevationDeg`, `distanceKm` (the distance from the site to the body), `angularRadiusDeg` and `aboveHorizon`. On a flat horizon, `aboveHorizon` is `elevation > 0`, and it tests the centre of the disk only.

## 5. The skyline from terrain

The fourth question is how high the ground rises in each compass direction, as seen from the site. The terrain is the NASA LOLA laser altimeter data from the Lunar Reconnaissance Orbiter. The polar gridded products are LDEM_60S_240M and LDEM_60N_240M from the NASA Planetary Data System. Each pixel covers 240 m, and the heights are measured from a sphere of radius 1737.4 km.

There are two skyline paths, and both use the same geometry.

The build path computes a table for four named places: IM-1, IM-2, and the Shackleton floor and rim. It reads the full 240 m grid. The function is `skyline` in `tools/build_terrain.py`, called through `skyline_bins`. The table is stored in `vendor/site-horizons.js`.

The browser path computes a skyline for any other point poleward of 73 degrees, from a 960 m grid. That grid is 4 by 4 block means of the 240 m data, stored in `vendor/lola-south.js` and `vendor/lola-north.js`. The function is `maskFromGrid(grid, latDeg, lonDeg, opts)` in `src/terrain.js`. Its script loads only when a point needs it.

The skyline is found on 720 directions, one every half degree from north. Each ray runs out to 200 km. The observer stands 2 m above the ground. For a ground point at distance d and height h1:

```
theta = d / R
r0    = R + site_ground_height + 0.002     (km, the observer)
r1    = R + h1                             (km, the ground point)
angle = atan2(r1 * cos(theta) - r0, r1 * sin(theta))
skyline(direction) = largest angle over all ground points on that ray
```

The angle runs from the observer's flat horizontal to the line of sight to the ground point. The largest such angle on a ray is the height of the skyline in that direction.

The two paths differ in three ways. The build walks each ray in steps of 0.1 km and keeps the highest of five sub-rays per half-degree bin, at offsets of minus 0.2, minus 0.1, 0, 0.1 and 0.2 degrees. The browser walks each ray in steps of 2 percent of the distance, at least 0.1 km and at most half a grid cell, and it uses one ray per bin. Both stop a ray where it leaves the grid. The mask records the share of rays that reached 200 km as `coverage`.

A ray with no ground data takes the smooth-sphere dip. On level ground, a 2 m observer sees the horizon about 0.09 degrees below the flat horizontal, at ground about 2.6 km away. The skyline therefore sits below zero even where the terrain is flat.

The choice of path is made in `skylineFor` in `src/app.js`. The Horizon switch set to Flat gives a flat horizon. A point picked from the site list with a precomputed table uses that table. A typed or clicked point poleward of 73 degrees uses the 960 m grid. Anything else, and any point while the grid is still loading, uses the flat horizon. When no site from the list is selected, the point has the id `custom`, and it takes the 960 m path even at the coordinates of IM-1.

## 6. Deciding whether a body is up

The fifth question is whether the body is above whatever hides it in its direction.

The engine keeps two numbers for each body at each sample. `elevationDeg` is the height of the disk centre above the flat plane. `clearDeg` is the height above the skyline in its own direction:

```
clearDeg = elevationDeg - horizon(azimuthDeg)
up       = clearDeg > 0
```

With no skyline, `clearDeg` equals `elevationDeg`. The skyline is a function of azimuth passed in through `options.horizon`. The page builds it with `horizonFn(mask)` from `src/terrain.js`, and `horizonAt(mask, azDeg)` interpolates linearly between the 720 bins and wraps around 360 degrees. In `timeline`, `clearDeg` is filled for both bodies. The page reads `clearDeg` for every "up" decision.

## 7. The moment of sunset or Earthset

The sixth question is when a body next crosses the horizon after a given time. The search is a coarse scan followed by a bisection.

1. From the chosen time, evaluate the clearance every hour, for up to `maxDays` days (60 by default, 90 in the page).
2. At the first hour where the sign changes, halve the one-hour interval. Keep the half where the sign changes, and repeat until the interval is 1000 ms or less.
3. Round the midpoint to the nearest second.

A set is a change from above zero to zero or below. A rise is the reverse.

Function: `nextCrossing(site, body, date, options)`, exported. It uses the private helper `clearance(site, body, ms, horizonDeg, skyline)`. The options are `direction` (`'set'` by default, `'rise'` or `'any'`), `maxDays` (60 by default), `horizonDeg` (0 by default) and `horizon` (the skyline function, optional). The skyline is added to `horizonDeg`. The result holds `utc`, `hoursFromStart` and `direction`, and it returns `null` when no crossing falls inside the window.

The hourly scan can miss a body that rises and sets inside one hour. The bisection assumes one sign change inside each hour. Each call returns only the first crossing, so the next one needs a second call that starts after it.

## 8. Hours of visibility over a period

The seventh question is how many hours, over the look-ahead period, the Sun is up, the Earth is up, and both are up.

```
for each sample i, except the last:
    if sun_clearance[i] > 0            then sunHours   += step
    if earth_clearance[i] > 0          then earthHours += step
    if both are above zero             then bothHours  += step
```

Functions: `timeline(site, start, hours, stepHours, options)` is exported. It returns samples every `stepHours` (1 hour by default), with both ends included. `visibilityHours(site, start, hours, stepHours, options)` is exported. It adds up the hours with a 0.25 hour step by default, and it takes the same `options.horizon` as `timeline`.

Each sample counts the step that starts at it. Each change between up and down can therefore move a total by up to one step. The page draws its bars from the same samples with `visibility` in `src/charts.js`.

## 9. Solar energy

The eighth question is how much sunlight reaches a panel that turns to follow the Sun, over the look-ahead period.

```
S        = 1361 * (AU_KM / d_sun)^2              W per m^2
radius   = asin(695700 / d_sun)                  Sun's angular radius, degrees
f        = diskFraction(margin, radius)
         = 0.5 + (x * sqrt(1 - x^2) + asin(x)) / pi,   x = margin / radius, limited to -1..1
P_i      = S * f_i                               W per m^2, at sample i
E        = sum over i of (P_i + P_(i+1)) / 2 * (t_(i+1) - t_i) / 1000     kWh per m^2
```

`margin` is the Sun's clearance, which is `clearDeg` from step 6. The constant 1361 W/m^2 is the solar irradiance at 1 AU. `solarIrradiance(distanceKm)` scales it by the inverse square of the distance. `d_sun` is the distance from the site to the Sun's centre, which `azEl` reports as `distanceKm`. It differs from the Moon-to-Sun distance by less than the Moon's own radius, which is a negligible amount next to 1 AU.

The fraction is the share of the Sun's disk above the skyline. At x = 0 the centre of the disk sits on the skyline and half of it shows. At x = 1 the whole disk shows, and at x = -1 none of it does. `diskFraction(marginDeg, radiusDeg)` returns 1 or 0 beyond those limits.

Function: `solarEnergy(samples)`, exported. It applies the trapezoid rule across the timeline samples, and it returns `kwhPerM2` and `meanWPerM2`. The page calls it on the same samples as step 8. The page takes 720 samples across the window (`SAMPLES` in `src/app.js`), so a 3-day window is sampled every 0.1 hour and a 90-day window every 3 hours.

## 10. The longest gap

The ninth question is the longest unbroken time without the Sun, which is what a battery must cover, and the longest unbroken time without the Earth, which is the longest radio gap.

Function: `longestGap(samples, body)`, exported. A body counts as down at every sample where `clearDeg` is zero or less. The start and end of each run are interpolated linearly between samples. The function returns `hours`, `startHours`, `endHours` and `openEnded`. `openEnded` is true when the run reaches the last sample, so the real gap can be longer than the number shown. The page reads the gaps from the same samples as step 9.

## How we know it is right

The six saved Horizons tables in `reference/horizons/` hold 852 time steps. Four places on the Moon are covered: the IM-1 site (three tables), a point at 84.78 S and 29.13 E, a point at 0.67 N and 23.47 E, and a point at 45 N and 120 W. The last three are labelled test points, chosen to exercise the maths. The 84.78 S point shares the planned IM-2 coordinates. Each row compares the Sun and Earth elevation and azimuth from the engine with the Horizons values. Azimuth errors are multiplied by the cosine of the elevation, so they stay small near the zenith. The largest difference is 0.0073 degrees, and the test tolerance is 0.02 degrees.

The sunset at the IM-1 site falls 4 seconds from the Horizons value, on the flat horizon. The test accepts 10 minutes. Every horizon crossing in the four 6-hour tables is found within 30 minutes. The reference times are interpolated across 6-hour steps, so that allowance covers the coarse spacing of the reference.

The sub-solar and sub-Earth tests use 278 time steps in two saved tables, one for 2024 and one for 2026. The largest separation on the sphere is 0.0067 degrees. The file `test/lunar-sky.test.js` holds 14 tests. `test/terrain.test.js` adds 14 for the skyline, and `test/power.test.js` adds 11 for clearance, energy and gaps, which makes 39. They run with Node's built-in test runner, and the command is in `README.md`.

The build checks the polar grids against the global elevation map used by the 3D Moon, and it writes the results to `reference/terrain/build-report.json`. It samples 300 points in each cap and stops unless the two maps correlate above 0.95. The south grid scores 0.998 and the north 0.989, which rules out a flipped or rotated grid. It also requires the centre of Shackleton to sit at least 2 km below the ground around it, and the grid puts it 3.3 km below.

Made-up terrain with known answers, in `test/terrain.test.js`: flat ground gives the 2 m dip of 0.087 degrees in every direction. A wall to the east raises the skyline to the east by the angle the formula gives, and leaves the west alone. A site at the bottom of a bowl sees ground above it all the way round.

Second calculation: `tools/build_terrain.py` computes skylines for three sites on the 960 m grid with its own Python code and saves them in `reference/terrain/check-960m.json`. The browser code runs on the same grid and the test compares the two. Over 2,160 directions the largest difference is 0.049 degrees and the median is zero.

Shackleton check: over 90 days from Feb 22, 2024 the crater floor gets 0 hours of sunlight and the rim point gets 1,974 hours, 91% of the time. With the flat horizon the floor reads 47%. The floor of Shackleton is in permanent shadow, so zero is the known answer.

IM-1 check: the 240 m grid puts the site 2,588 m above the sphere, and NASA gives 2,579 m. The highest skyline there is 11.2 degrees, from ground 200 m away to the south-east. NASA reports that the lander rests in a degraded crater one kilometre wide where the ground slopes at 12 degrees.

Grid check: the 240 m table and the 960 m browser skyline differ on average by 1.1 degrees at IM-1, 0.1 degrees at IM-2, 0.3 degrees on the Shackleton floor and 1.1 degrees on its rim. That figure mixes two things, the grid size and the ray sampling, because the table takes five sub-rays per bin and the browser takes one. At IM-1 the coarse path moves the first sunset by 4 hours and the sunlit share from 40% to 42%. On the Shackleton rim it matters far more: the 960 m grid flattens the peak by 120 m and the yearly sunlit share falls from 87% to 62%. That is why the listed sites use the 240 m table.

Published work: Mazarico and others (2011) report a point near the Shackleton rim that is sunlit continuously for 240 days a year with about 1.5 days of longest total darkness. Our rim point is a different place on a coarser grid, and over 2024 the tool gives it 87% sunlight and 2.7 days of longest total darkness.

## What it does not model

- Terrain poleward of 73 degrees only. Elsewhere the horizon is flat.
- Grid smoothing: 240 m in the precomputed table, 960 m in the browser, and one ray per half-degree bin in the browser. Narrow peaks and small craters are smoothed out, and a peak that falls between rays can be missed.
- Rays stop where the grid ends, so near the edge of the data a skyline can cover less than 200 km.
- The lander is a point 2 m above the ground, with no tilt.
- Solar panel angle, efficiency, temperature and dust.
- Earth in view means the centre of the disk clears the skyline. No antenna pattern, ground station or data rate is modelled.
- The Moon is a sphere of radius 1737.4 km for the Sun and Earth geometry.
- No atmosphere and no refraction.
- No light-time or aberration correction, which the file header puts below 0.01 degrees.
- A rise and a set inside one hour can be missed by `nextCrossing`.
- The energy and gap figures come from samples spaced at the window length divided by 720, so short features between samples are not seen.
- The 3D Moon is a picture. Its slopes are drawn three times steeper than life, and nothing on it casts a shadow. No number comes from it.
