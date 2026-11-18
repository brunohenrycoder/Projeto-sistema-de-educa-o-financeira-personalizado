# SPEC — Cartões de Crédito e Faturas (CREDIT CARDS)

## 1. Objetivo

Especificar o cadastro e gerenciamento de cartões de crédito, a composição das faturas a partir das despesas registradas, o controle de parcelas, pagamentos, limites e estornos, preservando o histórico financeiro e respeitando as permissões dos integrantes do grupo familiar.

## 2. Atores e permissões

### 2.1. Principal

O Principal pode:
- Cadastrar, consultar, alterar e desativar cartões.
- Consultar cartões, limites e faturas.
- Alterar o limite e as configurações do cartão.
- Registrar pagamentos totais e parciais de faturas.
- Autorizar e registrar estornos.
- Consultar despesas e movimentações relacionadas aos cartões dos integrantes do grupo familiar.

### 2.2. Dependente

O Dependente pode:
- Registrar despesas utilizando cartão de crédito.
- Consultar suas próprias despesas, respeitando as regras da SPEC de Despesas.

O Dependente não pode:
- Consultar cartões ou seus dados administrativos.
- Consultar limites disponíveis ou utilizados.
- Consultar faturas, valores ou pagamentos.
- Registrar pagamentos ou estornos.
- Receber informações sobre os dados financeiros dos demais integrantes.

O backend deverá identificar automaticamente o cartão ativo e a fatura correspondente, sem exigir que o Dependente informe identificadores de cartão ou fatura.

## 3. Dados e configurações definidos

- Cada grupo familiar pode manter apenas um cartão ativo por vez.
- Cartões desativados permanecem armazenados para preservar o histórico financeiro.
- O cadastro do cartão contém:
  - Nome do cartão.
  - Banco emissor.
  - Bandeira.
  - Últimos quatro dígitos (opcional).
  - Limite total.
  - Dia de fechamento.
  - Dia de vencimento.
- O limite total é obrigatório e deve ser maior que zero.
- Os dias de fechamento e vencimento são obrigatórios e devem estar entre 1 e 28.
- Bandeiras aceitas: `VISA`, `MASTERCARD`, `ELO`, `AMERICAN_EXPRESS`, `HIPERCARD` e `OUTRA`.
- Para a bandeira `OUTRA`, a identificação é obrigatória, deve possuir de 2 a 40 caracteres e não pode conter somente espaços em branco.
- Para as demais bandeiras, o campo de identificação adicional deverá permanecer nulo.
- Os últimos quatro dígitos, quando informados, devem conter exatamente quatro números.
- Não armazenar número completo do cartão, CVV, senha, CPF do titular, dados bancários ou credenciais de acesso.
- Alterações nos dias de fechamento e vencimento afetam somente ciclos futuros ainda não gerados.
- A desativação impede novas despesas no cartão, mas não elimina faturas, parcelas, pagamentos, estornos ou créditos pendentes existentes.

## 4. Requisitos funcionais

### CARD-01 — Cadastro e administração de cartão

- O Principal pode cadastrar e administrar cartões de crédito.
- O sistema deve validar os campos obrigatórios e as configurações do cartão.
- Cada grupo familiar pode possuir somente um cartão ativo por vez.
- O Principal pode alterar os dados permitidos e desativar o cartão.
- Não é permitido excluir fisicamente cartões que possuam histórico ou movimentações financeiras associadas.

### CARD-02 — Composição da fatura

- Despesas registradas com cartão de crédito devem compor a fatura correspondente ao ciclo da compra.
- Devem ser consideradas despesas registradas pelo Principal e pelos Dependentes.
- O backend deve associar automaticamente as despesas ao cartão ativo e à fatura correspondente.
- Contas a pagar quitadas utilizando cartão de crédito devem gerar ou vincular uma única despesa de crédito correspondente, evitando duplicidade na composição da fatura.
- Parcelas de compras parceladas devem ser contabilizadas individualmente nas respectivas faturas.

### CARD-03 — Consulta de fatura

- O Principal pode consultar faturas abertas, fechadas, parcialmente pagas, pagas e atrasadas.
- O Principal pode consultar o valor original, o valor pago, o saldo pendente e o histórico de movimentações.
- O Dependente não pode acessar cartões, faturas ou seus valores, inclusive por requisições diretas à API.

