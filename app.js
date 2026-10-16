const DEFAULT_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwCoHv4fYmzdOJdredpQtSE3bcHUnS3gboWi5cUEQEprdBl0x8zjvR7wvl6ABpqN-p_IQ/exec';

// --- STATE MANAGEMENT ---
const state = {
    day: 'MON',
    isEditMode: false,
    isMasterEditMode: false,
    isMasterUnlocked: false,
    routineViewMode: 'teacher', // 'teacher' | 'class'
    currentRole: 'admin', // 'admin' | 'ac' | 'asst_ac' | 'teacher'
    activeTeacher: 'Mrs. R. Pahwa',
    absentTeachers: new Set(),
    baseSchedule: {}, 
    schedule: {},     
    substitutions: {}, 
    subStatus: {}, // day -> period -> absentTeacher -> { status: 'pending'|'accepted'|'disputed', acceptedBy, disputeReason }
    officiatingAC: {}, // day -> teacherName
    officiatingCT: {}, // day -> { section: teacherName }
    subUnavailable: {}, // day -> { [teacherName]: remark }
    displaced: { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] },
    settings: {
        samePeriodLock: true,
        acceptanceTimerEnabled: false,
        acceptanceTimerDuration: 10,
        undoIconStyle: 'curved',
        subHaloIndicator: true,
        subHaloColor: 'emerald',
        minimizeAlerts: false,
        detectCollisions: true,
        allowDisputes: true,
        adminPin: '1234',
        sheetsCsvUrl: DEFAULT_SHEETS_WEBAPP_URL,
        lastCloudSync: null,
        cloudLastModified: null,
        rosterColors: {
            ct: '#af52de',
            st: '#007aff',
            coord: '#f59e0b',
            absent: '#ff3b30'
        }
    },
    actionHistory: {
        grid: [], 
        subs: [],
        redoGrid: [],
        redoSubs: []
    }
};

let lastBottomSheetOpenTime = 0;

const PRIMARY_AC = 'Mrs. R. Pahwa';
const ASSISTANT_AC = 'Mrs. S. Lakra';

