import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
await build({stdin:{contents:"export * from './lib/integration-endpoint';",resolveDir:process.cwd()},outfile:'outputs/supplier-import-test.mjs',bundle:true,platform:'node',format:'esm'});
const {bridgeEndpoint}=await import('../outputs/supplier-import-test.mjs');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
try {
 const db=await mf.getD1Database('DB');
 const migration=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const sql of migration.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 const env={DB:db,INTEGRATION_SECRET:'TEST-ONLY-'.repeat(8)};
 const supplier={name:'Fornecedor fictício',phone:'+5592999990011',category:'Tintas',contact:'',scope:'local',city:'Manaus',state:'AM'};
 const batch={source:'test.vcf',contacts:[supplier]};
 async function send(batch,signed=true) {
  const raw=JSON.stringify({op:'import_suppliers',batch}),ts=String(Date.now());
  return bridgeEndpoint(new Request('https://example.com/api/integrations/bridge',{method:'POST',body:raw,headers:{'content-type':'application/json','x-estrelas-timestamp':ts,'x-estrelas-signature':signed?'sha256='+createHmac('sha256',env.INTEGRATION_SECRET).update(ts+'.'+raw).digest('hex'):''}}),env);
 }
 assert.equal((await send(batch,false)).status,401);
 const first=await send(batch);assert.equal(first.status,200,'authenticated batch import is supported');
 assert.equal((await first.json()).created,1);
 const again=await (await send({...batch,contacts:[{...supplier,phone:supplier.phone.slice(1)}]})).json();
 assert.equal(again.created,0);assert.equal(again.existing,1);
 const conflict=await (await send({...batch,contacts:[{...supplier,category:'Elétrica'}]})).json();
 assert.equal(conflict.conflicts,1);assert.equal(conflict.created,0);
 assert.equal((await send({...batch,contacts:[{...supplier,phone:'+5592999990022'},{...supplier,phone:'invalid'}]})).status,400);
 const raceBatch={...batch,contacts:[{...supplier,phone:'+5592999990033'}]};
 const race=await Promise.all([send(raceBatch),send(raceBatch)]);
 const raceResults=await Promise.all(race.map(r=>r.json()));
 assert.equal(raceResults.reduce((n,r)=>n+r.created,0),1);
 assert.equal(raceResults.reduce((n,r)=>n+r.existing,0),1);
 const saved=await db.prepare("SELECT data FROM records WHERE kind='supplier'").all();
 assert.equal(saved.results.length,2,'invalid batch creates nothing; racing import deduplicates');
 assert.equal(JSON.parse(saved.results[0].data).importSource.source,'test.vcf');
 assert.equal(JSON.parse(saved.results[0].data).city,'Manaus');
 assert.equal((await db.prepare('SELECT count(*) AS n FROM audit').first()).n,2);
 assert.equal((await db.prepare("SELECT count(*) AS n FROM records WHERE kind!='supplier'").first()).n,0,'no jobs/messages created');
 console.log('Supplier import: authentication, validation, deduplication, concurrency, provenance and audit passed.');
} finally {await mf.dispose();}
