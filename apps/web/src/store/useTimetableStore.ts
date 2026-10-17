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

interface TimetableState {
  // Navigation & View
  selectedDay: DayOfWeek;
  viewMode: 'teachers' | 'classes';
  isMinimalUI: boolean;
  isFitGrid: boolean;

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

  // Modal & Interaction States
  activeContextMenu: ContextMenuTarget | null;
  activeAvailabilityTeacher: string | null;
  activeCoTeachSlot: CoTeachSlotTarget | null;
  activeOfficiatingTarget: OfficiatingTarget | null;

  // Actions
  setDay: (day: DayOfWeek) => void;
  setViewMode: (mode: 'teachers' | 'classes') => void;
  toggleMinimalUI: () => void;
  toggleFitGrid: () => void;

  // Context Menu Actions
  openContextMenu: (target: ContextMenuTarget) => void;
  closeContextMenu: () => void;

  // Modal Actions
  openAvailabilityModal: (teacherName: string) => void;
  closeAvailabilityModal: () => void;
  openCoTeachModal: (slot: CoTeachSlotTarget) => void;
  closeCoTeachModal: () => void;
  openOfficiatingModal: (target: OfficiatingTarget) => void;
  closeOfficiatingModal: () => void;

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
}

export const useTimetableStore = create<TimetableState>((set) => ({
  selectedDay: 'MON',
  viewMode: 'teachers',
  isMinimalUI: true,
  isFitGrid: false,

  directory: DEFAULT_STAFF_DIRECTORY,
  schedule: DEFAULT_MASTER_SCHEDULE,

  absences: [],
  availabilities: {},
  substitutions: [],

  loggedInTeacher: null,
  officiatingAC: { MON: null, TUE: null, WED: null, THU: null, FRI: null, SAT: null },
  officiatingCT: { MON: {}, TUE: {}, WED: {}, THU: {}, FRI: {}, SAT: {} },

  activeContextMenu: null,
  activeAvailabilityTeacher: null,
  activeCoTeachSlot: null,
  activeOfficiatingTarget: null,

  setDay: (day) => set({ selectedDay: day }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleMinimalUI: () => set((state) => ({ isMinimalUI: !state.isMinimalUI })),
  toggleFitGrid: () => set((state) => ({ isFitGrid: !state.isFitGrid })),

  openContextMenu: (target) => set({ activeContextMenu: target }),
  closeContextMenu: () => set({ activeContextMenu: null }),

  openAvailabilityModal: (teacherName) => set({ activeAvailabilityTeacher: teacherName }),
  closeAvailabilityModal: () => set({ activeAvailabilityTeacher: null }),

  openCoTeachModal: (slot) => set({ activeCoTeachSlot: slot }),
  closeCoTeachModal: () => set({ activeCoTeachSlot: null }),

  openOfficiatingModal: (target) => set({ activeOfficiatingTarget: target }),
  closeOfficiatingModal: () => set({ activeOfficiatingTarget: null }),

  toggleAbsence: (teacherName, options = {}) =>
    set((state) => {
      const exists = state.absences.find(
        (a) => a.teacherName === teacherName && a.day === state.selectedDay
      );
      if (exists) {
        return {
          absences: state.absences.filter(
            (a) => !(a.teacherName === teacherName && a.day === state.selectedDay)
          ),
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

      return { absences: [...state.absences, newAbsence] };
    }),

  setStaffAvailability: (teacherName, status, options = {}) =>
    set((state) => ({
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
    })),

  assignSubstitution: (sub) =>
    set((state) => ({
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
    })),

  removeSubstitution: (id) =>
    set((state) => ({
      substitutions: state.substitutions.filter((s) => s.id !== id),
    })),

  // FEAT-31: Co-teacher per-period release only (clears this period's slot, leaves entire day intact)
  releaseCoTeacher: (period, teacherName) =>
    set((state) => {
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
      };
    }),

  login: (teacherName) => set({ loggedInTeacher: teacherName }),
  logout: () => set({ loggedInTeacher: null }),

  assignOfficiatingAC: (day, teacherName) =>
    set((state) => ({
      officiatingAC: { ...state.officiatingAC, [day]: teacherName },
      activeOfficiatingTarget: null,
    })),

  assignOfficiatingCT: (day, section, teacherName) =>
    set((state) => ({
      officiatingCT: {
        ...state.officiatingCT,
        [day]: { ...(state.officiatingCT[day] || {}), [section]: teacherName },
      },
      activeOfficiatingTarget: null,
    })),
}));
