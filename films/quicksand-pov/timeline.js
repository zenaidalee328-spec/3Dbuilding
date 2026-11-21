// The script's timing (script.js holds the words): shared by film.js (browser), make-voice.py and make-audio.js (node).
// With a real voice (voice/words.json from make-voice.py) every word gets its spoken time; otherwise ~4 words a second.
// The whole film plays SPEED times faster (picture and sound); make-audio.js mixes at 1x (TL_RAW=1) and speeds the mix up.
(function (root) {
  'use strict';
  const SC = typeof module !== 'undefined' ? require('./script.js').SCRIPT : root.SCRIPT;
  const LINES = SC.LINES, KEY = SC.KEY || [];
  const START = 0.4, WPS = 4.0, GAP = 0.15, END_HOLD = SC.END_HOLD != null ? SC.END_HOLD : 1.4;
  const SPEED = typeof process !== 'undefined' && process.env && process.env.TL_RAW ? 1 : (SC.SPEED || 1);
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
      words.push({ w, t0: a, t1: b, line: li, key: KEY.includes(w.toLowerCase().replace(/[^a-z0-9]/g, '')) });
      t = b; wi++;
    });
    lines.push({ id: L.id, text: L.text, t0, t1: t, i: li });
    if (!VO) t += L.pause != null ? L.pause : GAP;
  });
  words.forEach(w => { w.t0 /= SPEED; w.t1 /= SPEED; }); lines.forEach(l => { l.t0 /= SPEED; l.t1 /= SPEED; });
  const DUR = +((t + END_HOLD) / SPEED).toFixed(2);
  const line = id => { const l = lines.find(l => l.id === id); if (!l) throw new Error('no line ' + id); return l; };
  // time a word is said: cue('lineId', 'word', nth)
  function cue(lineId, word, nth) {
    const L = line(lineId);
    if (!word) return L.t0;
    let n = nth || 0;
    for (const w of words) if (w.line === L.i && w.w.toLowerCase().replace(/[^a-z0-9']/g, '') === word) { if (n-- === 0) return w.t0; }
    throw new Error('no word ' + word + ' in ' + lineId);
  }
  root.TL = { LINES, lines, words, DUR, cue, line, SPEED };
})(typeof module !== 'undefined' ? module.exports : window);
