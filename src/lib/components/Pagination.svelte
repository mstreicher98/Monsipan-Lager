<script lang="ts">
	import { page as pageState } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { withParams } from '$lib/url';

	interface Props {
		page: number;
		pageSize: number;
		count: number;
	}
	let { page, pageSize, count }: Props = $props();
	const pages = $derived(Math.max(1, Math.ceil(count / pageSize)));
	const from = $derived(count === 0 ? 0 : (page - 1) * pageSize + 1);
	const to = $derived(Math.min(count, page * pageSize));
</script>

{#if pages > 1}
	<nav class="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm lg:px-6" aria-label="Seiten">
		<p class="text-ink-3"><span class="num">{from}–{to}</span> von <span class="num">{count}</span></p>
		<div class="flex items-center gap-1">
			<a
				class="btn btn-ghost btn-sm btn-icon {page <= 1 ? 'pointer-events-none opacity-40' : ''}"
				href={withParams(pageState.url, { seite: page - 1 > 1 ? page - 1 : null })}
				aria-label="Vorherige Seite"
				aria-disabled={page <= 1}
				data-sveltekit-noscroll
			>
				<ChevronLeft size={18} />
			</a>
			<span class="num px-2 text-ink-2">Seite {page} von {pages}</span>
			<a
				class="btn btn-ghost btn-sm btn-icon {page >= pages ? 'pointer-events-none opacity-40' : ''}"
				href={withParams(pageState.url, { seite: page + 1 })}
				aria-label="Nächste Seite"
				aria-disabled={page >= pages}
				data-sveltekit-noscroll
			>
				<ChevronRight size={18} />
			</a>
		</div>
	</nav>
{/if}