### CARD-04 — Pagamento da fatura

- Somente o Principal pode registrar pagamentos de faturas.
- O sistema deve permitir pagamentos totais e parciais.
- Cada pagamento deve ser registrado individualmente, preservando valor, data e responsável.
- O saldo pendente deve ser atualizado após cada pagamento.
- A quitação integral deve definir a fatura como paga, preservando seu histórico.
- O pagamento não deve apagar ou excluir despesas, parcelas ou movimentações anteriores.

### CARD-05 — Parcelamento, pagamentos parciais e estornos

- Ao registrar uma despesa no crédito, o usuário pode indicar compra à vista ou parcelada.
- Compras parceladas devem permitir de 2 a 36 parcelas.
- As parcelas devem possuir valores iguais em centavos sempre que possível, com eventual diferença de arredondamento atribuída à última parcela.
- A soma das parcelas deve corresponder exatamente ao valor original da compra.
- Nenhuma parcela poderá possuir valor inferior a R$ 0,01.
- O Principal pode registrar pagamentos totais ou parciais de faturas.
- O Principal pode registrar estornos parciais ou integrais vinculados à despesa original.
- O sistema deve manter o histórico de parcelas, pagamentos, estornos e créditos decorrentes dos estornos.

### CARD-06 — Controle do limite

- O sistema deve calcular automaticamente o limite utilizado e o limite disponível.
- O cálculo deve considerar compras e parcelas ainda não pagas, inclusive parcelas futuras já contratadas.
- Pagamentos registrados devem reduzir somente as obrigações correspondentes.
- Despesas acima do limite disponível podem ser registradas, mas devem sinalizar o excedente ao Principal.

### CARD-07 — Controle de créditos de estorno

- O sistema deve registrar créditos decorrentes de estornos.
- Créditos não aplicados devem permanecer pendentes.
- Créditos devem ser aplicados somente em faturas abertas.
- A aplicação parcial deve atualizar o saldo pendente do crédito.
- O excedente deve permanecer disponível para aplicação em faturas posteriores.

## 5. Regras de negócio

### RN-CC-01 — Bandeiras do cartão

As bandeiras aceitas são `VISA`, `MASTERCARD`, `ELO`, `AMERICAN_EXPRESS`, `HIPERCARD` e `OUTRA`.

Quando a bandeira selecionada for `OUTRA`, a identificação adicional será obrigatória, com 2 a 40 caracteres, sem permitir somente espaços em branco.

Para as demais bandeiras, o campo de identificação adicional deverá permanecer nulo.

### RN-CC-02 — Limite obrigatório

Todo cartão deverá possuir limite total maior que zero.

### RN-CC-03 — Alteração de limite

Somente o Principal pode alterar o limite total do cartão.

A redução do limite não poderá deixá-lo abaixo do valor atualmente comprometido, considerando compras e parcelas ainda não pagas, inclusive futuras.

### RN-CC-04 — Limite excedido

Despesas acima do limite disponível poderão ser registradas.

O sistema deverá sinalizar o excedente ao Principal, sem bloquear o lançamento da despesa.

O Aurora não realiza autorização bancária de compras e não substitui os mecanismos de controle do banco emissor.

### RN-CC-05 — Desativação do cartão

Cartões desativados não poderão receber novas despesas.

Faturas, parcelas, pagamentos, estornos e créditos pendentes existentes deverão ser preservados.

A desativação não deverá eliminar obrigações financeiras ou registros históricos.

### RN-CC-06 — Integridade do histórico

Cartões e movimentações financeiras não poderão ser excluídos fisicamente quando houver histórico ou registros associados.

Correções deverão preservar os registros originais e utilizar operações próprias de ajuste ou estorno.

### RN-CC-07 — Edição de despesas

Despesas vinculadas a faturas fechadas, parcialmente pagas, pagas ou atrasadas não poderão ser editadas ou excluídas diretamente.

Correções deverão ocorrer por meio de operações de ajuste ou estorno, preservando o histórico financeiro.

Despesas vinculadas a faturas abertas poderão ser alteradas conforme as permissões e regras da SPEC de Despesas.

### RN-CC-08 — Privacidade dos Dependentes

Dependentes podem registrar despesas utilizando cartão de crédito, mas não podem consultar cartões, limites, faturas, pagamentos ou dados administrativos.

