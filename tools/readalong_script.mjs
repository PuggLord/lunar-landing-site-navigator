/*
 * The script for the read-along video. Edit the words here, then run
 * tools/record_readalong.mjs to make the video and docs/READ_ALONG.md again.
 *
 * SI disclosure: this file was drafted with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for
 * team Ksig UNT to check and put in their own words. See SI_USE.md.
 *
 * Each block is one reader's turn over one scene. Each entry in `lines` is
 * one line on screen, so keep a line under about 64 characters. The figures
 * were read from the tool on Nov 14, 2026. Read them again if the code changes.
 * The recorder ties what is outlined on screen to line numbers, so if you add
 * or remove a line, check the scene in tools/record_readalong.mjs.
 */

/* The label shown above each turn. */
export const READERS = { 1: 'Caden', 2: 'Jeremey' };

export const BLOCKS = [
  { who: 1, scene: 'title', lines: [
    "Hi, we're team Ksig UNT.",
    'This is our project, Lunar Landing Site Navigator.',
    'Say a Moon landing slips two weeks, or the site gets moved.',
    'Near the south pole, that can mean no sunlight,',
    'or no view of the Earth.',
    'Our tool lets you check.'
  ] },
  { who: 2, scene: 'compare', lines: [
    'You start with two scenarios.',
    'Each one is a spot on the Moon and a start time.',
    'A is where the IM-1 lander came down.',
    'B is the site planned for IM-2, 175 km away.',
    'The big sentence on the left is the result.',
    'B loses the Sun first, 23 hours before A.',
    'B also loses the Earth after 9 days.',
    'A can see the Earth for all 90.'
  ] },
  { who: 1, scene: 'play', lines: [
    'The Moon on screen is NASA imagery.',
    "We light it from the Sun's real position",
    'for the time you picked.',
    'Hit Play and the 90 days run forward.',
    'The orange bars by the slider show when the Sun is up.',
    'Top bar is site A, bottom bar is B.',
    "The numbers don't come from this picture.",
    'We calculate them on their own.'
  ] },
  { who: 2, scene: 'charts', lines: [
    'Scroll down and you get the view from each site.',
    'Left to right is compass direction, and up is height.',
    "The grey shape is the ground. It's the real skyline at that site.",
    "It comes from NASA's LOLA data, laser height readings from orbit.",
    "When the Sun is above the grey, it's up.",
    'The chart underneath tracks that over the whole 90 days.'
  ] },
  { who: 1, scene: 'shackleton', lines: [
    'This is why we added the terrain.',
    'These two points are at Shackleton crater, at the south pole.',
    "They're 10 km apart.",
    'Over 90 days, the rim gets sunlight 91 percent of the time.',
    'The floor gets zero.',
    'Turn the terrain off, and the tool says 53 and 47 percent.',
    "Without the terrain, you'd get the wrong answer."
  ] },
  { who: 2, scene: 'map', lines: [
    'That gave us an idea.',
    'We ran the same sunlight check on 50,000 patches of ground',
    'around the south pole, hour by hour, for a year.',
    'Black means no Sun at all. Yellow means Sun nearly all year.',
    'The brightest point gets Sun 91 percent of the year.',
    'A 2011 study of NASA data names the same spot.',
    'Ours is 136 metres from theirs.',
    'One click puts a landing site there.'
  ] },
  { who: 1, scene: 'late', lines: [
    'You can also compare two dates at the same site.',
    'Say you land at the IM-1 site on its real landing day.',
    'You get 8 days and 15 hours of Sun before it sets.',
    'Now land two weeks late.',
    'You land in the dark, and sunrise is 12 days and 2 hours away.'
  ] },
  { who: 2, scene: 'energy', lines: [
    'The table has the rest of the numbers.',
    'This row is solar energy, how much sunlight hits a panel',
    'that stays pointed at the Sun.',
    'And this row is the longest stretch with no Sun.',
    "At the IM-1 site that's 18 days and 14 hours.",
    'A battery would have to last that long.'
  ] },
  { who: 1, scene: 'checks', lines: [
    'We checked the numbers a few ways.',
    "We compared our Sun and Earth positions with NASA's JPL Horizons.",
    'The biggest difference was 0.0073 degrees.',
    'A second version of the skyline code, in Python,',
    'gives the same result within 0.05 degrees.',
    'There are 44 tests, and one command runs them all.'
  ] },
  { who: 2, scene: 'limits', lines: [
    "Here's what it doesn't do.",
    "It doesn't model the solar panels or the antenna.",
    'And the terrain data is too coarse to show small craters.',
    'We used an AI coding tool, Claude Code, to write the code.',
    'The idea was ours, and we told it what to build.'
  ] },
  { who: 1, scene: 'close', lines: [
    "It's for a mission planner who needs a quick first answer",
    'when a date or a site changes.',
    "It runs in a browser. There's nothing to install.",
    'Thanks for watching.'
  ] }
];

/*
 * The 30-second version, one turn each. The recorder refuses to run if this
 * goes over 30 seconds, because a longer video cannot be the Space Apps demo.
 */
export const SHORT_BLOCKS = [
  { who: 1, scene: 'short1', lines: [
    "Hi, we're team Ksig UNT.",
    'Our tool compares two Moon landing sites or dates.',
    'B loses the Sun 23 hours before A.'
  ] },
  { who: 2, scene: 'shortmap', lines: [
    'The skyline is real NASA terrain.',
    'So we mapped a year of sunlight at the south pole.',
    'The brightest point gets Sun 91 percent of the year.',
    'A 2011 study of NASA data names that spot.'
  ] }
];

/*
 * How many syllables a reader says for a word that is not spelled the way it
 * sounds. The timing of the underline uses these.
 */
export const SAY = {
  'IM-1': 3, 'IM-2': 3, 'NASA': 2, "NASA's": 3, 'LOLA': 2, 'JPL': 3, 'UNT': 3, 'AI': 2, 'Ksig': 2, 'km': 4,
  '175': 6, '0.0073': 8, '0.05': 5, '90': 2, '91': 3, '53': 3, '47': 4, '44': 3, '23': 3,
  '50,000': 4, '2011': 5, '136': 6,
  '18': 2, '15': 2, '14': 2, '12': 1, '10': 1, '9': 1, '8': 1, '2': 1
};
