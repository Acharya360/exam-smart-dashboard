// Converts remaining legacy staff credentials in dbo.profiles to salted scrypt hashes.
// The secret itself never changes: each stored value is hashed as-is, so the owner keeps signing in
// with the same password. Academic records are compared before and after and must be untouched,
// and no stored credential is ever read into a log, report, or error message.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSqlBridge } from './sql-bridge.mjs';
import { verifiedBackup } from './migrate.mjs';
import { hashPassword, verifyPassword, classifyStoredPassword } from '../server/passwordSecurity.js';

const readProfiles = async execute => (await execute('SELECT id, password FROM dbo.profiles ORDER BY id')).data ?? [];
const snapshotOtherTables = async execute => (await execute(
  "SELECT t.name tbl, SUM(p.rows) cnt FROM sys.tables t JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0,1) WHERE t.name <> 'profiles' GROUP BY t.name"
)).data ?? [];

export async function migratePasswords(execute, {
  database = process.env.SQL_DATABASE || 'SSPU_Exam',
  dryRun = false,
  verifiedBackupPath = null,
  log = console.log,
} = {}) {
  const rows = await readProfiles(execute);
  const hashed = [], unconvertible = [], convertible = [];
  for (const row of rows) {
    const kind = classifyStoredPassword(row.password);
    if (kind === 'legacy') convertible.push({ id: row.id, value: row.password });
    else if (kind === 'hashed') hashed.push(row.id);
    else unconvertible.push(row.id);
  }
  const summary = { scanned: rows.length, hashed: hashed.length, convertible: convertible.length, unconvertible: unconvertible.length };

  if (dryRun) {
    log(JSON.stringify({ mode: 'dry-run', database, ...summary, convertible_ids: convertible.map(r => r.id), unconvertible_ids: unconvertible }));
    return { ...summary, dryRun: true, converted: [], backupPath: null, unconvertibleIds: unconvertible };
  }

  if (!convertible.length) {
    log(JSON.stringify({ status: 'ok', database, ...summary, converted: 0, backupPath: null, message: 'No legacy credentials remain; nothing was written.' }));
    return { ...summary, dryRun: false, converted: [], backupPath: null, unconvertibleIds: unconvertible };
  }

  const before = await snapshotOtherTables(execute);
  const backupPath = verifiedBackupPath ?? await verifiedBackup(execute, database);
  const converted = [];
  for (const row of convertible) {
    const hash = await hashPassword(row.value);
    if (hash.length > 255) throw new Error(`Derived hash for profile ${row.id} exceeds the column width; the write was not attempted.`);
    // Proves the owner's existing secret still validates, so the conversion cannot lock anyone out.
    if (!await verifyPassword(row.value, hash)) throw new Error(`Conversion guard failed for profile ${row.id}; ${converted.length} of ${convertible.length} profiles were already hashed and remain valid. Re-run to continue.`);
    const result = await execute('UPDATE dbo.profiles SET password = @hash WHERE id = @id AND password = @previous',
      { id: row.id, hash, previous: row.value }, 'execute');
    if (result.affected !== 1) throw new Error(`Profile ${row.id} changed while this migration was running; nothing was overwritten for it. ${converted.length} profiles were already hashed. Re-run to continue.`);
    converted.push(row.id);
    log(`Hashed the stored credential for profile ${row.id} (password unchanged).`);
  }

  const after = await readProfiles(execute);
  const stillLegacy = after.filter(row => classifyStoredPassword(row.password) === 'legacy').map(row => row.id);
  if (stillLegacy.length) throw new Error(`Post-migration verification failed; legacy credentials remain for: ${stillLegacy.join(', ')}.`);
  const notHashed = converted.filter(id => classifyStoredPassword(after.find(row => row.id === id)?.password) !== 'hashed');
  if (notHashed.length) throw new Error(`Post-migration verification failed; converted profiles are not a valid hash: ${notHashed.join(', ')}.`);

  const afterSnapshot = await snapshotOtherTables(execute);
  const changed = afterSnapshot.filter(r => (before.find(b => b.tbl === r.tbl)?.cnt ?? -1) !== r.cnt)
    .concat(before.filter(b => !afterSnapshot.some(r => r.tbl === b.tbl)));
  if (changed.length) throw new Error(`Academic or operational tables changed during the password migration: ${changed.map(r => r.tbl).join(', ')}. Profiles were converted and recorded in ${backupPath}; investigate before re-running.`);

  await execute('INSERT INTO dbo.exam_processing_audit(action, actor, detail) VALUES(@action, @actor, @detail)',
    { action: 'PASSWORD_HASH_MIGRATED', actor: 'password-migration', detail: JSON.stringify({ converted, unconvertible, backupPath, database }) }, 'execute');

  log(JSON.stringify({ status: 'ok', database, ...summary, converted: converted.length, converted_ids: converted, unconvertible_ids: unconvertible, backupPath }));
  return { ...summary, dryRun: false, converted, backupPath, unconvertibleIds: unconvertible };
}

export async function runPasswordMigration(options = {}) {
  if (options.execute) return migratePasswords(options.execute, options);
  const bridge = await openSqlBridge();
  try {
    return await migratePasswords((sql, params, type) => bridge.execute(sql, params, type), options);
  } finally {
    bridge.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runPasswordMigration({ dryRun: process.argv.includes('--dry-run') });
  } catch (error) {
    console.error(`PASSWORD MIGRATION FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
