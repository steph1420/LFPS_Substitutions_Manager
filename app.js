// --- STATE MANAGEMENT ---
const state = {
    day: 'MON',
    isEditMode: false,
    absentTeachers: new Set(),
    schedule: {},
    lastAction: null,
};

let selectedCell = null; // Used for Tap-to-Move logic on mobile
let draggedCell = null; // Used for HTML5 Drag-and-Drop on desktop

const teachers = [
    'Mr. Stephen', 'Mrs. Midha', 'Mrs. Pahwa', 'Mrs. Bage', 'Mr. Adams', 
    'Mrs. Baker', 'Ms. Clark', 'Mr. Davis', 'Mrs. Evans'
];
const periods = ['GOLDEN HOUR', '1st Pd.', 'BREAKFAST', '2nd Pd.', '3rd Pd.', '4th Pd.', '5th Pd.', 'PLAY TIME', '6th Pd.', '7th Pd.'];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    generateSimulatedData(); 
    bindEvents();
    renderAll();
});

function bindEvents() {
    // Bottom Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(t => t.classList.remove('active'));
            
            const target = e.currentTarget;
            target.classList.add('active');
            document.getElementById(target.dataset.target).classList.add('active');
        });
    });

    // Day Selector
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.day = e.currentTarget.dataset.day;
            selectedCell = null; // Clear selection on day change
            renderAll();
        });
    });

    // Edit Toggle
    const editBtn = document.getElementById('edit-toggle-btn');
    editBtn.addEventListener('click', () => {
        state.isEditMode = !state.isEditMode;
        editBtn.textContent = state.isEditMode ? 'Save Schedule' : 'Edit Schedule';
        editBtn.classList.toggle('save-mode', state.isEditMode);
        selectedCell = null; // Clear selections when exiting edit mode
        renderAll(); 
    });

    // Buttons & Toggles
    document.getElementById('hide-absent-toggle').addEventListener('change', renderAll);
    document.getElementById('sheet-overlay').addEventListener('click', closeBottomSheet);
    document.getElementById('undo-btn').addEventListener('click', undoLastAction);

    // Desktop HTML5 Drag & Drop Listeners for the Grid
    const table = document.getElementById('routine-table');
    
    table.addEventListener('dragstart', (e) => {
        if (!state.isEditMode) return e.preventDefault();
        draggedCell = e.target.closest('td');
        if (!draggedCell || !draggedCell.dataset.period) return e.preventDefault();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); 
    });

    table.addEventListener('dragover', (e) => {
        if (!state.isEditMode) return;
        e.preventDefault(); 
        const targetCell = e.target.closest('td');
        if (targetCell && targetCell !== draggedCell && targetCell.dataset.period) {
            targetCell.classList.add('drag-over');
        }
    });

    table.addEventListener('dragleave', (e) => {
        const targetCell = e.target.closest('td');
        if (targetCell) targetCell.classList.remove('drag-over');
    });

    table.addEventListener('drop', (e) => {
        e.preventDefault();
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

    // Back Button Intercept
    window.addEventListener('popstate', (event) => {
        const sheet = document.getElementById('bottom-sheet');
        if (sheet.classList.contains('open')) {
            sheet.classList.remove('open');
            document.getElementById('sheet-overlay').classList.remove('active');
            return;
        }
        
        const activeTab = document.querySelector('.tab-section.active').id;
        if (activeTab !== 'tab-dashboard') {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-target="tab-dashboard"]').classList.add('active');
            document.getElementById('tab-dashboard').classList.add('active');
            return;
        }
    });
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    renderAbsentTray();
    renderTableRoutine(); 
    renderCardRoutine();  
    renderResolver();
}

function renderAbsentTray() {
    const tray = document.getElementById('teacher-roster');
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
            renderAll();
        });
        tray.appendChild(el);
    });
}

function renderTableRoutine() {
    const table = document.getElementById('routine-table');
    const hideAbsent = document.getElementById('hide-absent-toggle').checked;
    
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

            // Highlight selected cell for Tap-to-Move
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
    grid.innerHTML = '';
    const hideAbsent = document.getElementById('hide-absent-toggle').checked;

    periods.forEach(period => {
        if (period === 'BREAKFAST' || period === 'PLAY TIME') {
            grid.innerHTML += `<div style="text-align:center; padding:10px; color:#8e8e93; font-size:12px; letter-spacing:1px;">--- ${period} ---</div>`;
            return;
        }

        const card = document.createElement('div');
        card.className = 'period-card';
        let assignmentsHtml = `<h4 style="margin-bottom:10px; color:var(--accent-blue);">${period}</h4>`;
        
        teachers.forEach(teacher => {
            const isAbsent = state.absentTeachers.has(teacher);
            if (isAbsent && hideAbsent) return; 
            
            const task = state.schedule[state.day][period][teacher] || 'Free';
            const isMissingSub = isAbsent && task !== 'Free';
            if (isMissingSub) card.classList.add('needs-action');

            assignmentsHtml += `
                <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0; ${isAbsent ? 'opacity:0.5; color:var(--accent-red);' : ''} ${isMissingSub ? 'background:#fff0f5;' : ''}"
                     ${state.isEditMode ? `onclick="openBottomSheet('${period}', '${teacher}')" style="cursor:pointer;"` : ''}>
                    <span>${teacher}</span>
                    <span style="font-weight:600;">${isMissingSub ? '⚠ Needs Sub' : task}</span>
                </div>
            `;
        });
        card.innerHTML = assignmentsHtml;
        grid.appendChild(card);
    });
}

