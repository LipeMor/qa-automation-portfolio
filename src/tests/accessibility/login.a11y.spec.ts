import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@support/fixtures';
import { LoginPage } from '@support/pages/LoginPage';

test.describe('@accessibility @login', () => {
  test('tela de login não tem violações de acessibilidade críticas ou sérias (WCAG 2 A/AA)', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const criticalOrSerious = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );

    // Assertiva ainda não validada numa execução real (sem browser neste ambiente de edição).
    // Se falhar na primeira rodada real, não enfraqueça a asserção pra fazer passar — documente o
    // achado em docs/sut-serverest.md como comportamento real (mesmo padrão já usado pros gaps de
    // RBAC), igual foi feito com os outros comportamentos do ServeRest.
    expect(criticalOrSerious, JSON.stringify(criticalOrSerious, null, 2)).toEqual([]);
  });
});
