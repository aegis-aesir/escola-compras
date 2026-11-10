import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { budgetFixture, simplifiedBudgetFixture } from './budget-fixture.mjs';

await build({entryPoints:['app/budget.ts'],outfile:'outputs/budget-simple-test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {parseBudgetForm,requestSections,budgetMonth}=await import('../outputs/budget-simple-test.mjs');
await build({entryPoints:['app/budget-month.ts'],outfile:'outputs/budget-simple-month-test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {monthSummary}=await import('../outputs/budget-simple-month-test.mjs');
const submit=(value,context={at:'2026-12-01T03:59:59Z'})=>parseBudgetForm(value.form,value.items,context);

test('os três modelos aceitam envio sem burocracia, documentos ou referências preliminares',()=>{
  for(const kind of ['monthly','emergency','digital']) {
    const value=simplifiedBudgetFixture(kind),form=submit(value);
    assert.equal(form.version,2);
    assert.equal(form.fields.classification,'Prevista pontual');
    assert.equal(form.fields.referenceMonth,'2026-11');
    assert.deepEqual(form.references,[]);
  }
});
test('competência vem do horário do servidor em Manaus e ignora mês ou vínculo forjados',()=>{
  const value=simplifiedBudgetFixture();
  Object.assign(value.form.fields,{referenceMonth:'2099-01',originalRequestId:'FALSO',situation:'Complementação'});
  assert.equal(submit(value).fields.referenceMonth,'2026-11');
  const after=submit(value,{at:'2026-12-01T04:00:00Z'});
  assert.equal(after.fields.referenceMonth,'2026-12');
  assert.equal(after.fields.situation,'Nova');
  assert.equal(after.fields.originalRequestId,undefined);
  assert.throws(()=>parseBudgetForm(value.form,value.items),/data|envio/i);
  const legacyClient=budgetFixture();
  legacyClient.form.fields.referenceMonth='2099-01';
  assert.equal(submit(legacyClient).fields.referenceMonth,'2026-11','uma aba antiga também usa a data do servidor em novos envios');
});
test('complementação posterior preserva mês original e usa vínculo confirmado pelo servidor',()=>{
  const value=simplifiedBudgetFixture(),previous=submit(value);
  value.form.fields.correctionResponse='Detalhes corrigidos conforme solicitado.';
  const after=submit(value,{at:'2027-01-10T12:00:00Z',previous,createdAt:'2026-12-01T03:59:59Z',requestCode:'CE-EXISTENTE'});
  assert.equal(after.fields.referenceMonth,'2026-11');
  assert.equal(after.fields.originalRequestId,'CE-EXISTENTE');
  assert.equal(after.fields.situation,'Complementação');
  assert.equal(budgetMonth({form:after,management:{referenceMonth:'2027-02'}}),'2027-02');
});
test('classificação única exige escolha explícita e campos administrativos continuam proibidos',()=>{
  const value=simplifiedBudgetFixture();
  for(const classification of ['',undefined,'Planejada','Prevista recorrente','Não prevista pontual','Não prevista recorrente']) {
    const copy=structuredClone(value);copy.form.fields.classification=classification;
    if(!classification||classification==='Planejada')assert.throws(()=>submit(copy));
    else assert.equal(submit(copy).fields.classification,classification);
  }
  value.form.fields.recommendedAmount=100;
  assert.throws(()=>submit(value),/não permitido/i);
});
test('formulários anteriores mantêm declarações e mês informados sem reclassificação presumida',()=>{
  const value=budgetFixture();
  const old=parseBudgetForm(value.form,value.items);
  assert.equal(old.fields.referenceMonth,'2026-12');
  assert.equal(old.fields.documentsAvailable,'Não');
  assert.equal(old.fields.origin,'Planejada');
  assert.equal(old.fields.nature,'Eventual');
  assert.equal(old.fields.classification,undefined);
  const next=simplifiedBudgetFixture();next.form.fields.correctionResponse='Atualizado apenas no novo formulário.';
  assert.equal(submit(next,{at:'2027-01-10T12:00:00Z',previous:old,createdAt:'2026-11-10T12:00:00Z',requestCode:'CE-ANTIGO'}).fields.referenceMonth,'2026-12');
});

test('resumo mensal agrupa a classificação única e mantém informações legadas explícitas',()=>{
  const value=simplifiedBudgetFixture(),form=submit(value);
  const base={...value,id:'TESTE-1',code:'CE-TESTE',form,status:'estimating',createdAt:'2026-11-10T12:00:00Z',quotes:[]};
  const legacy={...base,id:'TESTE-2',form:{...budgetFixture().form,fields:{...budgetFixture().form.fields,referenceMonth:'2026-11'}}};
  const summary=monthSummary([base,legacy],[],'2026-11',{minQuotes:3,holidays:[]},'2026-11-10T12:00:00Z');
  assert.equal(summary.groups.classification['Prevista pontual'].count,1);
  assert.equal(summary.groups.classification['Planejada · Eventual · Prevista'].count,1);
});
