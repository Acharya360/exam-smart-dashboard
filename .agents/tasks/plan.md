# Implementation Plan: University Examination Marks Template Enhancements

## Overview

This plan implements 15 major enhancements to the Examination Marks Template. The primary deliverable is `build_template.js`, which generates `docs/ExaminationMarksTemplate.xlsx`. All enhancements preserve the existing `Student_Marks` sheet structure (parser compatibility constraint).

**Sheet Order (final template):**
1. Config (enhanced)
2. Student_Details (new)
3. Student_Marks (unchanged)
4. Course_Config (enhanced)
5. Results (enhanced)
6. SGPA (enhanced)
7. ESE_Authorization (new)
8. Grading_Reference (enhanced)
9. Result_Rules (new)
10. Audit_Log (new)
11. Export_Config (new)
12. Example_Cases (new)
13. Language (optional)
14. Grading_Reference (existing, duplicate for reference)

**Note:** `Student_Marks` MUST remain unchanged per parser constraint in `excelParser.ts`.

---

## Decision Log

### Decision 1: Use SheetJS (xlsx) for all enhancements
**Rationale:** SheetJS is already in use and supports all required features: JSON-to-sheet conversion, column width management, and sheet ordering. SheetJS does NOT support native conditional formatting or data validation — these will be documented with instructions for manual Excel application (conditional formatting via Excel UI) and noted for data validation approach (will be added as comments in script).

### Decision 2: Enhance existing sheets rather than creating new ones where possible
**Rationale:** Minimize sheet proliferation while adding necessary data. Config and Grading_Reference are enhanced with new columns rather than creating new sheets.

### Decision 3: Pre-populate Example_Cases sheet with 11 scenarios
**Rationale:** Users need to understand expected behavior for all edge cases. Each scenario is documented with expected results in comments.

### Decision 4: Audit_Log pre-populated with 5 example entries
**Rationale:** Demonstrates audit trail structure and sample data format. Entries cover CA_UPDATE, ESE_UPDATE, FINAL_RESULT, SGPA_UPDATE, and FINAL_RESULT with changes.

### Decision 5: Language sheet optional
**Rationale:** Optional because translation work is non-trivial and may require localization team involvement. Included for future-proofing but marked as optional in implementation.

---

## Enhanced Config Sheet

### New Columns (add to existing Config):

| Column | Description | Example Values |
|---|---|---|
| Programme_Code | Programme-specific code (e.g., BTECH-ARCH) | BTECH-ARCH, BTECH-CIVIL |
| Programme_Category | Architecture or Non-Architecture | Architecture, Non-Architecture |
| Programme_Passing_Pct | Programme-specific passing % | 45, 40 |
| CA_Eligibility_Pct | CA eligibility threshold | 40 |
| ESE_Head_Passing_Pct | ESE head passing threshold | 45 |
| Course_Credits | Credit value of the course | 4, 3 |
| Assessment_Heads | Comma-separated list of heads | Theory,Practical,Skills |
| Is_Comprehensive_Exam | Flag for comprehensive exams | 1 (Yes), 0 (No) |
| Min_Attendance_Pct | Minimum attendance percentage | 75 |
| Attendance_Mandatory | Is attendance mandatory? | YES, NO |
| CA_Submission_Mandatory | Is CA submission mandatory? | YES, NO |

**Implementation Steps:**
1. Add new columns to configData array in build_template.js
2. For Architecture programmes ( Programme_Category = "Architecture" ): Programme_Passing_Pct = 45
3. For Non-Architecture programmes ( Programme_Category = "Non-Architecture" ): Programme_Passing_Pct = 40
4. Add Programme_Code = "BTECH-ARCH" for Architecture courses
5. Add Programme_Code = "BTECH-CIVIL" for Civil course example

**Verification:** `node .agents/tasks/build_template.js` → Open Config sheet → Confirm new columns and values

---

## New Sheet: Student_Details

### Purpose
Pre-exam student information sheet (import/export compatible with server-side processing).

### Columns (in order):

