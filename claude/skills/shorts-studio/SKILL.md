---
name: shorts-studio
description: The owner's whole content system for vertical 3D "If you... / But... / So you... / Congratulations!" build shorts: topic -> researched script -> voice -> AI director's shot plan -> build in code -> AI review loop against the 4 reference shorts (creative + technical reviewers) -> owner review in VideoHub -> render -> QA -> GitHub. Use whenever the owner asks for a new short, a new topic, "next video", or to improve/review an existing short.
---

# Shorts studio (the content system)

Workspace: C:\Users\Musa\Documents\VideoHub (git repo zenaidalee328-spec/3Dbuilding). Talk to the owner in Roman Urdu.
Read `docs/HISTORY.md` first (rules, reference study, camera rules, Mixamo workflow, assets). Follow the `videohub`
skill for VideoHub (hub_live, notes, renders only when asked).

## Who does what (no two agents ever write the same file)
| Stage | Owner | Writes |
|---|---|---|
| 1 Topic | owner picks from 3-5 ideas you propose (one-location topics) | - |
| 2 Script + facts | `shorts-writer` agent (returns text) | main session saves `script.js` + `facts.md` |
| 3 Voice | main session: `make-voice.py` (Kokoro am_michael 1.18), SPEED 1.1 | `voice/` |
| 4 Direction | `shorts-director` agent (returns text) | main session saves `DIRECTION.md` |
| 5 Build | MAIN SESSION ONLY (the single writer of film code) | `film.js`, `fx.js`, assets |
| 6 Review loop | `shorts-creative-reviewer` + `shorts-tech-reviewer` IN PARALLEL (read-only) | main session saves `REVIEW.md` |
| 7 Owner review | owner in VideoHub (hub_live, notes, "Send to Claude") | - |
| 8 Render | only when the owner says so: `hub_render` | `outputs/` |
| 9 QA | `shorts-tech-reviewer` runs `short_qa.py` on the mp4 | main session saves `review/qa/` |
| 10 Save | main session: commit + push everything | git |

Agents never edit files (their final message is their output); the main session saves it and is the only one that
changes code. Reviewers run in parallel because they only read. If the creative and tech reviewers disagree, the
creative one wins on what we see, the tech one on numbers; resolve in the main session, never by asking agents to edit.

## Stage details
1. **Topic.** Propose 3-5 topics that happen in ONE place (a hill, a river crossing, a courtyard, a harbour). Owner picks.
2. **Script.** Agent `shorts-writer` with the topic. Save its SCRIPT lines into `films/<name>/script.js` (SPEED 1.1,
   END_HOLD 0.35, short pauses 0.05) and FACTS into `facts.md`. Show the owner the script (in Roman Urdu summary + the
   English lines) and go on unless he objects.
3. **Voice.** `sh tools/vh-engine/newfilm.sh <name> "<Title>"`, copy base.js/render.js/fonts/vendor from the latest film,
   then `<kit>/.venv/Scripts/python make-voice.py` (am_michael 1.18). Check 55-70 s; if shorter, ask the writer for 1-2 more steps.
4. **Direction.** Agent `shorts-director` with the film folder. Save `DIRECTION.md`. If NEED lists Mixamo motions/models,
   download them (owner signs in himself; flow in HISTORY.md; only move fresh files from Downloads).
5. **Build** exactly the DIRECTION: world, cast (`MODELS` with remy/man/girl/foe pools), props, FX, camera as SHOTS
   (`window.__camAt` must exist), sound (`fx.js`, music -32 dB, loudnorm to ~-9 LUFS), centre captions. Snap a few stills
   to catch crashes, nothing more.
6. **Review loop** (max 3 rounds):
   - `node tools/vh-engine/review/review.js films/<name>` then `python tools/vh-engine/review/analyse.py films/<name>`.
   - Launch both reviewers in ONE message (parallel) with the film path. Save both answers to `REVIEW.md` (round N).
   - Apply every high-impact + small/medium-effort change and every tech FAIL. Re-run. Stop when the creative verdict is
     RENDER and tech is OK, or after 3 rounds (then tell the owner what is still open).
7. **Owner review.** hub_project (set DUR) + hub_live. Tell the owner (Roman Urdu): the review score, what changed, and to
   watch it and send notes. Fix notes in code, mark them with hub_note_update, re-run step 6 if the change is big.
8. **Render** only on the owner's word (one at a time). Set status review.
9. **QA** on the rendered mp4 (`short_qa.py`, tech reviewer). Fix anything real with a partial render if the owner agrees.
10. **Save**: copy the small render (CRF 25) into `renders/`, update `docs/HISTORY.md` (film row + anything learned),
    commit and push. Never push Mixamo .fbx (public repo), the reference videos, or the HowItsBuiltKit.

## From github.com/mromidev/claude-animated-shorts (MIT) we reuse
- `short_qa.py` (frame-by-frame QA of the mp4) in tools/vh-engine/review/.
- Its lessons, built into the agents and this pipeline: one owner per file, verifier scores per area with numbered
  fixes, readability traps (props <2 m from the lens become blobs, half-cut foreground objects read as "balls", lit
  signs go unreadable), every hold needs a creeping push (static holds read as freezes), impact shakes that flip each
  frame and decay over ~7 frames, depth of field per beat (close-ups 12-16 px blur, wides 0), short crossfades when the
  place or time changes, a sight-line culler that hides anything between the lens and the subject.
- Not used: its 2D cartoon characters and Remotion (the owner wants realistic Mixamo people; our engine runs without Remotion).
