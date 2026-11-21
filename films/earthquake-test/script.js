// The words of "Earthquake test" (timeline.js times them). SPEED: the whole film plays this much faster.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1,
    LINES: [
      { id: 'hook',  text: 'Same earthquake, three buildings. Only one is still standing at the end.', pause: 0.3 },
      { id: 'intro', text: 'A mud brick house, a brick building with no steel inside, and a building sitting on rubber pads.' },
      { id: 'm5',    text: 'Magnitude five. Everything shakes, nothing falls.' },
      { id: 'm6',    text: 'Six. The mud walls start to crack.' },
      { id: 'm7',    text: 'Seven. The mud house comes down. Mud bricks hold weight, but they can\'t bend.' },
      { id: 'm8',    text: 'Eight. The brick walls peel away, and the whole building gives up.' },
      { id: 'iso',   text: 'But the one on rubber pads barely moves. The ground slides under it, while the building stays almost still.' },
      { id: 'fact',  text: 'This is called base isolation, and it protects hospitals and even whole airports.', pause: 0.3 },
      { id: 'end',   text: 'It doesn\'t win by being strong. It wins by not fighting the shaking.' },
    ],
    KEY: ['earthquake', 'three', 'one', 'standing', 'mud', 'brick', 'steel', 'rubber', 'pads', 'magnitude', 'five', 'six', 'crack', 'seven', 'down', 'bend',
      'eight', 'peel', 'gives', 'barely', 'slides', 'still', 'base', 'isolation', 'hospitals', 'airports', 'strong', 'shaking'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
