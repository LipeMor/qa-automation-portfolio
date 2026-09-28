import type { APIRequestContext, APIResponse } from '@playwright/test';

export type NewProduct = {
  nome: string;
  preco: number;
  descricao: string;
  quantidade: number;
};

export type CreatedProduct = NewProduct & { id: string };

function buildProduct(overrides: Partial<NewProduct>): NewProduct {
  return {
    nome: `Produto QA ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    preco: 100,
    descricao: 'Produto criado para teste automatizado',
    quantidade: 1,
    ...overrides,
  };
}

/**
 * POST/DELETE /produtos exigem token de administrador (confirmado na API: sem token -> 401 "Token
 * de acesso ausente..."; token de usuário comum -> 403 "Rota exclusiva para administradores").
 * Por isso todo método aqui recebe o `authorization` (já com o prefixo "Bearer ") explicitamente,
 * em vez de guardar um token internamente — quem chama decide com qual sessão está agindo, que é o
 * ponto central dos testes de RBAC em `src/tests/api/produtos.spec.ts`.
 */
export class ProductsApi {
  constructor(private readonly request: APIRequestContext) {}

  /**
   * Não lança em erro (401/403 incluídos) — quem chama decide o que fazer com a resposta, porque
   * em produtos.spec.ts a resposta de erro *é* o objeto sob teste.
   */
  async createProductRaw(
    authorization: string | undefined,
    overrides: Partial<NewProduct> = {},
  ): Promise<APIResponse> {
    return this.request.post('/produtos', {
      data: buildProduct(overrides),
      headers: authorization ? { authorization } : undefined,
    });
  }

  /** Cria com um token de admin válido e já lança se falhar — para os testes que só precisam de
   *  massa de dados (não estão testando a criação em si). */
  async createProduct(
    adminAuthorization: string,
    overrides: Partial<NewProduct> = {},
  ): Promise<CreatedProduct> {
    const product = buildProduct(overrides);
    const response = await this.request.post('/produtos', {
      data: product,
      headers: { authorization: adminAuthorization },
    });

    if (!response.ok()) {
      throw new Error(
        `Falha ao criar produto de teste (HTTP ${response.status()}): ${await response.text()}`,
      );
    }

    const body = (await response.json()) as { _id: string };
    return { ...product, id: body._id };
  }

  async deleteProduct(adminAuthorization: string, id: string): Promise<APIResponse> {
    return this.request.delete(`/produtos/${id}`, {
      headers: { authorization: adminAuthorization },
    });
  }

  async getProduct(id: string): Promise<APIResponse> {
    return this.request.get(`/produtos/${id}`);
  }
}
