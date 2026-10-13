// --- STATE MANAGEMENT ---
const state = {
    day: 'MON',
    isEditMode: false,
    currentRole: 'admin', // 'admin' | 'ac' | 'asst_ac' | 'teacher'
    activeTeacher: 'Mrs. Pahwa',
    absentTeachers: new Set(),
    baseSchedule: {}, 
    schedule: {},     
    substitutions: {}, 
    subStatus: {}, // day -> period -> absentTeacher -> { status: 'pending'|'accepted'|'disputed', acceptedBy, disputeReason }
    officiatingAC: {}, // day -> teacherName
    officiatingCT: {}, // day -> { section: teacherName }
    displaced: { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] },
    settings: {
        samePeriodLock: true,
        minimizeAlerts: false,
        detectCollisions: true,
        allowDisputes: true
    },
    actionHistory: {
        grid: [], 
        subs: [],
        redoGrid: [],
        redoSubs: []
    }
};

const PRIMARY_AC = 'Mr. Stephen';
const ASSISTANT_AC = 'Mrs. Midha';
const classTeacherMap = {
    'Mr. Stephen': '10A',
    'Mrs. Midha': '10B',
    'Mrs. Pahwa': '9A',
    'Mrs. Bage': '9B',
    'Mr. Adams': '8A',
    'Mrs. Baker': '8B',
    'Ms. Clark': '7A',
    'Mr. Davis': '7B',
    'Mrs. Evans': '6A'
};

// Active 10-second acceptance countdown timers: key = `${day}::${period}::${absentTeacher}` -> { remaining, intervalId }
const activeAcceptTimers = new Map();
let pendingDisputeTarget = null;
let pendingOfficiatingTarget = null; // { type: 'ac' } or { type: 'ct', section, absentCT }

let selectedCell = null; 
let draggedData = null;  
let scrollSpeed = 0;
let isScrolling = false;
let registerFilter = 'all';
let isFitGridMode = false;
let generatedProposals = [];
let activeProposalIndex = 0;

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
        currentRole: state.currentRole,
        activeTeacher: state.activeTeacher,
        baseSchedule: state.baseSchedule,
        schedule: state.schedule,
        substitutions: state.substitutions,
        subStatus: state.subStatus,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
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
            state.currentRole = parsed.currentRole || 'admin';
            state.activeTeacher = parsed.activeTeacher || 'Mrs. Pahwa';
            state.baseSchedule = parsed.baseSchedule || JSON.parse(JSON.stringify(parsed.schedule)); 
            state.schedule = parsed.schedule;
            state.substitutions = parsed.substitutions || {};
            state.subStatus = parsed.subStatus || {};
            state.officiatingAC = parsed.officiatingAC || {};
            state.officiatingCT = parsed.officiatingCT || {};
            state.displaced = parsed.displaced || { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
            state.absentTeachers = new Set(parsed.absentTeachers || []);
            state.settings = Object.assign({ samePeriodLock: true, minimizeAlerts: false, detectCollisions: true, allowDisputes: true }, parsed.settings);
            
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

    document.querySelectorAll('.day-btn, .fit-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenDay = e.currentTarget.dataset.day;
            if (!chosenDay) return;
            state.day = chosenDay;
            selectedCell = null; 
            syncDayButtonsUI();
            saveStateToStorage();
            renderAll();
        });
    });

    // Expanded Fit-Grid View (Mobile Landscape & Full-Width Fit)
    safeBind('fit-grid-btn', 'click', () => toggleFitGridMode(true));
    safeBind('exit-fit-grid-btn', 'click', () => toggleFitGridMode(false));

    // Daily Substitution Register Filter Tabs
    document.querySelectorAll('.reg-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.reg-filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            registerFilter = e.currentTarget.dataset.filter || 'all';
            renderSubstitutions();
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

    // Multi-Option Smart Auto-Resolve Proposals Modal
    safeBind('close-auto-resolve-modal-btn', 'click', closeAutoResolveModal);
    safeBind('auto-resolve-overlay', 'click', closeAutoResolveModal);
    safeBind('auto-resolve-cancel-btn', 'click', closeAutoResolveModal);
    safeBind('auto-resolve-apply-btn', 'click', applySelectedProposal);

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

    // Officiating Role Picker Modal (offAC & offCT)
    safeBind('close-officiating-modal-btn', 'click', closeOfficiatingModal);
    safeBind('officiating-overlay', 'click', closeOfficiatingModal);

    // Substitution Dispute Modal
    safeBind('close-dispute-modal-btn', 'click', closeDisputeModal);
    safeBind('dispute-overlay', 'click', closeDisputeModal);
    safeBind('dispute-cancel-btn', 'click', closeDisputeModal);
    safeBind('dispute-submit-btn', 'click', submitDisputeReason);

    // Header Role Badge Button -> opens Settings to switch role
    safeBind('role-badge-btn', 'click', openSettingsModal);

    // Role Option Buttons in Settings
    document.querySelectorAll('.role-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role;
            if (role) setActiveRole(role);
        });
    });

    safeBind('active-teacher-select', 'change', (e) => {
        state.activeTeacher = e.target.value;
        saveStateToStorage();
        updateRolePermissionsUI();
        renderAll();
        showToast(`Viewing as ${state.activeTeacher}`);
    });

    safeBind('allow-disputes-toggle', 'change', (e) => {
        if (!hasCoordinatorPermissions()) return;
        state.settings.allowDisputes = e.target.checked;
        saveStateToStorage();
        renderAll();
        showToast(state.settings.allowDisputes ? 'Teacher Substitution Disputes enabled' : 'Teacher Substitution Disputes disabled');
    });
    
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

// --- FIT-GRID VIEW (MOBILE LANDSCAPE & FULL-SCREEN FIT) ---
function syncDayButtonsUI() {
    document.querySelectorAll('.day-btn, .fit-day-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.day === state.day);
    });
    const pill = document.getElementById('fit-bar-day-pill');
    if (pill) pill.textContent = state.day;
}
window.syncDayButtonsUI = syncDayButtonsUI;

function toggleFitGridMode(enable) {
    isFitGridMode = (typeof enable === 'boolean') ? enable : !isFitGridMode;
    document.body.classList.toggle('fit-grid-mode', isFitGridMode);
    const stickyBar = document.getElementById('fit-grid-sticky-bar');
    if (stickyBar) {
        stickyBar.classList.toggle('hidden', !isFitGridMode);
    }
    syncDayButtonsUI();
    if (isFitGridMode) {
        showToast('Fit-Grid View enabled. Tap "Back to Normal" or press Esc to exit.');
    }
}
window.toggleFitGridMode = toggleFitGridMode;

