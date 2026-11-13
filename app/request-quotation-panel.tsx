'use client';

import {History, MessageCircle, Plus, Scale} from 'lucide-react';
import type {Member, Purchase} from './model';
import {OfficialQuoteCards} from './quote-commercial-fields';

type Props={request:Purchase;role:Member['role'];minQuotes:number;busy:boolean;onRegister:()=>void;onMessage:()=>void;onSelect:(quoteId:string)=>void};

export default function RequestQuotationPanel({request,role,minQuotes,busy,onRegister,onMessage,onSelect}:Props){
 if(role==='solicitante')return null;
 const quoting=['quoting','national'].includes(request.status);
 const canBuy=!request.archived&&['admin','administrativo'].includes(role);
 return <details className="budget-details request-quotations" open={quoting&&!request.archived}>
  <summary><Scale size={16}/> Cotação</summary>
  {quoting&&canBuy&&<div className="actions"><button type="button" className="button primary" disabled={busy} onClick={onRegister}><Plus size={16}/> Registrar cotação</button><button type="button" className="button secondary" disabled={busy} onClick={onMessage}><MessageCircle size={16}/> Preparar mensagem</button></div>}
  {(request.quotes.length>0||quoting)?<>
   <div className="section-line"><h3>Comparativo de propostas</h3><small className="muted">Mínimo: {minQuotes} válidas</small></div>
   {request.quotes.length?<OfficialQuoteCards request={request} canBuy={canBuy} busy={busy} onSelect={onSelect}/>:<div className="note">Nenhuma proposta registrada.{canBuy?' Prepare a mensagem e cadastre os valores recebidos.':''}</div>}
  </>:<p className="muted">As propostas comerciais reais são registradas após a aprovação da necessidade e ficam separadas das estimativas de referência.</p>}
  {!!request.quoteHistory?.length&&<details><summary><History size={16}/> Versões anteriores das propostas ({request.quoteHistory.length})</summary><OfficialQuoteCards request={{...request,quotes:request.quoteHistory}} canBuy={false} busy={busy} onSelect={()=>{}}/></details>}
 </details>;
}
