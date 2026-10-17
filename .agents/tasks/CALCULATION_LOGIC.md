# Calculation Logic: University Examination Marks Template

## 1. Configuration Parameters

| Setting_ID | Setting_Name | Default Value | Description |
|---|---|---|---|
| `ARCH_OVERALL_PASS_PCT` | Architecture Overall Passing % | 45 | Minimum overall percentage required to pass for Architecture programmes |
| `NON_ARCH_OVERALL_PASS_PCT` | Non-Architecture Overall Passing % | 40 | Minimum overall percentage required to pass for Non-Architecture programmes (configurable to 45) |
| `CA_ELIGIBILITY_PCT` | CA Eligibility % | 40 | Minimum combined CA percentage required for ESE eligibility |
| `ESE_HEAD_PASS_PCT` | ESE Head Passing % | 45 | Minimum percentage required in each ESE head |
| `THEORY_APP` | Theory Applicable | 1 (Yes) | 1=Theory applicable, 0=Not applicable |
| `PRACTICAL_APP` | Practical Applicable | 1 (Yes) | 1=Practical applicable, 0=Not applicable |
| `SKILLS_APP` | Skills Applicable | 1 (Yes) | 1=Skills applicable, 0=Not applicable |
| `CA1_MAX_THEORY` | CA1 Max Theory | 20 | Maximum marks for CA1 Theory |
| `CA2_MAX_THEORY` | CA2 Max Theory | 20 | Maximum marks for CA2 Theory |
| `CA3_MAX_THEORY` | CA3 Max Theory | 20 | Maximum marks for CA3 Theory |
| `CA1_MAX_PRACTICAL` | CA1 Max Practical | 20 | Maximum marks for CA1 Practical |
| `CA2_MAX_PRACTICAL` | CA2 Max Practical | 20 | Maximum marks for CA2 Practical |
| `CA3_MAX_PRACTICAL` | CA3 Max Practical | 20 | Maximum marks for CA3 Practical |
| `CA1_MAX_SKILLS` | CA1 Max Skills | 20 | Maximum marks for CA1 Skills |
| `CA2_MAX_SKILLS` | CA2 Max Skills | 20 | Maximum marks for CA2 Skills |
| `CA3_MAX_SKILLS` | CA3 Max Skills | 20 | Maximum marks for CA3 Skills |
| `ESE_MAX_THEORY` | ESE Max Theory | 100 | Maximum marks for ESE Theory |
| `ESE_MAX_PRACTICAL` | ESE Max Practical | 50 | Maximum marks for ESE Practical |
| `ESE_MAX_SKILLS` | ESE Max Skills | 30 | Maximum marks for ESE Skills |

## 2. Combined Internal CA Eligibility (Dynamic)

### Formula:

```
Total_CA_Max = 
  IF(THEORY_APP = 1, CA1_MAX_THEORY + CA2_MAX_THEORY + CA3_MAX_THEORY, 0) +
  IF(PRACTICAL_APP = 1, CA1_MAX_PRACTICAL + CA2_MAX_PRACTICAL + CA3_MAX_PRACTICAL, 0) +
  IF(SKILLS_APP = 1, CA1_MAX_SKILLS + CA2_MAX_SKILLS + CA3_MAX_SKILLS, 0)
```

### Minimum Passing Marks:

```
Min_Internal_Passing_Marks = CEILING(Total_CA_Max * CA_ELIGIBILITY_PCT / 100, 1)
```

### Internal Percentage:

```
Internal_Percentage = (Total_CA_Obtained / Total_CA_Max) * 100
```

### Internal Status:

```
Internal_Status = IF(Internal_Percentage >= CA_ELIGIBILITY_PCT, "TG", "TNG")
```

**Note:** `CEILING()` rounds upward for integer marks schemes. For fractional marks, follow the approved university rounding policy.

## 3. Term Not Granted (TNG) Rules

### Critical Rules:

1. **TNG is distinct from FAIL**. If Internal_Status = TNG, the student fails internal eligibility and cannot be authorized for ESE through normal workflow.

