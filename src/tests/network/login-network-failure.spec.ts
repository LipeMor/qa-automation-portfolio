import { expect, test } from '@support/fixtures';
import { LoginPage } from '@support/pages/LoginPage';

test.describe('@network @login', () => {
  test('falha de rede (sem resposta) no login não exibe nenhuma mensagem de erro ao usuário', async ({
    page,
  }) => {
    // Achado lendo .sut/front/src/views/login.js: o catch do handleSubmit acessa
    // error.response.data.message direto, sem checar se error.response existe. O axios só
    // preenche error.response quando o servidor respondeu com status de erro (4xx/5xx) — numa
    // falha de rede de verdade (conexão recusada, timeout, DNS) error.response é undefined, e o
    // acesso lança TypeError antes do setState rodar. Efeito real: nenhum estado muda, nenhum
    // alerta aparece, o usuário fica olhando pro formulário sem feedback nenhum.
    //
    // A API local rodando aqui sempre responde, então não dá pra provocar essa classe de falha
    // sem mock — page.route() existe exatamente pra isso. Interceptamos só o POST (a chamada da
    // API) e deixamos passar o GET (a navegação inicial do front pra /login), senão a própria
    // página nunca carregaria.
    await page.route('**/login', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.abort('failed');
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('qualquer@example.com', 'qualquer-senha');

    // Contraste com o teste de credencial inválida (src/tests/auth/login.spec.ts), que exibe um
    // alerta: aqui nenhum alerta deveria aparecer, porque o componente quebra antes de conseguir
    // renderizar um. Se o front um dia passar a tratar erro de rede, este teste quebra — é o
    // contrato vivo.
    await expect(loginPage.alert).toBeHidden();
    await expect(page).toHaveURL(/\/login$/);
  });
});
