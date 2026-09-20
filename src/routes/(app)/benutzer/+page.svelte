<script lang="ts">
	import { enhance } from '$app/forms';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Copy from '@lucide/svelte/icons/copy';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import Trash from '@lucide/svelte/icons/trash';
	import Dialog from '$lib/components/Dialog.svelte';
	import { fullName, initials, relativeDateTime } from '$lib/format';
	import { needsParty, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, type Role } from '$lib/permissions';
	import { toast } from '$lib/stores/toast.svelte';

	let { data } = $props();
	type U = (typeof data.users)[number];

	let formOpen = $state(false);
	let editing = $state<U | null>(null);
	let role = $state<Role>('arbeiter');
	let partyId = $state<number | null>(null);
	let mode = $state<'mail' | 'password'>('password');
	let email = $state('');
	let formError = $state('');
	let busy = $state(false);

	let resetUser = $state<U | null>(null);
	let resetOpen = $state(false);
	let deleteUser = $state<U | null>(null);
	let deleteOpen = $state(false);
	const resetModes = $derived<('mail' | 'password')[]>(resetUser?.email && data.mailConfigured ? ['mail', 'password'] : ['password']);

	/** Einmal angezeigtes Passwort bzw. Bestätigung */
	let secret = $state<{ title: string; name: string; username?: string; password: string | null; mailed: boolean } | null>(null);
	let secretOpen = $state(false);

	function openCreate() {
		editing = null;
		role = 'arbeiter';
		partyId = null;
		email = '';
		mode = data.mailConfigured ? 'mail' : 'password';
		formError = '';
		formOpen = true;
	}
	function openEdit(u: U) {
		editing = u;
		role = u.role;
		partyId = u.partyId;
		email = u.email ?? '';
		formError = '';
		formOpen = true;
	}

	const roleTone: Record<Role, string> = {
		admin: 'badge-brand',
		bauleiter: 'badge-info',
		partiefuehrer: '',
		arbeiter: '',
		viewer: ''
	};

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('In die Zwischenablage kopiert');
		} catch {
			toast.error('Kopieren nicht möglich');
		}
	}
</script>

<svelte:head><title>Benutzer – Monsipan Lager</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-3 pt-2 pb-5">
	<div>
		<h1 class="text-[2rem] leading-tight">Benutzer</h1>
		<p class="text-ink-2">{data.users.filter((u) => u.active).length} aktive Zugänge</p>
	</div>
	<button class="btn btn-primary" onclick={openCreate}><UserPlus size={18} aria-hidden="true" />Benutzer anlegen</button>
</div>