2. **Final_Status = "TNG"** when:
   - Internal_Percentage < CA_ELIGIBILITY_PCT

3. **TG (Term Granted)** when:
   - Internal_Percentage >= CA_ELIGIBILITY_PCT

4. **ESE eligibility depends on Internal_Status**:
   - TNG → Not eligible for ESE
   - TG → Eligible for ESE

5. **Preserve existing marks and audit information** even when TNG is assigned.

## 4. End Semester Examination (ESE) Structure

### Applicable ESE Heads:

- If Theory is applicable → ESE_Theory is mandatory
- If Practical is applicable → ESE_Practical is mandatory
- If Skills is applicable → ESE_Skills is mandatory

### ESE Head-Wise Percentage:

```
ESE_Theory_Pct = IF(ESE_Theory_Max > 0, (ESE_Theory / ESE_Theory_Max) * 100, 0)
ESE_Practical_Pct = IF(ESE_Practical_Max > 0, (ESE_Practical / ESE_Practical_Max) * 100, 0)
ESE_Skills_Pct = IF(ESE_Skills_Max > 0, (ESE_Skills / ESE_Skills_Max) * 100, 0)
```

### Individual ESE Head Status:

```
ESE_Theory_Status = IF(ESE_Theory_Pct >= ESE_HEAD_PASS_PCT, "PASS", "FAIL")
ESE_Practical_Status = IF(ESE_Practical_Pct >= ESE_HEAD_PASS_PCT, "PASS", "FAIL")
ESE_Skills_Status = IF(ESE_Skills_Pct >= ESE_HEAD_PASS_PCT, "PASS", "FAIL")
```

### Overall ESE Status:

```
Overall_ESE_Status = 
  IF(AND(
    OR(ESE_Theory_Status = "PASS", THEORY_APP = 0),
    OR(ESE_Practical_Status = "PASS", PRACTICAL_APP = 0),
    OR(ESE_Skills_Status = "PASS", SKILLS_APP = 0)
  ), "PASS", "FAIL")
```

## 5. Total Marks and Percentage

### Calculations:

```
Total_Max = Total_CA_Max + ESE_Theory_Max + ESE_Practical_Max + ESE_Skills_Max

Total_Obtained = Total_CA_Obtained + ESE_Theory + ESE_Practical + ESE_Skills

Overall_Percentage = IF(Total_Max > 0, (Total_Obtained / Total_Max) * 100, 0)
```

### Programme-Specific Passing Percentage:

```
Programme_Passing_Pct = IF(Programme_Type = "Architecture", ARCH_OVERALL_PASS_PCT, NON_ARCH_OVERALL_PASS_PCT)

Programme_Passing_Marks = Total_Max * Programme_Passing_Pct / 100
```

### Overall Passing Status:

```
Overall_Passing_Status = IF(Overall_Percentage >= Programme_Passing_Pct, "PASS", "FAIL")
```

## 6. Final Result Logic

### Priority order (must be checked in sequence):

```
Final_Status = 
  IF(Internal_Status = "TNG", "TNG",
     IF(Overall_ESE_Status = "FAIL", "FAIL",
        IF(Overall_Percentage < Programme_Passing_Pct, "FAIL",
           "PASS")))
```

### Explanation:

1. **TNG takes precedence** over all other results. Even if a student has high ESE marks and aggregate percentage, if they fail internal eligibility, the result is TNG.

2. **ESE head-wise failure** → FAIL, even if aggregate passes. Example: Aggregate 50% > 45% minimum, but Practical ESE = 40% < 45% minimum → FAIL.

3. **Overall percentage failure** → FAIL when overall percentage is below programme-specific passing percentage.

4. **PASS** only when all conditions are satisfied:
   - Internal eligibility satisfied
   - All mandatory ESE heads passed
   - Overall percentage meets minimum passing requirement

## 7. Grading (Architecture vs Non-Architecture)

### Non-Architecture Grading:

| Marks % | Grade Point | Grade Label | Remarks |
|---|---|---|---|
| 91-100 | 10 | O | Outstanding |
| 81-90 | 9 | A+ | Excellent |
| 71-80 | 8 | A | Very Good |
| 61-70 | 7 | B+ | Good |
| 51-60 | 6 | B | Above Average |
| 41-50 | 5 | C | Average |
| 40 | 4 | P | Pass |
| Below 40 | 0 | F | Fail |
| Absent | 0 | Ab | Absent |

### Architecture Grading:

| Marks % | Grade Point | Grade Label | Remarks |
|---|---|---|---|---|
| 90-100 | 10 | O | Outstanding |
| 80-89 | 9 | A | Excellent |
| 70-79 | 8 | B | Very Good |
| 60-69 | 7 | C | Good |
| 50-59 | 6 | D | Above Average |
| 45-49 | 5 | E | Average |
| Below 45 | 0 | F | Fail |
| Absent | 0 | Ab | Absent |

### Grade Point Lookup (Excel VLOOKUP):

```
Grade_Point = VLOOKUP(Overall_Percentage, 
  FILTER(Grading_Reference!A:F, Grading_Reference!A:A = Programme_Type),
  4, TRUE)
```

**Note:** The Grading_Reference table must be sorted by Marks_Percentage_Min ascending for VLOOKUP with TRUE parameter.

## 8. Credit Points and SGPA

### Credit Points:

```
Credit_Points = Grade_Point * Course_Credits
```

### SGPA (Semester Grade Point Average):

```
SGPA = SUM(Credit_Points per course) / SUM(Course_Credits per semester)
```

**Per student per semester:**

```
SGPA = Σ(Grade_Point_i * Course_Credits_i) / Σ(Course_Credits_i)
```

Where i iterates over all courses in the semester.

### Excel Implementation:

```
SGPA = SUMIFS(Credit_Points, PRN, current_PRN, Semester, current_Semester) / 
       SUMIFS(Course_Credits, PRN, current_PRN, Semester, current_Semester)
```

Round to 2 decimal places.

## 9. Conditional Formatting Recommendations

| Cell Range | Condition | Format |
|---|---|---|
| Internal_Status column (TG/TNG) | =N2="TNG" | Red fill, white text |
| Internal_Status column | =N2="TG" | Green fill |
| ESE Head Status columns (X:Z) | =OR(X2="FAIL", Y2="FAIL", Z2="FAIL") | Red fill |
| ESE Head Status columns | =AND(X2="PASS", Y2="PASS", Z2="PASS") | Green fill |
| Final_Status column | =AG2="TNG" | Dark red fill, white text |
| Final_Status column | =AG2="FAIL" | Red fill |
| Final_Status column | =AG2="PASS" | Green fill |
| Grade_Point column | =AH2>=9 | Blue fill, white text |

## 10. Example Calculations

### Example 1: 9-Component Course (Theory+Practical+Skills)

**Configuration:**
- CA1_MAX_THEORY = 20, CA2_MAX_THEORY = 20, CA3_MAX_THEORY = 20
- CA1_MAX_PRACTICAL = 20, CA2_MAX_PRACTICAL = 20, CA3_MAX_PRACTICAL = 20
- CA1_MAX_SKILLS = 20, CA2_MAX_SKILLS = 20, CA3_MAX_SKILLS = 20
- ESE_MAX_THEORY = 100, ESE_MAX_PRACTICAL = 50, ESE_MAX_SKILLS = 30
- CA_ELIGIBILITY_PCT = 40%

**Calculations:**
```
Total_CA_Max = 20+20+20 + 20+20+20 + 20+20+20 = 180
Min_Internal_Passing_Marks = CEILING(180 * 40% / 100, 1) = 72

If Total_CA_Obtained = 75:
  Internal_Percentage = 75/180 * 100 = 41.67%
  Internal_Status = "TG" (eligible for ESE)

If ESE_Theory = 65, ESE_Practical = 35, ESE_Skills = 20:
  ESE_Theory_Pct = 65/100 * 100 = 65% → PASS
  ESE_Practical_Pct = 35/50 * 100 = 70% → PASS
  ESE_Skills_Pct = 20/30 * 100 = 66.67% → PASS
  Overall_ESE_Status = "PASS"

Total_Max = 180 + 100 + 50 + 30 = 360
Total_Obtained = 75 + 65 + 35 + 20 = 195
Overall_Percentage = 195/360 * 100 = 54.17%

If Architecture:
  Programme_Passing_Pct = 45%
  54.17% >= 45% → PASS

Final_Status = "PASS"
```