function openCoTeachingModal(period, teacher) {
    const modal = document.getElementById('co-teach-modal');
    const overlay = document.getElementById('co-teach-overlay');
    const body = document.getElementById('co-teach-modal-body');
    if (!modal || !overlay || !body) return;

    const partners = getCoTeachingPartners(state.day, period, teacher);
    const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
    const allCoTeachers = [teacher, ...partners];

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

    const rowsHtml = allCoTeachers.map(t => {
        const tTask = state.schedule[state.day]?.[period]?.[t] || 'Free';
        const tIsAbsent = state.absentTeachers.has(t);
        const tIsFree = (tTask === 'Free');
        const tIsActive = isActivelyCoTeaching(state.day, period, t);

        let statusColor = 'var(--accent-green)';
        let statusLabel = tIsActive ? 'Active Co-Teacher' : 'Teaching Solo';
        if (tIsAbsent) {
            statusColor = 'var(--accent-pink)';
            statusLabel = 'Absent Today';
        } else if (tIsFree) {
            statusColor = 'var(--accent-orange)';
            statusLabel = 'Released (Free)';
        } else if (tTask !== baseTask) {
            statusColor = 'var(--accent-blue)';
            statusLabel = `Assigned to ${tTask}`;
        }

        let inlineActions = '';
        if (tIsAbsent) {
            inlineActions = `<span style="font-size:11px; color:var(--accent-pink); font-weight:600;">Absent</span>`;
        } else if (tIsFree) {
            inlineActions = `
                <button class="btn-inline-rejoin" onclick="rejoinCoTeacher('${period}', '${t}')">
                    ↩ Rejoin
                </button>
            `;
        } else {
            inlineActions = `
                <button class="btn-inline-release" onclick="releaseTeacher('${period}', '${t}', 'period')" title="Release ${t} for ${period}">
                    Release
                </button>
                <button class="btn-inline-release-day" onclick="releaseTeacher('${period}', '${t}', 'day')" title="Make ${t} Free for the entire day">
                    Free Day
                </button>
            `;
        }

        return `
            <div class="co-teacher-row">
                <div class="co-teacher-info">
                    <div style="width:9px; height:9px; border-radius:50%; background:${statusColor}; flex-shrink:0;"></div>
                    <div class="co-teacher-meta">
                        <strong style="font-size:14px; color:var(--text-primary);">${t}</strong>
                        <span style="font-size:11px; color:var(--text-secondary); font-weight:500;">${statusLabel}</span>
                    </div>
                </div>
                <div class="co-inline-actions">
                    ${inlineActions}
                </div>
            </div>
        `;
    }).join('');

    body.innerHTML = `
        <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:12px; padding:14px 16px; margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:16px; color:var(--text-primary); font-weight:700;">${baseTask}</strong>
                <span style="font-size:12px; font-weight:600; color:var(--accent-blue); background:rgba(0,122,255,0.12); padding:2px 8px; border-radius:12px;">${period}</span>
            </div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${state.day} • Shared Co-Teaching Slot</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
            ${rowsHtml}
        </div>

        <div style="font-size:12px; color:var(--text-secondary); line-height:1.45;">
            Use the inline <b>Release</b> button beside any teacher's name to free them for this period or the whole day while their partner covers the class solo.
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
        const srcP = coveringSourcePeriod || period;
        const stObj = getSubStatusObj(day, srcP, coveringFor);
        if (stObj.status === 'accepted' && !hasCoordinatorPermissions()) {
            showToast(`🔒 Locked: Once accepted, only Admin or Academic Coordinator can unassign this substitution.`, true);
            return;
        }
        triggerCellResetAnimation(period, teacher);
        triggerCellResetAnimation(srcP, coveringFor);
        unassignSubstitute(srcP, coveringFor);
        showToast(`Reverted substitution: Sent class back to ${coveringFor}. ${teacher} freed.`);
        return;
    }

    // Check 2: Does this teacher have a substitute covering for them in this period?
    const assignedSub = state.substitutions[day]?.[period]?.[teacher];
    if (assignedSub) {
        const stObj = getSubStatusObj(day, period, teacher);
        if (stObj.status === 'accepted' && !hasCoordinatorPermissions()) {
            showToast(`🔒 Locked: Once accepted, only Admin or Academic Coordinator can unassign this substitution.`, true);
            return;
        }
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
            for (const p of periods) {
                for (const t of teachers) {
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

// --- ROLES, OFFICIATING (offAC / offCT), 10s ACCEPTANCE & DISPUTE ENGINE ---

function hasCoordinatorPermissions() {
    if (state.currentRole === 'admin' || state.currentRole === 'ac' || state.currentRole === 'asst_ac') {
        return true;
    }
    if (state.currentRole === 'teacher' && state.officiatingAC?.[state.day] === state.activeTeacher) {
        return true;
    }
    return false;
}

function getOfficiatingCTSectionsForTeacher(teacher, day = state.day) {
    const map = state.officiatingCT?.[day] || {};
    const sections = [];
    for (const [sec, t] of Object.entries(map)) {
        if (t === teacher && !state.absentTeachers.has(t)) {
            sections.push(sec);
        }
    }
    return sections;
}

function setActiveRole(role) {
    state.currentRole = role;
    saveStateToStorage();
    updateRolePermissionsUI();
    renderAll();
    const roleLabels = {
        admin: '🛡 Admin',
        ac: `🎓 AC (${PRIMARY_AC})`,
        asst_ac: `🎓 Asst AC (${ASSISTANT_AC})`,
        teacher: `👤 Teacher (${state.activeTeacher})`
    };
    showToast(`Switched active role to ${roleLabels[role] || role}`);
}
window.setActiveRole = setActiveRole;

function updateRolePermissionsUI() {
    const badgeBtn = document.getElementById('role-badge-btn');
    const teacherRow = document.getElementById('teacher-identity-row');
    const teacherSelect = document.getElementById('active-teacher-select');
    const disputeSettingRow = document.getElementById('admin-dispute-setting-row');
    const allowDisputesToggle = document.getElementById('allow-disputes-toggle');

    // Populate teacher select dropdown if needed
    if (teacherSelect && teacherSelect.options.length === 0) {
        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = `${t} (CT ${classTeacherMap[t] || '-'})`;
            teacherSelect.appendChild(opt);
        });
    }
    if (teacherSelect) {
        teacherSelect.value = state.activeTeacher;
    }

    // Highlight active role button in Settings
    document.querySelectorAll('.role-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === state.currentRole);
    });

    // Show/hide Teacher identity selector row in Settings
    if (teacherRow) {
        teacherRow.classList.toggle('hidden', state.currentRole !== 'teacher');
    }

    // Update header Role Badge button
    if (badgeBtn) {
        badgeBtn.classList.remove('role-teacher', 'role-off-ac');
        const isOffAC = state.currentRole === 'teacher' && state.officiatingAC?.[state.day] === state.activeTeacher;
        if (state.currentRole === 'admin') {
            badgeBtn.textContent = '🛡 Admin';
        } else if (state.currentRole === 'ac') {
            badgeBtn.textContent = '🎓 AC';
        } else if (state.currentRole === 'asst_ac') {
            badgeBtn.textContent = '🎓 Asst AC';
        } else if (isOffAC) {
            badgeBtn.textContent = `⚡ offAC (${state.activeTeacher.split(' ')[1] || state.activeTeacher})`;
            badgeBtn.classList.add('role-off-ac');
        } else {
            badgeBtn.textContent = `👤 ${state.activeTeacher.split(' ')[1] || state.activeTeacher}`;
            badgeBtn.classList.add('role-teacher');
        }
    }

    // Show/hide Admin/AC-only Dispute setting row
    const isCoord = hasCoordinatorPermissions();
    if (disputeSettingRow) {
        disputeSettingRow.classList.toggle('hidden', !isCoord);
    }
    if (allowDisputesToggle) {
        allowDisputesToggle.checked = state.settings.allowDisputes !== false;
    }
}

function renderOfficiatingBanners() {
    const acBanner = document.getElementById('off-ac-banner');
    const ctStrip = document.getElementById('off-ct-strip');
    const day = state.day;

    // 1. Dual-Absence Officiating AC (offAC) Contingency
    const bothACsAbsent = state.absentTeachers.has(PRIMARY_AC) && state.absentTeachers.has(ASSISTANT_AC);
    if (acBanner) {
        if (bothACsAbsent) {
            acBanner.classList.remove('hidden');
            const currentOffAC = state.officiatingAC?.[day];
            const validOffAC = currentOffAC && !state.absentTeachers.has(currentOffAC) ? currentOffAC : null;

            if (validOffAC) {
                acBanner.innerHTML = `
                    <div class="off-ac-banner-text">
                        <span>⚡</span>
                        <div>
                            <strong>Officiating AC (${day}): ${validOffAC}</strong>
                            <div style="font-size:11px; font-weight:500; opacity:0.9;">Both ${PRIMARY_AC} (AC) & ${ASSISTANT_AC} (Asst AC) are absent • ${validOffAC} inherits Coordinator permissions today.</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button class="btn-assign-off-ac" onclick="openOfficiatingModal('ac')">Change offAC</button>
                        <button class="btn-assign-off-ac" style="padding:5px 8px;" title="Clear Officiating AC" onclick="clearOfficiatingAssignment('ac')">✕</button>
                    </div>
                `;
            } else {
                acBanner.innerHTML = `
                    <div class="off-ac-banner-text">
                        <span>🚨</span>
                        <div>
                            <strong>Both Academic Coordinators Absent (${PRIMARY_AC} & ${ASSISTANT_AC})</strong>
                            <div style="font-size:11px; font-weight:500; opacity:0.9;">Assign an Officiating AC (offAC) to inherit coordinator permissions for ${day}.</div>
                        </div>
                    </div>
                    <button class="btn-assign-off-ac" onclick="openOfficiatingModal('ac')">+ Assign Officiating AC</button>
                `;
            }
        } else {
            acBanner.classList.add('hidden');
        }
    }

    // 2. Officiating Class Teacher (offCT) Strip when any CT is marked absent
    if (ctStrip) {
        const absentCTs = teachers.filter(t => state.absentTeachers.has(t) && classTeacherMap[t]);
        if (absentCTs.length > 0) {
            ctStrip.classList.remove('hidden');
            let html = `<span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.3px; margin-right:2px;">Absent CTs:</span>`;
            absentCTs.forEach(absentCT => {
                const section = classTeacherMap[absentCT];
                const assignedOffCT = state.officiatingCT?.[day]?.[section];
                const validOffCT = assignedOffCT && !state.absentTeachers.has(assignedOffCT) ? assignedOffCT : null;
                const shortAbsent = absentCT.split(' ')[1] || absentCT;

                if (validOffCT) {
                    html += `
                        <div class="off-ct-chip assigned" onclick="openOfficiatingModal('ct', '${section}', '${absentCT}')" title="Click to change Officiating Class Teacher for ${section}">
                            <span>🏫 <b>${section}</b> (${shortAbsent}) → 📋 <b>${validOffCT}</b></span>
                            <span style="margin-left:4px; opacity:0.75; font-weight:700;" title="Remove offCT" onclick="event.stopPropagation(); clearOfficiatingAssignment('ct', '${section}')">✕</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="off-ct-chip" onclick="openOfficiatingModal('ct', '${section}', '${absentCT}')" title="Assign Officiating Class Teacher for Class ${section}">
                            <span>⚠ CT <b>${section}</b> (${shortAbsent})</span>
                            <span style="text-decoration:underline; margin-left:3px;">+ Assign offCT</span>
                        </div>
                    `;
                }
            });
            ctStrip.innerHTML = html;
        } else {
            ctStrip.classList.add('hidden');
        }
    }
}

