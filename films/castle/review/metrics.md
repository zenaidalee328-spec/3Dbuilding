# Metrics vs reference

PASS  duration_s: 56.06 s  (reference 55-70 s)
PASS  words: 211  (reference 210-270)
PASS  words_per_s: 3.8  (reference 3.7-4.3)
PASS  first_word_s: 0.22 s  (reference 0-0.3 s)
PASS  end_hold_s: 0.32 s  (reference 0.1-0.7 s)
FAIL  speed_max: 137.2 px/f  (reference 0-90 px/f)
FAIL  speed_p90: 48.4 px/f  (reference 0-25 px/f)
PASS  accel_p99: 7.46  (reference 0-9)
FAIL  still_or_slow_pct: 54 %  (reference 65-100 %)
FAIL  fast_moves: 18  (reference 6-14)
FAIL  loudness_LUFS: -11.1  (reference -11--6)

```json
{
 "duration_s": 56.06,
 "words": 211,
 "words_per_s": 3.8,
 "first_word_s": 0.22,
 "end_hold_s": 0.32,
 "pauses_over_0.25s": [],
 "camera": {
  "speed_median": 4.2,
  "speed_p90": 48.4,
  "speed_max": 137.2,
  "accel_p99": 7.46,
  "still_or_slow_pct": 54,
  "fast_moves": 18,
  "moves_start_length_peak": [
   [
    0.7,
    1.6,
    137.2
   ],
   [
    3.07,
    1.47,
    34.0
   ],
   [
    8.97,
    1.4,
    24.6
   ],
   [
    10.77,
    0.5,
    65.9
   ],
   [
    12.4,
    1.7,
    15.9
   ],
   [
    17.9,
    1.8,
    18.9
   ],
   [
    20.6,
    1.4,
    55.9
   ],
   [
    23.0,
    2.03,
    61.1
   ],
   [
    25.73,
    1.5,
    88.1
   ],
   [
    28.1,
    1.77,
    69.6
   ],
   [
    30.33,
    0.7,
    17.0
   ],
   [
    33.43,
    1.57,
    18.3
   ],
   [
    36.53,
    1.87,
    59.0
   ],
   [
    40.33,
    1.07,
    40.1
   ],
   [
    42.4,
    1.07,
    66.6
   ],
   [
    43.97,
    1.03,
    71.0
   ],
   [
    46.07,
    2.03,
    21.8
   ],
   [
    49.13,
    1.43,
    18.0
   ]
  ],
  "camera_above_target_m_median": 1.0
 },
 "loudness_LUFS": -11.1
}
```