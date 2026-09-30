import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkYearAnswer, filterEvents, makeOrderCycle, makeOrderQuestion, misplacedIds, uniqueYearCount } from '../src/logic.js';
import { addAnswer, clearHistory, loadState, saveState } from '../src/storage.js';

const data = JSON.parse(readFileSync(new URL('../data/reviewed.json', import.meta.url), 'utf8'));
const e = (id, year, categories = ['A'], importance = 3) => ({ id, year, categories, importance });

test('year answer accepts only the exact four-digit western year', () => {
  const event = e('a', 1946);
  assert.equal(checkYearAnswer('1946', event), true);
  for (const input of ['1947', '946', '１９４６', '1946 ', '19460']) assert.equal(checkYearAnswer(input, event), false);
});

test('ordering draws four distinct years, including a requested review anchor', () => {
  const pool = [e('a', 1945), e('b', 1945), e('c', 1946), e('d', 1947), e('f', 1948)];
  const question = makeOrderQuestion(pool, { anchorId: 'b', random: () => 0.25 });
  assert.equal(question.length, 4);
  assert.equal(uniqueYearCount(question), 4);
  assert.ok(question.some(event => event.id === 'b'));
  assert.equal(makeOrderQuestion(pool.slice(0, 4)), null);
  assert.ok(misplacedIds(question).length > 0);
  assert.deepEqual(misplacedIds([pool[2], pool[0], pool[3], pool[4]]), ['c', 'a']);
});

test('one ordering pass uses every event exactly once and keeps years distinct', () => {
  for (const pool of [data.events, data.events.filter(event => [3, 4].includes(event.importance)),
    [e('a', 1945), e('b', 1945), e('c', 1946), e('d', 1947), e('f', 1948)]]) {
    const rounds = makeOrderCycle(pool, () => 0.42);
    assert.ok(rounds);
    const ids = rounds.flat();
    assert.equal(ids.length, pool.length);
    assert.equal(new Set(ids).size, pool.length);
    assert.ok(rounds.every(round => round.length >= 2 && round.length <= 4));
    assert.ok(rounds.every(round => uniqueYearCount(round.map(id => pool.find(event => event.id === id))) === round.length));
  }
  assert.equal(makeOrderCycle([e('a', 1945), e('b', 1945), e('c', 1945), e('d', 1945), e('f', 1946), e('g', 1947), e('h', 1948)]), null);
});

test('category and importance filters include secondary categories without duplicate cards', () => {
  const pool = [e('a', 1945, ['A','B'], 3), e('b', 1946, ['B'], 1), e('c', 1947, ['A'], 2)];
  assert.deepEqual(filterEvents(pool, { categories: ['B'], importance: [2,3] }).map(x => x.id), ['a']);
  assert.deepEqual(filterEvents(pool, { categories: [], importance: [1,2,3,4] }), []);
  assert.deepEqual(filterEvents(pool, { categories: ['A','B'], importance: [] }), []);
});

test('history and mistaken event IDs persist and recover after reload', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key,value) => memory.set(key,value) };
  let state = loadState(storage, ['A','B']);
  state.settings.categories = ['B'];
  state = addAnswer(state, { mode: 'order', ids: ['a','b','c','d'], wrongIds: ['a','c'] });
  state.cycles.year = { key: 'scope', deck: [['a'], ['b']], cursor: 1 };
  assert.equal(saveState(storage, state), true);
  const loaded = loadState(storage, ['A','B']);
  assert.deepEqual(loaded.settings.categories, ['B']);
  assert.equal(loaded.history.length, 1);
  assert.deepEqual(Object.keys(loaded.mistakes).sort(), ['a','c']);
  assert.deepEqual(loaded.cycles.year, { key: 'scope', deck: [['a'], ['b']], cursor: 1 });
  const corrected = addAnswer(loaded, { mode: 'year', ids: ['a'], wrongIds: [] });
  assert.deepEqual(Object.keys(corrected.mistakes), ['c']);
  assert.deepEqual(clearHistory(corrected).cycles, {});
});

test('old default scope migrates to the easier four-level scope without losing history', () => {
  const old = JSON.stringify({
    settings: { categories: ['A'], importance: [2, 3] },
    history: [{ mode: 'year', ids: ['a'], correct: false }],
    mistakes: { a: 1 },
  });
  const storage = { getItem: () => old };
  const loaded = loadState(storage, ['A', 'B']);
  assert.deepEqual(loaded.settings.importance, [4, 3]);
  assert.equal(loaded.history.length, 1);
  assert.equal(loaded.mistakes.a, 1);
  assert.equal(loaded.settingsVersion, 2);
});

test('published data has 14 categories, no duplicate IDs, and evidence for every card', () => {
  const audit = JSON.parse(readFileSync(new URL('../data/review-audit.json', import.meta.url), 'utf8'));
  assert.equal(data.categories.length, 14);
  assert.equal(audit.candidateCount, 291);
  assert.equal(data.events.length - data.events.filter(event => event.id.startsWith('ext-')).length + audit.excluded.length, audit.candidateCount);
  assert.ok([1,2,3,4].every(importance => data.events.some(event => event.importance === importance)));
  assert.ok(data.events.filter(event => [4,3].includes(event.importance)).length >= 30);
  assert.equal(new Set(data.events.map(event => event.id)).size, data.events.length);
  assert.equal(new Set(data.events.map(event => event.title)).size, data.events.length);
  assert.ok(data.events.every(event => event.sourceUrl.startsWith('https://')));
  assert.ok(data.events.every(event => Number.isInteger(event.year) && event.year >= 1000 && event.year <= 9999));
  assert.ok(data.events.every(event => event.categories.every(category => data.categories.includes(category))));
  assert.equal(audit.addedFromLinkedReferences.length, 38);
  assert.equal(data.events.find(event => event.title === '沖縄の日本復帰')?.year, 1972);
  assert.equal(data.events.find(event => event.title === '大日本帝国憲法の施行')?.year, 1890);
  assert.equal(data.events.find(event => event.title === '日本による子どもの権利条約の批准')?.year, 1994);
});
