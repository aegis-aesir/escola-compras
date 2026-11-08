import {z} from 'zod';
import {supplierSchema, type Supplier} from '../app/model';
import {matchingSuppliers} from '../app/supplier-discovery';
import {digest, rows} from './integrations';

// Administrative batch data only: never execute instructions or enqueue messages.
const batchSchema=z.object({
  source:z.string().trim().min(1).max(150),
  contacts:z.array(supplierSchema.extend({city:z.string().trim().min(2).max(100),state:z.string().regex(/^[A-Z]{2}$/)})).min(1).max(100)
});
export async function importSuppliers(db:D1Database,input:unknown,now:string) {
  // Validate the entire batch before the first write. Retrying a partially processed
  // batch after a service failure is safe; existing records are never overwritten.
  const batch=batchSchema.parse(input);
  const results:{index:number;id:string;status:'created'|'existing'|'conflict'}[]=[];
  for(const [index,contact] of batch.contacts.entries()) {
    const normalized='+'+contact.phone.replace(/\D/g,'');
    const hash=await digest(normalized);
    const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
    const data={...contact,phone:normalized,importSource:{source:batch.source,importedAt:now,importedBy:'Ponte autenticada — importação administrativa'}};
    const written=await db.batch([
      db.prepare("INSERT OR IGNORE INTO records (id,kind,data,version) SELECT ?,'supplier',?,1 WHERE NOT EXISTS (SELECT 1 FROM records WHERE kind='supplier' AND REPLACE(json_extract(data,'$.phone'),'+','')=?)").bind(id,JSON.stringify(data),normalized.slice(1)),
      db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,'Importação administrativa via ponte',`Fornecedor importado de ${batch.source}: ${contact.name}`,now)
    ]);
    if(written[0].meta.changes===1) {results.push({index,id,status:'created'});continue;}
    const existing=(await rows<Supplier>(db,'supplier')).find(s=>s.phone.replace(/\D/g,'')===normalized.slice(1));
    results.push({index,id:existing?.id||id,status:existing&&matchingSuppliers([existing],contact.category,contact.scope).length?'existing':'conflict'});
  }
  return {created:results.filter(r=>r.status==='created').length,existing:results.filter(r=>r.status==='existing').length,conflicts:results.filter(r=>r.status==='conflict').length,results};
}
