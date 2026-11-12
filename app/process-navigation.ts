import type {Member,Purchase} from './model';

export type ProcessView='archives'|'budget'|'overview'|'analysis'|'estimates'|'execution'|'requests'|'general_approval'|'quotes'|'suppliers'|'whatsapp'|'settings';
export type PrimaryNavigationItem={id:ProcessView;label:string};
export type ContextualNavigationItem={view:ProcessView;label:string};

const administrativeSteps:PrimaryNavigationItem[]=[
  {id:'overview',label:'Dashboard'},
  {id:'requests',label:'Solicitação'},
  {id:'analysis',label:'Análise ADM'},
  {id:'estimates',label:'Estimativa'},
  {id:'general_approval',label:'Aprovação Diretoria'},
  {id:'quotes',label:'Cotação'},
  {id:'execution',label:'Execução'},
  {id:'budget',label:'Resumo Mensal'},
];

const labels:Record<ProcessView,string>={
  overview:'Dashboard',requests:'Solicitação',analysis:'Análise ADM',estimates:'Estimativa',general_approval:'Aprovação Diretoria',quotes:'Cotação',execution:'Execução',budget:'Resumo Mensal',suppliers:'Fornecedores',whatsapp:'Agente WhatsApp',archives:'Arquivadas',settings:'Configurações',
};

export function primaryNavigationForRole(role:Member['role']):PrimaryNavigationItem[]{
  if(role==='solicitante')return [{id:'requests',label:'Minhas solicitações'}];
  if(role==='geral')return [{id:'general_approval',label:'Aprovação Diretoria'}];
  if(role==='financeiro')return [
    {id:'requests',label:'Solicitação'},
    {id:'execution',label:'Execução'},
    {id:'budget',label:'Resumo Mensal'},
  ];
  return administrativeSteps;
}

export function allowedViewsForRole(role:Member['role']):ProcessView[]{
  if(role==='geral')return ['general_approval'];
  if(role==='solicitante')return ['requests'];
  if(role==='financeiro')return ['budget','requests','execution'];
  if(role==='admin')return ['overview','budget','requests','analysis','estimates','general_approval','quotes','execution','suppliers','whatsapp','archives','settings'];
  return ['overview','budget','requests','analysis','estimates','general_approval','quotes','execution','suppliers','whatsapp'];
}

export function processViewLabel(view:ProcessView,role:Member['role']):string{
  if(view==='requests'&&role==='solicitante')return 'Minhas solicitações';
  return labels[view];
}

export function primaryParentView(view:ProcessView):ProcessView{
  if(view==='suppliers'||view==='whatsapp')return 'quotes';
  if(view==='archives')return 'requests';
  return view;
}

export function contextualActionsForView(view:ProcessView,role:Member['role']):ContextualNavigationItem[]{
  if(view==='requests'&&role==='admin')return [{view:'archives',label:'Arquivadas'}];
  if(view==='quotes'&&(role==='admin'||role==='administrativo'))return [
    {view:'suppliers',label:'Fornecedores'},
    {view:'whatsapp',label:'Agente WhatsApp'},
  ];
  return [];
}

export function requestMatchesView(request:Pick<Purchase,'status'|'archived'>,view:ProcessView,role:Member['role']):boolean{
  if(view==='archives')return !!request.archived;
  if(request.archived)return false;
  if(view==='requests'){
    if(role==='solicitante'||role==='financeiro')return true;
    return ['correction','deferred','rejected'].includes(request.status);
  }
  if(view==='analysis')return request.status==='pending';
  if(view==='estimates')return ['estimating','admin_review'].includes(request.status);
  if(view==='general_approval')return request.status==='general_review';
  if(view==='quotes')return ['quoting','national'].includes(request.status);
  if(view==='execution')return ['execution','approved','ordered','received'].includes(request.status);
  return false;
}