| Column | Description | Example | Source |
|---|---|---|---|
| PRN | Student PRN | 1001 | Student_Marks |
| Student_Name | Full student name | Student A | Student_Marks |
| Programme | Programme name | B.Tech. Architecture | Student_Marks |
| Semester | Semester | V | Student_Marks |
| Academic_Year | Academic year | 2024-25 | Student_Marks |
| Exam_Session | Exam session | Dec 2024 | Student_Marks |
| Programme_Type | Architecture/Non-Architecture | Architecture | Derived from CM_Course_Name |
| Course_Credits | Credit value | 4 | Course_Config lookup |
| Enrollment_Status | Regular/Backlog/Improvement | Regular | Manual entry |

**Implementation Steps:**
1. Create studentDetailsData array by extracting distinct students from studentMarksData
2. Derive Programme_Type from CM_Course_Name (regex: if contains "Architecture" → Architecture, else → Non-Architecture)
3. Course_Credits = 4 (default) or lookup from Course_Config
4. Enrollment_Status = "Regular" (default)

**Formula for Programme_Type (in Excel after generation):**
```
=IF(ISNUMBER(SEARCH("Architecture", INDEX(Student_Marks!C:C, MATCH([@PRN], Student_Marks!B:B, 0)))), "Architecture", "Non-Architecture")
```

**Verification:** `node .agents/tasks/build_template.js` → Open Student_Details sheet → Confirm 3 students with correct Programme_Type and Course_Credits

---

## Enhanced Course_Config Sheet

### Current Structure (if any)
Currently, course config is embedded in Config sheet with Setting_ID pattern. We'll create a dedicated Course_Config sheet.

### New Course_Config Sheet Columns:

| Column | Description | Example | Source |
|---|---|---|---|
| PaperCode | Paper code | ARCH_501, CIVIL_501 | From Student_Marks distinct |
| Programme_Code | Programme code | BTECH-ARCH | From Programme_Master |
| Course_Name | Course name | Design Studio | From SM_Subject_Name |
| Semester | Semester | V | From Student_Marks |
| Programme_Category | Architecture/Non-Architecture | Architecture | Derived |
| Course_Credits | Credit value | 4 | Config lookup or default |
| Assessment_Heads | Comma-separated heads | Theory,Practical,Skills | From Config |
| Theory_Applicable | 1=Yes, 0=No | 1 | From Config |
| Practical_Applicable | 1=Yes, 0=No | 1 | From Config |
| Skills_Applicable | 1=Yes, 0=No | 1 | From Config |
| CA1_Max_Theory | CA1 max theory marks | 20 | From Config |
| CA2_Max_Theory | CA2 max theory marks | 20 | From Config |
| CA3_Max_Theory | CA3 max theory marks | 20 | From Config |
| CA1_Max_Practical | CA1 max practical marks | 20 | From Config |
| CA2_Max_Practical | CA2 max practical marks | 20 | From Config |
| CA3_Max_Practical | CA3 max practical marks | 20 | From Config |
| CA1_Max_Skills | CA1 max skills marks | 20 | From Config |
| CA2_Max_Skills | CA2 max skills marks | 20 | From Config |
| CA3_Max_Skills | CA3 max skills marks | 20 | From Config |
| ESE_Max_Theory | ESE max theory marks | 100 | From Config |
| ESE_Max_Practical | ESE max practical marks | 50 | From Config |
| ESE_Max_Skills | ESE max skills marks | 30 | From Config |
| Min_Attendance_Pct | Minimum attendance % | 75 | Config or default |
| Attendance_Mandatory | YES/NO | YES | Config or default |
| CA_Submission_Mandatory | YES/NO | YES | Config or default |
| Is_Comprehensive_Exam | 1=Yes, 0=No | 1 | Config or default |

**Implementation Steps:**
1. Extract unique PaperCode entries from studentMarksData
2. For each PaperCode, derive all config parameters from the Config sheet
3. Programme_Code = "BTECH-ARCH" for Architecture courses, "BTECH-CIVIL" for Civil
4. Set all boolean flags based on Config sheet values

**Verification:** `node .agents/tasks/build_template.js` → Open Course_Config sheet → Confirm 2 entries (one for each PaperCode) with correct config parameters

---

## Enhanced Results Sheet

### New Columns (add to existing Results):

