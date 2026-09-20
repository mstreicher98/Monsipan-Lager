import { error, json } from '@sveltejs/kit';
import { allCandidates, pickBestParse } from '$lib/scan/parse';
import { lookupByCandidates, productWithLocations } from '$lib/server/products';
import type { LookupResult } from '$lib/types';
import type { RequestHandler } from './$types';

/** GET /api/lookup?v=<Lesart 1>&v=<Lesart 2> → Artikel zum gescannten Code */
export const GET: RequestHandler = async ({ url }) => {
	const variants = url.searchParams
		.getAll('v')
		.map((v) => v.slice(0, 1000))
		.filter((v) => v.trim())
		.slice(0, 4);
	if (!variants.length) error(400, 'Kein Code übergeben');

	const parsed = pickBestParse(variants);
	const hit = await lookupByCandidates(allCandidates(variants));
	const product = hit ? await productWithLocations(hit.product.id) : null;
	return json({ product, parsed, matched: hit?.matched ?? null } satisfies LookupResult);
};
