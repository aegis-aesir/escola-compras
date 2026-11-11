import { requireLocalUser } from '../local-session';
import LoginScreen from '../login-screen';
export const dynamic='force-dynamic';
export default async function PasswordPage(){const user=await requireLocalUser();return <LoginScreen changePassword username={user.username}/>}
