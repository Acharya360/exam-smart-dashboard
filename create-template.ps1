# University Examination Marks Template Generator
# Uses ImportExcel module

# Ensure ImportExcel module is available
if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
    Write-Error "ImportExcel module not found. Please install with: Install-Module ImportExcel -Scope CurrentUser"
    exit 1
}

Import-Module ImportExcel

$FilePath = "d:\Prodoction Work\Exam Smart Dashboard\docs\Sample Templete.xlsx"

# Remove existing file if it exists
if (Test-Path $FilePath) {
    Remove-Item $FilePath -Force
}

# ============================================================================
# SHEET 1: Config
# ============================================================================
$ConfigData = @(
    [PSCustomObject]@{
        Setting = "ARCH_OVERALL_PASS_PCT"
        Value = 45
        Description = "Overall passing percentage for Architecture"
    },
    [PSCustomObject]@{
        Setting = "NON_ARCH_OVERALL_PASS_PCT"
        Value = 40
        Description = "Overall passing percentage for Non-Architecture"
    },
    [PSCustomObject]@{
        Setting = "CA_ELIGIBILITY_PCT"
        Value = 40
        Description = "CA eligibility threshold percentage"
    },
    [PSCustomObject]@{
        Setting = "ESE_HEAD_PASS_PCT"
        Value = 45
        Description = "ESE head-wise passing percentage"
    },
    [PSCustomObject]@{
        Setting = "CA1_MAX"
        Value = 25
        Description = "Maximum marks for CA1"
    },
    [PSCustomObject]@{
        Setting = "CA2_MAX"
        Value = 25
        Description = "Maximum marks for CA2"
    },
    [PSCustomObject]@{
        Setting = "CA3_MAX"
        Value = 50
        Description = "Maximum marks for CA3"
    },
    [PSCustomObject]@{
        Setting = "ESE_THEORY_MAX"
        Value = 100
        Description = "Maximum marks for ESE Theory"
    },
    [PSCustomObject]@{
        Setting = "ESE_PRACTICAL_MAX"
        Value = 100
        Description = "Maximum marks for ESE Practical"
    },
    [PSCustomObject]@{
        Setting = "ESE_SKILLS_MAX"
        Value = 100
        Description = "Maximum marks for ESE Skills"
    },
    [PSCustomObject]@{
        Setting = "CA1_APPLIES"
        Value = $true
        Description = "Is CA1 applicable?"
    },
    [PSCustomObject]@{
        Setting = "CA2_APPLIES"
        Value = $true
        Description = "Is CA2 applicable?"
    },
    [PSCustomObject]@{
        Setting = "CA3_APPLIES"
        Value = $false
        Description = "Is CA3 applicable?"
    },
    [PSCustomObject]@{
        Setting = "THEORY_APPLIES"
        Value = $true
        Description = "Is Theory assessment applicable?"
    },
    [PSCustomObject]@{
        Setting = "PRACTICAL_APPLIES"
        Value = $true
        Description = "Is Practical assessment applicable?"
    },
    [PSCustomObject]@{
        Setting = "SKILLS_APPLIES"
        Value = $false
        Description = "Is Skills assessment applicable?"
    }
)

# ============================================================================
# SHEET 2: Student_Marks
# ============================================================================
$StudentData = @(
    [PSCustomObject]@{
        ID = "1"
        PRN = "1001"
        NameOfStudent = "John Smith"
        CM_Course_Name = "B.Arch"
        Semester = 5
        PaperCode = "AR-501"
        SM_Subject_Name = "Structural Engineering"
        Academic_Year = "2023-24"
        Exam_Year = "2024"
        Assessment_Type = "Theory"
        Theory = 78
        Practical = $null
        Skills = $null
    },
    [PSCustomObject]@{
        ID = "2"
        PRN = "1002"
        NameOfStudent = "Jane Doe"
        CM_Course_Name = "B.Tech"
        Semester = 3
        PaperCode = "CS-301"
        SM_Subject_Name = "Data Structures"
        Academic_Year = "2023-24"
        Exam_Year = "2024"
        Assessment_Type = "Theory"
        Theory = 82
        Practical = 90
        Skills = $null
    },
    [PSCustomObject]@{
        ID = "3"
        PRN = "1003"
        NameOfStudent = "Bob Johnson"
        CM_Course_Name = "B.Arch"
        Semester = 3
        PaperCode = "AR-302"
        SM_Subject_Name = "Building Construction"
        Academic_Year = "2023-24"
        Exam_Year = "2024"
        Assessment_Type = "Practical"
        Theory = $null
        Practical = 85
        Skills = $null
    }
)

