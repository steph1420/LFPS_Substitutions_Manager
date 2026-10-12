// --- STATE MANAGEMENT ---
const state = {
    day: 'MON',
    isEditMode: false,
    absentTeachers: new Set(),
    baseSchedule: {}, 
    schedule: {},     
    substitutions: {}, 
    displaced: { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] },
    settings: {
        samePeriodLock: true
    },
    actionHistory: {
        grid: [], 
        subs: [],
        redoGrid: [],
        redoSubs: []
    }
};

let selectedCell = null; 
let draggedData = null;  
let scrollSpeed = 0;
let isScrolling = false;

// Transient states for specific drop animations
let lastDroppedCell = null; 
let lastDisplacedDrop = null;
let newlyDisplacedItemId = null;

const teachers = [
    'Mr. Stephen', 'Mrs. Midha', 'Mrs. Pahwa', 'Mrs. Bage', 'Mr. Adams', 
    'Mrs. Baker', 'Ms. Clark', 'Mr. Davis', 'Mrs. Evans'
];
const periods = ['GOLDEN HOUR', '1st Pd.', 'BREAKFAST BREAK', '2nd Pd.', '3rd Pd.', '4th Pd.', '5th Pd.', '2nd GOLDEN HOUR', '6th Pd.', '7th Pd.'];

// --- INITIALIZATION & STORAGE ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    if (!loadStateFromStorage()) {
        generateSimulatedData(); 
        saveStateToStorage(); 
    }
    bindEvents();
    updateUndoUI();
    renderAll();
});

function saveStateToStorage() {
    const data = {
        day: state.day,
        baseSchedule: state.baseSchedule,
        schedule: state.schedule,
        substitutions: state.substitutions,
        displaced: state.displaced,
        absentTeachers: Array.from(state.absentTeachers), 
        settings: state.settings,
        actionHistory: state.actionHistory
    };
    localStorage.setItem('lfps_frontdesk_state', JSON.stringify(data));
}

function migratePeriodNames(scheduleObj) {
    if (!scheduleObj) return;
    Object.keys(scheduleObj).forEach(day => {
        const daySched = scheduleObj[day];
        if (!daySched) return;
        if (daySched['BREAKFAST'] && !daySched['BREAKFAST BREAK']) {
            daySched['BREAKFAST BREAK'] = daySched['BREAKFAST'];
            delete daySched['BREAKFAST'];
        }
        if (daySched['PLAY TIME'] && !daySched['2nd GOLDEN HOUR']) {
            daySched['2nd GOLDEN HOUR'] = daySched['PLAY TIME'];
            delete daySched['PLAY TIME'];
        }
    });
}

function loadStateFromStorage() {
    const saved = localStorage.getItem('lfps_frontdesk_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (!parsed || !parsed.schedule || Object.keys(parsed.schedule).length === 0) {
                return false;
            }
            state.day = parsed.day || 'MON';
            state.baseSchedule = parsed.baseSchedule || JSON.parse(JSON.stringify(parsed.schedule)); 
            state.schedule = parsed.schedule;
            state.substitutions = parsed.substitutions || {};
            state.displaced = parsed.displaced || { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
            state.absentTeachers = new Set(parsed.absentTeachers || []);
            state.settings = parsed.settings || { samePeriodLock: true };
            
            // Automatic migration of periods
            migratePeriodNames(state.schedule);
            migratePeriodNames(state.baseSchedule);

            Object.keys(state.displaced).forEach(day => {
                if (Array.isArray(state.displaced[day])) {
                    state.displaced[day].forEach(item => {
                        if (item.period === 'PLAY TIME') item.period = '2nd GOLDEN HOUR';
                        if (item.period === 'BREAKFAST') item.period = 'BREAKFAST BREAK';
                    });
                }
            });

            Object.keys(state.substitutions).forEach(day => {
                const daySubs = state.substitutions[day];
                if (daySubs) {
                    if (daySubs['PLAY TIME'] && !daySubs['2nd GOLDEN HOUR']) {
                        daySubs['2nd GOLDEN HOUR'] = daySubs['PLAY TIME'];
                        delete daySubs['PLAY TIME'];
                    }
                    if (daySubs['BREAKFAST'] && !daySubs['BREAKFAST BREAK']) {
                        daySubs['BREAKFAST BREAK'] = daySubs['BREAKFAST'];
                        delete daySubs['BREAKFAST'];
                    }
                }
            });
            
            if (parsed.actionHistory) {
                state.actionHistory = {
                    grid: Array.isArray(parsed.actionHistory.grid) ? parsed.actionHistory.grid : [],
                    subs: Array.isArray(parsed.actionHistory.subs) ? parsed.actionHistory.subs : [],
                    redoGrid: Array.isArray(parsed.actionHistory.redoGrid) ? parsed.actionHistory.redoGrid : [],
                    redoSubs: Array.isArray(parsed.actionHistory.redoSubs) ? parsed.actionHistory.redoSubs : []
                };
            } else {
                state.actionHistory = { grid: [], subs: [], redoGrid: [], redoSubs: [] };
            }
            
            document.querySelectorAll('.day-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.day === state.day);
            });
            return true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

// --- THEME MANAGEMENT ---
const THEME_ICONS = {
    sun: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    moon: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
};

function initTheme() {
    const savedTheme = localStorage.getItem('lfps_frontdesk_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
    }
    updateThemeToggleUI();

    const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery && mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', () => {
            if (!localStorage.getItem('lfps_frontdesk_theme')) {
                updateThemeToggleUI();
            }
        });
    }
}

function toggleTheme(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const current = document.documentElement.getAttribute('data-theme');
    const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = current ? (current === 'dark') : systemIsDark;
    const nextTheme = isDark ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', nextTheme);
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('lfps_frontdesk_theme', nextTheme);
    updateThemeToggleUI();
}
window.toggleTheme = toggleTheme;

function updateThemeToggleUI() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const current = document.documentElement.getAttribute('data-theme');
    const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = current ? (current === 'dark') : systemIsDark;
    btn.innerHTML = isDark ? THEME_ICONS.sun : THEME_ICONS.moon;
    btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Night Mode';
    btn.setAttribute('aria-label', btn.title);
}

