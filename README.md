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

---

## Rodar o backend (desenvolvimento)

1. Defina `OPENAI_KEY` no seu terminal (ver acima).
2. Execute:
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

Opcional: rodar com docker-compose (inclui Redis e expõe porta 3000):

```bash
export OPENAI_KEY="sua_chave_aqui"
docker compose up --build
```

- App: `http://localhost:3000`
- A variável `REDIS_URL` é injetada pelo `docker-compose.yml` para o container do app.

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
