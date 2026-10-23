package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lfps/server/internal/storage"
	"lfps/server/internal/version"
	"lfps/server/internal/ws"
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

func newAPI(t *testing.T) (*APIHandler, *ws.Hub) {
	t.Helper()
	hub := ws.NewHub(nil)
	go hub.Run()
	return NewAPIHandler(storage.NewStore(time.UTC), hub), hub
}

func TestAssignValidationAndParityFields(t *testing.T) {
	api, _ := newAPI(t)

	rec := httptest.NewRecorder()
	api.AssignSubstitution(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"day":"MON","period":"1st","originalTeacher":"AB","status":"NOPE"}`)))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad status should be 400, got %d", rec.Code)
	}

	body := `{"day":"MON","period":"1st","originalTeacher":"AB","status":"DISPUTED","disputeRemark":"clash","disputedAt":42}`
	rec = httptest.NewRecorder()
	api.AssignSubstitution(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body)))
	if rec.Code != http.StatusOK {
		t.Fatalf("assign: %d %s", rec.Code, rec.Body)
	}
	var st storage.DailyState
	if err := json.Unmarshal(rec.Body.Bytes(), &st); err != nil {
		t.Fatal(err)
	}
	if len(st.Substitutions) != 1 || st.Substitutions[0].DisputeRemark != "clash" || st.Substitutions[0].DisputedAt != 42 {
		t.Fatalf("dispute fields lost: %+v", st.Substitutions)
	}
	if strings.Contains(rec.Body.String(), `"substituteTeacher"`) {
		t.Fatalf("empty substituteTeacher should be omitted (matches optional core field)")
	}
}

func TestPayloadLimit(t *testing.T) {
	api, _ := newAPI(t)
	big := `{"teacherName":"` + strings.Repeat("x", MaxRequestBytes+10) + `","day":"MON"}`
	rec := httptest.NewRecorder()
	api.ToggleAbsence(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(big)))
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("want 413, got %d", rec.Code)
	}
}

func TestHealthVersion(t *testing.T) {
	rec := httptest.NewRecorder()
	HealthHandler(time.UTC)(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	var h HealthResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &h)
	if h.Version != version.Version {
		t.Fatalf("health version %q != %q", h.Version, version.Version)
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
