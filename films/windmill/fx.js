// Sound for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]. Quiet music, wind, a sound on every action.
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['music', 0, -32, TL.DUR * 1.1 + 1], ['wind', 0, -26, TL.DUR * 1.1], ['birds', 0, -20, 5],
    ...[0, 1, 2, 3].map(i => ['click', 0.6 + i * 0.4, -16]), ['pop', c('hook', 'gorilla'), -8],
    ['concrete_thud', c('quern', 'round') + 0.25, -9], ['soft_whoosh', c('quern', 'spin'), -14],
    ['soft_whoosh', c('donkey', 'huge') - 0.3, -12], ['concrete_thud', c('donkey', 'huge') + 0.2, -8], ['click', c('donkey', 'donkey'), -12],
    ['shower', c('circle', 'flour'), -18, 2], ['birds', L('cong1'), -16, 2.5], ['click', c('hungry', 'eats'), -14], ['click', c('hungry', 'eats') + 0.35, -14],
    ['soft_whoosh', c('post', 'hammer') - 0.4, -10], ['concrete_thud', c('post', 'post') + 0.1, -4], ['thud', c('post', 'post') + 0.15, -6],
    ...[0, 1, 2, 3].map(i => ['metal_clank', c('post', 'nail') + i * 0.24, -12]), ['wind', c('free', 'wind') - 0.3, -12, 2.5],
    ['wind', c('shift', 'changes'), -12, 2], ['pop', c('tailpole', 'genius') - 0.1, -10], ['soft_whoosh', c('tailpole', 'whole') - 0.4, -11],
    ['concrete_thud', c('tailpole', 'house') + 0.1, -5], ['pipe_clunk', c('tailpole', 'push'), -12], ['pipe_clunk', c('tailpole', 'pole'), -12],
    ['birds', L('cong2'), -16, 2.5], ['wind', c('storm', 'storm') - 0.3, -5, 4.5], ['shower', c('storm', 'storm'), -9, 7], ['soft_whoosh', c('storm', 'vanishes'), -8],
    ['metal_clank', c('brake', 'clamp'), -6], ['pipe_clunk', c('brake', 'brake') + 0.2, -8], ['shower', c('brake', 'rubs'), -14, 1.6],
    ['pipe_clunk', c('heavy', 'heavy'), -10], ['thud', c('heavy', 'push'), -12],
    ...[0, 1, 2, 3, 4, 5].map(i => ['concrete_thud', c('tower', 'build') + i * 0.24, -10]), ['thud', c('tower', 'cap') - 0.1, -6], ['pipe_clunk', c('tower', 'turns'), -10],
    ['birds', L('cong3'), -16, 2.5], ['wind', c('tail', 'night'), -8, 4], ['metal_clank', c('tail', 'rips'), -6], ['pop', c('fan', 'brain') - 0.1, -10],
    ['click', c('fan', 'stick'), -10], ['click', c('fan', 'stick') + 0.2, -10], ['wind', c('fan2', 'shifts') - 0.2, -12, 2], ['pipe_clunk', c('fan2', 'cranks'), -10],
    ['birds', L('final'), -14, 4], ['soft_whoosh', c('final', 'edmund') - 0.5, -14],
  ];
};
