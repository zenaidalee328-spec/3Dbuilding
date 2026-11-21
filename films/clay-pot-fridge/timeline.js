// The script and its timing: shared by film.js (browser) and make-audio.js (node).
// Each line gets a slot at ~4 words a second; every word gets a start time (captions, cues).
(function (root) {
  'use strict';
  const LINES = [
    { id: 'hookA',   text: 'In forty five degree heat, this tomato rots in two days, unless you keep it in a pot of wet sand.', pause: 0.6 },
    { id: 'pot',     text: 'So we put a small clay pot inside a bigger one.' },
    { id: 'gap',     text: 'But the air gap between them does nothing.' },
    { id: 'sand',    text: 'So we fill the gap with sand.' },
    { id: 'dry',     text: 'But dry sand just soaks up heat.' },
    { id: 'water',   text: 'So we pour water into the sand until it is soaked.' },
    { id: 'seep',    text: 'The water seeps slowly through the clay to the outside wall.' },
    { id: 'cool',    text: 'But how does a wet pot get cold?', pause: 0.3 },
    { id: 'evap',    text: 'Every drop that evaporates carries heat away, so the pot inside keeps getting colder.' },
    { id: 'name',    text: "That's called evaporative cooling.", pause: 0.3 },
    { id: 'sun',     text: 'But in direct sun, the pot heats up faster than it can cool.' },
    { id: 'shade',   text: 'So we build a shade roof over it, open on the sides for the wind.' },
    { id: 'top',     text: 'But hot air still drops in through the open top.' },
    { id: 'cloth',   text: 'So we cover it with a wet cloth.' },
    { id: 'dryout',  text: 'But by evening, the sand dries out.' },
    { id: 'refill',  text: 'So we top it up with water twice a day.' },
    { id: 'fact',    text: 'Fun fact: a pot like this can stay more than ten degrees cooler than the air around it.', pause: 0.3 },
    { id: 'last',    text: 'That means tomatoes that rotted in two days can last for weeks.', pause: 0.3 },
    { id: 'payoff',  text: 'Now the wind dries the clay, the clay pulls heat from the sand, and the food stays cold.', pause: 0.3 },
    { id: 'end',     text: 'All from two clay pots and wet sand.' },
  ];
  // words shown in the key colour
  const KEY = ['clay', 'pot', 'pots', 'sand', 'wet', 'cold', 'colder', 'cooler', 'gap', 'water', 'evaporates', 'evaporative',
    'cooling', 'shade', 'roof', 'wind', 'cloth', 'ten', 'degrees', 'heat', 'hot', 'weeks', 'forty', 'five', 'electricity', 'tomato', 'tomatoes'];

  const START = 0.4, WPS = 4.0, GAP = 0.15, END_HOLD = 1.4;
  // the real voice's word times (make-voice.py -> voice/words.json, voice/words.js) when they exist and match the script
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
  const DUR = +(t + END_HOLD).toFixed(2);
  // time a word is said: cue('pot', 'inside') = that word inside the line
  const line = id => lines.find(l => l.id === id);
  function cue(lineId, word, nth) {
    const L = line(lineId); if (!L) throw new Error('no line ' + lineId);
    if (!word) return L.t0;
    let n = nth || 0;
    for (const w of words) if (w.line === L.i && w.w.toLowerCase().replace(/[^a-z']/g, '') === word) { if (n-- === 0) return w.t0; }
    throw new Error('no word ' + word + ' in ' + lineId);
  }
  root.TL = { LINES, lines, words, DUR, cue, line };
})(typeof module !== 'undefined' ? module.exports : window);
