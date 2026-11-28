'use client';
import type {EstimateSettingsValue,Snapshot} from './model';
import {freightPercentLabel} from './estimate-lines';
import {brazilStates,currentIcmsTable,icmsRateLabel,icmsTableLabel,originUfs,type IcmsTable} from './estimate-icms';
import {schoolFreightDestinationLabel} from './school-destination';

// Configuração da estimativa pelo Master (E1, ticket 06): percentual padrão de frete, com
// histórico de autoria e data. O CEP comercial é constante do sistema (ticket 07) e aparece
// só para leitura; entradas antigas do histórico com CEP continuam exibidas como foram salvas.
// Ticket 08: tabela de ICMS por vigência e chave do cálculo, no mesmo histórico.
const when=(at:string)=>new Date(at).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
const describe=(v:EstimateSettingsValue)=>'icmsEnabled' in v||v.icmsTable
  ?`ICMS ${v.icmsEnabled?'ligado':'desligado'}${v.icmsTable?' · '+icmsTableLabel(v.icmsTable):''}`
  :`${v.schoolCep?'CEP '+v.schoolCep+' · ':''}frete ${typeof v.freightPercent==='number'?freightPercentLabel(v.freightPercent):'não configurado'}`;
// Sugestão inicial só para preencher a tela quando ainda não há tabela salva: conferir com o
// contador. O cálculo usa exclusivamente a tabela salva pelo Master.
const southSoutheast=['SP','RJ','MG','PR','SC','RS'];
const suggestedIcmsTable:Pick<IcmsTable,'internalRate'|'interstate'|'exceptions'>={internalRate:20,interstate:Object.fromEntries(originUfs.map(u=>[u,southSoutheast.includes(u)?7:12])),exceptions:[{label:'Produto importado',rate:4}]};
const num=(v:FormDataEntryValue|null)=>Number(String(v||'').replace(',','.'));
export default function EstimateSettingsPanel({data,busy,onSave}:{data:Snapshot;busy:boolean;onSave:(value:unknown)=>Promise<boolean>}){
  if(data.me.role!=='admin')return null;
  const s=data.settings,history=[...(s.estimateSettingsHistory||[])].reverse();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
  const tables=s.icmsTables||[],current=currentIcmsTable(tables,today),latest=[...tables].sort((a,b)=>b.validFrom.localeCompare(a.validFrom))[0];
  const base=latest||suggestedIcmsTable,exceptions=[...(base.exceptions||[]),{label:'',rate:NaN},{label:'',rate:NaN}].slice(0,Math.max(3,(base.exceptions||[]).length+1));
  const enabled=s.icmsEnabled===true;
  return <section className="panel padded" aria-label="Configuração da estimativa"><h2>Estimativa: CEP, frete e ICMS</h2>
    <p className="muted">A pesquisa automática simula o frete na loja onde o preço foi encontrado, até o CEP comercial da escola e com a quantidade pedida. Quando a loja não mostra o frete, o percentual padrão calcula o frete sobre o valor do produto, marcado a conferir. Sem frete da loja e sem percentual, o frete fica pendente e deve ser informado manualmente. Assinaturas digitais não têm frete.</p>
    <p><strong>CEP comercial da escola:</strong> {schoolFreightDestinationLabel} <small className="muted">— fixo no sistema, não editável.</small></p>
    <form key={String(s.freightPercent)} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const percent=String(f.get('freightPercent')||'').trim();await onSave({action:'estimate_settings',data:percent?{freightPercent:Number(percent.replace(',','.'))}:{}})}}>
      <label className="field"><span>Percentual padrão de frete (%)</span><input name="freightPercent" type="number" min="0" max="100" step="0.01" defaultValue={s.freightPercent??''}/></label>
      <button className="button primary" disabled={busy}>Salvar configuração da estimativa</button>
    </form>
    <section aria-label="ICMS estimado"><h3>ICMS estimado (diferença de alíquota)</h3>
      <p className="muted">Nas compras de outro estado, a escola paga a diferença de alíquota (DIFAL). O ICMS estimado de cada item é a alíquota interna do Amazonas menos a interestadual da UF de origem, sobre produto + frete. Loja do Amazonas e assinaturas digitais: não se aplica. É referência de custo, não apuração fiscal. Com o cálculo desligado, a linha fica aguardando contador e não impede o envio à Diretoria Geral.</p>
      <p><strong>Cálculo do ICMS:</strong> {enabled?'ligado':'desligado (aguardando contador)'} · {current?'Vigente: '+icmsTableLabel(current):'Nenhuma tabela vigente hoje.'}</p>
      <div className="actions"><button type="button" className="button secondary" disabled={busy||!enabled&&!current} title={!enabled&&!current?'Salve uma tabela vigente antes de ligar.':undefined} onClick={()=>void onSave({action:'icms_settings',data:{enabled:!enabled}})}>{enabled?'Desligar cálculo do ICMS':'Ligar cálculo do ICMS'}</button></div>
      <form key={(latest?.savedAt||'sugestao')+String(enabled)} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);
        const interstate=Object.fromEntries(originUfs.flatMap(u=>{const v=String(f.get('icms_'+u)||'').trim();return v?[[u,num(v)]]:[]}));
        const saved=exceptions.flatMap((_,k)=>{const label=String(f.get('exLabel'+k)||'').trim(),rate=String(f.get('exRate'+k)||'').trim();return label&&rate?[{label,rate:num(rate)}]:[]});
        await onSave({action:'icms_settings',data:{enabled,table:{validFrom:String(f.get('validFrom')||''),internalRate:num(f.get("internalRate")),interstate,exceptions:saved}}})}}>
        {!latest&&<p className="note"><strong>Valores sugeridos — conferir com o contador.</strong> Interna do AM 20%; interestadual 7% para origens do Sul e Sudeste (exceto ES) e 12% para as demais; importados 4%. Nada é calculado até o Master salvar a tabela.</p>}
        <label className="field"><span>Vigência a partir de</span><input name="validFrom" type="date" required defaultValue={latest&&latest.validFrom>today?latest.validFrom:today}/></label>
        <label className="field"><span>Alíquota interna do Amazonas (%)</span><input name="internalRate" type="number" min="0" max="100" step="0.01" required defaultValue={base.internalRate}/></label>
        <fieldset className="budget-section"><legend>Alíquota interestadual por UF de origem (%)</legend>
          {originUfs.map(u=><label className="field" key={u}><span>{u} — {brazilStates[u]}</span><input name={'icms_'+u} type="number" min="0" max="100" step="0.01" defaultValue={base.interstate[u]??''}/></label>)}
        </fieldset>
        <fieldset className="budget-section"><legend>Exceções (opcional, ex.: importados)</legend>
          {exceptions.map((x,k)=><div key={k} className="item-form"><label className="field"><span>Descrição</span><input name={'exLabel'+k} defaultValue={x.label}/></label><label className="field"><span>Alíquota interestadual (%)</span><input name={'exRate'+k} type="number" min="0" max="100" step="0.01" defaultValue={Number.isFinite(x.rate)?x.rate:''}/></label></div>)}
        </fieldset>
        <button className="button primary" disabled={busy}>Salvar tabela de ICMS</button>
      </form>
      {tables.length>0&&<details><summary>Tabelas de ICMS salvas ({tables.length})</summary>{[...tables].reverse().map(t=><div className="source-row" key={t.validFrom}><strong>{icmsTableLabel(t)}{t===current?' · vigente':''}</strong><small>{Object.entries(t.interstate).map(([u,v])=>u+' '+icmsRateLabel(v!)).join(' · ')}{t.exceptions?.length?' · exceções: '+t.exceptions.map(x=>x.label+' '+icmsRateLabel(x.rate)).join(', '):''}</small><small>{t.savedBy} · {when(t.savedAt)}</small></div>)}</details>}
    </section>
    {history.length>0&&<details><summary>Histórico da configuração ({history.length})</summary>{history.map((h,k)=><div className="source-row" key={k}><strong>{describe(h.previous)} → {describe(h.next)}</strong><small>{h.actor} · {when(h.at)}</small></div>)}</details>}
  </section>;
}
