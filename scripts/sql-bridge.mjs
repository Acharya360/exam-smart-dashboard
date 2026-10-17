import { spawn } from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function openSqlBridge() {
 const worker=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'sql_worker.ps1'),'-Server',process.env.SQL_SERVER||'acharya360\\SQLEXPRESS','-Database',process.env.SQL_DATABASE||'SSPU_Exam'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 const callbacks=new Map();let sequence=0,readyResolve,readyReject;
 const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
 const timer=setTimeout(()=>{readyReject(new Error('SQL Server connection timed out.'));worker.kill();},20000);
 const fail=()=>{readyReject(new Error('SQL Server worker stopped. Check Windows authentication and SQL_SERVER.'));for(const cb of callbacks.values()){clearTimeout(cb.timer);cb.reject(new Error('SQL Server worker stopped.'));}callbacks.clear();};
 worker.on('error',fail);worker.on('exit',fail);worker.stderr.on('data',()=>{});
 readline.createInterface({input:worker.stdout}).on('line',line=>{try{const m=JSON.parse(line);if(m.type==='ready'){clearTimeout(timer);readyResolve();return;}const cb=callbacks.get(m.id);if(!cb)return;clearTimeout(cb.timer);callbacks.delete(m.id);m.success?cb.resolve(m):cb.reject(new Error(m.error||'SQL operation failed.'));}catch{fail();}});
 try{await ready;}catch(e){clearTimeout(timer);worker.kill();throw e;}
 return {execute(sql,params={},type='query'){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{callbacks.delete(id);reject(new Error('SQL command timed out.'));worker.kill();},125000);callbacks.set(id,{resolve,reject,timer});worker.stdin.write(JSON.stringify({id,sql,params,type})+'\n');});},close(){worker.stdin.end('EXIT\n');}};
}
