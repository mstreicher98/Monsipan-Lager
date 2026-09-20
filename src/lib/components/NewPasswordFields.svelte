<script lang="ts">
	import PasswordInput from './PasswordInput.svelte';

	interface Props {
		error?: string | null;
	}
	let { error = null }: Props = $props();
	let password = $state('');
	let confirm = $state('');
	const long = $derived(password.length >= 8);
	const match = $derived(confirm.length > 0 && password === confirm);
</script>

<div>
	<label for="password" class="field-label">Neues Passwort</label>
	<PasswordInput id="password" name="password" autocomplete="new-password" required minlength={8} bind:value={password} aria-describedby="pw-hint" />
	<p id="pw-hint" class="field-hint {long ? 'text-ok' : ''}">Mindestens 8 Zeichen{long ? ' ✓' : ''}</p>
</div>
<div>
	<label for="confirm" class="field-label">Passwort wiederholen</label>
	<PasswordInput id="confirm" name="confirm" autocomplete="new-password" required bind:value={confirm} invalid={confirm.length > 0 && !match} />
	{#if confirm.length > 0 && !match}<p class="field-error">Stimmt noch nicht überein.</p>{/if}
</div>
{#if error}<p class="field-error" role="alert">{error}</p>{/if}
