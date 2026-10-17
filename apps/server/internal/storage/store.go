package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

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

// SubstitutionAssignment represents an assigned substitution
type SubstitutionAssignment struct {
	ID                string `json:"id"`
	Day               string `json:"day"`
	Period            string `json:"period"`
	OriginalTeacher   string `json:"originalTeacher"`
	SubstituteTeacher string `json:"substituteTeacher"`
	ClassName         string `json:"className"`
	Subject           string `json:"subject"`
	Status            string `json:"status"` // "PENDING", "COVERED", "FREE_FROM_SUB", "DISPUTED"
	Remark            string `json:"remark,omitempty"`
	AssignedAt        int64  `json:"assignedAt"`
	AssignedBy        string `json:"assignedBy,omitempty"`
}

// DailyState encapsulates all active state for the school day
type DailyState struct {
	Date          string                            `json:"date"`
	SelectedDay   string                            `json:"selectedDay"`
	Absences      []AbsenceRecord                   `json:"absences"`
	Availability  map[string]StaffAvailability      `json:"availability"`
	Substitutions []SubstitutionAssignment          `json:"substitutions"`
	OfficiatingAC map[string]string                 `json:"officiatingAC"` // day -> teacher
	OfficiatingCT map[string]map[string]string      `json:"officiatingCT"` // day -> class -> teacher
	UpdatedAt     int64                             `json:"updatedAt"`
}

// Store provides thread-safe disk persistence for school operations
type Store struct {
	dataDir  string
	filePath string
	state    DailyState
	mutex    sync.RWMutex
}

func NewStore(dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data dir: %w", err)
	}

	backupDir := filepath.Join(dataDir, "backups")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup dir: %w", err)
	}

	statePath := filepath.Join(dataDir, "current_state.json")
	store := &Store{
		dataDir:  dataDir,
		filePath: statePath,
		state: DailyState{
			Date:          time.Now().Format("2006-01-02"),
			SelectedDay:   "MON",
			Absences:      make([]AbsenceRecord, 0),
			Availability:  make(map[string]StaffAvailability),
			Substitutions: make([]SubstitutionAssignment, 0),
			OfficiatingAC: make(map[string]string),
			OfficiatingCT: make(map[string]map[string]string),
			UpdatedAt:     time.Now().UnixMilli(),
		},
	}

	// Load existing state if file exists
	if _, err := os.Stat(statePath); err == nil {
		data, err := os.ReadFile(statePath)
		if err == nil {
			var loaded DailyState
			if err := json.Unmarshal(data, &loaded); err == nil {
				store.state = loaded
			}
		}
	}

	return store, nil
}

func (s *Store) GetState() DailyState {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.state
}

func (s *Store) SaveState(state DailyState) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	state.UpdatedAt = time.Now().UnixMilli()
	s.state = state

	bytes, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, bytes, 0644)
}

func (s *Store) ToggleAbsence(record AbsenceRecord) (DailyState, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	foundIndex := -1
	for i, a := range s.state.Absences {
		if a.TeacherName == record.TeacherName && a.Day == record.Day {
			foundIndex = i
			break
		}
	}

	if foundIndex >= 0 {
		// Remove absence
		s.state.Absences = append(s.state.Absences[:foundIndex], s.state.Absences[foundIndex+1:]...)
	} else {
		// Add absence
		record.MarkedAt = time.Now().UnixMilli()
		s.state.Absences = append(s.state.Absences, record)
	}

	s.state.UpdatedAt = time.Now().UnixMilli()
	_ = s.persistLocked()
	return s.state, nil
}

func (s *Store) SetAvailability(avail StaffAvailability) (DailyState, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	avail.UpdatedAt = time.Now().UnixMilli()
	if s.state.Availability == nil {
		s.state.Availability = make(map[string]StaffAvailability)
	}
	s.state.Availability[avail.TeacherName] = avail
	s.state.UpdatedAt = time.Now().UnixMilli()
	_ = s.persistLocked()
	return s.state, nil
}

func (s *Store) AssignSubstitution(sub SubstitutionAssignment) (DailyState, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Filter out existing sub for the exact same slot
	filtered := make([]SubstitutionAssignment, 0, len(s.state.Substitutions))
	for _, existing := range s.state.Substitutions {
		if !(existing.Day == sub.Day && existing.Period == sub.Period && existing.OriginalTeacher == sub.OriginalTeacher) {
			filtered = append(filtered, existing)
		}
	}

	if sub.ID == "" {
		sub.ID = fmt.Sprintf("sub-%d", time.Now().UnixNano())
	}
	sub.AssignedAt = time.Now().UnixMilli()
	s.state.Substitutions = append(filtered, sub)
	s.state.UpdatedAt = time.Now().UnixMilli()
	_ = s.persistLocked()
	return s.state, nil
}

func (s *Store) RemoveSubstitution(id string) (DailyState, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	filtered := make([]SubstitutionAssignment, 0, len(s.state.Substitutions))
	for _, sub := range s.state.Substitutions {
		if sub.ID != id {
			filtered = append(filtered, sub)
		}
	}
	s.state.Substitutions = filtered
	s.state.UpdatedAt = time.Now().UnixMilli()
	_ = s.persistLocked()
	return s.state, nil
}

func (s *Store) persistLocked() error {
	bytes, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath, bytes, 0644)
}

