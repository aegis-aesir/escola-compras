'use client';
import {money,type Purchase} from './model';
import {estimateEditableOrigins,estimateFreight,freightPercentLabel,type EstimateLine,type EstimateView} from './estimate-lines';
import {defaultEstimateCriteria,savedItemCriteria} from './estimate-criteria';
import {schoolFreightDestinationLabel} from './school-destination';

// Revisão da estimativa por item (E1, ticket 03): origem de cada valor, preenchimento só dos
// itens sem preço automático e histórico de quem preencheu.
const when=(at:string)=>new Date(at).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
const day=(d?:string)=>d?.split('-').reverse().join('/');
export function originLabel(l:EstimateLine){
  const by=l.author&&l.author!=='Sistema'?' · '+l.author+' · '+when(l.at):'';
  return {automatic:'Automático',to_check:'A conferir',accepted:'Aceito'+by,manual:'Manual'+by,not_applicable:'Não se aplica',awaiting_accountant:'Aguardando contador',pending:'Pendência'}[l.origin];
}

export function EstimateSources({request:r,estimate}:{request:Purchase;estimate:EstimateView}){
  return <>{estimate.lines.filter(l=>l.kind==='product'&&l.value!==null).map(l=>{const i=l.itemIndex!;return <div className={l.origin==='to_check'?'source-row estimate-to-check':'source-row'} key={i}><strong>{r.items[i]?.name}: {money(l.value!)} / {r.items[i]?.unit}</strong><a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">{l.sourceName} ↗</a><small>Origem: {originLabel(l)} · Consulta em {day(l.researchedOn)}</small>{(l.origin==='to_check'||l.origin==='accepted')&&l.reason&&<small>{l.reason}</small>}</div>})}</>;
}

export function EstimateItemFill({request:r,estimate,busy,send,freightPercent}:{request:Purchase;estimate:EstimateView;busy:boolean;send:(action:string,extra?:object)=>Promise<boolean>;freightPercent?:number}){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
  const editable=estimate.lines.filter(l=>l.kind==='product'&&estimateEditableOrigins.includes(l.origin));
  const history=(r.estimateEditHistory||[]).filter(h=>h.at>=estimate.recordedAt);
  const form=(l:EstimateLine)=>{const i=l.itemIndex!,item=r.items[i];return <form className="decision-box" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await send('estimate_item',{entries:[{itemIndex:i,unitPrice:Number(f.get('price'+i)),sourceName:String(f.get('name'+i)||''),sourceUrl:String(f.get('url'+i)||''),researchedOn:String(f.get('date'+i)||'')}]})}}>
    <label className="field"><span>Preço de referência por {item?.unit} (R$)</span><input name={'price'+i} required type="number" min="0.01" step="0.01" defaultValue={l.value??undefined}/></label>
    <label className="field"><span>Loja ou fonte</span><input name={'name'+i} required minLength={2} defaultValue={l.origin==='manual'?l.sourceName:undefined}/></label>
    <label className="field"><span>Link da fonte</span><input type="url" name={'url'+i} required placeholder="https://…" defaultValue={l.origin==='manual'?l.sourceUrl:undefined}/></label>
    <label className="field"><span>Data da consulta</span><input type="date" name={'date'+i} required max={today} defaultValue={l.origin==='manual'?l.researchedOn:today}/></label>
    <button className="button primary" disabled={busy}>Salvar preço deste item</button></form>};
  // Ticket 04: refazer só a busca do item, com o critério salvo ou o padrão do pedido.
  const redo=(i:number)=>{const saved=savedItemCriteria(r,i);const criteria=saved?{searchName:saved.searchName,minimumRequirements:saved.minimumRequirements,allowSimilar:saved.allowSimilar,brandPolicy:saved.brandPolicy,brandModel:saved.brandModel}:defaultEstimateCriteria(r.items[i]);return send('research_item',{itemIndex:i,criteria})};
  const value=(l:EstimateLine)=>l.searchRevision?'busca em andamento':l.origin==='not_applicable'?'não se aplica':l.value===null?'pendência':money(l.value);
  const label=(h:NonNullable<Purchase['estimateEditHistory']>[number])=>h.kind==='freight'?(h.action==='accept'?'frete a conferir aceito':h.action==='freight_percent'?'frete calculado pelo percentual':h.action==='research_result'?'frete da loja na nova busca':'frete informado · '+h.line.sourceName):h.action==='research'?'nova busca solicitada':h.action==='research_result'?'resultado da nova busca':h.action==='accept'?'valor a conferir aceito':h.line.sourceName;
  const products=estimate.lines.filter(l=>l.kind==='product');
  return <section className="note" aria-label="Revisão da estimativa por item"><h3>Revisão da estimativa</h3><p className="muted">Os preços automáticos permanecem. Informe preço, fonte e link só nos itens com pendência. Valores e fretes a conferir precisam ser aceitos ou substituídos antes do envio à Diretoria Geral. Refazer a busca de um item mantém os demais resultados.</p>
    {editable.map(l=>{const name=r.items[l.itemIndex!]?.name,item=r.items[l.itemIndex!];return l.origin==='manual'
      ?<details key={l.itemIndex}><summary>Corrigir preço manual de {name}</summary>{form(l)}</details>
      :l.origin==='to_check'
      ?<div key={l.itemIndex} className="decision-box estimate-to-check" role="group" aria-label={'Valor a conferir de '+name}><h4>A conferir: {name} — {money(l.value!)} / {item?.unit}</h4>{l.reason&&<p>{l.reason}</p>}{l.sourceUrl&&<a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">{l.sourceName||l.sourceUrl} ↗</a>}<div className="actions"><button type="button" className="button primary" disabled={busy} onClick={()=>void send('accept_estimate_item',{itemIndex:l.itemIndex})}>Aceitar valor de {name}</button></div><details><summary>Substituir por valor manual</summary>{form(l)}</details></div>
      :<div key={l.itemIndex}><h4>Informar preço de {name}</h4>{l.searchRevision?<small><strong>Busca em andamento.</strong> Se você informar o preço agora, ele prevalece sobre o resultado da busca.</small>:l.reason&&<small>{l.reason}</small>}{form(l)}</div>})}
    <EstimateFreightFill request={r} estimate={estimate} busy={busy} send={send} freightPercent={freightPercent}/>
    <div className="actions">{products.map(l=>{const i=l.itemIndex!;return <button type="button" key={i} className="button secondary" disabled={busy||!!l.searchRevision} onClick={()=>void redo(i)}>{l.searchRevision?'Busca em andamento: '+r.items[i]?.name:'Refazer busca de '+r.items[i]?.name}</button>})}</div>
    {history.length>0&&<details><summary>Histórico do preenchimento ({history.length})</summary>{history.map((h,k)=><div className="source-row" key={k}><strong>{h.kind==='freight'?'Frete de ':''}{r.items[h.itemIndex]?.name}: {value(h.previous)} → {value(h.line)}</strong><small>{h.actor} · {when(h.at)} · {label(h)}</small></div>)}</details>}
  </section>;
}

// Frete estimado por item (tickets 06 e 07): o frete da loja comprovado fica só para
// leitura; o a conferir (da loja ou por percentual) é aceito com um clique ou substituído
// por valor manual; o percentual atual recalcula só os fretes que não vieram da loja.
function EstimateFreightFill({request:r,estimate,busy,send,freightPercent}:{request:Purchase;estimate:EstimateView;busy:boolean;send:(action:string,extra?:object)=>Promise<boolean>;freightPercent?:number}){
  if(r.form?.kind==='digital')return null;
  const lines=r.items.map((_,i)=>estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===i));
  const priced=(i:number)=>estimate.lines.find(p=>p.kind==='product'&&p.itemIndex===i)?.value!=null;
  const recalc=typeof freightPercent==='number'&&r.items.some((item,i)=>{const l=lines[i];return !item.subscription&&priced(i)&&(!l||l.origin==='pending'||l.origin==='to_check'&&l.freightSource!=='store'&&l.freightPercent!==freightPercent)});
  const form=(i:number,l?:EstimateLine)=><form className="decision-box" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const url=String(f.get('freightUrl'+i)||'');await send('estimate_freight',{entries:[{itemIndex:i,value:Number(f.get('freight'+i)),sourceName:String(f.get('freightSource'+i)||''),...(url?{sourceUrl:url}:{})}]})}}>
    <label className="field"><span>Frete estimado do item (R$)</span><input name={'freight'+i} required type="number" min="0" step="0.01" defaultValue={l?.value??undefined}/></label>
    <label className="field"><span>Fonte ou justificativa do frete</span><input name={'freightSource'+i} required minLength={2} defaultValue={l?.origin==='manual'?l.sourceName:undefined}/></label>
    <label className="field"><span>Link da fonte (opcional)</span><input type="url" name={'freightUrl'+i} placeholder="https://…" defaultValue={l?.origin==='manual'?l.sourceUrl:undefined}/></label>
    <button className="button primary" disabled={busy}>Salvar frete deste item</button></form>;
  return <div aria-label="Frete estimado por item"><h4>Frete estimado</h4><p className="muted">Frete simulado na loja do preço até o {schoolFreightDestinationLabel}, com a quantidade pedida. {typeof freightPercent==='number'?`Sem frete da loja: percentual padrão configurado pelo Master, ${freightPercentLabel(freightPercent)} sobre o valor do produto.`:'Sem frete da loja: percentual padrão de frete ainda não configurado pelo Master. Informe o frete manualmente ou peça a configuração.'}</p>
    {recalc&&<div className="actions"><button type="button" className="button secondary" disabled={busy} onClick={()=>void send('estimate_freight_percent')}>Calcular frete pelo percentual ({freightPercentLabel(freightPercent!)})</button></div>}
    {r.items.map((item,i)=>{const l=lines[i];
      if(l?.origin==='not_applicable'||item.subscription)return null;
      const source=l?.freightSource==='store'&&l.sourceUrl?<a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">{l.sourceName||l.sourceUrl} ↗</a>:null;
      if(l?.origin==='automatic')return <div key={i} className="source-row" role="group" aria-label={'Frete da loja de '+item.name}><strong>Frete da loja: {item.name} — {money(l.value!)}</strong>{source}{l.reason&&<small>{l.reason}</small>}</div>;
      if(l?.origin==='to_check')return <div key={i} className="decision-box estimate-to-check" role="group" aria-label={'Frete a conferir de '+item.name}><h5>Frete a conferir: {item.name} — {money(l.value!)}</h5>{l.reason&&<p>{l.reason}</p>}{source}<div className="actions"><button type="button" className="button primary" disabled={busy} onClick={()=>void send('accept_estimate_item',{itemIndex:i,kind:'freight'})}>Aceitar frete de {item.name}</button></div><details><summary>Substituir frete por valor manual</summary>{form(i,l)}</details></div>;
      if(l?.origin==='manual')return <details key={i}><summary>Corrigir frete manual de {item.name}</summary>{form(i,l)}</details>;
      if(l?.origin==='accepted')return null;
      return <div key={i}><h5>Informar frete de {item.name}</h5><small>{l?.reason||'Frete ainda não calculado para este item.'}</small>{form(i,l)}</div>})}
  </div>;
}

