// The script and its timing: shared by film.js (browser), make-voice.py and make-audio.js (node).
// With a real voice (voice/words.json from make-voice.py) every word gets its spoken time; otherwise ~4 words a second.
(function (root) {
  'use strict';
  const LINES = [
    { id: 'hook',   text: "It's forty five degrees out here, but inside this house it's cool, with no air conditioning. The secret is this tower.", pause: 0.5 },
    { id: 'house',  text: 'So we start with a house of thick mud brick.' },
    { id: 'hot',    text: "But inside, the air is hot and doesn't move." },
    { id: 'tower',  text: 'So we build a tall tower on the roof.' },
    { id: 'closed', text: 'But a closed tower does nothing.' },
    { id: 'open',   text: 'So we cut openings at the top, facing the wind.' },
    { id: 'down',   text: 'The wind hits the tower and gets pushed down into the house.' },
    { id: 'still',  text: 'But that wind is hot too.' },
    { id: 'water',  text: 'So we run a channel of water under the floor.' },
    { id: 'cool',   text: 'The air passes over the cold water and cools down.', pause: 0.3 },
    { id: 'stuck',  text: 'But the warm air inside has nowhere to go.' },
    { id: 'vent',   text: 'So we open a vent on the other side, and the hot air rises out.' },
    { id: 'loop',   text: 'Now cool air flows in and hot air flows out, all day long.', pause: 0.3 },
    { id: 'fact',   text: 'Fun fact: in Iran, towers like this have cooled homes for hundreds of years.', pause: 0.3 },
    { id: 'payoff', text: 'No power. No machines.', pause: 0.3 },
    { id: 'end',    text: 'Just a tower, the wind, and water.' },
  ];
  // words shown in the key colour
  const KEY = ['forty', 'five', 'degrees', 'cool', 'cools', 'cold', 'secret', 'tower', 'mud', 'hot', 'warm', 'wind', 'openings', 'down',
    'water', 'channel', 'vent', 'rises', 'iran', 'hundreds', 'power', 'machines'];

  const START = 0.4, WPS = 4.0, GAP = 0.15, END_HOLD = 1.4;
  // the whole film plays this much faster (picture and sound); make-audio.js mixes at 1x (TL_RAW=1) and speeds the mix up
  const SPEED = typeof process !== 'undefined' && process.env && process.env.TL_RAW ? 1 : 1.1;
  let VO = null;
  try { VO = typeof module !== 'undefined' ? require('./voice/words.json') : root.VO_WORDS || null; } catch (e) { VO = null; }
  const nWords = LINES.reduce((a, L) => a + L.text.split(/\s+/).length, 0);
  if (VO && VO.length !== nWords) VO = null;
  const weight = w => 0.55 + 0.45 * Math.min(2.2, w.replace(/[^a-z0-9]/gi, '').length / 5);
  let t = START, wi = 0;
  const words = [], lines = [];
  LINES.forEach((L, li) => {
    const ws = L.text.split(/\s+/);
    const slot = ws.length / WPS, tot = ws.reduce((a, w) => a + weight(w), 0);
    let t0 = t;
    ws.forEach((w, j) => {
      let a = t, b = t + slot * weight(w) / tot;
      if (VO) { a = VO[wi].s; b = wi + 1 < VO.length ? Math.min(VO[wi].e, VO[wi + 1].s) : VO[wi].e; if (j === 0) t0 = a; }
      words.push({ w, t0: a, t1: b, line: li, key: KEY.includes(w.toLowerCase().replace(/[^a-z]/g, '')) });
      t = b; wi++;
    });
    lines.push({ id: L.id, text: L.text, t0, t1: t, i: li });
    if (!VO) t += L.pause != null ? L.pause : GAP;
  });
  words.forEach(w => { w.t0 /= SPEED; w.t1 /= SPEED; }); lines.forEach(l => { l.t0 /= SPEED; l.t1 /= SPEED; });
  const DUR = +((t + END_HOLD) / SPEED).toFixed(2);
  const line = id => lines.find(l => l.id === id);
  // time a word is said: cue('down', 'pushed') = that word inside the line
  function cue(lineId, word, nth) {
    const L = line(lineId); if (!L) throw new Error('no line ' + lineId);
    if (!word) return L.t0;
    let n = nth || 0;
    for (const w of words) if (w.line === L.i && w.w.toLowerCase().replace(/[^a-z']/g, '') === word) { if (n-- === 0) return w.t0; }
    throw new Error('no word ' + word + ' in ' + lineId);
  }
  root.TL = { LINES, lines, words, DUR, cue, line, SPEED };
})(typeof module !== 'undefined' ? module.exports : window);
