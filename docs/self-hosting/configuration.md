# Configuration

Gamepanion runs as one container with one volume, from the image `ghcr.io/gamepanion/gamepanion`. A server needs two files and no checkout: [`compose.yaml`](https://github.com/gamepanion/gamepanion/blob/main/compose.yaml), which runs the image, and a `.env` file next to it with every setting, a filled-in copy of [`.env.example`](https://github.com/gamepanion/gamepanion/blob/main/.env.example). Settings are environment variables: `GAMEPANION_*`, plus the shared `PUBLIC_URL`, `DATA_DIR`, `PORT` and `TZ`.

```bash
curl -fsSLO https://raw.githubusercontent.com/gamepanion/gamepanion/main/compose.yaml
curl -fsSL -o .env https://raw.githubusercontent.com/gamepanion/gamepanion/main/.env.example
chmod 600 .env   # then fill it in
docker compose up -d
```

To update: `docker compose pull && docker compose up -d`. `:main` follows the main branch; an image watcher such as Watchtower can do the same on its schedule. To stay on a release instead, pin its version (`:0.1.0`, or `:0.1` for its fixes); each release is on GitHub with the pull requests it contains.

## Variables

| Variable | Default | What it does |
|---|---|---|
| `PUBLIC_URL` | `http://localhost:${PORT}` outside production; **required** in production | The address players and Claude reach Gamepanion at. The sign-in's issuer and the MCP resource (`${PUBLIC_URL}/mcp`) are built from it. |
| `DATA_DIR` | `/data` | Holds `gamepanion.sqlite` (the log), `auth.sqlite` (sign-in) and, if generated, `secret`. |
| `PORT` | `3000` | The port the server listens on. `/mcp` also reads the sign-in's keys from `127.0.0.1:${PORT}`. |
| `TZ` | `Europe/Berlin` | The time zone of "today", the default day of a play session. |
| `GAMEPANION_SECRET` | generated into `${DATA_DIR}/secret` | Signs session cookies and encrypts the token signing keys. At least 32 bytes (`openssl rand -hex 32`). Changing it signs everyone out. |
| `GAMEPANION_SIGNUP_ALLOW` | empty: nobody new | Who may become a player: addresses, `@domain` entries or `*`, comma-separated. Players who exist keep signing in. |
| `GAMEPANION_SMTP_URL` | unset: no email codes | An SMTP server for sign-in mails (a code, and outside an MCP sign-in a link), `smtp://` or `smtps://user:password@host:port`. |
| `GAMEPANION_SMTP_FROM` | (required with SMTP) | The sender address of the codes. |
| `GAMEPANION_OIDC_<NAME>_ISSUER` | unset | An OpenID Connect provider's issuer URL. `<NAME>` is yours to choose (letters and digits); add one block per provider. |
| `GAMEPANION_OIDC_<NAME>_CLIENT_ID` | (required with an issuer) | The client id Gamepanion has at that provider. |
| `GAMEPANION_OIDC_<NAME>_CLIENT_SECRET` | empty | Its secret, for a confidential client. |
| `GAMEPANION_OIDC_<NAME>_LABEL` | the name | The button's text: "Continue with `<LABEL>`". |
| `GAMEPANION_ANTHROPIC_API_KEY` | unset: no chat | A Claude API key: turns on the chat in the web app ([ADR 0013](../adr/0013-in-app-chat.md)). The instance owner pays for its messages. |
| `GAMEPANION_ANTHROPIC_MODEL` | `claude-opus-5-5` | The model the chat uses. |
| `GAMEPANION_KEY_ENCRYPTION_KEY` | unset: players can't store a key | 32 bytes as 64 hex characters (`openssl rand -hex 32`). With it, a player can store their own Anthropic API key on the account page, encrypted with this key, and the chat runs on it for them, also on an instance without `GAMEPANION_ANTHROPIC_API_KEY` ([ADR 0021](../adr/0021-players-own-keys.md)). Keep it: a new one makes the stored keys unreadable and players paste theirs again. |
| `GAMEPANION_CHAT_DAILY_LIMIT` | `100` | How many chat messages a player may send a day. |
| `GAMEPANION_TRANSCRIBE_URL` | unset: typing only | A Whisper server for speaking into the chat, with the OpenAI-compatible `/v1/audio/transcriptions`, such as [speaches](https://speaches.ai). No trailing slash. |
| `GAMEPANION_TRANSCRIBE_MODEL` | `deepdml/faster-whisper-large-v3-turbo-ct2` | The model the Whisper server runs. |
| `GAMEPANION_LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug` or `silent`. |

At least one way to sign in is needed: SMTP for email codes, or a provider. Passkeys need no setting: a signed-in player adds them on the account page. They are bound to the host of `PUBLIC_URL`, so changing that host means adding them again.

## OpenID Connect providers

Register Gamepanion at the provider (authentik, Google, any OpenID Connect provider) with the redirect URI `${PUBLIC_URL}/api/auth/callback/<name>`, where `<name>` is `<NAME>` in lower case. For authentik:

```bash
GAMEPANION_OIDC_AUTHENTIK_ISSUER=https://authentik.example.com/application/o/gamepanion/
GAMEPANION_OIDC_AUTHENTIK_CLIENT_ID=...
GAMEPANION_OIDC_AUTHENTIK_CLIENT_SECRET=...
GAMEPANION_OIDC_AUTHENTIK_LABEL=authentik
```

A sign-in through a provider joins an existing player with the same address only when the provider says the address is verified ([ADR 0006](../adr/0006-better-auth-wiring.md)).

When a provider refuses a sign-in, the login page shows its error code, and Gamepanion's log has a line for it.

## The chat in the web app

With `GAMEPANION_ANTHROPIC_API_KEY` set, every page has an **Ask Claude** button, and every card a small one that opens the chat about that card. The chat uses the same tools as Claude over MCP, as the signed-in player, so it sees nothing the player couldn't, and nothing they haven't found ([ADR 0013](../adr/0013-in-app-chat.md)). The conversation stays on the player's device.

To speak into it, run a Whisper server next to Gamepanion and point `GAMEPANION_TRANSCRIBE_URL` at it. The recording goes only there and is never stored. With speaches on the compose network:

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

and `GAMEPANION_TRANSCRIBE_URL=http://whisper:8000` in `.env`. The first transcription downloads the model.

## The operator's pages

`GAMEPANION_IMPRINT_FILE`, `GAMEPANION_PRIVACY_FILE` and `GAMEPANION_TERMS_FILE` name Markdown files of your own: the imprint, privacy policy and terms at `/imprint`, `/privacy` and `/terms`, linked in the footer. Without a setting, or with a file that is missing or larger than 256 KiB, there is no page and no link. A value may hold `{lang}` (`/legal/imprint.{lang}.md`), replaced by the page's language (`en`, `de`) and falling back to English. Files are read on every request, so an edited file shows at once. Gamepanion ships none of the texts. The open-source packages Gamepanion ships are listed with their licenses on the docs site's [Licenses](../reference/licenses.md) page, linked in every instance's footer; `/licenses` forwards there.

## Reporting problems

*Report a problem* in the header (in the menu on a phone) and the `report` MCP tool send players to `/report` when `GAMEPANION_REPORT_ENDPOINT` is set: a form, with no account needed, that the browser posts straight to that endpoint, a form in an inbox such as [noticebox](https://noticebox.github.io/noticebox/). Gamepanion stores nothing of it. The inbox's form takes `kind` (`Bug` or `Idea`), `title`, `text` and an optional `email`, allows posts from your `PUBLIC_URL` (its `origins`) and sends the browser back to `${PUBLIC_URL}/report?sent=1` (its `redirect`). The email is personal data: say in your privacy policy where reports go and how long they are kept. Without the setting there is no page, and both lead to a new issue on Gamepanion's GitHub instead; the page links there too, for players who have an account.

## Payments

Payments are off unless `GAMEPANION_PAYMENT_PROVIDER` is set: then every player has every feature and nothing is limited or sold ([ADR 0023](../adr/0023-a-subscription-one-game-free.md)). It is only for an operator who sells subscriptions: `creem` needs `GAMEPANION_CREEM_API_KEY`, `GAMEPANION_CREEM_PRODUCT_ID`, `GAMEPANION_CREEM_WEBHOOK_SECRET` (and `GAMEPANION_CREEM_YEARLY_PRODUCT_ID` for a yearly plan) and all four operator files (`GAMEPANION_PRICING_FILE` too); `/health` answers 503 and names the missing setting until they are there. `GAMEPANION_FREE_PLAYERS` lists players who are never limited, in the format of `GAMEPANION_SIGNUP_ALLOW`: every game, and the chat and speaking on the instance's key, uncounted. While payments are on, `/pricing` shows the words of `GAMEPANION_PRICING_FILE` and the plans with their prices to anyone, without sign-in, linked in the footer; buying happens on `/subscribe`, behind the sign-in. `fake` (with `GAMEPANION_FAKE_WEBHOOK_SECRET`) tries the flow without charging anyone. The subscription records live in `DATA_DIR/billing.sqlite`.

Where the instance sells, its `GAMEPANION_ANTHROPIC_API_KEY` serves only players on "Subscription + hosted AI" ([ADR 0024](../adr/0024-the-hosted-ai-tier.md)): `GAMEPANION_CREEM_HOSTED_AI_PRODUCT_ID` (and `_YEARLY_PRODUCT_ID`) are its products. Everyone else runs the chat on their own key (`GAMEPANION_KEY_ENCRYPTION_KEY`); without one, the chat says what it needs. A hosted-AI player's use counts per calendar month against `GAMEPANION_AI_MONTHLY_TOKENS` (default 2 000 000) and `GAMEPANION_AI_MONTHLY_MINUTES` of transcription (default 60); `GAMEPANION_AI_PER_MINUTE` (default 6) caps messages a minute and `GAMEPANION_AI_REPLY_TOKENS` (default 4000) a reply's length. Use on a player's own key never counts. Speaking into the chat is for hosted-AI players only there. Without a payment provider none of this applies.

## Data and backups

Back up `DATA_DIR`. `gamepanion.sqlite` is the log (and `billing.sqlite` the subscriptions, where the instance sells); `auth.sqlite` holds accounts, sessions and the connected clients, so a copy of the log alone holds no tokens ([ADR 0004](../adr/0004-sign-in-with-better-auth.md)). Losing `auth.sqlite` signs everyone out and loses who is who: keep both.

SQLite runs in WAL mode: new data sits in `gamepanion.sqlite-wal` for a while. Back up the whole directory, or copy with `sqlite3 gamepanion.sqlite ".backup copy.sqlite"`; the main file alone can be nearly empty.

`GET /health` answers `{"status":"ok"}` while the database answers; the image's `HEALTHCHECK` uses it.
