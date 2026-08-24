# 2026-06-30-Responsive-Fixes Implementation Plan

> **For agentic workers:** Use `compose:subagent` or `compose:execute` to implement this plan task-by-task.

**Goal:** Fix all 23 UI/UX responsive issues found in the audit across all pages and devices.

**Architecture:** Surgical CSS/JS changes to existing components — no new files needed. All fixes are Tailwind class adjustments, layout restructuring, and touch-target corrections.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, ArtPlayer

## Global Constraints

- Follow 5572-dev-workflow skill: read-before-edit, check deps, type check (`npx tsc --noEmit`), full build (`npm run build`)
- Never add comments to code
- Touch target minimum 44px on all interactive elements
- No fixed widths on mobile — use `w-full sm:w-*` or `w-[calc(100vw-Xrem)]`
- Test narrow viewports: assume 320px minimum width
- Account for safe areas with `env(safe-area-inset-*)`
- Use `min-h-dvh` instead of `min-h-screen` on mobile pages with dynamic browser UI
- DRY, YAGNI, TDD — no new files unless absolutely necessary

---

## Task 1: Play Page Player Height + Episode Selector Layout

**Covers:** Critical #1, #2 (player overflow, episode selector layout)

**Files:**

- Modify: `src/app/play/page.tsx:4622` (player height), `src/app/play/page.tsx:4610-4719` (episode selector grid)

**Interfaces:**

- Consumes: existing `EpisodeSelector` component, `CollapseButton`
- Produces: responsive player height that fits on phones < 500px tall

### Step 1: Fix player height to be responsive on small screens

Change line 4622 from:

```
className='relative w-full h-[50vh] min-h-[280px] sm:h-[360px] md:h-[420px] lg:h-full'
```

to:

```
className='relative w-full h-[45vh] sm:h-[340px] md:h-[380px] lg:h-full'
```

Remove `min-h-[280px]` — it forces 280px on all screens, which overflows on small phones. The `h-[45vh]` gives 45% of viewport, which on a 568px iPhone SE leaves ~300px for the episode selector. On larger screens, the sm/md/lg breakpoints take over.

### Step 2: Make episode selector collapsible on mobile

At line 4610, the episode selector grid uses `md:grid-cols-4` which gives 3:1 ratio on mobile. Change to:

- Below `md`: player takes full width, episode selector below it as a full-width section
- At `md:` and above: keep the 3:1 grid
- Add a mobile-only toggle to collapse/expand the episode selector panel

Specifically, modify the grid wrapper around line 4610:

```
// Change from:
className='grid grid-cols-1 md:grid-cols-4 gap-4'
// To:
className='grid grid-cols-1 md:grid-cols-4 gap-4'
```

And add `md:hidden` to the episode selector panel when collapsed on mobile, so it can be toggled. The existing `CollapseButton` already handles this — ensure it's visible on mobile (currently only at `lg:`).

### Step 3: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 4: Commit

```bash
git add src/app/play/page.tsx
git commit -m "fix(play): responsive player height and episode selector on mobile"
```

---

## Task 2: Download Page QR Code + Hero + Features Grid

**Covers:** Critical #3 (QR code too large), Low #22 (min-h-screen jump)

**Files:**

- Modify: `src/app/download/page.tsx:31-36` (QR code size), `src/app/download/page.tsx:90` (hero section), `src/app/download/page.tsx:234` (features grid)

**Interfaces:**

- Consumes: existing `QrCode` component
- Produces: mobile-friendly download page

### Step 1: Make QR code responsive

Change line 31-36 from:

```
className='w-[140px] h-[140px]'
```

to:

```
className='w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] md:w-[140px] md:h-[140px]'
```

### Step 2: Fix hero section viewport height

Change line 90 from:

```
<section className='relative min-h-screen flex items-center bg-black'>
```

to:

```
<section className='relative min-h-dvh flex items-center bg-black'>
```

### Step 3: Optimize features grid for tablets

Change line 234 from:

```
<div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
```

to:

```
<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
```

### Step 4: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 5: Commit

```bash
git add src/app/download/page.tsx
git commit -m "fix(download): responsive QR code, hero viewport, and tablet grid"
```

---

## Task 3: SkipController Touch Targets + Panel Bounds

**Covers:** High #5 (panel out of bounds, delete button small), High #6 (settings label hidden)

**Files:**

- Modify: `src/components/SkipController.tsx:1543-1556` (panel positioning), `src/components/SkipController.tsx:1600` (delete button), `src/components/SkipController.tsx:1653-1681` (settings button)

**Interfaces:**

- Consumes: existing `useDraggable` hook
- Produces: reachable touch targets and in-bounds panel

### Step 1: Fix delete button touch target

Change line 1600 from:

