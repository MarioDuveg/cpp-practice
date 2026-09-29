let editor;
let problems = [];
let currentProblem = null;
let activeCategory = 'Todos';
let isJudging = false;
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const storageKey = (id) => `cpp-practice-code:${id}`;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(url, options = {}) {
  const controller = new AbortController();
  const method = String(options.method || 'GET').toUpperCase();
  const timeoutMs = method === 'POST' ? 60000 : 12000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: { ...(options.headers || {}), 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (_) {
      throw new Error(`Respuesta inválida del servidor (HTTP ${res.status}).`);
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`El servidor no respondió en ${Math.round(timeoutMs / 1000)} segundos.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function setHeaderVerdict(text, kind = 'neutral') {
  const el = $('headerVerdict');
  if (!el) return;
  el.textContent = text;
  el.className = `header-verdict ${kind}`;
}

function showToast(title, message = '', kind = 'neutral', sticky = false) {
  const el = $('judgeToast');
  const text = message ? `${title} — ${message}` : title;
  if (!el) {
    // Último recurso: el usuario siempre recibe feedback aunque el DOM sea viejo.
    window.alert(text);
    return;
  }
  clearTimeout(toastTimer);
  el.hidden = false;
  el.className = `judge-toast ${kind}`;
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}`;
  if (!sticky) {
    toastTimer = setTimeout(() => { el.hidden = true; }, 8000);
  }
}

function initEditor() {
  require.config({ paths: { vs: '/monaco/vs' } });
  require(['vs/editor/editor.main'], () => {
    monaco.editor.defineTheme('practice-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
        { token: 'type.identifier', foreground: '4EC9B0' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' }
      ],
      colors: {
        'editor.background': '#101214',
        'editorLineNumber.foreground': '#555b63',
        'editorLineNumber.activeForeground': '#b8bec6',
        'editorCursor.foreground': '#f3a11a',
        'editor.selectionBackground': '#33415588'
      }
    });

    editor = monaco.editor.create($('editor'), {
      value: '// Selecciona un problema...',
      language: 'cpp',
      theme: 'practice-dark',
      fontSize: 14,
      lineHeight: 21,
      fontLigatures: true,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      tabSize: 4,
      insertSpaces: true,
      roundedSelection: false,
      padding: { top: 12 },
      suggest: { showWords: true },
      quickSuggestions: true
    });

    // Enter especial solicitado: la nueva línea empieza exactamente en la
    // misma columna horizontal donde estaba el cursor, usando espacios.
    editor.addCommand(monaco.KeyCode.Enter, () => {
      const pos = editor.getPosition();
      if (!pos) return;
      const spaces = ' '.repeat(Math.max(0, pos.column - 1));
      editor.executeEdits('aligned-enter', [{
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: `\n${spaces}`,
        forceMoveMarkers: true
      }]);
      editor.setPosition({ lineNumber: pos.lineNumber + 1, column: pos.column });
      editor.revealPositionInCenterIfOutsideViewport(editor.getPosition());
    });

    let saveTimer;
    editor.onDidChangeModelContent(() => {
      if (!currentProblem) return;
      $('saveStatus').textContent = 'Guardando...';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        localStorage.setItem(storageKey(currentProblem.id), editor.getValue());
        $('saveStatus').textContent = 'Guardado local';
      }, 250);
    });

    bootstrap();
  });
}

async function bootstrap() {
  try {
    const health = await api('/api/health');
    if ($('frontendVersion')) $('frontendVersion').textContent = health.version || 'fix-v5';
  } catch (_) {}
  problems = await api('/api/problems');
  $('problemCount').textContent = `${problems.length} ejercicios`;
  renderCategoryFilters();
  renderProblemList();
  const first = location.hash.slice(1) || problems[0]?.id;
  if (first) await selectProblem(first);
}

