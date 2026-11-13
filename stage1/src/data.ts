// Stage 1: the routine comes from the temp Sheet at runtime (through its own small bridge).
// Nothing personal is bundled: names, subjects and timings all arrive from the Sheet.
export type Tabs = Record<string, string[][]>
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
export type Day = (typeof DAYS)[number]

export interface Staff { id: string; name: string; short: string; role: string; section: string }
export interface Section { id: string; label: string; grade: string }
export interface Slot { id: string; starts: string; ends: string; teaching: boolean }
export interface Lesson { day: Day; slot: string; section: string; subject: string; teachers: string[]; group: string }
export interface Model { staff: Staff[]; sections: Section[]; slots: Slot[]; lessons: Lesson[] }

/** Slot names on everyday screens (plain words, no codes). */
export const SLOT_LABEL: Record<string, string> = {
  ASM: 'Assembly', GH1: 'Golden Hour 1', GH2: '2nd G. Hr.', BRK: 'Break',
  P1: '1st', P2: '2nd', P3: '3rd', P4: '4th', P5: '5th', P6: '6th',
}
export const SLOT_SHORT: Record<string, string> = { ...SLOT_LABEL, GH1: 'GH 1', GH2: '2nd G. Hr.' }

function table(tabs: Tabs, name: string): Record<string, string>[] {
  const rows = tabs[name]
  if (!rows || rows.length < 1) throw new Error(`The Sheet has no “${name}” tab`)
  const head = rows[0].map((h) => h.trim())
  return rows.slice(1).filter((r) => r.some((c) => String(c ?? '').trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, String(r[i] ?? '').trim()])))
}

/** "ENG. REC." → "Eng. Rec.", "GK" stays. Words of 2–3 capitals with no dot stay as written. */
export function niceSubject(s: string): string {
  return s.split(/(\s+|\/)/).map((w) => (/^[A-Z]{1,3}$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join('')
}

/** Uses the Regular timing set (Summer and Winter have no dates yet). Teaching slots + Break only (Assembly hidden, Steve t86u). */
export function buildModel(tabs: Tabs, timingSet = 'REG'): Model {
  const staff = table(tabs, '_Staff').filter((r) => r['Status'] !== 'Left').map((r) => ({ id: r['StaffId'], name: r['Display name'] || r['Full name'], short: r['Short code'], role: r['Role'], section: r['Primary section'] }))
  const sections = table(tabs, '_Sections').filter((r) => r['Active'] !== 'FALSE').sort((a, b) => Number(a['Order']) - Number(b['Order'])).map((r) => ({ id: r['SectionId'], label: r['Label'], grade: r['Grade'] }))
  const slots = table(tabs, '_TimingSlots').filter((r) => r['Timing set'] === timingSet && (r['Teaching?'] === 'TRUE' || r['Slot'] === 'BRK') && r['Starts'])
    .sort((a, b) => Number(a['Order']) - Number(b['Order'])).map((r) => ({ id: r['Slot'], starts: r['Starts'], ends: r['Ends'], teaching: r['Teaching?'] === 'TRUE' }))
  const lessons = table(tabs, '_Timetable').filter((r) => (DAYS as readonly string[]).includes(r['Day'])).map((r) => ({
    day: r['Day'] as Day, slot: r['Period'], section: r['Section'], subject: niceSubject(r['Subject as written'] || r['Subject']),
    teachers: (r['Override staff'] || r['Teacher(s)']).split(',').map((t) => t.trim()).filter(Boolean), group: r['Group'],
  }))
  if (!staff.length || !sections.length || !slots.length) throw new Error('The Sheet looks empty')
  return { staff, sections, slots, lessons }
}

export function lessonsAt(m: Model, day: Day, slot: string, section: string): Lesson[] {
  return m.lessons.filter((l) => l.day === day && l.slot === slot && l.section === section)
}
export function teacherAt(m: Model, day: Day, slot: string, staffId: string): Lesson[] {
  return m.lessons.filter((l) => l.day === day && l.slot === slot && l.teachers.includes(staffId))
}
/** "KG combined Games" → "KG A + B" style label from the sections in the same grade. */
export function groupLabel(m: Model, l: Lesson): string | null {
  if (!l.group) return null
  const sec = m.sections.find((s) => s.id === l.section)
  if (!sec) return null
  const same = m.sections.filter((s) => s.grade === sec.grade).map((s) => s.label.split(' ').pop())
  return `${sec.grade} ${same.join(' + ')}`
}

/** School day in IST. Weekends open on Monday. */
export function todayIST(now = new Date()): Day {
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(now)
  return (DAYS as readonly string[]).includes(wd) ? (wd as Day) : 'Mon'
}

/** "07:40" → "7:40" */
export const clock = (t: string) => t.replace(/^0/, '')

/** Slim sideways names drop a leading title: "Mrs. Teacher A" → "Teacher A" (t69u). The full name stays elsewhere. */
const HONORIFIC = /^(mrs|ms|mr|miss|mx|dr|sr|fr|br|prof)\.?\s+/i
export function slimName(name: string): string {
  const s = name.trim(), out = s.replace(HONORIFIC, '').trim()
  return out || s
}

/** The sync tick plays only when the Sheet's data really changed (t69u), not on every quiet refresh. */
export function syncOutcome(prevHash: string | null, nextHash: string): 'changed' | 'same' {
  return prevHash !== null && prevHash === nextHash ? 'same' : 'changed'
}