O backend deverá validar as permissões em todas as operações, inclusive nas requisições diretas à API.

### RN-CC-09 — Associação automática

O backend deverá associar automaticamente a despesa ao cartão ativo do grupo familiar e à fatura correspondente.

Dependentes não poderão informar ou manipular identificadores de cartão ou fatura para realizar essa associação.

Caso não exista cartão ativo ou não seja possível identificar uma fatura válida, o lançamento deverá ser rejeitado com mensagem apropriada, sem expor informações administrativas.

### RN-CC-10 — Parcelamento

Compras parceladas deverão ser divididas em 2 a 36 parcelas.

As parcelas deverão possuir valores iguais em centavos sempre que possível, com eventual diferença de arredondamento atribuída à última parcela.

A primeira parcela deverá pertencer à fatura correspondente à data da compra.

As parcelas seguintes deverão ser associadas aos ciclos mensais subsequentes.

O backend deverá calcular e persistir individualmente todas as parcelas.

A soma das parcelas deverá corresponder exatamente ao valor original da compra.

Nenhuma parcela poderá possuir valor inferior a R$ 0,01.

### RN-CC-11 — Ciclo de fechamento e vencimento

Compras realizadas até o dia de fechamento, inclusive, pertencerão ao ciclo que fecha naquele dia.

Compras realizadas após o dia de fechamento pertencerão ao próximo ciclo.

O vencimento deverá ocorrer no mês seguinte ao fechamento, utilizando o dia de vencimento configurado no cartão.

Como os dias de fechamento e vencimento são limitados ao intervalo de 1 a 28, não será necessário ajustar datas inexistentes nos meses.

O backend deverá calcular automaticamente as datas de fechamento e vencimento.

### RN-CC-12 — Pagamentos totais e parciais

Somente o Principal poderá registrar pagamentos de faturas.

Cada pagamento deverá possuir valor positivo e não poderá ultrapassar o saldo pendente da fatura.

Pagamentos parciais deverão ser acumulados no histórico, atualizando o valor pago e o saldo pendente.

O sistema deverá manter:
- Valor original da fatura.
- Valor acumulado pago.
- Saldo pendente.
- Situação atual da fatura.

Quando o saldo pendente chegar a zero, a fatura deverá receber o estado `PAID`.

Quando houver pagamento parcial e saldo pendente, a fatura deverá receber o estado `PARTIALLY_PAID`.

Quando a data de vencimento for ultrapassada e ainda houver saldo pendente, a fatura deverá receber o estado `OVERDUE`, preservando os valores já pagos.

Uma fatura sem pagamentos e ainda não vencida poderá permanecer no estado `CLOSED`.

O registro de pagamentos deverá ser preservado, sem exclusão ou alteração automática.

### RN-CC-13 — Comprometimento do limite

O limite utilizado deverá corresponder à soma dos valores das compras e parcelas ainda não pagas, incluindo parcelas futuras já contratadas.

O cálculo deverá considerar:
- Compras à vista ainda não quitadas.
- Parcelas atuais ainda não pagas.
- Parcelas futuras contratadas e ainda não pagas.
- Valores pendentes de faturas abertas, fechadas ou atrasadas.

Pagamentos totais e parciais deverão reduzir somente as obrigações correspondentes.

O mesmo pagamento não poderá ser contabilizado mais de uma vez.

O pagamento de uma parcela não deverá quitar automaticamente parcelas futuras.

O limite disponível será calculado pela diferença entre o limite total e o limite utilizado.

O cálculo deverá ser realizado pelo backend e o limite utilizado nunca poderá ser negativo.

Esse indicador representa o comprometimento financeiro registrado no Aurora, incluindo parcelas futuras, e não necessariamente o limite disponível calculado pelo banco emissor.

### RN-CC-14 — Geração e fechamento de faturas

O sistema deverá manter uma fatura correspondente a cada ciclo mensal que possua movimentações ou obrigações financeiras.

As faturas deverão ser associadas ao cartão e ao período de referência correspondente.

A fatura permanecerá no estado `OPEN` enquanto seu ciclo estiver em andamento.

Ao atingir o dia de fechamento configurado, o sistema deverá encerrar automaticamente o ciclo e alterar a fatura para `CLOSED`, desde que ainda exista saldo pendente e nenhum pagamento parcial registrado.

