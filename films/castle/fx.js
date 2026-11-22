// Sound for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]. A very quiet music bed, and a sound on every action.
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['music', 0, -32, TL.DUR + 1], ['wind', 0, -28, TL.DUR], ['birds', 0, -22, 4],
    ['soft_whoosh', c('hook', 'enemies') - 0.6, -12],
    ...[0, 1, 2, 3, 4, 5].map(i => ['thud', L('fence') + 0.4 + i * 0.35, -16]), ['wind', c('fence', 'fire') - 0.3, -12, 2.5], ...[0, 1, 2].map(i => ['soft_whoosh', c('fence', 'fire') - 0.55 + i * 0.2, -9]), ['concrete_thud', c('fence', 'fire') + 0.2, -16],
    ['pop', c('wall', 'genius') - 0.15, -10], ...[0, 1, 2, 3, 4, 5].map(i => ['concrete_thud', c('wall', 'stone') + i * 0.2, -11]),
    ['birds', L('cong1'), -18, 2.5], ['soft_whoosh', c('ladder', 'ladders') - 0.5, -12], ['click', c('ladder', 'ladders'), -12], ['click', c('ladder', 'ladders') + 0.15, -12],
    ['soft_whoosh', c('moat', 'dig') - 0.6, -12], ...[0, 1, 2, 3].map(i => ['thud', c('moat', 'dig') + i * 0.4, -10]), ['water_fill', c('moat', 'water') - 0.2, -8, 2.5],
    ['thud', c('moat', 'short') - 0.1, -10], ['water_fill', c('moat', 'fall', 1), -6, 1.5],
    ...[0, 1, 2, 3, 4, 5, 6].map(i => ['soft_whoosh', c('arrows', 'shoot') + i * 0.3, -14]), ['thud', c('arrows', 'off') + 0.4, -10],
    ...[0, 1, 2, 3].map(i => ['concrete_thud', c('arrows', 'teeth') + i * 0.18, -13]),
    ...[0, 1, 2].map(i => ['thud', c('corner', 'dig') + i * 0.35, -12]), ['concrete_thud', c('corner', 'under') + 0.2, -8],
    ['pop', c('towers', 'brain') - 0.3, -10], ...[0, 1, 2, 3].map(i => ['concrete_thud', c('towers', 'towers') + i * 0.25, -9]),
    ['birds', L('cong2'), -18, 2.5],
    ['soft_whoosh', c('gate', 'gate') - 0.4, -12], ...[0, 1, 2, 3].map(i => ['concrete_thud', c('gate', 'smash') + i * 0.494, -6]), ['thud', c('gate', 'smash') + 1.48, -3], ['concrete_thud', c('gate', 'smash') + 1.5, -4],
    ['metal_clank', c('port', 'grill'), -6], ['pipe_clunk', c('port', 'drawbridge') + 0.5, -8], ['water_fill', c('port', 'drawbridge') + 1.0, -8, 1.5],
    ['water_fill', c('port', 'pour'), -7, 2.5], ['shower', c('port', 'boiling'), -16, 2],
    ['soft_whoosh', L('keep') + 0.3, -10], ...[0, 1, 2].map(i => ['concrete_thud', c('keep', 'tower') - 0.4 + i * 0.3, -10]), ['thud', c('keep', 'high') + 0.6, -10],
    ['birds', L('end'), -16, 3], ['soft_whoosh', c('end', 'castle') - 0.6, -12],
  ];
};
