import { expect, test } from '@support/fixtures';
import { LoginPage } from '@support/pages/LoginPage';

test.describe('@visual @login', () => {
  test('tela de login não muda visualmente sem uma alteração intencional', async ({ page }) => {
    // Baseline real (não pixel-diff ad-hoc): toHaveScreenshot grava a imagem de referência no
    // primeiro run (commitada no repo, em login.visual.spec.ts-snapshots/) e falha nos runs
    // seguintes se o render mudar. Diferente do pixel-analysis usado em outro projeto (que mede
    // variação de frame de jogo em runtime), aqui o contrato é "essa tela deve continuar parecendo
    // exatamente assim".
    //
    // IMPORTANTE: gere/atualize esse baseline com scripts/update-visual-baselines.sh, não com
    // `npx playwright test --update-snapshots` direto no Mac — anti-aliasing de fonte difere entre
    // macOS e o Ubuntu que o CI usa, e um baseline gerado localmente vai falhar no primeiro push
    // por diferença de renderização do SO, não por regressão real.
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });
});
