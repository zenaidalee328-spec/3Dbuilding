# Metrics vs reference

PASS  duration_s: 56.06 s  (reference 55-70 s)
PASS  words: 211  (reference 210-270)
PASS  words_per_s: 3.8  (reference 3.7-4.3)
PASS  first_word_s: 0.22 s  (reference 0-0.3 s)
PASS  end_hold_s: 0.32 s  (reference 0.1-0.7 s)
FAIL  speed_max: 98.8 px/f  (reference 0-90 px/f)
FAIL  speed_p90: 29.5 px/f  (reference 0-25 px/f)
PASS  accel_p99: 6.01  (reference 0-9)
FAIL  still_or_slow_pct: 64 %  (reference 65-100 %)
PASS  fast_moves: 11  (reference 6-14)
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
  "speed_median": 1.5,
  "speed_p90": 29.5,
  "speed_max": 98.8,
  "accel_p99": 6.01,
  "still_or_slow_pct": 64,
  "fast_moves": 11,
  "moves_start_length_peak": [
   [
    3.3,
    1.63,
    27.6
   ],
   [
    6.4,
    1.43,
    49.6
   ],
   [
    8.33,
    1.37,
    79.6
   ],
   [
    13.5,
    1.7,
    98.8
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
    42.6,
    1.8,
    34.6
   ],
   [
    45.73,
    2.13,
    37.7
   ],
   [
    49.57,
    2.17,
    23.2
   ]
  ],
  "camera_above_target_m_median": 0.0
 },
 "loudness_LUFS": -10.0
}
```