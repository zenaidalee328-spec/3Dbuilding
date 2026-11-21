// Sound effects for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['wind', 0, -24, TL.DUR],
    ['soft_whoosh', c('hook', 'ten') - 0.2, -6], ['wind', c('hook', 'ten'), -12, 2.5],
    ['birds', L('wild'), -16, 4],
    ['pop', L('farm') + 0.4, -11], ['concrete_thud', L('city') + 0.6, -9], ['click', c('city', 'drains'), -10],
    ['water_fill', L('shift'), -16, 2.5], ['wind', L('buried'), -12, 3],
    ['pop', L('village') + 0.4, -11], ['thud', L('fort') + 0.5, -8], ['metal_clank', L('rail') + 0.5, -10], ['pipe_clunk', L('rail') + 1.2, -14],
    ['soft_whoosh', L('today') + 0.2, -9], ['soft_whoosh', c('end', 'under') - 0.2, -8],
  ];
};
