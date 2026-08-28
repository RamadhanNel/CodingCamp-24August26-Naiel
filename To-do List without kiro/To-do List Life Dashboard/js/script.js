'use strict';

/* =====================
   Utility: localStorage helpers
   ===================== */
const storage = {
  get: (key, fallback = null) => {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn('localStorage unavailable');
    }
  },
};

/* =====================
   1. Clock & Date
   ===================== */
function updateClock() {
  const now = new Date();

  // Time
  const timeEl = document.getElementById('current-time');
  timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });

  // Date
  const dateEl = document.getElementById('current-date');
  dateEl.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Update greeting text based on hour
  updateGreetingText(now.getHours());
}

setInterval(updateClock, 1000);
updateClock();

/* =====================
   2. Greeting & Custom Name (Challenge: custom name)
   ===================== */
const greetingPhrases = {
  morning:   'Good Morning,',
  afternoon: 'Good Afternoon,',
  evening:   'Good Evening,',
  night:     'Good Night,',
};

function updateGreetingText(hour) {
  const el = document.getElementById('greeting-text');
  if (hour >= 5 && hour < 12)       el.textContent = greetingPhrases.morning;
  else if (hour >= 12 && hour < 17) el.textContent = greetingPhrases.afternoon;
  else if (hour >= 17 && hour < 21) el.textContent = greetingPhrases.evening;
  else                               el.textContent = greetingPhrases.night;
}

function loadName() {
  const name = storage.get('username', 'there');
  document.getElementById('greeting-name').textContent = name;
}

document.getElementById('edit-name-btn').addEventListener('click', () => {
  const form = document.getElementById('name-form');
  const input = document.getElementById('name-input');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    input.value = storage.get('username', '');
    input.focus();
  }
});

document.getElementById('save-name-btn').addEventListener('click', saveName);
document.getElementById('name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveName();
});

function saveName() {
  const input = document.getElementById('name-input');
  const name = input.value.trim() || 'there';
  storage.set('username', name);
  document.getElementById('greeting-name').textContent = name;
  document.getElementById('name-form').classList.add('hidden');
}

loadName();

/* =====================
   3. Focus Timer
      - 25-min default
      - Start / Stop / Reset
      - Custom minutes (Challenge: change Pomodoro time)
   ===================== */
let timerInterval = null;
let timerRunning  = false;
let timerSeconds  = 25 * 60;

const timerDisplay  = document.getElementById('timer-display');
const timerCard     = document.querySelector('.timer-card');
const customMinutes = document.getElementById('custom-minutes');

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerSeconds);
}

document.getElementById('timer-start').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  timerCard.classList.add('running');
  timerInterval = setInterval(() => {
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerCard.classList.remove('running');
      timerDisplay.textContent = '00:00';
      alert('Focus session complete! Take a break.');
      return;
    }
    timerSeconds--;
    renderTimer();
  }, 1000);
});

document.getElementById('timer-stop').addEventListener('click', () => {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerCard.classList.remove('running');
});

document.getElementById('timer-reset').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerCard.classList.remove('running');
  const mins = parseInt(customMinutes.value, 10);
  timerSeconds = (isNaN(mins) || mins < 1 ? 25 : mins) * 60;
  renderTimer();
});

customMinutes.addEventListener('change', () => {
  if (!timerRunning) {
    const mins = parseInt(customMinutes.value, 10);
    timerSeconds = (isNaN(mins) || mins < 1 ? 25 : mins) * 60;
    renderTimer();
  }
});

renderTimer();

/* =====================
   4. To-Do List
      - Add / Edit / Mark done / Delete
      - localStorage persistence
      - Prevent duplicate tasks (Challenge)
      - Sort tasks (Challenge)
   ===================== */
let tasks = storage.get('tasks', []);
let currentSort = storage.get('sort', 'default');

const todoInput       = document.getElementById('todo-input');
const todoList        = document.getElementById('todo-list');
const duplicateWarn   = document.getElementById('duplicate-warning');
const sortSelect      = document.getElementById('sort-select');

sortSelect.value = currentSort;

function saveTasks() {
  storage.set('tasks', tasks);
}

function getSortedTasks() {
  const copy = [...tasks];
  switch (currentSort) {
    case 'asc':  return copy.sort((a, b) => a.text.localeCompare(b.text));
    case 'desc': return copy.sort((a, b) => b.text.localeCompare(a.text));
    case 'done': return copy.sort((a, b) => Number(a.done) - Number(b.done));
    default:     return copy;
  }
}

