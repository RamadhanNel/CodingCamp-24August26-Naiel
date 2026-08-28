# Design Document: Life Dashboard

## Overview

The Life Dashboard is a single-page web application delivered as three plain files — `index.html`, `css/style.css`, and `js/script.js`. It runs entirely in the browser with no backend, no build step, and no third-party libraries. All state is stored in `localStorage`.

The interface has four functional panels arranged in a responsive grid:

1. **Clock / Greeting** — live clock, date, and time-aware salutation with editable user name
2. **Focus Timer** — Pomodoro-style countdown with configurable duration
3. **To-Do List** — add, edit, delete, complete, and sort tasks; duplicate detection
4. **Quick Links** — user-defined link chips that open in new tabs

Design goals:
- Zero dependencies: any modern browser can open `index.html` directly from the filesystem
- All persistence via `localStorage` with graceful fallback on errors
- Light / dark theme driven entirely by CSS custom properties on `html[data-theme]`
- Accessibility: keyboard-navigable, ARIA labels on icon buttons, visible focus rings

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     index.html                      │
│  Semantic markup, data-* attributes, zero scripts   │
└────────────────────┬────────────────────────────────┘
                     │ links
          ┌──────────┴──────────┐
          │    css/style.css    │        js/script.js
          │  Custom properties  │    ┌────────────────────────────────┐
          │  CSS Grid / Flex    │    │  Module bootstrap (DOMContent  │
          │  Media queries      │    │  Loaded) calls each module's   │
          │  Theme switching    │    │  init() in order               │
          └─────────────────────┘    │                                │
                                     │  ┌──────────┐  ┌───────────┐  │
                                     │  │ storage  │  │   theme   │  │
                                     │  └────┬─────┘  └─────┬─────┘  │
                                     │  ┌────┴────────────┐  │        │
                                     │  │ clock / greeting │◄─┘        │
                                     │  └─────────────────┘           │
                                     │  ┌──────────────────┐          │
                                     │  │     timer        │          │
                                     │  └──────────────────┘          │
                                     │  ┌──────────────────┐          │
                                     │  │    todoList      │          │
                                     │  └──────────────────┘          │
                                     │  ┌──────────────────┐          │
                                     │  │   quickLinks     │          │
                                     │  └──────────────────┘          │
                                     └────────────────────────────────┘
