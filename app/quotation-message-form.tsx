'use client';

import {useState} from 'react';
import {Copy, Send} from 'lucide-react';
import {quotationMessageTemplate,type Purchase,type Supplier} from './model';
import {compatibleQuotationSuppliers,supplierCategoryForItem} from './supplier-discovery';

type Props={request:Purchase;suppliers:Supplier[];busy:boolean;error:string;onPrepare:(supplierIds:string[])=>Promise<boolean>};

export default function QuotationMessageForm({request,suppliers,busy,error,onPrepare}:Props){
 const matches=compatibleQuotationSuppliers(request,suppliers);
 const [selected,setSelected]=useState<string[]>([]),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(''),[prepared,setPrepared]=useState(false);
 const selectedIds=matches.filter(match=>selected.includes(match.supplier.id)).map(match=>match.supplier.id);
 const template=quotationMessageTemplate(request);
 return <form className="modal-body quotation-message-form" onSubmit={async event=>{event.preventDefault();setPrepared(false);if(selectedIds.length&&await onPrepare(selectedIds))setPrepared(true)}}>
  <p className="note">Selecione os fornecedores e confira o modelo genérico. Ao preparar, uma cotação por contato fica na fila do OpenClaw. O envio depende da liberação no servidor e na ponte; marcar as caixas não envia mensagens.</p>
  <fieldset className="budget-section" disabled={busy}><legend>Fornecedores compatíveis ({matches.length})</legend>
   <p className="muted">Compatibilidade pelo material ou serviço solicitado e pelo segmento comercial cadastrado. Para materiais, buscamos lojas de construção, hidráulica, ferragens, homecenter e utilidades; prestadores de manutenção não são vendedores por padrão. Confira se a loja vende o item. {request.status==='national'?'Etapa nacional: fornecedores locais e nacionais disponíveis.':'Etapa local: somente fornecedores de Manaus.'}</p>
   {matches.map(({supplier,itemIndexes})=><label className="budget-check quotation-supplier-option" key={supplier.id}><input type="checkbox" name="supplierIds" value={supplier.id} checked={selectedIds.includes(supplier.id)} onChange={event=>{setPrepared(false);setSelected(current=>event.target.checked?[...current,supplier.id]:current.filter(id=>id!==supplier.id))}}/><span><strong>{supplier.name}</strong><small>{supplier.category} · {supplier.scope==='national'?'Nacional':'Manaus'} · {supplier.phone}</small><small>Itens compatíveis: {itemIndexes.map(index=>request.items[index].name).join('; ')}</small></span></label>)}
   {!matches.length&&<p className="note">Nenhum fornecedor compatível cadastrado nesta etapa. Confira as categorias dos itens e o cadastro de fornecedores. Fontes encontradas na pesquisa precisam ser conferidas e cadastradas antes de aparecer nesta lista.</p>}
   {request.items.some(item=>!item.category?.trim())&&<p className="note">Há itens sem categoria. A administração precisa classificá-los para encontrar fornecedores compatíveis.</p>}
   {request.items.some(item=>item.category?.trim()&&!supplierCategoryForItem(item))&&<p className="note">Há itens de manutenção sem indicação suficiente de material ou serviço. Confira a descrição e classifique o segmento de fornecimento antes de selecionar contatos.</p>}
  </fieldset>
  <label className="field"><span>Modelo genérico da mensagem</span><textarea rows={13} readOnly value={template}/></label>
  <p className="muted">O OpenClaw substitui {'{{contato}}'} pelo contato ou nome cadastrado de cada fornecedor no despacho. Itens, quantidades e condições do modelo são preservados.</p>
  {error&&<p className="alert error" role="alert">{error}</p>}{copyError&&<p className="alert error" role="alert">{copyError}</p>}
  {prepared&&<p className="alert success" role="status">Cotações preparadas para os fornecedores selecionados. Confira o processamento em Agente WhatsApp; este aviso não confirma envio.</p>}
  {selectedIds.length>100&&<p className="note">Prepare até 100 fornecedores por vez.</p>}
  <div className="actions"><button type="submit" className="button primary" disabled={busy||!selectedIds.length||selectedIds.length>100}><Send size={16}/>{busy?'Preparando…':`Preparar cotações no OpenClaw (${selectedIds.length})`}</button><button type="button" className="button secondary" onClick={async()=>{setCopyError('');try{await navigator.clipboard.writeText(template);setCopied(true)}catch{setCopied(false);setCopyError('Não foi possível copiar o modelo. Selecione o texto para copiar manualmente.')}}}><Copy size={16}/>{copied?'Modelo copiado':'Copiar modelo'}</button></div>
 </form>;
}
