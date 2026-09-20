<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowUpFromLine from '@lucide/svelte/icons/arrow-up-from-line';
	import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash from '@lucide/svelte/icons/trash';
	import Barcode from '@lucide/svelte/icons/barcode';
	import ProductAvatar from '$lib/components/ProductAvatar.svelte';
	import StockStatus from '$lib/components/StockStatus.svelte';
	import MovementList from '$lib/components/MovementList.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import CodeInput from '$lib/components/CodeInput.svelte';
	import { amountLabel, int, monthLong, monthShort, packageLabel } from '$lib/format';
	import { can } from '$lib/permissions';
	import { displayGtin, pickBestParse } from '$lib/scan/parse';
	import { feedbackError, feedbackSuccess } from '$lib/scan/feedback';
	import { toast } from '$lib/stores/toast.svelte';

	let { data } = $props();
	const p = $derived(data.product);
	const canBook = $derived(can(data.user.role, 'stock.book'));
	const canInventory = $derived(can(data.user.role, 'stock.inventory'));
	const canManage = $derived(can(data.user.role, 'products.manage'));
	const maxQty = $derived(Math.max(1, ...p.locations.map((l) => l.quantity)));

	const KIND_LABEL = { ean: 'EAN / GTIN', artikel: 'Artikelnummer', sonstige: 'Weiterer Code' } as const;

	let newCode = $state('');
	let adding = $state(false);

	async function addCode(variants: string[]) {
		const parsed = pickBestParse(variants);
		if (!parsed) return;
		const code = parsed.gtin ? displayGtin(parsed.gtin) : (parsed.fields.ean ?? parsed.fields.article ?? parsed.text);
		const kind = parsed.gtin || parsed.fields.ean ? 'ean' : parsed.fields.article ? 'artikel' : 'sonstige';
		adding = true;
		try {
			const res = await fetch('/api/codes', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ productId: p.id, code, kind })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				feedbackError();
				toast.error('Code nicht hinzugefügt', body.message);
				return;
			}
			feedbackSuccess();
			newCode = '';
			toast.success('Code hinzugefügt', code);
			await invalidateAll();
		} finally {
			adding = false;
		}
	}

	const consumption = $derived(data.consumption ?? []);
	const chartData = $derived(
		consumption.map((c, i) => ({
			key: c.month,
			label: monthShort(c.month),
			longLabel: monthLong(c.month),
			value: c.qty,
			partial: i === consumption.length - 1
		}))
	);
	const yearTotal = $derived(consumption.reduce((s, c) => s + c.qty, 0));
</script>

<svelte:head><title>{p.name} – Monsipan Lager</title></svelte:head>

<a href="/bestand" class="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
	<ArrowLeft size={16} aria-hidden="true" />Bestand
</a>

