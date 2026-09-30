import { DEFAULT_LEVELS } from './levels.js';
const KEY = 'seikei-v1';

export function loadState(storage, categories) {
  const fresh = {
    settings: { categories: [...categories], importance: [...DEFAULT_LEVELS] },
    settingsVersion: 2,
    history: [],
    mistakes: {},
    cycles: {},
  };
  try {
    const saved = JSON.parse(storage.getItem(KEY));
    if (!saved || typeof saved !== 'object') return fresh;
    if (Array.isArray(saved.settings?.categories)) {
      fresh.settings.categories = saved.settings.categories.filter(c => categories.includes(c));
    }
    if (Array.isArray(saved.settings?.importance)) {
      const old = saved.settings.importance.filter(i => [1, 2, 3, 4].includes(i));
      if (saved.settingsVersion === 2) {
        fresh.settings.importance = [4, 3, 2, 1].filter(i => old.includes(i));
      } else if (old.length === 2 && old.includes(2) && old.includes(3)) {
        // The v1 default was 3+2. Make the new, easier default 4+3.
        fresh.settings.importance = [...DEFAULT_LEVELS];
      } else {
        const mapped = new Set(old.flatMap(i => i === 3 ? [4, 3] : [i]));
        fresh.settings.importance = [4, 3, 2, 1].filter(i => mapped.has(i));
      }
    }
    if (Array.isArray(saved.history)) fresh.history = saved.history.slice(-200);
    if (saved.mistakes && typeof saved.mistakes === 'object' && !Array.isArray(saved.mistakes)) {
      fresh.mistakes = Object.fromEntries(Object.entries(saved.mistakes).filter(([, count]) => Number.isInteger(count) && count > 0));
    }
    if (saved.cycles && typeof saved.cycles === 'object' && !Array.isArray(saved.cycles)) {
      for (const slot of ['year', 'order', 'review-year', 'review-order']) {
        const cycle = saved.cycles[slot];
        if (typeof cycle?.key === 'string' && Array.isArray(cycle.deck)
          && cycle.deck.every(round => Array.isArray(round) && round.every(id => typeof id === 'string'))
          && Number.isInteger(cycle.cursor) && cycle.cursor >= 0 && cycle.cursor <= cycle.deck.length) {
          fresh.cycles[slot] = cycle;
        }
      }
    }
  } catch { /* Unavailable or damaged local storage: use safe defaults. */ }
  return fresh;
}

export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function addAnswer(state, { mode, ids, wrongIds }) {
  const wrong = new Set(wrongIds);
  const mistakes = { ...state.mistakes };
  for (const id of ids) {
    if (wrong.has(id)) mistakes[id] = (mistakes[id] || 0) + 1;
    else delete mistakes[id];
  }
  return {
    ...state,
    mistakes,
    history: [...state.history, { mode, ids: [...ids], correct: wrong.size === 0 }].slice(-200),
  };
}

export function clearHistory(state) {
  return { ...state, history: [], mistakes: {}, cycles: {} };
}
