// Command sheetcheck verifies the Google Sheets setup (docs/SHEETS_SETUP.md).
//
//	SHEETS_SPREADSHEET_ID=... GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json go run ./cmd/sheetcheck [-ensure]
//
// Without -ensure it is read-only: it lists the tabs (name, hidden, protected, row count)
// and the header row of the two legacy tabs. Hidden tabs are reported by name only; their
// cells are not read. It never prints cell data, and it prints the
// service account's email domain only.
//
// With -ensure it also creates the app-owned tabs if missing and writes App_Meta (through
// the same allowlisted bridge the server uses), then proves that no other tab changed by
// comparing a fingerprint of every other tab before and after.
//
// With -selftest it runs the restart/tombstone cycle on the Subs tab (sheets.SelfTest):
// three test substitutions keyed "zz-itest-…" are written, reloaded by a fresh store,
// one is deleted and reloaded as a tombstone; then every test row is removed again. Only
// Subs and App_Meta are written, and the other tabs are verified unchanged as for -ensure.
// -clean removes leftover test rows only.
//
// With -protect (owner's choice, see docs/SHEETS_SETUP.md §5) it adds a protection to each
// existing app-owned tab that lists only the service account as editor. The spreadsheet
// owner can always edit and can remove it in Data → Protect sheets and ranges.
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"google.golang.org/api/option"
	sheetsv4 "google.golang.org/api/sheets/v4"

	"lfps/server/internal/livesync"
	"lfps/server/internal/sheets"
	"lfps/server/internal/version"
)

type tabState struct {
	Title     string
	Hidden    bool
	Protected int  // protected ranges on the tab
	SAEditor  bool // the service account is an editor of at least one of them
	Rows      int
	Hash      string // fingerprint of properties + values (never printed in full)
}

func main() {
	ensure := flag.Bool("ensure", false, "create the app-owned tabs if missing and write App_Meta")
	selftest := flag.Bool("selftest", false, "write, reload, delete and clean up test rows in Subs (see docs/SHEETS_SETUP.md)")
	clean := flag.Bool("clean", false, "remove leftover self-test rows from Subs")
	protect := flag.Bool("protect", false, "protect the app-owned tabs so only the service account (and the file owner) can edit them")
	flag.Parse()
	id := os.Getenv("SHEETS_SPREADSHEET_ID")
	cred := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if id == "" || cred == "" {
		log.Fatal("set SHEETS_SPREADSHEET_ID and GOOGLE_APPLICATION_CREDENTIALS")
	}
	saEmail := clientEmail(cred)
	if at := strings.LastIndex(saEmail, "@"); at >= 0 {
		fmt.Printf("Service account domain: %s\n", saEmail[at+1:])
	}
	ctx := context.Background()
	svc, err := sheetsv4.NewService(ctx, option.WithCredentialsFile(cred), option.WithScopes(sheetsv4.SpreadsheetsScope))
	if err != nil {
		log.Fatalf("client: %v", err)
	}

	before, err := snapshot(ctx, svc, id, saEmail)
	if err != nil {
		log.Fatalf("read failed (is the sheet shared with the service account?): %v", err)
	}
	fmt.Printf("\n%-20s %-6s %-9s %-8s %s\n", "TAB", "HIDDEN", "PROTECTED", "SA-EDIT", "ROWS")
	for _, t := range before {
		fmt.Printf("%-20s %-6v %-9d %-8v %d\n", t.Title, t.Hidden, t.Protected, t.SAEditor, t.Rows)
	}
	for _, name := range []string{"Daily_Ledger", "Baseline_Updates"} {
		vr, err := svc.Spreadsheets.Values.Get(id, sheets.A1Range(name, "1:1")).Context(ctx).Do()
		if err == nil && len(vr.Values) > 0 {
			fmt.Printf("Legacy %s header: %v\n", name, vr.Values[0])
		}
	}
	if *protect {
		protectAppTabs(ctx, svc, id, saEmail)
		return
	}
	if !*ensure && !*selftest && !*clean {
		return
	}

	api, err := sheets.NewGoogleAPI(ctx, id, cred)
	if err != nil {
		log.Fatal(err)
	}
	failed := false
	switch {
	case *selftest:
		loc, _ := time.LoadLocation("Asia/Kolkata")
		rep, err := sheets.SelfTest(ctx, api, version.Version, loc)
		fmt.Println()
		for _, s := range rep.Steps {
			fmt.Println("  ✓", s)
		}
		if err != nil {
			fmt.Printf("SELFTEST FAILED: %v\n", err)
			failed = true
		} else {
			fmt.Println("Self-test passed.")
		}
	case *clean:
		n, err := sheets.CleanSelfTestRows(ctx, api, version.Version, time.UTC)
		if err != nil {
			log.Fatalf("clean: %v", err)
		}
		fmt.Printf("\nRemoved %d self-test row(s).\n", n)
	default:
		b := sheets.New(api, livesync.NewStore(time.UTC), sheets.Config{AppVersion: version.Version})
		if err := b.EnsureTabs(ctx); err != nil {
			log.Fatalf("ensure tabs: %v", err)
		}
		if err := b.WriteMeta(ctx); err != nil {
			log.Fatalf("write App_Meta: %v", err)
		}
		fmt.Println("\nApp-owned tabs ready; App_Meta written.")
	}

	after, err := snapshot(ctx, svc, id, saEmail)
	if err != nil {
		log.Fatal(err)
	}
	prev := map[string]tabState{}
	for _, t := range before {
		prev[t.Title] = t
	}
	changed := 0
	for _, t := range after {
		p, existed := prev[t.Title]
		switch {
		case sheets.Writable(t.Title):
			fmt.Printf("app-owned %-10s rows=%d protected=%d (existed before: %v)\n", t.Title, t.Rows, t.Protected, existed)
		case !existed:
			fmt.Printf("UNEXPECTED new tab %q\n", t.Title)
			changed++
		case p.Hash != t.Hash:
			fmt.Printf("CHANGED: %q\n", t.Title)
			changed++
		}
	}
	if changed == 0 {
		fmt.Printf("Verified: none of the %d other tabs changed (values, order, visibility, protection).\n", countOther(before))
	}
	if changed > 0 || failed {
		os.Exit(1)
	}
}

