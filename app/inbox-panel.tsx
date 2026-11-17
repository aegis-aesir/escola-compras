'use client';
import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';
import {useState} from 'react';
import {extractProposal} from './inbox-proposals';
import {money,type Snapshot,type Purchase} from './model';
import type {InboxMessage} from './integration-model';
type Props={data:Snapshot;busy:boolean;onSave:(value:unknown)=>Promise<boolean>};
const date=(s:string)=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
const current=(r:Purchase)=>!r.archived&&!!r.generalApproval&&['quoting','national'].includes(r.status);
const originalText=(m:InboxMessage)=>[m.text,...(m.attachments||[]).map(a=>a.extractedText||'')].filter(Boolean).join('\n');

function ProposalEditor({message:m,data,busy,onSave}:Props&{message:InboxMessage}){
 const [requestId,setRequestId]=useState(m.requestId||m.selection?.requestId||'');
 const [supplierId,setSupplierId]=useState(m.supplierId||'');
 const request=data.requests.find(r=>r.id===requestId);
 const supplier=data.suppliers.find(s=>s.id===supplierId);
 const proposal=request?extractProposal(originalText(m),request):undefined;
 const [currency,setCurrency]=useState<string>(m.proposal?.currency||'');
 const matching=data.suppliers.filter(s=>!s.removed&&normalizeContactPhone(s.phone)===m.from);
 return <form className="inbox-editor" onSubmit={async e=>{
  e.preventDefault();if(!request||!supplier)return;
  const fields=new FormData(e.currentTarget),num=(name:string)=>{const v=String(fields.get(name)||'').trim();return v===''?undefined:Number(v)},str=(name:string)=>String(fields.get(name)||'').trim();
  await onSave({action:'confirm_inbox_proposal',id:m.id,version:m.version,requestId:request.id,requestVersion:request.version,supplierVersion:supplier.version,reportedTotal:num('reportedTotal'),discrepancyReason:str('discrepancyReason'),data:{supplierId:supplier.id,prices:request.items.map((_,i)=>num('price'+i)),coverage:request.items.map((_,i)=>num('quantity'+i)),freight:num('freight'),deliveryDays:num('deliveryDays'),conditions:str('conditions'),validUntil:str('validUntil'),otherExpenses:num('otherExpenses'),comparable:fields.get('comparable')==='on',currency,priceBasis:str('priceBasis'),...(num('exchangeRate')!==undefined?{exchangeRate:num('exchangeRate'),exchangeDate:str('exchangeDate')}:{}),commercial:{documentRef:'Mensagem selecionada '+m.messageId,notes:str('notes')}}});
 }}>
  <p className="note">Confira os campos extraídos. Campos vazios não foram informados. Esta mensagem só vira proposta real ao confirmar abaixo.</p>
  {m.link&&<p className="muted">{m.link.reason} {m.link.evidence.join(' · ')}</p>}
  <div className="inbox-form-grid"><label className="field"><span>Pedido aprovado</span><select required value={requestId} disabled={busy} onChange={e=>{setRequestId(e.target.value);if(!currency){const r=data.requests.find(r=>r.id===e.target.value);if(r)setCurrency(extractProposal(originalText(m),r).currency||'')}}}><option value="">Selecionar pedido</option>{data.requests.filter(current).map(r=><option key={r.id} value={r.id}>{r.code} · {r.title}</option>)}</select></label>
  <label className="field"><span>Fornecedor do telefone original</span><select required value={supplierId} disabled={busy} onChange={e=>setSupplierId(e.target.value)}><option value="">Selecionar fornecedor</option>{matching.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
  {!matching.length&&<p className="note">Cadastre e confira este fornecedor com o telefone {m.from} antes de confirmar a proposta. Contatos da agenda não são promovidos automaticamente.</p>}
  {request&&proposal&&<div key={request.id+':'+m.version}>
   {proposal.warnings.length>0&&<ul className="inbox-warnings">{proposal.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
   <div className="table-scroll"><table><thead><tr><th>Item solicitado</th><th>Quantidade ofertada</th><th>Preço unitário</th></tr></thead><tbody>{request.items.map((item,i)=><tr key={i}><td>{item.name}<small className="muted">Solicitado: {item.quantity} {item.unit}</small></td><td><input aria-label={'Quantidade ofertada de '+item.name} name={'quantity'+i} type="number" required min="0" max="100000" step="any" defaultValue={proposal.items[i]?.quantity??''}/></td><td><input aria-label={'Preço unitário de '+item.name} name={'price'+i} type="number" required min="0" max="10000000" step="0.01" defaultValue={proposal.items[i]?.unitPrice??''}/></td></tr>)}</tbody></table></div>
   <div className="inbox-form-grid">
    <label className="field"><span>Moeda</span><select required value={currency} disabled={busy} onChange={e=>setCurrency(e.target.value)}><option value="">Confirmar moeda</option><option value="BRL">BRL · Reais</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="Outra">Outra</option></select></label>
    <label className="field"><span>Base dos preços</span><select name="priceBasis" required defaultValue=""><option value="">Confirmar base</option><option value="term">Total da vigência / compra</option>{request.items.some(i=>i.subscription)&&<option value="cycle">Por ciclo da assinatura</option>}</select></label>
    <label className="field"><span>Frete</span><input name="freight" required type="number" min="0" max="1000000" step="0.01" defaultValue={proposal.freight??''}/></label>
    <label className="field"><span>Outras despesas (se houver)</span><input name="otherExpenses" type="number" min="0" max="1000000" step="0.01"/></label>
    <label className="field"><span>Total informado pelo fornecedor</span><input name="reportedTotal" type="number" min="0" step="0.01" defaultValue={proposal.total??''}/></label>
    <label className="field"><span>Entrega em dias corridos (conferir)</span><input name="deliveryDays" required type="number" min="0" max="365" step="1" defaultValue={proposal.deliveryDays??''}/></label>
    <label className="field"><span>Validade da proposta</span><input name="validUntil" required type="date" defaultValue={proposal.validUntil||''}/></label>
    {currency&&currency!=='BRL'&&<><label className="field"><span>Câmbio para BRL (se conferido)</span><input name="exchangeRate" type="number" min="0.000001" step="any"/></label><label className="field"><span>Data do câmbio</span><input name="exchangeDate" type="date"/></label></>}
   </div>
   {proposal.deliveryText&&<p className="muted">Prazo original: {proposal.deliveryText}</p>}
   <label className="field"><span>Pagamento e condições</span><textarea name="conditions" required minLength={2} maxLength={1000} defaultValue={proposal.conditions||''}/></label>
   <label className="field"><span>Justificativa se o total divergir do cálculo</span><input name="discrepancyReason" maxLength={1000}/></label>
   <label className="field"><span>Observações da conferência</span><textarea name="notes" maxLength={2000}/></label>
   <label className="check"><input name="comparable" type="checkbox"/><span>Conferi a equivalência técnica e considero a proposta comparável ao pedido.</span></label>
   {request.quotes.some(q=>q.supplierId===supplierId)&&<p className="note">Esta confirmação atualiza a proposta do mesmo fornecedor, preservando a versão anterior no histórico.</p>}
   <button className="button" disabled={busy||!supplier}>Confirmar proposta conferida</button>
  </div>}
 </form>;
}
function MessageCard(props:Props&{message:InboxMessage}){
 const {message:m,data,busy,onSave}=props,r=data.requests.find(r=>r.id===m.requestId);
 return <details className="inbox-message-row"><summary><span>{m.state==='review'?'Revisão pendente':'Conferida'} · {date(m.receivedAt)}</span><span>{m.proposal?.total!==undefined?(m.proposal.currency==='BRL'?money(m.proposal.total):String(m.proposal.total)+' '+(m.proposal.currency||'moeda a confirmar')):m.attachments?.length?`${m.attachments.length} anexo(s)`:'Abrir mensagem'}</span></summary>
  <details className="inbox-original"><summary>Ver conteúdo original e indicação</summary><pre className="integration-message">{m.text||'Mensagem sem texto; confira os anexos.'}</pre>{m.selection&&<p className="muted">Indicada por {m.selection.actor} em {date(m.selection.at)}. {m.selection.reason}</p>}{m.attachments?.map(a=><div key={a.id}><a href={'/api/inbox-attachment?message='+encodeURIComponent(m.id)+'&attachment='+encodeURIComponent(a.id)}>{a.name} · {Math.ceil(a.size/1024)} KB</a>{a.extractedText&&<pre className="integration-message">{a.extractedText}</pre>}</div>)}</details>
  {m.protocol==='selected-message-v1'&&m.state==='review'?<ProposalEditor {...props}/>:m.state==='review'?<form onSubmit={async e=>{e.preventDefault();await onSave({action:'review_message',id:m.id,version:m.version,reason:new FormData(e.currentTarget).get('reason')})}}><p className="muted">Histórico legado preservado. Para gerar proposta, indique novamente o conteúdo pelo formulário de importação.</p><label className="field"><span>Nota de conferência</span><textarea name="reason" required minLength={5} maxLength={2000}/></label><button className="button secondary" disabled={busy}>Concluir conferência histórica</button></form>:<p>{m.confirmation?`Proposta confirmada por ${m.confirmation.actor} · ${r?.code||'pedido vinculado'}`:`${m.reviewedBy||''}: ${m.note||'Conferida'}`}</p>}
 </details>;
}
export default function InboxPanel({data,busy,onSave}:Props){
 const [mode,setMode]=useState('pending'),[search,setSearch]=useState(''),[requestFilter,setRequestFilter]=useState('');
 const messages=data.integrations?.inbox||[];
 const pending=messages.filter(m=>m.protocol==='selected-message-v1'&&m.state==='review');
 const visible=messages.filter(m=>(mode==='legacy'?m.protocol!=='selected-message-v1':m.protocol==='selected-message-v1'&&(mode!=='pending'||m.state==='review'))&&(!requestFilter||m.requestId===requestFilter)&&[m.from,m.text,data.requests.find(r=>r.id===m.requestId)?.code,data.suppliers.find(s=>s.id===m.supplierId)?.name].join(' ').toLowerCase().includes(search.toLowerCase()));
 const groups=new Map<string,InboxMessage[]>();for(const m of visible){const id=(m.requestId||'unlinked')+':'+(m.supplierId||m.from);groups.set(id,[...(groups.get(id)||[]),m])}
 return <section className="inbox-panel"><div className="panel-heading inline"><h2>Respostas selecionadas</h2><span>{pending.length} pendência(s)</span></div>
  <p className="muted">Somente conteúdo indicado por você entra nesta caixa. A leitura geral do WhatsApp está desativada.</p>
  <details className="inbox-import"><summary>Importar uma mensagem escolhida</summary><form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);if(await onSave({action:'import_selected_message',supplierId:f.get('supplierId'),text:f.get('text'),receivedOn:f.get('receivedOn'),reason:f.get('reason')}))form.reset()}}><p>Cole somente a mensagem que decidiu importar. Para anexos, selecione os arquivos pela CLI operacional ou use o upload privado do pedido. PDFs e imagens não recebem OCR automático.</p><div className="inbox-form-grid"><label className="field"><span>Fornecedor de origem</span><select name="supplierId" required><option value="">Selecionar fornecedor</option>{data.suppliers.filter(s=>!s.removed).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Data de recebimento</span><input name="receivedOn" type="date" required/></label></div><label className="field"><span>Mensagem escolhida</span><textarea name="text" required maxLength={16000}/></label><label className="field"><span>Motivo da indicação</span><input name="reason" required minLength={5} maxLength={2000}/></label><button className="button secondary" disabled={busy}>Importar somente esta mensagem</button></form></details>
  <div className="inbox-filters"><label className="field"><span>Exibir</span><select value={mode} onChange={e=>setMode(e.target.value)}><option value="pending">Pendências selecionadas</option><option value="selected">Todas as selecionadas</option><option value="legacy">Histórico legado</option></select></label><label className="field"><span>Buscar</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pedido, fornecedor, telefone ou texto"/></label><label className="field"><span>Pedido</span><select value={requestFilter} onChange={e=>setRequestFilter(e.target.value)}><option value="">Todos os pedidos</option>{data.requests.filter(r=>messages.some(m=>m.requestId===r.id)).map(r=><option key={r.id} value={r.id}>{r.code}</option>)}</select></label></div>
  {!visible.length&&<p className="muted">Nenhuma mensagem neste filtro.</p>}
  {[...groups.entries()].map(([id,group])=>{const m=group[0],r=data.requests.find(r=>r.id===m.requestId),s=data.suppliers.find(s=>s.id===m.supplierId);return <section className="inbox-group" key={id}><h3>{r?.code||'Pedido a identificar'} · {s?.name||m.contactName||m.from} <small>{group.length} mensagem(ns)</small></h3>{group.slice().sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)).map(message=><MessageCard key={message.id+':'+message.version} message={message} data={data} busy={busy} onSave={onSave}/>)}</section>})}
 </section>;
}
