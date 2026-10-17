import {
  DayOfWeek,
  PeriodId,
  Teacher,
  StaffDirectory,
  DailySchedule,
  MasterSchedule,
  AbsenceRecord,
  StaffAvailabilityRecord,
  SubstitutionAssignment,
  CandidateSubstitute,
  ParsedCellSlot,
  AutoResolveStrategy,
  AutoResolvePlan,
} from '../types/index.js';
import { DEFAULT_STAFF_DIRECTORY, DEFAULT_PERIODS } from '../data/seed.js';

export const KNOWN_CLASSES = ['KG A', 'KG B', 'PREP A', 'PREP B', 'NUR A', 'NUR B'];

/**
 * Extracts class section from a string (e.g. "ENG. REC. KG A" -> "KG A")
 */
export function extractClassSection(task: string): string | undefined {
  if (!task) return undefined;
  for (const cls of KNOWN_CLASSES) {
    if (task.toUpperCase().includes(cls)) {
      return cls;
    }
  }
  return undefined;
}

/**
 * Extracts all matching class sections from a task string
 */
export function extractClassSections(task: string): string[] {
  if (!task) return [];
  const upper = task.toUpperCase();
  return KNOWN_CLASSES.filter((cls) => upper.includes(cls));
}

/**
 * Checks if two teachers' assigned tasks in the same period represent co-teaching partners (LOGIC-03)
 */
