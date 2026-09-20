import { requirePermission } from '$lib/server/guard';
import { orderList } from '$lib/server/order-list';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:stock');
	requirePermission(locals, 'reports.view');
	return { items: await orderList() };
};