| Column | Description | Formula/Logic |
|---|---|---|
| Attendance_Count | Days/activities attended | 0-100 (input or calculation) |
| Required_Attendance | Required attendance % | From Course_Config lookup (e.g., 75%) |
| Attendance_Status | ELIGIBLE/NOT_ELIGIBLE | `=IF(Attendance_Count >= Required_Attendance, "ELIGIBLE", "NOT_ELIGIBLE")` |
| CA_Submission_Status | SUBMITTED/MISSING | `=IF(AND(Theory>0, Practical>=0, Skills>=0), "SUBMITTED", "MISSING")` or input |
| TNG_Status | Term Not Granted | `=IF(Internal_Status="TNG", "TNG", IF(OR(Attendance_Status="NOT_ELIGIBLE", CA_Submission_Status="MISSING"), "TNG", "PASS"))` |
| Grade_Point_Raw | Raw grade point | `=Overall_Percentage / 10 * (IF(Programme_Type="Architecture", 1, 1))` (4 decimal places) |
| Grade_Point_Rounded | Rounded grade point | `=ROUND(Grade_Point_Raw, 2)` |
| Grade_Point_Ceiling | Ceiling grade point | `=CEILING(Grade_Point_Raw, 0.01)` |

**Formula for TNG_Status:**
```
TNG_Status = IF(Internal_Status="TNG", "TNG",
   IF(OR(Attendance_Status="NOT_ELIGIBLE", CA_Submission_Status="MISSING"), "TNG",
      Final_Status))
```

**Implementation Steps:**
1. Add 9 new columns to resultsData array in build_template.js
2. For Attendance_Count: Set values (e.g., 72, 70, 78)
3. For Required_Attendance: Set to 75 (config default)
4. Attendance_Status: Formula will calculate ELIGIBLE/NOT_ELIGIBLE
5. CA_Submission_Status: Set to "SUBMITTED" for existing students
6. TNG_Status: Use formula logic above
7. Grade_Point_X columns: Add 3 columns with raw/rounded/ceiling values

**Verification:** `node .agents/tasks/build_template.js` → Open Results sheet → Confirm new columns with correct calculations

---

## New Sheet: ESE_Authorization

### Purpose
Tracks ESE authorization status for each student-paper combination.

### Columns (in order):

| Column | Description | Values |
|---|---|---|
| PRN | Student PRN | 1001, 1002, 1003 |
| PaperCode | Paper code | ARCH_501, CIVIL_501 |
| Internal_Status | Internal status | TG, TNG |
| ESE_Status | ESE head statuses | PASS, FAIL, PENDING |
| Authorization_Status | Authorization outcome | AUTHORIZED, NOT_AUTHORIZED, PENDING_REVIEW |
| Authorization_Date | Date of authorization | YYYY-MM-DD |
| Authorized_By | Authorizing user | Exam Coordinator |

### Authorization Rules:

```
IF Internal_Status = "TNG" → NOT_AUTHORIZED
ELSE IF any ESE head = "FAIL" → PENDING_REVIEW
ELSE IF all ESE heads eligible AND Internal_Status = "TG" → AUTHORIZED
```

### Implementation Steps:
1. Create ESEAuthorizationData array
2. For PRN 1001: Internal_Status=TG, ESE heads all PASS → AUTHORIZED
3. For PRN 1002: Internal_Status=TG, ESE heads all PASS → AUTHORIZED
4. For PRN 1003: Internal_Status=TG, ESE heads all PASS → AUTHORIZED
5. Add Authorization_Date = TODAY() or fixed date
6. Add Authorized_By = "Exam Coordinator"

**Verification:** `node .agents/tasks/build_template.js` → Open ESE_Authorization sheet → Confirm 3 entries with correct authorization status

---

## Enhanced Grading_Reference Sheet

### New Columns (add to existing Grading_Reference):

| Column | Description | Values |
|---|---|---|
| Is_Distinction | >=75% flag | TRUE/FALSE |
| Is_First_Class | >=60% flag | TRUE/FALSE |
| Is_Second_Class | >=50% flag | TRUE/FALSE |
| Eligibility_For_Honors | Honors eligibility | TRUE/FALSE |

### Logic:

```
Is_Distinction = IF(Marks_Percentage_Min >= 75, TRUE, FALSE)
Is_First_Class = IF(Marks_Percentage_Min >= 60, TRUE, FALSE)
Is_Second_Class = IF(Marks_Percentage_Min >= 50, TRUE, FALSE)
Eligibility_For_Honors = IF(AND(Grade_Point >= 7.5, Marks_Percentage_Min >= 60), TRUE, FALSE)
```

