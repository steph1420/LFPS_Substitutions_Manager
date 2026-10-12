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
        samePeriodLock: true,
        minimizeAlerts: false,
        detectCollisions: true
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
let lastResetCells = [];

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
        schemaVersion: '1.27',
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
            // Enforce schema version check: reset legacy mock data if on older schema
            if (!parsed.schemaVersion || parsed.schemaVersion < '1.27') {
                return false; // Triggers fresh, clean co-teaching-enabled generateSimulatedData()
            }

            state.day = parsed.day || 'MON';
            state.baseSchedule = parsed.baseSchedule || JSON.parse(JSON.stringify(parsed.schedule)); 
            state.schedule = parsed.schedule;
            state.substitutions = parsed.substitutions || {};
            state.displaced = parsed.displaced || { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
            state.absentTeachers = new Set(parsed.absentTeachers || []);
            state.settings = Object.assign({ samePeriodLock: true, minimizeAlerts: false, detectCollisions: true }, parsed.settings);
            
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
function initTheme() {
    const savedTheme = localStorage.getItem('lfps_frontdesk_theme') || 'system';
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery && mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', () => {
            const current = localStorage.getItem('lfps_frontdesk_theme') || 'system';
            if (current === 'system') {
                applyTheme('system');
            }
        });
    }
}

function applyTheme(themeKey) {
    if (themeKey === 'system') {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', themeKey);
        document.body.setAttribute('data-theme', themeKey);
    }
    updateThemeSelectorUI(themeKey);
}

function setTheme(themeKey) {
    localStorage.setItem('lfps_frontdesk_theme', themeKey);
    applyTheme(themeKey);
}
window.setTheme = setTheme;

function updateThemeSelectorUI(activeTheme) {
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === activeTheme);
    });
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
    // Bottom Navigation with Full-Zone Switching
    document.querySelectorAll('.nav-zone').forEach(zone => {
        zone.addEventListener('click', (e) => {
            const targetId = zone.dataset.target;
            if (!targetId) return;

            document.querySelectorAll('.nav-zone').forEach(z => z.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(t => t.classList.remove('active'));
            
            zone.classList.add('active');
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
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

    safeBind('toast-undo-btn', 'click', undoLastAction);
    safeBind('header-undo-btn', 'click', undoLastAction);
    safeBind('header-redo-btn', 'click', redoLastAction);
    safeBind('reset-schedule-btn', 'click', handleResetSchedule);
    safeBind('auto-resolve-btn', 'click', performAutoResolve);

    safeBind('settings-btn', 'click', openSettingsModal);
    safeBind('close-settings-btn', 'click', closeSettingsModal);
    safeBind('settings-overlay', 'click', closeSettingsModal);
    
    // Feature Overview Tour Modal
    safeBind('tour-btn', 'click', openTourModal);
    safeBind('close-tour-btn', 'click', closeTourModal);
    safeBind('tour-overlay', 'click', closeTourModal);
    safeBind('settings-open-tour-row', 'click', () => {
        closeSettingsModal();
        openTourModal();
    });

    // Co-Teacher Selective Split Modal
    safeBind('close-split-modal-btn', 'click', closeSplitModal);
    safeBind('split-overlay', 'click', closeSplitModal);
    safeBind('split-cancel-btn', 'click', cancelSplitModal);
    safeBind('split-confirm-btn', 'click', applySelectedSplits);

    // Co-Teacher Inspector Modal
    safeBind('close-co-teach-modal-btn', 'click', closeCoTeachingModal);
    safeBind('co-teach-overlay', 'click', closeCoTeachingModal);
    
    safeBind('same-period-lock-toggle', 'change', (e) => {
        state.settings.samePeriodLock = e.target.checked;
        saveStateToStorage();
        showToast(state.settings.samePeriodLock ? 'Same-Period Lock enabled' : 'Same-Period Lock disabled (Cross-period subs allowed)');
    });

    safeBind('minimize-alerts-toggle', 'change', (e) => {
        state.settings.minimizeAlerts = e.target.checked;
        saveStateToStorage();
        showToast(state.settings.minimizeAlerts ? 'Alerts minimized' : 'Alerts set to normal', true);
    });

    safeBind('detect-collisions-toggle', 'change', (e) => {
        state.settings.detectCollisions = e.target.checked;
        saveStateToStorage();
        renderAll();
    });

    safeBind('collision-indicator', 'click', () => {
        const collisions = findCollisions();
        if (collisions.count > 0) {
            const firstCell = document.querySelector('.cell-collision');
            if (firstCell) {
                firstCell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' });
            }
            showToast(`Found ${collisions.count} collision(s): ${collisions.details.slice(0, 2).join('; ')}`, true);
        }
    });

    // Theme selector option buttons in Settings
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });

    window.addEventListener('keydown', handleGlobalKeydown);

    // Bottom Sheet Fluid Drag-to-Dismiss Touch Physics
    const sheet = document.getElementById('bottom-sheet');
    const handle = document.getElementById('sheet-handle');
    let startY = 0;
    let currentY = 0;
    let isDraggingSheet = false;

    if (sheet && handle) {
        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            currentY = startY;
            isDraggingSheet = true;
            sheet.style.transition = 'none';
        }, {passive: true});

        window.addEventListener('touchmove', (e) => {
            if (!isDraggingSheet) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            if (deltaY > 0) { 
                sheet.style.transform = `translateY(${deltaY}px)`;
            }
        }, {passive: true});

        window.addEventListener('touchend', (e) => {
            if (!isDraggingSheet) return;
            isDraggingSheet = false;
            sheet.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), bottom 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            const deltaY = currentY - startY;
            if (deltaY > 60) {
                closeBottomSheet();
                setTimeout(() => { sheet.style.transform = ''; }, 320); 
            } else {
                sheet.style.transform = 'translateY(0)'; 
            }
        });

        handle.addEventListener('click', closeBottomSheet);
    }

    const tableContainer = document.querySelector('.table-scroll-container');
    const table = document.getElementById('routine-table');
    
    if (table && tableContainer) {
        // Option+Click: Reset clicked element to original state (revert sub, send subject back, reset cell)
        table.addEventListener('click', (e) => {
            if (e.altKey) {
                const td = e.target.closest('td');
                if (td && td.dataset.period && td.dataset.teacher) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    resetCellToOriginalState(td.dataset.period, td.dataset.teacher);
                }
            }
        }, true);

        const displacedTray = document.getElementById('displaced-tray');
        if (displacedTray) {
            displacedTray.addEventListener('click', (e) => {
                if (e.altKey) {
                    const itemEl = e.target.closest('.displaced-item');
                    if (itemEl && itemEl.dataset.id) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        resetDisplacedItemToOriginal(itemEl.dataset.id);
                    }
                }
            }, true);
        }

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

