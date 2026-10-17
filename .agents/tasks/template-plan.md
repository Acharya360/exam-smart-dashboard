# Implementation Plan: University Examination Marks Template

## 1. Context & Objective

The existing template at `docs/Sample Templete.xlsx` requires improvement to support university-level examination processing with configurable architecture/non-architecture programme types, dynamic internal CA eligibility, and comprehensive grading including SGPA calculations.

**Key constraint**: The parser `parseStudentMarksExcel()` in `src/services/excelParser.ts` expects specific columns (ID, PRN, Name of the Student, CM_Course_Name, Semester, PaperCode, SM_Subject_Name, Academic_Year, Exam Year, Assessment_Type, Theory, Practical, Skills). **Do not break this contract**.

## 2. Target Template Structure

Create `docs/ExaminationMarksTemplate.xlsx` with the following sheets:

### Sheet 1: `Config`
- **Purpose**: Centralized configuration for programme types, passing percentages, and CA eligibility thresholds
- **Columns**:
  - A: `Setting_ID` (e.g., ARCH_PASS_PCT, NON_ARCH_PASS_PCT, CA_ELIGIBILITY_PCT, ESE_HEAD_PCT)
  - B: `Setting_Name` (e.g., "Architecture Passing %", "Non-Architecture Passing %", "CA Eligibility %", "ESE Head Passing %")
  - C: `Setting_Value` (numeric: 45, 40, 40, 45)
  - D: `Setting_Type` (e.g., "percentage", "boolean", "list")
  - E: `Description` (human-readable documentation)

### Sheet 2: `Student_Marks`
- **Purpose**: Student marks input sheet matching the parser contract exactly
- **Columns** (matching `parseStudentMarksExcel()`):
  - A: `ID` (unique row identifier)
  - B: `PRN` (Student PRN number)
  - C: `Name of the Student`
  - D: `CM_Course_Name`
  - E: `Semester`
  - F: `PaperCode`
  - G: `SM_Subject_Name`
  - H: `Academic_Year`
  - I: `Exam Year`
  - J: `Assessment_Type` (CA1, CA2, CA3, ESE)
  - K: `Theory` (numeric)
  - L: `Practical` (numeric)
  - M: `Skills` (numeric)
- **Note**: Leave existing `Practial` typo in parser; do not change this.

### Sheet 3: `Course_Config`
- **Purpose**: Define which assessment heads apply per course (Theory, Practical, Skills) and maximum marks per head
- **Columns**:
  - A: `PaperCode`
  - B: `SM_Subject_Name`
  - C: `Is_Applicable_Theory` (YES/NO)
  - D: `Is_Applicable_Practical` (YES/NO)
  - E: `Is_Applicable_Skills` (YES/NO)
  - F: `Max_Theory_Marks` (numeric)
  - G: `Max_Practical_Marks` (numeric)
  - H: `Max_Skills_Marks` (numeric)
  - I: `Programme_Type` (Architecture / Non-Architecture)
  - J: `Course_Credits` (numeric)
  - K: `CA1_Max` (default: 20, can be per head)
  - L: `CA2_Max` (default: 20)
  - M: `CA3_Max` (default: 20)

