# Metrics vs reference

PASS  duration_s: 56.06 s  (reference 55-70 s)
PASS  words: 211  (reference 210-270)
PASS  words_per_s: 3.8  (reference 3.7-4.3)
PASS  first_word_s: 0.22 s  (reference 0-0.3 s)
PASS  end_hold_s: 0.32 s  (reference 0.1-0.7 s)
FAIL  speed_max: 935.9 px/f  (reference 0-90 px/f)
PASS  speed_p90: 19.3 px/f  (reference 0-25 px/f)
FAIL  accel_p99: 12.6  (reference 0-9)
PASS  still_or_slow_pct: 75 %  (reference 65-100 %)
PASS  fast_moves: 10  (reference 6-14)
PASS  loudness_LUFS: -10.0  (reference -11--6)

```json
{
 "duration_s": 56.06,
 "words": 211,
 "words_per_s": 3.8,
 "first_word_s": 0.22,
 "end_hold_s": 0.32,
 "pauses_over_0.25s": [],
 "camera": {
  "speed_median": 0.0,
  "speed_p90": 19.3,
  "speed_max": 935.9,
  "accel_p99": 12.6,
  "still_or_slow_pct": 75,
  "fast_moves": 10,
  "moves_start_length_peak": [
   [
    3.43,
    1.47,
    21.2
   ],
   [
    6.03,
    1.6,
    268.9
   ],
   [
    14.1,
    0.03,
    935.9
   ],
   [
    18.57,
    1.33,
    19.8
   ],
   [
    20.47,
    1.43,
    45.7
   ],
   [
    25.7,
    1.83,
    56.8
   ],
   [
    36.3,
    2.07,
    27.4
   ],
   [
    43.07,
    1.47,
    19.8
   ],
   [
    45.63,
    1.53,
    19.7
   ],
   [
    49.53,
    2.13,
    15.4
   ]
  ],
  "camera_above_target_m_median": 0.0
 },
 "loudness_LUFS": -10.0
}
```