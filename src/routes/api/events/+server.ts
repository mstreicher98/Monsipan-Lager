import { eventStream } from '$lib/server/events';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) =>
	new Response(eventStream(request.signal), {
		headers: {
			'content-type': 'text/event-stream; charset=utf-8',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive',
			'x-accel-buffering': 'no'
		}
	});
