import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='http://localhost:3000';
const api=await request.newContext({baseURL:base});
assert.equal((await api.get('/api/examination')).status(),401);
let login=await api.post('/api/auth/login',{data:{email:process.env.TEST_EMAIL||'coe@sspu.ac.in',password:process.env.TEST_PASSWORD||'Admin@123'}});assert.equal(login.status(),200);
const profiles=await(await api.get('/api/profiles')).json();assert.ok(profiles.every(p=>!('password'in p)));
const data=await(await api.get('/api/examination')).json();assert.equal(data.registrations.length,150);assert.equal(data.courses.length,15);assert.equal(new Set(data.registrations.map(r=>r.prn)).size,50);
const marks=await(await api.get('/api/student-marks?limit=5000')).json();assert.equal(marks.length,600);
const invalid={...marks[0],theory:999};assert.equal((await api.post('/api/student-marks/bulk',{data:{marks:[invalid]}})).status(),400);
const tng=marks.find(m=>m.student_name.includes('(TNG)')&&m.assessment_type==='ESE');assert.equal((await api.post('/api/student-marks/bulk',{data:{marks:[{...tng,theory:20,practical:20,skills:20}]}})).status(),400);
const coord=await request.newContext({baseURL:base});assert.equal((await coord.post('/api/auth/login',{data:{email:process.env.TEST_COORD_EMAIL||'sarah.jenkins@university.edu',password:process.env.TEST_COORD_PASSWORD||'Admin@123'}})).status(),200);
const scoped=await(await coord.get('/api/examination')).json();assert.ok(scoped.registrations.length>0&&scoped.registrations.length<150);assert.equal((await coord.post('/api/examination/sync')).status(),403);
const allowed=new Set(scoped.programs.map(p=>p.id));assert.ok(scoped.registrations.every(r=>allowed.has(r.program_id)));
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},storageState:await api.storageState()});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await fs.mkdir('.test-artifacts',{recursive:true});await page.goto(base);await page.getByText('TEST DATABASE',{exact:true}).waitFor();
for(const [button,title] of [['Students & Registrations','Students & subject registrations'],['Assessment & Grading','Assessment schemes & programme links'],['Eligibility & Results','Eligibility & course results'],['Semester SGPA','Semester grade point average']]){
 await page.getByRole('button',{name:button,exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor(); await page.getByText('Loading examination records…',{exact:true}).waitFor({state:'hidden'});
 if(button==='Assessment & Grading'){await page.getByLabel('Subject',{exact:true}).selectOption(data.courses[0].id);await page.getByText('Combined CA eligibility %',{exact:true}).waitFor();}
 await page.screenshot({path:`.test-artifacts/${button.replaceAll(/[^a-z]/gi,'_')}.png`,fullPage:true});
}
await page.setViewportSize({width:390,height:844}); await page.waitForFunction(()=>document.querySelector('aside').getBoundingClientRect().right<=1);await page.screenshot({path:'.test-artifacts/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);assert.deepEqual(errors,[]);
console.log(JSON.stringify({api:'passed',accessControl:'passed',screens:4,mobile:'passed',runtimeErrors:errors.length,registrations:data.registrations.length,marks:marks.length}));
await browser.close();await api.dispose();await coord.dispose();


