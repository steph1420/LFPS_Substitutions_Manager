import { create } from 'zustand';
import {
  DayOfWeek,
  PeriodId,
  StaffDirectory,
  MasterSchedule,
  AbsenceRecord,
  StaffAvailabilityRecord,
  SubstitutionAssignment,
  DutyPreset,
  SubAvailabilityStatus,
  AutoResolvePolicyConfig,
  DEFAULT_AUTORESOLVE_POLICY,
  AppNotification,
} from '@lfps/core';
import { adoptStoredReference, getBaseDirectory, getBaseSchedule, initReference, REFERENCE_KEY } from '../sync/reference.js';
import {
  getBrowserStorage,
  installOperationalPersistence,
  loadInitialOperationalState,
  type PersistenceStatus,
} from './persistence.js';
import { APP_VERSION } from '../lib/buildInfo.js';
import {
  clearAdminLockout,
  endAdminSession,
  formatWait,
  isWellFormedPasscode,
  readAdminLockout,
  recordFailedAdminAttempt,
  getConfiguredAdminHash,
  readAdminSession,
  startAdminSession,
  verifyAdminPasscode,
} from '../lib/adminGate.js';
import {
  adminOfficeToday,
  readEditingOverride,
  resolveAccess,
  sameAccess,
  writeEditingOverride,
  type Access,
  type AccessInputs,
} from '../lib/access.js';

export interface ContextMenuTarget {
  x: number;
  y: number;
  teacher: string;
  period?: PeriodId;
}

export interface AwaySelectionState {
  active: boolean;
  teacherName: string;
  selectedPeriods: PeriodId[];
  venue?: string;
  reason?: string;
}

export interface CoTeachSlotTarget {
  period: PeriodId;
  teacher: string;
  partnerTeacher?: string;
  className: string;
  subject: string;
}

export type RosterViewMode =
  | 'normal-grid'
  | 'compact-grid'
  | 'normal-list'
  | 'compact-list'
  | 'comfort-grid'
  | 'detailed-list'
  | 'grid'
  | 'list';

export interface OfficiatingTarget {
  type: 'AC' | 'CT';
  section?: string;
}

export interface AssignSubSlotTarget {
  day: DayOfWeek;
  period: PeriodId;
  originalTeacher: string;
  className: string;
  subject: string;
  task: string;
}

export type ActiveTab = 'routine' | 'substitutions' | 'roster';

export interface HistoryStack<T> {
  past: T[];
  future: T[];
}

export interface DisplacedItem {
  id: string;
  task: string;
  ogTeacher: string;
  period: PeriodId;
  day: DayOfWeek;
  timestamp?: number;
}

export interface RoutineSnapshot {
  schedule: MasterSchedule;
  displaced: Record<DayOfWeek, DisplacedItem[]>;
}

export interface SubstitutionsSnapshot {
  substitutions: SubstitutionAssignment[];
}

export interface RosterSnapshot {
  absences: AbsenceRecord[];
  availabilities: Record<string, StaffAvailabilityRecord>;
  officiatingAC: Record<DayOfWeek, string | null>;
  officiatingCT: Record<DayOfWeek, Record<string, string>>;
}

function pushSnapshot<T>(stack: HistoryStack<T>, current: T, max = 30): HistoryStack<T> {
  const newPast = [...stack.past, current];
  if (newPast.length > max) {
    newPast.shift();
  }
  return {
    past: newPast,
    future: [],
  };
}

export type ThemeId =
  | 'system'
  | 'light'
  | 'warm-sepia'
  | 'dark'
  | 'midnight'
  | 'slate-nord'
  | 'utopian-glass'
  | 'utopian-night'
  | 'aero-frost'
  | 'cyber-glass'
  | 'retro-glass'
  | 'high-contrast';

interface TimetableState {
  // Navigation & View
  selectedDay: DayOfWeek;
  activeTab: ActiveTab;
  viewMode: 'teachers' | 'classes';
  isMinimalUI: boolean;
  isFitGrid: boolean;
  isSettingsOpen: boolean;
  isStaffLoginOpen: boolean;

  // Theme Engine (FEAT-46)
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;

  // Developer & Diagnostics Options (FEAT-47)
  isDeveloperMode: boolean;
  setDeveloperMode: (enabled: boolean) => void;
  samePeriodLock: boolean;
  setSamePeriodLock: (locked: boolean) => void;
  subHaloIndicator: boolean;
  setSubHaloIndicator: (enabled: boolean) => void;
  subHaloColor: 'emerald' | 'cyan' | 'amber' | 'violet';
  setSubHaloColor: (color: 'emerald' | 'cyan' | 'amber' | 'violet') => void;
  acceptanceCountdown: boolean;
  setAcceptanceCountdown: (enabled: boolean) => void;
  acceptanceDuration: 5 | 10 | 30 | 60;
  setAcceptanceDuration: (duration: 5 | 10 | 30 | 60) => void;
  undoIconStyle: 'curved' | 'circular' | 'geometric' | 'micro';
  setUndoIconStyle: (style: 'curved' | 'circular' | 'geometric' | 'micro') => void;

  // Routine Matrix Reordering & Limbo Tray Displacement (FEAT-37A, BUG-01)
  moveRoutineSlot: (
    day: DayOfWeek,
    source:
      | { type: 'grid'; teacher: string; period: PeriodId; task?: string }
      | { type: 'limbo'; item: DisplacedItem },
    target: { teacher: string; period: PeriodId }
  ) => void;
  restoreDisplacedItem: (item: DisplacedItem) => { success: boolean; reason?: string };
  clearDisplaced: (day: DayOfWeek) => void;
  swapRoutineSlots: (
    day: DayOfWeek,
    source: { teacher: string; period: PeriodId },
    target: { teacher: string; period: PeriodId }
  ) => void;
  updatePeriodTask: (
    day: DayOfWeek,
    period: PeriodId,
    teacherName: string,
    newTask: string
  ) => void;

  // User Preferences (FEAT-45, FEAT-55, FEAT-58, FEAT-60)
  hideOverviewsByDefault: boolean;
  hideAbsentStaff: boolean;
  substitutionsViewMode: 'grid' | 'list';
  rosterViewMode: RosterViewMode;
  substitutionsSortBy: 'name' | 'role' | 'period';
  rosterSortBy: 'role' | 'name';
  routineSortBy: 'role' | 'name';

  // Master Data
  directory: StaffDirectory;
  schedule: MasterSchedule;

