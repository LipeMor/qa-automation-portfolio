# CLAUDE.md

Instruções para trabalhar neste repositório. Este arquivo descreve convenções reais do projeto —
não é um template genérico. Se alguma instrução aqui não bater com o código, o código manda: avise
e corrija este arquivo.

## O que é este projeto

Framework de testes E2E (Playwright + TypeScript) contra o ServeRest, rodando 100% local. Ver
`README.md` para visão geral e `docs/sut-serverest.md` para as decisões sobre o sistema sob teste.

## Antes de mudar qualquer teste ou helper

1. Leia o Page Object ou helper relacionado antes de duplicar lógica — `src/support/pages/` e
   `src/support/api/` existem para não repetir seletor nem chamada de API em mais de um lugar.
2. Seletor novo: confirme no código-fonte do front (clonado em `.sut/front/src` depois de
   `npm run sut:setup`) que o `data-testid`/role existe antes de usá-lo. Não invente seletor —
   `grep -r "data-testid" .sut/front/src` resolve rápido.
3. Comportamento do ServeRest que parece estranho: pode ser um limite real do app (ver
   "Comportamentos reais documentados" em `docs/sut-serverest.md`), não um bug do teste. Verifique
   lendo o código do front antes de "corrigir" o teste para esconder o comportamento.

## Convenções

- **Isolamento de dados**: todo teste que precisa de um usuário usa as fixtures `adminUser` /
  `clientUser` (`src/support/fixtures.ts`), que criam via API e apagam no `teardown`. Nunca reuse
  um usuário entre testes nem dependa de dado deixado por outro teste.
- **Seletores**: `data-testid` primeiro, depois `role`/accessible name. Nunca CSS gerado, XPath ou
  texto que pode mudar de tradução/copy.
- **Sincronização**: nunca `waitForTimeout`. As assertivas do Playwright (`expect(locator)...`)
  já fazem polling — se um teste está flaky, o problema é a condição esperada estar errada, não o
  timeout ser curto.
- **Nomes de teste em português, descrevendo comportamento observável** — não a implementação
  ("login com senha incorreta mantém o usuário em /login e exibe erro", não "testa handleSubmit
  com erro").
- **Comentários explicam o _porquê_, não o _o quê_.** Principalmente em `scripts/setup-sut.sh` e
  `docs/sut-serverest.md`, onde várias decisões existem por causa de uma limitação específica do
  ambiente (arm64, preflight do CRA, OpenSSL) — se remover o comentário, a próxima pessoa vai
  reverter a correção achando que é redundante.

## Rodando e validando

```bash
npm run sut:setup   # só precisa rodar de novo se .sut/front/build ficar desatualizado
npm run lint
npm run typecheck
npm run format:check
npm test
```

Não declare uma mudança pronta sem rodar `npm test` de verdade. Se algo não puder ser validado
localmente (ex.: precisa do CI para reproduzir), diga isso explicitamente em vez de assumir que
está certo.

## Testes de API (`src/tests/api/`)

- Cada endpoint tem dois tipos de método no client (`UsersApi`/`ProductsApi`): um que **lança** em
  erro (`createUser`, `login`) — para quando o teste só precisa da massa de dados pronta — e um
  `*Raw` que **retorna a resposta crua** (`createProductRaw`) — para quando o teste está
  verificando justamente o erro. Ao adicionar um endpoint novo, siga essa distinção em vez de fazer
  todo método lançar ou todo método retornar raw.
- Toda resposta validada por schema (`src/support/api/schemas.ts`) usa `Schema.parse(body)`, não
  `expect(schema.safeParse(body).success).toBe(true)` — `.parse()` lança com o diff completo do que
  não bateu, o que economiza uma investigação manual quando o teste falha.
- Contrato novo descoberto (status code, formato de erro, campo que muda de tipo): documente em
  `docs/sut-serverest.md` na seção "Comportamentos reais documentados", com o teste que o cobre.
  Essa seção existe para não repetir a investigação da próxima vez.

## Fora de escopo por enquanto

Mocks de rede, visual regression e o módulo de Canvas/WebGL são as próximas fases (ver Roadmap no
`README.md`) — ainda não existem neste repositório. Não comece a implementá-los a menos que a
tarefa peça explicitamente.
