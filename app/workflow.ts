import { z } from 'zod';
import {budgetTransition,ensureAdministrativeReview} from './budget-workflow';
import { estimateSchema, quoteSchema, quoteTotal, type Purchase, type Supplier, type Settings, type Member } from './model';
import {normalizeQuote,quoteComparable} from './quote-comparison';
export class FlowError extends Error {constructor(message:string,public status=400){super(message)}}
export const todayManaus=(at:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date(at));
export function nextBusinessDay(at:string,holidays:string[]=[]){
  // Manaus is UTC-04:00. Keep the original local time, skip weekends and configured holidays.
  const local=new Date(new Date(at).getTime()-4*60*60*1000);
  do{local.setUTCDate(local.getUTCDate()+1)}while([0,6].includes(local.getUTCDay())||holidays.includes(local.toISOString().slice(0,10)));
  return new Date(local.getTime()+4*60*60*1000).toISOString();
}
export function localExpired(r:Purchase,at:string){return r.status==='quoting'&&!!r.localDeadline&&r.localDeadline<=at&&!r.quotes.some(q=>q.validUntil>=todayManaus(at)&&quoteComparable(q,r));}
export function transition(old:Purchase,b:any,me:{role:Member['role'];name:string},suppliers:Supplier[],settings:Settings,now:string){
  const budget=budgetTransition(old,b,me,settings,now);if(budget)return budget;
  const data:Purchase={...old,updatedAt:now};let action='';
  const permit=(role:Member['role'])=>{if(me.role!=='admin'&&me.role!==role)throw new FlowError('Seu perfil não permite esta ação.',403)};
  const stage=(...stages:string[])=>{if(!stages.includes(old.status))throw new FlowError('Esta ação não está disponível na etapa atual.')};
  const reason=()=>z.string().trim().min(5,'Informe uma justificativa com pelo menos 5 caracteres.').max(2000).parse(b.reason);
  const validQuote=()=>{const q=old.quotes.find(q=>q.id===(b.quoteId||old.selectedQuoteId));if(!q)throw new FlowError('Selecione uma proposta.');if(q.validUntil<todayManaus(now))throw new FlowError('A proposta está vencida. Atualize a cotação.');if(!quoteComparable(q,old)||typeof q.total!=='number'||!Number.isFinite(q.total))throw new FlowError('A proposta precisa atender integralmente ao escopo, ser comparável e ter conversão para reais conferida.');return q};
  switch(b.action){
    case 'estimate':{
      permit('administrativo');stage('estimating','pending','admin_review');const e=estimateSchema.parse(b.data);
      if(e.freightKnown===false)e.freight=0;
      if(e.references.length!==old.items.length)throw new FlowError('Informe uma referência para cada item.');
      if(e.references.some(r=>r.researchedOn>todayManaus(now)))throw new FlowError('A data de pesquisa não pode estar no futuro.');
      data.estimate={...e,total:quoteTotal(old.items,e.references.map(r=>r.unitPrice),e.freight),recordedAt:now,method:'manual'};data.status='admin_review';action='Estimativa de referência registrada; encaminhada à diretoria administrativa';break;
    }
    case 'admin_review':permit('administrativo');stage('admin_review');ensureAdministrativeReview(old);if(!old.estimate)throw new FlowError('Registre a estimativa antes da análise.');data.adminReview=reason();data.status='general_review';action='Diretoria administrativa analisou e encaminhou: '+data.adminReview;break;
    case 'approve':permit('geral');stage('general_review');if(old.form)throw new FlowError('Use a decisão estruturada do formulário.');if(!old.adminReview||!old.estimate)throw new FlowError('A análise administrativa é obrigatória.');data.generalApproval={actor:me.name,at:now,reason:reason()};data.status='quoting';action='Diretoria geral aprovou a necessidade do pedido, sem aprovação de valor: '+data.generalApproval.reason;break;
    case 'reject':
      if(old.status==='admin_review')permit('administrativo');else{permit('geral');stage('general_review')};data.decision=reason();data.status='rejected';action='Pedido não aprovado: '+data.decision;break;
    case 'local_contact':{
      permit('administrativo');stage('quoting');if(!old.generalApproval)throw new FlowError('Regularize as aprovações deste pedido do fluxo anterior.');
      const s=suppliers.find(s=>s.id===b.supplierId&&(s.scope||'local')==='local');if(!s)throw new FlowError('Selecione um fornecedor local.');
      const note=reason();data.localAttempts=[...(old.localAttempts||[]),{supplierId:s.id,supplierName:s.name,at:now,note}];
      if(!old.localStartedAt){data.localStartedAt=now;data.localDeadline=nextBusinessDay(now,settings.holidays||[])}
      action='Contato local registrado: '+s.name+' — '+note;break;
    }
    case 'national':
      permit('administrativo');stage('quoting');if(!localExpired(old,now))throw new FlowError('A busca nacional exige 1 dia útil desde o primeiro contato local e nenhuma proposta válida.');data.nationalReason=reason();data.status='national';action='Prazo local encerrado; encaminhado à pesquisa nacional: '+data.nationalReason;break;
    case 'quote':{
      permit('administrativo');stage('quoting','national');if(!old.generalApproval)throw new FlowError('Regularize as aprovações deste pedido do fluxo anterior.');
      const q=quoteSchema.parse(b.data);const s=suppliers.find(s=>s.id===q.supplierId);if(!s)throw new FlowError('Fornecedor não encontrado.');
      if(old.status==='quoting'&&(s.scope||'local')!=='local')throw new FlowError('Nesta etapa, cote primeiro com fornecedores de Manaus.');
      const normalized=normalizeQuote(old,q);
      data.quotes=[...old.quotes.filter(v=>v.supplierId!==q.supplierId),{...normalized,id:crypto.randomUUID(),supplierName:s.name,createdAt:now}];action='Proposta real registrada: '+s.name;break;
    }
    case 'select':{
      permit('administrativo');stage('quoting','national');if(!old.generalApproval)throw new FlowError('O pedido precisa da aprovação da diretoria geral.');const q=validQuote();
      const comparableQuotes=old.quotes.filter(q=>q.validUntil>=todayManaus(now)&&quoteComparable(q,old));
      if(comparableQuotes.length<settings.minQuotes&&!hasQuoteException(old))throw new FlowError(`A regra atual exige ${settings.minQuotes} propostas integralmente comparáveis e válidas. Ajuste nas configurações se necessário.`);
      if(old.form&&q.total!>Math.min(...comparableQuotes.map(v=>v.total!))&&!old.management?.selectionReason)throw new FlowError('Justifique objetivamente a escolha de proposta acima do menor preço.');
      data.selectedQuoteId=q.id;data.decision=reason();data.status='execution';action='Diretoria administrativa selecionou proposta para execução: '+q.supplierName+' — '+data.decision;break;
    }
    case 'execution_note':permit('administrativo');stage('execution','ordered');{const note=reason();data.executionNotes=[...(old.executionNotes||[]),{at:now,actor:me.name,note}];action='Acompanhamento da execução: '+note;}break;
    case 'ordered':permit('administrativo');stage('execution','approved');validQuote();data.status='ordered';action='Pedido realizado: '+reason();break;
    case 'received':permit('administrativo');stage('ordered');data.status='received';action='Recebimento conferido: '+reason();break;
    case 'restart_estimate':permit('administrativo');stage('quoting');if(old.generalApproval)throw new FlowError('Pedido já está no fluxo atual.');data.status='estimating';action='Pedido do fluxo anterior encaminhado para estimativa e novas análises';break;
    default:throw new FlowError('Ação desconhecida.');
  }
  return {data,action};
}

function hasQuoteException(r:Purchase){return !!(r.management?.quotationException&&r.management?.quotationExceptionReason&&r.management?.quotationExceptionEvidence);}
