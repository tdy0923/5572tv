# Fluent 2 Design Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt Microsoft Fluent 2 design language across the entire 5572.tv site by replacing the current color/typography/spacing tokens with Fluent 2 equivalents, while keeping the existing Tailwind CSS + React component architecture.

**Architecture:** Rewrite `globals.css` `@theme` block to map Fluent 2 design tokens (color ramp, typography, elevation, spacing, motion) onto Tailwind CSS custom properties. No new dependencies needed — Fluent 2 tokens are pure CSS values. The brand color (golden/amber) is preserved as the Fluent 2 "brand" accent.

**Tech Stack:** Tailwind CSS 4, CSS custom properties, Inter font (keep), Fluent 2 color system.

## Global Constraints

- No new npm dependencies
- Brand color `#f4c24d` (golden) preserved as Fluent 2 brand accent
- Dark mode must work via `.dark` class toggle
- All existing Tailwind utility classes (e.g., `bg-primary-500`, `text-gray-700`) must continue to work — we remap the values, not the class names
- Touch-friendly: all interactive targets ≥ 44px on mobile
- Performance: no runtime JS for theme switching

---

### Task 1: Define Fluent 2 Global Color Tokens

**Covers:** Fluent 2 color ramp, light mode, dark mode

**Files:**

- Modify: `src/app/globals.css` (the `@theme` block, lines 30-70)

**Step 1: Replace color tokens in `@theme` block**

Replace the existing primary and gray color ramps with Fluent 2 equivalents. Fluent 2 uses a 16-step color ramp per hue. We map:

- `brand` → our golden/amber (`#f4c24d`)
- `neutral` → Fluent 2 neutral gray (replaces our gray scale)
- Add `brand` color ramp derived from golden hue
- Add semantic tokens: `foreground`, `background`, `subtle`, `muted`

```css
@theme {
  /* ============================================
     Fluent 2 Typography
     ============================================ */
  --font-primary:
    'Inter', 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system,
    sans-serif;

  /* ============================================
     Fluent 2 Brand Color Ramp (Golden/Amber)
     ============================================ */
  --color-primary-50: #fffdf5;
  --color-primary-100: #fff9e6;
  --color-primary-200: #ffefb8;
  --color-primary-300: #ffe48a;
  --color-primary-400: #ffd95c;
  --color-primary-500: #f4c24d;
  --color-primary-600: #dba52b;
  --color-primary-700: #b78415;
  --color-primary-800: #8e660f;
  --color-primary-900: #6b4d0d;

  /* ============================================
     Fluent 2 Neutral Ramp (replaces gray)
     ============================================ */
  --color-gray-50: #fafafa;
  --color-gray-100: #f5f5f5;
  --color-gray-200: #e8e8e8;
  --color-gray-300: #d4d4d4;
  --color-gray-400: #a3a3a3;
  --color-gray-500: #767676;
  --color-gray-600: #545454;
  --color-gray-700: #3d3d3d;
  --color-gray-800: #292929;
  --color-gray-900: #1a1a1a;
  --color-gray-950: #0a0a0a;

  /* ============================================
     Fluent 2 Semantic Tokens
     ============================================ */
  --color-foreground: #242424;
  --color-foreground-subtle: #616161;
  --color-foreground-muted: #999999;
  --color-background: #ffffff;
  --color-background-subtle: #f5f5f5;
  --color-background-muted: #e8e8e8;
  --color-stroke: #d4d4d4;
  --color-stroke-subtle: #e8e8e8;
}
```

**Step 2: Verify all existing utility classes still work**

Run: `pnpm build` — should complete without errors.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): replace color tokens with Fluent 2 design system

