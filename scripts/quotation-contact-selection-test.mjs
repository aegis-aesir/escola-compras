import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'esbuild';
assert.ok(existsSync('app/quotation-contact-selection.ts'),'a seleção deve reunir toda a agenda e a prévia, sem restringir a fornecedores');
await build({entryPoints:['app/quotation-contact-selection.ts'],outfile:'outputs/quotation-contact-selection.mjs',bundle:true,platform:'node',format:'esm'});
const {buildQuotationContactChoices,initialQuotationSelection,filterQuotationChoices}=await import('../outputs/quotation-contact-selection.mjs');
const request={id:'TEST-REQUEST',version:3,status:'quoting',items:[{name:'Papel A4 TESTE',category:'Papelaria',quantity:1,unit:'resma'}],generalApproval:{actor:'DG TESTE',at:'2026-11-14T12:00:00Z',reason:'Teste'},quotes:[]};
const entry=(id,name,phone,extra={})=>({id,name,phone,version:2,kind:'agenda_contact',classification:'unclassified',...extra});
const entries=[
 entry('general','Álvaro TESTE','(92) 99999-0001',{classification:'general'}),
 entry('national','Nacional TESTE','5511999990002',{kind:'supplier',classification:'supplier',category:'Papelaria',scope:'national'}),
 entry('legacy-duplicate','Duplicado TESTE','5592999990003'),
 entry('compatible','Papelaria TESTE','+55 (92) 99999-0003',{kind:'supplier',classification:'supplier',category:'Papelaria',scope:'local'}),
 entry('unclassified','Contato TESTE','92999990004',{category:'Papelaria',scope:'local'}),
 entry('invalid','Inválido TESTE','sem número'),
 entry('school','Escola TESTE','+55 92 9201-7107'),
 entry('legacy','Legado TESTE','9292017106'),
 entry('out-of-segment','Alimentos TESTE','92999990008',{kind:'supplier',classification:'supplier',category:'Alimentos',scope:'local'}),
];
const sync={syncId:'SYNC-TEST',state:'review',contacts:[{name:'Nome duplicado TESTE',phone:'92999990003'},{name:'Prévia TESTE',phone:'+55 92 99999-0005'}]};
const before=JSON.stringify({entries,sync});
const choices=buildQuotationContactChoices(request,entries,sync);
assert.equal(choices.length,9,'deduplicar fornecedor/agenda/prévia por telefone, preservando inválidos visíveis');
assert.equal(choices[0].name,'Papelaria TESTE','compatíveis primeiro e fornecedor prevalece sobre agenda duplicada');
assert.deepEqual(choices[0].itemIndexes,[0]);
assert.deepEqual(choices[0].selection,{kind:'saved',id:'compatible',version:2,phone:'+5592999990003'});
assert.equal(choices[0].key,'saved:compatible:2:+5592999990003');
assert.deepEqual(initialQuotationSelection(choices),['saved:compatible:2:+5592999990003']);
assert.equal(choices.find(c=>c.name==='Legado TESTE').phone,'+559292017106','não inventar nono dígito');
assert.ok(choices.find(c=>c.name==='Escola TESTE').disabledReason);
assert.ok(choices.find(c=>c.name==='Inválido TESTE').disabledReason);
const preview=choices.find(c=>c.name==='Prévia TESTE');
assert.equal(preview.sourceLabel,'WhatsApp · prévia');
assert.deepEqual(preview.selection,{kind:'sync',syncId:'SYNC-TEST',phone:'+5592999990005'});
assert.equal(preview.key,'sync:SYNC-TEST:+5592999990005');
assert.equal(preview.classification,'unclassified');
assert.equal(preview.category,undefined);
assert.equal(preview.scope,undefined);
assert.equal(buildQuotationContactChoices(request,entries,{...sync,state:'running'}).length,8,'somente prévia concluída entra na escolha');
assert.equal(buildQuotationContactChoices({...request,status:'national'},entries,sync).filter(c=>c.recommended).length,2);
assert.equal(buildQuotationContactChoices({...request,items:[{name:'Sem categoria'}]},entries,sync).filter(c=>c.recommended).length,0);
assert.equal(JSON.stringify({entries,sync}),before,'não alterar cadastro nem inferir classificação');
assert.deepEqual(filterQuotationChoices(choices,'alvaro','all',[]).map(c=>c.name),['Álvaro TESTE']);
assert.deepEqual(filterQuotationChoices(choices,'92 99999-0005','all',[]).map(c=>c.name),['Prévia TESTE']);
assert.deepEqual(filterQuotationChoices(choices,'','selected',[preview.key]).map(c=>c.name),['Prévia TESTE']);
assert.deepEqual(filterQuotationChoices(choices,'','recommended',[]).map(c=>c.name),['Papelaria TESTE']);
assert.deepEqual(filterQuotationChoices(choices,'','selected',[]),[],'limpar seleção continua vazia');
// O normalizador aceita números internacionais menores que o transporte do WhatsApp.
const shortChoices=buildQuotationContactChoices(request,[entry('short-supplier','Número curto TESTE','+1234567',{kind:'supplier',classification:'supplier',category:'Papelaria',scope:'local'})],{...sync,contacts:[{name:'Prévia curta TESTE',phone:'+123456789'},{name:'Limite válido TESTE',phone:'+1234567890'}]});
assert.equal(typeof shortChoices.find(c=>c.name==='Número curto TESTE').disabledReason,'string','telefone curto salvo precisa ficar visível e indisponível para envio');
assert.equal(shortChoices.find(c=>c.name==='Número curto TESTE').recommended,false,'não sugerir telefone incompatível com transporte');
assert.match(shortChoices.find(c=>c.name==='Prévia curta TESTE').disabledReason,/incompatível com.*envio/i);
assert.equal(shortChoices.find(c=>c.name==='Limite válido TESTE').disabledReason,undefined,'aceitar o limite de dez dígitos já admitido pelo transporte');
assert.deepEqual(initialQuotationSelection(shortChoices),[],'número curto compatível por categoria nunca é pré-selecionado');
const many=Array.from({length:105},(_,i)=>({...choices[0],key:'contact-'+i}));
assert.equal(initialQuotationSelection(many).length,100);
assert.equal(initialQuotationSelection([{...choices[0],disabledReason:'Indisponível'}]).length,0);
console.log('PASS: agenda completa, prévia, dedupe, sugestões, referências, inválidos, escola, números legados, seleção inicial limitada e busca/filtros.');
await build({entryPoints:['app/quotation-message-form.tsx'],outfile:'outputs/quotation-contact-form-test.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react'],loader:{'.css':'empty'}});
const {createElement}=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const {default:Form}=await import('../outputs/quotation-contact-form-test.mjs');
const markup=renderToStaticMarkup(createElement(Form,{request,suppliers:entries.filter(entry=>entry.kind===`supplier`),busy:false,error:'',onPrepare:()=>assert.fail('renderizar não prepara mensagens')}));
assert.match(markup,/Contatos para cotação/);
assert.match(markup,/Carregando contatos/,'esperar agenda completa em vez de mostrar apenas fornecedores');
assert.match(markup,/Buscar contatos/);
assert.match(markup,/>Todos</);
assert.match(markup,/>Sugeridos</);
assert.match(markup,/>Selecionados</);
assert.equal((markup.match(/<textarea\b/g)||[]).length,1);
assert.match(markup,/Olá, \{\{contato\}\}!/);
assert.match(markup,/<button[^>]*type="submit"[^>]*disabled/);
console.log('PASS: carregamento explícito, filtros acessíveis, modelo genérico e nenhum preparo ao renderizar.');

