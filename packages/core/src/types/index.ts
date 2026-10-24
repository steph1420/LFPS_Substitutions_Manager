/**
 * LFPS Core TypeScript Domain Contracts
 * Strict types for Project 1 Next-Gen (Timetable & Substitutions Engine)
 */

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export type PeriodId =
  | 'G/PD'
  | '1st'
  | 'BREAK'
  | '2nd'
  | '3rd'
  | '4th'
  | 'PLAYTIME / 2ND GOLDEN HOUR'
  | '5th'
  | '6th'
  | (string & {});

export type StaffRole =
  | 'Principal'
  | 'Class Teacher / Academic Coordinator'
  | 'Class Teacher / Asst. Academic Coordinator'
  | 'Class Teacher'
  | '2nd Teacher'
  | '3rd Teacher'
  | 'Admin';

export interface Teacher {
  id: string; // e.g. "STAFF-01"
  fullName: string;
  abbr: string; // e.g. "Mrs. S. Lakra"
  role: StaffRole;
  primaryClass?: string;
  periodsTaught: number;
  initials: string;
  department: string;
  assignedSubjectPool: string[];
}

export type StaffDirectory = Record<string, Teacher>;

export interface ParsedCellSlot {
  raw: string;
  isFree: boolean;
  isBreak: boolean;
  subject?: string;
  className?: string;
  isCoTeaching?: boolean;
  coTeachers?: string[];
}

export type DailySchedule = Record<string, Record<string, string>>;

export type MasterSchedule = Record<DayOfWeek, DailySchedule>;

/**
 * FEAT-32: Away (Official) / Off-Campus Deputation
 * Teachers sent on official duties (supplies, recon, invitations).
 * Legally present/on-duty for attendance, but periods need substitution.
 */
export type AbsenceType = 'FULL_DAY' | 'PERIODS' | 'AWAY_OFFICIAL';

export interface AbsenceRecord {
  teacherId: string;
  teacherName: string;
  day: DayOfWeek;
  date?: string;
  type: AbsenceType;
  /**
   * For partial day absences or Away (Official) periods (FEAT-33)
   */
  periods?: PeriodId[];
  reason?: string;
  venue?: string; // e.g., "Main Market for Science Lab Supplies"
  markedAt: number;
  markedBy?: string;
}

/**
 * FEAT-34 & FEAT-35: Substitution Availability
 * Standardized: "Available for Sub" <-> "Free from Sub"
 */
export type SubAvailabilityStatus = 'AVAILABLE' | 'FREE_FROM_SUB';

export type DutyPreset = 'BUS_DUTY' | 'PTM' | 'EXAM_DUTY' | 'AWAY_OFFICIAL';

export interface StaffAvailabilityRecord {
  teacherName: string;
  status: SubAvailabilityStatus;
  isAvailable: boolean; // true = Available for Sub, false = Free from Sub
  dutyPreset?: DutyPreset;
  remark?: string;
  updatedAt: number;
}

export type SubstitutionStatus = 'PENDING' | 'COVERED' | 'FREE_FROM_SUB' | 'ACCEPTED' | 'DISPUTED';

export interface SubstitutionAssignment {
  id: string;
  day: DayOfWeek;
  period: PeriodId;
  originalTeacher: string;
  substituteTeacher?: string;
  className: string;
  subject: string;
  status: SubstitutionStatus;
  remark?: string;
  disputeRemark?: string;
  acceptedAt?: number;
  disputedAt?: number;
  assignedAt: number;
  assignedBy?: string;
}

export type UserRole = 'ADMIN' | 'TEACHER' | 'GUEST';

export type NotificationType = 'DISPUTE' | 'UNCOVERED' | 'OFFICIATING' | 'CONFLICT' | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  isRead: boolean;
  actionTab?: 'routine' | 'substitutions' | 'roster';
  actionTarget?: any;
}

export type OfficiatingRoleType = 'OFF_CT' | 'OFF_AC';

export interface OfficiatingAssignment {
  role: OfficiatingRoleType;
  targetClass?: string; // For Off. CT (e.g. "PREP A")
  assignedTeacher: string;
  assignedBy: string;
  assignedAt: number;
}

export interface EffectiveOfficiatingACResult {
  effectiveAC: string | null;
  isAutoOfficiating: boolean; // true if AAC acts on behalf of AC
  needsAppointment: boolean; // true if both AC & AAC are absent and no officiating AC has been assigned
  isManuallyAssigned: boolean;
  reason: string;
}

export interface CandidateSubstitute {
  teacher: Teacher;
  isAvailable: boolean;
  unavailabilityReason?: string;
  score: number;
  scoreBreakdown: {
    subjectMatch: number;
    departmentMatch: number;
    workloadFairShare: number;
    consecutiveFatigue: number;
    officiatingMatch?: number;
    secondTeacherMatch?: number;
    preferredOverride?: number;
  };
}

export interface AutoResolvePolicyConfig {
  prioritizeOfficiatingCT: boolean; // Whole-Day Off. CT assigned across all their section's periods (BUG-18)
  sameSubjectWeight: number; // Co-Workers in same subject (default: 40)
  classTeacherWeight: number; // Class Teacher priority (default: 35)
  secondTeacherWeight: number; // 2nd Teacher / Co-Teacher in class (default: 30)
  workloadBalancingWeight: number; // Workload fair share penalty (default: 15)
  consecutiveFatiguePenalty: number; // Consecutive period fatigue penalty (default: 15)
  preferredSubjectOverrides?: Record<string, string>; // Subject -> TeacherAbbr (Principal subject overrides)
}

export const DEFAULT_AUTORESOLVE_POLICY: AutoResolvePolicyConfig = {
  prioritizeOfficiatingCT: true,
  sameSubjectWeight: 40,
  classTeacherWeight: 35,
  secondTeacherWeight: 30,
  workloadBalancingWeight: 15,
  consecutiveFatiguePenalty: 15,
  preferredSubjectOverrides: {},
};

export type AutoResolveStrategy = 'SUBJECT_MATCH' | 'BALANCED_LOAD' | 'MINIMAL_SPLITS' | 'BRAIN_POLICY';

export interface AutoResolvePlan {
  strategy: AutoResolveStrategy;
  assignments: Array<{
    period: PeriodId;
    originalTeacher: string;
    substituteTeacher: string;
    className: string;
    subject: string;
    score: number;
  }>;
  unresolvedSlots: Array<{
    period: PeriodId;
    originalTeacher: string;
    className: string;
    subject: string;
    reason: string;
  }>;
}

