package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"lfps/server/internal/excel"
	"lfps/server/internal/storage"
	"lfps/server/internal/ws"
)

type APIHandler struct {
	store     *storage.Store
	hub       *ws.Hub
	backupDir string
}

func NewAPIHandler(store *storage.Store, hub *ws.Hub, backupDir string) *APIHandler {
	return &APIHandler{
		store:     store,
		hub:       hub,
		backupDir: backupDir,
	}
}

func (h *APIHandler) GetState(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	state := h.store.GetState()
	_ = json.NewEncoder(w).Encode(state)
}

func (h *APIHandler) ToggleAbsence(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	var req storage.AbsenceRecord
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("invalid payload: %v", err), http.StatusBadRequest)
		return
	}

	newState, err := h.store.ToggleAbsence(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Instant live WebSocket broadcast to all connected devices
	h.hub.Broadcast("STATE_MUTATION", newState)

	_ = json.NewEncoder(w).Encode(newState)
}

func (h *APIHandler) SetAvailability(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	var req storage.StaffAvailability
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("invalid payload: %v", err), http.StatusBadRequest)
		return
	}

	newState, err := h.store.SetAvailability(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.hub.Broadcast("STATE_MUTATION", newState)
	_ = json.NewEncoder(w).Encode(newState)
}

func (h *APIHandler) AssignSubstitution(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	var req storage.SubstitutionAssignment
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("invalid payload: %v", err), http.StatusBadRequest)
		return
	}

	newState, err := h.store.AssignSubstitution(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.hub.Broadcast("STATE_MUTATION", newState)
	_ = json.NewEncoder(w).Encode(newState)
}

func (h *APIHandler) RemoveSubstitution(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "missing 'id' query parameter", http.StatusBadRequest)
		return
	}

	newState, err := h.store.RemoveSubstitution(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.hub.Broadcast("STATE_MUTATION", newState)
	_ = json.NewEncoder(w).Encode(newState)
}

// ExportExcel generates publication-ready Excel register and triggers browser download
func (h *APIHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	state := h.store.GetState()
	bytes, filename, err := excel.GenerateSubstitutionWorkbook(state, h.backupDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to generate excel: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(bytes)))
	_, _ = w.Write(bytes)
}

// ListBackups returns audit log of server-side Excel backups (FEAT-25)
func (h *APIHandler) ListBackups(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	entries, err := os.ReadDir(h.backupDir)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	type BackupItem struct {
		FileName string    `json:"fileName"`
		ModTime  time.Time `json:"modTime"`
		SizeKB   float64   `json:"sizeKb"`
		Download string    `json:"downloadUrl"`
	}

	var results []BackupItem
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ".xlsx" {
			info, _ := e.Info()
			results = append(results, BackupItem{
				FileName: e.Name(),
				ModTime:  info.ModTime(),
				SizeKB:   float64(info.Size()) / 1024.0,
				Download: fmt.Sprintf("/api/v1/backups/download?file=%s", e.Name()),
			})
		}
	}

	_ = json.NewEncoder(w).Encode(results)
}

