import { StaffDirectory, Teacher } from '../types/index.js';
import { DEFAULT_STAFF_DIRECTORY } from '../data/seed.js';

/**
 * Returns a disambiguated display name for a teacher.
 * Resolves edge-cases where multiple staff members share identical or similar names.
 *
 * @param teacherName - The abbreviation or full name of the teacher (e.g. "Mrs. S. Lakra")
 * @param directory - The active staff directory (defaults to DEFAULT_STAFF_DIRECTORY)
 * @param forceQualify - If true, always appends the role/class qualifier
 */
export function getDisambiguatedTeacherName(
  teacherName: string,
  directory: StaffDirectory = DEFAULT_STAFF_DIRECTORY,
  forceQualify = false
): string {
  if (!teacherName) return '';
  const staff = directory[teacherName];

  // Count how many teachers share the same abbreviation, full name, or key
  const duplicateCount = Object.keys(directory).filter((key) => {
    const item = directory[key];
    return (
      key === teacherName ||
      item.abbr === teacherName ||
      item.fullName === teacherName
    );
  }).length;

  if (duplicateCount > 1 || forceQualify) {
    if (staff) {
      const qualifier = staff.primaryClass
        ? staff.primaryClass
        : (staff.department || staff.role || staff.id);
      return `${teacherName} (${qualifier})`;
    }
  }

  return teacherName;
}

/**
 * Resolves a teacher by their immutable unique ID (e.g. "STAFF-01")
 */
export function resolveTeacherById(
  id: string,
  directory: StaffDirectory = DEFAULT_STAFF_DIRECTORY
): Teacher | undefined {
  return Object.values(directory).find((teacher) => teacher.id === id);
}

/**
 * Finds a teacher by name, abbreviation, or ID
 */
export function findTeacher(
  query: string,
  directory: StaffDirectory = DEFAULT_STAFF_DIRECTORY
): Teacher | undefined {
  if (!query) return undefined;
  if (directory[query]) return directory[query];
  return Object.values(directory).find(
    (t) =>
      t.id.toLowerCase() === query.toLowerCase() ||
      t.abbr.toLowerCase() === query.toLowerCase() ||
      t.fullName.toLowerCase() === query.toLowerCase()
  );
}

/**
 * Returns all teachers sorted with Class Teachers and Coordinators first
 */
export function getSortedTeachers(
  directory: StaffDirectory = DEFAULT_STAFF_DIRECTORY
): Teacher[] {
  return Object.values(directory).sort((a, b) => {
    // Coordinators first
    const aIsCoord = a.role.includes('Coordinator');
    const bIsCoord = b.role.includes('Coordinator');
    if (aIsCoord && !bIsCoord) return -1;
    if (!aIsCoord && bIsCoord) return 1;

    // Class teachers next
    const aIsCT = a.role.includes('Class Teacher');
    const bIsCT = b.role.includes('Class Teacher');
    if (aIsCT && !bIsCT) return -1;
    if (!aIsCT && bIsCT) return 1;

    // Sort by ID
    return a.id.localeCompare(b.id);
  });
}

