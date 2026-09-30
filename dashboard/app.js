const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateLabel = value => value ? new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'まだなし';
const statusLabel = { todo: 'todo', doing: 'doing', done: 'done', blocked: 'blocked' };
let snapshot;
let noticeTimer;
let lastAppUpdatedAt;

function notice(message, error = false) {
  const node = $('#notice');
  node.textContent = message;
  node.className = `notice${error ? ' error' : ''}`;
  node.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { node.hidden = true; }, 4000);
}

async function api(path, method = 'GET', data) {
  const response = await fetch(path, { method, headers: data === undefined ? {} : { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '通信に失敗しました');
  return result;
}

function metric(label, value, detail, tone = '', progress = null) {
  return `<article class="metric"><p class="metric-label">${label}</p><div class="metric-value ${tone}">${escapeHtml(value)}</div><p class="metric-detail">${escapeHtml(detail)}</p>${progress === null ? '' : `<div class="meter"><span style="width:${Math.max(0, Math.min(100, progress))}%"></span></div>`}</article>`;
}

function render(data) {
  snapshot = data;
  const { state, facts } = data;
  if (lastAppUpdatedAt && lastAppUpdatedAt !== facts.appUpdatedAt) {
    $('#app-preview').src = `/?updated=${encodeURIComponent(facts.appUpdatedAt)}`;
  }
  lastAppUpdatedAt = facts.appUpdatedAt;
  const done = state.tasks.filter(task => task.status === 'done').length;
  const doing = state.tasks.filter(task => task.status === 'doing').length;
  const blocked = state.tasks.filter(task => task.status === 'blocked').length;
  const openQuestions = state.questions.filter(question => !question.answeredAt);
  const openReviews = state.reviews.filter(review => review.status === 'open');
  const test = state.testRun;

  $('#metrics').innerHTML = [
    metric('タスクの進捗', `${done} / ${state.tasks.length}`, `doing ${doing} · todo ${state.tasks.length - done - doing - blocked} · blocked ${blocked}`, '', state.tasks.length ? done / state.tasks.length * 100 : 0),
    metric('進行中', String(doing), blocked ? `${blocked}件がブロック中` : 'ブロックなし', blocked ? 'warn' : ''),
    metric('未回答の質問', String(openQuestions.length), `回答済み ${state.questions.length - openQuestions.length}`, openQuestions.length ? 'warn' : ''),
    metric('未対応のレビュー', String(openReviews.length), `対応済み ${state.reviews.length - openReviews.length}`, openReviews.length ? 'warn' : ''),
    metric('テスト', data.testRunning ? '実行中' : test ? test.passed ? '成功' : '失敗' : '未実行', test ? `最終実行 ${dateLabel(test.finishedAt)}` : 'ボタンから実行できます', test?.passed ? 'good' : test ? 'warn' : ''),
    metric('収録済みカード', String(facts.eventCount), '資料を確認して採用した出来事'),
    metric('学習カテゴリ', String(facts.categoryCount), '公共・政治経済の分類'),
    metric('保留した候補', String(facts.excludedCount), '監査ファイルに理由を記録'),
  ].join('');

  $('#task-meta').textContent = `${state.tasks.length}件 · 更新 ${dateLabel(state.updatedAt)}`;
  $('#tasks').innerHTML = state.tasks.length ? state.tasks.map(task => `<tr><td class="task-id">${escapeHtml(task.id)}</td><td><select class="status-select ${task.status}" data-task-status="${escapeHtml(task.id)}" aria-label="${escapeHtml(task.title)}の状態">${Object.entries(statusLabel).map(([value, label]) => `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></td><td class="task-title">${escapeHtml(task.title)}<div class="task-mobile-blocker"><button class="small-button ${task.blocker ? 'blocker' : ''}" data-edit-blocker="${escapeHtml(task.id)}">blocker: ${task.blocker ? escapeHtml(task.blocker) : 'なし · 追加'}</button></div></td><td><button class="small-button ${task.blocker ? 'blocker' : ''}" data-edit-blocker="${escapeHtml(task.id)}">${task.blocker ? escapeHtml(task.blocker) : '— 追加'}</button></td></tr>`).join('') : '<tr><td colspan="4" class="empty">まだタスクはないで。下の欄から追加してな。</td></tr>';

  $('#question-meta').textContent = `未回答 ${openQuestions.length} · 回答済み ${state.questions.length - openQuestions.length}`;
  $('#questions').innerHTML = openQuestions.length ? openQuestions.map(question => `<article class="question-card"><div class="question-top"><strong>${escapeHtml(question.question)}</strong><span>${question.urgency === 'high' ? '● 高' : '通常'}</span></div><p class="question-meta">${escapeHtml(question.id)} · ${dateLabel(question.createdAt)}${question.defaultAction ? ` · 回答がない場合: ${escapeHtml(question.defaultAction)}` : ''}</p><form class="answer-form" data-answer-form="${escapeHtml(question.id)}"><label class="sr-only" for="answer-${escapeHtml(question.id)}">回答</label><textarea id="answer-${escapeHtml(question.id)}" name="answer" placeholder="ここで回答を入力" rows="1" maxlength="1000" required></textarea><button class="button dark" type="submit">回答する</button></form></article>`).join('') : '<p class="empty">今は未回答の質問はないで。</p>';

  $('#artifact-meta').textContent = `アプリ更新 ${dateLabel(facts.appUpdatedAt)}`;
  $('#artifacts').innerHTML = facts.artifacts.length ? facts.artifacts.map(item => { const url = `${item.url}?updated=${encodeURIComponent(item.updatedAt)}`; return `<a class="artifact-item" href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="" loading="lazy"><span><strong>${escapeHtml(item.name)}</strong><small>${dateLabel(item.updatedAt)}</small></span></a>`; }).join('') : '<p class="empty">保存済みの画像はまだないで。</p>';

  $('#review-meta').textContent = `未対応 ${openReviews.length}`;
  $('#reviews').innerHTML = state.reviews.length ? state.reviews.map(review => `<article class="review-item ${review.status === 'resolved' ? 'resolved' : ''}"><div class="review-item-head"><strong>${escapeHtml(review.target)}</strong><button data-review-status="${escapeHtml(review.id)}" data-status="${review.status === 'open' ? 'resolved' : 'open'}">${review.status === 'open' ? '対応済みにする' : '再オープン'}</button></div><p>${escapeHtml(review.note)}</p><small>${dateLabel(review.createdAt)} · ${review.status === 'open' ? '未対応' : '対応済み'}</small></article>`).join('') : '<p class="empty">レビューはまだないで。左の欄から送ってな。</p>';
  $('#updated').textContent = `最終取得 ${dateLabel(new Date().toISOString())}`;
}

async function refresh(silent = false) {
  try { render(await api('/api/dashboard')); if (!silent) notice('最新の状態に更新したで'); }
  catch (error) { if (!silent) notice(error.message, true); }
}

async function submit(action, success) {
  try { await action(); await refresh(true); notice(success); return true; }
  catch (error) { notice(error.message, true); return false; }
}

$('#refresh').addEventListener('click', () => refresh());
$('#run-tests').addEventListener('click', () => submit(() => api('/api/dashboard/tests', 'POST', {}), 'テストを開始したで'));
$('#reload-preview').addEventListener('click', () => { $('#app-preview').src = `/?preview=${Date.now()}`; notice('プレビューを読み直したで'); });
$('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const title = new FormData(form).get('title');
  submit(() => api('/api/dashboard/tasks', 'POST', { title }), 'タスクを追加したで').then(ok => { if (ok) form.reset(); });
});
$('#question-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = Object.fromEntries(new FormData(form));
  submit(() => api('/api/dashboard/questions', 'POST', fields), '質問を追加したで').then(ok => { if (ok) form.reset(); });
});
$('#review-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = Object.fromEntries(new FormData(form));
  submit(() => api('/api/dashboard/reviews', 'POST', fields), 'レビューを保存したで').then(ok => { if (ok) form.reset(); });
});
$('#questions').addEventListener('submit', event => {
  const form = event.target.closest('[data-answer-form]');
  if (!form) return;
  event.preventDefault();
  const answer = new FormData(form).get('answer');
  submit(() => api(`/api/dashboard/questions/${encodeURIComponent(form.dataset.answerForm)}/answer`, 'POST', { answer }), '回答を保存したで');
});
$('#tasks').addEventListener('change', event => {
  const select = event.target.closest('[data-task-status]');
  if (select) submit(() => api(`/api/dashboard/tasks/${encodeURIComponent(select.dataset.taskStatus)}`, 'PATCH', { status: select.value }), '状態を更新したで');
});
$('#tasks').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-blocker]');
  if (!button) return;
  const task = snapshot?.state.tasks.find(item => item.id === button.dataset.editBlocker);
  const blocker = window.prompt('ブロック理由を入力（空欄で解除）', task?.blocker || '');
  if (blocker !== null) submit(() => api(`/api/dashboard/tasks/${encodeURIComponent(button.dataset.editBlocker)}`, 'PATCH', { blocker }), 'ブロック理由を更新したで');
});
$('#reviews').addEventListener('click', event => {
  const button = event.target.closest('[data-review-status]');
  if (button) submit(() => api(`/api/dashboard/reviews/${encodeURIComponent(button.dataset.reviewStatus)}`, 'PATCH', { status: button.dataset.status }), 'レビューの状態を更新したで');
});

await refresh(true);
setInterval(() => {
  if (!document.hidden && !document.activeElement?.matches('input, textarea, select')) refresh(true);
}, 5000);
