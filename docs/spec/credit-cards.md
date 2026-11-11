# SPEC — Cartões de Crédito e Faturas (CREDIT CARDS)

## 1. Objetivo
Especificar o controle de cartões de crédito e o cálculo da fatura em aberto a partir das despesas registradas.

## 2. Ator
Somente o Principal pode acessar e administrar cartões e faturas.

## 3. Requisitos funcionais
### CARD-01 — Cadastro e administração de cartão
- O Principal pode cadastrar e administrar cartões de crédito.
- Os dados necessários ao controle da fatura devem ser armazenados conforme o formulário do sistema.

### CARD-02 — Composição da fatura
- A fatura em aberto deve somar despesas pagas com cartão de crédito.
- Devem ser consideradas despesas registradas pelo Principal e pelos Dependentes.
- Despesas vinculadas a contas pagas com cartão também devem ser consideradas quando aplicável.

### CARD-03 — Consulta de fatura
- O Principal pode consultar o valor da fatura em aberto.
- O Dependente não pode acessar cartões, faturas ou seus valores.

### CARD-04 — Pagamento da fatura
- O Principal pode marcar a fatura como paga.
- Após a confirmação do pagamento, o valor em aberto da fatura deve ser zerado.
- O histórico da fatura e do pagamento deve ser preservado.

## 4. Regras de negócio
- **RN-CARD-01:** somente o Principal acessa cartões e faturas.
- **RN-CARD-02:** despesas no crédito compõem a fatura em aberto correspondente.
- **RN-CARD-03:** a composição considera despesas dos integrantes do grupo familiar.
- **RN-CARD-04:** o pagamento da fatura zera o valor em aberto, sem apagar o histórico.
- **RN-CARD-05:** o backend deve impedir acesso de Dependentes aos dados de cartão e fatura.

## 5. Fluxos principais
### Composição da fatura
1. Uma despesa é registrada com método de pagamento cartão de crédito.
2. O sistema identifica o cartão/fatura correspondente.
3. O valor é incorporado à fatura em aberto.
4. O Principal consulta o total atualizado.

### Pagamento
1. O Principal abre a fatura.
2. Confirma o pagamento.
3. O sistema registra a quitação.
4. O valor em aberto passa a zero e o histórico permanece disponível.

## 6. Critérios de aceitação
- [ ] Apenas o Principal acessa cartões e faturas.
- [ ] Despesas no crédito integram a fatura em aberto.
- [ ] A composição inclui despesas dos Dependentes.
- [ ] O pagamento zera o valor em aberto.
- [ ] O histórico permanece após a quitação.
- [ ] Dependentes não conseguem consultar faturas pela API.
