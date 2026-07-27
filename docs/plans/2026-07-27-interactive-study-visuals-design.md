# Interactive Study Visuals Design

## Goal

Make every useful learning concept in the study hub visible, not just verbal.
The finished course will include an interactive visual for all 32 system-design
terms, 36 architecture items, and 29 algorithm patterns.

The visuals must explain movement, ownership, boundaries, or state changes. They
must not be decoration. The existing self-paced paths remain free of dates,
streaks, and daily assignments.

## Chosen direction

Use one reusable “living diagram” component backed by concept-specific scene
data. Each concept gets its own nodes, connections, active steps, and plain-
language narration. A small set of layouts—flow, fan-out, layers, cycle, split,
array, tree, grid, stack, and timeline—keeps the system maintainable without
making the lessons feel interchangeable.

This is a better fit than 97 separate components, which would repeat controls
and accessibility work. It is also more useful than static illustrations,
because the learner can step through cause and effect at their own pace.

## Visual language

- Canvas: `#F8FAFC`; dark canvas: `#020617`.
- Ink: `#0F172A`; muted ink: `#64748B`.
- Signal: amber `#F59E0B` and `#FBBF24` for the active idea or moving work.
- Success: `#047857` for completed outcomes.
- DM Sans remains the display and reading face. The existing monospace face is
  reserved for node labels, counters, and code.

Each visual sits in a bordered diagram card. One amber signal moves through the
system or algorithm as the frames advance. That moving signal is the visual
signature of the feature.

```text
+------------------------------------------------------+
|  HOW IT MOVES                              STEP 2 / 4 |
|                                                      |
|  [request] -----> [active node] -----> [result]      |
|                                                      |
|  The active node now owns the next decision.         |
|                                                      |
|  [Previous]  o  *  o  o  [Play / Pause]  [Next]     |
+------------------------------------------------------+
```

## Interaction

Every diagram starts at its first frame. The learner can move backward or
forward, choose a frame directly, or play the sequence. Playback advances at a
calm pace and stops on the last frame. Starting playback from the last frame
restarts the sequence.

Only two values are interactive state: the current frame and whether playback
is running. The current scene is derived from those values and the visual data.
Changing to another learning item resets the component naturally through its
key.

The diagram is responsive SVG with a visible caption. It has a programmatic
title, native buttons, clear focus styles, and an `aria-live` narration region.
Reduced-motion users retain all controls but do not get automatic playback or
moving dash animation.

## Placement

System-term visuals appear only after “Show definition.” This protects the
recall step: the diagram cannot give away the answer before the learner tries.

Architecture visuals appear after the short definition and before the deeper
details. They provide a shared mental model for the costs and examples that
follow.

Algorithm visuals stay visible throughout a lesson, directly below its stage
header. The same diagram can be replayed while the learner spots clues, writes
the recipe, traces input, or checks complexity.

## Data and component boundary

`src/server/study-visuals.ts` owns the serializable visual catalog and its
builders. It exposes a narrow lookup key: `term:<id>`, `architecture:<id>`, or
`algorithm:<id>`. The authenticated flashcard response includes that catalog.

`src/components/study/study-visual.tsx` owns rendering and interaction. It does
not know about terms, architecture, or algorithms; it only understands a
visual scene. This separates course content from behavior and keeps the large
quiz route from becoming a drawing engine.

## Coverage contract

Tests will derive the authoritative IDs from the three existing decks and
prove that:

1. Every one of the 97 learning items has a visual.
2. The catalog has no orphaned entries.
3. Every visual has at least two nodes and two frames.
4. Every edge and active frame reference points to a real node or edge.
5. Titles and frame narration are present.

These tests turn future additions into an explicit prompt: add the teaching
visual before shipping the new learning item.

## Self-critique

A reusable renderer can produce technically different but educationally empty
diagrams. The catalog must therefore use specific labels and narrated state
changes for each concept, and choose a topology that matches the idea. Playback
is optional and restrained so motion never competes with reading. No external
images, gradients, or decorative animation are needed.

## Verification

Run the full test, lint, typecheck, and production-build suite. Then inspect the
three decks on desktop and mobile, test every control by keyboard, confirm dark
mode contrast, and emulate reduced motion. After deployment, repeat the core
flow against production and inspect service health and logs.