// --- CO-TEACHING COOPERATION ENGINE ---
function getCoTeachingPartners(day, period, teacher) {
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher];
    if (!baseTask || baseTask === 'Free' || baseTask === '-' || baseTask === '') return [];
    
    const partners = [];
    teachers.forEach(otherT => {
        if (otherT !== teacher) {
            const otherBase = state.baseSchedule[day]?.[period]?.[otherT];
            if (otherBase && otherBase.trim().toUpperCase() === baseTask.trim().toUpperCase()) {
                partners.push(otherT);
            }
        }
    });
    return partners;
}

function isActivelyCoTeaching(day, period, teacher) {
    const partners = getCoTeachingPartners(day, period, teacher);
    if (partners.length === 0) return false;
    
    const currentTask = state.schedule[day]?.[period]?.[teacher];
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher];
    if (!currentTask || currentTask !== baseTask) return false;

    // Check if at least one partner is also still currently teaching the baseTask and present
    return partners.some(partner => {
        const partnerCurrentTask = state.schedule[day]?.[period]?.[partner];
        return partnerCurrentTask === baseTask && !state.absentTeachers.has(partner);
    });
}

function openCoTeachingModal(period, teacher) {
    const modal = document.getElementById('co-teach-modal');
    const overlay = document.getElementById('co-teach-overlay');
    const body = document.getElementById('co-teach-modal-body');
    if (!modal || !overlay || !body) return;

    const partners = getCoTeachingPartners(state.day, period, teacher);
    const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
    const currentTask = state.schedule[state.day]?.[period]?.[teacher];
    const isActive = isActivelyCoTeaching(state.day, period, teacher);

    // Briefly highlight partner cell(s)
    partners.forEach(partner => {
        const partnerCell = document.querySelector(`td[data-period="${period}"][data-teacher="${partner}"]`);
        if (partnerCell) {
            partnerCell.classList.remove('cell-partner-highlight');
            void partnerCell.offsetWidth;
            partnerCell.classList.add('cell-partner-highlight');
            setTimeout(() => { partnerCell.classList.remove('cell-partner-highlight'); }, 1600);
        }
    });

    const isCurrentFree = (currentTask === 'Free');

    body.innerHTML = `
        <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:12px; padding:14px 16px; margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:16px; color:var(--text-primary); font-weight:700;">${baseTask}</strong>
                <span style="font-size:12px; font-weight:600; color:var(--accent-blue); background:rgba(0,122,255,0.12); padding:2px 8px; border-radius:12px;">${period}</span>
            </div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${state.day} • Co-Taught Class</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:${isCurrentFree ? 'var(--accent-red)' : 'var(--accent-green)'};"></div>
                    <strong style="font-size:14px; color:var(--text-primary);">${teacher}</strong>
                </div>
                <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">${isCurrentFree ? 'Released (Free)' : (isActive ? 'Active Co-Teacher' : 'Teaching Solo')}</span>
            </div>

            ${partners.map(p => {
                const pTask = state.schedule[state.day]?.[period]?.[p];
                const pIsFree = (pTask === 'Free');
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:8px; height:8px; border-radius:50%; background:${pIsFree ? 'var(--accent-red)' : 'var(--accent-green)'};"></div>
                        <strong style="font-size:14px; color:var(--text-primary);">${p}</strong>
                    </div>
                    <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">${pIsFree ? 'Released (Free)' : 'Co-Teacher'}</span>
                </div>
                `;
            }).join('')}
        </div>

        <div style="font-size:12px; color:var(--text-secondary); line-height:1.45; margin-bottom:18px;">
            Releasing a teacher sets them Free so they can take substitutions, while their co-teaching partner continues teaching the class alone.
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
            ${!isCurrentFree ? `
                <button class="btn-primary" style="padding:10px 16px; font-size:13px; font-weight:600;" onclick="releaseTeacher('${period}', '${teacher}', 'period')">
                    Release ${teacher.split(' ')[1] || teacher} for this Period (Make Free)
                </button>
                <button class="btn-secondary" style="padding:10px 16px; font-size:13px; font-weight:600;" onclick="releaseTeacher('${period}', '${teacher}', 'day')">
                    Release ${teacher.split(' ')[1] || teacher} for Entire Day (Free Today)
                </button>
            ` : `
                <button class="btn-primary" style="padding:10px 16px; font-size:13px; font-weight:600;" onclick="rejoinCoTeacher('${period}', '${teacher}')">
                    Rejoin Partner (Restore ${baseTask})
                </button>
            `}
        </div>
    `;

    modal.classList.remove('hidden');
    overlay.classList.add('active');
}
window.openCoTeachingModal = openCoTeachingModal;

function closeCoTeachingModal() {
    const modal = document.getElementById('co-teach-modal');
    const overlay = document.getElementById('co-teach-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.closeCoTeachingModal = closeCoTeachingModal;

function releaseTeacher(period, teacher, scope = 'period') {
    closeCoTeachingModal();
    clearRedoStacks();
    const day = state.day;
    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);

    if (scope === 'period') {
        const prevTask = state.schedule[day][period][teacher];
        state.schedule[day][period][teacher] = 'Free';
        const action = {
            id: actionId,
            type: 'co-teach-release',
            scope: 'period',
            day,
            period,
            teacher,
            prevTask
        };
        state.actionHistory.grid.push(action);
        showToast(`Released ${teacher} from ${period}. Now Free for substitutions.`);
    } else if (scope === 'day') {
        const savedTasks = [];
        periods.forEach(p => {
            const task = state.schedule[day]?.[p]?.[teacher];
            if (task && task !== 'Free' && task !== '-') {
                savedTasks.push({ period: p, task });
                state.schedule[day][p][teacher] = 'Free';
            }
        });
        const action = {
            id: actionId,
            type: 'co-teach-release',
            scope: 'day',
            day,
            teacher,
            savedTasks
        };
        state.actionHistory.grid.push(action);
        showToast(`Released ${teacher} for entire ${day}. Now Free for substitutions.`);
    }

    saveStateToStorage();
    updateUndoUI();
    renderAll();
}
window.releaseTeacher = releaseTeacher;

function rejoinCoTeacher(period, teacher) {
    closeCoTeachingModal();
    clearRedoStacks();
    const day = state.day;
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher] || 'Free';
    const prevTask = state.schedule[day][period][teacher];
    state.schedule[day][period][teacher] = baseTask;

    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    state.actionHistory.grid.push({
        id: actionId,
        type: 'cell-reset',
        day,
        period,
        teacher,
        prevTask,
        baseTask
    });

    triggerCellResetAnimation(period, teacher);
    saveStateToStorage();
    updateUndoUI();
    showToast(`Restored ${teacher} to co-teach ${baseTask} (${period}).`);
    renderAll();
}
window.rejoinCoTeacher = rejoinCoTeacher;

function handleCoTeachingClick(period, teacher, event) {
    if (event && event.altKey) {
        return resetCellToOriginalState(period, teacher);
    }
    if (state.isEditMode) {
        handleGridInteraction(period, teacher);
        return;
    }
    const partners = getCoTeachingPartners(state.day, period, teacher);
    if (partners.length > 0) {
        openCoTeachingModal(period, teacher);
    }
}
window.handleCoTeachingClick = handleCoTeachingClick;

// Option+Click element reset functions
function triggerCellResetAnimation(period, teacher) {
    if (!period || !teacher) return;
    if (!lastResetCells) lastResetCells = [];
    if (!lastResetCells.some(c => c.period === period && c.teacher === teacher)) {
        lastResetCells.push({ period, teacher });
    }
    setTimeout(() => {
        if (lastResetCells) {
            lastResetCells = lastResetCells.filter(c => !(c.period === period && c.teacher === teacher));
        }
    }, 600);
}

function resetCellToOriginalState(period, teacher) {
    clearRedoStacks();
    const day = state.day;

    // Check 1: Is this teacher substituting for someone in this period?
    let coveringFor = null;
    let coveringSourcePeriod = null;
    const daySubs = state.substitutions[day];
    if (daySubs) {
        for (const [sPeriod, subMap] of Object.entries(daySubs)) {
            for (const [absT, subT] of Object.entries(subMap)) {
                if (subT === teacher) {
                    const matchAction = [...state.actionHistory.grid].reverse().find(a => 
                        (a.type === 'sub' && a.day === day && a.subTeacher === teacher && a.absentTeacher === absT)
                    );
                    const activeTargetPeriod = matchAction ? (matchAction.targetPeriod || matchAction.period) : sPeriod;
                    if (activeTargetPeriod === period) {
                        coveringFor = absT;
                        coveringSourcePeriod = sPeriod;
                        break;
                    }
                }
            }
            if (coveringFor) break;
        }
    }

    if (coveringFor) {
        triggerCellResetAnimation(period, teacher);
        triggerCellResetAnimation(coveringSourcePeriod || period, coveringFor);
        unassignSubstitute(coveringSourcePeriod || period, coveringFor);
        showToast(`Reverted substitution: Sent class back to ${coveringFor}. ${teacher} freed.`);
        return;
    }

    // Check 2: Does this teacher have a substitute covering for them in this period?
    const assignedSub = state.substitutions[day]?.[period]?.[teacher];
    if (assignedSub) {
        triggerCellResetAnimation(period, teacher);
        triggerCellResetAnimation(period, assignedSub);
        unassignSubstitute(period, teacher);
        showToast(`Reverted substitution: ${teacher}'s class returned from ${assignedSub}.`);
        return;
    }

    // Check 3: Current task differs from baseline task in baseSchedule, OR cell was source of a moved task
    const currentTask = state.schedule[day]?.[period]?.[teacher];
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher] || 'Free';

    // 3A: If currentTask !== 'Free', check if this task was moved here from somewhere else
    if (currentTask !== 'Free' && currentTask !== baseTask) {
        // Look through grid action history in reverse to see if this task was moved to (period, teacher)
        const moveAction = [...state.actionHistory.grid].reverse().find(a => 
            a.type === 'move' && 
            a.day === day && 
            a.target && 
            a.target.period === period && 
            a.target.teacher === teacher && 
            a.sTask === currentTask
        );

        if (moveAction) {
            const { source, tTask, newlyDisplaced } = moveAction;
            // 1. Restore target cell to its task before the move
            state.schedule[day][period][teacher] = tTask;

            // 2. Return sTask back to its source
            if (source.type === 'grid') {
                state.schedule[day][source.period][source.teacher] = currentTask;
                triggerCellResetAnimation(source.period, source.teacher);
            } else if (source.type === 'displaced') {
                state.displaced[day].push(source.item);
            }

            // 3. If target displaced something, remove that displaced item
            if (newlyDisplaced) {
                state.displaced[day] = (state.displaced[day] || []).filter(d => d.id !== newlyDisplaced.id);
            }

            // Record undo action
            const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            state.actionHistory.grid.push({
                id: actionId,
                type: 'cell-reset-move',
                day,
                targetPeriod: period,
                targetTeacher: teacher,
                source,
                movedTask: currentTask,
                restoredTargetTask: tTask,
                newlyDisplaced
            });

            triggerCellResetAnimation(period, teacher);
            saveStateToStorage();
            updateUndoUI();
            if (source.type === 'grid') {
                showToast(`Sent ${currentTask} back to ${source.teacher} (${source.period}).`);
            } else {
                showToast(`Returned ${currentTask} back to Limbo.`);
            }
            renderAll();
            return;
        }

        // Also check if currentTask has a baseline origin elsewhere in the grid that is currently Free
        let foundOrigin = null;
        if (state.baseSchedule[day]) {
            for (const p of state.periods) {
                for (const t of state.teachers) {
                    if (state.baseSchedule[day][p]?.[t] === currentTask && (p !== period || t !== teacher)) {
                        if (state.schedule[day]?.[p]?.[t] === 'Free') {
                            foundOrigin = { period: p, teacher: t };
                            break;
                        }
                    }
                }
                if (foundOrigin) break;
            }
        }

        if (foundOrigin) {
            // Restore origin cell and set current cell to baseTask
            state.schedule[day][foundOrigin.period][foundOrigin.teacher] = currentTask;
            state.schedule[day][period][teacher] = baseTask;
            triggerCellResetAnimation(foundOrigin.period, foundOrigin.teacher);
            triggerCellResetAnimation(period, teacher);

            const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            state.actionHistory.grid.push({
                id: actionId,
                type: 'cell-reset-return-origin',
                day,
                fromPeriod: period,
                fromTeacher: teacher,
                toPeriod: foundOrigin.period,
                toTeacher: foundOrigin.teacher,
                task: currentTask,
                targetBaseTask: baseTask
            });

            saveStateToStorage();
            updateUndoUI();
            showToast(`Sent ${currentTask} back to ${foundOrigin.teacher} (${foundOrigin.period}).`);
            renderAll();
            return;
        }
    }

    // 3B: If this cell's baseline task was moved away to another cell and this cell is Free/different
    if (baseTask !== 'Free' && currentTask !== baseTask) {
        // Find where baseTask is currently located in schedule
        let currentLocation = null;
        for (const p of state.periods) {
            for (const t of state.teachers) {
                if (state.schedule[day]?.[p]?.[t] === baseTask && (p !== period || t !== teacher)) {
                    currentLocation = { period: p, teacher: t };
                    break;
                }
            }
            if (currentLocation) break;
        }

        if (currentLocation) {
            const locBaseTask = state.baseSchedule[day]?.[currentLocation.period]?.[currentLocation.teacher] || 'Free';
            state.schedule[day][currentLocation.period][currentLocation.teacher] = locBaseTask;
            state.schedule[day][period][teacher] = baseTask;

            triggerCellResetAnimation(currentLocation.period, currentLocation.teacher);
            triggerCellResetAnimation(period, teacher);

            const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            state.actionHistory.grid.push({
                id: actionId,
                type: 'cell-reset-recall',
                day,
                period,
                teacher,
                recalledTask: baseTask,
                fromPeriod: currentLocation.period,
                fromTeacher: currentLocation.teacher,
                fromPreviousTask: baseTask,
                fromRestoredTask: locBaseTask
            });

            saveStateToStorage();
            updateUndoUI();
            showToast(`Recalled ${baseTask} back to ${teacher} (${period}).`);
            renderAll();
            return;
        }
    }

    // 3C: Standard fallback reset if currentTask !== baseTask
    if (currentTask !== baseTask) {
        state.displaced[day] = (state.displaced[day] || []).filter(d => !(d.period === period && d.ogTeacher === teacher));
        state.schedule[day][period][teacher] = baseTask;

        const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        state.actionHistory.grid.push({
            id: actionId,
            type: 'cell-reset',
            day,
            period,
            teacher,
            prevTask: currentTask,
            baseTask
        });

        triggerCellResetAnimation(period, teacher);
        saveStateToStorage();
        updateUndoUI();
        showToast(`Reset ${teacher} (${period}) back to baseline (${baseTask}).`);
        renderAll();
        return;
    }

    // Even if already at baseline, provide tactile bounce feedback on Option-click
    triggerCellResetAnimation(period, teacher);
    renderAll();
    showToast(`${teacher} (${period}) is already at original baseline.`);
}
window.resetCellToOriginalState = resetCellToOriginalState;

