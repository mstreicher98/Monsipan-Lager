import { getTableName, sql, type Column, type SQL } from 'drizzle-orm';

/**
 * Spalte immer mit Tabellennamen ausgeben ("colors"."id").
 * Drizzle lässt den Tabellennamen in Abfragen ohne Join weg – in korrelierten
 * Unterabfragen würde "id" dann auf die innere Tabelle zeigen und falsch zählen.
 */
export function col(column: Column): SQL {
	return sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
}
