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
    // Só roda em Linux (mesmo SO do CI): o nome do arquivo de snapshot inclui a plataforma
    // (login-chromium-{platform}.png), e só commitamos o -linux.png, gerado via
    // scripts/update-visual-baselines.sh (Docker). Rodar puro no macOS local sempre falharia por
    // "snapshot não existe" — não por regressão real, só porque não existe -darwin.png de
    // propósito. Skip explícito é melhor que um vermelho que engana quem só rodou `npm test`.
    // Skip condicional por SO, não "esqueci de terminar o teste" — daí o disable pontual.
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      process.platform !== 'linux',
      'baseline de visual regression só existe pra linux (mesmo SO do CI) — valide com ' +
        '`npm run test:visual:update` (Docker) ou deixe o CI comparar',
    );

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });
});
