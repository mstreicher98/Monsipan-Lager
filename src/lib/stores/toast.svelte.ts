export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
	detail?: string;
}

let nextId = 1;

class ToastStore {
	items = $state<Toast[]>([]);

	show(kind: ToastKind, message: string, detail?: string, ms = kind === 'error' ? 6000 : 3500) {
		const id = nextId++;
		this.items = [...this.items.slice(-3), { id, kind, message, detail }];
		setTimeout(() => this.dismiss(id), ms);
		return id;
	}
	success(message: string, detail?: string) {
		return this.show('success', message, detail);
	}
	error(message: string, detail?: string) {
		return this.show('error', message, detail);
	}
	info(message: string, detail?: string) {
		return this.show('info', message, detail);
	}
	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastStore();