function safeBind(id, eventType, handler, options = false) {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventType, handler, options);
}

function scrollTick() {
    const container = document.querySelector('.table-scroll-container');
    if (scrollSpeed !== 0 && container) {
        container.scrollLeft += scrollSpeed;
        requestAnimationFrame(scrollTick);
    } else {
        isScrolling = false;
    }
}

function bindEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(t => t.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            document.getElementById(target.dataset.target).classList.add('active');
            updateUndoUI(); 
        });
    });

    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.day = e.currentTarget.dataset.day;
            selectedCell = null; 
            saveStateToStorage();
            renderAll();
        });
    });

    const editBtn = document.getElementById('edit-toggle-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            state.isEditMode = !state.isEditMode;
            editBtn.textContent = state.isEditMode ? 'Save Schedule' : 'Edit Schedule';
            editBtn.classList.toggle('save-mode', state.isEditMode);
            selectedCell = null; 
            renderAll(); 
        });
    }

    safeBind('hide-absent-toggle', 'change', renderAll);
    
    safeBind('sheet-overlay', 'click', (e) => {
        e.preventDefault(); e.stopPropagation(); closeBottomSheet();
    });
    safeBind('sheet-overlay', 'touchstart', (e) => {
        e.preventDefault(); e.stopPropagation(); closeBottomSheet();
    }, {passive: false});

    safeBind('theme-toggle-btn', 'click', toggleTheme);
    safeBind('toast-undo-btn', 'click', undoLastAction);
    safeBind('header-undo-btn', 'click', undoLastAction);
    safeBind('header-redo-btn', 'click', redoLastAction);
    safeBind('reset-schedule-btn', 'click', handleResetSchedule);
    safeBind('auto-resolve-btn', 'click', performAutoResolve);

    safeBind('settings-btn', 'click', openSettingsModal);
    safeBind('close-settings-btn', 'click', closeSettingsModal);
    safeBind('settings-overlay', 'click', closeSettingsModal);
    safeBind('same-period-lock-toggle', 'change', (e) => {
        state.settings.samePeriodLock = e.target.checked;
        saveStateToStorage();
        showToast(state.settings.samePeriodLock ? 'Same-Period Lock enabled' : 'Same-Period Lock disabled (Cross-period subs allowed)');
    });

    window.addEventListener('keydown', handleGlobalKeydown);

    const sheet = document.getElementById('bottom-sheet');
    const handle = document.getElementById('sheet-handle');
    let startY = 0;
    let currentY = 0;
    let isDraggingSheet = false;

    if (sheet) {
        sheet.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDraggingSheet = true;
            sheet.style.transition = 'none'; 
        }, {passive: true});

        sheet.addEventListener('touchmove', (e) => {
            if (!isDraggingSheet) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            if (deltaY > 0) { 
                sheet.style.transform = `translateY(${deltaY}px)`;
            }
        }, {passive: true});

        sheet.addEventListener('touchend', (e) => {
            if (!isDraggingSheet) return;
            isDraggingSheet = false;
            sheet.style.transition = 'bottom 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            const deltaY = currentY - startY;
            if (deltaY > 80) {
                closeBottomSheet();
                setTimeout(() => { sheet.style.transform = ''; }, 300); 
            } else {
                sheet.style.transform = 'translateY(0)'; 
            }
        });

        if(handle) handle.addEventListener('click', closeBottomSheet);
    }

    const tableContainer = document.querySelector('.table-scroll-container');
    const table = document.getElementById('routine-table');
    
    if (table && tableContainer) {
        table.addEventListener('dragstart', (e) => {
            const td = e.target.closest('td');
            if (!td || !td.dataset.period) return e.preventDefault();
            
            const period = td.dataset.period;
            const teacher = td.dataset.teacher;
            const isAbsent = state.absentTeachers.has(teacher);
            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
            const assignedSub = state.substitutions[state.day]?.[period]?.[teacher];
            
            let coveringFor = null;
            const periodSubs = state.substitutions[state.day]?.[period];
            if (periodSubs) {
                for (const [absT, subT] of Object.entries(periodSubs)) {
                    if (subT === teacher) {
                        coveringFor = absT;
                        break;
                    }
                }
            }
            
            const isMissingSub = isAbsent && baseTask && baseTask !== 'Free' && !assignedSub;
            const isSubRelated = isMissingSub || assignedSub || coveringFor;
            
            if (!state.isEditMode && !isSubRelated) {
                return e.preventDefault();
            }
            
            draggedData = { 
                type: 'grid', 
                period, 
                teacher,
                isSubRelated,
                isMissingSub,
                assignedSub,
                coveringFor
            };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); 
            scrollSpeed = 0;

            setTimeout(() => td.classList.add('cell-dragging'), 0);
        });

        tableContainer.addEventListener('dragover', (e) => {
            if (!draggedData) return;
            e.preventDefault(); 
            
            const rect = tableContainer.getBoundingClientRect();
            const threshold = 70; 
            const mouseX = e.clientX - rect.left;
            
            if (mouseX < threshold) {
                scrollSpeed = -((threshold - mouseX) / 4);
                if (!isScrolling) { isScrolling = true; requestAnimationFrame(scrollTick); }
            } else if (mouseX > rect.width - threshold) {
                scrollSpeed = ((mouseX - (rect.width - threshold)) / 4);
                if (!isScrolling) { isScrolling = true; requestAnimationFrame(scrollTick); }
            } else {
                scrollSpeed = 0;
            }

            const targetCell = e.target.closest('td');
            if (targetCell && targetCell.dataset.period) {
                const isCrossAllowed = (!state.settings || state.settings.samePeriodLock === false);
                if (draggedData.isSubRelated && (targetCell.dataset.period === draggedData.period || isCrossAllowed)) {
                    targetCell.classList.add('drag-over-sub');
                } else {
                    targetCell.classList.add('drag-over');
                }
            }
        });

        tableContainer.addEventListener('dragleave', (e) => {
            const targetCell = e.target.closest('td');
            if (targetCell) {
                targetCell.classList.remove('drag-over', 'drag-over-sub');
            }
            
            const rect = tableContainer.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                scrollSpeed = 0;
            }
        });

        tableContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            scrollSpeed = 0; 
            if (!draggedData) return;
            
            const targetCell = e.target.closest('td');
            document.querySelectorAll('.drag-over, .drag-over-sub').forEach(el => el.classList.remove('drag-over', 'drag-over-sub'));
            
            if (targetCell && targetCell.dataset.period && targetCell.dataset.teacher) {
                if (draggedData.type === 'grid' && draggedData.period === targetCell.dataset.period && draggedData.teacher === targetCell.dataset.teacher) {
                    draggedData = null;
                    document.querySelectorAll('.cell-dragging').forEach(el => el.classList.remove('cell-dragging'));
                    return;
                }
                executeMove(draggedData, { period: targetCell.dataset.period, teacher: targetCell.dataset.teacher });
            }
            draggedData = null;
            document.querySelectorAll('.cell-dragging').forEach(el => el.classList.remove('cell-dragging'));
        });

        table.addEventListener('dragend', () => {
            scrollSpeed = 0;
            draggedData = null;
            document.querySelectorAll('.drag-over, .drag-over-sub').forEach(el => el.classList.remove('drag-over', 'drag-over-sub'));
            document.querySelectorAll('.cell-dragging').forEach(el => el.classList.remove('cell-dragging'));
        });

        table.addEventListener('mouseover', (e) => {
            const th = e.target.closest('th');
            if (th && th.cellIndex > 0) {
                th.classList.add('col-header-hover');
                const colIdx = th.cellIndex + 1;
                table.querySelectorAll(`tbody td:nth-child(${colIdx})`).forEach(td => td.classList.add('col-hover'));
            }
            
            const teacherTd = e.target.closest('tbody td:first-child');
            if (teacherTd) {
                const tr = teacherTd.closest('tr');
                if (tr) tr.classList.add('row-hover');
            }
        });

        table.addEventListener('mouseout', (e) => {
            const th = e.target.closest('th');
            if (th && th.cellIndex > 0) {
                th.classList.remove('col-header-hover');
                const colIdx = th.cellIndex + 1;
                table.querySelectorAll(`tbody td:nth-child(${colIdx})`).forEach(td => td.classList.remove('col-hover'));
            }
            
            const teacherTd = e.target.closest('tbody td:first-child');
            if (teacherTd) {
                const tr = teacherTd.closest('tr');
                if (tr) tr.classList.remove('row-hover');
            }
        });
    }
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    renderAbsentTray();
    renderTableRoutine(); 
    renderDisplacedTray();
    renderSubstitutions();
}

