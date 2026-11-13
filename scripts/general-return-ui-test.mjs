import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {budgetFixture} from './budget-fixture.mjs';

await build({entryPoints:['app/budget-record-panel.tsx'],outfile:'outputs/general-return-ui/panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const {BudgetRecordPanel}=await import('../outputs/general-return-ui/panel.mjs?test='+Date.now());
const request={...budgetFixture('monthly'),id:'pedido-dg',code:'CE-TESTE',version:1,authorId:'setor',authorName:'Setor teste',createdAt:'2026-11-12T12:00:00.000Z',updatedAt:'2026-11-12T12:00:00.000Z',status:'general_review',quotes:[],estimate:{total:10,freight:0,references:[{unitPrice:10,sourceUrl:'https://example.com',sourceName:'Fonte teste',researchedOn:'2026-11-12'}],notes:'Estimativa local de teste',recordedAt:'2026-11-12T12:00:00.000Z',method:'manual'},adminReview:'Aprovar integralmente'};
const data={me:{id:'master',name:'Master',email:'',role:'admin',department:'Administrativo'},requests:[request],suppliers:[],members:[],activity:[],settings:{name:'Colégio Estrelas',legalName:'CEEA',minQuotes:3,departments:['Administrativo']}};
const estimates=createElement('details',null,createElement('summary',null,'Estimativas'));
const markup=renderToStaticMarkup(createElement(BudgetRecordPanel,{request,data,busy:false,onSave:async()=>true,estimates}));
assert.match(markup,/<option value="return_admin">Devolver para apuração administrativa<\/option>/,'a devolução deve ser uma opção da própria decisão');
assert.doesNotMatch(markup,/<summary>Devolver para apuração administrativa<\/summary>/,'a devolução não deve ocupar um colapsável separado');
const estimatePosition=markup.indexOf('<summary>Estimativas</summary>'),decisionPosition=markup.indexOf('Decisão da necessidade · Diretoria Geral'),executionPosition=markup.indexOf('<summary>Execução</summary>');
assert.ok(estimatePosition>=0&&decisionPosition>estimatePosition&&executionPosition>decisionPosition,'a decisão da DG deve ficar entre Estimativas e Execução');
assert.doesNotMatch(markup,/Prazo pertinente ao adiamento/,'o rótulo ambíguo deve sair da interface');

const panel=await readFile('app/budget-record-panel.tsx','utf8');
const drafts=await readFile('app/draft-request-form.tsx','utf8');
const requestForm=await readFile('app/budget-request-form.tsx','utf8');
const dataRoute=await readFile('app/api/data/route.ts','utf8');
assert.match(panel,/Data prevista para reavaliar a solicitação/,'o adiamento deve usar um rótulo compreensível');

assert.match(panel,/Devolver para apuração administrativa/,'Diretoria Geral precisa da ação de devolução');
assert.match(panel,/send\('return_to_admin'/,'a ação visual deve chamar a transição protegida');
assert.match(panel,/Resposta à pendência da Diretoria Geral/,'Diretoria Administrativa precisa responder à pendência');
assert.match(panel,/Salvar alterações na análise administrativa/,'a Diretoria Administrativa precisa de uma ação explícita para revisar o parecer já encaminhado');
assert.match(panel,/generalReturnHistory/,'o histórico das devoluções precisa permanecer consultável');
assert.match(panel,/mesmo protocolo/,'adiamento mantém o protocolo e o histórico');
assert.doesNotMatch(panel,/Cópia editável enviada ao setor/);

for(const text of ['Adiado','sourceCode','availableMonth','deferReason']){
  assert.ok(drafts.includes(text),`lista de rascunhos deve identificar ${text}`);
}
assert.match(requestForm,/submitBlockedReason/,'formulário precisa aceitar o bloqueio mensal de envio');
assert.match(requestForm,/disabled=\{busy\|\|!!submitBlockedReason\}/,'somente o envio deve ficar bloqueado');
assert.match(dataRoute,/reapplyDeferredRequest/,'reapresentação deve atualizar o pedido original');

console.log('PASS: devolução da Diretoria Geral e revisão adiada têm controles e identificação na interface.');