function renderCategoryFilters() {
  const categories = ['Todos', ...new Set(problems.map((p) => p.category))];
  $('categoryFilters').innerHTML = categories.map((c) =>
    `<button class="filter-chip ${c === activeCategory ? 'active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');

  $('categoryFilters').querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      renderCategoryFilters();
      renderProblemList();
    });
  });
}

function renderProblemList() {
  const q = $('searchInput').value.trim().toLowerCase();
  const filtered = problems.filter((p) => {
    const categoryOk = activeCategory === 'Todos' || p.category === activeCategory;
    const searchOk = !q || `${p.title} ${p.category}`.toLowerCase().includes(q);
    return categoryOk && searchOk;
  });

  $('problemList').innerHTML = filtered.map((p) => `
    <button class="problem-item ${currentProblem?.id === p.id ? 'active' : ''}" data-id="${p.id}">
      <span class="title">${escapeHtml(p.title)}</span>
      <span class="dot ${p.difficulty.toLowerCase()}"></span>
    </button>
  `).join('');

  $('problemList').querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => selectProblem(btn.dataset.id));
  });
}

async function selectProblem(id) {
  if (isJudging) return;
  const problem = await api(`/api/problems/${encodeURIComponent(id)}`);
  currentProblem = problem;
  location.hash = problem.id;
  renderProblemList();
  renderProblem(problem);

  const saved = localStorage.getItem(storageKey(problem.id));
  editor.setValue(saved ?? problem.template);
  editor.setPosition({ lineNumber: 1, column: 1 });
  editor.focus();
  clearResults();
}

function renderProblem(p) {
  $('problemCategory').textContent = p.category;
  $('problemTitle').textContent = p.title;
  $('problemStatement').textContent = p.statement;
  $('difficultyBadge').textContent = p.difficulty;
  $('difficultyBadge').className = `difficulty ${p.difficulty.toLowerCase()}`;

  $('examples').innerHTML = p.examples.map((ex) => `
    <div class="example">
      <div><span class="label">Entrada</span>${escapeHtml(ex.input)}</div>
      <div><span class="label">Salida</span>${escapeHtml(ex.output)}</div>
    </div>
  `).join('');

  $('constraints').innerHTML = p.constraints.map((c) => `<li>${escapeHtml(c)}</li>`).join('');

  $('visibleTests').innerHTML = p.visibleTests.map((test) => `
    <div class="test-card">
      <div>${escapeHtml(test.input)}</div>
      <div class="expected">${escapeHtml(test.expected)}</div>
    </div>
  `).join('');
}

function clearResults() {
  $('verdict').className = 'verdict neutral';
  $('verdict').textContent = 'Listo';
  setHeaderVerdict('Listo', 'neutral');
  $('resultSummary').textContent = 'Aún no has ejecutado pruebas.';
  $('results').className = 'results-body empty-state';
  $('results').innerHTML = 'Presiona <strong>Ejecutar</strong> para correr casos visibles o <strong>Enviar</strong> para evaluar todos los casos.';
}

function setBusy(busy) {
  isJudging = busy;
  $('runBtn').disabled = busy;
  $('submitBtn').disabled = busy;
  $('resetBtn').disabled = busy;
  if (busy) {
    $('runBtn').dataset.originalText ||= $('runBtn').textContent;
    $('submitBtn').dataset.originalText ||= $('submitBtn').textContent;
    $('runBtn').textContent = 'Evaluando...';
    $('submitBtn').textContent = 'Evaluando...';
    $('verdict').className = 'verdict running';
    $('verdict').textContent = 'Evaluando';
    setHeaderVerdict('Evaluando', 'running');
    showToast('Evaluando', 'Compilando C++17 y ejecutando pruebas...', 'running', true);
    $('resultSummary').textContent = 'Compilando con g++ y ejecutando casos...';
    $('results').className = 'results-body empty-state';
    $('results').textContent = 'Compilando C++17...';
  } else {
    $('runBtn').textContent = $('runBtn').dataset.originalText || 'Ejecutar';
    $('submitBtn').textContent = $('submitBtn').dataset.originalText || 'Enviar';
  }
}

async function judge(mode) {
  if (!currentProblem || isJudging) return;
  setBusy(true);
  try {
    const result = await api(`/api/judge/${encodeURIComponent(currentProblem.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: editor.getValue(), mode })
    });
    console.log('[JUDGE RESPONSE]', result);
    const passed = Array.isArray(result.results) ? result.results.filter((r) => r.status === 'Accepted').length : 0;
    const total = Array.isArray(result.results) ? result.results.length : 0;
    const kind = result.status === 'Accepted' ? 'accepted' : 'error';
    const message = result.compileError
      ? 'El código no compiló. Revisa el detalle en Resultado.'
      : `${passed}/${total} casos aprobados.`;
    setHeaderVerdict(result.status || 'Resultado', kind);
    showToast(result.status || 'Resultado', message, kind, !!result.compileError);
    renderResults(result, mode);
  } catch (err) {
    console.error('[JUDGE FRONTEND ERROR]', err);
    $('verdict').className = 'verdict error';
    $('verdict').textContent = 'Error';
    setHeaderVerdict('Error', 'error');
    showToast('Error', err.message, 'error', true);
    $('resultSummary').textContent = err.message;
    $('results').className = 'results-body';
    $('results').innerHTML = `<pre class="compile-error">${escapeHtml(err.message)}</pre>`;
  } finally {
    setBusy(false);
  }
}

