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
 * Compares two teachers according to the authentic school hierarchy:
 * 1. Academic Coordinator (Mrs. R. Pahwa)
 * 2. Assistant Academic Coordinator (Mrs. S. Lakra)
 * 3. Class Teachers (KG A -> KG B -> PREP A -> PREP B)
 * 4. 2nd Teachers (KG A -> KG B -> PREP A -> PREP B)
 * 5. Other Staff (Activity, Hindi, Games, etc.)
 * Within the same rank: class section order or alphabetical by full name.
 */
export function compareTeachersByHierarchy(a: Teacher, b: Teacher): number {
  const getRank = (t: Teacher): number => {
    if (t.abbr === 'Mrs. R. Pahwa' || (t.role.includes('Academic Coordinator') && !t.role.includes('Asst.'))) return 1;
    if (t.abbr === 'Mrs. S. Lakra' || t.role.includes('Asst. Academic Coordinator')) return 2;
    if (t.role.includes('Class Teacher')) return 3;
    if (t.role.includes('2nd Teacher') || t.role.includes('Second Teacher')) return 4;
    return 5;
  };

  const rankA = getRank(a);
  const rankB = getRank(b);
  if (rankA !== rankB) return rankA - rankB;

  // Within CT or 2T, sort by class section: KG A -> KG B -> PREP A -> PREP B
  const sectionOrder = ['KG A', 'KG B', 'PREP A', 'PREP B'];
  if (a.primaryClass && b.primaryClass && a.primaryClass !== b.primaryClass) {
    const idxA = sectionOrder.indexOf(a.primaryClass);
    const idxB = sectionOrder.indexOf(b.primaryClass);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
  }

  return a.fullName.localeCompare(b.fullName);
}

/**
 * Compares two teachers alphabetically by full name (A-Z)
 */
export function compareTeachersByName(a: Teacher, b: Teacher): number {
  return a.fullName.localeCompare(b.fullName);
}

/**
 * Returns all teachers sorted with Class Teachers and Coordinators first
 */
export function getSortedTeachers(
  directory: StaffDirectory = DEFAULT_STAFF_DIRECTORY
): Teacher[] {
  return Object.values(directory).sort(compareTeachersByHierarchy);
}

