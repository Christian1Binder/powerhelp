param([string]$CaseFile = 'cases.json')
$ErrorActionPreference = 'Stop'
$Cases = Get-Content -LiteralPath $CaseFile -Raw -Encoding UTF8 | ConvertFrom-Json
$Failures = @()
foreach ($Case in $Cases) {
    $Tokens = $null
    $ParseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseInput($Case.code, [ref]$Tokens, [ref]$ParseErrors) | Out-Null
    foreach ($Problem in $ParseErrors) { $Failures += "$($Case.name): $($Problem.Message)" }
    if ($Case.command) {
        $Command = Get-Command -Name $Case.command -ErrorAction SilentlyContinue
        if ($Command) {
            foreach ($Parameter in $Case.parameters) {
                if (-not $Command.Parameters.ContainsKey($Parameter)) {
                    # File and Directory are filesystem-provider dynamic parameters.
                    if ($Case.command -eq 'Get-ChildItem' -and $Parameter -in @('File', 'Directory')) { continue }
                    $Failures += "$($Case.name): unknown parameter $Parameter"
                }
            }
        }
    }
}
if ($Failures.Count) { $Failures | ForEach-Object { Write-Output $_ }; throw "$($Failures.Count) validation failures" }
Write-Output "$($Cases.Count) scripts parsed successfully in Windows PowerShell $($PSVersionTable.PSVersion). No generated commands were executed."
