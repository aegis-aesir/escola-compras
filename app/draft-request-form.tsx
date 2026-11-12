'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import BudgetRequestForm from './budget-request-form';
import {Attachments} from './budget-record-panel';
import {requestDraftSchema,type RequestDraft,type RequestDraftValues} from './request-draft';
import type {Snapshot} from './model';

function manausMonth(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus',year:'numeric',month:'2-digit'}).formatToParts(new Date());return `${parts.find(part=>part.type==='year')?.value}-${parts.find(part=>part.type==='month')?.value}`}
function monthLabel(value?:string){if(!value)return 'mês seguinte';const [year,month]=value.split('-');return `${month}/${year}`}
function draftLabel(draft:RequestDraft){return draft.status==='deferred'?`Adiado · protocolo ${draft.sourceCode||'não informado'} · disponível para envio em ${monthLabel(draft.availableMonth)}`:`Rascunho · ${draft.values.items.length} item(ns)`}

export default function DraftRequestForm({data,busy,error,onSave}:{data:Snapshot;busy:boolean;error:string;onSave:(values:unknown,draft:{id:string;version:number})=>Promise<boolean>}){
 const [savedId,setSavedId]=useState(''),[uploading,setUploading]=useState(false);
 const prefix=`estrelas:draft:${data.me.id}:`;
 const [drafts,setDrafts]=useState<RequestDraft[]|null>(null),[active,setActive]=useState<RequestDraft|null>(null),[message,setMessage]=useState('Carregando rascunhos…'),[failure,setFailure]=useState(''),[submitting,setSubmitting]=useState(false);
 const current=useRef<RequestDraft|null>(null),pending=useRef(false),running=useRef<Promise<boolean>|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const backup=useCallback((draft:RequestDraft)=>{try{localStorage.setItem(prefix+draft.id,JSON.stringify(draft));return true}catch{return false}},[prefix]);
 const flush=useCallback(async():Promise<boolean>=>{
  if(running.current){if(!await running.current)return false;if(pending.current)return flush();return true}
  if(!pending.current||!current.current)return true;
  const sent=current.current;pending.current=false;setMessage('Salvando rascunho…');
  const task=(async()=>{try{
   const response=await fetch('/api/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sent.id,version:sent.version,values:sent.values}),keepalive:true});
   const result=await response.json() as {error?:string;version:number;updatedAt:string};if(!response.ok)throw new Error(result.error||'Falha ao salvar.');
   if(current.current){current.current={...current.current,version:result.version,updatedAt:result.updatedAt};backup(current.current)}
   setSavedId(sent.id);setFailure('');setMessage('Rascunho salvo automaticamente.');return true;
  }catch(e){pending.current=true;setFailure(e instanceof Error?e.message:'Não foi possível salvar.');setMessage('Salvamento no servidor pendente.');return false}})();
  running.current=task;const ok=await task;running.current=null;
  return ok&&pending.current?flush():ok;
 },[backup]);
 useEffect(()=>{
  let live=true;
  fetch('/api/drafts',{cache:'no-store'}).then(async response=>{const result=await response.json() as {error?:string;drafts:RequestDraft[];submittedIds:string[]};if(!response.ok)throw new Error(result.error);const merged=new Map<string,RequestDraft>(result.drafts.map((d:RequestDraft)=>[d.id,d]));
   try{const keys=Object.keys(localStorage).filter(key=>key.startsWith(prefix));for(const key of keys){const local=JSON.parse(localStorage.getItem(key)||'null') as RequestDraft;if(!local||!requestDraftSchema.safeParse(local.values).success)continue;if(result.submittedIds.includes(local.id)){localStorage.removeItem(key);continue}const remote=merged.get(local.id);if(!remote||local.version===remote.version)merged.set(local.id,local)}}catch{/* Server drafts remain available if local storage is unavailable. */}
   if(live){setDrafts([...merged.values()]);setMessage('')}}).catch(e=>{if(live)setFailure(e.message)});
  const unload=(e:BeforeUnloadEvent)=>{if(pending.current||running.current){e.preventDefault();e.returnValue=''}};
  window.addEventListener('beforeunload',unload);
  return()=>{live=false;window.removeEventListener('beforeunload',unload);if(timer.current)clearTimeout(timer.current);void flush()};
 },[prefix,flush]);
 function choose(draft?:RequestDraft){const selected=draft??{id:crypto.randomUUID(),version:0,updatedAt:'',values:undefined as unknown as RequestDraftValues};current.current=selected;setActive(selected);setFailure('');setMessage('Rascunho — ainda não enviado.');if(draft){pending.current=true;timer.current=setTimeout(()=>void flush(),600)}}
 const changed=useCallback((values:RequestDraftValues)=>{
  if(!current.current||JSON.stringify(current.current.values)===JSON.stringify(values))return;
  current.current={...current.current,values};pending.current=true;
  const saved=backup(current.current);setMessage(saved?'Rascunho protegido neste navegador; salvando no servidor…':'Salvando rascunho no servidor…');
  if(!saved)setFailure('A cópia neste navegador não está disponível. Aguarde a confirmação de salvamento antes de fechar.');
  if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void flush(),600);
 },[backup,flush]);
 if(!active)return <div className="modal-body"><h3>Rascunhos</h3><p>Continue o preenchimento ou comece uma nova solicitação. Rascunhos são privados do seu usuário e ainda não foram enviados.</p>{failure&&<div role="alert" className="alert error">{failure}</div>}{drafts===null?<p>{message}</p>:<>{drafts.map(d=><button type="button" className="quote-link" key={d.id} onClick={()=>choose(d)}><span><strong>{d.values.title||'Solicitação sem título'}</strong><small>{draftLabel(d)}</small>{d.status==='deferred'&&<small>Motivo: {d.deferReason}</small>}</span><span>Continuar</span></button>)}<button type="button" className="button primary" onClick={()=>choose()}>Começar nova solicitação</button></>}</div>;
 const submitBlockedReason=active.status==='deferred'&&active.availableMonth&&manausMonth()<active.availableMonth?`Esta cópia do pedido ${active.sourceCode||''} poderá ser enviada a partir de ${monthLabel(active.availableMonth)}.`:undefined;
 return <><div className="note" role="status"><b>{active.status==='deferred'?'Adiado':'Rascunho'}</b> · {message}{active.status==='deferred'&&<><p>Cópia editável do protocolo {active.sourceCode||'não informado'}. Motivo: {active.deferReason||'Não informado'}.</p><small>O pedido original permanece preservado como adiado.</small></>}{failure&&<div role="alert">{failure} <button type="button" className="text-button" onClick={()=>void flush()}>Tentar salvar novamente</button></div>}</div><fieldset disabled={busy||submitting||uploading} style={{border:0,padding:0,margin:0,minWidth:0}}><BudgetRequestForm key={active.id} data={data} busy={busy||submitting||uploading} error={error} draft={active.values} submitBlockedReason={submitBlockedReason} attachments={active.version>0||savedId===active.id?<Attachments request={{id:active.id,status:'draft'}} data={data} busy={busy||submitting} beforeUpload={flush} onUploading={setUploading}/>:<p className="muted">Aguarde o salvamento do rascunho para adicionar anexos.</p>} onDraftChange={changed} onSave={async values=>{
  setSubmitting(true);if(timer.current)clearTimeout(timer.current);
  try{if(!await flush()||!current.current)return;const draft=current.current;if(await onSave(values,{id:draft.id,version:draft.version})){pending.current=false;current.current=null;try{localStorage.removeItem(prefix+draft.id)}catch{}}}finally{setSubmitting(false)}
 }}/></fieldset></>;
}
