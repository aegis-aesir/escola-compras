'use client';

import {useEffect,useRef,useState} from 'react';
import {Copy,Send} from 'lucide-react';
import {quotationMessageTemplate,type Purchase,type Supplier} from './model';
import type {QuotationContactSelection,QuotationContactsSnapshot} from './quotation-contact-model';
import {filterQuotationChoices,initialQuotationSelection} from './quotation-contact-selection';
import './quotation-contacts.css';

type Props={request:Purchase;suppliers:Supplier[];busy:boolean;error:string;onPrepare:(recipients:QuotationContactSelection[])=>Promise<boolean>};

export default function QuotationMessageForm(props:Props){
 return <QuotationContactMessageForm key={`${props.request.id}:${props.request.version}`} {...props}/>;
}
function QuotationContactMessageForm({request,busy,error,onPrepare}:Props){
 const [snapshot,setSnapshot]=useState<QuotationContactsSnapshot|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[retry,setRetry]=useState(0);
 const [selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState(''),[mode,setMode]=useState<'all'|'recommended'|'selected'>('all'),[page,setPage]=useState(0);
 const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(''),[prepared,setPrepared]=useState(false),[submitting,setSubmitting]=useState(false),[submitError,setSubmitError]=useState('');
 const initialized=useRef(false),submitLock=useRef(false);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  async function load(){
   setLoading(true);setLoadError('');
   try{
    const response=await fetch(`/api/contacts?quotationRequestId=${encodeURIComponent(request.id)}`,{signal:controller.signal,cache:'no-store'});
    const data=await response.json() as QuotationContactsSnapshot & {error?:string};
    if(!response.ok)throw new Error(data.error||'Não foi possível carregar os contatos.');
    if(data.requestId!==request.id||data.requestVersion!==request.version||!Array.isArray(data.choices))throw new Error('A solicitação foi atualizada. Reabra esta janela para conferir os contatos.');
    if(!active)return;
    setSnapshot(data);
    if(!initialized.current){setSelected(initialQuotationSelection(data.choices));initialized.current=true}
   }catch(cause){if(active)setLoadError(cause instanceof Error?cause.message:'Não foi possível carregar os contatos.')}
   finally{if(active)setLoading(false)}
  }
  void load();return()=>{active=false;controller.abort()};
 },[request.id,request.version,retry]);
 const choices=snapshot?.choices||[],selectedKeys=new Set(selected);
 const selectedChoices=choices.filter(choice=>selectedKeys.has(choice.key)&&!choice.disabledReason);
 const filtered=filterQuotationChoices(choices,query,mode,selected),pages=Math.max(1,Math.ceil(filtered.length/25)),currentPage=Math.min(page,pages-1),visible=filtered.slice(currentPage*25,currentPage*25+25);
 const locked=busy||submitting,template=quotationMessageTemplate(request),previewCount=selectedChoices.filter(choice=>choice.selection.kind==='sync').length;
 function changeSelection(next:string[]){setSelected(next);setPrepared(false);setSubmitError('')}
 return <form className="modal-body quotation-message-form" onSubmit={async event=>{
  event.preventDefault();
  if(locked||submitLock.current||loading||loadError||!selectedChoices.length||selectedChoices.length>100)return;
  submitLock.current=true;setSubmitting(true);setPrepared(false);setSubmitError('');
  try{if(await onPrepare(selectedChoices.map(choice=>choice.selection)))setPrepared(true)}
  catch(cause){setSubmitError(cause instanceof Error?cause.message:'Não foi possível preparar as cotações.')}
  finally{submitLock.current=false;setSubmitting(false)}
 }}>
  <p className="note">Confira os contatos e o modelo genérico antes de preparar. Os fornecedores compatíveis ficam sugeridos e pré-selecionados; você pode desmarcá-los e escolher qualquer outro contato disponível. Marcar as caixas não envia mensagens.</p>
  <fieldset className="budget-section quotation-contacts" disabled={locked} aria-busy={loading}>
   <legend>Contatos para cotação ({choices.length})</legend>
   <p className="muted">Todos os contatos salvos e a última prévia concluída do WhatsApp, sem duplicar números. Sugestões consideram os itens e a abrangência já cadastrados; os demais contatos podem ser escolhidos manualmente.</p>
   <div className="quotation-contacts-toolbar">
    <label className="field quotation-contacts-search"><span>Buscar contatos</span><input type="search" value={query} placeholder="Nome, empresa ou telefone" onChange={event=>{setQuery(event.target.value);setPage(0)}}/></label>
    <div className="quotation-contacts-filters" role="group" aria-label="Filtrar contatos">
     {([['all','Todos'],['recommended','Sugeridos'],['selected','Selecionados']] as const).map(([value,label])=><button key={value} type="button" className="button secondary" aria-pressed={mode===value} onClick={()=>{setMode(value);setPage(0)}}>{label}</button>)}
    </div>
   </div>
   <div className="quotation-contacts-actions">
    <button type="button" className="button secondary" disabled={loading||!!loadError||!choices.some(choice=>choice.recommended)} onClick={()=>changeSelection(initialQuotationSelection(choices))}>Selecionar sugeridos</button>
    <button type="button" className="button secondary" disabled={loading||!!loadError||!visible.some(choice=>!choice.disabledReason)} onClick={()=>changeSelection([...new Set([...selected,...visible.filter(choice=>!choice.disabledReason).map(choice=>choice.key)])])}>Selecionar página</button>
    <button type="button" className="button secondary" disabled={!selected.length} onClick={()=>changeSelection([])}>Limpar seleção</button>
   </div>
   {loading&&<p className="note" role="status">Carregando contatos…</p>}
   {loadError&&<div className="quotation-contacts-load-error"><p className="alert error" role="alert">{loadError}</p><button type="button" className="button secondary" onClick={()=>setRetry(value=>value+1)}>Tentar novamente</button></div>}
   {!loading&&!loadError&&<>
    <p className="quotation-contacts-count" role="status">{selectedChoices.length} selecionado(s) · {filtered.length} contato(s) nesta lista · até 100 por preparação</p>
    <div className="quotation-contacts-list">
     {visible.map(choice=><label className={`quotation-contacts-option${choice.disabledReason?' quotation-contacts-unavailable':''}`} key={choice.key}>
      <input type="checkbox" name="quotationContacts" value={choice.key} checked={selectedKeys.has(choice.key)} disabled={!!choice.disabledReason} onChange={event=>changeSelection(event.target.checked?[...selected,choice.key]:selected.filter(key=>key!==choice.key))}/>
      <span className="quotation-contacts-details"><span className="quotation-contacts-title"><strong>{choice.name||'Contato sem nome'}</strong>{choice.recommended&&<span className="quotation-contacts-suggestion">Sugerido</span>}</span>
       <small>{choice.company?`${choice.company} · `:''}{choice.phone||'Sem telefone'}</small>
       <small>{choice.sourceLabel} · {choice.classification==='supplier'?'Fornecedor':choice.classification==='general'?'Contato geral':'Sem classificação'}{choice.category?` · ${choice.category}`:''}{choice.scope?` · ${choice.scope==='local'?'Local':'Nacional'}`:''}</small>
       {choice.recommended&&<small>Itens compatíveis: {choice.itemIndexes.map(index=>request.items[index]?.name).filter(Boolean).join('; ')}</small>}
       {choice.disabledReason&&<small className="quotation-contacts-reason">Indisponível: {choice.disabledReason}</small>}
      </span>
     </label>)}
     {!filtered.length&&<p className="note">{choices.length?'Nenhum contato neste filtro. Altere a busca ou selecione Todos.':'Nenhum contato disponível na agenda ou na prévia do WhatsApp.'}</p>}
    </div>
    {!!filtered.length&&<nav className="quotation-contacts-pagination" aria-label="Páginas de contatos"><button type="button" className="button secondary" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Anterior</button><span>Página {currentPage+1} de {pages}</span><button type="button" className="button secondary" disabled={currentPage>=pages-1} onClick={()=>setPage(currentPage+1)}>Próxima</button></nav>}
    {!choices.some(choice=>choice.recommended)&&<p className="muted">Sem sugestões para este pedido. Você pode escolher manualmente os contatos disponíveis, sem alterar sua classificação.</p>}
   </>}
  </fieldset>
  <p className="note">Ao clicar em Preparar cotações, você confirma os {selectedChoices.length} destinatários escolhidos, inclusive os não sugeridos. Contatos escolhidos da prévia do WhatsApp serão salvos sem classificação ao preparar.{previewCount>0?` Nesta seleção: ${previewCount} contato(s) da prévia.`:''}</p>
  <label className="field"><span>Modelo genérico da mensagem</span><textarea rows={13} readOnly value={template}/></label>
  <p className="muted">O OpenClaw substitui {'{{contato}}'} pelo contato ou nome cadastrado de cada destinatário no despacho. Itens, quantidades e condições do modelo são preservados. O envio depende da liberação no servidor e na ponte.</p>
  {error&&<p className="alert error" role="alert">{error}</p>}{submitError&&<p className="alert error" role="alert">{submitError}</p>}{copyError&&<p className="alert error" role="alert">{copyError}</p>}
  {prepared&&<p className="alert success" role="status">Cotações preparadas para os contatos selecionados. Confira o processamento em Agente WhatsApp; este aviso não confirma envio.</p>}
  {selectedChoices.length>100&&<p className="alert error" role="alert">Selecione até 100 contatos por preparação. Desmarque os demais para continuar.</p>}
  <div className="actions"><button type="submit" className="button primary" disabled={locked||loading||!!loadError||!selectedChoices.length||selectedChoices.length>100}><Send size={16}/>{locked?'Preparando…':`Preparar cotações no OpenClaw (${selectedChoices.length})`}</button><button type="button" className="button secondary" disabled={locked} onClick={async()=>{setCopyError('');try{await navigator.clipboard.writeText(template);setCopied(true)}catch{setCopied(false);setCopyError('Não foi possível copiar o modelo. Selecione o texto para copiar manualmente.')}}}><Copy size={16}/>{copied?'Modelo copiado':'Copiar modelo'}</button></div>
 </form>;
}
