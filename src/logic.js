import { DEFAULT_LEVELS } from './levels.js';

export function defaultSettings(categories) {
  return { categories: [...categories], importance: [...DEFAULT_LEVELS] };
}

export function filterEvents(events, settings) {
  const categories = new Set(settings.categories);
  const importance = new Set(settings.importance);
  return events.filter(event =>
    importance.has(event.importance) && event.categories.some(category => categories.has(category))
  );
}

export function uniqueYearCount(events) {
  return new Set(events.map(event => event.year)).size;
}

export function checkYearAnswer(input, event) {
  return /^\d{4}$/.test(input) && Number(input) === event.year;
}

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Divide one full pass into rounds without repeating an event or a year within a round.
// A small final round is allowed so that every event appears before the next pass.
export function makeOrderCycle(events, random = Math.random) {
  if (events.length < 4 || uniqueYearCount(events) < 4) return null;
  const byYear = new Map();
  for (const event of shuffle(events, random)) {
    if (!byYear.has(event.year)) byYear.set(event.year, []);
    byYear.get(event.year).push(event);
  }
  const groups = shuffle([...byYear.values()], random).sort((a, b) => b.length - a.length);
  const roundCount = Math.max(Math.ceil(events.length / 4), groups[0].length);
  if (events.length < roundCount * 2) return null;

  const sizes = Array(roundCount).fill(2);
  let extra = events.length - roundCount * 2;
  for (let i = 0; i < sizes.length && extra > 0; i++) {
    const added = Math.min(2, extra);
    sizes[i] += added;
    extra -= added;
  }

  const source = 0, yearStart = 1, roundStart = yearStart + groups.length, sink = roundStart + roundCount;
  const graph = Array.from({ length: sink + 1 }, () => []);
  const addEdge = (from, to, capacity) => {
    const forward = { to, capacity, reverse: graph[to].length };
    const backward = { to: from, capacity: 0, reverse: graph[from].length };
    graph[from].push(forward);
    graph[to].push(backward);
    return forward;
  };
  const assignments = groups.map((group, yearIndex) => {
    addEdge(source, yearStart + yearIndex, group.length);
    return sizes.map((_, roundIndex) => addEdge(yearStart + yearIndex, roundStart + roundIndex, 1));
  });
  sizes.forEach((size, index) => addEdge(roundStart + index, sink, size));

  let assigned = 0;
  while (assigned < events.length) {
    const previous = Array(sink + 1).fill(null);
    const queue = [source];
    previous[source] = { from: -1 };
    for (let head = 0; head < queue.length && !previous[sink]; head++) {
      const from = queue[head];
      for (let index = 0; index < graph[from].length; index++) {
        const edge = graph[from][index];
        if (edge.capacity === 0 || previous[edge.to]) continue;
        previous[edge.to] = { from, index };
        queue.push(edge.to);
      }
    }
    if (!previous[sink]) return null;
    let capacity = Infinity;
    for (let at = sink; at !== source; at = previous[at].from) {
      const { from, index } = previous[at];
      capacity = Math.min(capacity, graph[from][index].capacity);
    }
    for (let at = sink; at !== source; at = previous[at].from) {
      const { from, index } = previous[at];
      const edge = graph[from][index];
      edge.capacity -= capacity;
      graph[at][edge.reverse].capacity += capacity;
    }
    assigned += capacity;
  }

  const rounds = sizes.map(() => []);
  groups.forEach((group, yearIndex) => assignments[yearIndex].forEach((edge, roundIndex) => {
    if (edge.capacity === 0) rounds[roundIndex].push(group.pop().id);
  }));
  return rounds;
}

export function makeOrderQuestion(events, { anchorId, size = 4, random = Math.random } = {}) {
  const anchor = anchorId ? events.find(event => event.id === anchorId) : undefined;
  const chosen = anchor ? [anchor] : [];
  const seenYears = new Set(chosen.map(event => event.year));
  for (const event of shuffle(events, random)) {
    if (chosen.length === size) break;
    if (seenYears.has(event.year)) continue;
    chosen.push(event);
    seenYears.add(event.year);
  }
  if (chosen.length < size) return null;
  const ordered = chosen.sort((a, b) => a.year - b.year);
  let presented = shuffle(ordered, random);
  if (presented.every((event, index) => event.id === ordered[index].id)) {
    presented = [...presented.slice(1), presented[0]];
  }
  return presented;
}

export function misplacedIds(presented) {
  const correct = [...presented].sort((a, b) => a.year - b.year);
  return presented.filter((event, index) => event.id !== correct[index].id).map(event => event.id);
}

export function moveItem(items, from, to) {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
