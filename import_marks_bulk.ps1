$csvPath = Join-Path $PSScriptRoot "marks_export.csv"
$connStr = "Data Source=acharya360\SQLEXPRESS;Initial Catalog=SSPU_Exam;Integrated Security=True;TrustServerCertificate=True"

Write-Host "Connecting to SQL Server acharya360\SQLEXPRESS (SSPU_Exam)..."
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

# Truncate student_marks table first
$cmd = $conn.CreateCommand()
$cmd.CommandText = "TRUNCATE TABLE dbo.student_marks"
$cmd.ExecuteNonQuery() | Out-Null
Write-Host "Cleared existing records from dbo.student_marks."

# Create a DataTable matching the table structure
$dt = New-Object System.Data.DataTable
$dt.Columns.Add("id", [string]) | Out-Null
$dt.Columns.Add("prn", [string]) | Out-Null
$dt.Columns.Add("student_name", [string]) | Out-Null
$dt.Columns.Add("cm_course_name", [string]) | Out-Null
$dt.Columns.Add("semester", [string]) | Out-Null
$dt.Columns.Add("paper_code", [string]) | Out-Null
$dt.Columns.Add("sm_subject_name", [string]) | Out-Null
$dt.Columns.Add("academic_year", [string]) | Out-Null
$dt.Columns.Add("exam_year", [string]) | Out-Null
$dt.Columns.Add("assessment_type", [string]) | Out-Null
$dt.Columns.Add("theory", [decimal]) | Out-Null
$dt.Columns.Add("practical", [decimal]) | Out-Null
$dt.Columns.Add("skills", [decimal]) | Out-Null
$dt.Columns.Add("uploaded_by", [string]) | Out-Null

Write-Host "Parsing marks_export.csv..."
$reader = [System.IO.File]::OpenText($csvPath)
$header = $reader.ReadLine() # skip header

$count = 0
while (($line = $reader.ReadLine()) -ne $null) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $cols = $line.Split("`t")
    $row = $dt.NewRow()
    $row["id"] = $cols[0]
    $row["prn"] = $cols[1]
    $row["student_name"] = $cols[2]
    $row["cm_course_name"] = $cols[3]
    $row["semester"] = $cols[4]
    $row["paper_code"] = $cols[5]
    $row["sm_subject_name"] = $cols[6]
    $row["academic_year"] = $cols[7]
    $row["exam_year"] = $cols[8]
    $row["assessment_type"] = $cols[9]
    $row["theory"] = [decimal]$cols[10]
    $row["practical"] = [decimal]$cols[11]
    $row["skills"] = [decimal]$cols[12]
    $row["uploaded_by"] = $cols[13]
    $dt.Rows.Add($row)
    $count++
}
$reader.Close()

Write-Host "Executing SqlBulkCopy for $count rows..."
$bulkCopy = New-Object System.Data.SqlClient.SqlBulkCopy($conn)
$bulkCopy.DestinationTableName = "dbo.student_marks"
$bulkCopy.BatchSize = 5000
$bulkCopy.BulkCopyTimeout = 60

$bulkCopy.ColumnMappings.Add("id", "id") | Out-Null
$bulkCopy.ColumnMappings.Add("prn", "prn") | Out-Null
$bulkCopy.ColumnMappings.Add("student_name", "student_name") | Out-Null
$bulkCopy.ColumnMappings.Add("cm_course_name", "cm_course_name") | Out-Null
$bulkCopy.ColumnMappings.Add("semester", "semester") | Out-Null
$bulkCopy.ColumnMappings.Add("paper_code", "paper_code") | Out-Null
$bulkCopy.ColumnMappings.Add("sm_subject_name", "sm_subject_name") | Out-Null
$bulkCopy.ColumnMappings.Add("academic_year", "academic_year") | Out-Null
$bulkCopy.ColumnMappings.Add("exam_year", "exam_year") | Out-Null
$bulkCopy.ColumnMappings.Add("assessment_type", "assessment_type") | Out-Null
$bulkCopy.ColumnMappings.Add("theory", "theory") | Out-Null
$bulkCopy.ColumnMappings.Add("practical", "practical") | Out-Null
$bulkCopy.ColumnMappings.Add("skills", "skills") | Out-Null
$bulkCopy.ColumnMappings.Add("uploaded_by", "uploaded_by") | Out-Null

$bulkCopy.WriteToServer($dt)
$bulkCopy.Close()
$conn.Close()

Write-Host "Successfully migrated $count student marks into SSPU_Exam!"
