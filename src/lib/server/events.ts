/**
 * Server-Sent Events: Nach jeder Buchung erfahren alle offenen Browser davon
 * und laden die betroffenen Daten neu. Läuft im selben Prozess, kein Broker nötig.
 */
const encoder = new TextEncoder();
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();

export function eventStream(signal: AbortSignal): ReadableStream<Uint8Array> {
	let ctrl: ReadableStreamDefaultController<Uint8Array>;
	let ping: ReturnType<typeof setInterval>;
	const close = () => {
		clearInterval(ping);
		clients.delete(ctrl);
		try {
			ctrl.close();
		} catch {
			/* schon zu */
		}
	};
	return new ReadableStream({
		start(controller) {
			ctrl = controller;
			clients.add(controller);
			controller.enqueue(encoder.encode('retry: 5000\n: verbunden\n\n'));
			ping = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': ping\n\n'));
				} catch {
					close();
				}
			}, 25_000);
			signal.addEventListener('abort', close);
		},
		cancel: close
	});
}

export function broadcast(event: string, data: unknown) {
	const chunk = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	for (const c of clients) {
		try {
			c.enqueue(chunk);
		} catch {
			clients.delete(c);
		}
	}
}
