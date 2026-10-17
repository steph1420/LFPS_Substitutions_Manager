package excel

import (
	"bytes"
	"fmt"
	"path/filepath"
	"time"

	"github.com/xuri/excelize/v2"
	"lfps/server/internal/storage"
)

// GenerateSubstitutionWorkbook creates a publication-grade Excel sheet and saves a dated backup
func GenerateSubstitutionWorkbook(state storage.DailyState, backupDir string) ([]byte, string, error) {
	f := excelize.NewFile()
	defer func() {
		_ = f.Close()
	}()

	sheetName := "Substitution Register"
	f.SetSheetName("Sheet1", sheetName)

	// Styles
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 15, Color: "#FFFFFF", Family: "Segoe UI"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#0F172A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	subtitleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "#94A3B8", Family: "Segoe UI"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#0F172A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "#FFFFFF", Family: "Segoe UI"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#1E40AF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "#60A5FA", Style: 1},
			{Type: "top", Color: "#60A5FA", Style: 1},
			{Type: "bottom", Color: "#60A5FA", Style: 1},
			{Type: "right", Color: "#60A5FA", Style: 1},
		},
	})

	rowEvenStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "#1E293B", Family: "Segoe UI"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#F8FAFC"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "#E2E8F0", Style: 1},
		},
	})

	rowOddStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "#1E293B", Family: "Segoe UI"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "#E2E8F0", Style: 1},
		},
	})

	// Header Banner (Rows 1-2)
	_ = f.MergeCell(sheetName, "A1", "G1")
	_ = f.SetCellValue(sheetName, "A1", "LITTLE FLOWER PREPARATORY SCHOOL")
	_ = f.SetRowHeight(sheetName, 1, 28)
	_ = f.SetCellStyle(sheetName, "A1", "G1", titleStyle)

	_ = f.MergeCell(sheetName, "A2", "G2")
	_ = f.SetCellValue(sheetName, "A2", fmt.Sprintf("DAILY SUBSTITUTION REGISTER • %s (%s)", state.Date, state.SelectedDay))
	_ = f.SetRowHeight(sheetName, 2, 20)
	_ = f.SetCellStyle(sheetName, "A2", "G2", subtitleStyle)

	// Spacing row 3
	_ = f.SetRowHeight(sheetName, 3, 10)

	// Column Headers (Row 4)
	headers := []string{"Period", "Class / Section", "Subject", "Absent / Away Teacher", "Status", "Assigned Substitute", "Remarks"}
	for i, h := range headers {
		colName, _ := excelize.ColumnNumberToName(i + 1)
		cell := fmt.Sprintf("%s4", colName)
		_ = f.SetCellValue(sheetName, cell, h)
		_ = f.SetCellStyle(sheetName, cell, cell, headerStyle)
	}
	_ = f.SetRowHeight(sheetName, 4, 24)

	// Populate Rows
	currentRow := 5
	if len(state.Substitutions) == 0 {
		_ = f.MergeCell(sheetName, fmt.Sprintf("A%d", currentRow), fmt.Sprintf("G%d", currentRow))
		_ = f.SetCellValue(sheetName, fmt.Sprintf("A%d", currentRow), "No substitutions recorded for this day (100% staff attendance).")
		_ = f.SetRowHeight(sheetName, currentRow, 22)
		currentRow++
	} else {
		for i, sub := range state.Substitutions {
			rowStyle := rowEvenStyle
			if i%2 == 1 {
				rowStyle = rowOddStyle
			}

			_ = f.SetCellValue(sheetName, fmt.Sprintf("A%d", currentRow), sub.Period)
			_ = f.SetCellValue(sheetName, fmt.Sprintf("B%d", currentRow), sub.ClassName)
			_ = f.SetCellValue(sheetName, fmt.Sprintf("C%d", currentRow), sub.Subject)
			_ = f.SetCellValue(sheetName, fmt.Sprintf("D%d", currentRow), sub.OriginalTeacher)
			_ = f.SetCellValue(sheetName, fmt.Sprintf("E%d", currentRow), sub.Status)
			_ = f.SetCellValue(sheetName, fmt.Sprintf("F%d", currentRow), sub.SubstituteTeacher)
			_ = f.SetCellValue(sheetName, fmt.Sprintf("G%d", currentRow), sub.Remark)

			_ = f.SetCellStyle(sheetName, fmt.Sprintf("A%d", currentRow), fmt.Sprintf("G%d", currentRow), rowStyle)
			_ = f.SetRowHeight(sheetName, currentRow, 20)
			currentRow++
		}
	}

	// Space before Signatures
	currentRow += 2
	_ = f.SetCellValue(sheetName, fmt.Sprintf("A%d", currentRow), "_____________________________")
	_ = f.SetCellValue(sheetName, fmt.Sprintf("D%d", currentRow), "_____________________________")
	_ = f.SetCellValue(sheetName, fmt.Sprintf("F%d", currentRow), "_____________________________")
	currentRow++

	_ = f.SetCellValue(sheetName, fmt.Sprintf("A%d", currentRow), "Front Desk In-Charge")
	_ = f.SetCellValue(sheetName, fmt.Sprintf("D%d", currentRow), "Academic Coordinator")
	_ = f.SetCellValue(sheetName, fmt.Sprintf("F%d", currentRow), "Principal's Approval")

	// Set Column Widths
	colWidths := map[string]float64{
		"A": 14,
		"B": 16,
		"C": 20,
		"D": 22,
		"E": 14,
		"F": 22,
		"G": 24,
	}
	for col, width := range colWidths {
		_ = f.SetColWidth(sheetName, col, col, width)
	}

	// Buffer export
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, "", err
	}

	// Save dated server backup (FEAT-25)
	dateStr := state.Date
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	backupFileName := fmt.Sprintf("LFPS_Daily_Substitutions_%s.xlsx", dateStr)
	backupPath := filepath.Join(backupDir, backupFileName)
	_ = f.SaveAs(backupPath)

	return buf.Bytes(), backupFileName, nil
}