```

All JavaScript lives in one file and is structured as an IIFE-wrapped module pattern — no ES module `import/export` is used so the file works with a plain `<script src="...">` tag. Each logical unit is a const object literal with an `init()` method and private helper functions via closure.

---

## Components and Interfaces

### Bootstrap

```
DOMContentLoaded → [
  storage.init(),       // no-op; validates localStorage is reachable
  theme.init(),         // applies persisted or default theme
  clock.init(),         // starts 1-second interval
  greeting.init(),      // renders name, wires edit form
  timer.init(),         // renders initial display, wires buttons
  todoList.init(),      // loads tasks, renders list, wires controls
  quickLinks.init()     // loads links, renders chips, wires add form
]
```

### `storage` module

Public surface:

| Function | Signature | Behaviour |
|---|---|---|
| `get` | `(key, fallback)` | `JSON.parse(localStorage.getItem(key))` — returns `fallback` on any exception |
| `set` | `(key, value)` | `localStorage.setItem(key, JSON.stringify(value))` — logs a console warning on any exception, never throws |

All other modules interact with `localStorage` exclusively through `storage.get` and `storage.set`.

### `theme` module

- On `init()`: reads `storage.get('theme', 'light')`, calls `applyTheme(value)`.
- `applyTheme(theme)`: sets `document.documentElement.dataset.theme = theme` and updates the toggle button icon (`🌙` for light mode, `☀️` for dark mode) and `aria-label`.
- Toggle button click handler: derives opposite theme, calls `applyTheme`, then `storage.set('theme', newTheme)`.

### `clock` module

- On `init()`: calls `tick()` immediately, then `setInterval(tick, 1000)`.
- `tick()`: reads `new Date()`, formats time as `HH:MM:SS` (zero-padded), formats date as `{weekday}, {month} {day}, {year}`, writes both into pre-allocated `<span>` elements. No DOM node creation on tick — only `textContent` mutation to prevent layout shift (Req 1.3).

### `greeting` module

- On `init()`: calls `renderName()` and `renderSalutation()`, wires the edit button to toggle the name-input form.
- `renderSalutation()`: derives the greeting string from `new Date().getHours()` using the boundary table in Req 2.1–2.4, writes to the salutation `<span>`.
- `renderName()`: reads `storage.get('username', 'there')`, writes to the name `<span>`.
- Name form submit / Enter key: validates non-empty (trims whitespace), falls back to `'there'` for empty, calls `storage.set('username', name)`, calls `renderName()`, hides the form.
- Max-length 30 enforced by `maxlength="30"` on the `<input>` (Req 3.6).

### `timer` module

State (in closure):

```
let intervalId = null;   // non-null while running
let remaining  = 1500;   // seconds
let configured = 1500;   // seconds — tracks the duration input value
```

- `init()`: reads duration input default (25), calls `renderDisplay()`, wires Start / Stop / Reset buttons and the duration `<input>`.
- `renderDisplay()`: writes `MM:SS` zero-padded string into the timer `<span>`. Adds/removes `.timer--running` class for the active visual state (Req 4.6).
- Start: guard if `intervalId !== null`; set interval calling `tick()` every 1000 ms; add `.timer--running`.
- Stop: `clearInterval(intervalId); intervalId = null`; remove `.timer--running`.
- Reset: call Stop; set `remaining = configured`; call `renderDisplay()`.
- `tick()`: decrement `remaining`; call `renderDisplay()`; if `remaining === 0` call Stop and trigger completion notification (`alert` or a non-blocking toast `<div>`).
- Duration input `change` event: only acts when `intervalId === null` (Req 5.5); parses integer, validates 1–120, falls back to 25 (Req 5.4); sets `configured = minutes * 60`; sets `remaining = configured`; calls `renderDisplay()`.

### `todoList` module

State (in closure):

```
let tasks    = [];   // Task[]  — source of truth, insertion order
let sortMode = 'default';
```

Public operations: `addTask`, `deleteTask`, `toggleTask`, `editTask`, `render`.

- `init()`: loads `tasks` from `storage.get('tasks', [])`, loads `sortMode` from `storage.get('sort', 'default')`, sets sort selector value, calls `render()`, wires add form, sort selector.
- `addTask(text)`: trims; rejects empty; rejects case-insensitive duplicate (shows 2-second warning, Req 7.1–7.2); pushes `{ id: Date.now(), text, done: false }`; persists; calls `render()`.
- `deleteTask(id)`: filters tasks; persists; calls `render()`.
- `toggleTask(id)`: maps tasks toggling `.done`; persists; calls `render()`.
- `editTask(id, newText)`: trims; rejects empty (no-op); rejects duplicate against other tasks (Req 7.3); updates `.text`; persists; calls `render()`.
- `render()`: derives display list by applying `sortMode` to a shallow copy of `tasks` (source array never mutated by sort, Req 11.5); clears the task list `<ul>`; creates a `<li>` per task using `createTaskElement(task)`; appends to DOM.
- `createTaskElement(task)`: creates checkbox, text span, edit button, delete button; if `task.done` adds strikethrough/opacity class (Req 8.3).
- Sort modes: `'default'` → insertion order; `'az'` → locale-compare ascending; `'za'` → locale-compare descending; `'done-last'` → incomplete first, then done.
- Persist helper: `storage.set('tasks', tasks)` — always the unsorted source array.

### `quickLinks` module

State (in closure):

```
let links = [];   // Link[]
```

Default links (used when storage is empty, Req 13.3):

```js
const DEFAULT_LINKS = [
  { id: 1, label: 'Google',  url: 'https://google.com'  },
  { id: 2, label: 'YouTube', url: 'https://youtube.com' },
  { id: 3, label: 'GitHub',  url: 'https://github.com'  },
];
```

- `init()`: loads `links` from `storage.get('links', null)`; if `null` sets `links = DEFAULT_LINKS` (does not persist defaults until a write occurs); calls `render()`, wires add form.
- `addLink(label, url)`: trims both; rejects if either empty; normalises URL (prepends `https://` if not starting with `http://` or `https://`, Req 12.3); pushes `{ id: Date.now(), label, url }`; persists; calls `render()`.
- `removeLink(id)`: filters; persists; calls `render()`.
- `render()`: clears chip container; creates an `<a>` chip per link with `target="_blank" rel="noopener noreferrer"` (Req 12.4) and a remove `<button>`.

