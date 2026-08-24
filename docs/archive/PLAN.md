# Full Design System Overhaul & Enhancement Plan

## Current State Summary

### Web (Next.js)

| Aspect              | Finding                                                             | Severity |
| ------------------- | ------------------------------------------------------------------- | -------- |
| Animation lib       | `framer-motion` 12.x installed, used in **1/87** components — bloat | High     |
| Page transitions    | None (content flashes between routes)                               | Medium   |
| Top loading bar     | None, no visual feedback during navigation                          | Medium   |
| Click ripple        | None anywhere                                                       | Low      |
| Mobile animations   | **All disabled** via `hover: none` media query                      | Medium   |
| Loading patterns    | Skeleton (shimmer) exists, but pages use spinner only               | Low      |
| Global hover/active | Consistent 150ms transitions, active:scale(0.98)                    | Good     |
| Toast system        | `sonner` active but minimal customization                           | Low      |
| Input/Card patterns | Already unified in previous phases                                  | Good     |

### App (Flutter)

| Aspect               | Finding                                                                    | Severity |
| -------------------- | -------------------------------------------------------------------------- | -------- |
| Component hierarchy  | None — 41 widgets flat in `lib/widgets/`                                   | High     |
| Reusable primitives  | None — no AppButton, AppCard, AppDialog, AppInput                          | High     |
| `_HoverButton`       | Duplicated **3 times** across files                                        | Medium   |
| Tab switchers        | 3 parallel implementations (capsule, simple, top)                          | Medium   |
| Grid/section widgets | 4+ files with nearly identical loading/error/skeleton code                 | Medium   |
| File sizes           | `player_screen.dart` 3342 lines, `video_menu_bottom_sheet.dart` 1850 lines | High     |
| Theme bypass         | `FontUtils.systemFont()` used 200+ times, bypasses TextTheme               | High     |
| BorderRadius         | ~40+ hardcoded values, tokens exist but unused                             | Medium   |
| State mgmt           | Provider + `setState` (50+ state vars in player_screen)                    | High     |
| Performance          | `setState` on every position stream event, non-`const` widgets             | Critical |
| Short drama          | Aspect ratio detected from video dimensions — **works correctly**          | OK       |
| Hot section pattern  | 4 near-identical `hot_*_section.dart` files                                | Medium   |

---

## Phased Execution Plan

### Phase 1: Low-Risk App Cleanup (safe, no playback impact)

**Goal**: Consolidate duplication without touching player logic.

| #   | Task                                                                          | Files                                                                                             | Risk |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Consolidate 3 `_HoverButton` into shared `HoverButton` widget                 | `pc_player_controls.dart`, `player_screen.dart`, `live_player_screen.dart`                        | Low  |
| 1.2 | Extract hot section pattern into reusable `HotSection` component              | `hot_movies_section.dart`, `hot_tv_section.dart`, `hot_show_section.dart`, `bangumi_section.dart` | Low  |
| 1.3 | Unify `CustomRefreshIndicator` variants into one                              | `custom_refresh_indicator.dart` + grid files                                                      | Low  |
| 1.4 | Extract shared `GridLoadingState` / `GridErrorState` / `GridSkeleton` widgets | `history_grid.dart`, `favorites_grid.dart`, `bangumi_grid.dart`, `douban_movies_grid.dart`        | Low  |
| 1.5 | Standardize `BorderRadius.circular(X)` → `AppTheme.radiusX` across app        | All files (~40 sites)                                                                             | Low  |

### Phase 2: Create Primitive Component Library (Foundation)

**Goal**: Build shared primitives so the design system has a single source of truth.

| #   | Task                                                  | Description                                                                                                               |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Create `lib/components/app_button.dart`               | Wraps ElevatedButton/OutlinedButton/TextButton to consume theme tokens, supports loading state, icon slot, color variants |
| 2.2 | Create `lib/components/app_card.dart`                 | Reusable card wrapper with consistent padding, border-radius, elevation, hover effects                                    |
| 2.3 | Create `lib/components/app_dialog.dart`               | Base dialog template — handles dark/light bg, consistent border radius, padding, title/body/actions slots                 |
| 2.4 | Create `lib/components/app_bottom_sheet.dart`         | Base bottom sheet template — same consistency goals as dialog                                                             |
| 2.5 | Create `lib/components/app_text.dart`                 | Font scale component — replaces `FontUtils.systemFont()` with proper `TextTheme` inheritance                              |
| 2.6 | Create `lib/components/app_text_field.dart`           | Consistent input with theme tokens                                                                                        |
| 2.7 | Consolidate 3 tab switchers → single `AppTabSwitcher` | Unify capsule/simple/top into one configurable widget                                                                     |

### Phase 3: Web Micro-Interactions Enhancement

**Goal**: Make the UI feel polished and responsive with minimal bundle impact.

