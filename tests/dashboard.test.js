import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const stateFile = join(root, `dashboard-test-${process.pid}.json`);

test('local dashboard serves live facts and saves tasks, answers, reviews and test results', async () => {
  const child = spawn(process.execPath, ['tools/serve.js'], {
    cwd: root,
    env: { ...process.env, SEIKEI_PORT: '0', SEIKEI_STATE_FILE: stateFile },
    windowsHide: true,
  });
  let output = '';
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 10000);
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
    });
    child.on('error', reject);
    child.on('exit', code => reject(new Error(`Server exited ${code}: ${output}`)));
  });
  const call = async (path, method = 'GET', body, headers = {}) => {
    const response = await fetch(base + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  try {
    assert.equal((await fetch(base + '/dashboard/')).status, 200);
    assert.equal((await fetch(base + '/README.md')).status, 404);
    const before = await call('/api/dashboard');
    assert.ok(before.data.facts.eventCount > 0);
    assert.equal(before.data.state.tasks.length, 0);
    assert.equal((await call('/api/dashboard/tasks', 'POST', { title: '外部' }, { origin: 'https://example.org' })).status, 403);

    const task = (await call('/api/dashboard/tasks', 'POST', { title: 'ローカル画面', status: 'doing' })).data;
    assert.equal((await call(`/api/dashboard/tasks/${task.id}`, 'PATCH', { status: 'done' })).data.status, 'done');
    const question = (await call('/api/dashboard/questions', 'POST', { question: '確認したいこと' })).data;
    assert.equal((await call(`/api/dashboard/questions/${question.id}/answer`, 'POST', { answer: '確認した' })).data.answer, '確認した');
    const review = (await call('/api/dashboard/reviews', 'POST', { target: '画面', note: '読みやすい' })).data;
    assert.equal((await call(`/api/dashboard/reviews/${review.id}`, 'PATCH', { status: 'resolved' })).data.status, 'resolved');

    assert.equal((await call('/api/dashboard/tests', 'POST', {})).status, 202);
    let final;
    for (let attempt = 0; attempt < 60; attempt++) {
      final = (await call('/api/dashboard')).data;
      if (!final.testRunning && final.state.testRun) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(final.state.testRun?.passed, true);
    assert.equal(final.state.tasks[0].status, 'done');
    assert.equal(final.state.questions[0].answer, '確認した');
    assert.equal(final.state.reviews[0].status, 'resolved');
    assert.equal(JSON.parse(await readFile(stateFile, 'utf8')).tasks.length, 1);
  } finally {
    child.kill();
    await unlink(stateFile).catch(() => {});
  }
});
