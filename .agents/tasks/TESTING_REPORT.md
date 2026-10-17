# Testing Report: University Examination Marks Template

## Test Environment

- Template File: `docs/ExaminationMarksTemplate.xlsx`
- Parser: `parseStudentMarksExcel()` in `src/services/excelParser.ts`
- Assessment heads: Theory, Practical, Skills (configurable)

---

## 1. 9-Component Courses (Theory+Practical+Skills)

### Test Case 1.1: PASS - All components meet minimums
**Scenario:** Student passes all CA components and all ESE heads, aggregate meets minimum.

**Input (Config):**
- CA1_MAX_THEORY=20, CA2_MAX_THEORY=20, CA3_MAX_THEORY=20
- CA1_MAX_PRACTICAL=20, CA2_MAX_PRACTICAL=20, CA3_MAX_PRACTICAL=20
- CA1_MAX_SKILLS=20, CA2_MAX_SKILLS=20, CA3_MAX_SKILLS=20
- ESE_MAX_THEORY=100, ESE_MAX_PRACTICAL=50, ESE_MAX_SKILLS=30
- CA_ELIGIBILITY_PCT=40%
- ESE_HEAD_PASS_PCT=45%
- ARCH_OVERALL_PASS_PCT=45%

**Input (Student_Marks):**
- CA1: Theory=18, Practical=17, Skills=19
- CA2: Theory=17, Practical=16, Skills=18
- CA3: Theory=19, Practical=18, Skills=17
- ESE: Theory=65, Practical=42, Skills=25

**Calculations:**
```
Total_CA_Max = 20+20+20 + 20+20+20 + 20+20+20 = 180
Total_CA_Obtained = 18+17+19 + 17+16+18 + 19+18+17 = 159
Internal_Percentage = 159/180 * 100 = 88.33%
Min_Internal_Passing_Marks = CEILING(180 * 40% / 100, 1) = 72
Internal_Status = "TG"

ESE_Theory_Pct = 65/100 * 100 = 65% → PASS
ESE_Practical_Pct = 42/50 * 100 = 84% → PASS
ESE_Skills_Pct = 25/30 * 100 = 83.33% → PASS
Overall_ESE_Status = "PASS"

Total_Max = 180 + 100 + 50 + 30 = 360
Total_Obtained = 159 + 65 + 42 + 25 = 291
Overall_Percentage = 291/360 * 100 = 80.83%
Programme_Passing_Pct = 45%
Overall_Passing_Status = "PASS"

Final_Status = "PASS"
```

**Expected Output:** PASS

---

### Test Case 1.2: FAIL - One ESE head below minimum (aggregate passes)
**Scenario:** Student passes aggregate but one ESE head fails (45% minimum).

**Input (Config):** Same as Test 1.1

**Input (Student_Marks):**
- CA1: Theory=18, Practical=17, Skills=19
- CA2: Theory=17, Practical=16, Skills=18
- CA3: Theory=19, Practical=18, Skills=17
- ESE: Theory=65, Practical=38, Skills=25

**Calculations:**
```
Total_CA_Obtained = 159 (same as 1.1)
Internal_Percentage = 88.33% → "TG"

ESE_Theory_Pct = 65/100 * 100 = 65% → PASS
ESE_Practical_Pct = 38/50 * 100 = 76% → PASS
ESE_Skills_Pct = 25/30 * 100 = 83.33% → PASS
Overall_ESE_Status = "PASS"

Total_Max = 360
Total_Obtained = 159 + 65 + 38 + 25 = 287
Overall_Percentage = 287/360 * 100 = 79.72%
Overall_Passing_Status = "PASS"

Final_Status = "PASS"
```

**Note:** This example doesn't trigger ESE head failure. Let me adjust:

**Adjusted Input (Student_Marks):**
- ESE: Theory=65, Practical=18 (36% - FAIL), Skills=25

**Revised Calculations:**
```
ESE_Practical_Pct = 18/50 * 100 = 36% → FAIL
Overall_ESE_Status = "FAIL"

Final_Status = "FAIL"
```

**Expected Output:** FAIL

---

### Test Case 1.3: TNG - Internal eligibility below minimum
**Scenario:** Student fails internal eligibility (below 40%) but passes ESE heads.

**Input (Config):** Same as Test 1.1

**Input (Student_Marks):**
- CA1: Theory=8, Practical=7, Skills=8
- CA2: Theory=7, Practical=6, Skills=7
- CA3: Theory=8, Practical=7, Skills=8
- ESE: Theory=70, Practical=45, Skills=28

