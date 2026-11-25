# Metrics vs reference

PASS  duration_s: 56.06 s  (reference 55-70 s)
PASS  words: 211  (reference 210-270)
PASS  words_per_s: 3.8  (reference 3.7-4.3)
PASS  first_word_s: 0.22 s  (reference 0-0.3 s)
PASS  end_hold_s: 0.32 s  (reference 0.1-0.7 s)
PASS  speed_max: 67.3 px/f  (reference 0-90 px/f)
PASS  speed_p90: 17.1 px/f  (reference 0-25 px/f)
PASS  accel_p99: 3.55  (reference 0-9)
PASS  still_or_slow_pct: 77 %  (reference 65-100 %)
PASS  fast_moves: 8  (reference 6-14)
PASS  hard_cuts: 1  (reference 0-1)
PASS  loudness_LUFS: -10.0  (reference -11--6)

```json
{
 "duration_s": 56.06,
 "words": 211,
 "words_per_s": 3.8,
 "first_word_s": 0.22,
 "end_hold_s": 0.32,
 "pauses_over_0.25s": [],
 "hard_cuts": 1,
 "hard_cut_times_s": [
  14.1
 ],
 "camera": {
  "speed_median": 0.0,
  "speed_p90": 17.1,
  "speed_max": 67.3,
  "accel_p99": 3.55,
  "still_or_slow_pct": 77,
  "fast_moves": 8,
  "moves_start_length_peak": [
   [
    10.73,
    1.27,
    24.7
   ],
   [
    18.57,
    1.27,
    22.1
   ],
   [
    20.53,
    1.3,
    54.1
   ],
   [
    25.77,
    1.67,
    67.3
   ],
   [
    36.4,
    1.83,
    32.7
   ],
   [
    43.07,
    1.37,
    22.5
   ],
   [
    45.67,
    1.43,
    22.0
   ],
   [
    49.53,
    2.0,
    17.1
   ]
  ],
  "camera_above_target_m_median": -0.6
 },
 "loudness_LUFS": -10.0
}
```