# 004 Styling: Tailwind 3.4 with the demo's config

**Context.** The scaffold uses Tailwind 4. The demo is built on Tailwind 3.4 (`tailwind.config.cjs` with `rgb(var(--token) / <alpha-value>)` colours, a custom 7-step type scale, custom radii where bare `rounded` is 6px, `borderColor.DEFAULT` = hairline) plus `input.css` with `@apply` component classes and light/dark token sets.

**Options.** (a) Tailwind 4, port config to `@theme` and adapt `input.css`. (b) Tailwind 3.4 + PostCSS, reuse the demo's config and CSS nearly verbatim.

**Decision.** (b). `tailwind.config.ts` = the demo config with `content` pointed at `src/**/*.{ts,tsx}`; `src/styles/index.css` = the demo's `input.css` (tokens, dark mode, compact density, component classes). Fonts: `@fontsource/ibm-plex-sans` (400/500/600) and `@fontsource/ibm-plex-mono` (400/500), self-hosted.

**Why.** Tailwind 4 changes defaults the demo depends on (border colour, radius and shadow scale names, ring width, hover media query). Reusing 3.4 means the same class means the same pixels, so "keep the look" is cheap to verify.

**Consequences.** One PostCSS config. Moving to Tailwind 4 later is a contained upgrade with the official codemod.
