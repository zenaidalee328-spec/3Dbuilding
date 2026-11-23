# The voiceover: Kokoro (free, on this PC) reads every line of timeline.js, with the line's pause after it, into
# voice/voice.wav; Parakeet then times every word (voice/words.json + voice/words.js), and timeline.js follows those times.
#   <kit>/.venv/Scripts/python make-voice.py [voice] [speed]      defaults: am_michael 1.18
# Tools: C:/Users/Musa/Documents/VideoHub/tools/claude-animation-skills (MIT): kit/models, kit/words.py
import json, os, subprocess, sys, shutil, tempfile
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.environ.get('ANIM_KIT', r'C:\Users\Musa\Documents\VideoHub\tools\claude-animation-skills\kit')
sys.path.insert(0, KIT)
from kokoro_onnx import Kokoro, EspeakConfig
import espeakng_loader

voice = sys.argv[1] if len(sys.argv) > 1 else 'am_michael'
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.18

# the lines (and their pauses) straight from timeline.js
lines = json.loads(subprocess.check_output(['node', '-e', "const {TL}=require('./timeline.js');console.log(JSON.stringify(TL.LINES))"], cwd=HERE))

data = espeakng_loader.get_data_path()
if len(data) > 100 or ' ' in data:
    short = os.path.join(tempfile.gettempdir(), 'kokoro-espeak-ng-data')
    if not os.path.exists(os.path.join(short, 'phontab')):
        shutil.rmtree(short, ignore_errors=True); shutil.copytree(data, short)
    data = short
k = Kokoro(os.path.join(KIT, 'models', 'kokoro-v1.0.onnx'), os.path.join(KIT, 'models', 'voices-v1.0.bin'),
           espeak_config=EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=data))

START, GAP = 0.4, 0.15
out, sr = [], 24000
for L in lines:
    a, sr = k.create(L['text'], voice=voice, speed=speed, lang='en-us')
    idx = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.06 * sr)]
    if not out: out.append(np.zeros(int(START * sr), dtype=a.dtype))
    out.append(a)
    out.append(np.zeros(int((L.get('pause', GAP)) * sr), dtype=a.dtype))
os.makedirs(os.path.join(HERE, 'voice'), exist_ok=True)
wav = os.path.join(HERE, 'voice', 'voice.wav')
sf.write(wav, np.concatenate(out), sr)
print(f'{voice} {speed}: {sum(len(x) for x in out) / sr:.2f} s -> voice/voice.wav')

# word timings
from words import timings
ws = timings(wav, ' '.join(L['text'] for L in lines))
json.dump(ws, open(os.path.join(HERE, 'voice', 'words.json'), 'w'), indent=0)
open(os.path.join(HERE, 'voice', 'words.js'), 'w').write('window.VO_WORDS = ' + json.dumps(ws) + ';\n')
print(len(ws), 'words timed; last ends at', ws[-1]['e'])
