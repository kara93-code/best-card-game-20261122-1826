// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 table is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Cards are big, flat and legible: cost in
// a gold circle, name across the top, a coloured element shape in the
// middle, attack bottom-left and health bottom-right.
import { CARDS, ELEMENT, FIELD, FONT, MAX_ROW, PALETTE } from './config.js';
import { PHASE_OVER } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export const CARD_W = 148;
export const CARD_H = 196;
export const HAND_W = 132;
export const HAND_H = 170;
export const SLOT_W = 158;
export const SLOT_H = 204;

// Where the two rows of creatures sit, and where the player's hand fans out.
export function rowSlot(index, top) {
  const total = MAX_ROW * SLOT_W + (MAX_ROW - 1) * 12;
  const x0 = (FIELD.width - total) / 2;
  return { x: x0 + index * (SLOT_W + 12), y: top, w: SLOT_W, h: SLOT_H };
}

export function handCard(index, count) {
  const total = count * HAND_W + (count - 1) * 10;
  const x0 = (FIELD.width - total) / 2;
  return { x: x0 + index * (HAND_W + 10), y: FIELD.height - HAND_H - 42, w: HAND_W, h: HAND_H };
}

export const END_TURN = { x: FIELD.width - 218, y: 318, w: 190, h: 52 };
export const START_BUTTON = { x: FIELD.width / 2 - 130, y: 492, w: 260, h: 58 };

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function glyph(context, kind, cx, cy, size, color) {
  context.fillStyle = color;
  context.beginPath();
  if (kind === 'flame') {
    context.moveTo(cx, cy - size);
    context.quadraticCurveTo(cx + size, cy - size * 0.2, cx + size * 0.55, cy + size * 0.7);
    context.quadraticCurveTo(cx, cy + size * 1.1, cx - size * 0.55, cy + size * 0.7);
    context.quadraticCurveTo(cx - size, cy - size * 0.2, cx, cy - size);
  } else if (kind === 'leaf') {
    context.ellipse(cx, cy, size, size * 0.62, -0.6, 0, Math.PI * 2);
  } else if (kind === 'wave') {
    for (let i = 0; i < 3; i += 1) {
      context.arc(cx - size + i * size, cy, size * 0.55, Math.PI, 0);
    }
  } else {
    context.moveTo(cx - size, cy + size * 0.7);
    context.lineTo(cx, cy - size);
    context.lineTo(cx + size, cy + size * 0.7);
    context.closePath();
  }
  context.fill();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, bold) {
    const key = `${size}${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  // Wrap by measured pixels, not by character count, so no line ever runs
  // past the card's edge or into the attack and health circles.
  function wrapLines(value, maxWidth, size) {
    context.font = `${size}px ${FONT}`;
    const words = value.split(' ');
    const lines = [''];
    for (const word of words) {
      const last = lines[lines.length - 1];
      const trial = (last + ' ' + word).trim();
      if (context.measureText(trial).width > maxWidth && last) lines.push(word);
      else lines[lines.length - 1] = trial;
    }
    return lines;
  }

  function drawCardFace(card, x, y, w, h, selected, dimmed) {
    // A row creature carries only its combat numbers; the full card
    // definition (cost, text, spell) comes from the card table by id.
    const full = CARDS.find((entry) => entry.id === card.id) ?? card;
    const shown = { ...full, ...card, text: full.text, cost: full.cost, spell: full.spell };
    card = shown;
    const element = ELEMENT[card.element];
    context.globalAlpha = dimmed ? 0.45 : 1;
    roundRect(context, x, y, w, h, 12);
    context.fillStyle = '#f7f1dd';
    context.fill();
    context.lineWidth = selected ? 5 : 2;
    context.strokeStyle = selected ? PALETTE.gold : element.dark;
    context.stroke();
    // Cost: gold circle, top-left.
    context.beginPath();
    context.arc(x + 24, y + 24, 21, 0, Math.PI * 2);
    context.fillStyle = PALETTE.gold;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#7a5a1d';
    context.stroke();
    text(String(card.cost), x + 24, y + 32, 24, '#241a05', 'center', true);
    // Element banner with name.
    context.fillStyle = element.color;
    context.fillRect(x + 8, y + 52, w - 16, 30);
    text(card.name, x + w / 2, y + 74, 16, '#ffffff', 'center', true);
    // Element glyph in the middle, then the text — all laid out from the
    // card's own height, so a hand card (shorter) and a board card (taller)
    // both keep clear of the corner circles. The element needs no label:
    // its colour and its shape already say which it is.
    glyph(context, element.glyph, x + w / 2, y + h * 0.55, 22, element.color);
    // Spell text, or attack and health for creatures. Creature text stays
    // narrow (the corner circles own the edges); spell text may be wider.
    if (card.spell) {
      const lines = wrapLines(card.text, w - 24, 12).slice(0, 2);
      lines.forEach((line, i) => text(line, x + w / 2, y + h - 46 + i * 14, 12, '#33302a', 'center'));
      text('SPELL', x + w / 2, y + h - 10, 12, element.dark, 'center', true);
    } else {
      const lines = wrapLines(card.text, w - 76, 11).slice(0, 2);
      lines.forEach((line, i) => text(line, x + w / 2, y + h - 46 + i * 14, 11, '#5a5346', 'center'));
      context.beginPath();
      context.arc(x + 23, y + h - 16, 15, 0, Math.PI * 2);
      context.fillStyle = '#e8593c';
      context.fill();
      text(String(card.attack), x + 23, y + h - 10, 17, '#ffffff', 'center', true);
      context.beginPath();
      context.arc(x + w - 23, y + h - 16, 15, 0, Math.PI * 2);
      context.fillStyle = '#4a7d3a';
      context.fill();
      text(String(card.health), x + w - 23, y + h - 10, 17, '#ffffff', 'center', true);
    }
    context.globalAlpha = 1;
  }

  function drawCardBack(x, y, w, h) {
    roundRect(context, x, y, w, h, 10);
    context.fillStyle = PALETTE.cardBack;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = PALETTE.gold;
    context.stroke();
    glyph(context, 'flame', x + w / 2, y + h / 2 - 4, 11, PALETTE.gold);
    text('MOTH', x + w / 2, y + h - 8, 9, PALETTE.gold, 'center', true);
  }

  function drawLifeBar(x, y, w, label, life, color) {
    text(label, x, y + 20, 20, PALETTE.text, 'left', true);
    context.fillStyle = '#101826';
    roundRect(context, x + 190, y, w, 26, 8);
    context.fill();
    const fill = Math.max(0, Math.min(1, life / 30));
    context.fillStyle = color;
    if (fill > 0) {
      roundRect(context, x + 192, y + 2, (w - 4) * fill, 22, 6);
      context.fill();
    }
    text(`${Math.max(0, life)} / 30`, x + 190 + w + 12, y + 20, 20, PALETTE.text, 'left', true);
  }

  function drawEmber(x, y, ember, emberMax, label) {
    text(label, x, y + 18, 18, PALETTE.text, 'left', true);
    for (let i = 0; i < 10; i += 1) {
      context.beginPath();
      context.arc(x + 92 + i * 24, y + 10, 9, 0, Math.PI * 2);
      context.fillStyle = i < ember ? PALETTE.ember : '#2a3347';
      context.fill();
      if (i >= emberMax) {
        context.lineWidth = 1;
        context.strokeStyle = '#4a5568';
        context.stroke();
      }
    }
    text(`${ember}/${emberMax}`, x + 92 + 10 * 24 + 8, y + 18, 18, PALETTE.ember, 'left', true);
  }

  function drawTable(state) {
    context.fillStyle = PALETTE.table;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.felt;
    context.beginPath();
    context.ellipse(FIELD.width / 2, FIELD.height / 2, 620, 300, 0, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.tableEdge;
    context.stroke();
    // Opponent bar.
    drawLifeBar(24, 18, 420, 'MOTH QUEEN', state.foe.life, PALETTE.enemy);
    drawEmber(760, 18, state.foe.ember, state.foe.emberMax, 'Ember');
    // Opponent hand: face-down cards, count only.
    for (let i = 0; i < state.foe.hand.length; i += 1) {
      drawCardBack(1120 + i * 18, 56, 34, 56);
    }
    text(`Hand ${state.foe.hand.length}`, 1130, 52, 14, PALETTE.muted, 'left');
    text(`Deck ${state.foe.deck.length}`, 1130, 128, 14, PALETTE.muted, 'left');
    // Rows.
    for (let i = 0; i < MAX_ROW; i += 1) {
      const slot = rowSlot(i, 72);
      context.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(context, slot.x, slot.y, slot.w, slot.h, 10);
      context.fill();
      const creature = state.foe.row[i];
      if (creature) drawCardFace(creature, slot.x + 5, slot.y + 4, CARD_W, CARD_H, false, false);
    }
    for (let i = 0; i < MAX_ROW; i += 1) {
      const slot = rowSlot(i, 292);
      context.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(context, slot.x, slot.y, slot.w, slot.h, 10);
      context.fill();
      const creature = state.you.row[i];
      if (creature) drawCardFace(creature, slot.x + 5, slot.y + 4, CARD_W, CARD_H, false, false);
    }
    // Turn banner between the rows, and the log down the right edge,
    // clear of the hand.
    text(`Turn ${state.turn}`, FIELD.width / 2, 286, 18, PALETTE.gold, 'center', true);
    context.textAlign = 'left';
    state.log.slice(-5).forEach((line, i) => {
      const short = line.length > 30 ? `${line.slice(0, 30)}…` : line;
      text(short, 1052, 392 + i * 16, 12, PALETTE.muted, 'left');
    });
    // Player bar, below the hand.
    drawLifeBar(24, 686, 420, 'YOUR LANTERN', state.you.life, PALETTE.life);
    drawEmber(760, 686, state.you.ember, state.you.emberMax, 'Ember');
    text(`Deck ${state.you.deck.length}`, 1160, 700, 14, PALETTE.muted, 'left');
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 32;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10,14,24,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    roundRect(context, x, y, width, height, 16);
    context.fillStyle = PALETTE.panel;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = accent;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 46, accent, 'center', true);
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 118 + i * 32, 20, PALETTE.muted, 'center'));
    if (prompt) text(prompt, FIELD.width / 2, y + height - 28, 22, PALETTE.gold, 'center', true);
  }

  function draw(state, screen, selected, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.textBaseline = 'alphabetic';
    drawTable(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('EMBER LANTERN DUEL', [
        'A card duel of lanterns and moths.',
        'Play creatures, cast spells, break her lantern first.',
        'Click a card, then the table. End Turn when you are done.',
        'Keys: 1-7 pick a card · E end turn · P pause',
      ], 'Click or press Space to begin', PALETTE.gold);
      text(`Best result: ${best > 0 ? `won with ${best} life left` : 'no win yet'}`, FIELD.width / 2, 560, 16, PALETTE.muted, 'center');
      return;
    }
    // Player hand.
    state.you.hand.forEach((id, i) => {
      const pos = handCard(i, state.you.hand.length);
      const def = CARDS.find((card) => card.id === id);
      drawCardFace(def, pos.x, pos.y, HAND_W, HAND_H, selected === i, state.you.ember < def.cost);
    });
    // End Turn button.
    roundRect(context, END_TURN.x, END_TURN.y, END_TURN.w, END_TURN.h, 12);
    context.fillStyle = state.phase === PHASE_OVER ? '#3a4763' : PALETTE.gold;
    context.fill();
    text('END TURN  (E)', END_TURN.x + END_TURN.w / 2, END_TURN.y + 33, 20, '#241a05', 'center', true);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The moths wait in the dark.'], 'Press P or click to resume', PALETTE.player);
    } else if (screen === SCREEN_OVER) {
      const won = state.winner === 'you';
      drawPanel(won ? 'YOU WIN!' : 'YOUR LANTERN FALLS', [
        won ? `The Moth Queen's lantern is dark. Score: your life ${Math.max(0, state.you.life)} / 30.` : `The Moth Queen keeps her light. Score: your life ${Math.max(0, state.you.life)} / 30.`,
        `Best result: ${best > 0 ? `won with ${best} life left` : 'no win yet'}`,
        'Press R or click to duel again.',
      ], won ? 'The grove is yours.' : 'Light it again.', won ? PALETTE.gold : PALETTE.life);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
