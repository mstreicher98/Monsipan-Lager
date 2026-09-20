<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { syncSystemBars } from '$lib/native';

	let { children } = $props();

	onMount(syncSystemBars);

	// Sanfter Seitenwechsel über die View Transitions API – nur beim Wechsel der Seite,
	// nicht bei Filteränderungen auf derselben Seite
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{@render children()}
