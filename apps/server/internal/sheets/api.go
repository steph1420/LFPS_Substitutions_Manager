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
}

// guard is the bridge's only handle on the API: reads pass, writes outside the allowlist fail.
type guard struct{ api API }

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

// A1Range quotes a tab name for an A1 range ('It”s'!A1).
func A1Range(tab, cells string) string {
	r := "'" + strings.ReplaceAll(tab, "'", "''") + "'"
	if cells != "" {
		r += "!" + cells
	}
	return r
}