  // Operational State (persisted per calendar date — see store/persistence.ts, FEAT-62)
  /** Monday (ISO date) of the school week the MON–SAT slots currently represent. */
  activeWeekStart: string;
  persistenceStatus: PersistenceStatus;
  absences: AbsenceRecord[];
  availabilities: Record<string, StaffAvailabilityRecord>;
  substitutions: SubstitutionAssignment[];
  displaced: Record<DayOfWeek, DisplacedItem[]>;

  // Authentication, RBAC & Officiating (SEC-01)
  loggedInTeacher: string | null;
  /** Identity holding this tab's admin session (entered the passcode at login). */
  adminIdentity: string | null;
  /** Dev Options → "Edit without login" (this device only; lib/access.ts). */
  editingOverride: boolean;
  /** Derived from resolveAccess() after every change — read-only for components. */
  access: Access;
  officiatingAC: Record<DayOfWeek, string | null>;
  officiatingCT: Record<DayOfWeek, Record<string, string>>;

  // Notifications (FEAT-50)
  isNotificationCenterOpen: boolean;
  notifications: AppNotification[];

  // History Stacks (FEAT-40: Per-tab isolated undo/redo)
  routineHistory: HistoryStack<RoutineSnapshot>;
  substitutionsHistory: HistoryStack<SubstitutionsSnapshot>;
  rosterHistory: HistoryStack<RosterSnapshot>;

  // Modal & Interaction States
  activeContextMenu: ContextMenuTarget | null;
  activeResetPurgeMenu: { x: number; y: number } | null;
  activeAvailabilityTeacher: string | null;
  activeCoTeachSlot: CoTeachSlotTarget | null;
  activeOfficiatingTarget: OfficiatingTarget | null;
  activeAssignSubSlot: AssignSubSlotTarget | null;
  activeDisputeTarget: SubstitutionAssignment | null;

  // Away on Official Duty Mode & Dialog
  awaySelectionState: AwaySelectionState | null;
  isAwayModalOpen: boolean;
  awayModalTeacher: string | null;

  startAwaySelection: (teacherName: string, initialPeriods?: PeriodId[], venue?: string) => void;
  toggleAwayPeriod: (period: PeriodId) => void;
  setAwayPeriods: (periods: PeriodId[]) => void;
  setAwayVenue: (venue: string) => void;
  saveAwaySelection: () => void;
  cancelAwaySelection: () => void;
  openAwayModal: (teacherName: string) => void;
  closeAwayModal: () => void;
  setTeacherAwayOfficial: (teacherName: string, periods: PeriodId[], venue?: string) => void;

  // Actions
  setDay: (day: DayOfWeek) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setViewMode: (mode: 'teachers' | 'classes') => void;
  toggleMinimalUI: () => void;
  toggleFitGrid: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openStaffLogin: () => void;
  closeStaffLogin: () => void;

  // Preference Actions (FEAT-45, FEAT-55, FEAT-58, FEAT-60)
  setHideOverviewsByDefault: (hide: boolean) => void;
  toggleHideAbsentStaff: () => void;
  setSubstitutionsViewMode: (mode: 'grid' | 'list') => void;
  setRosterViewMode: (mode: RosterViewMode) => void;
  setSubstitutionsSortBy: (sort: 'name' | 'role' | 'period') => void;
  setRosterSortBy: (sort: 'role' | 'name') => void;
  setRoutineSortBy: (sort: 'role' | 'name') => void;
  savePreferences: () => void;
  resetPreferences: () => void;

  // Auto-Resolve Brain Studio Policy (FEAT-61 & BUG-18)
  autoResolvePolicy: AutoResolvePolicyConfig;
  updateAutoResolvePolicy: (policy: Partial<AutoResolvePolicyConfig>) => void;
  resetAutoResolvePolicy: () => void;

  // Context Menu Actions
  openContextMenu: (target: ContextMenuTarget) => void;
  closeContextMenu: () => void;
  openResetPurgeMenu: (coords: { x: number; y: number }) => void;
  closeResetPurgeMenu: () => void;

  // Modal Actions
  openAvailabilityModal: (teacherName: string) => void;
  closeAvailabilityModal: () => void;
  openCoTeachModal: (slot: CoTeachSlotTarget) => void;
  closeCoTeachModal: () => void;
  openOfficiatingModal: (target: OfficiatingTarget) => void;
  closeOfficiatingModal: () => void;
  openAssignSubModal: (slot: AssignSubSlotTarget) => void;
  closeAssignSubModal: () => void;

  toggleAbsence: (
    teacherName: string,
    options?: {
      type?: 'FULL_DAY' | 'PERIODS' | 'AWAY_OFFICIAL';
      periods?: PeriodId[];
      venue?: string;
      reason?: string;
    }
  ) => void;

  setStaffAvailability: (
    teacherName: string,
    status: SubAvailabilityStatus,
    options?: { dutyPreset?: DutyPreset; remark?: string }
  ) => void;

  assignSubstitution: (sub: Omit<SubstitutionAssignment, 'id' | 'assignedAt'>) => void;
  removeSubstitution: (id: string) => void;
  markAllPresent: (day?: DayOfWeek) => void;

  // FEAT-31: Co-teacher per-period release
  releaseCoTeacher: (period: PeriodId, teacherName: string) => void;

  /**
   * Identity selection for staff without an admin office (no credential): enables a
   * teacher's own accept/dispute. Admin office holders (Principal, AC, AAC, today's
   * Off. AC) are refused with needsPasscode — they sign in with loginWithPasscode.
   */
  login: (identity: string) => { ok: boolean; needsPasscode?: boolean };
  /** Admin login: passcode (SHA-256 vs VITE_ADMIN_PASSCODE_SHA256, lockout) → admin session for `identity`. */
  loginWithPasscode: (identity: string, passcode: string) => Promise<AdminLoginResult>;
  /** Clears the identity and ends the admin session. */
  logout: () => void;
  /** Enabling needs canEdit (Dev Options are admin-gated); disabling is always allowed. */
  setEditingOverride: (on: boolean) => void;
  /** Consecutive wrong passcode attempts (mirrors lfps_admin_lockout_v1). */
  adminFailedAttempts: number;
  /** Epoch ms until which unlock attempts are refused (escalating waits). */
  adminLockedUntil: number | null;
  assignOfficiatingAC: (day: DayOfWeek, teacherName: string) => void;
  assignOfficiatingCT: (day: DayOfWeek, section: string, teacherName: string) => void;

  // Teacher Self-Service & Dispute Actions (FEAT-49)
  acceptSubstitution: (id: string) => void;
  disputeSubstitution: (id: string, reason: string) => void;
  openDisputeModal: (sub: SubstitutionAssignment) => void;
  closeDisputeModal: () => void;

  // Universal Notification Center Actions (FEAT-50)
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;