function resetDisplacedItemToOriginal(itemId) {
    clearRedoStacks();
    const day = state.day;
    const item = (state.displaced[day] || []).find(d => d.id === itemId);
    if (!item) return;

    state.schedule[day][item.period][item.ogTeacher] = item.task;
    state.displaced[day] = state.displaced[day].filter(d => d.id !== itemId);

    triggerCellResetAnimation(item.period, item.ogTeacher);
    saveStateToStorage();
    updateUndoUI();
    showToast(`Sent ${item.task} back to ${item.ogTeacher} (${item.period}).`);
    renderAll();
}
window.resetDisplacedItemToOriginal = resetDisplacedItemToOriginal;

function extractClassSection(task) {
    if (!task || task === 'Free' || task === '-' || task === '') return null;
    const match = task.trim().match(/\b(\d{1,2}\s*[A-Za-z]?)\b/);
    if (match) {
        return match[1].replace(/\s+/g, '').toUpperCase();
    }
    return null;
}

// --- COLLISION DETECTION ENGINE ---
function findCollisions() {
    if (!state.settings || state.settings.detectCollisions === false) {
        return { count: 0, collisionCells: new Map(), details: [] };
    }

    const collisionCells = new Map(); // key: `${period}::${teacher}`, value: { reasons: [] }
    const details = [];

    periods.forEach(period => {
        if (period === 'BREAKFAST BREAK' || period === 'BREAKFAST') return;

        // Group assignments by Class Section (e.g. "9A", "10A", "7B")
        const sectionMap = new Map();
        // Also group by exact Task name (for non-numbered classes or activities)
        const exactTaskMap = new Map();

        teachers.forEach(teacher => {
            const task = state.schedule[state.day]?.[period]?.[teacher];
            if (task && task !== 'Free' && task !== '-' && task !== '') {
                const normTask = task.trim().toUpperCase();
                const sec = extractClassSection(task);

                if (sec) {
                    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
                    sectionMap.get(sec).push({ teacher, task: normTask });
                } else {
                    if (!exactTaskMap.has(normTask)) exactTaskMap.set(normTask, []);
                    exactTaskMap.get(normTask).push(teacher);
                }
            }
        });

        // 1. Check Class Section Collisions (e.g. Section 9A assigned to "GEO 9A" AND "SCI 9A" in 5th Pd)
        sectionMap.forEach((entries, section) => {
            if (entries.length > 1) {
                const uniqueTasks = new Set(entries.map(e => e.task));

                if (uniqueTasks.size > 1) {
                    // Conflicting subjects for the SAME student class section!
                    entries.forEach(e => {
                        const key = `${period}::${e.teacher}`;
                        if (!collisionCells.has(key)) collisionCells.set(key, { reasons: [] });
                        const others = entries.filter(o => o.teacher !== e.teacher).map(o => `${o.teacher} (${o.task})`).join(', ');
                        collisionCells.get(key).reasons.push(`Class ${section} Conflict: "${e.task}" overlaps with ${others}`);
                    });
                    details.push(`${period}: Class ${section} double-booked across different subjects (${entries.map(e => `${e.teacher}: ${e.task}`).join(', ')})`);
                } else {
                    // Same task name for this section (e.g. both teaching "MATH 10A")
                    // Check if they are legitimate designated base co-teachers
                    const assignedTeachers = entries.map(e => e.teacher);
                    const isDesignatedCoTeaching = assignedTeachers.every(t => {
                        const partners = getCoTeachingPartners(state.day, period, t);
                        return assignedTeachers.every(ot => ot === t || partners.includes(ot));
                    });

                    if (!isDesignatedCoTeaching) {
                        assignedTeachers.forEach(t => {
                            const key = `${period}::${t}`;
                            if (!collisionCells.has(key)) collisionCells.set(key, { reasons: [] });
                            collisionCells.get(key).reasons.push(`Duplicate Class: "${entries[0].task}" also with ${assignedTeachers.filter(ot => ot !== t).join(', ')}`);
                        });
                        details.push(`${period}: ${entries[0].task} assigned to multiple teachers (${assignedTeachers.join(', ')})`);
                    }
                }
            }
        });

        // 2. Check exact task duplicates without class numbers
        exactTaskMap.forEach((assignedTeachers, taskName) => {
            if (assignedTeachers.length > 1) {
                const isDesignatedCoTeaching = assignedTeachers.every(t => {
                    const partners = getCoTeachingPartners(state.day, period, t);
                    return assignedTeachers.every(ot => ot === t || partners.includes(ot));
                });

                if (!isDesignatedCoTeaching) {
                    assignedTeachers.forEach(t => {
                        const key = `${period}::${t}`;
                        if (!collisionCells.has(key)) collisionCells.set(key, { reasons: [] });
                        collisionCells.get(key).reasons.push(`Duplicate Activity: "${taskName}" with ${assignedTeachers.filter(ot => ot !== t).join(', ')}`);
                    });
                    details.push(`${period}: "${taskName}" assigned to multiple teachers (${assignedTeachers.join(', ')})`);
                }
            }
        });
    });

    return {
        count: collisionCells.size,
        collisionCells,
        details
    };
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    renderAbsentTray();
    renderTableRoutine(); 
    renderDisplacedTray();
    renderSubstitutions();
    renderCollisionIndicator();
}

