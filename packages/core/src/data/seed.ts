import { StaffDirectory, MasterSchedule, PeriodId } from '../types/index.js';

export interface PeriodMetadata {
  id: PeriodId;
  name: string;
  timing: string;
  isInstructional: boolean;
}

export const DEFAULT_PERIODS: PeriodMetadata[] = [
  { id: 'G/PD', name: 'Games / Assembly', timing: '08:00 - 08:40', isInstructional: true },
  { id: '1st', name: '1st Period', timing: '08:40 - 09:20', isInstructional: true },
  { id: 'BREAK', name: 'Tiffin Break', timing: '09:20 - 09:40', isInstructional: false },
  { id: '2nd', name: '2nd Period', timing: '09:40 - 10:20', isInstructional: true },
  { id: '3rd', name: '3rd Period', timing: '10:20 - 11:00', isInstructional: true },
  { id: '4th', name: '4th Period', timing: '11:00 - 11:40', isInstructional: true },
  { id: '5th', name: '5th Period', timing: '11:40 - 12:20', isInstructional: true },
  { id: '6th', name: '6th Period', timing: '12:20 - 01:00', isInstructional: true },
];

export const PRIMARY_AC = 'Mrs. R. Pahwa';
export const ASSISTANT_AC = 'Mrs. S. Lakra';

/**
 * Canonical Subject Nomenclature Dictionary
 * Note: 'M. SC.' explicitly stands for 'Moral Science' (not Mental Science).
 */
export const SUBJECT_FULL_NAMES: Record<string, string> = {
  'M. SC.': 'Moral Science',
  'ENG. REC.': 'English Recitation',
  'ENG. WR.': 'English Writing',
  'ENG. ORAL': 'English Oral',
  'ENG. ACT.': 'English Activity',
  'ENG. CONV.': 'English Conversation',
  'ENG. STORY': 'English Story',
  'ENG. LANG.': 'English Language',
  'ENG. LIT.': 'English Literature',
  'ENG. SPELL.': 'English Spelling',
  'ENG. CR. WR.': 'Creative Writing',
  'M. Bas.': 'Math Basics',
  'M. ORAL': 'Math Oral',
  'M. PR.': 'Math Practical',
  'M. NO. WK.': 'Math Number Work',
  'M. ACT.': 'Math Activity',
  'M. GEN.': 'Math General',
  'SUB. TABLE': 'Sub. Tables',
  'ST. TIME.': 'Story Time',
  'HIN. KAV./GEET': 'Hindi Kavita / Geet',
  'GAMES': 'Games & Physical Ed.',
  'SING.': 'Singing & Music',
  'DRAW.': 'Drawing & Art',
  'DRILL': 'Physical Drill',
  'GK': 'General Knowledge',
};

export function getSubjectFullName(code: string): string {
  return SUBJECT_FULL_NAMES[code] || code;
}

