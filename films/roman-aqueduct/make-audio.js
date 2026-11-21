// Builds audio/mix.wav: the voice (voice/voice.wav from make-voice.py) + CC0 sound effects (sfx/, CREDITS.txt; the list
// is in fx.js) over a quiet wind bed, mixed at the voice's own speed, then sped up to the film's speed (script.js SPEED).
//   node make-audio.js
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
process.env.TL_RAW = '1';
const { TL } = require('./timeline.js');
const SPEED = require('./script.js').SCRIPT.SPEED || 1;
const DIR = __dirname, SR = 44100, FF = process.env.FFMPEG || 'ffmpeg';
const ff = args => { const r = spawnSync(FF, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg failed'); };
fs.mkdirSync(path.join(DIR, 'audio'), { recursive: true });
const voice = path.join(DIR, 'voice', 'voice.wav');
if (!fs.existsSync(voice)) throw new Error('no voice/voice.wav: run make-voice.py first');
// effects: [file, time (1x), gain dB, (length s)]
const FX = require('./fx.js')(TL, TL.cue).filter(f => f && fs.existsSync(path.join(DIR, 'sfx', f[0] + '.mp3')));
const inputs = ['-i', voice], filters = [`[0:a]aresample=${SR},pan=stereo|c0=c0|c1=c0[v0]`];
FX.forEach(([name, at, db, len], i) => {
  if (len && len > 20) inputs.push('-stream_loop', '-1');
  inputs.push('-i', path.join(DIR, 'sfx', name + '.mp3'));
  const ms = Math.max(0, Math.round(at * 1000));
  const cut = len ? `atrim=0:${len},afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, len - 0.6)}:d=0.6,` : '';
  filters.push(`[${i + 1}:a]aresample=${SR},aformat=channel_layouts=stereo,${cut}volume=${db}dB,adelay=${ms}|${ms}[f${i}]`);
});
const all = '[v0]' + FX.map((_, i) => `[f${i}]`).join('');
filters.push(`${all}amix=inputs=${FX.length + 1}:normalize=0:duration=longest,apad=whole_dur=${TL.DUR},atrim=0:${TL.DUR},atempo=${SPEED},acompressor=threshold=-20dB:ratio=4:attack=5:release=90:makeup=8dB,alimiter=limit=0.9:level=disabled,loudnorm=I=-8:TP=-1:LRA=6[out]`);
fs.mkdirSync(path.join(DIR, 'audio', 'tmp'), { recursive: true });
fs.writeFileSync(path.join(DIR, 'audio', 'tmp', 'filter.txt'), filters.join(';\n'));
ff([...inputs, '-filter_complex_script', path.join(DIR, 'audio', 'tmp', 'filter.txt'), '-map', '[out]', '-ar', String(SR), '-ac', '2', path.join(DIR, 'audio', 'mix.wav')]);
console.log(`audio/mix.wav: ${(TL.DUR / SPEED).toFixed(2)} s at ${SPEED}x`);
