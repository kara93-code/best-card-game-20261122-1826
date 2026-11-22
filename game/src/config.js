// Ember Lantern Duel — every tuning number and colour in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

export const STEP = 1 / 60;
export const START_LIFE = 30;
export const MAX_EMBER = 10;
export const MAX_HAND = 7;
export const MAX_ROW = 5;
export const START_HAND = 3;
export const FATIGUE = 2;

// The four lantern elements. Each card belongs to one; colour and shape
// together tell them apart, never text alone.
export const ELEMENT = {
  flame: { name: 'Flame', color: '#e8593c', dark: '#8f2f1d', glyph: 'flame' },
  leaf: { name: 'Leaf', color: '#5fb85a', dark: '#2c5e2a', glyph: 'leaf' },
  tide: { name: 'Tide', color: '#4aa8dd', dark: '#205a7d', glyph: 'wave' },
  stone: { name: 'Stone', color: '#d9a441', dark: '#7a5a1d', glyph: 'stone' },
};

// The thirteen original cards. A creature has attack and health; a spell
// has a short effect line and no attack or health.
export const CARDS = [
  { id: 'moth', name: 'Spark Moth', element: 'flame', cost: 1, attack: 2, health: 1, text: 'Quick ember sting.' },
  { id: 'sprout', name: 'Leaf Sprout', element: 'leaf', cost: 1, attack: 1, health: 3, text: 'Patient and tough.' },
  { id: 'minnow', name: 'Tide Minnow', element: 'tide', cost: 2, attack: 3, health: 2, text: 'Darts in unseen.' },
  { id: 'pebble', name: 'Pebble Guard', element: 'stone', cost: 2, attack: 1, health: 5, text: 'Never moves.' },
  { id: 'fox', name: 'Ember Fox', element: 'flame', cost: 3, attack: 4, health: 3, text: 'Chases warm light.' },
  { id: 'wolf', name: 'Bramble Wolf', element: 'leaf', cost: 3, attack: 3, health: 4, text: 'Runs the hedges.' },
  { id: 'gull', name: 'Storm Gull', element: 'tide', cost: 4, attack: 5, health: 3, text: 'Rides the sea wind.' },
  { id: 'bear', name: 'Granite Bear', element: 'stone', cost: 4, attack: 3, health: 7, text: 'Slow to wake.' },
  { id: 'chick', name: 'Phoenix Chick', element: 'flame', cost: 5, attack: 6, health: 4, text: 'Burns twice.' },
  { id: 'oak', name: 'Ancient Oak', element: 'leaf', cost: 5, attack: 4, health: 8, text: 'Older than lanterns.' },
  { id: 'burst', name: 'Ember Burst', element: 'flame', cost: 2, spell: 'burst', text: 'Deal 3 damage to any target.' },
  { id: 'mend', name: 'Lantern Mend', element: 'leaf', cost: 2, spell: 'mend', text: 'Restore 7 life.' },
  { id: 'wash', name: 'Tide Wash', element: 'tide', cost: 3, spell: 'wash', text: 'Deal 2 to all enemy creatures.' },
];

export const PALETTE = {
  backdrop: '#0e1420',
  table: '#17352a',
  tableEdge: '#0f241c',
  felt: '#1d4a38',
  panel: '#232c3d',
  panelEdge: '#3a4763',
  text: '#f2ede0',
  muted: '#a8b0bf',
  gold: '#f2c94c',
  ember: '#ff9a3c',
  life: '#e5534b',
  enemy: '#8a5a9e',
  player: '#4aa8dd',
  cardBack: '#5a3d7a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'ember-lantern-duel.best';
