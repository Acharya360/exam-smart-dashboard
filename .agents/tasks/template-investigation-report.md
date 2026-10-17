# Excel Template Generation Investigation Report

## Summary Answer

The Excel template can be generated using **PowerShell with the ImportExcel module** (already installed in the environment) or **VBA macro execution**. Both methods are feasible, but **PowerShell with ImportExcel is recommended** because:

1. It requires no Excel installation (uses EPPlus library internally)
2. It's more reliable in automated environments
3. It's already available on this system (version 7.8.10 installed)
4. It can be scripted and version-controlled
5. It can be run from CI/CD pipelines or build scripts

The existing Node.js approach (build_template.js) fails because Node.js is restricted in the current environment, but the VBA and PowerShell alternatives provide identical functionality.

---

## Evidence

### 1. Environment Analysis

**Operating System**: Windows 10/11 (Win32NT 10.0.26300.0)

**PowerShell Version**: 5.1.26100.9549 (Desktop Edition)

**Excel Installation**: 
- Path: `C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE`
- Excel 2016+ is available but COM automation is disabled or restricted

**Available Excel Libraries**:
- **ImportExcel Module**: Version 7.8.10 (installed at `C:\Users\janka\OneDrive\Documents\WindowsPowerShell\Modules\ImportExcel\7.8.10`)
  - Uses EPPlus library internally (no Excel COM required)
  - Provides `Export-Excel`, `New-ExcelPackage`, `Add-Worksheet` cmdlets
  - Supports formulas, styling, charts, and complex worksheets

### 2. Existing Files

**PowerShell/Node.js Approach** (Currently Restricted):
- `build_template.js` - Node.js script using SheetJS (xlsx) library
- **Status**: Cannot execute due to Node.js restriction in current environment
- **Alternative**: Convert to PowerShell using ImportExcel module

**VBA Macro Approach** (Already Available):
- `generate_template_vba.bas` - Complete VBA macro code
- **Status**: Fully functional VBA script available
- **Usage**: Open Excel → Alt+F11 → Insert Module → Run `GenerateExaminationTemplate`

### 3. Template Requirements (From CALCULATION_LOGIC.md)

The template must contain **5 sheets** with specific structures:

#### Sheet 1: `Config`
- Centralized configuration for programme types and passing percentages
- Parameters: Architecture/Non-Architecture passing %, CA eligibility %, ESE head %, CA/ESE max marks, applicability flags

#### Sheet 2: `Student_Marks`
- Student marks input sheet matching `parseStudentMarksExcel()` parser contract
- Columns: ID, PRN, Name of the Student, CM_Course_Name, Semester, PaperCode, SM_Subject_Name, Academic_Year, Exam Year, Assessment_Type, Theory, Practical, Skills
- **Critical**: Must retain exact column order to avoid breaking parser compatibility

#### Sheet 3: `Results`
- Calculated results per student per course with Excel formulas
- Dynamic formulas using Config sheet parameters
- Key calculations:
  - `Total_CA_Max` (dynamic based on applicable assessment heads)
  - `Internal_Percentage` and `Internal_Status` (TG/TNG)
  - `ESE_Theory/Practical/Skills_Status` (PASS/FAIL per head)
  - `Final_Status` (TNG/PASS/FAIL - TNG takes precedence)
  - Grade_Point lookup via VLOOKUP on Grading_Reference
  - Credit_Points and SGPA

#### Sheet 4: `SGPA`
- Student-semester aggregation
- SUMIFS-based SGPA calculation per student per semester

#### Sheet 5: `Grading_Reference`
- Grading tables for Architecture and Non-Architecture programmes
- Sorted by Marks_Percentage_Min for VLOOKUP with TRUE parameter

### 4. Calculation Logic Requirements

**Dynamic Internal CA Eligibility**:
```excel
Total_CA_Max = 
  IF(THEORY_APP=1, CA1_MAX_THEORY+CA2_MAX_THEORY+CA3_MAX_THEORY, 0) +
  IF(PRACTICAL_APP=1, CA1_MAX_PRACTICAL+CA2_MAX_PRACTICAL+CA3_MAX_PRACTICAL, 0) +
  IF(SKILLS_APP=1, CA1_MAX_SKILLS+CA2_MAX_SKILLS+CA3_MAX_SKILLS, 0)
```

**TNG Detection** (Critical Business Rule):
```excel
Internal_Status = IF(Internal_Percentage < CA_ELIGIBILITY_PCT, "TNG", "TG")
Final_Status = IF(Internal_Status="TNG", "TNG", ...)  // TNG takes precedence
```

**ESE Head-Wise Validation**:
```excel
Overall_ESE_Status = 
  IF(AND(
    OR(ESE_Theory_Status="PASS", THEORY_APP=0),
    OR(ESE_Practical_Status="PASS", PRACTICAL_APP=0),
    OR(ESE_Skills_Status="PASS", SKILLS_APP=0)
  ), "PASS", "FAIL")
```

