import { expect, test } from '@support/fixtures';
import { ErrorMessageSchema, LoginSuccessSchema } from '@support/api/schemas';

test.describe('@api @login', () => {
  test('POST /login com credenciais corretas retorna 200 e um Bearer token', async ({
    apiContext,
    clientUser,
  }) => {
    const response = await apiContext.post('/login', {
      data: { email: clientUser.email, password: clientUser.password },
    });

    expect(response.status()).toBe(200);
    const body = LoginSuccessSchema.parse(await response.json());
    expect(body.message).toBe('Login realizado com sucesso');
  });

  test('POST /login com senha incorreta retorna 401 com mensagem genérica', async ({
    apiContext,
    clientUser,
  }) => {
    const response = await apiContext.post('/login', {
      data: { email: clientUser.email, password: 'senha-incorreta' },
    });

    expect(response.status()).toBe(401);
    const body = ErrorMessageSchema.parse(await response.json());
    expect(body.message).toBe('Email e/ou senha inválidos');
  });

  test('POST /login com email não cadastrado retorna a mesma mensagem genérica', async ({
    apiContext,
  }) => {
    // Mesma mensagem para "não existe" e "senha errada": não vaza quais emails estão cadastrados.
    // Testado aqui na API (a fonte do comportamento) e também na UI (src/tests/auth/login.spec.ts,
    // que prova que o front repassa essa mensagem sem alterar o contrato de segurança).
    const response = await apiContext.post('/login', {
      data: { email: 'ninguem.aqui@example.com', password: 'qualquer-coisa' },
    });

    expect(response.status()).toBe(401);
    const body = ErrorMessageSchema.parse(await response.json());
    expect(body.message).toBe('Email e/ou senha inválidos');
  });
});
