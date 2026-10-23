package sheets

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/api/option"
	sheetsv4 "google.golang.org/api/sheets/v4"
)

// googleAPI talks to the real Sheets API v4 with a service account.
type googleAPI struct {
	svc *sheetsv4.Service
	id  string
}

// NewGoogleAPI builds a client from a service-account key file. The key is read by the
// Google client library; this package never logs it.
func NewGoogleAPI(ctx context.Context, spreadsheetID, credentialsFile string) (API, error) {
	svc, err := sheetsv4.NewService(ctx,
		option.WithCredentialsFile(credentialsFile),
		option.WithScopes(sheetsv4.SpreadsheetsScope),
	)
	if err != nil {
		return nil, fmt.Errorf("sheets client: %w", err)
	}
	return &googleAPI{svc: svc, id: spreadsheetID}, nil
}

func withTimeout(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, 30*time.Second)
}

func (g *googleAPI) Tabs(ctx context.Context) ([]TabInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	ss, err := g.svc.Spreadsheets.Get(g.id).Fields("sheets.properties(title,sheetId,hidden)").Context(ctx).Do()
	if err != nil {
		return nil, err
	}
	out := make([]TabInfo, 0, len(ss.Sheets))
	for _, s := range ss.Sheets {
		if s.Properties == nil {
			continue
		}
		out = append(out, TabInfo{Title: s.Properties.Title, ID: s.Properties.SheetId, Hidden: s.Properties.Hidden})
	}
	return out, nil
}

// ReadMany reads several tabs with one values.batchGet (formatted text, like Read).
func (g *googleAPI) ReadMany(ctx context.Context, tabs []string) (map[string][][]string, error) {
	out := make(map[string][][]string, len(tabs))
	if len(tabs) == 0 {
		return out, nil
	}
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	ranges := make([]string, len(tabs))
	for i, t := range tabs {
		ranges[i] = A1Range(t, "")
	}
	br, err := g.svc.Spreadsheets.Values.BatchGet(g.id).Ranges(ranges...).ValueRenderOption("FORMATTED_VALUE").Context(ctx).Do()
	if err != nil {
		return nil, err
	}
	if len(br.ValueRanges) != len(tabs) {
		return nil, fmt.Errorf("batchGet returned %d ranges for %d tabs", len(br.ValueRanges), len(tabs))
	}
	for i, vr := range br.ValueRanges {
		rows := make([][]string, len(vr.Values))
		for r, row := range vr.Values {
			rows[r] = make([]string, len(row))
			for c, v := range row {
				rows[r][c] = fmt.Sprint(v)
			}
		}
		out[tabs[i]] = rows
	}
	return out, nil
}

func (g *googleAPI) Read(ctx context.Context, tab string) ([][]string, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	vr, err := g.svc.Spreadsheets.Values.Get(g.id, A1Range(tab, "")).ValueRenderOption("FORMATTED_VALUE").Context(ctx).Do()
	if err != nil {
		return nil, err
	}
	rows := make([][]string, len(vr.Values))
	for i, r := range vr.Values {
		rows[i] = make([]string, len(r))
		for j, c := range r {
			rows[i][j] = fmt.Sprint(c)
		}
	}
	return rows, nil
}

func (g *googleAPI) CreateTab(ctx context.Context, tab string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	_, err := g.svc.Spreadsheets.BatchUpdate(g.id, &sheetsv4.BatchUpdateSpreadsheetRequest{
		Requests: []*sheetsv4.Request{{AddSheet: &sheetsv4.AddSheetRequest{Properties: &sheetsv4.SheetProperties{Title: tab}}}},
	}).Context(ctx).Do()
	return err
}

func toValues(rows [][]string) [][]interface{} {
	out := make([][]interface{}, len(rows))
	for i, r := range rows {
		out[i] = make([]interface{}, len(r))
		for j, c := range r {
			out[i][j] = c
		}
	}
	return out
}

func (g *googleAPI) Write(ctx context.Context, tab string, rows [][]string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	_, err := g.svc.Spreadsheets.Values.Update(g.id, A1Range(tab, "A1"), &sheetsv4.ValueRange{Values: toValues(rows)}).
		ValueInputOption("RAW").Context(ctx).Do()
	return err
}

func (g *googleAPI) Append(ctx context.Context, tab string, rows [][]string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	_, err := g.svc.Spreadsheets.Values.Append(g.id, A1Range(tab, "A1"), &sheetsv4.ValueRange{Values: toValues(rows)}).
		ValueInputOption("RAW").InsertDataOption("INSERT_ROWS").Context(ctx).Do()
	return err
}

func (g *googleAPI) UpdateRows(ctx context.Context, tab string, rows map[int][]string) error {
	if len(rows) == 0 {
		return nil
	}
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	req := &sheetsv4.BatchUpdateValuesRequest{ValueInputOption: "RAW"}
	for _, n := range sortedRowNumbers(rows) {
		req.Data = append(req.Data, &sheetsv4.ValueRange{
			Range:  A1Range(tab, fmt.Sprintf("A%d", n)),
			Values: toValues([][]string{rows[n]}),
		})
	}
	_, err := g.svc.Spreadsheets.Values.BatchUpdate(g.id, req).Context(ctx).Do()
	return err
}

func (g *googleAPI) ClearRows(ctx context.Context, tab string, fromRow int) error {
	if fromRow < 1 {
		return fmt.Errorf("sheets: ClearRows from row %d", fromRow)
	}
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	_, err := g.svc.Spreadsheets.Values.Clear(g.id, A1Range(tab, fmt.Sprintf("A%d:ZZ", fromRow)), &sheetsv4.ClearValuesRequest{}).
		Context(ctx).Do()
	return err
}
