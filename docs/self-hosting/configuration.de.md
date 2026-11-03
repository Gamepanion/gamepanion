# Konfiguration

Gamepanion läuft als ein Container mit einem Volume, aus dem Image `ghcr.io/gamepanion/gamepanion`. Ein Server braucht zwei Dateien und keinen Checkout: [`compose.yaml`](https://github.com/gamepanion/gamepanion/blob/main/compose.yaml), das das Image startet, und daneben eine `.env`-Datei mit allen Einstellungen, eine ausgefüllte Kopie von [`.env.example`](https://github.com/gamepanion/gamepanion/blob/main/.env.example). Einstellungen sind Umgebungsvariablen: `GAMEPANION_*`, dazu die gemeinsamen `PUBLIC_URL`, `DATA_DIR`, `PORT` und `TZ`.

```bash
curl -fsSLO https://raw.githubusercontent.com/gamepanion/gamepanion/main/compose.yaml
curl -fsSL -o .env https://raw.githubusercontent.com/gamepanion/gamepanion/main/.env.example
chmod 600 .env   # dann ausfüllen
docker compose up -d
```

Aktualisieren: `docker compose pull && docker compose up -d`. `:main` folgt dem main-Branch; ein Image-Watcher wie Watchtower kann das nach seinem Zeitplan erledigen. Wer bei einem Release bleiben will, pinnt dessen Version (`:0.1.0`, oder `:0.1` für seine Fehlerbehebungen); jedes Release steht auf GitHub, mit den Pull Requests, die es enthält.

## Variablen

| Variable | Standard | Was sie tut |
|---|---|---|
| `PUBLIC_URL` | `http://localhost:${PORT}` außerhalb von Produktion; in Produktion **Pflicht** | Die Adresse, unter der Spieler und Claude Gamepanion erreichen. Der Issuer der Anmeldung und die MCP-Ressource (`${PUBLIC_URL}/mcp`) werden daraus gebildet. |
| `DATA_DIR` | `/data` | Enthält `gamepanion.sqlite` (das Log), `auth.sqlite` (Anmeldung) und, falls erzeugt, `secret`. |
| `PORT` | `3000` | Der Port, auf dem der Server lauscht. `/mcp` liest die Schlüssel der Anmeldung auch von `127.0.0.1:${PORT}`. |
| `TZ` | `Europe/Berlin` | Die Zeitzone von „heute", dem Standardtag einer Spielsession. |
| `GAMEPANION_SECRET` | erzeugt in `${DATA_DIR}/secret` | Signiert Session-Cookies und verschlüsselt die Schlüssel zum Signieren von Tokens. Mindestens 32 Bytes (`openssl rand -hex 32`). Eine Änderung meldet alle ab. |
| `GAMEPANION_SIGNUP_ALLOW` | leer: niemand Neues | Wer Spieler werden darf: Adressen, `@domain`-Einträge oder `*`, durch Kommas getrennt. Bestehende Spieler melden sich weiter an. |
| `GAMEPANION_SMTP_URL` | nicht gesetzt: keine E-Mail-Codes | Ein SMTP-Server für Anmelde-Mails (ein Code, außerhalb einer MCP-Anmeldung auch ein Link), `smtp://` oder `smtps://user:password@host:port`. |
| `GAMEPANION_SMTP_FROM` | (Pflicht mit SMTP) | Die Absenderadresse der Codes. |
| `GAMEPANION_OIDC_<NAME>_ISSUER` | nicht gesetzt | Die Issuer-URL eines OpenID-Connect-Anbieters. `<NAME>` wählst du (Buchstaben und Ziffern); ein Block pro Anbieter. |
| `GAMEPANION_OIDC_<NAME>_CLIENT_ID` | (Pflicht mit Issuer) | Die Client-ID, die Gamepanion bei diesem Anbieter hat. |
| `GAMEPANION_OIDC_<NAME>_CLIENT_SECRET` | leer | Ihr Secret, für einen vertraulichen Client. |
| `GAMEPANION_OIDC_<NAME>_LABEL` | der Name | Der Text des Knopfs: „Weiter mit `<LABEL>`". |
| `GAMEPANION_ANTHROPIC_API_KEY` | nicht gesetzt: kein Chat | Ein Claude-API-Schlüssel: schaltet den Chat in der Web-App ein ([ADR 0013](../adr/0013-in-app-chat.md)). Die Nachrichten bezahlt, wer die Instanz betreibt. |
| `GAMEPANION_ANTHROPIC_MODEL` | `claude-opus-5-5` | Das Modell, das der Chat nutzt. |
| `GAMEPANION_KEY_ENCRYPTION_KEY` | nicht gesetzt: Spieler können keinen Schlüssel speichern | 32 Byte als 64 Hex-Zeichen (`openssl rand -hex 32`). Damit kann ein Spieler auf der Kontoseite seinen eigenen Anthropic-API-Schlüssel speichern, mit diesem Schlüssel verschlüsselt, und der Chat läuft für ihn damit, auch auf einer Instanz ohne `GAMEPANION_ANTHROPIC_API_KEY` ([ADR 0021](../adr/0021-players-own-keys.md)). Behalte ihn: ein neuer macht die gespeicherten Schlüssel unlesbar, und die Spieler müssen ihre neu eintragen. |
| `GAMEPANION_CHAT_DAILY_LIMIT` | `100` | Wie viele Chat-Nachrichten ein Spieler am Tag senden darf. |
| `GAMEPANION_TRANSCRIBE_URL` | nicht gesetzt: nur Tippen | Ein Whisper-Server, um in den Chat zu sprechen, mit dem OpenAI-kompatiblen `/v1/audio/transcriptions`, etwa [speaches](https://speaches.ai). Ohne Schrägstrich am Ende. |
| `GAMEPANION_TRANSCRIBE_MODEL` | `deepdml/faster-whisper-large-v3-turbo-ct2` | Das Modell, das der Whisper-Server nutzt. |
| `GAMEPANION_LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug` oder `silent`. |

Mindestens ein Weg zur Anmeldung ist nötig: SMTP für E-Mail-Codes, oder ein Anbieter. Passkeys brauchen keine Einstellung: Angemeldete fügen sie auf der Kontoseite hinzu. Sie hängen am Host von `PUBLIC_URL`; wer den ändert, fügt sie neu hinzu.

## OpenID-Connect-Anbieter

Registriere Gamepanion beim Anbieter (authentik, Google, jeder OpenID-Connect-Anbieter) mit der Redirect-URI `${PUBLIC_URL}/api/auth/callback/<name>`, wobei `<name>` `<NAME>` in Kleinbuchstaben ist. Für authentik:

```bash
GAMEPANION_OIDC_AUTHENTIK_ISSUER=https://authentik.example.com/application/o/gamepanion/
GAMEPANION_OIDC_AUTHENTIK_CLIENT_ID=...
GAMEPANION_OIDC_AUTHENTIK_CLIENT_SECRET=...
GAMEPANION_OIDC_AUTHENTIK_LABEL=authentik
```

Eine Anmeldung über einen Anbieter wird mit einem bestehenden Spieler gleicher Adresse nur verbunden, wenn der Anbieter die Adresse als bestätigt meldet ([ADR 0006](../adr/0006-better-auth-wiring.md)).

Lehnt ein Anbieter eine Anmeldung ab, zeigt die Anmeldeseite seinen Fehlercode, und Gamepanions Log hat eine Zeile dazu.

## Der Chat in der Web-App

Mit `GAMEPANION_ANTHROPIC_API_KEY` hat jede Seite einen Knopf **Frag Claude** und jede Karte einen kleinen, der den Chat zu dieser Karte öffnet. Der Chat nutzt dieselben Werkzeuge wie Claude über MCP, als der angemeldete Spieler, sieht also nichts, was der Spieler nicht sehen könnte, und nichts, was er noch nicht gefunden hat ([ADR 0013](../adr/0013-in-app-chat.md)). Das Gespräch bleibt auf dem Gerät des Spielers.

Um hineinzusprechen, lass neben Gamepanion einen Whisper-Server laufen und richte `GAMEPANION_TRANSCRIBE_URL` darauf. Die Aufnahme geht nur dorthin und wird nie gespeichert. Mit speaches im Compose-Netz:

```yaml
  whisper:
    image: ghcr.io/speaches-ai/speaches:latest-cpu
    restart: unless-stopped
    environment:
      WHISPER__COMPUTE_TYPE: int8
      WHISPER__TTL: "-1"
    volumes:
      - whisper-models:/home/ubuntu/.cache/huggingface/hub
```

und `GAMEPANION_TRANSCRIBE_URL=http://whisper:8000` in der `.env`. Die erste Umwandlung lädt das Modell herunter.

## Die Seiten des Betreibers

`GAMEPANION_IMPRINT_FILE`, `GAMEPANION_PRIVACY_FILE` und `GAMEPANION_TERMS_FILE` nennen eigene Markdown-Dateien: Impressum, Datenschutzerklärung und AGB unter `/imprint`, `/privacy` und `/terms`, verlinkt in der Fußzeile. Ohne Einstellung, oder wenn die Datei fehlt oder größer als 256 KiB ist, gibt es keine Seite und keinen Link. Ein Wert darf `{lang}` enthalten (`/legal/imprint.{lang}.md`), ersetzt durch die Sprache der Seite (`en`, `de`), sonst Englisch. Die Dateien werden bei jedem Aufruf gelesen. Gamepanion liefert keine der Texte mit. `/licenses` listet die Open-Source-Pakete, die Gamepanion mitbringt, und ist immer da.

## Zahlungen

Zahlungen sind aus, solange `GAMEPANION_PAYMENT_PROVIDER` nicht gesetzt ist: Dann hat jeder Spieler alles, nichts ist begrenzt oder verkauft ([ADR 0023](../adr/0023-a-subscription-one-game-free.md)). Es ist nur für einen Betreiber, der Abos verkauft: `creem` braucht `GAMEPANION_CREEM_API_KEY`, `GAMEPANION_CREEM_PRODUCT_ID`, `GAMEPANION_CREEM_WEBHOOK_SECRET` (und `GAMEPANION_CREEM_YEARLY_PRODUCT_ID` für ein Jahresabo) und alle vier Betreiber-Dateien (auch `GAMEPANION_PRICING_FILE`); bis dahin antwortet `/health` mit 503 und nennt die fehlende Einstellung. `GAMEPANION_FREE_PLAYERS` nennt Spieler, die nie begrenzt sind, im Format von `GAMEPANION_SIGNUP_ALLOW`: jedes Spiel, und Chat und Sprechen über den Schlüssel der Instanz, ungezählt. `fake` (mit `GAMEPANION_FAKE_WEBHOOK_SECRET`) probiert den Ablauf aus, ohne jemandem etwas zu berechnen. Die Abo-Daten liegen in `DATA_DIR/billing.sqlite`.

Wo die Instanz verkauft, dient ihr `GAMEPANION_ANTHROPIC_API_KEY` nur Spielern im „Abo mit KI“ ([ADR 0024](../adr/0024-the-hosted-ai-tier.md)): `GAMEPANION_CREEM_HOSTED_AI_PRODUCT_ID` (und `_YEARLY_PRODUCT_ID`) sind seine Produkte. Alle anderen nutzen den Chat mit ihrem eigenen Schlüssel (`GAMEPANION_KEY_ENCRYPTION_KEY`); ohne einen sagt der Chat, was er braucht. Die Nutzung eines Spielers mit KI zählt je Kalendermonat gegen `GAMEPANION_AI_MONTHLY_TOKENS` (Standard 2 000 000) und `GAMEPANION_AI_MONTHLY_MINUTES` Transkription (Standard 60); `GAMEPANION_AI_PER_MINUTE` (Standard 6) begrenzt die Nachrichten pro Minute und `GAMEPANION_AI_REPLY_TOKENS` (Standard 4000) die Länge einer Antwort. Nutzung mit dem eigenen Schlüssel zählt nie. Sprechen in den Chat gibt es dort nur im Abo mit KI. Ohne Zahlungsanbieter gilt nichts davon.

## Daten und Backups

Sichere `DATA_DIR`. `gamepanion.sqlite` ist das Log; `auth.sqlite` enthält Konten, Sessions und die verbundenen Clients, also enthält eine Kopie des Logs allein keine Tokens ([ADR 0004](../adr/0004-sign-in-with-better-auth.md)). Geht `auth.sqlite` verloren, sind alle abgemeldet und es ist verloren, wer wer ist: Behalte beide.

SQLite läuft im WAL-Modus: Neue Daten stehen eine Weile in `gamepanion.sqlite-wal`. Sichere den ganzen Ordner, oder kopiere mit `sqlite3 gamepanion.sqlite ".backup kopie.sqlite"`; die Hauptdatei allein kann fast leer sein.

`GET /health` antwortet `{"status":"ok"}`, solange die Datenbank antwortet; der `HEALTHCHECK` des Images nutzt es.
