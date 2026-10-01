import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const data = JSON.parse(await readFile(new URL('../data/reviewed.json', import.meta.url), 'utf8'));
const events = new Map(data.events.map(event => [event.title, event]));
let server;
let browser;

try {
  let base = process.env.SEIKEI_TEST_URL;
  if (!base) {
    server = spawn(process.execPath, ['tools/serve.js'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, SEIKEI_PORT: '0' },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test server did not start')), 10000);
      let output = '';
      server.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`Test server exited ${code}`)); });
    });
  }
  browser = await webkit.launch({ headless: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: /年号暗記/ }).tap();
    const submit = page.locator('[data-action="submit-year"]');
    const submitHandle = await submit.elementHandle();
    const digitHandle = await page.locator('[data-key="1"]').elementHandle();
    const digits = () => page.locator('.digits').innerText();
    const count = () => page.evaluate(() => JSON.parse(localStorage.getItem('seikei-v1')).history.length);

    for (let i = 0; i < 3; i++) {
      await page.locator('[data-key="1"]').tap();
      assert.equal(await submit.isDisabled(), true, 'three digits cannot be submitted');
      assert.equal(await submitHandle.evaluate(el => el.isConnected), true, 'input must not replace the submit button during touch activation');
      assert.equal(await digitHandle.evaluate(el => el.isConnected), true, 'repeated taps keep the original keypad button');
    }
    await page.locator('[data-key="1"]').tap();
    assert.equal(await submit.isEnabled(), true);
    await page.locator('[data-key="9"]').tap();
    assert.equal((await digits()).replace(/\s/g, ''), '1111', 'a fifth digit is ignored');
    await page.locator('[data-key="⌫"]').tap();
    assert.equal(await submit.isDisabled(), true);
    await page.locator('[data-key="0"]').tap();
    assert.equal((await digits()).replace(/\s/g, ''), '1110');
    await page.locator('[data-key="消去"]').tap();
    assert.equal(await submit.isDisabled(), true);

    let event = events.get(await page.locator('.question-card h2').innerText());
    for (const digit of String(event.year)) await page.locator(`[data-key="${digit}"]`).tap();
    // Tap the nested arrow, as a user can tap anywhere inside the button.
    await submit.locator('span').tap();
    assert.match(await page.locator('.answer-feedback').innerText(), /正解！/);
    assert.equal(await page.locator('.success-feedback').count(), 1);
    assert.equal(await count(), 1, 'one tap records one answer');
    await page.getByRole('button', { name: /次の問題|もう一周/ }).tap();
    assert.equal(await page.locator('.success-feedback').count(), 0, 'feedback resets for the next question');
    assert.equal((await digits()).replace(/\s/g, ''), '····');

    for (const digit of '0000') await page.locator(`[data-key="${digit}"]`).tap();
    await page.locator('[data-action="submit-year"]').tap();
    assert.match(await page.locator('.answer-feedback').innerText(), /おしい！/);
    assert.equal(await page.locator('.success-feedback').count(), 0);
    assert.equal(await count(), 2);
    await page.getByRole('button', { name: /次の問題|もう一周/ }).tap();

    // iPad hardware-keyboard Enter must not activate the focused keypad too.
    event = events.get(await page.locator('.question-card h2').innerText());
    await page.locator('[data-key="1"]').focus();
    await page.keyboard.press('Enter');
    assert.equal((await digits()).replace(/\s/g, ''), '····');
    for (const digit of String(event.year)) await page.keyboard.press(digit);
    await page.keyboard.press('Enter');
    assert.match(await page.locator('.answer-feedback').innerText(), /正解！/);
    assert.equal(await count(), 3);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.success-feedback').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');

    await page.getByRole('button', { name: 'ホームに戻る' }).tap();
    await page.getByRole('button', { name: /年代整序/ }).tap();
    const ordered = (await page.locator('.order-title').allTextContents())
      .sort((a, b) => events.get(a).year - events.get(b).year);
    for (let target = 0; target < ordered.length; target++) {
      let index = (await page.locator('.order-title').allTextContents()).indexOf(ordered[target]);
      while (index > target) {
        await page.locator(`[data-move="up"][data-index="${index}"]`).tap();
        index--;
      }
    }
    await page.getByRole('button', { name: /この順番で回答/ }).tap();
    assert.match(await page.locator('.result-banner.correct').innerText(), /正解！/);
    assert.equal(await page.locator('.success-feedback').count(), 1);
    assert.equal(await count(), 4);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`WebKit touch flow passed at ${viewport.width}×${viewport.height}.`);
  }
} finally {
  await browser?.close();
  server?.kill();
}
