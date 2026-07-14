# 003 — Add global `prefers-reduced-motion` support

- **Status**: DONE
- **Commit**: 17127a5
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (`src/app/globals.css`), ~10 lines added

## Problem

`src/app/globals.css` has no `@media (prefers-reduced-motion: reduce)` block
at all — confirmed by grepping the file and every component under
`src/components/`. Several animations already exist in the app (the item
dialog's fade+zoom, the select popover's fade+zoom+slide, the category
chevron's rotate, and — once plan 001 lands — the category panel's
grid-rows collapse), and none of them back off for users who have reduced
motion enabled at the OS level.

This is a real accessibility gap in a project that has already invested in
WCAG fixes elsewhere (contrast, aria-labels on checkboxes/progress bars,
landmark regions — see the earlier UX/accessibility pass). Motion sickness
from vestibular disorders is a documented WCAG 2.3.3 concern, and right now
nothing in this codebase honors the OS-level signal for it.

## Target

Add a global reduced-motion override to `src/app/globals.css`, inside the
existing `@layer base` block (right after the existing `html { @apply
font-sans; }` rule, still inside the same `@layer base { ... }`):

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

This is the standard, widely-used baseline pattern (near-zero duration
instead of literally `none`), because setting `animation: none !important`
outright would also delete opacity-based feedback that's still useful (e.g.
you'd lose all indication that a dialog opened). Collapsing duration to
`0.01ms` keeps every state change instant rather than removing it — the
dialog still fades in, just without a perceptible transition, which matches
AUDIT.md's "fewer and gentler, not zero" guidance while staying a single
global rule instead of auditing every animated component individually for a
transform-vs-opacity split.

## Repo conventions to follow

- `globals.css` already has exactly one `@layer base { ... }` block (lines
  120-130) — add the new media query inside it, don't create a second
  `@layer base` block.
- The file uses plain CSS (not `@apply` inside the media query is fine —
  `animation-duration`/`transition-duration`/`scroll-behavior` are raw CSS
  properties with no Tailwind utility equivalent for this kind of blanket
  override, so writing them directly is correct here and consistent with how
  `:root` and `.dark` already write raw CSS custom properties rather than
  Tailwind classes).

## Steps

1. Open `src/app/globals.css`.
2. Inside the existing `@layer base { ... }` block (starts at line 120),
   after the `html { @apply font-sans; }` rule (line 127-129) and before the
   block's closing `}` (line 130), insert the `@media (prefers-reduced-motion:
   reduce) { ... }` block shown in **Target** above.
3. Do not modify anything above line 120 (`:root`, `.dark`, `@theme inline`
   blocks) or anything else in the file.

## Boundaries

- Do NOT touch any component file — this is a single global CSS rule.
- Do NOT add per-component `motion-reduce:` Tailwind variants as part of this
  plan — that's a heavier, more surgical follow-up if the blanket rule proves
  too aggressive for a specific component; out of scope here.
- Do NOT add a React `useReducedMotion` hook or any JS — there is no
  JS-driven animation logic in this codebase to gate (confirmed: no
  Framer Motion / spring library in `package.json`).
- If `@layer base` in `globals.css` no longer looks like the block quoted in
  **Problem**/lines 120-130 (drift since commit `17127a5`), STOP and report
  instead of guessing where to insert the media query.

## Verification

- **Mechanical**: `npm run build` — expect success (pure CSS addition, no
  build-breaking syntax — verify the media query nests correctly inside
  `@layer base` without a stray brace).
- **Feel check**: in Chrome DevTools, open the Rendering tab (Cmd/Ctrl+Shift+P
  → "Show Rendering"), set "Emulate CSS media feature
  prefers-reduced-motion" to `reduce`, then reload `/dashboard` and confirm:
  - Opening the "Adicionar item" dialog still shows the dialog (no broken
    layout), but the fade/zoom entrance is imperceptibly fast rather than the
    normal ~100ms animated entrance.
  - Toggling a category open/closed (after plan 001) still works and the
    content still becomes visible/hidden, just without the animated
    height transition.
  - Turn the emulation back to "No emulation" and confirm all animations
    return to their normal speed — this rule must not affect users without
    the OS setting enabled.
- **Done when**: `npm run build` passes, and the DevTools reduced-motion
  emulation shows all transitions/animations collapse to near-instant while
  normal (non-emulated) behavior is unchanged.
