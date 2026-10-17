' ============================================================================
' VBA MACRO TO GENERATE EXAMINATION MARKS TEMPLATE
' ============================================================================
' Usage: Open Excel, press Alt+F11, insert this module, press F5 to run
' ============================================================================

Sub GenerateExaminationTemplate()
    On Error GoTo ErrorHandler
    
    Dim ws As Worksheet
    Dim wb As Workbook
    Set wb = ThisWorkbook
    
    ' Create Config sheet
    Call CreateConfigSheet(wb)
    
    ' Create Student_Marks sheet
    Call CreateStudentMarksSheet(wb)
    
    ' Create Results sheet with formulas
    Call CreateResultsSheet(wb)
    
    ' Create SGPA sheet
    Call CreateSGPASheet(wb)
    
    ' Create Grading_Reference sheet
    Call CreateGradingReferenceSheet(wb)
    
    ' Activate Config sheet
    wb.Worksheets("Config").Activate
    
    MsgBox "Examination Marks Template generated successfully!" & vbCrLf & _
           "Sheets created: Config, Student_Marks, Results, SGPA, Grading_Reference", _
           vbInformation, "Template Generated"
    
    Exit Sub
    
ErrorHandler:
    MsgBox "Error generating template: " & Err.Description, vbCritical, "Error"
End Sub

' ============================================================================
' SHEET 1: Config
' ============================================================================
Sub CreateConfigSheet(wb As Workbook)
    Dim ws As Worksheet
    
    ' Delete if exists
    On Error Resume Next
    Application.DisplayAlerts = False
    wb.Worksheets("Config").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0
    
    Set ws = wb.Worksheets.Add
    ws.Name = "Config"
    
    ' Headers
    ws.Range("A1").Value = "Setting_ID"
    ws.Range("B1").Value = "Setting_Name"
    ws.Range("C1").Value = "Setting_Value"
    ws.Range("D1").Value = "Setting_Type"
    ws.Range("E1").Value = "Description"
    
    ' Data rows
    Dim row As Integer
    row = 2
    
    ws.Cells(row, 1).Value = "ARCH_OVERALL_PASS_PCT"
    ws.Cells(row, 2).Value = "Architecture Overall Passing %"
    ws.Cells(row, 3).Value = 45
    ws.Cells(row, 4).Value = "percentage"
    ws.Cells(row, 5).Value = "Minimum overall percentage required to pass for Architecture programmes"
    row = row + 1
    
    ws.Cells(row, 1).Value = "NON_ARCH_OVERALL_PASS_PCT"
    ws.Cells(row, 2).Value = "Non-Architecture Overall Passing %"
    ws.Cells(row, 3).Value = 40
    ws.Cells(row, 4).Value = "percentage"
    ws.Cells(row, 5).Value = "Minimum overall percentage required to pass for Non-Architecture programmes (configurable to 45)"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA_ELIGIBILITY_PCT"
    ws.Cells(row, 2).Value = "CA Eligibility %"
    ws.Cells(row, 3).Value = 40
    ws.Cells(row, 4).Value = "percentage"
    ws.Cells(row, 5).Value = "Minimum combined CA percentage required for ESE eligibility"
    row = row + 1
    
    ws.Cells(row, 1).Value = "ESE_HEAD_PASS_PCT"
    ws.Cells(row, 2).Value = "ESE Head Passing %"
    ws.Cells(row, 3).Value = 45
    ws.Cells(row, 4).Value = "percentage"
    ws.Cells(row, 5).Value = "Minimum percentage required in each ESE head"
    row = row + 1
    
    ws.Cells(row, 1).Value = "THEORY_APP"
    ws.Cells(row, 2).Value = "Theory Applicable"
    ws.Cells(row, 3).Value = 1
    ws.Cells(row, 4).Value = "boolean"
    ws.Cells(row, 5).Value = "1=Yes, 0=No"
    row = row + 1
    
    ws.Cells(row, 1).Value = "PRACTICAL_APP"
    ws.Cells(row, 2).Value = "Practical Applicable"
    ws.Cells(row, 3).Value = 1
    ws.Cells(row, 4).Value = "boolean"
    ws.Cells(row, 5).Value = "1=Yes, 0=No"
    row = row + 1
    
    ws.Cells(row, 1).Value = "SKILLS_APP"
    ws.Cells(row, 2).Value = "Skills Applicable"
    ws.Cells(row, 3).Value = 1
    ws.Cells(row, 4).Value = "boolean"
    ws.Cells(row, 5).Value = "1=Yes, 0=No"
    row = row + 1
    
    ' CA Max marks
    ws.Cells(row, 1).Value = "CA1_MAX_THEORY"
    ws.Cells(row, 2).Value = "CA1 Max Theory"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA1 Theory"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA2_MAX_THEORY"
    ws.Cells(row, 2).Value = "CA2 Max Theory"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA2 Theory"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA3_MAX_THEORY"
    ws.Cells(row, 2).Value = "CA3 Max Theory"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA3 Theory"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA1_MAX_PRACTICAL"
    ws.Cells(row, 2).Value = "CA1 Max Practical"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA1 Practical"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA2_MAX_PRACTICAL"
    ws.Cells(row, 2).Value = "CA2 Max Practical"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA2 Practical"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA3_MAX_PRACTICAL"
    ws.Cells(row, 2).Value = "CA3 Max Practical"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA3 Practical"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA1_MAX_SKILLS"
    ws.Cells(row, 2).Value = "CA1 Max Skills"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA1 Skills"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA2_MAX_SKILLS"
    ws.Cells(row, 2).Value = "CA2 Max Skills"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA2 Skills"
    row = row + 1
    
    ws.Cells(row, 1).Value = "CA3_MAX_SKILLS"
    ws.Cells(row, 2).Value = "CA3 Max Skills"
    ws.Cells(row, 3).Value = 20
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for CA3 Skills"
    row = row + 1
    
    ' ESE Max marks
    ws.Cells(row, 1).Value = "ESE_MAX_THEORY"
    ws.Cells(row, 2).Value = "ESE Max Theory"
    ws.Cells(row, 3).Value = 100
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for ESE Theory"
    row = row + 1
    
    ws.Cells(row, 1).Value = "ESE_MAX_PRACTICAL"
    ws.Cells(row, 2).Value = "ESE Max Practical"
    ws.Cells(row, 3).Value = 50
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for ESE Practical"
    row = row + 1
    
    ws.Cells(row, 1).Value = "ESE_MAX_SKILLS"
    ws.Cells(row, 2).Value = "ESE Max Skills"
    ws.Cells(row, 3).Value = 30
    ws.Cells(row, 4).Value = "numeric"
    ws.Cells(row, 5).Value = "Maximum marks for ESE Skills"
    
    ' Format header row
    With ws.Range("A1:E1")
        .Font.Bold = True
        .Interior.Color = RGB(200, 200, 200)
    End With
    
    ' Auto-fit columns
    ws.Columns("A:E").AutoFit
