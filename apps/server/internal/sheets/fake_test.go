package sheets

import (
	"context"
	"errors"
	"fmt"
	"sync"
)

// fakeAPI is an in-memory spreadsheet. It records every write so tests can prove that
// only app-owned tabs were touched.
type fakeAPI struct {
	mu     sync.Mutex
	order  []string
	hidden map[string]bool
	data   map[string][][]string
	writes []string // "op:tab"
	fail   int      // fail the next n write calls
}

func newFake() *fakeAPI {
	f := &fakeAPI{hidden: map[string]bool{}, data: map[string][][]string{}}
	f.add("Staff Directory", false, [][]string{{"Name", "Designation"}, {"Mrs. A", "PGT"}})
	f.add("OVERVIEW", false, [][]string{{"x"}})
	f.add("Daily_Ledger", false, [][]string{{"Log Timestamp", "School Day"}})
	f.add("Owner Notes", true, [][]string{{"private"}})
	return f
}

func (f *fakeAPI) add(name string, hidden bool, rows [][]string) {
	f.order = append(f.order, name)
	f.hidden[name] = hidden
	f.data[name] = rows
}

func (f *fakeAPI) Tabs(context.Context) ([]TabInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []TabInfo{}
	for i, n := range f.order {
		out = append(out, TabInfo{Title: n, ID: int64(i), Hidden: f.hidden[n]})
	}
	return out, nil
}

func (f *fakeAPI) Read(_ context.Context, tab string) ([][]string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	rows, ok := f.data[tab]
	if !ok {
		return nil, fmt.Errorf("no tab %q", tab)
	}
	out := make([][]string, len(rows))
	for i, r := range rows {
		out[i] = append([]string(nil), r...)
	}
	return out, nil
}

func (f *fakeAPI) failing() error {
	if f.fail > 0 {
		f.fail--
		return errors.New("503 backend error")
	}
	return nil
}

func (f *fakeAPI) CreateTab(_ context.Context, tab string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.writes = append(f.writes, "create:"+tab)
	if err := f.failing(); err != nil {
		return err
	}
	if _, ok := f.data[tab]; ok {
		return fmt.Errorf("tab %q exists", tab)
	}
	f.add(tab, false, nil)
	return nil
}

func (f *fakeAPI) Write(_ context.Context, tab string, rows [][]string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.writes = append(f.writes, "write:"+tab)
	if err := f.failing(); err != nil {
		return err
	}
	cur := f.data[tab]
	for i, r := range rows {
		if i < len(cur) {
			cur[i] = append([]string(nil), r...)
		} else {
			cur = append(cur, append([]string(nil), r...))
		}
	}
	f.data[tab] = cur
	return nil
}

func (f *fakeAPI) Append(_ context.Context, tab string, rows [][]string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.writes = append(f.writes, "append:"+tab)
	if err := f.failing(); err != nil {
		return err
	}
	f.data[tab] = append(f.data[tab], rows...)
	return nil
}

func (f *fakeAPI) touched() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.writes...)
}
