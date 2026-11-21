// Sound effects for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['wind', 0, -24, TL.DUR],
    ['metal_clank', c('hook', 'cap') - 0.05, -9],
    ['soft_whoosh', c('hook', 'down') - 0.2, -7],
    ...['eiffel', 'burj', 'titanic', 'mine', 'everest', 'mariana'].map(id => ['pop', L(id) + 0.3, -11]),
    ['soft_whoosh', L('titanic') - 0.2, -12], ['soft_whoosh', L('everest') - 0.2, -12],
    ['concrete_thud', L('bottom') + 0.6, -7],
    ['click', c('width', 'centimeters'), -8],
    ['soft_whoosh', L('twist') + 0.2, -8],
    ['wind', L('twist') + 0.3, -14, 4],
    ['concrete_thud', c('twist', 'center') + 0.1, -9],
  ];
};