function openOfficiatingModal(type, section = null, absentCT = null) {
    const modal = document.getElementById('officiating-modal');
    const overlay = document.getElementById('officiating-overlay');
    const titleEl = document.getElementById('officiating-modal-title');
    const subtitleEl = document.getElementById('officiating-modal-subtitle');
    const listEl = document.getElementById('officiating-teacher-list');
    if (!modal || !overlay || !listEl) return;

    pendingOfficiatingTarget = { type, section, absentCT };

    if (type === 'ac') {
        if (titleEl) titleEl.textContent = '⚡ Assign Officiating AC (offAC)';
        if (subtitleEl) subtitleEl.textContent = `Both ${PRIMARY_AC} (AC) and ${ASSISTANT_AC} (Asst AC) are absent on ${state.day}. Select a present teacher to inherit Academic Coordinator permissions for the day.`;
    } else {
        if (titleEl) titleEl.textContent = `🏫 Assign Officiating CT (Class ${section})`;
        if (subtitleEl) subtitleEl.textContent = `${absentCT} (Class Teacher of ${section}) is absent on ${state.day}. Select a present teacher to serve as Officiating Class Teacher (offCT) for ${section}.`;
    }

    const candidates = teachers
        .filter(t => !state.absentTeachers.has(t))
        .map(t => {
            const stats = getTeacherDailyStats(t, state.day);
            const isGoldenFree = (state.schedule[state.day]?.['GOLDEN HOUR']?.[t] || 'Free') === 'Free';
            const teachesSec = section ? doesTeacherTeachSection(t, section, state.day) : false;
            return { name: t, stats, isGoldenFree, teachesSec };
        })
        .sort((a, b) => {
            if (type === 'ct' && a.teachesSec !== b.teachesSec) return a.teachesSec ? -1 : 1;
            return a.stats.teachingLoad - b.stats.teachingLoad;
        });

    listEl.innerHTML = '';
    candidates.forEach(c => {
        const currentOffAC = state.officiatingAC?.[state.day];
        const currentOffCT = section ? state.officiatingCT?.[state.day]?.[section] : null;
        const isSelected = (type === 'ac' && currentOffAC === c.name) || (type === 'ct' && currentOffCT === c.name);

        const row = document.createElement('div');
        row.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:11px 14px; background:var(--bg-color); border:1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-color)'}; border-radius:10px; cursor:pointer;`;
        row.innerHTML = `
            <div>
                <strong style="color:var(--text-primary); font-size:13px;">${isSelected ? '✓ ' : '🟢 '}${c.name}</strong>
                <span class="ct-badge-mini">Own CT: ${classTeacherMap[c.name] || '-'}</span>
                ${c.teachesSec ? `<span class="reg-affinity-tag">Teaches ${section}</span>` : ''}
            </div>
            <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">Load: ${c.stats.teachingLoad}/${c.stats.totalSlots} pds</span>
        `;
        row.addEventListener('click', () => selectOfficiatingTeacher(c.name));
        listEl.appendChild(row);
    });

    modal.classList.remove('hidden');
    overlay.classList.add('active');
}
window.openOfficiatingModal = openOfficiatingModal;

