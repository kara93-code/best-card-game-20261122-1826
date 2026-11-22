// Boot and the one loop: input is read every frame, the world advances only
// on player and AI turns (a card game, not a real-time game), and the
// renderer paints what is there. The game moves between four screens:
// title, play, paused and game over.
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_END_TURN, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, END_TURN, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, handCard, rowSlot } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, -1, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selected = -1;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    selected = -1;
    screen = SCREEN_PLAY;
    announce(`Playing. Your lantern ${world.state.you.life} life, ${world.state.you.ember} ember.`);
  }

  function finishGame() {
    screen = SCREEN_OVER;
    if (world.state.winner === 'you' && world.state.you.life > best) {
      best = world.state.you.life;
      saveBest(best);
    }
    announce(world.state.winner === 'you' ? 'You win! The Moth Queen’s lantern is dark.' : 'You lose. Your lantern is dark.');
  }

  function playSelected(target) {
    if (selected < 0 || selected >= world.state.you.hand.length) return false;
    const card = world.cardById(world.state.you.hand[selected]);
    if (!card) return false;
    if (card.spell === 'burst') {
      if (!target) return false;
      if (world.castSpell(world.state.you, selected, target)) { selected = -1; return true; }
      return false;
    }
    if (card.spell) {
      if (world.castSpell(world.state.you, selected, null)) { selected = -1; return true; }
      return false;
    }
    if (world.playCreature(world.state.you, selected)) {
      selected = -1;
      return true;
    }
    return false;
  }

  function inside(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function handleClick(point) {
    if (screen === SCREEN_TITLE) { startGame(); return; }
    if (screen === SCREEN_OVER) { startGame(); return; }
    if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; return; }
    if (inside(END_TURN, point)) {
      world.endPlayerTurn();
      selected = -1;
      if (world.state.phase === PHASE_OVER) finishGame();
      return;
    }
    // A selected Burst needs a target: a creature across, or her life bar.
    if (selected >= 0 && world.cardById(world.state.you.hand[selected])?.spell === 'burst') {
      for (let i = 0; i < 5; i += 1) {
        if (inside(rowSlot(i, 72), point)) {
          if (world.state.foe.row[i] && playSelected({ side: 'foe', index: i })) {
            if (world.state.phase === PHASE_OVER) finishGame();
          }
          return;
        }
      }
      if (point.y < 60 && point.x > 200) {
        if (playSelected({ side: 'foe', hero: true }) && world.state.phase === PHASE_OVER) finishGame();
      }
      return;
    }
    // Your row: play a selected creature there.
    for (let i = 0; i < 5; i += 1) {
      if (inside(rowSlot(i, 292), point)) {
        if (selected >= 0) playSelected(null);
        return;
      }
    }
    // Your hand: pick a card, or cast a targetless spell by clicking it twice.
    for (let i = 0; i < world.state.you.hand.length; i += 1) {
      if (inside(handCard(i, world.state.you.hand.length), point)) {
        if (selected === i) {
          const card = world.cardById(world.state.you.hand[i]);
          if (card.spell && card.spell !== 'burst') {
            playSelected(null);
            if (world.state.phase === PHASE_OVER) finishGame();
          } else if (!card.spell) {
            playSelected(null);
          }
        } else {
          selected = i;
        }
        return;
      }
    }
    selected = -1;
  }

  function handleActions() {
    const actions = input.takeActions();
    const picked = input.takeSelected();
    if (picked >= 0 && picked < world.state.you.hand.length && screen === SCREEN_PLAY) selected = picked;
    for (const point of input.takeClicks()) handleClick(point);
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (selected >= 0) {
        const card = world.cardById(world.state.you.hand[selected]);
        if (card.spell === 'burst') playSelected({ side: 'foe', hero: true });
        else playSelected(null);
        if (world.state.phase === PHASE_OVER) finishGame();
      }
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY) {
      world.endPlayerTurn();
      selected = -1;
      if (world.state.phase === PHASE_OVER) finishGame();
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_RESTART && screen === SCREEN_OVER) startGame();
  }

  function frame() {
    requestAnimationFrame(frame);
    handleActions();
    renderer.draw(world.state, screen, selected, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });

  announce('Ember Lantern Duel. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
