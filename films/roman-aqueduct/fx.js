// Sound for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]. A music bed under everything (CC0), and a
// sound on every action: thuds when stone lands, whooshes on the whip pans, water, pops for frogs, a smash for the jar.
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0, E = id => TL.line(id).t1;
  return [
    ['music', 0, -32, TL.DUR + 1], ['wind', 0, -30, TL.DUR],
    ['water_fill', 0.1, -20, 3], ['pop', c('hook', 'thirsty') + 0.1, -12],
    ['soft_whoosh', L('carry') + 0.3, -8], ['water_fill', c('carry', 'mountain'), -16, 2.5], ['soft_whoosh', c('carry', 'day'), -12],
    ['concrete_thud', c('carry', 'spills') - 0.05, -10], ['water_fill', c('carry', 'spills'), -12, 1.2],
    ['pop', c('dig', 'genius') - 0.15, -9], ['soft_whoosh', c('dig', 'dig'), -8], ['thud', c('dig', 'dig') + 0.3, -14], ['thud', c('dig', 'dig') + 0.8, -14], ['thud', c('dig', 'city'), -14],
    ['water_fill', L('cong1') - 0.3, -10, 3], ['click', c('cong1', 'canal'), -10],
    ['soft_whoosh', c('valley', 'deep') - 0.2, -8], ['water_fill', c('valley', 'deep'), -8, 4],
    ['thud', c('fill', 'fill'), -8], ['thud', c('fill', 'dirt'), -8], ['wind', c('fill', 'rain') - 0.3, -10, 3], ['water_fill', c('fill', 'rain'), -6, 3.5], ['concrete_thud', c('fill', 'washes'), -8],
    ['pop', c('arches', 'brain') - 0.3, -9], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ['concrete_thud', c('arches', 'build') + 0.5 + i * 0.13 * 1.1, -12]),
    ['soft_whoosh', c('short', 'second') - 0.3, -9], ...[0, 2, 4, 6].map(i => ['concrete_thud', c('short', 'second') + 0.25 + i * 0.1, -9]),
    ['soft_whoosh', c('short', 'third') - 0.3, -9], ...[0, 3, 6, 9, 12].map(i => ['concrete_thud', c('short', 'third') + 0.2 + i * 0.05, -9]),
    ['water_fill', L('cong2'), -12, 2.5], ['birds', L('cong2'), -16, 3],
    ['soft_whoosh', L('frogs') + 0.2, -9], ...[0, 1, 2, 3, 4, 5].map(i => ['pop', c('frogs', 'frogs') - 0.2 + i * 0.12, -11]),
    ...[0, 1, 2, 3].map(i => ['concrete_thud', c('frogs', 'stone') + 0.3 + i * 0.07, -10]), ['water_fill', c('frogs', 'clean'), -14, 1.5],
    ['soft_whoosh', L('pump') + 0.2, -8], ['pop', c('pump', 'pump') - 0.1, -8], ['pop', c('pump', 'pump') + 0.55, -10],
    ['soft_whoosh', c('pump', 'tilt') - 0.2, -10], ['metal_clank', c('pump', 'tilt') + 0.6, -14], ['click', c('pump', 'twentyfive'), -10],
    ['soft_whoosh', c('pump', 'gravity') - 0.1, -6], ['water_fill', c('pump', 'gravity'), -8, 1.8],
    ['water_fill', L('tanks') + 0.2, -10, 2], ['pipe_clunk', c('tanks', 'split'), -10],
    ['soft_whoosh', c('tanks', 'fountains') - 0.3, -10], ['soft_whoosh', c('tanks', 'baths') - 0.3, -10], ['soft_whoosh', c('tanks', 'rich') - 0.3, -10],
    ['soft_whoosh', c('drought', 'drought'), -10], ['pipe_clunk', c('drought', 'cut'), -8], ['soft_whoosh', c('drought', 'fountains') - 0.3, -10], ['water_fill', c('drought', 'fountains'), -12, 1.5],
    ['soft_whoosh', L('end') + 0.2, -8], ['birds', L('end'), -16, 3],
  ];
};
