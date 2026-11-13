import type {Purchase} from '../app/model';
import type {RequestDraft} from '../app/request-draft';

// Incorpora apenas cópias ainda não enviadas. O registro físico vira uma versão
// histórica (não é apagado); arquivos mantêm suas chaves R2 e passam ao pedido.
export async function consolidateDeferredDrafts(db:D1Database,now:string){
 const copies=await db.prepare("SELECT id,data,version FROM records WHERE kind='request_draft' AND json_extract(data,'$.sourceRequestId') IS NOT NULL ORDER BY json_extract(data,'$.updatedAt')").all<{id:string;data:string;version:number}>();
 for(const copy of copies.results){
  const draft={...JSON.parse(copy.data),id:copy.id,version:copy.version};
  const row=await db.prepare("SELECT id,data,version FROM records WHERE id=? AND kind='request'").bind(draft.sourceRequestId).first<{id:string;data:string;version:number}>();
  if(!row)continue;
  const request={...JSON.parse(row.data),id:row.id,version:row.version} as Purchase;
  if(draft.authorId!==request.authorId)continue;
  const next:Purchase={...request,deferredDraftHistory:[...(request.deferredDraftHistory||[]),draft as RequestDraft]};
  if(request.status==='deferred'&&!draft.archivedAt&&(!request.deferredEdit||draft.updatedAt>request.deferredEdit.updatedAt))next.deferredEdit={values:draft.values,updatedAt:draft.updatedAt,actor:draft.authorName||request.authorName};
  if(next.deferred&&next.deferred.draftId===draft.id){next.deferred={...next.deferred};delete next.deferred.draftId;}
  const signature=crypto.randomUUID();
  await db.batch([
   db.prepare("UPDATE records SET data=?,version=version+1 WHERE id=? AND kind='request' AND version=? AND EXISTS(SELECT 1 FROM records WHERE id=? AND kind='request_draft' AND version=?)").bind(JSON.stringify(next),row.id,row.version,copy.id,copy.version),
   db.prepare("UPDATE records SET kind='request_revision',data=json_set(data,'$.requestId',?,'$.consolidatedAt',?,'$.consolidationId',?),version=version+1 WHERE id=? AND kind='request_draft' AND version=? AND changes()=1").bind(row.id,now,signature,copy.id,copy.version),
   db.prepare("INSERT INTO audit(id,entity,actor,action,at) SELECT ?,?,'Sistema','Cópia adiada incorporada ao histórico da solicitação, com conteúdo e anexos preservados',? WHERE changes()=1").bind(crypto.randomUUID(),row.id,now),
   db.prepare("UPDATE records SET data=json_set(data,'$.originalRequestId',?,'$.requestId',?),version=version+1 WHERE kind='budget_file' AND json_extract(data,'$.requestId')=? AND EXISTS(SELECT 1 FROM records WHERE id=? AND kind='request_revision' AND json_extract(data,'$.consolidationId')=?)").bind(copy.id,row.id,copy.id,copy.id,signature),
  ]);
 }
}

export async function deferredMonthClosed(db:D1Database,request:Purchase){
 const month=String(request.management?.referenceMonth||request.form?.fields.referenceMonth||'');
 return !!await db.prepare("SELECT id FROM records WHERE kind='budget_closing' AND json_extract(data,'$.month')=? AND json_extract(data,'$.status')='Concluído'").bind(month).first();
}
