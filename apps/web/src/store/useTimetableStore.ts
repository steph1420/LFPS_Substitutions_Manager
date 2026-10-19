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
  DEFAULT_STAFF_DIRECTORY,
  DEFAULT_MASTER_SCHEDULE,
} from '@lfps/core';

export interface ContextMenuTarget {
  x: number;
  y: number;
  teacher: string;
  period?: PeriodId;
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

export interface RoutineSnapshot {
  schedule: MasterSchedule;
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

interface TimetableState {
  // Navigation & View
  selectedDay: DayOfWeek;
  activeTab: ActiveTab;
  viewMode: 'teachers' | 'classes';
  isMinimalUI: boolean;
  isFitGrid: boolean;
  isSettingsOpen: boolean;
  isStaffLoginOpen: boolean;

  // User Preferences (FEAT-45, FEAT-55, FEAT-58, FEAT-60)
  hideOverviewsByDefault: boolean;
  hideAbsentStaff: boolean;
  substitutionsViewMode: 'grid' | 'list';
  rosterViewMode: RosterViewMode;
  substitutionsSortBy: 'name' | 'role' | 'period';
  rosterSortBy: 'role' | 'name';

  // Master Data
  directory: StaffDirectory;
  schedule: MasterSchedule;

  // Operational State
  absences: AbsenceRecord[];
  availabilities: Record<string, StaffAvailabilityRecord>;
  substitutions: SubstitutionAssignment[];

  // Authentication & Officiating
  loggedInTeacher: string | null;
  officiatingAC: Record<DayOfWeek, string | null>;
  officiatingCT: Record<DayOfWeek, Record<string, string>>;

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

  login: (teacherName: string) => void;
  logout: () => void;
  assignOfficiatingAC: (day: DayOfWeek, teacherName: string) => void;
  assignOfficiatingCT: (day: DayOfWeek, section: string, teacherName: string) => void;

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
  isMinimalUI?: boolean;
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
const initialPolicy = loadStoredPolicy();

const getInitialRosterMode = (saved?: RosterViewMode): RosterViewMode => {
  if (saved === 'list' || saved === 'compact-list') return 'compact-list';
  if (saved === 'detailed-list' || saved === 'normal-list') return 'normal-list';
  if (saved === 'compact-grid') return 'compact-grid';
  if (saved === 'grid' || saved === 'comfort-grid' || saved === 'normal-grid') return 'normal-grid';
  return 'normal-grid';
};

export const useTimetableStore = create<TimetableState>((set, get) => ({
  selectedDay: 'MON',
  activeTab: 'routine',
  viewMode: 'teachers',
  isMinimalUI: initialPrefs.isMinimalUI ?? false,
  isFitGrid: false,
  isSettingsOpen: false,
  isStaffLoginOpen: false,

  hideOverviewsByDefault: initialPrefs.hideOverviewsByDefault ?? false,
  hideAbsentStaff: initialPrefs.hideAbsentStaff ?? false,
  substitutionsViewMode: initialPrefs.substitutionsViewMode ?? 'grid',
  rosterViewMode: getInitialRosterMode(initialPrefs.rosterViewMode),
  substitutionsSortBy: initialPrefs.substitutionsSortBy ?? 'period',
  rosterSortBy: initialPrefs.rosterSortBy ?? 'role',
  autoResolvePolicy: initialPolicy,

  directory: DEFAULT_STAFF_DIRECTORY,
  schedule: DEFAULT_MASTER_SCHEDULE,

  absences: [],
  availabilities: {},
  substitutions: [],

  loggedInTeacher: null,
  officiatingAC: { MON: null, TUE: null, WED: null, THU: null, FRI: null, SAT: null },
  officiatingCT: { MON: {}, TUE: {}, WED: {}, THU: {}, FRI: {}, SAT: {} },

  routineHistory: { past: [], future: [] },
  substitutionsHistory: { past: [], future: [] },
  rosterHistory: { past: [], future: [] },

  activeContextMenu: null,
  activeResetPurgeMenu: null,
  activeAvailabilityTeacher: null,
  activeCoTeachSlot: null,
  activeOfficiatingTarget: null,
  activeAssignSubSlot: null,

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
  savePreferences: () => {
    const state = get();
    autoPersistPreferences({
      hideOverviewsByDefault: state.hideOverviewsByDefault,
      hideAbsentStaff: state.hideAbsentStaff,
      substitutionsViewMode: state.substitutionsViewMode,
      rosterViewMode: state.rosterViewMode,
      substitutionsSortBy: state.substitutionsSortBy,
      rosterSortBy: state.rosterSortBy,
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
      isMinimalUI: false,
    });
  },

  updateAutoResolvePolicy: (policyUpdate) =>
    set((state) => {
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
    set(() => {
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

  login: (teacherName) => set({ loggedInTeacher: teacherName }),
  logout: () => set({ loggedInTeacher: null }),

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
        const future = [{ schedule: state.schedule }, ...state.routineHistory.future];
        return {
          schedule: previous.schedule,
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
        const past = [...state.routineHistory.past, { schedule: state.schedule }];
        return {
          schedule: next.schedule,
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
      const day = targetDay || state.selectedDay;

      // Save snapshots to history across all 3 stacks so the reset is completely undoable
      const routineHistory = pushSnapshot(state.routineHistory, { schedule: state.schedule });
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
        [day]: DEFAULT_MASTER_SCHEDULE[day] || {},
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
    set({
      routineHistory: { past: [], future: [] },
      substitutionsHistory: { past: [], future: [] },
      rosterHistory: { past: [], future: [] },
    }),
}));