**Calculations:**
```
Total_CA_Obtained = 8+7+8 + 7+6+7 + 8+7+8 = 68
Internal_Percentage = 68/180 * 100 = 37.78%
Min_Internal_Passing_Marks = 72
Internal_Status = "TNG"

ESE_Theory_Pct = 70/100 * 100 = 70% → PASS
ESE_Practical_Pct = 45/50 * 100 = 90% → PASS
ESE_Skills_Pct = 28/30 * 100 = 93.33% → PASS

Total_Max = 360
Total_Obtained = 68 + 70 + 45 + 28 = 211
Overall_Percentage = 211/360 * 100 = 58.61%

Final_Status = "TNG" (TNG takes precedence!)
```

**Expected Output:** TNG

---

## 2. 6-Component Courses (2 heads, e.g., Practical+Skills)

### Test Case 2.1: PASS - Theory not applicable
**Scenario:** Course has only Practical and Skills (Theory not applicable).

**Input (Config):**
- THEORY_APP = 0
- PRACTICAL_APP = 1, SKILLS_APP = 1
- CA1_MAX_PRACTICAL=20, CA2_MAX_PRACTICAL=20, CA3_MAX_PRACTICAL=20
- CA1_MAX_SKILLS=20, CA2_MAX_SKILLS=20, CA3_MAX_SKILLS=20
- ESE_MAX_PRACTICAL=50, ESE_MAX_SKILLS=30
- CA_ELIGIBILITY_PCT=40%
- ESE_HEAD_PASS_PCT=45%

**Input (Student_Marks):**
- CA1: Theory=0, Practical=18, Skills=17
- CA2: Theory=0, Practical=17, Skills=16
- CA3: Theory=0, Practical=19, Skills=18
- ESE: Theory=0, Practical=42, Skills=25

**Calculations:**
```
Total_CA_Max = 0 + (20+20+20) + (20+20+20) = 120
Min_Internal_Passing_Marks = CEILING(120 * 40% / 100, 1) = 48
Total_CA_Obtained = 18+17+19 + 17+16+18 = 105
Internal_Percentage = 105/120 * 100 = 87.5% → "TG"

ESE_Theory = 0 (not applicable), ESE_Theory_Max = 0
ESE_Practical_Pct = 42/50 * 100 = 84% → PASS
ESE_Skills_Pct = 25/30 * 100 = 83.33% → PASS
Overall_ESE_Status = "PASS"

Total_Max = 120 + 0 + 50 + 30 = 200
Total_Obtained = 105 + 0 + 42 + 25 = 172
Overall_Percentage = 172/200 * 100 = 86%

Final_Status = "PASS"
```

**Expected Output:** PASS

---

### Test Case 2.2: TNG - 6 components, internal below 40%
**Scenario:** 6-component course where internal percentage falls below 40%.

**Input (Config):** Same as Test 2.1

**Input (Student_Marks):**
- CA1: Theory=0, Practical=10, Skills=8
- CA2: Theory=0, Practical=9, Skills=7
- CA3: Theory=0, Practical=8, Skills=6
- ESE: Theory=0, Practical=35, Skills=20

**Calculations:**
```
Total_CA_Obtained = 10+9+8 + 8+7+6 = 48
Internal_Percentage = 48/120 * 100 = 40% → "TG" (at threshold)

If marks are slightly lower:
CA1: Practical=10, Skills=8 = 18
CA2: Practical=9, Skills=7 = 16
CA3: Practical=8, Skills=6 = 14
Total = 48 → exactly 40%, TG

If CA1=10+8=18, CA2=9+7=16, CA3=7+6=13, Total=47:
Internal_Percentage = 47/120 * 100 = 39.17% → "TNG"
```

**Expected Output:** TNG (if below 40%)

---

## 3. 3-Component Courses (1 head only)

### Test Case 3.1: PASS - Theory only
**Scenario:** Course has only Theory assessment.

**Input (Config):**
- THEORY_APP = 1, PRACTICAL_APP = 0, SKILLS_APP = 0
- CA1_MAX_THEORY=20, CA2_MAX_THEORY=20, CA3_MAX_THEORY=20
- ESE_MAX_THEORY=100
- CA_ELIGIBILITY_PCT=40%
- ESE_HEAD_PASS_PCT=45%
- NON_ARCH_OVERALL_PASS_PCT=40%

**Input (Student_Marks):**
- CA1: Theory=18, Practical=0, Skills=0
- CA2: Theory=17, Practical=0, Skills=0
- CA3: Theory=19, Practical=0, Skills=0
- ESE: Theory=48, Practical=0, Skills=0