### Implementation Steps:
1. Add 4 new columns to gradingReferenceData in build_template.js
2. For each row, set boolean flags based on Marks_Percentage_Min

**Verification:** `node .agents/tasks/build_template.js` → Open Grading_Reference sheet → Confirm new boolean columns

---

## New Sheet: Result_Rules

### Purpose
Centralized rules for result generation per programme type.

### Columns (in order):

| Column | Description | Values |
|---|---|---|
| Programme_Type | Architecture/Non-Architecture | Architecture, Non-Architecture |
| Minimum_Passing_Percentage | Minimum % required | 45, 40 |
| Minimum_ESE_Heads_Passed | Minimum heads to pass | 1, 2 |
| Minimum_Attendance_Pct | Minimum attendance % | 75 |
| CA_Submission_Mandatory | CA submission required | YES, NO |
| Attendance_Mandatory | Attendance required | YES, NO |
| Special_Rules | Additional rules | Text |

### Implementation Steps:
1. Create resultRulesData array with 2 entries (one per Programme_Type)
2. Set Programme_Type, Minimum_Passing_Percentage based on existing Config
3. Set Minimum_ESE_Heads_Passed = 1 (all applicable heads must pass)
4. Set Attendance rules based on Course_Config defaults
5. Add Special_Rules column with notes

**Verification:** `node .agents/tasks/build_template.js` → Open Result_Rules sheet → Confirm 2 entries

---

## Enhanced SGPA Sheet

### New Columns (add to existing SGPA):

| Column | Description | Formula |
|---|---|---|
| Credits_Earned | 0 for F/TNG, else Credit_Points | `=IF(Final_Status="FAIL" OR Final_Status="TNG", 0, Credit_Points)` |
| SGPA_With_Fail | SGPA including failed courses | `=SUM(Credit_Points) / SUM(Course_Credits)` |
| SGPA_Without_Fail | SGPA excluding failed courses | `=SUMIF(Final_Status, "<>FAIL", Credit_Points) / SUMIF(Final_Status, "<>FAIL", Course_Credits)` |
| Is_Provisional_SGPA | Provisional flag | TRUE/FALSE |
| SGPA_Calculation_Method | Method used | Standard, With_Fail, Without_Fail |

### Formula for SGPA_With_Fail:
```
SGPA_With_Fail = SUM(Credit_Points per course) / SUM(Course_Credits per semester)
```

### Formula for SGPA_Without_Fail:
```
SGPA_Without_Fail = SUM(Credit_Points where Final_Status != FAIL) / SUM(Course_Credits where Final_Status != FAIL)
```

### Implementation Steps:
1. Add 5 new columns to sgpaData in build_template.js
2. Credits_Earned = Credit_Points (unless FAIL/TNG → 0)
3. SGPA_With_Fail = existing SGPA value
4. SGPA_Without_Fail = SGPA value (same as With_Fail for current data since no FAILs)
5. Is_Provisional_SGPA = FALSE (or TRUE for current session)
6. SGPA_Calculation_Method = "Standard"

**Verification:** `node .agents/tasks/build_template.js` → Open SGPA sheet → Confirm new columns

---

## New Sheet: Audit_Log

### Purpose
Tracks all result-related changes for audit trail.

### Columns (in order):

| Column | Description | Values |
|---|---|---|
| Action | Action type | CA_UPDATE, ESE_UPDATE, FINAL_RESULT, SGPA_UPDATE |
| PRN | Student PRN | 1001, 1002, 1003 |
| PaperCode | Paper code | ARCH_501, CIVIL_501 |
| Before_Value | Previous value | Text |
| After_Value | New value | Text |
| Updated_By | Updated by user | Text |
| Updated_At | Timestamp | YYYY-MM-DD HH:MM:SS |
| Reason | Reason for change | Text |

### Pre-populated Example Entries (5):

