import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';

await build({stdin:{contents:"export * from './lib/integrations';",resolveDir:process.cwd()},outfile:'outputs/estimate-trigger-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/estimate-trigger-test.mjs?test='+Date.now());
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});

try {
  const db=await mf.getD1Database('DB');
  const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(name=>name.endsWith('.sql')),'utf8');
  for(const statement of sql.split('--> statement-breakpoint').map(value=>value.trim()).filter(Boolean))await db.prepare(statement).run();
  const now='2026-11-11T20:00:00.000Z';
  await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({minQuotes:3})).run();
  const request={id:'approval-trigger',status:'pending',version:1,items:[{name:'Material hidráulico',spec:'Reposição',unit:'un.',quantity:2}],quotes:[],createdAt:now,updatedAt:now};
  await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind(request.id,'request',JSON.stringify(request)).run();

  await api.tick(db,{},now);
  assert.equal((await api.rows(db,'integration_job')).filter(job=>job.type==='estimate_search').length,0,'a ponte não inicia a estimativa antes da decisão administrativa');

  const saved=(await api.rows(db,'request')).find(row=>row.id===request.id);
  await api.startEstimateSearch(db,saved,'Diretoria Administrativa',now);
  const started=(await api.rows(db,'request')).find(row=>row.id===request.id);
  const jobs=(await api.rows(db,'integration_job')).filter(job=>job.requestId===request.id&&job.type==='estimate_search');
  assert.equal(started.status,'estimating','o gatilho administrativo inicia a etapa automática');
  assert.equal(jobs.length,1,'o gatilho administrativo cria a pesquisa do item');
  assert.equal(jobs[0].state,'queued');
  console.log('Estimate trigger: bridge waits for administrative start and then queues research.');
} finally {
  await mf.dispose();
}
