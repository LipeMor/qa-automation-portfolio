import type { Locator, Page } from '@playwright/test';

/**
 * Seletores confirmados em ServeRest/front: src/component/navbarAdmin.js,
 * src/views/admin/home.js e src/views/admin/registerProducts.js.
 */
export class AdminHomePage {
  readonly registerProductsLink: Locator;
  readonly registerProductsNavLink: Locator;
  readonly logoutButton: Locator;
  /** Campo "Nome" do formulário de cadastro de produto — evidência de que a página administrativa
   *  de fato renderizou, não só que a URL mudou. */
  readonly productNameInput: Locator;

  constructor(private readonly page: Page) {
    this.registerProductsLink = page.getByTestId('cadastrarProdutos');
    this.registerProductsNavLink = page.getByTestId('cadastrar-produtos');
    this.logoutButton = page.getByTestId('logout');
    this.productNameInput = page.getByTestId('nome');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/home');
  }

  async gotoRegisterProducts(): Promise<void> {
    await this.page.goto('/admin/cadastrarprodutos');
  }
}
