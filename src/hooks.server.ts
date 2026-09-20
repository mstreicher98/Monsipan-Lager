import { json, redirect, type Handle, type HandleServerError, type ServerInit } from '@sveltejs/kit';
import { clearSessionCookie, SESSION_COOKIE, validateSession } from '$lib/server/auth';
import { scheduleMaintenance } from '$lib/server/backup';
import { ensureDatabase } from '$lib/server/db';

export const init: ServerInit = async () => {
	await ensureDatabase();
	scheduleMaintenance();
};

const PUBLIC_PATHS = ['/login', '/passwort-vergessen', '/passwort-zuruecksetzen', '/healthz'];
const isPublic = (path: string) => PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export const handle: Handle = async ({ event, resolve }) => {
	await ensureDatabase();

	event.locals.user = null;
	event.locals.sessionToken = null;
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const session = await validateSession(token);
		if (session) {
			event.locals.user = session.user;
			event.locals.sessionToken = token;
		} else {
			clearSessionCookie(event.cookies);
		}
	}

	const theme = event.cookies.get('theme');
	event.locals.theme = theme === 'light' || theme === 'dark' ? theme : 'system';

	const path = event.url.pathname;
	if (!event.locals.user && !isPublic(path)) {
		if (path.startsWith('/api/') || path.startsWith('/export/')) {
			return json({ message: 'Nicht angemeldet' }, { status: 401 });
		}
		const next = path === '/' ? '' : `?weiter=${encodeURIComponent(path + event.url.search)}`;
		redirect(303, `/login${next}`);
	}

	if (event.locals.user?.mustChangePassword && path !== '/passwort-aendern' && path !== '/logout' && !path.startsWith('/api/')) {
		redirect(303, '/passwort-aendern');
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%lager.theme%', event.locals.theme === 'system' ? '' : event.locals.theme),
		preload: ({ type, path }) =>
			type === 'js' || type === 'css' || (type === 'font' && /barlow-latin-(400|600)-normal.*\.woff2$/.test(path))
	});

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
	return response;
};

export const handleError: HandleServerError = ({ error, status }) => {
	if (status !== 404) console.error(error);
	return { message: status === 404 ? 'Seite nicht gefunden' : 'Unerwarteter Fehler – bitte erneut versuchen.' };
};