### Sheet 4: `Results`
- **Purpose**: Calculated results per student per course
- **Columns**:
  - A: `ID` (foreign key to Student_Marks.ID)
  - B: `PRN`
  - C: `Name of the Student`
  - D: `PaperCode`
  - E: `SM_Subject_Name`
  - F: `Programme_Type`
  - G: `Applicable_Theory` (boolean)
  - H: `Applicable_Practical` (boolean)
  - I: `Applicable_Skills` (boolean)
  - J: `Total_CA_Max` (calculated from applicable heads)
  - K: `Total_CA_Obtained` (sum of CA1+CA2+CA3 for applicable heads)
  - L: `Internal_Percentage` (K/J * 100)
  - M: `Min_Internal_Passing_Marks` (J * Config.CA_ELIGIBILITY_PCT / 100)
  - N: `Internal_Status` (TG / TNG based on K vs M)
  - O: `ESE_Theory` (if Theory applicable)
  - P: `ESE_Practical` (if Practical applicable)
  - Q: `ESE_Skills` (if Skills applicable)
  - R: `ESE_Theory_Max`
  - S: `ESE_Practical_Max`
  - T: `ESE_Skills_Max`
  - U: `ESE_Theory_Pct` (O/R * 100)
  - V: `ESE_Practical_Pct` (P/S * 100)
  - W: `ESE_Skills_Pct` (Q/T * 100)
  - X: `ESE_Theory_Status` (PASS/FAIL based on Config.ESE_HEAD_PCT)
  - Y: `ESE_Practical_Status` (PASS/FAIL)
  - Z: `ESE_Skills_Status` (PASS/FAIL)
  - AA: `Total_Max` (J + R + S + T)
  - AB: `Total_Obtained` (K + O + P + Q)
  - AC: `Overall_Percentage` (AB/AA * 100)
  - AD: `Programme_Passing_Pct` (from Config based on Programme_Type)
  - AE: `Programme_Passing_Marks` (AA * AD / 100)
  - AF: `Overall_Passing_Status` (PASS/FAIL based on AC vs AD)
  - AG: `Final_Status` (TNG/TG/PASS/FAIL)
  - AH: `Grade_Point` (from Grading_Reference)
  - AI: `Credit_Points` (AH * J)
  - AJ: `SGPA` (sum of credit points / sum of credits)

### Sheet 5: `Grading_Reference`
- **Purpose**: Grading tables for Architecture and Non-Architecture
- **Columns**:
  - A: `Programme_Type`
  - B: `Marks_Percentage_Min` (inclusive)
  - C: `Marks_Percentage_Max` (exclusive, except for 100)
  - D: `Grade_Point` (numeric)
  - E: `Grade_Label` (e.g., O, A+, A, B+, B, C+, C, D+, D, E, F, W, AB)
  - F: `Remarks` (e.g., Outstanding, Excellent, Very Good, Good, Fair, Poor, Weak, Fail,Withdrawn, Absent)

## 3. Formula Design

### 3.1 Combined Internal CA Eligibility (Dynamic)

**Sheet: Student_Marks / Course_Config / Results**

Calculate total applicable internal maximum marks based on `Course_Config` flags:

```
Total_CA_Max = 
  IF(Course_Config.Is_Applicable_Theory= "YES", Course_Config.Max_Theory_Marks, 0) +
  IF(Course_Config.Is_Applicable_Practical = "YES", Course_Config.Max_Practical_Marks, 0) +
  IF(Course_Config.Is_Applicable_Skills = "YES", Course_Config.Max_Skills_Marks, 0)
```

Minimum passing marks based on configurable CA eligibility percentage:

```
Min_Internal_Passing_Marks = Total_CA_Max * Config.CA_ELIGIBILITY_PCT / 100
```

**Example**: If Total_CA_Max = 100 (only Practical + Skills), CA_Eligibility = 40%, then Min_Internal_Passing_Marks = 40.

### 3.2 TNG Detection

**Sheet: Results**

```
Internal_Status = 
  IF(Internal_Percentage < Config.CA_ELIGIBILITY_PCT, "TNG",
     IF(Internal_Percentage >= Config.CA_ELIGIBILITY_PCT, "TG", "PENDING"))
```

**Critical**: TNG is distinct from FAIL. If Internal_Status = TNG, then Final_Status = TNG regardless of ESE performance.

### 3.3 ESE Head-Wise Passing Validation

**Sheet: Results**

For each applicable ESE head (e.g., Theory):

```
ESE_Theory_Status = 
  IF(ESE_Theory_Pct < Config.ESE_HEAD_PCT, "FAIL",
     IF(ESE_Theory_Pct >= Config.ESE_HEAD_PCT, "PASS", "PENDING"))
```

**Overall_ESE_Status**:

```
Overall_ESE_Status = 
  IF(AND(ESE_Theory_Status="PASS" OR Is_Applicable_Theory=FALSE,
          ESE_Practical_Status="PASS" OR Is_Applicable_Practical=FALSE,
          ESE_Skills_Status="PASS" OR Is_Applicable_Skills=FALSE), "PASS", "FAIL")
```

### 3.4 Total Marks and Percentage

