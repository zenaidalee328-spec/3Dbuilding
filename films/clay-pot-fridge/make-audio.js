// Builds audio/mix.wav: a PLACEHOLDER voice (Windows text-to-speech, each line fitted to its slot in timeline.js),
// CC0 sound effects (sfx/, CREDITS.txt) over a quiet wind bed. Replace the voice later with a real one:
// put voice/<line id>.wav files (or one voice/voice.wav that follows timeline.js) and run again.
//   node make-audio.js
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync, spawnSync } = require('child_process');
const { TL } = require('./timeline.js');
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
  ['wind', 0, -28, TL.DUR],
  ['soft_whoosh', c('hookA', 'unless') - 0.3, -9],
  ['pop', c('hookA', 'unless') - 0.08, -10],
  ['pop', TL.line('pot').t0 - 0.14, -12],
  ['thud', c('pot', 'clay') - 0.05, -6],
  ['soft_whoosh', c('pot', 'inside') - 0.4, -12],
  ['concrete_thud', c('pot', 'inside') + 0.3, -10],
  ['soft_whoosh', c('gap', 'gap') - 0.3, -8],
  ['wind', c('sand', 'sand') - 0.3, -14, 2.2],
  ['water_fill', c('water', 'pour'), -12, 3],
  ['click', c('evap', 'evaporates'), -10],
  ['thud', c('shade', 'shade') + 0.4, -8],
  ['wind', c('shade', 'wind') - 0.3, -12, 3],
  ['soft_whoosh', c('cloth', 'cloth') - 0.3, -8],
  ['water_fill', c('refill', 'water'), -14, 2.5],
  ['click', c('fact', 'ten'), -8],
  ['wind', TL.line('payoff').t0, -16, 5],
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
filters.push(`${all}amix=inputs=${nv + FX.length}:normalize=0:duration=longest,apad=whole_dur=${TL.DUR},atrim=0:${TL.DUR},loudnorm=I=-14:TP=-1.5:LRA=11[out]`);
fs.writeFileSync(path.join(TMP, 'filter.txt'), filters.join(';\n'));
ff([...inputs, '-filter_complex_script', path.join(TMP, 'filter.txt'), '-map', '[out]', '-ar', String(SR), '-ac', '2', path.join(DIR, 'audio', 'mix.wav')]);
console.log(`audio/mix.wav: ${TL.DUR} s (${own ? 'own voice' : 'placeholder TTS voice'})`);
