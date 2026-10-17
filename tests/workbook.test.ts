import {test} from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import {readFileSync} from 'node:fs';
import {parseStudentMarksExcel} from '../src/services/excelParser';
import {calculateResult,calculateSGPA} from '../src/services/resultEngine';
import type {AssessmentScheme,AssessmentHead} from '../src/types';
const file='docs/Sample Templete.xlsx';
const w=XLSX.readFile(file,{cellFormula:true});
const raw=readFileSync(file);const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength) as ArrayBuffer;
const parsed=parseStudentMarksExcel(buffer);
const results=XLSX.utils.sheet_to_json<Record<string,string|number>>(w.Sheets.Results);
const configs=XLSX.utils.sheet_to_json<Record<string,string|number>>(w.Sheets.Course_Config);
test('workbook importer selects Student_Marks rather than Config',()=>{assert.equal(parsed.success,true);assert.equal(parsed.data.length,48);assert.equal(parsed.errors.length,0);assert.ok(parsed.data.some(m=>m.theory===null));});
test('all formula cells have no cached Excel errors',()=>{for(const [name,s]of Object.entries(w.Sheets))for(const [address,cell]of Object.entries(s))if(!address.startsWith('!'))assert.notEqual(cell.t,'e',`${name}!${address}`);});
test('12 workbook outcomes equal application calculation engine',()=>{
 const outcomes=[];
 for(const r of results){
  const c=configs.find(c=>c.PaperCode===r.PaperCode&&c.Programme_Name===r.Programme&&c.Semester===r.Semester)!;
  const heads=Object.fromEntries((['Theory','Practical','Skills'] as const).map((h,i)=>[h.toLowerCase(),{active:c[`${h}_Applicable`]===1,ca:[1,2,3].map(n=>Number(c[`CA${n}_Max_${h}`])),ese:Number(c[`ESE_Max_${h}`]),pass:Number(c[['EST_Pass_Pct','ESP_Pass_Pct','ESS_Pass_Pct'][i]])}])) as AssessmentScheme['heads'];
  const s:AssessmentScheme={category:c.Programme_Category as AssessmentScheme['category'],internalPass:Number(c.CA_Eligibility_Pct),overallPass:Number(c.Overall_Pass_Pct),integerMarks:c.Integer_Marks===1,approved:c.Approved===1,approvalReference:String(c.Approval_Reference),credits:Number(c.Course_Credits),heads};
  const marks=parsed.data.filter(m=>m.prn===r.PRN&&m.paper_code===r.PaperCode&&m.cm_course_name===r.Programme&&m.semester===r.Semester&&m.academic_year===r.Academic_Year&&m.exam_year===r.Exam_Session);
  const o=calculateResult(marks,s);assert.equal(r.Final_Status,o.status);assert.equal(r.Total_Obtained,o.total);assert.equal(r.Total_Max,o.maximum);assert.equal(r.Letter_Grade,o.status==='TNG'||o.status==='PENDING'?o.status:o.grade);assert.equal(r.Grade_Point,o.gradePoint);assert.equal(r.Credit_Points,o.creditPoints);outcomes.push({...o,credits:s.credits,prn:r.PRN});
 }
 const sgpa=XLSX.utils.sheet_to_json<Record<string,string|number>>(w.Sheets.SGPA);for(const r of sgpa)assert.equal(r.SGPA,calculateSGPA(outcomes.filter(o=>o.prn===r.PRN))??'WITHHELD');
});
