import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
await build({stdin:{contents:"export * from './lib/budget-files'; export * from './lib/local-auth';",resolveDir:process.cwd()},outfile:'outputs/budget-files-tests.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/budget-files-tests.mjs');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],r2Buckets:['BUCKET']});
try{
 const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET'),env={DB:db,BUCKET:bucket};
 for(const sql of (await readFile('drizzle/0000_flawless_korvac.sql','utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 const put=(id,kind,data)=>db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 const cookies={};for(const [name,role]of [['master','admin'],['setor','solicitante'],['outro','solicitante'],['diretora','geral']]){
  await put('user:'+name,'local_user',{username:name,name:'TESTE '+name,role,department:'Administrativo',active:true,mustChangePassword:false,passwordHash:await api.hashPassword('FAKE123!')});
  const r=await api.authEndpoint(new Request('https://example.com/api/auth/login',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({username:name,password:'FAKE123!'})}),env);assert.equal(r.status,200);cookies[name]=r.headers.get('set-cookie').split(';')[0];
 }
 await put('req1','request',{authorId:'user:setor',status:'estimating'});
 await put('req2','request',{authorId:'user:outro',status:'general_review'});
 const call=(path='',user,init={})=>api.filesEndpoint(new Request('https://example.com/api/files'+path,{...init,headers:{...(user?{Cookie:cookies[user]}:{}),...(init.headers||{})}}),env);
 const upload=(user,requestId,visibility='request',name='teste.pdf',contents='%PDF-1.4 TESTE')=>{const f=new FormData();f.set('requestId',requestId);f.set('visibility',visibility);f.set('file',new File([contents],name,{type:'application/pdf'}));return call('',user,{method:'POST',headers:{Origin:'https://example.com'},body:f})};
 await put('draft1','request_draft',{authorId:'user:setor',status:'draft',values:{title:''}});
 assert.equal((await upload('outro','draft1')).status,404);
 assert.equal((await upload('master','draft1')).status,404);
 assert.equal((await upload('setor','draft1','internal')).status,403);
 const draftUpload=await upload('setor','draft1');assert.equal(draftUpload.status,200);const draftFile=(await draftUpload.json()).id;
 assert.equal((await call('/'+draftFile,'setor')).status,200);
 assert.equal((await call('/'+draftFile,'master')).status,404);
 await db.prepare("UPDATE records SET kind='request',data=?,version=version+1 WHERE id='draft1'").bind(JSON.stringify({authorId:'user:setor',status:'estimating'})).run();
 assert.equal((await call('/'+draftFile,'master')).status,200);
 assert.equal((await (await call('?requestId=draft1','setor')).json()).files.length,1);
 assert.equal((await call('?requestId=req1')).status,401);
 assert.equal((await upload('outro','req1')).status,404);
 assert.equal((await upload('setor','req1','internal')).status,403);
 assert.equal((await upload('diretora','req2')).status,403);
 assert.equal((await upload('setor','req1','request','malicioso.html','<html>')).status,400);
 assert.equal((await upload('setor','req1','request','falso.pdf','<script>')).status,400);
 const ok=await upload('setor','req1');assert.equal(ok.status,200);const file=await ok.json();assert.ok(file.id);
 const internal=await upload('master','req1','internal');assert.equal(internal.status,200);const internalId=(await internal.json()).id;
 const listed=await (await call('?requestId=req1','setor')).json();assert.equal(listed.files.length,1);assert.equal(listed.files[0].key,undefined);
 assert.equal((await call('/'+file.id,'outro')).status,404);
 assert.equal((await call('/'+internalId,'setor')).status,404);
 const download=await call('/'+file.id,'setor');assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/attachment/);assert.equal(download.headers.get('x-content-type-options'),'nosniff');assert.equal(download.headers.get('content-type'),'application/octet-stream');
 const csrf=new FormData();csrf.set('requestId','req1');assert.equal((await call('','setor',{method:'POST',headers:{Origin:'https://evil.example'},body:csrf})).status,403);
 assert.equal((await upload('setor','req1','request','grande.pdf','%PDF-'+ 'a'.repeat(5*1024*1024))).status,413);
 for(let i=1;i<20;i++){const r=await upload('setor','req1');if(i===19){assert.equal(r.status,400)}else assert.equal(r.status,200)}
 console.log('PASS: private attachments, cross-user restrictions, internal visibility, CSRF, type signatures, download headers, size and count limits. No real messages.');
}finally{await mf.dispose()}
