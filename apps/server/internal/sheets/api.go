// Package sheets is the relay's Google Sheets bridge (Bundle 35).
//
// Rules (docs/SAS.md §2, docs/SHEETS_SETUP.md):
//   - Every tab the owner made, and the two legacy tabs of the earlier app build
//     (Daily_Ledger, Baseline_Updates), is READ-ONLY. The bridge never writes, renames,
//     reorders, unhides or re-protects them.
//   - The bridge writes only to the tabs the app owns (WritableTabs), creating them when
//     missing. The allowlist is enforced in code by guard, the only write path the bridge has.
//   - Hidden tabs are not pulled.
//   - Writes are async, debounced and batched, with retry and exponential backoff, so a slow
//     or failing Sheets call never blocks a device.
package sheets

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
)

// App-owned tab names. Nothing else is ever written.
const (
	TabSubs = "Subs"
	TabMeta = "App_Meta"
	TabLog  = "App_Log"
)

// WritableTabs is the write allowlist.
var WritableTabs = map[string]bool{TabSubs: true, TabMeta: true, TabLog: true}

// LegacyTabs were written by the earlier app build. They stay read-only.
var LegacyTabs = map[string]bool{"Daily_Ledger": true, "Baseline_Updates": true}

// ErrForbiddenTab is returned for any write outside WritableTabs.
var ErrForbiddenTab = errors.New("sheets: tab is read-only for the app")

// Writable reports whether the app may write tab (exact, case-sensitive match).
func Writable(tab string) bool { return WritableTabs[tab] }

// TabInfo describes one tab.
type TabInfo struct {
	Title  string `json:"title"`
	ID     int64  `json:"id"`
	Hidden bool   `json:"hidden,omitempty"`
}

// API is the subset of the Sheets API v4 the bridge uses. Tests use a fake.
type API interface {
	Tabs(ctx context.Context) ([]TabInfo, error)
	// Read returns the tab's used range as formatted text.
	Read(ctx context.Context, tab string) ([][]string, error)
	// CreateTab adds an empty tab at the end.
	CreateTab(ctx context.Context, tab string) error
	// Write overwrites cells from A1 with rows (RAW input: no formulas are evaluated).
	Write(ctx context.Context, tab string, rows [][]string) error
	// Append adds rows after the last row.
	Append(ctx context.Context, tab string, rows [][]string) error
	// UpdateRows overwrites whole rows by 1-based row number in one batch (RAW input).
	// Rows not named are left alone.
	UpdateRows(ctx context.Context, tab string, rows map[int][]string) error
	// ClearRows clears the values of every row from fromRow (1-based) down. Only the
	// test-row cleanup (cmd/sheetcheck -selftest) uses it.
	ClearRows(ctx context.Context, tab string, fromRow int) error
}

// guard is the bridge's only handle on the API: reads pass, writes outside the allowlist fail.
// BatchReader is optional: an API that can read several tabs in one request. The live
// Sheets API implements it (values.batchGet), so a pull costs one read, not one per tab
// (the read quota is 60 requests a minute).
type BatchReader interface {
	ReadMany(ctx context.Context, tabs []string) (map[string][][]string, error)
}

// ReadMany reads tabs in one request when api supports it, else one by one.
func ReadMany(ctx context.Context, api API, tabs []string) (map[string][][]string, error) {
	if br, ok := api.(BatchReader); ok {
		return br.ReadMany(ctx, tabs)
	}
	out := make(map[string][][]string, len(tabs))
	for _, t := range tabs {
		rows, err := api.Read(ctx, t)
		if err != nil {
			return nil, fmt.Errorf("read %q: %w", t, err)
		}
		out[t] = rows
	}
	return out, nil
}

type guard struct{ api API }

func (g guard) ReadMany(ctx context.Context, tabs []string) (map[string][][]string, error) {
	return ReadMany(ctx, g.api, tabs)
}

func (g guard) check(tab string) error {
	if !Writable(tab) {
		return fmt.Errorf("%w: %q", ErrForbiddenTab, tab)
	}
	return nil
}

func (g guard) Tabs(ctx context.Context) ([]TabInfo, error) { return g.api.Tabs(ctx) }
func (g guard) Read(ctx context.Context, tab string) ([][]string, error) {
	return g.api.Read(ctx, tab)
}
func (g guard) CreateTab(ctx context.Context, tab string) error {
	if err := g.check(tab); err != nil {
		return err
	}
	return g.api.CreateTab(ctx, tab)
}
func (g guard) Write(ctx context.Context, tab string, rows [][]string) error {
	if err := g.check(tab); err != nil {
		return err
	}
	return g.api.Write(ctx, tab, rows)
}
func (g guard) Append(ctx context.Context, tab string, rows [][]string) error {
	if err := g.check(tab); err != nil {
		return err
	}
	return g.api.Append(ctx, tab, rows)
}

func (g guard) UpdateRows(ctx context.Context, tab string, rows map[int][]string) error {
	if err := g.check(tab); err != nil {
		return err
	}
	return g.api.UpdateRows(ctx, tab, rows)
}
func (g guard) ClearRows(ctx context.Context, tab string, fromRow int) error {
	if err := g.check(tab); err != nil {
		return err
	}
	return g.api.ClearRows(ctx, tab, fromRow)
}

// Guarded wraps api with the write allowlist, for tools outside this package.
func Guarded(api API) API { return guard{api} }

func sortedRowNumbers(rows map[int][]string) []int {
	out := make([]int, 0, len(rows))
	for n := range rows {
		out = append(out, n)
	}
	sort.Ints(out)
	return out
}

// A1Range quotes a tab name for an A1 range ('It”s'!A1).
func A1Range(tab, cells string) string {
	r := "'" + strings.ReplaceAll(tab, "'", "''") + "'"
	if cells != "" {
		r += "!" + cells
	}
	return r
}
