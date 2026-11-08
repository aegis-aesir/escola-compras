import type { Purchase, Supplier } from './model';

export const supplierCategories = ['Papelaria','Limpeza','Informática','Manutenção','Alimentos','Mobiliário','Material pedagógico','Uniformes','Serviços'];
export const categoryKey=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
export function matchingSuppliers(suppliers:Supplier[],category:string,scope:'local'|'national') {
  const key=categoryKey(category);
  if(!key)return [];
  return suppliers.filter(s=>(s.scope||'local')===scope&&s.category.split(/[,;]/).some(c=>categoryKey(c)===key));
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
