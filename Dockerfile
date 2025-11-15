# Multi-stage build: frontend (Node/Vite) + backend (Rust/Axum)

# ---------- Frontend build ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install deps first for better layer caching
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

# Build the app (Vite default output: ./dist)
COPY frontend/ .
RUN npm run build


# ---------- Backend build ----------
FROM rust:1.91 AS backend-builder
WORKDIR /app

# Pre-copy manifests to leverage cargo caching (path dep: shared)
COPY shared/Cargo.toml shared/Cargo.toml
COPY backend/Cargo.toml backend/Cargo.toml

# Create minimal dummy sources to warm up dependency cache
RUN mkdir -p shared/src backend/src \
    && echo "pub fn dummy() {}" > shared/src/lib.rs \
    && echo "fn main() { println!(\"dummy\"); }" > backend/src/main.rs \
    && cd backend && cargo build -p webtarot-backend --release || true

# Now copy the real sources and build release binary
COPY shared/ shared/
COPY backend/ backend/
RUN cd backend && cargo build -p webtarot-backend --release


# ---------- Runtime image ----------
FROM debian:bookworm-slim AS runtime

# Install minimal runtime deps and create app dir
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app /static

# Copy backend binary
COPY --from=backend-builder /app/backend/target/release/webtarot-backend /app/webtarot-backend

# Copy built frontend to /static as requested
COPY --from=frontend-builder /app/frontend/dist/ /static/

ENV RUST_LOG=trace
EXPOSE 3000

WORKDIR /app
CMD ["/app/webtarot-backend"]