const staffDirectory = {
    "Mrs. S. Lakra": {
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

// --- 1. SUBJECT CATALOG (49 SUBJECTS FROM LFPS EXCEL SHEET 2) ---
const subjectsCatalog = [
    { baseClass: "KG", name: "ENGLISH ACTIVITY", abbr: "ENG. ACT.", domain: "CORE_LANG" },
    { baseClass: "KG", name: "ENGLISH CONVERSATION", abbr: "ENG. CONV.", domain: "CORE_LANG" },
    { baseClass: "KG", name: "ENGLISH ORAL", abbr: "ENG. ORAL", domain: "CORE_LANG" },
    { baseClass: "KG", name: "ENGLISH RECITATION", abbr: "ENG. REC.", domain: "CORE_LANG" },
    { baseClass: "KG", name: "ENGLISH WRITING", abbr: "ENG. WR.", domain: "CORE_LANG" },
    { baseClass: "KG", name: "MATH ACTIVITY", abbr: "M. ACT.", domain: "CORE_MATH" },
    { baseClass: "KG", name: "MATH NUMBER WORK", abbr: "M. NO. WK.", domain: "CORE_MATH" },
    { baseClass: "KG", name: "MATH ORAL", abbr: "M. ORAL", domain: "CORE_MATH" },
    { baseClass: "KG", name: "MATH PRIMARY", abbr: "M. PR.", domain: "CORE_MATH" },
    { baseClass: "KG", name: "MORAL SCIENCE", abbr: "M. SC.", domain: "CORE_MATH" },
    { baseClass: "KG", name: "SUBSTITUTION TABLE", abbr: "SUB. TABLE", domain: "CORE_MATH" },
    { baseClass: "KG", name: "ENGLISH STORY", abbr: "ENG. STORY", domain: "CORE_LANG" },
    { baseClass: "KG", name: "HINDI KAHANI", abbr: "HIN. KAH.", domain: "HINDI" },
    { baseClass: "KG", name: "HINDI KARYA PUSTIKA", abbr: "HIN. KAR. PUS.", domain: "HINDI" },
    { baseClass: "KG", name: "HINDI KAVITA/GEET", abbr: "HIN. KAV./GEET", domain: "HINDI" },
    { baseClass: "KG", name: "HINDI LIKHIT KARYA", abbr: "HIN. LIK. KAR.", domain: "HINDI" },
    { baseClass: "KG", name: "GENERAL KNOWLEDGE", abbr: "GK", domain: "HOLISTIC" },
    { baseClass: "KG", name: "HEALTH TALK", abbr: "HT", domain: "HOLISTIC" },
    { baseClass: "KG", name: "NATURE TALK", abbr: "NT", domain: "HOLISTIC" },
    { baseClass: "KG", name: "DRAWING", abbr: "DR.", domain: "HOLISTIC" },
    { baseClass: "KG", name: "CRAFT", abbr: "CR.", domain: "HOLISTIC" },
    { baseClass: "KG", name: "GAMES", abbr: "GAMES", domain: "ACTIVITY" },
    { baseClass: "KG", name: "DRILL", abbr: "DRILL", domain: "ACTIVITY" },
    { baseClass: "KG", name: "SINGING", abbr: "SING.", domain: "ACTIVITY" },
    { baseClass: "PREP", name: "ENGLISH", abbr: "ENG.", domain: "CORE_LANG" },
    { baseClass: "PREP", name: "ENGLISH CREATIVE WRITING", abbr: "ENG. CR. WR.", domain: "CORE_LANG" },
    { baseClass: "PREP", name: "ENGLISH LANGUAGE", abbr: "ENG. LANG.", domain: "CORE_LANG" },
    { baseClass: "PREP", name: "ENGLISH LIT.", abbr: "ENG. LIT.", domain: "CORE_LANG" },
    { baseClass: "PREP", name: "ENGLISH RECITATION", abbr: "ENG. REC.", domain: "CORE_LANG" },
    { baseClass: "PREP", name: "ENGLISH SPELLING", abbr: "ENG. SPELL.", domain: "CORE_LANG" },
    { baseClass: "PREP", name: "ENGLISH WRITING", abbr: "ENG. WR.", domain: "CORE_LANG" },
    { baseClass: "PREP", name: "MATH BASIC", abbr: "M. BASIC.", domain: "CORE_MATH" },
    { baseClass: "PREP", name: "MATH GENERAL", abbr: "M. GEN.", domain: "CORE_MATH" },
    { baseClass: "PREP", name: "MATH NUMBER WORK", abbr: "M. NO. WK.", domain: "CORE_MATH" },
    { baseClass: "PREP", name: "MORAL SCIENCE", abbr: "M. SC.", domain: "CORE_MATH" },
    { baseClass: "PREP", name: "STORY TIME", abbr: "ST. TIME.", domain: "HOLISTIC" },
    { baseClass: "PREP", name: "HINDI KAVITA/GEET", abbr: "HIN. KAV./GEET", domain: "HINDI" },
    { baseClass: "PREP", name: "HINDI SAHITYA", abbr: "HIN. SAHIT.", domain: "HINDI" },
    { baseClass: "PREP", name: "HINDI SULEKH", abbr: "HIN. SUL.", domain: "HINDI" },
    { baseClass: "PREP", name: "HINDI VYAKRAN", abbr: "HIN. VYAK.", domain: "HINDI" },
    { baseClass: "PREP", name: "GENERAL KNOWLEDGE", abbr: "GK", domain: "HOLISTIC" },
    { baseClass: "PREP", name: "HEALTH TALK", abbr: "HT", domain: "HOLISTIC" },
    { baseClass: "PREP", name: "NATURE TALK", abbr: "NT", domain: "HOLISTIC" },
    { baseClass: "PREP", name: "DRAWING", abbr: "DR.", domain: "HOLISTIC" },
    { baseClass: "PREP", name: "CRAFT", abbr: "CR.", domain: "HOLISTIC" },
    { baseClass: "PREP", name: "GAMES", abbr: "GAMES", domain: "ACTIVITY" },
    { baseClass: "PREP", name: "1ST HALF DRILL", abbr: "1ST DRILL", domain: "ACTIVITY" },
    { baseClass: "PREP", name: "2ND HALF DRILL", abbr: "2ND DRILL", domain: "ACTIVITY" },
    { baseClass: "PREP", name: "SINGING", abbr: "SING.", domain: "ACTIVITY" }
];

// --- 2. TABLE 2: SUBJECT ALLOCATIONS (96 ALLOCATIONS FROM LFPS OVERVIEW) ---
const subjectAllocations = [
    { class: "KG A", subject: "CR.", assignedTeachers: ["Ms. A. Amira"] },
    { class: "KG A", subject: "DR.", assignedTeachers: ["Ms. A. Amira"] },
    { class: "KG A", subject: "DRILL", assignedTeachers: ["Ms. A. Amira","Mr. S. A. Lakra"] },
    { class: "KG A", subject: "ENG. ACT.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "ENG. CONV.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "ENG. ORAL", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "ENG. REC.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "ENG. STORY", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "ENG. WR.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "GAMES", assignedTeachers: ["Ms. A. Amira","Mr. S. A. Lakra"] },
    { class: "KG A", subject: "GK", assignedTeachers: ["Mr. S. A. Lakra"] },
    { class: "KG A", subject: "HIN. KAH.", assignedTeachers: ["Ms. N. Horo"] },
    { class: "KG A", subject: "HIN. KAR. PUS.", assignedTeachers: ["Ms. N. Horo"] },
    { class: "KG A", subject: "HIN. KAV./GEET", assignedTeachers: ["Ms. N. Horo","Mr. S. A. Lakra"] },
    { class: "KG A", subject: "HIN. LIK. KAR.", assignedTeachers: ["Ms. N. Horo"] },
    { class: "KG A", subject: "HT", assignedTeachers: ["Ms. A. Amira"] },
    { class: "KG A", subject: "M. ACT.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "M. NO. WK.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "M. ORAL", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "M. PR.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "M. SC.", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG A", subject: "NT", assignedTeachers: ["Ms. A. Amira"] },
    { class: "KG A", subject: "SING.", assignedTeachers: ["Mrs. S. Lakra","Mr. S. A. Lakra"] },
    { class: "KG A", subject: "SUB. TABLE", assignedTeachers: ["Mrs. S. Lakra"] },
    { class: "KG B", subject: "CR.", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "KG B", subject: "DR.", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "KG B", subject: "DRILL", assignedTeachers: ["Mrs. S. Bage","Mr. S. A. Lakra"] },
    { class: "KG B", subject: "ENG. ACT.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "ENG. CONV.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "ENG. ORAL", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "ENG. REC.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "ENG. STORY", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "ENG. WR.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "GAMES", assignedTeachers: ["Mrs. S. Bage","Mr. S. A. Lakra"] },
    { class: "KG B", subject: "GK", assignedTeachers: ["Mr. S. A. Lakra"] },
    { class: "KG B", subject: "HIN. KAH.", assignedTeachers: ["Ms. K. Sanga"] },
    { class: "KG B", subject: "HIN. KAR. PUS.", assignedTeachers: ["Ms. K. Sanga"] },
    { class: "KG B", subject: "HIN. KAV./GEET", assignedTeachers: ["Ms. K. Sanga","Mr. S. A. Lakra"] },
    { class: "KG B", subject: "HIN. LIK. KAR.", assignedTeachers: ["Ms. K. Sanga"] },
    { class: "KG B", subject: "HT", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "KG B", subject: "M. ACT.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "M. NO. WK.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "M. ORAL", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "M. PR.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "M. SC.", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "KG B", subject: "NT", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "KG B", subject: "SING.", assignedTeachers: ["Mrs. M. Midha","Mr. S. A. Lakra"] },
    { class: "KG B", subject: "SUB. TABLE", assignedTeachers: ["Mrs. M. Midha"] },
    { class: "PREP A", subject: "1ST DRILL", assignedTeachers: ["Ms. A. Amira","Mr. S. A. Lakra"] },
    { class: "PREP A", subject: "CR.", assignedTeachers: ["Ms. A. Amira"] },
    { class: "PREP A", subject: "DR.", assignedTeachers: ["Ms. A. Amira"] },
    { class: "PREP A", subject: "ENG.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "ENG. CR. WR.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "ENG. LANG.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "ENG. LIT.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "ENG. REC.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "ENG. SPELL.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "ENG. WR.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "GAMES", assignedTeachers: ["Ms. A. Amira","Mr. S. A. Lakra"] },
    { class: "PREP A", subject: "GK", assignedTeachers: ["Ms. A. Amira"] },
    { class: "PREP A", subject: "HIN. KAV./GEET", assignedTeachers: ["Ms. N. Horo","Mr. S. A. Lakra"] },
    { class: "PREP A", subject: "HIN. SAHIT.", assignedTeachers: ["Ms. N. Horo"] },
    { class: "PREP A", subject: "HIN. SUL.", assignedTeachers: ["Ms. N. Horo"] },
    { class: "PREP A", subject: "HIN. VYAK.", assignedTeachers: ["Ms. N. Horo"] },
    { class: "PREP A", subject: "HT", assignedTeachers: ["Ms. A. Amira"] },
    { class: "PREP A", subject: "M. Bas.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "M. GEN.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "M. NO. WK.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "M. SC.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP A", subject: "NT", assignedTeachers: ["Ms. A. Amira"] },
    { class: "PREP A", subject: "SING.", assignedTeachers: ["Mrs. R. Pahwa","Mr. S. A. Lakra"] },
    { class: "PREP A", subject: "ST. TIME.", assignedTeachers: ["Mrs. R. Pahwa"] },
    { class: "PREP B", subject: "2ND DRILL", assignedTeachers: ["Mrs. S. Bage","Mr. S. A. Lakra"] },
    { class: "PREP B", subject: "CR.", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "PREP B", subject: "DR.", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "PREP B", subject: "ENG.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "ENG. CR. WR.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "ENG. LANG.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "ENG. LIT.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "ENG. REC.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "ENG. SPELL.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "ENG. WR.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "GAMES", assignedTeachers: ["Mrs. S. Bage","Mr. S. A. Lakra"] },
    { class: "PREP B", subject: "GK", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "PREP B", subject: "HIN. KAV./GEET", assignedTeachers: ["Ms. K. Sanga","Mr. S. A. Lakra"] },
    { class: "PREP B", subject: "HIN. SAHIT.", assignedTeachers: ["Ms. K. Sanga"] },
    { class: "PREP B", subject: "HIN. SUL.", assignedTeachers: ["Ms. K. Sanga"] },
    { class: "PREP B", subject: "HIN. VYAK.", assignedTeachers: ["Ms. K. Sanga"] },
    { class: "PREP B", subject: "HT", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "PREP B", subject: "M. Bas.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "M. GEN.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "M. NO. WK.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "M. SC.", assignedTeachers: ["Mrs. R. Narayan"] },
    { class: "PREP B", subject: "NT", assignedTeachers: ["Mrs. S. Bage"] },
    { class: "PREP B", subject: "SING.", assignedTeachers: ["Mrs. R. Narayan","Mr. S. A. Lakra"] },
    { class: "PREP B", subject: "ST. TIME.", assignedTeachers: ["Mrs. R. Narayan"] }
];

// --- 3. TABLE 1: MASTER TIMETABLE LOG (158 NORMALIZED RECORDS FOR EXPORT / CLOUD SYNC) ---
const masterTimetableLog = [
    { class: "KG A", day: "MON.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "MON.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "MON.", period: "4th", subject: "ENG. ORAL", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "MON.", period: "5th", subject: "ENG. WR.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "TUES.", period: "G/PD", subject: "SUB. TABLE", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "TUES.", period: "1st", subject: "ENG. REC.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "TUES.", period: "2nd", subject: "M. ORAL", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "TUES.", period: "3rd", subject: "M. PR.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "TUES.", period: "6th", subject: "M. ACT.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "WED.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "WED.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "WED.", period: "2nd", subject: "SING.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "WED.", period: "4th", subject: "ENG. WR.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "WED.", period: "5th", subject: "ENG. WR.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "THU.", period: "1st", subject: "ENG. ORAL", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "THU.", period: "3rd", subject: "M. NO. WK.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "THU.", period: "4th", subject: "M. NO. WK.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "FRI.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "FRI.", period: "1st", subject: "M. ORAL", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "FRI.", period: "4th", subject: "ENG. STORY", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "FRI.", period: "5th", subject: "ENG. CONV.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG A", day: "FRI.", period: "6th", subject: "ENG. ACT.", teacherAbbr: "Mrs. S. Lakra", fullName: "Mrs. Synthia Lakra", role: "Class Teacher" },
    { class: "KG B", day: "MON.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "MON.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "MON.", period: "4th", subject: "ENG. ORAL", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "MON.", period: "5th", subject: "ENG. WR.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "TUES.", period: "G/PD", subject: "SUB. TABLE", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "TUES.", period: "1st", subject: "M. ACT.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "TUES.", period: "2nd", subject: "M. ORAL", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "TUES.", period: "4th", subject: "ENG. REC.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "TUES.", period: "5th", subject: "M. PR.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "WED.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "WED.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "WED.", period: "3rd", subject: "ENG. WR.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "WED.", period: "4th", subject: "ENG. WR.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "WED.", period: "5th", subject: "SING.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "THU.", period: "1st", subject: "ENG. ORAL", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "THU.", period: "3rd", subject: "M. NO. WK.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "THU.", period: "4th", subject: "M. NO. WK.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "FRI.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "FRI.", period: "1st", subject: "M. ORAL", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "FRI.", period: "2nd", subject: "ENG. STORY", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "FRI.", period: "3rd", subject: "ENG. CONV.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "KG B", day: "FRI.", period: "6th", subject: "ENG. ACT.", teacherAbbr: "Mrs. M. Midha", fullName: "Mrs. Manisha Midha", role: "Class Teacher" },
    { class: "PREP A", day: "MON.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "MON.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "MON.", period: "3rd", subject: "M. Bas.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "MON.", period: "6th", subject: "ENG. WR.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "TUES.", period: "1st", subject: "ST. TIME.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "TUES.", period: "2nd", subject: "M. GEN.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "TUES.", period: "3rd", subject: "M. GEN.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "TUES.", period: "4th", subject: "ENG. SPELL.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "WED.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "WED.", period: "2nd", subject: "ENG. LANG.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "WED.", period: "3rd", subject: "ENG. LANG.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "WED.", period: "6th", subject: "M. NO. WK.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "THU.", period: "G/PD", subject: "ENG.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "THU.", period: "2nd", subject: "ENG. LIT.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "THU.", period: "3rd", subject: "ENG. LIT.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "THU.", period: "5th", subject: "M. GEN.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "THU.", period: "6th", subject: "M. GEN.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "FRI.", period: "3rd", subject: "SING.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "FRI.", period: "4th", subject: "ENG. CR. WR.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP A", day: "FRI.", period: "5th", subject: "ENG. REC.", teacherAbbr: "Mrs. R. Pahwa", fullName: "Mrs. Riya Pahwa", role: "Class Teacher" },
    { class: "PREP B", day: "MON.", period: "G/PD", subject: "ENG. REC.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "MON.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "MON.", period: "2nd", subject: "ENG. WR.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "MON.", period: "3rd", subject: "M. Bas.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "TUES.", period: "2nd", subject: "ENG. SPELL.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "TUES.", period: "4th", subject: "M. GEN.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "TUES.", period: "5th", subject: "M. GEN.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "TUES.", period: "6th", subject: "ST. TIME.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "WED.", period: "1st", subject: "M. SC.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "WED.", period: "3rd", subject: "ENG. LANG.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "WED.", period: "4th", subject: "ENG. LANG.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "WED.", period: "5th", subject: "M. NO. WK.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "THU.", period: "G/PD", subject: "ENG.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "THU.", period: "1st", subject: "ENG. LIT.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "THU.", period: "2nd", subject: "ENG. LIT.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "THU.", period: "5th", subject: "M. GEN.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "THU.", period: "6th", subject: "M. GEN.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "FRI.", period: "2nd", subject: "ENG. CR. WR.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "FRI.", period: "3rd", subject: "ENG. REC.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "PREP B", day: "FRI.", period: "6th", subject: "SING.", teacherAbbr: "Mrs. R. Narayan", fullName: "Mrs. Ritika Narayan", role: "Class Teacher" },
    { class: "KG A", day: "MON.", period: "2nd", subject: "HIN. KAV./GEET", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "PREP A", day: "MON.", period: "4th", subject: "HIN. KAV./GEET", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "KG A", day: "TUES.", period: "4th", subject: "HIN. LIK. KAR.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "KG A", day: "TUES.", period: "5th", subject: "HIN. LIK. KAR.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "KG A", day: "WED.", period: "3rd", subject: "HIN. KAH.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "PREP A", day: "WED.", period: "4th", subject: "HIN. VYAK.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "PREP A", day: "THU.", period: "1st", subject: "HIN. SUL.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "KG A", day: "THU.", period: "6th", subject: "HIN. KAR. PUS.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "PREP A", day: "FRI.", period: "2nd", subject: "HIN. SAHIT.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "PREP A", day: "FRI.", period: "6th", subject: "HIN. SAHIT.", teacherAbbr: "Ms. N. Horo", fullName: "Ms. Namlen Horo", role: "2nd Teacher" },
    { class: "KG B", day: "MON.", period: "3rd", subject: "HIN. KAV./GEET", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "PREP B", day: "MON.", period: "6th", subject: "HIN. KAV./GEET", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "KG B", day: "TUES.", period: "3rd", subject: "HIN. LIK. KAR.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "KG B", day: "TUES.", period: "6th", subject: "HIN. LIK. KAR.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "KG B", day: "WED.", period: "2nd", subject: "HIN. KAH.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "PREP B", day: "WED.", period: "6th", subject: "HIN. VYAK.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "KG B", day: "THU.", period: "2nd", subject: "HIN. KAR. PUS.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "PREP B", day: "THU.", period: "3rd", subject: "HIN. SUL.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "PREP B", day: "FRI.", period: "4th", subject: "HIN. SAHIT.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "PREP B", day: "FRI.", period: "5th", subject: "HIN. SAHIT.", teacherAbbr: "Ms. K. Sanga", fullName: "Ms. Kalista Sanga", role: "2nd Teacher" },
    { class: "KG A", day: "MON.", period: "G/PD", subject: "GAMES", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "MON.", period: "2nd", subject: "NT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG A", day: "MON.", period: "3rd", subject: "HT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "MON.", period: "5th", subject: "GK", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG A", day: "MON.", period: "6th", subject: "NT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "TUES.", period: "G/PD", subject: "1ST DRILL", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "TUES.", period: "5th", subject: "CR.", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "TUES.", period: "6th", subject: "DR.", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "WED.", period: "G/PD", subject: "GK", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "WED.", period: "5th", subject: "HT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG A", day: "WED.", period: "6th", subject: "HT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG A", day: "THU.", period: "G/PD", subject: "DRILL", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "THU.", period: "4th", subject: "NT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG A", day: "THU.", period: "5th", subject: "NT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "FRI.", period: "G/PD", subject: "GAMES", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "PREP A", day: "FRI.", period: "1st", subject: "HT", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG A", day: "FRI.", period: "2nd", subject: "DR.", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG A", day: "FRI.", period: "3rd", subject: "CR.", teacherAbbr: "Ms. A. Amira", fullName: "Ms. Ashna Amira", role: "2nd Teacher" },
    { class: "KG B", day: "MON.", period: "G/PD", subject: "GAMES", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG B", day: "MON.", period: "2nd", subject: "HT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "MON.", period: "4th", subject: "GK", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "MON.", period: "5th", subject: "NT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG B", day: "MON.", period: "6th", subject: "NT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "TUES.", period: "G/PD", subject: "2ND DRILL", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "TUES.", period: "1st", subject: "CR.", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "TUES.", period: "3rd", subject: "DR.", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "WED.", period: "G/PD", subject: "GK", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "WED.", period: "2nd", subject: "HT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG B", day: "WED.", period: "6th", subject: "HT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG B", day: "THU.", period: "G/PD", subject: "DRILL", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "THU.", period: "4th", subject: "NT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG B", day: "THU.", period: "5th", subject: "NT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "FRI.", period: "G/PD", subject: "GAMES", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "PREP B", day: "FRI.", period: "1st", subject: "HT", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG B", day: "FRI.", period: "4th", subject: "DR.", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG B", day: "FRI.", period: "5th", subject: "CR.", teacherAbbr: "Mrs. S. Bage", fullName: "Mrs. Suman Bage", role: "2nd Teacher" },
    { class: "KG A", day: "MON.", period: "G/PD", subject: "GAMES", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG B", day: "MON.", period: "G/PD", subject: "GAMES", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG A", day: "MON.", period: "2nd", subject: "HIN. KAV./GEET", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG B", day: "MON.", period: "3rd", subject: "HIN. KAV./GEET", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP A", day: "MON.", period: "4th", subject: "HIN. KAV./GEET", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP B", day: "MON.", period: "6th", subject: "HIN. KAV./GEET", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP A", day: "TUES.", period: "G/PD", subject: "1ST DRILL", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP B", day: "TUES.", period: "G/PD", subject: "2ND DRILL", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG A", day: "WED.", period: "2nd", subject: "SING.", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG B", day: "WED.", period: "5th", subject: "SING.", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG A", day: "THU.", period: "G/PD", subject: "DRILL", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG B", day: "THU.", period: "G/PD", subject: "DRILL", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG A", day: "THU.", period: "2nd", subject: "GK", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "KG B", day: "THU.", period: "6th", subject: "GK", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP A", day: "FRI.", period: "G/PD", subject: "GAMES", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP B", day: "FRI.", period: "G/PD", subject: "GAMES", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP A", day: "FRI.", period: "3rd", subject: "SING.", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" },
    { class: "PREP B", day: "FRI.", period: "6th", subject: "SING.", teacherAbbr: "Mr. S. A. Lakra", fullName: "Mr. Stephen Ashish Lakra", role: "3rd Teacher" }
];

const classTeacherMap = {
    'Mrs. S. Lakra': 'KG A',
    'Mrs. M. Midha': 'KG B',
    'Mrs. R. Pahwa': 'PREP A',
    'Mrs. R. Narayan': 'PREP B'
};

const classTeams = {
    'KG A': { ct: 'Mrs. S. Lakra', second: 'Ms. N. Horo', support: 'Mr. S. A. Lakra', preferredOffCT: 'Mr. S. A. Lakra' },
    'KG B': { ct: 'Mrs. M. Midha', second: 'Ms. K. Sanga', support: null, preferredOffCT: 'Ms. K. Sanga' },
    'PREP A': { ct: 'Mrs. R. Pahwa', second: 'Ms. A. Amira', support: null, preferredOffCT: 'Ms. A. Amira' },
    'PREP B': { ct: 'Mrs. R. Narayan', second: 'Mrs. S. Bage', support: null, preferredOffCT: 'Mrs. S. Bage' }
};

const classes = ['KG A', 'KG B', 'PREP A', 'PREP B'];

// Active 10-second acceptance countdown timers: key = `${day}::${period}::${absentTeacher}` -> { remaining, intervalId }
const activeAcceptTimers = new Map();
let pendingDisputeTarget = null;
let pendingOfficiatingTarget = null; // { type: 'ac' } or { type: 'ct', section, absentCT }

let selectedCell = null; 
let draggedData = null;  
let scrollSpeed = 0;
let isScrolling = false;
let registerFilter = 'all';
let isFitGridMode = false;
let generatedProposals = [];
let activeProposalIndex = 0;

// Transient states for specific drop animations
let lastDroppedCell = null; 
let lastDisplacedDrop = null;
let newlyDisplacedItemId = null;
let lastResetCells = [];

const teachers = [
    'Mrs. S. Lakra', 'Mrs. M. Midha', 'Mrs. R. Pahwa', 'Mrs. R. Narayan',
    'Ms. N. Horo', 'Ms. K. Sanga', 'Ms. A. Amira', 'Mrs. S. Bage', 'Mr. S. A. Lakra'
];
const periods = ['G/PD', '1st', 'BREAK', '2nd', '3rd', '4th', 'PLAYTIME / 2ND GOLDEN HOUR', '5th', '6th'];
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// --- INITIALIZATION & STORAGE ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    if (!loadStateFromStorage()) {
        generateSimulatedData(); 
        saveStateToStorage(); 
    }
    bindEvents();
    updateUndoUI();
    renderAll();
});

function saveStateToStorage() {
    const data = {
        schemaVersion: '2.0',
        day: state.day,
        routineViewMode: state.routineViewMode || 'teacher',
        currentRole: state.currentRole,
        activeTeacher: state.activeTeacher,
        baseSchedule: state.baseSchedule,
        schedule: state.schedule,
        substitutions: state.substitutions,
        subStatus: state.subStatus,
        officiatingAC: state.officiatingAC,
        officiatingCT: state.officiatingCT,
        subUnavailable: state.subUnavailable,
        displaced: state.displaced,
        absentTeachers: Array.from(state.absentTeachers), 
        settings: state.settings,
        actionHistory: state.actionHistory
    };
    localStorage.setItem('lfps_frontdesk_state', JSON.stringify(data));
}

function migratePeriodNames(scheduleObj) {
    if (!scheduleObj) return;
    Object.keys(scheduleObj).forEach(day => {
        const daySched = scheduleObj[day];
        if (!daySched) return;
        if (daySched['BREAKFAST'] && !daySched['BREAK']) {
            daySched['BREAK'] = daySched['BREAKFAST'];
            delete daySched['BREAKFAST'];
        }
        if (daySched['BREAKFAST BREAK'] && !daySched['BREAK']) {
            daySched['BREAK'] = daySched['BREAKFAST BREAK'];
            delete daySched['BREAKFAST BREAK'];
        }
        if (daySched['GOLDEN HOUR'] && !daySched['G/PD']) {
            daySched['G/PD'] = daySched['GOLDEN HOUR'];
            delete daySched['GOLDEN HOUR'];
        }
        if (daySched['PLAY TIME'] && !daySched['PLAYTIME / 2ND GOLDEN HOUR']) {
            daySched['PLAYTIME / 2ND GOLDEN HOUR'] = daySched['PLAY TIME'];
            delete daySched['PLAY TIME'];
        }
        if (daySched['2nd GOLDEN HOUR'] && !daySched['PLAYTIME / 2ND GOLDEN HOUR']) {
            daySched['PLAYTIME / 2ND GOLDEN HOUR'] = daySched['2nd GOLDEN HOUR'];
            delete daySched['2nd GOLDEN HOUR'];
        }
    });
}

function loadStateFromStorage() {
    const saved = localStorage.getItem('lfps_frontdesk_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (!parsed || !parsed.schedule || Object.keys(parsed.schedule).length === 0) {
                return false;
            }
            // Enforce schema version check: reset to Schema 2.0 with the real LFPS timetable
            if (!parsed.schemaVersion || parsed.schemaVersion < '2.0') {
                return false; // Triggers fresh, clean load of real 2026-2027 timetable via generateSimulatedData()
            }

            state.day = parsed.day || 'MON';
            state.routineViewMode = parsed.routineViewMode || 'teacher';
            state.currentRole = parsed.currentRole || 'admin';
            state.activeTeacher = parsed.activeTeacher || 'Mrs. R. Pahwa';
            state.baseSchedule = parsed.baseSchedule || JSON.parse(JSON.stringify(parsed.schedule)); 
            state.schedule = parsed.schedule;
            state.substitutions = parsed.substitutions || {};
            state.subStatus = parsed.subStatus || {};
            state.officiatingAC = parsed.officiatingAC || {};
            state.officiatingCT = parsed.officiatingCT || {};
            state.subUnavailable = parsed.subUnavailable || {};
            state.displaced = parsed.displaced || { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
            state.absentTeachers = new Set(parsed.absentTeachers || []);
            state.settings = Object.assign({ 
                samePeriodLock: true, 
                acceptanceTimerEnabled: false,
                acceptanceTimerDuration: 10,
                undoIconStyle: 'curved',
                subHaloIndicator: true,
                subHaloColor: 'emerald',
                minimizeAlerts: false, 
                detectCollisions: true, 
                allowDisputes: true, 
                adminPin: '1234',
                sheetsCsvUrl: DEFAULT_SHEETS_WEBAPP_URL,
                lastCloudSync: null,
                cloudLastModified: null
            }, parsed.settings);
            if (!state.settings.sheetsCsvUrl) {
                state.settings.sheetsCsvUrl = DEFAULT_SHEETS_WEBAPP_URL;
            }
            
            // Automatic migration of periods
            migratePeriodNames(state.schedule);
            migratePeriodNames(state.baseSchedule);

            Object.keys(state.displaced).forEach(day => {
                if (Array.isArray(state.displaced[day])) {
                    state.displaced[day].forEach(item => {
                        if (item.period === 'PLAY TIME' || item.period === '2nd GOLDEN HOUR') item.period = 'PLAYTIME / 2ND GOLDEN HOUR';
                        if (item.period === 'BREAKFAST' || item.period === 'BREAKFAST BREAK') item.period = 'BREAK';
                    });
                }
            });

            Object.keys(state.substitutions).forEach(day => {
                const daySubs = state.substitutions[day];
                if (daySubs) {
                    if (daySubs['PLAY TIME'] && !daySubs['PLAYTIME / 2ND GOLDEN HOUR']) {
                        daySubs['PLAYTIME / 2ND GOLDEN HOUR'] = daySubs['PLAY TIME'];
                        delete daySubs['PLAY TIME'];
                    }
                    if (daySubs['2nd GOLDEN HOUR'] && !daySubs['PLAYTIME / 2ND GOLDEN HOUR']) {
                        daySubs['PLAYTIME / 2ND GOLDEN HOUR'] = daySubs['2nd GOLDEN HOUR'];
                        delete daySubs['2nd GOLDEN HOUR'];
                    }
                    if (daySubs['BREAKFAST'] && !daySubs['BREAK']) {
                        daySubs['BREAK'] = daySubs['BREAKFAST'];
                        delete daySubs['BREAKFAST'];
                    }
                    if (daySubs['BREAKFAST BREAK'] && !daySubs['BREAK']) {
                        daySubs['BREAK'] = daySubs['BREAKFAST BREAK'];
                        delete daySubs['BREAKFAST BREAK'];
                    }
                }
            });
            
            if (parsed.actionHistory) {
                state.actionHistory = {
                    grid: Array.isArray(parsed.actionHistory.grid) ? parsed.actionHistory.grid : [],
                    subs: Array.isArray(parsed.actionHistory.subs) ? parsed.actionHistory.subs : [],
                    redoGrid: Array.isArray(parsed.actionHistory.redoGrid) ? parsed.actionHistory.redoGrid : [],
                    redoSubs: Array.isArray(parsed.actionHistory.redoSubs) ? parsed.actionHistory.redoSubs : []
                };
            } else {
                state.actionHistory = { grid: [], subs: [], redoGrid: [], redoSubs: [] };
            }
            
            cleanupOrphanSubstitutions(state.day);
            
            document.querySelectorAll('.day-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.day === state.day);
            });
            return true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

// --- ROSTER COLOR CUSTOMIZER (USER-SELECTED DEFAULTS) ---
const DEFAULT_ROSTER_COLORS = {
    ct: '#0284c7',    // Teal Sky / Cyan
    st: '#007aff',    // iOS Blue
    coord: '#8b5cf6', // Unified Purple for AC & A.AC
    absent: '#ff3b30' // Crimson Red
};

function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(0, 0, 0, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyRosterColors(colors = {}) {
    if (!state.settings) state.settings = {};
    if (!state.settings.rosterColors) state.settings.rosterColors = Object.assign({}, DEFAULT_ROSTER_COLORS);
    if (colors && Object.keys(colors).length > 0) {
        Object.assign(state.settings.rosterColors, colors);
    }
    const current = state.settings.rosterColors;
    const root = document.documentElement;

    root.style.setProperty('--blob-ct-color', current.ct || DEFAULT_ROSTER_COLORS.ct);
    root.style.setProperty('--blob-ct-bg', hexToRgba(current.ct || DEFAULT_ROSTER_COLORS.ct, 0.14));
    root.style.setProperty('--blob-st-color', current.st || DEFAULT_ROSTER_COLORS.st);
    root.style.setProperty('--blob-st-bg', hexToRgba(current.st || DEFAULT_ROSTER_COLORS.st, 0.14));
    root.style.setProperty('--badge-coord-bg', current.coord || DEFAULT_ROSTER_COLORS.coord);
    root.style.setProperty('--blob-absent-color', current.absent || DEFAULT_ROSTER_COLORS.absent);
    root.style.setProperty('--blob-absent-bg', hexToRgba(current.absent || DEFAULT_ROSTER_COLORS.absent, 0.16));

    // Sync input color pickers if present in DOM
    const pCT = document.getElementById('color-picker-ct');
    const pST = document.getElementById('color-picker-st');
    const pCoord = document.getElementById('color-picker-coord');
    const pAbsent = document.getElementById('color-picker-absent');
    if (pCT) pCT.value = current.ct || DEFAULT_ROSTER_COLORS.ct;
    if (pST) pST.value = current.st || DEFAULT_ROSTER_COLORS.st;
    if (pCoord) pCoord.value = current.coord || DEFAULT_ROSTER_COLORS.coord;
    if (pAbsent) pAbsent.value = current.absent || DEFAULT_ROSTER_COLORS.absent;
}
window.applyRosterColors = applyRosterColors;

// --- ANDROID-STYLE DEVELOPER OPTIONS EASTER EGG ---
let devTapCount = 0;
let devTapTimeout = null;

function updateDevModeVisibility() {
    const isUnlocked = localStorage.getItem('lfps_dev_mode_unlocked') === 'true';
    const devGroup = document.getElementById('roster-color-settings-group');
    const devPill = document.getElementById('dev-mode-pill');
    if (devGroup) {
        devGroup.classList.toggle('hidden', !isUnlocked);
    }
    if (devPill) {
        devPill.classList.toggle('hidden', !isUnlocked);
    }
}
window.updateDevModeVisibility = updateDevModeVisibility;

function handleVersionRowTap() {
    clearTimeout(devTapTimeout);
    devTapTimeout = setTimeout(() => { devTapCount = 0; }, 2500);

    const isUnlocked = localStorage.getItem('lfps_dev_mode_unlocked') === 'true';
    if (isUnlocked) {
        showToast('Developer Options are already unlocked!');
        const devGroup = document.getElementById('roster-color-settings-group');
        if (devGroup) {
            devGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    devTapCount++;
    if (devTapCount >= 2 && devTapCount < 5) {
        const remaining = 5 - devTapCount;
        showToast(`You are now ${remaining} tap${remaining > 1 ? 's' : ''} away from Developer Options!`);
    } else if (devTapCount >= 5) {
        devTapCount = 0;
        localStorage.setItem('lfps_dev_mode_unlocked', 'true');
        if (navigator.vibrate) {
            try { navigator.vibrate([50, 100, 50]); } catch (e) {}
        }
        showToast('🎉 Developer Options Unlocked!');
        updateDevModeVisibility();
        const devGroup = document.getElementById('roster-color-settings-group');
        if (devGroup) {
            devGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}
window.handleVersionRowTap = handleVersionRowTap;

function relockDevMode() {
    localStorage.removeItem('lfps_dev_mode_unlocked');
    updateDevModeVisibility();
    showToast('🔒 Developer Options locked.');
}
window.relockDevMode = relockDevMode;

// --- BROWSER FULLSCREEN HELPERS ---
function isBrowserFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}

function toggleBrowserFullscreen() {
    const doc = document;
    const docEl = document.documentElement;

    if (!isBrowserFullscreen()) {
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        if (req) {
            req.call(docEl).catch(err => {
                console.warn('Fullscreen request failed:', err);
                showToast('Fullscreen mode not permitted by browser.', true);
            });
        } else {
            showToast('Fullscreen API is not supported on this device/browser.', true);
        }
    } else {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        if (exit) {
            exit.call(doc).catch(err => console.warn('Exit fullscreen failed:', err));
        }
    }
}
window.toggleBrowserFullscreen = toggleBrowserFullscreen;

function updateFullscreenUI() {
    const isFull = isBrowserFullscreen();
    const btnLabel = document.getElementById('fullscreen-btn-label');
    const btnIcon = document.getElementById('fullscreen-btn-icon');
    const moreText = document.getElementById('more-fullscreen-text');
    const moreIcon = document.getElementById('more-fullscreen-icon');

    if (btnLabel) btnLabel.textContent = isFull ? 'Exit Fullscreen' : 'Enter Fullscreen';
    if (btnIcon) btnIcon.textContent = isFull ? '↙' : '⛶';
    if (moreText) moreText.textContent = isFull ? 'Exit Fullscreen' : 'Enter Fullscreen';
    if (moreIcon) moreIcon.textContent = isFull ? '↙' : '⛶';
}
window.updateFullscreenUI = updateFullscreenUI;

// --- THEME MANAGEMENT ---
function initTheme() {
    applyRosterColors();
    updateDevModeVisibility();
    const savedTheme = localStorage.getItem('lfps_frontdesk_theme') || 'system';
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery && mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', () => {
            const current = localStorage.getItem('lfps_frontdesk_theme') || 'system';
            if (current === 'system') {
                applyTheme('system');
            }
        });
    }
}

function applyTheme(themeKey) {
    if (themeKey === 'system') {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', themeKey);
        document.body.setAttribute('data-theme', themeKey);
    }
    updateThemeSelectorUI(themeKey);
}

function setTheme(themeKey) {
    localStorage.setItem('lfps_frontdesk_theme', themeKey);
    applyTheme(themeKey);
}
window.setTheme = setTheme;

function updateThemeSelectorUI(activeTheme) {
    // Quick pills
    document.querySelectorAll('.theme-quick-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === activeTheme);
    });

    // More themes select dropdown
    const select = document.getElementById('theme-more-select');
    if (select) {
        const optionExists = Array.from(select.options).some(opt => opt.value === activeTheme);
        if (optionExists) {
            select.value = activeTheme;
        } else {
            select.value = '';
        }
    }

    // Grid buttons if present
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        const isMatch = (btn.dataset.theme === activeTheme);
        btn.classList.toggle('active', isMatch);
        if (isMatch) {
            const parentGrid = btn.closest('.theme-variant-grid');
            if (parentGrid && parentGrid.dataset.catTarget) {
                const cat = parentGrid.dataset.catTarget;
                document.querySelectorAll('.theme-cat-btn').forEach(cBtn => {
                    cBtn.classList.toggle('active', cBtn.dataset.cat === cat);
                });
                document.querySelectorAll('.theme-variant-grid').forEach(g => {
                    g.classList.toggle('active', g.dataset.catTarget === cat);
                });
            }
        }
    });
}

function safeBind(id, eventType, handler, options = false) {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventType, handler, options);
}

function scrollTick() {
    const container = document.querySelector('.table-scroll-container');
    if (scrollSpeed !== 0 && container) {
        container.scrollLeft += scrollSpeed;
        requestAnimationFrame(scrollTick);
    } else {
        isScrolling = false;
    }
}

function switchTabSection(targetId) {
    if (!targetId) return;
    document.querySelectorAll('.nav-zone').forEach(z => {
        z.classList.toggle('active', z.dataset.target === targetId);
    });
    document.querySelectorAll('.tab-section').forEach(t => {
        t.classList.toggle('active', t.id === targetId);
    });
    if (targetId === 'tab-substitutions') {
        renderSubstitutions();
    }
    updateUndoUI();
}
window.switchTabSection = switchTabSection;

function bindEvents() {
    // Bottom Navigation with Full-Zone Switching
    document.querySelectorAll('.nav-zone').forEach(zone => {
        zone.addEventListener('click', () => {
            const targetId = zone.dataset.target;
            switchTabSection(targetId);
        });
    });

    document.querySelectorAll('.day-btn, .fit-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenDay = e.currentTarget.dataset.day;
            if (!chosenDay) return;
            if (chosenDay !== state.day) {
                state.day = chosenDay;
                // Auto-reset undo history on day switch to prevent cross-day action corruption
                state.actionHistory = { grid: [], subs: [], redoGrid: [], redoSubs: [] };
                selectedCell = null; 
                syncDayButtonsUI();
                saveStateToStorage();
                updateUndoUI();
                renderAll();
            }
        });
    });

    // Master Routine View Switcher (Teacher View vs Class View)
    safeBind('routine-view-select', 'change', (e) => {
        const chosenView = e.target.value;
        if (!chosenView) return;
        state.routineViewMode = chosenView;
        selectedCell = null;
        saveStateToStorage();
        renderTableRoutine();
    });

    document.querySelectorAll('.view-seg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosenView = e.currentTarget.dataset.view;
            if (!chosenView) return;
            state.routineViewMode = chosenView;
            const viewSelect = document.getElementById('routine-view-select');
            if (viewSelect) viewSelect.value = chosenView;
            document.querySelectorAll('.view-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.view === chosenView));
            selectedCell = null;
            saveStateToStorage();
            renderTableRoutine();
        });
    });

    // Expanded Fit-Grid View (Mobile Landscape & Full-Width Fit)
    safeBind('fit-grid-btn', 'click', () => toggleFitGridMode(true));
    safeBind('exit-fit-grid-btn', 'click', () => toggleFitGridMode(false));
    safeBind('fit-grid-edit-btn', 'click', () => {
        const editBtn = document.getElementById('edit-toggle-btn');
        if (editBtn) editBtn.click();
    });

    // Daily Substitution Register Filter Tabs
    document.querySelectorAll('.reg-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.reg-filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            registerFilter = e.currentTarget.dataset.filter || 'all';
            renderSubstitutions();
        });
    });

    const editBtn = document.getElementById('edit-toggle-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (state.isMasterEditMode) {
                // If currently in master edit mode, clicking this prompts to save baseline
                saveMasterBaseline();
                return;
            }
            state.isEditMode = !state.isEditMode;
            selectedCell = null; 
            updateMasterLockUI();
            renderAll(); 
            showToast(state.isEditMode ? 'Edit Schedule Mode enabled (Drag & drop to move tasks)' : 'Schedule saved.');
        });
    }

    // Master Routine PIN lock button
    safeBind('master-lock-btn', 'click', () => {
        if (state.isMasterUnlocked) {
            // Already unlocked -> toggle master editing mode
            toggleMasterEditMode();
        } else {
            // Locked -> prompt 4-digit PIN
            openPinModal('Admin Passcode Required', 'Enter 4-digit PIN to edit Master Routine baseline.', () => {
                toggleMasterEditMode(true);
            });
        }
    });

    // Master Baseline Banner action buttons
    safeBind('master-edit-save-btn', 'click', saveMasterBaseline);
    safeBind('master-edit-cancel-btn', 'click', cancelMasterBaseline);

    // PIN Modal bindings
    safeBind('close-pin-modal-btn', 'click', closePinModal);
    safeBind('pin-overlay', 'click', closePinModal);
    document.querySelectorAll('.pin-key-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            if (key) handlePinKey(key);
        });
    });

    // Master Cell Editor Modal bindings
    safeBind('close-master-cell-modal-btn', 'click', closeMasterCellModal);
    safeBind('master-cell-overlay', 'click', closeMasterCellModal);
    safeBind('master-cell-cancel-btn', 'click', closeMasterCellModal);
    safeBind('master-cell-apply-btn', 'click', applyMasterCellAllocation);
    safeBind('master-cell-delete-btn', 'click', clearMasterCellAllocation);
    safeBind('master-free-btn', 'click', () => {
        const subjInput = document.getElementById('master-subject-input');
        if (subjInput) subjInput.value = '';
        document.querySelectorAll('.section-pill-btn').forEach(b => b.classList.remove('active'));
        checkMasterCellCollision();
    });

    // Master Section Pills
    document.querySelectorAll('.section-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const isAlreadyActive = btn.classList.contains('active');
            document.querySelectorAll('.section-pill-btn').forEach(b => b.classList.remove('active'));
            if (!isAlreadyActive) {
                btn.classList.add('active');
            }
            checkMasterCellCollision();
        });
    });

    safeBind('master-subject-input', 'input', checkMasterCellCollision);
    safeBind('master-partner-select', 'change', checkMasterCellCollision);

    // Admin PIN Update in Settings
    safeBind('btn-save-pin', 'click', () => {
        const pinInput = document.getElementById('admin-pin-input');
        const val = pinInput ? pinInput.value.trim() : '';
        if (val.length === 4 && /^\d{4}$/.test(val)) {
            state.settings.adminPin = val;
            saveStateToStorage();
            showToast('Admin PIN updated');
        } else {
            showToast('PIN must be 4 digits', true);
        }
    });

    // Google Sheets Cloud Sync Settings & Buttons
    safeBind('btn-save-sheets-url', 'click', () => {
        const urlInput = document.getElementById('sheets-csv-url-input');
        const rawUrl = urlInput ? urlInput.value.trim() : '';
        const norm = normalizeCSVUrl(rawUrl);
        state.settings.sheetsCsvUrl = norm;
        if (urlInput && norm !== rawUrl) urlInput.value = norm;
        saveStateToStorage();
        updateCloudSyncUI();
        showToast('Sheets URL saved');
    });

    safeBind('btn-sync-now', 'click', () => {
        syncFromGoogleSheets(true);
    });

    safeBind('push-ledger-btn', 'click', () => {
        pushSubstitutionsToCloud();
    });

    safeBind('btn-push-sheets', 'click', () => {
        pushSubstitutionsToCloud();
    });

    // Cloud Conflict Modal Buttons
    safeBind('close-cloud-conflict-btn', 'click', closeCloudConflictModal);
    safeBind('cloud-conflict-overlay', 'click', closeCloudConflictModal);
    safeBind('btn-conflict-cancel', 'click', closeCloudConflictModal);
    safeBind('btn-conflict-accept-cloud', 'click', acceptCloudSchedule);
    safeBind('btn-conflict-keep-local', 'click', keepLocalSchedule);

    safeBind('hide-absent-toggle', 'change', renderAll);
    
    safeBind('sheet-overlay', 'click', (e) => {
        if (Date.now() - lastBottomSheetOpenTime < 300) return;
        e.preventDefault(); e.stopPropagation(); closeBottomSheet();
    });
    safeBind('sheet-overlay', 'touchstart', (e) => {
        if (Date.now() - lastBottomSheetOpenTime < 300) return;
        e.preventDefault(); e.stopPropagation(); closeBottomSheet();
    }, {passive: false});

    safeBind('toast-undo-btn', 'click', undoLastAction);
    safeBind('header-undo-btn', 'click', undoLastAction);
    safeBind('header-redo-btn', 'click', redoLastAction);
    safeBind('reset-schedule-btn', 'click', handleResetSchedule);
    safeBind('auto-resolve-btn', 'click', performAutoResolve);

    // Multi-Option Smart Auto-Resolve Proposals Modal
    safeBind('close-auto-resolve-modal-btn', 'click', closeAutoResolveModal);
    safeBind('auto-resolve-overlay', 'click', closeAutoResolveModal);
    safeBind('auto-resolve-cancel-btn', 'click', closeAutoResolveModal);
    safeBind('auto-resolve-apply-btn', 'click', applySelectedProposal);

    safeBind('settings-btn', 'click', openSettingsModal);
    safeBind('close-settings-btn', 'click', closeSettingsModal);
    safeBind('settings-overlay', 'click', closeSettingsModal);

    // Timetable Baseline & Mock Data Generator
    safeBind('btn-pristine-reset', 'click', () => {
        closeSettingsModal();
        generateSimulatedData('pristine');
        showToast('Baseline routine restored');
    });

    safeBind('btn-apply-scenario', 'click', () => {
        const scenario = document.getElementById('mock-scenario-select')?.value || 'single_absence';
        closeSettingsModal();
        generateSimulatedData(scenario);
        showToast(`Simulation loaded: ${scenario}`);
    });

    safeBind('btn-purge-history', 'click', () => {
        state.actionHistory = { grid: [], subs: [], redoGrid: [], redoSubs: [] };
        saveStateToStorage();
        updateUndoUI();
        showToast('History purged');
    });

    // Temporary Roster Color Customizer Event Listeners
    ['ct', 'st', 'coord', 'absent'].forEach(key => {
        const picker = document.getElementById(`color-picker-${key}`);
        if (picker) {
            const updateColor = (val) => {
                applyRosterColors({ [key]: val });
                saveStateToStorage();
            };
            picker.addEventListener('input', (e) => updateColor(e.target.value));
            picker.addEventListener('change', (e) => updateColor(e.target.value));
        }
    });

    document.querySelectorAll('.color-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const color = btn.dataset.color;
            if (target && color) {
                applyRosterColors({ [target]: color });
                saveStateToStorage();
            }
        });
    });

    safeBind('btn-reset-roster-colors', 'click', () => {
        state.settings.rosterColors = Object.assign({}, DEFAULT_ROSTER_COLORS);
        applyRosterColors(DEFAULT_ROSTER_COLORS);
        saveStateToStorage();
        showToast('Roster colors reset');
    });
    
    // Feature Overview Tour Modal
    safeBind('tour-btn', 'click', openTourModal);
    safeBind('close-tour-btn', 'click', closeTourModal);
    safeBind('tour-overlay', 'click', closeTourModal);
    safeBind('settings-open-tour-row', 'click', () => {
        closeSettingsModal();
        openTourModal();
    });

    // Co-Teacher Selective Split Modal
    safeBind('close-split-modal-btn', 'click', closeSplitModal);
    safeBind('split-overlay', 'click', closeSplitModal);
    safeBind('split-cancel-btn', 'click', cancelSplitModal);
    safeBind('split-confirm-btn', 'click', applySelectedSplits);

    // Co-Teacher Inspector Modal
    safeBind('close-co-teach-modal-btn', 'click', closeCoTeachingModal);
    safeBind('co-teach-overlay', 'click', closeCoTeachingModal);

    // Officiating Role Picker Modal (Off. AC & Off. CT.)
    safeBind('close-officiating-modal-btn', 'click', closeOfficiatingModal);
    safeBind('officiating-overlay', 'click', closeOfficiatingModal);

    // Substitution Dispute Modal
    safeBind('close-dispute-modal-btn', 'click', closeDisputeModal);
    safeBind('dispute-overlay', 'click', closeDisputeModal);
    safeBind('dispute-cancel-btn', 'click', closeDisputeModal);
    safeBind('dispute-submit-btn', 'click', submitDisputeReason);

    // Header Role Badge Button -> opens Settings to switch role
    safeBind('role-badge-btn', 'click', openSettingsModal);

    // Role Option Buttons in Settings
    document.querySelectorAll('.role-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role;
            if (role) setActiveRole(role);
        });
    });

    // Seamless Automatic Role & Permission Inheritance
    safeBind('active-staff-profile-select', 'change', (e) => {
        const val = e.target.value;
        if (val === 'admin') {
            setActiveRole('admin');
            showToast('Role: Administrator');
        } else if (val === PRIMARY_AC) {
            state.activeTeacher = PRIMARY_AC;
            setActiveRole('ac');
            showToast(`Role: AC (${PRIMARY_AC})`);
        } else if (val === ASSISTANT_AC) {
            state.activeTeacher = ASSISTANT_AC;
            setActiveRole('asst_ac');
            showToast(`Role: Asst AC (${ASSISTANT_AC})`);
        } else {
            state.activeTeacher = val;
            setActiveRole('teacher');
            showToast(`Viewing: ${val}`);
        }
    });

    safeBind('absence-context-overlay', 'click', closeAbsenceContextMenu);

    safeBind('active-teacher-select', 'change', (e) => {
        state.activeTeacher = e.target.value;
        saveStateToStorage();
        updateRolePermissionsUI();
        renderAll();
        showToast(`Viewing: ${state.activeTeacher}`);
    });

    safeBind('allow-disputes-toggle', 'change', (e) => {
        if (!hasCoordinatorPermissions()) return;
        state.settings.allowDisputes = e.target.checked;
        saveStateToStorage();
        renderAll();
        showToast(state.settings.allowDisputes ? 'Disputes enabled' : 'Disputes disabled');
    });
    
    safeBind('same-period-lock-toggle', 'change', (e) => {
        state.settings.samePeriodLock = e.target.checked;
        saveStateToStorage();
        showToast(state.settings.samePeriodLock ? 'Same-Period Lock on' : 'Cross-period subs allowed');
    });

    safeBind('acceptance-timer-toggle', 'change', (e) => {
        state.settings.acceptanceTimerEnabled = e.target.checked;
        saveStateToStorage();
        renderAll();
        showToast(state.settings.acceptanceTimerEnabled ? `Acceptance timer enabled (${state.settings.acceptanceTimerDuration || 10}s)` : 'Free dispute enabled (No timer)');
    });

    safeBind('acceptance-timer-duration', 'change', (e) => {
        state.settings.acceptanceTimerDuration = parseInt(e.target.value, 10) || 10;
        saveStateToStorage();
        showToast(`Timer set to ${state.settings.acceptanceTimerDuration}s`);
    });

    safeBind('sub-halo-toggle', 'change', (e) => {
        state.settings.subHaloIndicator = e.target.checked;
        saveStateToStorage();
        renderTableRoutine();
        showToast(state.settings.subHaloIndicator ? 'Sub halo ring enabled' : 'Sub halo ring disabled');
    });

    safeBind('sub-halo-color-select', 'change', (e) => {
        state.settings.subHaloColor = e.target.value || 'emerald';
        saveStateToStorage();
        renderTableRoutine();
        showToast(`Halo color: ${state.settings.subHaloColor}`);
    });

    document.querySelectorAll('.undo-style-card').forEach(card => {
        card.addEventListener('click', () => {
            const style = card.getAttribute('data-style') || 'curved';
            state.settings.undoIconStyle = style;
            saveStateToStorage();
            document.querySelectorAll('.undo-style-card').forEach(c => c.classList.toggle('active', c === card));
            updateUndoUI();
            showToast(`Undo style: ${style}`);
        });
    });

    safeBind('minimize-alerts-toggle', 'change', (e) => {
        state.settings.minimizeAlerts = e.target.checked;
        saveStateToStorage();
        showToast(state.settings.minimizeAlerts ? 'Alerts minimized' : 'Alerts set to normal', true);
    });

    safeBind('detect-collisions-toggle', 'change', (e) => {
        state.settings.detectCollisions = e.target.checked;
        saveStateToStorage();
        renderAll();
    });

    const handleConflictClick = () => {
        const conflicts = findConflicts();
        if (conflicts.count > 0) {
            const firstCell = document.querySelector('.cell-collision');
            if (firstCell) {
                firstCell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' });
            }
            showToast(`Found ${conflicts.count} conflict(s): ${conflicts.details.slice(0, 2).join('; ')}`, true);
        }
    };

    safeBind('collision-indicator', 'click', handleConflictClick);
    safeBind('footer-conflict-pill', 'click', handleConflictClick);

    // Theme Family Category Tabs Switcher
    document.querySelectorAll('.theme-cat-btn').forEach(catBtn => {
        catBtn.addEventListener('click', (e) => {
            const targetCat = e.currentTarget.dataset.cat;
            if (!targetCat) return;
            document.querySelectorAll('.theme-cat-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.querySelectorAll('.theme-variant-grid').forEach(grid => {
                grid.classList.toggle('active', grid.dataset.catTarget === targetCat);
            });
        });
    });

    // Theme selector option buttons in Settings
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });

    // Compact Layman Theme Selector Pills
    document.querySelectorAll('.theme-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            if (theme) setTheme(theme);
        });
    });

    // More Themes Dropdown Selector
    safeBind('theme-more-select', 'change', (e) => {
        const theme = e.target.value;
        if (theme) setTheme(theme);
    });

    // Browser Fullscreen Toggle Buttons
    safeBind('btn-toggle-fullscreen', 'click', toggleBrowserFullscreen);
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
        document.addEventListener(evt, updateFullscreenUI);
    });

    // Android-Style Easter Egg Tap on Version Row & Re-lock Dev Options
    safeBind('settings-version-row', 'click', handleVersionRowTap);
    safeBind('btn-relock-dev', 'click', relockDevMode);

    // Admin Master Routine PIN Change Flow
    safeBind('btn-change-pin', 'click', openChangePinFlow);

    // 3-Dot Overflow Menu Handler (Mobile & Responsive)
    const moreBtn = document.getElementById('header-more-btn');
    const morePopover = document.getElementById('header-more-popover');
    if (moreBtn && morePopover) {
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            morePopover.classList.toggle('hidden');
            const lockStatus = document.getElementById('more-lock-status');
            if (lockStatus) {
                if (state.isMasterEditMode) {
                    lockStatus.textContent = '🛠 Master Editing';
                    lockStatus.className = 'more-badge badge-master-editing';
                } else if (state.isEditMode) {
                    lockStatus.textContent = '● In Edit Mode';
                    lockStatus.className = 'more-badge badge-active-editing';
                } else {
                    lockStatus.textContent = state.isMasterUnlocked ? '🔓 Unlocked' : '🔒 Locked';
                    lockStatus.className = 'more-badge';
                }
            }
            updateFullscreenUI();
        });

        document.addEventListener('click', (e) => {
            if (!morePopover.classList.contains('hidden') && !e.target.closest('#header-more-btn') && !e.target.closest('#header-more-popover')) {
                morePopover.classList.add('hidden');
            }
        });

        safeBind('more-item-notifs', 'click', () => {
            morePopover.classList.add('hidden');
            openNotificationsModal();
        });

        safeBind('more-item-edit', 'click', () => {
            morePopover.classList.add('hidden');
            const editBtn = document.getElementById('edit-toggle-btn');
            if (editBtn) editBtn.click();
        });

        safeBind('more-item-reset', 'click', () => {
            morePopover.classList.add('hidden');
            const resetBtn = document.getElementById('reset-schedule-btn');
            if (resetBtn) resetBtn.click();
        });

        safeBind('more-item-fullscreen', 'click', () => {
            morePopover.classList.add('hidden');
            toggleBrowserFullscreen();
        });

        safeBind('more-item-subavail', 'click', () => {
            morePopover.classList.add('hidden');
            const subAvailBtn = document.getElementById('btn-open-sub-avail-modal');
            if (subAvailBtn) subAvailBtn.click();
        });

        safeBind('more-item-fitgrid', 'click', () => {
            morePopover.classList.add('hidden');
            const fitBtn = document.getElementById('fit-grid-btn');
            if (fitBtn) fitBtn.click();
        });

        safeBind('more-item-tour', 'click', () => {
            morePopover.classList.add('hidden');
            openTourModal();
        });
    }

    // Header Notification Center Bindings (Job Bundle 5)
    safeBind('notifications-btn', 'click', openNotificationsModal);
    safeBind('close-notifications-btn', 'click', closeNotificationsModal);
    safeBind('notif-done-btn', 'click', closeNotificationsModal);
    safeBind('notifications-overlay', 'click', closeNotificationsModal);
    safeBind('notif-refresh-btn', 'click', () => {
        renderNotificationCenter();
        updateNotificationBadge();
        showToast('Notices refreshed');
    });

    // Sub-Availability Rapid 1-Tap Modal & Remark Popover Bindings (Job Bundle 2)
    safeBind('btn-open-sub-avail-modal', 'click', () => openSubAvailModal(null, 'all'));
    safeBind('close-sub-avail-modal-btn', 'click', closeSubAvailModal);
    safeBind('sub-avail-done-btn', 'click', closeSubAvailModal);
    safeBind('sub-avail-overlay', 'click', closeSubAvailModal);
    safeBind('sub-avail-tab-single', 'click', () => switchSubAvailView('single'));
    safeBind('sub-avail-tab-all', 'click', () => switchSubAvailView('all'));
    safeBind('sub-avail-toggle-view-link', 'click', () => {
        switchSubAvailView(currentSubAvailView === 'single' ? 'all' : 'single');
    });
    safeBind('sub-avail-main-action-btn', 'click', handleSubAvailMainAction);
    safeBind('sub-avail-apply-custom-btn', 'click', handleSubAvailCustomApply);

    const customRemarkInput = document.getElementById('sub-avail-custom-input');
    if (customRemarkInput) {
        customRemarkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubAvailCustomApply();
            }
        });
    }

    // Fast 1-Tap duty chips (Auto-saves on tap)
    document.querySelectorAll('#sub-avail-fast-chips .sub-fast-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const remark = chip.dataset.remark || chip.textContent.trim();
            handleSubAvailQuickDuty(remark);
        });
    });

    safeBind('sub-remark-popover-close-btn', 'click', hideSubRemarkPopover);

    // In-Situ Teacher Quick Action Modal (FEAT-08)
    safeBind('close-quick-action-btn', 'click', closeTeacherQuickActionModal);
    safeBind('teacher-quick-action-overlay', 'click', closeTeacherQuickActionModal);
    safeBind('quick-action-absence-btn', 'click', () => {
        if (!pendingQuickActionTeacher) return;
        const teacher = pendingQuickActionTeacher;
        const isAbsent = state.absentTeachers.has(teacher);
        if (isAbsent) {
            state.absentTeachers.delete(teacher);
            revertSubstitutionsForTeacher(teacher, state.day);
            showToast(`${teacher} marked Present`);
        } else {
            state.absentTeachers.add(teacher);
            showToast(`${teacher} marked Absent for ${state.day}`);
        }
        saveStateToStorage();
        closeTeacherQuickActionModal();
        renderAll();
    });
    safeBind('quick-action-subavail-btn', 'click', () => {
        const teacher = pendingQuickActionTeacher;
        closeTeacherQuickActionModal();
        if (teacher) openSubAvailModal(teacher, 'single');
    });
    safeBind('quick-action-offct-btn', 'click', () => {
        const teacher = pendingQuickActionTeacher;
        const sec = teacher ? classTeacherMap[teacher] : null;
        closeTeacherQuickActionModal();
        if (teacher && sec) openOfficiatingModal('ct', sec, teacher);
    });

    // Reset Button History Purge Shortcut Context Popover
    safeBind('reset-context-overlay', 'click', closeResetContextMenu);
    safeBind('ctx-btn-purge-history', 'click', () => {
        closeResetContextMenu();
        confirmPurgeActionHistory();
    });

    // Bind Long-press & Right-click to Reset Buttons
    bindResetButtonLongPress(document.getElementById('reset-schedule-btn'));
    bindResetButtonLongPress(document.getElementById('more-item-reset'));

    // Global listener for '?' help buttons and popover dismiss
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-sub-reason-help');
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            const teacher = btn.dataset.teacher;
            const remark = btn.dataset.remark;
            showSubRemarkPopover(teacher, remark, btn);
            return;
        }
        if (!e.target.closest('#sub-remark-popover')) {
            hideSubRemarkPopover();
        }
    });

    window.addEventListener('keydown', handleGlobalKeydown);

    // Bottom Sheet Fluid Drag-to-Dismiss Touch Physics
    const sheet = document.getElementById('bottom-sheet');
    const handle = document.getElementById('sheet-handle');
    let startY = 0;
    let currentY = 0;
    let isDraggingSheet = false;

    if (sheet && handle) {
        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            currentY = startY;
            isDraggingSheet = true;
            sheet.style.transition = 'none';
        }, {passive: true});

        window.addEventListener('touchmove', (e) => {
            if (!isDraggingSheet) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            if (deltaY > 0) { 
                sheet.style.transform = `translateY(${deltaY}px)`;
            }
        }, {passive: true});

        window.addEventListener('touchend', (e) => {
            if (!isDraggingSheet) return;
            isDraggingSheet = false;
            sheet.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), bottom 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            const deltaY = currentY - startY;
            if (deltaY > 60) {
                closeBottomSheet();
                setTimeout(() => { sheet.style.transform = ''; }, 320); 
            } else {
                sheet.style.transform = (window.innerWidth >= 900) ? 'translateX(-50%) translateY(0)' : 'translateY(0)'; 
            }
        });

        handle.addEventListener('click', closeBottomSheet);
    }

    const tableContainer = document.querySelector('.table-scroll-container');
    const table = document.getElementById('routine-table');
    
    if (table && tableContainer) {
        // Desktop Click vs Drag Detection for Timetable Cells (Job Bundle 6)
        let mouseCellDownX = 0;
        let mouseCellDownY = 0;
        let mouseCellDownTime = 0;
        let mouseCellTarget = null;
        let isDragActive = false;

        table.addEventListener('mousedown', (e) => {
            const td = e.target.closest('td');
            if (td) {
                mouseCellDownX = e.clientX;
                mouseCellDownY = e.clientY;
                mouseCellDownTime = Date.now();
                mouseCellTarget = td;
                isDragActive = false;
            }
        });

        table.addEventListener('mouseup', (e) => {
            if (isDragActive || e.altKey) return;
            const td = e.target.closest('td');
            if (!td || td !== mouseCellTarget) return;

            const dist = Math.hypot(e.clientX - mouseCellDownX, e.clientY - mouseCellDownY);
            const timeDiff = Date.now() - mouseCellDownTime;

            // If mouse moved less than 6px within 500ms, it is a deliberate click/tap
            if (dist < 6 && timeDiff < 500) {
                const period = td.dataset.period;
                const teacher = td.dataset.teacher;
                if (!period || !teacher) return;

                if (state.isEditMode) {
                    handleGridInteraction(period, teacher);
                } else if (td.classList.contains('cell-missing') || td.classList.contains('cell-covered')) {
                    setTimeout(() => openBottomSheet(period, teacher), 20);
                }
            }
        });

        // Option+Click: Reset clicked element to original state (revert sub, send subject back, reset cell)
        table.addEventListener('click', (e) => {
            if (e.altKey) {
                const td = e.target.closest('td');
                if (td && td.dataset.period && td.dataset.teacher) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    resetCellToOriginalState(td.dataset.period, td.dataset.teacher);
                }
            }
        }, true);

        const displacedTray = document.getElementById('displaced-tray');
        if (displacedTray) {
            displacedTray.addEventListener('click', (e) => {
                if (e.altKey) {
                    const itemEl = e.target.closest('.displaced-item');
                    if (itemEl && itemEl.dataset.id) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        resetDisplacedItemToOriginal(itemEl.dataset.id);
                    }
                }
            }, true);
        }

        table.addEventListener('dragstart', (e) => {
            isDragActive = true;
            const td = e.target.closest('td');
            if (!td || !td.dataset.period) return e.preventDefault();
            
            const period = td.dataset.period;
            const teacher = td.dataset.teacher;
            const isAbsent = state.absentTeachers.has(teacher);
            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
            const assignedSub = state.substitutions[state.day]?.[period]?.[teacher];
            
            let coveringFor = null;
            const periodSubs = state.substitutions[state.day]?.[period];
            if (periodSubs) {
                for (const [absT, subT] of Object.entries(periodSubs)) {
                    if (subT === teacher) {
                        coveringFor = absT;
                        break;
                    }
                }
            }
            
            const isMissingSub = isAbsent && baseTask && baseTask !== 'Free' && !assignedSub;
            const isSubRelated = isMissingSub || assignedSub || coveringFor;
            
            if (!state.isEditMode && !isSubRelated) {
                return e.preventDefault();
            }
            
            draggedData = { 
                type: 'grid', 
                period, 
                teacher,
                isSubRelated,
                isMissingSub,
                assignedSub,
                coveringFor
            };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); 
            scrollSpeed = 0;

            setTimeout(() => td.classList.add('cell-dragging'), 0);
        });

        tableContainer.addEventListener('dragover', (e) => {
            if (!draggedData) return;
            e.preventDefault(); 
            
            const rect = tableContainer.getBoundingClientRect();
            const threshold = 70; 
            const mouseX = e.clientX - rect.left;
            
            if (mouseX < threshold) {
                scrollSpeed = -((threshold - mouseX) / 4);
                if (!isScrolling) { isScrolling = true; requestAnimationFrame(scrollTick); }
            } else if (mouseX > rect.width - threshold) {
                scrollSpeed = ((mouseX - (rect.width - threshold)) / 4);
                if (!isScrolling) { isScrolling = true; requestAnimationFrame(scrollTick); }
            } else {
                scrollSpeed = 0;
            }

            const targetCell = e.target.closest('td');
            if (targetCell && targetCell.dataset.period) {
                const isCrossAllowed = (!state.settings || state.settings.samePeriodLock === false);
                if (draggedData.isSubRelated && (targetCell.dataset.period === draggedData.period || isCrossAllowed)) {
                    targetCell.classList.add('drag-over-sub');
                } else {
                    targetCell.classList.add('drag-over');
                }
            }
        });

        tableContainer.addEventListener('dragleave', (e) => {
            const targetCell = e.target.closest('td');
            if (targetCell) {
                targetCell.classList.remove('drag-over', 'drag-over-sub');
            }
            
            const rect = tableContainer.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                scrollSpeed = 0;
            }
        });

        tableContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            scrollSpeed = 0; 
            if (!draggedData) return;
            
            const targetCell = e.target.closest('td');
            document.querySelectorAll('.drag-over, .drag-over-sub').forEach(el => el.classList.remove('drag-over', 'drag-over-sub'));
            
            if (targetCell && targetCell.dataset.period && targetCell.dataset.teacher) {
                const tPeriod = targetCell.dataset.period;
                const tTeacher = targetCell.dataset.teacher;

                if (draggedData.type === 'grid' && draggedData.period === tPeriod && draggedData.teacher === tTeacher) {
                    draggedData = null;
                    document.querySelectorAll('.cell-dragging').forEach(el => el.classList.remove('cell-dragging'));
                    return;
                }

                if (draggedData.type === 'displaced') {
                    if (tPeriod === 'BREAK' || tPeriod === 'BREAKFAST BREAK' || tPeriod === 'BREAKFAST') {
                        triggerErrorJitter(draggedData.element, `Cannot drop class into Break.`);
                        draggedData.wasDroppedSuccessfully = false;
                        draggedData = null;
                        document.querySelectorAll('.cell-dragging').forEach(el => el.classList.remove('cell-dragging'));
                        return;
                    }
                    draggedData.wasDroppedSuccessfully = true;
                    executeMove(draggedData, { period: tPeriod, teacher: tTeacher });
                } else {
                    executeMove(draggedData, { period: tPeriod, teacher: tTeacher });
                }
            } else if (draggedData.type === 'displaced') {
                draggedData.wasDroppedSuccessfully = false;
                triggerErrorJitter(draggedData.element, `Drop cancelled: drop onto a timetable cell.`);
            }
            draggedData = null;
            document.querySelectorAll('.cell-dragging').forEach(el => el.classList.remove('cell-dragging'));
        });

        table.addEventListener('dragend', () => {
            scrollSpeed = 0;
            draggedData = null;
            setTimeout(() => { isDragActive = false; }, 60);
            document.querySelectorAll('.drag-over, .drag-over-sub').forEach(el => el.classList.remove('drag-over', 'drag-over-sub'));
            document.querySelectorAll('.cell-dragging').forEach(el => el.classList.remove('cell-dragging'));
        });

        table.addEventListener('mouseover', (e) => {
            const th = e.target.closest('th');
            if (th && th.cellIndex > 0) {
                th.classList.add('col-header-hover');
                const colIdx = th.cellIndex + 1;
                table.querySelectorAll(`tbody td:nth-child(${colIdx})`).forEach(td => td.classList.add('col-hover'));
            }
            
            const teacherTd = e.target.closest('tbody td:first-child');
            if (teacherTd) {
                const tr = teacherTd.closest('tr');
                if (tr) tr.classList.add('row-hover');
            }
        });

        table.addEventListener('mouseout', (e) => {
            const th = e.target.closest('th');
            if (th && th.cellIndex > 0) {
                th.classList.remove('col-header-hover');
                const colIdx = th.cellIndex + 1;
                table.querySelectorAll(`tbody td:nth-child(${colIdx})`).forEach(td => td.classList.remove('col-hover'));
            }
            
            const teacherTd = e.target.closest('tbody td:first-child');
            if (teacherTd) {
                const tr = teacherTd.closest('tr');
                if (tr) tr.classList.remove('row-hover');
            }
        });
    }
}

