package handlers

import (
	"encoding/json"
	"net/http"
)

type SchoolMeta struct {
	SchoolName  string   `json:"schoolName"`
	Project     string   `json:"project"`
	AcademicYr  string   `json:"academicYear"`
	TotalStaff  int      `json:"totalStaff"`
	Periods     []string `json:"periods"`
	SupportedDays []string `json:"supportedDays"`
}

func MetaHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	meta := SchoolMeta{
		SchoolName:  "Little Flower Preparatory School",
		Project:     "Project 1: Substitutions & Routine Suite",
		AcademicYr:  "2026-2027",
		TotalStaff:  9,
		Periods:     []string{"G/PD", "1st", "BREAK", "2nd", "3rd", "4th", "5th", "6th"},
		SupportedDays: []string{"MON", "TUE", "WED", "THU", "FRI", "SAT"},
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(meta)
}