// Fixture interativa isolada: transporte e preparação são inteiramente fictícios.
const {readFile,writeFile}=await import('node:fs/promises');
const browserChoices=[...choices,...Array.from({length:28},(_,i)=>({...choices.find(c=>c.name==='Álvaro TESTE'),name:'Pessoa de teste '+String(i+1).padStart(2,'0'),phone:'+559299998'+String(i).padStart(4,'0'),key:'saved:test-extra-'+i+':1:+559299998'+String(i).padStart(4,'0'),selection:{kind:'saved',id:'test-extra-'+i,version:1,phone:'+559299998'+String(i).padStart(4,'0')}}))];
const fixtureRequest={...request,code:'CE-TESTE',title:'Material TESTE LOCAL'};
const harness=`import React,{useState}from'react';import{createRoot}from'react-dom/client';import Form from './app/quotation-message-form';let fail=false;window.fetch=async url=>{if(!String(url).startsWith('/api/contacts?quotationRequestId='))throw Error('Fixture bloqueia APIs reais');return fail?Response.json({error:'Falha de teste; tente novamente.'},{status:503}):Response.json(${JSON.stringify({requestId:request.id,requestVersion:request.version,choices:browserChoices})})};function App(){const[epoch,setEpoch]=useState(0),[result,setResult]=useState('');return <><p>TESTE LOCAL: nenhuma API ou mensagem real.</p><button onClick={()=>{fail=!fail;setEpoch(x=>x+1)}}>Alternar falha fictícia de carregamento</button><Form key={epoch} request={${JSON.stringify(fixtureRequest)}} suppliers={[]} busy={false} error="" onPrepare={async recipients=>{setResult('TESTE LOCAL: '+recipients.length+' destinatários recebidos; '+recipients.filter(c=>c.kind==='sync').length+' da prévia. Nenhuma tarefa real criada.');await new Promise(resolve=>setTimeout(resolve,350));return true}}/><output aria-label="Resultado fictício">{result}</output></>}createRoot(document.getElementById('root')).render(<App/>);`;
const bundle=await build({stdin:{contents:harness,resolveDir:process.cwd(),loader:'jsx'},bundle:true,platform:'browser',format:'esm',write:false,loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const css=(await Promise.all(['globals.css','appearance.css','budget.css','redesign.css','quotation-contacts.css'].map(file=>readFile('app/'+file,'utf8')))).join('\n');
await writeFile('outputs/quotation-contact-selection-ui.html',`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TESTE LOCAL · Todos os contatos</title><style>${css}</style><body><main style="max-width:960px;margin:24px auto;padding:16px"><h1>Preparar cotação · dados fictícios</h1><div id="root"></div></main><script type="module">${bundle.outputFiles[0].text}</script></body></html>`);
console.log('Fixture interativa: outputs/quotation-contact-selection-ui.html (37 contatos fictícios, paginação, falha/retry e preparação simulada).');