---

## Data Models

### `Task`

```js
{
  id:   number,   // Date.now() at creation time — unique within session
  text: string,   // 1–100 chars, trimmed
  done: boolean   // false = pending, true = complete
}
```

localStorage key: `"tasks"` — stored as a JSON array of Task objects in insertion order.

### `Link`

```js
{
  id:    number,  // Date.now() at creation time
  label: string,  // 1–20 chars, trimmed
  url:   string   // always starts with http:// or https://
}
```

localStorage key: `"links"` — stored as a JSON array of Link objects.

### All localStorage keys

| Key | Type | Default | Owner module |
|---|---|---|---|
| `"username"` | `string` | `"there"` | greeting |
| `"theme"` | `"light" \| "dark"` | `"light"` | theme |
| `"tasks"` | `Task[]` | `[]` | todoList |
| `"sort"` | `"default" \| "az" \| "za" \| "done-last"` | `"default"` | todoList |
| `"links"` | `Link[]` | `null` (defaults loaded in memory) | quickLinks |

---

## HTML Layout Structure

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>…</head>
<body>
  <header class="header">
    <div class="clock">
      <span class="clock__time"></span>
      <span class="clock__date"></span>
    </div>
    <div class="greeting">
      <span class="greeting__salutation"></span>
      <span class="greeting__name"></span>
      <button class="greeting__edit-btn" aria-label="Edit name">✏️</button>
      <form class="greeting__form hidden">
        <input class="greeting__input" maxlength="30" type="text" />
        <button type="submit">Save</button>
      </form>
    </div>
    <button class="theme-toggle" aria-label="Switch to dark mode">🌙</button>
  </header>

  <main class="dashboard-grid">
    <!-- Timer card -->
    <section class="card card--timer" aria-label="Focus Timer">
      <h2 class="card__title">Focus Timer</h2>
      <span class="timer__display">25:00</span>
      <div class="timer__controls">
        <button id="timer-start">Start</button>
        <button id="timer-stop">Stop</button>
        <button id="timer-reset">Reset</button>
      </div>
      <label>
        Duration (min):
        <input id="timer-duration" type="number" min="1" max="120" value="25" />
      </label>
    </section>

    <!-- Todo card -->
    <section class="card card--todo" aria-label="To-Do List">
      <h2 class="card__title">Tasks</h2>
      <form class="todo__add-form">
        <input class="todo__input" maxlength="100" type="text" placeholder="New task…" />
        <button type="submit">Add</button>
      </form>
      <div class="todo__warning hidden" role="alert"></div>
      <label>
        Sort:
        <select id="todo-sort">
          <option value="default">Default</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="done-last">Done Last</option>
        </select>
      </label>
      <ul class="todo__list" aria-live="polite"></ul>
    </section>

    <!-- Links card -->
    <section class="card card--links" aria-label="Quick Links">
      <h2 class="card__title">Quick Links</h2>
      <form class="links__add-form">
        <input class="links__label-input" maxlength="20" type="text" placeholder="Label" />
        <input class="links__url-input" type="url" placeholder="URL" />
        <button type="submit">Add</button>
      </form>
      <div class="links__grid"></div>
    </section>
  </main>
