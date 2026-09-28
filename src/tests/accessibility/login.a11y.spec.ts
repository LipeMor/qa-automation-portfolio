import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@support/fixtures';
import { LoginPage } from '@support/pages/LoginPage';

test.describe('@accessibility @login', () => {
  test('tela de login trava as duas violações WCAG 2 A/AA reais conhecidas (color-contrast, image-alt)', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const criticalOrSeriousIds = results.violations
      .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation) => violation.id)
      .sort();

    // Rodado de verdade e confirmado: o ServeRest/front tem duas violações reais nessa tela.
    // 'color-contrast' (serious): o link "Cadastre-se" (#888888 sobre #fff, razão 3.54, WCAG exige
    // 4.5:1) — small.message em .sut/front/src/styles/login.css. 'image-alt' (critical): a logo
    // (<img>) não tem atributo alt — .sut/front/src/views/login.js. Documentado em
    // docs/sut-serverest.md item 7. Travamos os IDs em vez de forçar "zero violação": se o front
    // corrigir um dos dois, ou se aparecer uma violação nova, este teste quebra — contrato vivo,
    // mesmo padrão usado pros gaps de RBAC.
    expect(criticalOrSeriousIds).toEqual(['color-contrast', 'image-alt']);
  });
});