Caso existam pagamentos parciais, a fatura deverá manter o estado `PARTIALLY_PAID` até o vencimento.

Após o vencimento, qualquer fatura com saldo pendente deverá receber o estado `OVERDUE`.

Quando o saldo pendente chegar a zero, a fatura deverá receber o estado `PAID`, independentemente da data de vencimento.

A geração e o fechamento das faturas deverão ocorrer automaticamente pelo backend, sem depender de uma ação manual do Principal.

Faturas existentes deverão preservar suas datas de fechamento e vencimento, mesmo após alterações nas configurações do cartão.

### RN-CC-15 — Proteção de faturas fechadas

Despesas vinculadas a faturas fechadas, parcialmente pagas, pagas ou atrasadas não poderão ser editadas ou excluídas diretamente.

Correções deverão ocorrer por meio de ajustes ou estornos, preservando os registros originais.

Faturas fechadas ou pagas não poderão ser reabertas ou alteradas automaticamente para acomodar correções.

### RN-CC-16 — Estornos

Somente o Principal poderá autorizar e registrar estornos.

Todo estorno deverá:
- Estar vinculado a uma despesa original.
- Possuir valor e data de registro.
- Identificar o usuário responsável.
- Preservar o histórico da compra original.
- Possuir registro financeiro próprio.

O valor acumulado dos estornos não poderá ultrapassar o valor original da compra.

O valor máximo disponível para um novo estorno deverá ser calculado pela diferença entre o valor original da compra e a soma dos estornos anteriormente registrados.

O backend deverá validar esse limite antes de registrar cada estorno, impedindo que operações simultâneas ultrapassem o valor original.

Em compras parceladas, o estorno deverá seguir a seguinte ordem:

1. Cancelar ou reduzir primeiro as parcelas futuras ainda não cobradas.
2. Caso o valor do estorno ultrapasse o valor das parcelas futuras ainda não cobradas, o excedente deverá ser registrado como crédito de estorno.
3. O crédito deverá ser aplicado à próxima fatura aberta.
4. Caso não exista fatura aberta, o crédito deverá permanecer pendente até que exista uma fatura disponível.
5. Caso o crédito seja superior ao saldo da fatura, deverá ser aplicado somente o valor necessário, mantendo o excedente pendente.

Parcelas já cobradas não poderão ser apagadas ou alteradas diretamente pelo estorno.

Pagamentos anteriormente registrados deverão permanecer inalterados.

Mesmo quando a compra já estiver totalmente paga e não possuir parcelas futuras, o valor estornado deverá ser registrado como crédito para aplicação em faturas posteriores.

O estorno não deverá ser contabilizado como pagamento comum da fatura nem como nova despesa.

### RN-CC-17 — Alteração das configurações do cartão

Alterações nos dias de fechamento e vencimento deverão afetar somente ciclos futuros ainda não gerados.

Faturas existentes deverão preservar as datas originalmente calculadas.

Alterações nas configurações não deverão recalcular retroativamente ciclos, parcelas ou faturas já gerados.

### RN-CC-18 — Preservação do histórico familiar

A desativação do cartão ou a remoção de um membro do grupo familiar não deverá excluir despesas, parcelas, faturas, pagamentos, estornos ou créditos pendentes já registrados.

O histórico financeiro deverá permanecer associado ao grupo familiar.

A remoção de integrantes deverá respeitar as regras de preservação de dados da SPEC de Gerenciamento Familiar.

### RN-CC-19 — Créditos pendentes de estorno

Créditos de estorno que não puderem ser aplicados imediatamente deverão permanecer registrados como créditos pendentes.

Os créditos deverão:
- Permanecer vinculados ao cartão, ao estorno e à compra original.
- Ser aplicados somente em faturas no estado `OPEN`.
- Ser aplicados parcialmente quando o valor do crédito superar o saldo da fatura.
- Manter o excedente pendente para aplicação em faturas posteriores.
- Permanecer registrados enquanto não forem integralmente utilizados.

Faturas fechadas, parcialmente pagas, pagas ou atrasadas não deverão ser alteradas diretamente para receber créditos de estorno.

Caso não exista fatura aberta, o crédito deverá aguardar a geração de uma nova fatura.

A desativação do cartão não deverá excluir créditos pendentes.

