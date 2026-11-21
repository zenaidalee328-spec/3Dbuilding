# Review kit, step 2: a film's numbers against the reference shorts, and 4x4 sheets (16 frames = 8 s each) with the
# time and the words being spoken, for the reviewer agents. Reads <film>/review/data.json + frames (review.js) and
# <film>/audio/mix.wav. Writes <film>/review/metrics.md, metrics.json, sheets/s_XX.jpg.
#   python tools/vh-engine/review/analyse.py <film folder>
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

film = os.path.abspath(sys.argv[1]); R = os.path.join(film, 'review')
D = json.load(open(os.path.join(R, 'data.json'), encoding='utf-8'))
REF = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reference.json'), encoding='utf-8'))
W, H, FPS = 1080, 1920, 30
out = {}
# --- voice: pace, pauses, first word, end hold
ws = D['words']; dur = D['DUR']
gaps = [ws[i + 1]['t0'] - ws[i]['t1'] for i in range(len(ws) - 1)]
out['duration_s'] = round(dur, 2); out['words'] = len(ws)
out['words_per_s'] = round(len(ws) / max(0.1, ws[-1]['t1'] - ws[0]['t0']), 2)
out['first_word_s'] = round(ws[0]['t0'], 2); out['end_hold_s'] = round(dur - ws[-1]['t1'], 2)
out['pauses_over_0.25s'] = [[round(ws[i]['t1'], 2), round(g, 2)] for i, g in enumerate(gaps) if g > 0.25]

# --- camera: how far last frame's aim point moves on this frame's screen (px/frame at 1080 wide)
def proj(c, p):
    px, py, pz, qx, qy, qz, fov = c
    f = np.array([qx - px, qy - py, qz - pz], float); f /= np.linalg.norm(f) + 1e-9
    r = np.cross(f, [0, 1, 0]); r /= np.linalg.norm(r) + 1e-9; u = np.cross(r, f)
    v = np.array(p, float) - np.array([px, py, pz], float); z = v @ f
    if z <= 0.01: return None
    th = math.tan(math.radians(fov) / 2)
    return ((v @ r) / (z * th * W / H) * W / 2, -(v @ u) / (z * th) * H / 2)

cams = D.get('cams') or []
if cams:
    sp = []
    for i in range(1, len(cams)):
        a = cams[i - 1]; d = math.dist(a[:3], a[3:6]); fw = np.array(a[3:6], float) - np.array(a[:3], float); fw /= np.linalg.norm(fw)
        s = proj(cams[i], list(np.array(a[:3], float) + fw * d)); sp.append(math.hypot(*s) if s else 999)
    sp = np.array(sp); acc = np.abs(np.diff(np.convolve(sp, np.ones(3) / 3, 'same')))
    moves, i = [], 0
    while i < len(sp):
        if sp[i] > 15:
            s0 = i
            while s0 > 0 and sp[s0 - 1] > 3: s0 -= 1
            e = i
            while e < len(sp) and sp[e] > 3: e += 1
            moves.append([round(s0 / FPS, 2), round((e - s0) / FPS, 2), round(float(sp[s0:e].max()), 1)]); i = e
        i += 1
    out['camera'] = {'speed_median': round(float(np.median(sp)), 1), 'speed_p90': round(float(np.percentile(sp, 90)), 1),
                     'speed_max': round(float(sp.max()), 1), 'accel_p99': round(float(np.percentile(acc, 99)), 2),
                     'still_or_slow_pct': round(float((sp < 6).mean() * 100)), 'fast_moves': len(moves),
                     'moves_start_length_peak': moves,
                     'camera_above_target_m_median': round(float(np.median([c[1] - c[4] for c in cams])), 1)}

# --- sound
mix = os.path.join(film, 'audio', 'mix.wav')
if os.path.exists(mix):
    e = subprocess.run(['ffmpeg', '-i', mix, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = e[e.rfind('Summary:'):]
    I = [l.split()[1] for l in tail.splitlines() if l.strip().startswith('I:')]
    out['loudness_LUFS'] = float(I[0]) if I else None

# --- pass / fail against the reference numbers
chk = []
for k, (lo, hi, unit) in REF['targets'].items():
    v = out.get(k) if k in out else (out.get('camera') or {}).get(k)
    ok = v is not None and lo <= v <= hi
    chk.append(f"{'PASS' if ok else 'FAIL'}  {k}: {v}{unit}  (reference {lo}-{hi}{unit})")
out['checks'] = chk
json.dump(out, open(os.path.join(R, 'metrics.json'), 'w'), indent=1)
md = ['# Metrics vs reference', ''] + chk + ['', '```json', json.dumps({k: v for k, v in out.items() if k != 'checks'}, indent=1), '```']
open(os.path.join(R, 'metrics.md'), 'w', encoding='utf-8').write('\n'.join(md))

# --- 4x4 sheets with the spoken words
os.makedirs(os.path.join(R, 'sheets'), exist_ok=True)
try: FN = ImageFont.truetype('arialbd.ttf', 22)
except Exception: FN = ImageFont.load_default()
said = lambda t: ' '.join(w['w'] for w in ws if w['t0'] <= t + 0.2 and w['t1'] >= t - 0.2)
fr = D['frames']
for s in range(0, len(fr), 16):
    img = Image.new('RGB', (4 * 270, 4 * 510), 'black'); d = ImageDraw.Draw(img)
    for k, f in enumerate(fr[s:s + 16]):
        x, y = (k % 4) * 270, (k // 4) * 510
        img.paste(Image.open(os.path.join(R, 'frames', f['f'])), (x, y + 30))
        d.text((x + 4, y + 4), f"{f['t']:.1f}s {said(f['t'])}"[:30], fill='yellow', font=FN)
    img.save(os.path.join(R, 'sheets', f's_{s // 16:02d}.jpg'), quality=85)
print('\n'.join(chk)); print('sheets:', len(range(0, len(fr), 16)), '->', os.path.join(R, 'sheets'))
