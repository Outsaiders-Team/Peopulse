/* ── Persist last analysis for refresh / back (session only) ── */
const ANALYSIS_STORAGE_KEY = 'peopulse:lastAnalysis';

function saveAnalysisResult(result) {
  try {
    sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(result));
  } catch (err) {
    console.warn('Could not save analysis to sessionStorage:', err);
  }
}

function loadAnalysisResult() {
  try {
    const raw = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.warn('Could not load analysis from sessionStorage:', err);
    return null;
  }
}

function outputHasRenderedResult() {
  const list = document.getElementById('questions-list');
  return !!(list && list.childElementCount > 0);
}

/** Rehydrate output from sessionStorage. Returns false if nothing to show. */
function restoreAnalysisResult() {
  if (outputHasRenderedResult()) return true;
  const stored = loadAnalysisResult();
  if (!stored) return false;
  renderAnalysisResult(stored);
  return true;
}

/* ── Navigation (History API so Back restores the upload view) ── */
function pageFromUrl() {
  const view = new URL(window.location.href).searchParams.get('view');
  return view === 'output' ? 'output' : 'upload';
}

function pageUrl(p) {
  const url = new URL(window.location.href);
  if (p === 'output') url.searchParams.set('view', 'output');
  else url.searchParams.delete('view');
  return url.pathname + url.search + url.hash;
}

function showPage(p) {
  document.querySelectorAll('.page').forEach((x) => x.classList.remove('active'));
  const page = document.getElementById('page-' + p);
  if (page) page.classList.add('active');
  document.body.dataset.view = p;
  pageDragDepth = 0;
  setPageDragging(false);
  window.scrollTo(0, 0);
}

/** @param {'push'|'replace'|'none'} [historyMode] */
function goto(p, historyMode = 'push') {
  if (p === 'output' && !restoreAnalysisResult() && !outputHasRenderedResult()) {
    p = 'upload';
    historyMode = historyMode === 'none' ? 'none' : 'replace';
  }
  showPage(p);
  if (historyMode === 'none') return;
  const url = pageUrl(p);
  const state = { page: p };
  if (historyMode === 'replace') history.replaceState(state, '', url);
  else if (history.state?.page !== p || pageFromUrl() !== p) history.pushState(state, '', url);
}

function initRouting() {
  let page = pageFromUrl();
  if (page === 'output' && !restoreAnalysisResult()) {
    page = 'upload';
  }
  showPage(page);
  history.replaceState({ page }, '', pageUrl(page));
  if (USE_SAMPLE_ANALYSIS) {
    const runBtn = document.getElementById('btn-run');
    if (runBtn) runBtn.disabled = false;
  }
}

window.addEventListener('popstate', (e) => {
  let page = e.state?.page || pageFromUrl();
  if (page === 'output' && !restoreAnalysisResult()) {
    page = 'upload';
    history.replaceState({ page }, '', pageUrl(page));
  }
  showPage(page);
});

