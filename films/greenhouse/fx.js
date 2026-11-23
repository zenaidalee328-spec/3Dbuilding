// Sound for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]. Quiet wind bed, a sound on every build.
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['wind', 0, -38, TL.DUR * 1.1], ['birds', 0, -22, 2],
    ['shower', c('hook', 'hail') - 0.3, -16, 4.5], ...[0, 1, 2, 3].map(i => ['click', c('hook', 'hail') + 0.4 + i * 0.6, -20]),
    ...[0, 1, 2, 3, 4, 5].map(i => ['thud', c('poly', 'stakes') + i * 0.25, -16]), ...[0, 1, 2, 3].map(i => ['soft_whoosh', c('poly', 'transparent') + i * 0.45, -16]),
    ['shower', c('poly', 'hail') - 0.4, -20, 3], ...[0, 1, 2, 3].map(i => ['click', c('poly', 'hail') + i * 0.35, -18]),
    ['wind', L('wind'), -18, 6], ['shower', c('wind', 'storm'), -15, 6], ['soft_whoosh', c('wind', 'rips'), -9], ['soft_whoosh', c('wind', 'rips') + 0.5, -11],
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ['metal_clank', c('brace', 'arches') - 0.2 + i * 0.22, -14]), ...[0, 1, 2, 3].map(i => ['metal_clank', c('brace', 'xshaped') + 0.1 + i * 0.3, -13]),
    ['soft_whoosh', c('brace', 'bracing') - 0.4, -14], ...[0, 1, 2, 3, 4].map(i => ['concrete_thud', c('feet', 'feet') + i * 0.2, -11]),
    ['soft_whoosh', c('feet', 'close'), -14], ['wind', c('feet', 'wind') - 0.3, -20, 2.5],
    ['click', c('heat', 'heater'), -14], ['click', c('heat', 'sensor'), -14], ['pop', c('heat', 'automatically'), -16], ['click', c('heat', 'off'), -14],
    ['click', c('hot', 'car'), -18], ...[0, 1, 2, 3].map(i => ['metal_clank', c('sky', 'windows') + i * 0.15, -16]), ['soft_whoosh', c('sky', 'sides'), -14], ['soft_whoosh', c('sky', 'rise'), -18],
    ['shower', L('dry'), -18, 4.5], ...[0, 1, 2].map(i => ['pipe_clunk', c('drip', 'hoses') + i * 0.3, -14]), ['water_fill', c('drip', 'drip'), -20, 2.5],
    ['water_fill', c('rot', 'much'), -18, 2.5], ...[0, 1, 2].map(i => ['concrete_thud', L('drain') + i * 0.25, -14]), ['water_fill', c('drain', 'drain'), -12, 2.5],
    ['pipe_clunk', c('fert', 'fertilizer'), -12], ['water_fill', c('fert', 'drop'), -20, 2],
    ['soft_whoosh', c('screen', 'screen'), -14], ['soft_whoosh', c('screen', 'screen') + 0.7, -16],
    ...[0, 1, 2, 3, 4, 5].map(i => ['click', c('fans', 'inside') + i * 0.12, -18]), ['soft_whoosh', c('fans', 'leaves'), -18],
    ...[0, 1].map(i => ['soft_whoosh', c('sector', 'rooms') + i * 0.4, -14]), ['metal_clank', c('sector', 'fan'), -14], ['water_fill', c('sector', 'wet'), -18, 2.5],
    ['click', c('vib', 'vibrator'), -16], ['click', c('vib', 'cluster'), -18], ['thud', c('hive', 'boxes'), -14], ['thud', c('hive', 'boxes') + 0.35, -14], ['birds', c('hive', 'pollinate'), -22, 2],
    ['shower', c('add', 'gutters') - 0.4, -20, 3.5], ['metal_clank', c('add', 'gutters'), -14], ['click', c('add', 'sensors'), -14], ['soft_whoosh', c('add', 'hat') - 0.5, -16], ['pop', c('add', 'hat') + 0.2, -16],
    ['birds', L('end'), -16, 3],
  ];
};
