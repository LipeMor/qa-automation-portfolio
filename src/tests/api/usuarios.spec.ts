import { expect, test } from '@support/fixtures';
import {
  CreateUserResponseSchema,
  ErrorMessageSchema,
  FieldValidationErrorSchema,
  UserSchema,
} from '@support/api/schemas';

test.describe('@api @usuarios', () => {
  test('POST /usuarios cria um usuário e retorna 201 com o contrato esperado', async ({
    apiContext,
    usersApi,
  }) => {
    const email = `qa.contrato.${Date.now()}@example.com`;

    const response = await apiContext.post('/usuarios', {
      data: { nome: 'Contrato QA', email, password: 'Senha@123', administrador: 'false' },
    });

    expect(response.status()).toBe(201);
    const body = CreateUserResponseSchema.parse(await response.json());

    await usersApi.deleteUser(body._id);
  });

  test('POST /usuarios com email já cadastrado retorna 400 com mensagem específica', async ({
    apiContext,
    adminUser,
  }) => {
    const response = await apiContext.post('/usuarios', {
      data: { nome: 'Duplicado', email: adminUser.email, password: 'x', administrador: 'false' },
    });

    expect(response.status()).toBe(400);
    const body = ErrorMessageSchema.parse(await response.json());
    expect(body.message).toBe('Este email já está sendo usado');
  });

  test('POST /usuarios sem email obrigatório retorna 400 no formato de erro por campo', async ({
    apiContext,
  }) => {
    const response = await apiContext.post('/usuarios', {
      data: { nome: 'SemEmail', password: 'x', administrador: 'false' },
    });

    expect(response.status()).toBe(400);
    const body = FieldValidationErrorSchema.parse(await response.json());
    expect(body.email).toBe('email é obrigatório');
  });

  test('GET /usuarios/:id retorna um usuário que bate com o contrato', async ({
    apiContext,
    adminUser,
  }) => {
    const response = await apiContext.get(`/usuarios/${adminUser.id}`);

    expect(response.ok()).toBe(true);
    const body = UserSchema.parse(await response.json());
    expect(body.email).toBe(adminUser.email);
    expect(body.administrador).toBe('true');
  });

  test('GET /usuarios/:id com id em formato válido mas inexistente retorna 400, não 404', async ({
    apiContext,
  }) => {
    // Contrato real do ServeRest: "não encontrado" aqui é 400, não 404 — documentado porque é
    // fácil assumir 404 por convenção REST e escrever um teste que nunca vai bater com a API real.
    const response = await apiContext.get('/usuarios/0000000000000000');

    expect(response.status()).toBe(400);
    const body = ErrorMessageSchema.parse(await response.json());
    expect(body.message).toBe('Usuário não encontrado');
  });

  test('DELETE /usuarios/:id remove o usuário de verdade (não só responde OK)', async ({
    apiContext,
    usersApi,
  }) => {
    const user = await usersApi.createUser();

    const deleteResponse = await apiContext.delete(`/usuarios/${user.id}`);
    expect(deleteResponse.ok()).toBe(true);

    // Efeito real, não só o status da chamada de DELETE: confirma que o usuário de fato sumiu.
    const getAfterDelete = await apiContext.get(`/usuarios/${user.id}`);
    expect(getAfterDelete.status()).toBe(400);
  });

  test('DELETE /usuarios/:id em um id que não existe ainda responde 200', async ({
    apiContext,
  }) => {
    // Outra peculiaridade de contrato: DELETE é 200 mesmo quando nada foi excluído (idempotente),
    // diferente do GET no mesmo cenário, que é 400. Vale travar os dois para não confundir depois.
    const response = await apiContext.delete('/usuarios/0000000000000000');

    expect(response.status()).toBe(200);
    const body = ErrorMessageSchema.parse(await response.json());
    expect(body.message).toBe('Nenhum registro excluído');
  });
});
