import { expect, test } from '@support/fixtures';
import { LoginPage } from '@support/pages/LoginPage';

test.describe('@auth @login', () => {
  test('login com credenciais válidas de administrador redireciona para /admin/home', async ({
    page,
    adminUser,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(adminUser.email, adminUser.password);

    await expect(page).toHaveURL(/\/admin\/home$/);
  });

  test('login com credenciais válidas de usuário comum redireciona para /home', async ({
    page,
    clientUser,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(clientUser.email, clientUser.password);

    await expect(page).toHaveURL(/\/home$/);
  });

  test('login com senha incorreta mantém o usuário em /login e exibe erro', async ({
    page,
    clientUser,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(clientUser.email, 'senha-incorreta');

    await expect(loginPage.alert).toContainText('Email e/ou senha inválidos');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login com email não cadastrado exibe a mesma mensagem genérica da senha incorreta', async ({
    page,
  }) => {
    // Mesma mensagem para "email não existe" e "senha errada" é o comportamento correto de
    // segurança (não vaza quais emails estão cadastrados) — por isso este teste existe separado
    // do de senha incorreta: ele trava explicitamente essa decisão de contrato.
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login('usuario.que.nao.existe@example.com', 'qualquer-senha');

    await expect(loginPage.alert).toContainText('Email e/ou senha inválidos');
    await expect(page).toHaveURL(/\/login$/);
  });
});