function renderResolver() {
    const conflictList = document.getElementById('conflict-list');
    const badge = document.getElementById('resolver-badge');
    conflictList.innerHTML = '';
    let conflicts = 0;

    periods.forEach(period => {
        teachers.forEach(teacher => {
            const isAbsent = state.absentTeachers.has(teacher);
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

// Mobile Tap-to-Move Logic for Grid
function handleCellInteraction(period, teacher) {
    if (!state.isEditMode) return;

    if (!selectedCell) {
        // Select first cell
        selectedCell = { period, teacher };
        renderAll();
    } else if (selectedCell.period === period && selectedCell.teacher === teacher) {
        // Deselect if same cell tapped twice
        selectedCell = null;
        renderAll();
    } else {
        // Move to second tapped cell (Copy & Overwrite)
        executeMove(selectedCell, { period, teacher });
        selectedCell = null;
    }
}

// Universal Copy & Overwrite Execution
function executeMove(source, target) {
    const sTask = state.schedule[state.day][source.period][source.teacher];
    const tTask = state.schedule[state.day][target.period][target.teacher]; // Keep for undo logic

    state.lastAction = {
        type: 'move',
        day: state.day,
        source, target, sTask, tTask
    };

    // Apply the overwrite logic
    state.schedule[state.day][target.period][target.teacher] = sTask; // Overwrite target
    state.schedule[state.day][source.period][source.teacher] = 'Free'; // Clear source

    showToast(`Moved assignment.`);
    renderAll();
}

// Bottom Sheet Picker (Used in Tabs 2 and 3)
function openBottomSheet(period, targetTeacher) {
    if (!state.isEditMode && document.querySelector('.tab-section.active').id !== 'tab-resolver') return;
    
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const list = document.getElementById('sheet-teacher-list');
    
    list.innerHTML = `<p style="margin-bottom:15px; font-size:13px; color:gray;">Assigning substitute for ${period}</p>`;
    
    const available = [];
    const busy = [];
    
    teachers.forEach(t => {
        if (state.absentTeachers.has(t)) return;
        const currentTask = state.schedule[state.day][period][t];
        if (!currentTask || currentTask === 'Free') available.push(t);
        else busy.push({ name: t, task: currentTask });
    });
    
    available.forEach(t => {
        list.innerHTML += `<div style="padding:15px; margin-bottom:8px; background:var(--surface-color); border-radius:8px; border:1px solid var(--accent-blue); font-weight:bold; cursor:pointer;" 
                            onclick="assignSubstitute('${period}', '${targetTeacher}', '${t}')">🟢 ${t} (Free)</div>`;
    });
    
    busy.forEach(t => {
        list.innerHTML += `<div style="padding:15px; margin-bottom:8px; background:#f2f2f7; border-radius:8px; color:gray; cursor:pointer;" 
                            onclick="assignSubstitute('${period}', '${targetTeacher}', '${t.name}')">🟡 ${t.name} (Currently in ${t.task})</div>`;
    });

    sheet.classList.add('open');
    overlay.classList.add('active');
    history.pushState({ modal: 'bottom-sheet' }, '');
}

function closeBottomSheet() {
    document.getElementById('bottom-sheet').classList.remove('open');
    document.getElementById('sheet-overlay').classList.remove('active');
    
    if (history.state && history.state.modal === 'bottom-sheet') {
        history.back();
    }
}

function assignSubstitute(period, absentTeacher, subTeacher) {
    closeBottomSheet();
    
    const previousTaskForSub = state.schedule[state.day][period][subTeacher];
    const taskToCover = state.schedule[state.day][period][absentTeacher];
    
    state.lastAction = { 
        type: 'sub',
        period, absentTeacher, subTeacher, previousTaskForSub, taskToCover, day: state.day 
    };
    
    state.schedule[state.day][period][subTeacher] = taskToCover;
    state.schedule[state.day][period][absentTeacher] = 'Free'; 
    
    showToast(`Assigned ${subTeacher} to ${period}`);
    renderAll();
}

// Unified Undo Engine
function undoLastAction() {
    if (!state.lastAction) return;

    if (state.lastAction.type === 'move') {
        const { day, source, target, sTask, tTask } = state.lastAction;
        // Restore target's original overwritten task
        state.schedule[day][target.period][target.teacher] = tTask;
        // Restore source's moved task
        state.schedule[day][source.period][source.teacher] = sTask;
    } else if (state.lastAction.type === 'sub') {
        const { period, absentTeacher, subTeacher, previousTaskForSub, taskToCover, day } = state.lastAction;
        state.schedule[day][period][subTeacher] = previousTaskForSub || 'Free';
        state.schedule[day][period][absentTeacher] = taskToCover;
    }
    
    state.lastAction = null;
    document.getElementById('undo-toast').classList.add('hidden');
    renderAll();
}

function showToast(message) {
    const toast = document.getElementById('undo-toast');
    document.getElementById('toast-message').textContent = message;
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
}