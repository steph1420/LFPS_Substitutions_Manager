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

export const useTimetableStore = create<TimetableState>((set, get) => ({
  selectedDay: 'MON',
  activeTab: 'routine',
  viewMode: 'teachers',
  isMinimalUI: true,
  isFitGrid: false,
  isSettingsOpen: false,
  isStaffLoginOpen: false,

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
  toggleMinimalUI: () => set((state) => ({ isMinimalUI: !state.isMinimalUI })),
  toggleFitGrid: () => set((state) => ({ isFitGrid: !state.isFitGrid })),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openStaffLogin: () => set({ isStaffLoginOpen: true }),
  closeStaffLogin: () => set({ isStaffLoginOpen: false }),

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

        return {
          absences: state.absences.filter(
            (a) => !(a.teacherName === teacherName && a.day === state.selectedDay)
          ),
          substitutions: updatedSubs,
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