function renderTasks() {
  todoList.innerHTML = '';
  const sorted = getSortedTasks();
  sorted.forEach((task) => {
    const li = document.createElement('li');
    li.className = `todo-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    // Checkbox
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = task.done;
    cb.addEventListener('change', () => toggleDone(task.id));

    // Text
    const span = document.createElement('span');
    span.className   = 'todo-text';
    span.textContent = task.text;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className   = 'btn-todo';
    editBtn.textContent = '✏️';
    editBtn.title       = 'Edit task';
    editBtn.addEventListener('click', () => startEdit(task.id, li, span));

    const delBtn = document.createElement('button');
    delBtn.className   = 'btn-todo delete';
    delBtn.textContent = '🗑️';
    delBtn.title       = 'Delete task';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    actions.append(editBtn, delBtn);
    li.append(cb, span, actions);
    todoList.appendChild(li);
  });
}

function addTask() {
  const text = todoInput.value.trim();
  if (!text) return;

  // Prevent duplicate (Challenge)
  const isDuplicate = tasks.some(
    (t) => t.text.toLowerCase() === text.toLowerCase()
  );
  if (isDuplicate) {
    duplicateWarn.classList.remove('hidden');
    setTimeout(() => duplicateWarn.classList.add('hidden'), 2000);
    return;
  }

  duplicateWarn.classList.add('hidden');
  tasks.push({ id: Date.now(), text, done: false });
  saveTasks();
  renderTasks();
  todoInput.value = '';
}

function toggleDone(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

function startEdit(id, li, span) {
  // Replace text span with input
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'todo-edit-input';
  input.value     = task.text;
  input.maxLength = 100;

  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn-todo save';
  saveBtn.textContent = '✔️';
  saveBtn.title       = 'Save';

  const cancel = () => renderTasks();

  const save = () => {
    const newText = input.value.trim();
    if (!newText) return;
    // Prevent duplicate on edit (excluding self)
    const isDuplicate = tasks.some(
      (t) => t.id !== id && t.text.toLowerCase() === newText.toLowerCase()
    );
    if (isDuplicate) {
      input.style.borderColor = 'var(--danger)';
      return;
    }
    task.text = newText;
    saveTasks();
    renderTasks();
  };

  saveBtn.addEventListener('click', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  save();
    if (e.key === 'Escape') cancel();
  });

  li.replaceChild(input, span);
  // Remove old edit button, add save button
  const actions = li.querySelector('.todo-actions');
  actions.prepend(saveBtn);
  input.focus();
}

document.getElementById('todo-add-btn').addEventListener('click', addTask);
todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  storage.set('sort', currentSort);
  renderTasks();
});

renderTasks();

/* =====================
   5. Quick Links
      - Add & delete links
      - localStorage persistence
   ===================== */
let links = storage.get('links', [
  { id: 1, label: 'Google',  url: 'https://google.com' },
  { id: 2, label: 'YouTube', url: 'https://youtube.com' },
  { id: 3, label: 'GitHub',  url: 'https://github.com' },
]);

const linksGrid    = document.getElementById('links-grid');
const linkNameInp  = document.getElementById('link-name-input');
const linkUrlInp   = document.getElementById('link-url-input');

function saveLinks() {
  storage.set('links', links);
}

function renderLinks() {
  linksGrid.innerHTML = '';
  links.forEach((link) => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';

    const a = document.createElement('a');
    a.href        = link.url;
    a.target      = '_blank';
    a.rel         = 'noopener noreferrer';
    a.textContent = link.label;
    a.style.textDecoration = 'none';
    a.style.color = 'inherit';

    const removeBtn = document.createElement('button');
    removeBtn.className   = 'remove-link';
    removeBtn.textContent = '×';
    removeBtn.title       = 'Remove';
    removeBtn.addEventListener('click', () => removeLink(link.id));

    chip.append(a, removeBtn);
    linksGrid.appendChild(chip);
  });
}

function addLink() {
  const label = linkNameInp.value.trim();
  let   url   = linkUrlInp.value.trim();
  if (!label || !url) return;

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  links.push({ id: Date.now(), label, url });
  saveLinks();
  renderLinks();
  linkNameInp.value = '';
  linkUrlInp.value  = '';
}

function removeLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
}

document.getElementById('link-add-btn').addEventListener('click', addLink);
linkUrlInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });

renderLinks();

/* =====================
   6. Light / Dark Mode (Challenge)
   ===================== */
const themeToggle = document.getElementById('theme-toggle');
const html        = document.documentElement;

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

const savedTheme = storage.get('theme', 'light');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  storage.set('theme', next);
  applyTheme(next);
});
