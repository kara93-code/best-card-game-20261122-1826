// Ember Lantern Duel — the rules and state, with no drawing and no browser
// in it. Two lanterns, 30 life each. Ember refills every turn and grows by
// one a turn to 10. A turn: draw, play cards, end the turn; then your
// creatures attack, left to right, each hitting the creature across from it
// or the enemy lantern when the row across is empty. The Moth Queen takes
// her turn the same way. Reduce her lantern to 0 to win; lose yours and
// the duel is lost. Drawing from an empty deck burns 2 life (fatigue).
import { CARDS, FATIGUE, MAX_EMBER, MAX_HAND, MAX_ROW, START_HAND, START_LIFE } from './config.js';
import { shuffle } from './random.js';

export const PHASE_PLAY = 'play';
export const PHASE_OVER = 'over';

function cardById(id) {
  return CARDS.find((card) => card.id === id);
}

function buildDeck(random) {
  const deck = [];
  for (const card of CARDS) {
    deck.push(card.id, card.id);
  }
  return shuffle(deck, random);
}

function makeSide(deck) {
  return { life: START_LIFE, ember: 0, emberMax: 0, deck, hand: [], row: [] };
}

function makeCreature(card) {
  return { id: card.id, name: card.name, element: card.element, attack: card.attack, health: card.health, maxHealth: card.health };
}

