# QA Automation Portfolio

Framework de testes E2E com **Playwright + TypeScript**, testando o
[ServeRest](https://github.com/ServeRest/ServeRest) (API + front-end React) rodando **100% local**
— sem depender de dados compartilhados na internet, sem flakiness por estado de terceiros.

Este é um portfólio de engenharia de QA, não um produto: o interesse está em como os testes são
construídos (isolamento de dados, seletores estáveis, evidência de efeito real, CI verde) tanto
quanto no que eles cobrem.

## Stack

Playwright · TypeScript · ESLint (flat config) + `eslint-plugin-playwright` · Prettier ·
GitHub Actions

## Por que ServeRest local, e não o site público

Ver [`docs/sut-serverest.md`](docs/sut-serverest.md) — inclui os dois comportamentos reais de
controle de acesso do ServeRest que os testes documentam e travam.

## Rodando localmente

Pré-requisitos: Node (versão no `.nvmrc`).

```bash
npm install
npx playwright install --with-deps chromium   # baixa o browser; só precisa rodar uma vez
npm run sut:setup                              # clona e builda o ServeRest local em .sut/
npm test                                       # sobe API + front e roda a suíte
```

Outros comandos úteis:

```bash
npm run test:ui              # Playwright UI mode (interativo)
npm run test:headed          # com browser visível
npm run test:api             # só a suíte de API (tag @api), sem abrir browser
npm run test:network         # só os testes de mock de rede (tag @network)
npm run test:visual          # só os testes de visual regression (tag @visual)
npm run test:accessibility   # só os testes de acessibilidade (tag @accessibility)
npm run test:game            # só a automação do jogo da memória (tag @game)
npm run test:visual:update   # regenera os baselines de visual regression (roda em Docker)
npm run report                # abre o último relatório HTML
npm run lint                  # ESLint
npm run typecheck             # tsc --noEmit
npm run format:check          # Prettier
```

`npm test` sobe e derruba a API e o front sozinho (`webServer` no `playwright.config.ts`). Não
precisa abrir nada manualmente.

## Estrutura

```
game/
  index.html / game.js  # jogo da memória original (Canvas 2D puro, sem dependência externa) — Fase 4
src/
  support/
    api/           # UsersApi/ProductsApi (criação/remoção via API) + schemas.ts (contratos zod)
    pages/         # Page Objects (inclui MemoryGamePage, com leitura de estado + pixel do canvas)
    fixtures.ts    # fixtures do Playwright (usuário e sessão admin/cliente descartáveis por teste)
  tests/
    auth/               # login via UI: credenciais válidas, senha errada, email inexistente
    access-control/     # verificação de sessão e o gap real de RBAC do front do ServeRest
    api/                # testes de API pura (sem browser): contrato, validação e RBAC real da API
    network/            # mocks de rede (page.route) para falhas que a API local não reproduz
    visual/             # visual regression com baseline real (toHaveScreenshot)
    accessibility/      # varredura WCAG 2 A/AA com @axe-core/playwright
    game/               # automação do jogo da memória: estado real + pixel do canvas, não só clique
docs/
  sut-serverest.md   # por que e como o SUT roda local, e o que foi verificado no código dele
scripts/
  setup-sut.sh                  # clona, aplica o patch necessário e builda o front do ServeRest
  update-visual-baselines.sh    # regenera os baselines de visual regression via Docker
```

`npm run test:api` roda só a suíte de API (tag `@api`) — nenhum teste ali usa `page`, então o
Playwright não chega a abrir um browser. Útil quando só o Chromium está com problema (rede lenta,
etc.) e a UI não precisa ser tocada.

## Decisões de engenharia (e por quê)

- **Login via API, não via UI, para montar massa de teste.** Cada teste cria seu próprio usuário
  (`adminUser`/`clientUser` em `fixtures.ts`) e apaga no final. Nenhum teste depende de outro nem
  reaproveita usuário — a causa mais comum de flakiness por estado compartilhado não existe aqui.
- **Seletores por `data-testid` e `role`, nunca CSS gerado ou texto instável** — confirmados lendo
  o código-fonte do front, não adivinhados.
- **Assertivas por efeito, não por input.** Por exemplo, o teste do gap de RBAC não só verifica a
  URL — verifica que o formulário de cadastro de produto (`data-testid="nome"`) realmente
  renderizou.

## Roadmap

- [x] **Fase 1** — base do framework, ServeRest local, login e controle de acesso, CI verde.
- [x] **Fase 2** — testes de API e validação de contrato (schema com zod), incluindo o RBAC real
      da API (contraste com o gap do front na Fase 1).
- [x] **Fase 3** — mocks de rede (`page.route`), visual regression com baseline real (Docker,
      matching o SO do CI), acessibilidade (`@axe-core/playwright`), incluindo 2 achados reais
      documentados em `docs/sut-serverest.md`.
- [ ] **Fase 4** — módulo de automação em Canvas com um jogo próprio (jogo da memória, `game/`):
      estado real exposto (`window.__gameState`), seed determinística, delay assíncrono real de
      comparação, validação por estado + pixel do canvas. Pendente validação numa execução real.
