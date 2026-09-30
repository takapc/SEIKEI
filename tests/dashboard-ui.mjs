import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const stateFile = join(process.cwd(), `dashboard-ui-${process.pid}.json`);
const child = spawn(process.execPath, ['tools/serve.js'], {
  cwd: process.cwd(),
  env: { ...process.env, SEIKEI_PORT: '0', SEIKEI_STATE_FILE: stateFile },
  windowsHide: true,
});
let browser;
try {
  const base = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Server did not start')), 10000);
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
    });
    child.on('error', reject);
  });
  browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/dashboard/');
  await page.getByRole('heading', { name: /開発ダッシュボード/ }).waitFor();
  await page.getByPlaceholder('新しいタスクを追加').fill('ダッシュボードの動作確認');
  await page.getByRole('button', { name: '追加 +' }).click();
  await page.locator('[data-task-status]').selectOption('done');
  await page.locator('.add-question summary').click();
  await page.locator('#question-input').fill('画面は読みやすい？');
  await page.getByRole('button', { name: '質問を保存' }).click();
  await page.locator('[data-answer-form] textarea').fill('読みやすい');
  await page.getByRole('button', { name: '回答する' }).click();
  await page.locator('#review-target').fill('ホーム');
  await page.locator('#review-note').fill('画面を確認した');
  await page.getByRole('button', { name: /レビューを保存/ }).click();
  await page.getByRole('button', { name: '対応済みにする' }).click();
  assert.match(await page.locator('#task-meta').innerText(), /1件/);
  assert.match(await page.locator('#question-meta').innerText(), /回答済み 1/);
  assert.match(await page.locator('#reviews').innerText(), /対応済み/);
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('Dashboard browser flow passed; desktop and mobile screenshots saved.');
} finally {
  await browser?.close();
  child.kill();
  await unlink(stateFile).catch(() => {});
}