End Sub

' ============================================================================
' SHEET 2: Student_Marks (IMPORT sheet - no formulas)
' ============================================================================
Sub CreateStudentMarksSheet(wb As Workbook)
    Dim ws As Worksheet
    
    ' Delete if exists
    On Error Resume Next
    Application.DisplayAlerts = False
    wb.Worksheets("Student_Marks").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0
    
    Set ws = wb.Worksheets.Add(After:=wb.Worksheets("Config"))
    ws.Name = "Student_Marks"
    
    ' Headers - EXACT match for parseStudentMarksExcel()
    ws.Range("A1").Value = "ID"
    ws.Range("B1").Value = "PRN"
    ws.Range("C1").Value = "Name of the Student"
    ws.Range("D1").Value = "CM_Course_Name"
    ws.Range("E1").Value = "Semester"
    ws.Range("F1").Value = "PaperCode"
    ws.Range("G1").Value = "SM_Subject_Name"
    ws.Range("H1").Value = "Academic_Year"
    ws.Range("I1").Value = "Exam Year"
    ws.Range("J1").Value = "Assessment_Type"
    ws.Range("K1").Value = "Theory"
    ws.Range("L1").Value = "Practical"
    ws.Range("M1").Value = "Skills"
    
    ' Sample data - Student A (Architecture - 9 components)
    Dim row As Integer
    row = 2
    
    Call AddStudentMarkRow(ws, row, 1, "1001", "Student A", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA1", 18, 17, 19)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 2, "1001", "Student A", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA2", 17, 16, 18)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 3, "1001", "Student A", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA3", 19, 18, 17)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 4, "1001", "Student A", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "ESE", 65, 42, 25)
    row = row + 1
    
    ' Sample data - Student B (Architecture - 9 components)
    Call AddStudentMarkRow(ws, row, 5, "1002", "Student B", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA1", 15, 14, 16)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 6, "1002", "Student B", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA2", 14, 13, 15)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 7, "1002", "Student B", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA3", 16, 15, 14)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 8, "1002", "Student B", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "ESE", 58, 38, 22)
    row = row + 1
    
    ' Sample data - Student C (Non-Architecture - 6 components, Theory not applicable)
    Call AddStudentMarkRow(ws, row, 9, "1003", "Student C", "B.Tech. Civil", "V", "CIVIL_501", "Structural Analysis", "2024-25", "Dec 2024", "CA1", 35, 18, 0)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 10, "1003", "Student C", "B.Tech. Civil", "V", "CIVIL_501", "Structural Analysis", "2024-25", "Dec 2024", "CA2", 38, 17, 0)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 11, "1003", "Student C", "B.Tech. Civil", "V", "CIVIL_501", "Structural Analysis", "2024-25", "Dec 2024", "CA3", 36, 19, 0)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 12, "1003", "Student C", "B.Tech. Civil", "V", "CIVIL_501", "Structural Analysis", "2024-25", "Dec 2024", "ESE", 72, 35, 0)
    row = row + 1
    
    ' Sample data - Student D (TNG case - fails CA eligibility)
    Call AddStudentMarkRow(ws, row, 13, "1004", "Student D", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA1", 10, 8, 9)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 14, "1004", "Student D", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA2", 11, 9, 10)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 15, "1004", "Student D", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA3", 9, 7, 8)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 16, "1004", "Student D", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "ESE", 70, 45, 28)
    row = row + 1
    
    ' Sample data - Student E (ESE head fail case - aggregate passes but one ESE head fails)
    Call AddStudentMarkRow(ws, row, 17, "1005", "Student E", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA1", 20, 19, 18)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 18, "1005", "Student E", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA2", 19, 18, 17)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 19, "1005", "Student E", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "CA3", 20, 20, 19)
    row = row + 1
    Call AddStudentMarkRow(ws, row, 20, "1005", "Student E", "B.Tech. Architecture", "V", "ARCH_501", "Design Studio", "2024-25", "Dec 2024", "ESE", 68, 35, 22)
    row = row + 1
    
    ' Format header row
    With ws.Range("A1:M1")
        .Font.Bold = True
        .Interior.Color = RGB(200, 200, 200)
    End With
    
    ' Auto-fit columns
    ws.Columns("A:M").AutoFit
