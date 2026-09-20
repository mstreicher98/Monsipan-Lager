<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { int } from '$lib/format';

	/** Zahl, die bei Live-Änderungen sichtbar hin zum neuen Wert läuft */
	let { value }: { value: number } = $props();

	const tween = Tween.of(() => value, { duration: 500, easing: cubicOut });
</script>

<span>{int(Math.round(tween.current))}</span>
