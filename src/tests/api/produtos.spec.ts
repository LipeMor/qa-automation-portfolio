import { expect, test } from '@support/fixtures';
import {
  CreateProductResponseSchema,
  ErrorMessageSchema,
  FieldValidationErrorSchema,
  ProductSchema,
} from '@support/api/schemas';

test.describe('@api @produtos @rbac', () => {
  // Este arquivo é o contraponto de src/tests/access-control/admin-routes.spec.ts: lá, o FRONT não
  // impede um usuário comum de abrir /admin/cadastrarprodutos pela URL. Aqui, a API por trás dessa
  // tela aplica RBAC de verdade — confirmado com os três testes abaixo. Ou seja, o gap documentado
  // no front é de UX (a tela renderiza quando não deveria), não de integridade de dado: mesmo que
  // alguém chegue na tela, a API recusa a escrita. As duas coisas precisam estar cobertas para o
  // quadro ficar completo.

  test('POST /produtos sem token retorna 401', async ({ productsApi }) => {
    const response = await productsApi.createProductRaw(undefined);

    expect(response.status()).toBe(401);
    const body = ErrorMessageSchema.parse(await response.json());
    expect(body.message).toBe(
      'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais',
    );
  });

  test('POST /produtos com token de usuário comum retorna 403', async ({
    productsApi,
    clientSession,
  }) => {
    const response = await productsApi.createProductRaw(clientSession.authorization);

    expect(response.status()).toBe(403);
    const body = ErrorMessageSchema.parse(await response.json());
    expect(body.message).toBe('Rota exclusiva para administradores');
  });

  test('POST /produtos com token de administrador cria o produto e retorna o contrato esperado', async ({
    productsApi,
    adminSession,
  }) => {
    const response = await productsApi.createProductRaw(adminSession.authorization, {
      nome: 'Produto de contrato',
      preco: 250,
      descricao: 'Criado pelo teste de contrato',
      quantidade: 3,
    });

    expect(response.status()).toBe(201);
    const body = CreateProductResponseSchema.parse(await response.json());

    const getResponse = await productsApi.getProduct(body._id);
    const product = ProductSchema.parse(await getResponse.json());
    expect(product).toMatchObject({
      nome: 'Produto de contrato',
      preco: 250,
      descricao: 'Criado pelo teste de contrato',
      quantidade: 3,
    });

    await productsApi.deleteProduct(adminSession.authorization, body._id);
  });

  test('DELETE /produtos/:id com token de usuário comum retorna 403 (produto continua existindo)', async ({
    productsApi,
    adminSession,
    clientSession,
  }) => {
    const product = await productsApi.createProduct(adminSession.authorization);

    const deleteResponse = await productsApi.deleteProduct(clientSession.authorization, product.id);
    expect(deleteResponse.status()).toBe(403);

    // Efeito real: o produto não pode ter sido apagado por uma chamada que a API recusou.
    const getResponse = await productsApi.getProduct(product.id);
    expect(getResponse.ok()).toBe(true);

    await productsApi.deleteProduct(adminSession.authorization, product.id);
  });

  test('GET /produtos/:id com id malformado (tamanho errado) retorna 400 antes de consultar dados', async ({
    productsApi,
  }) => {
    // Forma de erro diferente da de "não encontrado" (que é { message }): aqui é { id: "..." },
    // o mesmo formato de erro de validação de campo usado em POST /usuarios. Vale não confundir os
    // dois formatos de erro só porque os dois são 400.
    const response = await productsApi.getProduct('id-muito-curto');

    expect(response.status()).toBe(400);
    const body = FieldValidationErrorSchema.parse(await response.json());
    expect(body.id).toBe('id deve ter exatamente 16 caracteres alfanuméricos');
  });
});
