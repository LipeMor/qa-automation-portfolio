import type { APIRequestContext } from '@playwright/test';

export type NewUser = {
  nome: string;
  email: string;
  password: string;
  administrador: boolean;
};

export type CreatedUser = NewUser & { id: string };

/**
 * Fina camada sobre a API do ServeRest para criar e remover massa de dados de teste.
 *
 * Por quê API e não UI: criar usuário pela tela de cadastro tornaria cada teste dependente da
 * página de cadastro estar funcionando e seria 5-10x mais lento. Isolamento real vem de nunca
 * reaproveitar usuário entre testes (cada teste cria o seu e apaga no fim) — não de "limpar" um
 * usuário compartilhado.
 *
 * `administrador` é modelado como boolean aqui e só vira string ("true"/"false") na borda, ao
 * montar o payload: é assim que o contrato da API do ServeRest espera o campo, não é uma escolha
 * do nosso domínio.
 */
export class UsersApi {
  constructor(private readonly request: APIRequestContext) {}

  async createUser(overrides: Partial<NewUser> = {}): Promise<CreatedUser> {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user: NewUser = {
      nome: 'QA Portfolio',
      email: `qa.portfolio.${unique}@example.com`,
      password: 'Senha@123',
      administrador: false,
      ...overrides,
    };

    const response = await this.request.post('/usuarios', {
      data: {
        nome: user.nome,
        email: user.email,
        password: user.password,
        administrador: String(user.administrador),
      },
    });

    if (!response.ok()) {
      throw new Error(
        `Falha ao criar usuário de teste (HTTP ${response.status()}): ${await response.text()}`,
      );
    }

    const body = (await response.json()) as { _id: string };
    return { ...user, id: body._id };
  }

  async deleteUser(id: string): Promise<void> {
    // Best-effort: se o teste já apagou o usuário (ou nunca chegou a criar), não deve quebrar o
    // teardown de outros testes na mesma execução.
    await this.request.delete(`/usuarios/${id}`).catch(() => undefined);
  }

  /** Retorna o header `authorization` completo (já vem com o prefixo "Bearer "). Lança se a API
   *  responder 401 — comportamento explícito, não um retorno vazio silencioso. */
  async login(email: string, password: string): Promise<string> {
    const response = await this.request.post('/login', { data: { email, password } });

    if (!response.ok()) {
      throw new Error(`Login falhou (HTTP ${response.status()}): ${await response.text()}`);
    }

    const body = (await response.json()) as { authorization: string };
    return body.authorization;
  }
}
