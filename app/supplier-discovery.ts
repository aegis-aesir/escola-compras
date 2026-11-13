import type { Purchase, Supplier } from './model';

export const supplierCategories = ['Papelaria','Limpeza','Informática','Manutenção','Alimentos','Mobiliário','Material pedagógico','Uniformes','Serviços'];
export const categoryKey=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
export function matchingSuppliers(suppliers:Supplier[],category:string,scope:'local'|'national') {
  const key=categoryKey(category);
  if(!key)return [];
  return suppliers.filter(s=>(s.scope||'local')===scope&&s.category.split(/[,;]/).some(c=>categoryKey(c)===key));
}
export function compatibleQuotationSuppliers(request:Pick<Purchase,'items'|'status'|'generalApproval'|'archived'>,suppliers:Supplier[]) {
  if(request.archived||!request.generalApproval||!['quoting','national'].includes(request.status))return [];
  return suppliers.flatMap(supplier=>{
    const scope=supplier.scope||'local';
    if(request.status==='quoting'&&scope!=='local')return [];
    const itemIndexes=request.items.flatMap((item,index)=>matchingSuppliers([supplier],item.category||'',scope).length?[index]:[]);
    return itemIndexes.length?[{supplier,itemIndexes}]:[];
  }).sort((a,b)=>a.supplier.name.localeCompare(b.supplier.name,'pt-BR'));
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
