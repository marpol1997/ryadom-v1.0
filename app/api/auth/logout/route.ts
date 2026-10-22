import { destroyCurrentSession } from '@/lib/auth/session';
import { assertSameOrigin, handle, jsonOk } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    assertSameOrigin(req);
    await destroyCurrentSession();
    return jsonOk();
  });
}
