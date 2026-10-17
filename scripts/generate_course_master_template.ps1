Import-Module ImportExcel

$templatePath = Join-Path $PSScriptRoot "..\docs\Course_Master_LTPS_Template.xlsx"
if (Test-Path $templatePath) {
    Remove-Item $templatePath -Force
}

$courses = @(
    [PSCustomObject]@{
        'Sr. No.' = 1
        'CM_Course_Name' = 'B.Tech. Construction Engineering & Management'
        'Semester' = 'I'
        'PaperCode' = 'APSC102'
        'SM_Subject_Name' = 'Applied Physics'
        'L' = 2
        'T' = 0
        'P' = 1
        'S' = 1
        'Total Credits' = 4
        'Grading Category' = 'Non-Architecture'
        'CAT1 Max Marks' = 10
        'CAT1 Min Marks' = 4
        'CAT2 Max Marks' = 10
        'CAT2 Min Marks' = 4
        'CAT3 Max Marks' = 30
        'CAT3 Min Marks' = 12
        'CAP1 Max Marks' = 10
        'CAP1 Min Marks' = 4
        'CAP2 Max Marks' = 10
        'CAP2 Min Marks' = 4
        'CAP3 Max Marks' = 20
        'CAP3 Min Marks' = 8
        'CAS1 Max Marks' = 0
        'CAS1 Min Marks' = 0
        'CAS2 Max Marks' = 0
        'CAS2 Min Marks' = 0
        'CAS3 Max Marks' = 0
        'CAS3 Min Marks' = 0
        'EST Max Marks' = 50
        'EST Min Marks' = 20
        'ESP Max Marks' = 40
        'ESP Min Marks' = 16
        'ESS Max Marks' = 0
        'ESS Min Marks' = 0
        'IA Max Marks' = 90
        'IA Min Marks' = 36
        'Total Marks' = 180
        'Total Marks Min' = 72
    },
    [PSCustomObject]@{
        'Sr. No.' = 2
        'CM_Course_Name' = 'B.Arch. Architecture & Planning'
        'Semester' = 'I'
        'PaperCode' = 'ARCH101'
        'SM_Subject_Name' = 'Architectural Design Studio I'
        'L' = 1
        'T' = 0
        'P' = 2
        'S' = 3
        'Total Credits' = 6
        'Grading Category' = 'Architecture'
        'CAT1 Max Marks' = 15
        'CAT1 Min Marks' = 7
        'CAT2 Max Marks' = 15
        'CAT2 Min Marks' = 7
        'CAT3 Max Marks' = 20
        'CAT3 Min Marks' = 9
        'CAP1 Max Marks' = 15
        'CAP1 Min Marks' = 7
        'CAP2 Max Marks' = 15
        'CAP2 Min Marks' = 7
        'CAP3 Max Marks' = 20
        'CAP3 Min Marks' = 9
        'CAS1 Max Marks' = 10
        'CAS1 Min Marks' = 5
        'CAS2 Max Marks' = 10
        'CAS2 Min Marks' = 5
        'CAS3 Max Marks' = 30
        'CAS3 Min Marks' = 14
        'EST Max Marks' = 50
        'EST Min Marks' = 23
        'ESP Max Marks' = 50
        'ESP Min Marks' = 23
        'ESS Max Marks' = 50
        'ESS Min Marks' = 23
        'IA Max Marks' = 150
        'IA Min Marks' = 68
        'Total Marks' = 300
        'Total Marks Min' = 137
    },
    [PSCustomObject]@{
        'Sr. No.' = 3
        'CM_Course_Name' = 'B.Tech. Computer Science & AI'
        'Semester' = 'I'
        'PaperCode' = 'MATH101'
        'SM_Subject_Name' = 'Calculus & Linear Algebra'
        'L' = 3
        'T' = 1
        'P' = 0
        'S' = 0
        'Total Credits' = 4
        'Grading Category' = 'Non-Architecture'
        'CAT1 Max Marks' = 15
        'CAT1 Min Marks' = 6
        'CAT2 Max Marks' = 15
        'CAT2 Min Marks' = 6
        'CAT3 Max Marks' = 20
        'CAT3 Min Marks' = 8
        'CAP1 Max Marks' = 0
        'CAP1 Min Marks' = 0
        'CAP2 Max Marks' = 0
        'CAP2 Min Marks' = 0
        'CAP3 Max Marks' = 0
        'CAP3 Min Marks' = 0
        'CAS1 Max Marks' = 0
        'CAS1 Min Marks' = 0
        'CAS2 Max Marks' = 0
        'CAS2 Min Marks' = 0
        'CAS3 Max Marks' = 0
        'CAS3 Min Marks' = 0
        'EST Max Marks' = 50
        'EST Min Marks' = 20
        'ESP Max Marks' = 0
        'ESP Min Marks' = 0
        'ESS Max Marks' = 0
        'ESS Min Marks' = 0
        'IA Max Marks' = 50
        'IA Min Marks' = 20
        'Total Marks' = 100
        'Total Marks Min' = 40
    }
)

