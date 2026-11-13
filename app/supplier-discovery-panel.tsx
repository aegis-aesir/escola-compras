'use client';
import { useId } from 'react';
import {Search, Store, Tags} from 'lucide-react';
import type { Purchase, Snapshot } from './model';
import { categoryKey, categoryOptions, matchingSuppliers, requestSupplierCategories, supplierCategoryForItem, supplierSearchTerms } from './supplier-discovery';
import { jobLabels } from './integration-model';
import { isGoogleMapsUrl } from '../integrations/openclaw/search-utils.mjs';

type Props={request:Purchase;data:Snapshot;busy:boolean;onSave:(value:unknown)=>Promise<boolean>};
const date=(value:string)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
export default function SupplierDiscoveryPanel({request:r,data,busy,onSave}:Props) {
  const listId=useId();
  const categories=requestSupplierCategories(r);
  const scope=r.status==='national'?'national':'local';
  const active=!!r.generalApproval&&['quoting','national'].includes(r.status);
  const editable=['estimating','pending','admin_review','general_review','quoting','national'].includes(r.status);
  const missing=r.items.some(i=>!supplierCategoryForItem(i));
  const jobs=(data.integrations?.jobs||[]).filter(j=>j.requestId===r.id&&['local_supplier_search','national_search'].includes(j.type));
  return <section className="integration-research">
    <h3>Fornecedores por categoria</h3>
    <p className="muted">O sistema considera o item e o segmento comercial: material de manutenção procura lojas; instalação e mão de obra procuram prestadores. Primeiro consulta o cadastro interno; sem fornecedor adequado, pesquisa na internet, priorizando o Google Maps em Manaus.</p>
    {editable&&<details open={missing}><summary><Tags size={16}/>{missing?'Definir categorias dos itens':'Conferir ou ajustar categorias'}</summary>
      <form key={JSON.stringify(r.items.map(i=>i.category))} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await onSave({action:'supplier_categories',id:r.id,version:r.version,categories:r.items.map((_,i)=>f.get('category'+i))})}}>
        <datalist id={listId}>{categoryOptions(data.suppliers).map(c=><option key={c} value={c}/>)}</datalist>
        {r.items.map((item,i)=><label className="field" key={i}><span>{item.name} — categoria</span><input name={'category'+i} list={listId} defaultValue={item.category||''} required minLength={2} maxLength={100} placeholder="Ex.: Papelaria"/></label>)}
        <p className="muted">Diferencie Materiais de construção de Serviços de manutenção quando Manutenção for ambígua. O segmento de busca não reescreve o pedido original; salvar aqui altera apenas a categoria conferida, sem mudar descrição, quantidades ou aprovações.</p>
        <button className="button secondary" disabled={busy}>Salvar categorias</button>
      </form>
    </details>}
    {!active?<p className="note">A busca de fornecedores é iniciada após a aprovação da necessidade. Fornecedores nacionais entram na etapa nacional.</p>:<>
      {categories.map(({category})=>{const matches=matchingSuppliers(data.suppliers,category,scope);return <div className="source-row" key={categoryKey(category)}>
        <strong>{category} · {scope==='local'?'Manaus':'Nacional'}</strong>
        {matches.length?<><p>{matches.length} fornecedor(es) no cadastro interno com segmento compatível. A busca externa não é necessária para este segmento.</p>{matches.map(s=><p key={s.id}><b>{s.name}</b> · {s.phone}</p>)}</>:<p>Nenhum fornecedor cadastrado nesta categoria e abrangência. A ponte buscará fontes na internet.</p>}
        {scope==='local'&&<a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(supplierSearchTerms(r,category)+' Manaus AM')} target="_blank" rel="noopener noreferrer">Abrir busca no Google Maps ↗</a>}
      </div>})}
      {!!categories.length&&<button className="button secondary" disabled={busy} onClick={()=>onSave({action:'research',id:r.id,version:r.version})}>Consultar cadastro e buscar categorias sem fornecedor</button>}
      <p className="muted">Um link para abrir a busca no Maps não é um fornecedor encontrado. As fontes retornadas aparecem abaixo; confira localização e atendimento aos itens.</p>
    </>}
    {jobs.map(job=><details className="source-row" key={job.id} open={job.state==='review'}><summary><Search size={16}/>{job.category||'Pesquisa anterior'} · {job.type==='local_supplier_search'?'Manaus':'Nacional'} · {jobLabels[job.state]}</summary>
      <small>{job.researchedAt?'Pesquisado em '+date(job.researchedAt):'Solicitado em '+date(job.createdAt)}</small>
      {job.error&&<p className="note">{job.error}</p>}
      {job.state==='failed'&&active&&<button className="text-button" disabled={busy} onClick={()=>onSave({action:'retry_integration',id:job.id,version:job.version})}>Tentar busca novamente</button>}
      {job.sources?.length===0&&<p>Nenhuma fonte encontrada. Confira a categoria e consulte o Maps manualmente.</p>}
      {job.sources?.map((source,index)=><div className="research-source" key={source.url+index}>
        <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>
        <small>{isGoogleMapsUrl(source.url)?'Resultado do Google Maps':'Fonte da web — conferir fornecedor e localização'}</small>
        <p>{source.description}</p>
        {active&&job.state==='review'&&job.category&&categories.some(c=>categoryKey(c.category)===categoryKey(job.category!))&&<details><summary><Store size={16}/> Cadastrar fornecedor após conferir esta fonte</summary>
          <form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);if(await onSave({action:'register_discovered_supplier',jobId:job.id,sourceIndex:index,data:{name:f.get('name'),phone:f.get('phone'),contact:f.get('contact')}}))form.reset()}}>
            <label className="field"><span>Nome da empresa confirmado na fonte</span><input name="name" required minLength={2} maxLength={150}/></label>
            <label className="field"><span>WhatsApp confirmado, com DDI e DDD</span><input name="phone" required pattern="\+?[1-9][0-9]{9,14}" placeholder="5592999999999"/></label>
            <label className="field"><span>Pessoa de contato (opcional)</span><input name="contact" maxLength={100}/></label>
            <label className="field"><span><input type="checkbox" required/> Conferi que a empresa atende ao segmento {job.category} e {job.type==='local_supplier_search'?'a localização em Manaus':'o atendimento com entrega para Manaus'}.</span></label>
            <button className="button secondary" disabled={busy}>Salvar fornecedor com fonte e data</button>
          </form>
        </details>}
      </div>)}
    </details>)}
  </section>;
}