A aplicação de créditos deverá ser registrada como uma movimentação própria, preservando valor aplicado, data, fatura de destino e saldo restante.

O mesmo valor de crédito não poderá ser aplicado mais de uma vez.

## 6. Fluxos principais

### 6.1. Cadastro do cartão

1. O Principal acessa o gerenciamento de cartões.
2. Informa os dados necessários.
3. O backend valida as informações.
4. O sistema verifica se já existe cartão ativo no grupo familiar.
5. O cartão é cadastrado e associado ao grupo familiar.
6. O cartão passa a estar disponível para registro de despesas no crédito.

### 6.2. Composição da fatura

1. Um integrante registra uma despesa utilizando cartão de crédito.
2. O backend identifica o grupo familiar e o cartão ativo.
3. O sistema determina o ciclo correspondente à data da compra.
4. O valor é associado à fatura correspondente.
5. Caso a compra seja parcelada, as parcelas são geradas e associadas aos respectivos ciclos.
6. O Principal pode consultar os valores e movimentações da fatura.

### 6.3. Fechamento da fatura

1. O sistema acompanha o ciclo mensal do cartão.
2. Ao atingir o dia de fechamento, encerra o ciclo correspondente.
3. A fatura passa para o estado apropriado, preservando pagamentos já registrados.
4. O sistema mantém o vencimento previamente calculado.
5. O Principal pode consultar a fatura fechada e seu saldo pendente.

### 6.4. Pagamento da fatura

1. O Principal consulta uma fatura com saldo pendente.
2. Informa o valor do pagamento.
3. O backend valida se o valor é positivo e não ultrapassa o saldo pendente.
4. O pagamento é registrado individualmente.
5. O saldo pendente é atualizado.
6. O estado da fatura é atualizado conforme as regras de pagamento.
7. O histórico permanece disponível.

### 6.5. Estorno de compra

1. O Principal seleciona a despesa original.
2. Informa o valor do estorno.
3. O backend verifica o saldo disponível para estorno.
4. O sistema cancela ou reduz primeiro as parcelas futuras ainda não cobradas.
5. O valor excedente é registrado como crédito de estorno.
6. O crédito é aplicado à próxima fatura aberta, quando disponível.
7. Caso não exista fatura aberta, o crédito permanece pendente.
8. Todas as operações são registradas e vinculadas à compra original.

### 6.6. Aplicação de crédito pendente

1. O sistema identifica créditos de estorno pendentes.
2. Verifica a existência de uma fatura aberta do cartão correspondente.
3. Aplica o crédito até o limite do saldo pendente da fatura.
4. Registra a aplicação do crédito.
5. Atualiza o saldo pendente do crédito.
6. Caso exista excedente, mantém o restante pendente para faturas futuras.

## 7. Critérios de aceitação

- [ ] Apenas o Principal consegue administrar cartões, limites e faturas.
- [ ] Dependentes conseguem registrar despesas no crédito sem acessar dados administrativos do cartão.
- [ ] O backend impede acessos indevidos às faturas pela API.
- [ ] Cada grupo familiar mantém somente um cartão ativo por vez.
- [ ] Cartões desativados preservam seu histórico.
- [ ] O sistema valida corretamente os campos e bandeiras do cartão.
- [ ] O limite total deve ser maior que zero.
- [ ] Reduções de limite não podem ficar abaixo do comprometimento atual.
- [ ] Despesas acima do limite disponível são permitidas e sinalizadas.
- [ ] Despesas no crédito integram a fatura correspondente.
- [ ] Despesas de Principal e Dependentes são consideradas na composição da fatura.
- [ ] Contas pagas com cartão não geram duplicidade na fatura.
- [ ] Compras realizadas no dia de fechamento entram no ciclo correspondente.
- [ ] Compras realizadas após o fechamento entram no próximo ciclo.
- [ ] Parcelas respeitam a faixa de 2 a 36 e somam exatamente o valor original da compra.
- [ ] A primeira parcela pertence à fatura correspondente à compra e as seguintes aos ciclos mensais subsequentes.
- [ ] Faturas são fechadas automaticamente conforme o ciclo configurado.
- [ ] Faturas existentes preservam suas datas após alterações nas configurações do cartão.
- [ ] Pagamentos parciais e integrais preservam o histórico e atualizam corretamente o saldo pendente.
- [ ] Pagamentos são associados às respectivas obrigações, sem duplicidade no cálculo do limite.
- [ ] Parcelas futuras não pagas são consideradas no comprometimento do limite.
- [ ] Despesas de faturas fechadas, parcialmente pagas, pagas ou atrasadas não podem ser alteradas ou excluídas diretamente.
- [ ] Estornos respeitam o limite acumulado da compra original.
- [ ] Operações simultâneas de estorno não ultrapassam o valor original da compra.
- [ ] Estornos cancelam ou reduzem primeiro parcelas futuras ainda não cobradas.
- [ ] Valores excedentes são registrados como créditos de estorno.
- [ ] Estornos de compras já pagas geram créditos sem apagar pagamentos anteriores.
- [ ] Créditos pendentes são aplicados somente em faturas abertas.
- [ ] Créditos superiores ao saldo da fatura mantêm o excedente pendente.
- [ ] Créditos pendentes continuam registrados após a desativação do cartão.
- [ ] A aplicação de créditos não permite utilização duplicada.
- [ ] A remoção de integrantes não apaga o histórico financeiro.
- [ ] Todas as operações respeitam o isolamento de dados por grupo familiar.

