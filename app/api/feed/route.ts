import { handle, jsonOk } from '@/lib/http';
import { listFeed } from '@/lib/views';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return handle(async () => {
    const feed = await listFeed();
    return jsonOk({ feed });
  });
}
