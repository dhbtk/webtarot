# webtarot

Modern Tarot reading web app with a Rust backend (Axum + Diesel + Redis + Postgres) and a React + Vite TypeScript
frontend. Production images are built multi‑stage (Node for frontend build, Rust for backend) and run as a single
container that serves both API and static SPA.

Note: Useful existing sections from the former README were preserved and updated. Unknowns are explicitly marked as
TODO.

---

## Overview

- Backend: Rust 2024, Axum HTTP server, Diesel (Postgres), Redis, i18n (rust‑i18n), Prometheus metrics, optional Sentry
- Frontend: React 19, Vite 7, TypeScript 5, TanStack Router/Query, Styled Components, i18next
- Runtime: Backend listens on port 3000 and also serves the built SPA from `/static`
- Orchestration: Dockerfile (multi‑stage) and docker‑compose (includes Redis, Postgres, and optional Elastic Stack for
  logs)

Key API routes (see `backend/src/app.rs` and `backend/README.md` for details):

- `POST /api/v1/reading`
- `GET /api/v1/interpretation/{id}` and history/notify helpers
- `POST /api/v1/interpretation` and `DELETE /api/v1/interpretation/{id}`
- `GET /api/v1/stats`, user endpoints, and `GET /metrics` (Prometheus)

---

## Requirements

- Rust toolchain (recommended via rustup)
- Node.js 20.x (recommended via nvm)
- Postgres 15+ (or docker‑compose service)
- Redis 7+ (or docker‑compose service)
- Docker (optional, for containerized workflow)

Install Rust (macOS/Linux):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

Install Node via nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --lts
node -v
npm -v
```

---

## Environment variables

Required for the backend (validated on startup in `backend/src/state.rs`):

- `OPENAI_KEY` — OpenAI API key used by the interpretation pipeline
- `DATABASE_URL` — Postgres connection string (e.g. `postgres://postgres:postgres@localhost:5432/webtarot`)
- `REDIS_URL` — Redis connection string (e.g. `redis://localhost:6379/0`)

Optional:

- `GOOG_API_KEY` — optional Google API key (currently unused in dev flows)
- `SENTRY_DSN` — enable Sentry (backend logs + tracing integration)
- `RUST_ENV` — `development` (default) or `production`
- `RUST_LOG` — e.g. `info,webtarot=debug`

Testing/dev helpers:

- `OPENAI_BASE_URL` — override OpenAI base url in tests
- `TEST_DATABASE_URL`, `TEST_REDIS_URL` — test‑only overrides

docker‑compose (if used) will inject `DATABASE_URL`, `REDIS_URL`, and pass through `OPENAI_KEY`, `SENTRY_DSN`,
`GOOG_API_KEY`, and build arg `VITE_SENTRY_DSN` for the frontend.

Elastic Stack (optional in docker‑compose):

- `ELASTIC_PASSWORD`, `KIBANA_SERVICE_ACCOUNT_TOKEN` — required to enable secured Elastic/Kibana

---

## Running in development

Backend (port 3000):

```bash
export OPENAI_KEY=... 
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/webtarot
export REDIS_URL=redis://localhost:6379/0
cd backend
cargo run
```

Notes:

- Migrations are embedded and applied automatically on startup (see `backend/src/database.rs`).
- Prometheus metrics are at `http://localhost:3000/metrics`.

Frontend (Vite dev server, typically on 5173):

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

---

## Docker / docker‑compose

Build a local image:

```bash
docker build -t webtarot:latest .
```

Run with docker‑compose (Redis + Postgres + optional Elastic Stack):

```bash
export OPENAI_KEY="your_openai_key"
docker compose up --build
```

Services and ports:

- App/API: http://localhost:3000
- Redis: redis://localhost:6379 (volume `redis-data`)
- Postgres: localhost:5432 (DB `webtarot`, user `postgres`, pass `postgres`, volume `postgres-data`)
- ElasticSearch: http://localhost:9200 (if enabled)
- Kibana: http://localhost:5601 (if enabled)

---

## Scripts

Root helper:

- `./lint.sh` — runs `cargo clippy` (auto‑fix) + `cargo fmt`, then frontend `prettier` and `eslint`

Frontend (`frontend/package.json`):

- `npm run dev` — start Vite dev server
- `npm run build` — type‑check and build SPA to `frontend/dist`
- `npm run preview` — preview built SPA
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier

Backend:

- `cargo run -p webtarot-backend` — run the API server
- `cargo test -p webtarot-backend` — run backend tests

---

## Tests

- Backend: `cargo test -p webtarot-backend` (uses test helpers and can override `OPENAI_BASE_URL`, `TEST_DATABASE_URL`,
  `TEST_REDIS_URL`).
- Frontend: No test runner configured in `frontend/package.json`. TODO: decide on and add a test setup (e.g., Vitest +
  React Testing Library).

---

## Internationalization (i18n)

The backend uses `rust-i18n` with YAML locale files under `backend/locales`. Supported locales: `pt` (default) and `en`.
Locale resolution order: `X-Locale` header, `Accept-Language`, fallback to `pt`.

---

## Project structure

```
webtarot/
├─ backend/            # Rust Axum API, Diesel models/migrations, i18n, metrics
│  ├─ migrations/      # Embedded Diesel migrations run on startup
│  ├─ src/
│  │  ├─ app.rs        # Routes, static SPA serving, metrics
│  │  ├─ main.rs       # Binds to 0.0.0.0:3000
│  │  └─ ...
│  └─ README.md        # API and i18n notes
├─ frontend/           # React + Vite + TS SPA
│  ├─ src/
│  └─ README.md        # Notes about routes/queries (brief)
├─ shared/             # Shared Rust crate
├─ cmdline/            # CLI crate (details TBD)
├─ Dockerfile          # Multi‑stage build (frontend + backend)
├─ docker-compose.yml  # App + Redis + Postgres (+ Elastic Stack)
├─ fly.toml            # Fly.io deployment (internal_port 3000)
├─ lint.sh             # Formatting/lint helper
├─ Cargo.toml          # Workspace
└─ README.md           # This file
```

---

## License

No license file is present in the repository. TODO: add a LICENSE (e.g., MIT/Apache‑2.0) or clarify licensing.

---

## Tips

Update Rust toolchains:

```bash
rustup update
```

Check versions quickly:

```bash
rustc --version && cargo --version && node -v && npm -v
```
