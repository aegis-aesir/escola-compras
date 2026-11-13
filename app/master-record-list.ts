import {stages,type Purchase} from './model';
import type {RequestDraft} from './request-draft';

export type MasterRecordRow={id:string;title:string;code:string;author:string;department:string;at:string;archivedBy?:string;type:string;status:string;draft?:RequestDraft;request?:Purchase};
export function masterRecordList(drafts:RequestDraft[],requests:Purchase[],tab:'drafts'|'archives',search=''):MasterRecordRow[]{
 const rows:MasterRecordRow[]=drafts.filter(d=>tab==='archives'?!!d.archivedAt:!d.archivedAt).map(d=>({id:d.id,title:d.values.title||'Solicitação sem título',code:'',author:d.authorName||'Usuário não identificado',department:d.authorDepartment||d.values.department||'Setor não identificado',at:d.archivedAt||d.updatedAt,archivedBy:d.archivedBy,type:'Rascunho',status:d.status==='deferred'?'Adiado':'Não enviado',draft:d}));
 if(tab==='archives')for(const request of requests.filter(r=>r.archived))rows.push({id:request.id,title:request.title,code:request.code,author:request.authorName,department:request.department,at:request.archived!.at,archivedBy:request.archived!.actor,type:'Solicitação',status:stages[request.status],request});
 const query=search.trim().toLocaleLowerCase('pt-BR');
 return rows.filter(row=>`${row.title} ${row.code} ${row.author} ${row.department} ${row.type}`.toLocaleLowerCase('pt-BR').includes(query)).sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
}
