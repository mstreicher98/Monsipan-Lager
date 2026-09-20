import { afterEach, describe, expect, it, vi } from 'vitest';
import { install } from './install.svelte';

/** Browser-Umgebung nachbauen: nur das, was die Erkennung anfasst */
function fakeBrowser(opts: { ua: string; standalone?: boolean; touchPoints?: number; capacitor?: boolean }) {
	const listeners: Record<string, ((e: Event) => void)[]> = {};
	const matchMedia = () => ({
		matches: opts.standalone ?? false,
		addEventListener: () => {},
		removeEventListener: () => {}
	});
	const win = {
		matchMedia,
		addEventListener: (type: string, fn: (e: Event) => void) => (listeners[type] ??= []).push(fn),
		removeEventListener: () => {},
		...(opts.capacitor ? { Capacitor: {} } : {})
	};
	vi.stubGlobal('window', win);
	vi.stubGlobal('navigator', { userAgent: opts.ua, maxTouchPoints: opts.touchPoints ?? 0 });
	return listeners;
}

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('App-Hinweis am Handy', () => {
	it('schlägt die App am Android-Handy vor', () => {
		fakeBrowser({ ua: ANDROID });
		install.start();
		expect(install.platform).toBe('android');
		expect(install.suggest).toBe(true);
	});

	it('schlägt die Anleitung am iPhone vor', () => {
		fakeBrowser({ ua: IPHONE });
		install.start();
		expect(install.platform).toBe('ios');
		expect(install.suggest).toBe(true);
	});

	it('erkennt ein iPad trotz Mac-Kennung', () => {
		fakeBrowser({ ua: IPAD, touchPoints: 5 });
		install.start();
		expect(install.platform).toBe('ios');
		expect(install.suggest).toBe(true);
	});

	it('zeigt am PC keinen Download-Knopf', () => {
		fakeBrowser({ ua: WINDOWS });
		install.start();
		expect(install.platform).toBe('other');
		expect(install.mobile).toBe(false);
		expect(install.suggest).toBe(false);
	});

	it('schweigt, wenn die App schon installiert ist', () => {
		fakeBrowser({ ua: ANDROID, standalone: true });
		install.start();
		expect(install.standalone).toBe(true);
		expect(install.suggest).toBe(false);
	});

	it('schweigt in der Android-App selbst', () => {
		fakeBrowser({ ua: ANDROID, capacitor: true });
		install.start();
		expect(install.standalone).toBe(true);
		expect(install.suggest).toBe(false);
	});

	it('merkt sich Chromes Angebot zum Installieren', async () => {
		const listeners = fakeBrowser({ ua: ANDROID });
		install.start();
		expect(install.canPrompt).toBe(false);

		let prompted = false;
		const event = {
			preventDefault: () => {},
			prompt: async () => {
				prompted = true;
			},
			userChoice: Promise.resolve({ outcome: 'accepted' })
		} as unknown as Event;
		listeners['beforeinstallprompt'][0](event);
		expect(install.canPrompt).toBe(true);

		expect(await install.promptInstall()).toBe(true);
		expect(prompted).toBe(true);
		// Das Angebot gilt nur einmal
		expect(install.canPrompt).toBe(false);
		expect(await install.promptInstall()).toBe(false);
	});
});