function closeOfficiatingModal() {
    const modal = document.getElementById('officiating-modal');
    const overlay = document.getElementById('officiating-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    pendingOfficiatingTarget = null;
}
window.closeOfficiatingModal = closeOfficiatingModal;

function selectOfficiatingTeacher(teacherName) {
    if (!pendingOfficiatingTarget) return;
    const { type, section } = pendingOfficiatingTarget;
    const day = state.day;

    if (type === 'ac') {
        if (!state.officiatingAC) state.officiatingAC = {};
        state.officiatingAC[day] = teacherName;
        showToast(`Assigned ${teacherName} as Officiating AC (offAC) for ${day}`);
    } else if (type === 'ct' && section) {
        if (!state.officiatingCT) state.officiatingCT = {};
        if (!state.officiatingCT[day]) state.officiatingCT[day] = {};
        state.officiatingCT[day][section] = teacherName;
        showToast(`Assigned ${teacherName} as Officiating CT (offCT) for Class ${section}`);
    }

    closeOfficiatingModal();
    saveStateToStorage();
    updateRolePermissionsUI();
    renderAll();
}
window.selectOfficiatingTeacher = selectOfficiatingTeacher;

function clearOfficiatingAssignment(type, section = null) {
    const day = state.day;
    if (type === 'ac' && state.officiatingAC?.[day]) {
        delete state.officiatingAC[day];
        showToast(`Cleared Officiating AC for ${day}`);
    } else if (type === 'ct' && section && state.officiatingCT?.[day]?.[section]) {
        delete state.officiatingCT[day][section];
        showToast(`Cleared Officiating CT for Class ${section}`);
    }
    saveStateToStorage();
    updateRolePermissionsUI();
    renderAll();
}
window.clearOfficiatingAssignment = clearOfficiatingAssignment;

function getSubStatusObj(day, period, absentTeacher) {
    return state.subStatus?.[day]?.[period]?.[absentTeacher] || { status: 'pending' };
}

function clearSubStatusAndTimer(day, period, absentTeacher) {
    const key = `${day}::${period}::${absentTeacher}`;
    const timer = activeAcceptTimers.get(key);
    if (timer) {
        clearInterval(timer.intervalId);
        activeAcceptTimers.delete(key);
    }
    if (state.subStatus?.[day]?.[period]?.[absentTeacher]) {
        delete state.subStatus[day][period][absentTeacher];
    }
}

function startAcceptSubCountdown(period, absentTeacher) {
    const day = state.day;
    const subTeacher = state.substitutions?.[day]?.[period]?.[absentTeacher];
    if (!subTeacher) return;

    const existingStatus = getSubStatusObj(day, period, absentTeacher);
    if (existingStatus.status === 'accepted') return;

    const key = `${day}::${period}::${absentTeacher}`;
    if (activeAcceptTimers.has(key)) return;

    // Clear any prior dispute state when teacher clicks Accept
    if (state.subStatus?.[day]?.[period]?.[absentTeacher]) {
        delete state.subStatus[day][period][absentTeacher];
    }

    const entry = {
        remaining: 10,
        day,
        period,
        absentTeacher,
        subTeacher,
        intervalId: null
    };

    entry.intervalId = setInterval(() => {
        entry.remaining -= 1;
        if (entry.remaining > 0) {
            // Update countdown label live
            const btn = document.querySelector(`[data-accept-timer="${key}"]`);
            if (btn) {
                btn.innerHTML = `⏳ Confirming ${entry.remaining}s • <u>Undo</u>`;
            }
        } else {
            clearInterval(entry.intervalId);
            activeAcceptTimers.delete(key);
            if (!state.subStatus[day]) state.subStatus[day] = {};
            if (!state.subStatus[day][period]) state.subStatus[day][period] = {};
            state.subStatus[day][period][absentTeacher] = {
                status: 'accepted',
                acceptedBy: subTeacher,
                acceptedAt: Date.now()
            };
            saveStateToStorage();
            renderAll();
            showToast(`🔒 Substitution (${period} • ${subTeacher}) accepted & reported across the board!`, true);
        }
    }, 1000);

    activeAcceptTimers.set(key, entry);
    renderSubstitutions();
}
window.startAcceptSubCountdown = startAcceptSubCountdown;

function cancelAcceptSub(period, absentTeacher) {
    const day = state.day;
    const key = `${day}::${period}::${absentTeacher}`;
    const timer = activeAcceptTimers.get(key);
    if (timer) {
        clearInterval(timer.intervalId);
        activeAcceptTimers.delete(key);
        renderSubstitutions();
        showToast(`Acceptance cancelled within 10s window.`);
    }
}
window.cancelAcceptSub = cancelAcceptSub;

function revokeAcceptedSub(period, absentTeacher) {
    if (!hasCoordinatorPermissions()) {
        showToast(`Locked: Only Admin or Academic Coordinator can remove a locked acceptance.`, true);
        return;
    }
    const day = state.day;
    clearSubStatusAndTimer(day, period, absentTeacher);
    saveStateToStorage();
    renderAll();
    showToast(`Coordinator unlocked acceptance for ${period}.`);
}
window.revokeAcceptedSub = revokeAcceptedSub;

function openDisputeModal(period, absentTeacher) {
    if (state.settings.allowDisputes === false) {
        showToast(`Disputes are currently disabled by Admin / Academic Coordinator.`);
        return;
    }
    const day = state.day;
    const subTeacher = state.substitutions?.[day]?.[period]?.[absentTeacher];
    if (!subTeacher) return;

    const statusObj = getSubStatusObj(day, period, absentTeacher);
    if (statusObj.status === 'accepted') {
        showToast(`Locked: Accepted substitutions cannot be disputed.`);
        return;
    }

    pendingDisputeTarget = { day, period, absentTeacher, subTeacher };
    const modal = document.getElementById('dispute-modal');
    const overlay = document.getElementById('dispute-overlay');
    const descEl = document.getElementById('dispute-modal-desc');
    const inputEl = document.getElementById('dispute-reason-input');

    const baseTask = state.baseSchedule[day]?.[period]?.[absentTeacher] || 'Class';
    if (descEl) {
        descEl.innerHTML = `Flagging substitution for <b>${subTeacher}</b> covering <b>${baseTask}</b> (${period} • Absent: ${absentTeacher}). Provide an optional reason for the Admin / Academic Coordinator:`;
    }
    if (inputEl) {
        inputEl.value = statusObj.reason || '';
    }

    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}
window.openDisputeModal = openDisputeModal;

function closeDisputeModal() {
    const modal = document.getElementById('dispute-modal');
    const overlay = document.getElementById('dispute-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    pendingDisputeTarget = null;
}
window.closeDisputeModal = closeDisputeModal;

function submitDisputeReason() {
    if (!pendingDisputeTarget) return;
    const { day, period, absentTeacher, subTeacher } = pendingDisputeTarget;
    const inputEl = document.getElementById('dispute-reason-input');
    const reason = inputEl ? inputEl.value.trim() : '';

    // Cancel any running 10s acceptance countdown on this slot
    const key = `${day}::${period}::${absentTeacher}`;
    if (activeAcceptTimers.has(key)) {
        clearInterval(activeAcceptTimers.get(key).intervalId);
        activeAcceptTimers.delete(key);
    }

    if (!state.subStatus[day]) state.subStatus[day] = {};
    if (!state.subStatus[day][period]) state.subStatus[day][period] = {};
    state.subStatus[day][period][absentTeacher] = {
        status: 'disputed',
        disputedBy: subTeacher,
        reason: reason || 'Requested review / reassignment',
        disputedAt: Date.now()
    };

    closeDisputeModal();
    saveStateToStorage();
    renderAll();
    showToast(`⚑ Substitution (${period}) flagged for Coordinator review.`, true);
}
window.submitDisputeReason = submitDisputeReason;

function dismissDispute(period, absentTeacher) {
    if (!hasCoordinatorPermissions()) {
        showToast(`Only Admin or Academic Coordinator can clear a dispute.`);
        return;
    }
    clearSubStatusAndTimer(state.day, period, absentTeacher);
    saveStateToStorage();
    renderAll();
    showToast(`Cleared dispute flag for ${period}.`);
}
window.dismissDispute = dismissDispute;

// --- RENDER FUNCTIONS ---
function renderAll() {
    updateRolePermissionsUI();
    renderOfficiatingBanners();
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
        const ctSec = classTeacherMap[teacher];
        const isOffAC = !isAbsent && state.officiatingAC?.[state.day] === teacher && state.absentTeachers.has(PRIMARY_AC) && state.absentTeachers.has(ASSISTANT_AC);
        const offCTSecs = !isAbsent ? getOfficiatingCTSectionsForTeacher(teacher, state.day) : [];

        let roleSubtag = ctSec ? `CT ${ctSec}` : '';
        if (teacher === PRIMARY_AC) roleSubtag = `AC • ${roleSubtag}`;
        else if (teacher === ASSISTANT_AC) roleSubtag = `Asst AC • ${roleSubtag}`;
        if (isOffAC) roleSubtag = `⚡ offAC`;
        else if (offCTSecs.length > 0) roleSubtag = `offCT ${offCTSecs.join(',')}`;

        const el = document.createElement('div');
        el.className = `teacher-avatar ${isAbsent ? 'absent' : ''}`;
        el.innerHTML = `
            <div class="avatar-circle">${teacher.charAt(0)}</div>
            <span class="name" style="font-size:11px; margin-top:4px; font-weight:600;">${teacher.split(' ')[1] || teacher}</span>
            <span style="font-size:9px; color:var(--text-secondary); font-weight:600;">${roleSubtag}</span>
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

        const ctSec = classTeacherMap[teacher];
        const isOffAC = !isAbsent && state.officiatingAC?.[state.day] === teacher && state.absentTeachers.has(PRIMARY_AC) && state.absentTeachers.has(ASSISTANT_AC);
        const offCTSecs = !isAbsent ? getOfficiatingCTSectionsForTeacher(teacher, state.day) : [];

        let teacherBadges = '';
        if (teacher === PRIMARY_AC) {
            teacherBadges += `<span class="ct-badge-mini" style="background:rgba(0,122,255,0.12); color:var(--accent-blue);">AC</span>`;
        } else if (teacher === ASSISTANT_AC) {
            teacherBadges += `<span class="ct-badge-mini" style="background:rgba(0,122,255,0.12); color:var(--accent-blue);">Asst AC</span>`;
        }
        if (ctSec) {
            teacherBadges += `<span class="ct-badge-mini">CT ${ctSec}</span>`;
        }
        if (isOffAC) {
            teacherBadges += `<span class="off-badge-mini">⚡ offAC</span>`;
        }
        offCTSecs.forEach(sec => {
            teacherBadges += `<span class="off-badge-mini">📋 offCT ${sec}</span>`;
        });
        
        html += `<tr class="${isAbsent ? 'row-absent' : ''}">`;
        html += `<td class="teacher-cell" data-teacher="${teacher}"><div>${teacher}</div><div style="margin-top:2px; display:flex; flex-wrap:wrap; gap:2px;">${teacherBadges}</div></td>`;
        
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
                const subStatusInfo = getSubStatusObj(state.day, period, teacher);
                const statusIcon = subStatusInfo.status === 'accepted' ? '🔒 ' : (subStatusInfo.status === 'disputed' ? '⚑ ' : '↳ ');
                cellContent = `
                    <div class="cell-covered-content">
                        <span class="covered-task">${baseTask}</span>
                        <span class="covered-by-tag">${statusIcon}${assignedSub.split(' ')[1] || assignedSub}</span>
                    </div>
                `;
                cellTitle = `Covered by ${assignedSub} (${subStatusInfo.status}). Drag to reassign substitute, or tap to manage.`;
                isDraggable = true;
                clickHandler = state.isEditMode 
                    ? `onclick="handleGridInteraction('${period}', '${teacher}')"` 
                    : `onclick="openBottomSheet('${period}', '${teacher}')"`;

            } else if (coveringFor) {
                cellClasses.push('cell-sub-active');
                const periodNote = coveringSourcePeriod !== period ? ` [from ${coveringSourcePeriod}]` : '';
                const subStatusInfo = getSubStatusObj(state.day, coveringSourcePeriod || period, coveringFor);
                const statusBadgePrefix = subStatusInfo.status === 'accepted' ? '🔒 ' : (subStatusInfo.status === 'disputed' ? '⚑ ' : '');
                cellContent = `
                    <div class="cell-sub-content">
                        <span class="sub-task">${task}</span>
                        <span class="sub-badge">${statusBadgePrefix}Sub (${coveringFor.split(' ')[1] || coveringFor})</span>
                    </div>
                `;
                cellTitle = `Substituting for ${coveringFor}${periodNote} (${subStatusInfo.status}). Drag to another teacher to reassign, or drag back to ${coveringFor} to unassign.`;
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

// --- PRIORITY PREFERENCE MATRIX & SUBJECT/GRADE AFFINITY ENGINE ---
const teacherPreferences = {
    'Mr. Stephen': { dept: 'STEM & Math', cluster: 'STEM', subjects: ['MATH', 'PHY'], grades: [7, 8, 9, 10, 11] },
    'Mrs. Midha':  { dept: 'English & Lit', cluster: 'HUMANITIES', subjects: ['ENG', 'LIT'], grades: [6, 7, 8, 9, 10, 11] },
    'Mrs. Pahwa':  { dept: 'Sciences', cluster: 'STEM', subjects: ['CHEM', 'SCI'], grades: [7, 8, 9, 10, 11, 12] },
    'Mrs. Bage':   { dept: 'Bio & EVS', cluster: 'STEM', subjects: ['BIO', 'SCI', 'EVS'], grades: [5, 6, 8, 9, 11, 12] },
    'Mr. Adams':   { dept: 'Social Studies', cluster: 'HUMANITIES', subjects: ['HIST', 'GEO', 'SST', 'CIV'], grades: [7, 8, 9, 10, 11] },
    'Mrs. Baker':  { dept: 'Languages', cluster: 'HUMANITIES', subjects: ['HINDI', 'SKT'], grades: [6, 7, 8, 9, 10] },
    'Ms. Clark':   { dept: 'Computer & AI', cluster: 'STEM', subjects: ['COMP', 'IT', 'AI'], grades: [7, 8, 9, 10, 11] },
    'Mr. Davis':   { dept: 'PE & Sports', cluster: 'HOLISTIC', subjects: ['P.E.', 'GAMES', 'YOGA'], grades: [6, 7, 8, 9, 10, 11] },
    'Mrs. Evans':  { dept: 'Arts & Music', cluster: 'HOLISTIC', subjects: ['ART', 'CRAFT', 'MUSIC'], grades: [5, 6, 7, 8, 9] }
};

function parseTaskDetails(task) {
    if (!task || task === 'Free' || task === '-') {
        return { subjectPrefix: '', section: '', grade: null, dept: 'General', cluster: 'GENERAL' };
    }
    const clean = task.trim().toUpperCase();
    const parts = clean.split(/\s+/);
    const subjectPrefix = parts[0] || '';
    const section = extractClassSection(clean) || '';
    const gradeMatch = section.match(/^(\d{1,2})/);
    const grade = gradeMatch ? parseInt(gradeMatch[1], 10) : null;

    let dept = 'General';
    let cluster = 'GENERAL';
    for (const prof of Object.values(teacherPreferences)) {
        if (prof.subjects.includes(subjectPrefix)) {
            dept = prof.dept;
            cluster = prof.cluster;
            break;
        }
    }
    return { subjectPrefix, section, grade, dept, cluster };
}

function getTeacherDailyStats(teacher, day, customSchedule = null) {
    const sched = customSchedule || state.schedule[day] || {};
    let teachingLoad = 0;
    let totalSlots = 0;
    periods.forEach(p => {
        if (p === 'BREAKFAST BREAK' || p === 'BREAKFAST') return;
        totalSlots++;
        const t = sched[p]?.[teacher];
        if (t && t !== 'Free' && t !== '-') {
            teachingLoad++;
        }
    });
    return {
        teachingLoad,
        freePeriods: Math.max(0, totalSlots - teachingLoad),
        totalSlots
    };
}

function doesTeacherTeachSection(teacher, section, day) {
    if (!section) return false;
    const dayBase = state.baseSchedule[day] || {};
    for (const p of periods) {
        const task = dayBase[p]?.[teacher];
        if (task && extractClassSection(task) === section) {
            return true;
        }
    }
    return false;
}

function evaluateTeacherAffinity(subTeacher, taskToCover, period, day = state.day, customSchedule = null) {
    const pref = teacherPreferences[subTeacher] || { dept: 'General', cluster: 'GENERAL', subjects: [], grades: [] };
    const taskInfo = parseTaskDetails(taskToCover);
    const stats = getTeacherDailyStats(subTeacher, day, customSchedule);

    let score = 0;
    const reasons = [];
    let primaryBadge = '';

    // 1. Subject & Department Affinity
    if (taskInfo.subjectPrefix && pref.subjects.includes(taskInfo.subjectPrefix)) {
        score += 48;
        reasons.push('Subject Specialist');
        primaryBadge = '★ Subject Match';
    } else if (taskInfo.cluster && pref.cluster === taskInfo.cluster) {
        score += 26;
        reasons.push(`${pref.dept} Affinity`);
        if (!primaryBadge) primaryBadge = '◆ Dept Match';
    }

    // 2. Class Section & Grade Band Familiarity
    if (taskInfo.section && doesTeacherTeachSection(subTeacher, taskInfo.section, day)) {
        score += 24;
        reasons.push(`Teaches ${taskInfo.section}`);
        if (!primaryBadge) primaryBadge = `Familiar (${taskInfo.section})`;
    } else if (taskInfo.grade && pref.grades.includes(taskInfo.grade)) {
        score += 14;
        reasons.push(`Grade ${taskInfo.grade} Band`);
        if (!primaryBadge) primaryBadge = `Grade ${taskInfo.grade} Fit`;
    }

    // 3. Workload Balance Bonus
    const loadBonus = Math.max(0, (stats.totalSlots - stats.teachingLoad) * 4);
    score += loadBonus;

    if (!primaryBadge) {
        primaryBadge = stats.teachingLoad <= 4 ? '⚖ Light Load' : 'Available';
    }

    return {
        score,
        reasons,
        primaryBadge,
        dept: pref.dept,
        taskDept: taskInfo.dept,
        teachingLoad: stats.teachingLoad,
        freePeriods: stats.freePeriods,
        totalSlots: stats.totalSlots
    };
}

function renderSubstitutions() {
    const conflictList = document.getElementById('conflict-list');
    const badge = document.getElementById('substitutions-badge');
    const autoBtn = document.getElementById('auto-resolve-btn');
    const summaryBar = document.getElementById('register-summary-bar');
    const statsPills = document.getElementById('register-stats-pills');
    if(!conflictList || !badge) return;
    
    conflictList.innerHTML = '';
    let conflicts = 0;
    let resolvedCount = 0;
    let acceptedCount = 0;
    let disputedCount = 0;
    let totalAbsences = 0;
    const rowsData = [];

    periods.forEach(period => {
        if (period === 'BREAKFAST BREAK' || period === 'BREAKFAST') return;
        teachers.forEach(teacher => {
            const isAbsent = state.absentTeachers.has(teacher);
            if (!isAbsent) return;

            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
            if (!baseTask || baseTask === 'Free' || baseTask === '' || baseTask === '-') return;

            totalAbsences++;
            const subTeacher = state.substitutions[state.day]?.[period]?.[teacher];
            const statusObj = getSubStatusObj(state.day, period, teacher);
            if (subTeacher) {
                resolvedCount++;
                if (statusObj.status === 'accepted') acceptedCount++;
                if (statusObj.status === 'disputed') disputedCount++;
            } else {
                conflicts++;
            }
            rowsData.push({
                period,
                absentTeacher: teacher,
                baseTask,
                subTeacher: subTeacher || null,
                statusObj
            });
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
        if (summaryBar) summaryBar.classList.add('hidden');
        conflictList.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:48px; margin-bottom:10px;">🎉</div>
                <h3 style="color:var(--text-primary); margin-bottom:5px;">All Clear!</h3>
                <p style="color:var(--text-secondary); font-size:14px;">No absences marked for ${state.day}. Mark a teacher absent on the Grid tab to populate the Daily Substitution Register.</p>
            </div>
        `;
        return;
    }

    if (summaryBar && statsPills) {
        summaryBar.classList.remove('hidden');
        const pct = Math.round((resolvedCount / totalAbsences) * 100);
        statsPills.innerHTML = `
            <span class="reg-stat-pill">📋 Total: <b>${totalAbsences}</b></span>
            <span class="reg-stat-pill stat-pending">⚠ Pending: <b>${conflicts}</b></span>
            <span class="reg-stat-pill stat-covered">✓ Covered: <b>${resolvedCount} (${pct}%)</b></span>
            ${acceptedCount > 0 ? `<span class="reg-stat-pill stat-covered">🔒 Accepted: <b>${acceptedCount}</b></span>` : ''}
            ${disputedCount > 0 ? `<span class="reg-stat-pill stat-pending">⚑ Disputed: <b>${disputedCount}</b></span>` : ''}
        `;
    }

    const filteredRows = rowsData.filter(r => {
        if (registerFilter === 'pending') return !r.subTeacher;
        if (registerFilter === 'covered') return Boolean(r.subTeacher);
        return true;
    });

    if (filteredRows.length === 0) {
        conflictList.innerHTML = `
            <div style="text-align:center; padding: 30px 16px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:14px; color:var(--text-secondary); font-size:13px;">
                No ${registerFilter} substitution entries for ${state.day}.
            </div>
        `;
        return;
    }

    const isCoord = hasCoordinatorPermissions();
    const disputesEnabled = state.settings.allowDisputes !== false;

    let tableHtml = `
        <div class="sub-register-wrapper">
            <table class="sub-register-table">
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Class & Dept</th>
                        <th>Absent Teacher</th>
                        <th>Assigned Substitute</th>
                        <th>Acceptance & Status</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredRows.forEach(row => {
        const { period, absentTeacher, baseTask, subTeacher, statusObj } = row;
        const taskInfo = parseTaskDetails(baseTask);

        if (subTeacher) {
            const affinity = evaluateTeacherAffinity(subTeacher, baseTask, period, state.day);
            const coPartners = getCoTeachingPartners(state.day, period, subTeacher);
            const isSplitSub = coPartners.length > 0;
            const timerKey = `${state.day}::${period}::${absentTeacher}`;
            const activeTimer = activeAcceptTimers.get(timerKey);

            // Check whether current user can press Accept/Dispute for this row
            const canTeacherAct = (state.currentRole !== 'teacher') || (state.activeTeacher === subTeacher) || isCoord;

            let statusCellHtml = '';
            if (activeTimer) {
                statusCellHtml = `
                    <button class="btn-accept-countdown" data-accept-timer="${timerKey}" onclick="cancelAcceptSub('${period}', '${absentTeacher}')" title="Click within 10 seconds to undo acceptance before server lock-in">
                        ⏳ Confirming ${activeTimer.remaining}s • <u>Undo</u>
                    </button>
                `;
            } else if (statusObj.status === 'accepted') {
                statusCellHtml = `
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span class="badge-accepted-locked" title="Accepted by ${statusObj.acceptedBy || subTeacher}. Locked across the board.">🔒 Accepted</span>
                        ${isSplitSub ? `<span class="reg-status-badge status-split" title="Split from co-teaching">👥 Split</span>` : ''}
                    </div>
                `;
            } else if (statusObj.status === 'disputed') {
                statusCellHtml = `
                    <div style="display:flex; flex-direction:column; align-items:flex-start; gap:3px;">
                        <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                            <span class="badge-disputed">⚑ Disputed</span>
                            ${canTeacherAct ? `<button class="btn-accept-sub" onclick="startAcceptSubCountdown('${period}', '${absentTeacher}')">✓ Accept</button>` : ''}
                        </div>
                        <div class="dispute-reason-note" title="${statusObj.reason}">“${statusObj.reason}”</div>
                    </div>
                `;
            } else {
                const baseBadge = isSplitSub
                    ? `<span class="reg-status-badge status-split" title="Split from co-teaching with ${coPartners.join(', ')}">👥 Split Sub</span>`
                    : `<span class="reg-status-badge status-covered">✓ Assigned</span>`;

                statusCellHtml = `
                    <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        ${baseBadge}
                        ${canTeacherAct ? `<button class="btn-accept-sub" onclick="startAcceptSubCountdown('${period}', '${absentTeacher}')" title="Accept substitution (10s undo timer before permanent lock)">✓ Accept</button>` : ''}
                        ${(canTeacherAct && disputesEnabled) ? `<button class="btn-dispute-sub" onclick="openDisputeModal('${period}', '${absentTeacher}')" title="Dispute this substitution with an optional note">⚑ Dispute</button>` : ''}
                    </div>
                `;
            }

            // Build Actions column respecting lock-in permissions
            let actionsHtml = '';
            if (statusObj.status === 'accepted' && !isCoord) {
                actionsHtml = `
                    <div class="reg-actions-cell">
                        <span style="font-size:11px; color:var(--text-secondary); font-weight:600;" title="Locked after 10s acceptance. Only Admin or Academic Coordinator can remove or reassign.">🔒 Locked</span>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div class="reg-actions-cell">
                        ${(statusObj.status === 'accepted' && isCoord) ? `<button class="btn-reg-reassign" style="color:var(--accent-orange);" onclick="revokeAcceptedSub('${period}', '${absentTeacher}')" title="Coordinator: Remove locked acceptance">🔓 Unlock</button>` : ''}
                        ${(statusObj.status === 'disputed' && isCoord) ? `<button class="btn-reg-reassign" onclick="dismissDispute('${period}', '${absentTeacher}')" title="Coordinator: Dismiss dispute flag">Clear ⚑</button>` : ''}
                        <button class="btn-reg-reassign" onclick="openBottomSheet('${period}', '${absentTeacher}')">Reassign</button>
                        <button class="btn-reg-unassign" title="Unassign Substitute" onclick="unassignSubstitute('${period}', '${absentTeacher}')">✕</button>
                    </div>
                `;
            }

            tableHtml += `
                <tr class="reg-row-covered">
                    <td><span class="reg-period-badge">${period}</span></td>
                    <td>
                        <span class="reg-class-pill">${baseTask}</span>
                        <span class="reg-dept-tag">${taskInfo.dept}</span>
                    </td>
                    <td style="color:var(--text-secondary); text-decoration:line-through;">${absentTeacher}</td>
                    <td>
                        <strong style="color:var(--text-primary);">${subTeacher}</strong>
                        <span class="reg-affinity-tag" title="Score: ${affinity.score} pts • Load: ${affinity.teachingLoad}/${affinity.totalSlots} pds">${affinity.primaryBadge}</span>
                    </td>
                    <td>${statusCellHtml}</td>
                    <td>${actionsHtml}</td>
                </tr>
            `;
        } else {
            tableHtml += `
                <tr class="reg-row-pending">
                    <td><span class="reg-period-badge">${period}</span></td>
                    <td>
                        <span class="reg-class-pill" style="color:var(--accent-pink);">${baseTask}</span>
                        <span class="reg-dept-tag">${taskInfo.dept}</span>
                    </td>
                    <td><strong style="color:var(--text-primary);">${absentTeacher}</strong></td>
                    <td><span style="color:var(--text-secondary); font-style:italic; font-size:12px;">Unassigned</span></td>
                    <td><span class="reg-status-badge status-pending">⚠ Needs Sub</span></td>
                    <td>
                        <div class="reg-actions-cell">
                            <button class="btn-reg-assign" onclick="openBottomSheet('${period}', '${absentTeacher}')">+ Assign Sub</button>
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    conflictList.innerHTML = tableHtml;
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
    state.subStatus[day] = {};

    saveStateToStorage();
    updateUndoUI();
    showToast(`Schedule reset to baseline.`);
    renderAll();
}

function openBottomSheet(period, targetTeacher) {
    const existingStatus = getSubStatusObj(state.day, period, targetTeacher);
    if (existingStatus.status === 'accepted' && !hasCoordinatorPermissions()) {
        showToast(`🔒 Locked: Once accepted, only Admin or Academic Coordinator can modify this substitution.`, true);
        return;
    }

    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const list = document.getElementById('sheet-teacher-list');
    if(!sheet || !overlay || !list) return;

    const taskToCover = state.baseSchedule[state.day]?.[period]?.[targetTeacher] || 'Class';
    list.innerHTML = `<p style="margin-bottom:14px; font-size:13px; color:var(--text-secondary);">Assigning substitute for <b>${targetTeacher}</b> • <b>${taskToCover}</b> (${period})</p>`;
    
    const available = [];
    const coTeachSplit = [];
    const busy = [];
    
    teachers.forEach(t => {
        if (state.absentTeachers.has(t)) return;
        const currentTask = state.schedule[state.day]?.[period]?.[t];
        const affinity = evaluateTeacherAffinity(t, taskToCover, period, state.day);
        if (!currentTask || currentTask === 'Free') {
            available.push({ name: t, affinity });
        } else if (isActivelyCoTeaching(state.day, period, t)) {
            coTeachSplit.push({ name: t, task: currentTask, affinity });
        } else {
            busy.push({ name: t, task: currentTask, affinity });
        }
    });

    // Sort available and co-teaching candidates by Priority Preference Matrix affinity score
    available.sort((a, b) => b.affinity.score - a.affinity.score);
    coTeachSplit.sort((a, b) => b.affinity.score - a.affinity.score);
    
    available.forEach(item => {
        const { name, affinity } = item;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:8px; background:var(--surface-color); border-radius:10px; border:1px solid var(--accent-blue); cursor:pointer;" 
                 onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${name}')">
                <div>
                    <strong style="color:var(--text-primary); font-size:14px;">🟢 ${name}</strong>
                    <span class="reg-affinity-tag">${affinity.primaryBadge}</span>
                </div>
                <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">Load: ${affinity.teachingLoad}/${affinity.totalSlots} pds</span>
            </div>`;
    });

    coTeachSplit.forEach(item => {
        const { name, task, affinity } = item;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:8px; background:var(--surface-color); border-radius:10px; border:1px solid #8b5cf6; cursor:pointer;" 
                 onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${name}')">
                <div>
                    <strong style="color:var(--text-primary); font-size:14px;">🟣 ${name}</strong>
                    <span class="reg-affinity-tag" style="background:rgba(139,92,246,0.14); color:#7c3aed;">👥 Split Co-Teach (${task})</span>
                </div>
                <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">${affinity.primaryBadge}</span>
            </div>`;
    });
    
    busy.forEach(item => {
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:11px 14px; margin-bottom:8px; background:var(--bg-color); border:1px solid var(--border-color); border-radius:10px; color:var(--text-secondary); cursor:pointer;" 
                 onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${item.name}')">
                <span>🟡 ${item.name} (In ${item.task})</span>
                <span style="font-size:11px;">Displaces to Limbo</span>
            </div>`;
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
    const existingStatus = getSubStatusObj(state.day, period, absentTeacher);
    if (existingStatus.status === 'accepted' && !hasCoordinatorPermissions()) {
        showToast(`🔒 Locked: Once accepted, only Admin or Academic Coordinator can reassign this substitution.`, true);
        return;
    }

    clearRedoStacks();
    clearSubStatusAndTimer(state.day, period, absentTeacher);
    
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
    const existingStatus = getSubStatusObj(state.day, period, absentTeacher);
    if (existingStatus.status === 'accepted' && !hasCoordinatorPermissions()) {
        showToast(`🔒 Locked: Once accepted, only Admin or Academic Coordinator can unassign this substitution.`, true);
        return;
    }

    clearRedoStacks();
    clearSubStatusAndTimer(state.day, period, absentTeacher);
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

// --- SMART SOLVER & MULTI-OPTION AUTO-RESOLVE ENGINE (MAX 3 SOLUTIONS) ---
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

function generateStrategySolution(strategyKey, unresolvedList, day) {
    // Deep clone current day schedule to simulate load updates accurately
    const simSchedule = JSON.parse(JSON.stringify(state.schedule[day] || {}));
    const assignments = [];
    let splitsCount = 0;
    let totalAffinity = 0;

    unresolvedList.forEach((need, needIdx) => {
        const { period, absentTeacher, task } = need;
        const candidates = [];

        teachers.forEach(t => {
            if (state.absentTeachers.has(t) || t === absentTeacher) return;
            const currentTask = simSchedule[period]?.[t];
            const isFree = (!currentTask || currentTask === 'Free');

            // Check if t is actively co-teaching in simSchedule
            const partners = getCoTeachingPartners(day, period, t);
            const baseT = state.baseSchedule[day]?.[period]?.[t];
            const isCoTeachActive = (!isFree && partners.length > 0 && currentTask === baseT && partners.some(p => simSchedule[period]?.[p] === baseT && !state.absentTeachers.has(p)));

            if (!isFree && !isCoTeachActive) return;
            if (strategyKey === 'minimal-splits' && isCoTeachActive) return;

            const affinity = evaluateTeacherAffinity(t, task, period, day, simSchedule);
            candidates.push({
                teacher: t,
                isFree,
                isSplit: isCoTeachActive,
                previousTaskForSub: currentTask || 'Free',
                affinity
            });
        });

        if (candidates.length === 0) return;

        // Sort candidates based on strategy heuristic
        candidates.sort((a, b) => {
            // Always prefer Free teachers over Co-Teach Splits first
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;

            if (strategyKey === 'subject-match') {
                // Maximize academic subject & class match
                return b.affinity.score - a.affinity.score;
            } else if (strategyKey === 'balanced-load') {
                // Strictly lightest daily workload first, then affinity
                if (a.affinity.teachingLoad !== b.affinity.teachingLoad) {
                    return a.affinity.teachingLoad - b.affinity.teachingLoad;
                }
                return b.affinity.score - a.affinity.score;
            } else {
                // 'minimal-splits': Zero splits + prioritize grade/class familiarity & alternative rotation
                const aFam = a.affinity.reasons.some(r => r.includes('Teaches') || r.includes('Grade')) ? 20 : 0;
                const bFam = b.affinity.reasons.some(r => r.includes('Teaches') || r.includes('Grade')) ? 20 : 0;
                if (aFam !== bFam) return bFam - aFam;
                // Rotate tie-breaker so Option 3 surfaces distinct teacher pairings when possible
                if (candidates.length > 1 && needIdx % 2 === 1) {
                    return a.affinity.teachingLoad - b.affinity.teachingLoad;
                }
                return b.affinity.score - a.affinity.score;
            }
        });

        // For minimal-splits, if top candidate is identical to subject-match on every slot and another good free candidate exists, offer the alternative on even slots
        let chosen = candidates[0];
        if (strategyKey === 'minimal-splits' && candidates.length > 1 && candidates[1].isFree && (needIdx % 2 === 0)) {
            chosen = candidates[1];
        }

        // Apply to simulated schedule
        simSchedule[period][chosen.teacher] = task;
        simSchedule[period][absentTeacher] = 'Free';

        if (chosen.isSplit) splitsCount++;
        totalAffinity += chosen.affinity.score;

        const updatedStats = getTeacherDailyStats(chosen.teacher, day, simSchedule);

        assignments.push({
            period,
            absentTeacher,
            subTeacher: chosen.teacher,
            previousTaskForSub: chosen.previousTaskForSub,
            taskToCover: task,
            isSplit: chosen.isSplit,
            primaryBadge: chosen.isSplit ? '👥 Co-Teach Split' : chosen.affinity.primaryBadge,
            affinityScore: chosen.affinity.score,
            newLoad: `${updatedStats.teachingLoad}/${updatedStats.totalSlots} pds`,
            checked: true,
            day
        });
    });

    // Compute peak teacher load across staff
    let peakLoad = 0;
    teachers.forEach(t => {
        if (!state.absentTeachers.has(t)) {
            const st = getTeacherDailyStats(t, day, simSchedule);
            if (st.teachingLoad > peakLoad) peakLoad = st.teachingLoad;
        }
    });

    const avgAffinity = assignments.length > 0 ? Math.round(totalAffinity / assignments.length) : 0;

    return {
        assignments,
        coveredCount: assignments.length,
        totalNeeded: unresolvedList.length,
        splitsCount,
        avgAffinity,
        peakLoad
    };
}

function performAutoResolve() {
    const day = state.day;
    const unresolvedList = [];

    periods.forEach(period => {
        if (period === 'BREAKFAST BREAK' || period === 'BREAKFAST') return;
        teachers.forEach(t => {
            const isAbsent = state.absentTeachers.has(t);
            const baseTask = state.baseSchedule[day]?.[period]?.[t];
            const currentSub = state.substitutions[day]?.[period]?.[t];
            if (isAbsent && baseTask && baseTask !== 'Free' && baseTask !== '-' && !currentSub) {
                unresolvedList.push({ period, absentTeacher: t, task: baseTask });
            }
        });
    });

    if (unresolvedList.length === 0) {
        showToast("No unresolved conflicts to auto-resolve.");
        return;
    }

    const opt1 = generateStrategySolution('subject-match', unresolvedList, day);
    const opt2 = generateStrategySolution('balanced-load', unresolvedList, day);
    const opt3 = generateStrategySolution('minimal-splits', unresolvedList, day);

    generatedProposals = [
        {
            id: 'subject-match',
            title: 'Option 1: Subject Match',
            subtitle: '★ Best Academic Fit',
            desc: 'Matches classes to teachers in the same subject or department first.',
            ...opt1
        },
        {
            id: 'balanced-load',
            title: 'Option 2: Balanced Load',
            subtitle: '⚖ Lightest Workload',
            desc: 'Distributes substitutions to teachers with the most free periods today.',
            ...opt2
        },
        {
            id: 'minimal-splits',
            title: 'Option 3: Minimal Splits',
            subtitle: '🛡 Preserve Co-Teaching',
            desc: 'Strictly uses 100% Free teachers (0 co-teaching splits) with grade familiarity.',
            ...opt3
        }
    ];

    activeProposalIndex = 0;
    renderProposalModalUI();

    const modal = document.getElementById('auto-resolve-modal');
    const overlay = document.getElementById('auto-resolve-overlay');
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}
window.performAutoResolve = performAutoResolve;

function selectProposalTab(index) {
    if (index < 0 || index >= generatedProposals.length) return;
    activeProposalIndex = index;
    renderProposalModalUI();
}
window.selectProposalTab = selectProposalTab;

function toggleProposalAssignmentCheck(assignmentIdx, checked) {
    const currentProp = generatedProposals[activeProposalIndex];
    if (currentProp && currentProp.assignments[assignmentIdx]) {
        currentProp.assignments[assignmentIdx].checked = checked;
    }
}
window.toggleProposalAssignmentCheck = toggleProposalAssignmentCheck;

function renderProposalModalUI() {
    const tabsEl = document.getElementById('proposal-tabs');
    const metricsEl = document.getElementById('proposal-metrics-bar');
    const previewEl = document.getElementById('proposal-preview-container');
    if (!tabsEl || !metricsEl || !previewEl || generatedProposals.length === 0) return;

    tabsEl.innerHTML = generatedProposals.map((prop, idx) => `
        <button class="proposal-tab-btn ${idx === activeProposalIndex ? 'active' : ''}" onclick="selectProposalTab(${idx})">
            <span class="tab-title">${prop.title}</span>
            <span class="tab-subtitle">${prop.subtitle} (${prop.coveredCount}/${prop.totalNeeded})</span>
        </button>
    `).join('');

    const activeProp = generatedProposals[activeProposalIndex];
    metricsEl.innerHTML = `
        <span class="proposal-metric-pill">✓ Coverage: <b>${activeProp.coveredCount}/${activeProp.totalNeeded}</b></span>
        <span class="proposal-metric-pill">★ Avg Affinity: <b>${activeProp.avgAffinity} pts</b></span>
        <span class="proposal-metric-pill">👥 Co-Teach Splits: <b>${activeProp.splitsCount}</b></span>
        <span class="proposal-metric-pill">📊 Peak Teacher Load: <b>${activeProp.peakLoad} pds</b></span>
    `;

    if (activeProp.assignments.length === 0) {
        previewEl.innerHTML = `
            <div style="padding:24px; text-align:center; color:var(--text-secondary); font-size:13px;">
                No eligible teachers available under this constraint (${activeProp.title}). Try Option 1 or Option 2 to include Co-Teaching splits.
            </div>
        `;
        return;
    }

    let rowsHtml = activeProp.assignments.map((a, idx) => `
        <tr>
            <td style="width:32px; text-align:center;">
                <input type="checkbox" ${a.checked ? 'checked' : ''} onchange="toggleProposalAssignmentCheck(${idx}, this.checked)" style="accent-color:var(--accent-blue); cursor:pointer;">
            </td>
            <td><span class="reg-period-badge">${a.period}</span></td>
            <td><strong style="color:var(--text-primary);">${a.taskToCover}</strong></td>
            <td style="color:var(--text-secondary);">${a.absentTeacher}</td>
            <td><strong style="color:var(--accent-green);">→ ${a.subTeacher}</strong></td>
            <td>
                <span class="reg-affinity-tag" style="${a.isSplit ? 'background:rgba(139,92,246,0.15); color:#7c3aed;' : ''}">${a.primaryBadge}</span>
                <span style="font-size:10px; color:var(--text-secondary); margin-left:4px;">${a.newLoad}</span>
            </td>
        </tr>
    `).join('');

    previewEl.innerHTML = `
        <table class="proposal-table">
            <thead>
                <tr>
                    <th style="width:32px; text-align:center;">Use</th>
                    <th>Period</th>
                    <th>Class</th>
                    <th>Absent</th>
                    <th>Proposed Sub</th>
                    <th>Match & Load</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
}

function closeAutoResolveModal() {
    const modal = document.getElementById('auto-resolve-modal');
    const overlay = document.getElementById('auto-resolve-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.closeAutoResolveModal = closeAutoResolveModal;

function applySelectedProposal() {
    const activeProp = generatedProposals[activeProposalIndex];
    if (!activeProp) {
        closeAutoResolveModal();
        return;
    }

    const chosenAssignments = activeProp.assignments.filter(a => a.checked);
    if (chosenAssignments.length === 0) {
        closeAutoResolveModal();
        showToast("No assignments selected.");
        return;
    }

    clearRedoStacks();
    const batchActions = [];

    chosenAssignments.forEach(item => {
        const { period, absentTeacher, subTeacher, previousTaskForSub, taskToCover, day } = item;

        batchActions.push({
            period,
            absentTeacher,
            subTeacher,
            previousTaskForSub,
            taskToCover,
            day
        });

        state.schedule[day][period][subTeacher] = taskToCover;
        state.schedule[day][period][absentTeacher] = 'Free';

        if (!state.substitutions[day]) state.substitutions[day] = {};
        if (!state.substitutions[day][period]) state.substitutions[day][period] = {};
        state.substitutions[day][period][absentTeacher] = subTeacher;
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
    }

    closeAutoResolveModal();
    renderAll();
    showToast(`Applied ${activeProp.title} (${batchActions.length} substitution${batchActions.length > 1 ? 's' : ''} assigned).`);
}
window.applySelectedProposal = applySelectedProposal;

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
    if (e.key === 'Escape') {
        if (isFitGridMode) {
            toggleFitGridMode(false);
        }
        closeOfficiatingModal();
        closeDisputeModal();
        closeAutoResolveModal();
        closeCoTeachingModal();
        closeSplitModal();
        closeSettingsModal();
        closeTourModal();
        closeBottomSheet();
        return;
    }
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

    updateRolePermissionsUI();

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