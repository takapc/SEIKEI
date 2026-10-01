import { checkYearAnswer, filterEvents, makeOrderCycle, makeOrderQuestion, misplacedIds, moveItem, shuffle, uniqueYearCount } from './logic.js';
import { addAnswer, clearHistory, loadState, saveState } from './storage.js';
import { LEVELS, levelLabel } from './levels.js';

const root = document.querySelector('#app');
const VERSION = '1.0.1';
const response = await fetch(new URL('../data/reviewed.json', import.meta.url));
if (!response.ok) throw new Error('出題データを読み込めませんでした');
const data = await response.json();
const byId = new Map(data.events.map(event => [event.id, event]));
let saved = loadState(localStorage, data.categories);
let view = 'home';
let session = null;
let question = null;
let input = '';
let submitted = false;
let storageWarning = false;

const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const eligible = () => filterEvents(data.events, saved.settings);
const answerCount = () => saved.history.length;
const errorCount = () => Object.keys(saved.mistakes).length;
const persist = () => { if (!saveState(localStorage, saved)) storageWarning = true; };
const cycleProgress = () => saved.cycles[session?.slot];
const completedCycle = () => cycleProgress()?.cursor === cycleProgress()?.deck.length;

function nav(title, eyebrow = '') {
  return `<header class="topbar"><button class="back" data-action="home" aria-label="ホームに戻る">←</button><div><small>${eyebrow}</small><h1>${title}</h1></div><span class="version">v${VERSION}</span></header>`;
}

function home() {
  const available = eligible().length;
  return `<main class="shell home">
    <header class="brand"><img class="brand-mark" src="./assets/seikei-icon.png" alt="" /><div class="brand-copy"><span>PUBLIC & ECONOMICS</span><h1>SEIKEI <small>v${VERSION}</small></h1></div></header>
    <section class="hero"><p class="eyebrow">YEAR × ORDER</p><h2>出来事を、<br><em>時間の流れ</em>で覚える。</h2><p>「公共」「政治・経済」の重要事項。<br>年号と前後関係を、すき間時間に。</p></section>
    <section class="mode-grid" aria-label="学習モード">
      <button class="mode-card year" data-action="start-year"><span class="mode-icon">01</span><span class="mode-body"><strong>年号暗記</strong><small>出来事から西暦4桁を答える</small></span><span class="arrow">↗</span></button>
      <button class="mode-card order" data-action="start-order"><span class="mode-icon">02</span><span class="mode-body"><strong>年代整序</strong><small>4つの出来事を古い順に</small></span><span class="arrow">↗</span></button>
    </section>
    <div class="home-actions"><button data-action="settings">学習範囲を設定 <span>→</span></button><button data-action="history">履歴・復習 <span>→</span></button></div>
    <p class="scope-note">現在の範囲：${available}件 · ${LEVELS.filter(level => saved.settings.importance.includes(level.value)).map(level => level.label).join('・') || 'レベル未選択'}</p>
  </main>`;
}

function settings() {
  const pool = eligible();
  return `<main class="shell">${nav('学習範囲', 'SETTINGS')}
    <div class="section-intro"><p>この設定は、2つのモードで共通やで。</p><strong>${pool.length}<span> 件が対象</span></strong></div>
    <section class="panel"><div class="panel-head"><h2>学習レベル</h2><span>複数選択</span></div><div class="importance-list">
    ${LEVELS.map(({value,label,description}) => `<label class="check-row"><input type="checkbox" data-importance="${value}" ${saved.settings.importance.includes(value)?'checked':''}><span class="fake-check">✓</span><span><strong>${label}</strong><small>${description}</small></span></label>`).join('')}
    </div></section>
    <section class="panel"><div class="panel-head"><h2>カテゴリ</h2><button class="text-button" data-action="toggle-all">${saved.settings.categories.length === data.categories.length ? 'すべて外す' : 'すべて選ぶ'}</button></div><div class="category-list">
    ${data.categories.map(category => `<label class="category-row"><input type="checkbox" data-category="${esc(category)}" ${saved.settings.categories.includes(category)?'checked':''}><span class="fake-check">✓</span><span>${esc(category)}</span></label>`).join('')}
    </div></section>
    ${pool.length === 0 ? `<div class="empty-inline">出題できる項目がないで。カテゴリと重要度を1つ以上選んでな。</div>` : ''}
    <button class="primary bottom-action" data-action="home">設定を保存して戻る</button>
  </main>`;
}

