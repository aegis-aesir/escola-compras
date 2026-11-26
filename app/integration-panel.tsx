'use client';
import {useState} from 'react';
import {money,type Snapshot,type Purchase} from './model';
import EstimateCriteriaPanel from './estimate-criteria-panel';
import {isCurrentEstimateJob} from './estimate-criteria';
import {estimateProgress} from './estimate-progress';
import {classifyEvidence} from '../integrations/openclaw/price-evidence.mjs';
import { jobLabels,canCancelQuotationJob,canRemoveQuotationJob,type IntegrationJob } from './integration-model';
import InboxPanel from './inbox-panel';
import QuotationRemovalDialog from './quotation-removal-dialog';
type Props={data:Snapshot;busy:boolean;error?:string;onSave:(value:unknown)=>Promise<boolean>};
const date=(s:string)=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Manaus'});

export function ResearchPanel({data,request:r,busy,onSave}:Props&{request:Purchase}) {
  if(!data.integrations)return null;
  const jobs=data.integrations.jobs.filter(j=>isCurrentEstimateJob(r,j)&&j.state!=='cancelled');
  const progress=estimateProgress(r,jobs);
  if(!jobs.length&&!['estimating','pending','admin_review'].includes(r.status))return null;
  return <section className="integration-research"><h3>Pesquisa automática · OpenClaw</h3>
    <p className="muted">O agente pesquisa-web do OpenClaw analisa as páginas, identifica produto, unidade e preço e devolve as referências para o sistema preencher a estimativa. Quando todos os itens têm resultado, com preço ou pendência de estimativa, encaminha para a revisão da Diretoria Administrativa, que completa os itens pendentes antes de enviar à Diretoria Geral. Valores ambíguos ficam pendentes; estimativas não são propostas comerciais.</p>
    {!r.estimate&&r.status==='estimating'&&<section className="note" aria-label="Resultado da estimativa por item"><h3>{progress.working?'Pesquisa em andamento':'Pesquisa concluída com pendências'}</h3><p>{progress.verified} de {r.items.length} itens com preço validado.</p>{progress.items.map(({item,job,reference,toCheck,subtotal},index)=><div className={toCheck?'source-row estimate-to-check':'source-row'} key={index}><strong>{item.name}</strong>{reference?<><p>{toCheck&&<>A conferir: </>}<b>{money(reference.unitPrice)} / {item.unit}</b> · {item.quantity} {item.unit} · Subtotal: <b>{money(subtotal!)}</b></p><a href={job!.priceEvidence!.url} target="_blank" rel="noopener noreferrer">{job!.priceEvidence!.title} ↗</a><small>Consultado em {date(job!.researchedAt!)}</small>{toCheck&&<small>{toCheck}</small>}</>:<p>{job&&['review','failed'].includes(job.state)?`Preço pendente de validação. ${job.analysisReason||job.error||'Confira as fontes ou refaça a pesquisa.'}`:job?.state==='running'?'Pesquisando este item…':'Aguardando pesquisa deste item.'}</p>}</div>)}{progress.verified>0&&<p><b>Subtotal dos itens com preço: {money(progress.partialTotal)}</b><br/>Frete não incluído. O total da solicitação será calculado após validar todos os itens.</p>}</section>}
    {['admin','administrativo'].includes(data.me.role)&&!r.archived&&['pending','estimating','admin_review'].includes(r.status)&&<EstimateCriteriaPanel key={`${r.id}:${r.version}`} request={r} busy={busy} onSave={onSave}/>}
    {r.status==='pending'&&<p className="note">Revise os critérios acima e use Salvar critérios e iniciar pesquisa automática. A pesquisa só começa após essa confirmação.</p>}
    {!data.integrations.bridgeConfigured&&<p className="note">A ponte ainda precisa ser configurada. As pesquisas ficam guardadas na fila.</p>}
    {jobs.map(j=><div className="source-row" key={j.id}><strong>{r.items[j.itemIndex??0]?.name} · {jobLabels[j.state]}</strong><small>{j.type==='national_search'?'Fornecedores nacionais':'Referências de preço'} · {j.researchedAt?date(j.researchedAt):date(j.createdAt)}</small>
      {j.error&&<p className="muted">{j.error}</p>}
      {j.browserResearch&&<p className="note"><b>Mercado Livre · navegador compras:</b> {j.browserResearch.detail}<br/><small>Verificado em {date(j.browserResearch.checkedAt)}. {j.priceEvidence?.origin==='authenticated_browser'?'Referência extraída da sessão autenticada.':'As demais fontes podem ser páginas públicas.'}</small></p>}
      {j.type==='estimate_search'&&j.state==='review'&&!j.priceEvidence&&<p className="note">Não foi possível confirmar automaticamente produto, unidade e preço nas páginas consultadas. Nenhum valor foi inventado. Confira as fontes ou refaça a pesquisa. {j.analysisReason}</p>}
      {j.priceEvidence&&(()=>{const e=j.item?classifyEvidence(j.item,j.priceEvidence):null;return e?.outcome==='to_check'?<p className="note estimate-to-check">Preço encontrado na página, a conferir pela Diretoria Administrativa. {e.reason}</p>:<p className="note">Preço extraído e validado contra a página. {j.analysisReason}</p>})()}
      {j.sources?.length===0&&<p>Nenhuma fonte encontrada. Ajuste a pesquisa manualmente e registre as referências conferidas.</p>}
      {j.sources?.map((s,i)=><div className="research-source" key={i}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a><p>{s.description}</p></div>)}
    </div>)}
  </section>;
}
export default function IntegrationPanel({data,busy,error,onSave,onRefresh}:Props&{onRefresh:()=>void}) {
  const [cancelSelection,setCancelSelection]=useState<{id:string;version:number}[]>([]);
  const [cancelReason,setCancelReason]=useState('');
  const [showRemoved,setShowRemoved]=useState(false),[removal,setRemoval]=useState<{job:IntegrationJob;restore:boolean}|null>(null);
  const integration=data.integrations;
  if(!integration)return null;
  const recent=!!integration.lastSeenAt&&Date.now()-Date.parse(integration.lastSeenAt)<180000;
  const allJobs=integration.jobs.filter(j=>j.type==='whatsapp_quote'),jobs=allJobs.filter(j=>showRemoved?!!j.removed:!j.removed);
  return <section className="panel padded integration-status">
    <InboxPanel data={data} busy={busy} onSave={onSave}/>
    <details className="inbox-technical"><summary>Cotações preparadas e detalhes técnicos</summary>
    <div className="panel-heading inline"><h2>Conexão OpenClaw</h2><button className="button secondary" disabled={busy} onClick={onRefresh}>Atualizar estado</button></div>
    <p><b>Conta:</b> {integration.accountId} · <b>Número da escola:</b> {integration.schoolPhone}</p>
    <div className="note"><b>{integration.bridgeConfigured?'Acesso da ponte configurado':'Acesso da ponte pendente'}</b><br/>{recent?'Último contato da ponte há menos de 3 minutos.':'Sem contato recente da ponte.'}{integration.lastSeenAt&&<> Último contato: {date(integration.lastSeenAt)}.</>}<br/>{integration.sendingEnabled?'Envio liberado no servidor; também depende da ativação na ponte.':'Envio de WhatsApp desativado no servidor.'}</div>
    <p className="muted">A pesquisa usa a ferramenta web_search do OpenClaw. O processamento com o painel fechado depende da ponte em execução. Credenciais são configuradas fora do painel.</p>
    <p className="note"><b>Pesquisa no Mercado Livre:</b> entre na sua conta no navegador OpenClaw, perfil compras. Depois, abra o pedido e use “Refazer pesquisa de preços”. O resultado informa se a sessão foi reconhecida. Senhas e cookies ficam no computador.</p><h3>Cotações preparadas</h3>
    {!jobs.length&&<p className="muted">Abra um pedido aprovado para preparar uma cotação ao fornecedor.</p>}
    <div className="actions"><button type="button" className="button secondary" disabled={busy} aria-pressed={showRemoved} onClick={()=>{setShowRemoved(!showRemoved);setCancelSelection([])}}>{showRemoved?'Voltar às cotações ativas':`Lixeira de cotações (${allJobs.filter(j=>j.removed).length})`}</button></div>
    {['admin','administrativo'].includes(data.me.role)&&jobs.some(canCancelQuotationJob)&&<form className="note" onSubmit={async e=>{e.preventDefault();if(await onSave({action:'cancel_quotation_jobs',jobs:cancelSelection,reason:cancelReason})){setCancelSelection([]);setCancelReason('')}}}>
      <h3>Cancelar cotações preparadas</h3><p>Marque somente as tarefas que deseja cancelar. O histórico e as mensagens serão preservados. Tarefas já tentadas ou com envio incerto exigem conferência.</p>
      {jobs.filter(canCancelQuotationJob).map(j=><label className="check" key={j.id}><input type="checkbox" disabled={busy} checked={cancelSelection.some(s=>s.id===j.id)} onChange={e=>setCancelSelection(s=>e.target.checked?[...s,{id:j.id,version:j.version}]:s.filter(a=>a.id!==j.id))}/><span>{data.requests.find(r=>r.id===j.requestId)?.code} · {j.supplierName} · {j.target} · {jobLabels[j.state]}</span></label>)}
      <label className="field"><span>Motivo do cancelamento</span><textarea required minLength={5} maxLength={2000} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} disabled={busy}/></label>
      <button className="button secondary" disabled={busy||!cancelSelection.length}>Cancelar {cancelSelection.length} tarefa(s) selecionada(s)</button>
    </form>}
    {jobs.map(j=><details className="source-row" key={j.id}><summary>{data.requests.find(r=>r.id===j.requestId)?.code} · {j.supplierName} · {jobLabels[j.state]}</summary><p>{j.target} · {date(j.updatedAt)}</p><pre className="integration-message">{j.message}</pre>{j.providerMessageId&&<p>Identificador de envio: {j.providerMessageId}</p>}{j.error&&<p className="note">{j.error}</p>}{['admin','administrativo'].includes(data.me.role)&&(j.removed?<><p className="muted">Excluída por {j.removed.by}. {j.removed.reason}</p><button className="button secondary" disabled={busy} onClick={()=>setRemoval({job:j,restore:true})}>Restaurar cotação</button></>:canRemoveQuotationJob(j)&&<button className="button secondary" disabled={busy} onClick={()=>setRemoval({job:j,restore:false})}>Excluir cotação</button>)}</details>)}
    {removal&&<QuotationRemovalDialog job={removal.job} code={data.requests.find(r=>r.id===removal.job.requestId)?.code||removal.job.requestId} restore={removal.restore} busy={busy} error={error} onSave={onSave} onClose={()=>setRemoval(null)}/>}
    </details>
  </section>;
}
