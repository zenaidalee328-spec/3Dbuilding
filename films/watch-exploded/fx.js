// Sound effects for make-audio.js: [file in sfx/, time (s, 1x), gain dB, (length s)]
// tick.mp3: made from click.mp3 (4 ticks a second, looped); the runaway drops the ticking for a whoosh.
module.exports = (TL, c) => {
  const L = id => TL.line(id).t0;
  return [
    ['tick', 0, -20, L('problem')],
    ['tick', L('escape') + 0.3, -20, TL.DUR - L('escape') - 0.3],
    ['soft_whoosh', c('hook', 'apart') - 0.1, -8], ['click', L('top') + 0.2, -10], ['click', L('top') + 0.6, -10],
    ['metal_clank', L('spring') + 0.4, -13],
    ['wind', L('problem'), -12, 2.2], ['soft_whoosh', L('problem') + 0.6, -6],
    ['click', c('pallet', 'tick'), -4], ['click', c('pallet', 'tock'), -4],
    ['pop', L('jewels') + 0.3, -12],
    ['soft_whoosh', L('count'), -8], ['metal_clank', c('end', 'together'), -10],
  ];
};
