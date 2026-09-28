import type { Locator, Page } from '@playwright/test';

/**
 * Seletores confirmados em ServeRest/front (src/views/login.js): os três campos têm
 * data-testid próprio; a mensagem de erro não tem testid, mas é renderizada com role="alert"
 * (src/component/errorAlert.js) — por isso usamos getByRole em vez de um seletor de texto/CSS.
 */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByTestId('email');
    this.passwordInput = page.getByTestId('senha');
    this.submitButton = page.getByTestId('entrar');
    this.alert = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
