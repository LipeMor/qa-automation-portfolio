import { expect, test } from '@support/fixtures';
import { MemoryGamePage, type MemoryCardState } from '@support/pages/MemoryGamePage';

// Seed fixa: o layout do tabuleiro é 100% determinístico a partir dela (mesmo PRNG em
// game/game.js). É isso que permite testar "vencer o jogo" sem depender de sorte — os pares são
// descobertos lendo o estado real, nunca por índice fixo assumido de antemão.
const SEED = 42;

test.describe('@game @canvas', () => {
  test('estado inicial: 16 cartas viradas pra baixo, 0 pares, 0 movimentos', async ({ page }) => {
    const game = new MemoryGamePage(page);
    await game.goto(SEED);

    const state = await game.getState();

    expect(state.cards).toHaveLength(16);
    expect(state.cards.every((card) => !card.revealed && !card.matched)).toBe(true);
    expect(state.moves).toBe(0);
    expect(state.matchedPairs).toBe(0);
    expect(state.status).toBe('playing');
  });

  test('clicar em duas cartas com o mesmo símbolo marca as duas como matched', async ({ page }) => {
    const game = new MemoryGamePage(page);
    await game.goto(SEED);

    const [first, second] = findMatchingPair((await game.getState()).cards);

    await game.clickCard(first);
    await game.clickCard(second);
    await game.waitForResolved();

    const finalState = await game.getState();
    expect(finalState.cards[first].matched).toBe(true);
    expect(finalState.cards[second].matched).toBe(true);
    expect(finalState.matchedPairs).toBe(1);
    expect(finalState.moves).toBe(1);
  });

  test('clicar em duas cartas diferentes vira as duas de novo depois do delay de comparação', async ({
    page,
  }) => {
    const game = new MemoryGamePage(page);
    await game.goto(SEED);

    const [first, second] = findMismatchedPair((await game.getState()).cards);

    await game.clickCard(first);
    await game.clickCard(second);
    await game.waitForResolved();

    const finalState = await game.getState();
    expect(finalState.cards[first].revealed).toBe(false);
    expect(finalState.cards[second].revealed).toBe(false);
    expect(finalState.cards[first].matched).toBe(false);
    expect(finalState.matchedPairs).toBe(0);
    expect(finalState.moves).toBe(1);
  });

  test('encontrar todos os pares define status como won', async ({ page }) => {
    const game = new MemoryGamePage(page);
    await game.goto(SEED);

    const pairs = allPairs((await game.getState()).cards);

    for (const [first, second] of pairs) {
      await game.clickCard(first);
      await game.clickCard(second);
      await game.waitForResolved();
    }

    const finalState = await game.getState();
    expect(finalState.status).toBe('won');
    expect(finalState.matchedPairs).toBe(finalState.totalPairs);
  });

  test('carta com par encontrado é desenhada com destaque visual (evidência real, não só estado)', async ({
    page,
  }) => {
    // Efeito real: o estado dizer matched=true não prova que o canvas redesenhou nada. Lemos o
    // pixel de verdade no centro da carta antes de qualquer clique e depois de casar o par —
    // combina as duas fontes de verdade (estado interno + evidência visual) em vez de confiar só
    // numa, como pede CLAUDE.md pra Canvas.
    const game = new MemoryGamePage(page);
    await game.goto(SEED);

    const [first, second] = findMatchingPair((await game.getState()).cards);
    const pixelBefore = await game.readCardCenterPixel(first);

    await game.clickCard(first);
    await game.clickCard(second);
    await game.waitForResolved();

    const pixelAfter = await game.readCardCenterPixel(first);

    expect(pixelAfter).not.toEqual(pixelBefore);
  });
});

function findMatchingPair(cards: MemoryCardState[]): [number, number] {
  for (const card of cards) {
    const partner = cards.find((c) => c.symbol === card.symbol && c.index !== card.index);
    if (partner) return [card.index, partner.index];
  }
  throw new Error('Nenhum par encontrado no baralho — o baralho está inconsistente.');
}

function findMismatchedPair(cards: MemoryCardState[]): [number, number] {
  const [first] = cards;
  const different = cards.find((card) => card.symbol !== first.symbol);
  if (!different) {
    throw new Error('Baralho só tem um símbolo — não dá pra achar um par diferente.');
  }
  return [first.index, different.index];
}

function allPairs(cards: MemoryCardState[]): [number, number][] {
  const seen = new Set<number>();
  const pairs: [number, number][] = [];
  for (const card of cards) {
    if (seen.has(card.index)) continue;
    const partner = cards.find(
      (c) => c.symbol === card.symbol && c.index !== card.index && !seen.has(c.index),
    );
    if (!partner) continue;
    pairs.push([card.index, partner.index]);
    seen.add(card.index);
    seen.add(partner.index);
  }
  return pairs;
}