  // Undo / Redo Actions (FEAT-40)
  undo: (tab?: ActiveTab) => void;
  redo: (tab?: ActiveTab) => void;
  canUndo: (tab?: ActiveTab) => boolean;
  canRedo: (tab?: ActiveTab) => boolean;

  // Reset & Purge Actions (FEAT-41)
  resetDay: (day?: DayOfWeek) => void;
  purgeHistory: () => void;
}

const PREFERENCES_STORAGE_KEY = 'lfps_user_preferences_v2';

interface StoredPreferences {
  hideOverviewsByDefault?: boolean;
  hideAbsentStaff?: boolean;
  substitutionsViewMode?: 'grid' | 'list';
  rosterViewMode?: RosterViewMode;
  substitutionsSortBy?: 'name' | 'role' | 'period';
  rosterSortBy?: 'role' | 'name';
  routineSortBy?: 'role' | 'name';
  isMinimalUI?: boolean;
  currentTheme?: ThemeId;
  isDeveloperMode?: boolean;
  samePeriodLock?: boolean;
  subHaloIndicator?: boolean;
  subHaloColor?: 'emerald' | 'cyan' | 'amber' | 'violet';
  acceptanceCountdown?: boolean;
  acceptanceDuration?: 5 | 10 | 30 | 60;
  undoIconStyle?: 'curved' | 'circular' | 'geometric' | 'micro';
}

