import {money} from './model';
import {invoiceBlockers,type BudgetInvoice,type BudgetClosing} from './budget-month';

export function InvoiceReadOnly({invoice:n,onClose}:{invoice:BudgetInvoice;onClose:()=>void}){
 const fields={'Fornecedor':n.supplier,'Tipo':n.documentType,'Emissão':n.issuedOn,'Valor':money(n.amount),'Vencimento':n.dueOn,'Pagamento':n.paymentStatus,'Pago em':n.paidOn,'Liberação':n.released?'Liberado':'Pendente','Recebimento / aceite':n.received.status,'CNPJ':n.correctCnpj.status,'XML / equivalente':n.xml.status,'Validação contábil':n.accountingStatus,'Orientação formal':n.accountingReference,'Responsável contábil':n.accountingResponsible,'Envio à Contabilidade':n.sentToAccountingOn,'Tributo / guia':n.taxGuide,'Vencimento do tributo':n.taxDueOn,'Observações':n.notes};
 const blockers=invoiceBlockers(n);
 return <section className="budget-section"><div className="section-line"><h3>Documento fiscal · {n.number}</h3><button type="button" className="button secondary" onClick={onClose}>Fechar consulta</button></div><dl className="budget-indicators">{Object.entries(fields).map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value||'Não informado'}</dd></div>)}</dl>
 {(['received','correctCnpj','xml'] as const).map(key=>n[key].reason&&<p className="muted" key={key}>Justificativa ({key==='received'?'aceite':key==='correctCnpj'?'CNPJ':'XML'}): {n[key].reason} {n[key].document} {n[key].authorization}</p>)}
 {n.accountingReason&&<p>Justificativa contábil: {n.accountingReason}</p>}
 <h4>Documentos e referências</h4>{n.documents.length?<ul>{n.documents.map((value,i)=><li key={i}>{value}</li>)}</ul>:<p className="muted">Nenhum documento vinculado.</p>}
 {blockers.length>0&&<div className="note"><b>Pendências para liberação</b><ul>{blockers.map((value,i)=><li key={i}>{value}</li>)}</ul></div>}
 <p className="muted">Registrado por {n.recordedBy||'Não informado'} · {n.recordedAt||''}</p>
 {n.history?.length?<details><summary>Histórico de revisões ({n.history.length})</summary>{n.history.map((h,i)=><p key={i}>{h.number} · {money(h.amount)} · {h.paymentStatus} · {h.paidOn||'Sem pagamento registrado'} · {h.recordedBy} · {h.recordedAt}<br/>{h.notes}</p>)}</details>:null}
 </section>;
}

export function ClosingReadOnly({closing:c,labels}:{closing?:BudgetClosing;labels:Record<string,string>}){
 if(!c)return <section className="budget-section"><h3>Fechamento mensal</h3><p className="muted">Sem fechamento registrado nesta competência.</p></section>;
 const report=(value:BudgetClosing)=><><dl className="budget-indicators">{Object.entries(labels).map(([key,name])=><div key={key}><dt>{name}</dt><dd>{String(value[key as keyof BudgetClosing]||'Não informado')}</dd></div>)}</dl>
 {value.snapshot&&<div className="budget-totals">{Object.entries(value.snapshot.totals).map(([key,total])=><div key={key}><small>{{requested:'Solicitado',recommended:'Recomendado',approvedReference:'Referência aprovada',contracted:'Contratado',realized:'Realizado'}[key]}</small><strong>{total.total===null?'Não informado':money(total.total)}</strong></div>)}</div>}
 {value.actions.map(a=><p key={a.id}>Ação: {a.action} · {a.owner} · {a.deadline} · {a.status} · {a.tracking}</p>)}
 {value.followups.map((f,i)=><p key={i}>Acompanhamento: {f.nextAction} · {f.owner} · {f.deadline} · {f.amount===null?'Valor a confirmar':money(f.amount)} · {f.reason}</p>)}
 <p className="muted">{value.status} · {value.recordedBy} · {value.recordedAt}</p></>;
 return <section className="budget-section"><h3>Fechamento de {c.month} · {c.status}</h3>{report(c)}{c.history?.length?<details><summary>Versões anteriores preservadas ({c.history.length})</summary>{c.history.map((h,i)=><article className="item-form" key={i}>{report(h)}</article>)}</details>:null}</section>;
}
