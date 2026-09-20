# Monsipan Lager

Lagerverwaltung für die Bodenmarkierung: Bestand je Lagerort, Ein-/Ausbuchen per Scan,
Umlagern, Rückgaben, Inventur, Bestellliste mit Warn-Mails und Auswertungen.

- **Scannen** mit USB-/Bluetooth-Handscanner am PC oder mit der Handykamera
  (EAN, GTIN-14, Code 128, GS1 und die Kansai-DataMatrix mit `bez:`/`art:`/`inh:` …)
- **Handy und PC**, als App installierbar (PWA), Hell- und Dunkelmodus
- **Live**: Buchungen auf einem Gerät erscheinen sofort auf allen anderen
- **Drucken**: Bestand und Bewegungen aufs Papier, mit Zählspalte für die Inventur
- **Ein Container** plus Caddy für HTTPS, Datenbank ist eine einzige SQLite-Datei

---

## Inhalt

1. [Rollen](#rollen)
2. [Lokale Entwicklung](#lokale-entwicklung)
3. [Betrieb auf dem Server](#betrieb-auf-dem-server)
4. [Datensicherung](#datensicherung)
5. [Alles zurücksetzen](#alles-zurücksetzen)
6. [Listen drucken](#listen-drucken)
7. [Scanner einrichten](#scanner-einrichten)
8. [Technik und Projektstruktur](#technik-und-projektstruktur)

---

## Rollen

| Rolle | Darf |
|---|---|
| Admin | alles, zusätzlich Benutzer und Einstellungen |
| Bauleiter | buchen, Inventur, Buchungen korrigieren/stornieren, Artikel und Stammdaten pflegen, Berichte und Bestellliste |
| Partieführer | Bestand und Bewegungen ansehen, ein-/ausbuchen, umlagern, Rückgaben |
| Arbeiter | wie Partieführer, sieht aber keine Bewegungen (weder Liste noch Verlauf am Artikel) |
| Nur ansehen | alles ansehen außer Stammdaten, Benutzer und Einstellungen – keine Änderungen |

**Partieführer und Arbeiter** gehören immer zu einer Partie (Pflichtfeld unter Benutzer).
Beim Ausbuchen („Ausgabe an“) und bei Rückgaben („Zurück von“) ist ihre Partie vorausgewählt.
Wer zu keiner Partie gehört (z. B. Bauleiter, Admin), bucht standardmäßig auf sich selbst –
in der Bewegungsliste steht dann der eigene Name. Eine Partie lässt sich jederzeit auswählen.

**Benutzer löschen:** Wer nie gebucht hat, wird vollständig entfernt. Wer schon gebucht hat,
kann sich danach nicht mehr anmelden und verschwindet aus der Liste; der Name bleibt in der
Historie erhalten, Benutzername und E-Mail werden frei.

**Inhaber:** Genau ein Konto ist Inhaber – zu Beginn der erste Admin. Nur der Inhaber darf
Admins löschen, deaktivieren oder herabstufen und deren Passwort zurücksetzen; alle übrigen
Benutzer verwaltet jeder Admin wie bisher. Das Inhaber-Konto selbst kann niemand löschen,
deaktivieren oder herabstufen, auch der Inhaber nicht. Unter **Benutzer → Inhaber-Konto**
lässt sich die Inhaberschaft mit Passwortbestätigung an einen anderen aktiven Admin
übergeben; der bisherige Inhaber bleibt Admin. Beim Zurücksetzen aller Daten bleibt das
Inhaber-Konto immer erhalten. Die Regeln stehen in
[`src/lib/user-rules.ts`](src/lib/user-rules.ts).

Die Rechte stehen an einer Stelle: [`src/lib/permissions.ts`](src/lib/permissions.ts).

## Lokale Entwicklung

Voraussetzung: Node.js 22.12 oder neuer.

```bash
npm install
npm run dev
```

Beim ersten Start wird die Datenbank in `./data/lager.db` angelegt. Mit `DEMO_DATA=true`
in der `.env` kommen Beispielartikel (u. a. die fotografierten Kansai- und 3M-Etiketten),
Partien und ein halbes Jahr Buchungen dazu. Grund- und Demodaten werden nur bei einer
leeren Datenbank angelegt – nach einem Zurücksetzen kommen sie nicht von selbst wieder.

| Zugang (nur Entwicklung) | Passwort |
|---|---|
| `admin` | `admin1234` |
| `bauleiter` (ohne Partie), `partie` (Partieführer, Partie Nord), `arbeiter` (Partie Nord), `buero` (nur ansehen) | `demo1234` |

Die Handykamera braucht HTTPS. Zum Testen im WLAN ein lokales Zertifikat erzeugen,
z. B. mit [mkcert](https://github.com/FiloSottile/mkcert) für `localhost` und die
IP-Adresse des PCs, und in `vite.config.ts` unter `server.https` eintragen. Auf dem Handy
muss die mkcert-Stammzertifizierungsstelle (`mkcert -CAROOT` → `rootCA.pem`) installiert
und vertraut sein, sonst blockiert der Browser die Kamera.

Weitere Befehle:

```bash
npm run check      # Typprüfung
npm test           # Tests (Scan-Parser, Tastaturlayouts, Scanner-Erkennung)
npm run build      # Produktions-Build nach ./build
npm run db:generate  # nach Änderungen am Schema: neue Migration erzeugen
```

## Betrieb auf dem Server

Zwei Wege: fertiges Image aus GitHub über Portainer (wenn schon ein Cloudflare Tunnel
läuft) oder selbst bauen mit Docker Compose und Caddy.

### Mit Portainer und Cloudflare Tunnel

Bei jedem Push auf `main` baut GitHub Actions
([`.github/workflows/docker.yml`](.github/workflows/docker.yml)) erst Typprüfung und
Tests, dann das Image für `linux/amd64` und `linux/arm64`:

```
ghcr.io/mstreicher98/monsipan-lager:latest
```

Dazu gibt es Tags mit dem Commit (`sha-…`) und, bei einem Git-Tag wie `v1.0.1`, mit der
Version. In Portainer **Stacks → Add stack → Repository**, Repository-URL des Projekts,
Compose path `portainer-stack.yml`. Die Datei ist kommentiert; nötig ist nur:

| Variable | Wert |
|---|---|
| `ORIGIN` | `https://lager.monsipan.at` – muss exakt der öffentlichen Adresse entsprechen, sonst lehnt die App alle Formulare ab |
| `INITIAL_ADMIN_PASSWORD` | Passwort des ersten Admins (leer lassen: die App erzeugt eines und zeigt es im Log) |
| `SMTP_*`, `MAIL_FROM` | nur falls E-Mail gewünscht |

Der Tunnel zeigt auf `http://<Server-IP>:3000`. Läuft `cloudflared` als Container in
einem eigenen Docker-Netz, stattdessen in `portainer-stack.yml` Variante B aktivieren
und im Tunnel `http://app:3000` eintragen. TLS macht Cloudflare, Caddy wird dann nicht
gebraucht.

Das Paket ist derzeit öffentlich, Portainer braucht also keine Zugangsdaten. Wird es auf
GitHub unter **Packages → Package settings** auf privat gestellt, in Portainer unter
**Registries** eine GHCR-Registry mit GitHub-Benutzer und einem Token mit
`read:packages` hinterlegen.

**Update:** Änderungen pushen, Actions abwarten, in Portainer **Pull and redeploy**.
Die Datenbank liegt im Volume `lager-data` und bleibt dabei erhalten; Migrationen laufen
beim Start automatisch.

### Selbst bauen mit Docker Compose und Caddy

Benötigt: ein Linux-Server mit Docker, Ports 80 und 443 offen, und ein DNS-Eintrag
(A-Record) von `lager.monsipan.at` auf die Server-IP.

```bash
git clone <repo> monsipan-lager && cd monsipan-lager
cp .env.example .env        # Domain, SMTP und ersten Admin eintragen
docker compose up -d --build
docker compose logs app     # zeigt das Passwort des ersten Admins, falls keines gesetzt wurde
```

Caddy holt das HTTPS-Zertifikat automatisch und erneuert es. Beim ersten Login muss das
Admin-Passwort geändert werden.

**Update:** `git pull && docker compose up -d --build` – Datenbank-Migrationen laufen beim
Start automatisch.

**Wichtige Umgebungsvariablen** (siehe [`.env.example`](.env.example)):

| Variable | Zweck |
|---|---|
| `DOMAIN` | Domain für HTTPS und Links in E-Mails |
| `INITIAL_ADMIN_*` | erster Admin, nur beim allerersten Start |
| `SMTP_*`, `MAIL_FROM` | E-Mail für „Passwort vergessen“, Einladungen, Warnungen |
| `DEMO_DATA` | `true` legt Beispieldaten an – im Echtbetrieb `false` lassen |

Ohne SMTP funktioniert alles außer E-Mail; Mails landen dann nur im Log. Den Versand
testet ein Admin unter **Einstellungen → Test senden**.

## Datensicherung

- Jede Nacht ab 2 Uhr entsteht automatisch eine Sicherung in `/data/backups`
  (Docker-Volume `lager-data`), die letzten 14 bleiben erhalten. Sicherungen werden nie
  überschrieben; entsteht eine zweite in derselben Sekunde, bekommt sie ein `-2` angehängt.
- Unter **Einstellungen → Datensicherung** lassen sich Sicherungen sofort erstellen und herunterladen.

**Wiederherstellen (in der App, nur Admin):** In der Liste der Sicherungen auf das
Verlaufs-Symbol klicken oder über **Sicherungsdatei hochladen** eine `.db`-Datei von
außerhalb einspielen (bis 200 MB, deshalb steht `BODY_SIZE_LIMIT` im Container auf 210M).
Bestätigt wird mit dem eigenen Passwort. Ablauf: Datei prüfen (SQLite, Schema, Zustand),
bei Bedarf auf den aktuellen Schemastand migrieren, Sicherung des jetzigen Standes anlegen
(`-vor-restore` im Namen) und dann den gesamten Inhalt in einer Transaktion ersetzen –
entweder ganz oder gar nicht. Die Datenbankdatei selbst wird nicht getauscht, damit
laufende Anfragen nicht ins Leere greifen. Anmeldungen kommen danach aus der Sicherung;
wer dadurch abgemeldet wird, meldet sich einfach neu an.
Der Code steht in [`src/lib/server/restore.ts`](src/lib/server/restore.ts).

**Wiederherstellen von Hand** (z. B. wenn die App nicht startet): Container stoppen,
gewünschte Sicherung als `lager.db` in das Volume kopieren, Container starten.

```bash
docker compose stop app
docker compose run --rm --no-deps --entrypoint sh app -c "rm -f /data/lager.db-wal /data/lager.db-shm"
docker compose cp ./lager-2026-09-18-020000.db app:/data/lager.db
docker compose start app
```

Für echte Ausfallsicherheit die Sicherungen zusätzlich außerhalb des Servers ablegen
(z. B. nächtliches `rsync` des Volumes oder Download über die Oberfläche).

## Alles zurücksetzen

Unter **Einstellungen → Alles zurücksetzen** (nur Admin) lässt sich das Lager komplett leeren:
Artikel und Codes, Bestand, alle Bewegungen, Lagerorte, Partien, Materialarten und Farben.

- **Doppelte Bestätigung:** `ALLES LÖSCHEN` eintippen (Groß-/Kleinschreibung egal) und
  das eigene Passwort eingeben. Nach 5 Fehlversuchen ist die Aktion kurz gesperrt.
- Das eigene Admin-Konto bleibt immer erhalten. Optional werden alle anderen Benutzer
  mitgelöscht, sonst verlieren sie nur ihre Partie-Zuordnung. Bereits gelöschte Benutzer
  werden endgültig entfernt.
- Optional werden die Standard-Materialarten und RAL-Verkehrsfarben gleich wieder angelegt.
- **Vorher entsteht automatisch eine Sicherung** mit `-vor-reset` im Namen. Sie ist in der
  Liste gekennzeichnet, wird getrennt aufbewahrt (die letzten 10) und verdrängt keine der
  14 regulären Sicherungen. Wiederherstellen wie oben beschrieben.

## Listen drucken

**Bestand** und **Bewegungen** haben je einen Knopf **Drucken**. Er öffnet eine eigene
Druckansicht, die den aktuellen Filter übernimmt und alle Treffer enthält – nicht nur die
angezeigte Seite, sondern bis zu 2000 Zeilen. Das Druckfenster öffnet sich von selbst;
sonst hilft der Knopf auf der Seite.

- Eingestellt auf A4 mit Kopfzeile: Firma, Titel, Filter und Zeitpunkt des Ausdrucks.
  Der Tabellenkopf wiederholt sich auf jeder Seite, Zeilen werden nicht umgebrochen.
  Navigation, Filter und Knöpfe kommen nicht aufs Papier.
- **Bestandsliste:** je Artikel Nummer, Hersteller und die Mengen der einzelnen Lagerorte.
  Bestände auf oder unter dem Mindestbestand stehen fett mit dem Hinweis „unter
  Mindestbestand“. Ganz rechts ist eine leere Spalte **gezählt** zum Eintragen bei der Inventur.
- **Bewegungen:** Zeitpunkt, Art, Artikel, Menge mit Vorzeichen, Von/Nach und wer gebucht
  hat. Stornierte Buchungen sind durchgestrichen. Nur für Rollen, die Bewegungen sehen dürfen.

## Scanner einrichten

**Handscanner am PC** (USB oder Bluetooth im Tastaturmodus):

- Suffix auf **Enter** stellen (Werkseinstellung bei fast allen Geräten).
- Tastaturlayout am besten auf **Deutsch (QWERTZ)**. Steht es auf US, rechnet die App
  die Eingabe automatisch um – `y`/`z`, `:`, `|` und `=` kommen trotzdem richtig an,
  Umlaute aber meist nicht.
- Einfach auf einer beliebigen Seite scannen: Die App erkennt Scanner am typischen
  Zeichenabstand (höchstens 50 ms). Auf **Buchen** landet jeder Scan in der Liste – auch
  wenn gerade ein Mengen- oder Notizfeld aktiv ist, die Menge bleibt dann unverändert.
  Sonst öffnet sich der Artikel; in normalen Formularfeldern landet der Code als Text.
- **Bluetooth** (z. B. Inateck BCST-36, eingestellt über die App „Inateck Office“):
  Zeichen kommen oft stoßweise. Aussetzer bis 0,6 s werden überbrückt, Enter mitten im
  Code (mehrzeilige DataMatrix), CR+LF, Gruppentrenner (Strg+]) und Alt-Codes für
  Umlaute werden verstanden. Scanner ohne Enter am Ende werden nach einer kurzen Pause
  erkannt (ab 8 Zeichen). Fehlen trotzdem Zeichen, die Übertragungsgeschwindigkeit am
  Scanner verringern.
- **Scanner testen** (unter Mein Konto) zeigt, was genau ankommt und wie es zerlegt wird.
  Das **Tastenprotokoll** dort listet jede Taste mit Abstand in ms – auch bei Eingaben,
  die nicht als Scan erkannt wurden – und lässt sich zur Fehlersuche kopieren.
  Die Erkennung selbst steckt in [`src/lib/scan/detector.ts`](src/lib/scan/detector.ts).

**Handykamera:** gelber Knopf unten in der Mitte. Funktioniert in Chrome (Android) und
Safari (iPhone), nur über HTTPS. Die Erkennung läuft vollständig auf dem Gerät; die
Scanner-Bibliothek (~1 MB) wird erst geladen, wenn die Kamera zum ersten Mal geöffnet wird.

**Unbekannter Code:** Bauleitung und Admin können direkt einen Artikel anlegen – bei
Kansai-DataMatrix werden Bezeichnung, Artikelnummer, Inhalt, Farbe und Materialart
automatisch ausgefüllt – oder den Code einem bestehenden Artikel zuordnen.

**Farben und RAL:** Unter **Stammdaten → Farben** wird eine Farbe über ihre RAL-Nummer
oder den RAL-Namen gewählt (alle 215 RAL-Classic-Farben, z. B. `6024` oder „Verkehrsgrün“);
das Farbmuster wird übernommen und lässt sich per Hex-Wert anpassen. Farben ohne
RAL-Nummer (z. B. Transparent) bekommen nur ein Hex-Farbmuster. Steht auf dem Etikett
eine RAL-Angabe wie `R6024`, ordnet der Scan die passende Farbe automatisch zu.
Die Artikelsuche findet Artikel auch über die RAL-Nummer.

## Technik und Projektstruktur

- [SvelteKit](https://svelte.dev) mit Svelte 5, serverseitig gerendert, Node-Adapter
- Tailwind CSS 4, Schrift Barlow (selbst gehostet)
- SQLite über libsql und [Drizzle ORM](https://orm.drizzle.team), Migrationen in `drizzle/`
- Kamera: native BarcodeDetector-API, sonst [zxing-wasm](https://github.com/Sec-ant/zxing-wasm)
- E-Mail: Nodemailer, Live-Updates: Server-Sent Events

```
src/
  lib/
    scan/          Scan-Parser, Tastaturlayouts, Handscanner- und Kamera-Anbindung
    server/        Datenbank, Anmeldung, Buchungslogik, Warnungen, Mail, Sicherungen
    components/    Oberflächen-Bausteine
    permissions.ts Rollen und Rechte
  routes/
    (auth)/        Anmelden, Passwort vergessen/zurücksetzen
    (app)/         Übersicht, Bestand, Buchen, Bewegungen, Bestellliste, Berichte,
                   Artikel, Stammdaten, Benutzer, Einstellungen, Konto, Scanner-Test
    api/           Code-Suche, Artikelsuche, Live-Ereignisse
    export/        CSV-Exporte (Excel-kompatibel) und Backup-Download
```

**Buchungslogik:** Jede Buchung ist eine unveränderliche Bewegung. Korrekturen stornieren
die alte Bewegung und legen eine neue an – der Bestand je Lagerort wird in derselben
Transaktion fortgeschrieben, gleichzeitige Buchungen können sich nicht überschneiden.