```
className='absolute top-1 right-1 p-1'
```

to:

```
className='absolute top-1 right-1 p-2'
```

### Step 2: Clamp panel position to viewport bounds

In the `useDraggable` hook (imported from `@/components/play/hooks/useDraggable`), add viewport clamping so the panel never goes off-screen. The hook should clamp `position.x` and `position.y` to:

```
left: max(0, x - panelWidth/2)
right: min(window.innerWidth - panelWidth, x + panelWidth/2)
top: max(0, y)
bottom: min(window.innerHeight - panelHeight, y)
```

### Step 3: Show settings label on mobile

Change line 1657 from:

```
<span className='text-sm font-medium text-white drop-shadow-lg transition-all duration-300 hidden sm:inline'>
  跳过设置
</span>
```

to:

```
<span className='text-sm font-medium text-white drop-shadow-lg transition-all duration-300 hidden xs:inline'>
  跳过设置
</span>
```

This shows the label at `xs:375px` instead of `sm:640px`, so most phones show the label.

### Step 4: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 5: Commit

```bash
git add src/components/SkipController.tsx
git commit -m "fix(skip-controller): touch targets, panel bounds, and mobile label visibility"
```

---

## Task 4: Admin Page Sidebar Responsiveness

**Covers:** High #4 (sidebar sticky on small screens)

**Files:**

- Modify: `src/app/admin/_content.tsx:421-422`

**Interfaces:**

- Consumes: existing sidebar layout with `sticky top-24`
- Produces: proper stacked layout on mobile/tablet

### Step 1: Fix admin grid for tablets

Change line 421 from:

```
<div className='grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
```

to:

```
<div className='grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]'>
```

### Step 2: Remove sticky on mobile/tablet

Change line 422 from:

```
<div className='sticky top-24'>
```

to:

```
<div className='sticky top-24 lg:sticky lg:top-24'>
```

Actually, better approach: remove `sticky` entirely for mobile and keep it only at `lg:`:

```
<div className='lg:sticky lg:top-24'>
```

This lets the sidebar flow naturally on mobile/tablet without covering content.

### Step 3: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 4: Commit

```bash
git add src/app/admin/_content.tsx
git commit -m "fix(admin): responsive sidebar layout for tablets"
```

---

## Task 5: VideoCard Badge Crowding + AI Button Mobile Access

**Covers:** High #8 (badge crowding), Medium #15 (AI button only desktop)

**Files:**

- Modify: `src/components/VideoCard.tsx:1446-1465` (rating badge), `src/components/VideoCard.tsx:1530-1573` (source badge), `src/components/VideoCard.tsx:1577-1631` (AI button), `src/components/VideoCard.tsx:1824` (MobileActionSheet)

**Interfaces:**

- Consumes: existing `VideoCard`, `MobileActionSheet`
- Produces: non-overlapping badges and mobile-accessible AI features

### Step 1: Adjust badge positions to prevent overlap

On the smallest container queries (`@[140px]`), reduce badge density. The rating badge at `top-2 right-2` and source badge at `bottom-2 right-2` can overlap on narrow cards.

Change rating badge (line ~1446) from:

```
className={`absolute top-2 right-2 ...`}
```

to:

```
className={`absolute top-1.5 right-1.5 ...`}
```

And the source count badge (line ~1530) from:

```
className={`absolute bottom-2 right-2 ...`}
```

to:

```
className={`absolute bottom-1.5 right-1.5 ...`}
```

### Step 2: Move AI button to MobileActionSheet

Change line ~1577 from:

```
className={`hidden md:block absolute ...`}
```

to:

```
className={`absolute ...`}
```

And add it to the MobileActionSheet menu items so mobile users can access AI features. The MobileActionSheet already exists at line 1824 — add an "AI 问答" option there.

### Step 3: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 4: Commit

```bash
git add src/components/VideoCard.tsx
git commit -m "fix(videocard): badge spacing and mobile AI access"
```

---

## Task 6: Download Panel Close Button + Episode Selector Source Info

**Covers:** High #9 (close button touch target), High #7 (source name tooltip), Medium #10 (prev/next buttons)

**Files:**

- Modify: `src/components/download/DownloadPanel.tsx:139-156` (close button), `src/components/EpisodeSelector.tsx:613-624` (source info), `src/app/play/page.tsx:4770-4786` (prev/next buttons)

**Interfaces:**

- Consumes: existing download panel, episode selector, play page episode nav
- Produces: accessible controls

### Step 1: Increase download panel close button touch target

Change the close button wrapper (around line 139-156) to add padding:

```
className='p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
```

### Step 2: Add tap-to-show tooltip for source names on mobile

