/**
 * FEAT-62 part 3 — map the owner's read-only Sheet tabs onto the app's reference data.
 *
 * Pure: snapshot in, { directory, routine, subjects, issues } out. Nothing here touches
 * the store; reference.ts decides whether and how to apply the result.
 *
 * What is mapped (everything else is reported, not guessed):
 *  - "Staff Directory"  Full Name | Teacher Abbreviation | Role | Primary Class
 *  - one tab per teacher, named by abbreviation: Day × period grid, cells "SUBJ\nCLASS"
 *  - "Subjects List"    Base Class | Subject Name | Abbreviation
 * Not mapped: OVERVIEW and the per-class tabs (derived views of the teacher tabs).
 *
 * Safety rules:
 *  - A teacher whose tab is missing or unreadable keeps the bundled routine.
 *  - Staff in the bundled seed but not on the Sheet are kept (absences may refer to them).
 *  - Known staff keep their bundled id, so local records stay linked.
 *  - No Principal row is fine: the app does not need one.
 */
import type { DayOfWeek, MasterSchedule, StaffDirectory, StaffRole, Teacher } from '@lfps/core';

export interface SheetTab {
  name: string;
  rows: unknown[];
}

export interface SheetSnapshot {
  fetchedAt: number;
  hash: string;
  tabs: SheetTab[];
  hiddenTabs?: number;
  appVersion?: string;
}

export interface ReferenceData {
  directory: StaffDirectory;
  routine: MasterSchedule;
  /** Subject abbreviation → full name, from "Subjects List". */
  subjects: Record<string, string>;
  /** Teachers whose routine came from their Sheet tab. */
  routineFromSheet: string[];
  /** Tabs read but not mapped, and anything skipped (no personal data). */
  unmappedTabs: string[];
  issues: string[];
}

export const STAFF_TAB = 'Staff Directory';
export const SUBJECTS_TAB = 'Subjects List';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const ROLES: StaffRole[] = [
  'Class Teacher / Asst. Academic Coordinator',
  'Class Teacher / Academic Coordinator',
  'Class Teacher',
  '2nd Teacher',
  '3rd Teacher',
  'Principal',
  'Admin',
];

const HONORIFICS = new Set(['MR', 'MRS', 'MS', 'MISS', 'DR', 'SR', 'FR']);

function text(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function rowsOf(tab: SheetTab | undefined): string[][] {
  if (!tab || !Array.isArray(tab.rows)) return [];
  return tab.rows.map((r) => (Array.isArray(r) ? r.map(text) : []));
}

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toUpperCase();
}

/** "3rd Teacher / Support" → "3rd Teacher"; exact matches first, then the longest prefix. */
export function normalizeRole(raw: string): StaffRole | null {
  const r = norm(raw);
  if (!r) return null;
  for (const role of ROLES) if (norm(role) === r) return role;
  for (const role of ROLES) if (r.startsWith(norm(role))) return role;
  return null;
}

