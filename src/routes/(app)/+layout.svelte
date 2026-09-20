<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import MoreSheet from '$lib/components/MoreSheet.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import ScanResultDialog from '$lib/components/ScanResultDialog.svelte';
	import CameraScanner from '$lib/components/CameraScanner.svelte';
	import { can } from '$lib/permissions';
	import { installWedgeListener, onScan, SCAN_PRIORITY } from '$lib/scan/wedge';
	import { lookupScan } from '$lib/scan/lookup';
	import { feedbackError, feedbackSuccess } from '$lib/scan/feedback';
	import { scanner } from '$lib/scan/scanner.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { LookupResult } from '$lib/types';

	let { data, children } = $props();

	let moreOpen = $state(false);
	let resultOpen = $state(false);
	let result = $state<LookupResult | null>(null);

	const showAlerts = $derived(can(data.user.role, 'alerts.view'));

	onMount(() => {
		const uninstall = installWedgeListener();

		// Standard-Empfänger: Scan irgendwo in der App → Artikel anzeigen.
		// Seiten wie "Buchen" registrieren eigene Empfänger und haben Vorrang.
		const off = onScan(async (scan) => {
			if (scanner.open && scanner.mode === 'continuous') return;
			try {
				const r = await lookupScan(scan.variants);
				if (r.product) feedbackSuccess();
				else feedbackError();
				result = r;
				resultOpen = true;
			} catch {
				feedbackError();
				toast.error('Suche fehlgeschlagen', 'Bitte Verbindung prüfen und erneut scannen.');
			}
		}, SCAN_PRIORITY.global);

		// Live-Aktualisierung: andere Geräte haben gebucht
		let es: EventSource | null = null;
		let timer: ReturnType<typeof setTimeout>;
		const connect = () => {
			es = new EventSource('/api/events');
			es.addEventListener('stock', () => {
				clearTimeout(timer);
				timer = setTimeout(() => invalidate('app:stock'), 250);
			});
		};
		connect();

		return () => {
			uninstall();
			off();
			es?.close();
			clearTimeout(timer);
		};
	});
</script>

<a href="#main" class="sr-only z-[90] rounded-lg bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Zum Inhalt springen</a>

<NavProgress />

<div class="print:hidden"><Sidebar user={data.user} lowStockCount={data.lowStockCount} theme={data.theme} /></div>

<div class="min-h-dvh lg:pl-64 print:pl-0">
	<div class="print:hidden"><TopBar {showAlerts} lowStockCount={data.lowStockCount} onscan={() => scanner.openCamera()} /></div>
	<main
		id="main"
		tabindex="-1"
		class="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-28 outline-none sm:px-6 lg:px-8 lg:pt-2 lg:pb-12 print:max-w-none print:px-0 print:pt-0 print:pb-0"
		style="view-transition-name: main"
	>
		{@render children()}
	</main>
</div>

<div class="print:hidden">
	<BottomNav role={data.user.role} onscan={() => scanner.openCamera()} onmore={() => (moreOpen = true)} moreBadge={showAlerts ? data.lowStockCount : 0} />
</div>
<MoreSheet bind:open={moreOpen} user={data.user} lowStockCount={data.lowStockCount} theme={data.theme} />

<ScanResultDialog
	bind:open={resultOpen}
	{result}
	canBook={can(data.user.role, 'stock.book')}
	canManage={can(data.user.role, 'products.manage')}
/>

{#if scanner.open}
	<CameraScanner />
{/if}

<Toaster />
