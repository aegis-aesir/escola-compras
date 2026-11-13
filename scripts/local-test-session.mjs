// Test fixtures target only this checkout's isolated loopback development server.
import {localDevelopmentBase} from './module-workspace.mjs';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
export const localBase=localDevelopmentBase();
export const testUsers=[
 {username:'dev.master.test',name:'TESTE LOCAL Master',role:'admin',department:'Administrativo',password:'FAKE-LOCAL-master-initial-2026!'},
 {username:'dev.setor.test',name:'TESTE LOCAL Setor',role:'solicitante',department:'Administrativo',password:'FAKE-LOCAL-sector-initial-2026!'},
 {username:'dev.geral.test',name:'TESTE LOCAL Diretoria Geral',role:'geral',department:'Administrativo',password:'FAKE-LOCAL-general-initial-2026!'},
];
export const changedPassword=user=>'FAKE-LOCAL-changed-'+user.username+'-2026!';
export async function prepareLocalAccounts() {
 const text=await readFile('.dev.vars','utf8');
 const secret=text.match(/^INTEGRATION_SECRET=(.+)$/m)?.[1].trim().replace(/^"|"$/g,'');
 if(!secret)throw new Error('Configure INTEGRATION_SECRET apenas no ambiente local de teste.');
 const body=JSON.stringify({batchId:'isolated-local-development-users-v1',users:testUsers}),timestamp=String(Date.now());
 const r=await fetch(localBase+'/api/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json','X-Estrelas-Timestamp':timestamp,'X-Estrelas-Signature':'sha256='+createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')},body});
 if(!r.ok)throw new Error('A inicialização dos usuários de teste local não foi confirmada. Preserve os usuários existentes; não redefina o banco.');
}
export async function localTestSession(user=testUsers[0]) {
 await prepareLocalAccounts();
 for(const password of [changedPassword(user),user.password]) {
  const r=await fetch(localBase+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:localBase},body:JSON.stringify({username:user.username,password})});
  if(!r.ok)continue;
  const state=await r.json();let cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  if(state.mustChangePassword) {
   const updated=await fetch(localBase+'/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json',Origin:localBase,Cookie:cookie},body:JSON.stringify({currentPassword:password,newPassword:changedPassword(user)})});
   if(!updated.ok)throw new Error('Troca da senha fictícia local não confirmada.');
   cookie=updated.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  }
  return cookie;
 }
 throw new Error('Não foi possível entrar com o usuário fictício local.');
}
