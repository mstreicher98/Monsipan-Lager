export type Theme = 'light' | 'dark' | 'system';

/** Speichert die Wahl im Cookie (für den Server) und setzt sie sofort */
export function setTheme(theme: Theme) {
	const root = document.documentElement;
	if (theme === 'system') {
		root.removeAttribute('data-theme');
		document.cookie = 'theme=; path=/; max-age=0; samesite=lax';
	} else {
		root.setAttribute('data-theme', theme);
		document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
	}
}
