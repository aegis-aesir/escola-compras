'use client';
import {money,type Purchase} from './model';
import {estimateEditableOrigins,type EstimateLine,type EstimateView} from './estimate-lines';
import {defaultEstimateCriteria,savedItemCriteria} from './estimate-criteria';

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

export function EstimateItemFill({request:r,estimate,busy,send}:{request:Purchase;estimate:EstimateView;busy:boolean;send:(action:string,extra?:object)=>Promise<boolean>}){
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
  const value=(l:EstimateLine)=>l.searchRevision?'busca em andamento':l.value===null?'pendência':money(l.value);
  const label=(h:NonNullable<Purchase['estimateEditHistory']>[number])=>h.action==='research'?'nova busca solicitada':h.action==='research_result'?'resultado da nova busca':h.action==='accept'?'valor a conferir aceito':h.line.sourceName;
  const products=estimate.lines.filter(l=>l.kind==='product');
  return <section className="note" aria-label="Revisão da estimativa por item"><h3>Revisão da estimativa</h3><p className="muted">Os preços automáticos permanecem. Informe preço, fonte e link só nos itens com pendência. Valores a conferir precisam ser aceitos ou substituídos antes do envio à Diretoria Geral. Refazer a busca de um item mantém os demais resultados.</p>
    {editable.map(l=>{const name=r.items[l.itemIndex!]?.name,item=r.items[l.itemIndex!];return l.origin==='manual'
      ?<details key={l.itemIndex}><summary>Corrigir preço manual de {name}</summary>{form(l)}</details>
      :l.origin==='to_check'
      ?<div key={l.itemIndex} className="decision-box estimate-to-check" role="group" aria-label={'Valor a conferir de '+name}><h4>A conferir: {name} — {money(l.value!)} / {item?.unit}</h4>{l.reason&&<p>{l.reason}</p>}{l.sourceUrl&&<a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">{l.sourceName||l.sourceUrl} ↗</a>}<div className="actions"><button type="button" className="button primary" disabled={busy} onClick={()=>void send('accept_estimate_item',{itemIndex:l.itemIndex})}>Aceitar valor de {name}</button></div><details><summary>Substituir por valor manual</summary>{form(l)}</details></div>
      :<div key={l.itemIndex}><h4>Informar preço de {name}</h4>{l.searchRevision?<small><strong>Busca em andamento.</strong> Se você informar o preço agora, ele prevalece sobre o resultado da busca.</small>:l.reason&&<small>{l.reason}</small>}{form(l)}</div>})}
    <div className="actions">{products.map(l=>{const i=l.itemIndex!;return <button type="button" key={i} className="button secondary" disabled={busy||!!l.searchRevision} onClick={()=>void redo(i)}>{l.searchRevision?'Busca em andamento: '+r.items[i]?.name:'Refazer busca de '+r.items[i]?.name}</button>})}</div>
    {history.length>0&&<details><summary>Histórico do preenchimento ({history.length})</summary>{history.map((h,k)=><div className="source-row" key={k}><strong>{r.items[h.itemIndex]?.name}: {value(h.previous)} → {value(h.line)}</strong><small>{h.actor} · {when(h.at)} · {label(h)}</small></div>)}</details>}
  </section>;
}
