import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertAdditive, discoverMigrations } from '../scripts/migrate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const silent = () => {};

test('every shipped migration is additive', () => {
  const migrations = discoverMigrations();
  assert.ok(migrations.length > 0);
  for (const migration of migrations) {
    assert.doesNotThrow(() => assertAdditive(migration.body, migration.name));
    assert.match(migration.body, /IF OBJECT_ID|IF COL_LENGTH/, `${migration.name} must guard every statement for re-runnability`);
  }
});

test('checksums are stable across line-ending conversion', () => {
  const [first] = discoverMigrations();
  const withCrlf = path.join(fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'mig-')), 'migrations');
  fs.mkdirSync(withCrlf);
  fs.writeFileSync(path.join(withCrlf, first.name), first.body.replaceAll('\n', '\r\n'));
  assert.equal(discoverMigrations(withCrlf)[0].checksum, first.checksum);
});

test('destructive and batch-separated scripts are rejected, comments are not', () => {
  const blocked = ['DROP TABLE dbo.student_marks;', 'delete from dbo.profiles;', 'TRUNCATE TABLE course_master;', 'ALTER TABLE dbo.programs DROP COLUMN school_name;', 'SELECT 1\nGO\nSELECT 2'];
  for (const sql of blocked) assert.throws(() => assertAdditive(sql, 'synthetic'), /not additive/);
  assert.doesNotThrow(() => assertAdditive("-- this used to DROP TABLE and DELETE FROM rows\n/* TRUNCATE is banned too */\nIF OBJECT_ID('dbo.x', 'U') IS NULL CREATE TABLE dbo.x(id int);", 'synthetic'));
});

