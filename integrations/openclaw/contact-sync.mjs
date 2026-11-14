import {DatabaseSync} from 'node:sqlite';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeContactPhone} from './contact-phone.mjs';

const MAX_CONTACTS=5000;
const SCHOOL_PHONE='+559292017107';
const OPERATIONAL_NAMESPACE=createHash('sha256').update('operacional').digest('hex').slice(0,24);
const OPERATIONAL_QUEUE=JSON.stringify(['whatsapp',OPERATIONAL_NAMESPACE]);
const ERROR_CODES=new Set(['source_unavailable','schema_unsupported','limit_exceeded','read_failed']);
function sourceError(code) { return Object.assign(new Error(`Contact source: ${code}`),{code}); }
function pn(jid) {
  if(typeof jid!=='string'||!/^\d+(?::\d+)?@s\.whatsapp\.net$/.test(jid))return undefined;
  return normalizeContactPhone('+'+jid.split('@')[0].split(':')[0]);
}
function nameOf(value,phone) {
  const name=typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,150):'';
  return name.length>=2?name:phone;
}

// Every selected JSON field is a scalar identity field. Message bodies, media,
// policies, credentials and whole payloads never cross the SQLite boundary.
const IDENTITY_SQL=`SELECT
 json_valid(payload_json) AS valid,
 CASE WHEN json_valid(payload_json) THEN json_type(payload_json) END AS payload_type,
 CASE WHEN json_valid(payload_json) THEN json_type(payload_json,'$.message.key') END AS key_type,
 CASE WHEN json_valid(payload_json) THEN CASE WHEN json_type(payload_json,'$.message.key.remoteJid')='text' THEN json_extract(payload_json,'$.message.key.remoteJid') END END AS remote,
 CASE WHEN json_valid(payload_json) THEN CASE WHEN json_type(payload_json,'$.message.key.remoteJidAlt')='text' THEN json_extract(payload_json,'$.message.key.remoteJidAlt') END END AS remote_alt,
 CASE WHEN json_valid(payload_json) THEN CASE WHEN json_type(payload_json,'$.message.key.fromMe') IN ('true','false') THEN json_extract(payload_json,'$.message.key.fromMe') END END AS from_me,
 CASE WHEN json_valid(payload_json) THEN json_type(payload_json,'$.message.key.fromMe') END AS from_me_type,
 CASE WHEN json_valid(payload_json) THEN CASE WHEN json_type(payload_json,'$.message.pushName')='text' THEN json_extract(payload_json,'$.message.pushName') END END AS push_name
 FROM channel_ingress_events WHERE channel_id='whatsapp' AND (account_id='operacional' OR (account_id=? AND queue_name=?))
 ORDER BY received_at,event_id`;

