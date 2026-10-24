// Package storage holds the shared week types and the school calendar helpers.
//
// Bundle 35: the live state itself moved to package livesync (per-entity last-writer-wins
// over WebSocket). DailyState is now a derived, read-only view of it, used by
// GET /api/v1/state and the Excel export. The old REST mutation methods were removed.
package storage

import "time"

// AbsenceRecord represents an absence or official deputation
type AbsenceRecord struct {
	TeacherID   string   `json:"teacherId"`
	TeacherName string   `json:"teacherName"`
	Day         string   `json:"day"`
	Date        string   `json:"date,omitempty"`
	Type        string   `json:"type"` // "FULL_DAY", "PERIODS", "AWAY_OFFICIAL"
	Periods     []string `json:"periods,omitempty"`
	Reason      string   `json:"reason,omitempty"`
	Venue       string   `json:"venue,omitempty"`
	MarkedAt    int64    `json:"markedAt"`
	MarkedBy    string   `json:"markedBy,omitempty"`
}

// StaffAvailability represents sub availability toggle
type StaffAvailability struct {
	TeacherName string `json:"teacherName"`
	Status      string `json:"status"` // "AVAILABLE", "FREE_FROM_SUB"
	IsAvailable bool   `json:"isAvailable"`
	DutyPreset  string `json:"dutyPreset,omitempty"`
	Remark      string `json:"remark,omitempty"`
	UpdatedAt   int64  `json:"updatedAt"`
}

// SubstitutionAssignment mirrors @lfps/core SubstitutionAssignment (packages/core/src/types).
type SubstitutionAssignment struct {
	ID                string `json:"id"`
	Day               string `json:"day"`
	Period            string `json:"period"`
	OriginalTeacher   string `json:"originalTeacher"`
	SubstituteTeacher string `json:"substituteTeacher,omitempty"`
	ClassName         string `json:"className"`
	Subject           string `json:"subject"`
	Status            string `json:"status"` // see ValidSubstitutionStatuses
	Remark            string `json:"remark,omitempty"`
	DisputeRemark     string `json:"disputeRemark,omitempty"`
	AcceptedAt        int64  `json:"acceptedAt,omitempty"`
	DisputedAt        int64  `json:"disputedAt,omitempty"`
	AssignedAt        int64  `json:"assignedAt"`
	AssignedBy        string `json:"assignedBy,omitempty"`
}

// ValidSubstitutionStatuses mirrors core's SubstitutionStatus union.
var ValidSubstitutionStatuses = map[string]bool{
	"PENDING": true, "COVERED": true, "FREE_FROM_SUB": true, "ACCEPTED": true, "DISPUTED": true,
}

// DailyState is the relay's snapshot of the active school week.
type DailyState struct {
	Date          string                       `json:"date"`        // today, server local time (TZ)
	SelectedDay   string                       `json:"selectedDay"` // today's school day (Sunday → MON)
	WeekStart     string                       `json:"weekStart"`   // Monday of the active school week
	Absences      []AbsenceRecord              `json:"absences"`
	Availability  map[string]StaffAvailability `json:"availability"`
	Substitutions []SubstitutionAssignment     `json:"substitutions"`
	OfficiatingAC map[string]string            `json:"officiatingAC"` // day -> teacher
	OfficiatingCT map[string]map[string]string `json:"officiatingCT"` // day -> class -> teacher
	UpdatedAt     int64                        `json:"updatedAt"`
}

// Clone returns a deep copy, so callers (HTTP encoders, the WS hub) never share
// slices or maps with the store.
func (d DailyState) Clone() DailyState {
	out := d
	out.Absences = make([]AbsenceRecord, len(d.Absences))
	for i, a := range d.Absences {
		a.Periods = append([]string(nil), a.Periods...)
		out.Absences[i] = a
	}
	out.Availability = make(map[string]StaffAvailability, len(d.Availability))
	for k, v := range d.Availability {
		out.Availability[k] = v
	}
	out.Substitutions = append(make([]SubstitutionAssignment, 0, len(d.Substitutions)), d.Substitutions...)
	out.OfficiatingAC = make(map[string]string, len(d.OfficiatingAC))
	for k, v := range d.OfficiatingAC {
		out.OfficiatingAC[k] = v
	}
	out.OfficiatingCT = make(map[string]map[string]string, len(d.OfficiatingCT))
	for day, classes := range d.OfficiatingCT {
		inner := make(map[string]string, len(classes))
		for c, t := range classes {
			inner[c] = t
		}
		out.OfficiatingCT[day] = inner
	}
	return out
}

var dayCodes = [...]string{"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"}

// ActiveWeekStart mirrors core's activeWeekStart: Monday of this week; Sunday rolls forward.
func ActiveWeekStart(t time.Time) string {
	d := time.Date(t.Year(), t.Month(), t.Day(), 12, 0, 0, 0, t.Location())
	wd := int(d.Weekday())
	offset := 1 - wd // to Monday
	if wd == 0 {
		offset = 1
	}
	return d.AddDate(0, 0, offset).Format("2006-01-02")
}

// SchoolDay returns today's school-day code; Sunday maps to the coming Monday.
func SchoolDay(t time.Time) string {
	if t.Weekday() == time.Sunday {
		return "MON"
	}
	return dayCodes[t.Weekday()]
}
