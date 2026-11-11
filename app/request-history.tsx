'use client';
import {useEffect,useState} from 'react';
import type {Purchase,Snapshot} from './model';

export default function RequestHistory({request,data}:{request:Purchase;data:Snapshot}){
 const [activity,setActivity]=useState<Snapshot['activity']>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 const full=['admin','administrativo','financeiro'].includes(data.me.role);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');setActivity([]);
  fetch('/api/data?historyFor='+encodeURIComponent(request.id),{cache:'no-store',signal:controller.signal}).then(async response=>{const body=await response.json() as {activity:Snapshot['activity'];error?:string};if(!response.ok)throw Error(body.error||'Não foi possível consultar o histórico.');if(!controller.signal.aborted)setActivity(body.activity)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[request.id,request.version,data,full,retry]);
 return <><h3>Histórico completo da solicitação</h3>{loading&&<p role="status">Consultando histórico…</p>}{error&&<div className="alert error" role="alert">{error}<button type="button" onClick={()=>setRetry(v=>v+1)}>Tentar novamente</button></div>}{!loading&&!error&&!activity.length&&<p className="muted">Nenhum registro de histórico foi encontrado para esta solicitação.</p>}<div className="activity-list">{activity.map(a=><div className="activity" key={a.id}><span className="activity-dot"/><div><strong>{a.action}</strong><small>{a.actor} · {new Date(a.at).toLocaleString('pt-BR',{timeZone:'America/Manaus'})}</small></div></div>)}</div>
 {full&&request.correctionHistory?.length?<details><summary>Versões anteriores das complementações ({request.correctionHistory.length})</summary>{request.correctionHistory.map((entry,i)=><div className="note" key={i}><b>{entry.actor} · {entry.at}</b><p>{entry.reason}</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(entry.previous,null,2)}</pre></div>)}</details>:null}
 {full&&request.archiveHistory?.length?<details><summary>Histórico de arquivamento da solicitação</summary>{request.archiveHistory.map((entry,i)=><p key={i}>{entry.action==='archive'?'Arquivada':'Restaurada'} por {entry.actor} · {new Date(entry.at).toLocaleString('pt-BR',{timeZone:'America/Manaus'})}<br/>{entry.reason}</p>)}</details>:null}</>;
}
