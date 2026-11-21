// Sound effects for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['wind', 0, -26, TL.DUR],
    ['wind', 0.3, -14, 3],                                   // the hook's rumble
    ['wind', L('m5'), -16, 3], ['wind', L('m6'), -12, 3], ['wind', L('m7'), -9, 4.5], ['wind', L('m8'), -6, 6], ['wind', L('iso'), -8, 5],
    ['concrete_thud', c('m6', 'crack'), -10],
    ['concrete_thud', c('m7', 'down') - 0.1, -3], ['thud', c('m7', 'down') + 0.3, -5], ['thud', c('m7', 'down') + 0.7, -8],
    ['concrete_thud', c('m8', 'peel'), -5], ['concrete_thud', c('m8', 'gives') - 0.1, -2], ['thud', c('m8', 'gives') + 0.4, -4], ['metal_clank', c('m8', 'gives') + 0.6, -10],
    ['soft_whoosh', c('iso', 'slides') - 0.2, -10], ['pop', c('fact', 'base'), -10],
  ];
};
