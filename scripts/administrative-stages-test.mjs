import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {budgetFixture} from './budget-fixture.mjs';
await build({entryPoints:['app/workflow.ts','app/access.ts','app/budget-fields.ts'],outdir:'outputs/administrative-stages',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {transition}=await import('../outputs/administrative-stages/workflow.mjs');
const {managementSections}=await import('../outputs/administrative-stages/budget-fields.mjs');
const {visibleRequests}=await import('../outputs/administrative-stages/access.mjs');
const now='2026-11-11T15:00:00.000Z',admin={role:'admin',name:'TESTE LOCAL Master'},settings={minQuotes:3,holidays:[]};
const approval={actor:'DG fictícia',at:now,reason:'Necessidade aprovada'};
const commercialTitle='Comparação e escolha comercial administrativa';
const purchase=(kind='monthly')=>({...budgetFixture(kind),id:'TESTE LOCAL etapas',version:1,authorId:'setor',status:'admin_review',quotes:[],estimate:{total:30,freight:0,references:[{unitPrice:10}]}});
const review=kind=>({...Object.fromEntries(managementSections(kind).flatMap(s=>s.fields).filter(f=>f.key.startsWith('review')&&f.type==='select').map(f=>[f.key,'Sim'])),recommendation:'Aprovar integralmente',validatedPriority:'Essencial',recommendedScope:'Todos os itens necessários',analysis:'Necessidade e quantidades conferidas',opinionReason:'Pedido justificado',technicalReview:'Concluída',technicalReviewer:'TI fictícia',technicalReviewDate:'2026-11-11'});
const save=(r,data)=>transition(r,{action:'budget_management',data},admin,[],settings,now).data;

test('avaliação financeira sai da interface dos três modelos em todas as etapas',()=>{
 for(const kind of ['monthly','emergency','digital'])for(const status of ['estimating','admin_review','general_review','quoting','national','execution','ordered','received']){
  const sections=managementSections(kind,{status,quotes:[{}],generalApproval:approval});
  assert.ok(!sections.some(s=>s.title==='Avaliação financeira informativa'));
  assert.ok(!sections.flatMap(s=>s.fields).some(f=>['financialAvailability','cashImpact','financialOwner','financialDate'].includes(f.key)));
 }
});
test('comparação comercial aguarda aprovação e propostas reais, também nos pedidos legados',()=>{
 for(const kind of ['monthly','emergency','digital']){
  for(const stage of [{status:'estimating',quotes:[{}],generalApproval:approval},{status:'admin_review',quotes:[]},{status:'general_review',quotes:[]},{status:'quoting',quotes:[],generalApproval:approval},{status:'quoting',quotes:[{}]}])assert.ok(!managementSections(kind,stage).some(s=>s.title===commercialTitle));
  for(const status of ['quoting','national','execution','ordered','received'])assert.ok(managementSections(kind,{status,quotes:[{}],generalApproval:approval}).some(s=>s.title===commercialTitle));
 }
});
test('parecer segue à DG sem avaliação financeira; conferências e validação técnica continuam exigidas',()=>{
 for(const kind of ['monthly','emergency','digital']){
  const r={...purchase(kind),management:review(kind)};
  const next=transition(r,{action:'admin_review',reason:'Encaminhar necessidade conferida'},admin,[],settings,now).data;
  assert.equal(next.status,'general_review');assert.equal(next.management.financialAvailability,undefined);
  assert.throws(()=>transition({...r,management:{...r.management,reviewComplete:'Não'}},{action:'admin_review',reason:'Tentativa sem completude'},admin,[],settings,now));
 }
 const digital=purchase('digital');digital.form.fields.personalData='Sim';
 assert.throws(()=>transition({...digital,management:{...review('digital'),technicalReview:'Pendente'}},{action:'admin_review',reason:'Tentativa sem validação técnica'},admin,[],settings,now),/validação técnica/);
});
test('API impede comparação antecipada e libera após propostas reais',()=>{
 const r=purchase();
 for(const data of [{selectionCriterion:'Menor preço'},{recommendedSupplier:'Fornecedor fictício'},{selectionReason:'Escolha prematura'},{quotationException:'Exclusividade'}])assert.throws(()=>save(r,data),/propostas|cotações/i);
 assert.throws(()=>save({...r,status:'quoting',generalApproval:approval},{selectionReason:'Escolha sem proposta'}),/propostas|cotações/i);
 const quoted={...r,status:'quoting',generalApproval:approval,quotes:[{id:'proposta-fictícia'}]};
 assert.equal(save(quoted,{selectionCriterion:'Menor preço',selectionReason:'Comparação posterior das propostas'}).management.selectionCriterion,'Menor preço');
});
test('salvar parecer preserva dados financeiros e comerciais antigos sem exigir seu preenchimento',()=>{
 const management={financialAvailability:'Integral',cashImpact:'Baixo',financialOwner:'Registro antigo',financialDate:'2026-11-10',financialNotes:'Histórico',selectionReason:'Escolha histórica',analysis:'Análise antiga'};
 const r={...purchase(),management};
 const saved=save(r,{analysis:'Análise revisada'});
 assert.deepEqual(saved.management,{...management,analysis:'Análise revisada'});
 assert.equal(save(saved,{analysis:''}).management.analysis,undefined,'campo explicitamente limpo continua podendo ser apagado');
 assert.equal(save(r,management).management.selectionReason,management.selectionReason,'abas antigas podem reenviar o mesmo valor preservado');
 const general=visibleRequests([{...r,status:'general_review',adminReview:'Conferido'}],{id:'dg',role:'geral'})[0];
 for(const key of ['financialAvailability','availableAmount','cashImpact','financialNotes'])assert.equal(general.management[key],undefined,'DG não recebe avaliação retirada');
 assert.equal(general.management.analysis,management.analysis);
});