</body>
</html>
```

---

## CSS Architecture

### Custom Properties (theming)

All colour tokens live on `:root` (light) and `[data-theme="dark"]` (dark). No inline styles. Switching theme is a single `dataset.theme` write.

```css
:root {
  --color-bg:          #f5f5f5;
  --color-surface:     #ffffff;
  --color-text:        #1a1a1a;
  --color-text-muted:  #6b7280;
  --color-accent:      #6366f1;
  --color-border:      #e5e7eb;
  --color-danger:      #ef4444;
  --color-done-text:   #9ca3af;
  --shadow-card:       0 1px 3px rgba(0,0,0,.08);
  --radius-card:       0.75rem;
  --transition-theme:  background-color 0.2s, color 0.2s;
}

[data-theme="dark"] {
  --color-bg:          #111827;
  --color-surface:     #1f2937;
  --color-text:        #f9fafb;
  --color-text-muted:  #9ca3af;
  --color-accent:      #818cf8;
  --color-border:      #374151;
  --color-danger:      #f87171;
  --color-done-text:   #6b7280;
  --shadow-card:       0 1px 3px rgba(0,0,0,.4);
}
```

### Responsive Grid

```css
.dashboard-grid {
  display: grid;
  gap: 1.25rem;
  padding: 1.25rem;
  /* ≥ 901px: 3 equal columns */
  grid-template-columns: repeat(3, 1fr);
}

/* 601–900px: 2 columns, links card spans both */
@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .card--links {
    grid-column: 1 / -1;
  }
}

