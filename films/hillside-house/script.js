// The words of "Hillside House" (owner's script, trimmed to ~70 s). Seven attacks of the hill, each fix named (no score lines: owner).
// Everything happens on ONE slope: the house is lifted, then each defence is added around it. No people.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1, END_HOLD: 0.35,
    LINES: [
      { id: 'hook',   text: 'Every year, a hillside house tries to die in seven different ways. Here is how engineers made it impossible.', pause: 0.05 },
      { id: 'pil',    text: "First, the ground isn't flat. So you lift the house: short concrete columns up high, tall ones down low, and the floor comes out level.", pause: 0.05 },
      { id: 'pil2',   text: 'Engineers call them pilotis.', pause: 0.05 },
      { id: 'rain',   text: 'Then rain washes the soil out from under your columns. So you cut a ditch across the slope above and send the water around you.', pause: 0.05 },
      { id: 'rain2',  text: 'This is a crest channel.', pause: 0.05 },
      { id: 'stair',  text: 'But fast water digs holes. So it goes down a staircase, and every step steals some of its speed.', pause: 0.05 },
      { id: 'stair2', text: 'This is the hydraulic staircase.', pause: 0.05 },
      { id: 'creep',  text: 'Then the top soil creeps downhill, strong enough to bend concrete. So you drill through it to solid rock and fill the holes with steel.', pause: 0.05 },
      { id: 'creep2', text: 'These are called piles.', pause: 0.05 },
      { id: 'slide',  text: 'Then a week of rain, and the whole slope wants to slide. So you stitch it together with long steel bars and spray concrete on top.', pause: 0.05 },
      { id: 'slide2', text: 'This is soil nailing.', pause: 0.05 },
      { id: 'drain',  text: 'But water builds up behind that concrete. So you push perforated pipes deep into the slope to drain it.', pause: 0.05 },
      { id: 'drain2', text: 'These are deep drains.', pause: 0.05 },
      { id: 'rock',   text: 'Last, a loose rock rolls at your balcony. So you stretch a steel net across the slope, and the house never even knows.', pause: 0.05 },
      { id: 'pump',   text: 'Then a pump pushes water up to a tank on top, and a cart on rails carries your groceries up the hill.', pause: 0.05 },
      { id: 'end',    text: 'You never fought the hill. You moved its water, skipped its soil, and caught its rocks. Which one would you have thought of first?' },
    ],
    KEY: ['seven', 'impossible', 'flat', 'lift', 'columns', 'short', 'tall', 'level', 'pilotis', 'engineers', 'rains', 'soil', 'ditch', 'around',
      'channel', 'two', 'digs', 'staircase', 'speed', 'hydraulic', 'three', 'creeps', 'bend', 'drill', 'rock', 'steel', 'piles', 'four', 'week', 'slide',
      'stitch', 'bars', 'spray', 'nailing', 'five', 'water', 'pipes', 'drain', 'drains', 'six', 'loose', 'balcony', 'net', 'knows', 'seven', 'pump', 'tank',
      'cart', 'rails', 'groceries', 'never', 'fought', 'moved', 'skipped', 'caught', 'first'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