### Example 2: 6-Component Course (Practical+Skills only, Theory not applicable)

**Configuration:**
- THEORY_APP = 0
- PRACTICAL_APP = 1, SKILLS_APP = 1
- CA1_MAX_PRACTICAL = 20, CA2_MAX_PRACTICAL = 20, CA3_MAX_PRACTICAL = 20
- CA1_MAX_SKILLS = 20, CA2_MAX_SKILLS = 20, CA3_MAX_SKILLS = 20
- ESE_MAX_PRACTICAL = 50, ESE_MAX_SKILLS = 30
- CA_ELIGIBILITY_PCT = 40%

**Calculations:**
```
Total_CA_Max = 0 + (20+20+20) + (20+20+20) = 120
Min_Internal_Passing_Marks = CEILING(120 * 40% / 100, 1) = 48

If Total_CA_Obtained = 45:
  Internal_Percentage = 45/120 * 100 = 37.5%
  Internal_Status = "TNG" (NOT eligible for ESE)

Total_CA_Max = 120
ESE_Theory_Max = 0 (Theory not applicable)
ESE_Practical_Max = 50
ESE_Skills_Max = 30

Total_Max = 120 + 0 + 50 + 30 = 200
If ESE_Practical = 40, ESE_Skills = 20:
  Total_Obtained = 45 + 0 + 40 + 20 = 105
  Overall_Percentage = 105/200 * 100 = 52.5%

Final_Status = "TNG" (TNG takes precedence!)
```

### Example 3: 3-Component Course (Theory only)

**Configuration:**
- THEORY_APP = 1, PRACTICAL_APP = 0, SKILLS_APP = 0
- CA1_MAX_THEORY = 20, CA2_MAX_THEORY = 20, CA3_MAX_THEORY = 20
- ESE_MAX_THEORY = 100
- CA_ELIGIBILITY_PCT = 40%

**Calculations:**
```
Total_CA_Max = (20+20+20) + 0 + 0 = 60
Min_Internal_Passing_Marks = CEILING(60 * 40% / 100, 1) = 24

If Total_CA_Obtained = 24:
  Internal_Percentage = 24/60 * 100 = 40%
  Internal_Status = "TG"

If ESE_Theory = 45:
  ESE_Theory_Pct = 45/100 * 100 = 45% → PASS
  Overall_ESE_Status = "PASS"

Total_Max = 60 + 100 = 160
Total_Obtained = 24 + 45 = 69
Overall_Percentage = 69/160 * 100 = 43.125%

If Architecture (45% minimum):
  43.125% < 45% → FAIL

Final_Status = "FAIL"
```

## 11. Important Notes

1. **No hardcoded values**: All calculations use configuration parameters from the Config sheet. Do not hardcode values like 140, 56, or 45 in formulas.

2. **Dynamic assessment heads**: The template must support courses with 1, 2, or 3 assessment heads dynamically based on Theory_Applicable, Practical_Applicable, and Skills_Applicable flags.

3. **TNG is not FAIL**: TNG indicates the student failed internal eligibility and cannot be authorized for ESE. This is different from a student who sat for ESE and failed.

4. **ESE head-wise passing**: Each applicable ESE head must individually meet its minimum passing percentage, even if the aggregate percentage exceeds the overall passing requirement.

5. **Rounding policy**: Use `CEILING()` for minimum mark thresholds on integer schemes. For fractional marks, follow the approved university rounding policy.

6. **No division by zero**: Use `IFERROR()` or `IF()` checks to avoid #DIV/0! errors when Total_CA_Max or Total_Max is zero.

7. **Grade boundaries**: Architecture grade E is 45-49 (not 50), to avoid overlap with D (50-59). Non-Architecture grade P is exactly 40, not 40-49.