/* ≤ 600px: single column */
@media (max-width: 600px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .card--links {
    grid-column: auto;
  }
}
```

### Class Naming Convention

BEM-lite: `block__element` and `block--modifier`. No deep nesting. State classes prefixed with `.is-` (e.g. `.is-hidden`, `.is-running`) for JS-toggled states. Layout helpers use a `u-` prefix (e.g. `u-sr-only`).

---

## Component Interaction / Event Flow

```
User action                 JS handler               Side effects
─────────────────────────── ──────────────────────── ──────────────────────
Click "Start" (timer)     → timer.start()          → setInterval, add .timer--running class
Click "Stop"  (timer)     → timer.stop()           → clearInterval, remove class
Change duration input     → timer.onDurationChange → update configured/remaining if idle
Timer reaches 0           → timer.tick()           → stop, show notification
─────────────────────────── ──────────────────────── ──────────────────────
Submit add-task form      → todoList.addTask()     → validate, push Task, persist, render
Click checkbox            → todoList.toggleTask()  → flip done, persist, render
Click edit button         → todoList.startEdit()   → swap span→input in DOM
Confirm edit              → todoList.editTask()    → validate, update, persist, render
Press Escape in edit      → todoList.cancelEdit()  → restore span
Click delete button       → todoList.deleteTask()  → remove, persist, render
Change sort selector      → todoList.setSort()     → update sortMode, persist key, render
─────────────────────────── ──────────────────────── ──────────────────────
Submit add-link form      → quickLinks.addLink()   → normalise URL, push, persist, render
Click remove on chip      → quickLinks.removeLink()→ remove, persist, render
─────────────────────────── ──────────────────────── ──────────────────────
Click theme toggle        → theme.toggle()         → flip data-theme attr, persist
Submit name form          → greeting.saveName()    → persist, update span, hide form
Clock interval fires      → clock.tick()           → update time/date textContent only
```

Key invariant: all state mutations go through a module's named function. The DOM is always re-rendered from the in-memory array; the DOM is never the source of truth.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property reflection notes (redundancy eliminated before finalising):**
- Clock time format (1.1) and date format (1.2) are independent formatters — kept separate.
- Greeting salutation (2.1–2.4) and name rendering (2.5 / 3.2) operate on different fields — kept separate.
- Name round-trip (3.4) subsumes the immediate-update check in 3.2; one property covers both.
- Timer tick-down (4.2), stop/retain (4.3), and reset (4.4) each test distinct state transitions — kept separate, but stop and reset share the "remaining preserved" concern so reset is written as a stronger round-trip that implies stop correctness.
- Task add (6.2) and task persist (6.4) can be combined into a single round-trip add property.
- Task toggle (8.2) and toggle-persist (8.4) combined into one round-trip toggle property.
- Edit success (9.3) and edit-persist are combined into one property.
- Sort correctness (11.2) covers all four modes in one universally-quantified property.
- Storage fault tolerance (16.1 / 16.2) kept as two separate properties (read vs write).

---

### Property 1: Clock time formatting

*For any* `Date` object, the clock's time formatter must produce a string that exactly matches `HH:MM:SS` format, where each component is the zero-padded hour, minute, and second of that date.

**Validates: Requirements 1.1**

---

### Property 2: Clock date formatting

*For any* `Date` object, the clock's date formatter must produce a string that contains the full weekday name, the full month name, the numeric day, and the 4-digit year corresponding to that date.

**Validates: Requirements 1.2**

---

### Property 3: Greeting salutation coverage

*For any* integer hour in `[0, 23]`, the greeting salutation function must return exactly one of the four defined strings (`"Good Morning,"`, `"Good Afternoon,"`, `"Good Evening,"`, `"Good Night,"`) and must respect the four hour ranges: 5–11 → Morning, 12–16 → Afternoon, 17–20 → Evening, 21–4 → Night.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 4: Name persistence round-trip

*For any* non-empty string of 1–30 characters, saving it as the username and then reading `storage.get('username', 'there')` must return that same string.

**Validates: Requirements 3.2, 3.4, 3.5**

---

### Property 5: Timer countdown correctness

*For any* starting duration `D` (1–7200 seconds) and tick count `N` where `0 ≤ N < D`, after `N` timer ticks the remaining time must equal `D − N`.

**Validates: Requirements 4.2**

---

### Property 6: Timer stop preserves remaining time

*For any* remaining time value `R`, stopping the timer must leave the remaining value equal to `R`.

**Validates: Requirements 4.3**

---

### Property 7: Timer reset round-trip

*For any* configured duration `D` and any number of elapsed ticks `N` (where `N ≤ D`), after a reset the remaining time must equal `D`.

**Validates: Requirements 4.4, 5.3**

---

### Property 8: Timer completion stops automatically

*For any* starting duration `D > 0`, after exactly `D` ticks the timer must be in the stopped state (no active interval).

**Validates: Requirements 4.5**

---

### Property 9: Timer active-state class invariant

*For any* timer state, the `.timer--running` CSS class must be present on the timer display element if and only if the timer is currently counting down.

**Validates: Requirements 4.6**

---

### Property 10: Duration input validation

*For any* input value that is not an integer in `[1, 120]` (e.g. `0`, `-5`, `200`, `"abc"`, `null`), the timer must treat the configured duration as exactly `1500` seconds (25 minutes).

**Validates: Requirements 5.4**

---

### Property 11: Running timer ignores duration changes

*For any* running timer with remaining value `R` and any new duration input value `V`, after the change attempt the remaining value must still be `R`.

**Validates: Requirements 5.5**

---

### Property 12: Task add round-trip

*For any* valid task text (non-empty, not a case-insensitive duplicate of an existing task), after adding the task:
1. The in-memory task list length increases by exactly 1.
2. The new task object has the submitted text and `done = false`.
3. `storage.get('tasks')` returns an array containing that task object.
4. The task input field value is empty string.

**Validates: Requirements 6.2, 6.4, 6.7**

---

### Property 13: Task list persistence round-trip

*For any* array of Task objects stored under the `"tasks"` key, initialising the todoList module must produce an in-memory task list that matches that array (same texts, same done states, same order).

**Validates: Requirements 6.5**

---

### Property 14: Duplicate task rejection

*For any* task text `T` already present in the task list, attempting to add any string that equals `T` under case-insensitive comparison must leave the task list length unchanged.

**Validates: Requirements 7.1**

---

### Property 15: Duplicate edit rejection

*For any* task list with tasks A and B where `A.text ≠ B.text`, editing A's text to any case-insensitive match of B's text must leave A's text unchanged.

**Validates: Requirements 7.3**

---

### Property 16: Task toggle round-trip

*For any* task with done state `d`, one toggle produces `!d`; two toggles restore `d`. After each toggle `storage.get('tasks')` reflects the updated done state.

**Validates: Requirements 8.2, 8.4**

---

### Property 17: Task edit success round-trip

*For any* task and any valid new text (non-empty, not a case-insensitive duplicate of another task), after confirming the edit the task's text equals the new text and `storage.get('tasks')` contains the updated task.

**Validates: Requirements 9.3, 9.6**

---

### Property 18: Task edit cancel preserves text

*For any* task with original text `T` and any string typed into the edit input, pressing Escape must leave the task's text equal to `T`.

**Validates: Requirements 9.5**

---

### Property 19: Task deletion removes exactly one task

*For any* task list of length `L ≥ 1` and any task in that list with id `X`, after deleting it the list length is `L − 1` and no task with id `X` remains in the list.

**Validates: Requirements 10.2, 10.3**

---

### Property 20: Sort correctness

*For any* array of Task objects and each sort mode:
- `default` → rendered order equals insertion order.
- `az` → adjacent rendered tasks satisfy `a.text.localeCompare(b.text) ≤ 0`.
- `za` → adjacent rendered tasks satisfy `a.text.localeCompare(b.text) ≥ 0`.
- `done-last` → no done=false task appears after any done=true task.

**Validates: Requirements 11.2**

---

### Property 21: Sort does not mutate storage

*For any* sequence of add and sort-mode operations, `storage.get('tasks')` always returns tasks in the order they were added (insertion order).

**Validates: Requirements 11.5**

---

### Property 22: URL scheme normalisation

*For any* URL string `U` that does not begin with `"http://"` or `"https://"`, the stored URL must equal `"https://" + U`. For any URL that already begins with `"http://"` or `"https://"`, the stored URL must equal `U` unchanged.

**Validates: Requirements 12.3**

---

### Property 23: Link add round-trip

*For any* non-empty label and normalised URL, after adding a link the link collection length increases by 1 and `storage.get('links')` contains an object with that label and URL.

**Validates: Requirements 12.2, 13.1**

---

### Property 24: Storage read fault tolerance

*For any* fallback value `F`, when `localStorage.getItem` throws any exception, `storage.get(key, F)` must return `F` without throwing.

**Validates: Requirements 16.1**

---

### Property 25: Storage write fault tolerance

*For any* key and value, when `localStorage.setItem` throws any exception, `storage.set(key, value)` must complete without throwing (and must emit a `console.warn` call).

**Validates: Requirements 16.2**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` read throws | `storage.get` catches the exception, returns the caller-supplied fallback, logs nothing (transparent to caller) |
| `localStorage` write throws | `storage.set` catches the exception, calls `console.warn` with a descriptive message, returns without throwing |
| Invalid timer duration | `timer.onDurationChange` coerces the value to 25 min; the input is not reset visually (user may continue editing) |
| Empty task text on add | `todoList.addTask` returns early; no DOM change, no storage write |
| Duplicate task on add | `todoList.addTask` shows a warning `<div>` (role="alert") for 2 s via `setTimeout`, then hides it; task not added |
| Duplicate task on edit | `todoList.editTask` adds an error class to the edit input, does not save; the class is removed on next input event |
| Empty name on save | `greeting.saveName` coerces to `"there"` and persists that value |
| Timer ticks to 0 | `timer.tick` calls `timer.stop()`, then calls the notification function; no further decrements possible |
| Link with empty label or URL | `quickLinks.addLink` returns early; no DOM change, no storage write |
| Malformed JSON in storage | `JSON.parse` throws; `storage.get` catches and returns fallback; all modules initialise to their defaults |