## 8. Integração entre módulos e divisão de responsabilidades

O módulo integra-se diretamente com `AUTH`, `FAMILY MANAGEMENT`, `EXPENSES`, `PAYABLE BILLS` e `FINANCIAL OVERVIEW`:

### 8.1. Integração com Contas a Pagar (PAYABLE BILLS)
- **Quitação de contas com cartão:** Quando uma conta a pagar é quitada utilizando o método `CARTAO_CREDITO` (`POST /api/payable-bills/{billId}/payments`), o módulo `PAYABLE BILLS` registra uma despesa correspondente em `EXPENSES` e aciona o `CreditCardLedger` para registrar uma compra à vista (1 parcela) no cartão ativo do grupo familiar (`creditCardLedger.registerPurchase(expense, 1)`). Essa compra é inserida na fatura aberta do cartão.
- **Divisão clara de responsabilidades:**
  - `PAYABLE BILLS` gerencia o cadastro da conta, vencimento original, recorrência mensal e quitação da obrigação individual.
  - `CREDIT CARDS` gerencia o cartão ativo, a consolidação das faturas, o controle do limite, a alocação de parcelas e o registro de pagamentos da fatura.
  - **Quitação da fatura:** A fatura do cartão é quitada exclusivamente pelo módulo `CREDIT CARDS` (`POST /api/credit-cards/invoices/{invoiceId}/payments`). A fatura não é convertida em um novo registro de conta a pagar em `PAYABLE BILLS`.

### 8.2. Reflexo no Fluxo Financeiro (FINANCIAL OVERVIEW)
- **Sem duplicidade no fluxo de caixa:** A quitação de uma conta a pagar via `CARTAO_CREDITO` não é contabilizada como saída de caixa no momento da baixa da conta. A saída de caixa efetiva ocorre somente na data do pagamento da fatura do cartão (`CreditCardPayment`).
- **Saldo projetado:** O saldo pendente da fatura aberta ou fechada (`outstandingAmount`) compõe as saídas previstas na data do vencimento da fatura.
- **Sem duplicidade de consumo:** As compras efetuadas com cartão (inclusive contas pagas no crédito) compõem as despesas de consumo no período de competência da fatura. O pagamento da fatura não é contabilizado novamente como despesa de consumo.

## 9. Endpoints da API e contratos para o frontend

Todas as operações de administração e consulta de cartões e faturas são restritas ao Principal autenticado:

- `POST /api/credit-cards` — Cadastra o cartão ativo do grupo familiar.
  - **Payload:** `name`, `issuer`, `network` (`VISA`, `MASTERCARD`, `ELO`, `AMERICAN_EXPRESS`, `HIPERCARD`, `OUTRA`), `otherNetworkName` (obrigatório se `OUTRA`), `lastFourDigits` (opcional, 4 dígitos numéricos), `totalLimit` (maior que zero), `closingDay` (1 a 28), `dueDay` (1 a 28).
  - **Resposta (201 Created):** Dados do cartão criado e status ativo.

