import {env} from 'cloudflare:workers';
import {currentLocalUser} from '../../local-session';
import {row} from '../../../lib/integrations';
import type {InboxMessage} from '../../integration-model';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const user=await currentLocalUser();
 if(!user||!['admin','administrativo'].includes(user.role))return Response.json({error:'Acesso restrito à administração.'},{status:403});
 const url=new URL(req.url),message=await row<InboxMessage>(env.DB!,url.searchParams.get('message')||'','integration_inbox');
 const attachment=message?.attachments?.find(a=>a.id===url.searchParams.get('attachment'));
 if(!attachment||!env.BUCKET)return Response.json({error:'Anexo não encontrado.'},{status:404});
 const object=await env.BUCKET.get(attachment.key);if(!object)return Response.json({error:'Anexo não encontrado.'},{status:404});
 return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(attachment.name),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