// --- TEACHER SUB-AVAILABILITY & INTERACTIVE '?' REMARK ENGINE ---

function isTeacherSubUnavailable(teacher, day = state.day) {
    if (!state.subUnavailable || !state.subUnavailable[day]) return false;
    return Object.prototype.hasOwnProperty.call(state.subUnavailable[day], teacher);
}

function getTeacherSubUnavailableRemark(teacher, day = state.day) {
    if (!state.subUnavailable || !state.subUnavailable[day]) return '';
    return state.subUnavailable[day][teacher] || '';
}

function setTeacherSubUnavailable(teacher, isUnavailable, remark = '', day = state.day) {
    if (!state.subUnavailable) state.subUnavailable = {};
    if (!state.subUnavailable[day]) state.subUnavailable[day] = {};

    if (isUnavailable) {
        state.subUnavailable[day][teacher] = (remark || '').trim();
    } else {
        delete state.subUnavailable[day][teacher];
    }
    saveStateToStorage();
    renderAll();
}

// --- IN-SITU GRID TEACHER QUICK ACTION MODAL (FEAT-08) ---
let pendingQuickActionTeacher = null;

function openTeacherQuickActionModal(teacher) {
    if (!teacher) return;
    pendingQuickActionTeacher = teacher;

    const modal = document.getElementById('teacher-quick-action-modal');
    const overlay = document.getElementById('teacher-quick-action-overlay');
    if (!modal || !overlay) return;

    const staff = staffDirectory[teacher];
    const ctSec = classTeacherMap[teacher];
    const isCT = !!ctSec;
    const isAbsent = state.absentTeachers.has(teacher);

    const avatarEl = document.getElementById('quick-action-avatar');
    const nameEl = document.getElementById('quick-action-name');
    const subtextEl = document.getElementById('quick-action-subtext');
    const absenceBtn = document.getElementById('quick-action-absence-btn');
    const absenceIcon = document.getElementById('quick-action-absence-icon');
    const absenceText = document.getElementById('quick-action-absence-text');
    const offctBtn = document.getElementById('quick-action-offct-btn');

    if (avatarEl) {
        const initials = staff?.initials || teacher.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '').slice(0, 2).toUpperCase();
        avatarEl.textContent = initials;
        avatarEl.className = `avatar-circle ${isCT ? 'blob-ct' : 'blob-st'}`;
    }

    if (nameEl) nameEl.textContent = teacher;
    if (subtextEl) {
        const role = staff?.role || (isCT ? `Class Teacher (${ctSec})` : 'Subject Teacher');
        subtextEl.textContent = `${staff?.fullName || teacher} • ${role}`;
    }

    if (absenceBtn && absenceIcon && absenceText) {
        if (isAbsent) {
            absenceBtn.style.background = 'var(--accent-green)';
            absenceIcon.textContent = '🟢';
            absenceText.textContent = 'Mark Present Today';
        } else {
            absenceBtn.style.background = 'var(--accent-red)';
            absenceIcon.textContent = '🔴';
            absenceText.textContent = 'Mark Absent Today';
        }
    }

    if (offctBtn) {
        if (isAbsent && isCT) {
            offctBtn.classList.remove('hidden');
            const spanText = offctBtn.querySelector('span:last-child');
            if (spanText) spanText.textContent = `Assign Off. CT. for Class ${ctSec}`;
        } else {
            offctBtn.classList.add('hidden');
        }
    }

    modal.classList.remove('hidden');
    overlay.classList.add('active');
}
window.openTeacherQuickActionModal = openTeacherQuickActionModal;

function closeTeacherQuickActionModal() {
    const modal = document.getElementById('teacher-quick-action-modal');
    const overlay = document.getElementById('teacher-quick-action-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    pendingQuickActionTeacher = null;
}
window.closeTeacherQuickActionModal = closeTeacherQuickActionModal;

// --- RESET BUTTON HISTORY PURGE SHORTCUT CONTEXT POPOVER ---
function openResetContextMenu(anchorEl, clientX, clientY) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 50]); } catch (_) {}
    }
    const popover = document.getElementById('reset-context-popover');
    const overlay = document.getElementById('reset-context-overlay');
    if (!popover || !overlay) return;

    popover.classList.remove('hidden');
    overlay.classList.remove('hidden');

    if (anchorEl && anchorEl.getBoundingClientRect) {
        const rect = anchorEl.getBoundingClientRect();
        let top = rect.bottom + 6;
        let left = rect.left + (rect.width / 2) - 110;
        if (left < 10) left = 10;
        if (left + 230 > window.innerWidth) left = window.innerWidth - 235;
        if (top + 130 > window.innerHeight) top = rect.top - 120;
        popover.style.top = `${Math.max(10, Math.round(top))}px`;
        popover.style.left = `${Math.max(10, Math.round(left))}px`;
    } else if (clientX !== undefined && clientY !== undefined) {
        let top = clientY + 6;
        let left = clientX - 100;
        if (left < 10) left = 10;
        if (left + 230 > window.innerWidth) left = window.innerWidth - 235;
        if (top + 130 > window.innerHeight) top = clientY - 120;
        popover.style.top = `${Math.max(10, Math.round(top))}px`;
        popover.style.left = `${Math.max(10, Math.round(left))}px`;
    }

    const purgeBtn = document.getElementById('ctx-btn-purge-history');
    if (purgeBtn) {
        purgeBtn.onclick = (e) => {
            e.stopPropagation();
            closeResetContextMenu();
            confirmPurgeActionHistory();
        };
    }
}
window.openResetContextMenu = openResetContextMenu;
window.openHistoryPurgeModal = openResetContextMenu;

function closeResetContextMenu() {
    const popover = document.getElementById('reset-context-popover');
    const overlay = document.getElementById('reset-context-overlay');
    if (popover) popover.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
}
window.closeResetContextMenu = closeResetContextMenu;
window.closeHistoryPurgeModal = closeResetContextMenu;

function confirmPurgeActionHistory() {
    state.actionHistory = { grid: [], subs: [], redoGrid: [], redoSubs: [] };
    saveStateToStorage();
    updateUndoUI();
    closeResetContextMenu();
    showToast('🗑 Action history buffer wiped clean.');
}
window.confirmPurgeActionHistory = confirmPurgeActionHistory;

function bindResetButtonLongPress(el) {
    if (!el) return;
    let touchTimer = null;
    let isLongPress = false;

    el.addEventListener('touchstart', (e) => {
        isLongPress = false;
        const touch = e.touches[0];
        const cx = touch ? touch.clientX : undefined;
        const cy = touch ? touch.clientY : undefined;
        touchTimer = setTimeout(() => {
            isLongPress = true;
            openResetContextMenu(el, cx, cy);
        }, 500);
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        if (touchTimer) clearTimeout(touchTimer);
        if (isLongPress) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    });

    el.addEventListener('touchmove', () => {
        if (touchTimer) clearTimeout(touchTimer);
    });

    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openResetContextMenu(el, e.clientX, e.clientY);
    });
}

let currentSubAvailTeacher = null;
let currentSubAvailView = 'single'; // 'single' or 'all'

function openSubAvailModal(teacherToSelect = null, viewMode = null) {
    const modal = document.getElementById('sub-avail-modal');
    const overlay = document.getElementById('sub-avail-overlay');
    if (!modal || !overlay) return;

    if (teacherToSelect) {
        currentSubAvailTeacher = teacherToSelect;
        currentSubAvailView = viewMode || 'single';
    } else {
        currentSubAvailView = viewMode || 'all';
        if (!currentSubAvailTeacher || !teachers.includes(currentSubAvailTeacher)) {
            currentSubAvailTeacher = teachers[0];
        }
    }

    renderSubAvailUI();
    modal.classList.remove('hidden');
    overlay.classList.add('active');
}

function closeSubAvailModal() {
    const modal = document.getElementById('sub-avail-modal');
    const overlay = document.getElementById('sub-avail-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}

function switchSubAvailView(view) {
    currentSubAvailView = view;
    renderSubAvailUI();
}

function renderSubAvailUI() {
    const day = state.day;
    const dayUnavail = state.subUnavailable?.[day] || {};
    const unavailCount = Object.keys(dayUnavail).length;

    // View mode containers
    const singleView = document.getElementById('sub-avail-single-view');
    const allView = document.getElementById('sub-avail-all-view');
    const tabSingle = document.getElementById('sub-avail-tab-single');
    const tabAll = document.getElementById('sub-avail-tab-all');
    const rosterCountEl = document.getElementById('sub-avail-roster-count');
    const toggleLink = document.getElementById('sub-avail-toggle-view-link');

    if (rosterCountEl) rosterCountEl.textContent = unavailCount;

    if (currentSubAvailView === 'all') {
        if (singleView) singleView.classList.add('hidden');
        if (allView) allView.classList.remove('hidden');
        if (tabSingle) {
            tabSingle.classList.remove('active');
            tabSingle.style.background = 'transparent';
            tabSingle.style.color = 'var(--text-secondary)';
        }
        if (tabAll) {
            tabAll.classList.add('active');
            tabAll.style.background = 'var(--surface-color)';
            tabAll.style.color = 'var(--text-primary)';
        }
        if (toggleLink) toggleLink.textContent = `⚡ Quick Action (${currentSubAvailTeacher || 'Teacher'})`;
        renderSubAvailRosterList();
    } else {
        if (singleView) singleView.classList.remove('hidden');
        if (allView) allView.classList.add('hidden');
        if (tabSingle) {
            tabSingle.classList.add('active');
            tabSingle.style.background = 'var(--surface-color)';
            tabSingle.style.color = 'var(--text-primary)';
        }
        if (tabAll) {
            tabAll.classList.remove('active');
            tabAll.style.background = 'transparent';
            tabAll.style.color = 'var(--text-secondary)';
        }
        if (toggleLink) toggleLink.textContent = `📋 View All Staff (${teachers.length})`;
        renderSubAvailSingleTeacher();
    }
}

function renderSubAvailSingleTeacher() {
    const teacher = currentSubAvailTeacher || teachers[0];
    const day = state.day;
    const isUnavail = isTeacherSubUnavailable(teacher, day);
    const remark = getTeacherSubUnavailableRemark(teacher, day);
    const staff = staffDirectory[teacher] || {};

    const nameEl = document.getElementById('sub-avail-teacher-name');
    const roleEl = document.getElementById('sub-avail-teacher-role');
    const statusPill = document.getElementById('sub-avail-status-pill');
    const statusIcon = document.getElementById('sub-avail-status-icon');
    const statusText = document.getElementById('sub-avail-status-text');
    const mainBtn = document.getElementById('sub-avail-main-action-btn');
    const actionIcon = document.getElementById('sub-avail-action-icon');
    const actionLabel = document.getElementById('sub-avail-action-label');
    const customInput = document.getElementById('sub-avail-custom-input');

    if (nameEl) nameEl.textContent = teacher;
    if (roleEl) roleEl.textContent = `${staff.role || 'Teacher'} ${staff.assignedClass ? '• ' + staff.assignedClass : ''}`;

    if (isUnavail) {
        if (statusPill) {
            statusPill.className = 'sub-avail-status-pill unavailable';
        }
        if (statusIcon) statusIcon.textContent = '⛔';
        if (statusText) statusText.textContent = `Unavailable: ${remark || 'Duty'}`;

        if (mainBtn) {
            mainBtn.className = 'sub-avail-big-action-btn mark-avail';
        }
        if (actionIcon) actionIcon.textContent = '✓';
        if (actionLabel) actionLabel.textContent = 'Set Back to Available';
    } else {
        if (statusPill) {
            statusPill.className = 'sub-avail-status-pill available';
        }
        if (statusIcon) statusIcon.textContent = '🟢';
        if (statusText) statusText.textContent = 'Available for Substitution';

        if (mainBtn) {
            mainBtn.className = 'sub-avail-big-action-btn mark-unavail';
        }
        if (actionIcon) actionIcon.textContent = '⛔';
        if (actionLabel) actionLabel.textContent = 'Mark Unavailable Today';
    }

    if (customInput) customInput.value = isUnavail ? remark : '';
}

function renderSubAvailRosterList() {
    const listContainer = document.getElementById('sub-avail-all-roster-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const day = state.day;

    teachers.forEach(t => {
        const staff = staffDirectory[t] || {};
        const isUnavail = isTeacherSubUnavailable(t, day);
        const remark = getTeacherSubUnavailableRemark(t, day);

        const row = document.createElement('div');
        row.className = 'sub-avail-roster-row';

        const leftDiv = document.createElement('div');
        leftDiv.className = 'sub-roster-left';
        leftDiv.innerHTML = `
            <div>
                <div class="sub-roster-name">${t}</div>
                <div class="sub-roster-role">${staff.role || 'Teacher'} ${staff.assignedClass ? '• ' + staff.assignedClass : ''}</div>
            </div>
        `;
        leftDiv.addEventListener('click', () => {
            currentSubAvailTeacher = t;
            switchSubAvailView('single');
        });

        const rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.alignItems = 'center';
        rightDiv.style.gap = '6px';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = `sub-roster-toggle-btn ${isUnavail ? 'is-unavail' : 'is-avail'}`;
        toggleBtn.textContent = isUnavail ? `⛔ ${remark || 'Unavailable'}` : '✓ Available';
        toggleBtn.title = isUnavail ? 'Click to make Available' : 'Click to make Unavailable';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isUnavail) {
                setTeacherSubUnavailable(t, false, '', day);
                showToast(`✓ ${t} is now available for substitution`);
            } else {
                setTeacherSubUnavailable(t, true, 'Unavailable', day);
                showToast(`⛔ Marked ${t} unavailable for substitution`);
            }
            if (navigator.vibrate) try { navigator.vibrate(35); } catch (_) {}
            renderSubAvailUI();
        });

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-text-only';
        editBtn.style.fontSize = '13px';
        editBtn.style.padding = '3px 6px';
        editBtn.style.color = 'var(--text-secondary)';
        editBtn.style.cursor = 'pointer';
        editBtn.title = 'Customize Reason';
        editBtn.textContent = '✏';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentSubAvailTeacher = t;
            switchSubAvailView('single');
        });

        rightDiv.appendChild(toggleBtn);
        rightDiv.appendChild(editBtn);

        row.appendChild(leftDiv);
        row.appendChild(rightDiv);
        listContainer.appendChild(row);
    });
}

function handleSubAvailMainAction() {
    const teacher = currentSubAvailTeacher;
    if (!teacher) return;
    const day = state.day;
    const isUnavail = isTeacherSubUnavailable(teacher, day);

    if (isUnavail) {
        setTeacherSubUnavailable(teacher, false, '', day);
        showToast(`✓ ${teacher} is now available for substitution`);
    } else {
        setTeacherSubUnavailable(teacher, true, 'Unavailable', day);
        showToast(`⛔ Marked ${teacher} unavailable for substitution`);
    }
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (_) {}
    closeSubAvailModal();
}

function handleSubAvailQuickDuty(remark) {
    const teacher = currentSubAvailTeacher;
    if (!teacher || !remark) return;
    const day = state.day;

    setTeacherSubUnavailable(teacher, true, remark, day);
    showToast(`⛔ ${teacher} unavailable: ${remark}`);
    if (navigator.vibrate) try { navigator.vibrate([40, 50, 40]); } catch (_) {}
    closeSubAvailModal();
}

function handleSubAvailCustomApply() {
    const teacher = currentSubAvailTeacher;
    if (!teacher) return;
    const input = document.getElementById('sub-avail-custom-input');
    const remark = input ? input.value.trim() : '';
    const day = state.day;

    setTeacherSubUnavailable(teacher, true, remark || 'Unavailable', day);
    showToast(`⛔ ${teacher} unavailable: ${remark || 'Unavailable'}`);
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (_) {}
    closeSubAvailModal();
}

function showSubRemarkPopover(teacher, remark, triggerEl) {
    const popover = document.getElementById('sub-remark-popover');
    const teacherEl = document.getElementById('popover-teacher-name');
    const remarkEl = document.getElementById('popover-remark-text');

    if (!popover || !teacherEl || !remarkEl) return;

    teacherEl.textContent = teacher || 'Teacher';
    const displayRemark = remark && remark.trim() !== '' ? remark.trim() : 'Marked unavailable for substitutions (no specific remark provided).';
    remarkEl.textContent = `“${displayRemark}”`;

    popover.classList.remove('hidden');

    // Position relative to trigger element
    if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        const popoverWidth = 260;
        const popoverHeight = 120;
        
        let left = rect.left + window.scrollX - (popoverWidth / 2) + (rect.width / 2);
        let top = rect.bottom + window.scrollY + 6;

        // Keep within viewport horizontally
        if (left + popoverWidth > window.innerWidth - 12) {
            left = window.innerWidth - popoverWidth - 12;
        }
        if (left < 12) {
            left = 12;
        }

        // If overflowing bottom, position above
        if (rect.bottom + popoverHeight > window.innerHeight) {
            top = rect.top + window.scrollY - popoverHeight - 6;
        }

        popover.style.left = `${Math.round(left)}px`;
        popover.style.top = `${Math.round(top)}px`;
    }
}

function hideSubRemarkPopover() {
    const popover = document.getElementById('sub-remark-popover');
    if (popover) popover.classList.add('hidden');
}

// --- ABSENCE TRAY SLEEK COMPACT CONTEXT MENU (JOB BUNDLE 6) ---
let currentAbsenceCtxTeacher = null;

function openAbsenceContextMenu(teacher, anchorEl, clientX, clientY) {
    currentAbsenceCtxTeacher = teacher;
    const popover = document.getElementById('absence-context-popover');
    const overlay = document.getElementById('absence-context-overlay');
    if (!popover || !overlay) return;

    const isUnavail = isTeacherSubUnavailable(teacher, state.day);
    const staff = staffDirectory[teacher];
    const ctSec = classTeacherMap[teacher];
    const isCT = !!ctSec;
    const roleLabel = isCT ? `Class Teacher (${ctSec})` : (staff?.role || 'Teacher');

    popover.innerHTML = `
        <div class="ctx-teacher-header">
            <div>
                <div class="ctx-teacher-name">${escapeHtml(teacher)}</div>
                <div class="ctx-teacher-status">${roleLabel} • ${isUnavail ? '⛔ Unavailable' : '🟢 Available'}</div>
            </div>
        </div>
        ${isUnavail ? `
            <button type="button" class="ctx-action-btn avail-toggle" id="ctx-btn-toggle-avail">
                <span>🟢</span>
                <span>Mark Available Today</span>
            </button>
        ` : `
            <button type="button" class="ctx-action-btn unavail-toggle" id="ctx-btn-toggle-avail">
                <span>⛔</span>
                <span>Mark Unavailable Today</span>
            </button>
        `}
        <button type="button" class="ctx-more-link" id="ctx-btn-more-options">More duty options & remarks...</button>
    `;

    popover.classList.remove('hidden');
    overlay.classList.remove('hidden');

    if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        let top = rect.bottom + 6;
        let left = rect.left + (rect.width / 2) - 110;
        if (left < 10) left = 10;
        if (left + 230 > window.innerWidth) left = window.innerWidth - 235;
        if (top + 130 > window.innerHeight) top = rect.top - 120;
        popover.style.top = `${Math.max(10, Math.round(top))}px`;
        popover.style.left = `${Math.max(10, Math.round(left))}px`;
    } else if (clientX !== undefined && clientY !== undefined) {
        let top = clientY + 6;
        let left = clientX - 100;
        if (left < 10) left = 10;
        if (left + 230 > window.innerWidth) left = window.innerWidth - 235;
        if (top + 130 > window.innerHeight) top = clientY - 120;
        popover.style.top = `${Math.max(10, Math.round(top))}px`;
        popover.style.left = `${Math.max(10, Math.round(left))}px`;
    }

    const toggleBtn = document.getElementById('ctx-btn-toggle-avail');
    if (toggleBtn) {
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            if (isUnavail) {
                setTeacherSubUnavailable(teacher, false, '', state.day);
                showToast(`✓ ${teacher} available`);
            } else {
                setTeacherSubUnavailable(teacher, true, 'Unavailable', state.day);
                showToast(`⛔ ${teacher} unavailable`);
            }
            if (navigator.vibrate) try { navigator.vibrate(40); } catch (_) {}
            closeAbsenceContextMenu();
            renderAll();
        };
    }

    const moreBtn = document.getElementById('ctx-btn-more-options');
    if (moreBtn) {
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            closeAbsenceContextMenu();
            openSubAvailModal(teacher);
        };
    }
}

function closeAbsenceContextMenu() {
    currentAbsenceCtxTeacher = null;
    const popover = document.getElementById('absence-context-popover');
    const overlay = document.getElementById('absence-context-overlay');
    if (popover) popover.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
}

window.openAbsenceContextMenu = openAbsenceContextMenu;
window.closeAbsenceContextMenu = closeAbsenceContextMenu;

window.isTeacherSubUnavailable = isTeacherSubUnavailable;
window.getTeacherSubUnavailableRemark = getTeacherSubUnavailableRemark;
window.setTeacherSubUnavailable = setTeacherSubUnavailable;
window.openSubAvailModal = openSubAvailModal;
window.closeSubAvailModal = closeSubAvailModal;
window.showSubRemarkPopover = showSubRemarkPopover;
window.hideSubRemarkPopover = hideSubRemarkPopover;

// --- CO-TEACHING COOPERATION ENGINE ---
function getCoTeachingPartners(day, period, teacher) {
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher];
    if (!baseTask || baseTask === 'Free' || baseTask === '-' || baseTask === '') return [];
    
    const partners = [];
    const bClean = baseTask.trim().toUpperCase();
    teachers.forEach(otherT => {
        if (otherT !== teacher) {
            const otherBase = state.baseSchedule[day]?.[period]?.[otherT];
            if (!otherBase || otherBase === 'Free' || otherBase === '-') return;
            const oClean = otherBase.trim().toUpperCase();
            if (oClean === bClean) {
                partners.push(otherT);
            } else {
                // Support joint multi-class co-teaching (e.g. "GAMES KG A + KG B" with "GAMES KG A", or "1ST DRILL PREP A" with "DRILL PREP A + PREP B")
                const bNorm = bClean.replace(/^(1ST|2ND|3RD|4TH)\s+/i, '');
                const oNorm = oClean.replace(/^(1ST|2ND|3RD|4TH)\s+/i, '');
                const bPrefix = bNorm.split(' ')[0];
                const oPrefix = oNorm.split(' ')[0];
                if (bPrefix === oPrefix && (bClean.includes('+') || oClean.includes('+'))) {
                    const bSecs = extractClassSections(bClean);
                    const oSecs = extractClassSections(oClean);
                    if (bSecs.some(s => oSecs.includes(s))) {
                        partners.push(otherT);
                    }
                }
            }
        }
    });
    return partners;
}

function isActivelyCoTeaching(day, period, teacher) {
    const partners = getCoTeachingPartners(day, period, teacher);
    if (partners.length === 0) return false;
    
    const currentTask = state.schedule[day]?.[period]?.[teacher];
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher];
    if (!currentTask || currentTask !== baseTask) return false;

    // Check if at least one partner is also still currently teaching the baseTask and present
    return partners.some(partner => {
        const partnerCurrentTask = state.schedule[day]?.[period]?.[partner];
        return partnerCurrentTask === baseTask && !state.absentTeachers.has(partner);
    });
}

function getTeacherCoveringFor(t, period, day = state.day) {
    const daySubs = state.substitutions[day]?.[period];
    if (daySubs) {
        for (const [absT, subT] of Object.entries(daySubs)) {
            if (subT === t && state.absentTeachers.has(absT)) return absT;
        }
    }
    const matchAction = [...(state.actionHistory?.grid || [])].reverse().find(a => 
        (a.type === 'sub' && a.day === day && a.subTeacher === t && (a.targetPeriod || a.period) === period && state.absentTeachers.has(a.absentTeacher))
    );
    if (matchAction) return matchAction.absentTeacher;
    return null;
}

function areTeachersCoTeachingPartners(day, period, t1, t2) {
    if (t1 === t2) return true;
    const origin1 = getTeacherCoveringFor(t1, period, day) || t1;
    const origin2 = getTeacherCoveringFor(t2, period, day) || t2;
    if (origin1 === origin2) return true;

    const p1 = getCoTeachingPartners(day, period, origin1);
    if (p1.includes(origin2)) return true;

    const p2 = getCoTeachingPartners(day, period, origin2);
    if (p2.includes(origin1)) return true;

    return false;
}
window.getTeacherCoveringFor = getTeacherCoveringFor;
window.areTeachersCoTeachingPartners = areTeachersCoTeachingPartners;

// --- FIT-GRID VIEW (MOBILE LANDSCAPE & FULL-SCREEN FIT) ---
function syncDayButtonsUI() {
    document.querySelectorAll('.day-btn, .fit-day-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.day === state.day);
    });
    const pill = document.getElementById('fit-bar-day-pill');
    if (pill) pill.textContent = state.day;
}
window.syncDayButtonsUI = syncDayButtonsUI;

function toggleFitGridMode(enable) {
    isFitGridMode = (typeof enable === 'boolean') ? enable : !isFitGridMode;
    document.body.classList.toggle('fit-grid-mode', isFitGridMode);
    const stickyBar = document.getElementById('fit-grid-sticky-bar');
    if (stickyBar) {
        stickyBar.classList.toggle('hidden', !isFitGridMode);
    }
    syncDayButtonsUI();
    if (isFitGridMode) {
        const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 650;
        if (isPortrait) {
            showToast('Scaled to Viewport (Landscape suggested)');
        } else {
            showToast('Scaled to Viewport');
        }
        if (navigator.vibrate) try { navigator.vibrate(35); } catch (_) {}
    } else {
        showToast('Natural grid layout restored');
    }
}
window.toggleFitGridMode = toggleFitGridMode;

function openCoTeachingModal(period, teacher) {
    const modal = document.getElementById('co-teach-modal');
    const overlay = document.getElementById('co-teach-overlay');
    const body = document.getElementById('co-teach-modal-body');
    if (!modal || !overlay || !body) return;

    const partners = getCoTeachingPartners(state.day, period, teacher);
    const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
    const allCoTeachers = [teacher, ...partners];

    // Briefly highlight partner cell(s)
    partners.forEach(partner => {
        const partnerCell = document.querySelector(`td[data-period="${period}"][data-teacher="${partner}"]`);
        if (partnerCell) {
            partnerCell.classList.remove('cell-partner-highlight');
            void partnerCell.offsetWidth;
            partnerCell.classList.add('cell-partner-highlight');
            setTimeout(() => { partnerCell.classList.remove('cell-partner-highlight'); }, 1600);
        }
    });

    const rowsHtml = allCoTeachers.map(t => {
        const tTask = state.schedule[state.day]?.[period]?.[t] || 'Free';
        const tIsAbsent = state.absentTeachers.has(t);
        const tIsFree = (tTask === 'Free');
        const tIsActive = isActivelyCoTeaching(state.day, period, t);

        let statusColor = 'var(--accent-green)';
        let statusLabel = tIsActive ? 'Active Co-Teacher' : 'Teaching Solo';
        if (tIsAbsent) {
            statusColor = 'var(--accent-pink)';
            statusLabel = 'Absent Today';
        } else if (tIsFree) {
            statusColor = 'var(--accent-orange)';
            statusLabel = 'Released (Free)';
        } else if (tTask !== baseTask) {
            statusColor = 'var(--accent-blue)';
            statusLabel = `Assigned to ${tTask}`;
        }

        let inlineActions = '';
        if (tIsAbsent) {
            inlineActions = `<span style="font-size:11px; color:var(--accent-pink); font-weight:600;">Absent</span>`;
        } else if (tIsFree) {
            inlineActions = `
                <button class="btn-inline-rejoin" onclick="rejoinCoTeacher('${period}', '${t}')">
                    ↩ Rejoin
                </button>
            `;
        } else {
            inlineActions = `
                <button class="btn-inline-release" onclick="releaseTeacher('${period}', '${t}', 'period')" title="Release ${t} for ${period}">
                    Release
                </button>
                <button class="btn-inline-release-day" onclick="releaseTeacher('${period}', '${t}', 'day')" title="Make ${t} Free for the entire day">
                    Free Day
                </button>
            `;
        }

        return `
            <div class="co-teacher-row">
                <div class="co-teacher-info">
                    <div style="width:9px; height:9px; border-radius:50%; background:${statusColor}; flex-shrink:0;"></div>
                    <div class="co-teacher-meta">
                        <strong style="font-size:14px; color:var(--text-primary);">${t}</strong>
                        <span style="font-size:11px; color:var(--text-secondary); font-weight:500;">${statusLabel}</span>
                    </div>
                </div>
                <div class="co-inline-actions">
                    ${inlineActions}
                </div>
            </div>
        `;
    }).join('');

    body.innerHTML = `
        <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:12px; padding:14px 16px; margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:16px; color:var(--text-primary); font-weight:700;">${baseTask}</strong>
                <span style="font-size:12px; font-weight:600; color:var(--accent-blue); background:rgba(0,122,255,0.12); padding:2px 8px; border-radius:12px;">${period}</span>
            </div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${state.day} • Shared Co-Teaching Slot</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
            ${rowsHtml}
        </div>

        <div style="font-size:12px; color:var(--text-secondary); line-height:1.45;">
            Use the inline <b>Release</b> button beside any teacher's name to free them for this period or the whole day while their partner covers the class solo.
        </div>
    `;

    modal.classList.remove('hidden');
    overlay.classList.add('active');
}
window.openCoTeachingModal = openCoTeachingModal;

function closeCoTeachingModal() {
    const modal = document.getElementById('co-teach-modal');
    const overlay = document.getElementById('co-teach-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.closeCoTeachingModal = closeCoTeachingModal;

function releaseTeacher(period, teacher, scope = 'period') {
    closeCoTeachingModal();
    clearRedoStacks();
    const day = state.day;
    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);

    if (scope === 'period') {
        const prevTask = state.schedule[day][period][teacher];
        state.schedule[day][period][teacher] = 'Free';
        const action = {
            id: actionId,
            type: 'co-teach-release',
            scope: 'period',
            day,
            period,
            teacher,
            prevTask
        };
        state.actionHistory.grid.push(action);
        showToast(`${teacher} freed (${period})`);
    } else if (scope === 'day') {
        const savedTasks = [];
        periods.forEach(p => {
            const task = state.schedule[day]?.[p]?.[teacher];
            if (task && task !== 'Free' && task !== '-') {
                savedTasks.push({ period: p, task });
                state.schedule[day][p][teacher] = 'Free';
            }
        });
        const action = {
            id: actionId,
            type: 'co-teach-release',
            scope: 'day',
            day,
            teacher,
            savedTasks
        };
        state.actionHistory.grid.push(action);
        showToast(`${teacher} freed (${day})`);
    }

    saveStateToStorage();
    updateUndoUI();
    renderAll();
}
window.releaseTeacher = releaseTeacher;

function rejoinCoTeacher(period, teacher) {
    closeCoTeachingModal();
    clearRedoStacks();
    const day = state.day;
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher] || 'Free';
    const prevTask = state.schedule[day][period][teacher];
    state.schedule[day][period][teacher] = baseTask;

    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    state.actionHistory.grid.push({
        id: actionId,
        type: 'cell-reset',
        day,
        period,
        teacher,
        prevTask,
        baseTask
    });

    triggerCellResetAnimation(period, teacher);
    saveStateToStorage();
    updateUndoUI();
    showToast(`${teacher} restored to co-teach`);
    renderAll();
}
window.rejoinCoTeacher = rejoinCoTeacher;

function handleCoTeachingClick(period, teacher, event) {
    if (event && event.altKey) {
        return resetCellToOriginalState(period, teacher);
    }
    if (state.isEditMode) {
        handleGridInteraction(period, teacher);
        return;
    }
    const partners = getCoTeachingPartners(state.day, period, teacher);
    if (partners.length > 0) {
        openCoTeachingModal(period, teacher);
    }
}
window.handleCoTeachingClick = handleCoTeachingClick;

// Option+Click element reset functions
function triggerCellResetAnimation(period, teacher) {
    if (!period || !teacher) return;
    if (!lastResetCells) lastResetCells = [];
    if (!lastResetCells.some(c => c.period === period && c.teacher === teacher)) {
        lastResetCells.push({ period, teacher });
    }
    setTimeout(() => {
        if (lastResetCells) {
            lastResetCells = lastResetCells.filter(c => !(c.period === period && c.teacher === teacher));
        }
    }, 600);
}

