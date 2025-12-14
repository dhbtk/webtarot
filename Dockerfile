# Multi-stage build: frontend (Node/Vite) + backend (Rust/Axum)

# ---------- Frontend build ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install deps first for better layer caching
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

# Build the app (Vite default output: ./dist)
COPY frontend/ .
# Accept and forward build-time env var for Vite
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
RUN npm run build


# ---------- Backend build ----------
FROM rust:1.91 AS backend-builder
WORKDIR /app

COPY Cargo.toml Cargo.toml
COPY shared/ shared/
COPY backend/ backend/
COPY cmdline/ cmdline/
RUN cargo build -p webtarot-backend --release


# ---------- Runtime image ----------
FROM debian AS runtime

# Install minimal runtime deps and create app dir
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app /static

# Copy backend binary (workspace target dir is at /app/target)
COPY --from=backend-builder /app/target/release/webtarot-backend /app/webtarot-backend

# Copy built frontend to /static as requested
COPY --from=frontend-builder /app/frontend/dist/ /static/

ENV RUST_LOG=trace
ENV RUST_ENV=production
EXPOSE 3000

WORKDIR /app
CMD ["/app/webtarot-backend"]
