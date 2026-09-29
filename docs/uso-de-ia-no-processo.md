# Como IA foi usada na construção deste projeto

Este documento existe porque "mostrar uso prático de IA em QA" é, cada vez mais, um requisito
explícito em vaga — e a resposta honesta não é uma frase de efeito, é o histórico de commits e as
decisões registradas neste próprio repositório. O que segue são casos reais, verificáveis, não um
resumo de intenção.

## O que dá pra checar, não só acreditar

- Todo commit deste repositório tem `Co-Authored-By: Claude` — não é alegação, é o histórico do
  `git log`.
- `CLAUDE.md` não é um README genérico de "boas práticas com IA": é o arquivo que rege como as
  mudanças foram feitas neste projeto especificamente (convenção de seletor, proibição de
  `waitForTimeout`, disciplina de investigar antes de "corrigir" um teste). Qualquer decisão deste
  documento pode ser conferida contra ele.

## Caso 1 — diagnosticar um timeout sem inventar a causa

Rodar `npx playwright install chromium` numa máquina real travava em exatamente 30000ms, enquanto
um `curl` baixando o mesmo arquivo, na mesma rede, terminava em 6.7s. O processo de investigação,
na ordem em que aconteceu:

1. **Hipótese: proxy corporativo.** Testável e descartável rápido — `scutil --proxy` voltou sem
   nenhum proxy configurado. Hipótese morta, sem gastar tempo tentando configurar `HTTPS_PROXY` às
   cegas.
2. **Hipótese: IPv6 quebrado na rede.** `curl -6` confirmou: IPv6 realmente não funcionava pra
   aquele host. Mas forçar IPv4 (`NODE_OPTIONS=--dns-result-order=ipv4first`) **não resolveu** —
   evidência de que essa camada era real, mas não era a causa raiz. Descartar uma hipótese
   parcialmente certa é mais difícil do que descartar uma errada, e foi feito com o mesmo rigor.
3. **Hipótese errada, corrigida com evidência: bloqueio por segurança de endpoint.** A suspeita
   seguinte foi um agente de EDR/DLP corporativo derrubando downloads de binário feitos por
   processos Node. Essa hipótese foi **falsificada** por um teste de isolamento de variável: rodar
   o mesmo comando trocando só a rede (tethering do celular) e o download funcionou. Se fosse
   bloqueio por software no próprio Mac, trocar de rede não mudaria nada — mudou. A hipótese foi
   descartada explicitamente, por escrito, no momento em que o dado a contradisse, em vez de
   mantida por já ter sido dita antes.
4. **Causa provável, delimitada honestamente:** rota de rede/peering entre a rede residencial e o
   CDN, não algo corrigível do lado do desenvolvedor. Sem acesso à infraestrutura da operadora, o
   diagnóstico parou onde a evidência disponível parava — sem forçar uma conclusão mais definitiva
   do que os dados permitiam.

O valor aqui não é ter "usado IA pra resolver um bug de rede" — é a disciplina de testar cada
hipótese isoladamente, aceitar quando uma está errada mesmo depois de afirmada, e não declarar
causa raiz sem uma forma de verificar.

## Caso 2 — comportamento real em vez de comportamento assumido

Antes de escrever qualquer teste de controle de acesso, o código-fonte do front do ServeRest foi
lido (`.sut/front/src/services/validateUser.js`), não assumido. Isso revelou dois achados que um
teste "óbvio" teria errado:

- A verificação de sessão aceita qualquer token não-nulo — não valida o conteúdo. Um teste que
  assumisse validação real do token nunca pegaria esse gap.
- A **API** (`/produtos`), ao contrário do front, aplica RBAC de verdade. Sem ler os dois lados
  seria fácil generalizar "o sistema não tem controle de acesso", o que seria factualmente errado —
  o gap é de UX (a tela renderiza quando não deveria), não de integridade de dado. Essa distinção só
  existe porque os dois lados foram verificados separadamente, documentados em
  `docs/sut-serverest.md`.

## Caso 3 — não esconder um achado inconveniente

O teste de acessibilidade (`src/tests/accessibility/login.a11y.spec.ts`) foi escrito para esperar
zero violações críticas/sérias. Rodando de verdade, encontrou duas: contraste insuficiente no link
"Cadastre-se" e uma imagem sem `alt`. A reação **não foi enfraquecer a asserção pra fazer passar** —
foi documentar as duas violações em `docs/sut-serverest.md` e reescrever o teste pra travar os IDs
exatos como contrato vivo. Um teste verde escondendo um achado real vale menos que um teste
vermelho mostrando a verdade; a correção certa muda o que o teste afirma, não o que o sistema faz.

## Caso 4 — os próprios erros, pegos por verificação, não por sorte

Dois erros aconteceram na construção deste repositório e os dois só foram pegos porque o resultado
foi conferido de verdade, não assumido pelo retorno de sucesso de uma ferramenta:

- Uma ferramenta de escrita de arquivo remoto reportou sucesso (`"written"`) numa mudança que, na
  prática, não tinha sido aplicada — só foi percebido relendo o conteúdo do arquivo depois, e virou
  regra explícita: nunca confiar no retorno de sucesso sozinho, sempre reconferir o arquivo.
- Um `git add -A` pegou de carona um arquivo de baseline de visual regression gerado pra macOS
  (`login-chromium-darwin.png`), que contrariava a própria decisão documentada de manter só o
  baseline gerado em Linux. Percebido no `git status` do commit seguinte, corrigido num commit à
  parte (`877c490`) em vez de reescrever o histórico — o commit errado fica visível, e a correção
  também.

## O que isso demonstra, na prática

Planejamento e execução de casos de teste com apoio de IA (o Caso 2), shift-left de verdade — achar
o comportamento real antes de escrever a asserção, não depois de o teste falhar em produção —, e
disciplina de investigação que não confunde "a IA disse" com "está provado" (Casos 1, 3 e 4). Nenhum
desses quatro casos foi resolvido adivinhando; todos tiveram um passo de verificação que poderia ter
mudado a conclusão — e em pelo menos um caso (o EDR), mudou.