/* ── Toast ── */
const TOAST_ICONS = {
  success:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  error:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

function toast(msg, type = 'error') {
  const el = document.getElementById('toastEl');
  const msgEl = document.getElementById('toastMsg');
  const iconEl = document.getElementById('toastIcon');

  if (!el || !msgEl) {
    console.error('Toast Error:', msg);
    alert(msg);
    return;
  }

  const kind = type === 'success' ? 'success' : 'error';
  el.dataset.type = kind;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  if (iconEl) iconEl.innerHTML = TOAST_ICONS[kind];
  msgEl.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ── File upload ── */
let selectedFile = null;
const ALLOWED_EXT = ['csv', 'xlsx', 'xls'];
const MAX_BYTES = 50 * 1024 * 1024;
let pageDragDepth = 0;

/* Flip to false when wiring the real LLM response again. */
const USE_SAMPLE_ANALYSIS = false;

function isUploadPageActive() {
  const page = document.getElementById('page-upload');
  return !!(page && page.classList.contains('active'));
}

function dragHasFiles(e) {
  return Array.from(e.dataTransfer?.types || []).includes('Files');
}

function setPageDragging(on) {
  const page = document.getElementById('page-upload');
  const dz = document.getElementById('dz');
  if (page) page.classList.toggle('is-dragging', on);
  if (dz) dz.classList.toggle('dz-active', on);
}

function onFileSelect(e) {
  const f = e.target.files[0];
  if (f) showFile(f);
  e.target.value = '';
}

function acceptDroppedFiles(fileList) {
  if (!fileList || !fileList.length) return;
  if (fileList.length > 1) toast('Only the first file will be used.');
  showFile(fileList[0]);
}

document.addEventListener('dragenter', (e) => {
  if (!isUploadPageActive() || !dragHasFiles(e)) return;
  e.preventDefault();
  pageDragDepth += 1;
  setPageDragging(true);
});

document.addEventListener('dragover', (e) => {
  if (!isUploadPageActive() || !dragHasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

document.addEventListener('dragleave', (e) => {
  if (!isUploadPageActive() || !dragHasFiles(e)) return;
  pageDragDepth = Math.max(0, pageDragDepth - 1);
  if (pageDragDepth === 0) setPageDragging(false);
});

document.addEventListener('drop', (e) => {
  if (!isUploadPageActive()) return;
  const files = e.dataTransfer?.files;
  if (!files?.length && !dragHasFiles(e)) return;
  e.preventDefault();
  pageDragDepth = 0;
  setPageDragging(false);
  acceptDroppedFiles(files);
});

function showFile(f) {
  const ext = f.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    toast('Please pick a CSV, XLSX, or XLS file.');
    return;
  }
  if (f.size > MAX_BYTES) {
    toast('That file is too big. Please pick a file under 50MB.');
    return;
  }

  selectedFile = f;
  document.getElementById('fn').textContent = f.name;
  const typeLabel = ext.toUpperCase();
  const sizeLabel =
    f.size < 1024 * 1024
      ? Math.max(1, Math.round(f.size / 1024)) + ' KB'
      : (f.size / 1048576).toFixed(1) + ' MB';
  document.getElementById('fs').textContent = typeLabel + ' · ' + sizeLabel;
  document.getElementById('fp').hidden = false;
  document.getElementById('fp').removeAttribute('aria-hidden');
  document.getElementById('fp').tabIndex = 0;
  document.getElementById('dz').classList.add('is-hidden');
  document.getElementById('dz').setAttribute('aria-hidden', 'true');
  document.getElementById('dz').tabIndex = -1;
  document.getElementById('btn-run').disabled = false;
}

function rmFile() {
  selectedFile = null;
  const fp = document.getElementById('fp');
  fp.hidden = true;
  fp.setAttribute('aria-hidden', 'true');
  fp.tabIndex = -1;
  const dz = document.getElementById('dz');
  dz.classList.remove('is-hidden');
  dz.removeAttribute('aria-hidden');
  dz.tabIndex = 0;
  document.getElementById('fi').value = '';
  document.getElementById('btn-run').disabled = !USE_SAMPLE_ANALYSIS;
  stopLoadingStatus();
}

/* ── Loading status (cycling messages + animated dots on the button) ── */
const LOADING_MESSAGES = [
  'Parsing your files',
  'Summarizing your responses',
  'Separating the questions',
  'Finding the big themes',
  'Pulling out what people said',
  'Almost there',
];
const RUN_BTN_DEFAULT_LABEL = 'Summarize responses';
const LOADING_DOTS_HTML =
  '<span class="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';

let loadingTimer = null;
let loadingIndex = 0;

function setRunButtonLabel(html) {
  const label = document.querySelector('#btn-run .btn-run-label');
  if (label) label.innerHTML = html;
}

function loadingStatusHtml(message) {
  return `<span class="btn-run-status"><span class="btn-run-msg">${message}</span>${LOADING_DOTS_HTML}</span>`;
}

function setLoadingMessage(message) {
  const statusEl = document.querySelector('#btn-run .btn-run-status');
  const textEl = document.querySelector('#btn-run .btn-run-msg');
  if (!statusEl || !textEl) return;

  statusEl.classList.add('is-fading');
  window.setTimeout(() => {
    textEl.textContent = message;
    requestAnimationFrame(() => {
      statusEl.classList.remove('is-fading');
    });
  }, 400);
}

function showLoadingStatus() {
  const runBtn = document.getElementById('btn-run');
  if (!runBtn) return;

  loadingIndex = 0;
  runBtn.classList.add('is-loading');
  runBtn.setAttribute('aria-busy', 'true');
  setRunButtonLabel(loadingStatusHtml(LOADING_MESSAGES[0]));

  if (loadingTimer) clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    loadingIndex = (loadingIndex + 1) % LOADING_MESSAGES.length;
    setLoadingMessage(LOADING_MESSAGES[loadingIndex]);
  }, 3200);
}

function stopLoadingStatus() {
  if (loadingTimer) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
  const runBtn = document.getElementById('btn-run');
  if (runBtn) {
    runBtn.classList.remove('is-loading');
    runBtn.removeAttribute('aria-busy');
  }
  setRunButtonLabel(RUN_BTN_DEFAULT_LABEL);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

const ICON_CHECK =
  '<svg class="q-point-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
const ICON_X =
  '<svg class="q-point-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';

function normalizePoint(point) {
  if (point && typeof point === 'object') {
    const sentiment = point.sentiment === 'negative' ? 'negative' : 'positive';
    const text = point.text != null ? String(point.text) : '';
    return { text, sentiment };
  }
  return { text: point == null ? '' : String(point), sentiment: 'positive' };
}

function renderPointLi(point) {
  const { text, sentiment } = normalizePoint(point);
  const isNegative = sentiment === 'negative';
  const cls = isNegative ? 'q-point q-point--negative' : 'q-point q-point--positive';
  const icon = isNegative ? ICON_X : ICON_CHECK;
  const label = isNegative ? 'Negative' : 'Positive';
  return `<li class="${cls}" data-sentiment="${sentiment}">
    <span class="q-point-badge" aria-label="${label}">${icon}</span>
    <span class="q-point-text">${escapeHtml(text)}</span>
  </li>`;
}

function buildQuestionItem(q, index) {
  const headId = `q-head-${index}`;
  const bodyId = `q-body-${index}`;
  const isOpen = index === 1;
  const heardOften = Array.isArray(q.heard_often) ? q.heard_often : [];
  const alsoWorthNoting = Array.isArray(q.also_worth_noting) ? q.also_worth_noting : [];

  const heardOftenHtml = heardOften.length
    ? heardOften.map(renderPointLi).join('')
    : '<li class="q-point q-point--empty"><span class="q-point-text">No recurring points were identified for this question.</span></li>';

  const asideHtml = alsoWorthNoting.length
    ? `<div class="q-group">
        <p class="q-group-label">Also worth noting</p>
        <ul class="q-points q-points--aside">
          ${alsoWorthNoting.map(renderPointLi).join('')}
        </ul>
      </div>`
    : '';

  const article = document.createElement('article');
  article.className = isOpen ? 'q-item is-open' : 'q-item';
  article.innerHTML = `
    <button type="button" class="q-head" aria-expanded="${isOpen}" aria-controls="${bodyId}" id="${headId}">
      <div class="q-head-text">
        <h3 class="q-title">${escapeHtml(q.question)}</h3>
        <p class="q-summary">${escapeHtml(q.summary)}</p>
      </div>
      <span class="q-chevron" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </span>
    </button>
    <div class="q-detail-panel" id="${bodyId}" role="region" aria-labelledby="${headId}" aria-hidden="${!isOpen}">
      <div class="q-detail-panel__inner">
        <div class="q-detail">
          <div class="q-group">
            <p class="q-group-label">Heard often</p>
            <ul class="q-points">${heardOftenHtml}</ul>
          </div>
          ${asideHtml}
        </div>
      </div>
    </div>
  `;
  return article;
}

function renderAnalysisResult(result) {
  const analysis = (result && result.analysis) || {};
  const filename = (result && result.filename) || 'your file';
  const rows = result && typeof result.rows_detected !== 'undefined' ? result.rows_detected : 0;

  const topThemes = Array.isArray(analysis.top_themes) ? analysis.top_themes : [];
  const questions = Array.isArray(analysis.questions) ? analysis.questions : [];

  const meta = document.getElementById('output-meta');
  if (meta) {
    meta.innerHTML = `<span class="output-meta-file">${escapeHtml(filename)}</span><span class="output-meta-count">${rows} feedback ${rows === 1 ? 'entry' : 'entries'} analyzed</span>`;
  }

  const themeList = document.getElementById('theme-list');
  if (themeList) {
    themeList.innerHTML = topThemes.length
      ? topThemes.map(renderPointLi).join('')
      : '<li class="q-point q-point--empty"><span class="q-point-text">No overall themes were returned by the model.</span></li>';
  }

  const questionsList = document.getElementById('questions-list');
  if (questionsList) {
    questionsList.innerHTML = '';
    if (questions.length) {
      questions.forEach((q, idx) => questionsList.appendChild(buildQuestionItem(q, idx + 1)));
    } else {
      questionsList.innerHTML = '<p class="q-summary">No per-question analysis was returned by the model.</p>';
    }
  }

  initQuestionDetails();
}

async function runAnalysis() {
  if (!selectedFile && !USE_SAMPLE_ANALYSIS) {
    toast('Please select a CSV file first');
    return;
  }

  const runBtn = document.getElementById('btn-run');
  if (runBtn) runBtn.disabled = true;

  showLoadingStatus();

  try {
    const result = USE_SAMPLE_ANALYSIS
      ? await window.SampleAnalysis.fetch()
      : await window.API.uploadCsv(selectedFile);
    stopLoadingStatus();
    saveAnalysisResult(result);
    renderAnalysisResult(result);
    goto('output');
  } catch (err) {
    console.error(err);
    stopLoadingStatus();
    toast(err.message || 'Analysis failed');
  } finally {
    if (runBtn) runBtn.disabled = !selectedFile && !USE_SAMPLE_ANALYSIS;
  }
}

/* ── Results: question expand / collapse (first open by default) ── */
function setQuestionOpen(item, open) {
  const head = item.querySelector('.q-head');
  const panel = item.querySelector('.q-detail-panel');
  item.classList.toggle('is-open', open);
  if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (panel) panel.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function initQuestionDetails() {
  document.querySelectorAll('.q-item').forEach((item) => {
    const head = item.querySelector('.q-head');
    if (!head || head.dataset.bound === '1') return;
    head.dataset.bound = '1';
    head.addEventListener('click', () => {
      setQuestionOpen(item, !item.classList.contains('is-open'));
    });
  });
}

window.goto = goto;
window.initRouting = initRouting;
window.initQuestionDetails = initQuestionDetails;
window.toast = toast;
window.onFileSelect = onFileSelect;
window.rmFile = rmFile;
window.runAnalysis = runAnalysis;