export const DEFAULT_STAFF_DIRECTORY: StaffDirectory = {
    "Mrs. S. Lakra": {
        id: "STAFF-01",
        fullName: "Mrs. Synthia Lakra",
        abbr: "Mrs. S. Lakra",
        role: "Class Teacher / Asst. Academic Coordinator",
        primaryClass: "KG A",
        periodsTaught: 22,
        initials: "SL",
        department: "KG",
        assignedSubjectPool: ["ENG. REC.", "M. SC.", "ENG. ORAL", "ENG. WR.", "SUB. TABLE", "M. ORAL", "M. PR.", "M. ACT.", "SING.", "M. NO. WK.", "ENG. STORY", "ENG. CONV.", "ENG. ACT."]
    },
    "Mrs. M. Midha": {
        id: "STAFF-02",
        fullName: "Mrs. Manisha Midha",
        abbr: "Mrs. M. Midha",
        role: "Class Teacher",
        primaryClass: "KG B",
        periodsTaught: 22,
        initials: "MM",
        department: "KG",
        assignedSubjectPool: ["ENG. REC.", "M. SC.", "ENG. ORAL", "ENG. WR.", "SUB. TABLE", "M. ACT.", "M. ORAL", "M. PR.", "SING.", "M. NO. WK.", "ENG. STORY", "ENG. CONV.", "ENG. ACT."]
    },
    "Mrs. R. Pahwa": {
        id: "STAFF-03",
        fullName: "Mrs. Riya Pahwa",
        abbr: "Mrs. R. Pahwa",
        role: "Class Teacher / Academic Coordinator",
        primaryClass: "PREP A",
        periodsTaught: 20,
        initials: "RP",
        department: "PREP",
        assignedSubjectPool: ["ENG. REC.", "M. SC.", "M. Bas.", "ENG. WR.", "ST. TIME.", "M. GEN.", "ENG. SPELL.", "ENG. LANG.", "M. NO. WK.", "ENG.", "ENG. LIT.", "SING.", "ENG. CR. WR."]
    },
    "Mrs. R. Narayan": {
        id: "STAFF-04",
        fullName: "Mrs. Ritika Narayan",
        abbr: "Mrs. R. Narayan",
        role: "Class Teacher",
        primaryClass: "PREP B",
        periodsTaught: 20,
        initials: "RN",
        department: "PREP",
        assignedSubjectPool: ["ENG. REC.", "M. SC.", "ENG. WR.", "M. Bas.", "ENG. SPELL.", "M. GEN.", "ST. TIME.", "ENG. LANG.", "M. NO. WK.", "ENG.", "ENG. LIT.", "ENG. CR. WR.", "SING."]
    },
    "Ms. N. Horo": {
        id: "STAFF-05",
        fullName: "Ms. Namlen Horo",
        abbr: "Ms. N. Horo",
        role: "2nd Teacher",
        primaryClass: "KG A",
        periodsTaught: 10,
        initials: "NH",
        department: "Hindi Specialist",
        assignedSubjectPool: ["HIN. KAV./GEET", "HIN. LIK. KAR.", "HIN. KAH.", "HIN. VYAK.", "HIN. SUL.", "HIN. KAR. PUS.", "HIN. SAHIT."]
    },
    "Ms. K. Sanga": {
        id: "STAFF-06",
        fullName: "Ms. Kalista Sanga",
        abbr: "Ms. K. Sanga",
        role: "2nd Teacher",
        primaryClass: "KG B",
        periodsTaught: 10,
        initials: "KS",
        department: "Hindi Specialist",
        assignedSubjectPool: ["HIN. KAV./GEET", "HIN. LIK. KAR.", "HIN. KAH.", "HIN. VYAK.", "HIN. KAR. PUS.", "HIN. SUL.", "HIN. SAHIT."]
    },
    "Ms. A. Amira": {
        id: "STAFF-07",
        fullName: "Ms. Ashna Amira",
        abbr: "Ms. A. Amira",
        role: "2nd Teacher",
        primaryClass: "PREP A",
        periodsTaught: 18,
        initials: "AA",
        department: "Holistic & Activity",
        assignedSubjectPool: ["GAMES", "NT", "HT", "GK", "1ST DRILL", "CR.", "DR.", "DRILL"]
    },
    "Mrs. S. Bage": {
        id: "STAFF-08",
        fullName: "Mrs. Suman Bage",
        abbr: "Mrs. S. Bage",
        role: "2nd Teacher",
        primaryClass: "PREP B",
        periodsTaught: 18,
        initials: "SB",
        department: "Holistic & Activity",
        assignedSubjectPool: ["GAMES", "HT", "GK", "NT", "2ND DRILL", "CR.", "DR.", "DRILL"]
    },
    "Mr. S. A. Lakra": {
        id: "STAFF-09",
        fullName: "Mr. Stephen Ashish Lakra",
        abbr: "Mr. S. A. Lakra",
        role: "3rd Teacher",
        primaryClass: "KG A",
        periodsTaught: 14,
        initials: "AL",
        department: "Games, Drill & Music",
        assignedSubjectPool: ["GAMES", "HIN. KAV./GEET", "DRILL", "SING.", "GK"]
    }
};