function renderAbsentTray() {
    const tray = document.getElementById('teacher-roster');
    if(!tray) return;
    tray.innerHTML = '';
    
    teachers.forEach(teacher => {
        const isAbsent = state.absentTeachers.has(teacher);
        const el = document.createElement('div');
        el.className = `teacher-avatar ${isAbsent ? 'absent' : ''}`;
        el.innerHTML = `
            <div class="avatar-circle">${teacher.charAt(0)}</div>
            <span class="name" style="font-size:11px; margin-top:4px;">${teacher.split(' ')[1] || teacher}</span>
        `;
        el.addEventListener('click', () => {
            if (isAbsent) state.absentTeachers.delete(teacher);
            else state.absentTeachers.add(teacher);
            saveStateToStorage();
            renderAll();
        });
        tray.appendChild(el);
    });
}

function renderTableRoutine() {
    const table = document.getElementById('routine-table');
    const hideToggle = document.getElementById('hide-absent-toggle');
    if(!table || !hideToggle) return;
    
    const hideAbsent = hideToggle.checked;
    
    let html = '<thead><tr><th class="teacher-header-cell">Teacher Name</th>';
    periods.forEach((p, idx) => html += `<th data-period="${p}" data-col="${idx + 1}">${p}</th>`);
    html += '</tr></thead><tbody>';
    
    teachers.forEach(teacher => {
        const isAbsent = state.absentTeachers.has(teacher);
        if (isAbsent && hideAbsent) return;
        
        html += `<tr class="${isAbsent ? 'row-absent' : ''}">`;
        html += `<td class="teacher-cell" data-teacher="${teacher}">${teacher}</td>`;
        
        periods.forEach(period => {
            if (period === 'BREAKFAST BREAK' || period === 'BREAKFAST') {
                html += `<td style="background:var(--static-cell-bg); text-align:center; color:var(--text-secondary);">-</td>`;
                return;
            }
            
            const task = state.schedule[state.day]?.[period]?.[teacher] || 'Free';
            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
            const assignedSub = state.substitutions[state.day]?.[period]?.[teacher];
            
            // Check if this teacher is covering for an absent colleague in this period
            let coveringFor = null;
            const periodSubs = state.substitutions[state.day]?.[period];
            if (periodSubs) {
                for (const [absT, subT] of Object.entries(periodSubs)) {
                    if (subT === teacher) {
                        coveringFor = absT;
                        break;
                    }
                }
            }

            const isMissingSub = isAbsent && baseTask && baseTask !== 'Free' && !assignedSub;
            
            let cellClasses = [];
            let cellContent = '';
            let cellTitle = '';
            let isDraggable = false;
            let clickHandler = '';

            if (isMissingSub) {
                cellClasses.push('cell-missing');
                cellContent = `
                    <div class="cell-missing-content">
                        <span>⚠ ${baseTask}</span>
                        <span class="missing-hint">Drag to Sub</span>
                    </div>
                `;
                cellTitle = `${teacher} is absent. Drag this cell to an available teacher to assign substitute, or tap to choose.`;
                isDraggable = true;
                clickHandler = state.isEditMode 
                    ? `onclick="handleGridInteraction('${period}', '${teacher}')"` 
                    : `onclick="openBottomSheet('${period}', '${teacher}')"`;

            } else if (assignedSub) {
                cellClasses.push('cell-covered');
                cellContent = `
                    <div class="cell-covered-content">
                        <span class="covered-task">${baseTask}</span>
                        <span class="covered-by-tag">↳ ${assignedSub.split(' ')[1] || assignedSub}</span>
                    </div>
                `;
                cellTitle = `Covered by ${assignedSub}. Drag to reassign substitute, or tap to manage.`;
                isDraggable = true;
                clickHandler = state.isEditMode 
                    ? `onclick="handleGridInteraction('${period}', '${teacher}')"` 
                    : `onclick="openBottomSheet('${period}', '${teacher}')"`;

            } else if (coveringFor) {
                cellClasses.push('cell-sub-active');
                cellContent = `
                    <div class="cell-sub-content">
                        <span class="sub-task">${task}</span>
                        <span class="sub-badge">Sub (${coveringFor.split(' ')[1] || coveringFor})</span>
                    </div>
                `;
                cellTitle = `Substituting for ${coveringFor}. Drag to another teacher to reassign, or drag back to ${coveringFor} to unassign.`;
                isDraggable = true;
                clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';

            } else if (task !== 'Free') {
                cellClasses.push('cell-assigned');
                cellContent = task;
                cellTitle = `${teacher}: ${task}`;
                isDraggable = state.isEditMode;
                clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';

            } else {
                // Free cell
                cellContent = '';
                cellTitle = `${teacher} is Free in ${period}`;
                isDraggable = false;
                clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';
            }

            if (selectedCell && selectedCell.type === 'grid' && selectedCell.period === period && selectedCell.teacher === teacher) {
                cellClasses.push('cell-selected');
            }

            // Apply contextual drop animations and ghost slide
            if (lastDisplacedDrop && lastDisplacedDrop.period === period && lastDisplacedDrop.teacher === teacher) {
                cellClasses.push('cell-displaced-flash');
                cellContent = `
                    <div style="position:relative; z-index:2; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">${cellContent}</div>
                    <div class="ghost-displaced">${lastDisplacedDrop.oldTask}</div>
                `;
            } else if (lastDroppedCell && lastDroppedCell.period === period && lastDroppedCell.teacher === teacher) {
                cellClasses.push('cell-just-dropped');
            }
            
            const dragAttrs = isDraggable ? `draggable="true"` : '';
            
            html += `<td class="${cellClasses.join(' ')}" style="cursor:pointer;" title="${cellTitle}" data-period="${period}" data-teacher="${teacher}" ${clickHandler} ${dragAttrs}>${cellContent}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
}

function renderDisplacedTray() {
    const indicator = document.getElementById('displaced-indicator');
    const wrapper = document.getElementById('limbo-wrapper');
    const tray = document.getElementById('displaced-tray');
    if(!indicator || !wrapper || !tray) return;

    const items = state.displaced[state.day] || [];
    
    if (items.length > 0) {
        indicator.classList.remove('hidden');
        wrapper.classList.add('active');
        tray.innerHTML = '';
        
        items.forEach(item => {
            const isSelected = selectedCell && selectedCell.type === 'displaced' && selectedCell.item.id === item.id;
            const isNew = item.id === newlyDisplacedItemId;
            
            const div = document.createElement('div');
            // PopIn applies ONLY to newly displaced item. Rest just lay flat.
            div.className = `displaced-item ${isSelected ? 'selected' : ''} ${isNew ? 'item-newly-displaced' : ''}`;
            div.draggable = state.isEditMode;
            div.dataset.id = item.id;
            div.innerHTML = `
                <span>${item.task}</span>
                <span class="og-teacher">From: ${item.ogTeacher} (${item.period})</span>
            `;
            
            if (state.isEditMode) {
                div.onclick = () => handleDisplacedInteraction(item);
                div.ondragstart = (e) => {
                    draggedData = { type: 'displaced', item: item };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', '');
                    scrollSpeed = 0;
                    setTimeout(() => div.classList.add('cell-dragging'), 0);
                };
                div.ondragend = () => { 
                    draggedData = null; 
                    scrollSpeed = 0; 
                    div.classList.remove('cell-dragging');
                };
            }
            tray.appendChild(div);
        });
    } else {
        indicator.classList.add('hidden');
        wrapper.classList.remove('active');
    }
}

function renderSubstitutions() {
    const conflictList = document.getElementById('conflict-list');
    const badge = document.getElementById('substitutions-badge');
    const autoBtn = document.getElementById('auto-resolve-btn');
    if(!conflictList || !badge) return;
    
    conflictList.innerHTML = '';
    let conflicts = 0;
    let resolvedCount = 0;
    let totalAbsences = 0;

    periods.forEach(period => {
        teachers.forEach(teacher => {
            const isAbsent = state.absentTeachers.has(teacher);
            if (!isAbsent) return;

            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
            if (!baseTask || baseTask === 'Free' || baseTask === '') return;

            totalAbsences++;
            const subTeacher = state.substitutions[state.day]?.[period]?.[teacher];
            
            if (subTeacher) {
                resolvedCount++;
                conflictList.innerHTML += `
                    <div class="period-card resolved" style="margin-bottom:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--accent-green);">${period} - ${baseTask}</strong>
                            <span style="text-decoration: line-through; color:var(--text-secondary);">${teacher}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600; color:var(--text-primary);">Covered by: ${subTeacher}</span>
                            <button onclick="event.stopPropagation(); openBottomSheet('${period}', '${teacher}')" style="background:transparent; border:1px solid var(--accent-green); color:var(--accent-green); padding:4px 10px; border-radius:12px; font-size:12px; cursor:pointer;">Reassign</button>
                        </div>
                    </div>
                `;
            } else {
                conflicts++;
                conflictList.innerHTML += `
                    <div class="period-card needs-action" style="margin-bottom:15px; cursor:pointer;" onclick="openBottomSheet('${period}', '${teacher}')">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--accent-pink);">${period} - ${baseTask}</strong>
                            <span>${teacher}</span>
                        </div>
                        <div style="font-size:13px; color:var(--accent-blue);">Tap to assign substitute →</div>
                    </div>
                `;
            }
        });
    });

    badge.textContent = conflicts;
    badge.className = `badge ${conflicts > 0 ? 'visible' : 'hidden'}`;
    badge.style.cssText = conflicts > 0 ? "background:var(--accent-red); color:white; padding:2px 6px; border-radius:10px; font-size:10px; position:absolute; top:-5px; right:15px;" : "display:none;";
    
    if (autoBtn) {
        if (conflicts > 0) {
            autoBtn.classList.remove('hidden');
        } else {
            autoBtn.classList.add('hidden');
        }
    }

    if (totalAbsences === 0) {
        conflictList.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:48px; margin-bottom:10px;">🎉</div>
                <h3 style="color:var(--text-primary); margin-bottom:5px;">All Clear!</h3>
                <p style="color:var(--text-secondary); font-size:14px;">No absences marked for today.</p>
            </div>
        `;
    }
}

// --- INTERACTION MECHANICS ---

function handleGridInteraction(period, teacher) {
    if (!state.isEditMode) return;
    
    if (!selectedCell) {
        selectedCell = { type: 'grid', period, teacher };
        renderAll();
    } else if (selectedCell.type === 'grid' && selectedCell.period === period && selectedCell.teacher === teacher) {
        selectedCell = null; 
        renderAll();
    } else {
        executeMove(selectedCell, { period, teacher });
        selectedCell = null;
    }
}

function handleDisplacedInteraction(item) {
    if (!state.isEditMode) return;
    
    if (!selectedCell) {
        selectedCell = { type: 'displaced', item: item };
        renderAll();
    } else if (selectedCell.type === 'displaced' && selectedCell.item.id === item.id) {
        selectedCell = null; 
        renderAll();
    } else if (selectedCell.type === 'grid') {
        selectedCell = { type: 'displaced', item: item };
        renderAll();
    }
}

function executeMove(source, target) {
    if (!source || !target) return;
    clearRedoStacks();

    // Check if source is a grid cell
    if (source.type === 'grid') {
        const sPeriod = source.period;
        const sTeacher = source.teacher;
        const tPeriod = target.period;
        const tTeacher = target.teacher;

        const sIsAbsent = state.absentTeachers.has(sTeacher);
        const sBaseTask = state.baseSchedule[state.day]?.[sPeriod]?.[sTeacher];
        const sAssignedSub = state.substitutions[state.day]?.[sPeriod]?.[sTeacher];

        let sCoveringFor = null;
        const periodSubs = state.substitutions[state.day]?.[sPeriod];
        if (periodSubs) {
            for (const [absT, subT] of Object.entries(periodSubs)) {
                if (subT === sTeacher) {
                    sCoveringFor = absT;
                    break;
                }
            }
        }

        const isSourceSubRelated = (sIsAbsent && sBaseTask && sBaseTask !== 'Free') || sCoveringFor || sAssignedSub;
        const isSamePeriod = (sPeriod === tPeriod);
        const allowCrossPeriod = (!state.settings || state.settings.samePeriodLock === false);

        // --- SCENARIO 1: SUBSTITUTION ASSIGNMENT / REASSIGNMENT ---
        if (isSourceSubRelated && (isSamePeriod || allowCrossPeriod)) {
            // Cannot assign another absent teacher as sub (unless it's the original absent teacher being unassigned)
            if (state.absentTeachers.has(tTeacher) && tTeacher !== sCoveringFor) {
                showToast(`Cannot assign ${tTeacher} as substitute (they are marked absent).`);
                return;
            }

            // Subcase 1A: Dropping an active substitute back onto the original absent teacher -> Unassign
            if (sCoveringFor && tTeacher === sCoveringFor) {
                unassignSubstitute(sPeriod, sCoveringFor);
                return;
            }

            // Subcase 1B: Reassigning an active substitute to a new teacher
            if (sCoveringFor) {
                if (tTeacher === sTeacher && sPeriod === tPeriod) return;
                assignSubstitute(sPeriod, sCoveringFor, tTeacher, tPeriod);
                return;
            }

            // Subcase 1C: Assigning substitute from absent teacher cell (whether missing or covered)
            if (sIsAbsent) {
                if (tTeacher === sTeacher && sPeriod === tPeriod) return;
                assignSubstitute(sPeriod, sTeacher, tTeacher, tPeriod);
                return;
            }
        }

        // --- SCENARIO 2: ATTEMPTED SUB DRAG ACROSS DIFFERENT PERIODS WHEN LOCKED ---
        if (isSourceSubRelated && !isSamePeriod && !allowCrossPeriod && !state.isEditMode) {
            showToast(`Substitutions are locked to the same period (${sPeriod}). Turn off "Same-Period Lock" in Settings to assign across periods.`);
            return;
        }
    }

    // --- SCENARIO 3: REGULAR TIMETABLE EDIT (Edit Mode Move / Displaced Drag) ---
    let sTask = '';
    if (source.type === 'grid') {
        sTask = state.schedule[state.day][source.period][source.teacher];
    } else if (source.type === 'displaced') {
        sTask = source.item.task;
    }

    const tTask = state.schedule[state.day][target.period][target.teacher]; 
    let newlyDisplaced = null;
    let wasDisplaced = false;

    if (tTask !== 'Free') {
        wasDisplaced = true;
        newlyDisplaced = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            task: tTask,
            ogTeacher: target.teacher,
            period: target.period
        };
        state.displaced[state.day].push(newlyDisplaced);
        newlyDisplacedItemId = newlyDisplaced.id;
    }

    state.actionHistory.grid.push({
        type: 'move',
        day: state.day,
        source, 
        target, 
        sTask, 
        tTask,
        newlyDisplaced
    });

    state.schedule[state.day][target.period][target.teacher] = sTask; 
    
    if (source.type === 'grid') {
        state.schedule[state.day][source.period][source.teacher] = 'Free'; 
    } else if (source.type === 'displaced') {
        state.displaced[state.day] = state.displaced[state.day].filter(d => d.id !== source.item.id);
    }

    if (wasDisplaced) {
        lastDisplacedDrop = { period: target.period, teacher: target.teacher, oldTask: tTask };
    } else {
        lastDroppedCell = { period: target.period, teacher: target.teacher };
    }

    setTimeout(() => {
        lastDroppedCell = null; 
        lastDisplacedDrop = null;
        newlyDisplacedItemId = null;
    }, 600);

    saveStateToStorage();
    updateUndoUI();
    showToast(`Assignment Moved.`);
    renderAll();
}

function handleResetSchedule() {
    const day = state.day;
    
    // Save current state for perfect undo tracking
    const prevSchedule = JSON.parse(JSON.stringify(state.schedule[day]));
    const prevDisplaced = JSON.parse(JSON.stringify(state.displaced[day] || []));
    const prevSubs = state.substitutions[day] ? JSON.parse(JSON.stringify(state.substitutions[day])) : {};

    const activeStack = getActiveHistoryStack();
    activeStack.push({
        type: 'reset',
        day: day,
        prevSchedule,
        prevDisplaced,
        prevSubs
    });

    // Enact the reset
    state.schedule[day] = JSON.parse(JSON.stringify(state.baseSchedule[day]));
    state.displaced[day] = [];
    state.substitutions[day] = {};

    saveStateToStorage();
    updateUndoUI();
    showToast(`Schedule reset to baseline.`);
    renderAll();
}

function openBottomSheet(period, targetTeacher) {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const list = document.getElementById('sheet-teacher-list');
    if(!sheet || !overlay || !list) return;

    list.innerHTML = `<p style="margin-bottom:15px; font-size:13px; color:var(--text-secondary);">Assigning substitute for ${period}</p>`;
    
    const available = [];
    const busy = [];
    
    teachers.forEach(t => {
        if (state.absentTeachers.has(t)) return;
        const currentTask = state.schedule[state.day]?.[period]?.[t];
        if (!currentTask || currentTask === 'Free') available.push(t);
        else busy.push({ name: t, task: currentTask });
    });
    
    available.forEach(t => {
        list.innerHTML += `<div style="padding:15px; margin-bottom:8px; background:var(--surface-color); border-radius:8px; border:1px solid var(--accent-blue); font-weight:bold; cursor:pointer;" 
                            onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${t}')">🟢 ${t} (Free)</div>`;
    });
    
    busy.forEach(t => {
        list.innerHTML += `<div style="padding:15px; margin-bottom:8px; background:var(--bg-color); border:1px solid var(--border-color); border-radius:8px; color:var(--text-secondary); cursor:pointer;" 
                            onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${t.name}')">🟡 ${t.name} (Currently in ${t.task})</div>`;
    });

    sheet.classList.remove('hidden');
    overlay.classList.remove('hidden');
    sheet.classList.add('open');
    overlay.classList.add('active');
    sheet.style.transform = 'translateY(0)'; 
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if(sheet) {
        sheet.classList.remove('open');
        sheet.style.transform = '';
    }
    if(overlay) {
        overlay.classList.remove('active');
    }
}
window.openBottomSheet = openBottomSheet;
window.closeBottomSheet = closeBottomSheet;

function clearRedoStacks() {
    state.actionHistory.redoGrid = [];
    state.actionHistory.redoSubs = [];
}

function assignSubstitute(period, absentTeacher, subTeacher, targetPeriod = period) {
    closeBottomSheet();
    clearRedoStacks();
    
    if (!state.substitutions[state.day]) state.substitutions[state.day] = {};
    if (!state.substitutions[state.day][period]) state.substitutions[state.day][period] = {};
    
    const previousSub = state.substitutions[state.day][period][absentTeacher];
    const previousTaskForSub = state.schedule[state.day][targetPeriod][subTeacher];
    const taskToCover = state.baseSchedule[state.day][period][absentTeacher];
    
    let newlyDisplaced = null;
    // If target substitute teacher already has a class in targetPeriod, displace it to Limbo
    if (previousTaskForSub && previousTaskForSub !== 'Free' && subTeacher !== previousSub) {
        newlyDisplaced = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            task: previousTaskForSub,
            ogTeacher: subTeacher,
            period: targetPeriod
        };
        state.displaced[state.day].push(newlyDisplaced);
        newlyDisplacedItemId = newlyDisplaced.id;
    }
    
    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const subAction = { 
        id: actionId,
        type: 'sub',
        period, 
        targetPeriod,
        absentTeacher, 
        subTeacher, 
        previousSub, 
        previousTaskForSub, 
        taskToCover, 
        newlyDisplaced,
        day: state.day 
    };
    
    // Register in both history stacks for seamless dual-tab undo
    state.actionHistory.grid.push(subAction);
    state.actionHistory.subs.push(subAction);
    
    if (previousSub && previousSub !== subTeacher) {
        state.schedule[state.day][period][previousSub] = 'Free'; 
    }

    state.schedule[state.day][targetPeriod][subTeacher] = taskToCover;
    state.schedule[state.day][period][absentTeacher] = 'Free'; 
    state.substitutions[state.day][period][absentTeacher] = subTeacher;
    
    lastDroppedCell = { period: targetPeriod, teacher: subTeacher };
    setTimeout(() => {
        lastDroppedCell = null;
        newlyDisplacedItemId = null;
    }, 600);
    
    saveStateToStorage();
    updateUndoUI();
    const periodLabel = targetPeriod === period ? `(${period})` : `(${targetPeriod} for ${period})`;
    showToast(`Assigned ${subTeacher} to cover for ${absentTeacher} ${periodLabel}`);
    renderAll();
}
window.assignSubstitute = assignSubstitute;

