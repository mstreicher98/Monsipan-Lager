<script lang="ts">
	import { int } from '$lib/format';

	/**
	 * Säulendiagramm für eine Reihe (z. B. Verbrauch je Monat).
	 * Unvollständiger laufender Zeitraum wird schraffiert statt anders gefärbt.
	 */
	interface Datum {
		key: string;
		label: string;
		longLabel: string;
		value: number;
		partial?: boolean;
	}
	interface Props {
		data: Datum[];
		unit?: string;
		height?: number;
		title: string;
	}
	let { data, unit = 'Stück', height = 220, title }: Props = $props();

	let width = $state(600);
	let hover = $state<number | null>(null);
	let showTable = $state(false);

	const pad = { top: 22, right: 8, bottom: 28, left: 40 };

	function niceMax(v: number): { max: number; step: number } {
		if (v <= 0) return { max: 4, step: 1 };
		const raw = v / 4;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const norm = raw / mag;
		const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
		return { max: Math.ceil(v / step) * step, step };
	}

	const scale = $derived(niceMax(Math.max(0, ...data.map((d) => d.value))));
	const ticks = $derived(Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step));
	const innerW = $derived(Math.max(10, width - pad.left - pad.right));
	const innerH = $derived(height - pad.top - pad.bottom);
	const band = $derived(innerW / Math.max(1, data.length));
	const barW = $derived(Math.min(24, band * 0.6));
	const y = (v: number) => pad.top + innerH - (v / scale.max) * innerH;
	const x = (i: number) => pad.left + band * i + band / 2;

	// Nur Maximum und den letzten Wert beschriften – der Rest steht im Tooltip und in der Tabelle
	const labelled = $derived.by(() => {
		const set = new Set<number>();
		if (!data.length) return set;
		let maxI = 0;
		data.forEach((d, i) => {
			if (d.value > data[maxI].value) maxI = i;
		});
		if (data[maxI].value > 0) set.add(maxI);
		set.add(data.length - 1);
		return set;
	});

	/** Säule mit 4px abgerundeter Oberkante, unten eckig */
	function barPath(i: number, v: number): string {
		const h = Math.max(0, (v / scale.max) * innerH);
		if (h === 0) return '';
		const r = Math.min(4, h, barW / 2);
		const x0 = x(i) - barW / 2;
		const x1 = x0 + barW;
		const yb = pad.top + innerH;
		const yt = yb - h;
		return `M${x0},${yb}V${yt + r}Q${x0},${yt} ${x0 + r},${yt}H${x1 - r}Q${x1},${yt} ${x1},${yt + r}V${yb}Z`;
	}

	const summary = $derived(
		`${title}: ` + data.map((d) => `${d.longLabel} ${int(d.value)} ${unit}${d.partial ? ' (bisher)' : ''}`).join(', ')
	);
</script>

<div class="chart relative w-full min-w-0" bind:clientWidth={width}>
	<svg viewBox="0 0 {width} {height}" width="100%" {height} role="img" aria-label={summary} class="block overflow-visible">
		<defs>
			<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
				<rect width="6" height="6" fill="var(--bar)" opacity="0.35" />
				<line x1="0" y1="0" x2="0" y2="6" stroke="var(--bar)" stroke-width="3" />
			</pattern>
		</defs>

		{#each ticks as t (t)}
			<line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--c-line)" stroke-width="1" shape-rendering="crispEdges" />
			<text x={pad.left - 8} y={y(t)} dy="0.32em" text-anchor="end" class="num fill-ink-3 text-[11px]">{int(t)}</text>
		{/each}

		{#each data as d, i (d.key)}
			<g
				class="bar-g"
				style="--i: {i}"
				role="button"
				tabindex="0"
				aria-label="{d.longLabel}: {int(d.value)} {unit}{d.partial ? ', laufender Monat' : ''}"
				onmouseenter={() => (hover = i)}
				onmouseleave={() => (hover = null)}
				onfocus={() => (hover = i)}
				onblur={() => (hover = null)}
			>
				<!-- großzügige Trefferfläche -->
				<rect x={x(i) - band / 2} y={pad.top} width={band} height={innerH} fill="transparent" />
				{#if hover === i}
					<rect x={x(i) - band / 2 + 4} y={pad.top} width={band - 8} height={innerH} rx="8" fill="var(--c-surface-3)" opacity="0.6" />
				{/if}
				<path d={barPath(i, d.value)} fill={d.partial ? 'url(#hatch)' : 'var(--bar)'} class="bar" />
				{#if labelled.has(i) && d.value > 0}
					<text x={x(i)} y={y(d.value) - 7} text-anchor="middle" class="num fill-ink text-[12px] font-semibold">{int(d.value)}</text>
				{/if}
			</g>
			<text x={x(i)} y={height - 8} text-anchor="middle" class="fill-ink-3 text-[11px]">{d.label}</text>
		{/each}
	</svg>

	{#if hover !== null && data[hover]}
		{@const d = data[hover]}
		<div
			class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 text-sm whitespace-nowrap shadow-[var(--shadow-2)]"
			style="left: {x(hover)}px; top: {Math.max(0, y(d.value) - 12)}px"
		>
			<p class="text-ink-3">{d.longLabel}{d.partial ? ' (bisher)' : ''}</p>
			<p class="num font-semibold">{int(d.value)} {unit}</p>
		</div>
	{/if}
</div>

<button class="mt-2 text-sm font-medium text-ink-3 hover:text-ink" aria-expanded={showTable} onclick={() => (showTable = !showTable)}>
	{showTable ? 'Tabelle ausblenden' : 'Als Tabelle anzeigen'}
</button>
{#if showTable}
	<table class="data-table mt-2">
		<thead><tr><th>Monat</th><th class="text-right">{unit}</th></tr></thead>
		<tbody>
			{#each data as d (d.key)}
				<tr><td>{d.longLabel}{d.partial ? ' (bisher)' : ''}</td><td class="num text-right">{int(d.value)}</td></tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	.chart {
		--bar: #9c8700;
	}
	:global([data-theme='dark']) .chart {
		--bar: #cfc10f;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .chart {
			--bar: #cfc10f;
		}
	}
	.bar-g {
		outline: none;
		cursor: default;
	}
	.bar-g:focus-visible .bar {
		stroke: var(--c-focus);
		stroke-width: 2;
	}
	.bar {
		transform-box: fill-box;
		transform-origin: bottom;
		animation: grow 620ms var(--ease-out) both;
		animation-delay: calc(var(--i) * 45ms);
	}
	@keyframes grow {
		from {
			transform: scaleY(0);
		}
	}
</style>
