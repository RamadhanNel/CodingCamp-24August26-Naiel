# Requirements Document

## Introduction

The Life Dashboard is a clean, minimal web application that helps users organize their day from a single browser tab. It consolidates four core utilities — a live clock with greeting, a Pomodoro-style focus timer, a to-do list, and a quick-links launcher — into one cohesive interface. All data is persisted client-side via the browser's localStorage API. No backend, no frameworks, no build tools are required.

The project is implemented with plain HTML, CSS, and vanilla JavaScript, split across exactly one file per technology (`index.html`, `css/style.css`, `js/script.js`). It must run in any modern browser (Chrome, Firefox, Edge, Safari) and may optionally be packaged as a browser extension.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Clock**: The component that displays the current local time and date.
- **Greeting**: The component that displays a time-aware salutation and the user's custom name.
- **Timer**: The Pomodoro-style countdown timer component.
- **Task**: A single to-do item consisting of text and a completion state.
- **Task_List**: The component that manages the collection of Tasks.
- **Link**: A user-defined shortcut consisting of a display label and a URL.
- **Link_Launcher**: The component that manages and renders the collection of Links.
- **Storage**: The browser `localStorage` API used for all client-side persistence.
- **Theme**: The active visual color scheme — either `light` or `dark`.
- **Session**: A single uninterrupted browser page load.

---

## Requirements

### Requirement 1: Live Clock and Date Display

**User Story:** As a user, I want to see the current time and date at all times, so that I can stay oriented throughout my day without switching tabs.

#### Acceptance Criteria

1. THE Clock SHALL display the current local time in HH:MM:SS format, updated every second.
2. THE Clock SHALL display the current local date including the full weekday name, month name, day, and year.
3. WHEN the Clock updates the time display, THE Clock SHALL do so without causing visible layout shift in other components.

---

### Requirement 2: Time-Aware Greeting

**User Story:** As a user, I want to see a greeting that changes based on the time of day, so that the dashboard feels relevant and personal.

#### Acceptance Criteria

1. WHEN the local hour is between 05:00 and 11:59, THE Greeting SHALL display the salutation "Good Morning,".
2. WHEN the local hour is between 12:00 and 16:59, THE Greeting SHALL display the salutation "Good Afternoon,".
3. WHEN the local hour is between 17:00 and 20:59, THE Greeting SHALL display the salutation "Good Evening,".
4. WHEN the local hour is between 21:00 and 04:59, THE Greeting SHALL display the salutation "Good Night,".
5. THE Greeting SHALL display the user's custom name immediately after the salutation on a separate line.
6. WHEN no custom name has been saved, THE Greeting SHALL display the fallback text "there" as the name.

---

### Requirement 3: Custom Name in Greeting

**User Story:** As a user, I want to set my own name in the greeting, so that the dashboard feels personalized to me.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an edit button adjacent to the displayed name that reveals a name-input form.
2. WHEN the user submits a non-empty name via the form, THE Greeting SHALL update the displayed name to the submitted value immediately.
3. WHEN the user submits an empty name via the form, THE Greeting SHALL display the fallback text "there".
4. WHEN a name is saved, THE Storage SHALL persist the name under the key `username` so it survives page reload.
5. WHEN the Dashboard loads, THE Greeting SHALL retrieve and display the persisted name from Storage.
6. THE name-input form SHALL accept a maximum of 30 characters.
7. WHEN the user presses the Enter key while the name-input field is focused, THE Greeting SHALL save the name as if the save button were clicked.

---

### Requirement 4: Focus Timer

**User Story:** As a user, I want a countdown timer I can start, stop, and reset, so that I can structure my work into focused sessions.

#### Acceptance Criteria

1. THE Timer SHALL default to a 25-minute countdown (1500 seconds) on initial load.
2. WHEN the Start button is activated and the Timer is not already running, THE Timer SHALL begin counting down by one second per real-world second.
3. WHEN the Stop button is activated and the Timer is running, THE Timer SHALL pause the countdown and retain the remaining time.
4. WHEN the Reset button is activated, THE Timer SHALL stop any running countdown and restore the display to the currently configured duration.
5. WHEN the Timer reaches 00:00, THE Timer SHALL stop automatically and notify the user that the focus session is complete.
6. WHILE the Timer is running, THE Timer display SHALL visually distinguish the active state from the idle state.

