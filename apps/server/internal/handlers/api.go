package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"lfps/server/internal/excel"
	"lfps/server/internal/livesync"
)

// APIHandler serves the read-only REST views of the live week. Edits travel over the
// WebSocket as STATE_MUTATION (Bundle 35); the old REST mutation routes were removed.
type APIHandler struct {
	store *livesync.Store
}

func NewAPIHandler(store *livesync.Store) *APIHandler {
	return &APIHandler{store: store}
}

// writeJSON surfaces encode failures in the log instead of discarding them (BUG-28).
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[API] failed to write JSON response: %v", err)
	}
}

// GetState is the classic week view derived from the live entities (diagnostics, export).
func (h *APIHandler) GetState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.store.DailyState())
}

// ExportExcel streams the register for the relay's current week. Nothing is saved on the
// server (relay model; the old dated-backup copy was removed together with /backups, BUG-27).
func (h *APIHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	data, filename, err := excel.GenerateSubstitutionWorkbook(h.store.DailyState(), h.store.Location())
	if err != nil {
		log.Printf("[API] excel export failed: %v", err)
		http.Error(w, fmt.Sprintf("failed to generate excel: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	if _, err := w.Write(data); err != nil {
		log.Printf("[API] excel write failed: %v", err)
	}
}
