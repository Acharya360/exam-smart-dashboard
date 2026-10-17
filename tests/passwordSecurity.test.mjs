import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createRateLimiter, classifyStoredPassword } from '../server/passwordSecurity.js';
import { migratePasswords } from '../scripts/migrate-passwords.mjs';
test('password hashes use random salts and preserve spaces',async()=>{const value=' Example password with spaces ';const a=await hashPassword(value),b=await hashPassword(value);assert.notEqual(a,b);assert.ok(await verifyPassword(value,a));assert.equal(await verifyPassword(value.trim(),a),false);assert.equal(await verifyPassword('incorrect',a),false);assert.ok(a.length<255);});
test('legacy compatibility and malformed hashes',async()=>{assert.ok(await verifyPassword('legacy-value','legacy-value'));assert.equal(await verifyPassword('wrong','legacy-value'),false);assert.equal(await verifyPassword('x','scrypt$broken'),false);assert.equal(await verifyPassword({},'x'),false);});
test('rate limiter rejects repeated attempts',()=>{const limiter=createRateLimiter(2);let allowed=0,status;const response={set(){},status(n){status=n;return this;},json(){}};for(let i=0;i<3;i++)limiter({ip:'local-test'},response,()=>allowed++);assert.equal(allowed,2);assert.equal(status,429);});

test('stored credential classification',async()=>{
  assert.equal(classifyStoredPassword('Admin@123'),'legacy');
  assert.equal(classifyStoredPassword(await hashPassword('Admin@123')),'hashed');
  assert.equal(classifyStoredPassword('scrypt$broken'),'unconvertible');
  assert.equal(classifyStoredPassword(''),'unconvertible');
  assert.equal(classifyStoredPassword(null),'unconvertible');
  assert.equal(classifyStoredPassword(undefined),'unconvertible');
});

const silent=()=>{};
const legacyRows=[
  {id:'coe-1',password:'Admin@123'},
  {id:'coord-2',password:'Coord!Secret2'},
  {id:'blank-3',password:null},
  {id:'broken-4',password:'scrypt$notavalidhash'},
];
const stubState=rows=>({calls:[],rows:rows.map(r=>({...r})),otherTables:[{tbl:'student_marks',cnt:600},{tbl:'exam_registrations',cnt:150}]});
const stubExecute=state=>async(sql,params={},type='query')=>{
  state.calls.push({sql,params,type});
  if(/SELECT id, password FROM dbo\.profiles/.test(sql))return{data:state.rows.map(r=>({...r}))};
  if(/sys\.partitions/.test(sql))return{data:state.otherTables.map(r=>({...r}))};
  if(/SERVERPROPERTY\('InstanceDefaultBackupPath'\)/.test(sql))return{data:[{path:'C:\\Backup'}]};
  if(type==='execute'){
    if(/UPDATE dbo\.profiles/.test(sql)){
      const row=state.rows.find(r=>r.id===params.id&&r.password===params.previous);
      if(!row)return{affected:0};
      row.password=params.hash;
      return{affected:1};
    }
    if(/INSERT INTO dbo\.exam_processing_audit/.test(sql)){state.audit=params;return{affected:1};}
    return{affected:1};
  }
  return{data:[]};
};
const stored=(state,id)=>state.rows.find(r=>r.id===id).password;

test('a dry run reads profiles and writes nothing',async()=>{
  const state=stubState(legacyRows);
  const result=await migratePasswords(stubExecute(state),{dryRun:true,log:silent});
  assert.equal(state.calls.filter(c=>c.type==='execute').length,0);
  assert.deepEqual(result.converted,[]);
  assert.equal(result.convertible,2);
  assert.deepEqual(result.unconvertibleIds,['blank-3','broken-4']);
  assert.deepEqual(state.rows.map(r=>r.password),legacyRows.map(r=>r.password));
});

test('legacy credentials become hashes that the original secret still unlocks',async()=>{
  const state=stubState(legacyRows);
  const result=await migratePasswords(stubExecute(state),{log:silent});
  assert.deepEqual(result.converted,['coe-1','coord-2']);
  assert.equal(classifyStoredPassword(stored(state,'blank-3')),'unconvertible');
  assert.equal(stored(state,'broken-4'),'scrypt$notavalidhash');
  for(const[id,secret]of[['coe-1','Admin@123'],['coord-2','Coord!Secret2']]){
    assert.equal(classifyStoredPassword(stored(state,id)),'hashed');
    assert.ok(await verifyPassword(secret,stored(state,id)),`${id} must still sign in with the unchanged password`);
    assert.equal(await verifyPassword('wrong',stored(state,id)),false);
  }
  const backup=state.calls.findIndex(c=>/^BACKUP DATABASE/.test(c.sql));
  const firstUpdate=state.calls.findIndex(c=>/UPDATE dbo\.profiles/.test(c.sql));
  assert.ok(backup>-1&&backup<firstUpdate,'a verified backup must precede the first write');
  assert.ok(state.calls.some(c=>/^RESTORE VERIFYONLY/.test(c.sql)));
  assert.equal(state.audit.action,'PASSWORD_HASH_MIGRATED');
  assert.equal(JSON.parse(state.audit.detail).converted.length,2);
  assert.equal(JSON.stringify(state.audit).includes('Admin@123'),false,'no credential may reach the audit record');
});

test('an up-to-date database is not backed up or written',async()=>{
  const state=stubState([{id:'coe-1',password:await hashPassword('Admin@123')}]);
  const result=await migratePasswords(stubExecute(state),{log:silent});
  assert.deepEqual(result.converted,[]);
  assert.equal(result.backupPath,null);
  assert.equal(state.calls.some(c=>c.type==='execute'),false);
});

test('a concurrent credential change aborts instead of overwriting',async()=>{
  const state=stubState(legacyRows);
  const original=stubExecute(state);
  await assert.rejects(()=>migratePasswords(async(sql,params,type)=>{
    if(/UPDATE dbo\.profiles/.test(sql)&&params.previous==='Admin@123')return{affected:0};
    return original(sql,params,type);
  },{log:silent}),/changed while this migration was running/);
});

test('a change to any non-profile table fails closed',async()=>{
  const state=stubState(legacyRows);
  let seen=0;
  const execute=stubExecute(state);
  await assert.rejects(()=>migratePasswords(async(sql,params,type)=>{
    const result=await execute(sql,params,type);
    if(/sys\.partitions/.test(sql)){seen++;if(seen===1)state.otherTables=[{tbl:'student_marks',cnt:601},{tbl:'exam_registrations',cnt:150}];}
    return result;
  },{log:silent}),/tables changed during the password migration/);
});