function history() {
  const recent = [...saved.history].reverse().slice(0, 10);
  const mistakes = Object.keys(saved.mistakes).map(id => byId.get(id)).filter(Boolean);
  return `<main class="shell">${nav('履歴・復習', 'YOUR PROGRESS')}
    <div class="stats"><div><strong>${answerCount()}</strong><span>回答</span></div><div><strong>${errorCount()}</strong><span>復習する出来事</span></div></div>
    <section class="panel"><div class="panel-head"><h2>間違えたものを復習</h2></div>
      ${mistakes.length ? `<p class="muted">復習開始時の一覧を固定して出題するで。年代整序では、間違えた出来事を含む新しい4件を作る。</p><div class="review-actions"><button class="secondary" data-action="review-year">年号で復習</button><button class="secondary" data-action="review-order">整序で復習</button></div><div class="mistake-list">${mistakes.slice(0, 12).map(event => `<div>${esc(event.title)}</div>`).join('')}${mistakes.length > 12 ? `<small>ほか ${mistakes.length-12}件</small>`:''}</div>` : `<p class="muted">まだ復習対象はないで。学習を始めてみよう。</p>`}
    </section>
    <section class="panel"><div class="panel-head"><h2>最近の回答</h2></div>${recent.length ? recent.map(item => `<div class="history-row"><span class="result-dot ${item.correct?'good':'bad'}"></span><div><strong>${item.mode === 'year' ? '年号暗記' : '年代整序'}</strong><small>${item.ids.map(id => byId.get(id)?.title).filter(Boolean).map(esc).join(' / ')}</small></div><span>${item.correct?'正解':'復習'}</span></div>`).join('') : '<p class="muted">回答履歴はまだないで。</p>'}</section>
    ${saved.history.length ? `<button class="danger-link" data-action="clear-history">履歴と復習対象を削除</button>` : ''}
  </main>`;
}

function start(mode, review = false) {
  const pool = eligible();
  const reviewIds = review ? Object.keys(saved.mistakes).filter(id => pool.some(event => event.id === id)) : [];
  const slot = `${review ? 'review-' : ''}${mode}`;
  const key = JSON.stringify([pool.map(event => event.id).sort(), [...reviewIds].sort()]);
  session = { mode, review, pool, reviewIds, slot, key, unavailableCycle: false };
  view = mode;
  nextQuestion();
}

function nextQuestion() {
  input = '';
  submitted = false;
  const { mode, review, pool, reviewIds, slot, key } = session;
  if (pool.length === 0 || (review && reviewIds.length === 0)) { question = null; render(); return; }
  if (mode === 'order' && uniqueYearCount(pool) < 4) { question = null; render(); return; }
  let cycle = saved.cycles[slot];
  if (!cycle || cycle.key !== key || cycle.cursor >= cycle.deck.length) {
    const reviewSet = new Set(reviewIds);
    const deck = mode === 'year'
      ? shuffle(review ? pool.filter(event => reviewSet.has(event.id)) : pool).map(event => [event.id])
      : makeOrderCycle(pool)?.filter(ids => !review || ids.some(id => reviewSet.has(id)));
    if (!deck?.length) { session.unavailableCycle = true; question = null; render(); return; }
    session.unavailableCycle = false;
    cycle = { key, deck, cursor: 0 };
  }
  const ids = cycle.deck[cycle.cursor];
  saved = { ...saved, cycles: { ...saved.cycles, [slot]: { ...cycle, cursor: cycle.cursor + 1 } } };
  question = mode === 'order'
    ? makeOrderQuestion(ids.map(id => byId.get(id)), { size: ids.length })
    : byId.get(ids[0]);
  persist();
  render();
  window.scrollTo(0, 0);
}

function noQuestion() {
  const count = session.pool.length;
  const years = uniqueYearCount(session.pool);
  const message = count === 0 ? '今の学習範囲には、出題できる出来事がないで。' : session.review && !session.reviewIds.length ? '今の範囲に復習対象はないで。' : session.unavailableCycle ? '同じ出来事を繰り返さずに年代整序を一巡できへん範囲やで。' : `年代整序には、異なる年の出来事が4件必要やで。今は${count}件・異なる年は${years}年分。`;
  return `<main class="shell">${nav(session.mode === 'year'?'年号暗記':'年代整序', session.review?'REVIEW':'PRACTICE')}<div class="empty-state"><span>◇</span><h2>${message}</h2><p>学習範囲のカテゴリや重要度を増やしてみてな。</p><button class="primary" data-action="settings">学習範囲を設定</button><button class="plain" data-action="home">ホームに戻る</button></div></main>`;
}