| #   | Task                                  | Description                                                                                                         |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Add route-level loading bar           | Lightweight CSS-based progress bar at top during navigation (custom hook, no nprogress dependency)                  |
| 3.2 | Add page entrance animations          | `animate-fluent2-fade-in` + `animate-fluent2-slide-up` triggered by `IntersectionObserver` (or simple CSS on mount) |
| 3.3 | Add ripple effect to buttons          | Tiny `useRippleEffect()` hook that spawns a `<span>` with ripple CSS animation on click                             |
| 3.4 | Remove framer-motion dependency       | Replace the single `AnimatedCardGrid` usage with CSS-only staggered entrance (saves ~30KB gzip)                     |
| 3.5 | Enhance button feedback               | Add brief 200ms color flash on press (already have scale(0.98), add a bg color transition)                          |
| 3.6 | Restore mobile animations selectively | Instead of disabling all animations on touch, throttle them (longer duration, reduced motion)                       |
| 3.7 | Skeleton page transitions             | Show a skeleton overlay during route transitions instead of blank screen                                            |

### Phase 4: App Performance (Player)

**Goal**: Optimize without changing playback behavior.

> **Golden Rule**: Do NOT touch media loading, opening, or playback control flow. Only change how the UI rebuilds and renders.

| #   | Task                                                                        | Description                                                              | Risk   |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| 4.1 | Replace `setState(() {})` in position stream with `ValueNotifier<Duration>` | Controls read a notifier instead of calling setState per frame           | Low    |
| 4.2 | Extract player controls into self-contained widgets (`PlayerControls`)      | Isolate rebuild scope so only controls rebuild on position changes       | Medium |
| 4.3 | Add `const` constructors to all static sub-widgets in controls              | ~30+ widget instantiations per build                                     | Low    |
| 4.4 | Consolidate position stream subscriptions (1 instead of 3)                  | Share parent subscription with progress bar                              | Low    |
| 4.5 | Reduce `setState` calls in player_screen loading                            | Batch loading state updates                                              | Low    |
| 4.6 | Replace `FontUtils.systemFont()` with `DefaultTextStyle` + `Theme`          | Leverage inherited text styles instead of duplicating at every call site | Medium |

### Phase 5: App Widget Migration (use new primitives)

**Goal**: Phase 2 components → phased into screens.

| #   | Task                                                       | Description                                                   |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| 5.1 | Migrate `All` dialogs to `AppDialog`                       | 7+ inline `AlertDialog` sites                                 |
| 5.2 | Migrate bottom sheets to `AppBottomSheet`                  | 10+ inline `showModalBottomSheet` sites                       |
| 5.3 | Migrate all buttons to `AppButton`                         | Replace inline `ElevatedButton.styleFrom`, `TextButton`, etc. |
| 5.4 | Replace `FontUtils.systemFont()` with `AppText` everywhere | 200+ call sites                                               |

---

## Detailed Findings for Each Phase

### Phase 1: Duplicate Components Map

**HoverButton (3 copies):**

```
pc_player_controls.dart:7    — class HoverButton
player_screen.dart:3294      — class _HoverButton
live_player_screen.dart:1859 — class _HoverButton
```

**Tab Switchers (3 copies):**

```
capsule_tab_switcher.dart  — Animated capsule, 325 lines
simple_tab_switcher.dart   — Scrollable row, 114 lines
top_tab_switcher.dart      — Fixed 3-tab, 282 lines
```

**Hot Sections (4 copies of same pattern):**

```
hot_movies_section.dart  — Loads MovieService data → RecommendationSection
hot_tv_section.dart      — Loads TvService data → RecommendationSection
hot_show_section.dart    — Loads ShowService data → RecommendationSection
bangumi_section.dart     — Loads different service but same pattern
```

**Grid Files with Duplicated Loading/Error/Skeleton:**

```
history_grid.dart
favorites_grid.dart
bangumi_grid.dart
douban_movies_grid.dart
```

### Phase 3: Web Motion Tokens (already exist in globals.css)

```
--duration-fast: 150ms
--duration-normal: 250ms
--duration-slow: 400ms
--ease-standard: cubic-bezier(0.33, 0, 0.67, 1)
--ease-decelerate: cubic-bezier(0, 0, 0, 1)
```

Animations defined: `fluent2-fade-in`, `fluent2-scale-in`, `fluent2-slide-up`, `fluent2-shimmer`, `fluent2-spinner`

### Phase 4: Performance Hotspots

1. **Position stream spam** (most impactful): `setState(() {})` inside player controls' position stream listener runs at video frame rate (~30-60fps). Whole controls widget tree rebuilds each time.

2. **50+ state variables in one widget**: `_PlayerScreenState` manages loading state, playing state, source state, episode state, UI state, etc. all in one monolithic build().

3. **Duplicate stream subscriptions**: Progress bar subscribes to `player.stream.position` independently from parent controls → 2 subscriptions for same data.

### Phase 5: Theme Token Audit (already aligned in previous phase)

All colors, spacing, border radius, shadows, durations, and easing curves in `AppTheme` match web CSS variables ✅

---

## Non-Goals (What We Won't Do)

- Replace `media_kit` player library
- Rewrite state management layer (Provider + setState stays)
- Add new pages or features
- Modify short drama detection or episode parsing logic
- Change API call flow or data models