export function areTeachersCoTeachingPartners(taskA: string, taskB: string): boolean {
  if (!taskA || !taskB) return false;
  const a = taskA.trim().toUpperCase();
  const b = taskB.trim().toUpperCase();
  if (a === 'FREE' || b === 'FREE' || a === '-' || b === '-') return false;

  // Identical tasks (e.g. both assigned "GAMES KG A")
  if (a === b) return true;

  // Joint classes (e.g. "GAMES KG A + KG B" sharing with "GAMES KG A" or "GAMES KG B")
  const aHasJoint = a.includes('+') || a.includes('&');
  const bHasJoint = b.includes('+') || b.includes('&');
  if (aHasJoint || bHasJoint) {
    const aSections = extractClassSections(a);
    const bSections = extractClassSections(b);
    const sharedSection = aSections.some((s) => bSections.includes(s));

    const aPrefix = a.replace(/^(1ST|2ND|3RD|4TH)\s+/i, '').split(' ')[0];
    const bPrefix = b.replace(/^(1ST|2ND|3RD|4TH)\s+/i, '').split(' ')[0];
    if (sharedSection && (aPrefix === bPrefix || aPrefix.includes(bPrefix) || bPrefix.includes(aPrefix))) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a teacher is actively co-teaching in a period and returns all partners (LOGIC-03)
 */
export function isTeacherCoTeachingInSlot(
  teacherName: string,
  period: PeriodId,
  schedule: DailySchedule
): { isCoTeaching: boolean; partners: string[] } {
  const currentTask = schedule[period]?.[teacherName];
  if (!currentTask || currentTask.trim().toLowerCase() === 'free' || currentTask === '-') {
    return { isCoTeaching: false, partners: [] };
  }

  const partners: string[] = [];
  const periodSchedule = schedule[period] || {};

  for (const [otherTeacher, otherTask] of Object.entries(periodSchedule)) {
    if (otherTeacher === teacherName) continue;
    if (areTeachersCoTeachingPartners(currentTask, otherTask)) {
      partners.push(otherTeacher);
    }
  }

  const isJoint = currentTask.includes('+') || currentTask.includes('&');

  return {
    isCoTeaching: partners.length > 0 || isJoint,
    partners,
  };
}

/**
 * Parses a raw timetable cell string into structured slot details
 */
export function parseCellSlot(raw: string): ParsedCellSlot {
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'free') {
    return { raw, isFree: true, isBreak: false };
  }
  if (raw.trim() === '-') {
    return { raw, isFree: false, isBreak: true };
  }

  const clean = raw.trim();
  const isCoTeaching = clean.includes('+') || clean.includes('&');
  const className = extractClassSection(clean);
  let subject = clean;
  if (className) {
    subject = clean.replace(className, '').replace(/\+.*$/, '').trim();
  }

  return {
    raw,
    isFree: false,
    isBreak: false,
    subject: subject || clean,
    className,
    isCoTeaching,
  };
}

/**
 * Checks if a teacher is absent or on Away (Official) duty during a period
 */
export function isTeacherUnavailableByAbsence(
  teacherName: string,
  period: PeriodId,
  absences: AbsenceRecord[]
): { isUnavailable: boolean; reason?: string; isAwayOfficial?: boolean } {
  const match = absences.find((a) => a.teacherName === teacherName);
  if (!match) return { isUnavailable: false };

  // If full day absence
  if (match.type === 'FULL_DAY') {
    return { isUnavailable: true, reason: match.reason || 'Absent (Full Day)' };
  }

  // If Away (Official) - FEAT-32
  if (match.type === 'AWAY_OFFICIAL') {
    if (!match.periods || match.periods.includes(period)) {
      return {
        isUnavailable: true,
        reason: `Away (Official): ${match.venue || match.reason || 'On Duty'}`,
        isAwayOfficial: true,
      };
    }
  }

  // If partial period absence
  if (match.type === 'PERIODS' && match.periods?.includes(period)) {
    return { isUnavailable: true, reason: match.reason || 'Absent (Selected Periods)' };
  }

  return { isUnavailable: false };
}

/**
 * Checks if a teacher is marked "Free from Sub" (FEAT-34 / FEAT-35)
 */
export function isTeacherFreeFromSub(
  teacherName: string,
  availabilities: Record<string, StaffAvailabilityRecord>
): { isFreeFromSub: boolean; remark?: string } {
  const record = availabilities[teacherName];
  if (!record) return { isFreeFromSub: false };
  if (!record.isAvailable || record.status === 'FREE_FROM_SUB') {
    return {
      isFreeFromSub: true,
      remark: record.remark || record.dutyPreset || 'Free from Sub',
    };
  }
  return { isFreeFromSub: false };
}

/**
 * Calculates candidate affinity score for a substitution slot
 */
export function calculateCandidateAffinity(
  teacher: Teacher,
  targetTask: string,
  period: PeriodId,
  day: DayOfWeek,
  schedule: DailySchedule,
  existingSubsCount = 0
): { score: number; breakdown: CandidateSubstitute['scoreBreakdown'] } {
  const parsed = parseCellSlot(targetTask);
  let subjectMatchScore = 0;
  let departmentMatchScore = 0;
  let workloadScore = 0;
  let consecutivePenalty = 0;

  // 1. Subject specialization
  if (parsed.subject && teacher.assignedSubjectPool) {
    const hasMatch = teacher.assignedSubjectPool.some(
      (s) =>
        s.toLowerCase().includes(parsed.subject!.toLowerCase()) ||
        parsed.subject!.toLowerCase().includes(s.toLowerCase())
    );
    if (hasMatch) {
      subjectMatchScore = 45;
    }
  }

  // 2. Class Team / Department alignment
  if (parsed.className && teacher.primaryClass === parsed.className) {
    departmentMatchScore += 35; // Class Teacher priority
  } else if (parsed.className && teacher.department.toLowerCase().includes(parsed.className.split(' ')[0].toLowerCase())) {
    departmentMatchScore += 20; // Department match (e.g. KG with KG)
  }

  // 3. Workload fair-share balance
  workloadScore = Math.max(-30, -(existingSubsCount * 10));

  // 4. Consecutive period fatigue penalty
  const periodOrder: PeriodId[] = ['G/PD', '1st', 'BREAK', '2nd', '3rd', '4th', '5th', '6th'];
  const pIndex = periodOrder.indexOf(period);
  if (pIndex > 0 && pIndex < periodOrder.length - 1) {
    const prevTask = schedule[periodOrder[pIndex - 1]]?.[teacher.abbr];
    const nextTask = schedule[periodOrder[pIndex + 1]]?.[teacher.abbr];
    const prevBusy = prevTask && prevTask !== 'Free' && prevTask !== '-';
    const nextBusy = nextTask && nextTask !== 'Free' && nextTask !== '-';
    if (prevBusy && nextBusy) {
      consecutivePenalty = -15; // Sandwiched period
    }
  }

  const totalScore = Math.max(
    0,
    100 + subjectMatchScore + departmentMatchScore + workloadScore + consecutivePenalty
  );

  return {
    score: totalScore,
    breakdown: {
      subjectMatch: subjectMatchScore,
      departmentMatch: departmentMatchScore,
      workloadFairShare: workloadScore,
      consecutiveFatigue: consecutivePenalty,
    },
  };
}

/**
 * Evaluates all staff members and returns a ranked list of candidate substitutes
 */
export function findAvailableSubstitutes(params: {
  day: DayOfWeek;
  period: PeriodId;
  targetTask: string;
  originalTeacher: string;
  schedule: DailySchedule;
  absences: AbsenceRecord[];
  availabilities: Record<string, StaffAvailabilityRecord>;
  existingAssignments: SubstitutionAssignment[];
  directory?: StaffDirectory;
}): CandidateSubstitute[] {
  const {
    day,
    period,
    targetTask,
    originalTeacher,
    schedule,
    absences,
    availabilities,
    existingAssignments,
    directory = DEFAULT_STAFF_DIRECTORY,
  } = params;

  const results: CandidateSubstitute[] = [];

  for (const teacher of Object.values(directory)) {
    // Cannot sub for self
    if (teacher.abbr === originalTeacher) continue;

    // 1. Check absence or Away (Official)
    const absenceCheck = isTeacherUnavailableByAbsence(teacher.abbr, period, absences);
    if (absenceCheck.isUnavailable) {
      results.push({
        teacher,
        isAvailable: false,
        unavailabilityReason: absenceCheck.reason,
        score: 0,
        scoreBreakdown: { subjectMatch: 0, departmentMatch: 0, workloadFairShare: 0, consecutiveFatigue: 0 },
      });
      continue;
    }

    // 2. Check "Free from Sub" toggle
    const subAvailCheck = isTeacherFreeFromSub(teacher.abbr, availabilities);
    if (subAvailCheck.isFreeFromSub) {
      results.push({
        teacher,
        isAvailable: false,
        unavailabilityReason: `Free from Sub: ${subAvailCheck.remark}`,
        score: 0,
        scoreBreakdown: { subjectMatch: 0, departmentMatch: 0, workloadFairShare: 0, consecutiveFatigue: 0 },
      });
      continue;
    }

    // 3. Check regular teaching conflict in this period
    const regularTask = schedule[period]?.[teacher.abbr];
    const isRegularFree = !regularTask || regularTask === 'Free';
    if (!isRegularFree) {
      results.push({
        teacher,
        isAvailable: false,
        unavailabilityReason: `Teaching: ${regularTask}`,
        score: 0,
        scoreBreakdown: { subjectMatch: 0, departmentMatch: 0, workloadFairShare: 0, consecutiveFatigue: 0 },
      });
      continue;
    }

    // 4. Check already assigned a sub in this period
    const alreadySubbing = existingAssignments.find(
      (sub) => sub.period === period && sub.substituteTeacher === teacher.abbr
    );
    if (alreadySubbing) {
      results.push({
        teacher,
        isAvailable: false,
        unavailabilityReason: `Subbing for ${alreadySubbing.originalTeacher} (${alreadySubbing.className})`,
        score: 0,
        scoreBreakdown: { subjectMatch: 0, departmentMatch: 0, workloadFairShare: 0, consecutiveFatigue: 0 },
      });
      continue;
    }

    // Count how many subs this teacher has already taken today
    const currentSubsCount = existingAssignments.filter(
      (s) => s.substituteTeacher === teacher.abbr
    ).length;

    // Calculate score
    const affinity = calculateCandidateAffinity(
      teacher,
      targetTask,
      period,
      day,
      schedule,
      currentSubsCount
    );

    results.push({
      teacher,
      isAvailable: true,
      score: affinity.score,
      scoreBreakdown: affinity.breakdown,
    });
  }

  // Sort available candidates by score descending, unavailable at the bottom
  return results.sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return b.score - a.score;
  });
}

