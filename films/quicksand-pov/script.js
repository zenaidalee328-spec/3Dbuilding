// The words of "Quicksand" (timeline.js times them). SPEED: the whole film plays this much faster.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1,
    LINES: [
      { id: 'hook',    text: 'You step off the path, and the ground grabs your legs. This is quicksand.', pause: 0.3 },
      { id: 'myth',    text: 'In movies, people sink until they disappear. In real life, you can\'t.' },
      { id: 'why',     text: 'Quicksand is twice as dense as your body, so you only sink to about your waist.' },
      { id: 'danger',  text: 'The real danger is what you do next. So, what do you do?', pause: 0.4 },
      { id: 'struggle',text: 'Struggle hard, and the shaking turns the sand to liquid and pulls you deeper.' },
      { id: 'pull',    text: 'Pull one leg straight up, and it can take the force of lifting a car.' },
      { id: 'lean',    text: 'The right move: lean back and spread your arms, like you\'re floating.' },
      { id: 'wiggle',  text: 'Wiggle your legs slowly, so water seeps in and loosens the sand.' },
      { id: 'roll',    text: 'Then roll, inch by inch, onto solid ground.' },
      { id: 'end',     text: 'In quicksand, slow beats strong. Every time.' },
    ],
    KEY: ['quicksand', 'legs', 'movies', 'disappear', 'twice', 'dense', 'waist', 'danger', 'struggle', 'liquid', 'deeper', 'pull', 'car', 'lean', 'back',
      'floating', 'wiggle', 'slowly', 'water', 'roll', 'solid', 'ground', 'slow', 'strong'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
