Set-StrictMode -Version Latest

# ProcessStartInfo.ArgumentList is unavailable in Windows PowerShell 5.1.
# Quote each argument according to the Windows CRT parsing rules; never use a shell.
function ConvertTo-NativeArgument {
    param([AllowEmptyString()][string]$Value)
    $escaped = [regex]::Replace($Value, '(\\*)"', '$1$1\"')
    $escaped = [regex]::Replace($escaped, '(\\+)$', '$1$1')
    return '"' + $escaped + '"'
}

function Invoke-BackupProcess {
    param([string]$Executable, [string[]]$Arguments, [hashtable]$Environment = @{})
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = $Executable
    $start.Arguments = ($Arguments | ForEach-Object { ConvertTo-NativeArgument $_ }) -join ' '
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    # Ignore inherited connection/service/password configuration, also for pg_restore.
    try { $childVariables = $start.get_EnvironmentVariables() }
    catch { throw 'Ambiente Windows non valido (possibili variabili duplicate PATH/Path). Aprire un nuovo terminale PowerShell fuori dall''IDE.' }
    foreach ($key in @($childVariables.Keys)) {
        if ($key -like 'PG*') { $childVariables.Remove($key) }
    }
    foreach ($key in $Environment.Keys) { $childVariables[$key] = $Environment[$key] }
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $start
    $started = $false
    try {
        if (-not $process.Start()) { throw 'Avvio del client PostgreSQL fallito.' }
        $started = $true
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(900000)) {
            $process.Kill()
            $process.WaitForExit()
            throw 'Client PostgreSQL interrotto dopo 15 minuti. Copia incompleta.'
        }
        $output = $stdout.GetAwaiter().GetResult()
        $errors = $stderr.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) {
            # Never print raw client diagnostics: they can contain connection values or SQL/data.
            $reason = 'errore del client; nessuno schema viene escluso automaticamente'
            if ($errors -match 'password authentication failed|authentication failed') { $reason = 'autenticazione fallita; controllare la password database' }
            elseif ($errors -match 'permission denied|must be owner|insufficient privilege') { $reason = 'privilegi insufficienti; serve revisione, senza escludere tabelle' }
            elseif ($errors -match 'could not translate|could not connect|connection.*failed|timeout') { $reason = 'connessione fallita; controllare host Session pooler, porta 5432 e rete' }
            throw ('{0}: {1} (exit {2}).' -f [IO.Path]::GetFileName($Executable), $reason, $process.ExitCode)
        }
        # A warning may signal omitted/unrecoverable content. Require review, never certify silently.
        if (-not [string]::IsNullOrWhiteSpace($errors)) {
            throw ('{0}: diagnostica inattesa; copia da rivedere. I dettagli non vengono salvati per evitare dati sensibili.' -f [IO.Path]::GetFileName($Executable))
        }
        return $output
    }
    finally {
        $childVariables.Clear()
        if ($started -and -not $process.HasExited) { $process.Kill(); $process.WaitForExit() }
        $process.Dispose()
    }
}

function Assert-BackupTools {
    param([string]$BinDirectory)
    $versions = [ordered]@{}
    foreach ($name in @('psql', 'pg_dump', 'pg_dumpall', 'pg_restore')) {
        $exe = Join-Path $BinDirectory ($name + '.exe')
        if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Client mancante: $exe. Consultare backup-free.md." }
        $version = (Invoke-BackupProcess $exe @('--version')).Trim()
        if ($version -notmatch ('^' + $name + ' \(PostgreSQL\) 17\.\d+')) { throw "Richiesto client PostgreSQL 17: $name." }
        $versions[$name] = $version
    }
    return $versions
}