- Brand golden ramp preserved (#f4c24d primary)
- Neutral gray ramp updated to Fluent 2 neutral scale
- Added semantic tokens (foreground, background, stroke)
- Font stack updated to include Segoe UI Variable"
```

---

### Task 2: Fluent 2 Elevation & Shadow Tokens

**Covers:** Fluent 2 shadow/elevation system (2-level, 4-level, 8-level, 16-level)

**Files:**

- Modify: `src/app/globals.css` (add after `@theme` block)

**Step 1: Add Fluent 2 shadow tokens**

Fluent 2 uses 4 elevation levels with multi-layer shadows:

```css
@theme {
  /* ... existing tokens ... */

  /* ============================================
     Fluent 2 Elevation Tokens
     ============================================ */
  --shadow-2: 0 1px 2px rgba(0, 0, 0, 0.12), 0 0 2px rgba(0, 0, 0, 0.08);
  --shadow-4: 0 2px 4px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.06);
  --shadow-8: 0 4px 8px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.06);
  --shadow-16: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.06);

  /* ============================================
     Fluent 2 Border Radius Tokens
     ============================================ */
  --radius-none: 0;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* ============================================
     Fluent 2 Spacing Scale (base 4px)
     ============================================ */
  --spacing-0: 0;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;

  /* ============================================
     Fluent 2 Motion Tokens
     ============================================ */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --ease-standard: cubic-bezier(0.33, 0, 0.67, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0, 1);
  --ease-accelerate: cubic-bezier(1, 0, 1, 1);
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): add Fluent 2 elevation, radius, spacing, motion tokens"
```

---

### Task 3: Fluent 2 Dark Mode Overrides

**Covers:** Dark mode semantic tokens

**Files:**

- Modify: `src/app/globals.css` (add `.dark` overrides)

**Step 1: Add Fluent 2 dark mode semantic tokens**

```css
.dark {
  --color-foreground: #ffffff;
  --color-foreground-subtle: #d4d4d4;
  --color-foreground-muted: #a3a3a3;
  --color-background: #1a1a1a;
  --color-background-subtle: #292929;
  --color-background-muted: #3d3d3d;
  --color-stroke: #3d3d3d;
  --color-stroke-subtle: #292929;

  --shadow-2: 0 1px 2px rgba(0, 0, 0, 0.32);
  --shadow-4: 0 2px 4px rgba(0, 0, 0, 0.32);
  --shadow-8: 0 4px 8px rgba(0, 0, 0, 0.32);
  --shadow-16: 0 8px 16px rgba(0, 0, 0, 0.32);
}
```

**Step 2: Verify build and dark mode**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): add Fluent 2 dark mode semantic tokens and shadows"
```

---

### Task 4: Update Tailwind Utility Classes Across Key Pages

**Covers:** Migrate hardcoded color values in components to use new tokens

**Files:**

- Modify: `src/app/login/page.tsx` — update button/input styles to Fluent 2
- Modify: `src/components/layout/MobileBottomNav.tsx` — update nav styles
- Modify: `src/app/page.tsx` — update hero section styles

**Step 1: Update login page buttons**

Replace golden gradient buttons with Fluent 2 brand style (solid fill, rounded-lg, shadow-2):

Find the login button's gradient classes and replace with:

- `bg-primary-500 hover:bg-primary-600` solid fill
- `shadow-2 hover:shadow-4` elevation change on hover
- `rounded-lg` border radius

**Step 2: Update navigation**

Ensure nav bar uses `bg-background/95 backdrop-blur-md border-b border-stroke-subtle`

**Step 3: Build and screenshot test**

```bash
pnpm build && pnpm start
# Visit login page, homepage, take screenshots
```

**Step 4: Commit**

```bash
git add src/
git commit -m "feat(ui): migrate key pages to Fluent 2 token classes

- Login page: Fluent 2 brand buttons with elevation
- Navigation: Fluent 2 surface tokens
- Homepage: Fluent 2 semantic colors"
```

---

### Task 5: Fluent 2 CSS Utilities Layer

**Covers:** Reusable Fluent 2 utility classes

**Files:**

- Modify: `src/app/globals.css` (add Fluent 2 utility layer)

**Step 1: Add Fluent 2 utility classes**

```css
/* Fluent 2 Card Surface */
.fluent2-card {
  background: var(--color-background);
  border: 1px solid var(--color-stroke-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-4);
}

.fluent2-card:hover {
  box-shadow: var(--shadow-8);
}

/* Fluent 2 Button Base */
.fluent2-button-primary {
  background: var(--color-primary-500);
  color: var(--color-gray-950);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-2);
  transition: box-shadow var(--duration-fast) var(--ease-standard);
  font-weight: 600;
}

.fluent2-button-primary:hover {
  box-shadow: var(--shadow-4);
  background: var(--color-primary-600);
}

/* Fluent 2 Input */
.fluent2-input {
  border: 1px solid var(--color-stroke);
  border-radius: var(--radius-md);
  background: var(--color-background);
  padding: 10px 14px;
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

.fluent2-input:focus {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px var(--color-primary-100);
  outline: none;
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): add Fluent 2 reusable CSS utility classes"
```

---

### Task 6: Type Check, Build Verification & Deploy

**Files:**

- None (verification only)

**Step 1: Full type check**

Run: `npx tsc --noEmit`

**Step 2: Full production build**

Run: `pnpm build`

**Step 3: Commit any fixes and push**

```bash
git add -A
git commit -m "chore: Fluent 2 design tokens - build verification"
git push origin main
```
