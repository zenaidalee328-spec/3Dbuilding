// The words of "Roman Aqueduct" (timeline.js times them). Format: "If you... / But... / So you... / Congratulations!"
// No pauses between lines (the voice never stops); SPEED: the whole film plays this much faster.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1, END_HOLD: 0.35,
    LINES: [
      { id: 'hook',   text: 'If you build a city on a hill and everyone drinks from one tiny well, you have a city of very thirsty people.', pause: 0.05 },
      { id: 'carry',  text: 'So you send everyone to carry water from the mountain spring, but the walk takes all day and half the water spills on the way.', pause: 0.05 },
      { id: 'dig',    text: 'Being an absolute genius, you dig a channel from the spring straight to the city.', pause: 0.05 },
      { id: 'cong1',  text: 'Congratulations! You just invented the canal.', pause: 0.05 },
      { id: 'valley', text: 'But the channel runs into a deep valley, and water refuses to flow uphill.', pause: 0.05 },
      { id: 'fill',   text: 'So you fill the valley with dirt, but the first big rain washes it all away.', pause: 0.05 },
      { id: 'arches', text: 'Using your huge brain, you build a row of stone arches to carry the channel across.', pause: 0.05 },
      { id: 'short',  text: 'But one row is too short to reach, so you stack a second row on top, and then a third.', pause: 0.05 },
      { id: 'cong2',  text: 'Congratulations! You just built a bridge for water.', pause: 0.05 },
      { id: 'frogs',  text: 'But in summer the open channel turns green and fills with frogs, so you put a stone roof over it, and the water stays clean and cool.', pause: 0.05 },
      { id: 'pump',   text: 'But how do you push it fifty kilometers without a single pump? You tilt the whole thing down by just twenty-five centimeters every kilometer, and gravity does the rest.', pause: 0.05 },
      { id: 'tanks',  text: 'And when it reaches the city, you split it three ways: fountains, baths, and rich people\'s houses.', pause: 0.05 },
      { id: 'drought',text: 'In a drought, the rich get cut off first, so the fountains never stop.', pause: 0.05 },
      { id: 'end',    text: 'Congratulations! You just built a Roman aqueduct.' },
    ],
    KEY: ['city', 'hill', 'well', 'thirsty', 'carry', 'mountain', 'spring', 'spills', 'genius', 'dig', 'channel', 'congratulations', 'canal',
      'valley', 'uphill', 'dirt', 'rain', 'washes', 'arches', 'second', 'third', 'bridge', 'water', 'green', 'frogs', 'roof', 'clean', 'cool',
      'fifty', 'pump', 'tilt', 'twenty-five', 'centimeters','gravity', 'three', 'fountains', 'baths', 'rich', 'drought', 'cut', 'never', 'roman', 'aqueduct'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
