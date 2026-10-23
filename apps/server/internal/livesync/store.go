// Package livesync is the relay's live state (Bundle 35): a week-scoped map of entities,
// merged last-writer-wins (LWW) per entity.
//
// An entity is one independently editable fact, for example one absence, one substitution
// or one Off. AC appointment. Its key says what it is and which school date it belongs to:
//
//	abs|<date>|<teacher>          AbsenceRecord
//	sub|<date>|<id>               SubstitutionAssignment
//	avail|<weekStart>|<teacher>   StaffAvailability (availability is per week)
//	oac|<date>                    Officiating AC (teacher name)
//	oct|<date>|<class>            Officiating CT (teacher name)
//	sched|<date>|<period>|<teacher>  date-scoped routine edit (task text)
//	limbo|<date>                  displaced (Limbo) items for that date
//
// Name parts are URI-encoded by the client; the relay only parses the kind and the date.
// A null value is a tombstone (deleted). Tombstones are kept so a late, older write can't
// bring a deleted fact back.
//
// Conflict rule: the write with the higher (ts, by) wins, where ts is the editing device's
// clock in Unix ms and by is a device/tab id (tie-break). A ts more than MaxClockSkew ahead
// of the relay's clock is clamped to the relay's clock, so a device with a fast clock can't
// win every future conflict. See docs/SAS.md §6.3.
//
// Nothing is written to disk. The cache holds the active school week only and resets when
// the week changes; devices re-publish what they know on reconnect (relay model, Bundle 34).
package livesync

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"lfps/server/internal/storage"
)

const (
	// MaxClockSkew is how far a device clock may run ahead of the relay before its
	// timestamps are clamped.
	MaxClockSkew = 2 * time.Minute
	MaxKeyBytes  = 512
	MaxValueSize = 64 << 10
	MaxByBytes   = 128
	// MaxEntities bounds memory if a client misbehaves (a real week has a few hundred).
	MaxEntities = 20000
)

// Kinds are the entity kinds the relay accepts.
var Kinds = map[string]bool{"abs": true, "sub": true, "avail": true, "oac": true, "oct": true, "sched": true, "limbo": true}

// Entity is one LWW-merged fact. Value is raw JSON; null (or empty) means deleted.
type Entity struct {
	Key   string          `json:"k"`
	Value json.RawMessage `json:"v"`
	TS    int64           `json:"ts"`
	By    string          `json:"by"`
	Rev   int64           `json:"rev,omitempty"`
}

// Deleted reports whether e is a tombstone.
func (e Entity) Deleted() bool {
	v := bytes.TrimSpace(e.Value)
	return len(v) == 0 || bytes.Equal(v, []byte("null"))
}

// Kind and Date of a key ("" when malformed).
func ParseKey(key string) (kind, date string, ok bool) {
	parts := strings.Split(key, "|")
	if len(parts) < 2 || !Kinds[parts[0]] {
		return "", "", false
	}
	want := map[string]int{"abs": 3, "sub": 3, "avail": 3, "oac": 2, "oct": 3, "sched": 4, "limbo": 2}[parts[0]]
	if len(parts) != want {
		return "", "", false
	}
	for _, p := range parts[2:] {
		if p == "" {
			return "", "", false
		}
	}
	if _, err := time.Parse("2006-01-02", parts[1]); err != nil {
		return "", "", false
	}
	return parts[0], parts[1], true
}

// newer reports whether a beats b under (ts, by) ordering.
func newer(a, b Entity) bool {
	if a.TS != b.TS {
		return a.TS > b.TS
	}
	return a.By > b.By
}

// Rejection explains why a change was not stored.
type Rejection struct {
	Key    string `json:"k"`
	Reason string `json:"reason"`
}

// MergeResult is the outcome of one batch.
type MergeResult struct {
	// Stored is the relay's entity for every valid key in the batch after the merge
	// (the sender's write, or the newer one that beat it). The sender adopts these.
	Stored []Entity
	// Accepted are the writes that won; they are broadcast to the other devices.
	Accepted []Entity
	Rejected []Rejection
}