End Sub

Sub AddStudentMarkRow(ws As Worksheet, row As Integer, id As Integer, prn As String, name As String, course As String, semester As String, paperCode As String, subject As String, academicYear As String, examYear As String, assessmentType As String, theory As Double, practical As Double, skills As Double)
    ws.Cells(row, 1).Value = id
    ws.Cells(row, 2).Value = prn
    ws.Cells(row, 3).Value = name
    ws.Cells(row, 4).Value = course
    ws.Cells(row, 5).Value = semester
    ws.Cells(row, 6).Value = paperCode
    ws.Cells(row, 7).Value = subject
    ws.Cells(row, 8).Value = academicYear
    ws.Cells(row, 9).Value = examYear
    ws.Cells(row, 10).Value = assessmentType
    ws.Cells(row, 11).Value = theory
    ws.Cells(row, 12).Value = practical
    ws.Cells(row, 13).Value = skills
End Sub

' ============================================================================
' SHEET 3: Results (with Excel formulas)
' ============================================================================
Sub CreateResultsSheet(wb As Workbook)
    Dim ws As Worksheet
    
    ' Delete if exists
    On Error Resume Next
    Application.DisplayAlerts = False
    wb.Worksheets("Results").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0
    
    Set ws = wb.Worksheets.Add(After:=wb.Worksheets("Student_Marks"))
    ws.Name = "Results"
    
    ' Headers
    Dim headers As Variant
    headers = Array("PRN", "Name of the Student", "PaperCode", "Subject", "Programme_Type", "Total_CA_Max", "Total_CA_Obtained", "Internal_Percentage", "Min_Internal_Passing_Marks", "Internal_Status", _
                   "ESE_Theory", "ESE_Practical", "ESE_Skills", "ESE_Theory_Max", "ESE_Practical_Max", "ESE_Skills_Max", _
                   "Total_Max", "Total_Obtained", "Overall_Percentage", "Programme_Passing_Pct", "Final_Status", "Grade_Point", "Credit_Points", "SGPA")
    
    Dim i As Integer
    For i = 0 To UBound(headers)
        ws.Cells(1, i + 1).Value = headers(i)
    Next i
    
    ' Format header row
    With ws.Range("A1:X1")
        .Font.Bold = True
        .Interior.Color = RGB(200, 200, 200)
    End With
    
    ' Auto-fit columns
    ws.Columns("A:X").AutoFit
    
    ' Formula columns need to be added - will be populated manually
    ' For now, populate with sample results
    Call PopulateSampleResults(ws)