function yearQuiz() {
  if (!question) return noQuestion();
  const correct = submitted && checkYearAnswer(input, question);
  return `<main class="shell quiz-shell">${nav('年号暗記', session.review?'REVIEW':'PRACTICE')}
    <div class="quiz-meta"><span>${session.review?'間違えたものを復習':'出来事を見て、西暦を入力'}</span><span>${levelLabel(question.importance)} · ${cycleProgress().cursor}/${cycleProgress().deck.length}</span></div>
    <section class="question-card ${correct ? 'answer-correct' : ''}"><span class="question-label">この出来事は何年？</span><h2>${esc(question.title)}</h2><div class="chips">${question.categories.map(c=>`<span>${esc(c)}</span>`).join('')}</div></section>
    <section class="answer-zone"><div class="digits" aria-label="入力した西暦">${[0,1,2,3].map(i=>`<span class="${input[i]?'filled':''}">${input[i] || '·'}</span>`).join('')}</div><div class="answer-feedback" aria-live="polite">${submitted ? `<strong class="${correct?'positive success-feedback':'negative'}">${correct?'正解！':'おしい！'}</strong><span>正しい西暦は <b>${question.year}年</b></span><a href="${esc(question.sourceUrl)}" target="_blank" rel="noopener noreferrer">確認資料 ↗</a>` : `<span>4桁で答えてな</span>`}</div></section>
    <div class="keypad" aria-label="数字キー">${['1','2','3','4','5','6','7','8','9','消去','0','⌫'].map(key=>`<button data-key="${key}" ${submitted?'disabled':''} aria-label="${key==='⌫'?'一文字削除':key}">${key}</button>`).join('')}</div>
    <div class="quiz-action">${submitted ? `<button class="primary" data-action="next">${completedCycle()?'もう一周':'次の問題'} <span>→</span></button>` : `<button class="primary" data-action="submit-year" ${input.length!==4?'disabled':''}>回答する <span>→</span></button>`}</div>
  </main>`;
}

function orderQuiz() {
  if (!question) return noQuestion();
  const wrong = submitted ? misplacedIds(question) : [];
  const ordered = [...question].sort((a,b)=>a.year-b.year);
  return `<main class="shell quiz-shell order-shell">${nav('年代整序', session.review?'REVIEW':'PRACTICE')}
    <div class="quiz-meta"><span>${session.review?'間違えた出来事を含む新しい問題':'出来事を古い順に'}</span><span>${cycleProgress().cursor}/${cycleProgress().deck.length} 問目</span></div>
    <div class="order-instruction"><span class="timeline-dot"></span><p>上が古く、下が新しい順に並べてな。<br><small>≡ をドラッグ、または矢印で移動</small></p></div>
    <div class="order-list">${question.map((event,index)=>`<article class="order-card" data-index="${index}"><span class="order-number">${String(index+1).padStart(2,'0')}</span><span class="order-title">${esc(event.title)}</span><div class="order-controls"><button data-move="up" data-index="${index}" ${submitted||index===0?'disabled':''} aria-label="${esc(event.title)}を上へ">↑</button><button data-move="down" data-index="${index}" ${submitted||index===question.length-1?'disabled':''} aria-label="${esc(event.title)}を下へ">↓</button></div><button class="drag-handle" data-drag="${index}" ${submitted?'disabled':''} aria-label="${esc(event.title)}をドラッグ">≡</button></article>`).join('')}</div>
    <div class="order-result" aria-live="polite">${submitted ? `<div class="result-banner ${wrong.length?'incorrect':'correct'}"><strong class="${wrong.length ? '' : 'success-feedback'}">${wrong.length?'順番を確認しよう':'正解！'}</strong><span>${wrong.length?`${wrong.length}件の位置が違っていたで`:'全部合ってるで'}</span></div><h3>正しい年表</h3><ol class="timeline">${ordered.map(event=>`<li><strong>${event.year}</strong><span>${esc(event.title)}</span></li>`).join('')}</ol>` : ''}</div>
    <div class="quiz-action">${submitted ? `<button class="primary" data-action="next">${completedCycle()?'もう一周':'次の問題'} <span>→</span></button>` : `<button class="primary" data-action="submit-order">この順番で回答 <span>→</span></button>`}</div>
  </main>`;
}

function updateYearInput() {
  // Keep the tapped controls mounted: replacing the whole page while typing
  // can interrupt touch activation and loses the keyboard focus on iOS.
  root.querySelectorAll('.digits span').forEach((digit, index) => {
    digit.textContent = input[index] || '·';
    digit.classList.toggle('filled', Boolean(input[index]));
  });
  const submit = root.querySelector('[data-action="submit-year"]');
  if (submit) submit.disabled = input.length !== 4;
}

