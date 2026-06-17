# Blackheart Exchange Gateway (`blackheartjs`)

A thin Node.js/Express HTTP + WebSocket pass-through that fronts Binance and Tokocrypto spot APIs for the trading JVM.

> Part of the Blackheart workspace — topology + repo map in C:/Project/CLAUDE.md.

## What it does
- **REST pass-through** (`/api/*`): the trading JVM POSTs an order/asset/earn request with its own per-call `apiKey`/`apiSecret`; the gateway HMAC-signs the upstream query (`src/utils/hmac.js`), forwards to Binance (`src/services/binanceService.js`) or Tokocrypto (`src/services/tokocryptoService.js`), and normalizes errors to a flat `{ error: { code, message, requestId } }`. No service-level auth — credentials ride on each request.
- **Binance Simple-Earn + deposit-history**: fund-moving earn subscribe/redeem are gated by `SIMPLE_EARN_ENABLED`; deposit-history by `FULL_BALANCE_ENABLED` (both default `false`/dormant).
- **Transparent REST proxy** (`/api/v3/*` → `https://api.binance.com`): preserves the path verbatim, mounted *before* the rate limiter. Workaround for home ISPs that DNS-hijack `api.binance.com`. NOTE: arbitrary forwarder — safe only because the container binds loopback on the compose network.
- **WebSocket proxy** (`/stream*`, `/ws/*` → `wss://data-stream.binance.vision`): `src/ws/binanceWsProxy.js`, attached to the HTTP server in `server.js`.
- **Caller:** the trading JVM reaches it at `:8088` via `NODEJS_URL` / `BINANCE_BASE_URL`.

## Tech stack
Plain JavaScript (CommonJS, **not** TypeScript), Node ≥ 20.11. Express 4, `ws`, `axios` + `axios-retry`, `zod` (env + request validation), `helmet`, `cors`, `express-rate-limit`, `pino`/`pino-http` logging. Jest + supertest tests, ESLint 9 (flat config) + Prettier.

## Layout
- `server.js` — entry point: boots `src/app`, attaches WS proxy, handles graceful shutdown.
- `src/app.js` — Express app: middleware, `/api/v3` proxy, rate-limited `/api` routes, 404 + error handler.
- `src/config/env.js` — zod-validated env (process exits on invalid config).
- `src/routes/` — `assetRoutes`, `orderRoutes`, `earnRoutes`, `depositRoutes`, `healthRoutes` (all mounted under `/api`, except health at `/`).
- `src/controllers/` — request → service glue (asset/order/earn/deposit).
- `src/services/` — `binanceService`, `tokocryptoService`, shared `httpClient` (retry + error mapping).
- `src/schemas.js` — zod request schemas (null-tolerant for Java callers).
- `src/middleware/` — `requestId`, `validate`, `errorHandler`.
- `src/ws/binanceWsProxy.js` — client↔upstream WebSocket relay.
- `src/utils/hmac.js`, `src/errors/AppError.js`, `src/logger.js`.

## Build / test / run
- `npm start` — `node server.js`
- `npm run dev` — `node --watch server.js`
- `npm test` — `jest --runInBand` (`npm run test:watch` for watch)
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm run format` — Prettier

## API
OpenAPI 3.0 spec in `openapi.yaml` (Tokocrypto `/api/get-asset`, `/api/place-market-order`, ...; Binance `*-binance` variants; earn + deposit; `/healthz`, `/readyz`). `/server-ip` returns the egress IP for Binance API-key allowlisting.

## Deploy
Docker `gateway` service (image `ghcr.io/<owner>/blackheartjs`) on port **8088**, container `blackheart-js`, run as non-root under `tini`; container healthcheck hits `/healthz`. CI is full: `.github/workflows/ci.yml` runs lint+test → docker build → GHCR push (master only) → SSH deploy to VPS with health-gated auto-rollback (pins `GATEWAY_TAG` in `/home/starsky/blackheart/.env`).

## Gotchas
- **No README** — this file + `openapi.yaml` are the only docs.
- Zod schemas are deliberately **null-tolerant** (`null → undefined`): Java callers emit `{"field":null}` rather than omitting; `strictBoolean` avoids the `Boolean("false") === true` trap.
- `/api/v3/*` is an open forwarder — add a path allowlist before exposing beyond the compose network.
- `httpClient` uses `validateStatus: () => true`; non-2xx upstreams become `UpstreamError` (4xx→400, else 502) via `handleResponse` — always route through it.
- Binance calls sync a cached server-time offset (60s TTL) to satisfy `recvWindow`; the signed query string must be sent verbatim (never let axios re-serialize) or the HMAC mismatches.
