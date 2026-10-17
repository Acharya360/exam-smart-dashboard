import { RegistrationReview } from './RegistrationReview';
import { AssessmentSimulator } from './AssessmentSimulator';
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download, GraduationCap, Save, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { localRequest } from '../../services/localDb';
import { HEADS, calculateSGPA } from '../../services/resultEngine';
import type { AssessmentScheme, ExaminationData, ExaminationCourse, RegistrationResult } from '../../types';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50';
const empty: ExaminationData = { programs: [], courses: [], registrations: [], audit: [] };
function draftScheme(c: ExaminationCourse): AssessmentScheme {
  return c.scheme ?? { category: 'Non-Architecture', internalPass: 40, overallPass: 40, integerMarks: true, approved: false, approvalReference: '', credits: c.total_credits,
    heads: { theory: {active:true,ca:[0,0,0],ese:c.est_max_marks,pass:40}, practical:{active:c.cap_max_marks>0,ca:[0,0,0],ese:c.esp_max_marks,pass:40}, skills:{active:false,ca:[0,0,0],ese:0,pass:40} } };
}
export function ExaminationWorkspace({ view }: {view: 'students' | 'assessment' | 'results' | 'sgpa'}) {
  const { isSuperAdmin } = useAuth();
  const [data,setData]=useState<ExaminationData>(empty);
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [search,setSearch]=useState(''), [program,setProgram]=useState(''), [semester,setSemester]=useState(''), [year,setYear]=useState(''), [session,setSession]=useState(''), [status,setStatus]=useState('');
  const [page,setPage]=useState(0), [pageSize,setPageSize]=useState<number | 'all'>(50), [selected,setSelected]=useState(''), [scheme,setScheme]=useState<AssessmentScheme|null>(null), [mapping,setMapping]=useState('');
  const [detail,setDetail]=useState<RegistrationResult|null>(null);
  async function run(path='',method='GET',body?:unknown) {
    setBusy(true);setError('');setNotice('');
    try {setData(await localRequest<ExaminationData>(`/examination${path}`,method,body));if(method!=='GET')setNotice(path==='/sync'?'Student registrations synchronized. Existing marks preserved.':'Changes saved to the local database.');}
    catch(e){setError(e instanceof Error?e.message:'Unable to load records.');} finally{setBusy(false);}
  }
  useEffect(()=>{void run();},[]);
  useEffect(()=>{setPage(0);setDetail(null);},[search,program,semester,year,session,status,view,pageSize]);
  const filtered=useMemo(()=>data.registrations.filter(r=>(!program||r.program_id===program)&&(!semester||r.semester===semester)&&(!year||r.academic_year===year)&&(!session||r.exam_year===session)&&(!status||r.status===status)&&(!search||`${r.prn} ${r.student_name} ${r.paper_code}`.toLowerCase().includes(search.toLowerCase()))),[data,program,semester,year,session,status,search]);
  const semesterRows=useMemo(()=>{
    const groups=new Map<string,RegistrationResult[]>();
    // Status filters must never remove failed/pending courses from the SGPA denominator.
    for(const r of data.registrations) {
      if((program&&r.program_id!==program)||(semester&&r.semester!==semester)||(year&&r.academic_year!==year)||(session&&r.exam_year!==session)||(search&&!`${r.prn} ${r.student_name}`.toLowerCase().includes(search.toLowerCase())))continue;
      const key=JSON.stringify([r.prn,r.cm_course_name,r.semester,r.academic_year,r.exam_year]);
      groups.set(key,[...(groups.get(key)||[]),r]);
    }
    return [...groups.values()].map(rows=>({...rows[0],courses:rows.length,credits:rows.reduce((s,r)=>s+r.credits,0),earned:rows.reduce((s,r)=>s+r.earnedCredits,0),points:rows.reduce((s,r)=>s+r.creditPoints,0),sgpa:calculateSGPA(rows)}));
  },[data,program,semester,year,session,search]);
  function choose(id:string){setSelected(id);const c=data.courses.find(c=>c.id===id);setScheme(c?structuredClone(draftScheme(c)):null);setMapping(c?.program_id||'');}
  function exportRows(){const rows=view==='sgpa'?semesterRows.map(r=>({PRN:r.prn,Student:r.student_name,Programme:r.cm_course_name,Semester:r.semester,Academic_Year:r.academic_year,Session:r.exam_year,Credits:r.credits,Credit_Points:r.points,SGPA:r.sgpa===null?'WITHHELD':Number(r.sgpa.toFixed(2))})):filtered.map(r=>({PRN:r.prn,Student:r.student_name,Programme:r.cm_course_name,Semester:r.semester,Academic_Year:r.academic_year,Session:r.exam_year,PaperCode:r.paper_code,Internal:r.internalStatus,Total:r.total,Maximum:r.maximum,Percentage:r.percentage,Status:r.status,Grade:r.grade,Grade_Point:r.gradePoint,Credits:r.credits,Credit_Points:r.creditPoints,Issues:r.reasons.join(' ')}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Preview');XLSX.writeFile(wb,`Examination_${view}_preview.xlsx`);}
  const titles={students:'Students & subject registrations',assessment:'Assessment schemes & programme links',results:'Eligibility & course results',sgpa:'Semester grade point average'};
  const list=view==='sgpa'?semesterRows:filtered;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Examination registry</p><h1 className="mt-1 text-2xl font-bold">{titles[view]}</h1><p className="mt-1 text-sm text-slate-500">Local database records · Exact programme, semester and subject relationships</p></div><button className={button} onClick={()=>void run()} disabled={busy}><RefreshCw size={16}/>Refresh</button></div>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
    {notice&&<div role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</div>}
    {busy&&<p role="status" className="text-sm text-indigo-700">Loading examination records…</p>}
    {view!=='assessment'&&<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[['Students',new Set(data.registrations.map(r=>r.prn)).size],['Registrations',data.registrations.length],['Unlinked records',data.registrations.filter(r=>!r.course_id||!r.program_id).length],['Needs review',data.registrations.filter(r=>r.status==='WITHHELD').length]].map(([label,n])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{n}</p></div>)}</div>}
    {view==='assessment'?<div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
      <label className="block text-sm font-semibold">Subject<select aria-label="Subject" className={`${input} mt-2`} value={selected} onChange={e=>choose(e.target.value)}><option value="">Select a database subject</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.paper_code} · {c.sm_subject_name} · {c.semester}</option>)}</select></label>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">CA maxima must be entered from the approved assessment scheme. Legacy aggregate maxima do not define a CA1/CA2/CA3 split. Architecture grade E uses 45–49.999… provisionally; approval must explicitly confirm it.</p>
      {scheme&&<AssessmentSimulator key={selected} scheme={scheme}/>}
      {scheme&&<form className="space-y-5" onSubmit={e=>{e.preventDefault();void run(`/courses/${encodeURIComponent(selected)}`,'PUT',{program_id:mapping,scheme});}}><fieldset disabled={!isSuperAdmin||busy} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">Programme<select required className={input} value={mapping} onChange={e=>setMapping(e.target.value)}><option value="">Choose programme</option>{data.programs.map(p=><option key={p.id} value={p.id}>{p.program_name}</option>)}</select></label>
          <label className="text-sm">Grading category<select className={input} value={scheme.category} onChange={e=>setScheme({...scheme,category:e.target.value as AssessmentScheme['category'],overallPass:e.target.value==='Architecture'?45:40,approved:false})}><option>Non-Architecture</option><option>Architecture</option></select></label>
          <label className="text-sm">Credits<input className={input} type="number" min="0" step="0.5" value={scheme.credits} onChange={e=>setScheme({...scheme,credits:Number(e.target.value),approved:false})}/></label>
          <label className="text-sm">Combined CA eligibility %<input className={input} type="number" min="1" max="100" value={scheme.internalPass} onChange={e=>setScheme({...scheme,internalPass:Number(e.target.value),approved:false})}/></label>
          <label className="text-sm">Final course passing %<select className={input} value={scheme.overallPass} onChange={e=>setScheme({...scheme,overallPass:Number(e.target.value),approved:false})}>{scheme.category==='Non-Architecture'&&<option value={40}>40%</option>}<option value={45}>45%</option></select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scheme.integerMarks} onChange={e=>setScheme({...scheme,integerMarks:e.target.checked,approved:false})}/>Whole marks; round minimum upward</label>
        </div>
        {HEADS.map(h=><div key={h} className="rounded-xl border border-slate-200 p-4"><label className="flex items-center gap-2 font-semibold capitalize"><input type="checkbox" checked={scheme.heads[h].active} onChange={e=>setScheme({...scheme,approved:false,heads:{...scheme.heads,[h]:{...scheme.heads[h],active:e.target.checked}}})}/>{h}</label>{scheme.heads[h].active&&<div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">{[0,1,2].map(i=><label key={i} className="text-xs">{`CA${{theory:'T',practical:'P',skills:'S'}[h]}${i+1}`} maximum<input required type="number" min="0" step={scheme.integerMarks?'1':'0.01'} className={input} value={scheme.heads[h].ca[i]} onChange={e=>{const ca=[...scheme.heads[h].ca] as [number,number,number];ca[i]=Number(e.target.value);setScheme({...scheme,approved:false,heads:{...scheme.heads,[h]:{...scheme.heads[h],ca}}});}}/></label>)}{(['ese','pass'] as const).map(k=><label key={k} className="text-xs">{k==='ese'?'ESE maximum':'ESE passing %'}<input required type="number" min={k==='pass'?0.01:0} max={k==='pass'?100:undefined} step="0.01" className={input} value={scheme.heads[h][k]} onChange={e=>setScheme({...scheme,approved:false,heads:{...scheme.heads,[h]:{...scheme.heads[h],[k]:Number(e.target.value)}}})}/></label>)}</div>}</div>)}
        <label className="block text-sm">Examination approval reference<input className={input} value={scheme.approvalReference} onChange={e=>setScheme({...scheme,approvalReference:e.target.value,approved:false})} placeholder="Circular / approval number"/></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={scheme.approved} onChange={e=>setScheme({...scheme,approved:e.target.checked})}/>I confirm this scheme and grading boundaries are approved. TNG/incomplete results withhold SGPA; failed/absent courses count with zero points; zero-credit courses do not affect SGPA.</label>
        {isSuperAdmin&&<button className={button} type="submit"><Save size={16}/>Save scheme & mapping</button>}
      </fieldset></form>}
    </div>:view==='students'?<><div className="flex gap-3">{isSuperAdmin&&<button disabled={busy} className={button} onClick={()=>{if(window.confirm('Synchronize registrations from imported marks using exact programme, semester and paper matches? Existing marks are preserved.'))void run('/sync','POST');}}>Synchronize registrations</button>}</div><RegistrationReview data={data}/></>:<>
      <div className="flex flex-wrap gap-3">{isSuperAdmin&&<button disabled={busy} className={button} onClick={()=>void run('/process','POST')}><RefreshCw size={16}/>Recalculate preview</button>}<button disabled={busy||!list.length} className={button} onClick={exportRows}><Download size={16}/>Export preview</button></div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <input aria-label="Search student or subject" className={input} placeholder="Search PRN, name, subject…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select aria-label="Programme filter" className={input} value={program} onChange={e=>setProgram(e.target.value)}><option value="">All programmes</option>{data.programs.map(p=><option key={p.id} value={p.id}>{p.program_name}</option>)}</select>
        {([{label:'Semester',field:'semester',value:semester,set:setSemester},{label:'Academic year',field:'academic_year',value:year,set:setYear},{label:'Exam session',field:'exam_year',value:session,set:setSession}] as const).map(f=><select key={f.field} aria-label={f.label} className={input} value={f.value} onChange={e=>f.set(e.target.value)}><option value="">All {f.label.toLowerCase()}s</option>{[...new Set(data.registrations.map(r=>r[f.field]))].sort().map(v=><option key={v}>{v}</option>)}</select>)}
        {view!=='sgpa'&&<select aria-label="Result status" className={input} value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['PASS','FAIL','TNG','ABSENT','PENDING','WITHHELD'].map(s=><option key={s}>{s}</option>)}</select>}
      </div>
      <p className="text-sm text-slate-500">{view==='sgpa'?'SGPA uses every registered course in the selected programme, semester, year and session.':'Select a row to inspect eligibility and data-quality issues.'} Results are previews, not publication records.</p>
      <div className="overflow-auto max-h-[600px] rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-600 shadow-2xs">
            <tr>
              {(view==='sgpa'?['Student / PRN','Programme / semester','Session','Courses','Credits / earned','Credit points','SGPA']:['Student / PRN','Programme / semester','Subject / session','Internal','Total','Result','Grade / points']).map(t=><th className="px-4 py-3 bg-slate-100 whitespace-nowrap" key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {view==='sgpa'
              ? (pageSize==='all'?semesterRows:semesterRows.slice(page*(pageSize as number),page*(pageSize as number)+(pageSize as number))).map(r=><tr key={r.id} className="hover:bg-slate-50 transition-colors"><td className="p-4">{r.student_name}<p className="text-xs text-slate-500 font-mono">{r.prn}</p></td><td className="p-4">{r.cm_course_name}<p className="text-xs text-slate-500">{r.semester}</p></td><td className="p-4">{r.academic_year} · {r.exam_year}</td><td className="p-4">{r.courses}</td><td className="p-4">{r.credits} / {r.earned}</td><td className="p-4">{r.points}</td><td className="p-4 font-semibold">{r.sgpa===null?'WITHHELD':r.sgpa.toFixed(2)}</td></tr>)
              : (pageSize==='all'?filtered:filtered.slice(page*(pageSize as number),page*(pageSize as number)+(pageSize as number))).map(r=><tr key={r.id} className="hover:bg-indigo-50/60 transition-colors"><td className="p-4"><button className="text-left font-semibold text-indigo-700 hover:text-indigo-900 underline" onClick={()=>setDetail(r)}>{r.student_name||r.prn}</button><p className="text-xs text-slate-500 font-mono">{r.prn}</p></td><td className="p-4">{r.cm_course_name}<p className="text-xs text-slate-500">Semester {r.semester} · {r.program_id?'Linked':'Unlinked'}</p></td><td className="p-4">{r.paper_code}<p className="text-xs text-slate-500">{r.academic_year} · {r.exam_year}</p></td><td className="p-4">{r.internalStatus}</td><td className="p-4">{r.maximum?`${r.total} / ${r.maximum}`:'—'}</td><td className="p-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${r.status==='PASS'?'bg-emerald-50 text-emerald-700':r.status==='FAIL'||r.status==='TNG'?'bg-rose-50 text-rose-700':'bg-amber-50 text-amber-800'}`}>{r.status}</span></td><td className="p-4">{r.grade} / {r.gradePoint}</td></tr>)
            }
          </tbody>
        </table>
        {!list.length&&!busy&&<div className="p-12 text-center text-slate-500"><GraduationCap className="mx-auto mb-3"/><p>No matching registrations.</p><p className="text-xs mt-2">Import marks, then synchronize registrations, or clear your filters.</p></div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-700">
            {list.length} records · {pageSize === 'all' ? 'Showing all' : `Page ${page + 1} of ${Math.max(1, Math.ceil(list.length / (pageSize as number)))}`}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Rows per page:</span>
            <select
              aria-label="Rows per page"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={pageSize}
              onChange={e => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setPage(0);
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All ({list.length})</option>
            </select>
          </div>
        </div>
        {pageSize !== 'all' && Math.ceil(list.length / (pageSize as number)) > 1 && (
          <div className="flex gap-2">
            <button className={button} disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button className={button} disabled={(page + 1) * (pageSize as number) >= list.length} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        )}
      </div>
      {detail&&<div className="rounded-xl border border-indigo-200 bg-white p-5 space-y-2"><div className="flex justify-between"><h2 className="font-bold">{detail.prn} · {detail.paper_code}</h2><button onClick={()=>setDetail(null)} className="text-indigo-700">Close details</button></div><p>Internal: {detail.internalTotal} / {detail.internalMaximum} · Required: {detail.internalRequired} · Source records: {detail.records}</p><p>Raw percentage: {detail.maximum?detail.percentage.toFixed(4)+'%':'Unavailable'} · Credit points: {detail.creditPoints}</p>{detail.reasons.map((r,i)=><p key={i} className="flex items-start gap-2 text-sm text-amber-900"><AlertTriangle size={16}/>{r}</p>)}</div>}
    </>}
    {isSuperAdmin&&<details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Processing history ({data.audit.length} recent events)</summary><ul className="mt-3 space-y-2 text-xs text-slate-600">{data.audit.map(a=><li key={a.id}>{a.created_at} · {a.action} · {a.actor}</li>)}</ul></details>}
  </section>;
}

