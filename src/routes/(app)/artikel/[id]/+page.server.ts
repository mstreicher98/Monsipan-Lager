import { error, fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { productCodes, products } from '$lib/server/db/schema';
import { requirePermission, requireUser } from '$lib/server/guard';
import { consumptionByMonth, countMovements, listMovements } from '$lib/server/movements';
import { productWithLocations, refreshSearchText } from '$lib/server/products';
import { displayGtin } from '$lib/scan/parse';
import { can } from '$lib/permissions';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, url, depends, locals }) => {
	depends('app:stock');
	const user = requireUser(locals);
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'Artikel nicht gefunden');
	const product = await productWithLocations(id);
	if (!product) error(404, 'Artikel nicht gefunden');

	// Arbeiter sehen keine Bewegungen; Verbrauchszahlen nur mit Berichte-Recht
	const showMovements = can(user.role, 'movements.view');
	const showReports = can(user.role, 'reports.view');
	const page = Math.max(1, Number(url.searchParams.get('seite')) || 1);
	const [codes, full, history, historyCount, consumption] = await Promise.all([
		db
			.select({ id: productCodes.id, code: productCodes.code, normalized: productCodes.normalized, kind: productCodes.kind })
			.from(productCodes)
			.where(eq(productCodes.productId, id))
			.orderBy(asc(productCodes.kind), asc(productCodes.code))
			.all(),
		db.select({ notes: products.notes, createdAt: products.createdAt }).from(products).where(eq(products.id, id)).get(),
		showMovements ? listMovements({ productId: id, includeCancelled: true }, PAGE_SIZE, (page - 1) * PAGE_SIZE) : null,
		showMovements ? countMovements({ productId: id, includeCancelled: true }) : 0,
		showReports ? consumptionByMonth(12, { productId: id }) : null
	]);

	return {
		product,
		notes: full?.notes ?? '',
		codes: codes.map((c) => ({ ...c, display: c.kind === 'ean' ? displayGtin(c.normalized) : c.code })),
		history,
		historyCount,
		page,
		pageSize: PAGE_SIZE,
		consumption
	};
};

export const actions: Actions = {
	removeCode: async ({ request, params, locals }) => {
		requirePermission(locals, 'products.manage');
		const codeId = Number((await request.formData()).get('codeId'));
		if (!Number.isInteger(codeId)) return fail(400, { message: 'Ungültiger Code' });
		await db.delete(productCodes).where(and(eq(productCodes.id, codeId), eq(productCodes.productId, Number(params.id))));
		await refreshSearchText(db, Number(params.id));
		return { removed: true };
	}
};
