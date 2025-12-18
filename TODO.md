- campo de contexto para interpretar (ter pergunta, contexto, opção para enviar ou não contexto para interpretar)
- "esqueci minha senha"
- trocar senha meu deus
- Tiragem do dia por email pela manhã?
- adicionar campo no banco para timestamp da interpretação
- calcular média de tempo de resposta do OpenAI
- sistema de toasts para notificações
- websocket sempre conectado; notificar de interpretações prontas
- PWA
- opções para as stats: filtrar somente suas tiragens, tiragens do usuário ou não, datas?

## Itens para produção (backend, frontend e infraestrutura)

### Backend (Rust/Axum)

- [ ] Fluxo completo de recuperação de senha (link com token de uso único, expiração e invalidation)
- [ ] Políticas de senha (mínimo, entropia) e proteção contra brute-force (rate limit por IP/usuário)
- [ ] Rate limiting e proteção contra abuso (axum middleware + Redis)
- [ ] Validação de entrada rigorosa (tamanho máximo, listas permitidas) e normalização de locale/idioma
- [ ] Timeouts, retries e circuit breaker nas chamadas ao OpenAI; observabilidade dos custos e latência
- [ ] Healthcheck/readycheck endpoints (liveness/readiness) para orquestradores
- [ ] Encerramento gracioso (graceful shutdown) e drenagem de conexões
- [ ] Paginação/limites em endpoints de histórico para evitar respostas muito grandes

### Frontend (Vite/React)

- [ ] Tratamento de erros global (ErrorBoundary) e feedback ao usuário
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

- [ ] Scanner de dependências (SAST/Dependabot) e política de atualização
- [ ] Política de privacidade, Termos de Uso e banner de consentimento de cookies/analytics
- [ ] Registro e atendimento de pedidos de exclusão/exportação de dados (LGPD/GDPR)

### Infra/DevOps

- [ ] Cache de respostas estáticas (frontend) e CDN

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
