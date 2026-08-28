# Implementation Plan: Life Dashboard

## Overview

Build a zero-dependency, single-page dashboard delivered as three plain files — `index.html`, `css/style.css`, and `js/script.js` — inside the `To-do List Life Dashboard/` folder. All logic runs in the browser with no build step. State is stored in `localStorage`. The JavaScript is structured as an IIFE-wrapped module pattern with seven modules: `storage`, `theme`, `clock`, `greeting`, `timer`, `todoList`, and `quickLinks`.

---

## Tasks

- [x] 1. Create the HTML scaffold
  - [x] 1.1 Write the full `index.html` structure
    - Create `To-do List Life Dashboard/index.html` with `<!DOCTYPE html>`, `<html lang="en" data-theme="light">`, and a `<head>` that links `css/style.css` and `js/script.js` (defer)
    - Add the `<header>` containing: `.clock` with `.clock__time` and `.clock__date` spans; `.greeting` with `.greeting__salutation`, `.greeting__name`, `.greeting__edit-btn` (aria-label="Edit name"), and `.greeting__form.hidden` (name input + save button); `.theme-toggle` button (aria-label="Switch to dark mode")
    - Add `<main class="dashboard-grid">` containing three `<section>` cards: `card--timer` (timer display, start/stop/reset buttons, duration input), `card--todo` (add form, warning div with role="alert", sort selector, `<ul class="todo__list" aria-live="polite">`), and `card--links` (label/url inputs, add button, `.links__grid`)
    - All interactive icon buttons must carry descriptive `aria-label` attributes
    - _Requirements: 1.1, 1.2, 2.1–2.6, 3.1, 3.6, 4.1–4.6, 5.1, 6.1, 6.6, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 12.6, 13.4, 14.1–14.3_