func countOther(ts []tabState) int {
	n := 0
	for _, t := range ts {
		if !sheets.Writable(t.Title) {
			n++
		}
	}
	return n
}

func clientEmail(path string) string {
	raw, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("credentials file: %v", err)
	}
	var k struct {
		ClientEmail string `json:"client_email"`
	}
	_ = json.Unmarshal(raw, &k)
	return k.ClientEmail
}

func snapshot(ctx context.Context, svc *sheetsv4.Service, id, saEmail string) ([]tabState, error) {
	ss, err := svc.Spreadsheets.Get(id).
		Fields("sheets(properties(title,sheetId,hidden,index),protectedRanges(range,warningOnly,editors(users)))").
		Context(ctx).Do()
	if err != nil {
		return nil, err
	}
	// One batchGet for all visible tabs (the read quota is 60 requests a minute).
	// Hidden tabs are the owner's private tabs: their cells are not read (properties only).
	var ranges []string
	for _, s := range ss.Sheets {
		if !s.Properties.Hidden {
			ranges = append(ranges, sheets.A1Range(s.Properties.Title, ""))
		}
	}
	values := map[string][][]interface{}{}
	if len(ranges) > 0 {
		br, err := svc.Spreadsheets.Values.BatchGet(id).Ranges(ranges...).Context(ctx).Do()
		if err != nil {
			return nil, fmt.Errorf("read tabs: %w", err)
		}
		for i, vr := range br.ValueRanges {
			if i < len(ranges) {
				values[ranges[i]] = vr.Values
			}
		}
	}
	var out []tabState
	for _, s := range ss.Sheets {
		p := s.Properties
		t := tabState{Title: p.Title, Hidden: p.Hidden, Protected: len(s.ProtectedRanges)}
		for _, pr := range s.ProtectedRanges {
			if pr.Editors != nil {
				for _, u := range pr.Editors.Users {
					if strings.EqualFold(u, saEmail) {
						t.SAEditor = true
					}
				}
			}
		}
		h := sha256.New()
		props, _ := json.Marshal(p)
		prot, _ := json.Marshal(s.ProtectedRanges)
		h.Write(props)
		h.Write(prot)
		t.Rows = -1
		if !p.Hidden {
			vals := values[sheets.A1Range(p.Title, "")]
			t.Rows = len(vals)
			raw, _ := json.Marshal(vals)
			h.Write(raw)
		}
		t.Hash = hex.EncodeToString(h.Sum(nil))
		out = append(out, t)
	}
	return out, nil
}

// protectAppTabs adds a service-account-only protection to the app-owned tabs that have none.
func protectAppTabs(ctx context.Context, svc *sheetsv4.Service, id, saEmail string) {
	if saEmail == "" {
		log.Fatal("no client_email in the credentials file")
	}
	ss, err := svc.Spreadsheets.Get(id).Fields("sheets(properties(title,sheetId),protectedRanges(protectedRangeId))").Context(ctx).Do()
	if err != nil {
		log.Fatal(err)
	}
	var reqs []*sheetsv4.Request
	for _, s := range ss.Sheets {
		if !sheets.Writable(s.Properties.Title) || len(s.ProtectedRanges) > 0 {
			continue
		}
		reqs = append(reqs, &sheetsv4.Request{AddProtectedRange: &sheetsv4.AddProtectedRangeRequest{
			ProtectedRange: &sheetsv4.ProtectedRange{
				Range:       &sheetsv4.GridRange{SheetId: s.Properties.SheetId, ForceSendFields: []string{"SheetId"}},
				Description: "LFPS app-owned tab: written by the relay only",
				Editors:     &sheetsv4.Editors{Users: []string{saEmail}},
			},
		}})
		fmt.Printf("Protecting %s\n", s.Properties.Title)
	}
	if len(reqs) == 0 {
		fmt.Println("Nothing to protect.")
		return
	}
	if _, err := svc.Spreadsheets.BatchUpdate(id, &sheetsv4.BatchUpdateSpreadsheetRequest{Requests: reqs}).Context(ctx).Do(); err != nil {
		log.Fatal(err)
	}
}
