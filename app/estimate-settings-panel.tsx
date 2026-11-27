'use client';
import type {Snapshot} from './model';
import {freightPercentLabel} from './estimate-lines';

// Configuração da estimativa pelo Master (E1, ticket 06): CEP comercial da escola e
// percentual padrão de frete. Cada alteração fica no histórico, com autoria e data.
const when=(at:string)=>new Date(at).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
const describe=(v:{schoolCep?:string;freightPercent?:number})=>`CEP ${v.schoolCep||'não informado'} · frete ${typeof v.freightPercent==='number'?freightPercentLabel(v.freightPercent):'não configurado'}`;
export default function EstimateSettingsPanel({data,busy,onSave}:{data:Snapshot;busy:boolean;onSave:(value:unknown)=>Promise<boolean>}){
  if(data.me.role!=='admin')return null;
  const s=data.settings,history=[...(s.estimateSettingsHistory||[])].reverse();
  return <section className="panel padded" aria-label="Configuração da estimativa"><h2>Estimativa: CEP e frete</h2>
    <p className="muted">O percentual padrão calcula o frete estimado de cada item sobre o valor do produto, marcado a conferir para a Diretoria Administrativa. Sem percentual, o frete fica pendente e deve ser informado manualmente. Assinaturas digitais não têm frete.</p>
    <form key={JSON.stringify([s.schoolCep,s.freightPercent])} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const cep=String(f.get('schoolCep')||'').trim(),percent=String(f.get('freightPercent')||'').trim();await onSave({action:'estimate_settings',data:{...(cep?{schoolCep:cep}:{}),...(percent?{freightPercent:Number(percent.replace(',','.'))}:{})}})}}>
      <label className="field"><span>CEP comercial da escola</span><input name="schoolCep" inputMode="numeric" pattern="\d{5}-?\d{3}" placeholder="00000-000" defaultValue={s.schoolCep||''}/></label>
      <label className="field"><span>Percentual padrão de frete (%)</span><input name="freightPercent" type="number" min="0" max="100" step="0.01" defaultValue={s.freightPercent??''}/></label>
      <button className="button primary" disabled={busy}>Salvar configuração da estimativa</button>
    </form>
    {history.length>0&&<details><summary>Histórico da configuração ({history.length})</summary>{history.map((h,k)=><div className="source-row" key={k}><strong>{describe(h.previous)} → {describe(h.next)}</strong><small>{h.actor} · {when(h.at)}</small></div>)}</details>}
  </section>;
}
