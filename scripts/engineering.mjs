import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
export const reads={
 parts:'select id,number,name,owner from parts order by number',
 revisions:'select * from revision_register order by number,code',
 'change-board':'select * from change_board order by due,name',
 'release-review':"select c.name,p.number,r.code,c.reviewer from changes c join revisions r on r.id=c.revision_id join parts p on p.id=r.part_id where c.status='approved' order by c.due",
 'overdue-changes':"select * from change_board where status<>'released' and due<current_date order by due",
 'obsolete-parts':"select * from component_usage where component_status='obsolete' order by assembly",
 'unreleased-components':"select * from component_usage where component_status<>'released' order by assembly",
 'missing-evidence':'select * from release_gaps order by number,gap',
 'owner-load':"select author,count(*) as open_changes,count(*) filter(where due<current_date) as overdue from changes where status<>'released' group by author order by overdue desc,author",
 'shared-components':"select component,component_revision,count(distinct assembly) as assemblies from component_usage group by component,component_revision having count(distinct assembly)>1 order by assemblies desc",
 stale:"select number,code,status,updated_at from revision_register where status='draft' and updated_at<now()-interval '30 days' order by updated_at",
 attention:'select * from attention order by owner,item',
 compliance:"select g.*, 'NZ HSWA upstream duties: record prompt, not certification' as rule,'https://www.worksafe.govt.nz/managing-health-and-safety/getting-started/understanding-the-law/upstream-duties/' as source from release_gaps g order by number,gap",
 history:'select actor,action,record_id,detail,created_at from activity order by created_at desc,id limit 100'
};
const specs={
 help:[], ...Object.fromEntries(Object.keys(reads).map(x=>[x,[]])),
 bom:['revision'], 'where-used':['revision'], handover:['revision'], search:['text'],
 'add-part':['number','name','owner'], 'add-revision':['part','code'],
 'add-line':['revision','component','quantity','unit'], 'remove-line':['revision','component'],
 evidence:['revision','purpose','test','instructions'],
 'raise-change':['revision','name','reason','due'], approve:['change'], release:['change','note'], obsolete:['revision','note'],
 log:['revision','note'], import:['file','assembly','code','mapping','dry-run'], export:['out'],
 'weekly-review':[], 'draft-handover':['revision']
};
export const commands=Object.keys(specs);
const writes=new Set(['add-part','add-revision','add-line','remove-line','evidence','raise-change','approve','release','obsolete','log','import']);
function parse(args){
 const [command='help',...rest]=args; if(!specs[command])throw Error(`Unknown command: ${command}`);
 const opts={};let vendor;
 for(const a of rest){if(!a.startsWith('--')){if(command==='import'&&!vendor){vendor=a;continue;}throw Error(`Unexpected argument: ${a}`);}
 const k=a.slice(2).split('=')[0];if(![...specs[command],'json',...(writes.has(command)?['actor']:[])].includes(k))throw Error(`Unknown option: ${k}`);
 if(k in opts)throw Error(`Duplicate option: ${k}`);opts[k]=a.includes('=')?a.slice(a.indexOf('=')+1):true;
 if(!['json','dry-run'].includes(k)&&typeof opts[k]!=='string')throw Error(`Use --${k}=value`);
 }
 return {command,opts,vendor};
}
function need(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}=value`);return o[k].trim();}
function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('Use a real YYYY-MM-DD date');return s;}
function positive(s){if(!/^\d+(\.\d{1,4})?$/.test(String(s))||!Number.isFinite(Number(s))||Number(s)<=0||Number(s)>=1e10)throw Error('Quantity must be positive, with at most four decimal places');return String(s);}
export async function resolve(db,kind,q){
 const sources={part:"select id,number as label,name from parts",revision:"select id,number||' / '||code as label,name from revision_register",change:'select id,name as label,name from changes'};
 const rows=await db.query(sources[kind]);const key=q.toLowerCase();
 let matches=rows.filter(x=>x.id===q||x.label.toLowerCase()===key);
 if(!matches.length)matches=rows.filter(x=>x.id.startsWith(key)||x.label.toLowerCase().includes(key)||x.name.toLowerCase().includes(key));
 if(matches.length!==1)throw Error(`${matches.length?'Ambiguous':'No matching'} ${kind}: ${q}\n${matches.map(x=>`${x.id}  ${x.label}`).join('\n')}`);
 return matches[0];
}
async function editable(db,id){const [r]=await db.query('select * from revisions where id=$1',[id]);if(r.status!=='draft')throw Error('Only draft revisions can change');const c=await db.query("select id from changes where revision_id=$1 and status<>'open'",[id]);if(c.length)throw Error('Approved revision is frozen');return r;}
async function ready(db,id){const gaps=await db.query('select gap from release_gaps where id=$1',[id]);if(gaps.length)throw Error('Release blocked: '+gaps.map(x=>x.gap).join('; '));}
async function event(db,actor,action,id,detail){await db.query('insert into activity(actor,action,record_id,detail) values($1,$2,$3,$4::jsonb)',[actor,action,id,JSON.stringify(detail)]);}
const byRev=async(db,q)=> (await resolve(db,'revision',q)).id;
async function bom(db,id){return db.query(`with recursive tree as (
 select b.child_id,b.quantity::numeric as required,b.unit,1 as depth,array[b.parent_id,b.child_id] as trail from bom_lines b where b.parent_id=$1
 union all select b.child_id,(t.required*b.quantity)::numeric,b.unit,t.depth+1,t.trail||b.child_id from tree t join bom_lines b on b.parent_id=t.child_id where not b.child_id=any(t.trail)
 ) select p.number,r.code,r.status,t.required as quantity,t.unit,t.depth from tree t join revisions r on r.id=t.child_id join parts p on p.id=r.part_id order by depth,number`,[id]);}
async function used(db,id){return db.query(`with recursive parents(id) as (select parent_id from bom_lines where child_id=$1 union select b.parent_id from bom_lines b join parents p on p.id=b.child_id) select r.number,r.code,r.status,r.owner from parents p join revision_register r on r.id=p.id order by number,code`,[id]);}
async function handover(db,id){return {revision:(await db.query('select * from revision_register where id=$1',[id]))[0],components:await bom(db,id),changes:await db.query('select name,reason,status,author,reviewer,approved_at,release_note from changes where revision_id=$1',[id]),gaps:await db.query('select gap from release_gaps where id=$1',[id])};}
function draft(name,data){const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const out=path.join(dir,`${name}-${Date.now()}-${crypto.randomUUID()}.md`);fs.writeFileSync(out,`# Private draft: ${name}\n\nGenerated from current records. Review before sharing.\n\n\`\`\`json\n${JSON.stringify(data,null,2)}\n\`\`\`\n`,{flag:'wx'});return {file:out};}
async function importBom(db,o,vendor,actor){
 if(vendor!=='openbom')throw Error('Import requires vendor openbom');
 const rows=parseCsv(fs.readFileSync(path.resolve(need(o,'file')),'utf8'));if(!rows.length)throw Error('Empty CSV');
 let mapping={};if(o.mapping)mapping=JSON.parse(fs.readFileSync(o.mapping,'utf8'));
 if(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||Object.entries(mapping).some(([k,v])=>!['number','name','code','quantity','unit'].includes(k)||typeof v!=='string'))throw Error('Invalid column mapping');
 const get=(r,k,...aliases)=>mapping[k]?pick(r,mapping[k]):pick(r,...aliases);
 const normalized=rows.map((r,i)=>{const number=get(r,'number','Part Number').trim(),name=get(r,'name','Description','Name').trim(),code=get(r,'code','Revision').trim()||'imported',quantity=positive(get(r,'quantity','Quantity').trim()),unit=get(r,'unit','Unit','Unit of Measure').trim()||'each';if(!number||!name)throw Error(`CSV row ${i+2}: Part Number and Description required`);return {number,name,code,quantity,unit};});
 const keys=normalized.map(r=>r.number.toLowerCase());if(new Set(keys).size!==keys.length)throw Error('Duplicate part numbers: export one single-level BOM');
 const assembly=need(o,'assembly'),code=need(o,'code');if(keys.includes(assembly.toLowerCase()))throw Error('Assembly cannot contain itself');
 let [parentPart]=await db.query('select * from parts where lower(number)=lower($1)',[assembly]);
 if(!parentPart)[parentPart]=await db.query('insert into parts(number,name,owner) values($1,$1,$2) returning *',[assembly,actor]);
 let [parent]=await db.query('select * from revisions where part_id=$1 and code=$2',[parentPart.id,code]);
 if(!parent)[parent]=await db.query('insert into revisions(part_id,code) values($1,$2) returning *',[parentPart.id,code]);
 await editable(db,parent.id);let inserted=0,skipped=0;
 for(const row of normalized){let [part]=await db.query('select * from parts where lower(number)=lower($1)',[row.number]);if(part&&part.name!==row.name)throw Error(`Conflicting description for ${row.number}`);if(!part)[part]=await db.query('insert into parts(number,name,owner) values($1,$2,$3) returning *',[row.number,row.name,actor]);
 let [rev]=await db.query('select * from revisions where part_id=$1 and code=$2',[part.id,row.code]);if(!rev)[rev]=await db.query('insert into revisions(part_id,code) values($1,$2) returning *',[part.id,row.code]);
 const [line]=await db.query('select * from bom_lines where parent_id=$1 and child_id=$2',[parent.id,rev.id]);
 if(line){if(Number(line.quantity)!==Number(row.quantity)||line.unit!==row.unit)throw Error(`Conflicting line for ${row.number}; reconcile explicitly`);skipped++;}
 else{await db.query('insert into bom_lines(parent_id,child_id,quantity,unit) values($1,$2,$3,$4)',[parent.id,rev.id,row.quantity,row.unit]);inserted++;}
 }
 const result={assembly,code,inserted,skipped,dry_run:!!o['dry-run']};await event(db,actor,'import',parent.id,result);return result;
}
async function execute(db,command,o,vendor,actor){
 if(reads[command])return db.query(reads[command]);
 if(command==='help')return Object.entries(specs).map(([command,options])=>({command,options:options.map(x=>'--'+x).join(' '),actor:writes.has(command)}));
 if(command==='search')return db.query('select * from revision_register where position(lower($1) in lower(number||name||code))>0 order by number,code',[need(o,'text')]);
 if(command==='bom')return bom(db,await byRev(db,need(o,'revision')));
 if(command==='where-used')return used(db,await byRev(db,need(o,'revision')));
 if(command==='handover')return handover(db,await byRev(db,need(o,'revision')));
 if(command==='weekly-review'){const data={};for(const x of ['change-board','attention','release-review','compliance'])data[x]=await db.query(reads[x]);return draft('weekly-review',data);}
 if(command==='draft-handover')return draft('engineering-handover',await handover(db,await byRev(db,need(o,'revision'))));
 if(command==='export'){const out=path.resolve(need(o,'out'));const data={format:'engineering-register-v1',created:new Date().toISOString()};for(const t of ['parts','revisions','bom_lines','changes','activity'])data[t]=await db.query(`select * from ${t} order by id`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return {file:out};}
 if(command==='import')return importBom(db,o,vendor,actor);
 let result;
 if(command==='add-part') [result]=await db.query('insert into parts(number,name,owner) values($1,$2,$3) returning *',[need(o,'number'),need(o,'name'),need(o,'owner')]);
 if(command==='add-revision') [result]=await db.query('insert into revisions(part_id,code) values($1,$2) returning *',[(await resolve(db,'part',need(o,'part'))).id,need(o,'code')]);
 if(['add-line','remove-line','evidence'].includes(command)){
 const id=await byRev(db,need(o,'revision'));await editable(db,id);
 if(command==='evidence')[result]=await db.query('update revisions set purpose=$2,test_evidence=$3,use_instructions=$4 where id=$1 returning *',[id,need(o,'purpose'),need(o,'test'),need(o,'instructions')]);
 else {const child=await byRev(db,need(o,'component'));
 if(command==='add-line'){[result]=await db.query('insert into bom_lines(parent_id,child_id,quantity,unit) values($1,$2,$3,$4) returning *',[id,child,positive(need(o,'quantity')),o.unit||'each']);}
 else {[result]=await db.query('delete from bom_lines where parent_id=$1 and child_id=$2 returning *',[id,child]);if(!result)throw Error('No matching component line');}
 await db.query('update revisions set updated_at=now() where id=$1',[id]);
 }
 }
 if(command==='raise-change') {const id=await byRev(db,need(o,'revision'));await editable(db,id);[result]=await db.query('insert into changes(name,revision_id,reason,author,due) values($1,$2,$3,$4,$5) returning *',[need(o,'name'),id,need(o,'reason'),actor,date(need(o,'due'))]);}
 if(['approve','release'].includes(command)){
 const id=(await resolve(db,'change',need(o,'change'))).id;const [c]=await db.query('select * from changes where id=$1 for update',[id]);
 const [rev]=await db.query('select * from revisions where id=$1 for update',[c.revision_id]);if(rev.status!=='draft')throw Error('Revision is no longer draft');
 await ready(db,c.revision_id);
 if(command==='approve') {if(c.status!=='open')throw Error('Change is already approved');if(actor.toLowerCase()===c.author.trim().toLowerCase())throw Error('Independent reviewer required');[result]=await db.query("update changes set status='approved',reviewer=$2,approved_at=now() where id=$1 returning *",[id,actor]);}
 else {if(c.status!=='approved')throw Error('Independent approval required before release');[result]=await db.query("update changes set status='released',release_note=$2 where id=$1 returning *",[id,need(o,'note')]);await db.query("update revisions set status='released',released_at=now() where id=$1",[c.revision_id]);}
 }
 if(command==='obsolete'){const id=await byRev(db,need(o,'revision'));const note=need(o,'note');const parents=await used(db,id);if(parents.some(r=>r.status==='released'))throw Error('Released assemblies still use this revision; replace their dependencies first');[result]=await db.query("update revisions set status='obsolete' where id=$1 and status='released' returning *",[id]);if(!result)throw Error('Only released revisions can become obsolete');result.note=note;}
 if(command==='log'){const id=await byRev(db,need(o,'revision'));result={id,note:need(o,'note')};}
 await event(db,actor,command,result.id,{...o,json:undefined,actor:undefined});return result;
}
export async function run(db,args){
 const {command,opts:o,vendor}=parse(args);const actor=writes.has(command)?need(o,'actor'):null;
 // Serialise domain writers on PostgreSQL too: release checks and BOM changes stay atomic.
 await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
 try{if(writes.has(command))await db.exec('LOCK TABLE parts,revisions,bom_lines,changes,activity IN SHARE ROW EXCLUSIVE MODE');
 const result=await execute(db,command,o,vendor,actor);await db.exec(command==='import'&&o['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function format(result){if(Array.isArray(result))return result.length?table(result,Object.keys(result[0]).map(key=>({key,label:key,format:v=>typeof v==='object'&&v!==null?JSON.stringify(v):v}))):'(none)';return JSON.stringify(result,null,2);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const args=process.argv.slice(2);const result=await run(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
