// The words of "Inside a watch" (timeline.js times them). SPEED: the whole film plays this much faster.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1,
    LINES: [
      { id: 'hook',    text: 'This watch has no battery, and it can keep time for decades. Let\'s take it apart.', pause: 0.3 },
      { id: 'top',     text: 'First, the glass, the hands and the dial come off.' },
      { id: 'spring',  text: 'Underneath, a coiled steel spring stores the energy when you wind it.' },
      { id: 'train',   text: 'The spring tries to unwind, and turns a chain of gears.' },
      { id: 'problem', text: 'But on its own, it would spin out in seconds.' },
      { id: 'escape',  text: 'So an escape wheel lets the gears move just one tooth at a time.' },
      { id: 'pallet',  text: 'A tiny fork locks it and lets it go. Tick, tock.' },
      { id: 'balance', text: 'And this balance wheel swings back and forth four times every second, keeping the beat.' },
      { id: 'jewels',  text: 'The axles spin in tiny rubies, so they barely wear out.' },
      { id: 'count',   text: 'Over a hundred parts, and not one of them needs electricity.', pause: 0.3 },
      { id: 'end',     text: 'Put it back together, and it ticks again.' },
    ],
    KEY: ['battery', 'decades', 'apart', 'glass', 'hands', 'dial', 'spring', 'energy', 'gears', 'seconds', 'escape', 'wheel', 'tooth', 'fork', 'tick', 'tock',
      'balance', 'four', 'second', 'rubies', 'hundred', 'parts', 'electricity', 'ticks'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