- `GET /api/credit-cards` — Consulta os cartões do grupo familiar (ativos e desativados) e os indicadores de limite.
  - **Resposta (200 OK):**
    ```json
    {
      "cards": [
        {
          "id": "uuid...",
          "name": "Cartão Principal",
          "issuer": "Banco do Brasil",
          "network": "VISA",
          "otherNetworkName": null,
          "lastFourDigits": "1234",
          "totalLimit": 5000.00,
          "limitUsed": 1500.00,
          "limitAvailable": 3500.00,
          "pendingCreditAmount": 0.00,
          "limitExceeded": false,
          "closingDay": 10,
          "dueDay": 20,
          "active": true,
          "limitDisclaimer": "Comprometimento calculado considerando parcelas futuras contratadas no Aurora."
        }
      ]
    }
    ```

- `PUT /api/credit-cards/{cardId}` — Atualiza configurações e limite do cartão.
  - Não permite reduzir o limite total para valor inferior ao comprometimento atual (`limitUsed`).

- `DELETE /api/credit-cards/{cardId}` — Desativação lógica do cartão. Preserva integralmente o histórico, faturas, parcelas e créditos pendentes.

- `GET /api/credit-cards/invoices` — Lista as faturas do cartão ativo do grupo familiar.
  - **Parâmetro opcional (Query):** `status` (`OPEN`, `CLOSED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).
  - **Resposta (200 OK):** Lista resumida de faturas com `id`, `cardId`, `cycleStart`, `closingDate`, `dueDate`, `status`, `totalAmount`, `paidAmount`, `creditAmount`, `outstandingAmount`.

- `GET /api/credit-cards/invoices/{invoiceId}` — Consulta detalhada de uma fatura específica.
  - **Resposta (200 OK):** Detalhamento completo contendo:
    - Dados gerais: `id`, `cardId`, datas do ciclo, `status`, `totalAmount`, `paidAmount`, `creditAmount`, `outstandingAmount`.
    - `installments`: lista de parcelas que compõem a fatura (`id`, `expenseId`, `memberName`, `category`, `amount`, `paidAmount`, `refundedAmount`, `outstandingAmount`, `installmentNumber`, `installmentCount`, `cancelled`).
    - `payments`: lista de pagamentos registrados nesta fatura (`id`, `amount`, `paidAt`, `registeredBy`).
    - `creditApplications`: créditos de estorno aplicados à fatura (`id`, `refundId`, `amount`, `remainingCredit`, `appliedAt`).
    - `refunds`: movimentações de estorno associadas (`id`, `expenseId`, `amount`, `createdAt`, `registeredBy`).

- `POST /api/credit-cards/invoices/{invoiceId}/payments` — Registra pagamento integral ou parcial da fatura.
  - **Payload:** `{"amount": 500.00}`.
  - **Validações:** `amount` > 0 e menor ou igual a `outstandingAmount`.
  - **Efeito:** Abate primeiro as parcelas mais antigas da fatura, atualiza `paidAmount` e `outstandingAmount`. Fatura muda para `PARTIALLY_PAID` (se restar saldo) ou `PAID` (se saldo zero). Registrado no histórico com data e responsável.

- `POST /api/credit-cards/expenses/{expenseId}/refunds` — Registra estorno parcial ou integral vinculado à despesa original.
  - **Payload:** `{"amount": 100.00}`.
  - **Efeito:** Cancela/reduz primeiro parcelas futuras ainda não cobradas. O excedente é registrado como crédito pendente e aplicado automaticamente à próxima fatura aberta disponível.

`POST /api/expenses` aceita `installmentCount` opcional: o padrão é 1; compras no crédito podem ter de 2 a 36 parcelas. O backend identifica o cartão ativo e as faturas sem exigir que o cliente informe identificadores de cartão ou fatura.

O fechamento e a atualização das situações das faturas são executados diariamente pelo Spring Scheduler às 00:05, além do cálculo do ciclo no registro da compra. As datas e situações ficam persistidas; após uma indisponibilidade, a próxima execução processa os ciclos vencidos sem depender de acesso de usuários.

As políticas de alocação são:
- Pagamentos parciais reduzem primeiro as parcelas mais antigas da fatura.
- Estornos reduzem primeiro as parcelas ainda não cobradas em ordem de vencimento.
- Créditos de estorno reduzem o comprometimento da parcela à qual foram aplicados e permanecem pendentes se não houver fatura aberta.