// Erzeugt die App-Icons (PNG) ohne Zusatzpakete: node scripts/generate-icons.mjs
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

/** Markierungskachel wie favicon.svg; maskable = vollflächig mit Sicherheitsrand */
function icon(size, maskable) {
	const SS = 4;
	const scale = maskable ? 0.72 : 1;
	const off = (32 - 32 * scale) / 2;
	const dashes = [
		[6, 14.5, 6, 3],
		[14, 14.5, 6, 3],
		[22, 14.5, 4, 3]
	];
	return png(size, (x, y) => {
		let bg = 0;
		let fg = 0;
		for (let sy = 0; sy < SS; sy++)
			for (let sx = 0; sx < SS; sx++) {
				const px = ((x + (sx + 0.5) / SS) / size) * 32;
				const py = ((y + (sy + 0.5) / SS) / size) * 32;
				if (maskable || inRoundRect(px, py, 0, 0, 32, 32, 9)) bg++;
				const qx = (px - off) / scale;
				const qy = (py - off) / scale;
				if (dashes.some(([dx, dy, w, h]) => inRoundRect(qx, qy, dx, dy, w, h, 1))) fg++;
			}
		const n = SS * SS;
		const t = fg / n;
		const color = ASPHALT.map((c, i) => Math.round(c * (1 - t) + YELLOW[i] * t));
		return [...color, Math.round((Math.max(bg, fg) / n) * 255)];
	});
}

const out = path.resolve('static/icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), icon(192, false));
fs.writeFileSync(path.join(out, 'icon-512.png'), icon(512, false));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), icon(512, true));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), icon(180, true));
console.log('Icons geschrieben nach', out);
