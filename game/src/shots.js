// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays
// the real rules forward from a fresh world, steered by a simple autopilot
// (play the dearest affordable creature, mend when hurt, burst the weakest
// creature across, wash a crowded row), so every frame is what a short
// real game looks like and the same seed always gives the same frame.
import { PHASE_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function autopilot(world) {
  const state = world.state;
  let acted = true;
  while (acted && state.phase !== PHASE_OVER) {
    acted = false;
    for (let i = 0; i < state.you.hand.length; i += 1) {
      const card = world.cardById(state.you.hand[i]);
      if (!card || state.you.ember < card.cost) continue;
      if (card.spell === 'mend' && state.you.life <= 18) {
        if (world.castSpell(state.you, i, null)) { acted = true; break; }
      } else if (card.spell === 'wash' && state.foe.row.length >= 2) {
        if (world.castSpell(state.you, i, null)) { acted = true; break; }
      } else if (card.spell === 'burst') {
        let weakest = null;
        for (let j = 0; j < state.foe.row.length; j += 1) {
          if (weakest === null || state.foe.row[j].health < state.foe.row[weakest].health) weakest = j;
        }
        const target = state.foe.life <= 3 ? { side: 'foe', hero: true }
          : weakest !== null ? { side: 'foe', index: weakest } : { side: 'foe', hero: true };
        if (world.castSpell(state.you, i, target)) { acted = true; break; }
      }
    }
    if (acted) continue;
    let best = -1;
    for (let i = 0; i < state.you.hand.length; i += 1) {
      const card = world.cardById(state.you.hand[i]);
      if (card && !card.spell && state.you.ember >= card.cost && state.you.row.length < 5) {
        if (best === -1 || card.cost > world.cardById(state.you.hand[best]).cost) best = i;
      }
    }
    if (best !== -1 && world.playCreature(state.you, best)) acted = true;
  }
}

function playTurns(world, count) {
  for (let i = 0; i < count && world.state.phase !== PHASE_OVER; i += 1) {
    autopilot(world);
    if (world.state.phase !== PHASE_OVER) world.endPlayerTurn();
  }
}

// Set `world` to the named scene and return the screen to draw over it and
// the best score to show.
export function stageShot(name, world) {
  world.reset();
  if (name === 'win') {
    playTurns(world, 6);
    // Rig the ending, not the picture: her lantern at 3, a Burst in hand.
    world.state.foe.life = 3;
    world.state.you.ember = 10;
    world.state.you.hand.push('burst');
    const at = world.state.you.hand.indexOf('burst');
    world.castSpell(world.state.you, at, { side: 'foe', hero: true });
    return { screen: SCREEN_OVER, best: world.state.you.life };
  }
  if (name === 'loss') {
    playTurns(world, 6);
    world.state.you.life = 3;
    world.state.you.row.length = 0;
    world.state.you.hand.length = 0;
    // Her row strikes your empty row's lantern every turn she takes;
    // a few turns of that is enough to gutter your lantern out.
    for (let i = 0; i < 4 && world.state.phase !== PHASE_OVER; i += 1) {
      world.endPlayerTurn();
    }
    if (world.state.phase !== PHASE_OVER) {
      // Her row was empty too: the duel ends on fatigue, the honest
      // way a duel ends when nobody can strike.
      world.state.you.deck.length = 0;
      world.state.you.life = 1;
      world.endPlayerTurn();
      world.state.you.life = 0;
      world.checkEnd();
    }
    return { screen: SCREEN_OVER, best: 0 };
  }
  if (name === 'play') {
    // A mid-duel table: both rows filled, both hands visible, neither
    // lantern down. A long autopilot can end the duel early, so play
    // fewer turns and, if the duel did end, start over shorter.
    playTurns(world, 5);
    if (world.state.phase === PHASE_OVER) {
      world.reset();
      playTurns(world, 3);
    }
    if (world.state.phase === PHASE_OVER) {
      world.reset();
      playTurns(world, 2);
    }
    // Top the player's hand back up to three cards with real draws, so
    // the hand reads as a hand in the picture.
    while (world.state.you.hand.length < 3 && world.state.you.deck.length > 0) {
      world.drawCard(world.state.you, 'Your');
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  playTurns(world, 4);
  return { screen: SCREEN_TITLE, best: 0 };
}