/** "Mrs. Synthia Lakra" → "SL" (honorifics dropped). */
export function initialsOf(fullName: string): string {
  const words = fullName
    .split(/[\s.]+/)
    .filter(Boolean)
    .filter((w) => !HONORIFICS.has(w.toUpperCase()));
  if (!words.length) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function headerIndex(header: string[], ...names: string[]): number {
  const h = header.map(norm);
  for (const n of names) {
    const i = h.findIndex((c) => c === norm(n) || c.startsWith(norm(n)));
    if (i >= 0) return i;
  }
  return -1;
}

/** "MON." / "TUES." / "Thursday" → DayOfWeek. */
export function parseDay(raw: string): DayOfWeek | null {
  const d = norm(raw).replace(/[^A-Z]/g, '').slice(0, 3);
  return (DAYS as string[]).includes(d) ? (d as DayOfWeek) : null;
}

/**
 * One grid cell → the seed's cell form.
 *   ""                                        → "Free"
 *   "ENG. REC.\nKG A"                         → "ENG. REC. KG A"
 *   "1ST DRILL\nPREP A\n---\n2ND DRILL\nPREP B" → "DRILL PREP A + PREP B"
 * Returns null when the cell can't be read safely (the seed value is kept).
 */
export function parseCell(raw: string, period: string): string | null {
  if (norm(period) === 'BREAK') return '-';
  const cell = raw.replace(/\r/g, '').trim();
  if (!cell || /^free$/i.test(cell) || cell === '-') return 'Free';
  const parts = cell
    .split(/\n\s*-{2,}\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((p) => p.length);
  if (parts.length === 1) return parts[0].join(' ');
  const split = parts.map((p) => {
    if (p.length < 2) return null;
    const subject = p.slice(0, -1).join(' ').replace(/^\d+(ST|ND|RD|TH)\s+/i, '');
    return { subject, cls: p[p.length - 1] };
  });
  if (split.some((s) => !s)) return null;
  const subjects = new Set(split.map((s) => norm(s!.subject)));
  if (subjects.size !== 1) return null;
  return `${split[0]!.subject} ${split.map((s) => s!.cls).join(' + ')}`;
}

function cloneSchedule(s: MasterSchedule): MasterSchedule {
  return JSON.parse(JSON.stringify(s)) as MasterSchedule;
}

/** Parses one teacher tab into day → period → cell. Null if the grid isn't recognisable. */
function parseTeacherTab(
  rows: string[][],
  periods: string[],
  issues: string[],
  label: string,
): Partial<Record<DayOfWeek, Record<string, string>>> | null {
  const hi = rows.findIndex((r) => norm(r[0] ?? '') === 'DAY');
  if (hi < 0) return null;
  const byNorm = new Map(periods.map((p) => [norm(p), p]));
  const cols: (string | null)[] = rows[hi].map((c, i) => (i === 0 ? null : (byNorm.get(norm(c)) ?? null)));
  const unknownCols = rows[hi].filter((c, i) => i > 0 && c && !cols[i]);
  if (unknownCols.length) issues.push(`${label}: ${unknownCols.length} unknown period column(s) skipped`);
  const out: Partial<Record<DayOfWeek, Record<string, string>>> = {};
  let unreadable = 0;
  for (const r of rows.slice(hi + 1)) {
    if (!r.some(Boolean)) continue;
    const day = parseDay(r[0] ?? '');
    if (!day) {
      issues.push(`${label}: a row with an unknown day was skipped`);
      continue;
    }
    const cells: Record<string, string> = {};
    cols.forEach((p, i) => {
      if (!p) return;
      const v = parseCell(r[i] ?? '', p);
      if (v == null) unreadable++;
      else cells[p] = v;
    });
    out[day] = cells;
  }
  if (unreadable) issues.push(`${label}: ${unreadable} cell(s) unreadable, bundled value kept`);
  return Object.keys(out).length ? out : null;
}

function classesOf(cell: string): string[] {
  const m = cell.match(/\b(KG|PREP) [A-Z]\b/g);
  return m ?? [];
}

/** Subject code of a seed-form cell ("ENG. REC. KG A" → "ENG. REC."). */
function subjectOf(cell: string): string {
  return cell.replace(/\s*\b(KG|PREP) [A-Z]\b.*$/, '').trim();
}

export function mapSheetData(
  snapshot: Pick<SheetSnapshot, 'tabs'>,
  seedDirectory: StaffDirectory,
  seedRoutine: MasterSchedule,
): ReferenceData {
  const issues: string[] = [];
  const tabs = new Map((snapshot.tabs ?? []).map((t) => [t.name.trim(), t]));
  const used = new Set<string>();

  // ── Staff Directory ────────────────────────────────────────────────────────────
  const directory: StaffDirectory = {};
  const seedByAbbr = new Map(Object.values(seedDirectory).map((t) => [norm(t.abbr), t]));
  const staffRows = rowsOf(tabs.get(STAFF_TAB));
  const sheetStaff: { abbr: string; fullName: string; role: StaffRole | null; primaryClass: string }[] = [];
  if (staffRows.length) {
    used.add(STAFF_TAB);
    const h = staffRows[0];
    const iName = headerIndex(h, 'Full Name', 'Name');
    const iAbbr = headerIndex(h, 'Teacher Abbreviation', 'Abbreviation');
    const iRole = headerIndex(h, 'Role');
    const iClass = headerIndex(h, 'Primary Class', 'Class');
    if (iAbbr < 0) {
      issues.push(`${STAFF_TAB}: no abbreviation column, bundled staff kept`);
    } else {
      for (const r of staffRows.slice(1)) {
        const abbr = r[iAbbr] ?? '';
        if (!abbr) continue;
        const rawRole = iRole >= 0 ? (r[iRole] ?? '') : '';
        const role = normalizeRole(rawRole);
        if (rawRole && !role) issues.push(`${STAFF_TAB}: an unknown role was kept as the bundled one`);
        sheetStaff.push({
          abbr,
          fullName: iName >= 0 ? (r[iName] ?? '') : '',
          role,
          primaryClass: iClass >= 0 ? (r[iClass] ?? '') : '',
        });
      }
    }
  } else {
    issues.push(`${STAFF_TAB}: tab missing or empty, bundled staff kept`);
  }

  // ── Routine (per-teacher tabs) ─────────────────────────────────────────────────
  const routine = cloneSchedule(seedRoutine);
  const periods = Array.from(new Set(DAYS.flatMap((d) => Object.keys(seedRoutine[d] ?? {}))));
  const routineFromSheet: string[] = [];
  const allAbbrs = Array.from(
    new Set([...Object.values(seedDirectory).map((t) => t.abbr), ...sheetStaff.map((s) => s.abbr)]),
  );
  allAbbrs.forEach((abbr, n) => {
    const tab = tabs.get(abbr);
    if (!tab) return;
    used.add(tab.name.trim());
    const label = `Teacher tab ${n + 1}`;
    const grid = parseTeacherTab(rowsOf(tab), periods, issues, label);
    if (!grid) {
      issues.push(`${label}: grid not recognised, bundled routine kept`);
      return;
    }
    for (const day of DAYS) {
      const cells = grid[day];
      if (!cells) continue;
      for (const [p, v] of Object.entries(cells)) {
        routine[day][p] = { ...(routine[day][p] ?? {}), [abbr]: v };
      }
    }
    routineFromSheet.push(abbr);
  });

  // ── Directory entries (needs the routine for new staff) ───────────────────────
  let added = 0;
  for (const s of sheetStaff) {
    const seed = seedByAbbr.get(norm(s.abbr));
    if (seed) {
      directory[seed.abbr] = {
        ...seed,
        fullName: s.fullName || seed.fullName,
        role: s.role ?? seed.role,
        primaryClass: s.primaryClass || seed.primaryClass,
        // bundled initials can be hand-picked (middle names); recompute only on a renamed person
        initials: s.fullName && s.fullName !== seed.fullName ? initialsOf(s.fullName) || seed.initials : seed.initials,
      };
      continue;
    }
    added++;
    const cells = DAYS.flatMap((d) => Object.values(routine[d]).map((byT) => byT[s.abbr]).filter(Boolean));
    const teaching = cells.filter((c) => c !== 'Free' && c !== '-');
    const classes = teaching.flatMap(classesOf);
    const dept = /^PREP/i.test(s.primaryClass) ? 'PREP' : /^KG/i.test(s.primaryClass) ? 'KG' : (classes[0]?.split(' ')[0] ?? 'KG');
    const t: Teacher = {
      id: `SHEET-${norm(s.abbr).replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      fullName: s.fullName || s.abbr,
      abbr: s.abbr,
      role: s.role ?? '2nd Teacher',
      primaryClass: s.primaryClass || undefined,
      periodsTaught: teaching.length,
      initials: initialsOf(s.fullName || s.abbr),
      department: dept,
      assignedSubjectPool: Array.from(new Set(teaching.map(subjectOf).filter(Boolean))),
    };
    directory[s.abbr] = t;
  }
  if (added) issues.push(`${STAFF_TAB}: ${added} new staff added`);
  let kept = 0;
  for (const t of Object.values(seedDirectory)) {
    if (!directory[t.abbr]) {
      directory[t.abbr] = t;
      if (sheetStaff.length) kept++;
    }
  }
  if (kept) issues.push(`${STAFF_TAB}: ${kept} bundled staff not on the Sheet, kept`);

  // ── Subjects List ──────────────────────────────────────────────────────────────
  const subjects: Record<string, string> = {};
  const subjRows = rowsOf(tabs.get(SUBJECTS_TAB));
  if (subjRows.length) {
    used.add(SUBJECTS_TAB);
    const iName = headerIndex(subjRows[0], 'Subject Name', 'Subject');
    const iAbbr = headerIndex(subjRows[0], 'Abbreviation');
    if (iName >= 0 && iAbbr >= 0) {
      for (const r of subjRows.slice(1)) {
        const a = r[iAbbr] ?? '';
        const n = r[iName] ?? '';
        if (a && n && !subjects[a]) subjects[a] = n;
      }
    }
  }

  const unmappedTabs = Array.from(tabs.keys()).filter((n) => !used.has(n));
  return { directory, routine, subjects, routineFromSheet, unmappedTabs, issues };
}