// Composição da estimativa (ticket 06): produtos, frete e total geral em colunas e linhas
// separadas, para a Diretoria Administrativa e a Diretoria Geral. O frete entra uma vez.
export function EstimateComposition({request:r,estimate}:{request:Purchase;estimate:EstimateView}){
  const freightOf=(i:number)=>estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===i);
  const whole=estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===undefined);
  const freight=estimateFreight(estimate),products=Math.round((estimate.total-freight)*100)/100;
  const cell=(l?:EstimateLine)=>!l?'—':l.origin==='not_applicable'?'Não se aplica':l.value===null?'Pendente':money(l.value);
  return <div className="table-scroll"><table className="budget-table estimate-composition"><caption>Composição da estimativa</caption><thead><tr><th>Item</th><th>Produtos</th><th>Frete estimado</th><th>Origem do frete</th></tr></thead><tbody>
    {r.items.map((item,i)=>{const p=estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===i),f=freightOf(i);return <tr key={i}><td>{item.name} · {item.quantity} {item.unit}</td><td>{p?.value!=null?money(Math.round(p.value*item.quantity*100)/100):'Pendente'}</td><td>{whole?'—':cell(f)}</td><td>{whole||!f?'—':originLabel(f)}</td></tr>})}
  </tbody><tfoot><tr><th>Produtos</th><td>{money(products)}</td><td></td><td></td></tr><tr><th>Frete estimado</th><td></td><td>{whole?cell(whole):money(freight)}</td><td>{whole?originLabel(whole):''}</td></tr><tr><th>Total geral</th><td colSpan={3}><strong>{money(estimate.total)}</strong></td></tr></tfoot></table></div>;
}
