const express = require('express');
const path = require('path');
const problems = require('./problems.json');
const { judge } = require('./judge');

const app = express();
const PORT = Number(process.env.PORT || 10000);
const MAX_CODE_LENGTH = 30000;
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS || 2);
let activeJobs = 0;

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/monaco', express.static(path.join(__dirname, '..', 'node_modules', 'monaco-editor', 'min')));

function publicProblem(problem) {
  return {
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty,
    category: problem.category,
    statement: problem.statement,
    constraints: problem.constraints,
    template: problem.template,
    examples: problem.examples,
    testCount: problem.tests.length,
    visibleTests: problem.tests
      .filter((t) => !t.hidden)
      .map((t, index) => ({ index: index + 1, input: t.input, expected: t.publicExpected ?? t.expected }))
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, compiler: 'g++', standard: 'C++17', problems: problems.length });
});

app.get('/api/problems', (_req, res) => {
  res.json(problems.map(({ id, title, difficulty, category }) => ({ id, title, difficulty, category })));
});

app.get('/api/problems/:id', (req, res) => {
  const problem = problems.find((p) => p.id === req.params.id);
  if (!problem) return res.status(404).json({ error: 'Problema no encontrado.' });
  res.json(publicProblem(problem));
});

app.post('/api/judge/:id', async (req, res) => {
  const problem = problems.find((p) => p.id === req.params.id);
  if (!problem) return res.status(404).json({ error: 'Problema no encontrado.' });

  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const mode = req.body?.mode === 'run' ? 'run' : 'submit';
  if (!code.trim()) return res.status(400).json({ error: 'El código está vacío.' });
  if (code.length > MAX_CODE_LENGTH) return res.status(413).json({ error: 'El código excede 30 KB.' });
  if (activeJobs >= MAX_CONCURRENT_JOBS) return res.status(429).json({ error: 'El juez está ocupado. Intenta nuevamente en unos segundos.' });

  activeJobs += 1;
  try {
    const result = await judge(problem, code, mode);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del juez.' });
  } finally {
    activeJobs -= 1;
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`C++ Practice Judge escuchando en 0.0.0.0:${PORT}`);
});
