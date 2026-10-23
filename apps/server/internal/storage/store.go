// Package storage holds the relay's in-memory view of the active school week.
//
// Bundle 34 (relay model, see docs/SAS.md): Google Sheets is the source of truth and the
// Render server is only a live relay. Nothing is written to disk: a restart or redeploy
// empties this cache and clients re-publish / the Sheets bridge (Bundle 35) reloads it.
// The cache is scoped to the active school week and resets itself when the week changes.
package storage

import (
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

// ErrValidation marks client errors (HTTP 400).
var ErrValidation = errors.New("validation failed")

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

var validDays = map[string]bool{"MON": true, "TUE": true, "WED": true, "THU": true, "FRI": true, "SAT": true}

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

// Store is a thread-safe, in-memory, week-scoped cache. No disk I/O.
type Store struct {
	mu    sync.Mutex
	state DailyState
	now   func() time.Time
	loc   *time.Location
}

// NewStore reads the wall clock in the school's time zone `loc` (see package schooltz),
// never the host's, so "today" and the active week match the web client.
func NewStore(loc *time.Location) *Store {
	if loc == nil {
		loc = time.UTC // time.Time.In panics on nil; callers should pass schooltz.Resolve(...).Location
	}
	s := NewStoreWithClock(func() time.Time { return time.Now().In(loc) })
	s.loc = loc
	return s
}

// Location is the time zone the store's calendar runs in.
func (s *Store) Location() *time.Location {
	if s.loc == nil {
		return s.now().Location()
	}
	return s.loc
}

// NewStoreWithClock allows tests to control "today".
func NewStoreWithClock(now func() time.Time) *Store {
	s := &Store{now: now}
	s.state = emptyState(ActiveWeekStart(now()))
	return s
}

func emptyState(weekStart string) DailyState {
	return DailyState{
		WeekStart:     weekStart,
		Absences:      make([]AbsenceRecord, 0),
		Availability:  make(map[string]StaffAvailability),
		Substitutions: make([]SubstitutionAssignment, 0),
		OfficiatingAC: make(map[string]string),
		OfficiatingCT: make(map[string]map[string]string),
	}
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

// prepareLocked resets the cache on a week change and stamps per-request date fields.
func (s *Store) prepareLocked() time.Time {
	now := s.now()
	if ws := ActiveWeekStart(now); ws != s.state.WeekStart {
		s.state = emptyState(ws)
	}
	s.state.Date = now.Format("2006-01-02")
	s.state.SelectedDay = SchoolDay(now)
	return now
}

func (s *Store) touchLocked(now time.Time) DailyState {
	s.state.UpdatedAt = now.UnixMilli()
	return s.state.Clone()
}

// GetState returns a deep copy of the current week.
func (s *Store) GetState() DailyState {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prepareLocked()
	return s.state.Clone()
}

func validationErr(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrValidation, fmt.Sprintf(format, args...))
}

func (s *Store) ToggleAbsence(record AbsenceRecord) (DailyState, error) {
	record.Day = strings.ToUpper(record.Day)
	if record.TeacherName == "" || !validDays[record.Day] {
		return DailyState{}, validationErr("teacherName and a day MON–SAT are required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.prepareLocked()

	for i, a := range s.state.Absences {
		if a.TeacherName == record.TeacherName && a.Day == record.Day {
			s.state.Absences = append(s.state.Absences[:i:i], s.state.Absences[i+1:]...)
			return s.touchLocked(now), nil
		}
	}
	record.MarkedAt = now.UnixMilli()
	record.Periods = append([]string(nil), record.Periods...)
	s.state.Absences = append(s.state.Absences, record)
	return s.touchLocked(now), nil
}

func (s *Store) SetAvailability(avail StaffAvailability) (DailyState, error) {
	if avail.TeacherName == "" {
		return DailyState{}, validationErr("teacherName is required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.prepareLocked()
	avail.UpdatedAt = now.UnixMilli()
	s.state.Availability[avail.TeacherName] = avail
	return s.touchLocked(now), nil
}

func (s *Store) AssignSubstitution(sub SubstitutionAssignment) (DailyState, error) {
	sub.Day = strings.ToUpper(sub.Day)
	if sub.Status == "" {
		sub.Status = "PENDING"
	}
	if !ValidSubstitutionStatuses[sub.Status] {
		return DailyState{}, validationErr("unknown status %q", sub.Status)
	}
	if !validDays[sub.Day] || sub.Period == "" || sub.OriginalTeacher == "" {
		return DailyState{}, validationErr("day MON–SAT, period and originalTeacher are required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.prepareLocked()

	filtered := make([]SubstitutionAssignment, 0, len(s.state.Substitutions)+1)
	for _, existing := range s.state.Substitutions {
		if !(existing.Day == sub.Day && existing.Period == sub.Period && existing.OriginalTeacher == sub.OriginalTeacher) {
			filtered = append(filtered, existing)
		}
	}
	if sub.ID == "" {
		sub.ID = fmt.Sprintf("sub-%d", now.UnixNano())
	}
	if sub.AssignedAt == 0 {
		sub.AssignedAt = now.UnixMilli()
	}
	s.state.Substitutions = append(filtered, sub)
	return s.touchLocked(now), nil
}

func (s *Store) RemoveSubstitution(id string) (DailyState, error) {
	if id == "" {
		return DailyState{}, validationErr("id is required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.prepareLocked()

	filtered := make([]SubstitutionAssignment, 0, len(s.state.Substitutions))
	for _, sub := range s.state.Substitutions {
		if sub.ID != id {
			filtered = append(filtered, sub)
		}
	}
	s.state.Substitutions = filtered
	return s.touchLocked(now), nil
}