# ============================================================================
# SHEET 3: Results
# ============================================================================
$ResultsData = @()

foreach ($student in $StudentData) {
    $programmeType = if ($student.CM_Course_Name -like "*Arch*") { "Architecture" } else { "Non-Architecture" }
    $ca1 = if ($student.Theory -ne $null) { $student.Theory } else { 0 }
    $ca2 = if ($student.Practical -ne $null) { $student.Practical } else { 0 }
    $ca3 = if ($student.Skills -ne $null) { $student.Skills } else { 0 }
    $caTotal = $ca1 + $ca2 + $ca3
    $caEligible = if ($caTotal -ge 40) { "YES" } else { "NO" }
    $eseTotal = $caTotal
    $eseHeadPass = if ($eseTotal -ge 45) { "YES" } else { "NO" }
    $combinedCAEligible = $caEligible
    $tngDetected = if ($caTotal -lt 40) { "TNG" } else { "" }
    $totalMarks = $caTotal + $eseTotal
    $maxPossible = 25 + 25 + 50 + 100
    $totalPct = [math]::Round(($totalMarks / $maxPossible) * 100, 2)
    $overallPassPct = if ($programmeType -eq "Architecture") { 45 } else { 40 }
    $isOverallPass = if ($totalPct -ge $overallPassPct) { "YES" } else { "NO" }
    $isESEPass = $eseHeadPass
    if ($tngDetected -eq "TNG") {
        $finalStatus = "TNG"
    } elseif ($isOverallPass -eq "YES" -and $isESEPass -eq "YES") {
        $finalStatus = "PASS"
    } else {
        $finalStatus = "FAIL"
    }
    
    # Grade point lookup based on percentage
    $gradePoint = 0
    if ($totalPct -ge 90) { $gradePoint = 10 }
    elseif ($totalPct -ge 80) { $gradePoint = 9 }
    elseif ($totalPct -ge 70) { $gradePoint = 8 }
    elseif ($totalPct -ge 60) { $gradePoint = 7 }
    elseif ($totalPct -ge 50) { $gradePoint = 6 }
    elseif ($totalPct -ge 45) { $gradePoint = 5 }
    elseif ($totalPct -ge 40) { $gradePoint = 4 }
    elseif ($totalPct -ge 35) { $gradePoint = 3 }
    else { $gradePoint = 0 }
    
    $sgpa = [math]::Round($gradePoint * 0.1, 2)
    
    $ResultsData += [PSCustomObject]@{
        ID = $student.ID
        PRN = $student.PRN
        NameOfStudent = $student.NameOfStudent
        CM_Course_Name = $student.CM_Course_Name
        Semester = $student.Semester
        PaperCode = $student.PaperCode
        SM_Subject_Name = $student.SM_Subject_Name
        Academic_Year = $student.Academic_Year
        Exam_Year = $student.Exam_Year
        Assessment_Type = $student.Assessment_Type
        Programme_Type = $programmeType
        CA1 = $ca1
        CA2 = $ca2
        CA3 = $ca3
        CA_Total = $caTotal
        CA_Eligible = $caEligible
        ESE_Theory = $student.Theory
        ESE_Practical = $student.Practical
        ESE_Skills = $student.Skills
        ESE_Total = $eseTotal
        ESE_Head_Pass = $eseHeadPass
        Combined_CA_Eligible = $combinedCAEligible
        TNG_Detected = $tngDetected
        Total_Marks = $totalMarks
        Total_Pct = $totalPct
        Overall_Pass_Pct = $overallPassPct
        Is_Overall_Pass = $isOverallPass
        Is_ESE_Pass = $isESEPass
        Final_Status = $finalStatus
        Grade_Point = $gradePoint
        SGPA = $sgpa
    }
}

