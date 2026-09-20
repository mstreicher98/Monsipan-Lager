<script lang="ts">
	import { fly } from 'svelte/transition';
	import { invalidateAll } from '$app/navigation';
	import UserRound from '@lucide/svelte/icons/user-round';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Monitor from '@lucide/svelte/icons/monitor';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import { fullName, initials } from '$lib/format';
	import { ROLE_LABELS, type Role } from '$lib/permissions';
	import { setTheme, type Theme } from '$lib/theme';

	interface Props {
		user: { firstName: string; lastName: string; username: string; role: Role };
		theme: Theme;
		placement?: 'up' | 'down';
	}
	let { user, theme, placement = 'up' }: Props = $props();
	let open = $state(false);
	let root: HTMLDivElement;

	const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'Hell', icon: Sun },
		{ value: 'dark', label: 'Dunkel', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor }
	];

	$effect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (!root.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('click', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	});

	async function pickTheme(t: Theme) {
		setTheme(t);
		await invalidateAll();
	}
</script>

<div class="relative" bind:this={root}>
	<button
		class="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-3"
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span class="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-semibold text-surface">
			{initials(user)}
		</span>
		<span class="min-w-0 flex-1">
			<span class="block truncate text-sm font-semibold">{fullName(user)}</span>
			<span class="block truncate text-[0.8125rem] text-ink-3">{ROLE_LABELS[user.role]}</span>
		</span>
		<ChevronsUpDown size={16} class="shrink-0 text-ink-3" aria-hidden="true" />
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute z-50 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-2)] {placement === 'up'
				? 'bottom-[calc(100%+8px)] left-0'
				: 'top-[calc(100%+8px)] right-0'}"
			transition:fly={{ y: placement === 'up' ? 6 : -6, duration: 160 }}
		>
			<a href="/konto" role="menuitem" class="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-3" onclick={() => (open = false)}>
				<UserRound size={18} class="text-ink-3" aria-hidden="true" /> Mein Konto
			</a>
			<div class="px-3 pt-2 pb-1 text-[0.8125rem] text-ink-3" id="theme-label">Darstellung</div>
			<div class="mx-1.5 mb-1.5 grid grid-cols-3 gap-1 rounded-xl bg-surface-3 p-1" role="group" aria-labelledby="theme-label">
				{#each themes as t (t.value)}
					<button
						class="flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors {theme === t.value
							? 'bg-surface text-ink shadow-sm'
							: 'text-ink-2 hover:text-ink'}"
						aria-pressed={theme === t.value}
						onclick={() => pickTheme(t.value)}
					>
						<t.icon size={16} aria-hidden="true" />
						{t.label}
					</button>
				{/each}
			</div>
			<div class="my-1 border-t border-line"></div>
			<form method="POST" action="/logout">
				<button role="menuitem" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-danger hover:bg-danger-soft">
					<LogOut size={18} aria-hidden="true" /> Abmelden
				</button>
			</form>
		</div>
	{/if}
</div>
