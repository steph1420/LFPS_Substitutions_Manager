package sheets

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// FileAPI is a spreadsheet kept in one local JSON file. It exists for local end-to-end
// tests of sheets mode (SHEETS_FAKE_FILE): the relay can be restarted and find its Subs
// tab again, without any Google account. It is never used when SHEETS_SPREADSHEET_ID is set.
//
// File format: {"tabs":[{"title":"Staff Directory","hidden":false,"rows":[["Full Name",…],…]}]}
type FileAPI struct {
	mu   sync.Mutex
	path string
}

type fileDoc struct {
	Tabs []fileTab `json:"tabs"`
}

type fileTab struct {
	Title  string     `json:"title"`
	Hidden bool       `json:"hidden,omitempty"`
	Rows   [][]string `json:"rows"`
}

// NewFileAPI opens (or, when missing, creates an empty) spreadsheet file.
func NewFileAPI(path string) (*FileAPI, error) {
	f := &FileAPI{path: path}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if err := f.save(fileDoc{}); err != nil {
			return nil, err
		}
	} else if _, err := f.load(); err != nil {
		return nil, err
	}
	return f, nil
}

func (f *FileAPI) load() (fileDoc, error) {
	var d fileDoc
	raw, err := os.ReadFile(f.path)
	if err != nil {
		return d, err
	}
	if err := json.Unmarshal(raw, &d); err != nil {
		return d, fmt.Errorf("fake sheet %s: %w", f.path, err)
	}
	return d, nil
}

func (f *FileAPI) save(d fileDoc) error {
	raw, err := json.MarshalIndent(d, "", " ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(f.path), ".fake-sheet-*")
	if err != nil {
		return err
	}
	if _, err := tmp.Write(raw); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), f.path)
}

// edit loads the file, applies fn to the named tab (nil when missing) and saves it.
func (f *FileAPI) edit(tab string, fn func(d *fileDoc, t *fileTab) error) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, err := f.load()
	if err != nil {
		return err
	}
	var t *fileTab
	for i := range d.Tabs {
		if d.Tabs[i].Title == tab {
			t = &d.Tabs[i]
		}
	}
	if err := fn(&d, t); err != nil {
		return err
	}
	return f.save(d)
}

func (f *FileAPI) Tabs(context.Context) ([]TabInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, err := f.load()
	if err != nil {
		return nil, err
	}
	out := make([]TabInfo, len(d.Tabs))
	for i, t := range d.Tabs {
		out[i] = TabInfo{Title: t.Title, ID: int64(i), Hidden: t.Hidden}
	}
	return out, nil
}

func (f *FileAPI) Read(_ context.Context, tab string) ([][]string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, err := f.load()
	if err != nil {
		return nil, err
	}
	for _, t := range d.Tabs {
		if t.Title == tab {
			return trimRows(t.Rows), nil
		}
	}
	return nil, fmt.Errorf("fake sheet: no tab %q", tab)
}

// trimRows mimics the API: trailing empty cells and trailing empty rows are not returned.
func trimRows(rows [][]string) [][]string {
	out := make([][]string, 0, len(rows))
	for _, r := range rows {
		n := len(r)
		for n > 0 && r[n-1] == "" {
			n--
		}
		out = append(out, append([]string{}, r[:n]...))
	}
	for len(out) > 0 && len(out[len(out)-1]) == 0 {
		out = out[:len(out)-1]
	}
	return out
}

func (f *FileAPI) CreateTab(_ context.Context, tab string) error {
	return f.edit(tab, func(d *fileDoc, t *fileTab) error {
		if t != nil {
			return fmt.Errorf("fake sheet: tab %q exists", tab)
		}
		d.Tabs = append(d.Tabs, fileTab{Title: tab})
		return nil
	})
}

func (f *FileAPI) Write(_ context.Context, tab string, rows [][]string) error {
	return f.UpdateRows(context.Background(), tab, rowsFrom(1, rows))
}

func (f *FileAPI) Append(_ context.Context, tab string, rows [][]string) error {
	return f.edit(tab, func(_ *fileDoc, t *fileTab) error {
		if t == nil {
			return fmt.Errorf("fake sheet: no tab %q", tab)
		}
		t.Rows = append(trimRows(t.Rows), rows...)
		return nil
	})
}

func (f *FileAPI) UpdateRows(_ context.Context, tab string, rows map[int][]string) error {
	return f.edit(tab, func(_ *fileDoc, t *fileTab) error {
		if t == nil {
			return fmt.Errorf("fake sheet: no tab %q", tab)
		}
		for _, n := range sortedRowNumbers(rows) {
			for len(t.Rows) < n {
				t.Rows = append(t.Rows, []string{})
			}
			t.Rows[n-1] = append([]string{}, rows[n]...)
		}
		return nil
	})
}

func (f *FileAPI) ClearRows(_ context.Context, tab string, fromRow int) error {
	return f.edit(tab, func(_ *fileDoc, t *fileTab) error {
		if t == nil {
			return fmt.Errorf("fake sheet: no tab %q", tab)
		}
		if len(t.Rows) >= fromRow {
			t.Rows = t.Rows[:fromRow-1]
		}
		return nil
	})
}

func rowsFrom(first int, rows [][]string) map[int][]string {
	m := make(map[int][]string, len(rows))
	for i, r := range rows {
		m[first+i] = r
	}
	return m
}