function renderCollisionIndicator() {
    const indicator = document.getElementById('collision-indicator');
    const counterText = document.getElementById('collision-counter-text');
    if (!indicator || !counterText) return;

    const collisions = findCollisions();
    if (collisions.count > 0 && (!state.settings || state.settings.detectCollisions !== false)) {
        indicator.classList.remove('hidden');
        counterText.textContent = `${collisions.count} Collision${collisions.count > 1 ? 's' : ''}`;
        indicator.title = collisions.details.slice(0, 3).join('\n');
    } else {
        indicator.classList.add('hidden');
    }
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
    const collisions = findCollisions();
    
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
            
            // Check if this teacher is covering for an absent colleague in THIS EXACT PERIOD
            let coveringFor = null;
            let coveringSourcePeriod = null;
            const daySubs = state.substitutions[state.day];
            if (daySubs) {
                // Check all periods for any substitution assigned to this teacher in 'period'
                for (const [sPeriod, subMap] of Object.entries(daySubs)) {
                    for (const [absT, subT] of Object.entries(subMap)) {
                        if (subT === teacher) {
                            // Find corresponding action in actionHistory to match exact targetPeriod
                            const matchAction = [...state.actionHistory.grid].reverse().find(a => 
                                (a.type === 'sub' && a.day === state.day && a.subTeacher === teacher && a.absentTeacher === absT)
                            );
                            const activeTargetPeriod = matchAction ? (matchAction.targetPeriod || matchAction.period) : sPeriod;
                            if (activeTargetPeriod === period) {
                                coveringFor = absT;
                                coveringSourcePeriod = sPeriod;
                                break;
                            }
                        }
                    }
                    if (coveringFor) break;
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
                const periodNote = coveringSourcePeriod !== period ? ` [from ${coveringSourcePeriod}]` : '';
                cellContent = `
                    <div class="cell-sub-content">
                        <span class="sub-task">${task}</span>
                        <span class="sub-badge">Sub (${coveringFor.split(' ')[1] || coveringFor})</span>
                    </div>
                `;
                cellTitle = `Substituting for ${coveringFor}${periodNote}. Drag to another teacher to reassign, or drag back to ${coveringFor} to unassign.`;
                isDraggable = true;
                clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';

            } else if (task !== 'Free') {
                cellClasses.push('cell-assigned');
                cellContent = task;

                const coPartners = getCoTeachingPartners(state.day, period, teacher);
                const hasCoPartners = coPartners.length > 0;
                const isCoActive = hasCoPartners && isActivelyCoTeaching(state.day, period, teacher);
                const isCoSolo = hasCoPartners && (task === baseTask) && !isCoActive;

                if (isCoActive) {
                    cellClasses.push('cell-shared');
                    cellContent += `<span class="shared-badge" title="Co-teaching with ${coPartners.join(', ')}">👥</span>`;
                    cellTitle = `${teacher}: ${task} (Co-teaching with ${coPartners.join(', ')})`;
                } else if (isCoSolo) {
                    cellClasses.push('cell-shared');
                    cellContent += `<span class="shared-badge shared-badge-solo" title="Solo - split from ${coPartners.join(', ')}">👥</span>`;
                    cellTitle = `${teacher}: ${task} (Solo - split from ${coPartners.join(', ')})`;
                } else {
                    cellTitle = `${teacher}: ${task}`;
                }

                isDraggable = state.isEditMode;
                if (hasCoPartners) {
                    clickHandler = `onclick="handleCoTeachingClick('${period}', '${teacher}', event)"`;
                } else {
                    clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';
                }

            } else {
                // Free cell
                cellContent = '';
                const coPartners = getCoTeachingPartners(state.day, period, teacher);
                if (coPartners.length > 0) {
                    cellClasses.push('cell-shared');
                    cellContent += `<span class="shared-badge shared-badge-solo" title="Released co-teacher (Free)">👥</span>`;
                    cellTitle = `${teacher} is Free (Released from ${baseTask} with ${coPartners.join(', ')})`;
                    clickHandler = `onclick="handleCoTeachingClick('${period}', '${teacher}', event)"`;
                } else {
                    cellTitle = `${teacher} is Free in ${period}`;
                    clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';
                }
                isDraggable = false;
            }

            // Check Collision for this cell
            const cellKey = `${period}::${teacher}`;
            const collisionInfo = collisions.collisionCells.get(cellKey);
            if (collisionInfo) {
                cellClasses.push('cell-collision');
                cellTitle += `\n⚠ COLLISION: ${collisionInfo.reasons.join('; ')}`;
                cellContent += `<span class="collision-badge" title="${collisionInfo.reasons.join('; ')}">⚠ Conflict</span>`;
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
            } else if (lastResetCells && lastResetCells.some(c => c.period === period && c.teacher === teacher)) {
                cellClasses.push('cell-just-reset');
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

    // Check if subTeacher is currently actively co-teaching in targetPeriod
    const coPartners = getCoTeachingPartners(state.day, targetPeriod, subTeacher);
    const isCoTeachingSplit = isActivelyCoTeaching(state.day, targetPeriod, subTeacher);
    const splitPartner = (isCoTeachingSplit && coPartners.length > 0) ? coPartners[0] : null;
    
    let newlyDisplaced = null;
    // If target substitute teacher already has a class in targetPeriod, displace it to Limbo
    // UNLESS they are actively co-teaching! In co-teaching, they split cleanly and their partner covers solo.
    if (previousTaskForSub && previousTaskForSub !== 'Free' && subTeacher !== previousSub && !isCoTeachingSplit) {
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
        isCoTeachingSplit: Boolean(isCoTeachingSplit),
        splitPartner: splitPartner,
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
    if (isCoTeachingSplit) {
        showToast(`Split ${subTeacher} to ${periodLabel} for ${absentTeacher} (Partner covers solo)`);
    } else {
        showToast(`Assigned ${subTeacher} to cover for ${absentTeacher} ${periodLabel}`);
    }
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

// --- AUTO-RESOLVE ENGINE WITH CO-TEACHING SELECTIVE SPLIT ---
let pendingSplitProposals = [];

function closeSplitModal() {
    const modal = document.getElementById('split-resolve-modal');
    const overlay = document.getElementById('split-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    pendingSplitProposals = [];
}
window.closeSplitModal = closeSplitModal;

function cancelSplitModal() {
    closeSplitModal();
    showToast("Kept co-teachers paired.");
}
window.cancelSplitModal = cancelSplitModal;

function applySelectedSplits() {
    const selectedBoxes = document.querySelectorAll('#split-proposals-list input[type="checkbox"]:checked');
    if (selectedBoxes.length === 0) {
        closeSplitModal();
        showToast("No splits selected. Co-teachers remained paired.");
        return;
    }

    const applied = [];
    selectedBoxes.forEach(box => {
        const idx = parseInt(box.dataset.proposalIndex, 10);
        if (pendingSplitProposals[idx]) {
            applied.push(pendingSplitProposals[idx]);
        }
    });

    closeSplitModal();

    applied.forEach(p => {
        assignSubstitute(p.period, p.absentTeacher, p.teacher, p.period);
    });
}
window.applySelectedSplits = applySelectedSplits;

function performAutoResolve() {
    clearRedoStacks();
    const batchActions = [];
    let conflictsResolved = 0;
    
    // Step 1: Assign completely free teachers first
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
        renderAll();
    }

    // Step 2: Check for any remaining unresolved conflicts
    const remainingUnresolved = [];
    periods.forEach(period => {
        teachers.forEach(t => {
            const isAbsent = state.absentTeachers.has(t);
            const baseTask = state.baseSchedule[state.day]?.[period]?.[t];
            const currentSub = state.substitutions[state.day]?.[period]?.[t];
            if (isAbsent && baseTask && baseTask !== 'Free' && !currentSub) {
                remainingUnresolved.push({ period, absentTeacher: t, task: baseTask });
            }
        });
    });

    if (remainingUnresolved.length === 0) {
        if (batchActions.length > 0) {
            showToast(`Auto-resolved all ${conflictsResolved} conflicts.`);
        } else {
            showToast("No unresolved conflicts.");
        }
        return;
    }

    // Step 3: Find available co-teachers who could be split
    const splitProposals = [];
    const usedTeachersInProposals = new Set();

    remainingUnresolved.forEach(unresolved => {
        const p = unresolved.period;
        teachers.forEach(t => {
            if (!state.absentTeachers.has(t) && !usedTeachersInProposals.has(t)) {
                if (isActivelyCoTeaching(state.day, p, t)) {
                    splitProposals.push({
                        teacher: t,
                        period: p,
                        absentTeacher: unresolved.absentTeacher,
                        task: unresolved.task
                    });
                    usedTeachersInProposals.add(t);
                }
            }
        });
    });

    if (splitProposals.length > 0) {
        pendingSplitProposals = splitProposals;
        const listEl = document.getElementById('split-proposals-list');
        if (listEl) {
            listEl.innerHTML = '';
            splitProposals.forEach((prop, idx) => {
                const label = document.createElement('label');
                label.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:10px; cursor:pointer;';
                label.innerHTML = `
                    <input type="checkbox" data-proposal-index="${idx}" checked style="width:18px; height:18px; accent-color:var(--accent-blue); cursor:pointer;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <strong style="color:var(--text-primary); font-size:14px;">Split ${prop.teacher} to ${prop.period}</strong>
                        <span style="color:var(--text-secondary); font-size:12px;">Cover ${prop.task} for ${prop.absentTeacher} (partner continues solo)</span>
                    </div>
                `;
                listEl.appendChild(label);
            });
        }
        const modal = document.getElementById('split-resolve-modal');
        const overlay = document.getElementById('split-overlay');
        if (modal) modal.classList.remove('hidden');
        if (overlay) overlay.classList.add('active');

        if (conflictsResolved > 0) {
            showToast(`Resolved ${conflictsResolved} with free teachers. Review co-teacher split options.`);
        }
    } else {
        if (batchActions.length > 0) {
            showToast(`Auto-resolved ${conflictsResolved}. ${remainingUnresolved.length} remaining (no free teachers or co-teachers left).`);
        } else {
            showToast("No free teachers or co-teachers available to resolve conflicts.");
        }
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
            undoBtn.removeAttribute('disabled');
            undoBtn.textContent = `↩ Undo (${activeUndo.length})`;
        } else {
            undoBtn.setAttribute('disabled', 'true');
            undoBtn.textContent = '↩ Undo';
        }
    }

    if (redoBtn) {
        if (activeRedo.length > 0) {
            redoBtn.removeAttribute('disabled');
            redoBtn.textContent = `↪ Redo (${activeRedo.length})`;
        } else {
            redoBtn.setAttribute('disabled', 'true');
            redoBtn.textContent = '↪ Redo';
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

    } else if (action.type === 'cell-reset') {
        const { day, period, teacher, prevTask } = action;
        state.schedule[day][period][teacher] = prevTask;

    } else if (action.type === 'cell-reset-move') {
        const { day, targetPeriod, targetTeacher, source, movedTask, newlyDisplaced } = action;
        // Undo of reset-move: put movedTask back on target cell
        state.schedule[day][targetPeriod][targetTeacher] = movedTask;
        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = 'Free';
        } else if (source.type === 'displaced') {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== source.item.id);
        }
        if (newlyDisplaced) {
            state.displaced[day].push(newlyDisplaced);
        }

    } else if (action.type === 'cell-reset-return-origin') {
        const { day, fromPeriod, fromTeacher, toPeriod, toTeacher, task } = action;
        state.schedule[day][fromPeriod][fromTeacher] = task;
        state.schedule[day][toPeriod][toTeacher] = 'Free';

    } else if (action.type === 'cell-reset-recall') {
        const { day, period, teacher, fromPeriod, fromTeacher, recalledTask } = action;
        state.schedule[day][fromPeriod][fromTeacher] = recalledTask;
        state.schedule[day][period][teacher] = 'Free';

    } else if (action.type === 'co-teach-release') {
        const { day, scope, teacher, period, prevTask, savedTasks } = action;
        if (scope === 'period') {
            state.schedule[day][period][teacher] = prevTask;
        } else if (scope === 'day') {
            if (savedTasks && Array.isArray(savedTasks)) {
                savedTasks.forEach(item => {
                    state.schedule[day][item.period][teacher] = item.task;
                });
            }
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

    } else if (action.type === 'cell-reset') {
        const { day, period, teacher, baseTask } = action;
        state.schedule[day][period][teacher] = baseTask;
        state.actionHistory.grid.push(action);

    } else if (action.type === 'cell-reset-move') {
        const { day, targetPeriod, targetTeacher, source, movedTask, restoredTargetTask, newlyDisplaced } = action;
        state.schedule[day][targetPeriod][targetTeacher] = restoredTargetTask;
        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = movedTask;
        } else if (source.type === 'displaced') {
            state.displaced[day].push(source.item);
        }
        if (newlyDisplaced) {
            state.displaced[day] = (state.displaced[day] || []).filter(d => d.id !== newlyDisplaced.id);
        }
        state.actionHistory.grid.push(action);

    } else if (action.type === 'cell-reset-return-origin') {
        const { day, fromPeriod, fromTeacher, toPeriod, toTeacher, task, targetBaseTask } = action;
        state.schedule[day][toPeriod][toTeacher] = task;
        state.schedule[day][fromPeriod][fromTeacher] = targetBaseTask;
        state.actionHistory.grid.push(action);

    } else if (action.type === 'cell-reset-recall') {
        const { day, period, teacher, recalledTask, fromPeriod, fromTeacher, fromRestoredTask } = action;
        state.schedule[day][fromPeriod][fromTeacher] = fromRestoredTask;
        state.schedule[day][period][teacher] = recalledTask;
        state.actionHistory.grid.push(action);

    } else if (action.type === 'co-teach-release') {
        const { day, scope, teacher, period, savedTasks } = action;
        if (scope === 'period') {
            state.schedule[day][period][teacher] = 'Free';
        } else if (scope === 'day') {
            if (savedTasks && Array.isArray(savedTasks)) {
                savedTasks.forEach(item => {
                    state.schedule[day][item.period][teacher] = 'Free';
                });
            }
        }
        state.actionHistory.grid.push(action);

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
    const sameLockToggle = document.getElementById('same-period-lock-toggle');
    const minAlertsToggle = document.getElementById('minimize-alerts-toggle');
    const detectCollisionsToggle = document.getElementById('detect-collisions-toggle');
    
    if (sameLockToggle) {
        sameLockToggle.checked = state.settings.samePeriodLock !== false;
    }
    if (minAlertsToggle) {
        minAlertsToggle.checked = state.settings.minimizeAlerts === true;
    }
    if (detectCollisionsToggle) {
        detectCollisionsToggle.checked = state.settings.detectCollisions !== false;
    }

    const currentTheme = localStorage.getItem('lfps_frontdesk_theme') || 'system';
    updateThemeSelectorUI(currentTheme);

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

// --- FEATURE TOUR MODAL ---
function openTourModal() {
    const modal = document.getElementById('tour-modal');
    const overlay = document.getElementById('tour-overlay');
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}

function closeTourModal() {
    const modal = document.getElementById('tour-modal');
    const overlay = document.getElementById('tour-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.openTourModal = openTourModal;
window.closeTourModal = closeTourModal;

function showToast(message, isCritical = false) {
    // If minimize alerts is on and message is non-critical, suppress toast
    if (state.settings && state.settings.minimizeAlerts && !isCritical) {
        return;
    }

    const toast = document.getElementById('undo-toast');
    const msgElement = document.getElementById('toast-message');
    if(!toast || !msgElement) return;
    
    msgElement.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 4000);
}

// --- MOCK DATA GENERATOR ---
function generateSimulatedData() {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    // Structured class pools - unique subjects & sections to prevent natural collisions
    const teacherProfiles = [
        { teacher: 'Mr. Stephen', subjects: ['MATH 10A', 'MATH 9A', 'MATH 10B', 'PHY 11A', 'MATH 8A', 'MATH 7B'] },
        { teacher: 'Mrs. Midha', subjects: ['ENG 10A', 'ENG 9B', 'ENG 8A', 'ENG 7A', 'LIT 11B', 'ENG 6A'] },
        { teacher: 'Mrs. Pahwa', subjects: ['CHEM 11A', 'SCI 9A', 'SCI 10B', 'SCI 8B', 'CHEM 12B', 'SCI 7B'] },
        { teacher: 'Mrs. Bage', subjects: ['BIO 11A', 'SCI 9B', 'EVS 6A', 'BIO 12A', 'SCI 8A', 'EVS 5A'] },
        { teacher: 'Mr. Adams', subjects: ['HIST 10A', 'GEO 9A', 'SST 8A', 'HIST 11B', 'SST 7A', 'CIV 9B'] },
        { teacher: 'Mrs. Baker', subjects: ['HINDI 10A', 'HINDI 9A', 'HINDI 8B', 'HINDI 7B', 'HINDI 6B', 'SKT 8A'] },
        { teacher: 'Ms. Clark', subjects: ['COMP 9A', 'IT 10A', 'COMP 8A', 'COMP 7A', 'AI 11A', 'IT 9B'] },
        { teacher: 'Mr. Davis', subjects: ['P.E. 10B', 'GAMES 8A', 'P.E. 9A', 'GAMES 7B', 'YOGA 6A', 'P.E. 11B'] },
        { teacher: 'Mrs. Evans', subjects: ['ART 7A', 'CRAFT 6A', 'MUSIC 8B', 'ART 9B', 'CRAFT 5B', 'ART 8A'] }
    ];

    days.forEach((d, dayIndex) => {
        state.schedule[d] = {};
        
        periods.forEach((p, pIndex) => {
            state.schedule[d][p] = {};
            
            if (p === 'BREAKFAST BREAK' || p === 'BREAKFAST') {
                teachers.forEach(t => {
                    state.schedule[d][p][t] = '-';
                });
                return;
            }

            // Keep track of class sections assigned in this period to guarantee 0 collisions
            const usedSectionsInPeriod = new Set();

            teachers.forEach((t, tIndex) => {
                const profile = teacherProfiles.find(tp => tp.teacher === t);
                const subPool = profile ? profile.subjects : ['STUDY 10A', 'LIB 9A', 'ACT 8A'];

                // Rotate through subjects deterministically across days and periods
                const subIndex = (dayIndex * 3 + pIndex + tIndex) % (subPool.length + 3);
                
                // Realistic ~30% free periods for teachers so substitutions can occur
                if (subIndex >= subPool.length || subIndex % 4 === 0) {
                    state.schedule[d][p][t] = 'Free';
                } else {
                    let chosenClass = 'Free';
                    for (let offset = 0; offset < subPool.length; offset++) {
                        const candidate = subPool[(subIndex + offset) % subPool.length];
                        const sec = extractClassSection(candidate);
                        if (!sec || !usedSectionsInPeriod.has(sec)) {
                            chosenClass = candidate;
                            if (sec) usedSectionsInPeriod.add(sec);
                            break;
                        }
                    }
                    state.schedule[d][p][t] = chosenClass;
                }
            });
        });
    });

    // Seed intentional Co-Teaching assignments across the week
    // MON, 2nd Pd: Mr. Stephen & Mrs. Midha both co-teach 'MATH 10A'
    if (state.schedule['MON'] && state.schedule['MON']['2nd Pd.']) {
        state.schedule['MON']['2nd Pd.']['Mr. Stephen'] = 'MATH 10A';
        state.schedule['MON']['2nd Pd.']['Mrs. Midha'] = 'MATH 10A';
        teachers.forEach(t => {
            if (t !== 'Mr. Stephen' && t !== 'Mrs. Midha' && extractClassSection(state.schedule['MON']['2nd Pd.'][t]) === '10A') {
                state.schedule['MON']['2nd Pd.'][t] = 'Free';
            }
        });
    }
    // MON, 5th Pd: Mrs. Pahwa & Mrs. Bage both co-teach 'SCI 9A'
    if (state.schedule['MON'] && state.schedule['MON']['5th Pd.']) {
        state.schedule['MON']['5th Pd.']['Mrs. Pahwa'] = 'SCI 9A';
        state.schedule['MON']['5th Pd.']['Mrs. Bage'] = 'SCI 9A';
        teachers.forEach(t => {
            if (t !== 'Mrs. Pahwa' && t !== 'Mrs. Bage' && extractClassSection(state.schedule['MON']['5th Pd.'][t]) === '9A') {
                state.schedule['MON']['5th Pd.'][t] = 'Free';
            }
        });
    }
    // WED, 3rd Pd: Mr. Adams & Mrs. Baker both co-teach 'HIST 10A'
    if (state.schedule['WED'] && state.schedule['WED']['3rd Pd.']) {
        state.schedule['WED']['3rd Pd.']['Mr. Adams'] = 'HIST 10A';
        state.schedule['WED']['3rd Pd.']['Mrs. Baker'] = 'HIST 10A';
        teachers.forEach(t => {
            if (t !== 'Mr. Adams' && t !== 'Mrs. Baker' && extractClassSection(state.schedule['WED']['3rd Pd.'][t]) === '10A') {
                state.schedule['WED']['3rd Pd.'][t] = 'Free';
            }
        });
    }
    // FRI, 4th Pd: Ms. Clark & Mr. Davis both co-teach 'COMP 9A'
    if (state.schedule['FRI'] && state.schedule['FRI']['4th Pd.']) {
        state.schedule['FRI']['4th Pd.']['Ms. Clark'] = 'COMP 9A';
        state.schedule['FRI']['4th Pd.']['Mr. Davis'] = 'COMP 9A';
        teachers.forEach(t => {
            if (t !== 'Ms. Clark' && t !== 'Mr. Davis' && extractClassSection(state.schedule['FRI']['4th Pd.'][t]) === '9A') {
                state.schedule['FRI']['4th Pd.'][t] = 'Free';
            }
        });
    }

    state.baseSchedule = JSON.parse(JSON.stringify(state.schedule));
    state.substitutions = {};
    state.displaced = { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
}