function resetCellToOriginalState(period, teacher) {
    clearRedoStacks();
    const day = state.day;

    // Check 1: Is this teacher substituting for someone in this period?
    let coveringFor = null;
    let coveringSourcePeriod = null;
    const daySubs = state.substitutions[day];
    if (daySubs) {
        for (const [sPeriod, subMap] of Object.entries(daySubs)) {
            for (const [absT, subT] of Object.entries(subMap)) {
                if (subT === teacher) {
                    const matchAction = [...state.actionHistory.grid].reverse().find(a => 
                        (a.type === 'sub' && a.day === day && a.subTeacher === teacher && a.absentTeacher === absT)
                    );
                    const activeTargetPeriod = matchAction ? (matchAction.targetPeriod || matchAction.period) : sPeriod;
                    if (activeTargetPeriod === period) {
                        coveringFor = absT;
                        coveringSourcePeriod = sPeriod;
                        break;
                    }
                }
            }
            if (coveringFor) break;
        }
    }

    if (coveringFor) {
        const srcP = coveringSourcePeriod || period;
        const stObj = getSubStatusObj(day, srcP, coveringFor);
        if (state.settings?.acceptanceTimerEnabled && stObj.status === 'accepted' && !hasCoordinatorPermissions()) {
            showToast('Locked by acceptance', true);
            return;
        }
        triggerCellResetAnimation(period, teacher);
        triggerCellResetAnimation(srcP, coveringFor);
        unassignSubstitute(srcP, coveringFor);
        showToast(`Reverted: ${teacher} freed`);
        return;
    }

    // Check 2: Does this teacher have a substitute covering for them in this period?
    const assignedSub = state.substitutions[day]?.[period]?.[teacher];
    if (assignedSub) {
        const stObj = getSubStatusObj(day, period, teacher);
        if (state.settings?.acceptanceTimerEnabled && stObj.status === 'accepted' && !hasCoordinatorPermissions()) {
            showToast('Locked by acceptance', true);
            return;
        }
        triggerCellResetAnimation(period, teacher);
        triggerCellResetAnimation(period, assignedSub);
        unassignSubstitute(period, teacher);
        showToast(`Reverted: returned from ${assignedSub}`);
        return;
    }

    // Check 3: Current task differs from baseline task in baseSchedule, OR cell was source of a moved task
    const currentTask = state.schedule[day]?.[period]?.[teacher];
    const baseTask = state.baseSchedule[day]?.[period]?.[teacher] || 'Free';

    // 3A: If currentTask !== 'Free', check if this task was moved here from somewhere else
    if (currentTask !== 'Free' && currentTask !== baseTask) {
        // Look through grid action history in reverse to see if this task was moved to (period, teacher)
        const moveAction = [...state.actionHistory.grid].reverse().find(a => 
            a.type === 'move' && 
            a.day === day && 
            a.target && 
            a.target.period === period && 
            a.target.teacher === teacher && 
            a.sTask === currentTask
        );

        if (moveAction) {
            const { source, tTask, newlyDisplaced } = moveAction;
            // 1. Restore target cell to its task before the move
            state.schedule[day][period][teacher] = tTask;

            // 2. Return sTask back to its source
            if (source.type === 'grid') {
                state.schedule[day][source.period][source.teacher] = currentTask;
                triggerCellResetAnimation(source.period, source.teacher);
            } else if (source.type === 'displaced') {
                state.displaced[day].push(source.item);
            }

            // 3. If target displaced something, remove that displaced item
            if (newlyDisplaced) {
                state.displaced[day] = (state.displaced[day] || []).filter(d => d.id !== newlyDisplaced.id);
            }

            // Record undo action
            const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            state.actionHistory.grid.push({
                id: actionId,
                type: 'cell-reset-move',
                day,
                targetPeriod: period,
                targetTeacher: teacher,
                source,
                movedTask: currentTask,
                restoredTargetTask: tTask,
                newlyDisplaced
            });

            triggerCellResetAnimation(period, teacher);
            saveStateToStorage();
            updateUndoUI();
            if (source.type === 'grid') {
                showToast(`Returned ${currentTask}`);
            } else {
                showToast('Returned to Limbo');
            }
            renderAll();
            return;
        }

        // Also check if currentTask has a baseline origin elsewhere in the grid that is currently Free
        let foundOrigin = null;
        if (state.baseSchedule[day]) {
            for (const p of periods) {
                for (const t of teachers) {
                    if (state.baseSchedule[day][p]?.[t] === currentTask && (p !== period || t !== teacher)) {
                        if (state.schedule[day]?.[p]?.[t] === 'Free') {
                            foundOrigin = { period: p, teacher: t };
                            break;
                        }
                    }
                }
                if (foundOrigin) break;
            }
        }

        if (foundOrigin) {
            // Restore origin cell and set current cell to baseTask
            state.schedule[day][foundOrigin.period][foundOrigin.teacher] = currentTask;
            state.schedule[day][period][teacher] = baseTask;
            triggerCellResetAnimation(foundOrigin.period, foundOrigin.teacher);
            triggerCellResetAnimation(period, teacher);

            const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            state.actionHistory.grid.push({
                id: actionId,
                type: 'cell-reset-return-origin',
                day,
                fromPeriod: period,
                fromTeacher: teacher,
                toPeriod: foundOrigin.period,
                toTeacher: foundOrigin.teacher,
                task: currentTask,
                targetBaseTask: baseTask
            });

            saveStateToStorage();
            updateUndoUI();
            showToast(`Returned ${currentTask}`);
            renderAll();
            return;
        }
    }

    // 3B: If this cell's baseline task was moved away to another cell and this cell is Free/different
    if (baseTask !== 'Free' && currentTask !== baseTask) {
        // Find where baseTask is currently located in schedule
        let currentLocation = null;
        for (const p of state.periods) {
            for (const t of state.teachers) {
                if (state.schedule[day]?.[p]?.[t] === baseTask && (p !== period || t !== teacher)) {
                    currentLocation = { period: p, teacher: t };
                    break;
                }
            }
            if (currentLocation) break;
        }

        if (currentLocation) {
            const locBaseTask = state.baseSchedule[day]?.[currentLocation.period]?.[currentLocation.teacher] || 'Free';
            state.schedule[day][currentLocation.period][currentLocation.teacher] = locBaseTask;
            state.schedule[day][period][teacher] = baseTask;

            triggerCellResetAnimation(currentLocation.period, currentLocation.teacher);
            triggerCellResetAnimation(period, teacher);

            const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            state.actionHistory.grid.push({
                id: actionId,
                type: 'cell-reset-recall',
                day,
                period,
                teacher,
                recalledTask: baseTask,
                fromPeriod: currentLocation.period,
                fromTeacher: currentLocation.teacher,
                fromPreviousTask: baseTask,
                fromRestoredTask: locBaseTask
            });

            saveStateToStorage();
            updateUndoUI();
            showToast(`Recalled ${baseTask} to ${teacher}`);
            renderAll();
            return;
        }
    }

    // 3C: Standard fallback reset if currentTask !== baseTask
    if (currentTask !== baseTask) {
        state.displaced[day] = (state.displaced[day] || []).filter(d => !(d.period === period && d.ogTeacher === teacher));
        state.schedule[day][period][teacher] = baseTask;

        const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        state.actionHistory.grid.push({
            id: actionId,
            type: 'cell-reset',
            day,
            period,
            teacher,
            prevTask: currentTask,
            baseTask
        });

        triggerCellResetAnimation(period, teacher);
        saveStateToStorage();
        updateUndoUI();
        showToast('Reset to baseline');
        renderAll();
        return;
    }

    // Even if already at baseline, provide tactile bounce feedback on Option-click
    triggerCellResetAnimation(period, teacher);
    renderAll();
    showToast('Already at baseline');
}
window.resetCellToOriginalState = resetCellToOriginalState;

function resetDisplacedItemToOriginal(itemId) {
    clearRedoStacks();
    const day = state.day;
    const item = (state.displaced[day] || []).find(d => d.id === itemId);
    if (!item) return;

    state.schedule[day][item.period][item.ogTeacher] = item.task;
    state.displaced[day] = state.displaced[day].filter(d => d.id !== itemId);

    triggerCellResetAnimation(item.period, item.ogTeacher);
    saveStateToStorage();
    updateUndoUI();
    showToast(`Sent ${item.task} back to ${item.ogTeacher} (${item.period}).`);
    renderAll();
}
window.resetDisplacedItemToOriginal = resetDisplacedItemToOriginal;

// ==========================================================================
// MASTER ROUTINE BASELINE EDITOR & 4-DIGIT PIN PASSCODE ENGINE (APPLE HIG)
// ==========================================================================

let enteredPin = '';
let pinSuccessCallback = null;
let pinModalMode = 'verify'; // 'verify' or 'capture'
let activeMasterCell = null; // { period, teacher, day }
let stagedMasterSchedule = null; // In-memory working copy while in master edit mode

function updateMasterLockUI() {
    const lockBtn = document.getElementById('master-lock-btn');
    const lockIcon = document.getElementById('master-lock-icon');
    const editBtnLabel = document.getElementById('edit-btn-label');
    const editBtnIcon = document.getElementById('edit-btn-icon');
    const editBtn = document.getElementById('edit-toggle-btn');

    // 3-Dot popover items
    const moreEditText = document.getElementById('more-item-edit-text');
    const moreEditIcon = document.getElementById('more-item-edit-icon');
    const moreLockStatus = document.getElementById('more-lock-status');

    // Fit-grid sticky bar items
    const fitGridEditBtn = document.getElementById('fit-grid-edit-btn');
    const fitGridEditIcon = document.getElementById('fit-grid-edit-icon');
    const fitGridEditLabel = document.getElementById('fit-grid-edit-label');

    if (lockBtn && lockIcon) {
        if (state.isMasterUnlocked) {
            lockBtn.classList.add('unlocked');
            lockIcon.textContent = '🔓';
            lockBtn.title = 'Master Baseline Unlocked (Click to lock or switch modes)';
        } else {
            lockBtn.classList.remove('unlocked');
            lockIcon.textContent = '🔒';
            lockBtn.title = 'Master Baseline Locked (Click to enter PIN & edit master routine)';
        }
    }

    if (state.isMasterEditMode) {
        // Main Edit Button
        if (editBtn) {
            editBtn.classList.remove('save-mode');
            editBtn.classList.add('master-save-mode');
            editBtn.style.background = '';
        }
        if (editBtnLabel) editBtnLabel.textContent = ' 🛠 Master Save';
        if (editBtnIcon) editBtnIcon.textContent = '🛠';

        // 3-Dot Overflow Menu
        if (moreEditText) moreEditText.textContent = 'Save Master Routine';
        if (moreEditIcon) moreEditIcon.textContent = '🛠';
        if (moreLockStatus) {
            moreLockStatus.textContent = '🛠 Master Editing';
            moreLockStatus.className = 'more-badge badge-master-editing';
        }

        // Fit Grid Sticky Bar Button
        if (fitGridEditBtn) {
            fitGridEditBtn.className = 'btn-fit-edit active-master';
        }
        if (fitGridEditIcon) fitGridEditIcon.textContent = '🛠';
        if (fitGridEditLabel) fitGridEditLabel.textContent = 'Save Master';

    } else if (state.isEditMode) {
        // Main Edit Button
        if (editBtn) {
            editBtn.classList.remove('master-save-mode');
            editBtn.classList.add('save-mode');
            editBtn.style.background = '';
        }
        if (editBtnLabel) editBtnLabel.textContent = ' ✓ Done Editing';
        if (editBtnIcon) editBtnIcon.textContent = '✓';

        // 3-Dot Overflow Menu
        if (moreEditText) moreEditText.textContent = 'Done Editing (Save)';
        if (moreEditIcon) moreEditIcon.textContent = '✓';
        if (moreLockStatus) {
            moreLockStatus.textContent = '● In Edit Mode';
            moreLockStatus.className = 'more-badge badge-active-editing';
        }

        // Fit Grid Sticky Bar Button
        if (fitGridEditBtn) {
            fitGridEditBtn.className = 'btn-fit-edit active-editing';
        }
        if (fitGridEditIcon) fitGridEditIcon.textContent = '✓';
        if (fitGridEditLabel) fitGridEditLabel.textContent = 'Done Editing';

    } else {
        // Main Edit Button
        if (editBtn) {
            editBtn.classList.remove('save-mode', 'master-save-mode');
            editBtn.style.background = '';
        }
        if (editBtnLabel) editBtnLabel.textContent = ' Edit Schedule';
        if (editBtnIcon) editBtnIcon.textContent = '✎';

        // 3-Dot Overflow Menu
        if (moreEditText) moreEditText.textContent = 'Edit Schedule';
        if (moreEditIcon) moreEditIcon.textContent = '✎';
        if (moreLockStatus) {
            moreLockStatus.textContent = state.isMasterUnlocked ? '🔓 Unlocked' : '🔒 Locked';
            moreLockStatus.className = 'more-badge';
        }

        // Fit Grid Sticky Bar Button
        if (fitGridEditBtn) {
            fitGridEditBtn.className = 'btn-fit-edit';
        }
        if (fitGridEditIcon) fitGridEditIcon.textContent = '✎';
        if (fitGridEditLabel) fitGridEditLabel.textContent = 'Edit Schedule';
    }
}
window.updateMasterLockUI = updateMasterLockUI;

function openPinModal(title = 'Admin Passcode Required', subtext = 'Enter 4-digit PIN to unlock Master Routine editing.', onSuccess = null, mode = 'verify') {
    enteredPin = '';
    pinSuccessCallback = onSuccess;
    pinModalMode = mode;

    const modal = document.getElementById('pin-modal');
    const overlay = document.getElementById('pin-overlay');
    const titleEl = document.getElementById('pin-modal-title');
    const subtextEl = document.getElementById('pin-modal-subtext');
    const errEl = document.getElementById('pin-error-text');

    if (titleEl) titleEl.textContent = title;
    if (subtextEl) subtextEl.textContent = subtext;
    if (errEl) errEl.classList.add('hidden');

    renderPinDots();

    if (modal && overlay) {
        modal.classList.remove('hidden');
        overlay.classList.add('active');
    }
}

function closePinModal() {
    enteredPin = '';
    pinSuccessCallback = null;
    const modal = document.getElementById('pin-modal');
    const overlay = document.getElementById('pin-overlay');
    if (modal && overlay) {
        modal.classList.add('hidden');
        overlay.classList.remove('active');
    }
}

function renderPinDots() {
    const dotsContainer = document.getElementById('pin-dots');
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('filled', idx < enteredPin.length);
    });
}

function handlePinKey(key) {
    const errEl = document.getElementById('pin-error-text');
    if (errEl) errEl.classList.add('hidden');

    if (key === 'delete') {
        if (enteredPin.length > 0) {
            enteredPin = enteredPin.slice(0, -1);
            renderPinDots();
        }
        return;
    }

    if (enteredPin.length < 4) {
        enteredPin += key;
        renderPinDots();

        if (enteredPin.length === 4) {
            if (pinModalMode === 'capture') {
                const capturedPin = enteredPin;
                const cb = pinSuccessCallback;
                closePinModal();
                if (typeof cb === 'function') {
                    cb(capturedPin);
                }
                return;
            }

            // Verify PIN
            const currentPin = state.settings.adminPin || '1234';
            if (enteredPin === currentPin) {
                state.isMasterUnlocked = true;
                updateMasterLockUI();
                showToast('🔓 Passcode accepted: Master Baseline unlocked');
                const cb = pinSuccessCallback;
                closePinModal();
                if (typeof cb === 'function') {
                    cb();
                } else {
                    toggleMasterEditMode(true);
                }
            } else {
                // Shake and error
                if (errEl) {
                    errEl.textContent = 'Incorrect PIN. Try again.';
                    errEl.classList.remove('hidden');
                }
                const modal = document.getElementById('pin-modal');
                if (modal) {
                    modal.style.animation = 'pinShake 0.4s ease';
                    setTimeout(() => { if (modal) modal.style.animation = ''; }, 450);
                }
                setTimeout(() => {
                    enteredPin = '';
                    renderPinDots();
                }, 400);
            }
        }
    }
}

function openChangePinFlow() {
    openPinModal('Verify Current PIN', 'Enter your current 4-digit PIN to authorize changing it.', () => {
        setTimeout(() => {
            openPinModal('Set New 4-Digit PIN', 'Enter the new 4-digit PIN for Master Routine access.', (newPin) => {
                setTimeout(() => {
                    openPinModal('Confirm New PIN', 'Re-enter the new 4-digit PIN to confirm.', (confirmPin) => {
                        if (newPin === confirmPin) {
                            state.settings.adminPin = newPin;
                            saveStateToStorage();
                            showToast('✓ Admin Master Routine PIN updated successfully!');
                        } else {
                            showToast('PIN confirmation did not match. PIN was not changed.', true);
                        }
                    }, 'capture');
                }, 300);
            }, 'capture');
        }, 300);
    }, 'verify');
}
window.openChangePinFlow = openChangePinFlow;

function toggleMasterEditMode(forceState = null) {
    if (!hasCoordinatorPermissions() && !state.isMasterUnlocked) {
        showToast('Admin or Academic Coordinator role required to edit Master Routine.', true);
        return;
    }

    if (!state.isMasterUnlocked) {
        openPinModal('Admin Passcode Required', 'Enter 4-digit PIN to edit Master Routine baseline.', () => {
            toggleMasterEditMode(true);
        });
        return;
    }

    const nextState = forceState !== null ? forceState : !state.isMasterEditMode;
    state.isMasterEditMode = nextState;

    if (state.isMasterEditMode) {
        state.isEditMode = false; // Turn off daily dragging mode while editing master baseline
        // Stage a deep clone of baseSchedule for atomic saving
        stagedMasterSchedule = JSON.parse(JSON.stringify(state.baseSchedule));
        showToast('🛠 Master Routine Editing Mode: Tap any cell to configure allocation.');
    } else {
        stagedMasterSchedule = null;
        showToast('Exited Master Baseline editing mode.');
    }

    updateMasterLockUI();
    renderAll();
}

function saveMasterBaseline() {
    if (!stagedMasterSchedule) {
        state.isMasterEditMode = false;
        updateMasterLockUI();
        renderAll();
        return;
    }

    // Save previous baseline for undo safety and diff auditing
    const previousBaseline = JSON.parse(JSON.stringify(state.baseSchedule));

    // Calculate audited baseline modifications
    const baselineUpdates = [];
    days.forEach(d => {
        periods.forEach(p => {
            if (p === 'BREAK' || p === 'BREAKFAST BREAK' || p === 'BREAKFAST') return;
            teachers.forEach(t => {
                const prevBase = previousBaseline[d]?.[p]?.[t] || 'Free';
                const newBase = stagedMasterSchedule[d]?.[p]?.[t] || 'Free';
                if (prevBase !== newBase) {
                    baselineUpdates.push({
                        day: d,
                        period: p,
                        teacher: t,
                        previousTask: prevBase,
                        newTask: newBase,
                        coTeachingPartner: state.coTeachingPartners?.[d]?.[p]?.[t] || '',
                        adminPinVerified: true
                    });
                }
            });
        });
    });

    // Commit staged changes to baseSchedule
    state.baseSchedule = JSON.parse(JSON.stringify(stagedMasterSchedule));

    // Also synchronize current day's active schedule for untouched cells
    days.forEach(d => {
        periods.forEach(p => {
            if (p === 'BREAK' || p === 'BREAKFAST BREAK' || p === 'BREAKFAST') return;
            teachers.forEach(t => {
                const prevBase = previousBaseline[d]?.[p]?.[t];
                const curSched = state.schedule[d]?.[p]?.[t];
                const newBase = state.baseSchedule[d]?.[p]?.[t];
                // If the working schedule cell was untouched (i.e. identical to previous base), update to new base
                if (curSched === prevBase || !curSched) {
                    if (!state.schedule[d]) state.schedule[d] = {};
                    if (!state.schedule[d][p]) state.schedule[d][p] = {};
                    state.schedule[d][p][t] = newBase;
                }
            });
        });
    });

    state.isMasterEditMode = false;
    stagedMasterSchedule = null;
    saveStateToStorage();
    updateMasterLockUI();
    renderAll();
    showToast('✓ Master Timetable Baseline saved successfully!');

    // Automatically push audited baseline modifications to Google Sheets
    if (baselineUpdates.length > 0) {
        pushBaselineUpdatesToCloud(baselineUpdates);
    }
}

function cancelMasterBaseline() {
    state.isMasterEditMode = false;
    stagedMasterSchedule = null;
    updateMasterLockUI();
    renderAll();
    showToast('Cancelled Master Routine baseline modifications.');
}

// Master Cell Inspector & Allocation Modal
function handleMasterCellClick(period, teacher) {
    if (period === 'BREAK' || period === 'BREAKFAST BREAK' || period === 'BREAKFAST') {
        showToast('The BREAK column is a fixed school break.');
        return;
    }

    const day = state.day;
    activeMasterCell = { period, teacher, day };

    const targetSched = stagedMasterSchedule || state.baseSchedule;
    const currentTask = targetSched[day]?.[period]?.[teacher] || 'Free';

    // Populate Context Header
    const contextEl = document.getElementById('master-cell-context');
    if (contextEl) {
        const staff = staffDirectory[teacher];
        contextEl.innerHTML = `
            <div>
                <strong style="font-size:14px;">${teacher}</strong>
                <div style="font-size:11px; color:var(--text-secondary);">${staff?.role || ''} • ${staff?.primaryClass ? 'CT ' + staff.primaryClass : ''}</div>
            </div>
            <div style="text-align:right;">
                <span class="badge" style="background:var(--accent-blue); color:#fff; font-size:11px; font-weight:700;">${day} • ${period}</span>
                <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Current: <b>${currentTask}</b></div>
            </div>
        `;
    }

    // Parse existing task into section and subject
    const parsed = parseTaskDetails(currentTask);
    const existingSection = parsed.section || '';
    let existingSubject = parsed.subjectPrefix || (currentTask === 'Free' ? '' : currentTask);

    // Sync Section Pill selection
    const sectionContainer = document.getElementById('master-section-selector');
    if (sectionContainer) {
        sectionContainer.querySelectorAll('.section-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === existingSection);
        });
    }

    // Sync Subject Input
    const subjInput = document.getElementById('master-subject-input');
    if (subjInput) {
        subjInput.value = existingSubject;
    }

    // Populate Quick Subject Chips from Teacher's Subject Pool
    const quickChips = document.getElementById('master-quick-subjects');
    if (quickChips) {
        const pool = staffDirectory[teacher]?.assignedSubjectPool || [];
        if (pool.length > 0) {
            quickChips.innerHTML = pool.map(s => `
                <button type="button" class="quick-subj-chip" onclick="selectMasterQuickSubject('${s}')">${s}</button>
            `).join('');
        } else {
            quickChips.innerHTML = `<span style="font-size:11px; color:var(--text-secondary); padding:4px;">No pool defined</span>`;
        }
    }

    // Populate Co-Teaching Partner Selector
    const partnerSelect = document.getElementById('master-partner-select');
    if (partnerSelect) {
        let partnersHtml = '<option value="">None (Solo Class)</option>';
        const currentPartners = getCoTeachingPartners(day, period, teacher);
        teachers.forEach(t => {
            if (t !== teacher) {
                const isSelected = currentPartners.includes(t);
                const tSched = targetSched[day]?.[period]?.[t] || 'Free';
                partnersHtml += `<option value="${t}" ${isSelected ? 'selected' : ''}>${t} (Currently: ${tSched})</option>`;
            }
        });
        partnerSelect.innerHTML = partnersHtml;
    }

    checkMasterCellCollision();

    const modal = document.getElementById('master-cell-modal');
    const overlay = document.getElementById('master-cell-overlay');
    if (modal && overlay) {
        modal.classList.remove('hidden');
        overlay.classList.add('active');
    }
}
window.handleMasterCellClick = handleMasterCellClick;

function selectMasterQuickSubject(subjectName) {
    const subjInput = document.getElementById('master-subject-input');
    if (subjInput) {
        subjInput.value = subjectName;
        checkMasterCellCollision();
    }
}
window.selectMasterQuickSubject = selectMasterQuickSubject;

function checkMasterCellCollision() {
    if (!activeMasterCell) return;
    const { period, teacher, day } = activeMasterCell;
    const warningEl = document.getElementById('master-collision-warning');
    const warningText = document.getElementById('master-collision-text');
    if (!warningEl || !warningText) return;

    // Get selected section
    const activeSectionBtn = document.querySelector('.section-pill-btn.active');
    const section = activeSectionBtn ? activeSectionBtn.dataset.section : '';
    const partner = document.getElementById('master-partner-select')?.value || '';

    if (!section) {
        warningEl.classList.add('hidden');
        return;
    }

    const targetSched = stagedMasterSchedule || state.baseSchedule;
    const conflicts = [];

    // Check if other teachers (other than active teacher and selected partner) teach this section in this period
    teachers.forEach(t => {
        if (t !== teacher && t !== partner) {
            const task = targetSched[day]?.[period]?.[t];
            if (task && task !== 'Free' && task !== '-') {
                const secs = extractClassSections(task);
                if (secs.some(s => section.includes(s) || s.includes(section))) {
                    conflicts.push(`${t} is already assigned "${task}"`);
                }
            }
        }
    });

    if (conflicts.length > 0) {
        warningText.textContent = `Warning: Section ${section} conflict: ${conflicts.join(', ')}`;
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }
}

function applyMasterCellAllocation() {
    if (!activeMasterCell) return;
    const { period, teacher, day } = activeMasterCell;
    const targetSched = stagedMasterSchedule || state.baseSchedule;

    const activeSectionBtn = document.querySelector('.section-pill-btn.active');
    const section = activeSectionBtn ? activeSectionBtn.dataset.section : '';
    const subject = document.getElementById('master-subject-input')?.value.trim() || '';
    const partner = document.getElementById('master-partner-select')?.value || '';

    let taskName = 'Free';
    if (subject && section) {
        taskName = `${subject} ${section}`;
    } else if (subject) {
        taskName = subject;
    } else if (section) {
        taskName = section;
    }

    if (!targetSched[day]) targetSched[day] = {};
    if (!targetSched[day][period]) targetSched[day][period] = {};

    targetSched[day][period][teacher] = taskName;

    // If a partner was selected, assign them identical task for co-teaching
    if (partner) {
        targetSched[day][period][partner] = taskName;
    }

    closeMasterCellModal();
    renderAll();
    showToast(`Updated allocation for ${teacher}: ${taskName}`);
}

function clearMasterCellAllocation() {
    if (!activeMasterCell) return;
    const { period, teacher, day } = activeMasterCell;
    const targetSched = stagedMasterSchedule || state.baseSchedule;

    if (!targetSched[day]) targetSched[day] = {};
    if (!targetSched[day][period]) targetSched[day][period] = {};

    targetSched[day][period][teacher] = 'Free';

    closeMasterCellModal();
    renderAll();
    showToast(`Cleared allocation for ${teacher} (${period}).`);
}

function closeMasterCellModal() {
    activeMasterCell = null;
    const modal = document.getElementById('master-cell-modal');
    const overlay = document.getElementById('master-cell-overlay');
    if (modal && overlay) {
        modal.classList.add('hidden');
        overlay.classList.remove('active');
    }
}

// ==========================================================================
// GOOGLE SHEETS PIPELINE, RFC 4180 CSV PARSER & CLOUD SYNC ENGINE
// ==========================================================================

let pendingCloudSchedule = null;
let currentCloudDiffs = [];

function parseCSV(text) {
    if (!text || typeof text !== 'string') return [];
    const result = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && text[i+1] === '"') { 
            cell += '"'; 
            i++; // Handle escaped quotes
        } else if (char === '"') { 
            inQuotes = !inQuotes; // Toggle quote state
        } else if (char === ',' && !inQuotes) { 
            row.push(cell.trim()); 
            cell = ''; // End of cell
        } else if (char === '\n' && !inQuotes) { 
            row.push(cell.trim()); 
            result.push(row); 
            row = []; 
            cell = ''; // End of row
        } else if (char !== '\r') { 
            cell += char; 
        }
    }
    if (cell.length > 0 || row.length > 0) {
        row.push(cell.trim());
        result.push(row);
    }
    return result;
}
window.parseCSV = parseCSV;

function normalizeCSVUrl(input) {
    if (!input) return '';
    let url = input.trim();
    // If user provided a standard Google Sheets sharing/editing link, convert to exported CSV targeting OVERVIEW
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && !url.includes('pub?output=csv') && !url.includes('export?format=csv')) {
        const sheetId = match[1];
        // Target OVERVIEW tab via Google Visualization CSV export to guarantee reading master timetable log
        url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=OVERVIEW`;
    }
    return url;
}

function parseTimetableFromCSV(csvRows) {
    if (!csvRows || csvRows.length < 2) return null;

    // Detect header layout dynamically across first 10 rows
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(10, csvRows.length); r++) {
        const rowUpper = csvRows[r].map(c => (c || '').toString().trim().toUpperCase());
        if (rowUpper.some(c => c.includes('DAY')) && (rowUpper.some(c => c.includes('PERIOD') || c.includes('PD')) || rowUpper.some(c => c.includes('TEACHER')))) {
            headerRowIdx = r;
            break;
        }
    }
    const header = csvRows[headerRowIdx].map(h => (h || '').toString().trim().toUpperCase());
    
    const parsedSchedule = {
        'MON': {}, 'TUE': {}, 'WED': {}, 'THU': {}, 'FRI': {}, 'SAT': {}
    };

    // Initialize blank schedule structure
    days.forEach(d => {
        periods.forEach(p => {
            parsedSchedule[d][p] = {};
            teachers.forEach(t => {
                parsedSchedule[d][p][t] = (p === 'BREAK' ? '-' : 'Free');
            });
        });
    });

    // Check if CSV is normalized Log format: [Class, Day, Period, Subject, Teacher, ...]
    const dayColIdx = header.findIndex(h => h.includes('DAY'));
    const periodColIdx = header.findIndex(h => h.includes('PERIOD') || h.includes('PD'));
    const teacherColIdx = header.findIndex(h => h.includes('TEACHER'));
    const subjColIdx = header.findIndex(h => h.includes('SUBJECT') || h.includes('TASK') || h.includes('SUBJ'));
    const classColIdx = header.findIndex(h => h.includes('CLASS') || h.includes('SEC'));

    if (dayColIdx !== -1 && periodColIdx !== -1 && teacherColIdx !== -1 && subjColIdx !== -1) {
        // Log/Table Format
        for (let i = headerRowIdx + 1; i < csvRows.length; i++) {
            const row = csvRows[i];
            if (row.length <= Math.max(dayColIdx, periodColIdx, teacherColIdx, subjColIdx)) continue;

            const rawDay = (row[dayColIdx] || '').trim().toUpperCase().replace(/\./g, '');
            const rawPeriod = (row[periodColIdx] || '').trim();
            const rawTeacher = (row[teacherColIdx] || '').trim();
            const rawSubj = (row[subjColIdx] || '').trim();
            const rawClass = classColIdx !== -1 ? (row[classColIdx] || '').trim() : '';

            // Normalize day (e.g. MON, TUES -> TUE, FRI -> FRI)
            let matchedDay = days.find(d => rawDay.startsWith(d));
            if (!matchedDay && rawDay.startsWith('TUE')) matchedDay = 'TUE';
            if (!matchedDay) continue;

            // Normalize period
            let matchedPeriod = periods.find(p => p.toLowerCase() === rawPeriod.toLowerCase());
            if (!matchedPeriod) {
                if (rawPeriod.includes('1')) matchedPeriod = '1st';
                else if (rawPeriod.includes('2nd') || rawPeriod.includes('2')) matchedPeriod = '2nd';
                else if (rawPeriod.includes('3')) matchedPeriod = '3rd';
                else if (rawPeriod.includes('4')) matchedPeriod = '4th';
                else if (rawPeriod.includes('5')) matchedPeriod = '5th';
                else if (rawPeriod.includes('6')) matchedPeriod = '6th';
                else if (rawPeriod.toUpperCase().includes('GOLDEN') || rawPeriod.toUpperCase().includes('G/PD')) matchedPeriod = 'G/PD';
                else if (rawPeriod.toUpperCase().includes('PLAY')) matchedPeriod = 'PLAYTIME / 2ND GOLDEN HOUR';
                else if (rawPeriod.toUpperCase().includes('BREAK')) matchedPeriod = 'BREAK';
            }
            if (!matchedPeriod || matchedPeriod === 'BREAK') continue;

            // Match teacher name against known teachers
            let matchedTeacher = teachers.find(t => t.toLowerCase() === rawTeacher.toLowerCase());
            if (!matchedTeacher) {
                matchedTeacher = teachers.find(t => {
                    const last = t.split(' ').pop().toLowerCase();
                    return rawTeacher.toLowerCase().includes(last);
                });
            }
            if (!matchedTeacher) continue;

            let taskString = rawSubj;
            if (rawClass && !rawSubj.toUpperCase().includes(rawClass.toUpperCase())) {
                taskString = `${rawSubj} ${rawClass}`;
            }

            const currentCell = parsedSchedule[matchedDay][matchedPeriod][matchedTeacher];
            if (currentCell && currentCell !== 'Free' && currentCell !== '-') {
                if (rawClass && !currentCell.includes(rawClass)) {
                    taskString = `${currentCell} + ${rawClass}`;
                }
            }

            parsedSchedule[matchedDay][matchedPeriod][matchedTeacher] = taskString;
        }
        return parsedSchedule;
    }

    // Fallback: Grid Matrix Format: Row per teacher, columns = periods
    // Row 0 has periods: ['Teacher', 'G/PD', '1st', 'BREAK', ...]
    const currentDay = state.day; // Default to active day if not specified in table
    for (let r = 1; r < csvRows.length; r++) {
        const row = csvRows[r];
        if (row.length < 2) continue;
        const rowTeacherRaw = row[0].trim();
        const matchedTeacher = teachers.find(t => t.toLowerCase() === rowTeacherRaw.toLowerCase() || t.includes(rowTeacherRaw));
        if (!matchedTeacher) continue;

        for (let c = 1; c < row.length && c < header.length; c++) {
            const colHeader = header[c];
            const matchedPeriod = periods.find(p => colHeader.includes(p.toUpperCase()) || p.toUpperCase().includes(colHeader));
            if (matchedPeriod && matchedPeriod !== 'BREAK') {
                const cellTask = row[c].trim();
                parsedSchedule[currentDay][matchedPeriod][matchedTeacher] = cellTask || 'Free';
            }
        }
    }
    return parsedSchedule;
}

function calculateScheduleDiffs(localBase, incomingCloud) {
    const diffs = [];
    days.forEach(d => {
        periods.forEach(p => {
            if (p === 'BREAK' || p === 'BREAKFAST BREAK' || p === 'BREAKFAST') return;
            teachers.forEach(t => {
                const localTask = localBase[d]?.[p]?.[t] || 'Free';
                const cloudTask = incomingCloud[d]?.[p]?.[t] || 'Free';
                if (localTask !== cloudTask) {
                    diffs.push({
                        day: d,
                        period: p,
                        teacher: t,
                        localTask,
                        cloudTask
                    });
                }
            });
        });
    });
    return diffs;
}

async function syncFromGoogleSheets(forcePrompt = false) {
    const rawUrl = state.settings.sheetsCsvUrl || document.getElementById('sheets-csv-url-input')?.value || '';
    const url = normalizeCSVUrl(rawUrl);

    if (!url) {
        showToast('Please enter a published Google Sheets CSV URL first.', true);
        openSettingsModal();
        const urlInput = document.getElementById('sheets-csv-url-input');
        if (urlInput) urlInput.focus();
        return;
    }

    const spinner = document.getElementById('sync-spinner');
    if (spinner) spinner.classList.add('spinning');
    showToast('☁ Fetching latest routine from Google Sheets...');

    try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        if (!rows || rows.length < 2) {
            throw new Error('Google Sheet returned empty or invalid CSV data.');
        }

        const cloudSchedule = parseTimetableFromCSV(rows);
        if (!cloudSchedule) {
            throw new Error('Could not parse timetable structure from CSV.');
        }

        const diffs = calculateScheduleDiffs(state.baseSchedule, cloudSchedule);

        if (spinner) spinner.classList.remove('spinning');

        if (diffs.length === 0) {
            state.settings.lastCloudSync = new Date().toISOString();
            saveStateToStorage();
            updateCloudSyncUI();
            showToast('✓ Everything is up to date: Local timetable perfectly matches Cloud.');
            return;
        }

        // If diffs exist, prompt the Cloud vs. Local Conflict Resolver modal
        pendingCloudSchedule = cloudSchedule;
        currentCloudDiffs = diffs;
        openCloudConflictModal(diffs);

    } catch (err) {
        if (spinner) spinner.classList.remove('spinning');
        showToast(`Cloud Sync Error: ${err.message}`, true);
    }
}
window.syncFromGoogleSheets = syncFromGoogleSheets;

function openCloudConflictModal(diffs) {
    const modal = document.getElementById('cloud-conflict-modal');
    const overlay = document.getElementById('cloud-conflict-overlay');
    const summaryContainer = document.getElementById('cloud-diff-summary');
    const diffContainer = document.getElementById('cloud-diff-container');

    if (!modal || !overlay) return;

    if (summaryContainer) {
        const affectedTeachers = new Set(diffs.map(d => d.teacher)).size;
        const affectedDays = new Set(diffs.map(d => d.day)).size;
        summaryContainer.innerHTML = `
            <span class="diff-summary-pill">⚡ ${diffs.length} Slot Differing</span>
            <span class="diff-summary-pill">👨‍🏫 ${affectedTeachers} Teachers</span>
            <span class="diff-summary-pill">📅 ${affectedDays} Days</span>
        `;
    }

    if (diffContainer) {
        diffContainer.innerHTML = diffs.map(d => `
            <div class="diff-card">
                <div class="diff-card-header">
                    <span>${d.teacher}</span>
                    <span style="opacity:0.8;">${d.day} • ${d.period}</span>
                </div>
                <div class="diff-values-row">
                    <span class="diff-local-val" title="Local">${d.localTask}</span>
                    <span style="color:var(--text-secondary);">→</span>
                    <span class="diff-cloud-val" title="Cloud">${d.cloudTask}</span>
                </div>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');
    overlay.classList.add('active');
}

function closeCloudConflictModal() {
    pendingCloudSchedule = null;
    currentCloudDiffs = [];
    const modal = document.getElementById('cloud-conflict-modal');
    const overlay = document.getElementById('cloud-conflict-overlay');
    if (modal && overlay) {
        modal.classList.add('hidden');
        overlay.classList.remove('active');
    }
}

function acceptCloudSchedule() {
    if (!pendingCloudSchedule) return;

    // Apply cloud baseline to baseSchedule
    state.baseSchedule = JSON.parse(JSON.stringify(pendingCloudSchedule));

    // Synchronize working schedule
    days.forEach(d => {
        periods.forEach(p => {
            if (p === 'BREAK' || p === 'BREAKFAST BREAK' || p === 'BREAKFAST') return;
            teachers.forEach(t => {
                state.schedule[d][p][t] = state.baseSchedule[d][p][t];
            });
        });
    });

    state.settings.lastCloudSync = new Date().toISOString();
    saveStateToStorage();
    closeCloudConflictModal();
    updateCloudSyncUI();
    renderAll();
    showToast(`✓ Accepted Cloud Routine (${currentCloudDiffs.length} allocations updated from Google Sheets).`);
}

function keepLocalSchedule() {
    state.settings.lastCloudSync = new Date().toISOString();
    saveStateToStorage();
    closeCloudConflictModal();
    updateCloudSyncUI();
    showToast('Preserved local modifications. Cloud changes ignored.');
}

function updateCloudSyncUI() {
    const urlInput = document.getElementById('sheets-csv-url-input');
    const syncTimeEl = document.getElementById('sync-last-time');

    if (urlInput) {
        urlInput.value = state.settings.sheetsCsvUrl || '';
    }
    const isWebApp = (state.settings.sheetsCsvUrl || '').includes('/exec');
    if (syncTimeEl) {
        if (state.settings.lastCloudSync) {
            const d = new Date(state.settings.lastCloudSync);
            const timeStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            syncTimeEl.innerHTML = `${isWebApp ? '<span style="color:var(--accent-green); font-weight:700;">● 2-Way Connected</span> • ' : ''}Synced ${timeStr}`;
        } else {
            syncTimeEl.innerHTML = isWebApp 
                ? '<span style="color:var(--accent-green); font-weight:700;">● 2-Way Ready</span> (Not Synced Yet)' 
                : 'Local Baseline (Not Synced)';
            syncTimeEl.style.color = 'var(--text-secondary)';
        }
    }
}