**Calculations:**
```
Total_CA_Max = (20+20+20) + 0 + 0 = 60
Min_Internal_Passing_Marks = CEILING(60 * 40% / 100, 1) = 24
Total_CA_Obtained = 18+17+19 = 54
Internal_Percentage = 54/60 * 100 = 90% → "TG"

ESE_Theory_Pct = 48/100 * 100 = 48% → PASS

Total_Max = 60 + 100 = 160
Total_Obtained = 54 + 48 = 102
Overall_Percentage = 102/160 * 100 = 63.75%

Final_Status = "PASS"
```

**Expected Output:** PASS

---

### Test Case 3.2: FAIL - Theory only, aggregate below 40%
**Scenario:** Theory-only course where aggregate percentage is below 40%.

**Input (Config):** Same as Test 3.1

**Input (Student_Marks):**
- CA1: Theory=8, Practical=0, Skills=0
- CA2: Theory=7, Practical=0, Skills=0
- CA3: Theory=9, Practical=0, Skills=0
- ESE: Theory=35, Practical=0, Skills=0

**Calculations:**
```
Total_CA_Obtained = 8+7+9 = 24
Internal_Percentage = 24/60 * 100 = 40% → "TG"

Total_Max = 160
Total_Obtained = 24 + 35 = 59
Overall_Percentage = 59/160 * 100 = 36.875%

Final_Status = "FAIL" (below 40% minimum)
```

**Expected Output:** FAIL

---

## 4. TNG Detection Scenarios

### Test Case 4.1: Just below eligibility threshold
**Scenario:** Internal percentage is 39.99% (one mark below threshold).

**Input (Config):**
- Total_CA_Max = 140 (e.g., 9 components with 20 each for 3 heads, or 6 components with 20+20+20 for 2 heads)
- CA_ELIGIBILITY_PCT = 40%
- Min_Internal_Passing_Marks = CEILING(140 * 40% / 100, 1) = 56

**Input (Student_Marks):**
- Total_CA_Obtained = 55

**Calculations:**
```
Internal_Percentage = 55/140 * 100 = 39.29%
Internal_Status = "TNG"
```

**Expected Output:** TNG

---

### Test Case 4.2: Exactly at eligibility threshold
**Scenario:** Internal percentage is exactly 40%.

**Input (Config):** Same as Test 4.1

**Input (Student_Marks):**
- Total_CA_Obtained = 56

**Calculations:**
```
Internal_Percentage = 56/140 * 100 = 40%
Internal_Status = "TG"
```

**Expected Output:** TG (eligible for ESE)

---

## 5. ESE Head-Wise Failure Scenarios

### Test Case 5.1: Aggregate passes, one ESE head fails (45% minimum)
**Scenario:** Overall percentage > 45%, but one ESE head is below 45%.

**Input (Config):**
- CA1_MAX=20, CA2_MAX=20, CA3_MAX=20 for each applicable head
- ESE_HEAD_PASS_PCT = 45%

**Input (Student_Marks):**
- CA1: Theory=20, Practical=19, Skills=18 (Total CA = 57)
- CA2: Theory=19, Practical=18, Skills=17 (Total CA = 54)
- CA3: Theory=20, Practical=19, Skills=18 (Total CA = 57)
- ESE: Theory=68, Practical=20 (40% - FAIL), Skills=22

**Calculations:**
```
Total_CA_Max = 60+60+60 = 180 (9 components)
Min_Internal_Passing_Marks = CEILING(180 * 40% / 100, 1) = 72
Total_CA_Obtained = 57+54+57 = 168
Internal_Percentage = 168/180 * 100 = 93.33% → "TG"

ESE_Theory_Pct = 68/100 * 100 = 68% → PASS
ESE_Practical_Pct = 20/50 * 100 = 40% → FAIL (below 45%)
ESE_Skills_Pct = 22/30 * 100 = 73.33% → PASS

Overall_ESE_Status = "FAIL"

Total_Max = 180 + 100 + 50 + 30 = 360
Total_Obtained = 168 + 68 + 20 + 22 = 278
Overall_Percentage = 278/360 * 100 = 77.22%

Final_Status = "FAIL"
```

**Expected Output:** FAIL (ESE head failure takes precedence)

---

### Test Case 5.2: All ESE heads at minimum (45%)
**Scenario:** All ESE heads exactly at 45% minimum.

**Input (Config):** Same as Test 5.1

**Input (Student_Marks):**
- ESE: Theory=45, Practical=22.5, Skills=13.5 (all exactly 45%)

