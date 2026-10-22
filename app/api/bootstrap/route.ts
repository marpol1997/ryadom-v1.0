import { getCurrentUser } from '@/lib/auth/session';
import { handle, jsonOk } from '@/lib/http';
import { getBootstrap } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return handle(async () => {
    const user = await getCurrentUser();
    const data = await getBootstrap(user);
    return jsonOk({ ...data });
  });
}
