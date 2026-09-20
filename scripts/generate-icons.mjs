// Erzeugt die App-Icons (PNG) ohne Zusatzpakete: node scripts/generate-icons.mjs
// Schreibt die Icons für die Webseite (PWA) und, falls vorhanden, für die Android-App.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ASPHALT = [0x1b, 0x20, 0x27];
const YELLOW = [0xf8, 0xf0, 0x00];

function crc32(buf) {
	let c = ~0;
	for (const b of buf) {
		c ^= b;
		for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
	}
	return ~c >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
	const raw = Buffer.alloc((size * 4 + 1) * size);
	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0;
		for (let x = 0; x < size; x++) {
			const [r, g, b, a] = pixel(x, y);
			const o = y * (size * 4 + 1) + 1 + x * 4;
			raw[o] = r;
			raw[o + 1] = g;
			raw[o + 2] = b;
			raw[o + 3] = a;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

/** Punkt in abgerundetem Rechteck? (Koordinaten im 32er-Raster) */
function inRoundRect(px, py, x, y, w, h, r) {
	if (px < x || py < y || px > x + w || py > y + h) return false;
	const cx = Math.max(x + r, Math.min(px, x + w - r));
	const cy = Math.max(y + r, Math.min(py, y + h - r));
	return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

const DASHES = [
	[6, 14.5, 6, 3],
	[14, 14.5, 6, 3],
	[22, 14.5, 4, 3]
];

/**
 * Markierungskachel wie favicon.svg.
 * shape: 'rounded' (Kachel), 'circle' (runder Rand), 'full' (randlos), 'none' (nur Striche)
 * scale: Größe der Striche im Verhältnis zur Fläche
 */
function icon(size, { shape = 'rounded', scale = 1 } = {}) {
	const SS = 4;
	const off = (32 - 32 * scale) / 2;
	return png(size, (x, y) => {
		let bg = 0;
		let fg = 0;
		for (let sy = 0; sy < SS; sy++)
			for (let sx = 0; sx < SS; sx++) {
				const px = ((x + (sx + 0.5) / SS) / size) * 32;
				const py = ((y + (sy + 0.5) / SS) / size) * 32;
				if (shape === 'full') bg++;
				else if (shape === 'rounded' && inRoundRect(px, py, 0, 0, 32, 32, 9)) bg++;
				else if (shape === 'circle' && inRoundRect(px, py, 0, 0, 32, 32, 16)) bg++;
				const qx = (px - off) / scale;
				const qy = (py - off) / scale;
				if (DASHES.some(([dx, dy, w, h]) => inRoundRect(qx, qy, dx, dy, w, h, 1))) fg++;
			}
		const n = SS * SS;
		const t = fg / n;
		const color = ASPHALT.map((c, i) => Math.round(c * (1 - t) + YELLOW[i] * t));
		return [...color, Math.round((Math.max(bg, fg) / n) * 255)];
	});
}

/* ------------------------------------------------------------ Webseite */

const web = path.resolve('static/icons');
fs.mkdirSync(web, { recursive: true });
fs.writeFileSync(path.join(web, 'icon-192.png'), icon(192));
fs.writeFileSync(path.join(web, 'icon-512.png'), icon(512));
fs.writeFileSync(path.join(web, 'icon-maskable-512.png'), icon(512, { shape: 'full', scale: 0.72 }));
fs.writeFileSync(path.join(web, 'apple-touch-icon.png'), icon(180, { shape: 'full', scale: 0.72 }));
console.log('Icons für die Webseite:', web);

/* ------------------------------------------------------- Android-App */

const res = path.resolve('android/app/src/main/res');
if (!fs.existsSync(res)) process.exit(0);

// Launcher-Icons je Bildschirmdichte; das Vordergrund-Icon sitzt im 108dp-Raster
const DENSITIES = [
	['mdpi', 48, 108],
	['hdpi', 72, 162],
	['xhdpi', 96, 216],
	['xxhdpi', 144, 324],
	['xxxhdpi', 192, 432]
];

for (const [density, launcher, adaptive] of DENSITIES) {
	const dir = path.join(res, `mipmap-${density}`);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'ic_launcher.png'), icon(launcher));
	fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), icon(launcher, { shape: 'circle' }));
	// Nur die Striche, freigestellt: der Hintergrund kommt als Farbe dazu
	fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), icon(adaptive, { shape: 'none', scale: 0.58 }));
}

// Der Startbildschirm wird als Zeichnung beschrieben statt als Bild pro Format
for (const dir of fs.readdirSync(res)) {
	if (!dir.startsWith('drawable')) continue;
	const file = path.join(res, dir, 'splash.png');
	if (fs.existsSync(file)) fs.rmSync(file);
}
fs.writeFileSync(
	path.join(res, 'drawable', 'splash.xml'),
	`<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splashBackground" />
    <item
        android:drawable="@mipmap/ic_launcher_foreground"
        android:gravity="center"
        android:width="192dp"
        android:height="192dp" />
</layer-list>
`
);
console.log('Icons für die Android-App:', res);
