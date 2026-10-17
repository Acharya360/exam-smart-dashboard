import XLSX from 'xlsx';

// ============================================================================
// BUILD EXAMINATION MARKS TEMPLATE - ENHANCED VERSION
// ============================================================================

const wb = XLSX.utils.book_new();

// ============================================================================
// SHEET 1: Config (Enhanced with Programme_Code, Programme_Category columns)
// ============================================================================

const configData = [
  { Setting_ID: 'ARCH_OVERALL_PASS_PCT', Setting_Name: 'Architecture Overall Passing %', Setting_Value: 45, Setting_Type: 'percentage', Description: 'Minimum overall percentage required to pass for Architecture programmes' },
  { Setting_ID: 'NON_ARCH_OVERALL_PASS_PCT', Setting_Name: 'Non-Architecture Overall Passing %', Setting_Value: 40, Setting_Type: 'percentage', Description: 'Minimum overall percentage required to pass for Non-Architecture programmes (configurable to 45)' },
  { Setting_ID: 'CA_ELIGIBILITY_PCT', Setting_Name: 'CA Eligibility %', Setting_Value: 40, Setting_Type: 'percentage', Description: 'Minimum combined CA percentage required for ESE eligibility' },
  { Setting_ID: 'ESE_HEAD_PASS_PCT', Setting_Name: 'ESE Head Passing %', Setting_Value: 45, Setting_Type: 'percentage', Description: 'Minimum percentage required in each ESE head' },
  { Setting_ID: 'THEORY_APP', Setting_Name: 'Theory Applicable', Setting_Value: 1, Setting_Type: 'boolean', Description: '1=Yes, 0=No' },
  { Setting_ID: 'PRACTICAL_APP', Setting_Name: 'Practical Applicable', Setting_Value: 1, Setting_Type: 'boolean', Description: '1=Yes, 0=No' },
  { Setting_ID: 'SKILLS_APP', Setting_Name: 'Skills Applicable', Setting_Value: 1, Setting_Type: 'boolean', Description: '1=Yes, 0=No' },
  { Setting_ID: 'CA1_MAX_THEORY', Setting_Name: 'CA1 Max Theory', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA1 Theory' },
  { Setting_ID: 'CA2_MAX_THEORY', Setting_Name: 'CA2 Max Theory', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA2 Theory' },
  { Setting_ID: 'CA3_MAX_THEORY', Setting_Name: 'CA3 Max Theory', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA3 Theory' },
  { Setting_ID: 'CA1_MAX_PRACTICAL', Setting_Name: 'CA1 Max Practical', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA1 Practical' },
  { Setting_ID: 'CA2_MAX_PRACTICAL', Setting_Name: 'CA2 Max Practical', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA2 Practical' },
  { Setting_ID: 'CA3_MAX_PRACTICAL', Setting_Name: 'CA3 Max Practical', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA3 Practical' },
  { Setting_ID: 'CA1_MAX_SKILLS', Setting_Name: 'CA1 Max Skills', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA1 Skills' },
  { Setting_ID: 'CA2_MAX_SKILLS', Setting_Name: 'CA2 Max Skills', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA2 Skills' },
  { Setting_ID: 'CA3_MAX_SKILLS', Setting_Name: 'CA3 Max Skills', Setting_Value: 20, Setting_Type: 'numeric', Description: 'Maximum marks for CA3 Skills' },
  { Setting_ID: 'ESE_MAX_THEORY', Setting_Name: 'ESE Max Theory', Setting_Value: 100, Setting_Type: 'numeric', Description: 'Maximum marks for ESE Theory' },
  { Setting_ID: 'ESE_MAX_PRACTICAL', Setting_Name: 'ESE Max Practical', Setting_Value: 50, Setting_Type: 'numeric', Description: 'Maximum marks for ESE Practical' },
  { Setting_ID: 'ESE_MAX_SKILLS', Setting_Name: 'ESE Max Skills', Setting_Value: 30, Setting_Type: 'numeric', Description: 'Maximum marks for ESE Skills' },
  // NEW: Programme-specific configs
  { Setting_ID: 'BTECH_ARCH_PCT', Setting_Name: 'BTECH-ARCH Passing %', Setting_Value: 45, Setting_Type: 'percentage', Description: 'Architecture programme passing percentage' },
  { Setting_ID: 'BTECH_CIVIL_PCT', Setting_Name: 'BTECH-CIVIL Passing %', Setting_Value: 40, Setting_Type: 'percentage', Description: 'Non-Architecture programme passing percentage' },
  { Setting_ID: 'GRADE_ROUNDING_METHOD', Setting_Name: 'Grade Rounding Method', Setting_Value: 'CEILING', Setting_Type: 'text', Description: 'Options: CEILING/ROUND/FLOOR' },
  { Setting_ID: 'SGPA_CALCULATION_METHOD', Setting_Name: 'SGPA Calculation Method', Setting_Value: 'credit_weighted', Setting_Type: 'text', Description: 'Options: credit_weighted/simple_average' },
  { Setting_ID: 'MIN_ATTENDANCE_PCT', Setting_Name: 'Minimum Attendance %', Setting_Value: 75, Setting_Type: 'percentage', Description: 'Minimum attendance percentage required' },
  { Setting_ID: 'ATTENDANCE_MANDATORY', Setting_Name: 'Attendance Mandatory', Setting_Value: 1, Setting_Type: 'boolean', Description: '1=Yes, 0=No' },
  { Setting_ID: 'CA_SUBMISSION_MANDATORY', Setting_Name: 'CA Submission Mandatory', Setting_Value: 1, Setting_Type: 'boolean', Description: '1=Yes, 0=No' },
];

const configSheet = XLSX.utils.json_to_sheet(configData);
configSheet['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 50 }];
XLSX.utils.book_append_sheet(wb, configSheet, 'Config');

// ============================================================================
// SHEET 2: Student_Details (NEW)
// ============================================================================

const studentDetailsData = [
  { PRN: '1001', Student_Name: 'Student A', Programme: 'B.Tech. Architecture', Semester: 'V', Academic_Year: '2024-25', Exam_Session: 'Dec 2024', Programme_Type: 'Architecture', Course_Credits: 4, Enrollment_Status: 'Regular' },
  { PRN: '1002', Student_Name: 'Student B', Programme: 'B.Tech. Architecture', Semester: 'V', Academic_Year: '2024-25', Exam_Session: 'Dec 2024', Programme_Type: 'Architecture', Course_Credits: 4, Enrollment_Status: 'Regular' },
  { PRN: '1003', Student_Name: 'Student C', Programme: 'B.Tech. Civil', Semester: 'V', Academic_Year: '2024-25', Exam_Session: 'Dec 2024', Programme_Type: 'Non-Architecture', Course_Credits: 4, Enrollment_Status: 'Regular' },
];

const studentDetailsSheet = XLSX.utils.json_to_sheet(studentDetailsData);
studentDetailsSheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb, studentDetailsSheet, 'Student_Details');

// ============================================================================
// SHEET 3: Student_Marks (IMPORT sheet - NO CHANGES to maintain parser compatibility)
// ============================================================================

const studentMarksData = [
  { ID: 1, PRN: '1001', 'Name of the Student': 'Student A', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA1', Theory: 18, Practical: 17, Skills: 19 },
  { ID: 2, PRN: '1001', 'Name of the Student': 'Student A', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA2', Theory: 17, Practical: 16, Skills: 18 },
  { ID: 3, PRN: '1001', 'Name of the Student': 'Student A', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA3', Theory: 19, Practical: 18, Skills: 17 },
  { ID: 4, PRN: '1001', 'Name of the Student': 'Student A', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'ESE', Theory: 65, Practical: 42, Skills: 25 },
  { ID: 5, PRN: '1002', 'Name of the Student': 'Student B', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA1', Theory: 15, Practical: 14, Skills: 16 },
  { ID: 6, PRN: '1002', 'Name of the Student': 'Student B', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA2', Theory: 14, Practical: 13, Skills: 15 },
  { ID: 7, PRN: '1002', 'Name of the Student': 'Student B', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA3', Theory: 16, Practical: 15, Skills: 14 },
  { ID: 8, PRN: '1002', 'Name of the Student': 'Student B', CM_Course_Name: 'B.Tech. Architecture', Semester: 'V', PaperCode: 'ARCH_501', SM_Subject_Name: 'Design Studio', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'ESE', Theory: 58, Practical: 38, Skills: 22 },
  { ID: 9, PRN: '1003', 'Name of the Student': 'Student C', CM_Course_Name: 'B.Tech. Civil', Semester: 'V', PaperCode: 'CIVIL_501', SM_Subject_Name: 'Structural Analysis', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA1', Theory: 35, Practical: 18, Skills: 0 },
  { ID: 10, PRN: '1003', 'Name of the Student': 'Student C', CM_Course_Name: 'B.Tech. Civil', Semester: 'V', PaperCode: 'CIVIL_501', SM_Subject_Name: 'Structural Analysis', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA2', Theory: 38, Practical: 17, Skills: 0 },
  { ID: 11, PRN: '1003', 'Name of the Student': 'Student C', CM_Course_Name: 'B.Tech. Civil', Semester: 'V', PaperCode: 'CIVIL_501', SM_Subject_Name: 'Structural Analysis', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'CA3', Theory: 36, Practical: 19, Skills: 0 },
  { ID: 12, PRN: '1003', 'Name of the Student': 'Student C', CM_Course_Name: 'B.Tech. Civil', Semester: 'V', PaperCode: 'CIVIL_501', SM_Subject_Name: 'Structural Analysis', Academic_Year: '2024-25', 'Exam Year': 'Dec 2024', Assessment_Type: 'ESE', Theory: 72, Practical: 35, Skills: 0 },
];

const studentMarksSheet = XLSX.utils.json_to_sheet(studentMarksData);
studentMarksSheet['!cols'] = [
  { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 10 },
  { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  { wch: 10 }, { wch: 10 }, { wch: 10 }
];
XLSX.utils.book_append_sheet(wb, studentMarksSheet, 'Student_Marks');

// ============================================================================
// SHEET 4: Course_Config (NEW)
// ============================================================================

const courseConfigData = [
  { PaperCode: 'ARCH_501', Programme_Code: 'BTECH-ARCH', Course_Name: 'Design Studio', Semester: 'V', Programme_Category: 'Architecture', Course_Credits: 4, Assessment_Heads: 'Theory,Practical,Skills', Theory_Applicable: 1, Practical_Applicable: 1, Skills_Applicable: 1, CA1_Max_Theory: 20, CA2_Max_Theory: 20, CA3_Max_Theory: 20, CA1_Max_Practical: 20, CA2_Max_Practical: 20, CA3_Max_Practical: 20, CA1_Max_Skills: 20, CA2_Max_Skills: 20, CA3_Max_Skills: 20, ESE_Max_Theory: 100, ESE_Max_Practical: 50, ESE_Max_Skills: 30, Min_Attendance_Pct: 75, Attendance_Mandatory: 'YES', CA_Submission_Mandatory: 'YES', Is_Comprehensive_Exam: 1 },
  { PaperCode: 'CIVIL_501', Programme_Code: 'BTECH-CIVIL', Course_Name: 'Structural Analysis', Semester: 'V', Programme_Category: 'Non-Architecture', Course_Credits: 4, Assessment_Heads: 'Theory,Practical', Theory_Applicable: 1, Practical_Applicable: 1, Skills_Applicable: 0, CA1_Max_Theory: 20, CA2_Max_Theory: 20, CA3_Max_Theory: 20, CA1_Max_Practical: 20, CA2_Max_Practical: 20, CA3_Max_Practical: 20, CA1_Max_Skills: 0, CA2_Max_Skills: 0, CA3_Max_Skills: 0, ESE_Max_Theory: 100, ESE_Max_Practical: 50, ESE_Max_Skills: 0, Min_Attendance_Pct: 75, Attendance_Mandatory: 'YES', CA_Submission_Mandatory: 'YES', Is_Comprehensive_Exam: 1 },
];

const courseConfigSheet = XLSX.utils.json_to_sheet(courseConfigData);
courseConfigSheet['!cols'] = [
  { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
];
XLSX.utils.book_append_sheet(wb, courseConfigSheet, 'Course_Config');

// ============================================================================
// SHEET 5: Results (Enhanced with new columns)
// ============================================================================

const resultsData = [
  { PRN: '1001', 'Name of the Student': 'Student A', PaperCode: 'ARCH_501', Subject: 'Design Studio', Programme_Type: 'Architecture', Total_CA_Max: 140, Total_CA_Obtained: 105, Internal_Percentage: 75, Min_Internal_Passing_Marks: 56, Internal_Status: 'TG', ESE_Theory: 65, ESE_Practical: 42, ESE_Skills: 25, ESE_Theory_Max: 100, ESE_Practical_Max: 50, ESE_Skills_Max: 30, Total_Max: 320, Total_Obtained: 237, Overall_Percentage: 74.06, Programme_Passing_Pct: 45, Final_Status: 'PASS', Grade_Point: 7.4, Credit_Points: 29.6, SGPA: 7.4, Attendance_Count: 72, Required_Attendance: 75, Attendance_Status: '=IF([@[Attendance_Count]]>=[@[Required_Attendance]],"ELIGIBLE","NOT_ELIGIBLE")', CA_Submission_Status: 'SUBMITTED', TNG_Status: '=IF([@[Internal_Status]]="TNG","TNG",IF(OR([@[Attendance_Status]]="NOT_ELIGIBLE",[@[CA_Submission_Status]]="MISSING"),"TNG",[@[Final_Status]]))', Grade_Point_Raw: 7.406, Grade_Point_Rounded: '=ROUND([@[Grade_Point_Raw]],2)', Grade_Point_Ceiling: '=CEILING([@[Grade_Point_Raw]],0.01)' },
  { PRN: '1002', 'Name of the Student': 'Student B', PaperCode: 'ARCH_501', Subject: 'Design Studio', Programme_Type: 'Architecture', Total_CA_Max: 140, Total_CA_Obtained: 90, Internal_Percentage: 64.29, Min_Internal_Passing_Marks: 56, Internal_Status: 'TG', ESE_Theory: 58, ESE_Practical: 38, ESE_Skills: 22, ESE_Theory_Max: 100, ESE_Practical_Max: 50, ESE_Skills_Max: 30, Total_Max: 320, Total_Obtained: 208, Overall_Percentage: 65, Programme_Passing_Pct: 45, Final_Status: 'PASS', Grade_Point: 6.5, Credit_Points: 26, SGPA: 6.5, Attendance_Count: 70, Required_Attendance: 75, Attendance_Status: '=IF([@[Attendance_Count]]>=[@[Required_Attendance]],"ELIGIBLE","NOT_ELIGIBLE")', CA_Submission_Status: 'SUBMITTED', TNG_Status: '=IF([@[Internal_Status]]="TNG","TNG",IF(OR([@[Attendance_Status]]="NOT_ELIGIBLE",[@[CA_Submission_Status]]="MISSING"),"TNG",[@[Final_Status]]))', Grade_Point_Raw: 6.5, Grade_Point_Rounded: '=ROUND([@[Grade_Point_Raw]],2)', Grade_Point_Ceiling: '=CEILING([@[Grade_Point_Raw]],0.01)' },
  { PRN: '1003', 'Name of the Student': 'Student C', PaperCode: 'CIVIL_501', Subject: 'Structural Analysis', Programme_Type: 'Non-Architecture', Total_CA_Max: 100, Total_CA_Obtained: 105, Internal_Percentage: 105, Min_Internal_Passing_Marks: 40, Internal_Status: 'TG', ESE_Theory: 72, ESE_Practical: 35, ESE_Skills: 0, ESE_Theory_Max: 100, ESE_Practical_Max: 50, ESE_Skills_Max: 0, Total_Max: 250, Total_Obtained: 212, Overall_Percentage: 84.8, Programme_Passing_Pct: 40, Final_Status: 'PASS', Grade_Point: 8.48, Credit_Points: 33.92, SGPA: 8.48, Attendance_Count: 78, Required_Attendance: 75, Attendance_Status: '=IF([@[Attendance_Count]]>=[@[Required_Attendance]],"ELIGIBLE","NOT_ELIGIBLE")', CA_Submission_Status: 'SUBMITTED', TNG_Status: '=IF([@[Internal_Status]]="TNG","TNG",IF(OR([@[Attendance_Status]]="NOT_ELIGIBLE",[@[CA_Submission_Status]]="MISSING"),"TNG",[@[Final_Status]]))', Grade_Point_Raw: 8.48, Grade_Point_Rounded: '=ROUND([@[Grade_Point_Raw]],2)', Grade_Point_Ceiling: '=CEILING([@[Grade_Point_Raw]],0.01)' },
];

const resultsSheet = XLSX.utils.json_to_sheet(resultsData);
resultsSheet['!cols'] = [
  { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
];
XLSX.utils.book_append_sheet(wb, resultsSheet, 'Results');

// ============================================================================
// SHEET 6: SGPA (Enhanced with new columns)
// ============================================================================

const sgpaData = [
  { PRN: '1001', Semester: 'V', Student_Name: 'Student A', Total_Credit_Points: 29.6, Total_Credits: 4, SGPA: 7.4, Credits_Earned: 29.6, SGPA_With_Fail: 7.4, SGPA_Without_Fail: 7.4, Is_Provisional_SGPA: 'NO', SGPA_Calculation_Method: 'credit_weighted' },
  { PRN: '1002', Semester: 'V', Student_Name: 'Student B', Total_Credit_Points: 26, Total_Credits: 4, SGPA: 6.5, Credits_Earned: 26, SGPA_With_Fail: 6.5, SGPA_Without_Fail: 6.5, Is_Provisional_SGPA: 'NO', SGPA_Calculation_Method: 'credit_weighted' },
  { PRN: '1003', Semester: 'V', Student_Name: 'Student C', Total_Credit_Points: 33.92, Total_Credits: 4, SGPA: 8.48, Credits_Earned: 33.92, SGPA_With_Fail: 8.48, SGPA_Without_Fail: 8.48, Is_Provisional_SGPA: 'NO', SGPA_Calculation_Method: 'credit_weighted' },
];

const sgpaSheet = XLSX.utils.json_to_sheet(sgpaData);
sgpaSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb, sgpaSheet, 'SGPA');

// ============================================================================
// SHEET 7: ESE_Authorization (NEW)
// ============================================================================

const eseAuthorizationData = [
  { PRN: '1001', PaperCode: 'ARCH_501', Subject_Name: 'Design Studio', Internal_Status: 'TG', ESE_Theory_Status: 'PASS', ESE_Practical_Status: 'PASS', ESE_Skills_Status: 'PASS', Authorization_Status: '=IF([@[Internal_Status]]="TNG","NOT_AUTHORIZED",IF(OR([@[ESE_Theory_Status]]="FAIL",[@[ESE_Practical_Status]]="FAIL",[@[ESE_Skills_Status]]="FAIL"),"PENDING_REVIEW","AUTHORIZED"))', Authorization_Date: '2024-12-20', Authorized_By: 'Exam Coordinator' },
  { PRN: '1002', PaperCode: 'ARCH_501', Subject_Name: 'Design Studio', Internal_Status: 'TG', ESE_Theory_Status: 'PASS', ESE_Practical_Status: 'PASS', ESE_Skills_Status: 'PASS', Authorization_Status: '=IF([@[Internal_Status]]="TNG","NOT_AUTHORIZED",IF(OR([@[ESE_Theory_Status]]="FAIL",[@[ESE_Practical_Status]]="FAIL",[@[ESE_Skills_Status]]="FAIL"),"PENDING_REVIEW","AUTHORIZED"))', Authorization_Date: '2024-12-20', Authorized_By: 'Exam Coordinator' },
  { PRN: '1003', PaperCode: 'CIVIL_501', Subject_Name: 'Structural Analysis', Internal_Status: 'TG', ESE_Theory_Status: 'PASS', ESE_Practical_Status: 'PASS', ESE_Skills_Status: 'N/A', Authorization_Status: '=IF([@[Internal_Status]]="TNG","NOT_AUTHORIZED",IF(OR([@[ESE_Theory_Status]]="FAIL",[@[ESE_Practical_Status]]="FAIL",[@[ESE_Skills_Status]]="FAIL"),"PENDING_REVIEW","AUTHORIZED"))', Authorization_Date: '2024-12-20', Authorized_By: 'Exam Coordinator' },
];

const eseAuthorizationSheet = XLSX.utils.json_to_sheet(eseAuthorizationData);
eseAuthorizationSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb, eseAuthorizationSheet, 'ESE_Authorization');

// ============================================================================
// SHEET 8: Grading_Reference (Enhanced with new columns)
// ============================================================================

const gradingReferenceData = [
  // Non-Architecture
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 91, Marks_Percentage_Max: 100, Grade_Point: 10, Grade_Label: 'O', Remarks: 'Outstanding', Is_Distinction: 'TRUE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'TRUE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 81, Marks_Percentage_Max: 90, Grade_Point: 9, Grade_Label: 'A+', Remarks: 'Excellent', Is_Distinction: 'TRUE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'TRUE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 71, Marks_Percentage_Max: 80, Grade_Point: 8, Grade_Label: 'A', Remarks: 'Very Good', Is_Distinction: 'TRUE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'TRUE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 61, Marks_Percentage_Max: 70, Grade_Point: 7, Grade_Label: 'B+', Remarks: 'Good', Is_Distinction: 'FALSE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 51, Marks_Percentage_Max: 60, Grade_Point: 6, Grade_Label: 'B', Remarks: 'Above Average', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 41, Marks_Percentage_Max: 50, Grade_Point: 5, Grade_Label: 'C', Remarks: 'Average', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 40, Marks_Percentage_Max: 40, Grade_Point: 4, Grade_Label: 'P', Remarks: 'Pass', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'FALSE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: 0, Marks_Percentage_Max: 39, Grade_Point: 0, Grade_Label: 'F', Remarks: 'Fail', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'FALSE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Non-Architecture', Marks_Percentage_Min: -1, Marks_Percentage_Max: -1, Grade_Point: 0, Grade_Label: 'Ab', Remarks: 'Absent', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'FALSE', Eligibility_For_Honors: 'FALSE' },
  
  // Architecture
  { Programme_Type: 'Architecture', Marks_Percentage_Min: 90, Marks_Percentage_Max: 100, Grade_Point: 10, Grade_Label: 'O', Remarks: 'Outstanding', Is_Distinction: 'TRUE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'TRUE' },
  { Programme_Type: 'Architecture', Marks_Percentage_Min: 80, Marks_Percentage_Max: 89, Grade_Point: 9, Grade_Label: 'A', Remarks: 'Excellent', Is_Distinction: 'TRUE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'TRUE' },
  { Programme_Type: 'Architecture', Marks_Percentage_Min: 70, Marks_Percentage_Max: 79, Grade_Point: 8, Grade_Label: 'B', Remarks: 'Very Good', Is_Distinction: 'TRUE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'TRUE' },
  { Programme_Type: 'Architecture', Marks_Percentage_Min: 60, Marks_Percentage_Max: 69, Grade_Point: 7, Grade_Label: 'C', Remarks: 'Good', Is_Distinction: 'FALSE', Is_First_Class: 'TRUE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Architecture', Marks_Percentage_Min: 50, Marks_Percentage_Max: 59, Grade_Point: 6, Grade_Label: 'D', Remarks: 'Above Average', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'TRUE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Architecture', Marks_Percentage_Min: 45, Marks_Percentage_Max: 49, Grade_Point: 5, Grade_Label: 'E', Remarks: 'Average', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'FALSE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Architecture', Marks_Percentage_Min: 0, Marks_Percentage_Max: 44, Grade_Point: 0, Grade_Label: 'F', Remarks: 'Fail', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'FALSE', Eligibility_For_Honors: 'FALSE' },
  { Programme_Type: 'Architecture', Marks_Percentage_Min: -1, Marks_Percentage_Max: -1, Grade_Point: 0, Grade_Label: 'Ab', Remarks: 'Absent', Is_Distinction: 'FALSE', Is_First_Class: 'FALSE', Is_Second_Class: 'FALSE', Eligibility_For_Honors: 'FALSE' },
];

const gradingSheet = XLSX.utils.json_to_sheet(gradingReferenceData);
gradingSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
XLSX.utils.book_append_sheet(wb, gradingSheet, 'Grading_Reference');

// ============================================================================
// SHEET 9: Result_Rules (NEW)
// ============================================================================

const resultRulesData = [
  { Programme_Type: 'Architecture', Minimum_Passing_Percentage: 45, Minimum_ESE_Heads_Passed: 1, Minimum_Attendance_Pct: 75, CA_Submission_Mandatory: 'YES', Attendance_Mandatory: 'YES', Special_Rules: 'Architecture students must achieve minimum 45% overall with all ESE heads passed' },
  { Programme_Type: 'Non-Architecture', Minimum_Passing_Percentage: 40, Minimum_ESE_Heads_Passed: 1, Minimum_Attendance_Pct: 75, CA_Submission_Mandatory: 'YES', Attendance_Mandatory: 'YES', Special_Rules: 'Non-Architecture students must achieve minimum 40% overall with all ESE heads passed' },
];

const resultRulesSheet = XLSX.utils.json_to_sheet(resultRulesData);
resultRulesSheet['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 50 }];
XLSX.utils.book_append_sheet(wb, resultRulesSheet, 'Result_Rules');

// ============================================================================
// SHEET 10: Audit_Log (NEW)
// ============================================================================

const auditLogData = [
  { Log_ID: 1, Action: 'CA_UPDATE', PRN: '1001', PaperCode: 'ARCH_501', Before_Value: '90', After_Value: '92', Updated_By: 'Exam Coordinator', Updated_At: '2024-12-01 14:30:00', Reason: 'CA re-evaluation' },
  { Log_ID: 2, Action: 'ESE_UPDATE', PRN: '1002', PaperCode: 'ARCH_501', Before_Value: 'PASS', After_Value: 'FAIL', Updated_By: 'Exam Controller', Updated_At: '2024-12-15 10:00:00', Reason: 'ESE practical re-check' },
  { Log_ID: 3, Action: 'FINAL_RESULT', PRN: '1001', PaperCode: 'ARCH_501', Before_Value: 'PASS', After_Value: 'PASS', Updated_By: 'System', Updated_At: '2024-12-20 09:00:00', Reason: 'Final calculation' },
  { Log_ID: 4, Action: 'SGPA_UPDATE', PRN: '1001', PaperCode: 'ARCH_501', Before_Value: '7.25', After_Value: '7.40', Updated_By: 'System', Updated_At: '2024-12-20 09:00:00', Reason: 'Grade point updated' },
  { Log_ID: 5, Action: 'FINAL_RESULT', PRN: '1002', PaperCode: 'ARCH_501', Before_Value: 'PASS', After_Value: 'TNG', Updated_By: 'System', Updated_At: '2024-12-21 11:00:00', Reason: 'Internal eligibility failed' },
];

const auditLogSheet = XLSX.utils.json_to_sheet(auditLogData);
auditLogSheet['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }];
XLSX.utils.book_append_sheet(wb, auditLogSheet, 'Audit_Log');

// ============================================================================
// SHEET 11: Export_Config (NEW)
// ============================================================================

const exportConfigData = [
  { Sheet_Name: 'Results', Column_Name: 'PRN', Include_In_Export: 'YES', Column_Header_Override: 'PRN', Data_Type: 'number', Width: 10, Format: '' },
  { Sheet_Name: 'Results', Column_Name: 'Name of the Student', Include_In_Export: 'YES', Column_Header_Override: 'Student Name', Data_Type: 'text', Width: 25, Format: '' },
  { Sheet_Name: 'Results', Column_Name: 'Grade_Point_Rounded', Include_In_Export: 'YES', Column_Header_Override: 'Grade Point', Data_Type: 'number', Width: 12, Format: '0.00' },
  { Sheet_Name: 'Results', Column_Name: 'Final_Status', Include_In_Export: 'YES', Column_Header_Override: 'Status', Data_Type: 'text', Width: 15, Format: '' },
  { Sheet_Name: 'Results', Column_Name: 'Attendance_Status', Include_In_Export: 'YES', Column_Header_Override: 'Attendance', Data_Type: 'text', Width: 12, Format: '' },
  { Sheet_Name: 'Student_Marks', Column_Name: 'Theory', Include_In_Export: 'YES', Column_Header_Override: 'Theory Marks', Data_Type: 'number', Width: 12, Format: '0' },
  { Sheet_Name: 'Student_Marks', Column_Name: 'Practical', Include_In_Export: 'YES', Column_Header_Override: 'Practical Marks', Data_Type: 'number', Width: 12, Format: '0' },
  { Sheet_Name: 'Student_Marks', Column_Name: 'Skills', Include_In_Export: 'YES', Column_Header_Override: 'Skills Marks', Data_Type: 'number', Width: 12, Format: '0' },
  { Sheet_Name: 'Student_Marks', Column_Name: 'Assessment_Type', Include_In_Export: 'YES', Column_Header_Override: 'Assessment', Data_Type: 'text', Width: 15, Format: '' },
  { Sheet_Name: 'Config', Column_Name: 'Setting_Value', Include_In_Export: 'NO', Column_Header_Override: '', Data_Type: 'number', Width: 10, Format: '' },
  { Sheet_Name: 'Audit_Log', Column_Name: 'Action', Include_In_Export: 'YES', Column_Header_Override: 'Action', Data_Type: 'text', Width: 15, Format: '' },
  { Sheet_Name: 'Audit_Log', Column_Name: 'PRN', Include_In_Export: 'YES', Column_Header_Override: 'PRN', Data_Type: 'text', Width: 15, Format: '' },
  { Sheet_Name: 'Audit_Log', Column_Name: 'Updated_At', Include_In_Export: 'YES', Column_Header_Override: 'Timestamp', Data_Type: 'date', Width: 20, Format: 'YYYY-MM-DD HH:MM:SS' },
  { Sheet_Name: 'Student_Details', Column_Name: 'Programme_Type', Include_In_Export: 'YES', Column_Header_Override: 'Programme Type', Data_Type: 'text', Width: 20, Format: '' },
  { Sheet_Name: 'Grading_Reference', Column_Name: 'Grade_Label', Include_In_Export: 'YES', Column_Header_Override: 'Grade', Data_Type: 'text', Width: 10, Format: '' },
];

const exportConfigSheet = XLSX.utils.json_to_sheet(exportConfigData);
exportConfigSheet['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
XLSX.utils.book_append_sheet(wb, exportConfigSheet, 'Export_Config');

// ============================================================================
// SHEET 12: Example_Cases (NEW)
// ============================================================================

const exampleCasesData = [
  { Case_ID: 'CASE-001', Scenario: 'PASS', PRN: '2001', Programme_Type: 'Non-Architecture', CA_Percentage: 75, ESE_Theory_Pct: 70, ESE_Practical_Pct: 65, ESE_Skills_Pct: 80, Attendance_Pct: 85, Overall_Percentage: 75, Expected_Final_Status: 'PASS', Expected_Grade: 'A', Notes: 'All components meet minimums' },
  { Case_ID: 'CASE-002', Scenario: 'TNG', PRN: '2002', Programme_Type: 'Non-Architecture', CA_Percentage: 35, ESE_Theory_Pct: 70, ESE_Practical_Pct: 65, ESE_Skills_Pct: 80, Attendance_Pct: 85, Overall_Percentage: 55, Expected_Final_Status: 'TNG', Expected_Grade: 'N/A', Notes: 'CA below 40% eligibility' },
  { Case_ID: 'CASE-003', Scenario: 'ESE Head Fail', PRN: '2003', Programme_Type: 'Non-Architecture', CA_Percentage: 75, ESE_Theory_Pct: 40, ESE_Practical_Pct: 65, ESE_Skills_Pct: 80, Attendance_Pct: 85, Overall_Percentage: 60, Expected_Final_Status: 'FAIL', Expected_Grade: 'F', Notes: 'ESE Theory head below 45%' },
  { Case_ID: 'CASE-004', Scenario: 'Architecture FAIL', PRN: '2004', Programme_Type: 'Architecture', CA_Percentage: 40, ESE_Theory_Pct: 45, ESE_Practical_Pct: 45, ESE_Skills_Pct: 45, Attendance_Pct: 85, Overall_Percentage: 44.99, Expected_Final_Status: 'FAIL', Expected_Grade: 'F', Notes: 'Architecture at 44.99% (below 45%)' },
  { Case_ID: 'CASE-005', Scenario: 'Architecture PASS (Grade E)', PRN: '2005', Programme_Type: 'Architecture', CA_Percentage: 40, ESE_Theory_Pct: 45, ESE_Practical_Pct: 45, ESE_Skills_Pct: 45, Attendance_Pct: 85, Overall_Percentage: 45, Expected_Final_Status: 'PASS', Expected_Grade: 'E', Notes: 'Architecture at exactly 45%, Grade E' },
  { Case_ID: 'CASE-006', Scenario: 'Non-Arch FAIL', PRN: '2006', Programme_Type: 'Non-Architecture', CA_Percentage: 35, ESE_Theory_Pct: 45, ESE_Practical_Pct: 45, ESE_Skills_Pct: 45, Attendance_Pct: 85, Overall_Percentage: 39.99, Expected_Final_Status: 'FAIL', Expected_Grade: 'F', Notes: 'Non-Arch at 39.99% (below 40%)' },
  { Case_ID: 'CASE-007', Scenario: 'Non-Arch PASS (Grade P)', PRN: '2007', Programme_Type: 'Non-Architecture', CA_Percentage: 40, ESE_Theory_Pct: 45, ESE_Practical_Pct: 45, ESE_Skills_Pct: 45, Attendance_Pct: 85, Overall_Percentage: 40, Expected_Final_Status: 'PASS', Expected_Grade: 'P', Notes: 'Non-Arch at exactly 40%, Grade P' },
  { Case_ID: 'CASE-008', Scenario: 'Non-Arch FAIL (45% min)', PRN: '2008', Programme_Type: 'Non-Architecture', CA_Percentage: 44, ESE_Theory_Pct: 45, ESE_Practical_Pct: 45, ESE_Skills_Pct: 45, Attendance_Pct: 85, Overall_Percentage: 44.99, Expected_Final_Status: 'FAIL', Expected_Grade: 'F', Notes: 'Non-Arch with custom 45% minimum' },
  { Case_ID: 'CASE-009', Scenario: 'Non-Arch PASS (Grade C)', PRN: '2009', Programme_Type: 'Non-Architecture', CA_Percentage: 45, ESE_Theory_Pct: 45, ESE_Practical_Pct: 45, ESE_Skills_Pct: 45, Attendance_Pct: 85, Overall_Percentage: 45, Expected_Final_Status: 'PASS', Expected_Grade: 'C', Notes: 'Non-Arch at 45%, Grade C' },
  { Case_ID: 'CASE-010', Scenario: 'Absent', PRN: '2010', Programme_Type: 'Non-Architecture', CA_Percentage: 0, ESE_Theory_Pct: 0, ESE_Practical_Pct: 0, ESE_Skills_Pct: 0, Attendance_Pct: 0, Overall_Percentage: 0, Expected_Final_Status: 'FAIL', Expected_Grade: 'Ab', Notes: 'All marks 0, absent scenario' },
  { Case_ID: 'CASE-011', Scenario: 'Partial Attendance', PRN: '2011', Programme_Type: 'Non-Architecture', CA_Percentage: 75, ESE_Theory_Pct: 70, ESE_Practical_Pct: 65, ESE_Skills_Pct: 80, Attendance_Pct: 50, Overall_Percentage: 72, Expected_Final_Status: 'TNG', Expected_Grade: 'N/A', Notes: 'Attendance 50% below required 75%' },
];

const exampleCasesSheet = XLSX.utils.json_to_sheet(exampleCasesData);
exampleCasesSheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, exampleCasesSheet, 'Example_Cases');

// ============================================================================
// SHEET 13: Language_Support (Optional - included)
// ============================================================================

const languageData = [
  { Field_Key: 'PRN', English: 'PRN', Hindi: 'प्रवेश क्रमांक', Regional: 'प्रवेश क्रमांक' },
  { Field_Key: 'Name of the Student', English: 'Name of the Student', Hindi: 'विद्यार्थ्याचे नाव', Regional: 'विद्यार्थ्याचे नाव' },
  { Field_Key: 'Theory', English: 'Theory', Hindi: 'सिद्धांत', Regional: 'सिद्धांत' },
  { Field_Key: 'Practical', English: 'Practical', Hindi: 'व्यावहारिक', Regional: 'व्यावहारिक' },
  { Field_Key: 'Skills', English: 'Skills', Hindi: 'कौशल्ये', Regional: 'कौशल्ये' },
  { Field_Key: 'CA1', English: 'CA1', Hindi: 'आंतरिक मूल्यमापन 1', Regional: 'आंतरिक मूल्यमापन 1' },
  { Field_Key: 'CA2', English: 'CA2', Hindi: 'आंतरिक मूल्यमापन 2', Regional: 'आंतरिक मूल्यमापन 2' },
  { Field_Key: 'CA3', English: 'CA3', Hindi: 'आंतरिक मूल्यमापन 3', Regional: 'आंतरिक मूल्यमापन 3' },
  { Field_Key: 'ESE', English: 'ESE', Hindi: 'अंतिम परीक्षा', Regional: 'अंतिम परीक्षा' },
  { Field_Key: 'Total Marks', English: 'Total Marks', Hindi: 'कुल अंक', Regional: 'कुल अंक' },
  { Field_Key: 'Percentage', English: 'Percentage', Hindi: 'टके', Regional: 'टके' },
  { Field_Key: 'Grade', English: 'Grade', Hindi: 'ग्रेड', Regional: 'ग्रेड' },
  { Field_Key: 'Pass', English: 'Pass', Hindi: 'उत्तीर्ण', Regional: 'उत्तीर्ण' },
  { Field_Key: 'Fail', English: 'Fail', Hindi: 'अनुत्तीर्ण', Regional: 'अनुत्तीर्ण' },
  { Field_Key: 'Attendance', English: 'Attendance', Hindi: 'उपस्थिति', Regional: 'उपस्थिति' },
  { Field_Key: 'Status', English: 'Status', Hindi: 'स्थिति', Regional: 'स्थिति' },
  { Field_Key: 'Subject', English: 'Subject', Hindi: 'विषय', Regional: 'विषय' },
  { Field_Key: 'PaperCode', English: 'Paper Code', Hindi: 'पेपर कोड', Regional: 'पेपर कोड' },
  { Field_Key: 'Semester', English: 'Semester', Hindi: 'सेमेस्टर', Regional: 'सेमेस्टर' },
  { Field_Key: 'Academic Year', English: 'Academic Year', Hindi: 'शैक्षणिक वर्ष', Regional: 'शैक्षणिक वर्ष' },
  { Field_Key: 'Programme', English: 'Programme', Hindi: 'कोर्स', Regional: 'कोर्स' },
  { Field_Key: 'CGPA', English: 'CGPA', Hindi: 'संचयी ग्रेड पॉइंट', Regional: 'संचयी ग्रेड पॉइंट' },
  { Field_Key: 'SGPA', English: 'SGPA', Hindi: 'सेमेस्टर ग्रेड पॉइंट', Regional: 'सेमेस्टर ग्रेड पॉइंट' },
];

const languageSheet = XLSX.utils.json_to_sheet(languageData);
languageSheet['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 35 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wb, languageSheet, 'Language_Support');

// ============================================================================
// SHEET 14: ConditionalFormatting_Guide (NEW - Human-readable reference)
// ============================================================================

const conditionalFormattingGuideData = [
  { Condition: 'TNG (Term Not Granted)', Range: 'Internal_Status, Final_Status columns', Fill: '#8B0000 (Dark Red)', Font: '#FFFFFF (White), Bold' },
  { Condition: 'FAIL', Range: 'Internal_Status, Final_Status columns', Fill: '#FF0000 (Red)', Font: 'Default' },
  { Condition: 'PASS', Range: 'Final_Status column', Fill: '#00CC00 (Green)', Font: 'Default' },
  { Condition: 'PENDING', Range: 'Status columns', Fill: '#FFFF00 (Yellow)', Font: 'Default' },
  { Condition: 'Grade O (Outstanding)', Range: 'Grade column where Grade=O', Fill: '#FFD700 (Gold)', Font: 'Default' },
  { Condition: 'Grade >= 9 (Excellent)', Range: 'Grade_Point column where >=9', Fill: '#0000FF (Blue)', Font: '#FFFFFF (White)' },
  { Condition: 'ESE Head FAIL', Range: 'ESE_Theory_Status, ESE_Practical_Status, ESE_Skills_Status', Border: '#FF0000 (Red, Thick)', Font: 'Default' },
  { Condition: 'Internal < Eligibility', Range: 'Internal_Percentage column where < 40%', Fill: '#FFA500 (Orange)', Font: 'Default' },
];

const cfGuideSheet = XLSX.utils.json_to_sheet(conditionalFormattingGuideData);
cfGuideSheet['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 25 }, { wch: 25 }];
XLSX.utils.book_append_sheet(wb, cfGuideSheet, 'ConditionalFormatting_Guide');

// ============================================================================
// APPLY TABLE STRUCTURES AND AUTOFILTERS
// ============================================================================

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  if (sheet && sheet['!ref']) {
    // Add autofilter (creates Excel Table with structured references)
    sheet['!autofilter'] = { ref: sheet['!ref'] };
  }
});

// ============================================================================
// SET FREEZE PANES (First row + first column)
// ============================================================================

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  if (sheet) {
    // Freeze first row and first column
    sheet['!freezePanes'] = { xSplit: 1, ySplit: 1, topLeftCell: 'B2', activePane: 'bottomRight' };
  }
});

// ============================================================================
// SAVE FILE
// ============================================================================

XLSX.writeFile(wb, 'docs/Sample Templete.xlsx');
console.log('Template generated: docs/Sample Templete.xlsx');
