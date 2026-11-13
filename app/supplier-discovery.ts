import type { Item, Purchase, Supplier } from './model';

export const supplierCategories = ['Papelaria','Limpeza','Informática','Manutenção','Materiais de construção','Materiais hidráulicos','Ferragens','Homecenter','Utilidades','Serviços de manutenção','Alimentos','Mobiliário','Material pedagógico','Uniformes','Serviços'];
export const categoryKey=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
const materialSegments=new Set(['Materiais de construção','Material de construção','Materiais para manutenção','Material de manutenção','Materiais de manutenção','Material hidráulico','Materiais hidráulicos','Hidráulica','Material elétrico','Materiais elétricos','Ferragens','Loja de ferragens','Homecenter','Home center'].map(categoryKey));
const maintenanceServices=new Set(['Manutenção','Manutenção predial','Manutenção preventiva','Serviços de manutenção','Serviço de manutenção'].map(categoryKey));
const isMaintenanceCategory=(category:string)=>maintenanceServices.has(category)||/^(?:servicos? de )?manutencao\b/.test(category);
const serviceName=/\b(servicos?|manutencao|instalacao|consertos?|reparos?|mao de obra|assistencia tecnica)\b/;
const retailName=/\b(home\s*center|materia(?:is|l) (?:de |para )?(?:construcao|manutencao|hidraulicos?|eletricos?)|utilidades|ferragens)\b/;
const commerceName=/\b(lojas?|comercio|comercial|distribuidora|home\s*center|materia(?:is|l) (?:de )?construcao)\b/;
function suppliesMaintenanceMaterials(supplier:Supplier){
  const name=categoryKey(supplier.name||''),categories=supplier.category.split(/[,;]/).map(categoryKey);
  if(categories.some(category=>(materialSegments.has(category)&&category!=='hidraulica')||category==='utilidades'||category==='utilidades domesticas'))return true;
  const retailCategory=categories.some(category=>materialSegments.has(category)||category==='utilidades'||category==='utilidades domesticas');
  const namedRetail=retailName.test(name)&&(!serviceName.test(name)||commerceName.test(name));
  return namedRetail||(retailCategory&&!serviceName.test(name));
}
/** Classificação para procurar fornecedores; nunca grava ou substitui a categoria do item. */
export function supplierCategoryForItem(item:Pick<Item,'name'|'category'>):string|undefined{
  const category=categoryKey(item.category||'');
  if(!category)return undefined;
  if(!isMaintenanceCategory(category)&&!materialSegments.has(category))return item.category!.trim();
  if(/^servicos? de manutencao\b/.test(category))return 'Serviços de manutenção';
  if(materialSegments.has(category)&&category!=='hidraulica')return 'Materiais de construção';
  const name=categoryKey(item.name);
  if(/^(servicos?\b|mao de obra\b|instalacao\b|conserto\b|troca\b|reparos? de\b|manutencao\b|revisao\b|limpeza de\b|pintura\b|contratacao\b)/.test(name))return 'Serviços de manutenção';
  if(materialSegments.has(category)||/^(materia(?:is|l)\b|pecas?\b|kits?\b|registros?\b|torneiras?\b|valvulas?\b|tubos?\b|canos?\b|conex(?:ao|oes)\b|ralos?\b|sif(?:ao|oes)\b|lampadas?\b|tomadas?\b|interruptor(?:es)?\b|fios?\b|cabos?\b|tintas?\b|parafusos?\b|buchas?\b|fechaduras?\b|dobradicas?\b|chuveiros?\b|assentos?\b|vedantes?\b)/.test(name))return 'Materiais de construção';
  if(category.startsWith('servico'))return 'Serviços de manutenção';
  return undefined;
}
export function matchingSuppliers(suppliers:Supplier[],category:string,scope:'local'|'national') {
  const key=categoryKey(category);
  if(!key)return [];
  return suppliers.filter(s=>{
    if((s.scope||'local')!==scope)return false;
    if(key==='materiais de construcao')return suppliesMaintenanceMaterials(s);
    if(key==='servicos de manutencao'){
      const categories=s.category.split(/[,;]/).map(categoryKey);
      if(categories.some(category=>/^servicos? de manutencao\b/.test(category)))return true;
      const namedService=serviceName.test(categoryKey(s.name||''));
      return (categories.some(isMaintenanceCategory)||(categories.includes('hidraulica')&&namedService))&&(!suppliesMaintenanceMaterials(s)||namedService);
    }
    return s.category.split(/[,;]/).some(c=>categoryKey(c)===key);
  });
}
export function compatibleQuotationSuppliers(request:Pick<Purchase,'items'|'status'|'generalApproval'|'archived'>,suppliers:Supplier[]) {
  if(request.archived||!request.generalApproval||!['quoting','national'].includes(request.status))return [];
  return suppliers.flatMap(supplier=>{
    const scope=supplier.scope||'local';
    if(request.status==='quoting'&&scope!=='local')return [];
    const itemIndexes=request.items.flatMap((item,index)=>matchingSuppliers([supplier],supplierCategoryForItem(item)||'',scope).length?[index]:[]);
    return itemIndexes.length?[{supplier,itemIndexes}]:[];
  }).sort((a,b)=>a.supplier.name.localeCompare(b.supplier.name,'pt-BR'));
}
export function requestSupplierCategories(request:Pick<Purchase,'items'>){
  const unique=new Map<string,{category:string;itemIndex:number}>();
  request.items.forEach((item,itemIndex)=>{const category=supplierCategoryForItem(item);if(category&&!unique.has(categoryKey(category)))unique.set(categoryKey(category),{category,itemIndex})});
  return [...unique.values()];
}
export function supplierSearchTerms(request:Pick<Purchase,'items'>,category:string){
  const key=categoryKey(category),items=request.items.filter(item=>categoryKey(supplierCategoryForItem(item)||'')===key).slice(0,3).map(item=>item.name).join('; ');
  if(key==='materiais de construcao')return `venda de materiais de construção lojas hidráulica ferragens homecenter utilidades para ${items} -serviços -instalação -mão-de-obra`;
  if(key==='servicos de manutencao')return `prestadores de serviços de manutenção instalação conserto para ${items}`;
  return category;
}
export function requestCategories(request:Pick<Purchase,'items'>) {
  const unique=new Map<string,{category:string;itemIndex:number}>();
  request.items.forEach((item,itemIndex)=>{if(item.category?.trim()&&!unique.has(categoryKey(item.category)))unique.set(categoryKey(item.category),{category:item.category.trim(),itemIndex})});
  return [...unique.values()];
}
export function categoryOptions(suppliers:Supplier[]) {
  const unique=new Map<string,string>();
  for(const category of [...supplierCategories,...suppliers.flatMap(s=>s.category.split(/[,;]/))])if(category.trim())unique.set(categoryKey(category),category.trim());
  return [...unique.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
