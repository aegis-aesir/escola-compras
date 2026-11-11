import type {Purchase,Snapshot} from './model';
import {InvoiceReadOnly} from './finance-readonly';

export default function RequestArchiveDetails({request,data}:{request:Purchase;data:Snapshot}){
 const invoices=(data.budgetRecords||[]).filter(record=>record.kind==='budget_invoice'&&record.data.requestId===request.id);
 const jobs=data.integrations?.jobs.filter(job=>job.requestId===request.id)||[];
 const messages=data.integrations?.inbox.filter(message=>message.requestId===request.id)||[];
 return <>
 {invoices.length>0&&<details className="budget-details"><summary>Documentos fiscais e pagamentos preservados ({invoices.length})</summary>{invoices.map(record=>record.kind==='budget_invoice'&&<InvoiceReadOnly key={record.id} invoice={record.data}/>)}</details>}
 {jobs.length>0&&<details className="budget-details"><summary>Histórico das pesquisas e tarefas ({jobs.length})</summary>{jobs.map(job=><article className="note" key={job.id}><b>{job.query||job.supplierName||'Tarefa do pedido'}</b><p>{job.state} · {new Date(job.createdAt).toLocaleString('pt-BR',{timeZone:'America/Manaus'})}</p>{job.message&&<p style={{whiteSpace:'pre-wrap'}}>{job.message}</p>}{job.analysisReason&&<p>{job.analysisReason}</p>}{job.error&&<p>{job.error}</p>}{job.sources?.map((source,i)=><p key={i}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title||source.url}</a></p>)}{job.providerMessageId&&<small>Identificação do envio: {job.providerMessageId}</small>}</article>)}</details>}
 {messages.length>0&&<details className="budget-details"><summary>Respostas recebidas e conferências ({messages.length})</summary>{messages.map(message=><article className="note" key={message.id}><b>{message.from} · {new Date(message.receivedAt).toLocaleString('pt-BR',{timeZone:'America/Manaus'})}</b><p style={{whiteSpace:'pre-wrap'}}>{message.text}</p>{message.note&&<p>Conferência: {message.note} · {message.reviewedBy}</p>}</article>)}</details>}
 </>;
}
