import sys, numpy as np
r = np.load(sys.argv[1]); dx, dy, div, mag = r.T
sp = np.hypot(dx, dy)                       # pan speed, px per frame at 1080 wide
# smooth a little (3 frames) for acceleration
k = np.ones(3) / 3; sps = np.convolve(sp, k, 'same'); acc = np.abs(np.diff(sps))
print('pan speed px/f: median %.1f  p75 %.1f  p90 %.1f  p99 %.1f  max %.1f' % tuple(np.percentile(sp, [50, 75, 90, 99, 100])))
print('share of frames: still(<1) %.0f%%  slow(1-6) %.0f%%  medium(6-20) %.0f%%  fast(>20) %.0f%%' % ((sp < 1).mean()*100, ((sp>=1)&(sp<6)).mean()*100, ((sp>=6)&(sp<20)).mean()*100, (sp>=20).mean()*100))
print('zoom (push/pull) |div| median %.2f p90 %.2f' % (np.median(np.abs(div)), np.percentile(np.abs(div), 90)))
print('accel px/f^2: median %.2f p90 %.2f p99 %.2f max %.1f' % tuple(np.percentile(acc, [50, 90, 99, 100])))
# fast moves: ramp up / down times
segs = []; i = 0; n = len(sps)
while i < n:
    if sps[i] > 15:
        s = i
        while s > 0 and sps[s-1] > 3: s -= 1
        e = i
        while e < n and sps[e] > 3: e += 1
        pk = s + int(np.argmax(sps[s:e])); segs.append((s/30, (pk-s)/30, (e-pk)/30, sps[pk], (e-s)/30)); i = e
    i += 1
print('fast moves (>15 px/f):', len(segs))
for t, up, dn, pk, L in segs: print('  t=%5.1f  speed-up %.2fs  slow-down %.2fs  peak %3.0f px/f  whole move %.2fs' % (t, up, dn, pk, L))
print('mean pan speed per second:', ' '.join(str(int(round(sp[i:i+30].mean()))) for i in range(0, n, 30)))
