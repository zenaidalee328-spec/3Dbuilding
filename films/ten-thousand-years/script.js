// The words of "10,000 years" (timeline.js times them). SPEED: the whole film plays this much faster.
(function (root) {
  root.SCRIPT = {
    SPEED: 1.1,
    LINES: [
      { id: 'hook',    text: 'This is one river bend in the Indus valley. Watch ten thousand years happen to it.', pause: 0.3 },
      { id: 'wild',    text: 'Eight thousand BC. Wild grass, a winding river, and no people at all.' },
      { id: 'farm',    text: 'Six thousand BC. The first farmers arrive and plant wheat by the water.' },
      { id: 'city',    text: 'Twenty five hundred BC. A city of baked bricks, with straight streets and drains under them.' },
      { id: 'shift',   text: 'Then the river moves away, and the city slowly empties.' },
      { id: 'buried',  text: 'For thousands of years, sand and mud bury it.' },
      { id: 'village', text: 'A small village grows on top, with no idea what lies beneath.' },
      { id: 'fort',    text: 'Sixteen hundred. A fort rises to guard the crossing.' },
      { id: 'rail',    text: 'Nineteen hundred. The railway arrives, and the village becomes a town.' },
      { id: 'today',   text: 'Today, a city of thousands stands here.' },
      { id: 'end',     text: 'And under its streets, four and a half thousand years of history are still waiting.' },
    ],
    KEY: ['ten', 'thousand', 'years', 'indus', 'eight', 'six', 'twenty', 'five', 'hundred', 'bc', 'farmers', 'wheat', 'city', 'bricks', 'drains', 'river',
      'sand', 'mud', 'bury', 'village', 'beneath', 'sixteen', 'fort', 'nineteen', 'railway', 'today', 'history'],
  };
})(typeof module !== 'undefined' ? module.exports : window);
