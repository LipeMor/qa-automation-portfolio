import { defineConfig, devices } from '@playwright/test';

/**
 * FRONT_URL / API_URL apontam para o "sistema sob teste" (SUT): o ServeRest, rodando 100% local
 * (ver docs/sut-serverest.md e scripts/setup-sut.sh). Nenhum teste aqui fala com serverest.dev —
 * dados de outras pessoas na internet tornariam os testes não determinísticos.
 */
const FRONT_URL = process.env.FRONT_URL ?? 'http://localhost:8080';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
// game/ é um jogo original (Fase 4), servido estático direto do repo — sem clone externo, sem
// build step, por isso não passa por scripts/setup-sut.sh como o front do ServeRest.
const GAME_URL = process.env.GAME_URL ?? 'http://localhost:8081';

export default defineConfig({
  testDir: './src/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',

  use: {
    baseURL: FRONT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // PW_SYSTEM_CHROME=1 usa o Google Chrome já instalado na máquina em vez do Chromium que o
  // Playwright baixa (via channel: 'chrome'). Existe para redes corporativas/VPN que bloqueiam ou
  // derrubam o download de cdn.playwright.dev — não muda nenhuma asserção, só qual binário roda.
  // O CI não usa essa variável: sempre roda no Chromium baixado pelo Playwright, para manter a
  // versão do browser reprodutível entre execuções.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_SYSTEM_CHROME ? { channel: 'chrome' as const } : {}),
      },
    },
  ],

  // Sobe API e front do ServeRest antes da suíte e derruba os dois ao final. `reuseExistingServer`
  // fica ligado fora do CI para não recompilar o front a cada execução local.
  webServer: [
    {
      command: 'npx serverest --porta 3000 --nodoc --nosec',
      url: `${API_URL}/produtos`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npx serve -s .sut/front/build -l 8080',
      url: FRONT_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npx serve game -l 8081',
      url: GAME_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
