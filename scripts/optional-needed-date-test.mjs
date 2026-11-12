import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {budgetFixture} from './budget-fixture.mjs';
await build({entryPoints:['app/model.ts','app/budget-month.ts'],outdir:'outputs/optional-needed-date',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {requestSchema,quotationMessage,requestTimingLabel}=await import('../outputs/optional-needed-date/model.mjs');
const {monthSummary}=await import('../outputs/optional-needed-date/budget-month.mjs');
for(const kind of ['monthly','emergency','digital']){
 const input=budgetFixture(kind);delete input.neededBy;
 assert.equal(requestSchema.parse(input).neededBy,'');
 assert.equal(requestSchema.parse({...input,neededBy:''}).neededBy,'');
 assert.equal(requestSchema.parse({...input,neededBy:'2026-12-08'}).neededBy,'2026-12-08');
 for(const quantity of [0,-1,1.25,100001])assert.equal(requestSchema.safeParse({...input,items:input.items.map(item=>({...item,quantity}))}).success,false);
 for(const quantity of [1,12,100000])assert.equal(requestSchema.parse({...input,items:input.items.map(item=>({...item,quantity}))}).items[0].quantity,quantity);
 for(const neededBy of ['2026-02-30','amanhã','2026-13-01'])assert.equal(requestSchema.safeParse({...input,neededBy}).success,false);
}
const r={...budgetFixture('monthly'),id:'r',code:'CE-TESTE',status:'received',createdAt:'2026-11-11T15:00:00Z',quotes:[],neededBy:'',form:{fields:{referenceMonth:'2026-12'}},management:{receiptDate:'2026-12-08'}};
assert.match(requestTimingLabel(r),/saldo.*12\/2026/);
assert.match(requestTimingLabel({...r,management:{...r.management,referenceMonth:'2027-01'}}),/01\/2027/);
assert.equal(requestTimingLabel({...r,neededBy:'2026-12-08'}),'08/12/2026');
for(const neededBy of ['',undefined]){const text=quotationMessage({...r,neededBy},{name:'Fornecedor fictício'});assert.match(text,/Sem data específica/);assert.doesNotMatch(text,/undefined|Invalid Date|Necessidade até:/);}
assert.match(quotationMessage({...r,neededBy:'2026-12-08'},{name:'Fornecedor fictício'}),/Necessidade até: 08\/12\/2026/);
assert.equal(monthSummary([r],[],'2026-12',{holidays:[],minQuotes:1},'2026-12-09T15:00:00Z').indicators.deliveryOnTime,0);
assert.equal(monthSummary([{...r,neededBy:'2026-12-08'}],[],'2026-12',{holidays:[],minQuotes:1},'2026-12-09T15:00:00Z').indicators.deliveryOnTime,1);
console.log('PASS: data opcional nos três modelos, datas inválidas rejeitadas, prazo existente preservado, competência e mensagens sem dia inventado, indicador só com prazo informado.');