<section class="card overflow-hidden">
	<ul class="divide-y divide-line">
		{#each data.users as u (u.id)}
			<li class="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6" class:opacity-55={!u.active}>
				<span class="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 font-display font-semibold">{initials(u)}</span>
				<div class="min-w-0 flex-1">
					<p class="font-medium">
						{fullName(u)}
						<span class="font-normal text-ink-3">@{u.username}</span>
					</p>
					<p class="truncate text-sm text-ink-3">
						{[u.partyName, u.email ?? 'Keine E-Mail', u.lastLoginAt ? `zuletzt ${relativeDateTime(u.lastLoginAt)}` : 'noch nie angemeldet']
							.filter(Boolean)
							.join(', ')}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					{#if !u.active}<span class="badge">Deaktiviert</span>{/if}
					{#if u.active && needsParty(u.role) && !u.partyId}<span class="badge badge-danger">Partie fehlt</span>{/if}
					{#if u.mustChangePassword && u.active}<span class="badge badge-warn">Passwort offen</span>{/if}
					<span class="badge {roleTone[u.role]}">{ROLE_LABELS[u.role]}</span>
					<button class="btn btn-ghost btn-sm btn-icon" aria-label="Passwort von {fullName(u)} zurücksetzen" title="Passwort zurücksetzen" onclick={() => ((resetUser = u), (resetOpen = true))}>
						<KeyRound size={16} />
					</button>
					<button class="btn btn-ghost btn-sm btn-icon" aria-label="{fullName(u)} bearbeiten" title="Bearbeiten" onclick={() => openEdit(u)}>
						<Pencil size={16} />
					</button>
					{#if u.id !== data.user.id}
						<button
							class="btn btn-ghost btn-sm btn-icon hover:text-danger"
							aria-label="{fullName(u)} löschen"
							title="Löschen"
							onclick={() => ((deleteUser = u), (deleteOpen = true))}
						>
							<Trash size={16} />
						</button>
					{:else}
						<span class="size-9" aria-hidden="true"></span>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</section>

<Dialog bind:open={formOpen} title={editing ? 'Benutzer bearbeiten' : 'Benutzer anlegen'} wide>
	<form
		id="user-form"
		method="POST"
		action={editing ? '?/update' : '?/create'}
		class="grid gap-4 sm:grid-cols-2"
		use:enhance={() => {
			busy = true;
			formError = '';
			return async ({ result, update }) => {
				busy = false;
				if (result.type === 'failure') {
					formError = String(result.data?.message ?? 'Speichern fehlgeschlagen');
					return;
				}
				if (result.type === 'success') {
					formOpen = false;
					const c = result.data?.created as { name: string; username: string; invited: boolean; password: string | null } | undefined;
					if (c) {
						secret = { title: 'Benutzer angelegt', name: c.name, username: c.username, password: c.password, mailed: c.invited };
						secretOpen = true;
					} else toast.success('Gespeichert');
				}
				await update({ reset: false });
			};
		}}
	>
		{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
		<div>
			<label for="u-first" class="field-label">Vorname *</label>
			<input id="u-first" name="firstName" class="input" required maxlength="60" value={editing?.firstName ?? ''} autocomplete="off" />
		</div>
		<div>
			<label for="u-last" class="field-label">Nachname</label>
			<input id="u-last" name="lastName" class="input" maxlength="60" value={editing?.lastName ?? ''} autocomplete="off" />
		</div>
		<div>
			<label for="u-name" class="field-label">Benutzername *</label>
			<input id="u-name" name="username" class="input" required maxlength="40" autocapitalize="none" spellcheck="false" value={editing?.username ?? ''} autocomplete="off" />
		</div>
		<div>
			<label for="u-mail" class="field-label">E-Mail</label>
			<input id="u-mail" name="email" type="email" class="input" maxlength="120" bind:value={email} autocomplete="off" />
			<p class="field-hint">Für „Passwort vergessen“ und Warn-Mails.</p>
		</div>

		<fieldset class="sm:col-span-2">
			<legend class="field-label">Rolle</legend>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each ROLES as r (r)}
					<label class="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong p-3 transition-colors has-[:checked]:border-ink has-[:checked]:bg-surface-3">
						<input type="radio" name="role" value={r} bind:group={role} class="mt-1 accent-[var(--c-ink)]" />
						<span>
							<span class="block font-medium">{ROLE_LABELS[r]}</span>
							<span class="block text-sm text-ink-3">{ROLE_DESCRIPTIONS[r]}</span>
						</span>
					</label>
				{/each}
			</div>
		</fieldset>

		{#if needsParty(role)}
			<div class="sm:col-span-2">
				<label for="u-party" class="field-label">Partie *</label>
				<select id="u-party" name="partyId" class="select" required bind:value={partyId}>
					<option value={null}>Partie wählen</option>
					{#each data.parties as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
				</select>
				<p class="field-hint">
					{#if data.parties.length}Wird beim Ausbuchen und bei Rückgaben automatisch eingesetzt und lässt sich dort ändern.{:else}Noch keine Partien angelegt – das geht unter Stammdaten.{/if}
				</p>
			</div>
		{/if}

		{#if editing}
			<label class="flex items-center gap-3 rounded-xl bg-surface-2 p-3 sm:col-span-2">
				<input type="checkbox" name="active" class="size-5 accent-[var(--c-ink)]" checked={editing.active} />
				<span><span class="font-medium">Zugang aktiv</span><span class="block text-sm text-ink-3">Deaktivierte Benutzer werden sofort abgemeldet.</span></span>
			</label>
		{:else}
			<fieldset class="sm:col-span-2">
				<legend class="field-label">Erstes Passwort</legend>
				<div class="grid gap-2 sm:grid-cols-2">
					<label class="flex items-start gap-3 rounded-xl border border-line-strong p-3 has-[:checked]:border-ink has-[:checked]:bg-surface-3 {!data.mailConfigured || !email ? 'opacity-50' : ''}">
						<input type="radio" name="mode" value="mail" bind:group={mode} disabled={!data.mailConfigured || !email} class="mt-1 accent-[var(--c-ink)]" />
						<span><span class="block font-medium">Einladung per E-Mail</span><span class="block text-sm text-ink-3">{data.mailConfigured ? 'Person legt ihr Passwort selbst fest' : 'E-Mail-Versand ist nicht eingerichtet'}</span></span>
					</label>
					<label class="flex items-start gap-3 rounded-xl border border-line-strong p-3 has-[:checked]:border-ink has-[:checked]:bg-surface-3">
						<input type="radio" name="mode" value="password" bind:group={mode} class="mt-1 accent-[var(--c-ink)]" />
						<span><span class="block font-medium">Vorläufiges Passwort</span><span class="block text-sm text-ink-3">Wird einmal angezeigt, beim ersten Login geändert</span></span>
					</label>
				</div>
			</fieldset>
		{/if}
		{#if formError}<p class="field-error sm:col-span-2" role="alert">{formError}</p>{/if}
	</form>
	{#snippet footer()}
		<button class="btn btn-secondary" onclick={() => (formOpen = false)}>Abbrechen</button>
		<button class="btn btn-primary" form="user-form" disabled={busy}>{editing ? 'Speichern' : 'Anlegen'}</button>
	{/snippet}
</Dialog>

<Dialog bind:open={resetOpen} title="Passwort zurücksetzen">
	{#if resetUser}
		<p class="text-ink-2">Für <span class="font-medium text-ink">{fullName(resetUser)}</span>. Bestehende Anmeldungen werden beim vorläufigen Passwort beendet.</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-secondary" onclick={() => (resetOpen = false)}>Abbrechen</button>
		{#each resetModes as m (m)}
			<form
				method="POST"
				action="?/reset"
				use:enhance={() =>
					async ({ result }) => {
						resetOpen = false;
						if (result.type === 'failure') {
							toast.error(String(result.data?.message ?? 'Zurücksetzen fehlgeschlagen'));
							return;
						}
						if (result.type === 'success') {
							const r = result.data?.reset as { name: string; mailed: boolean; password: string | null };
							secret = { title: 'Passwort zurückgesetzt', name: r.name, password: r.password, mailed: r.mailed };
							secretOpen = true;
						}
					}}
			>
				<input type="hidden" name="id" value={resetUser?.id} />
				<input type="hidden" name="mode" value={m} />
				<button class="btn {m === 'mail' ? 'btn-secondary' : 'btn-primary'}">{m === 'mail' ? 'Link per E-Mail' : 'Vorläufiges Passwort'}</button>
			</form>
		{/each}
	{/snippet}
</Dialog>

<Dialog bind:open={deleteOpen} title="Benutzer löschen?">
	{#if deleteUser}
		<p class="text-ink-2">
			<span class="font-medium text-ink">{fullName(deleteUser)}</span> (@{deleteUser.username}) kann sich danach nicht mehr anmelden und
			verschwindet aus dieser Liste. Bisherige Buchungen bleiben mit dem Namen erhalten.
		</p>
		<p class="mt-2 text-sm text-ink-3">Benutzername und E-Mail-Adresse werden wieder frei. Das lässt sich nicht rückgängig machen.</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-secondary" onclick={() => (deleteOpen = false)}>Abbrechen</button>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() =>
				async ({ result, update }) => {
					deleteOpen = false;
					if (result.type === 'failure') {
						toast.error(String(result.data?.message ?? 'Löschen fehlgeschlagen'));
						return;
					}
					if (result.type === 'success') toast.success('Benutzer gelöscht', String(result.data?.deleted ?? ''));
					await update();
				}}
		>
			<input type="hidden" name="id" value={deleteUser?.id} />
			<button class="btn btn-danger">Endgültig löschen</button>
		</form>
	{/snippet}
</Dialog>

<Dialog bind:open={secretOpen} title={secret?.title ?? ''}>
	{#if secret}
		{#if secret.mailed}
			<div class="flex gap-3 rounded-xl bg-ok-soft p-4 text-ok">
				<MailCheck size={22} class="shrink-0" aria-hidden="true" />
				<p class="font-medium">{secret.name} hat eine E-Mail mit einem Link zum Festlegen des Passworts bekommen.</p>
			</div>
		{:else if secret.password}
			<p class="text-ink-2">Gib {secret.name} dieses vorläufige Passwort weiter. Es wird nur jetzt angezeigt und muss beim ersten Login geändert werden.</p>
			{#if secret.username}<p class="mt-3 text-sm text-ink-3">Benutzername: <span class="font-medium text-ink">{secret.username}</span></p>{/if}
			<div class="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3">
				<code class="num flex-1 font-display text-2xl font-semibold tracking-wider">{secret.password}</code>
				<button class="btn btn-secondary btn-sm" onclick={() => copy(secret!.password!)}><Copy size={16} aria-hidden="true" />Kopieren</button>
			</div>
		{:else}
			<p class="text-ink-2">Die Einladung konnte nicht gesendet werden. Setze das Passwort über das Schlüssel-Symbol zurück.</p>
		{/if}
	{/if}
	{#snippet footer()}
		<button class="btn btn-primary" onclick={() => (secretOpen = false)}>Fertig</button>
	{/snippet}
</Dialog>