# ============================================================================
# SHEET 4: SGPA
# ============================================================================
$SGPAData = @(
    [PSCustomObject]@{
        Student_ID = "1"
        PRN = "1001"
        NameOfStudent = "John Smith"
        CM_Course_Name = "B.Arch"
        Semester = 5
        Programme_Type = "Architecture"
        Total_Credits = 20
        Obtained_Credits = 18
        Grade_Point_Avg = 7.5
        SGPA = 0.75
    },
    [PSCustomObject]@{
        Student_ID = "2"
        PRN = "1002"
        NameOfStudent = "Jane Doe"
        CM_Course_Name = "B.Tech"
        Semester = 3
        Programme_Type = "Non-Architecture"
        Total_Credits = 18
        Obtained_Credits = 16
        Grade_Point_Avg = 7.0
        SGPA = 0.70
    },
    [PSCustomObject]@{
        Student_ID = "3"
        PRN = "1003"
        NameOfStudent = "Bob Johnson"
        CM_Course_Name = "B.Arch"
        Semester = 3
        Programme_Type = "Architecture"
        Total_Credits = 16
        Obtained_Credits = 14
        Grade_Point_Avg = 6.5
        SGPA = 0.65
    }
)

# ============================================================================
# SHEET 5: Grading_Reference
# ============================================================================
$GradingData = @(
    [PSCustomObject]@{
        Percentage_From = 90
        Percentage_To = 100
        Grade_Architecture = "O"
        Grade_Point_Arch = 10
        Grade_Non_Arch = "O"
        Grade_Point_Non_Arch = 10
        Remarks = "Outstanding"
    },
    [PSCustomObject]@{
        Percentage_From = 80
        Percentage_To = 89
        Grade_Architecture = "A"
        Grade_Point_Arch = 9
        Grade_Non_Arch = "A"
        Grade_Point_Non_Arch = 9
        Remarks = "Excellent"
    },
    [PSCustomObject]@{
        Percentage_From = 70
        Percentage_To = 79
        Grade_Architecture = "B"
        Grade_Point_Arch = 8
        Grade_Non_Arch = "B"
        Grade_Point_Non_Arch = 8
        Remarks = "Very Good"
    },
    [PSCustomObject]@{
        Percentage_From = 60
        Percentage_To = 69
        Grade_Architecture = "C"
        Grade_Point_Arch = 7
        Grade_Non_Arch = "C"
        Grade_Point_Non_Arch = 7
        Remarks = "Good"
    },
    [PSCustomObject]@{
        Percentage_From = 50
        Percentage_To = 59
        Grade_Architecture = "D"
        Grade_Point_Arch = 6
        Grade_Non_Arch = "D"
        Grade_Point_Non_Arch = 6
        Remarks = "Fair"
    },
    [PSCustomObject]@{
        Percentage_From = 45
        Percentage_To = 49
        Grade_Architecture = "E"
        Grade_Point_Arch = 5
        Grade_Non_Arch = "E"
        Grade_Point_Non_Arch = 5
        Remarks = "Satisfactory (Architecture)"
    },
    [PSCustomObject]@{
        Percentage_From = 40
        Percentage_To = 44
        Grade_Architecture = "F"
        Grade_Point_Arch = 4
        Grade_Non_Arch = "F"
        Grade_Point_Non_Arch = 4
        Remarks = "Satisfactory (Non-Architecture)"
    },
    [PSCustomObject]@{
        Percentage_From = 35
        Percentage_To = 39
        Grade_Architecture = "G"
        Grade_Point_Arch = 3
        Grade_Non_Arch = "G"
        Grade_Point_Non_Arch = 3
        Remarks = "Unsatisfactory"
    },
    [PSCustomObject]@{
        Percentage_From = 0
        Percentage_To = 34
        Grade_Architecture = "Ab"
        Grade_Point_Arch = 0
        Grade_Non_Arch = "Ab"
        Grade_Point_Non_Arch = 0
        Remarks = "Absent"
    }
)

# ============================================================================
# Export to Excel using ImportExcel
# ============================================================================

# Create Config sheet
$ConfigData | Export-Excel -Path $FilePath -WorksheetName "Config" -AutoSize

# Create Student_Marks sheet
$StudentData | Export-Excel -Path $FilePath -WorksheetName "Student_Marks" -AutoSize

# Create Results sheet
$ResultsData | Export-Excel -Path $FilePath -WorksheetName "Results" -AutoSize

# Create SGPA sheet
$SGPAData | Export-Excel -Path $FilePath -WorksheetName "SGPA" -AutoSize

# Create Grading_Reference sheet
$GradingData | Export-Excel -Path $FilePath -WorksheetName "Grading_Reference" -AutoSize

Write-Host "Template created successfully at: $FilePath"
Write-Host "File size: $((Get-Item $FilePath).Length) bytes"
Write-Host "Template generation completed."