$excel = $courses | Export-Excel -Path $templatePath -WorksheetName "Course_Master" -AutoSize -BoldTopRow -FreezeTopRow -PassThru

# Add Dropdown Data Validation for Grading Category (Column K, rows 2 to 1000)
$ws = $excel.Workbook.Worksheets["Course_Master"]
$validation = $ws.DataValidations.AddListValidation("K2:K1000")
$validation.ShowErrorMessage = $true
$validation.ErrorTitle = "Invalid Grading Category"
$validation.Error = "Please select either 'Architecture' or 'Non-Architecture'."
$validation.Formula.Values.Add("Architecture")
$validation.Formula.Values.Add("Non-Architecture")

# Add Instructions Sheet
$instructions = @(
    [PSCustomObject]@{
        'Field / Column' = 'Grading Category'
        'Requirement' = 'Mandatory. Select either "Architecture" or "Non-Architecture" from dropdown.'
        'Rule / Behavior' = 'Determines 10-point letter grading bands (e.g. Arch passes at 45%, Non-Arch at 40%).'
    },
    [PSCustomObject]@{
        'Field / Column' = 'CAT1, CAT2, CAT3'
        'Requirement' = 'Theory Continuous Assessments. Enter Max & Min marks (or 0 if not applicable).'
        'Rule / Behavior' = 'Min marks cannot exceed Max marks. Head is marked active if any Max > 0.'
    },
    [PSCustomObject]@{
        'Field / Column' = 'CAP1, CAP2, CAP3'
        'Requirement' = 'Practical Continuous Assessments. Enter Max & Min marks (or 0 if not applicable).'
        'Rule / Behavior' = 'Min marks cannot exceed Max marks. Head is marked active if any Max > 0.'
    },
    [PSCustomObject]@{
        'Field / Column' = 'CAS1, CAS2, CAS3'
        'Requirement' = 'Skills Continuous Assessments. Enter Max & Min marks (or 0 if not applicable).'
        'Rule / Behavior' = 'Min marks cannot exceed Max marks. Head is marked active if any Max > 0.'
    },
    [PSCustomObject]@{
        'Field / Column' = 'EST, ESP, ESS'
        'Requirement' = 'End-Semester Exam Max & Min marks for Theory, Practical, and Skills.'
        'Rule / Behavior' = 'Min marks define ESE passing cutoff (e.g. 40% or 45%). ESE entry is blocked if internal eligibility (TG) is not met.'
    },
    [PSCustomObject]@{
        'Field / Column' = 'IA Max & Min Marks'
        'Requirement' = 'Combined Internal Assessment totals (sum of all active CAT, CAP, CAS).'
        'Rule / Behavior' = 'Auto-calculated if blank or verified during import.'
    },
    [PSCustomObject]@{
        'Field / Column' = 'Total Marks & Min'
        'Requirement' = 'Overall maximum and passing threshold (IA + EST + ESP + ESS).'
        'Rule / Behavior' = 'Auto-calculated if blank or verified during import.'
    }
)
# Close first package
$excel.Save()
$excel.Dispose()

# Export instructions sheet using Export-Excel
$instructions | Export-Excel -Path $templatePath -WorksheetName "Instructions" -AutoSize -BoldTopRow

Write-Host "Template successfully generated at $templatePath with native Excel dropdown data validation!"
