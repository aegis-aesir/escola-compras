import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {readKnownWhatsAppContacts,runContactSync} from '../integrations/openclaw/contact-sync.mjs';

async function fixture(run) {
  const dir=await mkdtemp(join(tmpdir(),'estrelas-contact-test-'));
  const dbPath=join(dir,'fixture.sqlite'),db=new DatabaseSync(dbPath);
  db.exec(`CREATE TABLE channel_ingress_events(queue_name TEXT,event_id TEXT,channel_id TEXT,account_id TEXT,status TEXT,lane_key TEXT,payload_json TEXT,metadata_json TEXT,received_at INTEGER)`);
  let id=0;
  const insert=(message,{channel='whatsapp',account='operacional',payload,status='pending'}={})=>db.prepare('INSERT INTO channel_ingress_events VALUES(?,?,?,?,?,?,?,?,?)').run('fixture-whatsapp',String(++id),channel,account,status,'identity-only',payload??JSON.stringify({message,upsertType:'notify',receivedAt:1000}),null,1000+id);
  try {await run({db,dbPath,insert});} finally {db.close();await rm(dir,{recursive:true,force:true});}
}
function message(remoteJid,pushName='Pessoa fictícia',key={}) {
  return {key:{remoteJid,fromMe:false,...key},pushName,message:{conversation:'CORPO PRIVADO NÃO EXPORTAR',documentMessage:{url:'ANEXO PRIVADO'}}};
}

test('lê apenas identidades diretas da conta operacional e preserva o SQLite',async()=>fixture(async({dbPath,insert})=>{
  insert(message('5511999990001@s.whatsapp.net','Empresa fictícia'));
  insert(message('5511999990001@s.whatsapp.net','Empresa fictícia'));
  insert(message('999999999999999@lid','LID resolvido',{remoteJidAlt:'5511999990002@s.whatsapp.net'}));
  insert(message('999999999999998@lid','LID sem PN'));
  insert(message('5511999990003@g.us','Grupo',{participant:'5511999990004@s.whatsapp.net'}));
  insert(message('559292017107@s.whatsapp.net','Escola'));
  insert(message('5511999990005@s.whatsapp.net','Próprio',{fromMe:true}));
  insert(message('status@broadcast'));
  insert(message('5511999990006@s.whatsapp.net','Outra conta'),{account:'default'});
  insert(message('5511999990007@s.whatsapp.net','Outro canal'),{channel:'telegram'});
  insert(null,{payload:'null',status:'completed'});
  const before=await readFile(dbPath),beforeStat=await stat(dbPath);
  const result=await readKnownWhatsAppContacts({dbPath});
  assert.deepEqual(result.contacts,[{name:'Empresa fictícia',phone:'+5511999990001'},{name:'LID resolvido',phone:'+5511999990002'}]);
  assert.equal(result.coverage,'known_conversations');
  assert.equal(result.candidates,9);
  assert.equal(result.skipped,7);
  assert.doesNotMatch(JSON.stringify(result),/CORPO|ANEXO|documentMessage|remoteJid/);
  assert.deepEqual(await readFile(dbPath),before);
  assert.equal((await stat(dbPath)).mtimeMs,beforeStat.mtimeMs);
}));

test('falhas da fonte são explícitas e não criam banco ausente',async()=>fixture(async({db,dbPath})=>{
  await assert.rejects(readKnownWhatsAppContacts({dbPath:join(dbPath,'missing')}),{code:'source_unavailable'});
  db.exec('DROP TABLE channel_ingress_events');
  await assert.rejects(readKnownWhatsAppContacts({dbPath}),{code:'schema_unsupported'});
}));

test('combina metadados nativos de sessões sem títulos, transcrições nem conta pessoal',async()=>fixture(async({db,dbPath,insert})=>{
  db.exec('CREATE TABLE session_nodes(session_key TEXT,entry_json TEXT)');
  const add=(key,entry)=>db.prepare('INSERT INTO session_nodes VALUES(?,?)').run(key,JSON.stringify(entry));
  const entry=(phone,extra={})=>({delivery:{kind:'external',context:{channel:'whatsapp',accountId:'operacional',to:phone},origin:{provider:'whatsapp',accountId:'operacional',chatType:'direct',from:phone,label:'Nome publicado fictício'}},title:'RESUMO PRIVADO',...extra});
  add('agent:operacional:whatsapp:direct:one',entry('+5511999990001'));
  add('agent:operacional:whatsapp:direct:two',entry('whatsapp:+5511999990002',{displayName:'Empresa declarada'}));
  add('agent:operacional:whatsapp:direct:lid',entry('123456789012345@lid'));
  add('agent:operacional:whatsapp:direct:self',entry('+559292017107'));
  add('agent:default:whatsapp:direct:other',entry('+5511999990003',{delivery:{kind:'external',context:{channel:'whatsapp',accountId:'default',to:'+5511999990003'},origin:{provider:'whatsapp',accountId:'default',chatType:'direct',from:'+5511999990003'}}}));
  add('agent:operacional:whatsapp:group:g',entry('+5511999990004',{delivery:{kind:'external',context:{channel:'whatsapp',accountId:'operacional',to:'123@g.us'},origin:{provider:'whatsapp',accountId:'operacional',chatType:'group',from:'+5511999990004'}}}));
  insert(message('5511999990001@s.whatsapp.net','Nome WhatsApp'));
  const result=await readKnownWhatsAppContacts({dbPath,sessionsDbPath:dbPath});
  assert.deepEqual(result.contacts,[{name:'Nome WhatsApp',phone:'+5511999990001'},{name:'Empresa declarada',phone:'+5511999990002'}]);
  assert.deepEqual(result.sources,['ingress','session_metadata']);
  assert.equal(result.candidates,6);
  assert.equal(result.skipped,4);
  assert.doesNotMatch(JSON.stringify(result),/RESUMO|PRIVATE|entry_json|session_key/);
}));

