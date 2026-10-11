// --- STATE MANAGEMENT ---
const state = {
    day: 'MON',
    isEditMode: false,
    absentTeachers: new Set(),
    baseSchedule: {}, 
    schedule: {},     
    substitutions: {}, 
    displaced: { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] },
    actionHistory: {
        grid: [], 
        subs: []  
    }
};

let selectedCell = null; 
let draggedData = null;  
let scrollSpeed = 0;
let isScrolling = false;
let lastDroppedCell = null; 

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
        substitutions: state.substitutions,
        displaced: state.displaced,
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
            state.baseSchedule = parsed.baseSchedule || JSON.parse(JSON.stringify(parsed.schedule)); 
            state.schedule = parsed.schedule;
            state.substitutions = parsed.substitutions || {};
            state.displaced = parsed.displaced || { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
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
            const td = e.target.closest('td');
            if (!td || !td.dataset.period) return e.preventDefault();
            
            draggedData = { type: 'grid', period: td.dataset.period, teacher: td.dataset.teacher };
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
            if (targetCell && targetCell.dataset.period) {
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
            if (!state.isEditMode || !draggedData) return;
            
            const targetCell = e.target.closest('td');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            
            if (targetCell && targetCell.dataset.period) {
                if (draggedData.type === 'grid' && draggedData.period === targetCell.dataset.period && draggedData.teacher === targetCell.dataset.teacher) {
                    draggedData = null;
                    return;
                }
                executeMove(draggedData, { period: targetCell.dataset.period, teacher: targetCell.dataset.teacher });
            }
            draggedData = null;
        });

        table.addEventListener('dragend', () => {
            scrollSpeed = 0;
            draggedData = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
    }
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    renderAbsentTray();
    renderTableRoutine(); 
    renderDisplacedTray();
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
            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
            const isMissingSub = isAbsent && baseTask && baseTask !== 'Free' && !state.substitutions[state.day]?.[period]?.[teacher];
            
            let cellClasses = [];
            let cellText = task === 'Free' ? '' : task;
            
            if (isMissingSub) {
                cellClasses.push('cell-missing');
                cellText = '⚠ ' + baseTask; 
            } else if (task !== 'Free') {
                cellClasses.push('cell-assigned');
            }

            if (selectedCell && selectedCell.type === 'grid' && selectedCell.period === period && selectedCell.teacher === teacher) {
                cellClasses.push('cell-selected');
            }

            if (lastDroppedCell && lastDroppedCell.period === period && lastDroppedCell.teacher === teacher) {
                cellClasses.push('cell-just-dropped');
            }
            
            let clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';
            let dragAttrs = state.isEditMode ? `draggable="true" data-period="${period}" data-teacher="${teacher}"` : '';
            
            html += `<td class="${cellClasses.join(' ')}" style="cursor:pointer;" ${clickHandler} ${dragAttrs}>${cellText}</td>`;
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
            const div = document.createElement('div');
            div.className = `displaced-item ${isSelected ? 'selected' : ''}`;
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
                };
                div.ondragend = () => { draggedData = null; scrollSpeed = 0; };
            }
            tray.appendChild(div);
        });
    } else {
        indicator.classList.add('hidden');
        wrapper.classList.remove('active');
    }
}

function renderCardRoutine() {
    const grid = document.getElementById('timeline-grid');
    if(!grid) return;
    grid.innerHTML = '<p style="color:gray; font-size:14px;">Card layout functioning.</p>';
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
                            <button onclick="openBottomSheet('${period}', '${teacher}')" style="background:transparent; border:1px solid var(--accent-green); color:var(--accent-green); padding:4px 10px; border-radius:12px; font-size:12px; cursor:pointer;">Reassign</button>
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
    } else if (conflicts === 0 && resolvedCount > 0) {
        conflictList.innerHTML = `
            <div style="text-align:center; padding: 20px; background:#f0fff4; border-radius:var(--radius-lg); margin-bottom:20px; border:1px solid #34c759;">
                <h3 style="color:var(--accent-green); margin-bottom:5px;">Fully Covered</h3>
                <p style="color:var(--text-secondary); font-size:13px;">All absences have been assigned substitutes.</p>
            </div>
        ` + conflictList.innerHTML;
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
    let sTask = '';
    if (source.type === 'grid') {
        sTask = state.schedule[state.day][source.period][source.teacher];
    } else if (source.type === 'displaced') {
        sTask = source.item.task;
    }

    const tTask = state.schedule[state.day][target.period][target.teacher]; 
    let newlyDisplaced = null;

    if (tTask !== 'Free') {
        newlyDisplaced = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            task: tTask,
            ogTeacher: target.teacher,
            period: target.period
        };
        state.displaced[state.day].push(newlyDisplaced);
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

    lastDroppedCell = { period: target.period, teacher: target.teacher };
    setTimeout(() => {
        lastDroppedCell = null; 
    }, 500);

    saveStateToStorage();
    updateUndoUI();
    showToast(`Assignment Moved.`);
    renderAll();
}

function openBottomSheet(period, targetTeacher) {
    if (!state.isEditMode && document.querySelector('.tab-section.active').id !== 'tab-substitutions') return;
    
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const list = document.getElementById('sheet-teacher-list');
    if(!sheet || !overlay || !list) return;

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
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if(sheet) sheet.classList.remove('open');
    if(overlay) overlay.classList.remove('active');
}

function assignSubstitute(period, absentTeacher, subTeacher) {
    closeBottomSheet();
    
    if (!state.substitutions[state.day]) state.substitutions[state.day] = {};
    if (!state.substitutions[state.day][period]) state.substitutions[state.day][period] = {};
    
    const previousSub = state.substitutions[state.day][period][absentTeacher];
    const previousTaskForSub = state.schedule[state.day][period][subTeacher];
    const taskToCover = state.baseSchedule[state.day][period][absentTeacher];
    
    state.actionHistory.subs.push({ 
        type: 'sub',
        period, absentTeacher, subTeacher, previousSub, previousTaskForSub, taskToCover, day: state.day 
    });
    
    if (previousSub && previousSub !== subTeacher) {
        state.schedule[state.day][period][previousSub] = 'Free'; 
    }

    state.schedule[state.day][period][subTeacher] = taskToCover;
    state.schedule[state.day][period][absentTeacher] = 'Free'; 
    state.substitutions[state.day][period][absentTeacher] = subTeacher;
    
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

// --- DUAL-STACK UNDO ENGINE ---
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

    } else if (action.type === 'sub') {
        const { period, absentTeacher, subTeacher, previousSub, previousTaskForSub, taskToCover, day } = action;
        state.schedule[day][period][subTeacher] = previousTaskForSub || 'Free';
        
        if (previousSub) {
            state.substitutions[day][period][absentTeacher] = previousSub;
            state.schedule[day][period][previousSub] = taskToCover;
        } else {
            delete state.substitutions[day][period][absentTeacher];
            state.schedule[day][period][absentTeacher] = taskToCover;
        }
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

    state.baseSchedule = JSON.parse(JSON.stringify(state.schedule));
    state.substitutions = {};
    state.displaced = { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
}