export function applyThemeToDom(theme: ThemeId) {
  if (typeof document === 'undefined') return;
  if (theme === 'system') {
    const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function loadStoredPreferences(): StoredPreferences {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function autoPersistPreferences(prefs: StoredPreferences) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadStoredPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

const AUTORESOLVE_POLICY_STORAGE_KEY = 'lfps_autoresolve_policy_v2';

function loadStoredPolicy(): AutoResolvePolicyConfig {
  if (typeof window === 'undefined') return DEFAULT_AUTORESOLVE_POLICY;
  try {
    const raw = localStorage.getItem(AUTORESOLVE_POLICY_STORAGE_KEY);
    return raw ? { ...DEFAULT_AUTORESOLVE_POLICY, ...JSON.parse(raw) } : DEFAULT_AUTORESOLVE_POLICY;
  } catch {
    return DEFAULT_AUTORESOLVE_POLICY;
  }
}

const initialPrefs = loadStoredPreferences();
const operationalStorage = getBrowserStorage();
// FEAT-62 part 3: the Sheet's reference data (cached) is the base; the bundled seed otherwise.
initReference(operationalStorage);
const initialOperational = loadInitialOperationalState(operationalStorage, getBaseSchedule());
const initialPolicy = loadStoredPolicy();

// Apply initial theme to document DOM
applyThemeToDom(initialPrefs.currentTheme ?? 'dark');

const ADMIN_REQUIRED = 'Admin login required (Staff Login).';
/**
 * Admin-only actions re-check here, not just in the UI (defence in depth; still client-side).
 * Same helper as the UI: lib/access.ts resolveAccess().
 */
const isAdmin = (state: AccessInputs) => resolveAccess(state).canEdit;

export interface AdminLoginResult {
  ok: boolean;
  reason?: string;
  lockedUntil?: number | null;
}

const getInitialRosterMode = (saved?: RosterViewMode): RosterViewMode => {
  if (saved === 'list' || saved === 'compact-list') return 'compact-list';
  if (saved === 'detailed-list' || saved === 'normal-list') return 'normal-list';
  if (saved === 'compact-grid') return 'compact-grid';
  if (saved === 'grid' || saved === 'comfort-grid' || saved === 'normal-grid') return 'normal-grid';
  return 'normal-grid';
};

export const useTimetableStore = create<TimetableState>((set, get) => ({
  selectedDay: initialOperational.selectedDay,
  activeTab: 'routine',
  viewMode: 'teachers',
  isMinimalUI: initialPrefs.isMinimalUI ?? false,
  isFitGrid: false,
  isSettingsOpen: false,
  isStaffLoginOpen: false,

  currentTheme: initialPrefs.currentTheme ?? 'dark',
  isDeveloperMode: initialPrefs.isDeveloperMode ?? false,
  samePeriodLock: initialPrefs.samePeriodLock ?? true,
  subHaloIndicator: initialPrefs.subHaloIndicator ?? true,
  subHaloColor: initialPrefs.subHaloColor ?? 'emerald',
  acceptanceCountdown: initialPrefs.acceptanceCountdown ?? false,
  acceptanceDuration: initialPrefs.acceptanceDuration ?? 10,
  undoIconStyle: initialPrefs.undoIconStyle ?? 'curved',

  hideOverviewsByDefault: initialPrefs.hideOverviewsByDefault ?? false,
  hideAbsentStaff: initialPrefs.hideAbsentStaff ?? false,
  substitutionsViewMode: initialPrefs.substitutionsViewMode ?? 'grid',
  rosterViewMode: getInitialRosterMode(initialPrefs.rosterViewMode),
  substitutionsSortBy: initialPrefs.substitutionsSortBy ?? 'period',
  rosterSortBy: initialPrefs.rosterSortBy ?? 'role',
  routineSortBy: initialPrefs.routineSortBy ?? 'role',
  autoResolvePolicy: initialPolicy,

  directory: getBaseDirectory(),
  schedule: initialOperational.schedule,

  activeWeekStart: initialOperational.activeWeekStart,
  persistenceStatus: initialOperational.persistenceStatus,
  absences: initialOperational.absences,
  availabilities: initialOperational.availabilities,
  substitutions: initialOperational.substitutions,
  displaced: initialOperational.displaced,

  // SEC-01: never default to ADMIN. Front desk (GUEST) can do all day-to-day work.
  // A same-tab admin session restores its identity on reload (re-checked by resolveAccess).
  loggedInTeacher: readAdminSession(),
  adminIdentity: readAdminSession(),
  editingOverride: readEditingOverride(),
  access: { role: 'GUEST', isAdmin: false, office: null, canEdit: false, editingUnlocked: false },
  adminFailedAttempts: readAdminLockout().failures,
  adminLockedUntil: readAdminLockout().lockedUntil,
  isNotificationCenterOpen: false,
  notifications: initialOperational.notifications,
  officiatingAC: initialOperational.officiatingAC,
  officiatingCT: initialOperational.officiatingCT,

  routineHistory: initialOperational.routineHistory,
  substitutionsHistory: initialOperational.substitutionsHistory,
  rosterHistory: initialOperational.rosterHistory,

  activeContextMenu: null,
  activeResetPurgeMenu: null,
  activeAvailabilityTeacher: null,
  activeCoTeachSlot: null,
  activeOfficiatingTarget: null,
  activeAssignSubSlot: null,
  activeDisputeTarget: null,
  awaySelectionState: null,
  isAwayModalOpen: false,
  awayModalTeacher: null,

  setDay: (day) => set({ selectedDay: day }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleMinimalUI: () =>
    set((state) => {
      const next = !state.isMinimalUI;
      autoPersistPreferences({ isMinimalUI: next });
      return { isMinimalUI: next };
    }),
  toggleFitGrid: () => set((state) => ({ isFitGrid: !state.isFitGrid })),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openStaffLogin: () => set({ isStaffLoginOpen: true }),
  closeStaffLogin: () => set({ isStaffLoginOpen: false }),

  // User Preferences Actions (FEAT-45, FEAT-55, FEAT-58, FEAT-60)
  setHideOverviewsByDefault: (hide) => {
    autoPersistPreferences({ hideOverviewsByDefault: hide });
    set({ hideOverviewsByDefault: hide });
  },
  toggleHideAbsentStaff: () =>
    set((state) => {
      const next = !state.hideAbsentStaff;
      autoPersistPreferences({ hideAbsentStaff: next });
      return { hideAbsentStaff: next };
    }),
  setSubstitutionsViewMode: (mode) => {
    autoPersistPreferences({ substitutionsViewMode: mode });
    set({ substitutionsViewMode: mode });
  },
  setRosterViewMode: (mode) => {
    autoPersistPreferences({ rosterViewMode: mode });
    set({ rosterViewMode: mode });
  },
  setSubstitutionsSortBy: (sort) => {
    autoPersistPreferences({ substitutionsSortBy: sort });
    set({ substitutionsSortBy: sort });
  },
  setRosterSortBy: (sort) => {
    autoPersistPreferences({ rosterSortBy: sort });
    set({ rosterSortBy: sort });
  },
  setRoutineSortBy: (sort) => {
    autoPersistPreferences({ routineSortBy: sort });
    set({ routineSortBy: sort });
  },
  savePreferences: () => {
    const state = get();
    autoPersistPreferences({
      hideOverviewsByDefault: state.hideOverviewsByDefault,
      hideAbsentStaff: state.hideAbsentStaff,
      substitutionsViewMode: state.substitutionsViewMode,
      rosterViewMode: state.rosterViewMode,
      substitutionsSortBy: state.substitutionsSortBy,
      rosterSortBy: state.rosterSortBy,
      routineSortBy: state.routineSortBy,
      isMinimalUI: state.isMinimalUI,
    });
  },
  resetPreferences: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(PREFERENCES_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    set({
      hideOverviewsByDefault: false,
      hideAbsentStaff: false,
      substitutionsViewMode: 'grid',
      rosterViewMode: 'grid',
      substitutionsSortBy: 'period',
      rosterSortBy: 'role',
      routineSortBy: 'role',
      isMinimalUI: false,
    });
  },

  setTheme: (theme) => {
    applyThemeToDom(theme);
    autoPersistPreferences({ currentTheme: theme });
    set({ currentTheme: theme });
  },
  setDeveloperMode: (enabled) => {
    if (enabled && !isAdmin(get())) return;
    autoPersistPreferences({ isDeveloperMode: enabled });
    set({ isDeveloperMode: enabled });
  },
  setSamePeriodLock: (locked) => {
    autoPersistPreferences({ samePeriodLock: locked });
    set({ samePeriodLock: locked });
  },
  setSubHaloIndicator: (enabled) => {
    autoPersistPreferences({ subHaloIndicator: enabled });
    set({ subHaloIndicator: enabled });
  },
  setSubHaloColor: (color) => {
    autoPersistPreferences({ subHaloColor: color });
    set({ subHaloColor: color });
  },
  setAcceptanceCountdown: (enabled) => {
    autoPersistPreferences({ acceptanceCountdown: enabled });
    set({ acceptanceCountdown: enabled });
  },
  setAcceptanceDuration: (duration) => {
    autoPersistPreferences({ acceptanceDuration: duration });
    set({ acceptanceDuration: duration });
  },
  setUndoIconStyle: (style) => {
    autoPersistPreferences({ undoIconStyle: style });
    set({ undoIconStyle: style });
  },

  moveRoutineSlot: (day, source, target) =>
    set((state) => {
      if (!isAdmin(state)) return {};
      const routineHistory = pushSnapshot(state.routineHistory, {
        schedule: state.schedule,
        displaced: state.displaced,
      });

      const daySched = { ...(state.schedule[day] || {}) };
      let sourceTask = '';

      if (source.type === 'grid') {
        sourceTask = daySched[source.period]?.[source.teacher] || source.task || 'Free';
      } else {
        sourceTask = source.item.task;
      }

      if (!sourceTask || sourceTask.toLowerCase() === 'free' || sourceTask === '-') {
        return {};
      }

      const targetPeriodMap = { ...(daySched[target.period] || {}) };
      const targetCurrentTask = targetPeriodMap[target.teacher] || 'Free';

      let newlyDisplaced: DisplacedItem | null = null;
      if (
        targetCurrentTask &&
        targetCurrentTask.toLowerCase() !== 'free' &&
        targetCurrentTask !== '-'
      ) {
        newlyDisplaced = {
          id: `displaced-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          task: targetCurrentTask,
          ogTeacher: target.teacher,
          period: target.period,
          day,
          timestamp: Date.now(),
        };
      }

      if (source.type === 'grid' && source.period === target.period) {
        targetPeriodMap[source.teacher] = 'Free';
        targetPeriodMap[target.teacher] = sourceTask;
        daySched[target.period] = targetPeriodMap;
      } else {
        if (source.type === 'grid') {
          const sourcePeriodMap = { ...(daySched[source.period] || {}) };
          sourcePeriodMap[source.teacher] = 'Free';
          daySched[source.period] = sourcePeriodMap;
        }
        targetPeriodMap[target.teacher] = sourceTask;
        daySched[target.period] = targetPeriodMap;
      }

      let dayDisplaced = [...(state.displaced[day] || [])];
      if (source.type === 'limbo') {
        dayDisplaced = dayDisplaced.filter((d) => d.id !== source.item.id);
      }
      if (newlyDisplaced) {
        dayDisplaced.push(newlyDisplaced);
      }

      return {
        schedule: {
          ...state.schedule,
          [day]: daySched,
        },
        displaced: {
          ...state.displaced,
          [day]: dayDisplaced,
        },
        routineHistory,
      };
    }),

  restoreDisplacedItem: (item) => {
    const state = get();
    if (!isAdmin(state)) return { success: false, reason: ADMIN_REQUIRED };
    const day = item.day;
    const currentTask = state.schedule[day]?.[item.period]?.[item.ogTeacher] || 'Free';

    if (currentTask && currentTask.toLowerCase() !== 'free' && currentTask !== '-') {
      return {
        success: false,
        reason: `Slot for ${item.ogTeacher} (${item.period}) is currently occupied by "${currentTask}"`,
      };
    }

    const routineHistory = pushSnapshot(state.routineHistory, {
      schedule: state.schedule,
      displaced: state.displaced,
    });

    const daySched = { ...(state.schedule[day] || {}) };
    const periodMap = { ...(daySched[item.period] || {}) };
    periodMap[item.ogTeacher] = item.task;
    daySched[item.period] = periodMap;

    const dayDisplaced = (state.displaced[day] || []).filter((d) => d.id !== item.id);

    set({
      schedule: {
        ...state.schedule,
        [day]: daySched,
      },
      displaced: {
        ...state.displaced,
        [day]: dayDisplaced,
      },
      routineHistory,
    });

    return { success: true };
  },

  clearDisplaced: (day) =>
    set((state) => {
      if (!isAdmin(state)) return {};
      const routineHistory = pushSnapshot(state.routineHistory, {
        schedule: state.schedule,
        displaced: state.displaced,
      });
      return {
        displaced: {
          ...state.displaced,
          [day]: [],
        },
        routineHistory,
      };
    }),

  swapRoutineSlots: (day, source, target) =>
    set((state) => {
      if (!isAdmin(state)) return {};
      const routineHistory = pushSnapshot(state.routineHistory, {
        schedule: state.schedule,
        displaced: state.displaced,
      });

      const daySched = { ...(state.schedule[day] || {}) };

      if (source.period === target.period) {
        const periodMap = { ...(daySched[source.period] || {}) };
        const taskA = periodMap[source.teacher] || 'Free';
        const taskB = periodMap[target.teacher] || 'Free';
        periodMap[source.teacher] = taskB;
        periodMap[target.teacher] = taskA;
        daySched[source.period] = periodMap;
      } else {
        const sourcePeriodMap = { ...(daySched[source.period] || {}) };
        const targetPeriodMap = { ...(daySched[target.period] || {}) };
        const taskA = sourcePeriodMap[source.teacher] || 'Free';
        const taskB = targetPeriodMap[target.teacher] || 'Free';
        sourcePeriodMap[source.teacher] = taskB;
        targetPeriodMap[target.teacher] = taskA;
        daySched[source.period] = sourcePeriodMap;
        daySched[target.period] = targetPeriodMap;
      }

      return {
        schedule: {
          ...state.schedule,
          [day]: daySched,
        },
        routineHistory,
      };
    }),

  updatePeriodTask: (day, period, teacherName, newTask) =>
    set((state) => {
      if (!isAdmin(state)) return {};
      const routineHistory = pushSnapshot(state.routineHistory, {
        schedule: state.schedule,
        displaced: state.displaced,
      });

      const daySched = { ...(state.schedule[day] || {}) };
      const periodMap = { ...(daySched[period] || {}) };
      periodMap[teacherName] = newTask;
      daySched[period] = periodMap;

      return {
        schedule: {
          ...state.schedule,
          [day]: daySched,
        },
        routineHistory,
      };
    }),

  updateAutoResolvePolicy: (policyUpdate) =>
    set((state) => {
      if (!isAdmin(state)) return {};
      const nextPolicy = { ...state.autoResolvePolicy, ...policyUpdate };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTORESOLVE_POLICY_STORAGE_KEY, JSON.stringify(nextPolicy));
        }
      } catch {
        // ignore
      }
      return { autoResolvePolicy: nextPolicy };
    }),

  resetAutoResolvePolicy: () =>
    set((state) => {
      if (!isAdmin(state)) return {};
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTORESOLVE_POLICY_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
      return { autoResolvePolicy: DEFAULT_AUTORESOLVE_POLICY };
    }),

  openContextMenu: (target) => set({ activeContextMenu: target }),
  closeContextMenu: () => set({ activeContextMenu: null }),
  openResetPurgeMenu: (coords) => set({ activeResetPurgeMenu: coords }),
  closeResetPurgeMenu: () => set({ activeResetPurgeMenu: null }),

  openAvailabilityModal: (teacherName) => set({ activeAvailabilityTeacher: teacherName }),
  closeAvailabilityModal: () => set({ activeAvailabilityTeacher: null }),

  openCoTeachModal: (slot) => set({ activeCoTeachSlot: slot }),
  closeCoTeachModal: () => set({ activeCoTeachSlot: null }),

  openOfficiatingModal: (target) => set({ activeOfficiatingTarget: target }),
  closeOfficiatingModal: () => set({ activeOfficiatingTarget: null }),

  openAssignSubModal: (slot) => set({ activeAssignSubSlot: slot }),
  closeAssignSubModal: () => set({ activeAssignSubSlot: null }),

  openAwayModal: (teacherName) =>
    set({
      isAwayModalOpen: true,
      awayModalTeacher: teacherName,
      activeContextMenu: null,
    }),
  closeAwayModal: () =>
    set({
      isAwayModalOpen: false,
      awayModalTeacher: null,
    }),

  startAwaySelection: (teacherName, initialPeriods, venue) => {
    const state = get();
    const day = state.selectedDay;
    const existingAbsence = state.absences.find(
      (a) => a.teacherName === teacherName && a.day === day && a.type === 'AWAY_OFFICIAL'
    );
    const periods = initialPeriods || existingAbsence?.periods || ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    const currentVenue = venue || existingAbsence?.venue || 'Official Duty';

    set({
      activeTab: 'routine',
      awaySelectionState: {
        active: true,
        teacherName,
        selectedPeriods: periods,
        venue: currentVenue,
      },
      isAwayModalOpen: false,
      activeContextMenu: null,
    });
  },

  toggleAwayPeriod: (period) =>
    set((state) => {
      if (!state.awaySelectionState || !state.awaySelectionState.active) return {};
      const current = state.awaySelectionState.selectedPeriods;
      const next = current.includes(period)
        ? current.filter((p) => p !== period)
        : [...current, period];
      return {
        awaySelectionState: {
          ...state.awaySelectionState,
          selectedPeriods: next,
        },
      };
    }),

  setAwayPeriods: (periods) =>
    set((state) => {
      if (!state.awaySelectionState || !state.awaySelectionState.active) return {};
      return {
        awaySelectionState: {
          ...state.awaySelectionState,
          selectedPeriods: periods,
        },
      };
    }),

  setAwayVenue: (venue) =>
    set((state) => {
      if (!state.awaySelectionState || !state.awaySelectionState.active) return {};
      return {
        awaySelectionState: {
          ...state.awaySelectionState,
          venue,
        },
      };
    }),

  saveAwaySelection: () => {
    const state = get();
    if (!state.awaySelectionState) return;
    const { teacherName, selectedPeriods, venue } = state.awaySelectionState;
    state.setTeacherAwayOfficial(teacherName, selectedPeriods, venue);
  },

  cancelAwaySelection: () =>
    set({
      awaySelectionState: null,
    }),

  setTeacherAwayOfficial: (teacherName, periods, venue) =>
    set((state) => {
      const day = state.selectedDay;
      const rosterHistory = pushSnapshot(state.rosterHistory, {
        absences: state.absences,
        availabilities: state.availabilities,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
      });

      const remainingAbsences = state.absences.filter(
        (a) => !(a.teacherName === teacherName && a.day === day)
      );

      if (!periods || periods.length === 0) {
        return {
          absences: remainingAbsences,
          rosterHistory,
          awaySelectionState: null,
          isAwayModalOpen: false,
          awayModalTeacher: null,
        };
      }

      const teacher = Object.values(state.directory).find((t) => t.abbr === teacherName);
      const newAbsence: AbsenceRecord = {
        teacherId: teacher?.id || `t-${teacherName}`,
        teacherName,
        day,
        type: 'AWAY_OFFICIAL',
        periods,
        venue: venue || 'Official Duty',
        markedAt: Date.now(),
      };

      return {
        absences: [...remainingAbsences, newAbsence],
        rosterHistory,
        awaySelectionState: null,
        isAwayModalOpen: false,
        awayModalTeacher: null,
      };
    }),

  toggleAbsence: (teacherName, options = {}) =>
    set((state) => {
      // Push history before mutating roster
      const rosterHistory = pushSnapshot(state.rosterHistory, {
        absences: state.absences,
        availabilities: state.availabilities,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
      });

      const exists = state.absences.find(
        (a) => a.teacherName === teacherName && a.day === state.selectedDay
      );
      if (exists) {
        // Teacher is being marked PRESENT again!
        // Automatically clean up all substitutions involving this teacher on this day (BUG-12)
        const updatedSubs = state.substitutions.filter(
          (s) =>
            !(
              s.day === state.selectedDay &&
              (s.originalTeacher === teacherName || s.substituteTeacher === teacherName)
            )
        );

        const substitutionsHistory =
          updatedSubs.length !== state.substitutions.length
            ? pushSnapshot(state.substitutionsHistory, { substitutions: state.substitutions })
            : state.substitutionsHistory;

        // BUG-19: Automatically reconcile and prune officiating designations if the primary teacher returns
        let updatedOfficiatingAC = state.officiatingAC;
        if (teacherName === 'Mrs. R. Pahwa' && state.officiatingAC[state.selectedDay]) {
          updatedOfficiatingAC = { ...state.officiatingAC };
          delete updatedOfficiatingAC[state.selectedDay];
        }

        let updatedOfficiatingCT = state.officiatingCT;
        const teacherObj = Object.values(state.directory).find((t) => t.abbr === teacherName);
        if (teacherObj?.primaryClass && state.officiatingCT[state.selectedDay]?.[teacherObj.primaryClass]) {
          updatedOfficiatingCT = {
            ...state.officiatingCT,
            [state.selectedDay]: { ...state.officiatingCT[state.selectedDay] },
          };
          delete updatedOfficiatingCT[state.selectedDay][teacherObj.primaryClass];
        }

        return {
          absences: state.absences.filter(
            (a) => !(a.teacherName === teacherName && a.day === state.selectedDay)
          ),
          substitutions: updatedSubs,
          officiatingAC: updatedOfficiatingAC,
          officiatingCT: updatedOfficiatingCT,
          substitutionsHistory,
          rosterHistory,
        };
      }

      const teacher = Object.values(state.directory).find((t) => t.abbr === teacherName);
      const newAbsence: AbsenceRecord = {
        teacherId: teacher?.id || `TEMP-${Date.now()}`,
        teacherName,
        day: state.selectedDay,
        type: options.type || 'FULL_DAY',
        periods: options.periods,
        venue: options.venue,
        reason: options.reason,
        markedAt: Date.now(),
      };

      return {
        absences: [...state.absences, newAbsence],
        rosterHistory,
      };
    }),

  setStaffAvailability: (teacherName, status, options = {}) =>
    set((state) => {
      const rosterHistory = pushSnapshot(state.rosterHistory, {
        absences: state.absences,
        availabilities: state.availabilities,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
      });

      return {
        availabilities: {
          ...state.availabilities,
          [teacherName]: {
            teacherName,
            status,
            isAvailable: status === 'AVAILABLE',
            dutyPreset: options.dutyPreset,
            remark: options.remark,
            updatedAt: Date.now(),
          },
        },
        rosterHistory,
      };
    }),

  assignSubstitution: (sub) =>
    set((state) => {
      const substitutionsHistory = pushSnapshot(state.substitutionsHistory, {
        substitutions: state.substitutions,
      });

      return {
        substitutions: [
          ...state.substitutions.filter(
            (s) =>
              !(
                s.day === sub.day &&
                s.period === sub.period &&
                s.originalTeacher === sub.originalTeacher
              )
          ),
          {
            ...sub,
            id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            assignedAt: Date.now(),
          },
        ],
        substitutionsHistory,
      };
    }),

  removeSubstitution: (id) =>
    set((state) => {
      const substitutionsHistory = pushSnapshot(state.substitutionsHistory, {
        substitutions: state.substitutions,
      });

      return {
        substitutions: state.substitutions.filter((s) => s.id !== id),
        substitutionsHistory,
      };
    }),

  markAllPresent: (targetDay) =>
    set((state) => {
      const day = targetDay || state.selectedDay;
      const rosterHistory = pushSnapshot(state.rosterHistory, {
        absences: state.absences,
        availabilities: state.availabilities,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
      });

      const updatedSubs = state.substitutions.filter((s) => s.day !== day);
      const substitutionsHistory =
        updatedSubs.length !== state.substitutions.length
          ? pushSnapshot(state.substitutionsHistory, { substitutions: state.substitutions })
          : state.substitutionsHistory;

      // Clean up officiating designations for this day (BUG-19)
      const updatedOfficiatingAC = { ...state.officiatingAC };
      delete updatedOfficiatingAC[day];

      const updatedOfficiatingCT = { ...state.officiatingCT };
      delete updatedOfficiatingCT[day];

      return {
        absences: state.absences.filter((a) => a.day !== day),
        substitutions: updatedSubs,
        officiatingAC: updatedOfficiatingAC,
        officiatingCT: updatedOfficiatingCT,
        rosterHistory,
        substitutionsHistory,
      };
    }),

  releaseCoTeacher: (period, teacherName) =>
    set((state) => {
      const routineHistory = pushSnapshot(state.routineHistory, {
        schedule: state.schedule,
        displaced: state.displaced,
      });

      const day = state.selectedDay;
      const currentDaySchedule = { ...(state.schedule[day] || {}) };
      const periodMap = { ...(currentDaySchedule[period] || {}) };
      periodMap[teacherName] = 'Free';
      currentDaySchedule[period] = periodMap;

      return {
        schedule: {
          ...state.schedule,
          [day]: currentDaySchedule,
        },
        activeCoTeachSlot: null,
        routineHistory,
      };
    }),

  // Choosing a name never grants admin; admin office holders must use the passcode.
  login: (identity) => {
    if (adminOfficeToday(identity, get())) return { ok: false, needsPasscode: true };
    endAdminSession();
    set({ loggedInTeacher: identity, adminIdentity: null });
    return { ok: true };
  },
  logout: () => {
    endAdminSession();
    set({ loggedInTeacher: null, adminIdentity: null });
  },
  setEditingOverride: (on) => {
    if (on && !isAdmin(get())) return;
    writeEditingOverride(on);
    set({ editingOverride: on });
  },
  loginWithPasscode: async (identity, passcode) => {
    if (!adminOfficeToday(identity, get())) {
      return { ok: false, reason: 'Not an admin today.' };
    }
    const hash = getConfiguredAdminHash();
    if (!hash) {
      return { ok: false, reason: 'Admin passcode is not configured for this build. See docs/ADMIN_ACCESS.md.' };
    }
    if (!isWellFormedPasscode(passcode)) {
      // Not counted as an attempt: the keypad only submits six digits.
      return { ok: false, reason: 'Enter the 6-digit passcode.' };
    }
    const now = Date.now();
    const stored = readAdminLockout(now);
    const state = get();
    const lockedUntil = Math.max(stored.lockedUntil ?? 0, state.adminLockedUntil ?? 0);
    if (lockedUntil > now) {
      set({ adminLockedUntil: lockedUntil });
      return { ok: false, reason: `Too many attempts. Try again in ${formatWait(lockedUntil - now)}.`, lockedUntil };
    }
    let ok = false;
    try {
      ok = await verifyAdminPasscode(passcode, hash);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : 'Passcode check failed.' };
    }
    if (!ok) {
      const previous =
        stored.failures >= state.adminFailedAttempts
          ? stored
          : { failures: state.adminFailedAttempts, lockedUntil: null, lastFailureAt: now };
      const next = recordFailedAdminAttempt(previous, Date.now());
      set({ adminFailedAttempts: next.failures, adminLockedUntil: next.lockedUntil });
      return next.lockedUntil
        ? {
            ok: false,
            reason: `Too many attempts. Try again in ${formatWait(next.lockedUntil - Date.now())}.`,
            lockedUntil: next.lockedUntil,
          }
        : { ok: false, reason: 'Incorrect passcode.', lockedUntil: null };
    }
    clearAdminLockout();
    startAdminSession(hash, identity);
    set({ loggedInTeacher: identity, adminIdentity: identity, adminFailedAttempts: 0, adminLockedUntil: null });
    return { ok: true, lockedUntil: null };
  },

  acceptSubstitution: (id) =>
    set((state) => {
      const substitutionsHistory = pushSnapshot(state.substitutionsHistory, {
        substitutions: state.substitutions,
      });

      return {
        substitutions: state.substitutions.map((sub) =>
          sub.id === id ? { ...sub, status: 'ACCEPTED' as const, acceptedAt: Date.now() } : sub
        ),
        substitutionsHistory,
      };
    }),

  disputeSubstitution: (id, reason) =>
    set((state) => {
      const substitutionsHistory = pushSnapshot(state.substitutionsHistory, {
        substitutions: state.substitutions,
      });

      let disputedSub: SubstitutionAssignment | undefined;
      const updated = state.substitutions.map((sub) => {
        if (sub.id === id) {
          disputedSub = {
            ...sub,
            status: 'DISPUTED' as const,
            disputeRemark: reason,
            disputedAt: Date.now(),
          };
          return disputedSub;
        }
        return sub;
      });

      const newNotif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'DISPUTE',
        title: `Substitution Disputed by ${disputedSub?.substituteTeacher || 'Staff'}`,
        description: `Period ${disputedSub?.period} (${disputedSub?.className} • ${disputedSub?.subject}): "${reason}"`,
        timestamp: Date.now(),
        isRead: false,
        actionTab: 'substitutions',
        actionTarget: id,
      };

      return {
        substitutions: updated,
        notifications: [newNotif, ...state.notifications],
        substitutionsHistory,
        activeDisputeTarget: null,
      };
    }),

  openDisputeModal: (sub) => set({ activeDisputeTarget: sub }),
  closeDisputeModal: () => set({ activeDisputeTarget: null }),

  openNotificationCenter: () => set({ isNotificationCenterOpen: true }),
  closeNotificationCenter: () => set({ isNotificationCenterOpen: false }),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),
  clearAllNotifications: () => set({ notifications: [] }),
  addNotification: (notif) =>
    set((state) => ({
      notifications: [
        {
          ...notif,
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          isRead: false,
        },
        ...state.notifications,
      ],
    })),

  assignOfficiatingAC: (day, teacherName) =>
    set((state) => {
      const rosterHistory = pushSnapshot(state.rosterHistory, {
        absences: state.absences,
        availabilities: state.availabilities,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
      });

      return {
        officiatingAC: { ...state.officiatingAC, [day]: teacherName },
        activeOfficiatingTarget: null,
        rosterHistory,
      };
    }),

  assignOfficiatingCT: (day, section, teacherName) =>
    set((state) => {
      const rosterHistory = pushSnapshot(state.rosterHistory, {
        absences: state.absences,
        availabilities: state.availabilities,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
      });

      return {
        officiatingCT: {
          ...state.officiatingCT,
          [day]: { ...(state.officiatingCT[day] || {}), [section]: teacherName },
        },
        activeOfficiatingTarget: null,
        rosterHistory,
      };
    }),

  // FEAT-40: Per-Tab Isolated Undo
  undo: (tab) =>
    set((state) => {
      const active = tab || state.activeTab;

      if (active === 'routine') {
        if (state.routineHistory.past.length === 0) return {};
        const past = [...state.routineHistory.past];
        const previous = past.pop()!;
        const future = [{ schedule: state.schedule, displaced: state.displaced }, ...state.routineHistory.future];
        return {
          schedule: previous.schedule,
          displaced: previous.displaced || state.displaced,
          routineHistory: { past, future },
        };
      }

      if (active === 'substitutions') {
        if (state.substitutionsHistory.past.length === 0) return {};
        const past = [...state.substitutionsHistory.past];
        const previous = past.pop()!;
        const future = [{ substitutions: state.substitutions }, ...state.substitutionsHistory.future];
        return {
          substitutions: previous.substitutions,
          substitutionsHistory: { past, future },
        };
      }

      if (active === 'roster') {
        if (state.rosterHistory.past.length === 0) return {};
        const past = [...state.rosterHistory.past];
        const previous = past.pop()!;
        const future = [
          {
            absences: state.absences,
            availabilities: state.availabilities,
            officiatingAC: state.officiatingAC,
            officiatingCT: state.officiatingCT,
          },
          ...state.rosterHistory.future,
        ];
        return {
          absences: previous.absences,
          availabilities: previous.availabilities,
          officiatingAC: previous.officiatingAC,
          officiatingCT: previous.officiatingCT,
          rosterHistory: { past, future },
        };
      }

      return {};
    }),

  // FEAT-40: Per-Tab Isolated Redo
  redo: (tab) =>
    set((state) => {
      const active = tab || state.activeTab;

      if (active === 'routine') {
        if (state.routineHistory.future.length === 0) return {};
        const future = [...state.routineHistory.future];
        const next = future.shift()!;
        const past = [...state.routineHistory.past, { schedule: state.schedule, displaced: state.displaced }];
        return {
          schedule: next.schedule,
          displaced: next.displaced || state.displaced,
          routineHistory: { past, future },
        };
      }

      if (active === 'substitutions') {
        if (state.substitutionsHistory.future.length === 0) return {};
        const future = [...state.substitutionsHistory.future];
        const next = future.shift()!;
        const past = [...state.substitutionsHistory.past, { substitutions: state.substitutions }];
        return {
          substitutions: next.substitutions,
          substitutionsHistory: { past, future },
        };
      }

      if (active === 'roster') {
        if (state.rosterHistory.future.length === 0) return {};
        const future = [...state.rosterHistory.future];
        const next = future.shift()!;
        const past = [
          ...state.rosterHistory.past,
          {
            absences: state.absences,
            availabilities: state.availabilities,
            officiatingAC: state.officiatingAC,
            officiatingCT: state.officiatingCT,
          },
        ];
        return {
          absences: next.absences,
          availabilities: next.availabilities,
          officiatingAC: next.officiatingAC,
          officiatingCT: next.officiatingCT,
          rosterHistory: { past, future },
        };
      }

      return {};
    }),

  canUndo: (tab) => {
    const state = get();
    const active = tab || state.activeTab;
    if (active === 'routine') return state.routineHistory.past.length > 0;
    if (active === 'substitutions') return state.substitutionsHistory.past.length > 0;
    if (active === 'roster') return state.rosterHistory.past.length > 0;
    return false;
  },

  canRedo: (tab) => {
    const state = get();
    const active = tab || state.activeTab;
    if (active === 'routine') return state.routineHistory.future.length > 0;
    if (active === 'substitutions') return state.substitutionsHistory.future.length > 0;
    if (active === 'roster') return state.rosterHistory.future.length > 0;
    return false;
  },

  // FEAT-41: One-Tap Global Reset for current day (undoable)
  resetDay: (targetDay) =>
    set((state) => {
      if (!isAdmin(state)) return {};
      const day = targetDay || state.selectedDay;

      // Save snapshots to history across all 3 stacks so the reset is completely undoable
      const routineHistory = pushSnapshot(state.routineHistory, {
        schedule: state.schedule,
        displaced: state.displaced,
      });
      const substitutionsHistory = pushSnapshot(state.substitutionsHistory, {
        substitutions: state.substitutions,
      });
      const rosterHistory = pushSnapshot(state.rosterHistory, {
        absences: state.absences,
        availabilities: state.availabilities,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
      });

      const newSchedule = {
        ...state.schedule,
        [day]: getBaseSchedule()[day] || {},
      };

      const newAbsences = state.absences.filter((a) => a.day !== day);
      const newSubstitutions = state.substitutions.filter((s) => s.day !== day);
      const newOffAC = { ...state.officiatingAC, [day]: null };
      const newOffCT = { ...state.officiatingCT, [day]: {} };

      const newAvailabilities: Record<string, StaffAvailabilityRecord> = {};
      Object.keys(state.directory).forEach((abbr) => {
        newAvailabilities[abbr] = {
          teacherName: abbr,
          status: 'AVAILABLE',
          isAvailable: true,
          updatedAt: Date.now(),
        };
      });

      return {
        schedule: newSchedule,
        displaced: {
          ...state.displaced,
          [day]: [],
        },
        absences: newAbsences,
        substitutions: newSubstitutions,
        officiatingAC: newOffAC,
        officiatingCT: newOffCT,
        availabilities: newAvailabilities,
        routineHistory,
        substitutionsHistory,
        rosterHistory,
      };
    }),

  // FEAT-41: Purge all history buffers
  purgeHistory: () =>
    set((state) =>
      isAdmin(state)
        ? {
            routineHistory: { past: [], future: [] },
            substitutionsHistory: { past: [], future: [] },
            rosterHistory: { past: [], future: [] },
          }
        : {}
    ),
}));

// Bundle 34a: keep the derived `access` in step with its inputs (one helper for every gate),
// and close Developer Options the moment editing is no longer allowed.
const refreshAccess = (state: TimetableState) => {
  const next = resolveAccess(state);
  const patch: Partial<TimetableState> = {};
  if (!sameAccess(next, state.access)) patch.access = next;
  if (!next.canEdit && state.isDeveloperMode) patch.isDeveloperMode = false;
  if (Object.keys(patch).length) useTimetableStore.setState(patch);
};
refreshAccess(useTimetableStore.getState());
useTimetableStore.subscribe((state) => refreshAccess(state));

// FEAT-62: reload-safe local persistence of operational state (per calendar date).
if (operationalStorage && typeof window !== 'undefined') {
  installOperationalPersistence(useTimetableStore, {
    storage: operationalStorage,
    defaults: getBaseSchedule,
    appVersion: APP_VERSION,
    target: window,
    rolloverCheckMs: 60_000,
  });
  // FEAT-62 part 3: another tab applied newer Sheet data — rebase onto it here too.
  window.addEventListener('storage', (e) => {
    if (e.key !== REFERENCE_KEY) return;
    adoptStoredReference({
      getState: () => useTimetableStore.getState(),
      setState: (patch) => useTimetableStore.setState(patch as Partial<TimetableState>),
    });
  });
}