---

### Requirement 5: Custom Pomodoro Duration

**User Story:** As a user, I want to set a custom timer duration, so that I can adjust the focus session length to my preferred working style.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a numeric input field that accepts integer values between 1 and 120 (minutes).
2. WHEN the user changes the duration input and the Timer is not running, THE Timer SHALL update the display to reflect the new duration immediately.
3. WHEN the Reset button is activated, THE Timer SHALL restore the countdown to the duration currently specified in the duration input.
4. IF the duration input contains a value less than 1 or is not a valid integer, THEN THE Timer SHALL fall back to a 25-minute duration.
5. WHILE the Timer is running, THE Timer SHALL ignore changes to the duration input without altering the active countdown.

---

### Requirement 6: To-Do List — Add and Persist Tasks

**User Story:** As a user, I want to add tasks to a list and have them saved automatically, so that my to-dos are not lost when I close or refresh the browser.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a text input field and an Add button for creating new Tasks.
2. WHEN the user activates the Add button with a non-empty value in the task input, THE Task_List SHALL append a new Task with that text and a `done` state of `false`.
3. WHEN the user presses the Enter key while the task input is focused, THE Task_List SHALL add the Task as if the Add button were activated.
4. WHEN a Task is added, THE Storage SHALL persist the updated Task collection under the key `tasks`.
5. WHEN the Dashboard loads, THE Task_List SHALL retrieve and render all persisted Tasks from Storage.
6. THE task text input SHALL accept a maximum of 100 characters.
7. WHEN a Task is added, THE task input field SHALL be cleared.

---

### Requirement 7: To-Do List — Prevent Duplicate Tasks

**User Story:** As a user, I want the dashboard to prevent me from adding duplicate tasks, so that my list stays clean and unambiguous.

#### Acceptance Criteria

1. WHEN the user attempts to add a Task whose text matches an existing Task's text (case-insensitive), THE Task_List SHALL reject the addition and display a warning message.
2. WHEN the duplicate-warning message is displayed, THE Task_List SHALL automatically hide the message after 2 seconds.
3. WHEN the user attempts to save an edited Task with text that matches any other existing Task's text (case-insensitive), THE Task_List SHALL reject the edit and provide a visual indication on the edit input.

---

### Requirement 8: To-Do List — Mark Tasks as Done

**User Story:** As a user, I want to mark tasks as complete, so that I can track my progress through the day.

#### Acceptance Criteria

1. THE Task_List SHALL render a checkbox for each Task.
2. WHEN the user toggles a Task's checkbox, THE Task_List SHALL invert the Task's `done` state.
3. WHILE a Task has a `done` state of `true`, THE Task_List SHALL render the task text with a strikethrough style and reduced opacity.
4. WHEN a Task's `done` state changes, THE Storage SHALL persist the updated Task collection.

---

### Requirement 9: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit existing tasks inline, so that I can correct mistakes or update task descriptions without deleting and re-adding.

#### Acceptance Criteria

1. THE Task_List SHALL render an edit button for each Task.
2. WHEN the user activates the edit button for a Task, THE Task_List SHALL replace the task text span with an editable input pre-filled with the current task text.
3. WHEN the user confirms the edit by clicking the save button, THE Task_List SHALL update the Task text if the new text is non-empty and not a duplicate of another Task.
4. WHEN the user presses the Enter key while the edit input is focused, THE Task_List SHALL save the edit as if the save button were activated.
5. WHEN the user presses the Escape key while the edit input is focused, THE Task_List SHALL cancel the edit and restore the original task text display.
6. WHEN a Task is successfully edited, THE Storage SHALL persist the updated Task collection.

---

### Requirement 10: To-Do List — Delete Tasks

**User Story:** As a user, I want to delete tasks, so that I can remove items that are no longer relevant.

#### Acceptance Criteria

1. THE Task_List SHALL render a delete button for each Task.
2. WHEN the user activates the delete button for a Task, THE Task_List SHALL remove that Task from the collection and re-render the list.
3. WHEN a Task is deleted, THE Storage SHALL persist the updated Task collection.

---

### Requirement 11: To-Do List — Sort Tasks

