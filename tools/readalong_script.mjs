/*
 * The script for the read-along video. Edit the words here, then run
 * tools/record_readalong.mjs to make the video and docs/READ_ALONG.md again.
 *
 * SI disclosure: this file was drafted with an AI coding tool (Claude Code,
 * Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026, for
 * team Ksig UNT to check and put in their own words. See SI_USE.md.
 *
 * Each block is one reader's turn over one scene. Each entry in `lines` is
 * one line on screen, so keep a line under about 62 characters. The figures
 * were read from the tool on Nov 14, 2026. Read them again if the code changes.
 */

/* Put names here in place of "Reader 1" and "Reader 2". */
export const READERS = { 1: 'Reader 1', 2: 'Reader 2' };

export const BLOCKS = [
  { who: 1, scene: 'title', lines: [
    'Launch dates slip, and landing sites get moved.',
    "Near the Moon's south pole, a change like that can decide",
    'whether a lander has sunlight and can still see the Earth.',
    'We are team Ksig UNT.',
    'This is Lunar Landing Site Navigator.'
  ] },
  { who: 2, scene: 'compare', lines: [
    'You give the tool two scenarios.',
    'Each one is a place on the Moon and a start time.',
    'Here, A is the site where the IM-1 lander came down.',
    'B is the planned IM-2 site, 175 kilometres away.',
    'The sentence beside the Moon is the answer.',
    'At B, the Earth sets after 9 days.',
    'At A, it stays in view for the full 90.'
  ] },
  { who: 1, scene: 'play', lines: [
    'The Moon on screen is NASA imagery.',
    "Our code lights it from the Sun's real direction",
    'at the time you picked.',
    'Press Play, and the 90 days run forward.',
    'The two bars by the slider show when the Sun is up',
    'at each site.',
    'The Moon is a picture. We calculate the numbers separately.'
  ] },
  { who: 2, scene: 'charts', lines: [
    'Further down is the view from each site.',
    'Compass direction runs across, and height runs up.',
    'The grey ground is the real skyline.',
    "We built it from NASA's LOLA laser altimeter data.",
    'The Sun or the Earth counts as up',
    'when it is higher than the ground in its direction.'
  ] },
  { who: 1, scene: 'shackleton', lines: [
    'Here is why the terrain matters.',
    'These two points are at Shackleton crater,',
    '10 kilometres apart.',
    'Over 90 days, the rim is in sunlight 91 percent of the time.',
    'The floor gets none.',
    'With a flat horizon, the tool gives 53 and 47 percent.'
  ] },
  { who: 2, scene: 'late', lines: [
    'The same check works for dates.',
    'Land at the IM-1 site on its landing day,',
    'and the Sun stays up for 8 days and 15 hours.',
    'Land two weeks later, and you arrive in the dark.',
    'Sunrise is 12 days and 2 hours away.'
  ] },
  { who: 1, scene: 'energy', lines: [
    'The table also adds up solar energy.',
    'That is sunlight reaching a panel that follows the Sun.',
    'It gives the longest dark stretch too,',
    'which a battery has to cover.',
    'At the IM-1 site, that is 18 days and 14 hours.'
  ] },
  { who: 2, scene: 'checks', lines: [
    'We checked the numbers.',
    "The Sun and Earth positions match NASA's JPL Horizons",
    'within 0.0073 degrees, over 852 time steps.',
    'The skyline code agrees with a second version',
    'written in Python.',
    'All 39 tests run with one command.'
  ] },
  { who: 1, scene: 'limits', lines: [
    'The tool stops at geometry.',
    'It has no solar panel model and no antenna model,',
    'and the terrain grid smooths out small craters.',
    'We built it with an AI coding tool, Claude Code.',
    'The idea is ours, and we directed the work.'
  ] },
  { who: 2, scene: 'close', lines: [
    'It gives a mission planner a first answer in about a minute,',
    'before a full terrain study.',
    'It opens in a browser, with nothing to install.',
    'Thank you.'
  ] }
];

/*
 * How many syllables a reader says for a word that is not spelled the way it
 * sounds. The timing of the underline uses these.
 */
export const SAY = {
  'IM-1': 3, 'IM-2': 3, 'NASA': 2, "NASA's": 3, 'LOLA': 2, 'JPL': 3, 'UNT': 3, 'AI': 2, 'Ksig': 2,
  '175': 6, '0.0073': 8, '852': 5, '90': 2, '91': 3, '53': 3, '47': 4, '39': 3,
  '18': 2, '15': 2, '14': 2, '12': 1, '10': 1, '9': 1, '8': 1, '2': 1
};
