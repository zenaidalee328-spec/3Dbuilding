// The words of "Castle" (timeline.js times them). Format: "If you... / But... / So you... / Congratulations!"
// Everything happens on ONE hill, so the camera never has to travel far. The voice never stops.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1, END_HOLD: 0.35,
    LINES: [
      { id: 'hook',    text: 'If you live on a hill full of enemies, you need somewhere safe to sleep.', pause: 0.05 },
      { id: 'fence',   text: 'So you build a wooden fence around the top, but the enemy just sets it on fire.', pause: 0.05 },
      { id: 'wall',    text: 'Being an absolute genius, you replace the wood with a thick stone wall.', pause: 0.05 },
      { id: 'cong1',   text: 'Congratulations! You just built a fort.', pause: 0.05 },
      { id: 'ladder',  text: 'But the enemy brings ladders and climbs straight over the top.', pause: 0.05 },
      { id: 'moat',    text: 'So you dig a deep ditch all around and fill it with water. Now the ladders fall short and the climbers fall in.', pause: 0.05 },
      { id: 'arrows',  text: 'But their archers shoot your guards right off the wall, so you add stone teeth along the top to hide behind.', pause: 0.05 },
      { id: 'corner',  text: 'But at the corners, they dig right under your wall.', pause: 0.05 },
      { id: 'towers',  text: 'Using your huge brain, you build round towers at every corner, so there is no blind spot to hide in.', pause: 0.05 },
      { id: 'cong2',   text: 'Congratulations! You just built a fortress.', pause: 0.05 },
      { id: 'gate',    text: 'Now the only way in is the gate, so they smash it with a giant log.', pause: 0.05 },
      { id: 'port',    text: 'So you drop a heavy iron grill behind it, and a drawbridge in front, and you pour boiling water down on anyone who gets close.', pause: 0.05 },
      { id: 'keep',    text: 'And if they still break in, everyone runs into one last tower in the middle, with its door high off the ground.', pause: 0.05 },
      { id: 'end',     text: 'Congratulations! You just built a castle.' },
    ],
    KEY: ['hill', 'enemies', 'safe', 'wooden', 'fence', 'fire', 'genius', 'stone', 'wall', 'congratulations', 'fort', 'ladders', 'climbs',
      'ditch', 'water', 'fall', 'archers', 'guards', 'teeth', 'hide', 'corners', 'under', 'fortress', 'huge', 'brain', 'round', 'towers', 'blind', 'gate', 'smash', 'log', 'iron', 'grill',
      'drawbridge', 'boiling', 'last', 'tower', 'middle', 'door', 'high', 'castle'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
