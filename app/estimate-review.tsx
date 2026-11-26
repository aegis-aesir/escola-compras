'use client';
import {money,type Purchase} from './model';
import {estimateEditableOrigins,type EstimateLine,type EstimateView} from './estimate-lines';

// Revisão da estimativa por item (E1, ticket 03): origem de cada valor, preenchimento só dos
// itens sem preço automático e histórico de quem preencheu.
const when=(at:string)=>new Date(at).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
const day=(d?:string)=>d?.split('-').reverse().join('/');
export function originLabel(l:EstimateLine){
  const by=l.author&&l.author!=='Sistema'?' · '+l.author+' · '+when(l.at):'';
  return {automatic:'Automático',to_check:'A conferir',accepted:'Aceito'+by,manual:'Manual'+by,not_applicable:'Não se aplica',awaiting_accountant:'Aguardando contador',pending:'Pendência'}[l.origin];
}

export function EstimateSources({request:r,estimate}:{request:Purchase;estimate:EstimateView}){
  return <>{estimate.lines.filter(l=>l.kind==='product'&&l.value!==null).map(l=>{const i=l.itemIndex!;return <div className="source-row" key={i}><strong>{r.items[i]?.name}: {money(l.value!)} / {r.items[i]?.unit}</strong><a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">{l.sourceName} ↗</a><small>Origem: {originLabel(l)} · Consulta em {day(l.researchedOn)}</small></div>})}</>;
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
  return <section className="note" aria-label="Revisão da estimativa por item"><h3>Revisão da estimativa</h3><p className="muted">Os preços automáticos permanecem. Informe preço, fonte e link só nos itens com pendência.</p>
    {editable.map(l=>{const name=r.items[l.itemIndex!]?.name;return l.origin==='manual'
      ?<details key={l.itemIndex}><summary>Corrigir preço manual de {name}</summary>{form(l)}</details>
      :<div key={l.itemIndex}><h4>Informar preço de {name}</h4>{l.reason&&<small>{l.reason}</small>}{form(l)}</div>})}
    {history.length>0&&<details><summary>Histórico do preenchimento ({history.length})</summary>{history.map((h,k)=><div className="source-row" key={k}><strong>{r.items[h.itemIndex]?.name}: {h.previous.value===null?'pendência':money(h.previous.value)} → {money(h.line.value!)}</strong><small>{h.actor} · {when(h.at)} · {h.line.sourceName}</small></div>)}</details>}
  </section>;
}
