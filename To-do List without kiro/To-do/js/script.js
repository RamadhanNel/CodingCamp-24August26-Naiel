document.addEventListener('DOMContentLoaded', () => {

    // --- 1. THEME TOGGLE ---
    const themeToggle = document.getElementById('theme-toggle');
    const isLightMode = localStorage.getItem('lightMode') === 'true';
    if (isLightMode) {
        document.body.classList.add('light-mode');
        themeToggle.checked = true;
    }
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('lightMode', document.body.classList.contains('light-mode'));
    });

    // --- 2. CLOCK & NAME ---
    const timeDisplay = document.getElementById('time-display');
    const dateDisplay = document.getElementById('date-display');
    const nameInput = document.getElementById('name-input');

    nameInput.value = localStorage.getItem('userName') || '';
    nameInput.addEventListener('input', (e) => localStorage.setItem('userName', e.target.value));

    function updateClock() {
        const now = new Date();
        timeDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        dateDisplay.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- 3. POMODORO TIMER (WORK/BREAK & AUDIO) ---
    let timerInterval;
    let isRunning = false;
    let isWorkMode = true;
    
    const minDisplay = document.getElementById('minutes');
    const secDisplay = document.getElementById('seconds');
    const workInput = document.getElementById('work-input');
    const breakInput = document.getElementById('break-input');
    const modeBadge = document.getElementById('mode-badge');
    
    // Sanitizer untuk mencegah angka desimal (<1) atau input error
    function sanitizeInput(element) {
        let val = parseInt(element.value, 10);
        if (isNaN(val) || val < 1) {
            val = 1;
        }
        element.value = val;
        return val;
    }

    let timeRemaining = sanitizeInput(workInput) * 60;

    function playRingtone() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            
            osc.frequency.setValueAtTime(659.25, ctx.currentTime);
            osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.3);
            
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1);
        } catch(e) { /* Audio context fallback */ }
    }

    function updateTimerUI() {
        const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const s = (timeRemaining % 60).toString().padStart(2, '0');
        minDisplay.textContent = m;
        secDisplay.textContent = s;
    }

    function switchMode() {
        isWorkMode = !isWorkMode;
        if (isWorkMode) {
            modeBadge.textContent = 'WORK MODE';
            modeBadge.className = 'badge work-mode';
            timeRemaining = sanitizeInput(workInput) * 60;
        } else {
            modeBadge.textContent = 'BREAK MODE';
            modeBadge.className = 'badge break-mode';
            timeRemaining = sanitizeInput(breakInput) * 60;
        }
        updateTimerUI();
    }

    function handleTimerComplete() {
        clearInterval(timerInterval);
        isRunning = false;
        playRingtone();
        
        setTimeout(() => {
            if (isWorkMode) {
                alert('Commission Completed! Time to take a break.');
            } else {
                alert('Break is over! Back to work.');
            }
            switchMode();
        }, 100);
    }

    document.getElementById('timer-start').addEventListener('click', () => {
        if (isRunning) return;
        isRunning = true;
        timerInterval = setInterval(() => {
            if (timeRemaining > 0) {
                timeRemaining--;
                updateTimerUI();
            } else {
                handleTimerComplete();
            }
        }, 1000);
    });

    document.getElementById('timer-stop').addEventListener('click', () => {
        clearInterval(timerInterval);
        isRunning = false;
    });

    document.getElementById('timer-reset').addEventListener('click', () => {
        clearInterval(timerInterval);
        isRunning = false;
        timeRemaining = isWorkMode ? sanitizeInput(workInput) * 60 : sanitizeInput(breakInput) * 60;
        updateTimerUI();
    });

    [workInput, breakInput].forEach(input => {
        input.addEventListener('input', () => {
            sanitizeInput(input);
            if (!isRunning) {
                timeRemaining = isWorkMode ? sanitizeInput(workInput) * 60 : sanitizeInput(breakInput) * 60;
                updateTimerUI();
            }
        });
    });

    // --- 4. TO-DO LIST & PROGRESS BAR (INLINE EDIT) ---
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let sortAscending = true;

    function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }

    function updateProgress() {
        const fill = document.getElementById('progress-bar-fill');
        const text = document.getElementById('progress-text');
        const statComp = document.getElementById('stat-completed');
        const statTot = document.getElementById('stat-total');

        if (!fill) return;

        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

        fill.style.width = `${percentage}%`;
        text.textContent = `${percentage}%`;
        statComp.textContent = completed;
        statTot.textContent = total;

        if (percentage === 100 && total > 0) {
            fill.style.boxShadow = '0 0 15px var(--zzz-yellow)';
        } else {
            fill.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
        }
    }

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => {
                tasks[index].completed = checkbox.checked;
                saveTasks(); 
                renderTasks();
            });

            // Teks Standar
            const span = document.createElement('span');
            span.textContent = task.text;

            // Input untuk Edit Inline
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'edit-input';
            editInput.value = task.text;
            editInput.style.display = 'none';

            // Tombol Toggle Edit
            const editBtn = document.createElement('button');
            editBtn.textContent = 'EDIT';
            editBtn.className = 'action-btn edit';
            
            let isEditing = false;

            function toggleEdit() {
                isEditing = !isEditing;
                if (isEditing) {
                    span.style.display = 'none';
                    editInput.style.display = 'block';
                    editInput.focus();
                    editBtn.textContent = 'SAVE';
                } else {
                    const newText = editInput.value.trim();
                    if (newText && newText !== task.text) {
                        if (tasks.some((t, i) => i !== index && t.text.toLowerCase() === newText.toLowerCase())) {
                            alert('Commission already exists!');
                            editInput.value = task.text;
                        } else {
                            tasks[index].text = newText;
                            saveTasks();
                        }
                    }
                    renderTasks();
                }
            }

            editBtn.addEventListener('click', toggleEdit);
            editInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') toggleEdit();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'DEL';
            deleteBtn.className = 'action-btn delete';
            deleteBtn.addEventListener('click', () => {
                tasks.splice(index, 1);
                saveTasks(); 
                renderTasks();
            });

            li.append(checkbox, span, editInput, editBtn, deleteBtn);
            taskList.appendChild(li);
        });
        updateProgress();
    }

    document.getElementById('task-add').addEventListener('click', () => {
        const text = taskInput.value.trim();
        if (!text) return;
        if (tasks.some(t => t.text.toLowerCase() === text.toLowerCase())) {
            alert('Commission already exists!'); return;
        }
        tasks.push({ text, completed: false });
        taskInput.value = '';
        saveTasks(); 
        renderTasks();
    });

    document.getElementById('task-sort').addEventListener('click', () => {
        tasks.sort((a, b) => sortAscending ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text));
        sortAscending = !sortAscending;
        saveTasks(); 
        renderTasks();
    });

    // --- 5. CALENDAR WIDGET ---
    let currentCalDate = new Date();

    function renderCalendar() {
        const calMonthYear = document.getElementById('cal-month-year');
        const calDays = document.getElementById('cal-days');
        
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        calMonthYear.textContent = `${monthNames[month]} ${year}`;

        calDays.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'cal-day empty';
            calDays.appendChild(emptyDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.textContent = day;

            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('today');
            }
            calDays.appendChild(dayDiv);
        }
    }

    document.getElementById('cal-prev').addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() + 1);
        renderCalendar();
    });

    // --- 6. WEATHER WIDGET ---
    function fetchWeather() {
        const tempEl = document.getElementById('weather-temp');
        const statusEl = document.getElementById('weather-status');
        const locEl = document.getElementById('weather-location');

        statusEl.textContent = 'LOADING...';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => getWeather(pos.coords.latitude, pos.coords.longitude, "Local Zone"),
                () => getWeather(-6.2088, 106.8456, "Jakarta (Default)") 
            );
        } else {
            getWeather(-6.2088, 106.8456, "Jakarta (Default)");
        }

        function getWeather(lat, lon, locationName) {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
                .then(res => res.json())
                .then(data => {
                    const temp = Math.round(data.current_weather.temperature);
                    const code = data.current_weather.weathercode;
                    tempEl.textContent = `${temp}°C`;
                    locEl.textContent = locationName;

                    if (code === 0) statusEl.textContent = 'CLEAR SKY';
                    else if (code <= 3) statusEl.textContent = 'PARTLY CLOUDY';
                    else if (code <= 67) statusEl.textContent = 'RAINY';
                    else statusEl.textContent = 'STORMY';
                })
                .catch(() => {
                    tempEl.textContent = '28°C';
                    statusEl.textContent = 'ONLINE';
                    locEl.textContent = 'Grid System';
                });
        }
    }

    document.getElementById('weather-refresh').addEventListener('click', fetchWeather);

    // --- 7. QUICK LINKS ---
    const linkNameInput = document.getElementById('link-name');
    const linkUrlInput = document.getElementById('link-url');
    const linkList = document.getElementById('link-list');
    let links = JSON.parse(localStorage.getItem('links')) || [];

    function saveLinks() { localStorage.setItem('links', JSON.stringify(links)); }

    function renderLinks() {
        linkList.innerHTML = '';
        links.forEach((link, index) => {
            const div = document.createElement('div');
            div.className = 'link-item';
            
            const a = document.createElement('a');
            a.href = link.url;
            a.target = '_blank';
            a.textContent = link.name;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'action-btn delete';
            deleteBtn.addEventListener('click', () => {
                links.splice(index, 1);
                saveLinks(); renderLinks();
            });

            div.append(a, deleteBtn);
            linkList.appendChild(div);
        });
    }

    document.getElementById('link-add').addEventListener('click', () => {
        const name = linkNameInput.value.trim();
        let url = linkUrlInput.value.trim();
        if (!name || !url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

        links.push({ name, url });
        linkNameInput.value = ''; linkUrlInput.value = '';
        saveLinks(); renderLinks();
    });

    // Inisialisasi awal
    updateTimerUI();
    renderTasks();
    renderLinks();
    renderCalendar();
    fetchWeather();
});