import { lowStockCount } from '$lib/server/alerts';
import { requireUser } from '$lib/server/guard';
import { can } from '$lib/permissions';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:stock');
	const user = requireUser(locals);
	return {
		user,
		theme: locals.theme,
		lowStockCount: can(user.role, 'alerts.view') || can(user.role, 'reports.view') ? await lowStockCount() : 0
	};
};