1. **CA_UPDATE:** PRN=1001, PaperCode=ARCH_501, Before="90", After="92", Updated_By="Exam Coordinator", Updated_At="2024-12-01 14:30:00", Reason="CA re-evaluation"
2. **ESE_UPDATE:** PRN=1002, PaperCode=ARCH_501, Before="PASS", After="FAIL", Updated_By="Exam Controller", Updated_At="2024-12-15 10:00:00", Reason="ESE practical re-check"
3. **FINAL_RESULT:** PRN=1001, PaperCode=ARCH_501, Before="PASS", After="PASS", Updated_By="System", Updated_At="2024-12-20 09:00:00", Reason="Final calculation"
4. **SGPA_UPDATE:** PRN=1001, PaperCode=ARCH_501, Before="7.25", After="7.40", Updated_By="System", Updated_At="2024-12-20 09:00:00", Reason="Grade point updated"
5. **FINAL_RESULT:** PRN=1002, PaperCode=ARCH_501, Before="PASS", After="TNG", Updated_By="System", Updated_At="2024-12-21 11:00:00", Reason="Internal eligibility failed"

### Implementation Steps:
1. Create auditLogData array with 5 entries as above
2. Format timestamps as YYYY-MM-DD HH:MM:SS
3. Set PRN, PaperCode, Before_Value, After_Value based on example scenarios

**Verification:** `node .agents/tasks/build_template.js` → Open Audit_Log sheet → Confirm 5 entries with correct data

---

## New Sheet: Export_Config

### Purpose
Controls which columns are included in exports and their formatting.

### Columns (in order):

| Column | Description | Values |
|---|---|---|
| Sheet_Name | Source sheet name | Config, Student_Details, Student_Marks, Results, etc. |
| Column_Name | Column name in source sheet | PRN, Name of the Student, Theory, etc. |
| Include_In_Export | YES/NO | YES, NO |
| Column_Header_Override | Custom header for export | Text |
| Data_Type | Data type | text, number, date, boolean |
| Width | Column width (characters) | Integer |
| Format | Excel format string | '0.00', '0%', 'YYYY-MM-DD', etc. |

### Pre-populated Entries:
1. **Results sheet, PRN column:** Include=YES, Header=PRN, Type=number, Width=10, Format=
2. **Results sheet, Grade_Point_Rounded:** Include=YES, Header=Grade Point, Type=number, Width=12, Format='0.00'
3. **Results sheet, Final_Status:** Include=YES, Header=Status, Type=text, Width=15, Format=
4. **Results sheet, Attendance_Status:** Include=YES, Header=Attendance, Type=text, Width=12, Format=
5. **Student_Marks sheet, Theory:** Include=YES, Header=Theory Marks, Type=number, Width=12, Format='0'
6. **Config sheet, Setting_Value:** Include=NO, Header=, Type=number, Width=10, Format=
7. **Audit_Log sheet, All columns:** Include=YES (default)

### Implementation Steps:
1. Create exportConfigData array with 10-15 entries covering most important columns
2. Set Include_In_Export = "YES" for export-critical columns
3. Set Format strings for number/percentage/date columns
4. Set Width based on typical Excel column widths

**Verification:** `node .agents/tasks/build_template.js` → Open Export_Config sheet → Confirm entries

---

## New Sheet: Example_Cases

### Purpose
Pre-filled examples for all 11 scenarios with expected results.

### Columns (in order):

| Column | Description |
|---|---|
| Scenario_ID | Scenario identifier |
| Scenario_Name | Name of scenario |
| Programme_Type | Architecture/Non-Architecture |
| Internal_Percentage | Internal percentage (0-100) |
| Internal_Status | TG/TNG |
| ESE_Theory_Pct | Theory percentage |
| ESE_Practical_Pct | Practical percentage |
| ESE_Skills_Pct | Skills percentage |
| ESE_Status | PASS/FAIL/PENDING |
| Overall_Percentage | Overall percentage |
| Final_Status | Expected final status |
| Grade_Label | Expected grade |

### 11 Example Scenarios:

1. **PASS** - 9-component course, all pass, aggregate > 45%
2. **TNG** - Internal below 40%, ESE passes
3. **ESE Head Fail** - Aggregate passes, one ESE head fails
4. **Architecture FAIL** - 44.99% (below 45%)
5. **Architecture PASS (Grade E)** - 45% (exactly 45%, grade E)
6. **Non-Arch FAIL** - 39.99% (below 40%)
7. **Non-Arch PASS (Grade P)** - 40% (exactly 40%, grade P)
8. **Non-Arch FAIL (45% min)** - 44.99% with custom 45% minimum
9. **Non-Arch PASS (Grade C)** - 45% (grade C)
10. **Absent** - All marks 0
11. **Partial Attendance** - Some components missing