async function pushSubstitutionsToCloud(entries = null) {
    const rawUrl = state.settings.sheetsCsvUrl || document.getElementById('sheets-csv-url-input')?.value || '';
    if (!rawUrl || !rawUrl.includes('/exec')) {
        showToast('Google Apps Script Web App URL required for cloud sync.', true);
        return false;
    }

    if (!entries) {
        entries = [];
        const currentSubs = state.substitutions[state.day] || {};
        Object.keys(currentSubs).forEach(period => {
            Object.keys(currentSubs[period] || {}).forEach(absentTeacher => {
                const assignedSub = currentSubs[period][absentTeacher];
                const statusObj = getSubStatusObj(state.day, period, absentTeacher);
                const disputeReason = statusObj.status === 'disputed' ? (statusObj.reason || '') : '';
                entries.push({
                    day: state.day,
                    period: period,
                    absentTeacher: absentTeacher,
                    assignedSub: assignedSub,
                    status: statusObj.status === 'accepted' ? 'Accepted' : (statusObj.status === 'disputed' ? 'Disputed' : 'Assigned'),
                    note: disputeReason || `Covering ${state.baseSchedule[state.day]?.[period]?.[absentTeacher] || 'Class'}`
                });
            });
        });
    }

    if (entries.length === 0) {
        showToast('No substitutions assigned to push for today.');
        return false;
    }

    const pushBtns = [document.getElementById('push-ledger-btn'), document.getElementById('btn-push-sheets')].filter(Boolean);
    pushBtns.forEach(b => b.classList.add('spinning'));
    showToast(`☁ Pushing ${entries.length} substitution record(s) to Google Sheets Daily_Ledger...`);

    try {
        const payload = {
            action: 'logSubstitutions',
            entries: entries
        };
        await fetch(rawUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(payload)
        });

        pushBtns.forEach(b => b.classList.remove('spinning'));
        state.settings.lastCloudSync = new Date().toISOString();
        saveStateToStorage();
        updateCloudSyncUI();
        showToast(`✓ Successfully logged ${entries.length} substitution(s) to Daily_Ledger!`);
        return true;
    } catch (err) {
        pushBtns.forEach(b => b.classList.remove('spinning'));
        console.error('Push to cloud error:', err);
        showToast(`Cloud Push Error: ${err.message}`, true);
        return false;
    }
}
window.pushSubstitutionsToCloud = pushSubstitutionsToCloud;

async function pushBaselineUpdatesToCloud(updates) {
    const rawUrl = state.settings.sheetsCsvUrl || document.getElementById('sheets-csv-url-input')?.value || '';
    if (!rawUrl || !rawUrl.includes('/exec') || !updates || updates.length === 0) return false;

    showToast(`☁ Logging ${updates.length} baseline modification(s) to Google Sheets...`);
    try {
        const payload = {
            action: 'updateBaseline',
            updates: updates
        };
        await fetch(rawUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(payload)
        });
        showToast(`✓ Saved & logged ${updates.length} modification(s) to Baseline_Updates!`);
        return true;
    } catch (err) {
        console.error('Push baseline update error:', err);
        return false;
    }
}
window.pushBaselineUpdatesToCloud = pushBaselineUpdatesToCloud;


function extractClassSection(task) {
    if (!task || task === 'Free' || task === '-' || task === '') return null;
    const clean = task.trim().toUpperCase();
    const kgPrepMatch = clean.match(/\b(KG\s*[AB]|PREP\s*[AB])\b/i);
    if (kgPrepMatch) {
        return kgPrepMatch[1].replace(/\s+/g, ' ').toUpperCase();
    }
    const numMatch = clean.match(/\b(\d{1,2}\s*[A-Za-z]?)\b/);
    if (numMatch) {
        return numMatch[1].replace(/\s+/g, '').toUpperCase();
    }
    return null;
}

function extractClassSections(task) {
    if (!task || task === 'Free' || task === '-' || task === '') return [];
    const clean = task.trim().toUpperCase();
    const sections = [];
    const kgPrepMatches = clean.match(/\b(KG\s*[AB]|PREP\s*[AB])\b/gi);
    if (kgPrepMatches) {
        kgPrepMatches.forEach(m => sections.push(m.replace(/\s+/g, ' ').toUpperCase()));
    }
    const numMatches = clean.match(/\b(\d{1,2}\s*[A-Za-z]?)\b/g);
    if (numMatches) {
        numMatches.forEach(m => sections.push(m.replace(/\s+/g, '').toUpperCase()));
    }
    return [...new Set(sections)];
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function extractRootSubject(task) {
    if (!task) return '';
    return task.trim().toUpperCase()
        .replace(/^(1ST|2ND|3RD|4TH)\s+/i, '')
        .split(' ')[0];
}

// --- CONFLICT DETECTION ENGINE ---
function findConflicts() {
    if (!state.settings || state.settings.detectCollisions === false) {
        return { count: 0, collisionCells: new Map(), details: [] };
    }

    const collisionCells = new Map(); // key: `${period}::${teacher}`, value: { reasons: [] }
    const details = [];

    periods.forEach(period => {
        if (period === 'BREAK' || period === 'BREAKFAST BREAK' || period === 'BREAKFAST') return;

        // Group assignments by Class Section (e.g. "KG A", "KG B", "PREP A", "PREP B")
        const sectionMap = new Map();
        // Also group by exact Task name (for non-numbered classes or activities)
        const exactTaskMap = new Map();

        teachers.forEach(teacher => {
            const task = state.schedule[state.day]?.[period]?.[teacher];
            if (task && task !== 'Free' && task !== '-' && task !== '') {
                const normTask = task.trim().toUpperCase();
                const secs = extractClassSections(task);

                if (secs.length > 0) {
                    secs.forEach(sec => {
                        if (!sectionMap.has(sec)) sectionMap.set(sec, []);
                        sectionMap.get(sec).push({ teacher, task: normTask });
                    });
                } else {
                    if (!exactTaskMap.has(normTask)) exactTaskMap.set(normTask, []);
                    exactTaskMap.get(normTask).push(teacher);
                }
            }
        });

        // 1. Check Class Section Conflicts
        sectionMap.forEach((entries, section) => {
            if (entries.length > 1) {
                // Special exception: Monday G/PD parallel half-period rotation for KG A and KG B (ENG. REC. & GAMES)
                if (state.day === 'MON' && period === 'G/PD' && (section === 'KG A' || section === 'KG B')) {
                    const allDesignated = entries.every(e => 
                        e.task.includes('ENG. REC.') || e.task.includes('GAMES')
                    );
                    if (allDesignated) {
                        return; // Valid designated half-period parallel activity rotation
                    }
                }

                // Check if all assigned teachers are designated co-teachers (including active substitute partnerships)
                const assignedTeachers = entries.map(e => e.teacher);
                const isDesignatedCoTeaching = assignedTeachers.every(t => {
                    return assignedTeachers.every(ot => areTeachersCoTeachingPartners(state.day, period, t, ot));
                });

                if (isDesignatedCoTeaching) {
                    return; // Legitimate co-teachers sharing this class
                }

                // Suppress false positives on baseline designated shared allocations with matching root subject
                const allInBase = entries.every(e => {
                    const base = (state.baseSchedule[state.day]?.[period]?.[e.teacher] || '').trim().toUpperCase();
                    return base === e.task;
                });
                const rootSubjects = new Set(entries.map(e => extractRootSubject(e.task)));
                if (allInBase && rootSubjects.size === 1) {
                    return; // Legitimate baseline shared allocation
                }

                const uniqueTasks = new Set(entries.map(e => e.task));
                if (uniqueTasks.size > 1) {
                    // Conflicting subjects for the SAME student class section!
                    entries.forEach(e => {
                        const key = `${period}::${e.teacher}`;
                        if (!collisionCells.has(key)) collisionCells.set(key, { reasons: [] });
                        const others = entries.filter(o => o.teacher !== e.teacher).map(o => `${o.teacher} (${o.task})`).join(', ');
                        collisionCells.get(key).reasons.push(`Class ${section} Conflict: "${e.task}" overlaps with ${others}`);
                    });
                    details.push(`${period}: Class ${section} double-booked across different subjects (${entries.map(e => `${e.teacher}: ${e.task}`).join(', ')})`);
                } else {
                    assignedTeachers.forEach(t => {
                        const key = `${period}::${t}`;
                        if (!collisionCells.has(key)) collisionCells.set(key, { reasons: [] });
                        collisionCells.get(key).reasons.push(`Duplicate Class: "${entries[0].task}" also with ${assignedTeachers.filter(ot => ot !== t).join(', ')}`);
                    });
                    details.push(`${period}: ${entries[0].task} assigned to multiple teachers (${assignedTeachers.join(', ')})`);
                }
            }
        });

        // 2. Check exact task duplicates without class numbers
        exactTaskMap.forEach((assignedTeachers, taskName) => {
            if (assignedTeachers.length > 1) {
                const isDesignatedCoTeaching = assignedTeachers.every(t => {
                    return assignedTeachers.every(ot => areTeachersCoTeachingPartners(state.day, period, t, ot));
                });

                if (!isDesignatedCoTeaching) {
                    assignedTeachers.forEach(t => {
                        const key = `${period}::${t}`;
                        if (!collisionCells.has(key)) collisionCells.set(key, { reasons: [] });
                        collisionCells.get(key).reasons.push(`Duplicate Activity: "${taskName}" with ${assignedTeachers.filter(ot => ot !== t).join(', ')}`);
                    });
                    details.push(`${period}: "${taskName}" assigned to multiple teachers (${assignedTeachers.join(', ')})`);
                }
            }
        });
    });

    return {
        count: collisionCells.size,
        collisionCells,
        details
    };
}

// Backward-compatible alias
function findCollisions() {
    return findConflicts();
}

// --- ROLES, OFFICIATING (Off. AC / Off. CT.), 10s ACCEPTANCE & DISPUTE ENGINE ---

function hasCoordinatorPermissions() {
    if (state.currentRole === 'admin' || state.currentRole === 'ac' || state.currentRole === 'asst_ac') {
        return true;
    }
    if (state.currentRole === 'teacher' && state.officiatingAC?.[state.day] === state.activeTeacher) {
        return true;
    }
    return false;
}

function getOfficiatingCTSectionsForTeacher(teacher, day = state.day) {
    const map = state.officiatingCT?.[day] || {};
    const sections = [];
    for (const [sec, t] of Object.entries(map)) {
        if (t === teacher && !state.absentTeachers.has(t)) {
            sections.push(sec);
        }
    }
    return sections;
}

function setActiveRole(role) {
    state.currentRole = role;
    saveStateToStorage();
    updateRolePermissionsUI();
    renderAll();
    const roleLabels = {
        admin: '🛡 Admin',
        ac: `🎓 AC (${PRIMARY_AC})`,
        asst_ac: `🎓 Asst AC (${ASSISTANT_AC})`,
        teacher: `👤 Teacher (${state.activeTeacher})`
    };
    showToast(`Switched active role to ${roleLabels[role] || role}`);
}
window.setActiveRole = setActiveRole;

function updateRolePermissionsUI() {
    const badgeBtn = document.getElementById('role-badge-btn');
    const teacherRow = document.getElementById('teacher-identity-row');
    const teacherSelect = document.getElementById('active-teacher-select');
    const staffSelect = document.getElementById('active-staff-profile-select');
    const disputeSettingRow = document.getElementById('admin-dispute-setting-row');
    const allowDisputesToggle = document.getElementById('allow-disputes-toggle');

    // Populate active staff profile select if needed
    if (staffSelect && (!staffSelect.options || staffSelect.options.length === 0)) {
        const adminOpt = document.createElement('option');
        adminOpt.value = 'admin';
        adminOpt.textContent = '🛡 Front Desk Admin (Full Access)';
        staffSelect.appendChild(adminOpt);

        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            const ctSec = classTeacherMap[t];
            if (t === PRIMARY_AC) {
                opt.textContent = `🎓 ${t} (Academic Coordinator)`;
            } else if (t === ASSISTANT_AC) {
                opt.textContent = `🎓 ${t} (Asst. Academic Coord.)`;
            } else if (ctSec) {
                opt.textContent = `👤 ${t} (Class Teacher ${ctSec})`;
            } else {
                opt.textContent = `👤 ${t} (Subject Teacher)`;
            }
            staffSelect.appendChild(opt);
        });
    }
    if (staffSelect) {
        if (state.currentRole === 'admin') {
            staffSelect.value = 'admin';
        } else if (state.currentRole === 'ac') {
            staffSelect.value = PRIMARY_AC;
        } else if (state.currentRole === 'asst_ac') {
            staffSelect.value = ASSISTANT_AC;
        } else {
            staffSelect.value = state.activeTeacher;
        }
    }

    // Populate legacy teacher select dropdown if needed
    if (teacherSelect && teacherSelect.options.length === 0) {
        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = `${t} (CT ${classTeacherMap[t] || '-'})`;
            teacherSelect.appendChild(opt);
        });
    }
    if (teacherSelect) {
        teacherSelect.value = state.activeTeacher;
    }

    // Highlight active role button in Settings
    document.querySelectorAll('.role-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === state.currentRole);
    });

    // Show/hide Teacher identity selector row in Settings
    if (teacherRow) {
        teacherRow.classList.toggle('hidden', state.currentRole !== 'teacher');
    }

    // Update header Role Badge button
    if (badgeBtn) {
        badgeBtn.classList.remove('role-teacher', 'role-off-ac');
        const isOffAC = state.currentRole === 'teacher' && state.officiatingAC?.[state.day] === state.activeTeacher;
        if (state.currentRole === 'admin') {
            badgeBtn.textContent = '🛡 Admin';
        } else if (state.currentRole === 'ac') {
            badgeBtn.textContent = '🎓 AC';
        } else if (state.currentRole === 'asst_ac') {
            badgeBtn.textContent = '🎓 Asst AC';
        } else if (isOffAC) {
            badgeBtn.textContent = `⚡ Off. AC (${state.activeTeacher.split(' ')[1] || state.activeTeacher})`;
            badgeBtn.classList.add('role-off-ac');
        } else {
            badgeBtn.textContent = `👤 ${state.activeTeacher.split(' ')[1] || state.activeTeacher}`;
            badgeBtn.classList.add('role-teacher');
        }
    }

    // Show/hide Admin/AC-only Dispute and PIN setting rows
    const isCoord = hasCoordinatorPermissions();
    if (disputeSettingRow) {
        disputeSettingRow.classList.toggle('hidden', !isCoord);
    }
    if (allowDisputesToggle) {
        allowDisputesToggle.checked = state.settings.allowDisputes !== false;
    }
    const pinSettingRow = document.getElementById('admin-pin-setting-row');
    if (pinSettingRow) {
        pinSettingRow.classList.toggle('hidden', !isCoord);
    }
    const pinInput = document.getElementById('admin-pin-input');
    if (pinInput) {
        pinInput.value = state.settings.adminPin || '1234';
    }

    // Sync master lock icon
    updateMasterLockUI();
}

function renderOfficiatingBanners() {
    const acBanner = document.getElementById('off-ac-banner');
    const ctStrip = document.getElementById('off-ct-strip');
    const day = state.day;

    // 1. Dual-Absence Officiating AC (Off. AC) Contingency
    const bothACsAbsent = state.absentTeachers.has(PRIMARY_AC) && state.absentTeachers.has(ASSISTANT_AC);
    if (acBanner) {
        if (bothACsAbsent) {
            acBanner.classList.remove('hidden');
            const currentOffAC = state.officiatingAC?.[day];
            const validOffAC = currentOffAC && !state.absentTeachers.has(currentOffAC) ? currentOffAC : null;

            if (validOffAC) {
                acBanner.innerHTML = `
                    <div class="off-ac-banner-text">
                        <span>⚡</span>
                        <div>
                            <strong>Officiating AC (${day}): ${validOffAC}</strong>
                            <div style="font-size:11px; font-weight:500; opacity:0.9;">Both ${PRIMARY_AC} (AC) & ${ASSISTANT_AC} (Asst AC) are absent • ${validOffAC} inherits Coordinator permissions today.</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button class="btn-assign-off-ac" onclick="openOfficiatingModal('ac')">Change Off. AC</button>
                        <button class="btn-assign-off-ac" style="padding:5px 8px;" title="Clear Officiating AC" onclick="clearOfficiatingAssignment('ac')">✕</button>
                    </div>
                `;
            } else {
                acBanner.innerHTML = `
                    <div class="off-ac-banner-text">
                        <span>🚨</span>
                        <div>
                            <strong>Both Academic Coordinators Absent (${PRIMARY_AC} & ${ASSISTANT_AC})</strong>
                            <div style="font-size:11px; font-weight:500; opacity:0.9;">Assign an Officiating AC (Off. AC) to inherit coordinator permissions for ${day}.</div>
                        </div>
                    </div>
                    <button class="btn-assign-off-ac" onclick="openOfficiatingModal('ac')">+ Assign Officiating AC</button>
                `;
            }
        } else {
            acBanner.classList.add('hidden');
        }
    }

    // 2. Officiating Class Teacher (Off. CT.) Strip when any CT is marked absent
    if (ctStrip) {
        const absentCTs = teachers.filter(t => state.absentTeachers.has(t) && classTeacherMap[t]);
        if (absentCTs.length > 0) {
            ctStrip.classList.remove('hidden');
            let html = `<span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.3px; margin-right:2px;">Absent CTs:</span>`;
            absentCTs.forEach(absentCT => {
                const section = classTeacherMap[absentCT];
                const assignedOffCT = state.officiatingCT?.[day]?.[section];
                const validOffCT = assignedOffCT && !state.absentTeachers.has(assignedOffCT) ? assignedOffCT : null;
                const shortAbsent = absentCT.split(' ')[1] || absentCT;

                if (validOffCT) {
                    html += `
                        <div class="off-ct-chip assigned" onclick="openOfficiatingModal('ct', '${section}', '${absentCT}')" title="Click to change Officiating Class Teacher for ${section}">
                            <span>🏫 <b>${section}</b> (${shortAbsent}) → 📋 <b>${validOffCT}</b></span>
                            <span style="margin-left:4px; opacity:0.75; font-weight:700;" title="Remove Off. CT." onclick="event.stopPropagation(); clearOfficiatingAssignment('ct', '${section}')">✕</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="off-ct-chip" onclick="openOfficiatingModal('ct', '${section}', '${absentCT}')" title="Assign Officiating Class Teacher for Class ${section}">
                            <span>⚠ CT <b>${section}</b> (${shortAbsent})</span>
                            <span style="text-decoration:underline; margin-left:3px;">+ Assign Off. CT.</span>
                        </div>
                    `;
                }
            });
            ctStrip.innerHTML = html;
        } else {
            ctStrip.classList.add('hidden');
        }
    }
}

