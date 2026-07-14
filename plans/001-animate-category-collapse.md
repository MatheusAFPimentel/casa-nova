# 001 — Animate category collapse/expand instead of teleporting

- **Status**: DONE
- **Commit**: 17127a5
- **Severity**: MEDIUM
- **Category**: Missed opportunity / Interruptibility
- **Estimated scope**: 1 file (`src/components/dashboard-client.tsx`), ~15 lines changed

## Problem

The category panel in the dashboard is conditionally rendered — it mounts and
unmounts instantly with no transition. Every click on a category header (the
"categorias recolhíveis" feature) causes the item list to teleport in/out
instead of animating, which reads as jarring/unfinished, especially since this
is a headline UX feature.

Current code, `src/components/dashboard-client.tsx:175-181`:

```tsx
{isExpanded && (
  <div id={panelId} className="flex flex-col gap-2">
    {catItems.map((item) => (
      <ItemCard key={item.id} item={item} householdId={householdId} />
    ))}
  </div>
)}
```

## Target

Always render the panel (so it can be measured/animated), and drive
open/closed state with the CSS grid-rows collapse technique — `grid-rows-[0fr]`
→ `grid-rows-[1fr]` on a `grid` container clips an `overflow-hidden` inner
wrapper. This animates height without ever touching `height`/`max-height`
directly (which would require a hardcoded pixel value), and without adding a
JS animation library.

```tsx
<div
  className={cn(
    "grid transition-[grid-template-rows] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
  )}
>
  <div className="overflow-hidden">
    <div
      id={panelId}
      aria-hidden={!isExpanded}
      className="flex flex-col gap-2 pt-2"
    >
      {catItems.map((item) => (
        <ItemCard key={item.id} item={item} householdId={householdId} />
      ))}
    </div>
  </div>
</div>
```

Notes on the target:
- `duration-[250ms]` sits inside the 200–500ms "modal/drawer"-scale budget in
  AUDIT.md — appropriate here since this is a group-level layout change, not a
  quick UI micro-interaction (which would call for <300ms but on the faster
  end).
- `ease-[cubic-bezier(0.23,1,0.32,1)]` is the strong `ease-out` curve from
  AUDIT.md §2 — correct because the panel is *entering/exiting* view.
- `aria-hidden={!isExpanded}` is added because the panel is now always in the
  DOM (previously it was removed from the DOM when collapsed, which achieved
  the same hiding-from-AT effect for free). Without this, a collapsed
  category's items would still be reachable by screen reader / find-in-page
  even though they're visually clipped to zero height. This preserves the
  accessibility behavior this project already invested in (aria-expanded /
  aria-controls added in the collapsible-categories feature).
- The outer `<div key={cat} className="flex flex-col gap-2">` wrapper
  (line 159) and the `<h2>`/button header above the panel (lines 160-174) are
  unchanged.

## Repo conventions to follow

- The project has no custom CSS files beyond `src/app/globals.css` (tokens
  only) — everything else is Tailwind utility classes, including arbitrary
  values (see `src/components/ui/select.tsx:86`, which already uses
  `origin-(--transform-origin)` and `duration-100` as arbitrary-ish Tailwind
  utilities). Follow that pattern: keep this animation as inline Tailwind
  classes on the JSX, do not add a new CSS class to `globals.css`.
- The existing chevron rotation on the same header
  (`dashboard-client.tsx:168-170`) already uses `transition-transform` — leave
  that as-is, it's a separate, already-correct piece of motion (not in scope).
- Use the `cn()` helper from `@/lib/utils` (already imported in this file) for
  the conditional class, matching how `category === c ? "..." : "..."` style
  conditionals are avoided elsewhere in favor of `cn()`.

## Steps

1. Open `src/components/dashboard-client.tsx`.
2. Replace the block at lines 175-181 (`{isExpanded && (...)}`) with the
   always-rendered grid-collapse version shown in **Target** above.
3. Confirm `cn` is imported (it already is, line 16) — no new imports needed.
4. Do not change `toggleCategory`, `defaultExpandedCategories`, or the header
   button (lines 160-174).

## Boundaries

- Do NOT touch any other file (`item-card.tsx`, `item-dialog.tsx`, etc.).
- Do NOT change the chevron rotation logic — it's already correct.
- Do NOT add a new dependency (no Framer Motion, no React Spring) — this is a
  pure CSS solution.
- Do NOT remove the `aria-expanded`/`aria-controls` attributes on the header
  button (lines 163-164) — they stay exactly as they are.
- If the JSX at lines 175-181 doesn't match what's quoted above (drift since
  commit `17127a5`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npm run build` — expect success, no type errors (no prop
  types change, `cn` already handles string unions fine).
- **Feel check**: run the dev server, go to `/dashboard`, and:
  - Click a category header with items pending (starts expanded) — confirm
    clicking it collapses smoothly over ~250ms, not instantly.
  - Click a category header that starts collapsed (all items bought/gifted)
    — confirm it expands smoothly, and item cards are visible and clickable
    immediately once open (no dead zone).
  - In Chrome DevTools → Animations panel, set playback to 25% and confirm
    the collapse looks like a smooth height shrink, not a jump or a flash of
    unclipped content.
  - With a screen reader (or by inspecting the DOM), confirm a collapsed
    category's panel has `aria-hidden="true"` and an expanded one does not.
- **Done when**: every category header toggles its panel with a smooth
  ~250ms grid-rows transition, `npm run build` passes, and collapsed panels
  are `aria-hidden`.
