import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Boxes from '@lucide/svelte/icons/boxes';
import ScanLine from '@lucide/svelte/icons/scan-line';
import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import ChartColumn from '@lucide/svelte/icons/chart-column';
import Database from '@lucide/svelte/icons/database';
import Users from '@lucide/svelte/icons/users';
import Settings from '@lucide/svelte/icons/settings';
import type { Component } from 'svelte';
import { can, type Permission, type Role } from './permissions';

export interface NavItem {
	href: string;
	label: string;
	icon: Component;
	permission?: Permission;
	badge?: 'lowStock';
}

export const MAIN_NAV: NavItem[] = [
	{ href: '/', label: 'Übersicht', icon: LayoutDashboard },
	{ href: '/bestand', label: 'Bestand', icon: Boxes },
	{ href: '/buchen', label: 'Buchen', icon: ScanLine, permission: 'stock.book' },
	{ href: '/bewegungen', label: 'Bewegungen', icon: ArrowLeftRight, permission: 'movements.view' },
	{ href: '/bestellliste', label: 'Bestellliste', icon: ClipboardList, permission: 'reports.view', badge: 'lowStock' },
	{ href: '/berichte', label: 'Berichte', icon: ChartColumn, permission: 'reports.view' }
];

export const ADMIN_NAV: NavItem[] = [
	{ href: '/stammdaten', label: 'Stammdaten', icon: Database, permission: 'masterdata.manage' },
	{ href: '/benutzer', label: 'Benutzer', icon: Users, permission: 'users.manage' },
	{ href: '/einstellungen', label: 'Einstellungen', icon: Settings, permission: 'settings.manage' }
];

/** Rechter Reiter der Handy-Leiste: Bewegungen, ohne Einblick in Bewegungen stattdessen Buchen */
export function bottomRightTab(role: Role): NavItem | null {
	if (can(role, 'movements.view')) return MAIN_NAV.find((n) => n.href === '/bewegungen')!;
	if (can(role, 'stock.book')) return MAIN_NAV.find((n) => n.href === '/buchen')!;
	return null;
}

export function visible(items: NavItem[], role: Role) {
	return items.filter((i) => !i.permission || can(role, i.permission));
}

export function isActive(href: string, pathname: string) {
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}
