# SPEC — Autenticação e Controle de Acesso (AUTH)

## 1. Objetivo
Definir os mecanismos de cadastro, autenticação, encerramento de sessão e validação de acesso dos usuários do Aurora.

## 2. Atores
- **Principal:** usuário responsável pela criação e administração do grupo familiar.
- **Dependente:** usuário convidado pelo Principal para participar do grupo familiar.

## 3. Requisitos funcionais
### AUTH-01 — Cadastro do Principal
- O sistema deve permitir que uma pessoa se cadastre como Principal.
- O cadastro deve criar um grupo familiar associado ao Principal.
- O e-mail deve ser único entre os usuários e precisa ser confirmado.
- A senha deve possuir no mínimo 8 caracteres.
- A senha deve ser armazenada somente em formato de hash seguro; nunca em texto puro.

### AUTH-02 — Login
- O sistema deve autenticar o usuário por e-mail e senha.
- Credenciais inválidas devem gerar uma mensagem genérica, sem informar se o e-mail existe.
- Após 5 tentativas consecutivas incorretas para o mesmo e-mail, o sistema deve bloquear novas tentativas por 15 minutos, mesmo que a senha correta seja informada.
- O sistema deve registrar as falhas e o momento da última falha. Após o bloqueio, a contagem recomeça; um login bem-sucedido zera a contagem.
- Tentativas simultâneas devem ser serializadas para impedir que ultrapassem o limite.
- Durante o bloqueio, informar quando será possível tentar novamente, sem revelar se o e-mail está cadastrado. Credenciais inválidas fora do bloqueio continuam usando mensagem genérica.
- O usuário removido do grupo familiar não pode autenticar-se.
- Usuários inativos ou com e-mail não confirmado não podem autenticar-se.

### AUTH-03 — Logout
- O sistema deve permitir que o usuário encerre sua sessão.
- A sessão encerrada deve deixar de ser aceita pela API.

### AUTH-04 — Validação de sessão
- As rotas protegidas devem validar a identidade, a sessão e o perfil do usuário.
- Tokens associados a sessões encerradas ou revogadas devem ser rejeitados imediatamente pelo servidor, mesmo que ainda não tenham expirado.
- A autorização deve ser verificada no backend em todas as requisições protegidas.

## 4. Regras de negócio
- **RN-AUTH-01:** cada usuário deve possuir um e-mail único.
- **RN-AUTH-02:** a senha deve ter pelo menos 8 caracteres.
- **RN-AUTH-03:** senhas nunca podem ser armazenadas em texto puro.
- **RN-AUTH-04:** respostas de autenticação inválida não devem revelar se o e-mail está cadastrado.
- **RN-AUTH-05:** a remoção de um membro deve impedir novos acessos e invalidar suas sessões ativas.
- **RN-AUTH-06:** o perfil e o grupo familiar do usuário devem ser considerados na autorização de cada requisição.
- **RN-AUTH-07:** cinco falhas consecutivas bloqueiam o identificador por 15 minutos; login bem-sucedido zera a contagem.
- **RN-AUTH-08:** logout revoga no servidor a sessão identificada pelo token, impedindo sua reutilização imediata.

## 5. Fluxos principais
### Cadastro do Principal
1. A pessoa informa os dados solicitados pelo formulário de cadastro.
2. O sistema valida os dados e a unicidade do e-mail.
3. O sistema armazena a senha em formato de hash.
4. O sistema cria o usuário com perfil Principal e seu grupo familiar.
5. O sistema envia um link individual de confirmação, com uso único e validade limitada.
6. O Principal acessa o link e o backend confirma o e-mail.
7. A conta só pode ser utilizada após a confirmação do e-mail.

O link usa um fragmento (`#token=...`) para não enviar o token em requisições HTTP nem em cabeçalhos de referência. A interface que receber esse link deve enviar o token no corpo de um `POST /api/auth/confirm-email`; o backend não registra nem devolve o token.

### Login
1. O usuário informa e-mail e senha.
2. O sistema valida as credenciais, a situação da conta e o estado do bloqueio.
3. Após autenticação válida, o sistema zera as falhas e cria uma sessão persistida no servidor.
4. O usuário passa a acessar somente as funcionalidades autorizadas para seu perfil.

### Logout
1. O usuário solicita sair.
2. O servidor encerra/revoga a sessão.
3. Requisições posteriores com o token daquela sessão devem ser recusadas.

