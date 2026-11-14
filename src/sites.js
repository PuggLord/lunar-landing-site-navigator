/*
 * sites.js
 * Curated landing sites, and two reference places at Shackleton crater. Every
 * entry carries the page its coordinates came from.
 *
 * SI disclosure: this file was assembled with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
 * directed and reviewed by team Ksig UNT. The coordinates were read from the
 * linked pages on 2026-11-14 and are quoted in SOURCES.md. See SI_USE.md.
 *
 * kind:
 *   'landed'   position measured after landing
 *   'intended' the planned site, not the measured touchdown
 *   'region'   centre of the landing region, not a touchdown point
 *   'place'    a reference place for comparison, not a landing site
 * elevationKm is height above the 1737.4 km reference sphere. It is 0 where
 * the source gives no elevation. For the two Shackleton places it is read
 * from the LOLA 240 m grid by tools/build_terrain.py.
 */
(function (root) {
  'use strict';

  var SITES = [
    {
      id: 'im1',
      name: 'IM-1 Odysseus',
      place: 'near Malapert A, south pole region',
      latDeg: -80.13,
      lonEastDeg: 1.44,
      elevationKm: 2.579,
      kind: 'landed',
      landedUtc: '2024-02-22T23:24',
      sourceName: 'NASA, LRO image of Odysseus (Feb 26, 2024)',
      sourceUrl: 'https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/'
    },
    {
      id: 'im2',
      name: 'IM-2 Athena (intended site)',
      place: 'Mons Mouton, 160 km from the south pole',
      latDeg: -84.78,
      lonEastDeg: 29.13,
      elevationKm: 0,
      kind: 'intended',
      sourceName: 'LROC, IM-2 Landing Region (Feb 26, 2025)',
      sourceUrl: 'https://www.lroc.asu.edu/images/1401'
    },
    {
      id: 'bgm1',
      name: 'Blue Ghost Mission 1 (landing region)',
      place: 'eastern Mare Crisium',
      latDeg: 18.56,
      lonEastDeg: 61.81,
      elevationKm: 0,
      kind: 'region',
      sourceName: 'LROC, Firefly Blue Ghost Landing Region',
      sourceUrl: 'https://www.lroc.asu.edu/images/1400'
    },
    {
      id: 'a11',
      name: 'Apollo 11 Lunar Module',
      place: 'Mare Tranquillitatis',
      latDeg: 0.67416,
      lonEastDeg: 23.47314,
      elevationKm: 0,
      kind: 'landed',
      sourceName: 'NASA NSSDCA, Apollo Landing Site Coordinates',
      sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html'
    },
    {
      id: 'a15',
      name: 'Apollo 15 Lunar Module',
      place: 'Hadley-Apennine',
      latDeg: 26.13239,
      lonEastDeg: 3.6333,
      elevationKm: 0,
      kind: 'landed',
      sourceName: 'NASA NSSDCA, Apollo Landing Site Coordinates',
      sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html'
    },
    {
      id: 'a17',
      name: 'Apollo 17 Lunar Module',
      place: 'Taurus-Littrow',
      latDeg: 20.1911,
      lonEastDeg: 30.7723,
      elevationKm: 0,
      kind: 'landed',
      sourceName: 'NASA NSSDCA, Apollo Landing Site Coordinates',
      sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html'
    },
    {
      id: 'shackleton-floor',
      name: 'Shackleton crater, floor',
      place: 'centre of Shackleton crater, 10 km from the south pole',
      latDeg: -89.67,
      lonEastDeg: 129.78,
      elevationKm: -2.786,
      kind: 'place',
      sourceName: 'USGS Gazetteer of Planetary Nomenclature, Shackleton',
      sourceUrl: 'https://planetarynames.wr.usgs.gov/Feature/5450'
    },
    {
      id: 'shackleton-rim',
      name: 'Shackleton crater, rim',
      place: 'the highest point of the LOLA 240 m grid within 14 km of the crater centre',
      latDeg: -89.7786,
      lonEastDeg: -155.7256,
      elevationKm: 1.735,
      kind: 'place',
      sourceName: 'NASA Planetary Data System, LOLA Gridded Data Records',
      sourceUrl: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/'
    }
  ];

  var KIND_NOTE = {
    landed: 'Position measured after landing.',
    intended: 'Planned site, not the measured touchdown.',
    region: 'Centre of the landing region, not a touchdown point.',
    place: 'A reference place for comparison, not a landing site.'
  };

  var api = { SITES: SITES, KIND_NOTE: KIND_NOTE };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LunarSites = api;
})(typeof self !== 'undefined' ? self : this);
