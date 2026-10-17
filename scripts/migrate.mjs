// Checked, versioned, additive-only migration runner.
// Never drops, truncates or deletes: migrations/NNN_*.sql are validated before submission,
// a COPY_ONLY checksummed backup is verified before any pending migration is applied,
// and applied versions are recorded immutably in dbo.exam_schema_versions.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openSqlBridge } from './sql-bridge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const migrationsDir = path.join(root, 'migrations');
export const ledgerTable = 'dbo.exam_schema_versions';

const ledgerDdl = `IF OBJECT_ID('${ledgerTable}','U') IS NULL CREATE TABLE ${ledgerTable}(version nvarchar(50) NOT NULL CONSTRAINT PK_exam_schema_versions PRIMARY KEY, script_name nvarchar(255) NOT NULL, checksum char(64) NOT NULL, applied_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), backup_path nvarchar(2000) NULL);`;

// Tables the additive migrations require to already exist (provisioned by the DBA, not here).
const baseTables = ['dbo.profiles', 'dbo.programs', 'dbo.course_master', 'dbo.exam_schedules', 'dbo.exam_tasks', 'dbo.student_marks'];
const migrationTables = ['dbo.exam_environment', 'dbo.exam_students', 'dbo.exam_course_settings', 'dbo.exam_registrations', 'dbo.exam_processing_audit'];

const destructivePatterns = [
  { pattern: /\bdrop\s+(?:table|database|schema|view|procedure|function|trigger|sequence)\b/i, label: 'DROP of a persisted object' },
  { pattern: /\bdrop\s+column\b/i, label: 'DROP COLUMN' },
  { pattern: /\balter\s+table\s+[\w.[\]]+\s+drop\b/i, label: 'ALTER TABLE ... DROP' },
  { pattern: /\btruncate\b/i, label: 'TRUNCATE' },
  { pattern: /\bdelete\s+from\b/i, label: 'DELETE' },
  { pattern: /^\s*go\s*$/im, label: 'GO batch separator (the runner submits each migration as one batch)' },
];

const stripComments = sql => sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\r\n]*/g, ' ');
const normalize = sql => sql.replace(/\r\n?/g, '\n');

export function assertAdditive(sql, name) {
  const body = stripComments(normalize(sql));
  const violations = destructivePatterns.filter(rule => rule.pattern.test(body));
  if (violations.length) {
    throw new Error(`Migration ${name} is not additive: ${violations.map(v => v.label).join('; ')}. ` +
      'Automated migrations must be guarded CREATE or ALTER TABLE ... ADD statements only. ' +
      'Destructive change scripts stay a manual, human-approved operation and must not be placed in migrations/.');
  }
}

export function discoverMigrations(dir = migrationsDir) {
  if (!fs.existsSync(dir)) throw new Error(`Migrations directory not found: ${dir}`);
  return fs.readdirSync(dir)
    .filter(file => /^\d{3}_[\w.-]+\.sql$/i.test(file))
    .sort((a, b) => Number(a.slice(0, 3)) - Number(b.slice(0, 3)) || a.localeCompare(b))
    .map(file => {
      const body = normalize(fs.readFileSync(path.join(dir, file), 'utf8'));
      return { version: file.slice(0, 3), name: file, body, checksum: crypto.createHash('sha256').update(body).digest('hex') };
    });
}

const identifier = value => {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`Refusing to use unsafe database name "${value}".`);
  return value;
};

