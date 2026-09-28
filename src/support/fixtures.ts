import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { UsersApi, type CreatedUser } from './api/users-api';
import { ProductsApi } from './api/products-api';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export type Session = { user: CreatedUser; authorization: string };

type Fixtures = {
  usersApi: UsersApi;
  productsApi: ProductsApi;
  adminUser: CreatedUser;
  clientUser: CreatedUser;
  adminSession: Session;
  clientSession: Session;
};

type WorkerFixtures = {
  apiContext: APIRequestContext;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  // Worker-scoped: um cliente HTTP por worker, reaproveitado entre testes daquele worker — não há
  // estado de sessão nele (sem token), então compartilhar é seguro e evita abrir uma conexão nova
  // por teste.
  apiContext: [
    // Assinatura de worker fixture do Playwright: não depende de nenhuma outra fixture, mas o
    // primeiro parâmetro é obrigatório.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const context = await playwrightRequest.newContext({ baseURL: API_URL });
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  usersApi: async ({ apiContext }, use) => {
    await use(new UsersApi(apiContext));
  },

  productsApi: async ({ apiContext }, use) => {
    await use(new ProductsApi(apiContext));
  },

  adminUser: async ({ usersApi }, use) => {
    const user = await usersApi.createUser({ administrador: true });
    await use(user);
    await usersApi.deleteUser(user.id);
  },

  clientUser: async ({ usersApi }, use) => {
    const user = await usersApi.createUser({ administrador: false });
    await use(user);
    await usersApi.deleteUser(user.id);
  },

  // adminSession/clientSession existem separado de adminUser/clientUser porque nem todo teste que
  // precisa de um usuário precisa logar (ex.: os de UI logam pela tela) — fazer login de graça em
  // toda fixture de usuário seria uma chamada de API a mais em testes que não usam o token.
  adminSession: async ({ usersApi, adminUser }, use) => {
    const authorization = await usersApi.login(adminUser.email, adminUser.password);
    await use({ user: adminUser, authorization });
  },

  clientSession: async ({ usersApi, clientUser }, use) => {
    const authorization = await usersApi.login(clientUser.email, clientUser.password);
    await use({ user: clientUser, authorization });
  },
});

export { expect };