function unassignSubstitute(period, absentTeacher) {
    clearRedoStacks();
    const currentSub = state.substitutions[state.day]?.[period]?.[absentTeacher];
    if (!currentSub) return;
    
    const taskToCover = state.baseSchedule[state.day]?.[period]?.[absentTeacher] || 'Free';
    
    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const unassignAction = {
        id: actionId,
        type: 'unassign-sub',
        period,
        absentTeacher,
        previousSub: currentSub,
        taskToCover,
        day: state.day
    };
    
    state.actionHistory.grid.push(unassignAction);
    state.actionHistory.subs.push(unassignAction);
    
    state.schedule[state.day][period][currentSub] = 'Free';
    state.schedule[state.day][period][absentTeacher] = taskToCover;
    delete state.substitutions[state.day][period][absentTeacher];
    
    saveStateToStorage();
    updateUndoUI();
    showToast(`Unassigned substitute for ${absentTeacher} (${period})`);
    renderAll();
}
window.unassignSubstitute = unassignSubstitute;

// --- AUTO-RESOLVE ENGINE ---
function performAutoResolve() {
    clearRedoStacks();
    const batchActions = [];
    let conflictsResolved = 0;
    let conflictsRemaining = 0;
    
    periods.forEach(period => {
        const needsSub = [];
        teachers.forEach(t => {
            const isAbsent = state.absentTeachers.has(t);
            const baseTask = state.baseSchedule[state.day]?.[period]?.[t];
            const currentSub = state.substitutions[state.day]?.[period]?.[t];
            
            if (isAbsent && baseTask && baseTask !== 'Free' && !currentSub) {
                needsSub.push({ absentTeacher: t, task: baseTask });
            }
        });
        
        if (needsSub.length === 0) return;
        
        const available = [];
        teachers.forEach(t => {
            if (!state.absentTeachers.has(t)) {
                const task = state.schedule[state.day]?.[period]?.[t];
                if (!task || task === 'Free') {
                    available.push(t);
                }
            }
        });
        
        needsSub.forEach(need => {
            if (available.length > 0) {
                const subTeacher = available.shift();
                const previousTaskForSub = state.schedule[state.day][period][subTeacher];
                
                batchActions.push({
                    period,
                    absentTeacher: need.absentTeacher,
                    subTeacher,
                    previousTaskForSub,
                    taskToCover: need.task,
                    day: state.day
                });
                
                state.schedule[state.day][period][subTeacher] = need.task;
                state.schedule[state.day][period][need.absentTeacher] = 'Free';
                
                if (!state.substitutions[state.day]) state.substitutions[state.day] = {};
                if (!state.substitutions[state.day][period]) state.substitutions[state.day][period] = {};
                state.substitutions[state.day][period][need.absentTeacher] = subTeacher;
                
                conflictsResolved++;
            } else {
                conflictsRemaining++;
            }
        });
    });
    
    if (batchActions.length > 0) {
        const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        const batchAction = {
            id: actionId,
            type: 'batch-sub',
            actions: batchActions
        };
        state.actionHistory.subs.push(batchAction);
        state.actionHistory.grid.push(batchAction);
        saveStateToStorage();
        updateUndoUI();
        
        if (conflictsRemaining > 0) {
            showToast(`Auto-resolved ${conflictsResolved}. ${conflictsRemaining} remaining.`);
        } else {
            showToast(`Auto-resolved all ${conflictsResolved} conflicts.`);
        }
        renderAll();
    } else {
        showToast("No free teachers available to resolve conflicts.");
    }
}