export async function verifiedBackup(execute, database) {
  const dir = (await execute("SELECT CONVERT(nvarchar(2000),SERVERPROPERTY('InstanceDefaultBackupPath')) path")).data[0]?.path;
  if (!dir) throw new Error('SQL Server instance default backup path is unavailable; a verified pre-migration backup is required before any schema change.');
  const name = identifier(database);
  const backupPath = `${dir.replace(/[\\/]$/, '')}\\${name}_pre-migration_${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  try {
    await execute(`BACKUP DATABASE [${name}] TO DISK=@path WITH COPY_ONLY, CHECKSUM, COMPRESSION`, { path: backupPath }, 'execute');
  } catch (error) {
    // Express Edition rejects COMPRESSION outright; the checksummed backup itself is still mandatory.
    if (!/compress/i.test(error.message)) throw error;
    await execute(`BACKUP DATABASE [${name}] TO DISK=@path WITH COPY_ONLY, CHECKSUM`, { path: backupPath }, 'execute');
  }
  await execute('RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM', { path: backupPath }, 'execute');
  return backupPath;
}

const isAbsent = async (execute, table) => (await execute(`SELECT OBJECT_ID('${table}','U') id`)).data[0]?.id == null;
const missingFrom = async (execute, tables) => {
  const missing = [];
  for (const table of tables) if (await isAbsent(execute, table)) missing.push(table);
  return missing;
};

export async function applyMigrations(execute, { database = process.env.SQL_DATABASE || 'SSPU_Exam', dryRun = false, verifiedBackupPath = null, log = console.log } = {}) {
  const migrations = discoverMigrations();
  migrations.forEach(migration => assertAdditive(migration.body, migration.name));
  if (!migrations.length) throw new Error(`No migrations discovered in ${migrationsDir}.`);

  const hasLedger = (await execute(`SELECT OBJECT_ID('${ledgerTable}','U') id`)).data[0]?.id != null;
  const recorded = hasLedger ? (await execute(`SELECT version, checksum FROM ${ledgerTable}`)).data : [];
  const recordedVersions = new Set(recorded.map(row => row.version));
  const pending = migrations.filter(migration => !recordedVersions.has(migration.version));

  for (const row of recorded) {
    const migration = migrations.find(candidate => candidate.version === row.version);
    if (!migration) throw new Error(`Recorded migration ${row.version} has no file in migrations/. Applied migrations are immutable; restore the file or recover from a verified backup.`);
    if (migration.checksum !== row.checksum) throw new Error(`Checksum drift on migrations/${migration.name}: file ${migration.checksum.slice(0, 12)}…, recorded ${row.checksum.slice(0, 12)}… Applied migrations must never be edited; add a new version instead.`);
  }

  if (dryRun) {
    log(JSON.stringify({ mode: 'dry-run', database, ledger: hasLedger ? 'present' : 'absent', migrations: migrations.length, pending: pending.map(m => m.name), skipped: migrations.length - pending.length }));
    return { pending: pending.map(migration => migration.name), applied: [], backupPath: null, dryRun: true };
  }

  if (!hasLedger) await execute(ledgerDdl, {}, 'execute');
  const missingBase = await missingFrom(execute, baseTables);
  if (missingBase.length) throw new Error(`Base schema tables are missing: ${missingBase.join(', ')}. Provision the database manually as a human-approved operation; this runner only applies additive migrations.`);

  const backupPath = verifiedBackupPath ?? (pending.length ? await verifiedBackup(execute, database) : null);
  const applied = [];
  for (const migration of pending) {
    await execute(`SET XACT_ABORT ON; BEGIN TRANSACTION; ${migration.body} INSERT INTO ${ledgerTable}(version, script_name, checksum, backup_path) VALUES(@version, @script_name, @checksum, @backup_path); COMMIT;`,
      { version: migration.version, script_name: migration.name, checksum: migration.checksum, backup_path: backupPath }, 'execute');
    applied.push(migration.name);
    log(`Applied migrations/${migration.name} (checksum ${migration.checksum.slice(0, 12)}…).`);
  }

  const missing = await missingFrom(execute, [...migrationTables, ledgerTable]);
  if (missing.length) throw new Error(`Post-migration verification failed; expected tables are absent: ${missing.join(', ')}.`);
  const counts = (await execute('SELECT (SELECT COUNT(*) FROM dbo.profiles) profiles,(SELECT COUNT(*) FROM dbo.programs) programs,(SELECT COUNT(*) FROM dbo.course_master) course_master,(SELECT COUNT(*) FROM dbo.student_marks) student_marks,(SELECT COUNT(*) FROM dbo.exam_registrations) exam_registrations,(SELECT COUNT(*) FROM dbo.exam_processing_audit) exam_processing_audit')).data[0];
  if (applied.length) await execute('INSERT INTO dbo.exam_processing_audit(action, actor, detail) VALUES(@action, @actor, @detail)',
    { action: 'SCHEMA_MIGRATED', actor: 'migration-runner', detail: JSON.stringify({ applied, backupPath, database }) }, 'execute');

  return { pending: pending.map(m => m.name), applied, backupPath, counts, dryRun: false };
}

export async function runMigrations(options = {}) {
  const execute = options.execute;
  if (execute) return applyMigrations(execute, options);
  const bridge = await openSqlBridge();
  try {
    const result = await applyMigrations((sql, params, type) => bridge.execute(sql, params, type), options);
    if (!result.dryRun) console.log(JSON.stringify({ status: 'ok', backupPath: result.backupPath, applied: result.applied, counts: result.counts }));
    return result;
  } finally {
    bridge.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runMigrations({ dryRun: process.argv.includes('--dry-run') });
  } catch (error) {
    console.error(`MIGRATION FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
