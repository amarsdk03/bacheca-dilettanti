#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$PoolerHost = '',
    [string]$PoolerUser = '',
    [string]$BinDirectory = '',
    [string]$SslRootCert = ''
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'backup-functions.ps1')
$password = $null
try {
    if (-not [Environment]::Is64BitProcess -or [Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'Eseguire con Windows PowerShell x64.' }
    if (-not $BinDirectory) { $BinDirectory = Join-Path $PSScriptRoot '../../.local/dashboard-backup-tools/pgsql/bin' }
    $null = Assert-BackupTools $BinDirectory
    Write-Host 'Backup manuale Supabase Free - Webapp Bacheca Dilettanti'
    Write-Host 'Progetto atteso: nsytraextbndfyprwzts. Aprire Connect > Session pooler (porta 5432).'
    if (-not $PoolerHost) { $PoolerHost = Read-Host 'Incolla solo il campo Host del Session pooler' }
    if (-not $PoolerUser) { $PoolerUser = Read-Host 'Incolla il campo User (postgres.nsytraextbndfyprwzts)' }
    $password = Read-Host 'Password DATABASE (input nascosto, non inviarla in chat)' -AsSecureString
    $backupRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'BachecaDilettanti/backups/nsytraextbndfyprwzts'
    $absoluteRoot = [IO.Path]::GetFullPath($backupRoot)
    $repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')).TrimEnd('\') + '\'
    if ($absoluteRoot.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or $absoluteRoot -match '(?i)[\\/]OneDrive[^\\/]*[\\/]') { throw 'Destinazione backup dentro repository/OneDrive: correggere LocalApplicationData prima di procedere.' }
    $summaryFile = Invoke-DashboardBackup -PoolerHost $PoolerHost.Trim() -PoolerUser $PoolerUser.Trim() -Password $password -BinDirectory $BinDirectory -BackupRoot $backupRoot -SslRootCert $SslRootCert
    Write-Host "Archivio leggibile verificato; ripristino NON provato. Riepilogo: $summaryFile"
    Write-Host 'Invia in chat solo il contenuto di summary.json. Conserva privatamente database.dump e roles.sql.'
    exit 0
}
catch {
    # Show only controlled messages; never interpolate arbitrary exceptions/server diagnostics.
    $message = $_.Exception.Message
    if ($_.Exception -is [System.Management.Automation.RuntimeException] -and $message -notmatch '[\r\n]') { Write-Host $message }
    else { Write-Host 'Backup non completato: verificare client, connessione e spazio disco. Non procedere a M03.' }
    exit 1
}
finally { if ($null -ne $password) { $password.Dispose() } }
