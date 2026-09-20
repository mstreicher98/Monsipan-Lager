/** Text, der zum Zurücksetzen aller Daten eingetippt werden muss */
export const RESET_PHRASE = 'ALLES LÖSCHEN';

/**
 * Vergleich unabhängig von Groß-/Kleinschreibung und davon, ob das „Ö“ als ein
 * Zeichen oder als O + Trema eingegeben wurde (NFC-Normalisierung).
 */
export function isResetPhrase(input: string): boolean {
	return input.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('de') === RESET_PHRASE;
}