// --- DUAL-STACK UNDO & REDO ENGINE ---
function getActiveHistoryStack() {
    const activeTab = document.querySelector('.tab-section.active');
    if (activeTab && activeTab.id === 'tab-substitutions') {
        return state.actionHistory.subs; 
    }
    return state.actionHistory.grid; 
}

function getActiveRedoStack() {
    const activeTab = document.querySelector('.tab-section.active');
    if (activeTab && activeTab.id === 'tab-substitutions') {
        return state.actionHistory.redoSubs; 
    }
    return state.actionHistory.redoGrid; 
}

function updateUndoUI() {
    const undoBtn = document.getElementById('header-undo-btn');
    const redoBtn = document.getElementById('header-redo-btn');
    
    const activeUndo = getActiveHistoryStack();
    const activeRedo = getActiveRedoStack();
    
    if (undoBtn) {
        if (activeUndo.length > 0) {
            undoBtn.classList.add('visible');
            undoBtn.textContent = `↩ Undo (${activeUndo.length})`;
        } else {
            undoBtn.classList.remove('visible');
        }
    }

    if (redoBtn) {
        if (activeRedo.length > 0) {
            redoBtn.classList.add('visible');
            redoBtn.textContent = `↪ Redo (${activeRedo.length})`;
        } else {
            redoBtn.classList.remove('visible');
        }
    }
}

