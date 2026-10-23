package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	"lfps/server/internal/excel"
	"lfps/server/internal/storage"
	"lfps/server/internal/ws"
)

// MaxRequestBytes caps mutation payloads.
const MaxRequestBytes = 1 << 20 // 1 MiB

type APIHandler struct {
	store *storage.Store
	hub   *ws.Hub
}

func NewAPIHandler(store *storage.Store, hub *ws.Hub) *APIHandler {
	return &APIHandler{store: store, hub: hub}
}

// writeJSON surfaces encode failures in the log instead of discarding them (BUG-28).
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[API] failed to write JSON response: %v", err)
	}
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, MaxRequestBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			http.Error(w, "payload too large", http.StatusRequestEntityTooLarge)
		} else {
			http.Error(w, fmt.Sprintf("invalid payload: %v", err), http.StatusBadRequest)
		}
		return false
	}
	return true
}

// respond maps store errors to status codes, then broadcasts and returns the new state.
func (h *APIHandler) respond(w http.ResponseWriter, state storage.DailyState, err error) {
	if err != nil {
		if errors.Is(err, storage.ErrValidation) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			log.Printf("[API] mutation failed: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}
	// state is already a deep copy owned by this request; give the hub its own copy too.
	h.hub.Broadcast("STATE_MUTATION", state.Clone())
	writeJSON(w, http.StatusOK, state)
}

func (h *APIHandler) GetState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.store.GetState())
}

func (h *APIHandler) ToggleAbsence(w http.ResponseWriter, r *http.Request) {
	var req storage.AbsenceRecord
	if !decode(w, r, &req) {
		return
	}
	state, err := h.store.ToggleAbsence(req)
	h.respond(w, state, err)
}

func (h *APIHandler) SetAvailability(w http.ResponseWriter, r *http.Request) {
	var req storage.StaffAvailability
	if !decode(w, r, &req) {
		return
	}
	state, err := h.store.SetAvailability(req)
	h.respond(w, state, err)
}

func (h *APIHandler) AssignSubstitution(w http.ResponseWriter, r *http.Request) {
	var req storage.SubstitutionAssignment
	if !decode(w, r, &req) {
		return
	}
	state, err := h.store.AssignSubstitution(req)
	h.respond(w, state, err)
}

func (h *APIHandler) RemoveSubstitution(w http.ResponseWriter, r *http.Request) {
	state, err := h.store.RemoveSubstitution(r.URL.Query().Get("id"))
	h.respond(w, state, err)
}

// ExportExcel streams the register for the relay's current week. Nothing is saved on the
// server (relay model; the old dated-backup copy was removed together with /backups, BUG-27).
func (h *APIHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	data, filename, err := excel.GenerateSubstitutionWorkbook(h.store.GetState(), h.store.Location())
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
