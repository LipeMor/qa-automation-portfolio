import type { Locator, Page } from '@playwright/test';

export type MemoryCardState = {
  index: number;
  symbol: string;
  revealed: boolean;
  matched: boolean;
};

export type MemoryGameState = {
  seed: number;
  gridRows: number;
  gridCols: number;
  cards: MemoryCardState[];
  moves: number;
  matchedPairs: number;
  totalPairs: number;
  resolving: boolean;
  status: 'playing' | 'won';
};

declare global {
  interface Window {
    __gameState?: MemoryGameState;
  }
}

const GAME_URL = process.env.GAME_URL ?? 'http://localhost:8081';

/**
 * game/ é um jogo original (canvas 2D, sem dependência externa), servido estático. O estado real
 * da engine fica em window.__gameState — os testes validam por ele, não só pelo clique (ver
 * CLAUDE.md "Canvas interaction" / "Game readiness").
 */
export class MemoryGamePage {
  readonly board: Locator;

  constructor(private readonly page: Page) {
    this.board = page.getByTestId('memory-board');
  }

  async goto(seed: number): Promise<void> {
    await this.page.goto(`${GAME_URL}/?seed=${seed}`);
  }

  async getState(): Promise<MemoryGameState> {
    const state = await this.page.evaluate(() => window.__gameState);
    if (!state) {
      throw new Error('window.__gameState não existe — o jogo carregou de verdade?');
    }
    return state;
  }

  /**
   * Clica na carta pelo índice real do grid (0-based, linha major). Deriva a posição do bounding
   * box atual do canvas em vez de uma coordenada fixa — funciona independente de o canvas ter
   * sido redimensionado por CSS ou de devicePixelRatio, e valida que o elemento está visível antes
   * de calcular a posição.
   */
  async clickCard(index: number): Promise<void> {
    const state = await this.getState();
    const box = await this.board.boundingBox();
    if (!box) {
      throw new Error('Canvas do jogo não está visível — não dá pra calcular a posição do clique.');
    }

    const cellWidth = box.width / state.gridCols;
    const cellHeight = box.height / state.gridRows;
    const row = Math.floor(index / state.gridCols);
    const col = index % state.gridCols;

    const x = box.x + col * cellWidth + cellWidth / 2;
    const y = box.y + row * cellHeight + cellHeight / 2;

    await this.page.mouse.click(x, y);
  }

  /**
   * Espera o delay de comparação (setTimeout real no jogo) terminar. Nunca waitForTimeout: aqui
   * fazemos polling de um estado observável de verdade (resolving), do jeito que CLAUDE.md pede
   * pra qualquer sincronização.
   */
  async waitForResolved(): Promise<void> {
    await this.page.waitForFunction(() => window.__gameState?.resolving === false);
  }

  /** Lê o pixel central de uma carta direto do canvas — evidência visual real, não só o estado. */
  async readCardCenterPixel(index: number): Promise<string> {
    const state = await this.getState();
    return this.page.evaluate(
      ({ idx, cols, rows }) => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;
        const cellW = canvas.width / cols;
        const cellH = canvas.height / rows;
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = Math.floor(col * cellW + cellW / 2);
        const y = Math.floor(row * cellH + cellH / 2);
        const data = ctx.getImageData(x, y, 1, 1).data;
        return `${data[0]},${data[1]},${data[2]},${data[3]}`;
      },
      { idx: index, cols: state.gridCols, rows: state.gridRows },
    );
  }
}