function undoLastAction() {
    const activeStack = getActiveHistoryStack();
    if (activeStack.length === 0) return;

    const action = activeStack.pop();

    // Synchronize across both history stacks if action has a shared ID
    if (action.id) {
        const otherStack = (activeStack === state.actionHistory.grid) ? state.actionHistory.subs : state.actionHistory.grid;
        const idx = otherStack.findIndex(a => a.id === action.id);
        if (idx !== -1) otherStack.splice(idx, 1);
        state.actionHistory.redoGrid.push(action);
        state.actionHistory.redoSubs.push(action);
    } else {
        getActiveRedoStack().push(action);
    }

    if (action.type === 'move') {
        const { day, source, target, sTask, tTask, newlyDisplaced } = action;
        
        state.schedule[day][target.period][target.teacher] = tTask;

        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = sTask;
        } else if (source.type === 'displaced') {
            state.displaced[day].push(source.item);
        }

        if (newlyDisplaced) {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== newlyDisplaced.id);
        }

    } else if (action.type === 'reset') {
        state.schedule[action.day] = action.prevSchedule;
        state.displaced[action.day] = action.prevDisplaced;
        if (!state.substitutions[action.day]) state.substitutions[action.day] = {};
        state.substitutions[action.day] = action.prevSubs;

    } else if (action.type === 'sub') {
        const { period, targetPeriod = period, absentTeacher, subTeacher, previousSub, previousTaskForSub, taskToCover, day, newlyDisplaced } = action;
        state.schedule[day][targetPeriod][subTeacher] = previousTaskForSub || 'Free';
        
        if (newlyDisplaced) {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== newlyDisplaced.id);
        }

        if (previousSub) {
            state.substitutions[day][period][absentTeacher] = previousSub;
            state.schedule[day][period][previousSub] = taskToCover;
        } else {
            if (state.substitutions[day] && state.substitutions[day][period]) {
                delete state.substitutions[day][period][absentTeacher];
            }
            state.schedule[day][period][absentTeacher] = taskToCover;
        }

    } else if (action.type === 'unassign-sub') {
        const { period, absentTeacher, previousSub, taskToCover, day } = action;
        if (!state.substitutions[day]) state.substitutions[day] = {};
        if (!state.substitutions[day][period]) state.substitutions[day][period] = {};
        state.substitutions[day][period][absentTeacher] = previousSub;
        state.schedule[day][period][previousSub] = taskToCover;
        state.schedule[day][period][absentTeacher] = 'Free';

    } else if (action.type === 'batch-sub') {
        [...action.actions].reverse().forEach(sub => {
            state.schedule[sub.day][sub.period][sub.subTeacher] = sub.previousTaskForSub || 'Free';
            state.schedule[sub.day][sub.period][sub.absentTeacher] = sub.taskToCover;
            if(state.substitutions[sub.day] && state.substitutions[sub.day][sub.period]) {
                delete state.substitutions[sub.day][sub.period][sub.absentTeacher];
            }
        });
    }
    
    saveStateToStorage();
    updateUndoUI();
    const toast = document.getElementById('undo-toast');
    if(toast) toast.classList.add('hidden');
    showToast("Action undone.");
    renderAll();
}

