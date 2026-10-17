param(
    [string]$Server = "acharya360\SQLEXPRESS",
    [string]$Database = "SSPU_Exam"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$connStr = "Data Source=$Server;Initial Catalog=$Database;Integrated Security=True;TrustServerCertificate=True"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

# Emit ready signal
$readyMsg = @{ type = "ready"; status = "connected"; database = $Database } | ConvertTo-Json -Compress
[Console]::Out.WriteLine($readyMsg)
[Console]::Out.Flush()

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($line -eq $null -or $line -eq "EXIT") { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    try {
        $req = $line | ConvertFrom-Json
        $reqId = $req.id
        $sql = $req.sql

        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $sql
        $cmd.CommandTimeout = 30

        if ($req.params) {
            foreach ($p in $req.params.PSObject.Properties) {
                $val = if ($p.Value -eq $null) { [DBNull]::Value } else { $p.Value }
                $cmd.Parameters.AddWithValue("@$($p.Name)", $val) | Out-Null
            }
        }

        if ($req.type -eq "execute") {
            $affected = $cmd.ExecuteNonQuery()
            $resp = @{ id = $reqId; success = $true; affected = $affected }
        } else {
            $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
            $dt = New-Object System.Data.DataTable
            $adapter.Fill($dt) | Out-Null
            
            # Convert DataTable to array of hashtables
            $rows = [System.Collections.ArrayList]::new()
            foreach ($r in $dt.Rows) {
                $dict = [ordered]@{}
                foreach ($c in $dt.Columns) {
                    $v = $r[$c]
                    if ($v -is [DBNull]) {
                        $dict[$c.ColumnName] = $null
                    } elseif ($v -is [DateTime]) {
                        $dict[$c.ColumnName] = $v.ToString("yyyy-MM-ddTHH:mm:ssZ")
                    } else {
                        $dict[$c.ColumnName] = $v
                    }
                }
                $rows.Add($dict) | Out-Null
            }
            $resp = @{ id = $reqId; success = $true; data = $rows }
        }
    } catch {
        $resp = @{ id = $reqId; success = $false; error = $_.Exception.Message }
    }

    $json = $resp | ConvertTo-Json -Compress -Depth 10
    [Console]::Out.WriteLine($json)
    [Console]::Out.Flush()
}

$conn.Close()
