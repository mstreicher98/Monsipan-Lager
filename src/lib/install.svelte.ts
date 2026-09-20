/**
 * Erkennt, ob die Seite gerade am Handy läuft und ob sie schon als App
 * installiert ist. Der Download-Knopf erscheint dadurch nur dort, wo er
 * etwas bringt: am Handy, angemeldet, und noch nicht installiert.
 */
export type Platform = 'android' | 'ios' | 'other';

interface InstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class InstallState {
	/** Erst nach dem Start im Browser gesetzt – vorher wird nichts angezeigt */
	ready = $state(false);
	platform = $state<Platform>('other');
	mobile = $state(false);
	/** Läuft schon als installierte App (Startbildschirm oder Android-App) */
	standalone = $state(false);
	/** Chrome bietet das Installieren direkt an */
	canPrompt = $state(false);
	#prompt: InstallPromptEvent | null = null;

	/** Einmal beim Start der App aufrufen; gibt die Aufräumfunktion zurück */
	start(): () => void {
		const ua = navigator.userAgent;
		const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
		const android = /Android/.test(ua);
		this.platform = ios ? 'ios' : android ? 'android' : 'other';
		this.mobile = ios || android;

		const mq = window.matchMedia('(display-mode: standalone)');
		const nav = navigator as Navigator & { standalone?: boolean };
		const update = () => {
			this.standalone = mq.matches || nav.standalone === true || 'Capacitor' in window;
		};
		update();
		mq.addEventListener('change', update);

		const onPrompt = (e: Event) => {
			e.preventDefault();
			this.#prompt = e as InstallPromptEvent;
			this.canPrompt = true;
		};
		const onInstalled = () => {
			this.#prompt = null;
			this.canPrompt = false;
			this.standalone = true;
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		this.ready = true;

		return () => {
			mq.removeEventListener('change', update);
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	}

	/** Chromes eigenes Installieren anstoßen; true, wenn die Person zugestimmt hat */
	async promptInstall(): Promise<boolean> {
		const p = this.#prompt;
		if (!p) return false;
		this.#prompt = null;
		this.canPrompt = false;
		await p.prompt();
		const { outcome } = await p.userChoice;
		return outcome === 'accepted';
	}

	/** Soll der Hinweis auf die App angezeigt werden? */
	get suggest(): boolean {
		return this.ready && this.mobile && !this.standalone;
	}
}

export const install = new InstallState();
