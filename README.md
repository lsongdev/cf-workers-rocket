# cf-workers-rocket

> [!CAUTION]
> Cloudflare 可能会封禁代理类服务，使用前请自行评估风险

> [!WARNING]
> This project is in early development and may contain bugs. Use at your own risk.
> 使用本项目可能会消耗大量网络流量，超出 Cloudflare 额度可能会额外收费

A **Trojan + VLESS proxy** running on Cloudflare Workers, with an admin panel for user management.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lsongdev/cf-workers-rocket)

## Features

- **Trojan & VLESS protocol support** over WebSocket
- **Admin dashboard** — create, enable/disable, and delete users via browser
- **KV storage** — persistent user storage with KV edge caching
- **Connection links** — generate client URLs for VLESS, Trojan, Clash, and Shadowrocket
- **UDP DNS proxying** — DNS (port 53) via Cloudflare DNS-over-HTTPS
- **Fallback proxy** — optional `PROXYIP` for retry on connection failure

## Prerequisites

- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/)
- [Cloudflare account](https://dash.cloudflare.com/) with Wrangler authenticated (`wrangler login`)
- A [KV namespace](https://developers.cloudflare.com/kv/) created and bound to the worker (`wrangler kv namespace create KV`, then fill its `id` into `wrangler.jsonc`)

## Quick Start

```bash
pnpm install

cp .dev.vars.example .dev.vars   # edit with your secrets

# Migrations are in `migrations/`. Apply them with:
wrangler d1 migrations apply rocket --local    # local dev
wrangler d1 migrations apply rocket --remote   # production

pnpm run types                   # generate Worker types
pnpm run dev                     # start local dev server
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ACCESS_TOKEN` | Yes | Admin panel login password (also stored in the session cookie) |
| `PROXYIP` | No | Fallback proxy IP for retry on failure |

Set them via `wrangler secret put <NAME>` for production, or in `.dev.vars` for local dev.

## Commands

| Command | Description |
|---|---|
| `pnpm run dev` | Start dev server on `0.0.0.0:8787` |
| `pnpm run start` | Start dev server on `localhost:8787` |
| `pnpm run deploy` | Deploy worker to Cloudflare |
| `pnpm test` | Run storage and authentication regression tests |
| `pnpm run typecheck` | Run TypeScript type checking |
| `pnpm run types` | Generate Worker types from `wrangler.jsonc` |

## Routes

| Route | Description |
|---|---|
| `GET /` | Redirects to admin panel |
| `GET/POST /admin/login` | Admin login |
| `GET /admin/logout` | Logout |
| `GET /admin` | Admin dashboard |
| `POST /admin/users` | Create user |
| `POST /admin/users/:id/toggle` | Enable/disable user |
| `POST /admin/users/:id/delete` | Delete user |
| `GET /trojan` | WebSocket Trojan proxy endpoint |
| `GET /vless` | WebSocket VLESS proxy endpoint |
| `GET /link/vless/:uuid` | VLESS connection URL |
| `GET /link/trojan/:uuid` | Trojan connection URL |
| `GET /link/clash/:uuid` | Clash YAML config |
| `GET /link/shadowrocket/:uuid` | Shadowrocket config |

## Storage

User data is stored in a Workers KV namespace (`KV` binding): each user is a JSON record keyed by `user:<uuid>`. The secondary `user:hash:<sha224>` key stores only the UUID; Trojan resolves this pointer and checks the canonical user record, just like VLESS. The admin panel paginates KV keys and sorts records by creation time, without a shared mutable index.

When upgrading from D1, back up and copy existing users into KV before deployment. Preserve UUIDs, names, enabled flags, and timestamps, set each record’s `id` to its UUID, and create hash pointers using SHA-224 of the UUID. Switching the binding alone does not migrate data.

[KV is eventually consistent](https://developers.cloudflare.com/kv/concepts/how-kv-works/): creation, status changes, and deletion may take 60 seconds or longer to propagate, including in the admin list. There is no additional application cache. Avoid simultaneous edits to the same user; KV has no transactions and limits writes to the same key to one per second. Disabling a user affects new connections after propagation; existing proxy connections remain open. Use a strongly consistent store if immediate revocation or concurrent administration is required.

## Architecture

The worker uses the [Hono](https://hono.dev/) framework. Admin authentication stores `ACCESS_TOKEN` directly in an `HttpOnly` cookie (4-hour TTL) and compares it on each request. Proxy handlers authenticate users against KV and pipe TCP traffic bidirectionally over WebSocket. Each new proxy connection reads KV; both protocols use the canonical user status.

# License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
