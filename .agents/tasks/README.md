# Examination Marks Template Generator

## Overview

This folder contains tools to generate the improved University Examination Marks Template at `docs/ExaminationMarksTemplate.xlsx`.

## Files

### 1. build_template.js
Node.js script that generates the Excel template using the xlsx (SheetJS) library.

**Usage:**
```bash
cd "d:\Prodoction Work\Exam Smart Dashboard"
node .agents/tasks/build_template.js
```

**Output:** `docs/ExaminationMarksTemplate.xlsx`

### 2. generate_template_vba.bas
VBA macro that can be run from within Excel to generate the template without Node.js.

**Usage:**
1. Open Excel
2. Press Alt+F11 to open VBA editor
3. Insert a new module (File → New → Module)
4. Copy and paste the contents of `generate_template_vba.bas`
5. Press F5 to run the `GenerateExaminationTemplate` macro

**Output:** New sheets added to the current workbook

### 3. CALCULATION_LOGIC.md
Complete documentation of all calculation formulas, configuration parameters, and business rules.

**Sections:**
- Configuration Parameters
- Combined Internal CA Eligibility (Dynamic)
- Term Not Granted (TNG) Rules
- End Semester Examination (ESE) Structure
- Total Marks and Percentage
- Final Result Logic
- Grading (Architecture vs Non-Architecture)
- Credit Points and SGPA
- Conditional Formatting
- Example Calculations

### 4. TESTING_REPORT.md
Comprehensive testing report with 28 test cases covering:
- 9-component courses (Theory+Practical+Skills)
- 6-component courses (2 heads, e.g., Practical+Skills)
- 3-component courses (1 head, e.g., Theory only)
- TNG detection scenarios
- ESE head-wise failure scenarios
- Architecture grading boundaries
- Non-Architecture grading boundaries
- SGPA calculation
- ABSENT handling
- Configurable passing percentages
- Edge cases

## Template Structure

The generated template contains 5 sheets:

### Sheet 1: Config
- **Purpose:** Centralized configuration for all programme types, passing percentages, and CA eligibility thresholds
- **Content:** Configuration parameters (Architecture/Non-Architecture settings, CA/ESE max marks, applicability flags)

### Sheet 2: Student_Marks
- **Purpose:** Student marks input sheet (IMPORT sheet)
- **Columns:** ID, PRN, Name of the Student, CM_Course_Name, Semester, PaperCode, SM_Subject_Name, Academic_Year, Exam Year, Assessment_Type, Theory, Practical, Skills
- **Note:** Plain data, no calculation formulas that would break import

### Sheet 3: Results
- **Purpose:** Calculated results per student per course
- **Content:** All intermediate and final calculations using formulas from Config sheet

### Sheet 4: SGPA
- **Purpose:** Student-semester SGPA aggregation
- **Content:** Credit points and SGPA per student per semester

### Sheet 5: Grading_Reference
- **Purpose:** Grading tables for both Architecture and Non-Architecture programmes
- **Content:** Grade point, grade label, and remarks for each percentage range

## Key Features

1. **Dynamic CA Eligibility:** Combined internal CA eligibility based on applicable assessment heads, not hardcoded values
2. **TNG Distinction:** Term Not Granted is separate from FAIL
3. **ESE Head-Wise Validation:** Each applicable ESE head must individually meet minimum passing percentage
4. **Configurable Passing Percentages:** Architecture (45%), Non-Architecture (40% or 45%)
5. **SGPA Calculation:** Aggregates credit points and course credits per student per semester
6. **Conditional Formatting:** Color-coded results (green=PASS, red=FAIL/TNG, amber=PENDING)
7. **Parser Compatibility:** Student_Marks sheet exactly matches `parseStudentMarksExcel()` columns

## Important Notes

1. **No Hardcoded Values:** All calculations use configuration parameters from the Config sheet
2. **Dynamic Assessment Heads:** Template supports 1, 2, or 3 assessment heads dynamically
3. **Rounding Policy:** Use CEILING() for minimum mark thresholds on integer schemes
4. **Division Safety:** IFERROR() or IF() checks prevent #DIV/0! errors

## Requirements

### For Node.js script:
- Node.js installed
- xlsx library installed (`npm install xlsx`)

### For VBA macro:
- Microsoft Excel
- VBA editor enabled

## Support

For questions or issues, refer to:
- `CALCULATION_LOGIC.md` for detailed formulas
- `TESTING_REPORT.md` for test case examples
- `src/services/excelParser.ts` for parser compatibility details
