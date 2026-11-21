// Sound effects for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['wind', 0, -22, TL.DUR], ['birds', 0, -20, 6],
    ['thud', 0.5, -14], ['thud', 1.0, -14], ['thud', c('hook', 'off'), -12],
    ['water_fill', c('hook', 'grabs') - 0.1, -10, 2.5], ['soft_whoosh', c('hook', 'grabs') - 0.2, -8],
    ['soft_whoosh', c('myth', 'disappear') - 0.2, -8], ['pop', c('myth', 'real'), -10],
    ['pop', c('danger', 'what'), -10], ['click', c('danger', 'what') + 0.3, -12], ['click', c('danger', 'what') + 0.5, -12],
    ['water_fill', L('struggle') + 0.2, -6, 3], ['thud', L('struggle') + 0.4, -8], ['thud', L('struggle') + 0.9, -8], ['thud', L('struggle') + 1.4, -8],
    ['concrete_thud', c('pull', 'car'), -8],
    ['soft_whoosh', c('lean', 'right') - 0.2, -9], ['water_fill', c('wiggle', 'seeps') - 0.2, -14, 3],
    ['soft_whoosh', L('roll') + 0.2, -9], ['soft_whoosh', L('roll') + 1.2, -9], ['thud', TL.line('roll').t1, -9], ['birds', L('end'), -18, 4],
  ];
};