async function readIngressContacts(dbPath) {
  try {if(!(await stat(dbPath)).isFile())throw sourceError('source_unavailable');}catch {throw sourceError('source_unavailable');}
  let db;
  try {db=new DatabaseSync(dbPath,{readOnly:true});}catch {throw sourceError('source_unavailable');}
  try {
    db.exec('BEGIN'); // One finite read snapshot; never a claim or queue mutation.
    const columns=new Set(db.prepare("SELECT name FROM pragma_table_info('channel_ingress_events')").all().map(row=>row.name));
    if(!['channel_id','account_id','queue_name','payload_json','received_at','event_id'].every(column=>columns.has(column)))throw sourceError('schema_unsupported');
    const identities=new Map(),lidPhones=new Map();
    const statement=db.prepare(IDENTITY_SQL);
    // Only a native same-message remoteJid/remoteJidAlt pair proves LID ↔ PN.
    // Conflicting retained pairs invalidate that LID rather than guessing.
    for(const row of statement.iterate(OPERATIONAL_NAMESPACE,OPERATIONAL_QUEUE)) {
      if(row.from_me!==0||!/^\d+@lid$/.test(row.remote))continue;
      const phone=pn(row.remote_alt);
      if(!phone)continue;
      if(lidPhones.has(row.remote)&&lidPhones.get(row.remote)!==phone)lidPhones.set(row.remote,null);
      else lidPhones.set(row.remote,phone);
    }
    let candidates=0,skipped=0;
    for(const row of statement.iterate(OPERATIONAL_NAMESPACE,OPERATIONAL_QUEUE)) {
      candidates++;
      // Completed native events deliberately retain a null payload tombstone.
      if(row.payload_type==='null'){skipped++;continue;}
      if(row.valid!==1||row.key_type!=='object'||typeof row.remote!=='string'||!['true','false'].includes(row.from_me_type))throw sourceError('schema_unsupported');
      if(row.from_me===1){skipped++;continue;}
      const phone=pn(row.remote)||(/^\d+@lid$/.test(row.remote)?lidPhones.get(row.remote):undefined);
      if(!phone||phone===SCHOOL_PHONE||identities.has(phone)){skipped++;continue;}
      identities.set(phone,{name:nameOf(row.push_name,phone),phone});
      if(identities.size>MAX_CONTACTS)throw sourceError('limit_exceeded');
    }
    return {contacts:[...identities.values()].sort((a,b)=>a.phone.localeCompare(b.phone)),candidates,skipped,coverage:'known_conversations'};
  }catch(error){throw ERROR_CODES.has(error.code)?error:sourceError('read_failed');}
  finally {db.close();}
}

function metadataPhone(value) {
  if(typeof value!=='string')return undefined;
  const raw=value.replace(/^whatsapp:/,'');
  return raw.includes('@')?pn(raw):normalizeContactPhone(raw);
}

async function readSessionContacts(dbPath) {
  try {if(!(await stat(dbPath)).isFile())throw sourceError('source_unavailable');}catch {throw sourceError('source_unavailable');}
  let db;
  try {db=new DatabaseSync(dbPath,{readOnly:true});}catch {throw sourceError('source_unavailable');}
  try {
    db.exec('BEGIN');
    const columns=new Set(db.prepare("SELECT name FROM pragma_table_info('session_nodes')").all().map(row=>row.name));
    if(!['session_key','entry_json'].every(column=>columns.has(column)))throw sourceError('schema_unsupported');
    const incompatible=db.prepare(`SELECT 1 AS incompatible FROM session_nodes WHERE session_key LIKE 'agent:operacional:whatsapp:%' AND CASE WHEN json_valid(entry_json) THEN COALESCE(json_type(entry_json,'$.delivery'),'missing')!='object' ELSE 1 END LIMIT 1`).get();
    if(incompatible)throw sourceError('schema_unsupported');
    // Canonical native metadata only. Never select entry_json, sessionFile,
    // transcripts, generated titles/summaries, or any message table.
    const extract=path=>`CASE WHEN json_type(entry_json,'$.${path}')='text' THEN json_extract(entry_json,'$.${path}') END`;
    const fields={channel:'delivery.context.channel',account:'delivery.context.accountId',provider:'delivery.origin.provider',origin_account:'delivery.origin.accountId',chat_type:'delivery.origin.chatType',from:'delivery.origin.from',to:'delivery.context.to',native_peer:'delivery.origin.nativeDirectUserId',display_name:'displayName',origin_label:'delivery.origin.label'};
    const sql=`SELECT ${Object.entries(fields).map(([alias,path])=>`${extract(path)} AS "${alias}"`).join(',')} FROM session_nodes WHERE json_valid(entry_json) AND ${extract('delivery.kind')}='external' AND (${extract('delivery.context.channel')}='whatsapp' OR ${extract('delivery.origin.provider')}='whatsapp') AND (${extract('delivery.context.accountId')}='operacional' OR ${extract('delivery.origin.accountId')}='operacional') ORDER BY session_key`;
    const contacts=new Map();
    let candidates=0,skipped=0;
    for(const row of db.prepare(sql).iterate()) {
      candidates++;
      if((row.channel&&row.channel!=='whatsapp')||(row.provider&&row.provider!=='whatsapp')||(row.account&&row.account!=='operacional')||(row.origin_account&&row.origin_account!=='operacional')||row.chat_type!=='direct') {skipped++;continue;}
      const phones=[row.native_peer,row.from,row.to].map(metadataPhone).filter(Boolean);
      const phone=phones[0];
      if(!phone||phone===SCHOOL_PHONE||phones.some(value=>value!==phone)||contacts.has(phone)) {skipped++;continue;}
      contacts.set(phone,{name:nameOf(row.display_name||row.origin_label,phone),phone});
      if(contacts.size>MAX_CONTACTS)throw sourceError('limit_exceeded');
    }
    return {contacts:[...contacts.values()],candidates,skipped};
  }catch(error){throw ERROR_CODES.has(error.code)?error:sourceError('read_failed');}
  finally {db.close();}
}

