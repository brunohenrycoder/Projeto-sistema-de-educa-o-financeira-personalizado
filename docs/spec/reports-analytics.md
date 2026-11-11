# SPEC — Relatórios e Análises (REPORTS & ANALYTICS)

## 1. Objetivo
Permitir que o Principal visualize relatórios e padrões de consumo da família para compreender a distribuição das despesas.

## 2. Ator
Somente o Principal pode acessar relatórios e análises familiares.

## 3. Requisitos funcionais
### REP-01 — Relatório de despesas
- O sistema deve apresentar despesas por categoria.
- O sistema deve apresentar despesas por integrante.
- O Principal deve poder filtrar os dados por período e demais filtros previstos na consulta de despesas.

### REP-02 — Identificação de padrões
- O sistema deve identificar as três categorias com maiores despesas.
- Deve comparar os valores com a média dos três meses anteriores.
- A análise deve estar disponível quando houver pelo menos dois meses de histórico.

### REP-03 — Variação de categoria
- O sistema deve identificar aumento superior a 20% em uma categoria em relação à referência histórica utilizada.
- A variação pode subsidiar sugestões financeiras.

## 4. Regras de negócio
- **RN-REP-01:** relatórios e análises familiares são exclusivos do Principal.
- **RN-REP-02:** relatórios devem considerar os registros do grupo familiar.
- **RN-REP-03:** a análise de padrões deve apresentar as três categorias de maior despesa.
- **RN-REP-04:** a comparação histórica utiliza a média dos três meses anteriores.
- **RN-REP-05:** a análise de padrões exige pelo menos dois meses de histórico.
- **RN-REP-06:** aumento superior a 20% em categoria pode gerar uma sugestão.
- **RN-REP-07:** Dependentes não podem acessar relatórios nem análises familiares.

## 5. Fluxos principais
### Relatório por categoria ou integrante
1. O Principal seleciona o tipo de relatório.
2. Informa o período e os filtros desejados.
3. O sistema reúne despesas do grupo familiar.
4. O sistema agrupa os valores e apresenta o resultado.

### Análise de padrões
1. O sistema verifica a existência de histórico suficiente.
2. Calcula as despesas por categoria.
3. Identifica as três categorias de maior valor.
4. Compara os valores com a média histórica dos três meses anteriores.
5. Apresenta os padrões identificados ao Principal.

## 6. Critérios de aceitação
- [ ] O Principal consulta despesas por categoria e integrante.
- [ ] Os filtros de período são aplicados corretamente.
- [ ] O sistema identifica as três categorias de maior despesa.
- [ ] A comparação utiliza a média dos três meses anteriores.
- [ ] A análise respeita o requisito mínimo de histórico.
- [ ] Aumento superior a 20% pode originar sugestão.
- [ ] Dependentes não acessam relatórios ou análises familiares.