// Store is the thread-safe entity map for the active school week.
type Store struct {
	mu        sync.Mutex
	entities  map[string]Entity
	rev       int64
	weekStart string
	now       func() time.Time
	loc       *time.Location
}

// NewStore runs its calendar in the school time zone loc (see package schooltz).
func NewStore(loc *time.Location) *Store {
	if loc == nil {
		loc = time.UTC
	}
	s := NewStoreWithClock(func() time.Time { return time.Now().In(loc) })
	s.loc = loc
	return s
}

// NewStoreWithClock lets tests control "now".
func NewStoreWithClock(now func() time.Time) *Store {
	t := now()
	return &Store{entities: map[string]Entity{}, now: now, weekStart: storage.ActiveWeekStart(t), loc: t.Location()}
}

// Location is the school time zone.
func (s *Store) Location() *time.Location { return s.loc }

// Now is the relay clock in the school time zone.
func (s *Store) Now() time.Time { return s.now() }

func (s *Store) prepareLocked() time.Time {
	now := s.now()
	if ws := storage.ActiveWeekStart(now); ws != s.weekStart {
		s.weekStart = ws
		s.entities = map[string]Entity{}
	}
	return now
}

func (s *Store) inWeekLocked(kind, date string) bool {
	if kind == "avail" {
		return date == s.weekStart
	}
	start, _ := time.Parse("2006-01-02", s.weekStart)
	d, _ := time.Parse("2006-01-02", date)
	days := int(d.Sub(start).Hours() / 24)
	return days >= 0 && days <= 5 // MON..SAT
}

// ErrInvalid marks a malformed change.
var ErrInvalid = errors.New("invalid entity")

func (s *Store) validateLocked(e Entity) error {
	if len(e.Key) == 0 || len(e.Key) > MaxKeyBytes {
		return fmt.Errorf("%w: key length", ErrInvalid)
	}
	kind, date, ok := ParseKey(e.Key)
	if !ok {
		return fmt.Errorf("%w: key format", ErrInvalid)
	}
	if !s.inWeekLocked(kind, date) {
		return fmt.Errorf("%w: not in the active week %s", ErrInvalid, s.weekStart)
	}
	if e.TS <= 0 || e.By == "" || len(e.By) > MaxByBytes {
		return fmt.Errorf("%w: ts/by", ErrInvalid)
	}
	if len(e.Value) > MaxValueSize {
		return fmt.Errorf("%w: value too large", ErrInvalid)
	}
	if !e.Deleted() && !json.Valid(e.Value) {
		return fmt.Errorf("%w: value is not JSON", ErrInvalid)
	}
	return nil
}

// Merge applies a batch of changes under LWW.
func (s *Store) Merge(changes []Entity) MergeResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.prepareLocked()
	limit := now.Add(MaxClockSkew).UnixMilli()
	var res MergeResult
	for _, c := range changes {
		if err := s.validateLocked(c); err != nil {
			res.Rejected = append(res.Rejected, Rejection{Key: c.Key, Reason: err.Error()})
			continue
		}
		if c.TS > limit {
			c.TS = now.UnixMilli()
		}
		if c.Deleted() {
			c.Value = json.RawMessage("null")
		} else {
			c.Value = append(json.RawMessage(nil), c.Value...)
		}
		cur, exists := s.entities[c.Key]
		if !exists && len(s.entities) >= MaxEntities {
			res.Rejected = append(res.Rejected, Rejection{Key: c.Key, Reason: "relay full"})
			continue
		}
		if exists && !newer(c, cur) {
			res.Stored = append(res.Stored, cur)
			continue
		}
		s.rev++
		c.Rev = s.rev
		s.entities[c.Key] = c
		res.Stored = append(res.Stored, c)
		res.Accepted = append(res.Accepted, c)
	}
	return res
}

// Snapshot is the whole active week, sorted by key.
type Snapshot struct {
	WeekStart string   `json:"weekStart"`
	Rev       int64    `json:"rev"`
	Entities  []Entity `json:"entities"`
}