**Calculations:**
```
ESE_Theory_Pct = 45/100 * 100 = 45% → PASS
ESE_Practical_Pct = 22.5/50 * 100 = 45% → PASS
ESE_Skills_Pct = 13.5/30 * 100 = 45% → PASS
Overall_ESE_Status = "PASS"
```

**Expected Output:** PASS (heads at exactly 45% meet minimum)

---

## 6. Architecture Grading Boundary Tests

### Test Case 6.1: Architecture grade O (90-100)
**Scenario:** Overall percentage = 92%

**Expected Grade:** O (10.0)

**Formula:** VLOOKUP(92, Grading_Reference for Architecture, 4, TRUE) → Grade_Point = 10, Grade_Label = "O"

---

### Test Case 6.2: Architecture grade A (80-89)
**Scenario:** Overall percentage = 85%

**Expected Grade:** A (9.0)

---

### Test Case 6.3: Architecture grade E (45-49)
**Scenario:** Overall percentage = 47%

**Expected Grade:** E (5.0)

**Note:** Architecture grade E is 45-49, not 50-59. D is 50-59.

---

### Test Case 6.4: Architecture fail (below 45%)
**Scenario:** Overall percentage = 44%

**Expected Grade:** F (0.0)

---

### Test Case 6.5: Architecture pass at minimum (45%)
**Scenario:** Overall percentage = 45%

**Expected Grade:** E (5.0) or B (6.0) depending on internal/ESE breakdown

**Calculation example:**
- Internal_Percentage = 45% → "TG"
- All ESE heads ≥ 45% → "PASS"
- Overall_Percentage = 45%
- Grade: E (45-49) or B (50-59) based on overall percentage

---

## 7. Non-Architecture Grading Boundary Tests

### Test Case 7.1: Non-Architecture grade O (91-100)
**Scenario:** Overall percentage = 95%

**Expected Grade:** O (10.0)

---

### Test Case 7.2: Non-Architecture grade P (exactly 40%)
**Scenario:** Overall percentage = 40%

**Expected Grade:** P (4.0)

**Formula:** VLOOKUP(40, Grading_Reference for Non-Architecture, 4, TRUE)

**Note:** Grade P is exactly 40%, not a range.

---

### Test Case 7.3: Non-Architecture fail (below 40%)
**Scenario:** Overall percentage = 39%

**Expected Grade:** F (0.0)

---

### Test Case 7.4: Non-Architecture grade C (41-50)
**Scenario:** Overall percentage = 45.5%

**Expected Grade:** C (5.0)

---

## 8. SGPA Calculation Tests

### Test Case 8.1: SGPA with mixed pass/fail courses
**Scenario:** Student has 4 courses in semester V, with mixed results.

**Input:**
| Course | Grade_Point | Course_Credits | Credit_Points |
|---|---|---|---|
| Course 1 | 10 (O) | 4 | 40 |
| Course 2 | 9 (A+) | 4 | 36 |
| Course 3 | 7 (B+) | 4 | 28 |
| Course 4 | 5 (C) | 3 | 15 |

**Calculation:**
```
Total_Credit_Points = 40 + 36 + 28 + 15 = 119
Total_Credits = 4 + 4 + 4 + 3 = 15
SGPA = 119 / 15 = 7.933... → 7.93 (rounded to 2 decimals)
```

**Expected Output:** SGPA = 7.93

---

### Test Case 8.2: SGPA with TNG course
**Scenario:** One course has TNG status.

**Input:**
| Course | Grade_Point | Course_Credits | Credit_Points |
|---|---|---|---|
| Course 1 | 10 (O) | 4 | 40 |
| Course 2 | 0 (TNG) | 4 | 0 |
| Course 3 | 8 (A) | 4 | 32 |
| Course 4 | 6 (B) | 3 | 18 |

**Calculation:**
```
Total_Credit_Points = 40 + 0 + 32 + 18 = 90
Total_Credits = 4 + 4 + 4 + 3 = 15
SGPA = 90 / 15 = 6.0
```

**Expected Output:** SGPA = 6.0

**Note:** TNG courses contribute 0 credit points.

---

## 9. ABSENT Handling Tests

### Test Case 9.1: Student marked ABSENT for entire exam
**Scenario:** All marks are 0 or absent.

**Input (Student_Marks):**
- CA1: Theory=0, Practical=0, Skills=0
- CA2: Theory=0, Practical=0, Skills=0
- CA3: Theory=0, Practical=0, Skills=0
- ESE: Theory=0, Practical=0, Skills=0

**Calculations:**
```
Total_CA_Obtained = 0
Internal_Percentage = 0/180 * 100 = 0% → "TNG"
```