### Implementation Steps:
1. Create exampleCasesData array with 11 entries
2. For each scenario, populate all columns with example data and expected Final_Status
3. Use Scenario_ID "CASE-001" through "CASE-011"

**Verification:** `node .agents/tasks/build_template.js` → Open Example_Cases sheet → Confirm 11 entries

---

## Conditional Formatting Documentation

### SheetJS Limitation
SheetJS (xlsx) does NOT support native conditional formatting. Conditional formatting must be applied manually in Excel after template generation.

### Manual Excel Application Steps:

1. **Open `docs/ExaminationMarksTemplate.xlsx` in Excel**
2. **Select the Results sheet**
3. **Apply conditional formatting rules:**

| Range | Rule Type | Formula | Format |
|---|---|---|---|
| Internal_Status column (e.g., N2:N100) | Use a formula | `=$N2="TNG"` | Fill: Dark Red, Font: White, Bold |
| Internal_Status column | Use a formula | `=$N2="TG"` | Fill: Green |
| ESE_Theory_Status column (e.g., X2:X100) | Use a formula | `=$X2="FAIL"` | Fill: Red |
| ESE_Theory_Status column | Use a formula | `=$X2="PASS"` | Fill: Green |
| Final_Status column (e.g., AG2:AG100) | Use a formula | `=$AG2="TNG"` | Fill: Dark Red, Font: White, Bold |
| Final_Status column | Use a formula | `=$AG2="FAIL"` | Fill: Red |
| Final_Status column | Use a formula | `=$AG2="PASS"` | Fill: Green |
| Final_Status column | Use a formula | `=$AG2="PENDING"` | Fill: Yellow |
| Grade_Point column (e.g., AH2:AH100) | Use a formula | `=$AH2>=9` | Fill: Blue, Font: White |
| Grade_Point column | Use a formula | `=$AH2="O"` | Fill: Gold |

4. **Save the template with formatting applied**

**Implementation Steps:**
1. Add a comment section in build_template.js documenting these rules
2. Create a separate `docs/Conditional_Formatting_Instructions.xlsx` file for guidance

**Verification:** Open Excel manually and apply rules → Confirm colors appear correctly

---

## Data Validation Documentation

### SheetJS Limitation
SheetJS (xlsx) does NOT support data validation (dropdowns, input constraints). Data validation must be applied manually in Excel.

### Manual Excel Application Steps:

1. **Select the Student_Marks sheet**
2. **Apply data validation:**
   - **Assessment_Type column (e.g., J2:J1000):**
     - Allow: List
     - Source: `CA1,CA2,CA3,ESE`
   - **Theory column (e.g., K2:K1000):**
     - Allow: Decimal
     - Minimum: 0
     - Maximum: [Dynamic max from Config - use named range]
   - **Practical column (e.g., L2:L1000):**
     - Allow: Decimal
     - Minimum: 0
     - Maximum: [Dynamic max from Config]
   - **Skills column (e.g., M2:M1000):**
     - Allow: Decimal
     - Minimum: 0
     - Maximum: [Dynamic max from Config]

3. **Select the Student_Details sheet**
4. **Apply data validation:**
   - **Programme_Type column (e.g., H2:H100):**
     - Allow: List
     - Source: `Architecture,Non-Architecture`
   - **Enrollment_Status column (e.g., I2:I100):**
     - Allow: List
     - Source: `Regular,Backlog,Improvement`
   - **Attendance_Count column (e.g., E2:E100):**
     - Allow: Decimal
     - Minimum: 0
     - Maximum: 100

5. **Select the Audit_Log sheet**
6. **Apply data validation:**
   - **Action column (e.g., A2:A1000):**
     - Allow: List
     - Source: `CA_UPDATE,ESE_UPDATE,FINAL_RESULT,SGPA_UPDATE`
   - **Updated_At column (e.g., G2:G1000):**
     - Allow: Date
     - Minimum: [Current date]
     - Maximum: [Future date]

**Implementation Steps:**
1. Add a comment section in build_template.js documenting these rules
2. Create a separate `docs/Data_Validation_Instructions.xlsx` file for guidance

**Verification:** Open Excel manually and apply rules → Confirm dropdowns and input constraints work