func (s *Store) Snapshot() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prepareLocked()
	out := Snapshot{WeekStart: s.weekStart, Rev: s.rev, Entities: make([]Entity, 0, len(s.entities))}
	for _, e := range s.entities {
		e.Value = append(json.RawMessage(nil), e.Value...) // callers may not alias the store
		out.Entities = append(out.Entities, e)
	}
	sort.Slice(out.Entities, func(i, j int) bool { return out.Entities[i].Key < out.Entities[j].Key })
	return out
}

// Rev is the current revision (bumps on every accepted write).
func (s *Store) Rev() int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.rev
}

var dayByOffset = [...]string{"MON", "TUE", "WED", "THU", "FRI", "SAT"}

// DailyState derives the classic week view (GET /state, Excel export) from the entities.
func (s *Store) DailyState() storage.DailyState {
	snap := s.Snapshot()
	now := s.now()
	st := storage.DailyState{
		Date:          now.Format("2006-01-02"),
		SelectedDay:   storage.SchoolDay(now),
		WeekStart:     snap.WeekStart,
		Absences:      []storage.AbsenceRecord{},
		Availability:  map[string]storage.StaffAvailability{},
		Substitutions: []storage.SubstitutionAssignment{},
		OfficiatingAC: map[string]string{},
		OfficiatingCT: map[string]map[string]string{},
	}
	start, _ := time.Parse("2006-01-02", snap.WeekStart)
	dayOf := func(date string) string {
		d, _ := time.Parse("2006-01-02", date)
		i := int(d.Sub(start).Hours() / 24)
		if i < 0 || i >= len(dayByOffset) {
			return ""
		}
		return dayByOffset[i]
	}
	for _, e := range snap.Entities {
		if e.TS > st.UpdatedAt {
			st.UpdatedAt = e.TS
		}
		if e.Deleted() {
			continue
		}
		kind, date, _ := ParseKey(e.Key)
		day := dayOf(date)
		switch kind {
		case "abs":
			var a storage.AbsenceRecord
			if json.Unmarshal(e.Value, &a) == nil {
				a.Day, a.Date = day, date
				st.Absences = append(st.Absences, a)
			}
		case "sub":
			var sub storage.SubstitutionAssignment
			if json.Unmarshal(e.Value, &sub) == nil {
				sub.Day = day
				st.Substitutions = append(st.Substitutions, sub)
			}
		case "avail":
			var av storage.StaffAvailability
			if json.Unmarshal(e.Value, &av) == nil && av.TeacherName != "" {
				st.Availability[av.TeacherName] = av
			}
		case "oac":
			var name string
			if json.Unmarshal(e.Value, &name) == nil && name != "" {
				st.OfficiatingAC[day] = name
			}
		case "oct":
			var name string
			cls := decodePart(strings.Split(e.Key, "|")[2])
			if json.Unmarshal(e.Value, &name) == nil && name != "" {
				if st.OfficiatingCT[day] == nil {
					st.OfficiatingCT[day] = map[string]string{}
				}
				st.OfficiatingCT[day][cls] = name
			}
		}
	}
	return st
}

// SubRecord is one substitution with its date and sync metadata (for the Sheets Subs tab).
type SubRecord struct {
	Key     string
	Date    string
	Deleted bool
	Sub     storage.SubstitutionAssignment
	TS      int64
	By      string
	Rev     int64
}

// Substitutions lists every sub entity in the active week, tombstones included.
func (s *Store) Substitutions() []SubRecord {
	snap := s.Snapshot()
	var out []SubRecord
	for _, e := range snap.Entities {
		kind, date, _ := ParseKey(e.Key)
		if kind != "sub" {
			continue
		}
		r := SubRecord{Key: e.Key, Date: date, Deleted: e.Deleted(), TS: e.TS, By: e.By, Rev: e.Rev}
		if !r.Deleted {
			_ = json.Unmarshal(e.Value, &r.Sub)
		}
		if r.Sub.ID == "" {
			r.Sub.ID = decodePart(strings.Split(e.Key, "|")[2])
		}
		out = append(out, r)
	}
	return out
}
