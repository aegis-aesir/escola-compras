import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
await build({entryPoints:['lib/integrations.ts'],outfile:'outputs/archive-integrations.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/api/data/route.ts'],outfile:'outputs/archive-route.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'test-bindings',setup(b){
 b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'test'}));
 b.onResolve({filter:/local-session$/},()=>({path:'session',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='bindings'?'export const env=globalThis.archiveTestEnv;':'export const currentLocalUser=async()=>globalThis.archiveTestUser;',loader:'js'}));
}}]});
const integration=await import('../outputs/archive-integrations.mjs');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB'),env={DB:db,WHATSAPP_SEND_ENABLED:'false'},now='2026-11-11T15:00:00.000Z';
 for(const sql of (await readFile('drizzle/0000_flawless_korvac.sql','utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 await db.prepare('INSERT INTO school VALUES(1,?,?)').bind('test',JSON.stringify({minQuotes:1,holidays:[]})).run();
 const put=(id,kind,data)=>db.prepare('INSERT INTO records VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 const archived={at:now,actor:'Master teste',reason:'Solicitação arquivada de teste'},request={id:'archived',version:1,code:'CE-ARCHIVED',status:'estimating',items:[{name:'Papel teste',category:'Papelaria',quantity:1,unit:'resma',spec:'Teste'}],quotes:[],form:{fields:{referenceMonth:'2026-11'}},archived};
 await put(request.id,'request',request);
 await put('queued','integration_job',{id:'queued',requestId:request.id,type:'estimate_search',state:'queued',attempts:0,createdAt:now,updatedAt:now,nextAttemptAt:now});
 await put('whatsapp-queued','integration_job',{id:'whatsapp-queued',requestId:request.id,type:'whatsapp_quote',state:'queued',attempts:0,createdAt:now,updatedAt:now,nextAttemptAt:now});
 await put('quote-request','request',{...request,id:'quote-request',status:'quoting',generalApproval:{at:now,actor:'DG',reason:'Aprovado'},localDeadline:'2026-11-10T15:00:00.000Z'});
 assert.equal(await integration.claimJob(db,env,now,false),null);
 await assert.rejects(()=>integration.enqueueSearch(db,request,'Teste',now));
 await assert.rejects(()=>integration.enqueueSupplierSearch(db,{...request,status:'quoting',generalApproval:{}},'Teste',now));
 await integration.tick(db,env,now);
 assert.equal((await integration.row(db,'quote-request','request')).status,'quoting');
 assert.equal((await integration.row(db,request.id,'request')).version,1);
 assert.equal((await integration.rows(db,'integration_job')).length,2);
 assert.ok((await integration.rows(db,'integration_job')).every(j=>j.state==='queued'&&j.attempts===0),'fila pausada sem cancelar, despachar ou apagar');
 await put('invoice','budget_invoice',{requestId:request.id,month:'2026-11',amount:12.5,number:'NF-TESTE'});
 await db.batch(Array.from({length:225},(_,i)=>db.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').bind('audit-'+i,i===0?'invoice':request.id,'Teste','Evento preservado '+i,now)));
 await put('closed','budget_closing',{month:'2026-11',status:'Concluído',snapshot:{totals:{realized:12.5}}});
 globalThis.archiveTestEnv=env;globalThis.archiveTestUser={id:'master',name:'TESTE Master',role:'admin'};
 const api=await import('../outputs/archive-route.mjs');
 const history=await api.GET(new Request('https://example.com/api/data?historyFor='+request.id));assert.equal(history.status,200);assert.equal((await history.json()).activity.length,225,'histórico completo além dos 200 eventos incluindo NF');
 const post=(action,version,reason='Registro fictício para teste')=>api.POST(new Request('https://example.com/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:request.id,version,reason})}));
 assert.equal((await post('restore_request',1)).status,200,'restauração de metadados preserva fechamento concluído');
 assert.equal((await post('archive_request',2)).status,200,'arquivamento permitido sem editar o mês financeiro fechado');
 assert.equal((await post('archive_request',2)).status,409,'versão antiga não duplica histórico');
 const final=await integration.row(db,request.id,'request');assert.equal(final.archiveHistory.length,2);assert.deepEqual((await integration.row(db,'closed','budget_closing')).snapshot,{totals:{realized:12.5}});assert.equal((await integration.row(db,'invoice','budget_invoice')).amount,12.5);
 await put('sector-own','request',{...request,id:'sector-own',authorId:'setor',archived:undefined});
 await db.batch([
  db.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').bind('sector-public','sector-own','TESTE Setor','Solicitação criada',now),
  db.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').bind('sector-internal','sector-own','TESTE Master','Documento anexado: parecer.pdf · internal',now),
 ]);
 globalThis.archiveTestUser={id:'setor',name:'TESTE Setor',role:'solicitante'};
 const sectorHistory=await api.GET(new Request('https://example.com/api/data?historyFor=sector-own'));assert.equal(sectorHistory.status,200,'setor consulta o histórico da própria solicitação');assert.deepEqual((await sectorHistory.json()).activity.map(event=>event.id),['sector-public'],'documentos internos não aparecem no histórico do setor');
 assert.equal((await api.GET(new Request('https://example.com/api/data?historyFor='+request.id))).status,403,'setor não consulta histórico de outra solicitação');
 console.log('PASS storage: filas e prazo pausados, sem mensagens, 225 eventos/fiscal completos, arquivo/restauração em mês fechado e concorrência preservam dados.');
}finally{await mf.dispose();delete globalThis.archiveTestEnv;delete globalThis.archiveTestUser}
