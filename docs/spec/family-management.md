# SPEC — Gerenciamento Familiar (FAMILY MANAGEMENT)

## 1. Objetivo

Especificar a criação e administração do grupo familiar, o convite de Dependentes e o isolamento de dados entre seus integrantes.

## 2. Atores

- **Principal:** administra o grupo familiar e possui acesso às funcionalidades administrativas.
- **Dependente:** participa do grupo e pode registrar e administrar somente as próprias despesas.

## 3. Requisitos funcionais

### FAM-01 — Grupo familiar

- O grupo familiar deve ser criado automaticamente no cadastro do Principal.
- Cada usuário deve estar associado ao grupo familiar correspondente.

### FAM-02 — Convite de Dependente

- Somente o Principal pode convidar novos membros.
- O convite deve ser enviado ao e-mail informado.
- O Dependente deve acessar um link individual de convite e definir sua própria senha no primeiro acesso.
- O convite deve ser de uso único.
- O sistema deve validar o convite antes de permitir a criação da conta e a entrada no grupo.

### FAM-03 — Administração de membros

- O Principal pode consultar e alterar os dados permitidos dos membros.
- Somente o Principal pode adicionar ou remover integrantes.
- A remoção não deve apagar os registros financeiros históricos do membro.
- A remoção deve encerrar e revogar as sessões ativas do usuário removido.

### FAM-04 — Isolamento familiar

- Consultas e operações devem respeitar o grupo familiar do usuário autenticado.
- Um usuário não pode acessar dados de outro grupo familiar.
- O Dependente não pode visualizar totais, saldos, contas ou análises gerais da família.

## 4. Matriz de permissões

| Funcionalidade                                      |                                 Principal | Dependente |
| --------------------------------------------------- | ----------------------------------------: | ---------: |
| Administrar membros                                 |                                       Sim |        Não |
| Consultar dados gerais da família                   |                                       Sim |        Não |
| Consultar análises e relatórios familiares          |                                       Sim |        Não |
| Registrar despesas                                  |                                       Sim |        Sim |
| Consultar as próprias despesas                      |                                       Sim |        Sim |
| Editar as próprias despesas                         |                                       Sim |        Sim |
| Excluir as próprias despesas                        |                                       Sim |        Sim |
| Consultar/editar/excluir despesas de outros membros | Conforme acesso administrativo do sistema |        Não |
| Contas a pagar e receber                            |                                       Sim |        Não |
| Cartões e faturas                                   |                                       Sim |        Não |
| Saldos e projeções                                  |                                       Sim |        Não |
| Alertas e metas familiares                          |                                       Sim |        Não |

## 5. Regras de negócio

- **RN-FAM-01:** somente o Principal pode incluir ou remover membros.
- **RN-FAM-02:** cada Dependente só pode consultar, editar e excluir despesas que ele próprio registrou.
- **RN-FAM-03:** o Dependente não pode acessar despesas registradas por outros integrantes.
- **RN-FAM-04:** o Dependente não pode acessar saldos, contas, cartões, relatórios ou análises familiares.
- **RN-FAM-05:** a remoção de um membro não apaga seu histórico financeiro.
- **RN-FAM-06:** a remoção deve invalidar imediatamente as sessões do membro.
- **RN-FAM-07:** o backend deve verificar perfil e grupo familiar em toda operação; ocultar opções na interface não é suficiente.
- **RN-FAM-08:** o convite é individual e de uso único.
- **RN-FAM-09:** Validade do convite: Todo convite enviado pelo Principal terá validade de 48 horas a partir de sua criação. Após esse período, o convite será considerado expirado e não poderá ser utilizado para cadastrar um Dependente. O Principal poderá gerar um novo convite. Cada convite será de uso único e, após sua aceitação, será imediatamente invalidado.

## 6. Fluxos principais

### Convite e primeiro acesso

1. O Principal informa o e-mail do Dependente.
2. O sistema verifica se o e-mail pode ser utilizado.
3. O sistema envia um convite individual.
4. O Dependente acessa o link recebido.
5. O sistema valida o convite.
6. O Dependente define sua senha e conclui o primeiro acesso.
7. O usuário passa a integrar o grupo familiar do Principal.

### Remoção de membro

1. O Principal seleciona o membro.
2. O sistema solicita confirmação da remoção.
3. O sistema desativa o acesso do membro e revoga suas sessões.
4. Os registros financeiros históricos são preservados.
5. O membro removido não consegue autenticar-se nem acessar a API.

## 7. Critérios de aceitação

- [ ] O cadastro do Principal cria um grupo familiar.
- [ ] Somente o Principal consegue convidar e remover membros.
- [ ] O Dependente recebe convite individual e define a própria senha no primeiro acesso.
- [ ] Convites não podem ser reutilizados.
- [ ] O Dependente acessa apenas as próprias despesas.
- [ ] O Dependente não acessa informações financeiras gerais da família.
- [ ] A remoção preserva o histórico e revoga sessões.
- [ ] Usuários de grupos diferentes não conseguem acessar dados uns dos outros.

## 8. Endpoints e regras implementadas no backend

A implementação atual expõe os seguintes endpoints no backend, todos protegidos por autenticação e autorização:

- `POST /api/familymanagement/invite` — principal convoca um dependente para o grupo familiar.
- `POST /api/familymanagement/accept-invite` — dependente aceita o convite e conclui seu cadastro com senha própria.
- `GET /api/familymanagement/members` — principal lista os integrantes ativos do grupo familiar.
- `PUT /api/familymanagement/members/{memberId}` — principal altera nome e e-mail do integrante, sem permitir alteração de perfil, grupo familiar ou credenciais.
- `DELETE /api/familymanagement/members/{memberId}` — principal remove um dependente e revoga imediatamente suas sessões ativas.

Os acessos administrativos são aplicados no backend por `UsuarioAutenticado` e verificações de perfil/grupo familiar em toda operação sensível.

## 9. Dependências e observações

- Autenticação e validação de sessão estão em `auth.md`.
- Despesas estão detalhadas em `expenses.md`.
- A validade temporal do convite não recebe duração fixa nesta especificação.