---

## Testing Strategy

The testing approach is **dual-track**: property-based tests cover universal correctness properties; example-based unit tests cover specific scenarios, edge cases, and integration points.

### Property-Based Testing

**Library**: [fast-check](https://fast-check.io) — the dominant property-based testing library for JavaScript/TypeScript. It supports arbitrary generators, shrinking, and runs in any Node test environment.

**Runner**: Vitest (or Jest) with `--run` flag for CI (not watch mode).

**Minimum iterations**: 100 runs per property test (fast-check default `numRuns: 100`).

**Tag format** (comment above each test):
```js
// Feature: life-dashboard, Property N: <property text>
```

**Properties covered by PBT** (from design properties above):

| # | Module | Arbitary inputs |
|---|---|---|
| 1 | clock | `fc.date()` |
| 2 | clock | `fc.date()` |
| 3 | greeting | `fc.integer({ min: 0, max: 23 })` |
| 4 | greeting/storage | `fc.string({ minLength: 1, maxLength: 30 })` |
| 5 | timer | `fc.integer({ min: 1, max: 7200 })`, `fc.nat()` |
| 6 | timer | `fc.integer({ min: 0, max: 7200 })` |
| 7 | timer | `fc.integer({ min: 1, max: 7200 })`, `fc.nat()` |
| 8 | timer | `fc.integer({ min: 1, max: 7200 })` |
| 9 | timer | `fc.boolean()` |
| 10 | timer | `fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 121 }), fc.string(), fc.constant(null))` |
| 11 | timer | `fc.integer({ min: 1, max: 7200 })`, `fc.anything()` |
| 12 | todoList | `fc.string({ minLength: 1, maxLength: 100 })` (filtered non-duplicate) |
| 13 | todoList | `fc.array(fc.record({ id: fc.nat(), text: fc.string({ minLength: 1 }), done: fc.boolean() }))` |
| 14 | todoList | `fc.string({ minLength: 1, maxLength: 100 })` |
| 15 | todoList | two `fc.string()` values with different normalised forms |
| 16 | todoList | `fc.boolean()` |
| 17 | todoList | `fc.string({ minLength: 1, maxLength: 100 })` (non-duplicate) |
| 18 | todoList | `fc.string()` (any edit input value) |
| 19 | todoList | `fc.array(...)` with `minLength: 1` |
| 20 | todoList | `fc.array(...)`, `fc.constantFrom('default','az','za','done-last')` |
| 21 | todoList | `fc.array(...)`, sequence of sort changes |
| 22 | quickLinks | `fc.string()` (any URL) |
| 23 | quickLinks | `fc.string({ minLength: 1, maxLength: 20 })`, valid URL |
| 24 | storage | `fc.anything()` (fallback value) |
| 25 | storage | `fc.anything()` (any value to write) |

### Unit / Example-Based Tests

These cover specific scenarios that are not universally quantified:

- **Clock**: snapshot of the exact formatted string for a known Date (e.g. `2024-01-15T09:05:03` → `"09:05:03"` and `"Monday, January 15, 2024"`).
- **Greeting fallback**: when `storage.get('username')` returns `null`, displayed name is `"there"`.
- **Timer**: notification is triggered exactly once when timer reaches zero; not triggered mid-run.
- **Task warning auto-hide**: using fake timers, the duplicate warning `<div>` gains the hidden class after 2000 ms.
- **Links default set**: when `storage.get('links')` returns `null`, rendered chips are Google, YouTube, GitHub.
- **Theme toggle**: clicking the toggle button switches `data-theme` between `"light"` and `"dark"`.
- **Responsive layout**: CSS media query breakpoints produce the correct `grid-template-columns` at 560 px, 750 px, and 1024 px.
- **Accessibility**: each icon button has a non-empty `aria-label`; task list has `aria-live="polite"`.

### Test File Structure

```
tests/
  storage.test.js       — Properties 24, 25 + unit tests
  clock.test.js         — Properties 1, 2 + snapshot examples
  greeting.test.js      — Properties 3, 4 + fallback example
  timer.test.js         — Properties 5–11 + notification example
  todoList.test.js      — Properties 12–21 + warning timer example
  quickLinks.test.js    — Properties 22, 23 + default links example
  theme.test.js         — toggle unit test
```

Each module is written as a self-contained object literal that can be imported and tested in isolation by injecting a mock `storage` object and a minimal DOM stub.