function render() {
  root.innerHTML = (view === 'home' ? home() : view === 'settings' ? settings() : view === 'history' ? history() : view === 'year' ? yearQuiz() : orderQuiz()) + (storageWarning ? '<div class="storage-warning">端末の保存領域が使えへんため、この回の履歴は保存されていません。</div>' : '');
  if (view === 'order' && question && !submitted) attachDrag();
}

root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'home') { view='home'; session=null; render(); }
  if (action === 'settings') { view='settings'; render(); }
  if (action === 'history') { view='history'; render(); }
  if (action === 'start-year') start('year');
  if (action === 'start-order') start('order');
  if (action === 'review-year') start('year', true);
  if (action === 'review-order') start('order', true);
  if (action === 'toggle-all') { saved.settings.categories = saved.settings.categories.length === data.categories.length ? [] : [...data.categories]; persist(); render(); }
  if (action === 'clear-history' && window.confirm('回答履歴と復習対象をすべて削除する？')) { saved=clearHistory(saved); persist(); render(); }
  if (action === 'next') nextQuestion();
  if (action === 'submit-year' && input.length === 4 && !submitted) {
    submitted=true;
    saved=addAnswer(saved,{mode:'year',ids:[question.id],wrongIds:checkYearAnswer(input,question)?[]:[question.id]});
    persist(); render();
  }
  if (action === 'submit-order' && !submitted) {
    submitted=true;
    saved=addAnswer(saved,{mode:'order',ids:question.map(e=>e.id),wrongIds:misplacedIds(question)});
    persist(); render();
  }
  if (button.dataset.key && !submitted) {
    const key=button.dataset.key;
    input=key==='消去'?'':key==='⌫'?input.slice(0,-1):input.length<4?input+key:input;
    updateYearInput();
  }
  if (button.dataset.move && !submitted) {
    const from=Number(button.dataset.index), to=from+(button.dataset.move==='up'?-1:1);
    question=moveItem(question,from,to); render();
  }
});

root.addEventListener('change', event => {
  const inputEl=event.target;
  if (inputEl.dataset.category) {
    const set=new Set(saved.settings.categories);
    inputEl.checked?set.add(inputEl.dataset.category):set.delete(inputEl.dataset.category);
    saved.settings.categories=data.categories.filter(c=>set.has(c));
  } else if (inputEl.dataset.importance) {
    const n=Number(inputEl.dataset.importance), set=new Set(saved.settings.importance);
    inputEl.checked?set.add(n):set.delete(n);
    saved.settings.importance=LEVELS.map(level=>level.value).filter(i=>set.has(i));
  } else return;
  persist(); render();
});

document.addEventListener('keydown', event => {
  if (view !== 'year' || submitted || !question || event.isComposing
    || event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    if (input.length < 4) input += event.key;
    updateYearInput();
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    input = input.slice(0, -1);
    updateYearInput();
  } else if (event.key === 'Enter') {
    // Prevent the focused keypad button or the newly rendered next button
    // from receiving the browser's additional native keyboard click.
    event.preventDefault();
    if (input.length === 4) root.querySelector('[data-action="submit-year"]')?.click();
  }
});

function attachDrag() {
  root.querySelectorAll('[data-drag]').forEach(handle => {
    handle.addEventListener('pointerdown', event => {
      const from=Number(handle.dataset.drag), card=handle.closest('.order-card');
      const initialY=event.clientY;
      handle.setPointerCapture(event.pointerId);
      card.classList.add('dragging');
      const move = e => { card.style.transform=`translateY(${e.clientY-initialY}px)`; };
      const end = e => {
        handle.removeEventListener('pointermove',move);
        handle.removeEventListener('pointerup',end);
        handle.removeEventListener('pointercancel',end);
        card.classList.remove('dragging'); card.style.transform='';
        const rows=[...root.querySelectorAll('.order-card')];
        const to=rows.reduce((best,row,index) => Math.abs(row.getBoundingClientRect().top+row.offsetHeight/2-e.clientY) < Math.abs(rows[best].getBoundingClientRect().top+rows[best].offsetHeight/2-e.clientY) ? index : best, 0);
        if (to!==from) { question=moveItem(question,from,to); render(); }
      };
      handle.addEventListener('pointermove',move);
      handle.addEventListener('pointerup',end);
      handle.addEventListener('pointercancel',end);
    });
  });
}

render();