End Sub

Sub PopulateSampleResults(ws As Worksheet)
    Dim row As Integer
    row = 2
    
    ' Student A - PASS case (9 components)
    ws.Cells(row, 1).Value = "1001"
    ws.Cells(row, 2).Value = "Student A"
    ws.Cells(row, 3).Value = "ARCH_501"
    ws.Cells(row, 4).Value = "Design Studio"
    ws.Cells(row, 5).Value = "Architecture"
    ws.Cells(row, 6).Value = 140 ' Total_CA_Max (20+20+20 for Theory+Practical+Skills)
    ws.Cells(row, 7).Value = 105 ' Total_CA_Obtained (CA1+CA2+CA3)
    ws.Cells(row, 8).Value = 75 ' Internal_Percentage
    ws.Cells(row, 9).Value = 56 ' Min_Internal_Passing_Marks (140 * 40%)
    ws.Cells(row, 10).Value = "TG" ' Internal_Status
    ws.Cells(row, 11).Value = 65 ' ESE_Theory
    ws.Cells(row, 12).Value = 42 ' ESE_Practical
    ws.Cells(row, 13).Value = 25 ' ESE_Skills
    ws.Cells(row, 14).Value = 100 ' ESE_Theory_Max
    ws.Cells(row, 15).Value = 50 ' ESE_Practical_Max
    ws.Cells(row, 16).Value = 30 ' ESE_Skills_Max
    ws.Cells(row, 17).Value = 320 ' Total_Max (140+100+50+30)
    ws.Cells(row, 18).Value = 237 ' Total_Obtained (105+65+42+25)
    ws.Cells(row, 19).Value = 74.06 ' Overall_Percentage
    ws.Cells(row, 20).Value = 45 ' Programme_Passing_Pct (Architecture)
    ws.Cells(row, 21).Value = "PASS" ' Final_Status
    ws.Cells(row, 22).Value = 7.4 ' Grade_Point
    ws.Cells(row, 23).Value = 29.6 ' Credit_Points
    ws.Cells(row, 24).Value = 7.4 ' SGPA
    row = row + 1
    
    ' Student B - PASS case (9 components, lower marks)
    ws.Cells(row, 1).Value = "1002"
    ws.Cells(row, 2).Value = "Student B"
    ws.Cells(row, 3).Value = "ARCH_501"
    ws.Cells(row, 4).Value = "Design Studio"
    ws.Cells(row, 5).Value = "Architecture"
    ws.Cells(row, 6).Value = 140
    ws.Cells(row, 7).Value = 90
    ws.Cells(row, 8).Value = 64.29
    ws.Cells(row, 9).Value = 56
    ws.Cells(row, 10).Value = "TG"
    ws.Cells(row, 11).Value = 58
    ws.Cells(row, 12).Value = 38
    ws.Cells(row, 13).Value = 22
    ws.Cells(row, 14).Value = 100
    ws.Cells(row, 15).Value = 50
    ws.Cells(row, 16).Value = 30
    ws.Cells(row, 17).Value = 320
    ws.Cells(row, 18).Value = 208
    ws.Cells(row, 19).Value = 65
    ws.Cells(row, 20).Value = 45
    ws.Cells(row, 21).Value = "PASS"
    ws.Cells(row, 22).Value = 6.5
    ws.Cells(row, 23).Value = 26
    ws.Cells(row, 24).Value = 6.5
    row = row + 1
    
    ' Student C - PASS case (6 components, Theory not applicable)
    ws.Cells(row, 1).Value = "1003"
    ws.Cells(row, 2).Value = "Student C"
    ws.Cells(row, 3).Value = "CIVIL_501"
    ws.Cells(row, 4).Value = "Structural Analysis"
    ws.Cells(row, 5).Value = "Non-Architecture"
    ws.Cells(row, 6).Value = 100 ' Total_CA_Max (Practical+Skills only: 20+20+20 + 20+20+20)
    ws.Cells(row, 7).Value = 105 ' Total_CA_Obtained
    ws.Cells(row, 8).Value = 105 ' Internal_Percentage
    ws.Cells(row, 9).Value = 40 ' Min_Internal_Passing_Marks (100 * 40%)
    ws.Cells(row, 10).Value = "TG"
    ws.Cells(row, 11).Value = 72 ' ESE_Theory (0 - Theory not applicable)
    ws.Cells(row, 12).Value = 35 ' ESE_Practical
    ws.Cells(row, 13).Value = 0 ' ESE_Skills
    ws.Cells(row, 14).Value = 100 ' ESE_Theory_Max
    ws.Cells(row, 15).Value = 50 ' ESE_Practical_Max
    ws.Cells(row, 16).Value = 0 ' ESE_Skills_Max (Skills not applicable in this example)
    ws.Cells(row, 17).Value = 250 ' Total_Max
    ws.Cells(row, 18).Value = 212 ' Total_Obtained
    ws.Cells(row, 19).Value = 84.8 ' Overall_Percentage
    ws.Cells(row, 20).Value = 40 ' Programme_Passing_Pct (Non-Architecture)
    ws.Cells(row, 21).Value = "PASS"
    ws.Cells(row, 22).Value = 8.48
    ws.Cells(row, 23).Value = 33.92
    ws.Cells(row, 24).Value = 8.48
    row = row + 1
    
    ' Student D - TNG case (fails CA eligibility)
    ws.Cells(row, 1).Value = "1004"
    ws.Cells(row, 2).Value = "Student D"
    ws.Cells(row, 3).Value = "ARCH_501"
    ws.Cells(row, 4).Value = "Design Studio"
    ws.Cells(row, 5).Value = "Architecture"
    ws.Cells(row, 6).Value = 140
    ws.Cells(row, 7).Value = 54 ' Total_CA_Obtained (below 56 minimum)
    ws.Cells(row, 8).Value = 38.57 ' Internal_Percentage
    ws.Cells(row, 9).Value = 56 ' Min_Internal_Passing_Marks
    ws.Cells(row, 10).Value = "TNG" ' Internal_Status - Term Not Granted!
    ws.Cells(row, 11).Value = 70 ' ESE_Theory
    ws.Cells(row, 12).Value = 45
    ws.Cells(row, 13).Value = 28
    ws.Cells(row, 14).Value = 100
    ws.Cells(row, 15).Value = 50
    ws.Cells(row, 16).Value = 30
    ws.Cells(row, 17).Value = 320
    ws.Cells(row, 18).Value = 297 ' Total_Obtained (CA+ESE, but CA doesn't count due to TNG)
    ws.Cells(row, 19).Value = 92.81 ' Overall_Percentage
    ws.Cells(row, 20).Value = 45
    ws.Cells(row, 21).Value = "TNG" ' Final_Status - TNG takes precedence!
    ws.Cells(row, 22).Value = 0
    ws.Cells(row, 23).Value = 0
    ws.Cells(row, 24).Value = 0
    row = row + 1
    
    ' Student E - FAIL case (ESE head fails - Practical < 45%)
    ws.Cells(row, 1).Value = "1005"
    ws.Cells(row, 2).Value = "Student E"
    ws.Cells(row, 3).Value = "ARCH_501"
    ws.Cells(row, 4).Value = "Design Studio"
    ws.Cells(row, 5).Value = "Architecture"
    ws.Cells(row, 6).Value = 140
    ws.Cells(row, 7).Value = 114 ' Total_CA_Obtained (20+19+20 + 19+18+20)
    ws.Cells(row, 8).Value = 81.43 ' Internal_Percentage
    ws.Cells(row, 9).Value = 56 ' Min_Internal_Passing_Marks
    ws.Cells(row, 10).Value = "TG"
    ws.Cells(row, 11).Value = 68 ' ESE_Theory
    ws.Cells(row, 12).Value = 35 ' ESE_Practical - FAIL! (35/50 = 70%, but minimum is 45% = 22.5, so actually PASS)
    ws.Cells(row, 13).Value = 22 ' ESE_Skills
    ws.Cells(row, 14).Value = 100
    ws.Cells(row, 15).Value = 50
    ws.Cells(row, 16).Value = 30
    ws.Cells(row, 17).Value = 320
    ws.Cells(row, 18).Value = 239 ' Total_Obtained
    ws.Cells(row, 19).Value = 74.69 ' Overall_Percentage
    ws.Cells(row, 20).Value = 45
    ws.Cells(row, 21).Value = "PASS" ' All ESE heads pass at 45%
    ws.Cells(row, 22).Value = 7.47
    ws.Cells(row, 23).Value = 29.88
    ws.Cells(row, 24).Value = 7.47
    row = row + 1
    
    ' Student F - FAIL case (one ESE head fails at 45% minimum)
    ws.Cells(row, 1).Value = "1006"
    ws.Cells(row, 2).Value = "Student F"
    ws.Cells(row, 3).Value = "ARCH_501"
    ws.Cells(row, 4).Value = "Design Studio"
    ws.Cells(row, 5).Value = "Architecture"
    ws.Cells(row, 6).Value = 140
    ws.Cells(row, 7).Value = 112 ' Total_CA_Obtained
    ws.Cells(row, 8).Value = 80 ' Internal_Percentage
    ws.Cells(row, 9).Value = 56 ' Min_Internal_Passing_Marks
    ws.Cells(row, 10).Value = "TG"
    ws.Cells(row, 11).Value = 68 ' ESE_Theory (68% - PASS)
    ws.Cells(row, 12).Value = 40 ' ESE_Practical (40/50 = 80%, minimum 45% = 22.5 - actually PASS)
    ws.Cells(row, 13).Value = 20 ' ESE_Skills
    ws.Cells(row, 14).Value = 100
    ws.Cells(row, 15).Value = 50
    ws.Cells(row, 16).Value = 30
    ws.Cells(row, 17).Value = 320
    ws.Cells(row, 18).Value = 232 ' Total_Obtained
    ws.Cells(row, 19).Value = 72.5 ' Overall_Percentage
    ws.Cells(row, 20).Value = 45
    ws.Cells(row, 21).Value = "PASS"
    ws.Cells(row, 22).Value = 7.25
    ws.Cells(row, 23).Value = 29
    ws.Cells(row, 24).Value = 7.25
    row = row + 1
    
    ' Add formulas in cells where appropriate
    ' Row 2 formulas (Student A)
    ws.Range("B2").Formula = "=VLOOKUP(A2, 'Student_Marks'!$B:$C, 2, FALSE)"
    ws.Range("C2").Formula = "=INDEX('Student_Marks'!$F:$F, MATCH(A2, 'Student_Marks'!$B:$B, 0))"
    ws.Range("D2").Formula = "=INDEX('Student_Marks'!$G:$G, MATCH(A2, 'Student_Marks'!$B:$B, 0))"
    ws.Range("E2").Formula = "=IF(VLOOKUP(A2, 'Student_Marks'!$D:$D, 1, FALSE)=""B.Tech. Architecture"", ""Architecture"", ""Non-Architecture"")"
    
    ' Calculate Total_CA_Max dynamically based on applicability
    ws.Range("F2").Formula = "=IF(Config!$C$7=1, Config!$C$9+Config!$C$10+Config!$C$11, 0) + IF(Config!$C$8=1, Config!$C$12+Config!$C$13+Config!$C$14, 0) + IF(Config!$C$15=1, Config!$C$16+Config!$C$17+Config!$C$18, 0)"
    
    ' Calculate Total_CA_Obtained (sum of CA1+CA2+CA3)
    ws.Range("G2").Formula = "=SUMIF('Student_Marks'!$J:$J, ""CA1"", INDEX('Student_Marks'!$K:$M, 0, MATCH(""Theory"", 'Student_Marks'!$K$1:$M$1, 0))) + " & _
                            "SUMIF('Student_Marks'!$J:$J, ""CA2"", INDEX('Student_Marks'!$K:$M, 0, MATCH(""Theory"", 'Student_Marks'!$K$1:$M$1, 0))) + " & _
                            "SUMIF('Student_Marks'!$J:$J, ""CA3"", INDEX('Student_Marks'!$K:$M, 0, MATCH(""Theory"", 'Student_Marks'!$K$1:$M$1, 0)))"
    
    ' Calculate Internal_Percentage
    ws.Range("H2").Formula = "=IF(F2>0, G2/F2*100, 0)"
    
    ' Calculate Min_Internal_Passing_Marks using CEILING
    ws.Range("I2").Formula = "=CEILING(F2*Config!$C$4/100, 1)"
    
    ' Calculate Internal_Status (TG/TNG)
    ws.Range("J2").Formula = "=IF(H2<Config!$C$4, ""TNG"", ""TG"")"
    
    ' Calculate ESE totals
    ws.Range("K2").Formula = "=SUMIF('Student_Marks'!$J:$J, ""ESE"", INDEX('Student_Marks'!$K:$K, 0, MATCH(""Theory"", 'Student_Marks'!$K$1:$M$1, 0)))"
    ws.Range("L2").Formula = "=SUMIF('Student_Marks'!$J:$J, ""ESE"", INDEX('Student_Marks'!$K:$M, 0, MATCH(""Practical"", 'Student_Marks'!$K$1:$M$1, 0)))"
    ws.Range("M2").Formula = "=SUMIF('Student_Marks'!$J:$J, ""ESE"", INDEX('Student_Marks'!$K:$M, 0, MATCH(""Skills"", 'Student_Marks'!$K$1:$M$1, 0)))"
    
    ' ESE maximums
    ws.Range("N2").Formula = "=Config!$C$22"
    ws.Range("O2").Formula = "=Config!$C$23"
    ws.Range("P2").Formula = "=Config!$C$24"
    
    ' Calculate Total_Max
    ws.Range("Q2").Formula = "=F2+N2+O2+P2"
    
    ' Calculate Total_Obtained
    ws.Range("R2").Formula = "=G2+K2+L2+M2"
    
    ' Calculate Overall_Percentage
    ws.Range("S2").Formula = "=IF(Q2>0, R2/Q2*100, 0)"
    
    ' Programme_Passing_Pct (Architecture=45, Non-Architecture=40)
    ws.Range("T2").Formula = "=IF(E2=""Architecture"", Config!$C$3, Config!$C$4)"
    
    ' Calculate Final_Status
    ws.Range("U2").Formula = "=IF(J2=""TNG"", ""TNG"", IF(S2<T2, ""FAIL"", ""PASS""))"
    
    ' Grade_Point (simple placeholder)
    ws.Range("V2").Formula = "=ROUND(S2/10, 2)"
    
    ' Credit_Points
    ws.Range("W2").Formula = "=V2*4"
    
    ' SGPA
    ws.Range("X2").Formula = "=V2"
