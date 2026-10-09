// --- STATE MANAGEMENT ---
const state = {
    day: 'MON',
    isEditMode: false,
    absentTeachers: new Set(),
    schedule: {},
    actionHistory: {
        grid: [], 
        subs: []  
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
            state.schedule = parsed.schedule;
            state.absentTeachers = new Set(parsed.absentTeachers || []);
            
            if (Array.isArray(parsed.actionHistory)) {
                state.actionHistory = { grid: [], subs: [] };
            } else {
                state.actionHistory = parsed.actionHistory || { grid: [], subs: [] };
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
    safeBind('sheet-overlay', 'click', closeBottomSheet);
    safeBind('toast-undo-btn', 'click', undoLastAction);
    safeBind('header-undo-btn', 'click', undoLastAction);
    safeBind('auto-resolve-btn', 'click', performAutoResolve);

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

    window.addEventListener('popstate', (event) => {
        const sheet = document.getElementById('bottom-sheet');
        if (sheet && sheet.classList.contains('open')) {
            sheet.classList.remove('open');
            document.getElementById('sheet-overlay').classList.remove('active');
            return;
        }
        const activeTab = document.querySelector('.tab-section.active');
        if (activeTab && activeTab.id !== 'tab-dashboard') {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-target="tab-dashboard"]').classList.add('active');
            document.getElementById('tab-dashboard').classList.add('active');
            updateUndoUI();
            return;
        }
    });
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
    const hideToggle = document.getElementById('hide-absent-toggle');
    if(!grid || !hideToggle) return;
    
    grid.innerHTML = '';
    const hideAbsent = hideToggle.checked;

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

function renderSubstitutions() {
    const container = document.getElementById('substitutions-dashboard-content');
    const badge = document.getElementById('substitutions-badge');
    const autoBtn = document.getElementById('auto-resolve-btn');
    if(!container || !badge) return;
    
    container.innerHTML = '';
    let pendingConflicts = 0;
    let totalCoverages = 0;

    periods.forEach(period => {
        if (period === 'BREAKFAST' || period === 'PLAY TIME') return;

        teachers.forEach(teacher => {
            const isAbsent = state.absentTeachers.has(teacher);
            const task = state.schedule[state.day]?.[period]?.[teacher];
            
            // Case 1: Absent teacher with unassigned class (Needs coverage)
            if (isAbsent && task && task !== 'Free') {
                pendingConflicts++;
                totalCoverages++;
                container.innerHTML += `
                    <div class="sub-card pending" onclick="openBottomSheet('${period}', '${teacher}')" style="cursor:pointer;">
                        <div>
                            <div style="font-size:12px; color:var(--accent-pink); font-weight:700; text-transform:uppercase; margin-bottom:2px;">${period} • ⚠ Unassigned Absence</div>
                            <div style="font-size:16px; font-weight:600;">${teacher} (${task})</div>
                        </div>
                        <div style="font-size:13px; color:var(--accent-blue); font-weight:600;">Assign Sub →</div>
                    </div>
                `;
            } 
            // Case 2: Show active teaching assignments / substitutions for present or covered teachers
            else if (task && task !== 'Free') {
                totalCoverages++;
                const statusBadge = isAbsent ? '<span style="color:var(--accent-red); font-size:11px;">(Absent - Covered)</span>' : '';
                container.innerHTML += `
                    <div class="sub-card normal" onclick="openBottomSheet('${period}', '${teacher}')" style="cursor:pointer;">
                        <div>
                            <div style="font-size:12px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; margin-bottom:2px;">${period} • Active Assignment</div>
                            <div style="font-size:15px; font-weight:600;">${teacher} → ${task} ${statusBadge}</div>
                        </div>
                        <div style="font-size:13px; color:var(--accent-blue); font-weight:600;">Reassign →</div>
                    </div>
                `;
            }
        });
    });

    if (totalCoverages === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-secondary);">
                <div style="font-size:32px; margin-bottom:10px;">📅</div>
                <h3 style="font-size:16px; font-weight:600; margin-bottom:5px;">No Schedule Data</h3>
                <p style="font-size:13px;">No classes are currently scheduled for ${state.day}.</p>
            </div>
        `;
    }

    badge.textContent = pendingConflicts;
    badge.className = `badge ${pendingConflicts > 0 ? 'visible' : 'hidden'}`;
    badge.style.cssText = pendingConflicts > 0 ? "background:var(--accent-red); color:white; padding:2px 6px; border-radius:10px; font-size:10px; position:absolute; top:-5px; right:15px;" : "display:none;";
    
    if (autoBtn) {
        if (pendingConflicts > 0) {
            autoBtn.classList.remove('hidden');
        } else {
            autoBtn.classList.add('hidden');
        }
    }
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

function executeMove(source, target) {
    const sTask = state.schedule[state.day][source.period][source.teacher];
    const tTask = state.schedule[state.day][target.period][target.teacher]; 

    state.actionHistory.grid.push({
        type: 'move',
        day: state.day,
        source, target, sTask, tTask
    });

    state.schedule[state.day][target.period][target.teacher] = sTask; 
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
    
    state.actionHistory.subs.push({ 
        type: 'sub',
        period, absentTeacher, subTeacher, previousTaskForSub, taskToCover, day: state.day 
    });
    
    state.schedule[state.day][period][subTeacher] = taskToCover;
    state.schedule[state.day][period][absentTeacher] = 'Free'; 
    
    saveStateToStorage();
    updateUndoUI();
    showToast(`Assigned ${subTeacher} to ${period}`);
    renderAll();
}

// --- AUTO-RESOLVE ENGINE ---
function performAutoResolve() {
    const batchActions = [];
    let conflictsResolved = 0;
    let conflictsRemaining = 0;
    
    periods.forEach(period => {
        const needsSub = [];
        teachers.forEach(t => {
            const isAbsent = state.absentTeachers.has(t);
            const task = state.schedule[state.day]?.[period]?.[t];
            if (isAbsent && task && task !== 'Free') {
                needsSub.push({ absentTeacher: t, task });
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
                conflictsResolved++;
            } else {
                conflictsRemaining++;
            }
        });
    });
    
    if (batchActions.length > 0) {
        state.actionHistory.subs.push({
            type: 'batch-sub',
            actions: batchActions
        });
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

// --- DUAL-STACK HISTORY ENGINE ---
function getActiveHistoryStack() {
    const activeTab = document.querySelector('.tab-section.active');
    if (activeTab && activeTab.id === 'tab-substitutions') {
        return state.actionHistory.subs;
    }
    return state.actionHistory.grid;
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
    } else if (action.type === 'sub') {
        const { period, absentTeacher, subTeacher, previousTaskForSub, taskToCover, day } = action;
        state.schedule[day][period][subTeacher] = previousTaskForSub || 'Free';
        state.schedule[day][period][absentTeacher] = taskToCover;
    } else if (action.type === 'batch-sub') {
        [...action.actions].reverse().forEach(sub => {
            state.schedule[sub.day][sub.period][sub.subTeacher] = sub.previousTaskForSub || 'Free';
            state.schedule[sub.day][sub.period][sub.absentTeacher] = sub.taskToCover;
        });
    }
    
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
}