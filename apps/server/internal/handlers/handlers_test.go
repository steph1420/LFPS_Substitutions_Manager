package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lfps/server/internal/livesync"
	"lfps/server/internal/storage"
	"lfps/server/internal/version"
)

func TestOriginPolicy(t *testing.T) {
	p := ParseOriginPolicy("")
	for _, o := range []string{"", "https://steph1420.github.io", "https://Steph1420.github.io/", "http://localhost:5173"} {
		if !p.Allowed(o) {
			t.Errorf("default policy should allow %q", o)
		}
	}
	if p.Allowed("https://evil.example") {
		t.Error("default policy allowed an unknown origin")
	}
	custom := ParseOriginPolicy(" https://a.example , https://b.example/ ")
	if !custom.Allowed("https://b.example") || custom.Allowed("https://steph1420.github.io") {
		t.Error("custom list not honoured")
	}
	if !ParseOriginPolicy("*").Allowed("https://anything.example") {
		t.Error("* should allow all")
	}
}

func TestCORSMiddleware(t *testing.T) {
	h := CORS(ParseOriginPolicy(""), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/absence/toggle", nil)
	req.Header.Set("Origin", "https://steph1420.github.io")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Origin") != "https://steph1420.github.io" {
		t.Fatalf("preflight: %d %v", rec.Code, rec.Header())
	}

	req = httptest.NewRequest(http.MethodPost, "/x", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden || rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("disallowed origin: %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodGet, "/x", nil) // no Origin: curl / health check
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusTeapot {
		t.Fatalf("no-origin request should pass, got %d", rec.Code)
	}
}

func newAPI(t *testing.T) (*APIHandler, *livesync.Store) {
	t.Helper()
	store := livesync.NewStore(time.UTC)
	return NewAPIHandler(store), store
}

// GET /state is derived from the live entities, with dates mapped to school days.
func TestGetStateDerivedFromEntities(t *testing.T) {
	api, store := newAPI(t)
	ws := store.Snapshot().WeekStart
	now := time.Now().UnixMilli()
	res := store.Merge([]livesync.Entity{
		{Key: "sub|" + ws + "|s1", Value: json.RawMessage(`{"id":"s1","period":"1st","originalTeacher":"AB","status":"DISPUTED","disputeRemark":"clash","disputedAt":42}`), TS: now, By: "d1"},
		{Key: "abs|" + ws + "|AB", Value: json.RawMessage(`{"teacherName":"AB","type":"FULL_DAY"}`), TS: now, By: "d1"},
		{Key: "oac|" + ws, Value: json.RawMessage(`"Mrs. X"`), TS: now, By: "d1"},
	})
	if len(res.Rejected) != 0 {
		t.Fatalf("rejected: %+v", res.Rejected)
	}
	rec := httptest.NewRecorder()
	api.GetState(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	var st storage.DailyState
	if err := json.Unmarshal(rec.Body.Bytes(), &st); err != nil {
		t.Fatal(err)
	}
	if len(st.Substitutions) != 1 || st.Substitutions[0].Day != "MON" || st.Substitutions[0].DisputeRemark != "clash" || st.Substitutions[0].DisputedAt != 42 {
		t.Fatalf("substitution: %+v", st.Substitutions)
	}
	if len(st.Absences) != 1 || st.Absences[0].Day != "MON" || st.Absences[0].Date != ws {
		t.Fatalf("absence: %+v", st.Absences)
	}
	if st.OfficiatingAC["MON"] != "Mrs. X" {
		t.Fatalf("oac: %+v", st.OfficiatingAC)
	}
	if strings.Contains(rec.Body.String(), `"substituteTeacher"`) {
		t.Fatalf("empty substituteTeacher should be omitted (matches optional core field)")
	}
}

func TestHealthVersionModeAndHead(t *testing.T) {
	rec := httptest.NewRecorder()
	HealthHandler(time.UTC, nil)(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	var h HealthResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &h)
	if h.Version != version.Version || h.Mode != "relay-only" || h.Sheets != "" {
		t.Fatalf("health: %+v", h)
	}
	rec = httptest.NewRecorder()
	HealthHandler(time.UTC, func() (string, string) { return "sheets", "ok" })(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	_ = json.Unmarshal(rec.Body.Bytes(), &h)
	if h.Mode != "sheets" || h.Sheets != "ok" {
		t.Fatalf("sheets mode: %+v", h)
	}
	if rec.Body.Len() > 512 {
		t.Fatalf("health should stay small, got %d bytes", rec.Body.Len())
	}
	rec = httptest.NewRecorder()
	HealthHandler(time.UTC, nil)(rec, httptest.NewRequest(http.MethodHead, "/", nil))
	if rec.Code != http.StatusOK || rec.Body.Len() != 0 {
		t.Fatalf("HEAD: %d body=%d", rec.Code, rec.Body.Len())
	}
}

func TestExportExcelStreamsWorkbook(t *testing.T) {
	api, _ := newAPI(t)
	rec := httptest.NewRecorder()
	api.ExportExcel(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusOK || rec.Body.Len() == 0 || !strings.HasPrefix(rec.Body.String(), "PK") {
		t.Fatalf("export: %d len=%d", rec.Code, rec.Body.Len())
	}
	if !strings.Contains(rec.Header().Get("Content-Disposition"), time.Now().In(time.UTC).Format("2006-01-02")) {
		t.Fatalf("filename should carry today's date: %s", rec.Header().Get("Content-Disposition"))
	}
}
