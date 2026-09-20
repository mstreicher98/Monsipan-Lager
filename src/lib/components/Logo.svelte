<script lang="ts">
	interface Props {
		compact?: boolean;
	}
	let { compact = false }: Props = $props();
</script>

<span class="inline-flex items-center gap-2.5 select-none">
	<!-- Markierungskachel: Asphalt mit gelber Mittellinie -->
	<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
		<rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="#1b2027" stroke="var(--c-line-strong)" />
		<rect x="6" y="14.5" width="6" height="3" rx="1" fill="#f8f000" />
		<rect x="14" y="14.5" width="6" height="3" rx="1" fill="#f8f000" />
		<rect x="22" y="14.5" width="4" height="3" rx="1" fill="#f8f000" />
	</svg>
	{#if !compact}
		<span class="leading-none">
			<span class="block font-display text-[1.0625rem] font-semibold tracking-tight text-ink">Monsipan</span>
			<span class="block text-[0.8125rem] text-ink-3">Lager</span>
		</span>
	{/if}
</span>
