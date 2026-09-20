import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

const createdAt = () =>
	integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(cast(unixepoch('subsec') * 1000 as integer))`);

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	email: text('email').unique(),
	firstName: text('first_name').notNull().default(''),
	lastName: text('last_name').notNull().default(''),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'bauleiter', 'partiefuehrer', 'arbeiter', 'viewer'] }).notNull(),
	/** Partie des Benutzers (Pflicht für Partieführer und Arbeiter) – beim Buchen vorausgewählt */
	partyId: integer('party_id').references((): AnySQLiteColumn => parties.id, { onDelete: 'set null' }),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
	lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
	/** Gelöscht, aber wegen vorhandener Buchungen als Name in der Historie behalten */
	deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
	createdAt: createdAt()
});

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(), // SHA-256 des Tokens, nie das Token selbst
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		persistent: integer('persistent', { mode: 'boolean' }).notNull().default(false),
		userAgent: text('user_agent'),
		createdAt: createdAt()
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

export const passwordResets = sqliteTable('password_resets', {
	tokenHash: text('token_hash').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	usedAt: integer('used_at', { mode: 'timestamp_ms' }),
	createdAt: createdAt()
});

export const locations = sqliteTable('locations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	description: text('description').notNull().default(''),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: createdAt()
});

/** Materialart, z. B. Kaltplastik, Farbe, Verdünnung, Tape */
export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0)
});

export const colors = sqliteTable('colors', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	/** RAL-Classic-Nummer, z. B. "6024" – optional, Farbmuster dann aus der RAL-Tabelle */
	ral: text('ral'),
	hex: text('hex').notNull().default('#9AA0A6'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0)
});

/** Person oder Gruppe (Partie), an die Material ausgegeben wird */
export const parties = sqliteTable('parties', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	kind: text('kind', { enum: ['person', 'gruppe'] }).notNull().default('gruppe'),
	note: text('note').notNull().default(''),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	createdAt: createdAt()
});

export const products = sqliteTable(
	'products',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		articleNumber: text('article_number'),
		categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
		colorId: integer('color_id').references(() => colors.id, { onDelete: 'set null' }),
		manufacturer: text('manufacturer').notNull().default(''),
		/** Inhalt je Stück/Gebinde, z. B. 15 (kg) */
		packageSize: real('package_size'),
		unit: text('unit').notNull().default('stk'),
		minStock: integer('min_stock'),
		targetStock: integer('target_stock'),
		notes: text('notes').notNull().default(''),
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
		lowStockNotifiedAt: integer('low_stock_notified_at', { mode: 'timestamp_ms' }),
		/** Kleingeschriebener, umlautgefalteter Suchtext (Name, Nummern, Codes, Materialart, Farbe) */
		searchText: text('search_text').notNull().default(''),
		createdAt: createdAt(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('products_name_idx').on(t.name), index('products_article_idx').on(t.articleNumber)]
);

/** Alle scanbaren Codes eines Artikels (EAN, Artikelnummer, weitere) */
export const productCodes = sqliteTable(
	'product_codes',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		productId: integer('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		code: text('code').notNull(),
		normalized: text('normalized').notNull(),
		kind: text('kind', { enum: ['ean', 'artikel', 'sonstige'] }).notNull().default('sonstige'),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('product_codes_normalized_idx').on(t.normalized), index('product_codes_product_idx').on(t.productId)]
);

export const stock = sqliteTable(
	'stock',
	{
		productId: integer('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'restrict' }),
		quantity: integer('quantity').notNull().default(0),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
	},
	(t) => [primaryKey({ columns: [t.productId, t.locationId] }), index('stock_location_idx').on(t.locationId)]
);

export const MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER', 'RETURN', 'INVENTORY'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const movements = sqliteTable(
	'movements',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		/** Gemeinsame Kennung aller Zeilen einer Buchung (z. B. Massen-Scan) */
		batchId: text('batch_id').notNull(),
		type: text('type', { enum: MOVEMENT_TYPES }).notNull(),
		productId: integer('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'restrict' }),
		/** Immer positiv; bei Inventur der Betrag der Differenz */
		quantity: integer('quantity').notNull(),
		fromLocationId: integer('from_location_id').references(() => locations.id),
		toLocationId: integer('to_location_id').references(() => locations.id),
		partyId: integer('party_id').references(() => parties.id),
		/** Ausgabe an / Rückgabe von einer Person statt einer Partie (Benutzer ohne Partie) */
		recipientUserId: integer('recipient_user_id').references((): AnySQLiteColumn => users.id),
		/** Inventur: gezählter Bestand und Bestand davor */
		countedQuantity: integer('counted_quantity'),
		previousQuantity: integer('previous_quantity'),
		note: text('note').notNull().default(''),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		createdAt: createdAt(),
		cancelledAt: integer('cancelled_at', { mode: 'timestamp_ms' }),
		cancelledBy: integer('cancelled_by').references(() => users.id),
		cancelReason: text('cancel_reason'),
		/** Diese Buchung ersetzt eine stornierte (Korrektur) */
		correctionOf: integer('correction_of')
	},
	(t) => [
		index('movements_product_idx').on(t.productId, t.createdAt),
		index('movements_created_idx').on(t.createdAt),
		index('movements_batch_idx').on(t.batchId)
	]
);

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Party = typeof parties.$inferSelect;
export type Movement = typeof movements.$inferSelect;
