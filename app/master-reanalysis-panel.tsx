'use client';
import {useState} from 'react';
import {RotateCcw} from 'lucide-react';
import type {Purchase} from './model';
import {isAwaitingAdministrativeAnalysis} from './request-views';
export default function MasterReanalysisPanel({request,busy,onSave}:{request:Purchase;busy:boolean;onSave:(payload:unknown)=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[reason,setReason]=useState('');
 if(isAwaitingAdministrativeAnalysis(request))return null;
 return <section className="note"><button type="button" className="button secondary" disabled={busy} onClick={()=>setOpen(!open)}><RotateCcw size={16}/>Reenviar para análise administrativa</button>{open&&<form onSubmit={async e=>{e.preventDefault();if(await onSave({action:'master_reanalysis',id:request.id,version:request.version,reason})){setOpen(false);setReason('')}}}><p>O pedido voltará para {request.estimate?'conferência administrativa, com a estimativa já registrada':'Análise ADM, aguardando o início da estimativa'}. As decisões e os registros anteriores serão preservados no histórico. Será necessário novo parecer e nova aprovação da Diretoria Geral.{request.archived?' O pedido será restaurado.':''}{request.deferred?.draftId?' A cópia adiada ainda não enviada será arquivada para evitar duplicidade.':''}</p><label className="field"><span>Justificativa do reenvio *</span><textarea value={reason} onChange={e=>setReason(e.target.value)} required minLength={5} maxLength={2000} rows={3}/></label><button className="button primary" disabled={busy}>Confirmar reenvio ao administrativo</button></form>}</section>
}
