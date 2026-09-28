import { expect, test } from '@support/fixtures';
import { AdminHomePage } from '@support/pages/AdminHomePage';
import { LoginPage } from '@support/pages/LoginPage';

test.describe('@access-control @admin-routes', () => {
  test('sem sessão, acessar uma rota administrativa pela URL redireciona para /login', async ({
    page,
  }) => {
    const adminHome = new AdminHomePage(page);

    await adminHome.goto();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('um token qualquer no localStorage já basta para passar pela verificação de sessão', async ({
    page,
  }) => {
    // ServeRest/front (src/services/validateUser.js#validateToken) só checa se existe uma chave
    // "serverest/userToken" no localStorage — não valida o conteúdo contra a API. Este teste
    // documenta esse limite real da verificação (não é uma falha nossa para corrigir: é do
    // projeto de estudo) e serve de contrato: se um dia a validação passar a checar o token de
    // verdade, este teste quebra e avisa.
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('serverest/userToken', 'token-inventado'));

    const adminHome = new AdminHomePage(page);
    await adminHome.goto();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page).toHaveURL(/\/admin\/home$/);
  });

  test('usuário comum autenticado consegue abrir uma rota administrativa digitando a URL', async ({
    page,
    clientUser,
  }) => {
    // Gap real de controle de acesso: a checagem de sessão (validateToken) não distingue papel —
    // só existência de token. Não há proteção de rota por "administrador" no front. Este teste
    // comprova o comportamento atual com uma ação real (preencher o formulário de cadastro de
    // produto), não só a URL, e existe para travar essa evidência: se o projeto ganhar RBAC de
    // verdade, é este teste que vai quebrar primeiro.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(clientUser.email, clientUser.password);
    await expect(page).toHaveURL(/\/home$/);

    const adminHome = new AdminHomePage(page);
    await adminHome.gotoRegisterProducts();

    await expect(page).toHaveURL(/\/admin\/cadastrarprodutos$/);
    await expect(adminHome.productNameInput).toBeVisible();
  });
});
