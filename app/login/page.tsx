import { redirect } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { currentLocalUser } from '../local-session';
import { listLoginUsers } from '../../lib/local-auth';
import LoginScreen from '../login-screen';
export const dynamic='force-dynamic';
export default async function LoginPage(){
 const user=await currentLocalUser();if(user)redirect('/');
 const users=env.DB?await listLoginUsers(env.DB):[];
 return <LoginScreen users={users}/>;
}
