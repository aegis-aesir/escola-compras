import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await build({entryPoints:['app/integration-panel.tsx'],outfile:'outputs/estimate-criteria-ui.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const {ResearchPanel}=await import('../outputs/estimate-criteria-ui.mjs?'+Date.now());
const request={id:'test',version:1,status:'pending',items:[{name:'Monitor Rhadium',spec:'19 polegadas LCD 75Hz',brand:'Rhadium',quantity:5,unit:'un.'}]};
function render(role){return renderToStaticMarkup(createElement(ResearchPanel,{request,data:{me:{role},integrations:{jobs:[],bridgeConfigured:true}},busy:false,onSave:async()=>true}))}
for(const role of ['admin','administrativo']){const html=render(role);assert.match(html,/value="Monitor Rhadium"/);assert.match(html,/19 polegadas LCD 75Hz/);assert.match(html,/Autorizar produtos similares/);assert.match(html,/Salvar critérios e iniciar pesquisa automática/);assert.doesNotMatch(html,/type="checkbox" checked/)}
for(const role of ['solicitante','financeiro','geral'])assert.doesNotMatch(render(role),/Autorizar produtos similares/);
console.log('PASS: critérios preenchidos antes da pesquisa, similares desmarcados e controles apenas para Master/ADM.');
