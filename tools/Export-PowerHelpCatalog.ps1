#requires -Version 5.1
<#
Exports command metadata only. Does not execute the discovered commands, install
modules, update help or contact a server. Run in Windows PowerShell 5.1.
Default: Windows inbox modules; -AllAvailable includes your installed role modules.
The generated JSON contains module names, parameter names and types, not file data.
#>
[CmdletBinding()]
param([string]$Path = '.\PowerHelp-Catalog.json', [switch]$AllAvailable, [switch]$EmitCompressed)
$ErrorActionPreference = 'Stop'
$modules = @('Microsoft.PowerShell.Core','Microsoft.PowerShell.Management','Microsoft.PowerShell.Utility','Microsoft.PowerShell.Security','Microsoft.PowerShell.Diagnostics','Microsoft.PowerShell.Host','Microsoft.PowerShell.Archive','Microsoft.PowerShell.LocalAccounts','CimCmdlets','NetTCPIP','NetAdapter','DnsClient','NetSecurity','SmbShare','SmbWitness','ScheduledTasks','Storage','PrintManagement','Defender','DISM','PnpDevice','International','WindowsErrorReporting','BitsTransfer','Appx','SecureBoot','TrustedPlatformModule','PKI','PSDiagnostics','ServerManager','ActiveDirectory','DhcpServer','DnsServer','Hyper-V','FailoverClusters','WindowsServerBackup','DFSNamespace','DFSR','RemoteDesktop')
$common = @('Verbose','Debug','ErrorAction','WarningAction','InformationAction','ErrorVariable','WarningVariable','InformationVariable','OutVariable','OutBuffer','PipelineVariable','WhatIf','Confirm')
if ($AllAvailable) { $modules = @(Get-Module -ListAvailable | Select-Object -ExpandProperty Name -Unique) }
$commands = @(foreach ($module in $modules) {
    try { Get-Command -Module $module -CommandType Cmdlet,Function -ErrorAction Stop } catch { Write-Verbose "Module unavailable: $module" }
})
$records = @(foreach ($command in ($commands | Sort-Object ModuleName,Name -Unique)) {
    $parameters = @(foreach ($parameter in $command.Parameters.Values) {
        if ($common -contains $parameter.Name) { continue }
        $valid = @($parameter.Attributes | Where-Object { $_ -is [System.Management.Automation.ValidateSetAttribute] } | ForEach-Object { $_.ValidValues })
        $enumType = $parameter.ParameterType
        if ($enumType.IsArray) { $enumType = $enumType.GetElementType() }
        if (-not $valid.Count -and $enumType.IsEnum) { $valid = @([System.Enum]::GetNames($enumType)) }
        [ordered]@{ name=$parameter.Name; type=$parameter.ParameterType.FullName; aliases=@($parameter.Aliases); validateSet=$valid }
    })
    $sets = @(foreach ($set in $command.ParameterSets) {
        [ordered]@{ name=$set.Name; default=$set.IsDefault; parameters=@(foreach ($p in $set.Parameters) {
            if ($common -contains $p.Name) { continue }
            [ordered]@{ name=$p.Name; mandatory=$p.IsMandatory; pipeline=$p.ValueFromPipeline; byProperty=$p.ValueFromPipelineByPropertyName; position=$p.Position }
        }) }
    })
    [ordered]@{ name=$command.Name; module=$command.ModuleName; outputTypes=@($command.OutputType | ForEach-Object { $_.Name }); parameters=$parameters; sets=$sets }
})
$data = [ordered]@{ format='powerhelp-catalog'; version=1; powershell=$PSVersionTable.PSVersion.ToString(); origin='Get-Command on Windows PowerShell'; commands=$records }
$json = $data | ConvertTo-Json -Depth 12 -Compress
[System.IO.File]::WriteAllText($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path), $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "$($records.Count) command definitions exported. No discovered command was executed."
if ($EmitCompressed) {
    $memory = New-Object System.IO.MemoryStream
    $gzip = New-Object System.IO.Compression.GZipStream($memory, [System.IO.Compression.CompressionMode]::Compress, $true)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $gzip.Write($bytes,0,$bytes.Length); $gzip.Dispose()
    Write-Output ('PHCATALOG_BEGIN' + [Convert]::ToBase64String($memory.ToArray()) + 'PHCATALOG_END')
    $memory.Dispose()
}
