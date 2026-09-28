#!/usr/bin/env bash
# Prepara o "sistema sob teste" (SUT): clona o front público do ServeRest e builda 100% local.
#
# Por que clonar em vez de vendorizar no repo: ServeRest/front não tem licença publicada, então
# não é redistribuído aqui — é buscado a cada setup em .sut/front (gitignored).
#
# Por que precisa de patch: src/services/utils.js do front tem a URL da API hardcoded para
# https://serverest.dev, sem variável de ambiente. Rodar contra ela quebraria o isolamento dos
# testes (dados de outras pessoas na internet, fora do nosso controle) — o único propósito deste
# patch é trocar isso por uma env var, com o valor original como fallback.
set -euo pipefail

FRONT_REPO="https://github.com/ServeRest/front.git"
SUT_DIR=".sut/front"
API_URL="${API_URL:-http://localhost:3000}"

if [ ! -d "$SUT_DIR" ]; then
  echo "Clonando ServeRest/front em $SUT_DIR..."
  git clone --depth 1 "$FRONT_REPO" "$SUT_DIR"
fi

echo "Aplicando patch: URL da API fixa -> variável de ambiente..."
cat > "$SUT_DIR/src/services/utils.js" << 'EOF'
export default class Utils {
    static getBaseUrl() {
        return process.env.REACT_APP_API_URL || 'https://serverest.dev'
    }
}
EOF

cd "$SUT_DIR"

echo "Instalando dependências de produção do front..."
# @pact-foundation/pact-node (usado só nos testes de contrato do próprio front, que não usamos) não
# publica binário para linux/arm64 e derruba o install em qualquer máquina arm64 rodando Linux (ex.:
# Apple Silicon dentro de uma VM/container Linux). react-scripts, que é quem builda o app, está em
# "dependencies", não em "devDependencies" — por isso omitir dev é seguro para o build.
# --omit=optional sozinho não basta: com package-lock.json presente, o npm valida os/cpu de todo
# pacote do lockfile antes de aplicar os filtros de omissão. --force é o jeito documentado do npm
# de pular essa checagem de plataforma (não é "força bruta" para ignorar erro real).
npm install --omit=dev --omit=optional --legacy-peer-deps --force

echo "Buildando com REACT_APP_API_URL=$API_URL..."
# CI=false: create-react-app trata warning do ESLint como erro de build quando CI=true — e
# GitHub Actions define CI=true por padrão. Os warnings são do código do ServeRest (não nosso) e
# não bloqueiam o app de funcionar; não faz sentido "consertar" código de terceiro só pra isso.
# NODE_OPTIONS=--openssl-legacy-provider: webpack 4 (usado pelo react-scripts 3.x deste projeto)
# não é compatível com o OpenSSL 3 do Node 17+ sem essa flag.
# SKIP_PREFLIGHT_CHECK=true: o preflight do react-scripts sobe a árvore de diretórios e encontra o
# eslint do NOSSO projeto (um nível acima, em node_modules/), que é mais novo que o que o
# react-scripts 3.x espera. É um falso positivo de dependência aninhada, não uma incompatibilidade
# real — o próprio erro do CRA recomenda essa flag para esse caso.
CI=false SKIP_PREFLIGHT_CHECK=true REACT_APP_API_URL="$API_URL" NODE_OPTIONS=--openssl-legacy-provider npm run build

echo "SUT pronto em $SUT_DIR/build"
