import type { AbsenceRecord, DayOfWeek, StaffDirectory, Teacher } from '../types/index.js';
import { getEffectiveOfficiatingAC } from '../solver/index.js';
import { ASSISTANT_AC, PRIMARY_AC } from '../data/seed.js';

/**
 * Admin hierarchy (Bundle 34a). These four offices administer the timetable; everyone
 * else identifies themselves only. Holding an office makes a login *eligible* for admin;
 * the web app still asks for the admin passcode before granting it.
 */
export type AdminOffice = 'PRINCIPAL' | 'AC' | 'AAC' | 'OFF_AC';

/**
 * Login identity for the Principal when the Staff Directory has no one with role
 * 'Principal'. The school data (seed and the Google Sheet) names no Principal, so the
 * office is offered by designation, never by an invented name.
 */
export const PRINCIPAL_DESIGNATION = 'Principal';

export const ADMIN_OFFICE_LABEL: Record<AdminOffice, string> = {
  PRINCIPAL: 'Principal',
  AC: 'Academic Coordinator',
  AAC: 'Asst. Academic Coordinator',
  OFF_AC: 'Off. AC',
};

const isAacRole = (t: Teacher) => t.role.includes('Asst. Academic Coordinator');
const isAcRole = (t: Teacher) => t.role.includes('Academic Coordinator') && !isAacRole(t);

function findStaff(directory: StaffDirectory, identity: string): Teacher | undefined {
  return directory[identity] ?? Object.values(directory).find((t) => t.abbr === identity);
}

/** The name the directory gives the AC / AAC (falls back to the seed constants). */
export function academicCoordinators(directory: StaffDirectory): { ac: string; aac: string } {
  const staff = Object.values(directory);
  return {
    ac: staff.find(isAcRole)?.abbr ?? PRIMARY_AC,
    aac: staff.find(isAacRole)?.abbr ?? ASSISTANT_AC,
  };
}

/** True when the directory lists someone with role 'Principal'. */
export function directoryPrincipal(directory: StaffDirectory): Teacher | undefined {
  return Object.values(directory).find((t) => t.role === 'Principal');
}

/**
 * Which admin office (if any) `identity` holds on `day`.
 * - PRINCIPAL: the designation login, or a directory entry with role 'Principal'.
 * - AC / AAC: by directory role, every day.
 * - OFF_AC: only on a day where the effective Officiating AC (LOGIC-04) is a manual
 *   appointment of this person, i.e. the AC is away and they were appointed for that day.
 *   `day` null (Sunday / no school day) means no Off. AC.
 */
export function adminOfficeFor(params: {
  identity: string | null | undefined;
  directory: StaffDirectory;
  day: DayOfWeek | null;
  absences: AbsenceRecord[];
  officiatingACMap: Partial<Record<DayOfWeek, string | null>>;
}): AdminOffice | null {
  const { identity, directory, day, absences, officiatingACMap } = params;
  if (!identity) return null;
  if (identity === PRINCIPAL_DESIGNATION) return 'PRINCIPAL';
  const staff = findStaff(directory, identity);
  if (staff?.role === 'Principal') return 'PRINCIPAL';
  if (staff && isAcRole(staff)) return 'AC';
  if (staff && isAacRole(staff)) return 'AAC';
  if (!day) return null;
  const { ac, aac } = academicCoordinators(directory);
  const effective = getEffectiveOfficiatingAC({
    day,
    absences,
    officiatingACMap: officiatingACMap as Record<DayOfWeek, string | null>,
    acName: ac,
    aacName: aac,
  });
  return effective.isManuallyAssigned && effective.effectiveAC === identity ? 'OFF_AC' : null;
}