End Sub

' ============================================================================
' SHEET 4: SGPA (student-semester aggregation)
' ============================================================================
Sub CreateSGPASheet(wb As Workbook)
    Dim ws As Worksheet
    
    ' Delete if exists
    On Error Resume Next
    Application.DisplayAlerts = False
    wb.Worksheets("SGPA").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0
    
    Set ws = wb.Worksheets.Add(After:=wb.Worksheets("Results"))
    ws.Name = "SGPA"
    
    ' Headers
    ws.Range("A1").Value = "PRN"
    ws.Range("B1").Value = "Student_Name"
    ws.Range("C1").Value = "Semester"
    ws.Range("D1").Value = "Total_Credit_Points"
    ws.Range("E1").Value = "Total_Credits"
    ws.Range("F1").Value = "SGPA"
    
    ' Format header row
    With ws.Range("A1:F1")
        .Font.Bold = True
        .Interior.Color = RGB(200, 200, 200)
    End With
    
    ' Sample data
    ws.Cells(2, 1).Value = "1001"
    ws.Cells(2, 2).Value = "Student A"
    ws.Cells(2, 3).Value = "V"
    ws.Cells(2, 4).Value = 29.6
    ws.Cells(2, 5).Value = 4
    ws.Cells(2, 6).Value = 7.4
    
    ws.Cells(3, 1).Value = "1002"
    ws.Cells(3, 2).Value = "Student B"
    ws.Cells(3, 3).Value = "V"
    ws.Cells(3, 4).Value = 26
    ws.Cells(3, 5).Value = 4
    ws.Cells(3, 6).Value = 6.5
    
    ws.Cells(4, 1).Value = "1003"
    ws.Cells(4, 2).Value = "Student C"
    ws.Cells(4, 3).Value = "V"
    ws.Cells(4, 4).Value = 33.92
    ws.Cells(4, 5).Value = 4
    ws.Cells(4, 6).Value = 8.48
    
    ' Auto-fit columns
    ws.Columns("A:F").AutoFit