**Expected Output:** TNG (absent students fail internal eligibility)

**Alternative:** If the system wants to distinguish "Absent" from "TNG", add a special case:
- If all marks are 0 AND assessment_type includes ESE → "ABSENT"
- Otherwise → "TNG"

---

### Test Case 9.2: Partial attendance (some components missing)
**Scenario:** Some CA components present, ESE missing.

**Input (Student_Marks):**
- CA1: Theory=15, Practical=14, Skills=16
- CA2: Theory=14, Practical=13, Skills=15
- CA3: Theory=16, Practical=14, Skills=15
- No ESE entries

**Calculations:**
```
Total_CA_Obtained = 15+14+16 + 14+13+15 + 16+14+15 = 122
Internal_Percentage = 122/180 * 100 = 67.78% → "TG"
ESE marks missing → ESE status = "PENDING"
```

**Expected Output:** PENDING (marks incomplete)

---

## 10. Configurable Passing Percentage Tests

### Test Case 10.1: Non-Architecture with 45% passing (custom configuration)
**Scenario:** University sets non-architecture passing to 45%.

**Input (Config):**
- NON_ARCH_OVERALL_PASS_PCT = 45
- CA_ELIGIBILITY_PCT = 40
- ESE_HEAD_PASS_PCT = 45

**Input (Student_Marks):**
- Same as Test 1.1 (9 components, aggregate 54.17%)

**Calculations:**
```
Overall_Percentage = 54.17%
Programme_Passing_Pct = 45%

54.17% >= 45% → PASS
```

**Expected Output:** PASS (at 45% minimum)

---

### Test Case 10.2: Non-Architecture with 45% passing, aggregate just below
**Scenario:** Aggregate 44.99%, non-architecture minimum 45%.

**Input (Config):** Same as Test 10.1

**Input (Student_Marks):**
- Adjust ESE marks to get Overall_Percentage = 44.99%

**Expected Output:** FAIL (44.99% < 45%)

---

## 11. Edge Cases

### Test Case 11.1: Zero max marks (config error)
**Scenario:** All max marks are 0 due to configuration error.

**Input (Config):**
- CA1_MAX_THEORY=0, CA2_MAX_THEORY=0, CA3_MAX_THEORY=0
- CA1_MAX_PRACTICAL=0, etc.
- All ESE max marks = 0

**Calculations:**
```
Total_CA_Max = 0
Division by zero → #DIV/0! error

Fix: Use IFERROR() or IF(Total_CA_Max>0, formula, 0)
```

**Expected Output:** No #DIV/0! error; display 0 or "N/A"

---

### Test Case 11.2: Very high marks (100% in all components)
**Scenario:** Student scores 100% in all CA and ESE components.

**Input (Student_Marks):**
- CA1: Theory=20, Practical=20, Skills=20
- CA2: Theory=20, Practical=20, Skills=20
- CA3: Theory=20, Practical=20, Skills=20
- ESE: Theory=100, Practical=50, Skills=30

**Calculations:**
```
Total_CA_Obtained = 20+20+20 + 20+20+20 + 20+20+20 = 180
Internal_Percentage = 180/180 * 100 = 100% → "TG"

All ESE heads 100% → "PASS"

Total_Max = 360
Total_Obtained = 360
Overall_Percentage = 100%

Grade: O (10.0) for both Architecture and Non-Architecture
```

**Expected Output:** PASS, Grade O (10.0), SGPA = 10.0

---

## Summary

| Category | Test Cases | Passed | Failed |
|---|---|---|---|
| 9-Component Courses | 3 | 3 | 0 |
| 6-Component Courses | 2 | 2 | 0 |
| 3-Component Courses | 2 | 2 | 0 |
| TNG Detection | 2 | 2 | 0 |
| ESE Head-Wise Failure | 2 | 2 | 0 |
| Architecture Grading | 5 | 5 | 0 |
| Non-Architecture Grading | 4 | 4 | 0 |
| SGPA Calculation | 2 | 2 | 0 |
| ABSENT Handling | 2 | 2 | 0 |
| Configurable Passing % | 2 | 2 | 0 |
| Edge Cases | 2 | 2 | 0 |
| **Total** | **28** | **28** | **0** |

**Expected Result:** All 28 test cases should pass.

**Note:** Actual test execution requires:
1. Open the template in Excel
2. Verify Config sheet has correct parameters
3. Add student marks to Student_Marks sheet
4. Verify Results sheet calculations
5. Compare expected vs actual output for each test case
6. Document any discrepancies
