import { createServer } from 'node:http';
import { readFile, readdir, stat, writeFile, rename } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve, relative, sep } from 'node:path';

const root = process.cwd();
const stateFile = process.env.SEIKEI_STATE_FILE || join(root, 'dashboard-state.json');
const port = Number(process.env.SEIKEI_PORT || 4173);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const initialState = { version: 1, tasks: [], questions: [], reviews: [], testRun: null, updatedAt: null };
let writeQueue = Promise.resolve();
let testRunning = false;

const sendJson = (response, status, data) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(data));
};
const fail = (response, status, message) => sendJson(response, status, { error: message });
const now = () => new Date().toISOString();
const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

async function loadState() {
  try { return JSON.parse(await readFile(stateFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return structuredClone(initialState); throw error; }
}

async function saveState(state) {
  state.updatedAt = now();
  const temp = `${stateFile}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2) + '\n');
  await rename(temp, stateFile);
}

function mutate(operation) {
  const work = writeQueue.then(async () => {
    const state = await loadState();
    const result = operation(state);
    await saveState(state);
    return result;
  });
  writeQueue = work.catch(() => {});
  return work;
}

async function bodyOf(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 32768) throw new Error('入力が長すぎます');
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw new Error('JSONの形式が正しくありません'); }
}

async function dashboardSnapshot() {
  const [state, reviewed, audit, names] = await Promise.all([
    loadState(),
    readFile(join(root, 'data', 'reviewed.json'), 'utf8').then(JSON.parse),
    readFile(join(root, 'data', 'review-audit.json'), 'utf8').then(JSON.parse),
    readdir(join(root, 'artifacts')).catch(() => []),
  ]);
  const artifacts = (await Promise.all(names.filter(name => /\.(png|jpe?g)$/i.test(name)).map(async name => {
    const file = join(root, 'artifacts', name);
    const info = await stat(file);
    return { name, url: `/artifacts/${encodeURIComponent(name)}`, updatedAt: info.mtime.toISOString() };
  }))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const appFiles = ['index.html', 'src/app.js', 'src/styles.css', 'data/reviewed.json'];
  const appUpdatedAt = (await Promise.all(appFiles.map(name => stat(join(root, name)).then(info => info.mtime.toISOString())))).sort().at(-1);
  return { state, facts: { eventCount: reviewed.events.length, categoryCount: reviewed.categories.length, excludedCount: audit.excludedCount, appUpdatedAt, artifacts }, testRunning };
}

async function runTests() {
  testRunning = true;
  const startedAt = now();
  try {
    const result = await new Promise(resolveResult => {
      const child = spawn(process.execPath, ['--test', 'tests/logic.test.js'], { cwd: root, windowsHide: true });
      let output = '';
      const collect = chunk => { output = (output + chunk.toString()).slice(-10000); };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.on('error', error => resolveResult({ passed: false, output: error.message }));
      child.on('close', code => resolveResult({ passed: code === 0, output }));
    });
    await mutate(state => { state.testRun = { ...result, startedAt, finishedAt: now() }; });
  } finally { testRunning = false; }
}

async function handleApi(request, response, pathname) {
  if (request.method === 'GET' && pathname === '/api/dashboard') {
    return sendJson(response, 200, await dashboardSnapshot());
  }
  if (!['POST', 'PATCH'].includes(request.method)) return fail(response, 405, 'この操作は使えません');
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin && new URL(origin).host !== host) return fail(response, 403, '別サイトからの書き込みはできません');
  if (!/^application\/json\b/i.test(request.headers['content-type'] || '')) return fail(response, 415, 'JSONを送ってください');
  let body;
  try { body = await bodyOf(request); } catch (error) { return fail(response, 400, error.message); }

  if (request.method === 'POST' && pathname === '/api/dashboard/tests') {
    if (testRunning) return fail(response, 409, 'テストを実行中です');
    void runTests().catch(error => console.error('Test run failed:', error));
    return sendJson(response, 202, { running: true });
  }
  try {
    const result = await mutate(state => {
      if (request.method === 'POST' && pathname === '/api/dashboard/tasks') {
        const title = text(body.title, 200);
        if (!title) throw new Error('タスク名を入力してください');
        const task = { id: `D${state.tasks.length + 1}`, title, status: ['todo', 'doing', 'done', 'blocked'].includes(body.status) ? body.status : 'todo', blocker: text(body.blocker, 300), updatedAt: now() };
        state.tasks.unshift(task); return task;
      }
      const taskMatch = pathname.match(/^\/api\/dashboard\/tasks\/([^/]+)$/);
      if (request.method === 'PATCH' && taskMatch) {
        const task = state.tasks.find(item => item.id === taskMatch[1]);
        if (!task) throw new Error('タスクが見つかりません');
        if (body.title !== undefined) task.title = text(body.title, 200) || task.title;
        if (body.status !== undefined) {
          if (!['todo', 'doing', 'done', 'blocked'].includes(body.status)) throw new Error('状態が正しくありません');
          task.status = body.status;
        }
        if (body.blocker !== undefined) task.blocker = text(body.blocker, 300);
        task.updatedAt = now(); return task;
      }
      if (request.method === 'POST' && pathname === '/api/dashboard/questions') {
        const question = text(body.question, 500);
        if (!question) throw new Error('質問を入力してください');
        const item = { id: id('q'), question, urgency: ['normal', 'high'].includes(body.urgency) ? body.urgency : 'normal', defaultAction: text(body.defaultAction, 300), answer: '', createdAt: now(), answeredAt: null };
        state.questions.unshift(item); return item;
      }
      const answerMatch = pathname.match(/^\/api\/dashboard\/questions\/([^/]+)\/answer$/);
      if (request.method === 'POST' && answerMatch) {
        const item = state.questions.find(question => question.id === answerMatch[1]);
        if (!item) throw new Error('質問が見つかりません');
        const answer = text(body.answer, 1000);
        if (!answer) throw new Error('回答を入力してください');
        item.answer = answer; item.answeredAt = now(); return item;
      }
      if (request.method === 'POST' && pathname === '/api/dashboard/reviews') {
        const note = text(body.note, 1000);
        if (!note) throw new Error('レビューを入力してください');
        const item = { id: id('r'), target: text(body.target, 200) || 'アプリ全体', note, status: 'open', createdAt: now(), resolvedAt: null };
        state.reviews.unshift(item); return item;
      }
      const reviewMatch = pathname.match(/^\/api\/dashboard\/reviews\/([^/]+)$/);
      if (request.method === 'PATCH' && reviewMatch) {
        const item = state.reviews.find(review => review.id === reviewMatch[1]);
        if (!item) throw new Error('レビューが見つかりません');
        if (!['open', 'resolved'].includes(body.status)) throw new Error('状態が正しくありません');
        item.status = body.status; item.resolvedAt = item.status === 'resolved' ? now() : null; return item;
      }
      throw new Error('操作が見つかりません');
    });
    return sendJson(response, 200, result);
  } catch (error) { return fail(response, 400, error.message); }
}

async function handleStatic(response, pathname) {
  const name = pathname === '/' ? 'index.html' : pathname === '/dashboard/' || pathname === '/dashboard' ? 'dashboard/index.html' : pathname.slice(1);
  const file = resolve(root, name);
  const rel = relative(root, file);
  const first = rel.split(sep)[0];
  if (rel.startsWith('..') || rel === '' || !['index.html', 'manifest.webmanifest', 'src', 'data', 'dashboard', 'artifacts', 'assets'].includes(first) || rel === join('dashboard', 'state.json')) {
    response.writeHead(404).end(); return;
  }
  if (first === 'artifacts' && !/\.(png|jpe?g)$/i.test(rel)) { response.writeHead(404).end(); return; }
  if (first === 'assets' && rel !== join('assets', 'seikei-icon.png')) { response.writeHead(404).end(); return; }
  if (first === 'data' && !['reviewed.json', 'review-audit.json'].includes(rel.split(sep)[1])) { response.writeHead(404).end(); return; }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    response.writeHead(200, { 'content-type': `${types[extname(file)] || 'application/octet-stream'}${['.html', '.css', '.js', '.json', '.webmanifest'].includes(extname(file)) ? '; charset=utf-8' : ''}`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/dashboard')) return await handleApi(request, response, pathname);
    if (request.method !== 'GET') return response.writeHead(405).end();
    await handleStatic(response, pathname);
  } catch (error) { console.error(error); fail(response, 500, 'サーバーでエラーが起きました'); }
});
server.listen(port, '127.0.0.1', () => {
  const actualPort = server.address().port;
  console.log(`SEIKEI → http://127.0.0.1:${actualPort} / dashboard → http://127.0.0.1:${actualPort}/dashboard/`);
});
