# Aurora — Frontend

Frontend do Aurora em **React + Vite**, organizado por funcionalidades conforme `.agents/rules/RULES.md` e `docs/adr/ADR.md`.

> **Estado atual:** Ciclo 1 — RF-001 (cadastro e confirmação de e-mail) e RF-002 (login, sessão e logout) implementados nas seis etapas: rotas/estrutura, serviços de API, cadastro, confirmação, login e logout. A fidelidade visual aos protótipos desktop e mobile ainda não foi verificada; não há dashboard nem funcionalidade financeira neste ciclo.

## Ciclo 1 — Entregas

- **Etapa 1:** rotas `/register`, `/login`, `/confirm-email` e `/` protegida provisória.
- **Etapa 2:** serviços centralizados em `src/features/*/api`, usando o cliente HTTP compartilhado.
- **Etapa 3:** cadastro do Principal (`RegisterPage`), sem login automático.
- **Etapa 4:** confirmação por fragmento `#token=` (`ConfirmEmailPage`), com orientação para entrar na conta e mensagem aprovada para link inválido/expirado.
- **Etapa 5:** login (`LoginPage`) com sessão via `AuthContext`, 401 genérico e 429 sem encerrar sessão.
- **Etapa 6:** logout integrado ao `AuthContext` com revogação no servidor; `LogoutButton` existe como estrutura mínima, sem ponto de acionamento na interface.

## Stack

- React 19 + Vite 8
- React Router
- ESLint 10
- Vitest + React Testing Library + jsdom
- JavaScript/JSX (sem TypeScript)

## Scripts

```bash
npm run dev        # servidor de desenvolvimento (porta 5173)
npm run build      # build de produção
npm run preview    # preview do build
npm run lint       # ESLint
npm test           # Vitest (execução única)
npm run test:watch # Vitest em modo watch
```

## Configuração de ambiente

Copie `.env.example` para `.env.local` e ajuste, se necessário:

```env
VITE_API_BASE_URL=http://localhost:8080
```

O cliente HTTP usa sempre o prefixo `/api`. O backend já libera `http://localhost:5173` via CORS.

## Estrutura

```text
src/
├── features/      # funcionalidades (Ciclo 1)
├── shared/
│   ├── api/       # cliente fetch centralizado e erros padronizados
│   ├── auth/      # sessão em sessionStorage e AuthContext
│   ├── format/    # formatação de moeda e datas
│   └── ...        # componentes comuns
├── routes/        # rotas e proteção por perfil
├── styles/        # tokens estruturais e estilos base (mobile-first)
└── test/          # setup do Vitest
```

Assets e CSS do template Vite permanecem no repositório, mas não são mais utilizados pela aplicação.

## Contrato de autenticação

O backend expõe `/api/auth/register`, `/api/auth/confirm-email`, `/api/auth/login` e `/api/auth/logout`. O login retorna uma resposta achatada com `accessToken`, `tokenType`, `expiresIn`, `userId`, `familyGroupId`, `name`, `email` e `role`.

Regras de tratamento já implementadas na fundação:

- `401` fora de `/login`: limpa a sessão e redireciona para `/login` com `replace`;
- `429`: exibe as mensagens retornadas, sem encerrar a sessão;
- todas as mensagens do array `mensagens` são preservadas;
- `expiresIn` é respeitado; não há renovação de token;
- a expiração é detectada por timer e ao retornar para a aba visível.

### Cliente HTTP e token

O cliente em `src/shared/api/client.js` usa `fetch` de forma centralizada, aplica o prefixo `/api`, trata `204` (sem corpo) e converte erros em `ApiError` com `status`, `erro`, `mensagens` e `caminho`.

O token é injetado automaticamente: `AuthProvider` registra um provedor em `setTokenProvider`, que lê a sessão atual. As features não precisam repassar o token manualmente. Quando necessário, é possível sobrescrever a chamada com a opção `token` de `request()`:

```js
await request('/financial-overview', { token: 'token-explicito' })
```

## Observações visuais

Os tokens atuais são apenas estruturais (espaçamento, radius, tipografia, breakpoints). Cores e demais tokens de marca serão definidos somente após inspeção autorizada dos protótipos oficiais; este ciclo não declara fidelidade visual.
