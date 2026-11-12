import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../lib/local-auth';

export async function currentLocalUser() {
  if(!env.DB)return null;
  return readSession(env.DB,(await headers()).get('cookie')||'',import.meta.env.DEV);
}
export async function requireLocalUser() {
  const user=await currentLocalUser();
  if(!user)redirect('/login');
  return user;
}
