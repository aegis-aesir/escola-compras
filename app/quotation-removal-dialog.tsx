'use client';
import {useEffect,useRef,useState} from 'react';
import type {IntegrationJob} from './integration-model';
export default function QuotationRemovalDialog({job,code,restore,busy,error,onSave,onClose}:{job:IntegrationJob;code:string;restore:boolean;busy:boolean;error?:string;onSave:(value:unknown)=>Promise<boolean>;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),[reason,setReason]=useState('');
 useEffect(()=>{ref.current?.showModal();cancel.current?.focus()},[]);
 return <dialog ref={ref} className="modal" aria-label={restore?'Restaurar cotação excluída':'Excluir cotação da lista'} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}>
  <div className="modal-header"><h2>{restore?'Restaurar cotação excluída':'Excluir cotação da lista'}</h2></div>
  <form className="modal-body" onSubmit={async e=>{e.preventDefault();if(!busy&&await onSave({action:restore?'restore_quotation':'remove_quotation',id:job.id,version:job.version,reason}))onClose()}}>
   <p><strong>{code} · {job.supplierName}</strong><br/>{job.target}</p>
   <p className="note">{restore?'O registro voltará à lista com seu histórico. Restaurar não coloca a mensagem na fila nem autoriza reenvio.':'O registro irá para a Lixeira. Mensagem, recibo e histórico serão preservados; isso não apaga a mensagem no WhatsApp. Um novo envio exige outra preparação e confirmação se o contato já recebeu este pedido.'}</p>
   <label className="field"><span>Motivo</span><textarea required minLength={5} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/></label>
   {error&&<p className="alert error" role="alert">{error}</p>}
   <div className="actions"><button ref={cancel} type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{restore?'Restaurar sem reenviar':'Excluir para a Lixeira'}</button></div>
  </form>
 </dialog>;
}
