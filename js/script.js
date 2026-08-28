(function () {
  'use strict';

  // --- storage module ---
  const storage = {
    get(key, fallback) {
      try {
        const item = localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn('[Life Dashboard] Storage write failed for key "' + key + '":', e);
      }
    }
  };

  // --- theme module ---
  const theme = {
    init() {
      const saved = storage.get('theme', 'light');
      this.applyTheme(saved);
      const btn = document.querySelector('.theme-toggle');
      if (btn) {
        btn.addEventListener('click', () => {
          const current = document.documentElement.dataset.theme;
          const next = current === 'light' ? 'dark' : 'light';
          this.applyTheme(next);
          storage.set('theme', next);
        });
      }
    },
    applyTheme(t) {
      document.documentElement.dataset.theme = t;
      const btn = document.querySelector('.theme-toggle');
      if (btn) {
        btn.textContent = t === 'light' ? 'DARK' : 'LIGHT';
        btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      }
    }
  };

  // --- clock module ---
  const clock = {
    tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const timeEl = document.querySelector('.clock__time');
      const dateEl = document.querySelector('.clock__date');
      if (timeEl) timeEl.textContent = h + ':' + m + ':' + s;
      if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    },
    init() {
      this.tick();
      setInterval(() => this.tick(), 1000);
    }
  };

  // --- greeting module ---
  const greeting = {
    renderSalutation() {
      const hour = new Date().getHours();
      let salutation;
      if (hour >= 5 && hour < 12)       salutation = 'Good Morning,';
      else if (hour >= 12 && hour < 17) salutation = 'Good Afternoon,';
      else if (hour >= 17 && hour < 21) salutation = 'Good Evening,';
      else                               salutation = 'Good Night,';
      const el = document.querySelector('.greeting__salutation');
      if (el) el.textContent = salutation;
    },
    renderName() {
      const name = storage.get('username', 'there');
      const el = document.querySelector('.greeting__name');
      if (el) el.textContent = name;
    },
    saveName(nameRaw) {
      const name = nameRaw.trim() || 'there';
      storage.set('username', name.slice(0, 30));
      this.renderName();
      const form = document.querySelector('.greeting__form');
      if (form) form.classList.add('hidden');
      const editBtn = document.querySelector('.greeting__edit-btn');
      if (editBtn) editBtn.classList.remove('hidden');
    },
    init() {
      this.renderName();
      this.renderSalutation();
      const editBtn = document.querySelector('.greeting__edit-btn');
      const form    = document.querySelector('.greeting__form');
      const input   = document.querySelector('.greeting__input');
      if (editBtn && form) {
        editBtn.addEventListener('click', () => {
          form.classList.toggle('hidden');
          editBtn.classList.toggle('hidden');
          if (!form.classList.contains('hidden') && input) {
            input.value = storage.get('username', 'there');
            input.focus();
          }
        });
      }
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveName(input ? input.value : '');
        });
      }
    }
  };

  // --- timer module ---
  const timer = (function () {
    let intervalId  = null;
    let remaining   = 1500;
    let configured  = 1500;
    let isPaused    = false;
    let pomodoroMode  = false;
    let pomodoroPhase = 'work';
    let pomodoroCount = 0;

    const POMODORO_WORK  = 25 * 60;
    const POMODORO_BREAK = 5  * 60;
    const POMODORO_LONG  = 15 * 60;

    function qs(sel) { return document.querySelector(sel); }
    function id(s)   { return document.getElementById(s); }

    function updateButtons() {
      const startBtn = id('timer-start');
      const pauseBtn = id('timer-pause');
      const stopBtn  = id('timer-stop');
      const resetBtn = id('timer-reset');
      const running  = intervalId !== null;

      if (startBtn) startBtn.disabled = running;
      if (pauseBtn) {
        pauseBtn.disabled = !running && !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        pauseBtn.setAttribute('aria-label', isPaused ? 'Resume timer' : 'Pause timer');
      }
      if (stopBtn)  stopBtn.disabled  = !running && !isPaused;
      if (resetBtn) resetBtn.disabled = running;
    }

    function renderProgress() {
      const circle = qs('.timer__progress-circle');
      if (!circle) return;
      const total = pomodoroMode
        ? (pomodoroPhase === 'work'
            ? (pomodoroCount > 0 && pomodoroCount % 4 === 0 ? POMODORO_LONG : POMODORO_WORK)
            : POMODORO_BREAK)
        : configured;
      const pct    = total > 0 ? remaining / total : 0;
      const radius = 54;
      const circ   = 2 * Math.PI * radius;
      circle.style.strokeDasharray  = circ;
      circle.style.strokeDashoffset = circ * (1 - pct);
    }

    function renderPhaseLabel() {
      const label = qs('.timer__phase-label');
      if (!label) return;
      if (!pomodoroMode) { label.textContent = ''; return; }
      if (pomodoroPhase === 'work') {
        label.textContent = 'Focus - session ' + (pomodoroCount + 1);
      } else {
        label.textContent = (pomodoroCount > 0 && pomodoroCount % 4 === 0) ? 'Long Break' : 'Short Break';
      }
    }

    function renderDisplay() {
      const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
      const secs = String(remaining % 60).padStart(2, '0');
      const display = qs('.timer__display');
      if (display) display.textContent = mins + ':' + secs;
      const card = qs('.card--timer');
      if (card) {
        card.classList.toggle('timer--running', intervalId !== null);
        card.classList.toggle('timer--paused',  isPaused);
        card.classList.toggle('timer--break',   pomodoroMode && pomodoroPhase === 'break');
      }
      renderProgress();
      renderPhaseLabel();
      updateButtons();
    }

    function showToast(msg) {
      const old = document.getElementById('timer-toast');
      if (old) old.remove();
      const toast = document.createElement('div');
      toast.id = 'timer-toast';
      toast.className = 'timer-toast';
      toast.textContent = msg;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('timer-toast--show'));
      setTimeout(() => {
        toast.classList.remove('timer-toast--show');
        setTimeout(() => toast.remove(), 400);
      }, 4000);
    }

    function tick() {
      if (remaining > 0) {
        remaining--;
        renderDisplay();
      }
      if (remaining <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        if (pomodoroMode) {
          if (pomodoroPhase === 'work') {
            pomodoroCount++;
            const isLong = pomodoroCount % 4 === 0;
            pomodoroPhase = 'break';
            remaining = isLong ? POMODORO_LONG : POMODORO_BREAK;
            showToast(isLong ? 'Great work! Long break time (15 min)' : 'Focus done! Short break (5 min)');
          } else {
            pomodoroPhase = 'work';
            remaining = POMODORO_WORK;
            showToast('Break over! Starting focus session ' + (pomodoroCount + 1));
          }
          intervalId = setInterval(tick, 1000);
        } else {
          showToast('Focus session complete!');
        }
        renderDisplay();
      }
    }

    function start() {
      if (intervalId !== null) return;
      if (remaining <= 0) remaining = configured;
      isPaused   = false;
      intervalId = setInterval(tick, 1000);
      renderDisplay();
    }

    function pause() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
        isPaused   = true;
        renderDisplay();
      } else if (isPaused) {
        isPaused   = false;
        intervalId = setInterval(tick, 1000);
        renderDisplay();
      }
    }

    function stop() {
      clearInterval(intervalId);
      intervalId = null;
      isPaused   = false;
      renderDisplay();
    }

    function reset() {
      stop();
      if (pomodoroMode) {
        pomodoroPhase = 'work';
        pomodoroCount = 0;
        remaining     = POMODORO_WORK;
      } else {
        remaining = configured;
      }
      renderDisplay();
    }

    function onDurationChange(e) {
      const val     = parseInt(e.target.value, 10);
      const minutes = (Number.isInteger(val) && val >= 1 && val <= 120) ? val : 25;
      // Always update configured so reset picks up the new value,
      // even if the timer is currently running or paused.
      configured = minutes * 60;
      // Only update remaining when the timer is fully idle (not running, not paused).
      if (intervalId === null && !isPaused) {
        remaining = configured;
        renderDisplay();
      }
    }

    function togglePomodoro(on) {
      pomodoroMode  = on;
      pomodoroPhase = 'work';
      pomodoroCount = 0;
      stop();
      if (pomodoroMode) {
        remaining  = POMODORO_WORK;
        configured = POMODORO_WORK;
      } else {
        const dinput = id('timer-duration');
        const val    = dinput ? parseInt(dinput.value, 10) : 25;
        configured   = (Number.isInteger(val) && val >= 1 && val <= 120 ? val : 25) * 60;
        remaining    = configured;
      }
      const drow = qs('.timer__duration-row');
      if (drow) drow.classList.toggle('hidden', pomodoroMode);
      renderDisplay();
    }

    function init() {
      renderDisplay();
      const startBtn       = id('timer-start');
      const pauseBtn       = id('timer-pause');
      const stopBtn        = id('timer-stop');
      const resetBtn       = id('timer-reset');
      const durationInput  = id('timer-duration');
      const pomodoroToggle = id('timer-pomodoro');

      if (startBtn)       startBtn.addEventListener('click', start);
      if (pauseBtn)       pauseBtn.addEventListener('click', pause);
      if (stopBtn)        stopBtn.addEventListener('click', stop);
      if (resetBtn)       resetBtn.addEventListener('click', reset);
      if (durationInput)  durationInput.addEventListener('change', onDurationChange);
      if (pomodoroToggle) pomodoroToggle.addEventListener('change', (e) => togglePomodoro(e.target.checked));
    }

    return { init, start, pause, stop, reset, togglePomodoro,
             _state() { return { intervalId, remaining, configured, pomodoroMode, pomodoroPhase, pomodoroCount }; } };
  })();

  // --- todoList module ---
  const todoList = (function () {
    let tasks    = [];
    let sortMode = 'default';
    let filter   = 'all';

    function persist() { storage.set('tasks', tasks); }

    function showWarning(msg) {
      const w = document.querySelector('.todo__warning');
      if (!w) return;
      w.textContent = msg;
      w.classList.remove('hidden');
      setTimeout(() => w.classList.add('hidden'), 2500);
    }

    function updateCounter() {
      const counter = document.querySelector('.todo__counter');
      if (!counter) return;
      const active = tasks.filter(t => !t.done).length;
      counter.textContent = tasks.length === 0 ? '' : active + ' of ' + tasks.length + ' remaining';
    }

    function addTask(text) {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (tasks.some(t => t.text.toLowerCase() === trimmed.toLowerCase())) {
        showWarning('Task already exists!');
        return;
      }
      tasks.push({ id: Date.now(), text: trimmed, done: false, createdAt: Date.now() });
      persist();
      render();
      const input = document.querySelector('.todo__input');
      if (input) { input.value = ''; input.focus(); }
    }

    function deleteTask(id) {
      tasks = tasks.filter(t => t.id !== id);
      persist();
      render();
    }

    function toggleTask(id) {
      tasks = tasks.map(t => t.id === id ? Object.assign({}, t, { done: !t.done }) : t);
      persist();
      render();
    }

    function editTask(id, newText) {
      const trimmed = newText.trim();
      if (!trimmed) return false;
      if (tasks.some(t => t.id !== id && t.text.toLowerCase() === trimmed.toLowerCase())) return false;
      tasks = tasks.map(t => t.id === id ? Object.assign({}, t, { text: trimmed }) : t);
      persist();
      render();
      return true;
    }

    function cancelEdit(li, task) {
      const editInput = li.querySelector('.todo__edit-input');
      const saveBtn   = li.querySelector('.todo__save-btn');
      const cancelBtn = li.querySelector('.todo__cancel-btn');
      const span      = document.createElement('span');
      span.className   = 'todo__item__text';
      span.textContent = task.text;
      if (editInput) li.replaceChild(span, editInput);
      if (saveBtn)   saveBtn.remove();
      if (cancelBtn) cancelBtn.remove();
      const acts = li.querySelector('.todo__item-actions');
      if (acts) acts.classList.remove('hidden');
    }

    function getSortedTasks(list) {
      const copy = list.slice();
      if      (sortMode === 'az')         copy.sort((a, b) => a.text.localeCompare(b.text));
      else if (sortMode === 'za')         copy.sort((a, b) => b.text.localeCompare(a.text));
      else if (sortMode === 'done-last')  copy.sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1);
      else if (sortMode === 'done-first') copy.sort((a, b) => a.done === b.done ? 0 : a.done ? -1 : 1);
      else if (sortMode === 'newest')     copy.sort((a, b) => (b.createdAt || b.id) - (a.createdAt || a.id));
      else if (sortMode === 'oldest')     copy.sort((a, b) => (a.createdAt || a.id) - (b.createdAt || b.id));
      return copy;
    }

    function getFilteredTasks() {
      if (filter === 'active') return tasks.filter(t => !t.done);
      if (filter === 'done')   return tasks.filter(t =>  t.done);
      return tasks;
    }

    function startEdit(li, task) {
      const span = li.querySelector('.todo__item__text');
      if (!span) return;

      const input = document.createElement('input');
      input.type = 'text'; input.className = 'todo__edit-input';
      input.value = task.text; input.maxLength = 100;
      input.setAttribute('aria-label', 'Edit task text');

      const saveBtn   = document.createElement('button');
      saveBtn.type    = 'button'; saveBtn.textContent = 'Save';
      saveBtn.className = 'todo__save-btn';
      saveBtn.setAttribute('aria-label', 'Save edit');

      const cancelBtn    = document.createElement('button');
      cancelBtn.type     = 'button'; cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'todo__cancel-btn';
      cancelBtn.setAttribute('aria-label', 'Cancel edit');

      li.replaceChild(input, span);
      const acts = li.querySelector('.todo__item-actions');
      if (acts) acts.classList.add('hidden');
      li.appendChild(saveBtn);
      li.appendChild(cancelBtn);
      input.focus(); input.select();

      function doSave() {
        const ok = editTask(task.id, input.value);
        if (!ok && input.value.trim()) {
          input.classList.add('todo__edit-input--error');
          input.addEventListener('input', () => input.classList.remove('todo__edit-input--error'), { once: true });
        }
      }
      saveBtn.addEventListener('click', doSave);
      cancelBtn.addEventListener('click', () => cancelEdit(li, task));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  { e.preventDefault(); doSave(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(li, task); }
      });
    }

    function createTaskElement(task) {
      const li       = document.createElement('li');
      li.className   = 'todo__item' + (task.done ? ' todo__item--done' : '');
      li.dataset.id  = task.id;

      const checkbox     = document.createElement('input');
      checkbox.type      = 'checkbox';
      checkbox.checked   = task.done;
      checkbox.setAttribute('aria-label', 'Mark task complete');
      checkbox.addEventListener('change', () => toggleTask(task.id));

      const span         = document.createElement('span');
      span.className     = 'todo__item__text';
      span.textContent   = task.text;

      const actions      = document.createElement('div');
      actions.className  = 'todo__item-actions';

      const editBtn      = document.createElement('button');
      editBtn.type       = 'button'; editBtn.textContent = 'Edit';
      editBtn.className  = 'btn-icon btn-edit';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => startEdit(li, task));

      const deleteBtn    = document.createElement('button');
      deleteBtn.type     = 'button'; deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'btn-icon btn-delete';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(actions);
      return li;
    }

    function render() {
      const list = document.querySelector('.todo__list');
      if (!list) return;
      list.innerHTML = '';

      const filtered = getFilteredTasks();
      const sorted   = getSortedTasks(filtered);

      if (sorted.length === 0) {
        const li = document.createElement('li');
        li.className = 'todo__empty';
        if (filter === 'active')    li.textContent = 'No active tasks!';
        else if (filter === 'done') li.textContent = 'No completed tasks yet.';
        else                        li.textContent = 'Add your first task above.';
        list.appendChild(li);
      } else {
        sorted.forEach(task => list.appendChild(createTaskElement(task)));
      }

      updateCounter();
      document.querySelectorAll('.todo__filter-btn').forEach(btn => {
        btn.classList.toggle('todo__filter-btn--active', btn.dataset.filter === filter);
        btn.setAttribute('aria-pressed', btn.dataset.filter === filter ? 'true' : 'false');
      });
    }

    function init() {
      tasks    = storage.get('tasks', []).map(t => Object.assign({ createdAt: t.id }, t));
      sortMode = storage.get('sort', 'default');
      filter   = storage.get('filter', 'all');

      const sortEl = document.getElementById('todo-sort');
      if (sortEl) sortEl.value = sortMode;

      render();

      const addForm = document.querySelector('.todo__add-form');
      if (addForm) {
        addForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = document.querySelector('.todo__input');
          if (input) addTask(input.value);
        });
      }

      if (sortEl) {
        sortEl.addEventListener('change', () => {
          sortMode = sortEl.value;
          storage.set('sort', sortMode);
          render();
        });
      }

      document.querySelectorAll('.todo__filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filter = btn.dataset.filter;
          storage.set('filter', filter);
          render();
        });
      });
    }

    return { init, addTask, deleteTask, toggleTask, editTask,
             _state() { return { tasks, sortMode, filter }; } };
  })();

  // --- quickLinks module ---
  const quickLinks = (function () {
    const DEFAULT_LINKS = [
      { id: 1, label: 'Google',  url: 'https://google.com'  },
      { id: 2, label: 'YouTube', url: 'https://youtube.com' },
      { id: 3, label: 'GitHub',  url: 'https://github.com'  }
    ];
    let links = [];

    function normaliseUrl(url) {
      return /^https?:\/\//i.test(url) ? url : 'https://' + url;
    }

    function persist() { storage.set('links', links); }

    function addLink(label, url) {
      const l = label.trim(), u = url.trim();
      if (!l || !u) return;
      links.push({ id: Date.now(), label: l, url: normaliseUrl(u) });
      persist(); render();
    }

    function removeLink(id) {
      links = links.filter(lk => lk.id !== id);
      persist(); render();
    }

    function render() {
      const grid = document.querySelector('.links__grid');
      if (!grid) return;
      grid.innerHTML = '';
      if (links.length === 0) {
        const p = document.createElement('p');
        p.className = 'links__empty';
        p.textContent = 'Add your first link above.';
        grid.appendChild(p);
        return;
      }
      links.forEach(link => {
        const chip     = document.createElement('a');
        chip.href      = link.url;
        chip.target    = '_blank';
        chip.rel       = 'noopener noreferrer';
        chip.className = 'link-chip';
        chip.setAttribute('aria-label', link.label + ' (opens in new tab)');

        const lbl      = document.createElement('span');
        lbl.textContent = link.label;

        const rm       = document.createElement('button');
        rm.type        = 'button';
        rm.textContent = '×';
        rm.className   = 'link-chip__remove';
        rm.setAttribute('aria-label', 'Remove ' + link.label);
        rm.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); removeLink(link.id); });

        chip.appendChild(lbl);
        chip.appendChild(rm);
        grid.appendChild(chip);
      });
    }

    function init() {
      const stored = storage.get('links', null);
      links = stored !== null ? stored : DEFAULT_LINKS.slice();
      render();
      const form = document.querySelector('.links__add-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const li = document.querySelector('.links__label-input');
          const ui = document.querySelector('.links__url-input');
          if (li && ui) {
            addLink(li.value, ui.value);
            li.value = ''; ui.value = ''; li.focus();
          }
        });
      }
    }

    return { init, addLink, removeLink, render, _state() { return { links }; } };
  })();

  // --- bootstrap ---
  document.addEventListener('DOMContentLoaded', function () {
    theme.init();
    clock.init();
    greeting.init();
    timer.init();
    todoList.init();
    quickLinks.init();
  });

})();