---

## Performance Enhancements

### Excel Table Structures (ListObjects)
SheetJS supports `!autofilter` which creates Excel Tables (ListObjects) with structured references.

### Named Ranges for Config Params
SheetJS supports named ranges for configuration parameters (e.g., `ARCH_OVERALL_PASS_PCT`, `NON_ARCH_OVERALL_PASS_PCT`).

### Implementation Steps:
1. **Convert each sheet to a Table:**
   - After creating each sheet, add `sheet['!autofilter'] = { ref: "A1:Z1000" }` (adjust range)
   - This enables AutoFilter and Table functionality

2. **Add named ranges for Config parameters:**
   ```javascript
   wb.SheetNames.forEach(name => {
     const sheet = wb.Sheets[name];
     // Named ranges for config values
     XLSX.utils.book_set_sheet_name(wb, name, name);
   });
   
   // Add named ranges (requires custom function or formula)
   // SheetJS v0.18+ supports workbook names via '!names' array
   ```

3. **Structured column references in comments:**
   - Add comments like `// Use table structure: =SUM(MyTable[Theory])` in formulas

**Verification:** `node .agents/tasks/build_template.js` → Open in Excel → Select any sheet → Confirm Table functionality and AutoFilter enabled

---

## Optional: Language Sheet

### Purpose
Translations for column headers in English, Hindi, and regional language (e.g., Marathi).

### Columns (in order):

| Column | English | Hindi | Marathi |
|---|---|---|---|
| PRN | PRN | प्रवेश क्रमांक | प्रवेश क्रमांक |
| Name of the Student | Name of the Student | विद्यार्थ्याचे नाव | विद्यार्थ्याचे नाव |
| Theory | Theory | सिद्धांत | सिद्धांत |
| Practical | Practical | व्यावहारिक | व्यावहारिक |
| Skills | Skills | कौशल्ये | कौशल्ये |

### Implementation Steps:
1. Create languageData array with translations for all column headers
2. Include sheet name translation
3. Set as optional sheet (comment out in build_template.js if not needed)

**Verification:** `node .agents/tasks/build_template.js` → Open Language sheet → Confirm translations

---

## Implementation Sequence

### Phase 1: Core Sheet Enhancements (build_template.js)

1. **Add Programme_Code and Programme_Category columns to Config sheet**
   - Modify configData array to include new columns
   - Set Programme_Code = "BTECH-ARCH" for Architecture courses
   - Set Programme_Code = "BTECH-CIVIL" for Civil course

2. **Add new columns to Grading_Reference sheet**
   - Add Is_Distinction, Is_First_Class, Is_Second_Class, Eligibility_For_Honors columns
   - Set boolean flags based on Marks_Percentage_Min

3. **Add new columns to SGPA sheet**
   - Add Credits_Earned, SGPA_With_Fail, SGPA_Without_Fail, Is_Provisional_SGPA, SGPA_Calculation_Method columns
   - Set values based on existing data

4. **Add new columns to Results sheet**
   - Add Attendance_Count, Required_Attendance, Attendance_Status, CA_Submission_Status, TNG_Status, Grade_Point_Raw, Grade_Point_Rounded, Grade_Point_Ceiling columns
   - Set values and formulas

5. **Create Course_Config sheet**
   - Create courseConfigData array with 2 entries (one per PaperCode)
   - Populate all config parameters

6. **Create Student_Details sheet**
   - Create studentDetailsData array by extracting distinct students from studentMarksData
   - Derive Programme_Type from CM_Course_Name

7. **Create ESE_Authorization sheet**
   - Create ESEAuthorizationData array with 3 entries
   - Set authorization status based on rules

8. **Create Result_Rules sheet**
   - Create resultRulesData array with 2 entries (one per Programme_Type)

9. **Create Audit_Log sheet**
   - Create auditLogData array with 5 pre-populated example entries

10. **Create Export_Config sheet**
    - Create exportConfigData array with 10-15 entries for export columns

11. **Create Example_Cases sheet**
    - Create exampleCasesData array with 11 example scenarios

12. **Add Table structures (ListObjects) to all sheets**
    - Add `sheet['!autofilter'] = { ref: "A1:Z1000" }` to each sheet

13. **Add comment sections documenting conditional formatting and data validation rules**
    - Add code comments in build_template.js explaining manual Excel application

