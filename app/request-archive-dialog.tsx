'use client';

import {useEffect,useId,useRef} from 'react';
import {X} from 'lucide-react';
import type {Purchase} from './model';

type Props={request:Purchase;restore:boolean;busy:boolean;error:string;onClose:()=>void;onConfirm:(reason:string)=>Promise<void>};

export default function RequestArchiveDialog({request,restore,busy,error,onClose,onConfirm}:Props){
 const dialog=useRef<HTMLDialogElement>(null),reason=useRef<HTMLTextAreaElement>(null),titleId=useId(),descriptionId=useId();
 useEffect(()=>{
  const previousFocus=document.activeElement,element=dialog.current;
  element?.showModal();reason.current?.focus();
  return()=>{element?.close();if(previousFocus instanceof HTMLElement&&previousFocus.isConnected)previousFocus.focus({preventScroll:true})};
 },[]);
 return <dialog ref={dialog} className="request-archive-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
  <div className="modal-head"><h2 id={titleId}>{restore?'Restaurar solicitação':'Arquivar solicitação'}</h2><button type="button" className="icon-button" aria-label="Fechar confirmação" disabled={busy} onClick={onClose}><X size={20}/></button></div>
  <form className="modal-body" onSubmit={async event=>{event.preventDefault();if(!busy)await onConfirm(String(new FormData(event.currentTarget).get('reason')||'').trim())}}>
   <p className="archive-request-name"><strong>{request.title}</strong><small>{request.code}</small></p>
   <p id={descriptionId} className="archive-explanation">{restore?'A solicitação voltará à etapa anterior com todo o histórico preservado. As tarefas pendentes poderão continuar conforme as autorizações existentes.':'A solicitação sairá das filas de trabalho e as tarefas automáticas ficarão pausadas. Todo o histórico, as propostas e os anexos serão preservados.'}</p>
   <label className="field"><span>{restore?'Motivo da restauração da solicitação':'Motivo do arquivamento da solicitação'}</span><textarea ref={reason} name="reason" required minLength={5} maxLength={2000} rows={3} disabled={busy} placeholder="Descreva o motivo…"/></label>
   {error&&<div className="alert error" role="alert">{error}</div>}
   <div className="archive-confirm-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={busy}>{busy?'Salvando…':restore?'Confirmar restauração':'Confirmar arquivamento'}</button></div>
  </form>
 </dialog>;
}