export const DEFAULT_MASTER_SCHEDULE: MasterSchedule = {
    'MON': {
        'G/PD': {
            'Mrs. S. Lakra': 'ENG. REC. KG A',
            'Mrs. M. Midha': 'ENG. REC. KG B',
            'Mrs. R. Pahwa': 'ENG. REC. PREP A',
            'Mrs. R. Narayan': 'ENG. REC. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'GAMES KG A',
            'Mrs. S. Bage': 'GAMES KG B',
            'Mr. S. A. Lakra': 'GAMES KG A + KG B'
        },
        '1st': {
            'Mrs. S. Lakra': 'M. SC. KG A',
            'Mrs. M. Midha': 'M. SC. KG B',
            'Mrs. R. Pahwa': 'M. SC. PREP A',
            'Mrs. R. Narayan': 'M. SC. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        'BREAK': {
            'Mrs. S. Lakra': '-', 'Mrs. M. Midha': '-', 'Mrs. R. Pahwa': '-', 'Mrs. R. Narayan': '-',
            'Ms. N. Horo': '-', 'Ms. K. Sanga': '-', 'Ms. A. Amira': '-', 'Mrs. S. Bage': '-', 'Mr. S. A. Lakra': '-'
        },
        '2nd': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'ENG. WR. PREP B',
            'Ms. N. Horo': 'HIN. KAV./GEET KG A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'NT PREP A',
            'Mrs. S. Bage': 'HT KG B',
            'Mr. S. A. Lakra': 'HIN. KAV./GEET KG A'
        },
        '3rd': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'M. Bas. PREP A',
            'Mrs. R. Narayan': 'M. Bas. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. KAV./GEET KG B',
            'Ms. A. Amira': 'HT KG A',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'HIN. KAV./GEET KG B'
        },
        '4th': {
            'Mrs. S. Lakra': 'ENG. ORAL KG A',
            'Mrs. M. Midha': 'ENG. ORAL KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'HIN. KAV./GEET PREP A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'GK PREP B',
            'Mr. S. A. Lakra': 'HIN. KAV./GEET PREP A'
        },
        'PLAYTIME / 2ND GOLDEN HOUR': {
            'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free'
        },
        '5th': {
            'Mrs. S. Lakra': 'ENG. WR. KG A',
            'Mrs. M. Midha': 'ENG. WR. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'GK PREP A',
            'Mrs. S. Bage': 'NT PREP B',
            'Mr. S. A. Lakra': 'Free'
        },
        '6th': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'ENG. WR. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. KAV./GEET PREP B',
            'Ms. A. Amira': 'NT KG A',
            'Mrs. S. Bage': 'NT KG B',
            'Mr. S. A. Lakra': 'HIN. KAV./GEET PREP B'
        }
    },
    'TUE': {
        'G/PD': {
            'Mrs. S. Lakra': 'SUB. TABLE KG A',
            'Mrs. M. Midha': 'SUB. TABLE KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': '1ST DRILL PREP A',
            'Mrs. S. Bage': '2ND DRILL PREP B',
            'Mr. S. A. Lakra': 'DRILL PREP A + PREP B'
        },
        '1st': {
            'Mrs. S. Lakra': 'ENG. REC. KG A',
            'Mrs. M. Midha': 'M. ACT. KG B',
            'Mrs. R. Pahwa': 'ST. TIME. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'CR. PREP B',
            'Mr. S. A. Lakra': 'Free'
        },
        'BREAK': {
            'Mrs. S. Lakra': '-', 'Mrs. M. Midha': '-', 'Mrs. R. Pahwa': '-', 'Mrs. R. Narayan': '-',
            'Ms. N. Horo': '-', 'Ms. K. Sanga': '-', 'Ms. A. Amira': '-', 'Mrs. S. Bage': '-', 'Mr. S. A. Lakra': '-'
        },
        '2nd': {
            'Mrs. S. Lakra': 'M. ORAL KG A',
            'Mrs. M. Midha': 'M. ORAL KG B',
            'Mrs. R. Pahwa': 'M. GEN. PREP A',
            'Mrs. R. Narayan': 'ENG. SPELL. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        '3rd': {
            'Mrs. S. Lakra': 'M. PR. KG A',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'M. GEN. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. LIK. KAR. KG B',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'DR. PREP B',
            'Mr. S. A. Lakra': 'Free'
        },
        '4th': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'ENG. REC. KG B',
            'Mrs. R. Pahwa': 'ENG. SPELL. PREP A',
            'Mrs. R. Narayan': 'M. GEN. PREP B',
            'Ms. N. Horo': 'HIN. LIK. KAR. KG A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        'PLAYTIME / 2ND GOLDEN HOUR': {
            'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free'
        },
        '5th': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'M. PR. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'M. GEN. PREP B',
            'Ms. N. Horo': 'HIN. LIK. KAR. KG A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'CR. PREP A',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        '6th': {
            'Mrs. S. Lakra': 'M. ACT. KG A',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'ST. TIME. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. LIK. KAR. KG B',
            'Ms. A. Amira': 'DR. PREP A',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        }
    },
    'WED': {
        'G/PD': {
            'Mrs. S. Lakra': 'ENG. REC. KG A',
            'Mrs. M. Midha': 'ENG. REC. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'GK PREP A',
            'Mrs. S. Bage': 'GK PREP B',
            'Mr. S. A. Lakra': 'Free'
        },
        '1st': {
            'Mrs. S. Lakra': 'M. SC. KG A',
            'Mrs. M. Midha': 'M. SC. KG B',
            'Mrs. R. Pahwa': 'M. SC. PREP A',
            'Mrs. R. Narayan': 'M. SC. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        'BREAK': {
            'Mrs. S. Lakra': '-', 'Mrs. M. Midha': '-', 'Mrs. R. Pahwa': '-', 'Mrs. R. Narayan': '-',
            'Ms. N. Horo': '-', 'Ms. K. Sanga': '-', 'Ms. A. Amira': '-', 'Mrs. S. Bage': '-', 'Mr. S. A. Lakra': '-'
        },
        '2nd': {
            'Mrs. S. Lakra': 'SING. KG A',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'ENG. LANG. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. KAH. KG B',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'HT PREP B',
            'Mr. S. A. Lakra': 'SING. KG A'
        },
        '3rd': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'ENG. WR. KG B',
            'Mrs. R. Pahwa': 'ENG. LANG. PREP A',
            'Mrs. R. Narayan': 'ENG. LANG. PREP B',
            'Ms. N. Horo': 'HIN. KAH. KG A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        '4th': {
            'Mrs. S. Lakra': 'ENG. WR. KG A',
            'Mrs. M. Midha': 'ENG. WR. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'ENG. LANG. PREP B',
            'Ms. N. Horo': 'HIN. VYAK. PREP A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        'PLAYTIME / 2ND GOLDEN HOUR': {
            'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free'
        },
        '5th': {
            'Mrs. S. Lakra': 'ENG. WR. KG A',
            'Mrs. M. Midha': 'SING. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'M. NO. WK. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'HT PREP A',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'SING. KG B'
        },
        '6th': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'M. NO. WK. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. VYAK. PREP B',
            'Ms. A. Amira': 'HT KG A',
            'Mrs. S. Bage': 'HT KG B',
            'Mr. S. A. Lakra': 'Free'
        }
    },
    'THU': {
        'G/PD': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'ENG. PREP A',
            'Mrs. R. Narayan': 'ENG. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'DRILL KG A',
            'Mrs. S. Bage': 'DRILL KG B',
            'Mr. S. A. Lakra': 'DRILL KG A + KG B'
        },
        '1st': {
            'Mrs. S. Lakra': 'ENG. ORAL KG A',
            'Mrs. M. Midha': 'ENG. ORAL KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'ENG. LIT. PREP B',
            'Ms. N. Horo': 'HIN. SUL. PREP A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        'BREAK': {
            'Mrs. S. Lakra': '-', 'Mrs. M. Midha': '-', 'Mrs. R. Pahwa': '-', 'Mrs. R. Narayan': '-',
            'Ms. N. Horo': '-', 'Ms. K. Sanga': '-', 'Ms. A. Amira': '-', 'Mrs. S. Bage': '-', 'Mr. S. A. Lakra': '-'
        },
        '2nd': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'ENG. LIT. PREP A',
            'Mrs. R. Narayan': 'ENG. LIT. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. KAR. PUS. KG B',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'GK KG A'
        },
        '3rd': {
            'Mrs. S. Lakra': 'M. NO. WK. KG A',
            'Mrs. M. Midha': 'M. NO. WK. KG B',
            'Mrs. R. Pahwa': 'ENG. LIT. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. SUL. PREP B',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        '4th': {
            'Mrs. S. Lakra': 'M. NO. WK. KG A',
            'Mrs. M. Midha': 'M. NO. WK. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'NT PREP A',
            'Mrs. S. Bage': 'NT PREP B',
            'Mr. S. A. Lakra': 'Free'
        },
        'PLAYTIME / 2ND GOLDEN HOUR': {
            'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free'
        },
        '5th': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'M. GEN. PREP A',
            'Mrs. R. Narayan': 'M. GEN. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'NT KG A',
            'Mrs. S. Bage': 'NT KG B',
            'Mr. S. A. Lakra': 'Free'
        },
        '6th': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'M. GEN. PREP A',
            'Mrs. R. Narayan': 'M. GEN. PREP B',
            'Ms. N. Horo': 'HIN. KAR. PUS. KG A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'GK KG B'
        }
    },
    'FRI': {
        'G/PD': {
            'Mrs. S. Lakra': 'ENG. REC. KG A',
            'Mrs. M. Midha': 'ENG. REC. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'GAMES PREP A',
            'Mrs. S. Bage': 'GAMES PREP B',
            'Mr. S. A. Lakra': 'GAMES PREP A + PREP B'
        },
        '1st': {
            'Mrs. S. Lakra': 'M. ORAL KG A',
            'Mrs. M. Midha': 'M. ORAL KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'HT PREP A',
            'Mrs. S. Bage': 'HT PREP B',
            'Mr. S. A. Lakra': 'Free'
        },
        'BREAK': {
            'Mrs. S. Lakra': '-', 'Mrs. M. Midha': '-', 'Mrs. R. Pahwa': '-', 'Mrs. R. Narayan': '-',
            'Ms. N. Horo': '-', 'Ms. K. Sanga': '-', 'Ms. A. Amira': '-', 'Mrs. S. Bage': '-', 'Mr. S. A. Lakra': '-'
        },
        '2nd': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'ENG. STORY KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'ENG. CR. WR. PREP B',
            'Ms. N. Horo': 'HIN. SAHIT. PREP A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'DR. KG A',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'Free'
        },
        '3rd': {
            'Mrs. S. Lakra': 'Free',
            'Mrs. M. Midha': 'ENG. CONV. KG B',
            'Mrs. R. Pahwa': 'SING. PREP A',
            'Mrs. R. Narayan': 'ENG. REC. PREP B',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'CR. KG A',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'SING. PREP A'
        },
        '4th': {
            'Mrs. S. Lakra': 'ENG. STORY KG A',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'ENG. CR. WR. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. SAHIT. PREP B',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'DR. KG B',
            'Mr. S. A. Lakra': 'Free'
        },
        'PLAYTIME / 2ND GOLDEN HOUR': {
            'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free'
        },
        '5th': {
            'Mrs. S. Lakra': 'ENG. CONV. KG A',
            'Mrs. M. Midha': 'Free',
            'Mrs. R. Pahwa': 'ENG. REC. PREP A',
            'Mrs. R. Narayan': 'Free',
            'Ms. N. Horo': 'Free',
            'Ms. K. Sanga': 'HIN. SAHIT. PREP B',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'CR. KG B',
            'Mr. S. A. Lakra': 'Free'
        },
        '6th': {
            'Mrs. S. Lakra': 'ENG. ACT. KG A',
            'Mrs. M. Midha': 'ENG. ACT. KG B',
            'Mrs. R. Pahwa': 'Free',
            'Mrs. R. Narayan': 'SING. PREP B',
            'Ms. N. Horo': 'HIN. SAHIT. PREP A',
            'Ms. K. Sanga': 'Free',
            'Ms. A. Amira': 'Free',
            'Mrs. S. Bage': 'Free',
            'Mr. S. A. Lakra': 'SING. PREP B'
        }
    },
    'SAT': {
        'G/PD': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' },
        '1st': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' },
        'BREAK': { 'Mrs. S. Lakra': '-', 'Mrs. M. Midha': '-', 'Mrs. R. Pahwa': '-', 'Mrs. R. Narayan': '-', 'Ms. N. Horo': '-', 'Ms. K. Sanga': '-', 'Ms. A. Amira': '-', 'Mrs. S. Bage': '-', 'Mr. S. A. Lakra': '-' },
        '2nd': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' },
        '3rd': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' },
        '4th': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' },
        'PLAYTIME / 2ND GOLDEN HOUR': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' },
        '5th': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' },
        '6th': { 'Mrs. S. Lakra': 'Free', 'Mrs. M. Midha': 'Free', 'Mrs. R. Pahwa': 'Free', 'Mrs. R. Narayan': 'Free', 'Ms. N. Horo': 'Free', 'Ms. K. Sanga': 'Free', 'Ms. A. Amira': 'Free', 'Mrs. S. Bage': 'Free', 'Mr. S. A. Lakra': 'Free' }
    }
};
