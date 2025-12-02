- [ ] Botão de compartilhar na tiragem
- [ ] campo de contexto para interpretar (ter pergunta, contexto, opção para enviar ou não contexto para interpretar)
- [ ] "esqueci minha senha"
- [ ] Tiragem do dia por email pela manhã?
 
## Itens para produção (backend, frontend e infraestrutura)

### Backend (Rust/Axum)
- [ ] Autenticação/JWT sólida: expiração/refresh token, revogação, rotação de chaves (JWKS) e storage seguro de secrets
- [ ] Fluxo completo de recuperação de senha (link com token de uso único, expiração e invalidation)
- [ ] Políticas de senha (mínimo, entropia) e proteção contra brute-force (rate limit por IP/usuário)
- [ ] Rate limiting e proteção contra abuso (axum middleware + Redis)
- [ ] CORS e headers de segurança (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] Validação de entrada rigorosa (tamanho máximo, listas permitidas) e normalização de locale/idioma
- [ ] Timeouts, retries e circuit breaker nas chamadas ao OpenAI; observabilidade dos custos e latência
- [ ] Sanitização/escapes em qualquer conteúdo retornado que venha de LLM (evitar prompt injection refletido)
- [ ] Logging estruturado com `tracing`: request-id, usuário, latência, códigos de status
- [ ] Healthcheck/readycheck endpoints (liveness/readiness) para orquestradores
- [ ] Encerramento gracioso (graceful shutdown) e drenagem de conexões
- [ ] Tratamento robusto de WebSocket: ping/pong, timeouts, backpressure, autenticação e escopo por usuário
- [ ] Gestão de filas/tarefas assíncronas (envio de email, jobs de resumo diário) com retries e DLQ
- [ ] Migrações do Diesel: estratégia de versionamento/rollback e verificação automática em startup
- [ ] Backups e restauração do banco (cron + testes de restauração)
- [ ] Política de retenção/expurgo de dados de interpretações e logs (LGPD/GDPR)
- [ ] Internacionalização: persistir/propagar locale do usuário; mensagens no backend cobrem pt/en
- [ ] Paginação/limites em endpoints de histórico para evitar respostas muito grandes

### Frontend (Vite/React)
- [ ] Tratamento de erros global (ErrorBoundary) e feedback ao usuário
- [ ] Armazenamento seguro de token (evitar XSS; considerar cookies httpOnly + CSRF se for sessão)
- [ ] Integração com Sentry (ou similar) para erros de frontend e performance
- [ ] Acessibilidade (a11y): navegação por teclado, contrastes, labels, aria-* nas cartas/componentes
- [ ] Internacionalização completa (pt/en) inclusive textos dinâmicos; seleção/lembrança de idioma
- [ ] SEO básico: metatags, título/descrição por rota, OpenGraph para compartilhar tiragens
- [ ] Botão de compartilhar (já listado) com imagem/preview da tiragem e link canônico
- [ ] PWA opcional: manifest, ícones, service worker (se fizer sentido para offline/instalação)
- [ ] Limites de tamanho do bundle, code splitting e prefetch de rotas críticas
- [ ] Tratamento de reconexão de WebSocket e indicadores de status em tempo real

### Emails e Notificações
- [ ] Provedor de email transacional (SES, Mailgun, Postmark) com domínio verificado e DKIM/SPF/DMARC
- [ ] Templates de email (pt/en) para recuperação de senha e "tiragem do dia" (opt-in explícito)
- [ ] Preferências de notificação por usuário e fácil opt-out

### Segurança e Compliance
- [ ] Gestão de segredos (OPENAI_KEY, DB, SMTP) via variáveis seguras (Docker/Secrets/Vault) – nunca em repo
- [ ] Política de CORS restritiva em produção e CSP adequada ao frontend
- [ ] Scanner de dependências (SAST/Dependabot) e política de atualização
- [ ] Política de privacidade, Termos de Uso e banner de consentimento de cookies/analytics
- [ ] Registro e atendimento de pedidos de exclusão/exportação de dados (LGPD/GDPR)

### Observabilidade e Operação
- [ ] Dashboards (logs, métricas, traces) – por exemplo, Grafana/Prometheus/Loki + OpenTelemetry
- [ ] Alertas (latência, taxa de erro, tempo de resposta OpenAI, uso de tokens, filas)
- [ ] Uptime checks externos e verificação do fluxo crítico (login → criar tiragem → interpretar)
- [ ] Tracing distribuído entre frontend (web-vitals) e backend

### Infra/DevOps
- [ ] Docker multi-stage já existe: adicionar liveness/readiness no compose/orquestrador
- [ ] Pipeline CI/CD: build, testes (unit/integração/E2E), scan de segurança, criação de imagem e deploy
- [ ] Migrações automáticas em deploy com rollback seguro
- [ ] Estratégia de versionamento e release notes; feature flags para lançamentos graduais
- [ ] Configurar reverse proxy (NGINX/Fly/Traefik) com TLS (Let's Encrypt) e HSTS
- [ ] Cache de respostas estáticas (frontend) e CDN
- [ ] Estratégia de escalabilidade (autoscaling por CPU/RAM/latência) e limites de recursos

### Qualidade e Testes
- [ ] Testes unitários backend (handlers, repos, validação) e mocks para OpenAI
- [ ] Testes de integração (rotas principais, auth, WebSocket)
- [ ] Testes E2E (Playwright/Cypress) cobrindo fluxos: signup/login, criação de tiragem, interpretação, histórico
- [ ] Testes de carga/sob-stress para endpoints de interpretação e WebSocket
- [ ] Linters/formatadores (Rustfmt/Clippy, ESLint/Prettier) e verificação em CI

### Produto/UX
- [ ] Onboarding e dicas de uso das tiragens; estados vazios
- [ ] Tela de perfil com gerenciamento completo (idioma, email, senha, preferências)
- [ ] Exportação de histórico (CSV/JSON) com limites
- [ ] Feedback de custo/tempo quando interpretação estiver em processamento

### Documentação
- [ ] Documentar variáveis de ambiente e exemplos (produção vs dev)
- [ ] Runbooks de incidentes (como investigar erros do OpenAI, esgotamento de cota, timeouts)
- [ ] Política de backup/restore, retenção de dados e cron jobs
- [ ] README de deploy (Docker, Fly, etc.) e matriz de suporte de navegadores