- [x] 2. Implement the CSS layer
  - [x] 2.1 Define CSS custom properties and theme switching
    - Write all colour and spacing tokens on `:root` (light palette: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-border`, `--color-danger`, `--color-done-text`, `--shadow-card`, `--radius-card`, `--transition-theme`)
    - Write `[data-theme="dark"]` overrides for all colour tokens
    - Apply `transition: var(--transition-theme)` to elements that change colour on theme switch
    - _Requirements: 14.2, 14.3_
  - [x] 2.2 Implement the responsive grid layout
    - Style `.dashboard-grid` with `display: grid; gap: 1.25rem; grid-template-columns: repeat(3, 1fr)` for viewports ≥ 901 px
    - Add `@media (max-width: 900px)` rule: two-column grid, `.card--links { grid-column: 1 / -1 }`
    - Add `@media (max-width: 600px)` rule: single-column grid, reset `.card--links` column span
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [x] 2.3 Style individual components
    - Style the `.card` base (background `var(--color-surface)`, border-radius, box-shadow, padding)
    - Style the `.header` layout (flexbox row, space-between alignment)
    - Style `.clock`, `.greeting` (typography, flex column for salutation + name)
    - Style `.timer__display` (large monospace font), `.timer--running` active-state indicator (e.g. accent colour border or background tint)
    - Style `.todo__list` (`list-style: none`), `.todo__item` (flex row with checkbox, text, edit and delete buttons), completed-task class (strikethrough + reduced opacity via `--color-done-text`)
    - Style `.links__grid` (flex wrap), `.link-chip` (pill shape, accent colour, hover state)
    - Style `.greeting__form.hidden` and `.todo__warning.hidden` as display-none via the `.hidden` class
    - Add visible focus rings on all focusable elements (`:focus-visible` outline using `--color-accent`)
    - Add `.u-sr-only` utility class for screen-reader-only text
    - _Requirements: 4.6, 8.3, 12.4, 14.2, 14.3_

- [x] 3. Checkpoint — Open `index.html` in a browser
  - Verify the three-column grid renders, theme toggle button is visible, all four panel headings appear, and no console errors are thrown. Ask the user if questions arise.

- [x] 4. Implement `js/script.js` — outer IIFE and `storage` module
  - [x] 4.1 Create the IIFE wrapper and `storage` module
    - Open `To-do List Life Dashboard/js/script.js` and wrap everything in `(function() { ... })();`
    - Implement `const storage = { get(key, fallback) { ... }, set(key, value) { ... } }`:
      - `get`: wraps `JSON.parse(localStorage.getItem(key))` in try/catch; returns `fallback` on any exception
      - `set`: wraps `localStorage.setItem(key, JSON.stringify(value))` in try/catch; calls `console.warn(...)` on exception; never throws
    - _Requirements: 16.1, 16.2_
  - [ ]* 4.2 Write property test for `storage.get` fault tolerance (Property 24)
    - **Property 24: Storage read fault tolerance**
    - **Validates: Requirements 16.1**
    - Use fast-check: `fc.anything()` as fallback; stub `localStorage.getItem` to throw; assert `storage.get(key, fallback) === fallback`
  - [ ]* 4.3 Write property test for `storage.set` fault tolerance (Property 25)
    - **Property 25: Storage write fault tolerance**
    - **Validates: Requirements 16.2**
    - Use fast-check: `fc.anything()` as value; stub `localStorage.setItem` to throw; assert no exception thrown and `console.warn` called

- [x] 5. Implement the `theme` module
  - [x] 5.1 Write the `theme` module
    - Implement `const theme = { init() { ... }, applyTheme(t) { ... } }` inside the IIFE
    - `init()`: reads `storage.get('theme', 'light')`, calls `applyTheme`
    - `applyTheme(t)`: sets `document.documentElement.dataset.theme = t`; updates toggle button `textContent` (`🌙` for light, `☀️` for dark) and `aria-label` (`'Switch to dark mode'` / `'Switch to light mode'`)
    - Toggle button click handler: derives opposite theme, calls `applyTheme`, then `storage.set('theme', newTheme)`
    - _Requirements: 14.1–14.7_

- [x] 6. Implement the `clock` module
  - [x] 6.1 Write the `clock` module
    - Implement `const clock = { init() { ... }, tick() { ... } }` inside the IIFE
    - `tick()`: constructs `new Date()`; formats time as zero-padded `HH:MM:SS`; formats date as `{weekday}, {month} {day}, {year}` (using `toLocaleDateString` options or manual lookup); writes both to pre-existing `.clock__time` and `.clock__date` `textContent` only — no DOM node creation
    - `init()`: calls `tick()` immediately, then `setInterval(tick, 1000)`
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 6.2 Write property test for clock time formatting (Property 1)
    - **Property 1: Clock time formatting**
    - **Validates: Requirements 1.1**
    - Use fast-check: `fc.date()`; extract the formatter function; assert output matches `/^\d{2}:\d{2}:\d{2}$/` and each segment matches the date's hours/minutes/seconds
  - [ ]* 6.3 Write property test for clock date formatting (Property 2)
    - **Property 2: Clock date formatting**
    - **Validates: Requirements 1.2**
    - Use fast-check: `fc.date()`; assert formatted string contains full weekday name, full month name, numeric day, and 4-digit year

- [x] 7. Implement the `greeting` module
  - [x] 7.1 Write the `greeting` module
    - Implement `const greeting = { init() { ... }, renderName() { ... }, renderSalutation() { ... }, saveName(name) { ... } }` inside the IIFE
    - `renderSalutation()`: reads `new Date().getHours()`; maps to one of the four salutation strings per the hour ranges in Requirements 2.1–2.4; writes to `.greeting__salutation`
    - `renderName()`: reads `storage.get('username', 'there')`; writes to `.greeting__name`
    - `saveName(name)`: trims input; if empty coerces to `'there'`; validates length ≤ 30; calls `storage.set('username', name)`; calls `renderName()`; hides the form
    - `init()`: calls `renderName()` and `renderSalutation()`; wires the edit button to toggle `.hidden` on `.greeting__form`; wires form submit and Enter key to `saveName`
    - _Requirements: 2.1–2.6, 3.1–3.7_
  - [ ]* 7.2 Write property test for greeting salutation coverage (Property 3)
    - **Property 3: Greeting salutation coverage**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - Use fast-check: `fc.integer({ min: 0, max: 23 })`; extract the salutation function; assert exactly one of the four strings is returned for every hour and that each boundary (5, 12, 17, 21) maps to the correct string
  - [ ]* 7.3 Write property test for name persistence round-trip (Property 4)
    - **Property 4: Name persistence round-trip**
    - **Validates: Requirements 3.2, 3.4, 3.5**
    - Use fast-check: `fc.string({ minLength: 1, maxLength: 30 })`; call `saveName`, then `storage.get('username', 'there')`; assert returned value equals the saved name

- [x] 8. Implement the `timer` module
  - [x] 8.1 Write the `timer` module — state, display, and start/stop/reset
    - Declare closure state: `let intervalId = null; let remaining = 1500; let configured = 1500;`
    - `renderDisplay()`: formats `remaining` as zero-padded `MM:SS`; writes to `.timer__display`; adds `.timer--running` class when `intervalId !== null`, removes it otherwise
    - `start()`: guard `if (intervalId !== null) return`; set `intervalId = setInterval(tick, 1000)`
    - `stop()`: `clearInterval(intervalId); intervalId = null`; calls `renderDisplay()`
    - `reset()`: calls `stop()`; sets `remaining = configured`; calls `renderDisplay()`
    - `tick()`: decrements `remaining`; calls `renderDisplay()`; if `remaining === 0` calls `stop()` and triggers completion notification (non-blocking toast `<div>` or `alert`)
    - `init()`: calls `renderDisplay()`; wires Start, Stop, Reset buttons and duration `<input>`
    - Duration `change` handler (`onDurationChange`): only acts when `intervalId === null`; parses integer; if outside `[1, 120]` or invalid falls back to 25; sets `configured = minutes * 60`; sets `remaining = configured`; calls `renderDisplay()`
    - _Requirements: 4.1–4.6, 5.1–5.5_
  - [ ]* 8.2 Write property test for timer countdown correctness (Property 5)
    - **Property 5: Timer countdown correctness**
    - **Validates: Requirements 4.2**
    - Use fast-check: `fc.integer({ min: 1, max: 7200 })` for D, `fc.nat()` for N (bounded to `< D`); advance timer N ticks; assert `remaining === D - N`
  - [ ]* 8.3 Write property test for timer stop preserves remaining (Property 6)
    - **Property 6: Timer stop preserves remaining time**
    - **Validates: Requirements 4.3**
    - Use fast-check: `fc.integer({ min: 0, max: 7200 })` for R; set `remaining = R`; call `stop()`; assert `remaining === R`
  - [ ]* 8.4 Write property test for timer reset round-trip (Property 7)
    - **Property 7: Timer reset round-trip**
    - **Validates: Requirements 4.4, 5.3**
    - Use fast-check: `fc.integer({ min: 1, max: 7200 })` for D, `fc.nat()` for N (≤ D); set `configured = D`; advance N ticks; call `reset()`; assert `remaining === D`
  - [ ]* 8.5 Write property test for timer completion stops automatically (Property 8)
    - **Property 8: Timer completion stops automatically**
    - **Validates: Requirements 4.5**
    - Use fast-check: `fc.integer({ min: 1, max: 7200 })` for D; advance exactly D ticks; assert `intervalId === null`
  - [ ]* 8.6 Write property test for timer active-state class invariant (Property 9)
    - **Property 9: Timer active-state class invariant**
    - **Validates: Requirements 4.6**
    - Use fast-check: `fc.boolean()` for running state; assert `.timer--running` is present iff `intervalId !== null`
  - [ ]* 8.7 Write property test for duration input validation (Property 10)
    - **Property 10: Duration input validation**
    - **Validates: Requirements 5.4**
    - Use fast-check: `fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 121 }), fc.string(), fc.constant(null))`; call `onDurationChange` with each value; assert `configured === 1500`
  - [ ]* 8.8 Write property test for running timer ignores duration changes (Property 11)
    - **Property 11: Running timer ignores duration changes**
    - **Validates: Requirements 5.5**
    - Use fast-check: `fc.integer({ min: 1, max: 7200 })` for R, `fc.anything()` for new duration; start timer; set `remaining = R`; fire duration change; assert `remaining === R`

- [x] 9. Checkpoint — Verify timer behaviour in browser
  - Start/stop/reset the timer; confirm the display counts down, the running visual state appears, and resetting restores the configured duration. Ask the user if questions arise.

- [x] 10. Implement the `todoList` module
  - [x] 10.1 Write the `todoList` module — core data operations
    - Declare closure state: `let tasks = []; let sortMode = 'default';`
    - `addTask(text)`: trim; reject empty (no-op); reject case-insensitive duplicate (show `.todo__warning` for 2 s via `setTimeout`, then hide); push `{ id: Date.now(), text, done: false }`; persist `storage.set('tasks', tasks)`; call `render()`; clear the input field
    - `deleteTask(id)`: filter `tasks`; persist; call `render()`
    - `toggleTask(id)`: map tasks flipping `.done`; persist; call `render()`
    - `editTask(id, newText)`: trim; reject empty (no-op); reject case-insensitive duplicate against other tasks (add error class to edit input, clear class on next input event); update `.text`; persist; call `render()`
    - `cancelEdit(li, task)`: restore original text span in the `<li>`
    - _Requirements: 6.2, 6.4, 6.7, 7.1, 7.2, 7.3, 8.2, 8.4, 9.3–9.6, 10.2, 10.3_
  - [ ]* 10.2 Write property test for task add round-trip (Property 12)
    - **Property 12: Task add round-trip**
    - **Validates: Requirements 6.2, 6.4, 6.7**
    - Use fast-check: `fc.string({ minLength: 1, maxLength: 100 })` (filtered for non-duplicates); assert list length +1, `done === false`, storage contains the task, input cleared
  - [ ]* 10.3 Write property test for task list persistence round-trip (Property 13)
    - **Property 13: Task list persistence round-trip**
    - **Validates: Requirements 6.5**
    - Use fast-check: `fc.array(fc.record({ id: fc.nat(), text: fc.string({ minLength: 1 }), done: fc.boolean() }))`; write to storage; call `init()`; assert in-memory `tasks` matches
  - [ ]* 10.4 Write property test for duplicate task rejection (Property 14)
    - **Property 14: Duplicate task rejection**
    - **Validates: Requirements 7.1**
    - Use fast-check: `fc.string({ minLength: 1, maxLength: 100 })`; add task once; attempt to add same text (any casing); assert list length unchanged
  - [ ]* 10.5 Write property test for duplicate edit rejection (Property 15)
    - **Property 15: Duplicate edit rejection**
    - **Validates: Requirements 7.3**
    - Use fast-check: two distinct `fc.string()` values; add both; attempt to edit A's text to a case-insensitive match of B; assert A's text unchanged
  - [ ]* 10.6 Write property test for task toggle round-trip (Property 16)
    - **Property 16: Task toggle round-trip**
    - **Validates: Requirements 8.2, 8.4**
    - Use fast-check: `fc.boolean()` for initial done state; toggle once → assert `!d`; toggle again → assert `d`; check storage after each
  - [x] 10.7 Write the `todoList` module — render and sort
    - `createTaskElement(task)`: create `<li>` with checkbox (checked = `task.done`), text `<span>`, edit `<button>`, delete `<button>`; when `task.done` add strikethrough/opacity class; wire checkbox to `toggleTask`, delete to `deleteTask`, edit to `startEdit`
    - `startEdit(li, task)`: replace text span with a pre-filled `<input>`; wire save button, Enter key (save), Escape key (`cancelEdit`)
    - `render()`: derive display list by applying `sortMode` to a shallow copy of `tasks` (never mutate `tasks`); clear `.todo__list`; append a `<li>` per task
    - Sort modes: `default` → insertion order; `az` → `localeCompare` ascending; `za` → descending; `done-last` → incomplete first
    - `init()`: `tasks = storage.get('tasks', [])`; `sortMode = storage.get('sort', 'default')`; set sort selector value; call `render()`; wire add form; wire sort selector change (`storage.set('sort', sortMode)`)
    - _Requirements: 6.5, 8.1, 8.3, 9.1, 9.2, 10.1, 11.1–11.5_
  - [ ]* 10.8 Write property test for task edit success round-trip (Property 17)
    - **Property 17: Task edit success round-trip**
    - **Validates: Requirements 9.3, 9.6**
    - Use fast-check: `fc.string({ minLength: 1, maxLength: 100 })` (non-duplicate); edit task; assert text updated and storage reflects change
  - [ ]* 10.9 Write property test for task edit cancel preserves text (Property 18)
    - **Property 18: Task edit cancel preserves text**
    - **Validates: Requirements 9.5**
    - Use fast-check: `fc.string()` as typed edit value; press Escape; assert task text equals original `T`
  - [ ]* 10.10 Write property test for task deletion (Property 19)
    - **Property 19: Task deletion removes exactly one task**
    - **Validates: Requirements 10.2, 10.3**
    - Use fast-check: `fc.array(..., { minLength: 1 })`; pick a random task; delete it; assert length `L-1` and no task with that id remains
  - [ ]* 10.11 Write property test for sort correctness (Property 20)
    - **Property 20: Sort correctness**
    - **Validates: Requirements 11.2**
    - Use fast-check: `fc.array(...)`, `fc.constantFrom('default','az','za','done-last')`; for each mode assert correct ordering invariant among adjacent rendered tasks
  - [ ]* 10.12 Write property test for sort does not mutate storage (Property 21)
    - **Property 21: Sort does not mutate storage**
    - **Validates: Requirements 11.5**
    - Use fast-check: `fc.array(...)`; add tasks in sequence; change sort modes; assert `storage.get('tasks')` always returns insertion-order array

- [x] 11. Implement the `quickLinks` module
  - [x] 11.1 Write the `quickLinks` module
    - Declare `const DEFAULT_LINKS = [{ id: 1, label: 'Google', url: 'https://google.com' }, ...]` (Google, YouTube, GitHub)
    - Declare `let links = []`
    - `addLink(label, url)`: trim both; reject if either empty (no-op); normalise URL — if not starting with `http://` or `https://` prepend `https://`; push `{ id: Date.now(), label, url }`; persist `storage.set('links', links)`; call `render()`
    - `removeLink(id)`: filter; persist; call `render()`
    - `render()`: clear `.links__grid`; for each link create an `<a>` chip (`target="_blank" rel="noopener noreferrer"`) and a remove `<button>` with aria-label; append to grid
    - `init()`: `links = storage.get('links', null)`; if `null` set `links = DEFAULT_LINKS` (do not persist defaults until a write); call `render()`; wire add form (submit + Enter on URL input)
    - _Requirements: 12.1–12.6, 13.1–13.5_
  - [ ]* 11.2 Write property test for URL scheme normalisation (Property 22)
    - **Property 22: URL scheme normalisation**
    - **Validates: Requirements 12.3**
    - Use fast-check: `fc.string()` filtered to not start with `http://` or `https://`; call `addLink`; assert stored URL starts with `https://` + original string; for URLs already prefixed, assert stored URL unchanged
  - [ ]* 11.3 Write property test for link add round-trip (Property 23)
    - **Property 23: Link add round-trip**
    - **Validates: Requirements 12.2, 13.1**
    - Use fast-check: `fc.string({ minLength: 1, maxLength: 20 })` for label, valid URL for url; call `addLink`; assert links length +1 and storage contains the object

