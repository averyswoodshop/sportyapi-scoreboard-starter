# SportyApi scoreboard starter

A small, sample-first sports scoreboard. Plain JavaScript in the browser, a Node.js server, and an optional Cloudflare Worker entry point. No runtime dependencies or build step.

[Demo](https://sportyapi.com/demo) · [Tutorial](https://sportyapi.com/tutorials/nfl-scoreboard) · [API quickstart](https://sportyapi.com/developers)

## Run locally

Use Node.js 22.9+ (or a newer LTS release).

```sh
git clone https://github.com/averyswoodshop/sportyapi-scoreboard-starter.git
cd sportyapi-scoreboard-starter
git checkout v1.0.0
npm start
```

Open http://localhost:3000. No npm install, API key, signup, or card is needed for sample mode. Sample fixtures are invented examples, not real games or live scores. Select any of the seven feeds; the visual view and JSON update together.

## Optional live mode

1. Create a key at https://sportyapi.com/key.html and activate it through billing. The 14-day trial requires a card, then renews at $9 USD/month unless canceled.
2. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`).
3. Set `SPORTYAPI_MODE=live` and put your own key in `SPORTYAPI_API_KEY` in `.env`.
4. Restart `npm start`. The browser calls your server's `/api/scoreboard?sport=nfl`; only your server sends `X-API-Key` to SportyApi. No automatic polling or automatic retries are used.

Do not commit `.env`, paste your key into `public/`, or expose it in client JavaScript. Your SportyApi key also authorizes billing. This localhost server deliberately does not listen on your network.

The sample client displays dates in the viewer's local timezone. Optional values can be absent; scheduled games use a dash instead of a misleading zero score. Empty and unavailable states are handled.

## Files

- `public/index.html`, `public/app.js`: scoreboard and JSON UI.
- `public/samples/scoreboards.json`: illustrative fixtures for all seven feeds.
- `src/scoreboard.mjs`: sample/live handler, validation, safe errors, bounded cache.
- `server.mjs`: localhost Node server with an explicit public-file allowlist.
- `worker.mjs`, `wrangler.jsonc`: optional Cloudflare deployment.
- `test/scoreboard.test.mjs`: fixture, credential-handling, quota and error tests.

## Limits and errors

Live responses are cached for 60 seconds per server/isolate, with concurrent request deduplication. A 429 honors numeric `Retry-After` and suppresses immediate upstream retries. This cache is not an account-wide budget limit. Separate server processes and Workers locations can each fetch upstream.

SportyApi burst limits apply (120 requests/minute per key and 600/minute per IP, per Cloudflare location). Handle 401/403 by checking the server key; 402 by activating billing; 429 by waiting; 5xx by showing an unavailable state. The server returns friendly errors rather than forwarding upstream bodies or logging secrets.

## Optional Cloudflare deploy

Install the official Wrangler CLI as a development dependency: `npm install --save-dev wrangler`. Sign in with `npx wrangler login`, then run `npm run deploy`. The checked-in configuration deploys **sample mode**. Cloudflare account usage and charges depend on your account plan.

Before making live mode public, add authentication or rate limiting and a request budget appropriate to your app. A public proxy can consume your API allowance even though the key stays hidden. Keep sample mode enabled until those controls are ready.

To enable live mode after protecting the deployment: store your key with `npx wrangler secret put SPORTYAPI_API_KEY`, change `SPORTYAPI_MODE` to `live` in `wrangler.jsonc`, and deploy again. Never put a key into Wrangler vars or source code.

## Test

```sh
npm test
```

Tests use fake credentials and mocked upstream responses. They make no paid API calls.

## License

MIT applies to this starter's code and illustrative fixtures. It does not grant rights to third-party live data, league/team marks, or other upstream materials. SportyApi access and your use of live data remain subject to the applicable service and data terms. This starter is a display example, not a betting or settlement system.

Support: support@sportyapi.com
