import { redirect } from 'next/navigation';
import { currentLocalUser } from '../local-session';
import LoginScreen from '../login-screen';
export const dynamic='force-dynamic';
export default async function LoginPage(){const user=await currentLocalUser();if(user)redirect('/');return <LoginScreen/>}
