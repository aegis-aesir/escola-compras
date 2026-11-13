'use client';
import {useEffect,useId,useRef} from 'react';
import {X,Trash2} from 'lucide-react';
import type {RequestDraft} from './request-draft';

export default function DraftDeleteDialog({draft,busy,error,onClose,onConfirm}:{draft:RequestDraft;busy:boolean;error:string;onClose:()=>void;onConfirm:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),errorBox=useRef<HTMLDivElement>(null),titleId=useId(),descriptionId=useId();
 useEffect(()=>{const previous=document.activeElement,element=dialog.current;element?.showModal();cancel.current?.focus();return()=>{element?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true})}},[]);
 useEffect(()=>{if(error)errorBox.current?.focus()},[error]);
 return <dialog ref={dialog} className="request-archive-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
  <div className="modal-head"><h2 id={titleId}>Excluir rascunho arquivado?</h2><button type="button" className="icon-button" disabled={busy} aria-label="Fechar confirmação de exclusão" onClick={onClose}><X size={20}/></button></div>
  <div className="modal-body"><p className="archive-request-name"><strong>{draft.values.title||'Solicitação sem título'}</strong><small>{draft.authorName||'Autor não informado'} · {draft.authorDepartment||draft.values.department}</small></p>
   <p id={descriptionId} className="archive-explanation">O rascunho será removido da lista e não poderá ser encaminhado ou restaurado pelo painel.</p>
   {error&&<div ref={errorBox} tabIndex={-1} role="alert" className="alert error">{error}</div>}
   <div className="archive-confirm-actions"><button ref={cancel} type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className="button secondary danger" disabled={busy} onClick={()=>{if(!busy)void onConfirm()}}><Trash2 size={16}/>{busy?'Excluindo…':'Confirmar exclusão'}</button></div>
  </div>
 </dialog>;
}