export function createWorld(random) {
  const state = {
    turn: 0,
    phase: PHASE_PLAY,
    winner: null,
    you: makeSide([]),
    foe: makeSide([]),
    log: [],
  };

  function say(line) {
    state.log.push(line);
    if (state.log.length > 6) state.log.shift();
  }

  function drawCard(side, who) {
    if (side.deck.length === 0) {
      side.life -= FATIGUE;
      say(`${who} lantern burns low: fatigue ${FATIGUE}.`);
      return null;
    }
    const id = side.deck.pop();
    if (side.hand.length >= MAX_HAND) {
      say(`${who} hand is full; a card drifts away.`);
      return null;
    }
    side.hand.push(id);
    return id;
  }

  function beginTurn(side, who) {
    side.emberMax = Math.min(MAX_EMBER, side.emberMax + 1);
    side.ember = side.emberMax;
    drawCard(side, who);
  }

  function reset() {
    state.turn = 1;
    state.phase = PHASE_PLAY;
    state.winner = null;
    state.log = [];
    state.you = makeSide(buildDeck(random));
    state.foe = makeSide(buildDeck(random));
    for (let i = 0; i < START_HAND; i += 1) {
      drawCard(state.you, 'Your');
      drawCard(state.foe, 'Moth Queen');
    }
    state.you.emberMax = 1;
    state.you.ember = 1;
    state.foe.emberMax = 0;
    state.foe.ember = 0;
    say('The lanterns are lit. Your move.');
  }

  function checkEnd() {
    if (state.phase === PHASE_OVER) return;
    if (state.foe.life <= 0 && state.you.life <= 0) {
      state.winner = 'you';
      state.phase = PHASE_OVER;
      say('Both lanterns gutter out — you held yours longest.');
    } else if (state.foe.life <= 0) {
      state.winner = 'you';
      state.phase = PHASE_OVER;
      say('The Moth Queen’s lantern goes dark. You win!');
    } else if (state.you.life <= 0) {
      state.winner = 'foe';
      state.phase = PHASE_OVER;
      say('Your lantern goes dark. The Moth Queen wins.');
    }
  }

  function hurtCreature(side, index, amount, who) {
    const creature = side.row[index];
    if (!creature) return;
    creature.health -= amount;
    say(`${who} ${creature.name} takes ${amount}.`);
    if (creature.health <= 0) {
      say(`${creature.name} fades away.`);
      side.row.splice(index, 1);
    }
  }

  function battle(attacker, defender, attackerName, defenderName) {
    // Each creature strikes once, left to right; the row across decides
    // the target, and a creature that dies mid-battle strikes no more.
    const strikers = attacker.row.slice();
    for (const striker of strikers) {
      if (state.phase === PHASE_OVER) return;
      if (!attacker.row.includes(striker)) continue;
      const column = attacker.row.indexOf(striker);
      const target = defender.row[column];
      if (target) {
        const at = defender.row.indexOf(target);
        hurtCreature(defender, at, striker.attack, defenderName);
      } else {
        defender.life -= striker.attack;
        say(`${striker.name} strikes the ${defenderName} lantern for ${striker.attack}.`);
      }
      checkEnd();
      if (state.phase === PHASE_OVER) return;
    }
  }

  function playCreature(side, handIndex) {
    const id = side.hand[handIndex];
    const card = cardById(id);
    if (!card || card.spell || side.row.length >= MAX_ROW) return false;
    if (side.ember < card.cost) return false;
    side.ember -= card.cost;
    side.hand.splice(handIndex, 1);
    side.row.push(makeCreature(card));
    return true;
  }

  function castSpell(side, handIndex, target) {
    const id = side.hand[handIndex];
    const card = cardById(id);
    if (!card || !card.spell) return false;
    if (side.ember < card.cost) return false;
    const foeSide = side === state.you ? state.foe : state.you;
    const foeName = side === state.you ? 'Moth Queen' : 'Your';
    if (card.spell === 'burst') {
      if (!target) return false;
      side.ember -= card.cost;
      side.hand.splice(handIndex, 1);
      if (target.hero) {
        const hurt = target.side === 'foe' ? state.foe : state.you;
        hurt.life -= 3;
        say(`Ember Burst hits the ${target.side === 'foe' ? 'Moth Queen' : 'your'} lantern for 3.`);
      } else {
        const hurt = target.side === 'foe' ? state.foe : state.you;
        hurtCreature(hurt, target.index, 3, target.side === 'foe' ? 'Moth Queen' : 'Your');
      }
    } else if (card.spell === 'mend') {
      side.ember -= card.cost;
      side.hand.splice(handIndex, 1);
      side.life = Math.min(START_LIFE, side.life + 7);
      say('Lantern Mend restores 7 life.');
    } else if (card.spell === 'wash') {
      side.ember -= card.cost;
      side.hand.splice(handIndex, 1);
      for (let i = foeSide.row.length - 1; i >= 0; i -= 1) hurtCreature(foeSide, i, 2, foeName);
      say('Tide Wash sweeps the enemy row.');
    }
    checkEnd();
    return true;
  }

  function aiTakeTurn() {
    // The Moth Queen plays greedily: mend when hurt, wash when the row
    // across is crowded, burst at the weakest creature (or your lantern
    // when it ends the duel), then the dearest creature she can afford.
    const foe = state.foe;
    beginTurn(foe, 'Moth Queen');
    if (state.phase === PHASE_OVER) return;
    let acted = true;
    while (acted) {
      acted = false;
      for (let i = 0; i < foe.hand.length; i += 1) {
        const card = cardById(foe.hand[i]);
        if (!card || foe.ember < card.cost) continue;
        if (card.spell === 'mend' && foe.life <= 14) {
          if (castSpell(foe, i, null)) { acted = true; break; }
        } else if (card.spell === 'wash' && state.you.row.length >= 2) {
          if (castSpell(foe, i, null)) { acted = true; break; }
        } else if (card.spell === 'burst') {
          let target = { side: 'you', hero: true };
          let weakest = null;
          for (let j = 0; j < state.you.row.length; j += 1) {
            if (weakest === null || state.you.row[j].health < state.you.row[weakest].health) weakest = j;
          }
          if (state.you.life <= 3) target = { side: 'you', hero: true };
          else if (weakest !== null) target = { side: 'you', index: weakest };
          if (castSpell(foe, i, target)) { acted = true; break; }
        }
      }
      if (acted) continue;
      let best = -1;
      for (let i = 0; i < foe.hand.length; i += 1) {
        const card = cardById(foe.hand[i]);
        if (card && !card.spell && foe.ember >= card.cost && foe.row.length < MAX_ROW) {
          if (best === -1 || card.cost > cardById(foe.hand[best]).cost) best = i;
        }
      }
      if (best !== -1 && playCreature(foe, best)) acted = true;
    }
    battle(state.foe, state.you, 'Moth Queen', 'Your');
    checkEnd();
    if (state.phase === PHASE_OVER) return;
    state.turn += 1;
    beginTurn(state.you, 'Your');
    checkEnd();
  }

  function endPlayerTurn() {
    if (state.phase === PHASE_OVER) return;
    battle(state.you, state.foe, 'Your', 'Moth Queen');
    checkEnd();
    if (state.phase === PHASE_OVER) return;
    aiTakeTurn();
  }

  reset();
  return {
    state,
    reset,
    cardById,
    playCreature,
    castSpell,
    endPlayerTurn,
    checkEnd,
    drawCard,
  };
}
