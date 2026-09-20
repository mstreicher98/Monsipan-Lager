<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly, fade } from 'svelte/transition';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Info from '@lucide/svelte/icons/info';
	import X from '@lucide/svelte/icons/x';
	import { toast } from '$lib/stores/toast.svelte';
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:items-end"
	aria-live="polite"
	role="status"
>
	{#each toast.items as t (t.id)}
		<div
			animate:flip={{ duration: 220 }}
			in:fly={{ y: 16, duration: 260 }}
			out:fade={{ duration: 140 }}
			class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-2)]"
		>
			<span class="mt-0.5 shrink-0 {t.kind === 'success' ? 'text-ok' : t.kind === 'error' ? 'text-danger' : 'text-info'}">
				{#if t.kind === 'success'}<CircleCheck size={20} aria-hidden="true" />{:else if t.kind === 'error'}<CircleAlert
						size={20}
						aria-hidden="true"
					/>{:else}<Info size={20} aria-hidden="true" />{/if}
			</span>
			<div class="min-w-0 flex-1">
				<p class="font-medium leading-snug">{t.message}</p>
				{#if t.detail}<p class="mt-0.5 text-sm text-ink-2">{t.detail}</p>{/if}
			</div>
			<button class="-mr-1 rounded-md p-1 text-ink-3 hover:text-ink" aria-label="Meldung schließen" onclick={() => toast.dismiss(t.id)}>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