function openOfficiatingModal(type, section = null, absentCT = null) {
    const modal = document.getElementById('officiating-modal');
    const overlay = document.getElementById('officiating-overlay');
    const titleEl = document.getElementById('officiating-modal-title');
    const subtitleEl = document.getElementById('officiating-modal-subtitle');
    const listEl = document.getElementById('officiating-teacher-list');
    if (!modal || !overlay || !listEl) return;

    pendingOfficiatingTarget = { type, section, absentCT };

    if (type === 'ac') {
        if (titleEl) titleEl.textContent = '⚡ Assign Officiating AC (Off. AC)';
        if (subtitleEl) subtitleEl.textContent = `Both ${PRIMARY_AC} (AC) and ${ASSISTANT_AC} (Asst AC) are absent on ${state.day}. Select a present teacher to inherit Academic Coordinator permissions for the day.`;
    } else {
        if (titleEl) titleEl.textContent = `🏫 Assign Officiating Class Teacher (Class ${section})`;
        if (subtitleEl) subtitleEl.textContent = `${absentCT} (Class Teacher of ${section}) is absent on ${state.day}. Select a present teacher to serve as Officiating Class Teacher (Off. CT.) for ${section}.`;
    }

    const preferredOffCT = (type === 'ct' && section && classTeams[section]) ? classTeams[section].preferredOffCT : null;

    const candidates = teachers
        .filter(t => !state.absentTeachers.has(t))
        .map(t => {
            const stats = getTeacherDailyStats(t, state.day);
            const isGoldenFree = (state.schedule[state.day]?.['G/PD']?.[t] || 'Free') === 'Free';
            const teachesSec = section ? doesTeacherTeachSection(t, section, state.day) : false;
            const isPreferred = (t === preferredOffCT);
            return { name: t, stats, isGoldenFree, teachesSec, isPreferred };
        })
        .sort((a, b) => {
            if (type === 'ct') {
                if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
                if (a.teachesSec !== b.teachesSec) return a.teachesSec ? -1 : 1;
            }
            return a.stats.teachingLoad - b.stats.teachingLoad;
        });

    listEl.innerHTML = '';
    candidates.forEach(c => {
        const currentOffAC = state.officiatingAC?.[state.day];
        const currentOffCT = section ? state.officiatingCT?.[state.day]?.[section] : null;
        const isSelected = (type === 'ac' && currentOffAC === c.name) || (type === 'ct' && currentOffCT === c.name);

        const row = document.createElement('div');
        row.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:11px 14px; background:var(--bg-color); border:1px solid ${isSelected ? 'var(--accent-blue)' : (c.isPreferred ? 'rgba(52,199,89,0.4)' : 'var(--border-color)')}; border-radius:10px; cursor:pointer;`;
        row.innerHTML = `
            <div>
                <strong style="color:var(--text-primary); font-size:13px;">${isSelected ? '✓ ' : (c.isPreferred ? '★ ' : '🟢 ')}${c.name}</strong>
                ${c.isPreferred ? `<span class="reg-affinity-tag" style="background:rgba(52,199,89,0.18); color:var(--accent-green); font-weight:700;">★ Class Team (Recommended)</span>` : ''}
                <span class="ct-badge-mini">${classTeacherMap[c.name] ? `CT ${classTeacherMap[c.name]}` : (staffDirectory[c.name]?.role || 'Support')}</span>
                ${(c.teachesSec && !c.isPreferred) ? `<span class="reg-affinity-tag">Teaches ${section}</span>` : ''}
            </div>
            <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">Load: ${c.stats.teachingLoad}/${c.stats.totalSlots} pds</span>
        `;
        row.addEventListener('click', () => selectOfficiatingTeacher(c.name));
        listEl.appendChild(row);
    });

    modal.classList.remove('hidden');
    overlay.classList.add('active');
}
window.openOfficiatingModal = openOfficiatingModal;

function closeOfficiatingModal() {
    const modal = document.getElementById('officiating-modal');
    const overlay = document.getElementById('officiating-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    pendingOfficiatingTarget = null;
}
window.closeOfficiatingModal = closeOfficiatingModal;

function selectOfficiatingTeacher(teacherName) {
    if (!pendingOfficiatingTarget) return;
    const { type, section } = pendingOfficiatingTarget;
    const day = state.day;

    if (type === 'ac') {
        if (!state.officiatingAC) state.officiatingAC = {};
        state.officiatingAC[day] = teacherName;
        showToast(`Assigned ${teacherName} as Off. AC (${day})`);
    } else if (type === 'ct' && section) {
        if (!state.officiatingCT) state.officiatingCT = {};
        if (!state.officiatingCT[day]) state.officiatingCT[day] = {};
        state.officiatingCT[day][section] = teacherName;
        showToast(`Assigned ${teacherName} as Off. CT. (${section})`);
    }

    closeOfficiatingModal();
    saveStateToStorage();
    updateRolePermissionsUI();
    renderAll();
}
window.selectOfficiatingTeacher = selectOfficiatingTeacher;

function clearOfficiatingAssignment(type, section = null) {
    const day = state.day;
    if (type === 'ac' && state.officiatingAC?.[day]) {
        delete state.officiatingAC[day];
        showToast('Cleared Off. AC');
    } else if (type === 'ct' && section && state.officiatingCT?.[day]?.[section]) {
        delete state.officiatingCT[day][section];
        showToast(`Cleared Off. CT. (${section})`);
    }
    saveStateToStorage();
    updateRolePermissionsUI();
    renderAll();
}
window.clearOfficiatingAssignment = clearOfficiatingAssignment;

function getSubStatusObj(day, period, absentTeacher) {
    return state.subStatus?.[day]?.[period]?.[absentTeacher] || { status: 'pending' };
}

function clearSubStatusAndTimer(day, period, absentTeacher) {
    const key = `${day}::${period}::${absentTeacher}`;
    const timer = activeAcceptTimers.get(key);
    if (timer) {
        clearInterval(timer.intervalId);
        activeAcceptTimers.delete(key);
    }
    if (state.subStatus?.[day]?.[period]?.[absentTeacher]) {
        delete state.subStatus[day][period][absentTeacher];
    }
}

function startAcceptSubCountdown(period, absentTeacher) {
    const day = state.day;
    const subTeacher = state.substitutions?.[day]?.[period]?.[absentTeacher];
    if (!subTeacher) return;

    const existingStatus = getSubStatusObj(day, period, absentTeacher);
    if (existingStatus.status === 'accepted') return;

    // Clear any prior dispute state when teacher clicks Accept
    if (state.subStatus?.[day]?.[period]?.[absentTeacher]) {
        delete state.subStatus[day][period][absentTeacher];
    }

    // Default policy: timer disabled by default, free dispute at any point
    if (!state.settings?.acceptanceTimerEnabled) {
        if (!state.subStatus[day]) state.subStatus[day] = {};
        if (!state.subStatus[day][period]) state.subStatus[day][period] = {};
        state.subStatus[day][period][absentTeacher] = {
            status: 'accepted',
            acceptedBy: subTeacher,
            acceptedAt: Date.now()
        };
        saveStateToStorage();
        renderAll();
        showToast('Substitution accepted');

        // Automatically push accepted substitution to Google Sheets Daily_Ledger
        pushSubstitutionsToCloud([{
            day: day,
            period: period,
            absentTeacher: absentTeacher,
            assignedSub: subTeacher,
            status: 'Accepted',
            note: `Accepted by ${subTeacher}`
        }]);
        return;
    }

    const key = `${day}::${period}::${absentTeacher}`;
    if (activeAcceptTimers.has(key)) return;

    const duration = parseInt(state.settings?.acceptanceTimerDuration, 10) || 10;
    const entry = {
        remaining: duration,
        day,
        period,
        absentTeacher,
        subTeacher,
        intervalId: null
    };

    entry.intervalId = setInterval(() => {
        entry.remaining -= 1;
        if (entry.remaining > 0) {
            // Update countdown label live
            const btn = document.querySelector(`[data-accept-timer="${key}"]`);
            if (btn) {
                btn.innerHTML = `⏳ Confirming ${entry.remaining}s • <u>Undo</u>`;
            }
        } else {
            clearInterval(entry.intervalId);
            activeAcceptTimers.delete(key);
            if (!state.subStatus[day]) state.subStatus[day] = {};
            if (!state.subStatus[day][period]) state.subStatus[day][period] = {};
            state.subStatus[day][period][absentTeacher] = {
                status: 'accepted',
                acceptedBy: subTeacher,
                acceptedAt: Date.now()
            };
            saveStateToStorage();
            renderAll();
            showToast('Substitution accepted');

            // Automatically push accepted substitution to Google Sheets Daily_Ledger
            pushSubstitutionsToCloud([{
                day: day,
                period: period,
                absentTeacher: absentTeacher,
                assignedSub: subTeacher,
                status: 'Accepted',
                note: `Accepted by ${subTeacher}`
            }]);
        }
    }, 1000);

    activeAcceptTimers.set(key, entry);
    renderSubstitutions();
}
window.startAcceptSubCountdown = startAcceptSubCountdown;

function cancelAcceptSub(period, absentTeacher) {
    const day = state.day;
    const key = `${day}::${period}::${absentTeacher}`;
    const timer = activeAcceptTimers.get(key);
    if (timer) {
        clearInterval(timer.intervalId);
        activeAcceptTimers.delete(key);
        renderSubstitutions();
        showToast('Acceptance cancelled');
    }
}
window.cancelAcceptSub = cancelAcceptSub;

function revokeAcceptedSub(period, absentTeacher) {
    if (!hasCoordinatorPermissions()) {
        showToast('Coordinator permission required', true);
        return;
    }
    const day = state.day;
    clearSubStatusAndTimer(day, period, absentTeacher);
    saveStateToStorage();
    renderAll();
    showToast('Acceptance unlocked');
}
window.revokeAcceptedSub = revokeAcceptedSub;

function openDisputeModal(period, absentTeacher) {
    if (state.settings.allowDisputes === false) {
        showToast('Disputes disabled');
        return;
    }
    const day = state.day;
    const subTeacher = state.substitutions?.[day]?.[period]?.[absentTeacher];
    if (!subTeacher) return;

    const statusObj = getSubStatusObj(day, period, absentTeacher);
    if (state.settings?.acceptanceTimerEnabled && statusObj.status === 'accepted') {
        showToast('Locked: Already accepted');
        return;
    }

    pendingDisputeTarget = { day, period, absentTeacher, subTeacher };
    const modal = document.getElementById('dispute-modal');
    const overlay = document.getElementById('dispute-overlay');
    const descEl = document.getElementById('dispute-modal-desc');
    const inputEl = document.getElementById('dispute-reason-input');

    const baseTask = state.baseSchedule[day]?.[period]?.[absentTeacher] || 'Class';
    if (descEl) {
        descEl.innerHTML = `Flagging substitution for <b>${subTeacher}</b> covering <b>${baseTask}</b> (${period} • Absent: ${absentTeacher}). Provide an optional reason for the Admin / Academic Coordinator:`;
    }
    if (inputEl) {
        inputEl.value = statusObj.reason || '';
    }

    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}
window.openDisputeModal = openDisputeModal;

function closeDisputeModal() {
    const modal = document.getElementById('dispute-modal');
    const overlay = document.getElementById('dispute-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    pendingDisputeTarget = null;
}
window.closeDisputeModal = closeDisputeModal;

function submitDisputeReason() {
    if (!pendingDisputeTarget) return;
    const { day, period, absentTeacher, subTeacher } = pendingDisputeTarget;
    const inputEl = document.getElementById('dispute-reason-input');
    const reason = inputEl ? inputEl.value.trim() : '';

    // Cancel any running 10s acceptance countdown on this slot
    const key = `${day}::${period}::${absentTeacher}`;
    if (activeAcceptTimers.has(key)) {
        clearInterval(activeAcceptTimers.get(key).intervalId);
        activeAcceptTimers.delete(key);
    }

    if (!state.subStatus[day]) state.subStatus[day] = {};
    if (!state.subStatus[day][period]) state.subStatus[day][period] = {};
    state.subStatus[day][period][absentTeacher] = {
        status: 'disputed',
        disputedBy: subTeacher,
        reason: reason || 'Requested review / reassignment',
        disputedAt: Date.now()
    };

    closeDisputeModal();
    saveStateToStorage();
    renderAll();
    showToast(`⚑ Substitution (${period}) flagged for Coordinator review.`, true);
}
window.submitDisputeReason = submitDisputeReason;

function dismissDispute(period, absentTeacher) {
    if (!hasCoordinatorPermissions()) {
        showToast(`Only Admin or Academic Coordinator can clear a dispute.`);
        return;
    }
    clearSubStatusAndTimer(state.day, period, absentTeacher);
    saveStateToStorage();
    renderAll();
    showToast(`Cleared dispute flag for ${period}.`);
}
window.dismissDispute = dismissDispute;

// --- DYNAMIC VIEWPORT & ADAPTIVE SCREEN CALCULATION ENGINE ---
let lastComputedWidth = 0;
let viewportResizeTimer = null;

function computeViewportLayout() {
    const vw = window.innerWidth;
    const isDesktop = vw >= 900;
    if (document.body) {
        document.body.dataset.device = isDesktop ? 'desktop' : 'mobile';
    }

    const tableContainer = document.querySelector('.table-scroll-container');
    if (tableContainer) {
        tableContainer.style.maxHeight = 'none';
        tableContainer.style.overflowY = 'visible';
    }
}
window.computeViewportLayout = computeViewportLayout;

// Debounce resize: mobile vertical scrolling changes innerHeight (collapsing URL bar)
// but does NOT change innerWidth. Only recalibrate layout when width changes or on orientationchange.
window.addEventListener('resize', () => {
    const curW = window.innerWidth;
    if (Math.abs(curW - lastComputedWidth) < 2) return;
    lastComputedWidth = curW;
    if (viewportResizeTimer) cancelAnimationFrame(viewportResizeTimer);
    viewportResizeTimer = requestAnimationFrame(computeViewportLayout);
});
window.addEventListener('orientationchange', () => {
    setTimeout(computeViewportLayout, 120);
});

// --- RENDER FUNCTIONS ---
function renderAll() {
    cleanupOrphanSubstitutions(state.day);
    updateRolePermissionsUI();
    renderOfficiatingBanners();
    renderAbsentTray();
    renderTableRoutine(); 
    renderDisplacedTray();
    renderSubstitutions();
    renderCollisionIndicator();
    updateNotificationBadge();
    computeViewportLayout();
}

function renderConflictIndicator() {
    const indicator = document.getElementById('collision-indicator');
    const counterText = document.getElementById('collision-counter-text');
    const footerPill = document.getElementById('footer-conflict-pill');
    const footerText = document.getElementById('footer-conflict-text');

    const conflicts = findConflicts();
    const hasConflicts = conflicts.count > 0 && (!state.settings || state.settings.detectCollisions !== false);

    if (hasConflicts) {
        const text = `${conflicts.count} Conflict${conflicts.count > 1 ? 's' : ''}`;
        const title = `${conflicts.count} Schedule Conflict(s):\n` + conflicts.details.slice(0, 3).join('\n');

        if (indicator) {
            indicator.classList.remove('hidden');
            if (counterText) counterText.textContent = text;
            indicator.title = title;
        }
        if (footerPill) {
            footerPill.classList.remove('hidden');
            if (footerText) footerText.textContent = text;
            footerPill.title = title;
        }
    } else {
        if (indicator) indicator.classList.add('hidden');
        if (footerPill) footerPill.classList.add('hidden');
    }
}

function renderCollisionIndicator() {
    renderConflictIndicator();
}

function formatTaskCellContent(task) {
    if (!task || task === 'Free' || task === '-') return task;
    
    // Check if task contains a known class section: KG A, KG B, PREP A, PREP B
    const classRegex = /\b(KG\s*[AB]|PREP\s*[AB])\b/i;
    const match = task.match(classRegex);
    
    if (match) {
        const classSection = match[1].toUpperCase().replace(/\s+/, ' ');
        // Extract subject by removing the class section, parentheses, dashes, or extra punctuation
        let subject = task.replace(classRegex, '').replace(/[\(\)\[\]\-]/g, '').trim();
        subject = subject.replace(/\s+/g, ' ');
        if (!subject) {
            return `<div class="cell-task-block"><span class="cell-class-tag">${escapeHtml(classSection)}</span></div>`;
        }
        return `
            <div class="cell-task-block">
                <span class="cell-class-tag">${escapeHtml(classSection)}</span>
                <span class="cell-subject-name">${escapeHtml(subject)}</span>
            </div>
        `;
    }
    
    return `<div class="cell-task-block"><span class="cell-subject-name">${escapeHtml(task)}</span></div>`;
}
window.formatTaskCellContent = formatTaskCellContent;

function renderAbsentTray() {
    const tray = document.getElementById('teacher-roster');
    if(!tray) return;
    tray.innerHTML = '';
    
    // Explicit priority sort: Class Teachers (CT) first, then Subject Teachers (ST)
    const sortedTeachers = [...teachers].sort((a, b) => {
        const aIsCT = !!classTeacherMap[a];
        const bIsCT = !!classTeacherMap[b];
        if (aIsCT && !bIsCT) return -1;
        if (!aIsCT && bIsCT) return 1;
        return teachers.indexOf(a) - teachers.indexOf(b);
    });
    
    sortedTeachers.forEach((teacher, idx) => {
        const isAbsent = state.absentTeachers.has(teacher);
        const staff = staffDirectory[teacher];
        const ctSec = classTeacherMap[teacher];
        const isCT = !!ctSec;
        const isOffAC = !isAbsent && state.officiatingAC?.[state.day] === teacher && state.absentTeachers.has(PRIMARY_AC) && state.absentTeachers.has(ASSISTANT_AC);

        // Subtly color code: CTs get Pink blob, STs get Blue blob
        const blobClass = isCT ? 'blob-ct' : 'blob-st';

        // Corner badge on lower right: AC for primary AC, A.AC for assistant AC, Off. AC for officiating
        let cornerBadge = '';
        if (isOffAC) {
            cornerBadge = `<span class="blob-corner-badge badge-off-ac" title="Officiating AC">⚡</span>`;
        } else if (teacher === PRIMARY_AC) {
            cornerBadge = `<span class="blob-corner-badge badge-ac" title="Academic Coordinator">AC</span>`;
        } else if (teacher === ASSISTANT_AC) {
            cornerBadge = `<span class="blob-corner-badge badge-asst-ac" title="Asst. Academic Coordinator">A.AC</span>`;
        }

        const initials = staff?.initials || teacher.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '').slice(0, 2).toUpperCase();
        const displayName = teacher; // Preserves full respectful title (Mrs. S. Lakra, Mr. S. A. Lakra, etc.)
        const fullName = staff?.fullName || teacher;

        const isUnavailable = isTeacherSubUnavailable(teacher, state.day);
        const unavailRemark = getTeacherSubUnavailableRemark(teacher, state.day);

        let unavailBadge = '';
        if (isUnavailable && !isAbsent) {
            unavailBadge = `
                <span class="avatar-sub-unavail-badge" title="Unavailable for substitutions today">
                    ⛔ Unavail
                    <button type="button" class="btn-sub-reason-help" data-teacher="${escapeHtml(teacher)}" data-remark="${escapeHtml(unavailRemark)}" title="Click to view remark">?</button>
                </span>
            `;
        }

        // Insert subtle vertical gradient splitter line between teacher names (just like bottom tabs)
        if (idx > 0) {
            const splitter = document.createElement('div');
            splitter.className = 'roster-splitter';
            splitter.setAttribute('aria-hidden', 'true');
            tray.appendChild(splitter);
        }

        const el = document.createElement('div');
        el.className = `teacher-avatar ${isAbsent ? 'absent' : ''} ${isUnavailable && !isAbsent ? 'sub-unavailable' : ''}`;
        el.title = `${fullName} (${staff?.role || (isCT ? 'Class Teacher' : 'Teacher')}${staff?.additionalRole ? ' • ' + staff.additionalRole : ''})\nTap to toggle absent/present • Long-press / Right-click for Sub-Availability`;
        el.innerHTML = `
            <div class="avatar-circle ${blobClass}">
                ${initials}
                ${cornerBadge}
            </div>
            <span class="name" style="font-size:11px; margin-top:3px; font-weight:600;">${displayName}</span>
            ${unavailBadge}
        `;

        // Mobile touch-hold (long-press) listener for Sub-Availability Context Menu
        let touchTimer = null;
        let isLongPress = false;
        el.addEventListener('touchstart', (e) => {
            isLongPress = false;
            const touch = e.touches[0];
            const clientX = touch ? touch.clientX : undefined;
            const clientY = touch ? touch.clientY : undefined;
            touchTimer = setTimeout(() => {
                isLongPress = true;
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(40); } catch (_) {}
                }
                openAbsenceContextMenu(teacher, el, clientX, clientY);
            }, 500);
        }, { passive: true });
        el.addEventListener('touchend', () => {
            if (touchTimer) clearTimeout(touchTimer);
        });
        el.addEventListener('touchmove', () => {
            if (touchTimer) clearTimeout(touchTimer);
        });

        el.addEventListener('click', (e) => {
            if (isLongPress) {
                isLongPress = false;
                e.stopImmediatePropagation();
                return;
            }
            if (e.target.closest('.btn-sub-reason-help')) return;
            if (isAbsent) {
                state.absentTeachers.delete(teacher);
                revertSubstitutionsForTeacher(teacher, state.day);
            } else {
                state.absentTeachers.add(teacher);
            }
            saveStateToStorage();
            renderAll();
        });
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openAbsenceContextMenu(teacher, el, e.clientX, e.clientY);
        });
        tray.appendChild(el);
    });

    // Update Hardware Pad Button Status and Count Badge
    const unavailCount = Object.keys(state.subUnavailable?.[state.day] || {}).length;
    const padBtn = document.getElementById('btn-open-sub-avail-modal');
    const padBadge = document.getElementById('pad-sub-avail-count');
    if (padBtn) {
        if (unavailCount > 0) {
            padBtn.classList.add('has-unavail');
            if (padBadge) {
                padBadge.textContent = `${unavailCount} Off`;
                padBadge.classList.remove('hidden');
            }
        } else {
            padBtn.classList.remove('has-unavail');
            if (padBadge) {
                padBadge.classList.add('hidden');
            }
        }
    }
}

function renderTableRoutine() {
    const table = document.getElementById('routine-table');
    const hideToggle = document.getElementById('hide-absent-toggle');
    if(!table || !hideToggle) return;
    
    // Sync view switcher buttons and dropdown
    const viewSelect = document.getElementById('routine-view-select');
    if (viewSelect) {
        viewSelect.value = state.routineViewMode || 'teacher';
    }
    document.querySelectorAll('.view-seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === (state.routineViewMode || 'teacher'));
    });

    // Sync Master Baseline Edit mode banner & body styling
    const masterBanner = document.getElementById('master-edit-banner');
    if (masterBanner) {
        masterBanner.classList.toggle('hidden', !state.isMasterEditMode);
    }
    document.body.classList.toggle('master-edit-mode', !!state.isMasterEditMode);

    if (state.routineViewMode === 'class') {
        renderClassRoutineTable(table);
        return;
    }

    const hideAbsent = hideToggle.checked;
    const conflicts = findConflicts();
    
    let html = '<thead><tr><th class="teacher-header-cell">Teacher Name</th>';
    periods.forEach((p, idx) => {
        let label = p;
        if (p === 'PLAYTIME / 2ND GOLDEN HOUR') {
            label = 'PLAYTIME<span class="period-sub-header">2ND GOLDEN HR</span>';
        } else if (p === 'G/PD') {
            label = 'G/PD<span class="period-sub-header">GOLDEN HR</span>';
        }
        html += `<th data-period="${p}" data-col="${idx + 1}" title="${p}">${label}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    const sortedRoutineTeachers = [...teachers].sort((a, b) => {
        const aIsCT = !!classTeacherMap[a];
        const bIsCT = !!classTeacherMap[b];
        if (aIsCT && !bIsCT) return -1;
        if (!aIsCT && bIsCT) return 1;
        return teachers.indexOf(a) - teachers.indexOf(b);
    });
    
    sortedRoutineTeachers.forEach(teacher => {
        const isAbsent = state.absentTeachers.has(teacher);
        if (isAbsent && hideAbsent) return;

        const staffInfo = staffDirectory[teacher];
        const ctSec = classTeacherMap[teacher];
        const isOffAC = !isAbsent && state.officiatingAC?.[state.day] === teacher && state.absentTeachers.has(PRIMARY_AC) && state.absentTeachers.has(ASSISTANT_AC);
        const offCTSecs = !isAbsent ? getOfficiatingCTSectionsForTeacher(teacher, state.day) : [];
        const isUnavailable = isTeacherSubUnavailable(teacher, state.day);
        const unavailRemark = getTeacherSubUnavailableRemark(teacher, state.day);

        let teacherBadges = '';
        if (teacher === PRIMARY_AC) {
            teacherBadges += `<span class="ct-badge-mini" style="background:rgba(0,122,255,0.12); color:var(--accent-blue);">AC</span>`;
        } else if (teacher === ASSISTANT_AC) {
            teacherBadges += `<span class="ct-badge-mini" style="background:rgba(0,122,255,0.12); color:var(--accent-blue);">Asst AC</span>`;
        }
        if (ctSec) {
            teacherBadges += `<span class="ct-badge-mini">CT ${ctSec}</span>`;
        }
        if (isOffAC) {
            teacherBadges += `<span class="off-badge-mini">⚡ Off. AC</span>`;
        }
        offCTSecs.forEach(sec => {
            teacherBadges += `<span class="off-badge-mini">📋 Off. CT. ${sec}</span>`;
        });
        if (isUnavailable && !isAbsent) {
            teacherBadges += `<span class="badge-sub-unavail-grid" title="Unavailable for substitution today">⛔ <button type="button" class="btn-sub-reason-help" data-teacher="${escapeHtml(teacher)}" data-remark="${escapeHtml(unavailRemark)}" title="Click to view remark">?</button></span>`;
        }

        const fullNameSub = staffInfo?.fullName ? `<div class="teacher-fullname-sub" style="font-size:10px; color:var(--text-secondary); font-weight:normal; margin-top:1px;">${staffInfo.fullName}</div>` : '';
        
        html += `<tr class="${isAbsent ? 'row-absent' : ''}">`;
        html += `<td class="teacher-cell" data-teacher="${teacher}" title="${staffInfo?.fullName || teacher} - ${staffInfo?.role || ''}">
            <div class="teacher-name-title" style="font-weight:700;">${teacher}</div>
            ${fullNameSub}
            <div class="teacher-badges-container" style="margin-top:2px; display:flex; flex-wrap:wrap; gap:2px;">${teacherBadges}</div>
        </td>`;
        
        periods.forEach(period => {
            if (period === 'BREAK' || period === 'BREAKFAST BREAK' || period === 'BREAKFAST') {
                html += `<td style="background:var(--static-cell-bg); text-align:center; color:var(--text-secondary);">-</td>`;
                return;
            }
            
            const task = state.schedule[state.day]?.[period]?.[teacher] || 'Free';
            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher];
            const assignedSub = isAbsent ? state.substitutions[state.day]?.[period]?.[teacher] : null;
            
            // Check if this teacher is covering for an absent colleague in THIS EXACT PERIOD
            let coveringFor = null;
            let coveringSourcePeriod = null;
            const daySubs = state.substitutions[state.day];
            if (daySubs) {
                // Check all periods for any substitution assigned to this teacher in 'period'
                for (const [sPeriod, subMap] of Object.entries(daySubs)) {
                    for (const [absT, subT] of Object.entries(subMap)) {
                        if (subT === teacher && state.absentTeachers.has(absT)) {
                            // Find corresponding action in actionHistory to match exact targetPeriod
                            const matchAction = [...state.actionHistory.grid].reverse().find(a => 
                                (a.type === 'sub' && a.day === state.day && a.subTeacher === teacher && a.absentTeacher === absT)
                            );
                            const activeTargetPeriod = matchAction ? (matchAction.targetPeriod || matchAction.period) : sPeriod;
                            if (activeTargetPeriod === period) {
                                coveringFor = absT;
                                coveringSourcePeriod = sPeriod;
                                break;
                            }
                        }
                    }
                    if (coveringFor) break;
                }
            }

            const isMissingSub = isAbsent && baseTask && baseTask !== 'Free' && !assignedSub;
            
            let cellClasses = [];
            let cellContent = '';
            let cellTitle = '';
            let isDraggable = false;
            let clickHandler = '';

            const haloEnabled = state.settings?.subHaloIndicator !== false;
            const haloColor = state.settings?.subHaloColor || 'emerald';

            if (isMissingSub) {
                cellClasses.push('cell-missing');
                cellContent = `
                    <div class="cell-missing-content">
                        <div class="missing-task">${formatTaskCellContent(baseTask)}</div>
                        <span class="missing-hint">Drag to Sub</span>
                    </div>
                `;
                cellTitle = `${teacher} is absent. Drag this cell to an available teacher to assign substitute, or tap to choose.`;
                isDraggable = true;
                clickHandler = state.isEditMode 
                    ? `onclick="handleGridInteraction('${period}', '${teacher}')"` 
                    : `onclick="openBottomSheet('${period}', '${teacher}')"`;

            } else if (assignedSub) {
                cellClasses.push('cell-covered');
                if (haloEnabled) {
                    cellClasses.push('sub-halo-active', `sub-halo-${haloColor}`);
                }
                const subStatusInfo = getSubStatusObj(state.day, period, teacher);
                const statusIcon = subStatusInfo.status === 'accepted' ? '🔒 ' : (subStatusInfo.status === 'disputed' ? '⚑ ' : '↳ ');
                const subShort = assignedSub.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
                cellContent = `
                    <div class="cell-covered-content">
                        <div class="covered-task">${formatTaskCellContent(baseTask)}</div>
                        <span class="covered-by-tag">${statusIcon}${subShort}</span>
                    </div>
                `;
                cellTitle = `Covered by ${assignedSub} (${subStatusInfo.status}). Drag to reassign substitute, or tap to manage.`;
                isDraggable = true;
                clickHandler = state.isEditMode 
                    ? `onclick="handleGridInteraction('${period}', '${teacher}')"` 
                    : `onclick="openBottomSheet('${period}', '${teacher}')"`;

            } else if (coveringFor) {
                cellClasses.push('cell-sub-active');
                if (haloEnabled) {
                    cellClasses.push('sub-halo-active', `sub-halo-${haloColor}`);
                }
                const periodNote = coveringSourcePeriod !== period ? ` [from ${coveringSourcePeriod}]` : '';
                const subStatusInfo = getSubStatusObj(state.day, coveringSourcePeriod || period, coveringFor);
                const statusBadgePrefix = subStatusInfo.status === 'accepted' ? '🔒 ' : (subStatusInfo.status === 'disputed' ? '⚑ ' : '');
                const covShort = coveringFor.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
                cellContent = `
                    <div class="cell-sub-content">
                        <div class="sub-task">${formatTaskCellContent(task)}</div>
                        <span class="sub-badge">${statusBadgePrefix}Sub (${covShort})</span>
                    </div>
                `;
                cellTitle = `Substituting for ${coveringFor}${periodNote} (${subStatusInfo.status}). Drag to another teacher to reassign, or drag back to ${coveringFor} to unassign.`;
                isDraggable = true;
                clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';

            } else if (task !== 'Free') {
                cellClasses.push('cell-assigned');
                cellContent = formatTaskCellContent(task);

                const coPartners = getCoTeachingPartners(state.day, period, teacher);
                const hasCoPartners = coPartners.length > 0;
                const isCoActive = hasCoPartners && isActivelyCoTeaching(state.day, period, teacher);
                const isCoSolo = hasCoPartners && (task === baseTask) && !isCoActive;

                if (isCoActive) {
                    cellClasses.push('cell-shared');
                    cellContent += `<span class="shared-badge" title="Co-teaching with ${coPartners.join(', ')}">👥</span>`;
                    cellTitle = `${teacher}: ${task} (Co-teaching with ${coPartners.join(', ')})`;
                } else if (isCoSolo) {
                    cellClasses.push('cell-shared', 'cell-shared-solo');
                    cellContent += `<span class="shared-badge shared-badge-solo" title="Co-teaching with ${coPartners.join(', ')} (Partner split - covering solo)">👥</span>`;
                    cellTitle = `${teacher}: ${task} (Co-teaching with ${coPartners.join(', ')} - partner split)`;
                } else {
                    cellTitle = `${teacher}: ${task}`;
                }

                isDraggable = state.isEditMode;
                if (hasCoPartners) {
                    clickHandler = `onclick="handleCoTeachingClick('${period}', '${teacher}', event)"`;
                } else {
                    clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';
                }

            } else {
                // Free cell
                cellContent = '';
                const coPartners = getCoTeachingPartners(state.day, period, teacher);
                if (coPartners.length > 0) {
                    cellClasses.push('cell-shared');
                    cellContent += `<span class="shared-badge shared-badge-solo" title="Released co-teacher (Free)">👥</span>`;
                    cellTitle = `${teacher} is Free (Released from ${baseTask} with ${coPartners.join(', ')})`;
                    clickHandler = `onclick="handleCoTeachingClick('${period}', '${teacher}', event)"`;
                } else {
                    cellTitle = `${teacher} is Free in ${period}`;
                    clickHandler = state.isEditMode ? `onclick="handleGridInteraction('${period}', '${teacher}')"` : '';
                }
                isDraggable = false;
            }

            // Check Conflict for this cell
            const cellKey = `${period}::${teacher}`;
            const conflictInfo = conflicts.collisionCells.get(cellKey);
            if (conflictInfo) {
                cellClasses.push('cell-collision');
                cellTitle += `\n⚠ CONFLICT: ${conflictInfo.reasons.join('; ')}`;
                cellContent += `<span class="collision-badge" title="${conflictInfo.reasons.join('; ')}">⚠ Conflict</span>`;
            }

            if (selectedCell && selectedCell.type === 'grid' && selectedCell.period === period && selectedCell.teacher === teacher) {
                cellClasses.push('cell-selected');
            }

            // Apply contextual drop animations and ghost slide
            if (lastDisplacedDrop && lastDisplacedDrop.period === period && lastDisplacedDrop.teacher === teacher) {
                cellClasses.push('cell-displaced-flash');
                cellContent = `
                    <div style="position:relative; z-index:2; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">${cellContent}</div>
                    <div class="ghost-displaced">${lastDisplacedDrop.oldTask}</div>
                `;
            } else if (lastDroppedCell && lastDroppedCell.period === period && lastDroppedCell.teacher === teacher) {
                cellClasses.push('cell-just-dropped');
            } else if (lastResetCells && lastResetCells.some(c => c.period === period && c.teacher === teacher)) {
                cellClasses.push('cell-just-reset');
            }
            
            const dragAttrs = isDraggable && !state.isMasterEditMode ? `draggable="true"` : '';
            if (state.isMasterEditMode) {
                clickHandler = `onclick="handleMasterCellClick('${period}', '${teacher}')"`;
                cellTitle = `🛠 Click to edit baseline allocation for ${teacher} in ${period}`;
            }
            
            html += `<td class="${cellClasses.join(' ')}" style="cursor:pointer;" title="${cellTitle}" data-period="${period}" data-teacher="${teacher}" ${clickHandler} ${dragAttrs}>${cellContent}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;

    // Attach in-situ long-press & right-click actions on teacher cells (FEAT-08)
    table.querySelectorAll('.teacher-cell').forEach(cell => {
        const teacher = cell.dataset.teacher;
        if (!teacher) return;

        let touchTimer = null;
        let isLongPress = false;

        cell.addEventListener('touchstart', () => {
            isLongPress = false;
            touchTimer = setTimeout(() => {
                isLongPress = true;
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate([45, 60]); } catch (_) {}
                }
                openTeacherQuickActionModal(teacher);
            }, 500);
        }, { passive: true });

        cell.addEventListener('touchend', (e) => {
            if (touchTimer) clearTimeout(touchTimer);
            if (isLongPress) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });

        cell.addEventListener('touchmove', () => {
            if (touchTimer) clearTimeout(touchTimer);
        });

        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(40); } catch (_) {}
            }
            openTeacherQuickActionModal(teacher);
        });
    });
}

function renderClassRoutineTable(table) {
    const conflicts = findConflicts();
    
    let html = '<thead><tr><th class="class-header-cell">Class</th>';
    periods.forEach((p, idx) => {
        let label = p;
        if (p === 'PLAYTIME / 2ND GOLDEN HOUR') {
            label = 'PLAYTIME<span class="period-sub-header">2ND GOLDEN HR</span>';
        } else if (p === 'G/PD') {
            label = 'G/PD<span class="period-sub-header">GOLDEN HR</span>';
        }
        html += `<th data-period="${p}" data-col="${idx + 1}" title="${p}">${label}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    classes.forEach(cls => {
        const team = classTeams[cls] || {};
        const ctName = team.classTeacher || '';
        const isCTAbsent = state.absentTeachers.has(ctName);
        const offCT = state.officiatingCT?.[state.day]?.[cls];
        
        let teamSubtext = '';
        if (ctName) {
            const ctShort = ctName.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
            if (isCTAbsent && offCT) {
                const offCTShort = offCT.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
                teamSubtext = `<span style="color:var(--accent-pink);">CT ${ctShort} (Abs)</span> • <span style="color:var(--accent-orange); font-weight:700;">⚡ Off. CT.: ${offCTShort}</span>`;
            } else if (isCTAbsent) {
                teamSubtext = `<span style="color:var(--accent-pink);">CT ${ctShort} (Absent)</span>`;
            } else {
                teamSubtext = `CT: ${ctShort}`;
            }
        }
        if (team.secondTeacher) {
            const secShort = team.secondTeacher.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
            teamSubtext += ` • 2nd: ${secShort}`;
        }
        if (team.thirdTeacher) {
            const thirdShort = team.thirdTeacher.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
            teamSubtext += ` • 3rd: ${thirdShort}`;
        }

        html += `<tr>`;
        html += `<td class="class-name-cell">
            <div class="class-title-text">${cls}</div>
            <div class="class-team-subtext">${teamSubtext}</div>
        </td>`;

        periods.forEach(period => {
            if (period === 'BREAK' || period === 'BREAKFAST BREAK' || period === 'BREAKFAST') {
                html += `<td style="background:var(--static-cell-bg); text-align:center; color:var(--text-secondary);">-</td>`;
                return;
            }

            // Find all teacher assignments for this class in this period
            const assignedTeachersMap = new Map(); // key -> entry info

            // 1. Expected assignments from baseSchedule
            teachers.forEach(t => {
                const baseTask = state.baseSchedule[state.day]?.[period]?.[t];
                if (baseTask && extractClassSections(baseTask).includes(cls)) {
                    const isAbsent = state.absentTeachers.has(t);
                    const subTeacher = state.substitutions[state.day]?.[period]?.[t];

                    if (isAbsent && !subTeacher) {
                        // Absent and uncovered
                        assignedTeachersMap.set(`missing_${t}`, {
                            task: baseTask,
                            teacher: t,
                            isMissing: true,
                            absentTeacher: t
                        });
                    } else if (isAbsent && subTeacher) {
                        // Absent and covered by substitute
                        const subStatus = getSubStatusObj(state.day, period, t);
                        assignedTeachersMap.set(`sub_${t}`, {
                            task: baseTask,
                            teacher: subTeacher,
                            isSub: true,
                            absentTeacher: t,
                            subStatus
                        });
                    } else {
                        // Present teacher originally scheduled
                        const activeTask = state.schedule[state.day]?.[period]?.[t];
                        if (activeTask && extractClassSections(activeTask).includes(cls)) {
                            assignedTeachersMap.set(t, {
                                task: activeTask,
                                teacher: t,
                                isBase: true
                            });
                        } else {
                            // Diverted as a sub for someone else, or task moved
                            assignedTeachersMap.set(`diverted_${t}`, {
                                task: baseTask,
                                teacher: t,
                                isDiverted: true
                            });
                        }
                    }
                }
            });

            // 2. Extra assignments in current schedule not originally in base
            teachers.forEach(t => {
                if (state.absentTeachers.has(t)) return;
                const activeTask = state.schedule[state.day]?.[period]?.[t];
                if (activeTask && extractClassSections(activeTask).includes(cls)) {
                    const baseTask = state.baseSchedule[state.day]?.[period]?.[t];
                    if (!baseTask || !extractClassSections(baseTask).includes(cls)) {
                        // Check if teacher is already represented as a substitute above
                        let isCoveringAbsent = false;
                        for (const item of assignedTeachersMap.values()) {
                            if (item.isSub && item.teacher === t) {
                                isCoveringAbsent = true;
                                break;
                            }
                        }
                        if (!isCoveringAbsent) {
                            assignedTeachersMap.set(`additional_${t}`, {
                                task: activeTask,
                                teacher: t,
                                isAdditional: true
                            });
                        }
                    }
                }
            });

            const entries = Array.from(assignedTeachersMap.values());
            let cellClasses = ['class-routine-cell'];
            let cellContent = '';
            let cellTitle = `${cls} • ${period}`;
            let hasMissing = entries.some(e => e.isMissing);
            let hasCovered = entries.some(e => e.isSub);
            let hasCollision = false;

            // Check if any teacher in this class slot has a collision
            entries.forEach(e => {
                const tName = e.teacher;
                if (tName && !e.isMissing) {
                    const cKey = `${period}::${tName}`;
                    if (conflicts.collisionCells.has(cKey)) {
                        hasCollision = true;
                    }
                }
            });

            if (hasCollision) {
                cellClasses.push('cell-collision');
            }
            if (hasMissing) {
                cellClasses.push('cell-missing');
            } else if (hasCovered) {
                cellClasses.push('cell-covered');
            }

            if (entries.length === 0) {
                cellContent = '<span style="color:var(--text-tertiary); font-size:11px;">Free</span>';
            } else {
                // Group entries by subject/task name
                const taskGroups = {};
                entries.forEach(entry => {
                    let subj = entry.task;
                    classes.forEach(c => {
                        subj = subj.replace(new RegExp(`\\b${c}\\b`, 'gi'), '');
                    });
                    subj = subj.replace(/\+/g, '').trim();
                    if (!taskGroups[subj]) taskGroups[subj] = [];
                    taskGroups[subj].push(entry);
                });

                const groupHtmls = Object.entries(taskGroups).map(([subj, groupEntries]) => {
                    const pills = groupEntries.map(e => {
                        const tShort = e.teacher.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
                        if (e.isMissing) {
                            return `<span class="class-teacher-pill pill-missing" style="cursor:pointer;" onclick="openBottomSheet('${period}', '${e.absentTeacher}')" title="${e.absentTeacher} is absent. Click to assign substitute.">⚠ ${tShort}</span>`;
                        } else if (e.isSub) {
                            const icon = e.subStatus?.status === 'accepted' ? '🔒 ' : (e.subStatus?.status === 'disputed' ? '⚑ ' : '↳ ');
                            const absShort = e.absentTeacher.replace(/^(Mrs\.|Ms\.|Mr\.)\s*/, '');
                            return `<span class="class-teacher-pill pill-sub" style="cursor:pointer;" onclick="openBottomSheet('${period}', '${e.absentTeacher}')" title="Sub ${e.teacher} for ${e.absentTeacher} (${e.subStatus?.status}). Click to manage.">${icon}${tShort} (${absShort})</span>`;
                        } else if (e.isDiverted) {
                            return `<span class="class-teacher-pill" style="opacity:0.6; text-decoration:line-through;" title="${e.teacher} reassigned elsewhere">${tShort}</span>`;
                        } else {
                            const isCo = groupEntries.length > 1;
                            const coClass = isCo ? 'pill-coteach' : '';
                            return `<span class="class-teacher-pill ${coClass}" style="cursor:pointer;" onclick="handleCoTeachingClick('${period}', '${e.teacher}', event)" title="${e.teacher}">${tShort}</span>`;
                        }
                    }).join(' ');

                    return `<div class="class-routine-item"><span class="class-sub-title">${subj}</span><div style="display:flex; flex-wrap:wrap; gap:3px; justify-content:center;">${pills}</div></div>`;
                });

                cellContent = groupHtmls.join('<div style="height:4px;"></div>');
            }

            html += `<td class="${cellClasses.join(' ')}" title="${cellTitle}">${cellContent}</td>`;
        });

        html += `</tr>`;
    });

    html += '</tbody>';
    table.innerHTML = html;
}

function renderDisplacedTray() {
    const indicator = document.getElementById('displaced-indicator');
    const wrapper = document.getElementById('limbo-wrapper');
    const tray = document.getElementById('displaced-tray');
    if(!indicator || !wrapper || !tray) return;

    const items = state.displaced[state.day] || [];
    
    if (items.length > 0) {
        indicator.classList.remove('hidden');
        wrapper.classList.add('active');
        tray.innerHTML = '';
        
        items.forEach(item => {
            const isSelected = selectedCell && selectedCell.type === 'displaced' && selectedCell.item.id === item.id;
            const isNew = item.id === newlyDisplacedItemId;
            
            const div = document.createElement('div');
            // PopIn applies ONLY to newly displaced item. Rest just lay flat.
            div.className = `displaced-item ${isSelected ? 'selected' : ''} ${isNew ? 'item-newly-displaced' : ''}`;
            div.draggable = true;
            div.dataset.id = item.id;
            div.title = `Click to restore to ${item.ogTeacher} (${item.period}) or drag onto any cell`;
            div.innerHTML = `
                <span>${item.task}</span>
                <span class="og-teacher">From: ${item.ogTeacher} (${item.period})</span>
            `;
            
            div.onclick = (e) => {
                e.stopPropagation();
                handleDisplacedCardClick(item, div);
            };

            div.ondragstart = (e) => {
                draggedData = { 
                    type: 'displaced', 
                    item: item, 
                    element: div, 
                    wasDroppedSuccessfully: false 
                };
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
                scrollSpeed = 0;
                setTimeout(() => div.classList.add('cell-dragging'), 0);
            };

            div.ondragend = () => { 
                if (draggedData && draggedData.type === 'displaced' && !draggedData.wasDroppedSuccessfully) {
                    triggerErrorJitter(div, `Could not place ${item.task}. Drop onto an available grid cell.`);
                }
                draggedData = null; 
                scrollSpeed = 0; 
                div.classList.remove('cell-dragging');
            };

            tray.appendChild(div);
        });
    } else {
        indicator.classList.add('hidden');
        wrapper.classList.remove('active');
    }
}

// --- PRIORITY PREFERENCE MATRIX & SUBJECT/GRADE AFFINITY ENGINE ---
const teacherPreferences = {
    'Mrs. S. Lakra': { dept: 'English & Math', cluster: 'CORE', subjects: ['ENG. REC.', 'ENG. WR.', 'ENG. ORAL', 'ENG. ACT.', 'ENG. CONV.', 'ENG. STORY', 'M. SC.', 'M. ORAL', 'M. PR.', 'M. NO. WK.', 'M. ACT.', 'SUB. TABLE', 'SING.'], sections: ['KG A', 'KG B'] },
    'Mrs. M. Midha':  { dept: 'English & Math', cluster: 'CORE', subjects: ['ENG. REC.', 'ENG. WR.', 'ENG. ORAL', 'ENG. ACT.', 'ENG. CONV.', 'ENG. STORY', 'M. SC.', 'M. ORAL', 'M. PR.', 'M. NO. WK.', 'M. ACT.', 'SUB. TABLE', 'SING.'], sections: ['KG B', 'KG A'] },
    'Mrs. R. Pahwa':  { dept: 'English & Math', cluster: 'CORE', subjects: ['ENG.', 'ENG. REC.', 'ENG. WR.', 'ENG. LANG.', 'ENG. LIT.', 'ENG. SPELL.', 'ENG. CR. WR.', 'M. SC.', 'M. GEN.', 'M. Bas.', 'M. NO. WK.', 'ST. TIME.', 'SING.'], sections: ['PREP A', 'PREP B'] },
    'Mrs. R. Narayan':{ dept: 'English & Math', cluster: 'CORE', subjects: ['ENG.', 'ENG. REC.', 'ENG. WR.', 'ENG. LANG.', 'ENG. LIT.', 'ENG. SPELL.', 'ENG. CR. WR.', 'M. SC.', 'M. GEN.', 'M. Bas.', 'M. NO. WK.', 'ST. TIME.', 'SING.'], sections: ['PREP B', 'PREP A'] },
    'Ms. N. Horo':   { dept: 'Hindi', cluster: 'HINDI', subjects: ['HIN. KAV./GEET', 'HIN. LIK. KAR.', 'HIN. KAH.', 'HIN. VYAK.', 'HIN. SUL.', 'HIN. KAR. PUS.', 'HIN. SAHIT.'], sections: ['KG A', 'PREP A'] },
    'Ms. K. Sanga':  { dept: 'Hindi', cluster: 'HINDI', subjects: ['HIN. KAV./GEET', 'HIN. LIK. KAR.', 'HIN. KAH.', 'HIN. VYAK.', 'HIN. SUL.', 'HIN. KAR. PUS.', 'HIN. SAHIT.'], sections: ['KG B', 'PREP B'] },
    'Ms. A. Amira':  { dept: 'Holistic & Activity', cluster: 'HOLISTIC', subjects: ['GK', 'HT', 'NT', 'DR.', 'CR.', 'GAMES', 'DRILL', '1ST DRILL'], sections: ['KG A', 'PREP A'] },
    'Mrs. S. Bage':   { dept: 'Holistic & Activity', cluster: 'HOLISTIC', subjects: ['GK', 'HT', 'NT', 'DR.', 'CR.', 'GAMES', 'DRILL', '2ND DRILL'], sections: ['KG B', 'PREP B'] },
    'Mr. S. A. Lakra':{ dept: 'Sports, Drill & Support', cluster: 'SUPPORT', subjects: ['GAMES', 'DRILL', '1ST DRILL', '2ND DRILL', 'SING.', 'GK', 'HIN. KAV./GEET'], sections: ['KG A', 'KG B', 'PREP A', 'PREP B'] }
};

function parseTaskDetails(task) {
    if (!task || task === 'Free' || task === '-') {
        return { subjectPrefix: '', section: '', grade: null, dept: 'General', cluster: 'GENERAL' };
    }
    const clean = task.trim().toUpperCase();
    const section = extractClassSection(clean) || '';
    let subjectPrefix = clean;
    if (section) {
        subjectPrefix = clean.replace(section, '').replace(/\+.*$/, '').trim();
    }

    let dept = 'General';
    let cluster = 'GENERAL';
    for (const prof of Object.values(teacherPreferences)) {
        if (prof.subjects.some(s => subjectPrefix.startsWith(s) || s.startsWith(subjectPrefix))) {
            dept = prof.dept;
            cluster = prof.cluster;
            break;
        }
    }
    return { subjectPrefix, section, dept, cluster };
}

function getTeacherDailyStats(teacher, day, customSchedule = null) {
    const sched = customSchedule || state.schedule[day] || {};
    let teachingLoad = 0;
    let totalSlots = 0;
    periods.forEach(p => {
        if (p === 'BREAK' || p === 'BREAKFAST BREAK' || p === 'BREAKFAST') return;
        totalSlots++;
        const t = sched[p]?.[teacher];
        if (t && t !== 'Free' && t !== '-') {
            teachingLoad++;
        }
    });
    return {
        teachingLoad,
        freePeriods: Math.max(0, totalSlots - teachingLoad),
        totalSlots
    };
}

function doesTeacherTeachSection(teacher, section, day) {
    if (!section) return false;
    const dayBase = state.baseSchedule[day] || {};
    for (const p of periods) {
        const task = dayBase[p]?.[teacher];
        if (task && extractClassSections(task).includes(section)) {
            return true;
        }
    }
    return false;
}

function evaluateTeacherAffinity(subTeacher, taskToCover, period, day = state.day, customSchedule = null) {
    const pref = teacherPreferences[subTeacher] || { dept: 'General', cluster: 'GENERAL', subjects: [], sections: [] };
    const taskInfo = parseTaskDetails(taskToCover);
    const stats = getTeacherDailyStats(subTeacher, day, customSchedule);

    let score = 0;
    const reasons = [];
    let primaryBadge = '';

    // 0. Official Curriculum Allocation from Excel Table 2
    if (taskInfo.section && taskInfo.subjectPrefix && typeof subjectAllocations !== 'undefined') {
        const alloc = subjectAllocations.find(a => 
            a.class === taskInfo.section && 
            (taskInfo.subjectPrefix.includes(a.subject) || a.subject.includes(taskInfo.subjectPrefix))
        );
        if (alloc && alloc.assignedTeachers.includes(subTeacher)) {
            score += 48;
            reasons.push('Curriculum Allocated Teacher');
            primaryBadge = '★ Official Alloc';
        }
    }

    // 1. Class Team Member Priority (2nd Teacher or Support assigned to this class)
    if (taskInfo.section && classTeams[taskInfo.section]) {
        const team = classTeams[taskInfo.section];
        if (team.second === subTeacher || team.support === subTeacher) {
            score += 42;
            reasons.push(`${taskInfo.section} Team Partner`);
            if (!primaryBadge) primaryBadge = `★ ${taskInfo.section} Team`;
        }
    }

    // 2. Subject & Department Affinity
    const isSubMatch = pref.subjects.some(s => taskInfo.subjectPrefix.startsWith(s) || s.startsWith(taskInfo.subjectPrefix));
    if (isSubMatch) {
        score += 38;
        reasons.push('Subject Specialist');
        if (!primaryBadge) primaryBadge = '★ Subject Match';
    } else if (taskInfo.cluster && pref.cluster === taskInfo.cluster) {
        score += 24;
        reasons.push(`${pref.dept} Affinity`);
        if (!primaryBadge) primaryBadge = '◆ Dept Match';
    }

    // 3. Class Section Familiarity
    if (taskInfo.section && doesTeacherTeachSection(subTeacher, taskInfo.section, day)) {
        score += 22;
        reasons.push(`Teaches ${taskInfo.section}`);
        if (!primaryBadge) primaryBadge = `Familiar (${taskInfo.section})`;
    } else if (taskInfo.section && pref.sections.includes(taskInfo.section)) {
        score += 15;
        reasons.push(`${taskInfo.section} Wing Fit`);
        if (!primaryBadge) primaryBadge = `${taskInfo.section} Fit`;
    }

    // 4. Workload Balance Bonus
    const loadBonus = Math.max(0, (stats.totalSlots - stats.teachingLoad) * 4);
    score += loadBonus;

    if (!primaryBadge) {
        primaryBadge = stats.teachingLoad <= 3 ? '⚖ Light Load' : 'Available';
    }

    return {
        score,
        reasons,
        primaryBadge,
        dept: pref.dept,
        taskDept: taskInfo.dept,
        teachingLoad: stats.teachingLoad,
        freePeriods: stats.freePeriods,
        totalSlots: stats.totalSlots
    };
}

function renderSubstitutions() {
    const conflictList = document.getElementById('conflict-list');
    const badge = document.getElementById('substitutions-badge');
    const autoBtn = document.getElementById('auto-resolve-btn');
    const summaryBar = document.getElementById('register-summary-bar');
    const statsPills = document.getElementById('register-stats-pills');
    if(!conflictList || !badge) return;
    
    conflictList.innerHTML = '';
    let conflicts = 0;
    let resolvedCount = 0;
    let acceptedCount = 0;
    let disputedCount = 0;
    let totalAbsences = 0;
    const rowsData = [];

    periods.forEach(period => {
        if (period === 'BREAK' || period === 'BREAKFAST BREAK' || period === 'BREAKFAST') return;
        teachers.forEach(teacher => {
            const isAbsent = state.absentTeachers.has(teacher);
            const subTeacher = state.substitutions[state.day]?.[period]?.[teacher];
            if (!isAbsent && !subTeacher) return;
            // Self-heal: ensure teacher is recognized as absent if a sub is currently assigned
            if (subTeacher && !isAbsent) {
                state.absentTeachers.add(teacher);
            }

            const baseTask = state.baseSchedule[state.day]?.[period]?.[teacher] 
                          || state.schedule[state.day]?.[period]?.[teacher] 
                          || 'Class';
            if (!baseTask || baseTask === 'Free' || baseTask === '' || baseTask === '-') return;

            totalAbsences++;
            const statusObj = getSubStatusObj(state.day, period, teacher);
            if (subTeacher) {
                resolvedCount++;
                if (statusObj.status === 'accepted') acceptedCount++;
                if (statusObj.status === 'disputed') disputedCount++;
            } else {
                conflicts++;
            }
            rowsData.push({
                period,
                absentTeacher: teacher,
                baseTask,
                subTeacher: subTeacher || null,
                statusObj
            });
        });
    });

    badge.textContent = conflicts;
    badge.className = `badge ${conflicts > 0 ? 'visible' : 'hidden'}`;
    badge.style.cssText = conflicts > 0 ? "background:var(--accent-red); color:white; padding:2px 6px; border-radius:10px; font-size:10px; position:absolute; top:-5px; right:15px;" : "display:none;";
    
    if (autoBtn) {
        if (conflicts > 0) {
            autoBtn.classList.remove('hidden');
        } else {
            autoBtn.classList.add('hidden');
        }
    }

    if (totalAbsences === 0) {
        if (summaryBar) summaryBar.classList.add('hidden');
        conflictList.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:48px; margin-bottom:10px;">🎉</div>
                <h3 style="color:var(--text-primary); margin-bottom:5px;">All Clear!</h3>
                <p style="color:var(--text-secondary); font-size:14px;">No absences marked for ${state.day}. Mark a teacher absent on the Grid tab to populate the Daily Substitution Register.</p>
            </div>
        `;
        return;
    }

    if (summaryBar && statsPills) {
        summaryBar.classList.remove('hidden');
        const pct = Math.round((resolvedCount / totalAbsences) * 100);
        statsPills.innerHTML = `
            <span class="reg-stat-pill">📋 Total: <b>${totalAbsences}</b></span>
            <span class="reg-stat-pill stat-pending">⚠ Pending: <b>${conflicts}</b></span>
            <span class="reg-stat-pill stat-covered">✓ Covered: <b>${resolvedCount} (${pct}%)</b></span>
            ${acceptedCount > 0 ? `<span class="reg-stat-pill stat-covered">🔒 Accepted: <b>${acceptedCount}</b></span>` : ''}
            ${disputedCount > 0 ? `<span class="reg-stat-pill stat-pending">⚑ Disputed: <b>${disputedCount}</b></span>` : ''}
        `;
    }

    const filteredRows = rowsData.filter(r => {
        if (registerFilter === 'pending') return !r.subTeacher;
        if (registerFilter === 'covered') return Boolean(r.subTeacher);
        return true;
    });

    if (filteredRows.length === 0) {
        conflictList.innerHTML = `
            <div style="text-align:center; padding: 30px 16px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:14px; color:var(--text-secondary); font-size:13px;">
                No ${registerFilter} substitution entries for ${state.day}.
            </div>
        `;
        return;
    }

    const isCoord = hasCoordinatorPermissions();
    const disputesEnabled = state.settings.allowDisputes !== false;

    let tableHtml = `
        <div class="sub-register-wrapper">
            <table class="sub-register-table">
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Class & Dept</th>
                        <th>Absent Teacher</th>
                        <th>Assigned Substitute</th>
                        <th>Acceptance & Status</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredRows.forEach(row => {
        const { period, absentTeacher, baseTask, subTeacher, statusObj } = row;
        const taskInfo = parseTaskDetails(baseTask);

        if (subTeacher) {
            const affinity = evaluateTeacherAffinity(subTeacher, baseTask, period, state.day);
            const coPartners = getCoTeachingPartners(state.day, period, subTeacher);
            const isSplitSub = coPartners.length > 0;
            const timerKey = `${state.day}::${period}::${absentTeacher}`;
            const activeTimer = activeAcceptTimers.get(timerKey);

            // Check whether current user can press Accept/Dispute for this row
            const canTeacherAct = (state.currentRole !== 'teacher') || (state.activeTeacher === subTeacher) || isCoord;

            let statusCellHtml = '';
            if (activeTimer) {
                statusCellHtml = `
                    <button class="btn-accept-countdown" data-accept-timer="${timerKey}" onclick="cancelAcceptSub('${period}', '${absentTeacher}')" title="Click within 10 seconds to undo acceptance before server lock-in">
                        ⏳ Confirming ${activeTimer.remaining}s • <u>Undo</u>
                    </button>
                `;
            } else if (statusObj.status === 'accepted') {
                const isTimerLock = Boolean(state.settings?.acceptanceTimerEnabled);
                statusCellHtml = `
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span class="badge-accepted-locked" title="Accepted by ${statusObj.acceptedBy || subTeacher}.${isTimerLock ? ' Locked across the board.' : ''}">🔒 Accepted</span>
                        ${isSplitSub ? `<span class="reg-status-badge status-split" title="Split from co-teaching">👥 Split</span>` : ''}
                        ${(!isTimerLock && canTeacherAct && disputesEnabled) ? `<button class="btn-dispute-sub" onclick="openDisputeModal('${period}', '${absentTeacher}')" title="Dispute this substitution with an optional note">⚑ Dispute</button>` : ''}
                    </div>
                `;
            } else if (statusObj.status === 'disputed') {
                statusCellHtml = `
                    <div style="display:flex; flex-direction:column; align-items:flex-start; gap:3px;">
                        <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                            <span class="badge-disputed">⚑ Disputed</span>
                            ${canTeacherAct ? `<button class="btn-accept-sub" onclick="startAcceptSubCountdown('${period}', '${absentTeacher}')">✓ Accept</button>` : ''}
                        </div>
                        <div class="dispute-reason-note" title="${statusObj.reason}">“${statusObj.reason}”</div>
                    </div>
                `;
            } else {
                const baseBadge = isSplitSub
                    ? `<span class="reg-status-badge status-split" title="Split from co-teaching with ${coPartners.join(', ')}">👥 Split Sub</span>`
                    : `<span class="reg-status-badge status-covered">✓ Assigned</span>`;

                const acceptTooltip = state.settings?.acceptanceTimerEnabled
                    ? `Accept substitution (${state.settings?.acceptanceTimerDuration || 10}s countdown timer)`
                    : 'Accept substitution';

                statusCellHtml = `
                    <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        ${baseBadge}
                        ${canTeacherAct ? `<button class="btn-accept-sub" onclick="startAcceptSubCountdown('${period}', '${absentTeacher}')" title="${acceptTooltip}">✓ Accept</button>` : ''}
                        ${(canTeacherAct && disputesEnabled) ? `<button class="btn-dispute-sub" onclick="openDisputeModal('${period}', '${absentTeacher}')" title="Dispute this substitution with an optional note">⚑ Dispute</button>` : ''}
                    </div>
                `;
            }

            // Build Actions column respecting lock-in permissions
            let actionsHtml = '';
            if (state.settings?.acceptanceTimerEnabled && statusObj.status === 'accepted' && !isCoord) {
                actionsHtml = `
                    <div class="reg-actions-cell">
                        <span style="font-size:11px; color:var(--text-secondary); font-weight:600;" title="Locked after acceptance countdown. Only Admin or Academic Coordinator can remove or reassign.">🔒 Locked</span>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div class="reg-actions-cell">
                        ${(statusObj.status === 'accepted' && isCoord) ? `<button class="btn-reg-reassign" style="color:var(--accent-orange);" onclick="revokeAcceptedSub('${period}', '${absentTeacher}')" title="Coordinator: Remove locked acceptance">🔓 Unlock</button>` : ''}
                        ${(statusObj.status === 'disputed' && isCoord) ? `<button class="btn-reg-reassign" onclick="dismissDispute('${period}', '${absentTeacher}')" title="Coordinator: Dismiss dispute flag">Clear ⚑</button>` : ''}
                        <button class="btn-reg-reassign" onclick="openBottomSheet('${period}', '${absentTeacher}')">Reassign</button>
                        <button class="btn-reg-unassign" title="Unassign Substitute" onclick="unassignSubstitute('${period}', '${absentTeacher}')">✕</button>
                    </div>
                `;
            }

            tableHtml += `
                <tr class="reg-row-covered">
                    <td class="reg-cell-period"><span class="reg-period-badge">${period}</span></td>
                    <td class="reg-cell-task">
                        <span class="reg-class-pill">${baseTask}</span>
                        <span class="reg-dept-tag">${taskInfo.dept}</span>
                    </td>
                    <td class="reg-cell-absent"><span class="reg-teacher-name absent-name" style="text-decoration:line-through;">${absentTeacher}</span></td>
                    <td class="reg-cell-sub">
                        <strong class="reg-teacher-name sub-name">${subTeacher}</strong>
                        <span class="reg-affinity-tag" title="Score: ${affinity.score} pts • Load: ${affinity.teachingLoad}/${affinity.totalSlots} pds">${affinity.primaryBadge}</span>
                    </td>
                    <td class="reg-cell-status">${statusCellHtml}</td>
                    <td class="reg-cell-actions">${actionsHtml}</td>
                </tr>
            `;
        } else {
            tableHtml += `
                <tr class="reg-row-pending">
                    <td class="reg-cell-period"><span class="reg-period-badge">${period}</span></td>
                    <td class="reg-cell-task">
                        <span class="reg-class-pill" style="color:var(--accent-pink);">${baseTask}</span>
                        <span class="reg-dept-tag">${taskInfo.dept}</span>
                    </td>
                    <td class="reg-cell-absent"><strong class="reg-teacher-name absent-name">${absentTeacher}</strong></td>
                    <td class="reg-cell-sub"><span class="reg-teacher-name" style="color:var(--text-secondary); font-style:italic; font-size:12px;">Unassigned</span></td>
                    <td class="reg-cell-status"><span class="reg-status-badge status-pending">⚠ Needs Sub</span></td>
                    <td class="reg-cell-actions">
                        <div class="reg-actions-cell">
                            <button class="btn-reg-assign" onclick="openBottomSheet('${period}', '${absentTeacher}')">+ Assign Sub</button>
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    conflictList.innerHTML = tableHtml;
}

// --- INTERACTION MECHANICS ---

function handleGridInteraction(period, teacher) {
    if (!state.isEditMode) return;
    
    if (!selectedCell) {
        selectedCell = { type: 'grid', period, teacher };
        renderAll();
    } else if (selectedCell.type === 'grid' && selectedCell.period === period && selectedCell.teacher === teacher) {
        selectedCell = null; 
        renderAll();
    } else {
        executeMove(selectedCell, { period, teacher });
        selectedCell = null;
    }
}

function triggerErrorJitter(element, message = null) {
    if (element) {
        element.classList.remove('error-jitter');
        void element.offsetWidth; // Force DOM reflow to restart CSS animation
        element.classList.add('error-jitter');
        setTimeout(() => {
            if (element) element.classList.remove('error-jitter');
        }, 450);
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([45, 55, 45]); } catch (_) {}
    }
    if (message) {
        showToast(message, true);
    }
}
window.triggerErrorJitter = triggerErrorJitter;

function handleDisplacedCardClick(item, element) {
    if (!item) return;

    // If in edit mode and a grid cell was already selected, move to that cell
    if (state.isEditMode && selectedCell && selectedCell.type === 'grid') {
        executeMove({ type: 'displaced', item }, { period: selectedCell.period, teacher: selectedCell.teacher });
        selectedCell = null;
        return;
    }

    // Attempt to restore to original cell: item.ogTeacher at item.period
    const targetPeriod = item.period;
    const targetTeacher = item.ogTeacher;
    const currentTask = state.schedule[state.day]?.[targetPeriod]?.[targetTeacher] || 'Free';

    // 1. Is original cell blank/Free?
    if (currentTask === 'Free' || !currentTask || currentTask.trim() === '') {
        clearRedoStacks();
        state.schedule[state.day][targetPeriod][targetTeacher] = item.task;
        state.displaced[state.day] = (state.displaced[state.day] || []).filter(d => d.id !== item.id);

        const activeStack = getActiveHistoryStack();
        activeStack.push({
            type: 'restore_displaced',
            day: state.day,
            item: item,
            target: { period: targetPeriod, teacher: targetTeacher }
        });

        saveStateToStorage();
        updateUndoUI();
        showToast(`✓ Restored "${item.task}" to ${targetTeacher} (${targetPeriod}).`);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(25); } catch (_) {}
        }
        renderAll();
        return;
    }

    // 2. Original cell is occupied -> error jitter + haptic vibration
    triggerErrorJitter(element, `Cannot restore: ${targetTeacher}'s ${targetPeriod} is occupied by "${currentTask}". Drag onto another cell or clear it first.`);
}
window.handleDisplacedCardClick = handleDisplacedCardClick;

function handleDisplacedInteraction(item) {
    if (!state.isEditMode) return;
    
    if (!selectedCell) {
        selectedCell = { type: 'displaced', item: item };
        renderAll();
    } else if (selectedCell.type === 'displaced' && selectedCell.item.id === item.id) {
        selectedCell = null; 
        renderAll();
    } else if (selectedCell.type === 'grid') {
        selectedCell = { type: 'displaced', item: item };
        renderAll();
    }
}

function executeMove(source, target) {
    if (!source || !target) return;
    clearRedoStacks();

    // Check if source is a grid cell
    if (source.type === 'grid') {
        const sPeriod = source.period;
        const sTeacher = source.teacher;
        const tPeriod = target.period;
        const tTeacher = target.teacher;

        const sIsAbsent = state.absentTeachers.has(sTeacher);
        const sBaseTask = state.baseSchedule[state.day]?.[sPeriod]?.[sTeacher];
        const sAssignedSub = state.substitutions[state.day]?.[sPeriod]?.[sTeacher];

        const tIsAbsent = state.absentTeachers.has(tTeacher);
        const tBaseTask = state.baseSchedule[state.day]?.[tPeriod]?.[tTeacher];
        const tAssignedSub = state.substitutions[state.day]?.[tPeriod]?.[tTeacher];

        let sCoveringFor = null;
        const periodSubs = state.substitutions[state.day]?.[sPeriod];
        if (periodSubs) {
            for (const [absT, subT] of Object.entries(periodSubs)) {
                if (subT === sTeacher) {
                    sCoveringFor = absT;
                    break;
                }
            }
        }

        const isSourceSubRelated = (sIsAbsent && sBaseTask && sBaseTask !== 'Free') || sCoveringFor || sAssignedSub;
        const isTargetSubRelated = (tIsAbsent && tBaseTask && tBaseTask !== 'Free') || Boolean(tAssignedSub);
        const isSamePeriod = (sPeriod === tPeriod);
        const allowCrossPeriod = (!state.settings || state.settings.samePeriodLock === false);

        // --- SCENARIO 1: SUBSTITUTION ASSIGNMENT / REASSIGNMENT ---
        if (isSourceSubRelated && (isSamePeriod || allowCrossPeriod)) {
            // Cannot assign another absent teacher as sub (unless it's the original absent teacher being unassigned)
            if (state.absentTeachers.has(tTeacher) && tTeacher !== sCoveringFor) {
                showToast(`Cannot assign ${tTeacher} as substitute (they are marked absent).`);
                return;
            }

            // Subcase 1A: Dropping an active substitute back onto the original absent teacher -> Unassign
            if (sCoveringFor && tTeacher === sCoveringFor) {
                unassignSubstitute(sPeriod, sCoveringFor);
                return;
            }

            // Subcase 1B: Reassigning an active substitute to a new teacher
            if (sCoveringFor) {
                if (tTeacher === sTeacher && sPeriod === tPeriod) return;
                assignSubstitute(sPeriod, sCoveringFor, tTeacher, tPeriod);
                return;
            }

            // Subcase 1C: Assigning substitute from absent teacher cell (whether missing or covered)
            if (sIsAbsent) {
                if (tTeacher === sTeacher && sPeriod === tPeriod) return;
                assignSubstitute(sPeriod, sTeacher, tTeacher, tPeriod);
                return;
            }
        }

        // --- SCENARIO 1D: DROPPING A CANDIDATE TEACHER ONTO AN ABSENT TEACHER'S MISSING CELL ---
        if (!isSourceSubRelated && isTargetSubRelated) {
            if (sTeacher === tTeacher && sPeriod === tPeriod) return;
            if (state.absentTeachers.has(sTeacher)) {
                showToast(`Cannot assign ${sTeacher} as substitute (they are marked absent).`);
                return;
            }
            if (isTeacherSubUnavailable(sTeacher, state.day)) {
                showToast(`Cannot assign ${sTeacher} (marked unavailable today).`);
                return;
            }
            if (!isSamePeriod && !allowCrossPeriod) {
                showToast(`Substitutions locked to same period (${tPeriod}).`);
                return;
            }
            assignSubstitute(tPeriod, tTeacher, sTeacher, sPeriod);
            return;
        }

        // --- SCENARIO 2: ATTEMPTED SUB DRAG ACROSS DIFFERENT PERIODS WHEN LOCKED ---
        if ((isSourceSubRelated || isTargetSubRelated) && !isSamePeriod && !allowCrossPeriod) {
            showToast(`Substitutions locked to same period (${sPeriod || tPeriod}).`);
            return;
        }
    }

    if (source.type === 'displaced') {
        const tPeriod = target.period;
        const tTeacher = target.teacher;
        const tIsAbsent = state.absentTeachers.has(tTeacher);
        const tBaseTask = state.baseSchedule[state.day]?.[tPeriod]?.[tTeacher];
        const isTargetSubRelated = (tIsAbsent && tBaseTask && tBaseTask !== 'Free') || Boolean(state.substitutions[state.day]?.[tPeriod]?.[tTeacher]);
        if (isTargetSubRelated) {
            assignSubstitute(tPeriod, tTeacher, source.item.ogTeacher, tPeriod);
            state.displaced[state.day] = state.displaced[state.day].filter(d => d.id !== source.item.id);
            renderAll();
            return;
        }
    }

    // --- SCENARIO 3: REGULAR TIMETABLE EDIT (Edit Mode Move / Displaced Drag) ---
    let sTask = '';
    if (source.type === 'grid') {
        sTask = state.schedule[state.day][source.period][source.teacher];
    } else if (source.type === 'displaced') {
        sTask = source.item.task;
    }

    const tTask = state.schedule[state.day][target.period][target.teacher]; 
    let newlyDisplaced = null;
    let wasDisplaced = false;

    if (tTask !== 'Free') {
        wasDisplaced = true;
        newlyDisplaced = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            task: tTask,
            ogTeacher: target.teacher,
            period: target.period
        };
        state.displaced[state.day].push(newlyDisplaced);
        newlyDisplacedItemId = newlyDisplaced.id;
    }

    state.actionHistory.grid.push({
        type: 'move',
        day: state.day,
        source, 
        target, 
        sTask, 
        tTask,
        newlyDisplaced
    });

    state.schedule[state.day][target.period][target.teacher] = sTask; 
    
    if (source.type === 'grid') {
        state.schedule[state.day][source.period][source.teacher] = 'Free'; 
    } else if (source.type === 'displaced') {
        state.displaced[state.day] = state.displaced[state.day].filter(d => d.id !== source.item.id);
    }

    if (wasDisplaced) {
        lastDisplacedDrop = { period: target.period, teacher: target.teacher, oldTask: tTask };
    } else {
        lastDroppedCell = { period: target.period, teacher: target.teacher };
    }

    setTimeout(() => {
        lastDroppedCell = null; 
        lastDisplacedDrop = null;
        newlyDisplacedItemId = null;
    }, 600);

    saveStateToStorage();
    updateUndoUI();
    showToast(`Assignment Moved.`);
    renderAll();
}

function handleResetSchedule() {
    const day = state.day;
    
    // Save current state for perfect undo tracking
    const prevSchedule = JSON.parse(JSON.stringify(state.schedule[day]));
    const prevDisplaced = JSON.parse(JSON.stringify(state.displaced[day] || []));
    const prevSubs = state.substitutions[day] ? JSON.parse(JSON.stringify(state.substitutions[day])) : {};

    const activeStack = getActiveHistoryStack();
    activeStack.push({
        type: 'reset',
        day: day,
        prevSchedule,
        prevDisplaced,
        prevSubs
    });

    // Enact the reset
    state.schedule[day] = JSON.parse(JSON.stringify(state.baseSchedule[day]));
    state.displaced[day] = [];
    state.substitutions[day] = {};
    state.subStatus[day] = {};

    saveStateToStorage();
    updateUndoUI();
    showToast(`Schedule reset to baseline.`);
    renderAll();
}

function openBottomSheet(period, targetTeacher) {
    lastBottomSheetOpenTime = Date.now();
    const existingStatus = getSubStatusObj(state.day, period, targetTeacher);
    if (state.settings?.acceptanceTimerEnabled && existingStatus.status === 'accepted' && !hasCoordinatorPermissions()) {
        showToast('Locked by acceptance', true);
        return;
    }

    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const list = document.getElementById('sheet-teacher-list');
    if(!sheet || !overlay || !list) return;

    const taskToCover = state.baseSchedule[state.day]?.[period]?.[targetTeacher] || 'Class';
    list.innerHTML = `<p style="margin-bottom:14px; font-size:13px; color:var(--text-secondary);">Assigning substitute for <b>${targetTeacher}</b> • <b>${taskToCover}</b> (${period})</p>`;
    
    const available = [];
    const coTeachSplit = [];
    const busy = [];
    const unavailable = [];
    
    teachers.forEach(t => {
        if (state.absentTeachers.has(t)) return;
        if (isTeacherSubUnavailable(t, state.day)) {
            unavailable.push({ name: t, remark: getTeacherSubUnavailableRemark(t, state.day) });
            return;
        }
        const currentTask = state.schedule[state.day]?.[period]?.[t];
        const affinity = evaluateTeacherAffinity(t, taskToCover, period, state.day);
        if (!currentTask || currentTask === 'Free') {
            available.push({ name: t, affinity });
        } else if (isActivelyCoTeaching(state.day, period, t)) {
            coTeachSplit.push({ name: t, task: currentTask, affinity });
        } else {
            busy.push({ name: t, task: currentTask, affinity });
        }
    });

    // Sort available and co-teaching candidates by Priority Preference Matrix affinity score
    available.sort((a, b) => b.affinity.score - a.affinity.score);
    coTeachSplit.sort((a, b) => b.affinity.score - a.affinity.score);
    
    available.forEach(item => {
        const { name, affinity } = item;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:8px; background:var(--surface-color); border-radius:10px; border:1px solid var(--accent-blue); cursor:pointer;" 
                 onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${name}')">
                <div>
                    <strong style="color:var(--text-primary); font-size:14px;">🟢 ${name}</strong>
                    <span class="reg-affinity-tag">${affinity.primaryBadge}</span>
                </div>
                <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">Load: ${affinity.teachingLoad}/${affinity.totalSlots} pds</span>
            </div>`;
    });

    coTeachSplit.forEach(item => {
        const { name, task, affinity } = item;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:8px; background:var(--surface-color); border-radius:10px; border:1px solid #8b5cf6; cursor:pointer;" 
                 onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${name}')">
                <div>
                    <strong style="color:var(--text-primary); font-size:14px;">🟣 ${name}</strong>
                    <span class="reg-affinity-tag" style="background:rgba(139,92,246,0.14); color:#7c3aed;">👥 Split Co-Teach (${task})</span>
                </div>
                <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">${affinity.primaryBadge}</span>
            </div>`;
    });
    
    busy.forEach(item => {
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:11px 14px; margin-bottom:8px; background:var(--bg-color); border:1px solid var(--border-color); border-radius:10px; color:var(--text-secondary); cursor:pointer;" 
                 onclick="event.stopPropagation(); assignSubstitute('${period}', '${targetTeacher}', '${item.name}')">
                <span>🟡 ${item.name} (In ${item.task})</span>
                <span style="font-size:11px;">Displaces to Limbo</span>
            </div>`;
    });

    if (unavailable.length > 0) {
        let unavailHtml = `
            <div class="sheet-unavailable-section">
                <div class="sheet-unavailable-title">⛔ Unavailable for Substitution (${unavailable.length})</div>
        `;
        unavailable.forEach(u => {
            unavailHtml += `
                <div class="sheet-unavailable-row">
                    <span style="font-weight:600; color:var(--text-secondary); font-size:13px;">${u.name}</span>
                    <span class="sub-unavail-pill">
                        ⛔ Unavailable
                        <button type="button" class="btn-sub-reason-help" data-teacher="${escapeHtml(u.name)}" data-remark="${escapeHtml(u.remark)}" title="Click to view remark">?</button>
                    </span>
                </div>
            `;
        });
        unavailHtml += `</div>`;
        list.innerHTML += unavailHtml;
    }

    sheet.classList.remove('hidden');
    overlay.classList.remove('hidden');
    sheet.classList.add('open');
    overlay.classList.add('active');
    sheet.style.transform = (window.innerWidth >= 900) ? 'translateX(-50%) translateY(0)' : 'translateY(0)'; 
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if(sheet) {
        sheet.classList.remove('open');
        sheet.style.transform = '';
    }
    if(overlay) {
        overlay.classList.remove('active');
    }
}
window.openBottomSheet = openBottomSheet;
window.closeBottomSheet = closeBottomSheet;

function clearRedoStacks() {
    state.actionHistory.redoGrid = [];
    state.actionHistory.redoSubs = [];
}

function assignSubstitute(period, absentTeacher, subTeacher, targetPeriod = period) {
    closeBottomSheet();
    const existingStatus = getSubStatusObj(state.day, period, absentTeacher);
    if (state.settings?.acceptanceTimerEnabled && existingStatus.status === 'accepted' && !hasCoordinatorPermissions()) {
        showToast('Locked by acceptance', true);
        return;
    }

    clearRedoStacks();
    clearSubStatusAndTimer(state.day, period, absentTeacher);
    
    if (!state.substitutions[state.day]) state.substitutions[state.day] = {};
    if (!state.substitutions[state.day][period]) state.substitutions[state.day][period] = {};
    
    const previousSub = state.substitutions[state.day][period][absentTeacher];
    const previousTaskForSub = state.schedule[state.day][targetPeriod][subTeacher];
    const taskToCover = state.baseSchedule[state.day][period][absentTeacher];

    // Check if subTeacher is currently actively co-teaching in targetPeriod
    const coPartners = getCoTeachingPartners(state.day, targetPeriod, subTeacher);
    const isCoTeachingSplit = isActivelyCoTeaching(state.day, targetPeriod, subTeacher);
    const splitPartner = (isCoTeachingSplit && coPartners.length > 0) ? coPartners[0] : null;
    
    let newlyDisplaced = null;
    // If target substitute teacher already has a class in targetPeriod, displace it to Limbo
    // UNLESS they are actively co-teaching! In co-teaching, they split cleanly and their partner covers solo.
    if (previousTaskForSub && previousTaskForSub !== 'Free' && subTeacher !== previousSub && !isCoTeachingSplit) {
        newlyDisplaced = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            task: previousTaskForSub,
            ogTeacher: subTeacher,
            period: targetPeriod
        };
        state.displaced[state.day].push(newlyDisplaced);
        newlyDisplacedItemId = newlyDisplaced.id;
    }
    
    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const subAction = { 
        id: actionId,
        type: 'sub',
        period, 
        targetPeriod,
        absentTeacher, 
        subTeacher, 
        previousSub, 
        previousTaskForSub, 
        taskToCover, 
        newlyDisplaced,
        isCoTeachingSplit: Boolean(isCoTeachingSplit),
        splitPartner: splitPartner,
        day: state.day 
    };
    
    // Register in both history stacks for seamless dual-tab undo
    state.actionHistory.grid.push(subAction);
    state.actionHistory.subs.push(subAction);
    
    if (previousSub && previousSub !== subTeacher) {
        state.schedule[state.day][period][previousSub] = 'Free'; 
    }

    state.schedule[state.day][targetPeriod][subTeacher] = taskToCover;
    state.schedule[state.day][period][absentTeacher] = 'Free'; 
    state.substitutions[state.day][period][absentTeacher] = subTeacher;
    
    lastDroppedCell = { period: targetPeriod, teacher: subTeacher };
    setTimeout(() => {
        lastDroppedCell = null;
        newlyDisplacedItemId = null;
    }, 600);
    
    saveStateToStorage();
    updateUndoUI();
    const periodLabel = targetPeriod === period ? `(${period})` : `(${targetPeriod} for ${period})`;
    if (isCoTeachingSplit) {
        showToast(`Split sub assigned (${periodLabel})`);
    } else {
        showToast(`Assigned ${subTeacher} (${periodLabel})`);
    }
    renderAll();
}
window.assignSubstitute = assignSubstitute;

function unassignSubstitute(period, absentTeacher) {
    const existingStatus = getSubStatusObj(state.day, period, absentTeacher);
    if (state.settings?.acceptanceTimerEnabled && existingStatus.status === 'accepted' && !hasCoordinatorPermissions()) {
        showToast('Locked by acceptance', true);
        return;
    }

    clearRedoStacks();
    clearSubStatusAndTimer(state.day, period, absentTeacher);
    const currentSub = state.substitutions[state.day]?.[period]?.[absentTeacher];
    if (!currentSub) return;
    
    const taskToCover = state.baseSchedule[state.day]?.[period]?.[absentTeacher] || 'Free';
    
    const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const unassignAction = {
        id: actionId,
        type: 'unassign-sub',
        period,
        absentTeacher,
        previousSub: currentSub,
        taskToCover,
        day: state.day
    };
    
    state.actionHistory.grid.push(unassignAction);
    state.actionHistory.subs.push(unassignAction);
    
    state.schedule[state.day][period][currentSub] = 'Free';
    state.schedule[state.day][period][absentTeacher] = taskToCover;
    delete state.substitutions[state.day][period][absentTeacher];
    
    saveStateToStorage();
    updateUndoUI();
    showToast('Sub unassigned');
    renderAll();
}
window.unassignSubstitute = unassignSubstitute;

function revertSubstitutionsForTeacher(teacher, day = state.day) {
    if (!state.substitutions || !state.substitutions[day]) return;
    
    periods.forEach(period => {
        const subTeacher = state.substitutions[day]?.[period]?.[teacher];
        if (subTeacher) {
            clearSubStatusAndTimer(day, period, teacher);
            
            const matchAction = [...(state.actionHistory?.grid || [])].reverse().find(a => 
                (a.type === 'sub' && a.day === day && a.subTeacher === subTeacher && a.absentTeacher === teacher)
            );
            const targetPeriod = matchAction ? (matchAction.targetPeriod || matchAction.period) : period;
            const previousTask = matchAction ? (matchAction.previousTaskForSub || 'Free') : (state.baseSchedule[day]?.[targetPeriod]?.[subTeacher] || 'Free');
            
            if (state.schedule[day] && state.schedule[day][targetPeriod]) {
                state.schedule[day][targetPeriod][subTeacher] = previousTask;
            }
            
            if (matchAction && matchAction.newlyDisplaced && state.displaced && state.displaced[day]) {
                state.displaced[day] = state.displaced[day].filter(d => d.id !== matchAction.newlyDisplaced.id);
            }
            
            delete state.substitutions[day][period][teacher];
        }
        
        // Restore teacher's base task
        if (state.baseSchedule[day]?.[period]?.[teacher] !== undefined && state.schedule[day]) {
            state.schedule[day][period][teacher] = state.baseSchedule[day][period][teacher];
        }
    });
}
window.revertSubstitutionsForTeacher = revertSubstitutionsForTeacher;

function cleanupOrphanSubstitutions(day = state.day) {
    if (!state.substitutions || !state.substitutions[day]) return false;
    let cleaned = false;
    
    const daySubs = state.substitutions[day];
    for (const [period, subMap] of Object.entries(daySubs)) {
        if (!subMap || typeof subMap !== 'object') continue;
        for (const [absT, subT] of Object.entries(subMap)) {
            if (!state.absentTeachers.has(absT)) {
                cleaned = true;
                clearSubStatusAndTimer(day, period, absT);
                
                const matchAction = [...(state.actionHistory?.grid || [])].reverse().find(a => 
                    (a.type === 'sub' && a.day === day && a.subTeacher === subT && a.absentTeacher === absT)
                );
                const targetPeriod = matchAction ? (matchAction.targetPeriod || matchAction.period) : period;
                const previousTask = matchAction ? (matchAction.previousTaskForSub || 'Free') : (state.baseSchedule[day]?.[targetPeriod]?.[subT] || 'Free');
                
                if (state.schedule[day] && state.schedule[day][targetPeriod]) {
                    state.schedule[day][targetPeriod][subT] = previousTask;
                }
                
                if (matchAction && matchAction.newlyDisplaced && state.displaced && state.displaced[day]) {
                    state.displaced[day] = state.displaced[day].filter(d => d.id !== matchAction.newlyDisplaced.id);
                }
                
                if (state.baseSchedule[day]?.[period]?.[absT] !== undefined && state.schedule[day]) {
                    state.schedule[day][period][absT] = state.baseSchedule[day][period][absT];
                }
                
                delete subMap[absT];
            }
        }
    }
    return cleaned;
}
window.cleanupOrphanSubstitutions = cleanupOrphanSubstitutions;

// --- SMART SOLVER & MULTI-OPTION AUTO-RESOLVE ENGINE (MAX 3 SOLUTIONS) ---
let pendingSplitProposals = [];

function closeSplitModal() {
    const modal = document.getElementById('split-resolve-modal');
    const overlay = document.getElementById('split-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
    pendingSplitProposals = [];
}
window.closeSplitModal = closeSplitModal;

function cancelSplitModal() {
    closeSplitModal();
    showToast('Co-teachers kept paired');
}
window.cancelSplitModal = cancelSplitModal;

function applySelectedSplits() {
    const selectedBoxes = document.querySelectorAll('#split-proposals-list input[type="checkbox"]:checked');
    if (selectedBoxes.length === 0) {
        closeSplitModal();
        showToast('No splits selected');
        return;
    }

    const applied = [];
    selectedBoxes.forEach(box => {
        const idx = parseInt(box.dataset.proposalIndex, 10);
        if (pendingSplitProposals[idx]) {
            applied.push(pendingSplitProposals[idx]);
        }
    });

    closeSplitModal();

    applied.forEach(p => {
        assignSubstitute(p.period, p.absentTeacher, p.teacher, p.period);
    });
}
window.applySelectedSplits = applySelectedSplits;

function generateStrategySolution(strategyKey, unresolvedList, day) {
    // Deep clone current day schedule to simulate load updates accurately
    const simSchedule = JSON.parse(JSON.stringify(state.schedule[day] || {}));
    const assignments = [];
    let splitsCount = 0;
    let totalAffinity = 0;

    unresolvedList.forEach((need, needIdx) => {
        const { period, absentTeacher, task } = need;
        const candidates = [];

        teachers.forEach(t => {
            if (state.absentTeachers.has(t) || t === absentTeacher) return;
            if (isTeacherSubUnavailable(t, day)) return;
            const currentTask = simSchedule[period]?.[t];
            const isFree = (!currentTask || currentTask === 'Free');

            // Check if t is actively co-teaching in simSchedule
            const partners = getCoTeachingPartners(day, period, t);
            const baseT = state.baseSchedule[day]?.[period]?.[t];
            const isCoTeachActive = (!isFree && partners.length > 0 && currentTask === baseT && partners.some(p => simSchedule[period]?.[p] === baseT && !state.absentTeachers.has(p)));

            if (!isFree && !isCoTeachActive) return;
            if (strategyKey === 'minimal-splits' && isCoTeachActive) return;

            const affinity = evaluateTeacherAffinity(t, task, period, day, simSchedule);
            candidates.push({
                teacher: t,
                isFree,
                isSplit: isCoTeachActive,
                previousTaskForSub: currentTask || 'Free',
                affinity
            });
        });

        if (candidates.length === 0) return;

        // Sort candidates based on strategy heuristic
        candidates.sort((a, b) => {
            // Always prefer Free teachers over Co-Teach Splits first
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;

            if (strategyKey === 'subject-match') {
                // Maximize academic subject & class match
                return b.affinity.score - a.affinity.score;
            } else if (strategyKey === 'balanced-load') {
                // Strictly lightest daily workload first, then affinity
                if (a.affinity.teachingLoad !== b.affinity.teachingLoad) {
                    return a.affinity.teachingLoad - b.affinity.teachingLoad;
                }
                return b.affinity.score - a.affinity.score;
            } else {
                // 'minimal-splits': Zero splits + prioritize grade/class familiarity & alternative rotation
                const aFam = a.affinity.reasons.some(r => r.includes('Teaches') || r.includes('Grade')) ? 20 : 0;
                const bFam = b.affinity.reasons.some(r => r.includes('Teaches') || r.includes('Grade')) ? 20 : 0;
                if (aFam !== bFam) return bFam - aFam;
                // Rotate tie-breaker so Option 3 surfaces distinct teacher pairings when possible
                if (candidates.length > 1 && needIdx % 2 === 1) {
                    return a.affinity.teachingLoad - b.affinity.teachingLoad;
                }
                return b.affinity.score - a.affinity.score;
            }
        });

        // For minimal-splits, if top candidate is identical to subject-match on every slot and another good free candidate exists, offer the alternative on even slots
        let chosen = candidates[0];
        if (strategyKey === 'minimal-splits' && candidates.length > 1 && candidates[1].isFree && (needIdx % 2 === 0)) {
            chosen = candidates[1];
        }

        // Apply to simulated schedule
        if (!simSchedule[period]) simSchedule[period] = {};
        simSchedule[period][chosen.teacher] = task;
        simSchedule[period][absentTeacher] = 'Free';

        if (chosen.isSplit) splitsCount++;
        totalAffinity += chosen.affinity.score;

        const updatedStats = getTeacherDailyStats(chosen.teacher, day, simSchedule);

        assignments.push({
            period,
            absentTeacher,
            subTeacher: chosen.teacher,
            previousTaskForSub: chosen.previousTaskForSub,
            taskToCover: task,
            isSplit: chosen.isSplit,
            primaryBadge: chosen.isSplit ? '👥 Co-Teach Split' : chosen.affinity.primaryBadge,
            affinityScore: chosen.affinity.score,
            newLoad: `${updatedStats.teachingLoad}/${updatedStats.totalSlots} pds`,
            checked: true,
            day
        });
    });

    // Compute peak teacher load across staff
    let peakLoad = 0;
    teachers.forEach(t => {
        if (!state.absentTeachers.has(t)) {
            const st = getTeacherDailyStats(t, day, simSchedule);
            if (st.teachingLoad > peakLoad) peakLoad = st.teachingLoad;
        }
    });

    const avgAffinity = assignments.length > 0 ? Math.round(totalAffinity / assignments.length) : 0;

    return {
        assignments,
        coveredCount: assignments.length,
        totalNeeded: unresolvedList.length,
        splitsCount,
        avgAffinity,
        peakLoad
    };
}

function performAutoResolve() {
    const day = state.day;
    const unresolvedList = [];

    periods.forEach(period => {
        if (period === 'BREAK' || period === 'BREAKFAST BREAK' || period === 'BREAKFAST') return;
        teachers.forEach(t => {
            const isAbsent = state.absentTeachers.has(t);
            const baseTask = state.baseSchedule[day]?.[period]?.[t];
            const currentSub = state.substitutions[day]?.[period]?.[t];
            if (isAbsent && baseTask && baseTask !== 'Free' && baseTask !== '-' && !currentSub) {
                unresolvedList.push({ period, absentTeacher: t, task: baseTask });
            }
        });
    });

    if (unresolvedList.length === 0) {
        showToast('No conflicts to resolve');
        return;
    }

    const opt1 = generateStrategySolution('subject-match', unresolvedList, day);
    const opt2 = generateStrategySolution('balanced-load', unresolvedList, day);
    const opt3 = generateStrategySolution('minimal-splits', unresolvedList, day);

    generatedProposals = [
        {
            id: 'subject-match',
            title: 'Option 1: Subject Match',
            subtitle: '★ Best Academic Fit',
            desc: 'Matches classes to teachers in the same subject or department first.',
            ...opt1
        },
        {
            id: 'balanced-load',
            title: 'Option 2: Balanced Load',
            subtitle: '⚖ Lightest Workload',
            desc: 'Distributes substitutions to teachers with the most free periods today.',
            ...opt2
        },
        {
            id: 'minimal-splits',
            title: 'Option 3: Minimal Splits',
            subtitle: '🛡 Preserve Co-Teaching',
            desc: 'Strictly uses 100% Free teachers (0 co-teaching splits) with grade familiarity.',
            ...opt3
        }
    ];
    window.generatedProposals = generatedProposals;

    activeProposalIndex = 0;
    renderProposalModalUI();

    const modal = document.getElementById('auto-resolve-modal');
    const overlay = document.getElementById('auto-resolve-overlay');
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}
window.performAutoResolve = performAutoResolve;

function selectProposalTab(index) {
    if (index < 0 || index >= generatedProposals.length) return;
    activeProposalIndex = index;
    renderProposalModalUI();
}
window.selectProposalTab = selectProposalTab;

function toggleProposalAssignmentCheck(assignmentIdx, checked) {
    const currentProp = generatedProposals[activeProposalIndex];
    if (currentProp && currentProp.assignments[assignmentIdx]) {
        currentProp.assignments[assignmentIdx].checked = checked;
    }
}
window.toggleProposalAssignmentCheck = toggleProposalAssignmentCheck;

function renderProposalModalUI() {
    const tabsEl = document.getElementById('proposal-tabs');
    const metricsEl = document.getElementById('proposal-metrics-bar');
    const previewEl = document.getElementById('proposal-preview-container');
    if (!tabsEl || !metricsEl || !previewEl || generatedProposals.length === 0) return;

    tabsEl.innerHTML = generatedProposals.map((prop, idx) => `
        <button class="proposal-tab-btn ${idx === activeProposalIndex ? 'active' : ''}" onclick="selectProposalTab(${idx})">
            <span class="tab-title">${prop.title}</span>
            <span class="tab-subtitle">${prop.subtitle} (${prop.coveredCount}/${prop.totalNeeded})</span>
        </button>
    `).join('');

    const activeProp = generatedProposals[activeProposalIndex];
    metricsEl.innerHTML = `
        <span class="proposal-metric-pill">✓ Coverage: <b>${activeProp.coveredCount}/${activeProp.totalNeeded}</b></span>
        <span class="proposal-metric-pill">★ Avg Affinity: <b>${activeProp.avgAffinity} pts</b></span>
        <span class="proposal-metric-pill">👥 Co-Teach Splits: <b>${activeProp.splitsCount}</b></span>
        <span class="proposal-metric-pill">📊 Peak Teacher Load: <b>${activeProp.peakLoad} pds</b></span>
    `;

    if (activeProp.assignments.length === 0) {
        previewEl.innerHTML = `
            <div style="padding:24px; text-align:center; color:var(--text-secondary); font-size:13px;">
                No eligible teachers available under this constraint (${activeProp.title}). Try Option 1 or Option 2 to include Co-Teaching splits.
            </div>
        `;
        return;
    }

    let rowsHtml = activeProp.assignments.map((a, idx) => `
        <tr>
            <td style="width:32px; text-align:center;">
                <input type="checkbox" ${a.checked ? 'checked' : ''} onchange="toggleProposalAssignmentCheck(${idx}, this.checked)" style="accent-color:var(--accent-blue); cursor:pointer;">
            </td>
            <td><span class="reg-period-badge">${a.period}</span></td>
            <td><strong style="color:var(--text-primary);">${a.taskToCover}</strong></td>
            <td style="color:var(--text-secondary);">${a.absentTeacher}</td>
            <td><strong style="color:var(--accent-green);">→ ${a.subTeacher}</strong></td>
            <td>
                <span class="reg-affinity-tag" style="${a.isSplit ? 'background:rgba(139,92,246,0.15); color:#7c3aed;' : ''}">${a.primaryBadge}</span>
                <span style="font-size:10px; color:var(--text-secondary); margin-left:4px;">${a.newLoad}</span>
            </td>
        </tr>
    `).join('');

    previewEl.innerHTML = `
        <table class="proposal-table">
            <thead>
                <tr>
                    <th style="width:32px; text-align:center;">Use</th>
                    <th>Period</th>
                    <th>Class</th>
                    <th>Absent</th>
                    <th>Proposed Sub</th>
                    <th>Match & Load</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
}

function closeAutoResolveModal() {
    const modal = document.getElementById('auto-resolve-modal');
    const overlay = document.getElementById('auto-resolve-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.closeAutoResolveModal = closeAutoResolveModal;

function applySelectedProposal() {
    const activeProp = generatedProposals[activeProposalIndex];
    if (!activeProp) {
        closeAutoResolveModal();
        return;
    }

    const chosenAssignments = activeProp.assignments.filter(a => a.checked);
    if (chosenAssignments.length === 0) {
        closeAutoResolveModal();
        showToast('No assignments selected');
        return;
    }

    clearRedoStacks();
    const batchActions = [];

    chosenAssignments.forEach(item => {
        const { period, absentTeacher, subTeacher, previousTaskForSub, taskToCover, day } = item;

        batchActions.push({
            period,
            absentTeacher,
            subTeacher,
            previousTaskForSub,
            taskToCover,
            day
        });

        state.schedule[day][period][subTeacher] = taskToCover;
        state.schedule[day][period][absentTeacher] = 'Free';

        if (!state.substitutions[day]) state.substitutions[day] = {};
        if (!state.substitutions[day][period]) state.substitutions[day][period] = {};
        state.substitutions[day][period][absentTeacher] = subTeacher;
    });

    if (batchActions.length > 0) {
        const actionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        const batchAction = {
            id: actionId,
            type: 'batch-sub',
            actions: batchActions
        };
        state.actionHistory.subs.push(batchAction);
        state.actionHistory.grid.push(batchAction);
        saveStateToStorage();
        updateUndoUI();
    }

    closeAutoResolveModal();
    renderAll();
    showToast(`Applied ${activeProp.title}`);
}
window.applySelectedProposal = applySelectedProposal;

// --- DUAL-STACK UNDO & REDO ENGINE ---
function getActiveHistoryStack() {
    const activeTab = document.querySelector('.tab-section.active');
    if (activeTab && activeTab.id === 'tab-substitutions') {
        return state.actionHistory.subs; 
    }
    return state.actionHistory.grid; 
}

function getActiveRedoStack() {
    const activeTab = document.querySelector('.tab-section.active');
    if (activeTab && activeTab.id === 'tab-substitutions') {
        return state.actionHistory.redoSubs; 
    }
    return state.actionHistory.redoGrid; 
}

function getUndoRedoIcons(style) {
    switch (style) {
        case 'circular':
            return { undo: '↺', redo: '↻' };
        case 'svg':
            return { undo: '◀', redo: '▶' };
        case 'text':
            return { undo: '↶', redo: '↷' };
        case 'curved':
        default:
            return { undo: '↩', redo: '↪' };
    }
}
window.getUndoRedoIcons = getUndoRedoIcons;

function updateUndoUI() {
    const undoBtn = document.getElementById('header-undo-btn');
    const redoBtn = document.getElementById('header-redo-btn');
    
    const activeUndo = getActiveHistoryStack();
    const activeRedo = getActiveRedoStack();
    const iconStyle = state.settings?.undoIconStyle || 'curved';
    const icons = getUndoRedoIcons(iconStyle);
    
    if (undoBtn) {
        const count = activeUndo.length;
        if (count > 0) {
            undoBtn.removeAttribute('disabled');
            undoBtn.innerHTML = `<span class="btn-icon">${icons.undo}</span><span class="btn-text"> Undo (${count})</span>`;
            undoBtn.title = `Undo (${count}) (Cmd+Z)`;
        } else {
            undoBtn.setAttribute('disabled', 'true');
            undoBtn.innerHTML = `<span class="btn-icon">${icons.undo}</span><span class="btn-text"> Undo</span>`;
            undoBtn.title = 'Undo (Cmd+Z)';
        }
    }

    if (redoBtn) {
        const count = activeRedo.length;
        if (count > 0) {
            redoBtn.removeAttribute('disabled');
            redoBtn.innerHTML = `<span class="btn-icon">${icons.redo}</span><span class="btn-text"> Redo (${count})</span>`;
            redoBtn.title = `Redo (${count}) (Cmd+Shift+Z)`;
        } else {
            redoBtn.setAttribute('disabled', 'true');
            redoBtn.innerHTML = `<span class="btn-icon">${icons.redo}</span><span class="btn-text"> Redo</span>`;
            redoBtn.title = 'Redo';
        }
    }
}

function undoLastAction() {
    const activeStack = getActiveHistoryStack();
    if (activeStack.length === 0) return;

    const action = activeStack.pop();

    // Synchronize across both history stacks if action has a shared ID
    if (action.id) {
        const otherStack = (activeStack === state.actionHistory.grid) ? state.actionHistory.subs : state.actionHistory.grid;
        const idx = otherStack.findIndex(a => a.id === action.id);
        if (idx !== -1) otherStack.splice(idx, 1);
        state.actionHistory.redoGrid.push(action);
        state.actionHistory.redoSubs.push(action);
    } else {
        getActiveRedoStack().push(action);
    }

    if (action.type === 'move') {
        const { day, source, target, sTask, tTask, newlyDisplaced } = action;
        
        state.schedule[day][target.period][target.teacher] = tTask;

        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = sTask;
        } else if (source.type === 'displaced') {
            state.displaced[day].push(source.item);
        }

        if (newlyDisplaced) {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== newlyDisplaced.id);
        }

    } else if (action.type === 'restore_displaced') {
        const { day, item, target } = action;
        state.schedule[day][target.period][target.teacher] = 'Free';
        if (!state.displaced[day]) state.displaced[day] = [];
        state.displaced[day].push(item);

    } else if (action.type === 'reset') {
        state.schedule[action.day] = action.prevSchedule;
        state.displaced[action.day] = action.prevDisplaced;
        if (!state.substitutions[action.day]) state.substitutions[action.day] = {};
        state.substitutions[action.day] = action.prevSubs;

    } else if (action.type === 'sub') {
        const { period, targetPeriod = period, absentTeacher, subTeacher, previousSub, previousTaskForSub, taskToCover, day, newlyDisplaced } = action;
        state.schedule[day][targetPeriod][subTeacher] = previousTaskForSub || 'Free';
        
        if (newlyDisplaced) {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== newlyDisplaced.id);
        }

        if (previousSub) {
            state.substitutions[day][period][absentTeacher] = previousSub;
            state.schedule[day][period][previousSub] = taskToCover;
        } else {
            if (state.substitutions[day] && state.substitutions[day][period]) {
                delete state.substitutions[day][period][absentTeacher];
            }
            state.schedule[day][period][absentTeacher] = taskToCover;
        }

    } else if (action.type === 'unassign-sub') {
        const { period, absentTeacher, previousSub, taskToCover, day } = action;
        if (!state.substitutions[day]) state.substitutions[day] = {};
        if (!state.substitutions[day][period]) state.substitutions[day][period] = {};
        state.substitutions[day][period][absentTeacher] = previousSub;
        state.schedule[day][period][previousSub] = taskToCover;
        state.schedule[day][period][absentTeacher] = 'Free';

    } else if (action.type === 'cell-reset') {
        const { day, period, teacher, prevTask } = action;
        state.schedule[day][period][teacher] = prevTask;

    } else if (action.type === 'cell-reset-move') {
        const { day, targetPeriod, targetTeacher, source, movedTask, newlyDisplaced } = action;
        // Undo of reset-move: put movedTask back on target cell
        state.schedule[day][targetPeriod][targetTeacher] = movedTask;
        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = 'Free';
        } else if (source.type === 'displaced') {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== source.item.id);
        }
        if (newlyDisplaced) {
            state.displaced[day].push(newlyDisplaced);
        }

    } else if (action.type === 'cell-reset-return-origin') {
        const { day, fromPeriod, fromTeacher, toPeriod, toTeacher, task } = action;
        state.schedule[day][fromPeriod][fromTeacher] = task;
        state.schedule[day][toPeriod][toTeacher] = 'Free';

    } else if (action.type === 'cell-reset-recall') {
        const { day, period, teacher, fromPeriod, fromTeacher, recalledTask } = action;
        state.schedule[day][fromPeriod][fromTeacher] = recalledTask;
        state.schedule[day][period][teacher] = 'Free';

    } else if (action.type === 'co-teach-release') {
        const { day, scope, teacher, period, prevTask, savedTasks } = action;
        if (scope === 'period') {
            state.schedule[day][period][teacher] = prevTask;
        } else if (scope === 'day') {
            if (savedTasks && Array.isArray(savedTasks)) {
                savedTasks.forEach(item => {
                    state.schedule[day][item.period][teacher] = item.task;
                });
            }
        }

    } else if (action.type === 'batch-sub') {
        [...action.actions].reverse().forEach(sub => {
            state.schedule[sub.day][sub.period][sub.subTeacher] = sub.previousTaskForSub || 'Free';
            state.schedule[sub.day][sub.period][sub.absentTeacher] = sub.taskToCover;
            if(state.substitutions[sub.day] && state.substitutions[sub.day][sub.period]) {
                delete state.substitutions[sub.day][sub.period][sub.absentTeacher];
            }
        });
    }
    
    saveStateToStorage();
    updateUndoUI();
    const toast = document.getElementById('undo-toast');
    if(toast) toast.classList.add('hidden');
    showToast('Action undone');
    renderAll();
}

function redoLastAction() {
    const activeRedo = getActiveRedoStack();
    if (activeRedo.length === 0) return;

    const action = activeRedo.pop();

    if (action.id) {
        const otherRedo = (activeRedo === state.actionHistory.redoGrid) ? state.actionHistory.redoSubs : state.actionHistory.redoGrid;
        const idx = otherRedo.findIndex(a => a.id === action.id);
        if (idx !== -1) otherRedo.splice(idx, 1);
    }

    if (action.type === 'move') {
        const { day, source, target, sTask, tTask, newlyDisplaced } = action;
        state.schedule[day][target.period][target.teacher] = sTask;
        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = 'Free';
        } else if (source.type === 'displaced') {
            state.displaced[day] = state.displaced[day].filter(d => d.id !== source.item.id);
        }
        if (newlyDisplaced) {
            state.displaced[day].push(newlyDisplaced);
        }
        state.actionHistory.grid.push(action);

    } else if (action.type === 'restore_displaced') {
        const { day, item, target } = action;
        state.schedule[day][target.period][target.teacher] = item.task;
        state.displaced[day] = (state.displaced[day] || []).filter(d => d.id !== item.id);
        getActiveHistoryStack().push(action);

    } else if (action.type === 'sub') {
        const { period, targetPeriod = period, absentTeacher, subTeacher, previousSub, taskToCover, day, newlyDisplaced } = action;
        if (!state.substitutions[day]) state.substitutions[day] = {};
        if (!state.substitutions[day][period]) state.substitutions[day][period] = {};

        if (previousSub && previousSub !== subTeacher) {
            state.schedule[day][period][previousSub] = 'Free';
        }
        if (newlyDisplaced) {
            state.displaced[day].push(newlyDisplaced);
        }
        state.schedule[day][targetPeriod][subTeacher] = taskToCover;
        state.schedule[day][period][absentTeacher] = 'Free';
        state.substitutions[day][period][absentTeacher] = subTeacher;

        state.actionHistory.grid.push(action);
        state.actionHistory.subs.push(action);

    } else if (action.type === 'unassign-sub') {
        const { period, absentTeacher, previousSub, taskToCover, day } = action;
        state.schedule[day][period][previousSub] = 'Free';
        state.schedule[day][period][absentTeacher] = taskToCover;
        if (state.substitutions[day] && state.substitutions[day][period]) {
            delete state.substitutions[day][period][absentTeacher];
        }
        state.actionHistory.grid.push(action);
        state.actionHistory.subs.push(action);

    } else if (action.type === 'reset') {
        state.schedule[action.day] = JSON.parse(JSON.stringify(state.baseSchedule[action.day]));
        state.displaced[action.day] = [];
        state.substitutions[action.day] = {};
        getActiveHistoryStack().push(action);

    } else if (action.type === 'cell-reset') {
        const { day, period, teacher, baseTask } = action;
        state.schedule[day][period][teacher] = baseTask;
        state.actionHistory.grid.push(action);

    } else if (action.type === 'cell-reset-move') {
        const { day, targetPeriod, targetTeacher, source, movedTask, restoredTargetTask, newlyDisplaced } = action;
        state.schedule[day][targetPeriod][targetTeacher] = restoredTargetTask;
        if (source.type === 'grid') {
            state.schedule[day][source.period][source.teacher] = movedTask;
        } else if (source.type === 'displaced') {
            state.displaced[day].push(source.item);
        }
        if (newlyDisplaced) {
            state.displaced[day] = (state.displaced[day] || []).filter(d => d.id !== newlyDisplaced.id);
        }
        state.actionHistory.grid.push(action);

    } else if (action.type === 'cell-reset-return-origin') {
        const { day, fromPeriod, fromTeacher, toPeriod, toTeacher, task, targetBaseTask } = action;
        state.schedule[day][toPeriod][toTeacher] = task;
        state.schedule[day][fromPeriod][fromTeacher] = targetBaseTask;
        state.actionHistory.grid.push(action);

    } else if (action.type === 'cell-reset-recall') {
        const { day, period, teacher, recalledTask, fromPeriod, fromTeacher, fromRestoredTask } = action;
        state.schedule[day][fromPeriod][fromTeacher] = fromRestoredTask;
        state.schedule[day][period][teacher] = recalledTask;
        state.actionHistory.grid.push(action);

    } else if (action.type === 'co-teach-release') {
        const { day, scope, teacher, period, savedTasks } = action;
        if (scope === 'period') {
            state.schedule[day][period][teacher] = 'Free';
        } else if (scope === 'day') {
            if (savedTasks && Array.isArray(savedTasks)) {
                savedTasks.forEach(item => {
                    state.schedule[day][item.period][teacher] = 'Free';
                });
            }
        }
        state.actionHistory.grid.push(action);

    } else if (action.type === 'batch-sub') {
        action.actions.forEach(sub => {
            state.schedule[sub.day][sub.period][sub.subTeacher] = sub.taskToCover;
            state.schedule[sub.day][sub.period][sub.absentTeacher] = 'Free';
            if (!state.substitutions[sub.day]) state.substitutions[sub.day] = {};
            if (!state.substitutions[sub.day][sub.period]) state.substitutions[sub.day][sub.period] = {};
            state.substitutions[sub.day][sub.period][sub.absentTeacher] = sub.subTeacher;
        });
        state.actionHistory.grid.push(action);
        state.actionHistory.subs.push(action);
    }

    saveStateToStorage();
    updateUndoUI();
    showToast('Action redone');
    renderAll();
}
window.redoLastAction = redoLastAction;

function handleGlobalKeydown(e) {
    const pinModal = document.getElementById('pin-modal');
    const isPinOpen = pinModal && !pinModal.classList.contains('hidden');

    if (e.key === 'Escape') {
        if (isFitGridMode) {
            toggleFitGridMode(false);
        }
        closePinModal();
        closeMasterCellModal();
        closeOfficiatingModal();
        closeDisputeModal();
        closeAutoResolveModal();
        closeCoTeachingModal();
        closeSplitModal();
        closeSettingsModal();
        closeTourModal();
        closeBottomSheet();
        closeAbsenceContextMenu();
        closeResetContextMenu();
        closeNotificationsModal();
        return;
    }

    // Direct numeric input when PIN modal is active
    if (isPinOpen) {
        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            handlePinKey(e.key);
            return;
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            handlePinKey('delete');
            return;
        }
    }
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
            if (e.shiftKey) {
                e.preventDefault();
                redoLastAction();
            } else {
                e.preventDefault();
                undoLastAction();
            }
        } else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            redoLastAction();
        }
    }
}

// --- SETTINGS MODAL ---
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('settings-overlay');
    const sameLockToggle = document.getElementById('same-period-lock-toggle');
    const minAlertsToggle = document.getElementById('minimize-alerts-toggle');
    const detectCollisionsToggle = document.getElementById('detect-collisions-toggle');
    const acceptTimerToggle = document.getElementById('acceptance-timer-toggle');
    const acceptTimerDuration = document.getElementById('acceptance-timer-duration');
    const subHaloToggle = document.getElementById('sub-halo-toggle');
    const subHaloColorSelect = document.getElementById('sub-halo-color-select');
    
    if (sameLockToggle) {
        sameLockToggle.checked = state.settings.samePeriodLock !== false;
    }
    if (minAlertsToggle) {
        minAlertsToggle.checked = state.settings.minimizeAlerts === true;
    }
    if (detectCollisionsToggle) {
        detectCollisionsToggle.checked = state.settings.detectCollisions !== false;
    }
    if (acceptTimerToggle) {
        acceptTimerToggle.checked = state.settings.acceptanceTimerEnabled === true;
    }
    if (acceptTimerDuration) {
        acceptTimerDuration.value = String(state.settings.acceptanceTimerDuration || 10);
    }
    if (subHaloToggle) {
        subHaloToggle.checked = state.settings.subHaloIndicator !== false;
    }
    if (subHaloColorSelect) {
        subHaloColorSelect.value = state.settings.subHaloColor || 'emerald';
    }
    const undoCards = document.querySelectorAll('.undo-style-card');
    const currentUndoStyle = state.settings.undoIconStyle || 'curved';
    undoCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-style') === currentUndoStyle));

    updateRolePermissionsUI();
    updateCloudSyncUI();

    const currentTheme = localStorage.getItem('lfps_frontdesk_theme') || 'system';
    updateThemeSelectorUI(currentTheme);
    applyRosterColors();

    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('settings-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;

// --- HEADER NOTIFICATION CENTER ---
function getOperationalNotices() {
    const notices = [];
    const day = state.day;

    // 1. Substitution Disputes
    if (state.subStatus?.[day]) {
        Object.keys(state.subStatus[day]).forEach(period => {
            const periodObj = state.subStatus[day][period];
            if (periodObj) {
                Object.keys(periodObj).forEach(absentTeacher => {
                    const statusObj = periodObj[absentTeacher];
                    if (statusObj && statusObj.status === 'disputed') {
                        const subTeacher = state.substitutions?.[day]?.[period]?.[absentTeacher] || 'Assigned Sub';
                        notices.push({
                            id: `dispute-${day}-${period}-${absentTeacher}`,
                            type: 'dispute',
                            icon: '⚑',
                            title: `Dispute: ${period} (${subTeacher})`,
                            desc: `Flagged while covering ${absentTeacher}: “${statusObj.reason || 'Flagged by teacher'}”`,
                            meta: `${day} • ${period}`,
                            actionLabel: 'Review Sub',
                            onAction: () => {
                                closeNotificationsModal();
                                switchTabSection('tab-substitutions');
                            }
                        });
                    }
                });
            }
        });
    }

    // 2. Timetable Conflicts / Clashes
    if (state.settings?.detectCollisions !== false) {
        const conflicts = findConflicts();
        if (conflicts && conflicts.count > 0 && Array.isArray(conflicts.details)) {
            conflicts.details.forEach((detail, idx) => {
                notices.push({
                    id: `conflict-${idx}`,
                    type: 'conflict',
                    icon: '⚠️',
                    title: 'Timetable Clash',
                    desc: detail,
                    meta: `${day}`,
                    actionLabel: 'Inspect',
                    onAction: () => {
                        closeNotificationsModal();
                        switchTabSection('tab-routine');
                        const firstCell = document.querySelector('.cell-collision');
                        if (firstCell) firstCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            });
        }
    }

    // 3. Displaced Staff in Limbo
    const limboStaff = state.displaced?.[day] || [];
    if (limboStaff.length > 0) {
        limboStaff.forEach((item, idx) => {
            notices.push({
                id: `limbo-${idx}`,
                type: 'limbo',
                icon: '👥',
                title: `Staff Displaced (${item.teacher})`,
                desc: `${item.task} displaced from ${item.period} awaiting reallocation.`,
                meta: `${day} • ${item.period}`,
                actionLabel: 'Allocate',
                onAction: () => {
                    closeNotificationsModal();
                    switchTabSection('tab-routine');
                    const limboPool = document.getElementById('limbo-displaced-pool');
                    if (limboPool) limboPool.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });
    }

    // 4. Officiating Academic Coordinator Requirement
    if (state.absentTeachers.has(PRIMARY_AC) && !state.officiatingAC?.[day]) {
        notices.push({
            id: 'officiating-ac-needed',
            type: 'officiating',
            icon: '⭐',
            title: 'Officiating AC Required',
            desc: `${PRIMARY_AC} (Academic Coordinator) is marked absent today. Designate an Officiating AC.`,
            meta: `${day} • Coordinator Duty`,
            actionLabel: 'Designate Off. AC',
            onAction: () => {
                closeNotificationsModal();
                openTeacherQuickActionModal(PRIMARY_AC);
            }
        });
    }

    // 5. Officiating Class Teacher Requirements
    if (typeof classTeams !== 'undefined') {
        Object.keys(classTeams).forEach(sec => {
            const team = classTeams[sec];
            if (team && state.absentTeachers.has(team.ct)) {
                const assignedOffCT = state.officiatingCT?.[day]?.[sec];
                if (!assignedOffCT || state.absentTeachers.has(assignedOffCT)) {
                    notices.push({
                        id: `officiating-ct-needed-${sec}`,
                        type: 'officiating',
                        icon: '🏫',
                        title: `Off. CT. Required (${sec})`,
                        desc: `Class Teacher ${team.ct} is absent. Officiating Class Teacher needed for Class ${sec}.`,
                        meta: `${day} • Class ${sec}`,
                        actionLabel: 'Assign Off. CT.',
                        onAction: () => {
                            closeNotificationsModal();
                            openTeacherQuickActionModal(team.ct);
                        }
                    });
                }
            }
        });
    }

    // 6. Uncovered Periods for Absent Teachers
    if (state.absentTeachers && state.absentTeachers.size > 0) {
        state.absentTeachers.forEach(absentTeacher => {
            const periods = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
            periods.forEach(period => {
                const baseTask = state.baseSchedule?.[day]?.[period]?.[absentTeacher];
                if (baseTask && baseTask !== 'Free') {
                    const assignedSub = state.substitutions?.[day]?.[period]?.[absentTeacher];
                    if (!assignedSub) {
                        notices.push({
                            id: `unassigned-${day}-${period}-${absentTeacher}`,
                            type: 'unassigned',
                            icon: '🕒',
                            title: `Uncovered: ${period} (${absentTeacher})`,
                            desc: `${baseTask} requires a substitute.`,
                            meta: `${day} • ${period}`,
                            actionLabel: 'Assign Sub',
                            onAction: () => {
                                closeNotificationsModal();
                                openBottomSheet(period, absentTeacher);
                            }
                        });
                    }
                }
            });
        });
    }

    return notices;
}

let activeNoticeActions = new Map();

function updateNotificationBadge() {
    const notices = getOperationalNotices();
    const count = notices.length;

    const notifBadge = document.getElementById('notif-badge');
    const moreNotifBadge = document.getElementById('more-notif-badge');
    const modalCounter = document.getElementById('notif-modal-counter');

    if (notifBadge) {
        if (count > 0) {
            notifBadge.textContent = count > 99 ? '99+' : count;
            notifBadge.classList.remove('hidden');
        } else {
            notifBadge.classList.add('hidden');
        }
    }

    if (moreNotifBadge) {
        if (count > 0) {
            moreNotifBadge.textContent = count > 99 ? '99+' : count;
            moreNotifBadge.classList.remove('hidden');
        } else {
            moreNotifBadge.classList.add('hidden');
        }
    }

    if (modalCounter) {
        modalCounter.textContent = `${count} Notice${count === 1 ? '' : 's'}`;
        modalCounter.className = count > 0 ? 'reg-stat-pill stat-disputed' : 'reg-stat-pill stat-covered';
    }
}
window.updateNotificationBadge = updateNotificationBadge;

function renderNotificationCenter() {
    const body = document.getElementById('notifications-modal-body');
    if (!body) return;

    activeNoticeActions.clear();
    const notices = getOperationalNotices();

    if (notices.length === 0) {
        body.innerHTML = `
            <div style="text-align:center; padding:32px 16px; color:var(--text-secondary);">
                <div style="font-size:36px; margin-bottom:10px;">✨</div>
                <div style="font-weight:700; font-size:14px; color:var(--text-primary); margin-bottom:4px;">All Systems Operational</div>
                <div style="font-size:12px; max-width:280px; margin:0 auto; line-height:1.4;">No disputes, clashes, or pending officiating duties for ${state.day}.</div>
            </div>
        `;
        return;
    }

    let html = '';
    notices.forEach((n) => {
        activeNoticeActions.set(n.id, n.onAction);
        html += `
            <div class="notif-item-card">
                <div class="notif-item-icon">${n.icon}</div>
                <div class="notif-item-content">
                    <div class="notif-item-title">
                        <span>${n.title}</span>
                        <span style="font-size:10.5px; font-weight:600; color:var(--text-secondary); margin-left:auto;">${n.meta}</span>
                    </div>
                    <div class="notif-item-desc">${n.desc}</div>
                    <div class="notif-item-actions">
                        <button type="button" class="notif-action-btn primary" data-notif-action="${n.id}">${n.actionLabel}</button>
                    </div>
                </div>
            </div>
        `;
    });

    body.innerHTML = html;

    body.querySelectorAll('[data-notif-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-notif-action');
            const action = activeNoticeActions.get(id);
            if (typeof action === 'function') {
                action();
            }
        });
    });
}
window.renderNotificationCenter = renderNotificationCenter;

function openNotificationsModal() {
    renderNotificationCenter();
    updateNotificationBadge();
    const modal = document.getElementById('notifications-modal');
    const overlay = document.getElementById('notifications-overlay');
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}
window.openNotificationsModal = openNotificationsModal;

function closeNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    const overlay = document.getElementById('notifications-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.closeNotificationsModal = closeNotificationsModal;

// --- FEATURE TOUR MODAL ---
function openTourModal() {
    const modal = document.getElementById('tour-modal');
    const overlay = document.getElementById('tour-overlay');
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.add('active');
}

function closeTourModal() {
    const modal = document.getElementById('tour-modal');
    const overlay = document.getElementById('tour-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.remove('active');
}
window.openTourModal = openTourModal;
window.closeTourModal = closeTourModal;

function showToast(message, isCritical = false) {
    // If minimize alerts is on and message is non-critical, suppress toast
    if (state.settings && state.settings.minimizeAlerts && !isCritical) {
        return;
    }

    const toast = document.getElementById('undo-toast');
    const msgElement = document.getElementById('toast-message');
    if(!toast || !msgElement) return;
    
    msgElement.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 4000);
}

// --- REAL 2026 - 2027 MASTER TIMETABLE DATA (LITTLE FLOWER PREPARATORY SCHOOL) ---
const realMasterSchedule = {
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

// --- MOCK DATA & SIMULATION GENERATOR ENGINE ---
function generateProceduralRoutine() {
    const schedule = {};
    days.forEach(d => {
        schedule[d] = {};
        periods.forEach(p => {
            schedule[d][p] = {};
            teachers.forEach(t => schedule[d][p][t] = (p === 'BREAK' ? '-' : 'Free'));

            if (d === 'SAT' || p === 'BREAK' || p === 'PLAYTIME / 2ND GOLDEN HOUR') return;

            // Distribute subjects to classes using real curriculum allocations from Excel Table 2
            classes.forEach(cls => {
                const classAllocations = subjectAllocations.filter(a => a.class === cls);
                const shuffled = [...classAllocations].sort(() => Math.random() - 0.5);
                for (const alloc of shuffled) {
                    const candidateTeachers = alloc.assignedTeachers;
                    const allFree = candidateTeachers.every(t => schedule[d][p][t] === 'Free');
                    if (allFree) {
                        candidateTeachers.forEach(t => {
                            schedule[d][p][t] = `${alloc.subject} ${cls}`;
                        });
                        break;
                    }
                }
            });
        });
    });
    return schedule;
}

function generateSimulatedData(options = 'pristine') {
    const mode = typeof options === 'string' ? options : (options.mode || 'pristine');

    if (mode === 'procedural') {
        const proceduralSched = generateProceduralRoutine();
        state.schedule = JSON.parse(JSON.stringify(proceduralSched));
        state.baseSchedule = JSON.parse(JSON.stringify(proceduralSched));
    } else {
        state.schedule = JSON.parse(JSON.stringify(realMasterSchedule));
        state.baseSchedule = JSON.parse(JSON.stringify(realMasterSchedule));
    }

    state.substitutions = {};
    state.subStatus = {};
    state.officiatingAC = {};
    state.officiatingCT = {};
    state.subUnavailable = {};
    state.displaced = { 'MON': [], 'TUE': [], 'WED': [], 'THU': [], 'FRI': [], 'SAT': [] };
    state.absentTeachers = new Set();

    // Preset test scenarios for substitutions, coordinator delegation & officiating CT flows
    if (mode === 'single_absence') {
        state.absentTeachers.add('Ms. N. Horo'); // Hindi teacher absent
    } else if (mode === 'ct_absence') {
        state.absentTeachers.add('Mrs. S. Lakra'); // Class Teacher of KG A absent -> triggers Officiating CT prompt
    } else if (mode === 'dual_absence') {
        state.absentTeachers.add('Mrs. S. Lakra');
        state.absentTeachers.add('Ms. A. Amira');
    } else if (mode === 'coordinator_contingency') {
        state.absentTeachers.add(PRIMARY_AC);    // Mrs. R. Pahwa absent
        state.absentTeachers.add(ASSISTANT_AC);  // Mrs. S. Lakra absent -> triggers Officiating AC banner!
    }

    saveStateToStorage();
    if (typeof updateUndoUI === 'function') updateUndoUI();
    if (typeof renderAll === 'function') renderAll();
}
window.state = state;
window.staffDirectory = staffDirectory;
window.subjectsCatalog = subjectsCatalog;
window.subjectAllocations = subjectAllocations;
window.masterTimetableLog = masterTimetableLog;
window.generateSimulatedData = generateSimulatedData;
window.generateProceduralRoutine = generateProceduralRoutine;
window.openPinModal = openPinModal;
window.closePinModal = closePinModal;
window.toggleMasterEditMode = toggleMasterEditMode;
window.saveMasterBaseline = saveMasterBaseline;
window.cancelMasterBaseline = cancelMasterBaseline;
window.closeMasterCellModal = closeMasterCellModal;
window.applyMasterCellAllocation = applyMasterCellAllocation;
window.clearMasterCellAllocation = clearMasterCellAllocation;
window.syncFromGoogleSheets = syncFromGoogleSheets;
window.openCloudConflictModal = openCloudConflictModal;
window.closeCloudConflictModal = closeCloudConflictModal;
window.acceptCloudSchedule = acceptCloudSchedule;
window.keepLocalSchedule = keepLocalSchedule;
window.normalizeCSVUrl = normalizeCSVUrl;
window.parseTimetableFromCSV = parseTimetableFromCSV;
window.calculateScheduleDiffs = calculateScheduleDiffs;
window.findConflicts = findConflicts;
window.findCollisions = findCollisions;
window.renderAll = renderAll;
window.renderSubstitutions = renderSubstitutions;
window.executeMove = executeMove;