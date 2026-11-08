'use client';
import type { Snapshot, Purchase } from './model';
import { jobLabels } from './integration-model';
type Props={data:Snapshot;busy:boolean;onSave:(value:unknown)=>Promise<boolean>};
const date=(s:string)=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Manaus'});

export function ResearchPanel({data,request:r,busy,onSave}:Props&{request:Purchase}) {
  if(!data.integrations)return null;
  const jobs=data.integrations.jobs.filter(j=>j.requestId===r.id&&j.type!=='whatsapp_quote');
  return <section className="integration-research"><h3>Pesquisa automática · OpenClaw</h3>
    <p className="muted">Fontes encontradas precisam de conferência de preço, embalagem, frete e disponibilidade. Não são propostas comerciais.</p>
    {['estimating','pending','national'].includes(r.status)&&<button className="button secondary" disabled={busy} onClick={()=>onSave({action:'research',id:r.id,version:r.version})}>Colocar pesquisa na fila</button>}
    {!data.integrations.bridgeConfigured&&<p className="note">A ponte ainda precisa ser configurada. As pesquisas ficam guardadas na fila.</p>}
    {jobs.map(j=><div className="source-row" key={j.id}><strong>{r.items[j.itemIndex??0]?.name} · {jobLabels[j.state]}</strong><small>{j.type==='national_search'?'Fornecedores nacionais':'Referências de preço'} · {j.researchedAt?date(j.researchedAt):date(j.createdAt)}</small>
      {j.error&&<p className="muted">{j.error}</p>}
      {j.state==='failed'&&<button className="text-button" disabled={busy} onClick={()=>onSave({action:'retry_integration',id:j.id,version:j.version})}>Tentar pesquisa novamente</button>}
      {j.sources?.length===0&&<p>Nenhuma fonte encontrada. Ajuste a pesquisa manualmente e registre as referências conferidas.</p>}
      {j.sources?.map((s,i)=><div className="research-source" key={i}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a><p>{s.description}</p></div>)}
    </div>)}
  </section>;
}
export default function IntegrationPanel({data,busy,onSave,onRefresh}:Props&{onRefresh:()=>void}) {
  const integration=data.integrations;
  if(!integration)return null;
  const recent=!!integration.lastSeenAt&&Date.now()-Date.parse(integration.lastSeenAt)<180000;
  const jobs=integration.jobs.filter(j=>j.type==='whatsapp_quote');
  return <section className="panel padded integration-status">
    <div className="panel-heading inline"><h2>Conexão OpenClaw</h2><button className="button secondary" disabled={busy} onClick={onRefresh}>Atualizar estado</button></div>
    <p><b>Conta:</b> {integration.accountId} · <b>Número da escola:</b> {integration.schoolPhone}</p>
    <div className="note"><b>{integration.bridgeConfigured?'Acesso da ponte configurado':'Acesso da ponte pendente'}</b><br/>{recent?'Último contato da ponte há menos de 3 minutos.':'Sem contato recente da ponte.'}{integration.lastSeenAt&&<> Último contato: {date(integration.lastSeenAt)}.</>}<br/>{integration.sendingEnabled?'Envio liberado no servidor; também depende da ativação na ponte.':'Envio de WhatsApp desativado no servidor.'}</div>
    <p className="muted">A pesquisa usa a ferramenta web_search do OpenClaw. O processamento com o painel fechado depende da ponte em execução. Credenciais são configuradas fora do painel.</p>
    <h3>Cotações preparadas</h3>
    {!jobs.length&&<p className="muted">Abra um pedido aprovado para preparar uma cotação ao fornecedor.</p>}
    {jobs.map(j=><details className="source-row" key={j.id}><summary>{data.requests.find(r=>r.id===j.requestId)?.code} · {j.supplierName} · {jobLabels[j.state]}</summary><p>{j.target} · {date(j.updatedAt)}</p><pre className="integration-message">{j.message}</pre>{j.providerMessageId&&<p>Identificador de envio: {j.providerMessageId}</p>}{j.error&&<p className="note">{j.error}</p>}{j.state==='blocked'&&integration.sendingEnabled&&<button className="button secondary" disabled={busy} onClick={()=>onSave({action:'retry_integration',id:j.id,version:j.version})}>Liberar este rascunho para envio</button>}</details>)}
    <h3>Mensagens recebidas para conferência</h3>
    {!integration.inbox.length&&<p className="muted">Nenhuma mensagem importada. O recebimento depende do hook e da ponte configurados no OpenClaw.</p>}
    {integration.inbox.map(m=><details className="source-row" key={m.id}><summary>{m.from} · {m.state==='review'?'Conferência pendente':'Conferida'} · {date(m.receivedAt)}</summary><p>Pedido: {data.requests.find(r=>r.id===m.requestId)?.code||'Não identificado — conferir manualmente'} · Fornecedor: {data.suppliers.find(s=>s.id===m.supplierId)?.name||'Não identificado'}</p><pre className="integration-message">{m.text}</pre><p className="note">Mensagem do fornecedor é informação recebida. Confira itens, preços, frete, validade e condições antes de registrar a proposta no pedido.</p>{m.state==='review'?<form onSubmit={async e=>{e.preventDefault();const reason=new FormData(e.currentTarget).get('reason');await onSave({action:'review_message',id:m.id,version:m.version,reason})}}><label className="field"><span>Resultado da conferência e referência ao pedido/proposta</span><textarea name="reason" required minLength={5} maxLength={2000}/></label><button className="button secondary" disabled={busy}>Marcar como conferida</button></form>:<p>{m.reviewedBy}: {m.note}</p>}</details>)}
  </section>;
}