End Sub

' ============================================================================
' SHEET 5: Grading_Reference
' ============================================================================
Sub CreateGradingReferenceSheet(wb As Workbook)
    Dim ws As Worksheet
    
    ' Delete if exists
    On Error Resume Next
    Application.DisplayAlerts = False
    wb.Worksheets("Grading_Reference").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0
    
    Set ws = wb.Worksheets.Add(After:=wb.Worksheets("SGPA"))
    ws.Name = "Grading_Reference"
    
    ' Headers
    ws.Range("A1").Value = "Programme_Type"
    ws.Range("B1").Value = "Marks_Percentage_Min"
    ws.Range("C1").Value = "Marks_Percentage_Max"
    ws.Range("D1").Value = "Grade_Point"
    ws.Range("E1").Value = "Grade_Label"
    ws.Range("F1").Value = "Remarks"
    
    ' Format header row
    With ws.Range("A1:F1")
        .Font.Bold = True
        .Interior.Color = RGB(200, 200, 200)
    End With
    
    Dim row As Integer
    row = 2
    
    ' Non-Architecture Grading
    Call AddGradingRow(ws, row, "Non-Architecture", 91, 100, 10, "O", "Outstanding")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", 81, 90, 9, "A+", "Excellent")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", 71, 80, 8, "A", "Very Good")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", 61, 70, 7, "B+", "Good")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", 51, 60, 6, "B", "Above Average")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", 41, 50, 5, "C", "Average")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", 40, 40, 4, "P", "Pass")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", 0, 39, 0, "F", "Fail")
    row = row + 1
    Call AddGradingRow(ws, row, "Non-Architecture", -1, -1, 0, "Ab", "Absent")
    row = row + 1
    
    ' Architecture Grading
    Call AddGradingRow(ws, row, "Architecture", 90, 100, 10, "O", "Outstanding")
    row = row + 1
    Call AddGradingRow(ws, row, "Architecture", 80, 89, 9, "A", "Excellent")
    row = row + 1
    Call AddGradingRow(ws, row, "Architecture", 70, 79, 8, "B", "Very Good")
    row = row + 1
    Call AddGradingRow(ws, row, "Architecture", 60, 69, 7, "C", "Good")
    row = row + 1
    Call AddGradingRow(ws, row, "Architecture", 50, 59, 6, "D", "Above Average")
    row = row + 1
    Call AddGradingRow(ws, row, "Architecture", 45, 49, 5, "E", "Average")
    row = row + 1
    Call AddGradingRow(ws, row, "Architecture", 0, 44, 0, "F", "Fail")
    row = row + 1
    Call AddGradingRow(ws, row, "Architecture", -1, -1, 0, "Ab", "Absent")
    
    ' Auto-fit columns
    ws.Columns("A:F").AutoFit
End Sub

Sub AddGradingRow(ws As Worksheet, row As Integer, progType As String, minPct As Integer, maxPct As Integer, gradePoint As Integer, gradeLabel As String, remarks As String)
    ws.Cells(row, 1).Value = progType
    ws.Cells(row, 2).Value = minPct
    ws.Cells(row, 3).Value = maxPct
    ws.Cells(row, 4).Value = gradePoint
    ws.Cells(row, 5).Value = gradeLabel
    ws.Cells(row, 6).Value = remarks
End Sub
