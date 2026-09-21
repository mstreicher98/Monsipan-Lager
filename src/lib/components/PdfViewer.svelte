<script lang="ts">
	import { onMount } from 'svelte';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import MoveHorizontal from '@lucide/svelte/icons/move-horizontal';
	import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

	/**
	 * Zeigt ein PDF direkt auf der Seite an (pdf.js). Nötig, weil Chrome auf
	 * Android und die Android-App PDFs sonst nur herunterladen statt anzeigen.
	 * Seiten werden erst gezeichnet, wenn sie in die Nähe des Bildschirms kommen.
	 */
	interface Props {
		url: string;
		/** Für Bildschirmleser */
		title: string;
		onerror?: () => void;
	}
	let { url, title, onerror }: Props = $props();

	const ZOOMS = [1, 1.25, 1.5, 2, 3];

	let container: HTMLDivElement;
	let width = $state(0);
	let zoomIndex = $state(0);
	let pages = $state<{ n: number; w: number; h: number }[]>([]);
	let status = $state<'laden' | 'fertig' | 'fehler'>('laden');
	let doc: PDFDocumentProxy | null = null;
	let loading: PDFDocumentLoadingTask | null = null;

	const zoom = $derived(ZOOMS[zoomIndex]);
	/** Maßstab je Seite: Breite anpassen, dann Zoom */
	const scaleFor = (w: number) => (width > 0 ? ((width - 2) / w) * zoom : 1);

	onMount(() => {
		let cancelled = false;
		const resize = new ResizeObserver(([entry]) => {
			// Breite nur bei spürbarer Änderung übernehmen, sonst zeichnet alles neu
			const w = Math.floor(entry.contentRect.width);
			if (Math.abs(w - width) > 8) width = w;
		});
		resize.observe(container);

		(async () => {
			try {
				const pdfjs = await import('pdfjs-dist');
				const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
				pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
				loading = pdfjs.getDocument({ url, withCredentials: true });
				const loaded = await loading.promise;
				if (cancelled) return;
				doc = loaded;
				const list: { n: number; w: number; h: number }[] = [];
				for (let n = 1; n <= loaded.numPages; n++) {
					const vp = (await loaded.getPage(n)).getViewport({ scale: 1 });
					list.push({ n, w: vp.width, h: vp.height });
				}
				pages = list;
				status = 'fertig';
			} catch (err) {
				console.error('[pdf]', err);
				if (!cancelled) {
					status = 'fehler';
					onerror?.();
				}
			}
		})();

		return () => {
			cancelled = true;
			resize.disconnect();
			loading?.destroy();
			loading = null;
			doc = null;
		};
	});

	/** Zeichnet eine Seite, sobald sie sichtbar wird, und bei Größenänderung neu */
	function pageCanvas(canvas: HTMLCanvasElement, params: { n: number; scale: number }) {
		let current = params;
		let drawn = 0;
		let visible = false;
		let task: RenderTask | null = null;
		/** Zählt Zeichenaufträge – nur der neueste darf die Zeichenfläche benutzen */
		let generation = 0;

		async function draw() {
			if (!doc || !visible || drawn === current.scale) return;
			const mine = ++generation;
			const wanted = current.scale;
			if (task) {
				// pdf.js erlaubt pro Zeichenfläche nur einen Auftrag – den alten erst ganz beenden
				task.cancel();
				await task.promise.catch(() => {});
				task = null;
			}
			const page = await doc.getPage(current.n);
			if (mine !== generation) return;
			// Schärfer auf hochauflösenden Bildschirmen, aber nicht grenzenlos (Speicher)
			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			const viewport = page.getViewport({ scale: wanted * ratio });
			canvas.width = Math.floor(viewport.width);
			canvas.height = Math.floor(viewport.height);
			task = page.render({ canvas, viewport });
			try {
				await task.promise;
				if (mine === generation) drawn = wanted;
			} catch {
				/* abgebrochen, weil neu gezeichnet wird */
			}
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				visible = entry.isIntersecting;
				draw();
			},
			{ rootMargin: '800px 0px' }
		);
		observer.observe(canvas);

		return {
			update(next: { n: number; scale: number }) {
				current = next;
				draw();
			},
			destroy() {
				observer.disconnect();
				task?.cancel();
			}
		};
	}
</script>

<div class="flex items-center justify-end gap-1 pb-2">
	<button class="btn btn-ghost btn-sm btn-icon" aria-label="Verkleinern" disabled={zoomIndex === 0 || status !== 'fertig'} onclick={() => zoomIndex--}>
		<ZoomOut size={18} />
	</button>
	<span class="num w-12 text-center text-sm text-ink-3" aria-live="polite">{Math.round(zoom * 100)} %</span>
	<button class="btn btn-ghost btn-sm btn-icon" aria-label="Vergrößern" disabled={zoomIndex === ZOOMS.length - 1 || status !== 'fertig'} onclick={() => zoomIndex++}>
		<ZoomIn size={18} />
	</button>
	<button class="btn btn-ghost btn-sm" disabled={zoomIndex === 0} onclick={() => (zoomIndex = 0)}>
		<MoveHorizontal size={16} aria-hidden="true" />Breite
	</button>
</div>

<div bind:this={container} class="overflow-x-auto rounded-xl bg-surface-3 p-px" role="document" aria-label={title} aria-busy={status === 'laden'}>
	{#if status === 'laden'}
		<div class="grid h-64 place-items-center text-ink-3">
			<span class="flex items-center gap-2"><span class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-ink"></span>PDF wird geladen …</span>
		</div>
	{:else if status === 'fehler'}
		<div class="grid h-40 place-items-center px-4 text-center text-ink-2">Das PDF konnte nicht angezeigt werden.</div>
	{:else}
		<div class="mx-auto flex w-max min-w-full flex-col items-center gap-2">
			{#each pages as p (p.n)}
				{@const scale = scaleFor(p.w)}
				<canvas
					use:pageCanvas={{ n: p.n, scale }}
					class="block bg-white shadow-sm"
					style:width="{Math.floor(p.w * scale)}px"
					style:height="{Math.floor(p.h * scale)}px"
					aria-label="Seite {p.n} von {pages.length}"
				></canvas>
			{/each}
		</div>
	{/if}
</div>
