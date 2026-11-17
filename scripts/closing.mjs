#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import ExcelJS from 'exceljs';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv, pick } from './lib/csv.mjs';
import { table, heading } from './lib/format.mjs';

export const reports = {
 'deals': 'select code,title,owner,closing_on,status from deals order by closing_on,code',
 'checklist': 'select deal,code,title,kind,owner,due_on,status,revision,missing_signatures,incomplete_dependencies,missing_document from item_readiness order by deal,code',
 'closing-readiness': 'select code,title,owner,closing_on,status,closing_items,blockers,postclosing_open from closing_readiness order by closing_on,code',
 'attention': 'select * from attention order by due_on nulls last,deal,code,finding',
 'signatures-due': "select deal,code,signer,revision,signature_status,owner,due_on from signature_status where signature_status<>'recorded' order by deal,code,signer",
 'post-closing': "select deal,code,title,owner,due_on,status from item_readiness where kind='postclosing' and status='open' order by due_on nulls last,deal,code",
 'owner-load': "select owner,count(*)::int open_items,count(*) filter(where due_on<current_date)::int overdue from items where status='open' group by owner order by overdue desc,open_items desc,owner",
 'stale-evidence': `select d.code deal,i.code,s.name signer,doc.revision signed_revision,i.revision current_revision,sig.evidence from signatures sig join documents doc on doc.id=sig.document_id join signers s on s.id=sig.signer_id join items i on i.id=s.item_id join deals d on d.id=i.deal_id where doc.revision<>i.revision order by deal,i.code,s.name`,
 'dependency-blockers': `select d.code deal,i.code blocked_item,r.code needs_item,r.title,r.status from dependencies dep join items i on i.id=dep.item_id join items r on r.id=dep.requires_id join deals d on d.id=i.deal_id where r.status<>'complete' order by deal,i.code,r.code`,
 'compliance': 'select * from compliance_findings order by deal,rule,finding',
 'activity': 'select d.code deal,i.code item,a.action,a.actor,a.note,a.created_at from activity a join deals d on d.id=a.deal_id left join items i on i.id=a.item_id order by a.created_at,a.id',
};
export const commands=[...Object.keys(reports),'help','show','weekly-review','add-deal','add','update','version','require-signature','record-signature','complete','reopen','depend','close-deal','review-privacy','log','import','export','draft-chaser','draft-closing'];
const mutations=new Set(['add-deal','add','update','version','require-signature','record-signature','complete','reopen','depend','close-deal','review-privacy','log','import']);
const req=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k} is required`);return o[k].trim();};
const opt=(o,k)=>o[k]===undefined?null:req(o,k);
function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Date must be a valid YYYY-MM-DD');return value;}
const day=(o,k)=>o[k]===undefined?null:date(req(o,k));
const code=(v)=>{if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/.test(v))throw Error('Code must contain letters, numbers, dot, colon, underscore or hyphen');return v;};
const hash=(v)=>createHash('sha256').update(v).digest('hex');
const safe=(v)=>String(v).replace(/[\x00-\x1f\x7f-\x9f]/g,' ');
function selectOne(rows,ref,entity){
 const exact=rows.filter(r=>[r.id,r.code,r.title,r.name].some(v=>String(v??'').toLowerCase()===ref.toLowerCase()));
 const found=exact.length?exact:rows.filter(r=>String(r.id).startsWith(ref.toLowerCase())||String(r.code??'').toLowerCase().startsWith(ref.toLowerCase())||String(r.title??r.name??'').toLowerCase().includes(ref.toLowerCase()));
 if(found.length!==1)throw Error(`${found.length?'Ambiguous':'No'} ${entity} for ${safe(ref)}${found.length?': '+found.map(r=>`${r.code??r.name} (${r.id})`).join(', '):''}`);
 return found[0];
}
async function deal(db,o){return selectOne(await db.query('select * from deals order by code'),req(o,'deal'),'deal');}
async function item(db,o){const d=await deal(db,o);return selectOne(await db.query('select * from items where deal_id=$1 order by code',[d.id]),req(o,'ref'),'item');}
async function editable(db,i){const [d]=await db.query('select * from deals where id=$1',[i.deal_id]);if(d.status==='closed'&&i.kind!=='postclosing')throw Error('Closed deal: only post-closing obligations can change');}
async function audit(db,dealId,itemId,action,actor,note,details={}){await db.query('insert into activity(deal_id,item_id,action,actor,note,details) values($1,$2,$3,$4,$5,$6)',[dealId,itemId,action,actor,note,JSON.stringify(details)]);}
async function invalidate(db,id){
 await db.query(`with recursive affected(id) as (select $1::uuid union select d.item_id from dependencies d join affected a on d.requires_id=a.id) update items set status='open' where id in(select id from affected)`,[id]);
}
function writePrivate(dir,name,data){const root=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,dir);fs.mkdirSync(root,{recursive:true,mode:0o700});const file=path.join(root,name);fs.writeFileSync(file,data,{flag:'wx',mode:0o600});return file;}

export async function readRows(o){
 const file=req(o,'file');
 if(path.extname(file).toLowerCase()==='.csv')return parseCsv(fs.readFileSync(file,'utf8'));
 if(path.extname(file).toLowerCase()!=='.xlsx')throw Error('Import needs .xlsx or UTF-8 .csv');
 const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(file);
 if(!o.sheet&&wb.worksheets.length!==1)throw Error('Choose --sheet for a workbook with multiple sheets');
 const ws=o.sheet?wb.getWorksheet(req(o,'sheet')):wb.worksheets[0];if(!ws)throw Error('Worksheet not found');
 const header=Number(o['header-row']??1);if(!Number.isInteger(header)||header<1)throw Error('Invalid --header-row');
 const text=(c)=>{if(c.type===ExcelJS.ValueType.Formula)throw Error('Formula cells need an exported values-only workbook');if(c.value instanceof Date)return c.value.toISOString().slice(0,10);return c.text;};
 const names=[];ws.getRow(header).eachCell({includeEmpty:true},c=>names.push(text(c).trim()));
 if(!names.length||names.some(n=>!n)||new Set(names.map(n=>n.toLowerCase())).size!==names.length)throw Error('Workbook requires unique nonempty headers');
 const out=[];
 for(let n=header+1;n<=ws.rowCount;n++){const row=ws.getRow(n);const vals=names.map((_,i)=>text(row.getCell(i+1)));if(vals.every(v=>!v.trim()))continue;if(row.cellCount>names.length)throw Error(`Workbook row ${n} has extra columns`);out.push(Object.fromEntries(names.map((h,i)=>[h,vals[i]])));}
 return out;
}
async function importList(db,o,pos){
 if(pos[0]!=='legatics'||pos.length!==1)throw Error('Use import legatics');
 const d=await deal(db,o);if(d.status==='closed')throw Error('Cannot import into a closed deal');
 const list=code(req(o,'list'));const rows=await readRows(o);if(!rows.length)throw Error('No rows to import');
 const map=o.map?JSON.parse(fs.readFileSync(req(o,'map'),'utf8')):{};
 for(const key of Object.keys(map))if(!['code','title','owner','due_on','kind'].includes(key)||typeof map[key]!=='string')throw Error('Unsupported field map');
 const headers=Object.keys(rows[0]);for(const col of Object.values(map))if(!headers.includes(col))throw Error(`Mapped column is missing: ${col}`);
 const seen=new Set();let inserted=0,updated=0,unchanged=0;
 for(const row of rows){
  const val=(key,aliases)=>map[key]?String(row[map[key]]??''):pick(row,...aliases);
  const number=code(val('code',['No.','Number','ID','Reference']).trim());
  if(seen.has(number.toLowerCase()))throw Error(`Duplicate source reference ${number}`);seen.add(number.toLowerCase());
  const title=val('title',['Title','Item','Document','Description']).trim();if(!title)throw Error(`Missing title on ${number}`);
  const due=val('due_on',['Due date','Due Date','Deadline']).trim();if(due)date(due);
  const kind=val('kind',['Kind']).trim()||'condition';if(!['condition','document','postclosing'].includes(kind))throw Error(`Unknown kind ${kind}`);
  const owner=val('owner',['Responsibility','Owner','Responsible']).trim();
  const sourceKey=`${d.id}:${list}:${number}`;const digest=hash(JSON.stringify(row));const itemCode=code(`${list}:${number}`);
  const [existing]=await db.query('select * from items where source_key=$1',[sourceKey]);
  if(existing?.source_hash===digest){unchanged++;continue;}
  if(existing){
   if(!o.update)throw Error(`Changed source row ${number}; review then use --update`);
   if(existing.kind!==kind)throw Error('Import cannot change an existing kind');
   await invalidate(db,existing.id);
   await db.query("update items set title=$2,owner=$3,due_on=$4,revision=revision+1,source_data=$5,source_hash=$6 where id=$1",[existing.id,title,owner,due||null,JSON.stringify(row),digest]);
   await audit(db,d.id,existing.id,'import-update',o.actor,sourceKey,{before:existing,source:row});updated++;
  }else{
   const [created]=await db.query('insert into items(deal_id,code,title,owner,due_on,kind,source_key,source_data,source_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[d.id,itemCode,title,owner,due||null,kind,sourceKey,JSON.stringify(row),digest]);
   await audit(db,d.id,created.id,'import',o.actor,sourceKey,{source:row});inserted++;
  }
 }
 return [{rows:rows.length,inserted,updated,unchanged,dry_run:Boolean(o['dry-run']),notice:'Source statuses preserved as evidence; imported records require local review.'}];
}
async function perform(db,c,o,pos){
 if(c in reports)return db.query(reports[c]);
 if(c==='help')return commands.map(command=>({command,kind:mutations.has(command)?'write (actor required)':'read or local output'}));
 if(c==='show'){const i=await item(db,o);return db.query('select * from item_readiness where id=$1',[i.id]);}
 if(c==='weekly-review')return {readiness:await db.query(reports['closing-readiness']),attention:await db.query(reports.attention),signatures:await db.query(reports['signatures-due']),postclosing:await db.query(reports['post-closing'])};
 if(c==='add-deal'){
  const jurisdiction=req(o,'jurisdiction');if(!['NZ','AU','other'].includes(jurisdiction))throw Error('Jurisdiction must be NZ, AU or other');
  const [d]=await db.query('insert into deals(code,title,owner,closing_on,jurisdiction,purpose,access_review_on,retention_review_on) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[code(req(o,'code')),req(o,'title'),req(o,'owner'),date(req(o,'closing-on')),jurisdiction,req(o,'purpose'),day(o,'access-review-on'),day(o,'retention-review-on')]);
  await audit(db,d.id,null,c,o.actor,'Created deal',{after:d});return [d];
 }
 if(c==='add'){
  const d=await deal(db,o);const kind=o.kind??'condition';if(!['condition','document','postclosing'].includes(kind))throw Error('Invalid kind');
  if(d.status==='closed'&&kind!=='postclosing')throw Error('Closed deal: only post-closing obligations can change');
  const [i]=await db.query('insert into items(deal_id,code,title,kind,owner,due_on) values($1,$2,$3,$4,$5,$6) returning *',[d.id,code(req(o,'code')),req(o,'title'),kind,req(o,'owner'),date(req(o,'due-on'))]);
  await audit(db,d.id,i.id,c,o.actor,'Added checklist item',{after:i});return [i];
 }
 if(c==='review-privacy'){
  const d=await deal(db,o);const evidence=req(o,'evidence');const [updated]=await db.query('update deals set purpose=$2,access_review_on=$3,retention_review_on=$4 where id=$1 returning *',[d.id,req(o,'purpose'),date(req(o,'access-review-on')),date(req(o,'retention-review-on'))]);
  await audit(db,d.id,null,c,o.actor,evidence,{before:d,after:updated});return [updated];
 }
 if(c==='close-deal'){
  const d=await deal(db,o);if(d.status!=='open')throw Error('Deal already closed');
  const [ready]=await db.query('select * from closing_readiness where id=$1',[d.id]);
  if(!ready.closing_items||ready.blockers)throw Error(`Cannot close: ${ready.blockers} blockers; at least one closing item required`);
  await db.query("update deals set status='closed',closed_by=$2,closed_evidence=$3 where id=$1",[d.id,o.actor,req(o,'evidence')]);
  await audit(db,d.id,null,c,o.actor,o.evidence,{readiness:ready});return [{deal:d.code,status:'closed',postclosing_open:ready.postclosing_open}];
 }
 if(c==='import')return importList(db,o,pos);
 if(c==='export'){
  const out={format:'deal-closing-v1',exported_at:new Date().toISOString()};
  for(const t of ['deals','items','documents','signers','signatures','dependencies','activity'])out[t]=await db.query(`select * from ${t} order by id`);
  return [{file:writePrivate('exports',`closing-${randomUUID()}.json`,JSON.stringify(out,null,2)+'\n'),records:Object.values(out).filter(Array.isArray).reduce((n,r)=>n+r.length,0)}];
 }
 if(c==='draft-chaser'||c==='draft-closing'){
  const d=await deal(db,o);const rows=c==='draft-chaser'?await db.query('select * from attention where deal=$1 order by due_on nulls last,code',[d.code]):await db.query('select code,title,kind,status,missing_signatures,incomplete_dependencies from item_readiness where deal_id=$1 order by code',[d.id]);
  const text=`# DRAFT: ${c==='draft-chaser'?'Outstanding closing evidence':'Closing status'}\n\n${d.code}: ${safe(d.title)}\n\nPrepared for review by ${safe(d.owner)}. Nothing sent.\n\n`+human(rows)+'\n\nVerify the original documents and responsible lawyer decisions before sharing.\n';
  return [{file:writePrivate('drafts',`${c}-${d.code}-${randomUUID()}.md`,text)}];
 }
 if(c==='log'){
  const d=await deal(db,o);const i=o.ref?await item(db,o):null;await audit(db,d.id,i?.id??null,c,o.actor,req(o,'note'));return [{deal:d.code,item:i?.code??null,logged:true}];
 }
 const i=await item(db,o);await editable(db,i);
 if(c==='update'){
  if(!['title','owner','due-on'].some(k=>o[k]!==undefined))throw Error('Supply --title, --owner or --due-on');
  await invalidate(db,i.id);
  await db.query('update items set title=$2,owner=$3,due_on=$4,revision=revision+1 where id=$1',[i.id,opt(o,'title')??i.title,opt(o,'owner')??i.owner,day(o,'due-on')??i.due_on]);
 }else if(c==='version'){
  if(i.kind!=='document')throw Error('Version requires a document item');
  const file=req(o,'file');const digest=hash(fs.readFileSync(file));const reference=req(o,'reference');
  const current=await db.query('select * from documents where item_id=$1 and revision=$2',[i.id,i.revision]);
  const revision=i.revision+(current.length?1:0);await invalidate(db,i.id);
  await db.query('update items set revision=$2 where id=$1',[i.id,revision]);
  await db.query('insert into documents(item_id,revision,reference,sha256,actor) values($1,$2,$3,$4,$5)',[i.id,revision,reference,digest,o.actor]);
 }else if(c==='require-signature'){
  if(i.kind!=='document')throw Error('Signatures require a document item');
  await invalidate(db,i.id);await db.query('insert into signers(item_id,name) values($1,$2)',[i.id,req(o,'name')]);
 }else if(c==='record-signature'){
  const s=selectOne(await db.query('select * from signers where item_id=$1',[i.id]),req(o,'signer'),'signer');
  const [doc]=await db.query('select * from documents where item_id=$1 and revision=$2',[i.id,i.revision]);if(!doc)throw Error('No current document version');
  const signed= date(req(o,'signed-on'));const [{today}]=await db.query('select current_date::text today');if(signed>today)throw Error('Signature date cannot be in the future');
  await db.query('insert into signatures(signer_id,document_id,evidence,signed_on,actor) values($1,$2,$3,$4,$5)',[s.id,doc.id,req(o,'evidence'),signed,o.actor]);
 }else if(c==='complete'){
  const [ready]=await db.query('select * from item_readiness where id=$1',[i.id]);
  if(!i.owner||!i.due_on||ready.missing_document||ready.missing_signatures||ready.incomplete_dependencies)throw Error('Completion blocked: owner, deadline, current document, signatures or dependencies missing');
  await db.query("update items set status='complete',completed_revision=revision,completed_by=$2,completion_evidence=$3 where id=$1",[i.id,o.actor,req(o,'evidence')]);
 }else if(c==='reopen'){
  req(o,'reason');await invalidate(db,i.id);
 }else if(c==='depend'){
  const required=await item(db,{...o,ref:req(o,'requires')});
  if(i.id===required.id)throw Error('Dependency cycle');
  if(i.kind!=='postclosing'&&required.kind==='postclosing')throw Error('Closing item cannot depend on a post-closing obligation');
  const cycle=await db.query(`with recursive ancestors(id) as (select requires_id from dependencies where item_id=$1 union select dep.requires_id from dependencies dep join ancestors a on dep.item_id=a.id) select id from ancestors where id=$2`,[required.id,i.id]);
  if(cycle.length)throw Error('Dependency cycle');
  await invalidate(db,i.id);await db.query('insert into dependencies(item_id,requires_id) values($1,$2)',[i.id,required.id]);
 }else throw Error(`Unknown command ${c}`);
 const [after]=await db.query('select * from items where id=$1',[i.id]);
 await audit(db,i.deal_id,i.id,c,o.actor,o.evidence??o.reason??o.reference??o.name??o.requires??'Updated record',{before:i,after});
 return [after];
}
export async function run(db,c,o={},pos=[]){
 if(!commands.includes(c))throw Error(`Unknown command ${c}; use help`);
 if(mutations.has(c))req(o,'actor');
 await db.exec(mutations.has(c)?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  if(mutations.has(c))await db.exec('LOCK TABLE deals IN SHARE ROW EXCLUSIVE MODE');
  const result=await perform(db,c,o,pos);
  await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function human(value){
 if(!Array.isArray(value))return Object.entries(value).map(([k,v])=>heading(k)+ '\n'+human(v)).join('\n');
 if(!value.length)return '  (none)';
 const keys=Object.keys(value[0]).filter(k=>!['id','deal_id','source_data','source_key','source_hash','created_at','updated_at'].includes(k));
 return table(value,keys.map(key=>({key,label:key,width:key==='title'?38:28,format:v=>safe(typeof v==='object'?JSON.stringify(v):v??'')})));
}
const options={
 'show':['deal','ref'], 'add-deal':['code','title','owner','closing-on','jurisdiction','purpose','access-review-on','retention-review-on'],
 'add':['deal','code','title','kind','owner','due-on'], 'update':['deal','ref','title','owner','due-on'],
 'version':['deal','ref','file','reference'], 'require-signature':['deal','ref','name'], 'record-signature':['deal','ref','signer','evidence','signed-on'],
 'complete':['deal','ref','evidence'], 'reopen':['deal','ref','reason'], 'depend':['deal','ref','requires'], 'close-deal':['deal','evidence'],
 'review-privacy':['deal','purpose','access-review-on','retention-review-on','evidence'], 'log':['deal','ref','note'],
 'import':['deal','list','file','map','sheet','header-row','dry-run','update'], 'draft-chaser':['deal'], 'draft-closing':['deal']
};
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;const args=process.argv.slice(2);const c=args.shift()||'help';const o={},pos=[];
 try{
  for(const a of args){if(!a.startsWith('--')){pos.push(a);continue;}const at=a.indexOf('=');const k=a.slice(2,at<0?undefined:at);if(!['json',...(mutations.has(c)?['actor']:[]),...(options[c]||[])].includes(k))throw Error(`Unknown --${k} for ${c}`);if(k in o)throw Error(`Duplicate --${k}`);o[k]=at<0?true:a.slice(at+1);if(['json','dry-run','update'].includes(k)&&o[k]!==true)throw Error(`--${k} is a boolean flag`);}
  if(c!=='import'&&pos.length)throw Error('Unexpected positional arguments; use --name=value');
  db=await getDb();const result=await run(db,c,o,pos);console.log(o.json?JSON.stringify(result,null,2):heading(c)+'\n'+human(result));
 }catch(e){if(o.json||args.includes('--json'))console.error(JSON.stringify({error:e.message}));else console.error(safe(e.message));process.exitCode=1;}
 finally{if(db)await db.close();}
}
