import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requirePermission } from '$lib/server/guard';
import { addCode, CodeConflictError } from '$lib/server/products';
import type { RequestHandler } from './$types';

const Body = z.object({
	productId: z.number().int().positive(),
	code: z.string().trim().min(1).max(120),
	kind: z.enum(['ean', 'artikel', 'sonstige']).default('sonstige')
});

/** Code einem bestehenden Artikel zuordnen (z. B. neuer Lieferanten-Barcode) */
export const POST: RequestHandler = async ({ request, locals }) => {
	requirePermission(locals, 'products.manage');
	const parsed = Body.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'Ungültige Angaben');
	try {
		await addCode(parsed.data.productId, parsed.data.code, parsed.data.kind);
	} catch (err) {
		if (err instanceof CodeConflictError) return json({ message: err.message }, { status: 409 });
		throw err;
	}
	return json({ ok: true });
};
