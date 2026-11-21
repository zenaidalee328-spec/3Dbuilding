import sys, numpy as np, cv2
path, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(path); prev = None; rows = []
while True:
    ok, f = cap.read()
    if not ok: break
    g = cv2.cvtColor(cv2.resize(f, (270, 480)), cv2.COLOR_BGR2GRAY)
    if prev is not None:
        fl = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 4, 21, 3, 5, 1.1, 0)
        # mask the caption band (middle) out
        m = np.ones(fl.shape[:2], bool); m[200:280, :] = False
        dx, dy = np.median(fl[..., 0][m]), np.median(fl[..., 1][m])
        # zoom: divergence of flow from centre
        yy, xx = np.mgrid[0:480, 0:270]; rx, ry = xx - 135, yy - 240
        div = np.median(((fl[..., 0] - dx) * rx + (fl[..., 1] - dy) * ry)[m] / (rx[m] ** 2 + ry[m] ** 2 + 1)) * 100
        mag = np.median(np.hypot(fl[..., 0], fl[..., 1])[m])
        rows.append((dx * 4, dy * 4, div, mag * 4))
    prev = g
np.save(out, np.array(rows)); print(len(rows), 'frames')