/**
 * Auto-Resolve Solver: Generates an automated allocation plan for uncovered periods
 */
export function autoResolveSubstitutions(params: {
  day: DayOfWeek;
  uncoveredSlots: Array<{
    period: PeriodId;
    originalTeacher: string;
    task: string;
  }>;
  schedule: DailySchedule;
  absences: AbsenceRecord[];
  availabilities: Record<string, StaffAvailabilityRecord>;
  directory?: StaffDirectory;
  strategy?: AutoResolveStrategy;
}): AutoResolvePlan {
  const {
    day,
    uncoveredSlots,
    schedule,
    absences,
    availabilities,
    directory = DEFAULT_STAFF_DIRECTORY,
    strategy = 'SUBJECT_MATCH',
  } = params;

  const assignments: AutoResolvePlan['assignments'] = [];
  const unresolvedSlots: AutoResolvePlan['unresolvedSlots'] = [];
  const simulatedSubs: SubstitutionAssignment[] = [];

  for (const slot of uncoveredSlots) {
    const parsed = parseCellSlot(slot.task);
    const candidates = findAvailableSubstitutes({
      day,
      period: slot.period,
      targetTask: slot.task,
      originalTeacher: slot.originalTeacher,
      schedule,
      absences,
      availabilities,
      existingAssignments: simulatedSubs,
      directory,
    });

    const viableCandidate = candidates.find((c) => c.isAvailable);

    if (viableCandidate) {
      const assignmentRecord: SubstitutionAssignment = {
        id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        day,
        period: slot.period,
        originalTeacher: slot.originalTeacher,
        substituteTeacher: viableCandidate.teacher.abbr,
        className: parsed.className || 'General',
        subject: parsed.subject || 'Support',
        status: 'COVERED',
        assignedAt: Date.now(),
        assignedBy: `Auto-Resolve (${strategy})`,
      };

      simulatedSubs.push(assignmentRecord);
      assignments.push({
        period: slot.period,
        originalTeacher: slot.originalTeacher,
        substituteTeacher: viableCandidate.teacher.abbr,
        className: parsed.className || 'General',
        subject: parsed.subject || 'Support',
        score: viableCandidate.score,
      });
    } else {
      unresolvedSlots.push({
        period: slot.period,
        originalTeacher: slot.originalTeacher,
        className: parsed.className || 'General',
        subject: parsed.subject || 'Support',
        reason: 'No available teachers free in this period',
      });
    }
  }

  return {
    strategy,
    assignments,
    unresolvedSlots,
  };
}

