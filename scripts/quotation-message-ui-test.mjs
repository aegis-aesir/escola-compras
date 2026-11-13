import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile,writeFile} from 'node:fs/promises';

await build({entryPoints:['app/quotation-message-form.tsx'],outfile:'outputs/quotation-message-ui/component.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const {default:Form}=await import('../outputs/quotation-message-ui/component.mjs');
const request={id:'request-ui',code:'CE-TESTE',version:1,status:'quoting',items:[{name:'Registro para mictório TESTE',category:'Manutenção',quantity:4,unit:'un.',spec:'Especificação fictícia para teste local'}],quotes:[],generalApproval:{actor:'DG TESTE',at:'2026-11-13T12:00:00Z',reason:'Necessidade aprovada'}};
const suppliers=[
 {id:'00000000-0000-4000-8000-000000000001',name:'Fornecedor A TESTE',contact:'Ana TESTE',category:'Materiais de construção',scope:'local',phone:'5592999990001'},
 {id:'00000000-0000-4000-8000-000000000002',name:'Fornecedor B TESTE',contact:'Bruno TESTE',category:'Homecenter',scope:'local',phone:'5592999990002'},
 {id:'00000000-0000-4000-8000-000000000003',name:'Fornecedor Nacional TESTE',contact:'Contato TESTE',category:'Materiais de construção',scope:'national',phone:'5511999990003'},
 {id:'00000000-0000-4000-8000-000000000004',name:'Fornecedor incompatível TESTE',contact:'',category:'Alimentos',scope:'local',phone:'5592999990004'},
 {id:'00000000-0000-4000-8000-000000000005',name:'Prestador de manutenção TESTE',contact:'',category:'Manutenção',scope:'local',phone:'5592999990005'},
];
const render=r=>renderToStaticMarkup(createElement(Form,{request:r,suppliers,busy:false,error:'',onPrepare:async()=>true}));
const markup=render(request);
assert.equal((markup.match(/type="checkbox"/g)||[]).length,2);
assert.doesNotMatch(markup,/<select\b|checked=""|Fornecedor incompatível TESTE|Fornecedor Nacional TESTE|Prestador de manutenção TESTE/);
assert.equal((markup.match(/<textarea\b/g)||[]).length,1,'um único modelo para todos os contatos');
assert.match(markup,/Olá, \{\{contato\}\}!/);
assert.doesNotMatch(markup,/Olá, Ana TESTE|Olá, Bruno TESTE/,'o modelo da tela não vem personalizado');
assert.match(markup,/disabled=""[^>]*>[\s\S]*?Preparar cotações no OpenClaw \(0\)/);
assert.equal((render({...request,status:'national'}).match(/type="checkbox"/g)||[]).length,3);
assert.ok(render({...request,items:[{...request.items[0],category:undefined}]}).includes('Há itens sem categoria'));

const harness=`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import Form from './app/quotation-message-form';function App(){const[result,setResult]=useState([]);return <><Form request={${JSON.stringify(request)}} suppliers={${JSON.stringify(suppliers)}} busy={false} error="" onPrepare={async ids=>{setResult(ids);return true}}/><output aria-label="Resultado fictício">{result.length?'TESTE LOCAL: '+result.length+' fornecedores recebidos; nenhuma tarefa real criada.':''}</output></>}createRoot(document.getElementById('root')).render(<App/>);`;
await build({stdin:{contents:harness,resolveDir:process.cwd(),loader:'jsx'},outfile:'outputs/quotation-message-ui/client.js',bundle:true,platform:'browser',format:'esm',define:{'process.env.NODE_ENV':'"production"'}});
const css=(await Promise.all(['globals.css','appearance.css','budget.css','redesign.css'].map(file=>readFile('app/'+file,'utf8')))).join('\n');
await writeFile('outputs/quotation-message-ui/ui-check.html',`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TESTE LOCAL · Fornecedores compatíveis</title><style>${css}</style><body><main style="max-width:960px;margin:24px auto;padding:16px"><h1>Preparar cotação · dados fictícios</h1><div id="root"></div></main><script type="module" src="/client.js"></script></body></html>`);
console.log('PASS: fornecedores por checkbox, etapa local/nacional, sem seleção automática e um único modelo genérico; fixture interativa com preparação simulada gerada.');
