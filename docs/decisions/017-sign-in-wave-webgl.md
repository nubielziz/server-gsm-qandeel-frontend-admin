# 017 Sign-in wave: WebGL for the motion

**Context.** The silk behind the sign-in card (`docs/login-design.md`) was drawn once with Canvas 2D. The product
owner asked for it to move. One 2D frame of the three sheets (about 10,000 gradient strokes) costs about 30 ms of main
thread on a fast desktop (i5-14400F, headless Chromium), and more on a laptop: far too slow to animate, and anything
near 30 frames a second would compete with typing in the form.

**Decision.** Draw the same model with raw WebGL 1 (no library). Each sheet is a fixed grid of points
(`silkMesh.ts`); the vertex shader lays out and shades each point exactly as `buildSheet` does (`silkGl.ts`), so a
frame costs a few uniform updates on the CPU. Motion comes from `silkMotion.ts`, pure functions of time: the folds
flow down each ribbon, the curves sway, the width breathes; time 0 is the still composition. The loop
(`paintMovingSilk.ts`) runs at up to 30 frames a second on `requestAnimationFrame` (so it stops in background tabs),
moves time on by at most 100 ms per frame, caps the drawing buffer at 3 million pixels (multisampling memory) and asks
for the low-power GPU.

It moves only when a GPU draws it (`failIfMajorPerformanceCaveat`) and reduced motion is off; otherwise it draws one
still frame. Without WebGL the 2D painter (`paintStillSilk.ts`) draws the still picture on a fresh canvas.

**Consequences.** Smooth motion for almost no CPU (about 2 ms of script a second, measured). The still picture is
the same in both painters: they share the shading constants and the fibre seed, and a test checks that both draw the
same threads. Two painters must now change together (`silk.ts` and `silkGl.ts`). No new dependency.
