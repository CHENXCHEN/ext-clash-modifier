# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is a **Cloudflare Worker** application (`ext-clash-modifier`) that acts as an external config modifier/proxy for Clash. It rewrites upstream Clash YAML subscription configs with custom proxy-group rules.

- **Runtime**: Cloudflare Workers (local dev via Miniflare/Wrangler)
- **Node version**: v16.19.0 (see `.nvmrc`)
- **Package manager**: npm (no lockfile committed)
- **Source files**: `src/index.js`, `src/template.js`

### Running the dev server

```bash
source ~/.nvm/nvm.sh && nvm use 16.19.0
npm run start -- --local --port 8787
```

The `--local` flag is **required** in Cloud Agent environments (no Cloudflare login). Without it, wrangler will error with "You must be logged in to use wrangler dev in remote mode."

### Testing

There are no automated tests or linting configured in this project. Verify behavior by:

1. Starting the dev server (see above)
2. Serving a test Clash YAML on a local HTTP server
3. Base64-encoding the test URL and hitting `GET /m/<base64-url>`

The root URL `/` and any invalid path return `error: invalid parameter` — this is expected behavior.

### Key gotcha

- Wrangler v2.12.3 on Node 16 emits deprecation warnings. These are harmless.
- The `wrangler dev` process may exit shortly after printing "Listening on ..." in the terminal log, but the Miniflare child process keeps running and accepting connections. Check with `curl http://127.0.0.1:8787/`.