export async function readKnownWhatsAppContacts({dbPath,sessionsDbPath}={}) {
  // Explicit fixture/custom source never falls through to a real home database.
  const defaultSources=dbPath===undefined&&sessionsDbPath===undefined;
  const paths=[['ingress',dbPath??(defaultSources?join(homedir(),'.openclaw','state','openclaw.sqlite'):undefined),readIngressContacts],['session_metadata',sessionsDbPath??(defaultSources?join(homedir(),'.openclaw','agents','operacional','agent','openclaw-agent.sqlite'):undefined),readSessionContacts]];
  const contacts=new Map(),sources=[],warnings=[];
  let candidates=0,skipped=0;
  for(const [source,path,read] of paths) {
    if(path===undefined)continue;
    let result;
    try {result=await read(path);}catch(error) {
      if(error.code==='limit_exceeded')throw error;
      warnings.push({source,error:ERROR_CODES.has(error.code)?error.code:'read_failed'});
      continue;
    }
    sources.push(source);candidates+=result.candidates;skipped+=result.skipped;
    for(const contact of result.contacts) {
      if(contacts.has(contact.phone)){skipped++;continue;}
      contacts.set(contact.phone,contact);
      if(contacts.size>MAX_CONTACTS)throw sourceError('limit_exceeded');
    }
  }
  if(!sources.length)throw sourceError(warnings.find(warning=>warning.error!=='source_unavailable')?.error||'source_unavailable');
  return {contacts:[...contacts.values()].sort((a,b)=>a.phone.localeCompare(b.phone)),candidates,skipped,coverage:'known_conversations',sources,...warnings.length?{warnings}:{}};
}

export async function runContactSync(config,{site,readContacts=readKnownWhatsAppContacts,dbPath,sessionsDbPath}={}) {
  const send=site||((body)=>import('./client.mjs').then(({callSite})=>callSite(config,body)));
  const response=await send({op:'contact_sync_poll',protocol:'contacts-v1'});
  const job=response?.job;
  if(!job)return {synced:false};
  if(typeof job.syncId!=='string'||!job.syncId||typeof job.leaseToken!=='string'||!job.leaseToken)throw sourceError('read_failed');
  const base={op:'contact_sync_result',syncId:job.syncId,leaseToken:job.leaseToken};
  let result;
  try {
    result=await readContacts({dbPath,sessionsDbPath});
    if(!Array.isArray(result?.contacts))throw sourceError('read_failed');
    if(result.contacts.length>MAX_CONTACTS)throw sourceError('limit_exceeded');
  }catch(error) {
    const code=ERROR_CODES.has(error.code)?error.code:'read_failed';
    await send({...base,page:0,contacts:[],done:true,error:code});
    return {synced:false,error:code};
  }
  const counts={candidates:result.candidates,skipped:result.skipped};
  const pages=Math.max(1,Math.ceil(result.contacts.length/50));
  for(let page=0;page<pages;page++)await send({...base,page,contacts:result.contacts.slice(page*50,(page+1)*50),done:page===pages-1,counts,...page===pages-1&&result.warnings?.length?{warnings:result.warnings}:{}});
  return {synced:true,contacts:result.contacts.length,...result.warnings?.length?{warnings:result.warnings}:{}};
}
