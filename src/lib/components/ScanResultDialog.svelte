<script lang="ts">
	import { goto } from '$app/navigation';
	import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
	import ArrowUpFromLine from '@lucide/svelte/icons/arrow-up-from-line';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import Plus from '@lucide/svelte/icons/plus';
	import Link from '@lucide/svelte/icons/link';
	import Dialog from './Dialog.svelte';
	import ProductAvatar from './ProductAvatar.svelte';
	import StockStatus from './StockStatus.svelte';
	import ProductSearch from './ProductSearch.svelte';
	import { int, packageLabel } from '$lib/format';
	import { displayGtin, type ParsedScan } from '$lib/scan/parse';
	import { toast } from '$lib/stores/toast.svelte';
	import type { LookupResult, ProductSummary } from '$lib/types';

	interface Props {
		open: boolean;
		result: LookupResult | null;
		canBook: boolean;
		canManage: boolean;
	}
	let { open = $bindable(), result, canBook, canManage }: Props = $props();
	let assigning = $state(false);
	let busy = $state(false);

	const product = $derived(result?.product ?? null);
	const parsed = $derived(result?.parsed ?? null);

	/** Der Code, der beim Zuordnen gespeichert wird */
	function primaryCode(p: ParsedScan | null): { code: string; kind: 'ean' | 'artikel' | 'sonstige' } | null {
		if (!p) return null;
		if (p.gtin) return { code: displayGtin(p.gtin), kind: 'ean' };
		if (p.fields.ean) return { code: p.fields.ean, kind: 'ean' };
		if (p.fields.article) return { code: p.fields.article, kind: 'artikel' };
		if (p.fields.sap) return { code: p.fields.sap, kind: 'sonstige' };
		return p.text ? { code: p.text, kind: 'sonstige' } : null;
	}
	const code = $derived(primaryCode(parsed));

	$effect(() => {
		if (!open) assigning = false;
	});

	function go(href: string) {
		open = false;
		goto(href);
	}

	async function assign(p: ProductSummary) {
		if (!code) return;
		busy = true;
		try {
			const res = await fetch('/api/codes', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ productId: p.id, code: code.code, kind: code.kind })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error('Zuordnen nicht möglich', data.message);
				return;
			}
			toast.success('Code zugeordnet', `${code.code} gehört jetzt zu „${p.name}“.`);
			go(`/artikel/${p.id}`);
		} finally {
			busy = false;
		}
	}
</script>

<Dialog bind:open title={product ? 'Artikel gefunden' : 'Code nicht gefunden'}>
	{#if product}
		<div class="flex items-start gap-4">
			<ProductAvatar colorHex={product.colorHex} category={product.categoryName} size="lg" />
			<div class="min-w-0 flex-1">
				<p class="text-lg leading-snug font-semibold">{product.name}</p>
				<p class="text-sm text-ink-3">
					{[product.articleNumber && `Art.-Nr. ${product.articleNumber}`, packageLabel(product.packageSize, product.unit)]
						.filter(Boolean)
						.join(', ')}
				</p>
				<div class="mt-2"><StockStatus total={product.total} minStock={product.minStock} active={product.active} /></div>
			</div>
			<div class="text-right">
				<p class="num font-display text-4xl leading-none font-semibold">{int(product.total)}</p>
				<p class="mt-1 text-sm text-ink-3">Stück</p>
			</div>
		</div>

		{#if product.locations.length}
			<ul class="mt-4 flex flex-wrap gap-2">
				{#each product.locations as l (l.locationId)}
					<li class="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-sm">
						{l.name} <span class="num ml-1 font-semibold">{l.quantity}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-4 text-sm text-ink-3">Aktuell an keinem Lagerort vorhanden.</p>
		{/if}

		<div class="mt-6 grid grid-cols-2 gap-2">
			{#if canBook}
				<button class="btn btn-primary" onclick={() => go(`/buchen?art=OUT&produkt=${product.id}`)}>
					<ArrowUpFromLine size={18} aria-hidden="true" />Ausbuchen
				</button>
				<button class="btn btn-secondary" onclick={() => go(`/buchen?art=IN&produkt=${product.id}`)}>
					<ArrowDownToLine size={18} aria-hidden="true" />Einbuchen
				</button>
				<button class="btn btn-secondary" onclick={() => go(`/buchen?art=TRANSFER&produkt=${product.id}`)}>
					<ArrowLeftRight size={18} aria-hidden="true" />Umlagern
				</button>
			{/if}
			<button class="btn btn-ghost {canBook ? '' : 'col-span-2'}" onclick={() => go(`/artikel/${product.id}`)}>Details ansehen</button>
		</div>
	{:else if result}
		<div class="flex items-start gap-3 rounded-2xl bg-surface-2 p-4">
			<CircleHelp size={22} class="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
			<div class="min-w-0">
				<p class="font-medium">Zu diesem Code gibt es noch keinen Artikel.</p>
				{#if code}<p class="num mt-1 text-sm break-all text-ink-2">{code.code}</p>{/if}
				{#if parsed?.fields.name}
					<p class="mt-2 text-sm text-ink-2">
						Erkannt: <span class="font-medium text-ink">{parsed.fields.name}</span>{#if parsed.fields.content}, {parsed.fields.content}{/if}
					</p>
				{/if}
			</div>
		</div>

		{#if canManage}
			{#if assigning}
				<div class="mt-5">
					<p class="field-label">Welchem Artikel gehört der Code?</p>
					<ProductSearch onselect={assign} autofocus scanTarget={false} id="assign-search" />
					{#if busy}<p class="field-hint">Wird zugeordnet …</p>{/if}
				</div>
			{:else}
				<div class="mt-5 grid gap-2 sm:grid-cols-2">
					<button class="btn btn-primary" onclick={() => go(`/artikel/neu?scan=${encodeURIComponent(parsed?.input ?? '')}`)}>
						<Plus size={18} aria-hidden="true" />Neuen Artikel anlegen
					</button>
					<button class="btn btn-secondary" onclick={() => (assigning = true)}>
						<Link size={18} aria-hidden="true" />Artikel zuordnen
					</button>
				</div>
				<p class="field-hint">Zuordnen, wenn der Artikel schon existiert, aber z. B. vom Lieferanten einen neuen Barcode bekommen hat.</p>
			{/if}
		{:else}
			<p class="mt-4 text-sm text-ink-2">Bitte die Bauleitung informieren, damit der Artikel angelegt wird.</p>
		{/if}
	{/if}
</Dialog>
