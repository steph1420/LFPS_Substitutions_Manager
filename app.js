// --- STATE MANAGEMENT ---
const state = {
    day: 'MON',
    isEditMode: false,
    absentTeachers: new Set(),
    baseSchedule: {}, // The uncorrupted Master Reference
    schedule: {},     // The active working Grid
    actionHistory: {
        grid: [], // Drag/Drop overwrites on the Master Routine
        subs: []  // Manual/Auto substitutions on the Substitutions tab
    }
};

let selectedCell = null; 
let draggedCell = null; 
let scrollSpeed = 0;
let isScrolling = false;

const teachers = [
    'Mr. Stephen', 'Mrs. Midha', 'Mrs. Pahwa', 'Mrs. Bage', 'Mr. Adams', 
    'Mrs. Baker', 'Ms. Clark', 'Mr. Davis', 'Mrs. Evans'
];
const periods = ['GOLDEN HOUR', '1st Pd.', 'BREAKFAST', '2nd Pd.', '3rd Pd.', '4th Pd.', '5th Pd.', 'PLAY TIME', '6th Pd.', '7th Pd.'];

// --- INITIALIZATION & STORAGE ---
document.addEventListener('DOMContentLoaded', () => {
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
        absentTeachers: Array.from(state.absentTeachers), 
        actionHistory: state.actionHistory
    };
    localStorage.setItem('lfps_frontdesk_state', JSON.stringify(data));
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
            state.baseSchedule = parsed.baseSchedule || JSON.parse(JSON.stringify(parsed.schedule)); // Fallback if missing
            state.schedule = parsed.schedule;
            state.absentTeachers = new Set(parsed.absentTeachers || []);
            
            if (parsed.actionHistory && Array.isArray(parsed.actionHistory.grid)) {
                state.actionHistory = parsed.actionHistory;
            } else {
                state.actionHistory = { grid: [], subs: [] };
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

function safeBind(id, eventType, handler) {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventType, handler);
}

// Native Smooth Scrolling Engine for Desktop Dragging
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
            
            updateUndoUI(); // Switch undo stack context instantly
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
    safeBind('sheet-overlay', 'click', closeBottomSheet);
    safeBind('toast-undo-btn', 'click', undoLastAction);
    safeBind('header-undo-btn', 'click', undoLastAction);

    // Grid Drag & Drop
    const tableContainer = document.querySelector('.table-scroll-container');
    const table = document.getElementById('routine-table');
    
    if (table && tableContainer) {
        table.addEventListener('dragstart', (e) => {
            if (!state.isEditMode) return e.preventDefault();
            draggedCell = e.target.closest('td');
            if (!draggedCell || !draggedCell.dataset.period) return e.preventDefault();
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); 
            scrollSpeed = 0;
        });

        tableContainer.addEventListener('dragover', (e) => {
            if (!state.isEditMode) return;
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
            if (targetCell && targetCell !== draggedCell && targetCell.dataset.period) {
                targetCell.classList.add('drag-over');
            }
        });

        tableContainer.addEventListener('dragleave', (e) => {
            const targetCell = e.target.closest('td');
            if (targetCell) targetCell.classList.remove('drag-over');
            
            const rect = tableContainer.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                scrollSpeed = 0;
            }
        });

        tableContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            scrollSpeed = 0; 
            if (!state.isEditMode || !draggedCell) return;
            const targetCell = e.target.closest('td');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            
            if (targetCell && targetCell !== draggedCell && targetCell.dataset.period) {
                executeMove(
                    { period: draggedCell.dataset.period, teacher: draggedCell.dataset.teacher },
                    { period: targetCell.dataset.period, teacher: targetCell.dataset.teacher }
                );
            }
            draggedCell = null;
        });

        table.addEventListener('dragend', () => {
            scrollSpeed = 0;
            draggedCell = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
    }
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    renderAbsentTray();
    renderTableRoutine(); 
    renderCardRoutine();  
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
    
    let html = '<thead><tr><th>Teacher Name</th>';
    periods.forEach(p => html += `<th>${p}</th>`);
    html += '</tr></thead><tbody>';
    
    teachers.forEach(teacher => {
        const isAbsent = state.absentTeachers.has(teacher);
        if (isAbsent && hideAbsent) return;
        
        html += `<tr class="${isAbsent ? 'row-absent' : ''}">`;
        html += `<td>${teacher}</td>`;
        
        periods.forEach(period => {
            if (period === 'BREAKFAST' || period === 'PLAY TIME') {
                html += `<td style="background:#f9f9f9; text-align:center;">-</td>`;
                return;
            }
            
            // Render from active working schedule
            const task = state.schedule[state.day]?.[period]?.[teacher] || 'Free';
            const isMissingSub = isAbsent && task !== 'Free' && task !== '';
            
            let cellClasses = [];
            let cellText = task === 'Free' ? '' : task;
            
            if (isMissingSub) {
                cellClasses.push('cell-missing');
                cellText = '⚠ ' + task;
            } else if (task !== 'Free') {
                cellClasses.push('cell-assigned');
            }

            if (selectedCell && selectedCell.period === period && selectedCell.teacher === teacher) {
                cellClasses.push('cell-selected');
            }
            
            let clickHandler = state.isEditMode ? `onclick="handleCellInteraction('${period}', '${teacher}')"` : '';
            let dragAttrs = state.isEditMode ? `draggable="true" data-period="${period}" data-teacher="${teacher}"` : '';
            
            html += `<td class="${cellClasses.join(' ')}" style="cursor:pointer;" ${clickHandler} ${dragAttrs}>${cellText}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
}

function renderCardRoutine() {
    const grid = document.getElementById('timeline-grid');
    if(!grid) return;
    grid.innerHTML = '<p style="color:gray; font-size:14px;">Card layout functioning.</p>';
}

function renderSubstitutions() {
    const conflictList = document.getElementById('conflict-list');
    const badge = document.getElementById('substitutions-badge');
    if(!conflictList || !badge) return;
    
    // For now, retaining basic render logic until we build the full Persistent Pink/Green Dashboard
    conflictList.innerHTML = '';
    let conflicts = 0;

    periods.forEach(period => {
        teachers.forEach(teacher => {
            const isAbsent = state.absentTeachers.has(teacher);
            // Referencing active grid to see if it's missing (Next update will map to baseSchedule)
            const task = state.schedule[state.day]?.[period]?.[teacher];
            
            if (isAbsent && task && task !== 'Free') {
                conflicts++;
                conflictList.innerHTML += `
                    <div class="period-card needs-action" style="margin-bottom:15px; cursor:pointer;" onclick="openBottomSheet('${period}', '${teacher}')">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--accent-pink);">${period} - ${task}</strong>
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
}

// --- INTERACTION MECHANICS ---
function handleCellInteraction(period, teacher) {
    if (!state.isEditMode) return;
    if (!selectedCell) {
        selectedCell = { period, teacher };
        renderAll();
    } else if (selectedCell.period === period && selectedCell.teacher === teacher) {
        selectedCell = null;
        renderAll();
    } else {
        executeMove(selectedCell, { period, teacher });
        selectedCell = null;
    }
}

// STRICT COPY & OVERWRITE
function executeMove(source, target) {
    const sTask = state.schedule[state.day][source.period][source.teacher];
    const tTask = state.schedule[state.day][target.period][target.teacher]; 

    state.actionHistory.grid.push({
        type: 'move',
        day: state.day,
        source, target, sTask, tTask
    });

    // Overwrite the target slot with the moving class
    state.schedule[state.day][target.period][target.teacher] = sTask; 
    // Leave the original slot completely free
    state.schedule[state.day][source.period][source.teacher] = 'Free'; 

    saveStateToStorage();
    updateUndoUI();
    showToast(`Moved assignment.`);
    renderAll();
}

function openBottomSheet(period, targetTeacher) {
    if (!state.isEditMode && document.querySelector('.tab-section.active').id !== 'tab-substitutions') return;
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if(!sheet || !overlay) return;
    sheet.classList.add('open');
    overlay.classList.add('active');
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if(sheet) sheet.classList.remove('open');
    if(overlay) overlay.classList.remove('active');
}

// --- DUAL-STACK UNDO ENGINE ---
function getActiveHistoryStack() {
    const activeTab = document.querySelector('.tab-section.active');
    if (activeTab && activeTab.id === 'tab-substitutions') {
        return state.actionHistory.subs; // Return Substitutions memory
    }
    return state.actionHistory.grid; // Default to Grid memory
}

function updateUndoUI() {
    const headerBtn = document.getElementById('header-undo-btn');
    if(!headerBtn) return;
    
    const activeStack = getActiveHistoryStack();
    
    if (activeStack.length > 0) {
        headerBtn.classList.add('visible');
        headerBtn.textContent = `↩ Undo (${activeStack.length})`;
    } else {
        headerBtn.classList.remove('visible');
    }
}

function undoLastAction() {
    const activeStack = getActiveHistoryStack();
    if (activeStack.length === 0) return;

    const action = activeStack.pop();

    if (action.type === 'move') {
        const { day, source, target, sTask, tTask } = action;
        state.schedule[day][target.period][target.teacher] = tTask;
        state.schedule[day][source.period][source.teacher] = sTask;
    } 
    // (Sub/Batch-sub reversal logic will go here when we build phase 2)
    
    saveStateToStorage();
    updateUndoUI();
    const toast = document.getElementById('undo-toast');
    if(toast) toast.classList.add('hidden');
    renderAll();
}

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
                if (p !== 'BREAKFAST' && p !== 'PLAY TIME' && Math.random() > 0.3) {
                    state.schedule[d][p][t] = subjects[Math.floor(Math.random() * subjects.length)];
                } else {
                    state.schedule[d][p][t] = 'Free';
                }
            });
        });
    });

    // Deep clone the schedule into the Base Reference so we always know original owners
    state.baseSchedule = JSON.parse(JSON.stringify(state.schedule));
}
