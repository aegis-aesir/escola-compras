import {z} from 'zod';
import type {Purchase,Member,Settings} from './model';
import {quoteTotal} from './model';
import {parseManagement} from './budget';
import {managementSections,canCompareCommercial,commercialFieldKeys} from './budget-fields';
import {FlowError,todayManaus} from './workflow';

const reasonSchema=z.string().trim().min(5,'Informe uma justificativa de pelo menos 5 caracteres.').max(2000);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Data inválida.');
export function budgetTransition(old:Purchase,b:any,me:{role:Member['role'];name:string},settings:Settings,now:string):{data:Purchase;action:string}|null{
  if(!['budget_management','return_request','defer_request','resume_request','reopen_request','decide_need'].includes(b.action))return null;
  const data:Purchase={...old,updatedAt:now};
  const permit=(...roles:Member['role'][])=>{if(me.role!=='admin'&&!roles.includes(me.role))throw new FlowError('Seu perfil não permite esta ação.',403)};
  const preApproval=()=>{if(old.generalApproval||!['estimating','pending','admin_review','general_review','correction'].includes(old.status))throw new FlowError('A ação exige pedido ainda sem aprovação da necessidade.');};
  if(b.action==='budget_management'){
    permit('administrativo');
    const parsed=parseManagement(b.data,old.form?.kind||'monthly',old.originalScope?.items||old.items);
    if(!canCompareCommercial(old)&&commercialFieldKeys.some(key=>Object.hasOwn(b.data,key)&&parsed[key]!==old.management?.[key]))throw new FlowError('A comparação comercial exige aprovação da necessidade e propostas reais recebidas.');
    data.management={...old.management,...parsed};
    // Omitted fields retain historical data; an explicitly blank field still clears its value.
    for(const key of Object.keys(b.data))if(parsed[key]===undefined)delete data.management[key];
    if(data.management.referenceMonth&&(old.management?.referenceMonth||old.form?.fields.referenceMonth)&&data.management.referenceMonth!==(old.management?.referenceMonth||old.form?.fields.referenceMonth))throw new FlowError('Altere a competência somente ao retomar pedido adiado.');
    if(old.management?.referenceMonth)data.management.referenceMonth=old.management.referenceMonth;
    if(!Object.hasOwn(b.data,'validatedPriority')&&!data.management.validatedPriority)data.management.validatedPriority=old.priority;
    const m=data.management;
    if((Number(m.contractedAmount)>0||Number(m.realizedAmount)>0)&&(!old.generalApproval||!['execution','ordered','received','approved'].includes(old.status)))throw new FlowError('Contratado/realizado exigem aprovação da necessidade e seleção administrativa.');
    if(m.executionStatus==='Concluída'&&(m.receiptStatus!=='Recebido e aceito'||!m.financeForwardedAt))throw new FlowError('Para concluir, registre recebimento/aceite e encaminhamento ao financeiro.');
    return {data,action:'Controles administrativos e de execução atualizados'};
  }
  const reason=reasonSchema.parse(b.reason);
  if(b.action==='reopen_request'){
    permit('administrativo');
    if(old.status!=='rejected')throw new FlowError('Somente solicitações não aprovadas podem ser reabertas.');
    if(old.generalApproval||old.selectedQuoteId||old.quotes.length)throw new FlowError('Este pedido possui aprovação ou propostas de compra. Confira seu histórico antes de prosseguir.');
    data.reopeningHistory=[...(old.reopeningHistory||[]),{at:now,actor:me.name,reason,previous:{decision:old.decision,needDecision:old.needDecision,adminReview:old.adminReview,management:old.management,estimate:old.estimate}}];
    data.management={...old.management};
    for(const key of ['recommendation','analysis','opinionReason','reviewOwner','reviewDate','quantityAssessment','additionalDataStatus','additionalDataNotes',...Object.keys(data.management).filter(key=>/^recommendedQuantity_\d+$/.test(key))])delete data.management[key];
    delete data.decision;delete data.needDecision;delete data.adminReview;delete data.returnForCorrection;delete data.deferred;
    data.status=old.estimate?'admin_review':'estimating';
    if(!old.estimate)data.estimateRevision=now;
    return {data,action:'Solicitação reaberta para '+(old.estimate?'nova análise administrativa':'estimativa e nova análise administrativa')+'; exige nova decisão da necessidade: '+reason};
  }
  if(b.action==='return_request'){
    permit('administrativo');preApproval();const due=date.parse(b.due);
    if(due<todayManaus(now))throw new FlowError('O prazo de complementação não pode estar no passado.');
    data.returnForCorrection={reason,due,at:now,actor:me.name};data.status='correction';
    return {data,action:'Devolvido ao setor para complementação até '+due+': '+reason};
  }
  if(b.action==='resume_request'){
    permit('administrativo');if(old.status!=='deferred')throw new FlowError('Somente pedidos adiados podem ser retomados.');
    const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(b.referenceMonth);
    data.correctionHistory=[...(old.correctionHistory||[]),{at:now,actor:me.name,reason,previous:{form:old.form,management:old.management,needDecision:old.needDecision,estimate:old.estimate,referenceMonth:old.form?.fields.referenceMonth}}];
    data.management={...old.management,referenceMonth:month};data.status='estimating';
    delete data.estimate;delete data.adminReview;delete data.generalApproval;delete data.needDecision;delete data.deferred;
    data.estimateRevision=now;
    return {data,action:'Pedido adiado retomado para '+month+'; requer nova estimativa e análises: '+reason};
  }
  if(b.action==='defer_request'){
    if(me.role==='geral'){if(old.status!=='general_review')throw new FlowError('Aguarde o encaminhamento administrativo.');}else permit('administrativo');preApproval();
    data.status='deferred';data.deferred={reason,at:now,actor:me.name};
    return {data,action:'Pedido adiado sem transferência automática de mês: '+reason};
  }
  permit('geral');if(old.status!=='general_review'||!old.adminReview||!old.estimate)throw new FlowError('A decisão exige estimativa e parecer administrativo.');
  const choice=z.enum(['approve','partial','provisional','defer','reject']).parse(b.choice);
  if(choice==='provisional'&&old.form?.kind!=='emergency')throw new FlowError('Medida provisória somente para solicitação emergencial.');
  let indexes=choice==='approve'?old.items.map((_,i)=>i):z.array(z.number().int().nonnegative()).max(old.items.length).parse(b.itemIndexes||[]);
  if(['partial','provisional'].includes(choice)&&(!indexes.length||new Set(indexes).size!==indexes.length||indexes.some(i=>i>=old.items.length)))throw new FlowError('Selecione itens válidos, sem repetição, para o escopo da necessidade.');
  indexes=[...indexes].sort((a,b)=>a-b);
  if(choice==='defer'&&!b.due)throw new FlowError('Informe o prazo pertinente ao adiamento.');
  const conditions=z.string().trim().max(2000).optional().parse(b.conditions),due=b.due?date.parse(b.due):undefined;
  data.needDecision={choice,itemIndexes:indexes,reason,conditions,due,actor:me.name,at:now};
  if(choice==='reject'){data.status='rejected';data.decision=reason;return {data,action:'Necessidade recusada pela diretoria geral: '+reason}}
  if(choice==='defer'){data.status='deferred';data.deferred={reason,at:now,actor:me.name};return {data,action:'Necessidade adiada pela diretoria geral: '+reason}}
  if(choice==='partial'||choice==='provisional'){
    const quantities=z.record(z.number().positive()).optional().parse(b.quantities)||{};
    if(Object.keys(quantities).some(k=>!indexes.includes(Number(k))||quantities[k]>old.items[Number(k)].quantity))throw new FlowError('As quantidades autorizadas não podem ampliar o pedido.');
    data.needDecision.quantities=quantities;
    if(old.form?.kind==='digital'&&Object.values(quantities).some(q=>!Number.isInteger(q)))throw new FlowError('Licenças exigem quantidade inteira.');
    data.originalScope={items:old.items,form:old.form,estimate:old.estimate};data.items=indexes.map(i=>({...old.items[i],quantity:quantities[String(i)]??old.items[i].quantity}));
    const refs=indexes.map(i=>old.estimate!.references[i]);
    data.estimate={...old.estimate,references:refs,total:quoteTotal(data.items,refs.map(r=>r.unitPrice),old.estimate.freight),notes:old.estimate.notes+'\nEscopo reduzido pela decisão da necessidade. Frete de referência sujeito a conferência administrativa.'};
    if(old.form)data.form={...old.form,references:old.form.references.filter(r=>indexes.includes(r.itemIndex)).map(r=>({...r,itemIndex:indexes.indexOf(r.itemIndex)}))};
  }
  data.generalApproval={actor:me.name,at:now,reason};data.status='quoting';
  return {data,action:'Necessidade '+(choice==='approve'?'aprovada':choice==='partial'?'aprovada parcialmente':'aprovada como medida provisória')+'; sem aprovação de valor: '+reason};
}

