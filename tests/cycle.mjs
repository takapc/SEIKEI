import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const url = 'http://127.0.0.1:4173';

async function setScope(category, importance) {
  await page.goto(url);
  await page.evaluate(({ category, importance }) => {
    localStorage.setItem('seikei-v1', JSON.stringify({
      settings: { categories: [category], importance: [importance] },
      settingsVersion: 2, history: [], mistakes: {}, cycles: {},
    }));
  }, { category, importance });
  await page.reload();
}

await setScope('国際経済', 4);
const yearTitles = [];
for (let index = 0; index < 4; index++) {
  await page.getByRole('button', { name: /年号暗記/ }).click();
  yearTitles.push(await page.locator('.question-card h2').innerText());
  await page.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.reload();
}
assert.equal(new Set(yearTitles).size, 4, 'a card may appear only once per year pass, even after reload');
await page.getByRole('button', { name: /年号暗記/ }).click();
assert.ok(yearTitles.includes(await page.locator('.question-card h2').innerText()), 'the next pass may repeat');

await setScope('日本国憲法・基本的人権', 2);
const orderTitles = [];
for (let index = 0; index < 2; index++) {
  await page.getByRole('button', { name: /年代整序/ }).click();
  const titles = await page.locator('.order-title').allInnerTexts();
  assert.equal(titles.length, index === 0 ? 4 : 2);
  orderTitles.push(...titles);
  if (index === 1) assert.equal(await page.locator('[data-move="down"]').last().isDisabled(), true);
  await page.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.reload();
}
assert.equal(new Set(orderTitles).size, 6, 'ordering rounds must not reuse a card before all six appear');
assert.deepEqual(errors, []);
await browser.close();
console.log('Cycle UI flow passed across reloads.');
