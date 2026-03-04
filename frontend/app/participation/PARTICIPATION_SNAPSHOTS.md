# Participation Page – Layout Snapshots by Viewport

Expected layout behavior at key breakpoints for the Cold Calling Wheel and Breakout Groups.

## Breakpoints

| Width | Breakpoint | Description |
|-------|------------|-------------|
| 1440px | Desktop (≥1440) | Full desktop layout |
| 1024px | Tablet (768–1439) | Tablet layout |
| 375px | Mobile (<768) | Mobile layout |

---

## 1440px (Desktop)

### Container & Layout
- Main content: `max-width: 1100px`, `margin: 0 auto`, `padding-top: 48px`
- Wheel container: `width: clamp(360px, 48vw, 720px)` → ~691px at 1440px
- No horizontal overflow; `overflow-x: hidden` on body and `.participation-page`

### Header
- Sidebar toggler: `position: absolute`, `left: 18px`, `top: 18px`, `z-index: 60`
- Title: "Cold Calling Wheel" – 26px semibold
- Subtext: "CECS456 · Session #7" – 14px muted

### Wheel
- Centered in content area
- Circular soft shadow: `filter: drop-shadow(0 20px 30px rgba(28,30,34,0.06))`
- Hover: `translateY(-6px)`, `box-shadow: 0 18px 40px rgba(28,30,34,0.08)`
- Spin button: purple gradient, hover `scale(1.08)`, focus glow `box-shadow: 0 0 0 3px rgba(139,92,246,0.4)`

### Breakout Groups
- Full width of wheel area (max 1100px)
- Control panel: muted background `#F0F1F3`, small shadow
- Grid: 4 columns (`xl:grid-cols-4`)
- Controls always visible (no accordion)

---

## 1024px (Tablet)

### Container & Layout
- Same max-width 1100px; wheel scales: `clamp(360px, 48vw, 720px)` → ~491px at 1024px
- No horizontal overflow

### Header
- Same toggler position
- Same typography

### Wheel
- Same styling; smaller size
- Centered

### Breakout Groups
- Grid: 2–3 columns (`lg:grid-cols-3`)
- Controls visible (no accordion at lg)
- Stack: wheel → breakout controls → group cards

---

## 375px (Mobile)

### Container & Layout
- Wheel: `clamp(360px, 48vw, 720px)` → 360px (min)
- Content stacks vertically
- No horizontal overflow

### Header
- Same toggler; may overlap with sidebar when collapsed

### Wheel
- Full-width wheel (360px)
- Same hover/focus behavior

### Breakout Groups
- Controls in accordion: "Breakout Groups" toggle; expand/collapse
- Group cards: 1 column (`grid-cols-1`)
- Stack: wheel → breakout controls (collapsible) → group cards

---

## Accessibility

- Spin button: keyboard focusable, circular glow on `:focus-visible`
- Spin result: `aria-live="polite"` on result text
- Breakout accordion: `aria-expanded` on toggle

---

## Color Palette (Wheel Segments)

- Indigo: `#5B5FC7`, `#7578E0`, `#4A4DB5`
- Teal: `#0D9488`, `#14B8A6`, `#0F766E`
- Emerald: `#059669`, `#10B981`, `#047857`
- Amber: `#D97706`, `#F59E0B`, `#B45309`
- Coral: `#EA580C`, `#F97316`, `#C2410C`

Center/UI: neutral `#F7F8FA`, white.
