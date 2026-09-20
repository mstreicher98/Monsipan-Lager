import { describe, expect, it } from 'vitest';
import { isResetPhrase } from './reset-phrase';

describe('Bestätigungstext zum Zurücksetzen', () => {
	it('akzeptiert den Text in jeder Schreibweise', () => {
		expect(isResetPhrase('ALLES LÖSCHEN')).toBe(true);
		expect(isResetPhrase('alles löschen')).toBe(true);
		expect(isResetPhrase('  Alles  Löschen ')).toBe(true);
		// „Ö“ als O + kombinierendes Trema (z. B. macOS-Tastatur)
		expect(isResetPhrase('ALLES LÖSCHEN')).toBe(true);
	});

	it('lehnt alles andere ab', () => {
		expect(isResetPhrase('')).toBe(false);
		expect(isResetPhrase('ALLES LOESCHEN')).toBe(false);
		expect(isResetPhrase('ALLES')).toBe(false);
		expect(isResetPhrase('ALLES LÖSCHEN!')).toBe(false);
	});
});