function renderResults(result, mode) {
  if (!result || typeof result !== 'object') throw new Error('Respuesta inválida del juez.');
  if (!Array.isArray(result.results)) result.results = [];
  const accepted = result.status === 'Accepted';
  $('verdict').className = `verdict ${accepted ? 'accepted' : 'error'}`;
  $('verdict').textContent = result.status;

  if (result.compileError) {
    $('resultSummary').textContent = 'El código no compiló.';
    $('results').className = 'results-body';
    $('results').innerHTML = `<pre class="compile-error">${escapeHtml(result.compileError)}</pre>`;
    return;
  }

  const passed = result.results.filter((r) => r.status === 'Accepted').length;
  $('resultSummary').textContent = `${passed}/${result.results.length} casos aprobados · ${mode === 'run' ? 'casos visibles' : 'evaluación completa'}`;
  $('results').className = 'results-body';
  $('results').innerHTML = result.results.map((r) => {
    const ok = r.status === 'Accepted';
    let io = r.hidden
      ? '<div class="io">Caso oculto</div>'
      : `<div class="io"><b>Entrada:</b> ${escapeHtml(r.input ?? '')}</div>
         <div class="io"><b>Esperado:</b> ${escapeHtml(r.expected ?? '')}</div>
         <div class="io"><b>Obtenido:</b> ${escapeHtml(r.actual ?? '')}</div>`;
    if (r.runtimeError) io += `<div class="io"><b>Error:</b> ${escapeHtml(r.runtimeError)}</div>`;
    return `
      <div class="result-row">
        <div class="result-index">#${r.index}</div>
        <div class="result-main">${io}</div>
        <div class="result-status ${ok ? 'ok' : 'bad'}">${escapeHtml(r.status)} · ${r.elapsedMs} ms</div>
      </div>
    `;
  }).join('');
}

$('searchInput').addEventListener('input', renderProblemList);
$('runBtn').addEventListener('click', () => judge('run'));
$('submitBtn').addEventListener('click', () => judge('submit'));
$('resetBtn').addEventListener('click', () => {
  if (!currentProblem || isJudging) return;
  localStorage.removeItem(storageKey(currentProblem.id));
  editor.setValue(currentProblem.template);
  clearResults();
});

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id && id !== currentProblem?.id && problems.some((p) => p.id === id)) selectProblem(id);
});

initEditor();


window.addEventListener('error', (event) => {
  console.error('[FRONTEND ERROR]', event.error || event.message);
  try { showToast('Error de interfaz', event.message || 'Error JavaScript inesperado.', 'error', true); } catch (_) {}
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[FRONTEND PROMISE ERROR]', event.reason);
  try { showToast('Error de interfaz', event.reason?.message || String(event.reason || 'Error inesperado.'), 'error', true); } catch (_) {}
});