const stubExecute = (state) => async (sql, params, type = 'query') => {
  state.calls.push({ sql, type });
  if (type === 'execute') return { affected: 1 };
  if (/OBJECT_ID\('dbo\.exam_schema_versions','U'\)/.test(sql)) return { data: [{ id: state.ledgerPresent ? 1941579982 : null }] };
  if (/FROM dbo\.exam_schema_versions/.test(sql)) return { data: state.ledgerRows };
  if (/SERVERPROPERTY\('InstanceDefaultBackupPath'\)/.test(sql)) return { data: [{ path: 'C:\\Program Files\\Microsoft SQL Server\\MSSQL\\Backup' }] };
  if (/OBJECT_ID\(/.test(sql)) return { data: [{ id: state.basePresent ? 1365579903 : null }] };
  return { data: [{ profiles: 6, programs: 5, course_master: 15, student_marks: 600, exam_registrations: 150, exam_processing_audit: 3 }] };
};

const baseState = () => ({ calls: [], ledgerPresent: true, ledgerRows: [], basePresent: true });
const has = (state, pattern) => state.calls.some(call => pattern.test(call.sql));
const indexOf = (state, pattern) => state.calls.findIndex(call => pattern.test(call.sql));

test('dry-run reports pending work without executing anything', async () => {
  const state = baseState();
  state.ledgerPresent = false;
  const { applyMigrations } = await import('../scripts/migrate.mjs');
  const result = await applyMigrations(stubExecute(state), { dryRun: true, log: silent });
  assert.equal(state.calls.filter(call => call.type === 'execute').length, 0);
  assert.equal(result.applied.length, 0);
  assert.deepEqual(result.pending, discoverMigrations().map(m => m.name));
});

test('a verified backup precedes any pending migration', async () => {
  const state = baseState();
  const { applyMigrations } = await import('../scripts/migrate.mjs');
  const result = await applyMigrations(stubExecute(state), { log: silent });
  const backup = indexOf(state, /^BACKUP DATABASE/);
  const verify = indexOf(state, /^RESTORE VERIFYONLY/);
  const apply = indexOf(state, /BEGIN TRANSACTION/);
  assert.ok(backup > -1 && verify > backup && backup < apply, 'backup and RESTORE VERIFYONLY must complete before applying');
  assert.match(result.backupPath, /_pre-migration_.*\.bak$/);
  assert.ok(has(state, /INSERT INTO dbo\.exam_schema_versions/));
  assert.ok(has(state, /INSERT INTO dbo\.exam_processing_audit/));
});

test('an up-to-date database is left untouched with no backup', async () => {
  const state = baseState();
  state.ledgerRows = discoverMigrations().map(m => ({ version: m.version, checksum: m.checksum }));
  const { applyMigrations } = await import('../scripts/migrate.mjs');
  const result = await applyMigrations(stubExecute(state), { log: silent });
  assert.deepEqual(result.applied, []);
  assert.equal(result.backupPath, null);
  assert.equal(has(state, /BACKUP DATABASE/), false);
  assert.equal(has(state, /BEGIN TRANSACTION/), false);
});

test('edited or orphaned applied migrations fail closed', async () => {
  const { applyMigrations } = await import('../scripts/migrate.mjs');
  const drifted = baseState();
  drifted.ledgerRows = [{ version: '001', checksum: '0'.repeat(64) }];
  await assert.rejects(() => applyMigrations(stubExecute(drifted), { log: silent }), /Checksum drift/);
  const orphaned = baseState();
  orphaned.ledgerRows = [{ version: '999', checksum: '0'.repeat(64) }];
  await assert.rejects(() => applyMigrations(stubExecute(orphaned), { log: silent }), /has no file in migrations/);
  assert.equal(has(drifted, /BACKUP DATABASE/), false);
  assert.equal(has(orphaned, /BEGIN TRANSACTION/), false);
});

test('a missing base schema is reported instead of auto-created', async () => {
  const state = baseState();
  state.basePresent = false;
  const { applyMigrations } = await import('../scripts/migrate.mjs');
  await assert.rejects(() => applyMigrations(stubExecute(state), { log: silent }), /Base schema tables are missing/);
  assert.equal(has(state, /BACKUP DATABASE/), false);
});

test('an instance that rejects COMPRESSION still gets a verified checksummed backup', async () => {
  const state = baseState();
  const inner = stubExecute(state);
  const execute = async (sql, params, type = 'query') => {
    if (type === 'execute' && /^BACKUP DATABASE/.test(sql) && /COMPRESSION/.test(sql)) {
      state.calls.push({ sql, type });
      throw new Error('Exception calling "ExecuteNonQuery": "BACKUP DATABASE WITH COMPRESSION is not supported on Express Edition (64-bit)."');
    }
    return inner(sql, params, type);
  };
  const { applyMigrations } = await import('../scripts/migrate.mjs');
  const result = await applyMigrations(execute, { log: silent });
  const backups = state.calls.filter(call => /^BACKUP DATABASE/.test(call.sql));
  assert.equal(backups.length, 2, 'compression must be retried without the COMPRESSION option');
  assert.match(backups[0].sql, /COMPRESSION/);
  assert.equal(/COMPRESSION/.test(backups[1].sql), false);
  assert.match(backups[1].sql, /COPY_ONLY, CHECKSUM$/);
  const verify = indexOf(state, /^RESTORE VERIFYONLY/);
  const apply = indexOf(state, /BEGIN TRANSACTION/);
  assert.ok(verify > -1 && verify < apply, 'RESTORE VERIFYONLY must still precede any schema change');
  assert.ok(result.backupPath, 'a verified backup path must be reported');
});

test('a failed uncompressed backup is not swallowed', async () => {
  const state = baseState();
  const inner = stubExecute(state);
  const execute = async (sql, params, type = 'query') => {
    if (type === 'execute' && /^BACKUP DATABASE/.test(sql)) {
      state.calls.push({ sql, type });
      throw new Error(sql.includes('COMPRESSION')
        ? 'BACKUP DATABASE WITH COMPRESSION is not supported on Express Edition (64-bit).'
        : 'Operating system error 53 (The network path was not found.)');
    }
    return inner(sql, params, type);
  };
  const { applyMigrations } = await import('../scripts/migrate.mjs');
  await assert.rejects(() => applyMigrations(execute, { log: silent }), /network path was not found/);
  assert.equal(has(state, /BEGIN TRANSACTION/), false, 'nothing may be applied when the backup cannot be taken');
});

test('the launcher and server no longer carry the destructive or duplicated path', () => {
  const launcher = fs.readFileSync(path.join(root, 'run.bat'), 'utf8');
  const start = launcher.search(/^:action_sql_migrate\s*$/m);
  const end = launcher.search(/^:action_build\s*$/m);
  assert.ok(start > -1 && end > start, 'run.bat migrate action label not found');
  const migrateBlock = launcher.slice(start, end);
  assert.match(migrateBlock, /node scripts\\migrate\.mjs/);
  for (const banned of ['create_sspu_exam.sql', 'seed_sspu_exam.sql', 'import_marks_bulk.ps1', 'export_marks_to_csv.js']) {
    assert.equal(migrateBlock.includes(banned), false, `run.bat migrate action must not run ${banned}`);
  }
  assert.equal(fs.readFileSync(path.join(root, 'server/examination.js'), 'utf8').includes('examinationMigration'), false, 'DDL must not be duplicated outside migrations/');
});