**User Story:** As a user, I want to sort my task list, so that I can view tasks in the order most useful to me.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a sort selector with the following options: Default (insertion order), A → Z (alphabetical ascending), Z → A (alphabetical descending), and Done Last (incomplete tasks first).
2. WHEN the user changes the sort selector, THE Task_List SHALL re-render the tasks in the selected order immediately.
3. WHEN the sort order is changed, THE Storage SHALL persist the selected sort option under the key `sort`.
4. WHEN the Dashboard loads, THE Task_List SHALL retrieve and apply the persisted sort option from Storage.
5. THE sort selector SHALL apply the sort to the rendered view only; THE Storage SHALL always persist Tasks in insertion order.

---

### Requirement 12: Quick Links — Add and Display

**User Story:** As a user, I want to add quick-access links to my favorite websites, so that I can navigate to them with a single click from the dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a label input, a URL input, and an Add button for creating new Links.
2. WHEN the user activates the Add button with both label and URL fields non-empty, THE Link_Launcher SHALL append a new Link chip to the display.
3. IF the URL value does not begin with `http://` or `https://`, THEN THE Link_Launcher SHALL prepend `https://` to the URL before saving.
4. WHEN a Link chip is clicked, THE Link_Launcher SHALL open the corresponding URL in a new browser tab with `rel="noopener noreferrer"`.
5. WHEN the user presses the Enter key while the URL input is focused, THE Link_Launcher SHALL add the Link as if the Add button were activated.
6. THE label input SHALL accept a maximum of 20 characters.

---

### Requirement 13: Quick Links — Persist and Remove

**User Story:** As a user, I want my quick links to be saved and removable, so that my link collection stays current across sessions.

#### Acceptance Criteria

1. WHEN a Link is added, THE Storage SHALL persist the updated Link collection under the key `links`.
2. WHEN the Dashboard loads, THE Link_Launcher SHALL retrieve and render all persisted Links from Storage.
3. WHEN no Links have been persisted, THE Link_Launcher SHALL render the default Links: Google (`https://google.com`), YouTube (`https://youtube.com`), and GitHub (`https://github.com`).
4. THE Link_Launcher SHALL render a remove button on each Link chip.
5. WHEN the user activates the remove button for a Link, THE Link_Launcher SHALL remove that Link from the collection, re-render the grid, and persist the updated collection to Storage.

---

### Requirement 14: Light / Dark Mode

**User Story:** As a user, I want to switch between light and dark color schemes, so that the dashboard is comfortable to use in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle button in the header to switch between light and dark Themes.
2. WHEN the Theme is `light`, THE Dashboard SHALL render the interface using the light color palette and display a moon icon on the toggle button.
3. WHEN the Theme is `dark`, THE Dashboard SHALL render the interface using the dark color palette and display a sun icon on the toggle button.
4. WHEN the user activates the theme toggle button, THE Dashboard SHALL switch to the opposite Theme immediately.
5. WHEN the Theme changes, THE Storage SHALL persist the selected Theme under the key `theme`.
6. WHEN the Dashboard loads, THE Dashboard SHALL retrieve and apply the persisted Theme from Storage.
7. IF no Theme has been persisted, THEN THE Dashboard SHALL apply the `light` Theme as the default.

---

### Requirement 15: Responsive Layout

**User Story:** As a user, I want the dashboard to be usable on screens of different sizes, so that it works on both desktop and tablet/mobile viewports.

#### Acceptance Criteria

1. WHEN the viewport width is 901px or wider, THE Dashboard SHALL render the timer, task list, and links in a three-column grid layout.
2. WHEN the viewport width is between 601px and 900px, THE Dashboard SHALL collapse the layout to a two-column grid with the links panel spanning both columns.
3. WHEN the viewport width is 600px or narrower, THE Dashboard SHALL render all panels in a single-column stacked layout.
4. THE Dashboard SHALL use CSS media queries to implement responsive breakpoints without JavaScript.

---

### Requirement 16: Storage Fault Tolerance

**User Story:** As a developer, I want the dashboard to handle localStorage failures gracefully, so that the application remains functional even when storage is unavailable.

#### Acceptance Criteria

1. IF a Storage read operation throws an exception, THEN THE Storage SHALL return the specified fallback value without propagating the error.
2. IF a Storage write operation throws an exception, THEN THE Storage SHALL log a warning to the browser console without propagating the error or interrupting application flow.
