// Builds audio/mix.wav: the voice (voice/voice.wav from make-voice.py; else a placeholder Windows TTS voice),
// CC0 sound effects (sfx/, CREDITS.txt) over a quiet wind bed. Replace the voice later with a real one:
// put voice/<line id>.wav files (or one voice/voice.wav that follows timeline.js) and run again.
//   node make-audio.js
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync, spawnSync } = require('child_process');
process.env.TL_RAW = '1';   // mix at the voice's own speed, then speed the whole mix up to the film's speed
const { TL } = require('./timeline.js');
const SPEED = 1.1;
const DIR = __dirname, VO = path.join(DIR, 'voice'), TMP = path.join(DIR, 'audio', 'tmp');
fs.mkdirSync(VO, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const FF = process.env.FFMPEG || 'ffmpeg';
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const ff = args => { const r = spawnSync(FF, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg failed'); };

// 1. voice lines: an existing voice/<id>.wav wins; otherwise Windows TTS writes voice/tts_<id>.wav
const SR = 44100;
const own = fs.existsSync(path.join(VO, 'voice.wav'));
const parts = [];
if (!own) {
  const missing = TL.lines.filter(l => !fs.existsSync(path.join(VO, l.id + '.wav')) && !fs.existsSync(path.join(VO, 'tts_' + l.id + '.wav')));
  if (missing.length) {
    const ps = ['Add-Type -AssemblyName System.Speech', '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
      "try { $s.SelectVoice('Microsoft David Desktop') } catch {}", '$s.Rate = 2'];
    for (const l of missing) {
      ps.push(`$s.SetOutputToWaveFile('${path.join(VO, 'tts_' + l.id + '.wav').replace(/'/g, "''")}')`);
      ps.push(`$s.Speak('${l.text.replace(/'/g, "''")}')`);
    }
    ps.push('$s.SetOutputToNull()');
    fs.writeFileSync(path.join(TMP, 'tts.ps1'), ps.join('\r\n'), 'utf8');
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(TMP, 'tts.ps1')], { stdio: 'inherit' });
  }
  for (const l of TL.lines) {
    const src = fs.existsSync(path.join(VO, l.id + '.wav')) ? path.join(VO, l.id + '.wav') : path.join(VO, 'tts_' + l.id + '.wav');
    // trim silence at both ends, then fit the line to its slot (one tempo per line, pitch kept)
    const trimmed = path.join(TMP, 'trim_' + l.id + '.wav');
    ff(['-i', src, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', String(SR), '-ac', '1', trimmed]);
    const want = l.t1 - l.t0, have = dur(trimmed);
    const tempo = Math.max(0.6, Math.min(2.0, have / want));
    const fit = path.join(TMP, 'fit_' + l.id + '.wav');
    ff(['-i', trimmed, '-af', `atempo=${tempo.toFixed(4)}`, '-ar', String(SR), fit]);
    parts.push({ file: fit, at: l.t0 });
  }
} else parts.push({ file: path.join(VO, 'voice.wav'), at: 0 });

// 2. effects: [file, time, gain dB, (length s)]
const c = TL.cue;
const FX = [
  ['wind', 0, -26, TL.DUR],
  ['soft_whoosh', c('hook', 'inside') - 0.35, -8],
  ['pop', c('hook', 'inside') - 0.05, -10],
  ['wind', c('hook', 'secret') - 0.2, -14, 2.5],
  ['soft_whoosh', TL.line('house').t0 - 0.3, -10],
  ['concrete_thud', c('house', 'mud') + 0.25, -7],
  ['soft_whoosh', c('hot', 'hot') - 0.5, -9],
  ['thud', c('tower', 'roof') + 0.2, -7],
  ['wind', TL.line('closed').t0 - 0.2, -12, 2.4],
  ['concrete_thud', c('open', 'openings') + 0.1, -8],
  ['wind', c('down', 'hits') - 0.2, -11, 3],
  ['soft_whoosh', c('down', 'pushed') - 0.2, -9],
  ['click', c('water', 'channel'), -9],
  ['water_fill', c('water', 'water') - 0.1, -11, 3],
  ['soft_whoosh', c('cool', 'cools') - 0.3, -11],
  ['pipe_clunk', c('vent', 'vent') + 0.05, -10],
  ['wind', c('vent', 'rises') - 0.2, -12, 3],
  ['pop', TL.line('fact').t0 + 0.2, -10],
  ['soft_whoosh', TL.line('fact').t0 + 0.1, -10],
  ['wind', TL.line('payoff').t0, -15, 4],
];
const inputs = [], filters = [];
parts.forEach((p, i) => { inputs.push('-i', p.file); const ms = Math.round(p.at * 1000); filters.push(`[${i}:a]aresample=${SR},pan=stereo|c0=c0|c1=c0,adelay=${ms}|${ms}[v${i}]`); });
const nv = parts.length;
FX.forEach(([name, at, db, len], i) => {
  if (len && len > 20) inputs.push('-stream_loop', '-1');   // a bed longer than its file loops
  inputs.push('-i', path.join(DIR, 'sfx', name + '.mp3'));
  const ms = Math.max(0, Math.round(at * 1000));
  const cut = len ? `atrim=0:${len},afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, len - 0.6)}:d=0.6,` : '';
  filters.push(`[${nv + i}:a]aresample=${SR},aformat=channel_layouts=stereo,${cut}volume=${db}dB,adelay=${ms}|${ms}[f${i}]`);
});
// (no synthesized bed: its steady sine chord was heard as a hum under the whole film)
const all = [...parts.map((_, i) => `[v${i}]`), ...FX.map((_, i) => `[f${i}]`)].join('');
filters.push(`${all}amix=inputs=${nv + FX.length}:normalize=0:duration=longest,apad=whole_dur=${TL.DUR},atrim=0:${TL.DUR},atempo=${SPEED},loudnorm=I=-14:TP=-1.5:LRA=11[out]`);
fs.writeFileSync(path.join(TMP, 'filter.txt'), filters.join(';\n'));
ff([...inputs, '-filter_complex_script', path.join(TMP, 'filter.txt'), '-map', '[out]', '-ar', String(SR), '-ac', '2', path.join(DIR, 'audio', 'mix.wav')]);
console.log(`audio/mix.wav: ${(TL.DUR / SPEED).toFixed(2)} s at ${SPEED}x (${own ? 'own voice' : 'placeholder TTS voice'})`);
