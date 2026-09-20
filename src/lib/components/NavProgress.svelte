<script lang="ts">
	import { navigating } from '$app/state';
	import { fade } from 'svelte/transition';

	// Erst nach kurzer Wartezeit zeigen – schnelle Seitenwechsel bleiben ruhig
	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (navigating.to) {
			timer = setTimeout(() => (visible = true), 180);
		} else {
			clearTimeout(timer);
			visible = false;
		}
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div
		class="lane fixed inset-x-0 top-0 z-[80] h-[3px] animate-lane"
		role="progressbar"
		aria-label="Seite wird geladen"
		out:fade={{ duration: 200 }}
	></div>
{/if}