- [x] 12. Wire everything together in the `DOMContentLoaded` bootstrap
  - [x] 12.1 Add the bootstrap call sequence
    - At the bottom of the IIFE (after all module declarations), add:
      ```js
      document.addEventListener('DOMContentLoaded', function () {
        storage.init && storage.init();
        theme.init();
        clock.init();
        greeting.init();
        timer.init();
        todoList.init();
        quickLinks.init();
      });
      ```
    - Confirm module init order matches the design bootstrap sequence
    - _Requirements: all modules_

- [x] 13. Checkpoint — Full smoke test in browser
  - Open `To-do List Life Dashboard/index.html` directly (file://). Verify:
    - Clock ticks every second
    - Greeting shows correct salutation for the current hour
    - Theme toggle switches between light and dark and persists on reload
    - Custom name saves and persists on reload
    - Timer starts, counts down, shows running state, reaches 00:00 and notifies, resets correctly, respects custom duration
    - Tasks can be added, checked, edited, deleted, sorted; duplicates are rejected with a 2-second warning; sort is persisted on reload
    - Quick links open in new tabs; links can be added and removed; default links appear on first load
    - Layout is responsive at the three breakpoints
    - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional property-based tests that require setting up [fast-check](https://fast-check.io) and a test runner (Vitest/Jest). They can be skipped for the core MVP build since no test framework is required by NFR-1.
- Each JS module is self-contained via closure and can be tested in isolation by injecting a mock `storage` object and a minimal DOM stub.
- All state mutations go through named module functions. The DOM is always re-rendered from the in-memory array; the DOM is never the source of truth.
- The `tasks` source array is never mutated by sort operations — only a shallow copy is sorted before rendering.
- Checkpoints (tasks 3, 9, 13) are manual browser checks, not automated tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "4.1"] },
    { "id": 2, "tasks": ["2.3", "4.2", "4.3", "5.1"] },
    { "id": 3, "tasks": ["6.1", "7.1", "8.1", "10.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.2", "7.3", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 5, "tasks": ["10.7", "11.1"] },
    { "id": 6, "tasks": ["10.8", "10.9", "10.10", "10.11", "10.12", "11.2", "11.3"] },
    { "id": 7, "tasks": ["12.1"] }
  ]
}
```
