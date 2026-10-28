import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const windows = process.platform === 'win32';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = path.join(repo, 'scripts/dashboard-backup/backup-functions.ps1');
const psQuote = value => `'${value.replaceAll("'", "''")}'`;
const secret = 'synthetic-only-\\"-$()-secret';
let root;
let fakeExe;

function ps(code) {
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', code], {
    encoding: 'utf8', timeout: 60000, windowsHide: true,
    env: { ...process.env, PGSERVICE: 'synthetic-unwanted-service', PGPASSWORD: 'parent-synthetic-password' },
  });
}

before(() => {
  if (!windows) return;
  root = mkdtempSync(path.join(tmpdir(), 'bacheca backup tests '));
  fakeExe = path.join(root, 'fake.exe');
  const result = ps(`$ErrorActionPreference='Stop'; Add-Type -Path ${psQuote(path.join(repo, 'tests/helpers/dashboard-backup-fake.cs'))} -OutputAssembly ${psQuote(fakeExe)} -OutputType ConsoleApplication`);
  assert.equal(result.status, 0, result.stderr);
});
after(() => { if (root) rmSync(root, { recursive: true, force: true }); });

function backup(mode, extra = '') {
  const dir = path.join(root, mode);
  const bin = path.join(dir, 'bin with spaces');
  const output = path.join(dir, 'backup with spaces');
  mkdirSync(bin, { recursive: true });
  for (const name of ['psql', 'pg_dump', 'pg_dumpall', 'pg_restore']) copyFileSync(fakeExe, path.join(bin, `${name}.exe`));
  writeFileSync(path.join(bin, 'mode.txt'), mode);
  const result = ps(`$ErrorActionPreference='Stop'; . ${psQuote(library)}; $password=ConvertTo-SecureString ${psQuote(secret)} -AsPlainText -Force; try { Invoke-DashboardBackup -PoolerHost 'aws-0-synthetic.pooler.supabase.com' -PoolerUser 'postgres.nsytraextbndfyprwzts' -Password $password -BinDirectory ${psQuote(bin)} -BackupRoot ${psQuote(output)} ${extra}; if ($env:PGPASSWORD -ne 'parent-synthetic-password') { throw 'Parent env changed' } } catch { Write-Output $_.Exception.Message; exit 1 } finally { $password.Dispose() }`);
  const summaries = readdirSync(output).map(child => JSON.parse(readFileSync(path.join(output, child, 'summary.json'), 'utf8')));
  assert.ok(!`${result.stdout}${result.stderr}${JSON.stringify(summaries)}`.includes(secret), 'Password leaked');
  return { result, summary: summaries.at(-1), bin, output };
}

test('Windows native arguments preserve spaces, quotes, trailing slashes and metacharacters without a shell', { skip: !windows }, () => {
  const args = ['', 'has spaces', 'quote"inside', 'C:\\path with spaces\\', '$() ` & |', 'slash\\"quote'];
  const code = `console.log(JSON.stringify(process.argv.slice(1)))`;
  const result = ps(`. ${psQuote(library)}; Invoke-BackupProcess ${psQuote(process.execPath)} @(${['-e', code, ...args].map(psQuote).join(',')})`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), args);
});

test('backup exports schema+data and password-free roles, verifies entire archive locally, hashes outputs', { skip: !windows }, () => {
  const { result, summary, bin } = backup('success');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(summary.status, 'archive_verified_restore_untested');
  assert.ok(Object.values(summary.checks).every(Boolean));
  assert.equal(summary.restore_tested, false);
  assert.equal(summary.storage_files_included, false);
  assert.equal(summary.role_passwords_included, false);
  assert.equal(summary.peer_identity_verified, false);
  assert.equal(summary.files.length, 2);
  for (const file of summary.files) { assert.match(file.sha256, /^[a-f0-9]{64}$/); assert.ok(file.bytes > 0); }
  const trace = readFileSync(path.join(bin, 'trace.txt'), 'utf8');
  assert.ok(!trace.includes(secret));
  assert.match(trace, /pg_dump --no-password\|--format=custom/);
  assert.match(trace, /pg_dumpall --no-password\|--roles-only\|--no-role-passwords/);
  assert.match(trace, /pg_restore --file=NUL/);
  assert.doesNotMatch(trace, /--schema-only|--exclude|--clean|--create|--no-acl|--no-owner/);
});

for (const mode of ['auth-failed', 'partial', 'roles-failed', 'corrupt', 'missing-data', 'empty', 'warning', 'missing-schema', 'missing-public-table', 'missing-public-data']) {
  test(`failure ${mode} leaves incomplete evidence and never certifies a backup or leaks diagnostics`, { skip: !windows }, () => {
    const { result, summary } = backup(mode);
    assert.equal(result.status, 1);
    assert.equal(summary.status, 'incomplete');
    assert.equal(summary.completed_at, null);
    assert.equal(summary.restore_tested, false);
    assert.equal(summary.files.length, 0);
    assert.ok(summary.error);
  });
}

for (const mode of ['public-create', 'public-no-acl']) {
  test(`accepts public schema with ${mode} while retaining complete table/data checks`, { skip: !windows }, () => {
    const { result, summary } = backup(mode);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(summary.status, 'archive_verified_restore_untested');
    assert.ok(Object.values(summary.checks).every(Boolean));
  });
}

test('rejects wrong project usernames and connection URLs before creating backup files', { skip: !windows }, () => {
  const result = ps(`. ${psQuote(library)}; $s=ConvertTo-SecureString 'synthetic' -AsPlainText -Force; foreach($pair in @(@('postgresql://password@host','postgres.nsytraextbndfyprwzts'),@('aws-0-synthetic.pooler.supabase.com','postgres.wrong'))) { try { Invoke-DashboardBackup -PoolerHost $pair[0] -PoolerUser $pair[1] -Password $s -BackupRoot ${psQuote(path.join(root, 'must not exist'))}; exit 2 } catch { } }; $s.Dispose()`);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!readdirSync(root).includes('must not exist'));
});

test('repeating a backup preserves the previous files and creates another directory', { skip: !windows }, () => {
  const first = backup('success');
  const previous = readdirSync(first.output).map(child => ({ child, summary: readFileSync(path.join(first.output, child, 'summary.json'), 'utf8'), archive: readFileSync(path.join(first.output, child, 'database.dump'), 'utf8') }));
  const count = previous.length;
  const second = backup('success');
  assert.equal(second.result.status, 0, second.result.stderr);
  assert.equal(readdirSync(second.output).length, count + 1);
  for (const entry of previous) {
    assert.equal(readFileSync(path.join(second.output, entry.child, 'summary.json'), 'utf8'), entry.summary);
    assert.equal(readFileSync(path.join(second.output, entry.child, 'database.dump'), 'utf8'), entry.archive);
  }
});
