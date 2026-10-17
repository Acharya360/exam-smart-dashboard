import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateResult, calculateSGPA } from '../src/services/resultEngine.ts';
import type { AssessmentScheme, AssessmentRecord } from '../src/types/index.ts';
function scheme(category:AssessmentScheme['category']='Non-Architecture',cutoff=40):AssessmentScheme{return {category,internalPass:40,overallPass:cutoff,integerMarks:false,approved:true,approvalReference:'TEST',credits:4,heads:{theory:{active:true,ca:[10,10,10],ese:30,pass:cutoff},practical:{active:true,ca:[10,10,10],ese:30,pass:cutoff},skills:{active:true,ca:[10,10,10],ese:30,pass:cutoff}}};}
function records(ca=8,ese=24):AssessmentRecord[]{return ['CA1','CA2','CA3','ESE'].map(assessment_type=>({assessment_type,theory:assessment_type==='ESE'?ese:ca,practical:assessment_type==='ESE'?ese:ca,skills:assessment_type==='ESE'?ese:ca}));}
test('nine components exactly 40% is TG',()=>assert.equal(calculateResult(records(4),scheme()).internalStatus,'TG'));
test('nine components below 40% is TNG',()=>assert.equal(calculateResult(records(3.99),scheme()).status,'TNG'));
test('six components and non-applicable theory',()=>{const s=scheme();s.heads.theory.active=false;const r=records(4);r.forEach(x=>x.theory=null);const o=calculateResult(r,s);assert.equal(o.internalMaximum,60);assert.equal(o.internalRequired,24);assert.equal(o.status,'PASS');});
test('mandatory ESE failure overrides aggregate',()=>{const r=records();r[3].practical=11;const o=calculateResult(r,scheme());assert.equal(o.status,'FAIL');assert.equal(o.gradePoint,0);});
test('aggregate failure despite ESE passes',()=>{const s=scheme();s.overallPass=45;assert.equal(calculateResult(records(4,12),s).status,'FAIL');});
test('all requirements passed',()=>assert.equal(calculateResult(records(),scheme()).status,'PASS'));
for(const category of ['Architecture','Non-Architecture'] as const)for(const cutoff of category==='Architecture'?[45]:[40,45])for(const pct of [39,40,44,45])test(`${category} cutoff ${cutoff}, ${pct}%`,()=>{const o=calculateResult(records(pct/10,pct*0.3),scheme(category,cutoff));assert.equal(o.status,pct<40?'TNG':pct<cutoff?'FAIL':'PASS');});
for(const [category,bands] of [['Architecture',[[45,'E'],[50,'D'],[60,'C'],[70,'B'],[80,'A'],[90,'O']]],['Non-Architecture',[[40,'P'],[41,'C'],[51,'B'],[61,'B+'],[71,'A'],[81,'A+'],[91,'O']]]] as const)for(const [pct,grade] of bands)test(`${category} grade boundary ${pct}`,()=>assert.equal(calculateResult(records(pct/10,pct*0.3),scheme(category,category==='Architecture'?45:40)).grade,grade));
test('absence differs from zero and blank',()=>{const r=records();r[3].theory='AB';assert.equal(calculateResult(r,scheme()).status,'ABSENT');r[3].theory=0;assert.equal(calculateResult(r,scheme()).status,'FAIL');r[3].theory=null;assert.equal(calculateResult(r,scheme()).status,'PENDING');});
test('marks exceeding maximum withheld',()=>{const r=records();r[0].theory=11;assert.equal(calculateResult(r,scheme()).status,'WITHHELD');});
test('duplicates withheld',()=>{const r=records();r.push(r[0]);assert.equal(calculateResult(r,scheme()).status,'WITHHELD');});
test('approval required',()=>{const s=scheme();s.approved=false;assert.equal(calculateResult(records(),s).status,'WITHHELD');});
test('weighted SGPA 71/9',()=>{const pass=calculateResult(records(),scheme());const rows=[{...pass,credits:4,creditPoints:32},{...pass,credits:3,creditPoints:21},{...pass,credits:2,creditPoints:18}];assert.equal(calculateSGPA(rows)?.toFixed(2),'7.89');});
test('failed credits remain in denominator; earn zero',()=>{const fail=calculateResult(records(4,0),scheme());assert.equal(fail.earnedCredits,0);assert.equal(calculateSGPA([{...fail,credits:4},{...calculateResult(records(),scheme()),credits:4}]),4);});
test('zero-credit semester unavailable',()=>assert.equal(calculateSGPA([{...calculateResult(records(),scheme()),credits:0}]),null));
for(const status of ['TNG','PENDING','WITHHELD'] as const)test(`${status} withholds SGPA`,()=>assert.equal(calculateSGPA([{...calculateResult(records(),scheme()),credits:4,status}]),null));
test('display rounding cannot change pass',()=>{const s=scheme();s.overallPass=45;s.heads.theory.pass=40;s.heads.practical.pass=40;s.heads.skills.pass=40;assert.equal(calculateResult(records(4.4999,13.4997),s).status,'FAIL');});
test('integer minimum rounded upward',()=>{const s=scheme();s.integerMarks=true;s.internalPass=41;assert.equal(calculateResult(records(),s).internalRequired,37);});