In EpisodeSelector.tsx, the hover-only tooltip (line 619-623) doesn't work on touch. Add a `useState` per source to track click state, and toggle the tooltip on tap:

```jsx
const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

// In the title div onClick:
onClick={() => setExpandedSources(prev => {
  const next = new Set(prev);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
})}
```

Show tooltip when `expandedSources.has(index)` on mobile.

### Step 3: Increase prev/next episode button touch target

Change line ~4770 from:

```
className='flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium ...'
```

to:

```
className='flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-lg text-sm font-medium ...'
```

`py-3.5` = 14px padding = ~44px total height.

### Step 4: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 5: Commit

```bash
git add src/components/download/DownloadPanel.tsx src/components/EpisodeSelector.tsx src/app/play/page.tsx
git commit -m "fix(ui): touch targets for close button, source tooltips, episode nav"
```

---

## Task 7: Home Page Capsule Tabs + Search Results + Nav Text

**Covers:** Medium #11 (capsule tabs overflow), Medium #12 (search poster size), Medium #13 (nav text size)

**Files:**

- Modify: `src/components/home/HomeContentView.tsx:204-246` (capsule tabs), `src/app/search/_content.tsx:163` (poster size), `src/components/layout/PhoneLayout.tsx:49` (nav text), `src/components/MobileBottomNav.tsx` (nav text)

**Interfaces:**

- Consumes: existing capsule switch, search results, mobile nav
- Produces: readable text and properly sized thumbnails

### Step 1: Add horizontal scroll to capsule tabs

In HomeContentView.tsx, the upcoming filter buttons (line 204-246) use `flex flex-wrap gap-2`. On very narrow screens (< 340px), this can overflow. Add `overflow-x-auto` and `whitespace-nowrap`:

```
<div className='mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide'>
```

### Step 2: Increase search poster size on mobile

Change line 163 from:

```
<div className='relative h-28 w-20 sm:h-32 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800'>
```

to:

```
<div className='relative h-32 w-24 sm:h-36 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800'>
```

### Step 3: Increase nav label text size

Change PhoneLayout.tsx line 49 from:

```
<span className='text-[10px] font-medium'>{item.label}</span>
```

to:

```
<span className='text-[11px] font-medium'>{item.label}</span>
```

Also update MobileBottomNav.tsx — find the label span and increase from `text-[10px]` to `text-[11px]`.

### Step 4: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 5: Commit

```bash
git add src/components/home/HomeContentView.tsx src/app/search/_content.tsx src/components/layout/PhoneLayout.tsx src/components/MobileBottomNav.tsx
git commit -m "fix(ui): capsule tab scroll, search poster size, nav text readability"
```

---

## Task 8: PageLayout Consistency + VirtualGrid Resize + Global Fixes

**Covers:** Medium #14 (logo overlap), Low #19 (VirtualGrid resize race), Low #20 (layout inconsistency), Low #21 (download hero dvh), Medium #16 (danmaku panel overlap)

**Files:**

- Modify: `src/components/PageLayout.tsx:57-77` (mobile header), `src/components/VirtualGrid.tsx:46-61` (column detection), `src/app/globals.css` (danmaku panel z-index)

**Interfaces:**

- Consumes: existing PageLayout, VirtualGrid, danmaku config
- Produces: consistent layouts and stable component behavior

### Step 1: Constrain mobile header logo width

In PageLayout.tsx line 63, add max-width to prevent logo overlap:

```
<div className='text-base font-bold bg-linear-to-r ... max-w-[50%] truncate'>
```

### Step 2: Debounce VirtualGrid column detection

In VirtualGrid.tsx, wrap `detectColumns` in a debounce to prevent race conditions on resize:

```
const detectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const detectColumns = useCallback(() => {
  if (detectTimeoutRef.current) clearTimeout(detectTimeoutRef.current);
  detectTimeoutRef.current = setTimeout(() => {
    if (!probeRef.current) return;
    const style = window.getComputedStyle(probeRef.current);
    const cols = style.gridTemplateColumns.split(' ').length;
    if (cols > 0 && cols !== columnsRef.current) {
      columnsRef.current = cols;
      setColumns(cols);
    }
  }, 100);
}, []);
```

### Step 3: Fix danmaku panel z-index conflict

In `globals.css`, ensure the danmaku settings panel z-index is below the episode selector (`z-50`) but above player controls. Set danmaku panel to `z-45` (between player controls at z-40 and episode selector at z-50).

### Step 4: Type check and build

Run: `npx tsc --noEmit`
Run: `npm run build`

### Step 5: Commit

```bash
git add src/components/PageLayout.tsx src/components/VirtualGrid.tsx src/app/globals.css
git commit -m "fix(ui): header logo constraint, VirtualGrid debounce, danmaku z-index"
```