function redoLastAction() {
    const activeRedo = getActiveRedoStack();
    if (activeRedo.length === 0) return;

    const action = activeRedo.pop();

    if (action.id) {
        const otherRedo = (activeRedo === state.actionHistory.redoGrid) ? state.actionHistory.redoSubs : state.actionHistory.redoGrid;
        const idx = otherRedo.findIndex(a => a.id === action.id);
        if (idx !== -1) otherRedo.splice(idx, 1);
    }

    if (action.type === 'move') {
        const { day, source, target, sTask, tTask, newlyDisplaced } = action;
        state.schedule[day][target.period][target.teacher] = sTask;
        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = 'Free';
        } else if (source.type === 'displaced') {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== source.item.id);
        }
        if (newlyDisplaced) {
            state.displaced[day].push(newlyDisplaced);
        }
        state.actionHistory.grid.push(action);

    } else if (action.type === 'sub') {
        const { period, targetPeriod = period, absentTeacher, subTeacher, previousSub, taskToCover, day, newlyDisplaced } = action;
        if (!state.substitutions[day]) state.substitutions[day] = {};
        if (!state.substitutions[day][period]) state.substitutions[day][period] = {};

        if (previousSub && previousSub !== subTeacher) {
            state.schedule[day][period][previousSub] = 'Free';
        }
        if (newlyDisplaced) {
            state.displaced[day].push(newlyDisplaced);
        }
        state.schedule[day][targetPeriod][subTeacher] = taskToCover;
        state.schedule[day][period][absentTeacher] = 'Free';
        state.substitutions[day][period][absentTeacher] = subTeacher;

        state.actionHistory.grid.push(action);
        state.actionHistory.subs.push(action);

    } else if (action.type === 'unassign-sub') {
        const { period, absentTeacher, previousSub, taskToCover, day } = action;
        state.schedule[day][period][previousSub] = 'Free';
        state.schedule[day][period][absentTeacher] = taskToCover;
        if (state.substitutions[day] && state.substitutions[day][period]) {
            delete state.substitutions[day][period][absentTeacher];
        }
        state.actionHistory.grid.push(action);
        state.actionHistory.subs.push(action);

    } else if (action.type === 'reset') {
        state.schedule[action.day] = JSON.parse(JSON.stringify(state.baseSchedule[action.day]));
        state.displaced[action.day] = [];
        state.substitutions[action.day] = {};
        getActiveHistoryStack().push(action);

    } else if (action.type === 'batch-sub') {
        action.actions.forEach(sub => {
            state.schedule[sub.day][sub.period][sub.subTeacher] = sub.taskToCover;
            state.schedule[sub.day][sub.period][sub.absentTeacher] = 'Free';
            if (!state.substitutions[sub.day]) state.substitutions[sub.day] = {};
            if (!state.substitutions[sub.day][sub.period]) state.substitutions[sub.day][sub.period] = {};
            state.substitutions[sub.day][sub.period][sub.absentTeacher] = sub.subTeacher;
        });
        state.actionHistory.grid.push(action);
        state.actionHistory.subs.push(action);
    }

    saveStateToStorage();
    updateUndoUI();
    showToast("Action redone.");
    renderAll();
}
window.redoLastAction = redoLastAction;

function handleGlobalKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
            if (e.shiftKey) {
                e.preventDefault();
                redoLastAction();
            } else {
                e.preventDefault();
                undoLastAction();
            }
        } else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            redoLastAction();
        }
    }
}

// --- SETTINGS MODAL ---
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('settings-overlay');
    const toggle = document.getElementById('same-period-lock-toggle');
    if (toggle) {
        toggle.checked = state.settings.samePeriodLock !== false;
    }
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('settings-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;

function showToast(message) {
    const toast = document.getElementById('undo-toast');
    const msgElement = document.getElementById('toast-message');
    if(!toast || !msgElement) return;
    
    msgElement.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 5000);
}

// --- MOCK DATA GENERATOR ---
function generateSimulatedData() {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const subjects = ['MATH KGA', 'ENG KGB', 'EVS PREPA', 'SING KGA', 'GAMES PREP'];
    
    days.forEach(d => {
        state.schedule[d] = {};
        periods.forEach(p => {
            state.schedule[d][p] = {};
            teachers.forEach(t => {
                if (p !== 'BREAKFAST BREAK' && p !== 'BREAKFAST' && Math.random() > 0.3) {
                    state.schedule[d][p][t] = subjects[Math.floor(Math.random() * subjects.length)];
                } else {
                    state.schedule[d][p][t] = 'Free';
                }
            });
        });
    });

    state.baseSchedule = JSON.parse(JSON.stringify(state.schedule));
    state.substitutions = {};
    state.displaced = { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
}