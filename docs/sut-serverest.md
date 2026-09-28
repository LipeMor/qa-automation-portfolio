# O sistema sob teste: ServeRest

Este repositório testa o [ServeRest](https://github.com/ServeRest/ServeRest) (API) e seu
[front-end](https://github.com/ServeRest/front) — um projeto open source feito para estudo de
automação de testes. Nenhum dos dois é vendorizado aqui: `scripts/sut:setup` busca e prepara os
dois a cada setup.

## Por que rodar 100% local, e não contra serverest.dev

O front público (`serverest.dev`) e a API pública compartilham dados com qualquer pessoa
estudando automação de testes no mundo inteiro. Isso quebra a premissa nº 1 de um teste
confiável: dados isolados por execução. Rodando local:

- cada execução sobe API e front do zero, sem histórico de execuções anteriores;
- cada teste cria seu próprio usuário via API e apaga no final (`src/support/fixtures.ts`) —
  nunca reaproveita um usuário entre testes;
- não há risco de rate limit, indisponibilidade ou dado inconsistente de terceiros quebrando o CI.

## O único patch necessário

`ServeRest/front` não tem licença publicada — por isso não é copiado para este repositório, só
clonado (raso, descartável) em `.sut/front/` a cada setup.

O código do front tem a URL da API fixa em `src/services/utils.js`:

```js
static getBaseUrl() {
  return 'https://serverest.dev'
}
```

Sem isso configurável, não daria para apontar o front para a API local. O patch (aplicado por
`scripts/setup-sut.sh`) troca por uma variável de ambiente, mantendo o valor original como
fallback:

```js
static getBaseUrl() {
  return process.env.REACT_APP_API_URL || 'https://serverest.dev'
}
```

Uma linha, sem alterar nenhum outro comportamento do app.

## Limitações conhecidas do ambiente local (não são bugs nossos)

- `npm install` do front pula `devDependencies` (`--omit=dev --omit=optional`): o
  `@pact-foundation/pact-node` (usado só nos testes de contrato do próprio ServeRest, que não
  usamos aqui) não publica binário para Linux/arm64 e derruba a instalação nessa plataforma.
  `react-scripts`, que builda o app, está em `dependencies`, então o build não é afetado.
- O build precisa de `SKIP_PREFLIGHT_CHECK=true`: o preflight do Create React App sobe a árvore de
  diretórios e encontra o ESLint deste repositório (um nível acima), mais novo do que o que
  `react-scripts 3.x` espera — um falso positivo de dependência aninhada.
- `npm audit` acusa vulnerabilidades nas dependências do `serverest` (pacote que sobe a API). São
  do pacote de terceiro, que só roda localmente como dublê de backend — não é código nosso e não
  vai para produção em lugar nenhum.

## Comportamentos reais documentados pelos testes

Estes não são decisões de design nossas — são o que o código do ServeRest/front realmente faz,
confirmado lendo `src/services/validateUser.js` e rodando os testes. Documentamos porque um teste
de portfólio deve provar comportamento real, não o que a gente gostaria que fosse verdade:

1. **A verificação de sessão não valida o token, só a presença dele.**
   `validateToken()` checa `localStorage.getItem('serverest/userToken') !== null` — qualquer
   string não-nula passa, mesmo um token inventado. Coberto em
   `src/tests/access-control/admin-routes.spec.ts`.

2. **Não existe controle de acesso por papel (role) nas rotas `/admin/*`.**
   A mesma verificação (só "existe token") protege rotas de admin e de cliente. Um usuário comum
   autenticado consegue abrir `/admin/cadastrarprodutos` digitando a URL direto — o front nunca
   checa `administrador` antes de renderizar. Coberto no mesmo arquivo.

Os dois testes existem como _contrato vivo_: se o ServeRest um dia implementar verificação real de
token ou RBAC, são eles que vão quebrar primeiro — e isso é o sinal correto de que o comportamento
mudou.

3. **A API, ao contrário do front, aplica RBAC de verdade em `/produtos`.**
   `POST`/`DELETE /produtos` exigem token de administrador: sem token → 401; token de usuário comum
   → 403 "Rota exclusiva para administradores"; token de admin → sucesso. Coberto em
   `src/tests/api/produtos.spec.ts`. Isso muda a leitura do gap nº 2: um usuário comum consegue
   _ver_ a tela de cadastro de produto pela URL, mas a API recusa a escrita — o gap é de UX
   (a tela não deveria nem aparecer), não de integridade de dado.

4. **"Não encontrado" não é consistente entre verbos.**
   `GET /usuarios/:id` e `GET /produtos/:id` com um id em formato válido mas inexistente retornam
   **400** (`{ message: "Usuário/Produto não encontrado" }`), não 404. Já `DELETE` no mesmo cenário
   retorna **200** (`{ message: "Nenhum registro excluído" }`) — idempotente, mas com status
   diferente do GET. Um teste que assume 404 por convenção REST nunca vai bater com esta API.
   Cobertos em `src/tests/api/usuarios.spec.ts` e `produtos.spec.ts`.

5. **Erro de validação de campo e erro de negócio usam formatos diferentes, ambos com HTTP 400.**
   Campo obrigatório faltando (`POST /usuarios` sem email) responde `{ <campo>: "<mensagem>" }`
   (ex.: `{ "email": "email é obrigatório" }`); "não encontrado" e outros erros de negócio
   respondem `{ message: "<mensagem>" }`. `src/support/api/schemas.ts` modela os dois formatos
   separados (`FieldValidationErrorSchema` vs `ErrorMessageSchema`) — tratar os dois como a mesma
   forma faria um teste passar checando o campo errado.

6. **Falha de rede no login não mostra nenhuma mensagem ao usuário — o front só trata erro HTTP,
   não erro de rede.**
   `src/views/login.js` faz `error.response.data.message` direto no `catch` do login, sem checar
   se `error.response` existe. O axios só popula `error.response` quando o servidor respondeu com
   um status de erro (4xx/5xx); numa falha de rede de verdade (conexão recusada, timeout, DNS)
   `error.response` é `undefined`, e esse acesso lança `TypeError` antes de qualquer `setState`
   rodar — nenhum alerta aparece, o formulário só fica parado sem feedback. Como a API local daqui
   sempre responde, essa classe de falha só é reprodutível com `page.route()` interceptando e
   abortando a chamada. Coberto em `src/tests/network/login-network-failure.spec.ts`.

7. **Duas violações reais de acessibilidade (WCAG 2 A/AA) na tela de login, confirmadas com
   `@axe-core/playwright` rodando de verdade.**
   - `color-contrast` (serious): o link "Cadastre-se" (`small.message` em
     `.sut/front/src/views/login.js`) usa `#888888` sobre fundo branco — razão de contraste 3.54,
     abaixo do mínimo de 4.5:1 exigido pra texto normal.
   - `image-alt` (critical): a logo do ServeRest (`<img>` em `login.js`) não tem atributo `alt`.

   Coberto em `src/tests/accessibility/login.a11y.spec.ts`, travando os dois IDs em vez de exigir
   "zero violação" — esconder o achado forçando a asserção passar seria o oposto do que essa seção
   existe pra fazer.