### 5. Available Template Files

**Current Template**: `docs/Sample Templete.xlsx`
- Contains 5 sheets but missing dynamic formulas
- Uses hardcoded values instead of Config parameters
- Needs replacement with `docs/ExaminationMarksTemplate.xlsx`

**Reference Files**:
- `docs/ExaminationMarksTemplate.xlsx` - Target output file
- `.agents/tasks/CALCULATION_LOGIC.md` - Complete formula documentation
- `.agents/tasks/template-plan.md` - Implementation plan
- `.agents/tasks/TESTING_REPORT.md` - Test cases (28 scenarios)

---

## Conclusions

### Feasibility Assessment

| Method | Feasibility | Pros | Cons |
|--------|-------------|------|------|
| Node.js (build_template.js) | ❌ Not feasible | Automated, version-controllable | Node.js restricted in current environment |
| PowerShell (ImportExcel) | ✅ Recommended | No Excel install needed, reliable, available | Requires PowerShell script conversion |
| VBA Macro | ✅ Feasible | No additional tools needed | Requires manual Excel interaction, less automatable |
| Excel COM Objects | ❌ Not feasible | Direct automation | COM restricted/disabled on this system |

### Recommended Approach

**Use PowerShell with ImportExcel Module**

**Rationale**:
1. **Already Installed**: ImportExcel 7.8.10 is available on the system
2. **No Excel Required**: Uses EPPlus internally (headless operation)
3. **Automatable**: Can be integrated into build scripts
4. **Reliable**: No UI dependencies or COM interop issues
5. **Maintainable**: Pure PowerShell script, easy to version-control

### Implementation Plan

1. Create `build_template.ps1` PowerShell script using ImportExcel module
2. Convert `build_template.js` logic to PowerShell cmdlets:
   - `New-ExcelPackage` → Create workbook
   - `Add-Worksheet` → Add each of 5 sheets
   - `Export-Excel` → Write to `docs/ExaminationMarksTemplate.xlsx`
3. Test template generation
4. Verify formulas work correctly in Excel
5. Add to CI/CD pipeline (if available)

### Sample PowerShell Script Structure

```powershell
Import-Module ImportExcel -MinimumVersion 7.8.10

# Create workbook
$wb = Export-Excel -Path "docs/ExaminationMarksTemplate.xlsx" -AutoSize -PassThru

# Sheet 1: Config
$data = @(
  @{ Setting_ID="ARCH_OVERALL_PASS_PCT"; Setting_Name="Architecture Overall Passing %"; Setting_Value=45 }
  # ... add all config parameters
)
$data | Export-Excel -ExcelPackage $wb -WorksheetName "Config" -AutoSize

# Sheet 2: Student_Marks
# ... add student marks data

# Sheet 3: Results
# ... add formulas and calculated data

# Sheet 4: SGPA
# ... add SGPA aggregation data

# Sheet 5: Grading_Reference
# ... add grading tables

# Save and close
Close-ExcelPackage $wb
```

### Verification Steps

1. Run PowerShell script
2. Open generated file `docs/ExaminationMarksTemplate.xlsx`
3. Verify all 5 sheets exist with correct column headers
4. Test formula recalculation with sample data
5. Confirm TNG detection logic works correctly
6. Validate VLOOKUP on Grading_Reference table
7. Check no #DIV/0! or circular reference errors

---

## Recommendations

### Immediate Actions

1. **Create PowerShell script** `build_template.ps1` using ImportExcel module
2. **Test locally** on developer machine first
3. **Document** in README or AGENTS.md how to generate template

### Long-term Improvements

1. **Convert build_template.js to PowerShell** for consistency with environment
2. **Add template generation** to build process or CI/CD pipeline
3. **Create documentation** for template structure and formula logic
4. **Add validation tests** to verify template integrity

### Risk Mitigation

- **Parser Compatibility**: Ensure Student_Marks sheet matches `parseStudentMarksExcel()` column order exactly
- **Formula Testing**: Verify all dynamic formulas recalculate correctly
- **TNG Logic**: Test edge cases where Internal_Percentage < CA_ELIGIBILITY_PCT
- **ESE Head Validation**: Verify individual head passing percentages are checked before aggregate

---

## References

- ImportExcel Module: [https://github.com/dfinke/ImportExcel](https://github.com/dfinke/ImportExcel)
- EPPlus Library: [https://epplussoftware.com/](https://epplussoftware.com/)
- CALCULATION_LOGIC.md: `d:\Prodoction Work\Exam Smart Dashboard\.agents\tasks\CALCULATION_LOGIC.md`
- Template Plan: `d:\Prodoction Work\Exam Smart Dashboard\.agents\tasks\template-plan.md`
- VBA Macro: `d:\Prodoction Work\Exam Smart Dashboard\.agents\tasks\generate_template_vba.bas`

---

*Report generated: Investigation complete*
*Status: PowerShell with ImportExcel module is the recommended approach*