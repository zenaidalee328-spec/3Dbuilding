// The words of "Windmill" (timeline.js times them). Format: "If you... / But... / So you... / Congratulations!"
// Everything happens on ONE hilltop among wheat fields; each mill is built on the spot of the last one.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1, END_HOLD: 0.35,
    LINES: [
      { id: 'hook',     text: 'If you rub wheat between two stones all day, you get one loaf and gorilla arms.', pause: 0.05 },
      { id: 'quern',    text: 'But everyone wants bread. So you put a round stone on top and spin it.', pause: 0.05 },
      { id: 'donkey',   text: 'But your arm is dying. So you make the stones huge and tie on a donkey.', pause: 0.05 },
      { id: 'circle',   text: 'It walks in circles and flour pours out.', pause: 0.05 },
      { id: 'cong1',    text: 'Congratulations! You just built the donkey mill.', pause: 0.05 },
      { id: 'hungry',   text: 'But the donkey eats half your wheat.', pause: 0.05 },
      { id: 'post',     text: 'So you hammer a giant post into the hill and nail four sails to it.', pause: 0.05 },
      { id: 'free',     text: 'Now the wind turns your stones for free.', pause: 0.05 },
      { id: 'shift',    text: 'But the wind changes direction and your sails stop.', pause: 0.05 },
      { id: 'tailpole', text: 'So you put the whole mill house on the post and push it round with a long tail pole.', pause: 0.05 },
      { id: 'cong2',    text: 'Congratulations! You just built the post mill.', pause: 0.05 },
      { id: 'storm',    text: 'But a storm hits, the sails spin wildly, and the miller vanishes in flour.', pause: 0.05 },
      { id: 'brake',    text: 'So you clamp a brake on the big wheel, and it rubs so hard it smokes.', pause: 0.05 },
      { id: 'heavy',    text: 'But you want bigger sails, and the house gets too heavy to push.', pause: 0.05 },
      { id: 'tower',    text: 'So you build a stone tower in its place, and only the small cap turns.', pause: 0.05 },
      { id: 'cong3',    text: 'Congratulations! You just built the tower mill.', pause: 0.05 },
      { id: 'tail',     text: 'But one night the wind swings behind the sails and nearly rips the cap off.', pause: 0.05 },
      { id: 'fan',      text: 'So you stick a tiny sideways windmill on the back of the cap.', pause: 0.05 },
      { id: 'fan2',     text: 'When the wind shifts, it spins and cranks the cap back around by itself.', pause: 0.05 },
      { id: 'final',    text: "Congratulations! You just built the windmill, with Edmund Lee's fantail from seventeen forty-five." },
    ],
    KEY: ['wheat', 'stones', 'gorilla', 'arms', 'round', 'spin', 'huge', 'donkey', 'circles', 'flour', 'mill', 'eats', 'post', 'four', 'sails', 'wind', 'free',
      'direction', 'stop', 'whole', 'house', 'tail', 'pole', 'storm', 'brake', 'smokes', 'roll', 'cloth', 'bigger', 'heavy', 'stone', 'tower', 'cap',
      'behind', 'rips', 'tiny', 'windmill', 'shifts', 'itself', 'edmund', 'lee', 'seventeen', 'fortyfive'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
