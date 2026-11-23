// Sound for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]. Wind bed, rain, water, a sound on every build.
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['wind', 0, -38, TL.DUR * 1.1], ['birds', 0, -20, 5],
    ['soft_whoosh', c('pil', 'lift') - 0.3, -12], ['concrete_thud', c('pil', 'short') + 0.3, -9], ...[0, 1].map(i => ['concrete_thud', c('pil', 'tall') + 0.3 + i * 0.38, -9]),
    ['shower', L('rain'), -13, 7], ...[0, 1, 2, 3].map(i => ['concrete_thud', c('rain', 'ditch') + i * 0.45, -13]), ['water_fill', c('rain', 'around'), -15, 3],
    ['water_fill', c('stair', 'digs') - 0.3, -12, 2.5], ['thud', c('stair', 'digs') + 0.5, -8], ...[0, 1, 2, 3, 4, 5].map(i => ['concrete_thud', c('stair', 'staircase') + i * 0.28, -12]),
    ['water_fill', c('stair', 'step'), -16, 3],
    ['soft_whoosh', c('creep', 'creeps'), -16], ...[0, 1, 2, 3, 4, 5].map(i => ['metal_clank', c('creep', 'drill') + i * 0.22, -17]), ['concrete_thud', c('creep', 'steel') + 0.3, -9],
    ['shower', c('slide', 'week'), -11, 6], ['thud', c('slide', 'slide'), -4], ['concrete_thud', c('slide', 'slide') + 0.1, -7],
    ...[0, 1, 2, 3, 4].map(i => ['metal_clank', c('slide', 'stitch') + 0.2 + i * 0.2, -13]), ['shower', c('slide', 'spray'), -17, 2],
    ['water_fill', c('drain', 'builds'), -15, 2.5], ...[0, 1, 2].map(i => ['pipe_clunk', c('drain', 'push') + i * 0.2, -11]), ['water_fill', c('drain', 'drain'), -12, 2.5],
    ...[0, 1, 2].map(i => ['thud', c('rock', 'rolls') + 0.5 + i * 0.6, -13]), ...[0, 1, 2, 3].map(i => ['metal_clank', c('rock', 'stretch') + i * 0.25, -14]),
    ['thud', c('rock', 'never'), -4], ['metal_clank', c('rock', 'never') + 0.05, -7], ['birds', c('rock', 'knows'), -16, 3],
    ['pipe_clunk', c('pump', 'pump'), -11], ['water_fill', c('pump', 'tank'), -15, 2.5], ['click', c('pump', 'cart'), -12], ['click', c('pump', 'cart') + 0.3, -12], ['metal_clank', c('pump', 'groceries'), -15],
    ['birds', L('end'), -14, 5], ['soft_whoosh', c('end', 'first') - 0.4, -14],
  ];
};
