// Jogo da memória original, canvas 2D puro, sem dependência externa. Feito pra ser testável de
// verdade (ver CLAUDE.md "Canvas interaction"): estado real exposto em window.__gameState, seed
// controlável pela URL pra o embaralhamento ser 100% determinístico, e um delay de comparação
// assíncrono real (setTimeout) que os testes esperam via polling de estado, nunca waitForTimeout.
(function () {
  'use strict';

  // PRNG determinístico (mulberry32) — Math.random() não aceita seed, e sem seed o layout do
  // tabuleiro mudaria a cada carga, impossibilitando testar "vencer o jogo" sem sorte.
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(array, rng) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  var SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'cross', 'plus'];
  var GRID_COLS = 4;
  var GRID_ROWS = 4;
  var PAIR_COUNT = (GRID_COLS * GRID_ROWS) / 2;
  var RESOLVE_DELAY_MS = 600;

  var params = new URLSearchParams(window.location.search);
  var seed = Number(params.get('seed')) || Date.now();
  var rng = mulberry32(seed);

  var symbolPool = SHAPES.slice(0, PAIR_COUNT);
  var deck = shuffle(symbolPool.concat(symbolPool), rng);

  var state = {
    seed: seed,
    gridRows: GRID_ROWS,
    gridCols: GRID_COLS,
    cards: deck.map(function (symbol, index) {
      return { index: index, symbol: symbol, revealed: false, matched: false };
    }),
    moves: 0,
    matchedPairs: 0,
    totalPairs: PAIR_COUNT,
    resolving: false,
    status: 'playing',
    selected: [],
  };

  window.__gameState = state;

  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var hud = document.getElementById('hud');
  var CELL = canvas.width / GRID_COLS;

  var COLORS = {
    circle: '#e74c3c',
    square: '#3498db',
    triangle: '#2ecc71',
    diamond: '#f1c40f',
    star: '#9b59b6',
    hexagon: '#1abc9c',
    cross: '#e67e22',
    plus: '#ecf0f1',
  };

  function cellCenter(index) {
    var row = Math.floor(index / GRID_COLS);
    var col = index % GRID_COLS;
    return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  }

  function drawShape(shape, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 'square') {
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
    } else if (shape === 'triangle') {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y + size);
      ctx.lineTo(x - size, y + size);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'diamond') {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'star') {
      var spikes = 5;
      var outerR = size;
      var innerR = size / 2.5;
      var rot = (Math.PI / 2) * 3;
      var step = Math.PI / spikes;
      ctx.moveTo(x, y - outerR);
      for (var i = 0; i < spikes; i++) {
        var sx = x + Math.cos(rot) * outerR;
        var sy = y + Math.sin(rot) * outerR;
        ctx.lineTo(sx, sy);
        rot += step;
        sx = x + Math.cos(rot) * innerR;
        sy = y + Math.sin(rot) * innerR;
        ctx.lineTo(sx, sy);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'hexagon') {
      for (var h = 0; h < 6; h++) {
        var angle = (Math.PI / 3) * h;
        var px = x + size * Math.cos(angle);
        var py = y + size * Math.sin(angle);
        if (h === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'cross') {
      ctx.fillRect(x - size, y - size / 3, size * 2, (size * 2) / 3);
      ctx.fillRect(x - size / 3, y - size, (size * 2) / 3, size * 2);
    } else if (shape === 'plus') {
      ctx.fillRect(x - size / 4, y - size, size / 2, size * 2);
      ctx.fillRect(x - size, y - size / 4, size * 2, size / 2);
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.cards.forEach(function (card) {
      var center = cellCenter(card.index);
      ctx.fillStyle = card.matched ? '#33403a' : '#333a47';
      ctx.fillRect(center.x - CELL / 2 + 4, center.y - CELL / 2 + 4, CELL - 8, CELL - 8);

      if (card.revealed || card.matched) {
        drawShape(card.symbol, center.x, center.y, CELL / 3, COLORS[card.symbol]);
        if (card.matched) {
          ctx.strokeStyle = '#7cfc9c';
          ctx.lineWidth = 3;
          ctx.strokeRect(center.x - CELL / 2 + 4, center.y - CELL / 2 + 4, CELL - 8, CELL - 8);
        }
      }
    });

    hud.textContent =
      'Movimentos: ' +
      state.moves +
      ' · Pares: ' +
      state.matchedPairs +
      '/' +
      state.totalPairs +
      (state.status === 'won' ? ' · Venceu!' : '');
  }

  function indexFromPoint(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (clientX - rect.left) * scaleX;
    var y = (clientY - rect.top) * scaleY;
    var col = Math.floor(x / CELL);
    var row = Math.floor(y / CELL);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return -1;
    return row * GRID_COLS + col;
  }

  function handleClick(event) {
    if (state.resolving || state.status === 'won') return;

    var index = indexFromPoint(event.clientX, event.clientY);
    if (index === -1) return;

    var card = state.cards[index];
    if (!card || card.revealed || card.matched) return;
    if (state.selected.indexOf(index) !== -1) return;

    card.revealed = true;
    state.selected.push(index);
    render();

    if (state.selected.length < 2) return;

    state.moves += 1;
    state.resolving = true;

    var firstIndex = state.selected[0];
    var secondIndex = state.selected[1];
    var first = state.cards[firstIndex];
    var second = state.cards[secondIndex];

    if (first.symbol === second.symbol) {
      window.setTimeout(function () {
        first.matched = true;
        second.matched = true;
        state.matchedPairs += 1;
        state.selected = [];
        state.resolving = false;
        if (state.matchedPairs === state.totalPairs) {
          state.status = 'won';
        }
        render();
      }, RESOLVE_DELAY_MS);
    } else {
      window.setTimeout(function () {
        first.revealed = false;
        second.revealed = false;
        state.selected = [];
        state.resolving = false;
        render();
      }, RESOLVE_DELAY_MS);
    }
  }

  canvas.addEventListener('click', handleClick);
  render();
})();
