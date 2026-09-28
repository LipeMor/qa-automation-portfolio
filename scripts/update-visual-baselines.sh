#!/usr/bin/env bash
# Gera/atualiza os baselines de visual regression (src/tests/visual/*-snapshots/) usando a mesma
# imagem Docker que o Playwright publica pra cada versão — ela roda no mesmo Ubuntu do runner do
# GitHub Actions (ci.yml usa ubuntu-latest). Rodar `playwright test --update-snapshots` direto no
# Mac gera PNGs com anti-aliasing de fonte diferente do que o CI compara, e o teste de @visual
# falharia no primeiro push por causa de renderização do SO, não por uma regressão real.
#
# Requer Docker instalado e rodando.
set -euo pipefail

PLAYWRIGHT_VERSION=$(node -p "require('./package.json').devDependencies['@playwright/test'].replace('^','')")

docker run --rm -v "$(pwd)":/work -w /work \
  "mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble" \
  bash -c "npm ci && npm run sut:setup && npx playwright test --grep @visual --update-snapshots"
