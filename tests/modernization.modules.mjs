import {chromium,request} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const existing=await fs.readFile('tests/localApp.smoke.mjs','utf8');
const api=await request.newContext({baseURL:'http://localhost:3000'});
const credentials={email:process.env.TEST_EMAIL||existing.match(/TEST_EMAIL\|\|'([^']+)'/)[1],password:process.env.TEST_PASSWORD||existing.match(/TEST_PASSWORD\|\|'([^']+)'/)[1]};
assert.equal((await api.post('/api/auth/login',{data:credentials})).status(),200);
assert.equal((await api.post('/api/auth/login',{data:credentials})).status(),200);
const profiles=await(await api.get('/api/profiles')).json();assert.ok(profiles.every(p=>!('password'in p)));
const coord=await request.newContext({baseURL:'http://localhost:3000'});
assert.equal((await coord.post('/api/auth/login',{data:{email:process.env.TEST_COORD_EMAIL||existing.match(/TEST_COORD_EMAIL\|\|'([^']+)'/)[1],password:process.env.TEST_COORD_PASSWORD||existing.match(/TEST_COORD_PASSWORD\|\|'([^']+)'/)[1]}})).status(),200);
const scoped=await(await coord.get('/api/examination')).json();const allowed=new Set(scoped.programs.map(p=>p.id));assert.ok(scoped.registrations.every(r=>allowed.has(r.program_id)));
assert.equal((await coord.post('/api/examination/sync')).status(),403);
assert.equal((await coord.post('/api/auth/change-password',{data:{email:credentials.email,newPassword:'never-applied-test-value'}})).status(),403);
const browser=await chromium.launch();const context=await browser.newContext({storageState:await api.storageState(),viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:3000');await page.getByRole('heading',{name:'Examination Command Center',exact:true}).waitFor();
const views=['Examination timetable','Tasks & Workflow','Programme & Member Mapping','Course Master','Eligibility & Results','TNG Students','Semester SGPA','Tabulation Register','User Management'];
for(const name of views){await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name,exact:true}).click();await page.getByText('Loading examination records…',{exact:true}).waitFor({state:'hidden'});await page.screenshot({path:`.test-artifacts/modernization/${name.replaceAll(/[^a-z]/gi,'_')}.png`});await page.setViewportSize({width:360,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Page overflow: ${name}`);}
assert.deepEqual(errors,[]);console.log(JSON.stringify({screens:views,authentication:'two successive logins passed',coordinatorScope:'passed',unauthorizedReset:'403',runtimeErrors:errors}));await browser.close();await api.dispose();await coord.dispose();
