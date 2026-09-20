import { client } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	await client.execute('SELECT 1');
	return new Response('ok', { headers: { 'cache-control': 'no-store' } });
};
