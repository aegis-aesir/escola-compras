import Dashboard from './dashboard';
import { requireLocalUser } from './local-session';
export const dynamic = 'force-dynamic';
export default async function Home() {
  await requireLocalUser();
  return <Dashboard />;
}
