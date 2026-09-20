import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import fs from "fs";

// Lokale HTTPS-Zertifikate (mkcert) für die Handykamera im WLAN.
// Nur wenn die Dateien da sind – sonst laufen Build und CI (Linux) nicht.
const certDir = process.env.DEV_CERT_DIR ?? "C:/WINDOWS/system32/certs";
const certKey = `${certDir}/localhost+2-key.pem`;
const certCrt = `${certDir}/localhost+2.pem`;
const https =
  fs.existsSync(certKey) && fs.existsSync(certCrt)
    ? { key: fs.readFileSync(certKey), cert: fs.readFileSync(certCrt) }
    : undefined;

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    https,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