function Assert-BackupCoverage {
    param([string]$Toc, [object[]]$Relations)
    foreach ($schema in @('public', 'private', 'auth', 'storage')) {
        # PostgreSQL 15+ can omit the CREATE entry for the built-in public schema.
        # Its presence/content is still checked below via catalog TABLE/TABLE DATA.
        # COMMENT/ACL entries alone must never stand in for table/data coverage.
        if ($schema -ne 'public' -and $Toc -notmatch ('(?m)^\d+; \d+ \d+ SCHEMA - ' + $schema + ' ')) { throw "Schema assente dall'archivio: $schema." }
        if (@($Relations | Where-Object { $_.schema -eq $schema }).Count -eq 0) { throw "Inventario inatteso: nessuna tabella in $schema." }
    }
    foreach ($relation in $Relations) {
        $tag = [regex]::Escape($relation.schema + ' ' + $relation.name)
        if ($Toc -notmatch ('(?m)^\d+; \d+ \d+ TABLE ' + $tag + ' ')) { throw 'Definizione tabella attesa assente dall''archivio; copia incompleta.' }
        if ($Toc -notmatch ('(?m)^\d+; \d+ \d+ TABLE DATA ' + $tag + ' ')) { throw 'Dati tabella attesi assenti dall''archivio; copia incompleta.' }
    }
    foreach ($required in @('public.utente', 'private.admin_audit_event_v1', 'auth.users', 'storage.objects', 'storage.buckets')) {
        if (@($Relations | Where-Object { ($_.schema + '.' + $_.name) -eq $required }).Count -ne 1) { throw 'Baseline M02 inattesa: mancano tabelle richieste. Nessuna migrazione applicata.' }
    }
}

function Write-BackupSummary {
    param([string]$Directory, [object]$Summary)
    $json = $Summary | ConvertTo-Json -Depth 10
    [IO.File]::WriteAllText((Join-Path $Directory 'summary.json'), $json, (New-Object Text.UTF8Encoding($false)))
}

