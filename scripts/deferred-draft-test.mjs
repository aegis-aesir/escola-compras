import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {budgetFixture} from './budget-fixture.mjs';

await build({entryPoints:['app/deferred-draft.ts'],outfile:'outputs/deferred-draft.mjs',bundle:true,platform:'node',format:'esm'});
const {deferredDraftRecord,canSubmitDeferredDraft}=await import('../outputs/deferred-draft.mjs');

const fixture=budgetFixture('monthly');
fixture.form.references=[{itemIndex:0,supplier:'Fonte preliminar TESTE',currency:'BRL',reference:'https://example.com/referencia',amount:10.15}];
const originalItem={...fixture.items[0],quantity:8};
const request={...fixture,id:'pedido-original',code:'CE-ORIGINAL',authorId:'user:setor',authorName:'Setor TESTE',version:4,status:'deferred',quotes:[{id:'nao-copiar'}],estimate:{total:81.2,references:[],freight:0},adminReview:'Não copiar',generalApproval:{actor:'DG',at:'2026-11-10T15:00:00.000Z',reason:'Não copiar'},decision:'Não copiar',executionNotes:[{at:'2026-11-10',actor:'Admin',note:'Não copiar'}],management:{referenceMonth:'2026-12',realizedAmount:50},originalScope:{items:[originalItem],form:{...fixture.form,fields:{...fixture.form.fields,correctionResponse:'Remover do novo rascunho'}}},deferred:{reason:'Reavaliar no próximo mês',actor:'DG',at:'2026-11-10T15:00:00.000Z'}};
const record=deferredDraftRecord(request,'11111111-1111-4111-8111-111111111111','2026-11-10T15:00:00.000Z');
assert.equal(record.id,'11111111-1111-4111-8111-111111111111');assert.equal(record.authorId,request.authorId);assert.equal(record.status,'deferred');assert.equal(record.sourceRequestId,request.id);assert.equal(record.sourceCode,request.code);assert.equal(record.deferReason,request.deferred.reason);assert.equal(record.availableMonth,'2027-01');assert.equal(record.values.items[0].quantity,8);assert.deepEqual(record.values.references,request.originalScope.form.references);
for(const key of ['referenceMonth','situation','originalRequestId','correctionResponse'])assert.equal(record.values.fields[key],undefined,key+' não deve ser copiado');
for(const key of ['estimate','adminReview','generalApproval','decision','quotes','executionNotes','management'])assert.equal(record[key],undefined,key+' não deve existir no rascunho');
assert.equal(canSubmitDeferredDraft(record,'2026-12-31T23:59:59-04:00'),false);assert.equal(canSubmitDeferredDraft(record,'2027-01-01T00:00:00-04:00'),true);
const withoutMonth=deferredDraftRecord({...request,form:undefined,originalScope:undefined,management:undefined},'22222222-2222-4222-8222-222222222222','2026-12-01T02:00:00.000Z');
assert.equal(withoutMonth.availableMonth,'2026-11','sem competência usa o mês civil do adiamento em Manaus');
console.log('PASS: cópia adiada editável, escopo original, dados internos excluídos, virada anual e liberação mensal em Manaus.');
