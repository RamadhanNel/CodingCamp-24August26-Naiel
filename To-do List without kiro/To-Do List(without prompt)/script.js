document.addEventListener('DOMContentLoaded', () => {
  // Config Settings State
  let settings = JSON.parse(localStorage.getItem('NEXUS_SETTINGS')) || {
    operatorName: 'OPERATOR',
    focusTime: 25,
    breakTime: 5,
    soundEnabled: true
  };

  // Task State
  let tasks = JSON.parse(localStorage.getItem('NEXUS_PROGRESS_TASKS')) || [
    {
      id: '1',
      title: 'Setup Core Systems Architecture',
      category: 'CORE',
      dueDate: new Date().toISOString().split('T')[0],
      progress: 80,
      completed: false,
      lastUpdate: '80% - Final testing phase'
    }
  ];

  // Daily Habits State (Auto-reset daily)
  let habitData = JSON.parse(localStorage.getItem('NEXUS_HABITS')) || {
    lastResetDate: new Date().toDateString(),
    items: [
      { id: '1', title: 'Hydrate 2L Water', done: false },
      { id: '2', title: 'Read Documentation / Intel', done: false }
    ]
  };

  // Quick Links State
  let links = JSON.parse(localStorage.getItem('NEXUS_LINKS')) || [
    { id: '1', name: 'GitHub', url: 'https://github.com' },
    { id: '2', name: 'Gmail', url: 'https://mail.google.com' }
  ];

  let currentTaskFilter = 'all';
  let searchQuery = '';

  // Reset habits daily if day changed
  if (habitData.lastResetDate !== new Date().toDateString()) {
    habitData.lastResetDate = new Date().toDateString();
    habitData.items.forEach(h => h.done = false);
    localStorage.setItem('NEXUS_HABITS', JSON.stringify(habitData));
  }

  // --- 1. CLOCK & GREETING ---
  function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    
    document.getElementById('clock-display').textContent = now.toLocaleTimeString('en-US', { hour12: false });
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', options).toUpperCase();

    const greetingEl = document.getElementById('greeting-text');
    const name = settings.operatorName.toUpperCase();
    if (hours < 12) greetingEl.textContent = `GOOD MORNING, ${name}`;
    else if (hours < 18) greetingEl.textContent = `GOOD AFTERNOON, ${name}`;
    else greetingEl.textContent = `GOOD EVENING, ${name}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- 2. FOCUS TIMER WITH OPTIONAL AUDIO ---
  let timerInterval = null;
  let currentTimerMode = 'focus';
  let timerSeconds = settings.focusTime * 60;

  const timerDisplay = document.getElementById('timer-display');
  const btnStart = document.getElementById('timer-start');
  const btnStop = document.getElementById('timer-stop');
  const btnReset = document.getElementById('timer-reset');
  const modeFocus = document.getElementById('mode-focus');
  const modeBreak = document.getElementById('mode-break');

  function renderTimer() {
    const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const secs = (timerSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
  }

  function playAlertTone() {
    if (!settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio Context unavailable');
    }
  }

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        renderTimer();
      } else {
        clearInterval(timerInterval);
        timerInterval = null;
        playAlertTone();
        alert(`[SYSTEM ALERT]: ${currentTimerMode.toUpperCase()} CYCLE COMPLETE`);
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function resetTimer() {
    stopTimer();
    const duration = currentTimerMode === 'focus' ? settings.focusTime : settings.breakTime;
    timerSeconds = duration * 60;
    renderTimer();
  }

  modeFocus.addEventListener('click', () => {
    currentTimerMode = 'focus';
    modeFocus.classList.add('active');
    modeBreak.classList.remove('active');
    resetTimer();
  });

  modeBreak.addEventListener('click', () => {
    currentTimerMode = 'break';
    modeBreak.classList.add('active');
    modeFocus.classList.remove('active');
    resetTimer();
  });

  btnStart.addEventListener('click', startTimer);
  btnStop.addEventListener('click', stopTimer);
  btnReset.addEventListener('click', resetTimer);

  // --- 3. HABITS ENGINE ---
  const habitForm = document.getElementById('habit-form');
  const habitInput = document.getElementById('habit-input');
  const habitsList = document.getElementById('habits-list');

  function saveAndRenderHabits() {
    localStorage.setItem('NEXUS_HABITS', JSON.stringify(habitData));
    renderHabits();
  }

  habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = habitInput.value.trim();
    if (!title) return;

    habitData.items.push({ id: Date.now().toString(), title, done: false });
    habitInput.value = '';
    saveAndRenderHabits();
  });

  function renderHabits() {
    const total = habitData.items.length;
    const doneCount = habitData.items.filter(h => h.done).length;
    document.getElementById('habit-completion-tag').textContent = `${doneCount}/${total} DONE`;

    if (total === 0) {
      habitsList.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:0.75rem;">[ NO HABITS CONFIGURED ]</div>`;
      return;
    }

    habitsList.innerHTML = habitData.items.map(habit => `
      <div class="habit-item ${habit.done ? 'done' : ''}">
        <div class="habit-left">
          <div class="habit-checkbox" onclick="toggleHabit('${habit.id}')">
            ${habit.done ? '✓' : ''}
          </div>
          <span class="habit-title">${escapeHtml(habit.title)}</span>
        </div>
        <button class="btn-icon" onclick="deleteHabit('${habit.id}')">×</button>
      </div>
    `).join('');
  }

  window.toggleHabit = function(id) {
    habitData.items = habitData.items.map(h => h.id === id ? { ...h, done: !h.done } : h);
    saveAndRenderHabits();
  };

  window.deleteHabit = function(id) {
    habitData.items = habitData.items.filter(h => h.id !== id);
    saveAndRenderHabits();
  };

  // --- 4. TASKS & SEARCH ENGINE ---
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const taskCategory = document.getElementById('task-category');
  const taskDueDate = document.getElementById('task-due-date');
  const taskList = document.getElementById('task-list');
  const taskSearchInput = document.getElementById('task-search-input');
  const filterBtns = document.querySelectorAll('.tab-btn');

  // Set default due date to today
  taskDueDate.value = new Date().toISOString().split('T')[0];

  function saveAndRenderTasks() {
    localStorage.setItem('NEXUS_PROGRESS_TASKS', JSON.stringify(tasks));
    renderTasks();
    updateOverallMetrics();
  }

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;

    tasks.unshift({
      id: Date.now().toString(),
      title,
      category: taskCategory.value,
      dueDate: taskDueDate.value || new Date().toISOString().split('T')[0],
      progress: 0,
      completed: false,
      lastUpdate: '0% - Initialized'
    });

    taskInput.value = '';
    saveAndRenderTasks();
  });

  taskSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTasks();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTaskFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  function getFilteredTasks() {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery) || t.category.toLowerCase().includes(searchQuery);
      
      let matchesTab = true;
      if (currentTaskFilter === 'active') matchesTab = !t.completed;
      else if (currentTaskFilter === 'completed') matchesTab = t.completed;
      else if (currentTaskFilter === 'due') matchesTab = t.dueDate === todayStr && !t.completed;

      return matchesSearch && matchesTab;
    });
  }

  function renderTasks() {
    const filtered = getFilteredTasks();
    document.getElementById('total-task-count').textContent = tasks.length;
    
    if (filtered.length === 0) {
      taskList.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.75rem;">[ NO MATCHING DIRECTIVES FOUND ]</div>`;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    taskList.innerHTML = filtered.map(task => {
      let dueClass = '';
      let dueLabel = task.dueDate;
      if (task.dueDate === todayStr) {
        dueClass = 'today';
        dueLabel = 'DUE TODAY';
      } else if (task.dueDate < todayStr && !task.completed) {
        dueClass = 'overdue';
        dueLabel = `OVERDUE (${task.dueDate})`;
      }

      return `
        <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
          <div class="task-header-row">
            <div class="task-title-group">
              <span class="tag-category">${task.category}</span>
              ${task.dueDate ? `<span class="tag-due ${dueClass}">${dueLabel}</span>` : ''}
              <span class="task-title">${escapeHtml(task.title)}</span>
            </div>
            <button class="btn-icon" onclick="deleteTask('${task.id}')" title="Delete Task">×</button>
          </div>

          <div class="task-progress-section">
            <div class="slider-container">
              <input 
                type="range" 
                class="progress-slider" 
                min="0" 
                max="100" 
                value="${task.progress}" 
                onchange="handleSliderChange('${task.id}', this.value)"
                oninput="handleSliderInput('${task.id}', this.value)"
              />
              <span class="percent-badge" id="badge-${task.id}">${task.progress}%</span>
            </div>

            <div class="quick-btn-group">
              <button class="btn-step" onclick="adjustProgress('${task.id}', 10)">+10%</button>
              <button class="btn-step" onclick="adjustProgress('${task.id}', 25)">+25%</button>
              <button class="btn-step" onclick="setProgress('${task.id}', 100)">MAX</button>
            </div>
          </div>

          <div class="status-log">
            <span>LOG: <span id="log-${task.id}">${escapeHtml(task.lastUpdate)}</span></span>
            <button class="btn-log" onclick="addProgressLog('${task.id}')">[+ UPDATE LOG]</button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.handleSliderInput = function(id, val) {
    document.getElementById(`badge-${id}`).textContent = `${val}%`;
  };

  window.handleSliderChange = function(id, val) {
    setProgress(id, parseInt(val, 10));
  };

  window.adjustProgress = function(id, delta) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newProgress = Math.min(100, Math.max(0, task.progress + delta));
    setProgress(id, newProgress);
  };

  window.setProgress = function(id, value) {
    tasks = tasks.map(task => {
      if (task.id === id) {
        const completed = value === 100;
        return {
          ...task,
          progress: value,
          completed: completed,
          lastUpdate: `${value}% - Updated progress`
        };
      }
      return task;
    });
    saveAndRenderTasks();
  };

  window.addProgressLog = function(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const note = prompt(`Enter status note for "${task.title}":`, `Progress log at ${task.progress}%`);
    if (note !== null && note.trim() !== '') {
      task.lastUpdate = `${task.progress}% - ${note.trim()}`;
      saveAndRenderTasks();
    }
  };

  window.deleteTask = function(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRenderTasks();
  };

  // SVG Diagram & System Metrics
  function updateOverallMetrics() {
    const total = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = total - completedTasks;
    const todayStr = new Date().toISOString().split('T')[0];
    const dueTodayCount = tasks.filter(t => t.dueDate === todayStr && !t.completed).length;

    const totalProgressPoints = tasks.reduce((acc, t) => acc + t.progress, 0);
    const avgProgress = total === 0 ? 0 : Math.round(totalProgressPoints / total);

    document.getElementById('diagram-percent-text').textContent = `${avgProgress}%`;
    document.getElementById('progress-fraction').textContent = `${completedTasks} / ${total} COMPLETED`;
    document.getElementById('progress-fill').style.width = `${avgProgress}%`;
    document.getElementById('stat-pending').textContent = pendingTasks;
    document.getElementById('stat-completed').textContent = completedTasks;
    document.getElementById('stat-due-today').textContent = dueTodayCount;
    document.getElementById('stat-yield').textContent = `${avgProgress}%`;

    const ring = document.getElementById('diagram-ring');
    const perimeter = 326.72; // 2 * PI * 52
    const offset = perimeter - (avgProgress / 100) * perimeter;
    ring.style.strokeDashoffset = offset;
  }

  // --- 5. QUICK LINKS ENGINE ---
  const linkForm = document.getElementById('link-form');
  const linkNameInput = document.getElementById('link-name-input');
  const linkUrlInput = document.getElementById('link-url-input');
  const linksGrid = document.getElementById('links-grid');

  function saveAndRenderLinks() {
    localStorage.setItem('NEXUS_LINKS', JSON.stringify(links));
    renderLinks();
  }

  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = linkNameInput.value.trim();
    let url = linkUrlInput.value.trim();
    if (!name || !url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    links.push({ id: Date.now().toString(), name, url });
    linkNameInput.value = '';
    linkUrlInput.value = '';
    saveAndRenderLinks();
  });

  function renderLinks() {
    if (links.length === 0) {
      linksGrid.innerHTML = `<div style="color:var(--text-muted); font-size:0.75rem;">[ NO LINKS SAVED ]</div>`;
      return;
    }

    linksGrid.innerHTML = links.map(link => `
      <div class="link-chip">
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none;">
          ${escapeHtml(link.name)}
        </a>
        <span class="remove-link" onclick="deleteLink('${link.id}')">×</span>
      </div>
    `).join('');
  }

  window.deleteLink = function(id) {
    links = links.filter(l => l.id !== id);
    saveAndRenderLinks();
  };

  // --- 6. SCRATCHPAD WITH CHAR COUNTER ---
  const scratchpad = document.getElementById('scratchpad');
  const scratchpadCounter = document.getElementById('scratchpad-counter');

  const savedPad = localStorage.getItem('NEXUS_SCRATCHPAD') || '';
  scratchpad.value = savedPad;
  scratchpadCounter.textContent = `${savedPad.length} CHARS`;

  scratchpad.addEventListener('input', () => {
    localStorage.setItem('NEXUS_SCRATCHPAD', scratchpad.value);
    scratchpadCounter.textContent = `${scratchpad.value.length} CHARS`;
  });

  // --- 7. CONFIG & DATA IMPORT/EXPORT ---
  const modal = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const settingsForm = document.getElementById('settings-form');
  const purgeDataBtn = document.getElementById('purge-data-btn');
  const exportDataBtn = document.getElementById('export-data-btn');
  const importFile = document.getElementById('import-file');

  const cfgOperatorName = document.getElementById('cfg-operator-name');
  const cfgFocusTime = document.getElementById('cfg-focus-time');
  const cfgBreakTime = document.getElementById('cfg-break-time');
  const cfgSoundToggle = document.getElementById('cfg-sound-toggle');

  openSettingsBtn.addEventListener('click', () => {
    cfgOperatorName.value = settings.operatorName;
    cfgFocusTime.value = settings.focusTime;
    cfgBreakTime.value = settings.breakTime;
    cfgSoundToggle.checked = settings.soundEnabled;
    modal.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    settings.operatorName = cfgOperatorName.value.trim() || 'OPERATOR';
    settings.focusTime = parseInt(cfgFocusTime.value, 10) || 25;
    settings.breakTime = parseInt(cfgBreakTime.value, 10) || 5;
    settings.soundEnabled = cfgSoundToggle.checked;

    localStorage.setItem('NEXUS_SETTINGS', JSON.stringify(settings));
    modal.classList.add('hidden');
    
    updateClock();
    resetTimer();
  });

  exportDataBtn.addEventListener('click', () => {
    const backupData = {
      settings,
      tasks,
      habitData,
      links,
      scratchpad: scratchpad.value
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nexus_dashboard_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.settings) localStorage.setItem('NEXUS_SETTINGS', JSON.stringify(imported.settings));
        if (imported.tasks) localStorage.setItem('NEXUS_PROGRESS_TASKS', JSON.stringify(imported.tasks));
        if (imported.habitData) localStorage.setItem('NEXUS_HABITS', JSON.stringify(imported.habitData));
        if (imported.links) localStorage.setItem('NEXUS_LINKS', JSON.stringify(imported.links));
        if (imported.scratchpad !== undefined) localStorage.setItem('NEXUS_SCRATCHPAD', imported.scratchpad);
        alert('[SUCCESS]: SYSTEM BACKUP DATA IMPORTED');
        location.reload();
      } catch (err) {
        alert('[ERROR]: INVALID JSON FILE FORMAT');
      }
    };
    reader.readAsText(file);
  });

  purgeDataBtn.addEventListener('click', () => {
    if (confirm('[WARNING]: PURGE ALL DASHBOARD DATA? THIS ACTION IS IRREVERSIBLE.')) {
      localStorage.clear();
      location.reload();
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initial Boot
  renderHabits();
  saveAndRenderTasks();
  saveAndRenderLinks();
  resetTimer();
});