function Invoke-DashboardBackup {
    param(
        [string]$PoolerHost,
        [string]$PoolerUser,
        [Security.SecureString]$Password,
        [string]$BinDirectory,
        [string]$BackupRoot,
        [string]$SslRootCert = ''
    )
    $ErrorActionPreference = 'Stop'
    $projectRef = 'nsytraextbndfyprwzts'
    if ($PoolerHost -cnotmatch '^[a-z0-9][a-z0-9.-]*\.pooler\.supabase\.com$') { throw 'Incollare solo il campo Host del Session pooler Supabase, senza URL o password.' }
    if ($PoolerUser -cne "postgres.$projectRef") { throw "Username errato: atteso postgres.$projectRef nel pannello Connect." }
    if ($Password.Length -eq 0) { throw 'Password database vuota.' }
    $versions = Assert-BackupTools $BinDirectory
    if ($SslRootCert -and -not (Test-Path -LiteralPath $SslRootCert -PathType Leaf)) { throw 'Certificato CA non trovato.' }
    [IO.Directory]::CreateDirectory($BackupRoot) | Out-Null
    $stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
    $directory = Join-Path $BackupRoot $stamp
    if (Test-Path -LiteralPath $directory) { throw 'La destinazione esiste gia; nessun file sovrascritto.' }
    New-Item -ItemType Directory -Path $directory -ErrorAction Stop | Out-Null
    $summary = [ordered]@{
        report_version = 1; status = 'incomplete'; project_ref = $projectRef
        project_name = 'Webapp Bacheca Dilettanti'; plan = 'Free'
        started_at = [DateTime]::UtcNow.ToString('o'); completed_at = $null
        checkpoint = 'after_M02_before_M03'; client_versions = $versions
        server_version_num = $null; tls_mode = 'require'; peer_identity_verified = $false
        checks = [ordered]@{ connection = $false; database_dump = $false; roles_inventory = $false; archive_list = $false; archive_full_read = $false; schema_data_coverage = $false }
        files = @(); restore_tested = $false; storage_files_included = $false
        external_configuration_included = $false; role_passwords_included = $false
        error = $null
    }
    Write-BackupSummary $directory $summary
    $connectionEnv = @{}
    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
        $connectionEnv = @{
            PGHOST = $PoolerHost; PGPORT = '5432'; PGDATABASE = 'postgres'; PGUSER = $PoolerUser
            PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
            PGSSLMODE = 'require'; PGSSLROOTCERT = (Join-Path $directory 'unused-root.crt')
            PGCONNECT_TIMEOUT = '20'; PGAPPNAME = 'bacheca-manual-backup'
            PGCLIENTENCODING = 'UTF8'
            PGOPTIONS = '-c default_transaction_read_only=on -c lock_timeout=10000 -c statement_timeout=600000 -c search_path=pg_catalog'
        }
        if ($SslRootCert) {
            $connectionEnv.PGSSLMODE = 'verify-full'
            $connectionEnv.PGSSLROOTCERT = (Resolve-Path -LiteralPath $SslRootCert).Path
            $summary.tls_mode = 'verify-full'
            $summary.peer_identity_verified = $true
        }
        # Catalogs only: no application rows returned to the console or summary.
        $query = @'
BEGIN READ ONLY;
SELECT json_build_object(
  'database', current_database(), 'operator', current_user,
  'version', current_setting('server_version_num')::integer,
  'relations', (SELECT json_agg(json_build_object('schema', n.nspname, 'name', c.relname) ORDER BY n.nspname, c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public','private','auth','storage') AND c.relkind = 'r'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')));
ROLLBACK;
'@
        $metadata = Invoke-BackupProcess (Join-Path $BinDirectory 'psql.exe') @('-X', '--no-password', '--quiet', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', $query) $connectionEnv
        $source = $metadata | ConvertFrom-Json
        # PGSSLMODE enforces TLS on the client-to-pooler connection. pg_stat_ssl
        # would describe the pooler-to-database connection, not this client.
        if ($source.database -ne 'postgres' -or $source.operator -ne 'postgres' -or $source.version -lt 170000 -or $source.version -ge 180000) { throw 'Database, operatore o versione non corrispondono al destinatario atteso.' }
        $summary.server_version_num = $source.version
        $summary.checks.connection = $true
        $archive = Join-Path $directory 'database.dump'
        $roles = Join-Path $directory 'roles.sql'
        Write-Host 'Esportazione schema e dati del database...'
        $null = Invoke-BackupProcess (Join-Path $BinDirectory 'pg_dump.exe') @('--no-password', '--format=custom', '--lock-wait-timeout=10s', '--file', $archive) $connectionEnv
        if (-not (Test-Path -LiteralPath $archive) -or (Get-Item -LiteralPath $archive).Length -eq 0) { throw 'Archivio database vuoto o assente.' }
        $summary.checks.database_dump = $true
        $null = Invoke-BackupProcess (Join-Path $BinDirectory 'pg_dumpall.exe') @('--no-password', '--roles-only', '--no-role-passwords', '--database=postgres', '--file', $roles) $connectionEnv
        if (-not (Test-Path -LiteralPath $roles) -or (Get-Item -LiteralPath $roles).Length -eq 0) { throw 'Inventario ruoli vuoto o assente.' }
        $summary.checks.roles_inventory = $true
        # Local validation: no connection environment, no --dbname, no SQL execution.
        $toc = Invoke-BackupProcess (Join-Path $BinDirectory 'pg_restore.exe') @('--list', $archive)
        $summary.checks.archive_list = $true
        Write-Host 'Controllo completo della leggibilita (nessun ripristino)...'
        $null = Invoke-BackupProcess (Join-Path $BinDirectory 'pg_restore.exe') @('--file=NUL', $archive)
        $summary.checks.archive_full_read = $true
        Assert-BackupCoverage $toc @($source.relations)
        $summary.checks.schema_data_coverage = $true
        foreach ($file in @($archive, $roles)) {
            $summary.files += [ordered]@{ name = [IO.Path]::GetFileName($file); bytes = (Get-Item -LiteralPath $file).Length; sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() }
        }
        $summary.status = 'archive_verified_restore_untested'
        $summary.completed_at = [DateTime]::UtcNow.ToString('o')
        Write-BackupSummary $directory $summary
        return (Join-Path $directory 'summary.json')
    }
    catch {
        # Exception messages above are static and contain no server output or secret values.
        # Unknown .NET exceptions are deliberately reduced to a type name.
        $summary.error = 'Backup incompleto; controllare il messaggio nel terminale. Nessuna migrazione applicata.'
        Write-BackupSummary $directory $summary
        Write-Host "Copia INCOMPLETA. Riepilogo: $(Join-Path $directory 'summary.json')"
        throw
    }
    finally {
        $connectionEnv.Clear()
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    }
}