<header class="mt-3 flex flex-col gap-5 pb-6 xl:flex-row xl:items-start xl:justify-between">
	<div class="flex items-start gap-4">
		<ProductAvatar colorHex={p.colorHex} category={p.categoryName} size="lg" />
		<div class="min-w-0">
			<h1 class="text-[1.75rem] leading-tight sm:text-[2rem]">{p.name}</h1>
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				{#if p.categoryName}<span class="badge">{p.categoryName}</span>{/if}
				{#if p.colorName}
					<span class="badge"
						><span class="size-2.5 rounded-full border border-black/10" style:background={p.colorHex}></span>{p.colorName}{#if p.colorRal}<span
								class="num text-ink-3">RAL {p.colorRal}</span
							>{/if}</span
					>
				{/if}
				{#if p.packageSize}<span class="badge">{packageLabel(p.packageSize, p.unit)} je Stück</span>{/if}
				<StockStatus total={p.total} minStock={p.minStock} active={p.active} />
			</div>
		</div>
	</div>

	<div class="flex flex-wrap gap-2">
		{#if canBook && p.active}
			<a href="/buchen?art=OUT&produkt={p.id}" class="btn btn-primary"><ArrowUpFromLine size={18} aria-hidden="true" />Ausbuchen</a>
			<a href="/buchen?art=IN&produkt={p.id}" class="btn btn-secondary"><ArrowDownToLine size={18} aria-hidden="true" />Einbuchen</a>
			<a href="/buchen?art=TRANSFER&produkt={p.id}" class="btn btn-secondary"><ArrowLeftRight size={18} aria-hidden="true" />Umlagern</a>
		{/if}
		{#if canInventory}
			<a href="/buchen?art=INVENTORY&produkt={p.id}" class="btn btn-secondary"><ClipboardCheck size={18} aria-hidden="true" />Inventur</a>
		{/if}
		{#if canManage}
			<a href="/artikel/{p.id}/bearbeiten" class="btn btn-ghost"><Pencil size={18} aria-hidden="true" />Bearbeiten</a>
		{/if}
	</div>
</header>

<div class="grid gap-4 lg:grid-cols-3">
	<div class="min-w-0 space-y-4 lg:col-span-2">
		<!-- Bestand je Lagerort -->
		<section class="card p-4 lg:p-6" aria-labelledby="h-stock">
			<div class="flex items-end justify-between gap-4">
				<h2 id="h-stock" class="text-xl">Bestand je Lagerort</h2>
				<div class="text-right">
					<p class="num font-display text-[2.5rem] leading-none font-semibold">{int(p.total)}</p>
					<p class="mt-1 text-sm text-ink-3">
						Stück{amountLabel(p.total, p.packageSize, p.unit) ? `, ${amountLabel(p.total, p.packageSize, p.unit)}` : ''}
					</p>
				</div>
			</div>
			{#if p.locations.length}
				<ul class="mt-5 space-y-3">
					{#each p.locations as l (l.locationId)}
						<li class="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
							<span class="truncate text-[0.9375rem]">{l.name}</span>
							<span class="h-2 overflow-hidden rounded-full bg-surface-3">
								<span class="block h-full rounded-full bg-ink/80 transition-[width] duration-500" style="width: {(l.quantity / maxQty) * 100}%"></span>
							</span>
							<span class="num w-10 text-right font-semibold">{l.quantity}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-4 text-ink-3">Derzeit an keinem Lagerort vorhanden.</p>
			{/if}
			{#if p.minStock}
				<p class="mt-5 border-t border-line pt-3 text-sm text-ink-2">
					Mindestbestand <span class="num font-semibold text-ink">{p.minStock}</span>{#if p.targetStock}, Sollbestand <span class="num font-semibold text-ink">{p.targetStock}</span>{/if} Stück
				</p>
			{/if}
		</section>

		<!-- Verbrauch -->
		{#if data.consumption}
		<section class="card p-4 lg:p-6" aria-labelledby="h-cons">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h2 id="h-cons" class="text-xl">Verbrauch</h2>
					<p class="text-sm text-ink-3">Letzte 12 Monate, in Stück</p>
				</div>
				<p class="text-right text-sm text-ink-3">Gesamt <span class="num text-base font-semibold text-ink">{yearTotal}</span></p>
			</div>
			<div class="mt-3"><BarChart data={chartData} title="Verbrauch {p.name}" height={200} /></div>
		</section>
		{/if}
	</div>

	<div class="space-y-4">
		<section class="card p-4 lg:p-6" aria-labelledby="h-data">
			<h2 id="h-data" class="text-xl">Stammdaten</h2>
			<dl class="mt-3 divide-y divide-line text-[0.9375rem]">
				<div class="flex justify-between gap-4 py-2"><dt class="text-ink-3">Artikelnummer</dt><dd class="num text-right">{p.articleNumber || '–'}</dd></div>
				<div class="flex justify-between gap-4 py-2"><dt class="text-ink-3">Hersteller</dt><dd class="text-right">{p.manufacturer || '–'}</dd></div>
				<div class="flex justify-between gap-4 py-2"><dt class="text-ink-3">Inhalt je Stück</dt><dd class="text-right">{packageLabel(p.packageSize, p.unit) || '–'}</dd></div>
				<div class="flex justify-between gap-4 py-2"><dt class="text-ink-3">Mindestbestand</dt><dd class="num text-right">{p.minStock ?? '–'}</dd></div>
				<div class="flex justify-between gap-4 py-2"><dt class="text-ink-3">Sollbestand</dt><dd class="num text-right">{p.targetStock ?? '–'}</dd></div>
			</dl>
			{#if data.notes}<p class="mt-3 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-line text-ink-2">{data.notes}</p>{/if}
		</section>

		<section class="card p-4 lg:p-6" aria-labelledby="h-codes">
			<h2 id="h-codes" class="flex items-center gap-2 text-xl"><Barcode size={20} aria-hidden="true" />Scanbare Codes</h2>
			<ul class="mt-3 space-y-2">
				{#each data.codes as c (c.id)}
					<li class="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
						<div class="min-w-0 flex-1">
							<p class="num truncate font-medium">{c.display}</p>
							<p class="text-[0.8125rem] text-ink-3">{KIND_LABEL[c.kind]}</p>
						</div>
						{#if canManage && c.kind !== 'artikel'}
							<form method="POST" action="?/removeCode" use:enhance>
								<input type="hidden" name="codeId" value={c.id} />
								<button class="btn btn-ghost btn-sm btn-icon" aria-label="Code {c.display} entfernen"><Trash size={16} /></button>
							</form>
						{/if}
					</li>
				{:else}
					<li class="text-sm text-ink-3">Noch kein Code hinterlegt – der Artikel ist nur über die Suche auffindbar.</li>
				{/each}
			</ul>
			{#if canManage}
				<div class="mt-4">
					<label for="new-code" class="field-label">Code hinzufügen</label>
					<CodeInput id="new-code" bind:value={newCode} placeholder="Scannen oder eintippen" oncode={addCode} disabled={adding} />
					<p class="field-hint">Z. B. ein zweiter Barcode vom Lieferanten.</p>
				</div>
			{/if}
		</section>
	</div>
</div>

{#if data.history}
	<section class="card mt-4 overflow-hidden" aria-labelledby="h-hist">
		<div class="px-4 pt-4 pb-3 lg:px-6 lg:pt-5">
			<h2 id="h-hist" class="text-xl">Bewegungen</h2>
		</div>
		<MovementList rows={data.history} showProduct={false} empty="Für diesen Artikel gibt es noch keine Buchungen." />
		<Pagination page={data.page} pageSize={data.pageSize} count={data.historyCount} />
	</section>
{/if}