## 6. Critérios de aceitação
- [ ] Um Principal consegue criar uma conta e seu grupo familiar.
- [ ] O cadastro envia um link de confirmação sem expor o token na resposta da API.
- [ ] Um link válido confirma o e-mail; links inválidos, expirados ou reutilizados são recusados.
- [ ] A conta do Principal permanece pendente de confirmação até a validação do link.
- [ ] O sistema impede o cadastro de e-mail já utilizado.
- [ ] Senhas possuem no mínimo 8 caracteres e são armazenadas com hash.
- [ ] Principal e Dependente ativos, com e-mail confirmado, conseguem autenticar-se.
- [ ] E-mail desconhecido e senha incorreta produzem a mesma resposta genérica.
- [ ] A quinta falha consecutiva bloqueia o identificador por 15 minutos; tentativas durante o bloqueio não alteram nem contornam o bloqueio.
- [ ] Após 15 minutos, novas tentativas são permitidas; login bem-sucedido zera o contador.
- [ ] Tentativas simultâneas não ultrapassam o limite de falhas.
- [ ] Usuários sem e-mail confirmado, removidos ou inativos não conseguem autenticar-se.
- [ ] O logout revoga a sessão no servidor.
- [ ] Tokens de sessões revogadas são rejeitados imediatamente.
- [ ] Usuários removidos não conseguem autenticar-se.

## 7. Dependências e observações
- O convite e o primeiro acesso do Dependente são detalhados em `family-management.md`.
- A matriz de permissões por perfil está em `family-management.md` e nos módulos correspondentes.
- A política de bloqueio é de cinco falhas consecutivas por e-mail, com duração de 15 minutos.
- O bloqueio por e-mail aplica-se mesmo quando as tentativas vêm de IPs diferentes. Isso não limita password spraying distribuído entre e-mails diferentes; um limite adicional por IP ou global requer uma política própria e não faz parte deste requisito.

## 8. Endpoints da API e contratos para o frontend

Os endpoints aceitam os prefixos `/api/auth` e `/auth`:

- `POST /api/auth/register` — Cadastra o usuário Principal e cria automaticamente seu grupo familiar.
  - **Payload:**
    ```json
    {
      "name": "Maria Silva",
      "email": "maria@example.com",
      "password": "SenhaSegura123",
      "passwordConfirmation": "SenhaSegura123"
    }
    ```
  - **Validações:** `name` mínimo 3 caracteres; `email` válido e único; `password` mínimo 8 caracteres; `passwordConfirmation` idêntica à senha.
  - **Resposta (201 Created):**
    ```json
    {
      "userId": "uuid...",
      "familyGroupId": "uuid...",
      "name": "Maria Silva",
      "email": "maria@example.com",
      "role": "PRINCIPAL",
      "status": "ATIVO",
      "createdAt": "2026-11-18T10:00:00"
    }
    ```
  - **Disparo de e-mail de confirmação:** O backend gera um token criptográfico (armazenado em hash no banco com validade de 24 horas) e envia por e-mail um link no formato `<email-confirmation-url>#token=<rawToken>`. O token bruto **nunca** é retornado no corpo da resposta HTTP por segurança.
  - **Erros específicos do cadastro:**
    - `409 Conflict` — e-mail já cadastrado ou violação de integridade. Campo `erro`: `Conflito de dados` (e-mail duplicado) ou `Conflito de integridade` (violação de integridade). Mensagens possíveis: `Já existe um usuário cadastrado com este e-mail.` (e-mail duplicado) ou `Já existe um registro com os dados informados.` (violação de integridade).
    - `503 Service Unavailable` — falha no envio do e-mail de confirmação. Campo `erro`: `Serviço de e-mail indisponível`. Mensagem: `Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde.`

- `POST /api/auth/confirm-email` — Confirmação do e-mail a partir do link recebido.
  - **Fluxo no frontend:** A página de confirmação no React lê o fragmento `#token=<rawToken>` da URL e dispara:
  - **Payload:**
    ```json
    {
      "token": "raw-token-extraido-da-url"
    }
    ```
  - **Resposta (204 No Content):** E-mail confirmado com sucesso. A conta fica apta para efetuar login.
  - Links inválidos, expirados (>24h) ou já utilizados retornam HTTP 400.

- `POST /api/auth/login` — Autenticação de usuários (Principal e Dependente).
  - **Payload:** `{"email": "...", "password": "..."}`.
  - **Resposta (200 OK):**
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "tokenType": "Bearer",
      "expiresIn": 86400,
      "userId": "uuid...",
      "familyGroupId": "uuid...",
      "name": "Maria Silva",
      "email": "maria@example.com",
      "role": "PRINCIPAL"
    }
    ```
    - `expiresIn` é o tempo de validade do token em segundos.
  - **Falha de autenticação:** credenciais inválidas, usuário inativo, removido ou com e-mail não confirmado retornam HTTP 401 com mensagem genérica (`E-mail ou senha inválidos.`), sem informar se o e-mail está cadastrado.
  - **Bloqueio por tentativas inválidas:** Na 5ª tentativa incorreta consecutiva para o mesmo e-mail, o identificador é bloqueado por 15 minutos e a API retorna HTTP 429 indicando o bloqueio temporal e informando quando será possível tentar novamente.

- `POST /api/auth/logout` — Encerramento de sessão e revogação do token.
  - **Header:** `Authorization: Bearer <jwt>`.
  - **Resposta (204 No Content):** Revoga o token da sessão no servidor (blacklist/controle de sessão), impedindo sua reutilização mesmo antes da expiração natural do JWT.