**Sheet: Results**

```
Total_Max = Total_CA_Max + ESE_Theory_Max + ESE_Practical_Max + ESE_Skills_Max
Total_Obtained = Total_CA_Obtained + ESE_Theory + ESE_Practical + ESE_Skills
Overall_Percentage = (Total_Obtained / Total_Max) * 100
```

### 3.5 Final PASS/FAIL/TNG/ABSENT/PENDING Result

**Sheet: Results**

```
Final_Status = 
  IF(Internal_Status = "TNG", "TNG",
     IF(Overall_ESE_Status = "FAIL", "FAIL",
        IF(Overall_Percentage < Programme_Passing_Pct, "FAIL",
           IF(Overall_Percentage >= Programme_Passing_Pct, "PASS", "PENDING"))))
```

### 3.6 Grading (Architecture vs Non-Architecture)

**Sheet: Results vlookup Grading_Reference**

```
Grade_Point = VLOOKUP(Overall_Percentage, FILTER(Grading_Reference!B:F, Grading_Reference!A:A = Programme_Type), 4, TRUE)
```

**Grading_Reference** table must be sorted by Marks_Percentage_Min ascending.

### 3.7 Credit Points and SGPA

**Sheet: Results**

```
Credit_Points = Grade_Point * Course_Credits
```

**SGPA** (per semester, aggregated by PRN + Semester):

```
SGPA = SUMIFS(Credit_Points, PRN, current_PRN, Semester, current_Semester) / SUMIFS(Course_Credits, PRN, current_PRN, Semester, current_Semester)
```

## 4. Conditional Formatting

- **Results!N:N (Internal_Status)**:
  - TNG: Red fill
  - TG: Green fill

- **Results!X:Z (ESE Head Status)**:
  - FAIL: Red fill
  - PASS: Green fill

- **Results!AF:AF (Overall_Passing_Status)**:
  - FAIL: Red fill
  - PASS: Green fill

- **Results!AG:AG (Final_Status)**:
  - TNG: Dark red, white text
  - FAIL: Red
  - PASS: Green

- **Results!AH:AH (Grade_Point)**:
  - Highlight grade point >= 9 (Excellent) in blue

## 5. Compatibility Notes

- **No breaking changes to `parseStudentMarksExcel()`**: The `Student_Marks` sheet must retain the exact column order and names expected by the parser:
  - `ID`, `PRN`, `Name of the Student`, `CM_Course_Name`, `Semester`, `PaperCode`, `SM_Subject_Name`, `Academic_Year`, `Exam Year`, `Assessment_Type`, `Theory`, `Practical`, `Skills`
- **Assessment_Type values**: CA1, CA2, CA3, ESE (case-insensitive in parser)
- **Do not modify parser code** unless absolutely necessary. This template is for **display, calculation, and review**, not data ingestion.

## 6. Implementation Steps

1. **Create new template workbook** (`docs/ExaminationMarksTemplate.xlsx`) with 5 sheets: `Config`, `Student_Marks`, `Course_Config`, `Results`, `Grading_Reference`

2. **Populate Config sheet** with:
   - Architecture Passing %: 45
   - Non-Architecture Passing %: 40 (configurable to 45 if needed)
   - CA Eligibility %: 40
   - ESE Head Passing %: 45

3. **Design Course_Config sheet** to map `PaperCode` to applicable heads and max marks

4. **Design Results sheet** with formulas (see Section 3) and data validation

5. **Design Grading_Reference sheet** with two grade tables (Architecture, Non-Architecture)

6. **Add conditional formatting** (see Section 5)

7. **Test** with sample data covering:
   - 9 internal components (Theory+Practical+Skills)
   - 6 internal components (Practical+Skills only)
   - 3 internal components (Theory only)
   - TNG scenario (Internal < 40%)
   - ESE head fail scenario (Overall > 45% but one ESE head < 45%)

## 7. Verification

- Open template in Excel
- Verify formulas recalculate correctly for all test cases
- Verify conditional formatting applies as expected
- Verify no circular references or #DIV/0! errors
- Verify `Student_Marks` sheet can be exported and parsed by `parseStudentMarksExcel()`