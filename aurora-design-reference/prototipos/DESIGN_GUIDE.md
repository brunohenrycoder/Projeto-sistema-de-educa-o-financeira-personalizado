# Aurora — Guia de Referência Visual para o Frontend

## Objetivo
Este diretório contém referências visuais dos protótipos do Aurora para orientar melhorias de UI no frontend. As imagens em `prototypes/` são referências visuais; os requisitos funcionais e o comportamento existente do sistema continuam sendo a fonte de verdade.

## Como usar as referências
- Antes de alterar uma página, leia o requisito funcional (RF) e examine a tela correspondente em `prototypes/`.
- Compare a implementação atual com o protótipo e com o estilo geral do Aurora.
- Use os protótipos como orientação de layout, hierarquia, espaçamento, cores, componentes e apresentação.
- Se uma imagem estiver ausente, não invente um protótipo: siga o padrão visual existente e o RF.
- Preserve os protótipos originais; não os edite nem os substitua.

## Identidade visual
- Interface clara, moderna, simples e organizada.
- Estética mobile-first, mantendo experiência adequada em desktop.
- Verde como cor principal, com fundos claros e tons naturais suaves.
- Cards com cantos arredondados, bordas discretas e hierarquia clara.
- Tipografia legível, espaçamento consistente e uso moderado de ícones.
- Evite excesso de informação, sombras pesadas, cores fortes desnecessárias e elementos decorativos sem função.
- Use os tokens, componentes e padrões já existentes no código; não crie uma nova identidade visual nem introduza dependências sem necessidade.

## Responsividade
- Priorize a experiência mobile.
- Em desktop, aproveite espaço com organização adequada sem esticar excessivamente o conteúdo.
- Evite overflow horizontal, textos cortados e controles difíceis de usar.
- Adapte tabelas, navegação, formulários, cards e modais às telas menores.

## Limites — alterações somente visuais
A tarefa de refinamento visual não deve alterar:
- requisitos funcionais ou regras de negócio;
- permissões de Principal e Dependente;
- contratos, endpoints, payloads ou integrações com API;
- lógica, validações, cálculos, fluxo de navegação ou comportamento funcional;
- textos funcionais ou campos exigidos pelo RF, salvo ajuste visual sem mudar o significado.

Não redesenhe Login e Cadastro: eles foram aprovados e devem ser preservados.

Não invente telas, campos, ações ou funcionalidades que não estejam previstas nos RFs ou na implementação atual.

## Processo recomendado
1. Identifique a página/componente e o RF relacionado.
2. Leia o RF e examine o protótipo relevante (se disponível).
3. Inspecione os componentes e estilos existentes antes de editar.
4. Faça alterações pequenas e focadas em apresentação.
5. Preserve estados e comportamentos existentes (loading, vazio, erro, sucesso, permissões).
6. Verifique responsividade e acessibilidade visual básica (contraste, foco, labels).
7. Execute testes, lint e build aplicáveis.
8. Ao concluir, resuma arquivos alterados e melhorias visuais; informe testes executados e eventuais limitações.

## Organização das imagens
Salve os protótipos PNG nesta pasta `prototypes/`. Mantenha os nomes exportados se forem claros; caso necessário, use nomes descritivos sem alterar o conteúdo da imagem.

## Telas e referências
A lista de imagens presentes pode variar. Use apenas as referências realmente disponíveis na pasta. Não assuma que uma captura representa todos os estados de uma página.
