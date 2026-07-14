# 002 — Replace `transition-all` with explicit properties on Button/Badge/Tabs

- **Status**: DONE
- **Commit**: 17127a5
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 3 files, 1 line changed each

## Problem

Three of the most frequently-rendered interactive components in the app use
Tailwind's `transition-all` utility, which sets `transition-property: all`.
This animates every property that changes on the element — including layout
properties the element doesn't even use — instead of the specific properties
that actually change (color, background, border, box-shadow, and for Button,
transform). `transition: all` is called out in AUDIT.md §5 (Performance) as
always a finding, regardless of whether a specific dropped frame has been
observed, because it silently animates whatever future className changes get
added too.

These three components render on every button, every badge, and every tab in
the app (status filter tabs, category filter buttons, item action buttons) —
the highest-frequency interactive elements in the product.

Current code:

```tsx
// src/components/ui/button.tsx:7 (inside buttonVariants cva base classes)
"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

```tsx
// src/components/ui/badge.tsx:8 (inside badgeVariants cva base classes)
"group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
```

```tsx
// src/components/ui/tabs.tsx:61 (inside TabsTrigger className, first template literal)
"relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all cursor-pointer group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

## Target

Replace `transition-all` with a Tailwind arbitrary `transition-property` value
listing exactly the properties each component actually animates.

**Button** — animates color, background, border, focus ring (box-shadow), and
the `translate-y-px` press effect (transform):

```tsx
// src/components/ui/button.tsx:7 — only the "transition-all" token changes
"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

**Badge** — no transform/press state, only color/background/border/focus ring:

```tsx
// src/components/ui/badge.tsx:8 — only the "transition-all" token changes
"group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
```

**Tabs (TabsTrigger)** — same as Badge, no transform on the trigger itself
(the `after:` active-indicator bar already has its own separate
`after:transition-opacity`, untouched):

```tsx
// src/components/ui/tabs.tsx:61 — only the "transition-all" token changes
"relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-[color,background-color,border-color,box-shadow] cursor-pointer group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

## Repo conventions to follow

- Duration and easing are untouched in this plan — Tailwind's default
  transition duration (150ms) and default timing function apply exactly as
  they did before, on all three components. This plan only narrows *which*
  properties transition, not how fast or with what curve. Do not add
  `duration-*` or `ease-*` classes as part of this plan — that's out of scope
  (the audit did not flag duration/easing on these three components).
- `src/components/ui/select.tsx:44` already uses Tailwind's built-in
  `transition-colors` (not `transition-all`) on `SelectTrigger` — that
  component is already correct and is the reference pattern this plan brings
  Button/Badge/Tabs in line with. The only reason Button/Tabs can't use the
  built-in `transition-colors` utility is that they also need `transform`
  (Button) or already had `box-shadow` requirements the built-in shorthand
  doesn't cover cleanly — hence the explicit arbitrary property list instead.

## Steps

1. Open `src/components/ui/button.tsx`. In the `buttonVariants` base class
   string (line 7), replace the token `transition-all` with
   `transition-[color,background-color,border-color,box-shadow,transform]`.
   Change nothing else on that line.
2. Open `src/components/ui/badge.tsx`. In the `badgeVariants` base class
   string (line 8), replace the token `transition-all` with
   `transition-[color,background-color,border-color,box-shadow]`. Change
   nothing else on that line.
3. Open `src/components/ui/tabs.tsx`. In the `TabsTrigger` className string
   (line 61, the first template literal argument to `cn()`), replace the
   token `transition-all` with
   `transition-[color,background-color,border-color,box-shadow]`. Do not
   touch line 64 (`after:transition-opacity`) — that's a separate, correct,
   already-scoped transition on a different element (the `::after`
   pseudo-element active-tab indicator bar).

## Boundaries

- Do NOT change any duration or easing on these three components.
- Do NOT touch `select.tsx`, `input.tsx`, `textarea.tsx`, or `checkbox.tsx` —
  out of scope for this plan (checkbox is covered by a separate finding).
- Do NOT change any variant definitions, sizes, or other classes on these
  components — only the single `transition-all` token per file.
- If the exact string `transition-all` does not appear at the cited line in
  any of the three files (drift since commit `17127a5`), STOP and report
  instead of guessing which token to replace.

## Verification

- **Mechanical**: `npm run build` — expect success (pure className string
  edits, no type or logic changes). `npm run lint` should also pass
  unchanged.
- **Feel check**: run the dev server and confirm nothing regressed —
  hover/focus/active states on buttons, badges, and the dashboard status
  tabs should look and feel identical to before (same speed, same colors),
  since only the transitioned-property list narrowed, not the values:
  - Click a status tab (Todos/Falta/Comprado/Presente) — background still
    fades in smoothly on the active tab.
  - Press and hold a button — it still shifts down 1px on `:active` with no
    visible change in feel.
  - Tab-focus a button with keyboard — the focus ring still fades in.
  - In DevTools → Elements → computed styles, confirm `transition-property`
    on `.button`/`.badge`/`[data-slot=tabs-trigger]` no longer reads `all`.
- **Done when**: `npm run build` passes and manual spot-check shows identical
  visual behavior with a narrower `transition-property` in computed styles.
