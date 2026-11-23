# Metrics vs reference

PASS  duration_s: 67.51 s  (reference 55-70 s)
PASS  words: 253  (reference 210-270)
PASS  words_per_s: 3.78  (reference 3.7-4.3)
PASS  first_word_s: 0.22 s  (reference 0-0.3 s)
PASS  end_hold_s: 0.32 s  (reference 0.1-0.7 s)
FAIL  speed_max: 123.3 px/f  (reference 0-90 px/f)
PASS  speed_p90: 22.0 px/f  (reference 0-25 px/f)
PASS  accel_p99: 6.67  (reference 0-9)
PASS  still_or_slow_pct: 77 %  (reference 65-100 %)
PASS  fast_moves: 9  (reference 6-14)
PASS  loudness_LUFS: -9.8  (reference -11--6)

```json
{
 "duration_s": 67.51,
 "words": 253,
 "words_per_s": 3.78,
 "first_word_s": 0.22,
 "end_hold_s": 0.32,
 "pauses_over_0.25s": [],
 "camera": {
  "speed_median": 0.0,
  "speed_p90": 22.0,
  "speed_max": 123.3,
  "accel_p99": 6.67,
  "still_or_slow_pct": 77,
  "fast_moves": 9,
  "moves_start_length_peak": [
   [
    14.93,
    1.6,
    18.1
   ],
   [
    24.87,
    1.63,
    23.6
   ],
   [
    26.87,
    0.93,
    56.3
   ],
   [
    36.4,
    1.73,
    15.6
   ],
   [
    39.17,
    2.37,
    95.7
   ],
   [
    42.33,
    1.93,
    80.1
   ],
   [
    52.67,
    1.97,
    40.5
   ],
   [
    55.27,
    1.73,
    123.3
   ],
   [
    59.43,
    2.2,
    27.9
   ]
  ],
  "camera_above_target_m_median": -0.6
 },
 "loudness_LUFS": -9.8
}
```