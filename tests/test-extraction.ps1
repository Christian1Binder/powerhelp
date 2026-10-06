param([string]$CaseFile = 'extraction.json')
$ErrorActionPreference = 'Stop'
$root = Join-Path ([IO.Path]::GetTempPath()) ('PowerHelp-Test-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $root | Out-Null
try {
    $inputPath = Join-Path $root "O'Brien.txt"
    @('Kundennummer: 12345', 'Kundennummer: AB-6789', 'Weitere Daten: irrelevant') | Set-Content -LiteralPath $inputPath -Encoding UTF8
    $cases = Get-Content -LiteralPath $CaseFile -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($case in $cases) {
        $scriptPath = Join-Path $root ($case.name + '.ps1')
        $outputPath = Join-Path $root ($case.name + '.csv')
        Set-Content -LiteralPath $scriptPath -Value $case.code -Encoding UTF8
        & $scriptPath -InputPath $inputPath -Folder $root -OutputPath $outputPath
        $rows = @(Import-Csv -LiteralPath $outputPath -Delimiter ';' -Encoding UTF8)
        if ($rows.Count -ne 2 -or $rows[0].Wert -ne '12345' -or $rows[1].Wert -ne 'AB-6789') { throw "Incorrect extraction: $($case.name)" }
        if ($case.folder -and ($rows[0].Datei -ne $inputPath -or $rows[0].Position -ne '0')) { throw "Missing source information: $($case.name)" }
        Write-Output "PASS: $($case.name) reads real text and exports two correct CSV rows."
    }
} finally {
    Remove-Item -LiteralPath $root -Recurse -Force
}