export function ensureAdministrativeReview(r:Purchase){
  if(!r.form)return;
  const m=r.management||{},fields=managementSections(r.form.kind,r).flatMap(s=>s.fields);
  if(fields.filter(f=>f.key.startsWith('review')&&f.type==='select').some(f=>!m[f.key]))throw new FlowError('Preencha a conferência administrativa antes de encaminhar.');
  if(!['Adequadas','Inadequadas','Podem ser reduzidas'].includes(String(m.quantityAssessment)))throw new FlowError('Avalie as quantidades antes de encaminhar.');
  if(!['Suficientes','Não necessárias'].includes(String(m.additionalDataStatus)))throw new FlowError('Confira as informações adicionais; se houver complementação necessária, devolva ao setor antes de encaminhar.');
  const items=r.originalScope?.items||r.items;
  const recommended=items.map((item,index)=>m['recommendedQuantity_'+index]??item.quantity);
  if(recommended.some(value=>typeof value!=='number'||!Number.isFinite(value)||value<0||value>100000))throw new FlowError('Confira as quantidades recomendadas.');
  for(const [index] of items.entries())if(m['recommendedQuantity_'+index]!==undefined&&!Number.isInteger(m['recommendedQuantity_'+index]))throw new FlowError('Informe quantidades recomendadas inteiras.');
  const changed=items.some((item,index)=>recommended[index]!==item.quantity);
  if(m.quantityAssessment==='Adequadas'&&changed)throw new FlowError('A quantidade recomendada é diferente da solicitada. Atualize a avaliação das quantidades.');
  if(m.quantityAssessment!=='Adequadas'&&!changed)throw new FlowError('Informe ao menos uma quantidade recomendada diferente da solicitada.');
  if(m.quantityAssessment==='Podem ser reduzidas'&&items.some((item,index)=>Number(recommended[index])>item.quantity))throw new FlowError('A recomendação de redução não pode aumentar quantidades.');
  if(items.length&&!recommended.some(value=>Number(value)>0))throw new FlowError('A recomendação deve manter ao menos um item; caso contrário, rejeite ou adie a solicitação.');
  if(!['Aprovar integralmente','Aprovar parcialmente','Medida provisória'].includes(String(m.recommendation))||!m.analysis||!m.opinionReason||!m.validatedPriority||!m.recommendedScope)throw new FlowError('Registre recomendação, prioridade validada, escopo, análise e justificativa no parecer.');
  if(fields.some(f=>m[f.key]==='Não')&&!m.reviewNotes)throw new FlowError('Explique os itens de conferência marcados Não.');
  if(r.form.kind==='digital'&&(r.form.fields.personalData==='Sim'||r.form.fields.integrations==='Sim')&&(m.technicalReview!=='Concluída'||!m.technicalReviewer||!m.technicalReviewDate))throw new FlowError('Conclua a validação técnica e de privacidade antes de encaminhar.');
}