### Phase 2: Verify and Test

1. **Run build_template.js**
   ```bash
   cd "d:\Prodoction Work\Exam Smart Dashboard"
   node .agents/tasks/build_template.js
   ```

2. **Verify Config sheet**
   - Open `docs/ExaminationMarksTemplate.xlsx`
   - Confirm Programme_Code, Programme_Category columns exist
   - Verify Programme_Passing_Pct values (45 for Architecture, 40 for Non-Architecture)

3. **Verify new sheets exist**
   - Confirm Student_Details, Course_Config, ESE_Authorization, Result_Rules, Audit_Log, Export_Config, Example_Cases sheets present

4. **Verify Results sheet**
   - Confirm Attendance_Status, TNG_Status, Grade_Point_Rounded columns exist
   - Verify calculations

5. **Verify Grading_Reference**
   - Confirm Is_Distinction, Is_First_Class, Is_Second_Class columns exist
   - Verify boolean flags

6. **Verify SGPA**
   - Confirm SGPA_With_Fail, SGPA_Without_Fail columns exist
   - Verify values

7. **Verify Example_Cases**
   - Confirm 11 scenarios with expected Final_Status values

### Phase 3: Update Documentation

1. **Update CALCULATION_LOGIC.md**
   - Add new TNG_Status formula
   - Add Attendance_Status and CA_Submission_Status formulas
   - Add ESE Authorization rules
   - Add Grade_Point_Raw/Rounded/Ceiling explanations
   - Add SGPA_With_Fail and SGPA_Without_Fail formulas

2. **Update TESTING_REPORT.md**
   - Add 50+ test cases covering new features
   - Test cases for: Student_Details extraction, Course_Config generation, ESE Authorization rules, Audit_Log entries, Example_Cases verification, conditional formatting application, data validation rules

3. **Update README.md**
   - Add new sheet descriptions
   - Add conditional formatting instructions
   - Add data validation instructions
   - Add performance enhancement notes

---

## Expected Output Files

1. **build_template.js** - Updated with all 15 enhancements
2. **docs/ExaminationMarksTemplate.xlsx** - Generated with 13-14 sheets
3. **.agents/tasks/CALCULATION_LOGIC.md** - Updated with new formulas
4. **.agents/tasks/TESTING_REPORT.md** - Updated with 50+ test cases
5. **.agents/tasks/README.md** - Updated with new sheet descriptions

---

## Testing Checklist

- [ ] Config sheet has Programme_Code, Programme_Category, Programme_Passing_Pct columns
- [ ] Student_Details sheet exists with all required columns
- [ ] Course_Config sheet exists with all config parameters
- [ ] Results sheet has Attendance_Status, TNG_Status, Grade_Point_Rounded columns
- [ ] ESE_Authorization sheet exists with authorization status
- [ ] Grading_Reference has Is_Distinction, Is_First_Class, Is_Second_Class columns
- [ ] Result_Rules sheet exists with programme-specific rules
- [ ] SGPA sheet has SGPA_With_Fail, SGPA_Without_Fail columns
- [ ] Audit_Log sheet has 5 pre-populated example entries
- [ ] Export_Config sheet has export column definitions
- [ ] Example_Cases sheet has 11 example scenarios
- [ ] All sheets have Table structures (AutoFilter enabled)
- [ ] Conditional formatting documented in code comments
- [ ] Data validation documented in code comments
- [ ] CALCULATION_LOGIC.md updated with new formulas
- [ ] TESTING_REPORT.md updated with 50+ test cases
- [ ] README.md updated with new sheet descriptions

---

## Verification Commands

```bash
# Build template
cd "d:\Prodoction Work\Exam Smart Dashboard"
node .agents/tasks/build_template.js

# Verify template generated
ls docs/ExaminationMarksTemplate.xlsx

# Open template (Windows)
start docs/ExaminationMarksTemplate.xlsx
```

**Manual verification steps:**
1. Open Excel → File → Open → Select `docs/ExaminationMarksTemplate.xlsx`
2. Check sheet tabs for all required sheets
3. Verify column headers match specifications
4. Confirm calculations in Results sheet
5. Apply conditional formatting and data validation manually per documentation
6. Test Table functionality (select any sheet → Data → Filter)
