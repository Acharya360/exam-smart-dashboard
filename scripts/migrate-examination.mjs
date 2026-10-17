import express from 'express';
import { registerExamination } from '../server/examination.js';
import { runMigrations } from './migrate.mjs';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const worker = spawn('powershell.exe', ['-NoProfile', '-File', 'sql_worker.ps1', '-Server', process.env.SQL_SERVER || 'acharya360\\SQLEXPRESS', '-Database', process.env.SQL_DATABASE || 'SSPU_Exam'], { windowsHide: true });
const callbacks = new Map(); let sequence = 0;
const ready = new Promise((resolve, reject) => {
  worker.on('error', reject); worker.stderr.on('data', d => process.stderr.write(d));
  readline.createInterface({ input: worker.stdout }).on('line', line => { const m = JSON.parse(line); if (m.type === 'ready') resolve(); else { const cb = callbacks.get(m.id); callbacks.delete(m.id); if (m.success) cb?.resolve(m); else cb?.reject(new Error(m.error)); } });
});
function execute(sql, params = {}, type = 'query') { return new Promise((resolve, reject) => { const id = ++sequence; callbacks.set(id, { resolve, reject }); worker.stdin.write(JSON.stringify({ id, sql, params, type }) + '\n'); }); }
try {
  await ready;
  const dryRun = process.argv.includes('--dry-run');
  await runMigrations({ execute, dryRun });
  if (!dryRun) {
    await registerExamination(express(), execute, () => {}).sync();
    console.log(JSON.stringify((await execute('SELECT COUNT(*) registrations,COUNT(DISTINCT prn) students,SUM(CASE WHEN course_id IS NULL OR program_id IS NULL THEN 1 ELSE 0 END) unlinked FROM dbo.exam_registrations')).data));
  }
} finally { worker.stdin.write('EXIT\n'); worker.stdin.end(); }
