# Where we stopped (2026-11-26)

Read first: CLAUDE.md, docs/HISTORY.md, claude/skills/shorts-studio/SKILL.md.

## The decision that changed (2026-11-26)
13 films exist and not one is `approved` or `published` - every one stops at v1 in `review` and then a new topic
starts. A first draft is never going to feel viral. **One film gets driven to finished before any new topic starts.**
That film is Castle: of the 13 it is the closest to the reference format (one place, characters, a monument, danger).
It is also the cheap way round - a new film from scratch costs several times what fixing a built one does.

## Done
- Castle round 3: all 12 checks pass (was 2 FAIL). Camera, lighting and planting fixed - films/castle/REVIEW.md
  has the before/after table and the reason for each change.
- Review kit: `analyse.py` now counts one-frame jumps as `hard_cuts` (reference target 0-1) and keeps them out of
  the speed and acceleration numbers, because optical flow across a cut measures nothing. `reference.json` gained
  the `hard_cuts` target.
- Castle is open in VideoHub live preview, waiting on the owner's frame notes.

## Next
1. Owner watches Castle in VideoHub and sends notes. Fix in code, mark each with `hub_note_update`.
2. Known and not yet done: the sleeping pose at 0-3 s reads face-down; 7.2 s is darker than its neighbours;
   brick colour shifts between shots; no ripple rings on splashes; the teeth do not visibly drop.
3. Render only when the owner asks. Then QA, then status `published` - the first one to get there.
4. Only after Castle is finished: the next topic. Reference-shaped, not an engineering explainer - a famous thing
   plus a hero plus comedy (Great Wall, Leaning Tower, Venice on water), not a greenhouse's drip system.

## A rule the review notes kept breaking
Owner notes have been removing the reference format's retention devices - "one Congratulations only", "no
genius/huge brain asides", "no cutaways". The Bridge reference has **four** Congratulations (5 s, 32 s, 47 s, 64 s)
and the idea sparkle **four** times; the Pyramid's best beat is a cutaway. Each note was reasonable on its own and
together they stripped the engine out. If a note works against reference.json or frame-notes.md, say so before
applying it instead of turning it into a rule.
