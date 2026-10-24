import { describe, it, expect } from 'vitest';
import {
  parseCellSlot,
  areTeachersCoTeachingPartners,
  isTeacherCoTeachingInSlot,
  getDisambiguatedTeacherName,
  findAvailableSubstitutes,
  autoResolveSubstitutions,
  isTeacherUnavailableByAbsence,
  DEFAULT_STAFF_DIRECTORY,
  DEFAULT_MASTER_SCHEDULE,
  AbsenceRecord,
  StaffAvailabilityRecord,
  getEffectiveOfficiatingAC,
  getSubjectFullName,
  SUBJECT_FULL_NAMES,
} from '../src/index.js';

describe('LFPS Core Solver & Domain Engine', () => {
  describe('Cell Parsing', () => {
    it('parses instructional slots with class section and subject', () => {
      const parsed = parseCellSlot('ENG. REC. KG A');
      expect(parsed.isFree).toBe(false);
      expect(parsed.isBreak).toBe(false);
      expect(parsed.className).toBe('KG A');
      expect(parsed.subject).toBe('ENG. REC.');
      expect(parsed.isCoTeaching).toBe(false);
    });

    it('identifies co-teaching dual-class slots', () => {
      const parsed = parseCellSlot('GAMES KG A + KG B');
      expect(parsed.isCoTeaching).toBe(true);
      expect(parsed.subject).toBe('GAMES');
    });

    it('identifies co-teaching partners sharing classes or joint sessions (LOGIC-03)', () => {
      expect(areTeachersCoTeachingPartners('GAMES KG A + KG B', 'GAMES KG A')).toBe(true);
      expect(areTeachersCoTeachingPartners('GAMES KG A + KG B', 'GAMES KG B')).toBe(true);
      expect(areTeachersCoTeachingPartners('ENG. REC. KG A', 'ENG. REC. KG A')).toBe(true);
      expect(areTeachersCoTeachingPartners('ENG. REC. KG A', 'MATH KG B')).toBe(false);

      const monSchedule = DEFAULT_MASTER_SCHEDULE['MON'];
      // Mr. S. A. Lakra, Ms. A. Amira, Mrs. S. Bage in G/PD
      const lakraSlot = isTeacherCoTeachingInSlot('Mr. S. A. Lakra', 'G/PD', monSchedule);
      const amiraSlot = isTeacherCoTeachingInSlot('Ms. A. Amira', 'G/PD', monSchedule);
      const bageSlot = isTeacherCoTeachingInSlot('Mrs. S. Bage', 'G/PD', monSchedule);

      expect(lakraSlot.isCoTeaching).toBe(true);
      expect(amiraSlot.isCoTeaching).toBe(true);
      expect(bageSlot.isCoTeaching).toBe(true);
      expect(amiraSlot.partners).toContain('Mr. S. A. Lakra');
      expect(bageSlot.partners).toContain('Mr. S. A. Lakra');
    });

    it('recognizes Free and Break slots', () => {
      expect(parseCellSlot('Free').isFree).toBe(true);
      expect(parseCellSlot('free').isFree).toBe(true);
      expect(parseCellSlot('-').isBreak).toBe(true);
    });

    it('canonical subject nomenclature: M. SC. is strictly Moral Science (not Mental)', () => {
      expect(getSubjectFullName('M. SC.')).toBe('Moral Science');
      expect(SUBJECT_FULL_NAMES['M. SC.']).toBe('Moral Science');
    });
  });

  describe('Staff Disambiguation (FEAT-27)', () => {
    it('returns clean name for unique teacher', () => {
      const name = getDisambiguatedTeacherName('Mrs. S. Lakra', DEFAULT_STAFF_DIRECTORY);
      expect(name).toBe('Mrs. S. Lakra');
    });

    it('forces qualification when requested or ambiguous', () => {
      const qualified = getDisambiguatedTeacherName('Mrs. S. Lakra', DEFAULT_STAFF_DIRECTORY, true);
      expect(qualified).toBe('Mrs. S. Lakra (KG A)');
    });
  });

  describe('Absence & Away (Official) Engine (FEAT-32 & FEAT-33)', () => {
    it('marks full day absence as unavailable for all periods', () => {
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-01',
          teacherName: 'Mrs. S. Lakra',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];

      const res = isTeacherUnavailableByAbsence('Mrs. S. Lakra', '1st', absences);
      expect(res.isUnavailable).toBe(true);
      expect(res.isAwayOfficial).toBeFalsy();
    });

    it('handles Away (Official) deputations with venue', () => {
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-02',
          teacherName: 'Mrs. M. Midha',
          day: 'MON',
          type: 'AWAY_OFFICIAL',
          venue: 'Main Market for Science Lab Supplies',
          periods: ['1st', '2nd'],
          markedAt: Date.now(),
        },
      ];

      // Blocked during 1st period
      const p1 = isTeacherUnavailableByAbsence('Mrs. M. Midha', '1st', absences);
      expect(p1.isUnavailable).toBe(true);
      expect(p1.isAwayOfficial).toBe(true);
      expect(p1.reason).toContain('Away (Official)');

      // Free during 4th period
      const p4 = isTeacherUnavailableByAbsence('Mrs. M. Midha', '4th', absences);
      expect(p4.isUnavailable).toBe(false);
    });
  });

  describe('Candidate Substitute Solver & Ranking', () => {
    it('finds and ranks available substitutes for an absent teacher on Monday', () => {
      const schedule = DEFAULT_MASTER_SCHEDULE['MON'];
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-01',
          teacherName: 'Mrs. S. Lakra',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];

      const availabilities: Record<string, StaffAvailabilityRecord> = {};

      const candidates = findAvailableSubstitutes({
        day: 'MON',
        period: '1st',
        targetTask: 'M. SC. KG A',
        originalTeacher: 'Mrs. S. Lakra',
        schedule,
        absences,
        availabilities,
        existingAssignments: [],
      });

      expect(candidates.length).toBeGreaterThan(0);
      const topCandidate = candidates[0];
      expect(topCandidate.isAvailable).toBe(true);
      expect(topCandidate.score).toBeGreaterThan(0);

      // Verify that absent teacher is never picked
      const lakra = candidates.find((c) => c.teacher.abbr === 'Mrs. S. Lakra');
      expect(lakra).toBeUndefined(); // Should not sub for self
    });

    it('respects Free from Sub toggle (FEAT-34 / FEAT-35)', () => {
      const schedule = DEFAULT_MASTER_SCHEDULE['MON'];
      const absences: AbsenceRecord[] = [];
      const availabilities: Record<string, StaffAvailabilityRecord> = {
        'Ms. N. Horo': {
          teacherName: 'Ms. N. Horo',
          status: 'FREE_FROM_SUB',
          isAvailable: false,
          dutyPreset: 'BUS_DUTY',
          remark: 'Bus Duty',
          updatedAt: Date.now(),
        },
      };

      const candidates = findAvailableSubstitutes({
        day: 'MON',
        period: '1st',
        targetTask: 'M. SC. KG A',
        originalTeacher: 'Mrs. S. Lakra',
        schedule,
        absences,
        availabilities,
        existingAssignments: [],
      });

      const horo = candidates.find((c) => c.teacher.abbr === 'Ms. N. Horo');
      expect(horo).toBeDefined();
      expect(horo?.isAvailable).toBe(false);
      expect(horo?.unavailabilityReason).toContain('Free from Sub');
    });
  });

  describe('Auto-Resolve Substitution Engine', () => {
    it('generates complete auto-resolve plan for uncovered periods', () => {
      const schedule = DEFAULT_MASTER_SCHEDULE['MON'];
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-01',
          teacherName: 'Mrs. S. Lakra',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];

      const plan = autoResolveSubstitutions({
        day: 'MON',
        uncoveredSlots: [
          { period: '1st', originalTeacher: 'Mrs. S. Lakra', task: 'M. SC. KG A' },
          { period: '4th', originalTeacher: 'Mrs. S. Lakra', task: 'ENG. ORAL KG A' },
        ],
        schedule,
        absences,
        availabilities: {},
        strategy: 'SUBJECT_MATCH',
      });

      expect(plan.assignments.length).toBe(2);
      expect(plan.assignments[0].period).toBe('1st');
      expect(plan.assignments[1].period).toBe('4th');
      expect(plan.unresolvedSlots.length).toBe(0);
    });

    it('allots subject substitutes as per curriculum rules while respecting designated Officiating CT (BUG-18 & USER-DIRECTIVE)', () => {
      const schedule = DEFAULT_MASTER_SCHEDULE['MON'];
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-02',
          teacherName: 'Mrs. S. Lakra', // CT for KG A
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];

      // Designate Mrs. S. Bage as Off. CT for KG A on MON
      const officiatingCT = {
        MON: { 'KG A': 'Mrs. S. Bage' },
      };

      const plan = autoResolveSubstitutions({
        day: 'MON',
        uncoveredSlots: [
          { period: '1st', originalTeacher: 'Mrs. S. Lakra', task: 'ENG. REC. KG A' },
          { period: '3rd', originalTeacher: 'Mrs. S. Lakra', task: 'ENG. ORAL KG A' },
        ],
        schedule,
        absences,
        availabilities: {},
        officiatingCT,
        policyConfig: {
          prioritizeOfficiatingCT: true,
          sameSubjectWeight: 40,
          classTeacherWeight: 35,
          secondTeacherWeight: 30,
          workloadBalancingWeight: 15,
          consecutiveFatiguePenalty: 15,
        },
      });

      expect(plan.assignments.length).toBe(2);
      // Allots subject specialist (Ms. N. Horo for English Recitation) per subject rules
      expect(plan.assignments[0].substituteTeacher).toBe('Ms. N. Horo');
      expect(plan.unresolvedSlots.length).toBe(0);
    });

    it('respects Principal preferred subject override in policy configuration (FEAT-61)', () => {
      const schedule = DEFAULT_MASTER_SCHEDULE['MON'];
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-02',
          teacherName: 'Mrs. S. Lakra',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];

      // Principal override: Mathematics/M. SC. in 1st period must be given to Ms. K. Sanga (who is Free)
      const plan = autoResolveSubstitutions({
        day: 'MON',
        uncoveredSlots: [
          { period: '1st', originalTeacher: 'Mrs. S. Lakra', task: 'M. SC. KG A' },
        ],
        schedule,
        absences,
        availabilities: {},
        policyConfig: {
          prioritizeOfficiatingCT: false,
          sameSubjectWeight: 40,
          classTeacherWeight: 35,
          secondTeacherWeight: 30,
          workloadBalancingWeight: 15,
          consecutiveFatiguePenalty: 15,
          preferredSubjectOverrides: {
            'M. SC.': 'Ms. K. Sanga',
          },
        },
      });

      expect(plan.assignments.length).toBe(1);
      expect(plan.assignments[0].substituteTeacher).toBe('Ms. K. Sanga');
    });
  });

  describe('Academic Coordinator Succession & Officiating Logic (LOGIC-04)', () => {
    const emptyOfficiatingMap = { MON: null, TUE: null, WED: null, THU: null, FRI: null, SAT: null };

    it('retains Primary AC when she is present and on duty', () => {
      const res = getEffectiveOfficiatingAC({
        day: 'MON',
        absences: [],
        officiatingACMap: emptyOfficiatingMap,
      });
      expect(res.effectiveAC).toBe('Mrs. R. Pahwa');
      expect(res.isAutoOfficiating).toBe(false);
      expect(res.needsAppointment).toBe(false);
    });

    it('automatically appoints Assistant AC (Mrs. S. Lakra) as Off. AC when Primary AC is absent', () => {
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-03',
          teacherName: 'Mrs. R. Pahwa',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];
      const res = getEffectiveOfficiatingAC({
        day: 'MON',
        absences,
        officiatingACMap: emptyOfficiatingMap,
      });
      expect(res.effectiveAC).toBe('Mrs. S. Lakra');
      expect(res.isAutoOfficiating).toBe(true);
      expect(res.needsAppointment).toBe(false);
    });

    it('requires manual appointment when BOTH AC and AAC are absent', () => {
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-03',
          teacherName: 'Mrs. R. Pahwa',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
        {
          teacherId: 'STAFF-01',
          teacherName: 'Mrs. S. Lakra',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];
      const res = getEffectiveOfficiatingAC({
        day: 'MON',
        absences,
        officiatingACMap: emptyOfficiatingMap,
      });
      expect(res.effectiveAC).toBeNull();
      expect(res.isAutoOfficiating).toBe(false);
      expect(res.needsAppointment).toBe(true);
    });

    it('respects manual appointment override even if both are absent', () => {
      const absences: AbsenceRecord[] = [
        {
          teacherId: 'STAFF-03',
          teacherName: 'Mrs. R. Pahwa',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
        {
          teacherId: 'STAFF-01',
          teacherName: 'Mrs. S. Lakra',
          day: 'MON',
          type: 'FULL_DAY',
          markedAt: Date.now(),
        },
      ];
      const res = getEffectiveOfficiatingAC({
        day: 'MON',
        absences,
        officiatingACMap: { ...emptyOfficiatingMap, MON: 'Mrs. M. Midha' },
      });
      expect(res.effectiveAC).toBe('Mrs. M. Midha');
      expect(res.isAutoOfficiating).toBe(false);
      expect(res.needsAppointment).toBe(false);
      expect(res.isManuallyAssigned).toBe(true);
    });

    it('always resolves to Primary AC when AC is present, ignoring stale manual mappings (BUG-19)', () => {
      const absences: AbsenceRecord[] = []; // AC is present
      const res = getEffectiveOfficiatingAC({
        day: 'MON',
        absences,
        officiatingACMap: { ...emptyOfficiatingMap, MON: 'Mrs. M. Midha' },
      });
      expect(res.effectiveAC).toBe('Mrs. R. Pahwa');
      expect(res.isAutoOfficiating).toBe(false);
      expect(res.isManuallyAssigned).toBe(false);
      expect(res.needsAppointment).toBe(false);
    });
  });
});

