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

interface TimetableState {
  // Navigation & View
  selectedDay: DayOfWeek;
  viewMode: 'teachers' | 'classes';
  isMinimalUI: boolean;

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

  // Actions
  setDay: (day: DayOfWeek) => void;
  setViewMode: (mode: 'teachers' | 'classes') => void;
  toggleMinimalUI: () => void;

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

  login: (teacherName: string) => void;
  logout: () => void;
  assignOfficiatingAC: (day: DayOfWeek, teacherName: string) => void;
  assignOfficiatingCT: (day: DayOfWeek, section: string, teacherName: string) => void;
}

export const useTimetableStore = create<TimetableState>((set) => ({
  selectedDay: 'MON',
  viewMode: 'teachers',
  isMinimalUI: true,

  directory: DEFAULT_STAFF_DIRECTORY,
  schedule: DEFAULT_MASTER_SCHEDULE,

  absences: [],
  availabilities: {},
  substitutions: [],

  loggedInTeacher: null,
  officiatingAC: { MON: null, TUE: null, WED: null, THU: null, FRI: null, SAT: null },
  officiatingCT: { MON: {}, TUE: {}, WED: {}, THU: {}, FRI: {}, SAT: {} },

  setDay: (day) => set({ selectedDay: day }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleMinimalUI: () => set((state) => ({ isMinimalUI: !state.isMinimalUI })),

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

  login: (teacherName) => set({ loggedInTeacher: teacherName }),
  logout: () => set({ loggedInTeacher: null }),

  assignOfficiatingAC: (day, teacherName) =>
    set((state) => ({
      officiatingAC: { ...state.officiatingAC, [day]: teacherName },
    })),

  assignOfficiatingCT: (day, section, teacherName) =>
    set((state) => ({
      officiatingCT: {
        ...state.officiatingCT,
        [day]: { ...(state.officiatingCT[day] || {}), [section]: teacherName },
      },
    })),
}));

