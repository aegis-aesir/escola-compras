import type { Member, Purchase } from './model';
export const roleLabels:Record<Member['role'],string>={admin:'Master',administrativo:'Diretoria Administrativa',geral:'Diretoria Geral',solicitante:'Setor'};
export function visibleViews(role:Member['role']) {
  if(role==='geral')return ['approvals'];
  if(role==='solicitante')return ['requests'];
  return role==='admin'?['overview','requests','estimates','approvals','quotes','execution','suppliers','whatsapp','settings']:['overview','requests','estimates','approvals','quotes','execution','suppliers','whatsapp'];
}
export const canCreateRequest=(role:Member['role'])=>['admin','administrativo','solicitante'].includes(role);
export function visibleRequests(requests:Purchase[],me:{id:string;role:Member['role']}):Purchase[] {
  if(me.role==='admin'||me.role==='administrativo')return requests;
  return requests.filter(r=>me.role==='solicitante'?r.authorId===me.id:r.status==='general_review').map(r=>({
    id:r.id,version:r.version,code:r.code,title:r.title,authorId:r.authorId,authorName:r.authorName,
    department:r.department,priority:r.priority,neededBy:r.neededBy,reason:r.reason,items:r.items,
    createdAt:r.createdAt,updatedAt:r.updatedAt,status:r.status,quotes:[],
    ...(me.role==='geral'?{estimate:r.estimate,adminReview:r.adminReview}:{}),
  }));
}