test('5001 números distintos falham explicitamente, sem prévia truncada',async()=>fixture(async({db,dbPath,insert})=>{
  db.exec('BEGIN');
  for(let i=0;i<5001;i++)insert(message(`55119${String(i).padStart(8,'0')}@s.whatsapp.net`));
  db.exec('COMMIT');
  await assert.rejects(readKnownWhatsAppContacts({dbPath}),{code:'limit_exceeded'});
}));

test('payload incompatível no escopo não é tratado como uma agenda vazia',async()=>fixture(async({dbPath,insert})=>{
  insert(null,{payload:'{"platform":{"senderE164":"+5511999990001"}}'});
  await assert.rejects(readKnownWhatsAppContacts({dbPath}),{code:'schema_unsupported'});
}));

test('conexão da fonte recusa escrita SQLite e nomes não escalares não vazam',async()=>fixture(async({dbPath,insert})=>{
  insert(message('5511999990001@s.whatsapp.net',{conversation:'OBJETO PRIVADO'}));
  const original=DatabaseSync.prototype.exec;
  let enforced=false;
  DatabaseSync.prototype.exec=function(sql) {
    if(sql==='BEGIN') {
      assert.throws(()=>original.call(this,'CREATE TABLE forbidden_write(value TEXT)'),/readonly|read-only/i);
      enforced=true;
    }
    return original.call(this,sql);
  };
  try {
    const result=await readKnownWhatsAppContacts({dbPath});
    assert.equal(enforced,true);
    assert.deepEqual(result.contacts,[{name:'+5511999990001',phone:'+5511999990001'}]);
  } finally {DatabaseSync.prototype.exec=original;}
}));

test('LID com PN contraditório não associa identidades e par retido resolve LID anterior',async()=>fixture(async({dbPath,insert})=>{
  insert(message('100000000000001@lid','Nome antigo'));
  insert(message('100000000000001@lid','Nome pareado',{remoteJidAlt:'5511999990001@s.whatsapp.net'}));
  insert(message('100000000000002@lid','Conflito 1',{remoteJidAlt:'5511999990002@s.whatsapp.net'}));
  insert(message('100000000000002@lid','Conflito 2',{remoteJidAlt:'5511999990003@s.whatsapp.net'}));
  const result=await readKnownWhatsAppContacts({dbPath});
  assert.deepEqual(result.contacts,[{name:'Nome antigo',phone:'+5511999990001'}]);
  assert.equal(result.skipped,3);
}));

test('falha parcial retorna fonte e aviso saneado sem abrir outro caminho implícito',async()=>fixture(async({dbPath,insert})=>{
  insert(message('5511999990001@s.whatsapp.net'));
  const result=await readKnownWhatsAppContacts({dbPath,sessionsDbPath:dbPath});
  assert.deepEqual(result.sources,['ingress']);
  assert.deepEqual(result.warnings,[{source:'session_metadata',error:'schema_unsupported'}]);
}));

test('namespace hash oficial aceita só a conta operacional e a fila correspondente',async()=>fixture(async({db,dbPath,insert})=>{
  const hash=createHash('sha256').update('operacional').digest('hex').slice(0,24);
  insert(message('5511999990001@s.whatsapp.net','Fictício retido'),{account:hash});
  insert(message('5511999990002@s.whatsapp.net','Fila incompatível'),{account:hash});
  db.prepare('UPDATE channel_ingress_events SET queue_name=? WHERE event_id=?').run(JSON.stringify(['whatsapp',hash]),'1');
  const result=await readKnownWhatsAppContacts({dbPath});
  assert.deepEqual(result.contacts,[{name:'Fictício retido',phone:'+5511999990001'}]);
  assert.equal(result.candidates,1);
}));

test('índice WhatsApp com formato legado desconhecido falha de modo explícito',async()=>fixture(async({db,dbPath})=>{
  db.exec('CREATE TABLE session_nodes(session_key TEXT,entry_json TEXT)');
  db.prepare('INSERT INTO session_nodes VALUES(?,?)').run('agent:operacional:whatsapp:direct:+5511999990001',JSON.stringify({origin:{provider:'whatsapp',accountId:'operacional',from:'+5511999990001'}}));
  await assert.rejects(readKnownWhatsAppContacts({sessionsDbPath:dbPath}),{code:'schema_unsupported'});
}));

