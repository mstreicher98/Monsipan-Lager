<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		id: string;
		invalid?: boolean;
	}
	let { id, invalid = false, value = $bindable(''), ...rest }: Props = $props();
	let show = $state(false);
</script>

<div class="relative">
	<input {id} class="input pr-12" type={show ? 'text' : 'password'} aria-invalid={invalid || undefined} bind:value {...rest} />
	<button
		type="button"
		class="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:text-ink"
		aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
		aria-pressed={show}
		onclick={() => (show = !show)}
	>
		{#if show}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
	</button>
</div>
