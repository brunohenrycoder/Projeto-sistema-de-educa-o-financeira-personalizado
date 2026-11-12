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
- O sistema deve aplicar bloqueio temporário após tentativas consecutivas de login malsucedidas.
- O usuário removido do grupo familiar não pode autenticar-se.

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
2. O sistema valida as credenciais e a situação da conta.
3. O sistema cria uma sessão autenticada.
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
- [ ] Credenciais incorretas produzem resposta genérica.
- [ ] O sistema aplica bloqueio temporário após repetidas falhas de autenticação.
- [ ] O logout revoga a sessão no servidor.
- [ ] Tokens de sessões revogadas são rejeitados imediatamente.
- [ ] Usuários removidos não conseguem autenticar-se.

## 7. Dependências e observações
- O convite e o primeiro acesso do Dependente são detalhados em `family-management.md`.
- A matriz de permissões por perfil está em `family-management.md` e nos módulos correspondentes.
- A duração do bloqueio e a quantidade exata de tentativas não são fixadas nesta especificação.