test('falhas do leitor são reduzidas aos quatro códigos públicos do protocolo',async()=>{
  for(const [code,want] of [['source_unavailable','source_unavailable'],['schema_unsupported','schema_unsupported'],['limit_exceeded','limit_exceeded'],['secret_private_code','read_failed']]) {
    const bodies=[];
    const result=await runContactSync({}, {site:async body=>{bodies.push(body);return body.op==='contact_sync_poll'?{job:{syncId:'sync',leaseToken:'lease'}}:{ok:true};},readContacts:async()=>{throw Object.assign(new Error('NOME E CAMINHO PRIVADOS'),{code});}});
    assert.equal(result.error,want);
    assert.deepEqual(bodies[1],{op:'contact_sync_result',syncId:'sync',leaseToken:'lease',page:0,contacts:[],done:true,error:want});
  }
});

test('não tenta ler fonte nem enviar resultado quando não há solicitação',async()=>{
  let reads=0;
  const bodies=[];
  await runContactSync({}, {site:async body=>{bodies.push(body);return {job:null};},readContacts:async()=>{reads++;throw Error('não abrir');}});
  assert.equal(reads,0);
  assert.deepEqual(bodies,[{op:'contact_sync_poll',protocol:'contacts-v1'}]);
});

test('entrega somente páginas de 50 com lease e sem alterar flags de envio',async()=>{
  const config={canSend:false},bodies=[];
  const contacts=Array.from({length:51},(_,i)=>({name:`Fictício ${i}`,phone:`+551199999${String(i).padStart(4,'0')}`}));
  await runContactSync(config,{site:async body=>{bodies.push(body);return body.op==='contact_sync_poll'?{job:{syncId:'sync',leaseToken:'lease',leaseUntil:'2099-01-01'}}:{ok:true};},readContacts:async()=>({contacts,candidates:53,skipped:2,coverage:'known_conversations'})});
  assert.deepEqual(bodies.slice(1),[0,1].map(page=>({op:'contact_sync_result',syncId:'sync',leaseToken:'lease',page,contacts:contacts.slice(page*50,(page+1)*50),done:page===1,counts:{candidates:53,skipped:2}})));
  assert.equal(config.canSend,false);
});

test('envia prévia vazia e erros saneados sem detalhe privado',async()=>{
  for(const source of [async()=>({contacts:[],candidates:0,skipped:0}),async()=>{throw Object.assign(new Error('SEGREDO caminho privado'),{code:'schema_unsupported'});}]) {
    const bodies=[];
    await runContactSync({}, {site:async body=>{bodies.push(body);return body.op==='contact_sync_poll'?{job:{syncId:'sync',leaseToken:'lease'}}:{ok:true};},readContacts:source});
    assert.equal(bodies.length,2);
    assert.equal(bodies[1].page,0);
    assert.equal(bodies[1].done,true);
    assert.deepEqual(bodies[1].contacts,[]);
    assert.doesNotMatch(JSON.stringify(bodies),/SEGREDO|caminho privado/);
  }
});

test('aviso de cobertura parcial acompanha apenas a última página',async()=>{
  const bodies=[];
  const contacts=Array.from({length:51},(_,i)=>({name:'Fictício',phone:`+551199999${String(i).padStart(4,'0')}`}));
  const warnings=[{source:'session_metadata',error:'source_unavailable'}];
  const result=await runContactSync({}, {site:async body=>{bodies.push(body);return body.op==='contact_sync_poll'?{job:{syncId:'sync',leaseToken:'lease'}}:{ok:true};},readContacts:async()=>({contacts,candidates:51,skipped:0,warnings})});
  assert.equal(bodies[1].warnings,undefined);
  assert.deepEqual(bodies[2].warnings,warnings);
  assert.deepEqual(result.warnings,warnings);
});

test('nomes das duas fontes respeitam 150 caracteres e mínimo dois após saneamento',async()=>fixture(async({db,dbPath,insert})=>{
  insert(message('5511999990001@s.whatsapp.net','N'.repeat(151)));
  insert(message('5511999990002@s.whatsapp.net','A'));
  insert(message('5511999990003@s.whatsapp.net','\u0000\u0001'));
  db.exec('CREATE TABLE session_nodes(session_key TEXT,entry_json TEXT)');
  const entry={displayName:'M'.repeat(170),delivery:{kind:'external',context:{channel:'whatsapp',accountId:'operacional',to:'+5511999990004'},origin:{provider:'whatsapp',accountId:'operacional',chatType:'direct',from:'+5511999990004'}}};
  db.prepare('INSERT INTO session_nodes VALUES(?,?)').run('agent:operacional:whatsapp:direct:four',JSON.stringify(entry));
  const result=await readKnownWhatsAppContacts({dbPath,sessionsDbPath:dbPath});
  assert.deepEqual(result.contacts,[
    {name:'N'.repeat(150),phone:'+5511999990001'},
    {name:'+5511999990002',phone:'+5511999990002'},
    {name:'+5511999990003',phone:'+5511999990003'},
    {name:'M'.repeat(150),phone:'+5511999990004'},
  ]);
}));
