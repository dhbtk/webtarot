# webtarot

## Preparando o ambiente (macOS e Linux)

### 1) Instalar Rust

Recomendado usar o `rustup`.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Após instalar, reinicie o terminal ou rode:
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

### 2) Instalar Node.js

Recomendado usar o `nvm` (Node Version Manager).

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Carregar nvm no shell atual (ajuste conforme seu shell)
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Instalar Node LTS (ou 20.x)
nvm install --lts
node -v
npm -v
```

---

## Variáveis de ambiente

- `OPENAI_KEY` (obrigatória para o backend se comunicar com o ChatGPT):
  ```bash
  export OPENAI_KEY="sua_chave_aqui"
  ```
- `REDIS_URL` (opcional em dev; no docker-compose já é definido para o serviço):
  ```bash
  export REDIS_URL="redis://localhost:6379/0"
  ```
- `DATABASE_URL` (obrigatória — Postgres):
  - Formato: `postgres://USUARIO:SENHA@HOST:PORTA/NOME_DB`
  - Exemplo local: `postgres://postgres:postgres@localhost:5432/webtarot`
  - No `docker-compose` já é injetada para o container do app.
  ```bash
  export DATABASE_URL="postgres://postgres:postgres@localhost:5432/webtarot"
  ```

---

## Rodar o backend (desenvolvimento)

1. Defina `OPENAI_KEY` no seu terminal (ver acima).
2. Garanta um Postgres disponível e a variável `DATABASE_URL` configurada (ver acima). Você pode usar um Postgres local ou subir via Docker (ver seção docker-compose).
3. Execute:
   ```bash
   cd backend
   cargo run
   ```

Por padrão, o backend expõe a porta `3000`.

---

## Rodar o frontend (desenvolvimento)

1. Instale dependências e rode o Vite dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Acesse a URL mostrada no terminal (geralmente `http://localhost:5173`).

---

## Construir a imagem Docker

Apenas construir a imagem localmente:

```bash
docker build -t webtarot:latest .
```

Rodar com docker-compose (inclui Redis e Postgres; expõe portas 3000 e 5432):
```bash
export OPENAI_KEY="sua_chave_aqui"
docker compose up --build
```

- App: `http://localhost:3000`
- Redis: `redis://localhost:6379` (volume `redis-data` persistente)
- Postgres: porta `5432` exposta; DB padrão `webtarot`, user `postgres`, senha `postgres` (volume `postgres-data` persistente)
- As variáveis `REDIS_URL` e `DATABASE_URL` são injetadas pelo `docker-compose.yml` para o container do app.

Se preferir usar um Postgres local fora do compose, ajuste `DATABASE_URL` de acordo e não suba o serviço `postgres`.

---

## Dicas

- Atualizar toolchains do Rust:
  ```bash
  rustup update
  ```
- Conferir versões rapidamente:
  ```bash
  rustc --version && cargo --version && node -v && npm -v
  ```
