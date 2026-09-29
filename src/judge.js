const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const RESULT_MARKER = '__CPP_PRACTICE_RESULT__';
const MAX_OUTPUT = 64 * 1024;

function buildHarness(userCode, problem) {
  const cases = problem.tests.map((test, i) => `
    case ${i}: {
      ${test.code}
      break;
    }`).join('\n');

  return `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode* n) : val(x), next(n) {}
};

static string ans(const string& v) { return v; }
static string ans(const char* v) { return string(v); }
static string ans(bool v) { return v ? "true" : "false"; }
static string ans(int v) { return to_string(v); }
static string ans(long v) { return to_string(v); }
static string ans(long long v) { return to_string(v); }
static string ans(unsigned int v) { return to_string(v); }
static string ans(unsigned long v) { return to_string(v); }
static string ans(unsigned long long v) { return to_string(v); }

static string ans(const vector<int>& v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); ++i) {
        if (i) out += ",";
        out += to_string(v[i]);
    }
    out += "]";
    return out;
}

static ListNode* buildList(initializer_list<int> values) {
    ListNode dummy;
    ListNode* tail = &dummy;
    for (int x : values) {
        tail->next = new ListNode(x);
        tail = tail->next;
    }
    return dummy.next;
}

static ListNode* nodeAt(ListNode* head, int index) {
    while (head && index-- > 0) head = head->next;
    return head;
}

static ListNode* appendShared(ListNode* prefix, ListNode* shared) {
    if (!prefix) return shared;
    ListNode* p = prefix;
    while (p->next) p = p->next;
    p->next = shared;
    return prefix;
}

static ListNode* buildCycle(initializer_list<int> values, int pos) {
    ListNode* head = buildList(values);
    if (!head || pos < 0) return head;
    ListNode* join = nodeAt(head, pos);
    ListNode* tail = head;
    while (tail->next) tail = tail->next;
    tail->next = join;
    return head;
}

static string ansList(ListNode* head) {
    string out = "[";
    unordered_set<ListNode*> seen;
    int count = 0;
    while (head) {
        if (seen.count(head) || count++ > 10000) return "[cycle]";
        seen.insert(head);
        if (out.size() > 1) out += ",";
        out += to_string(head->val);
        head = head->next;
    }
    out += "]";
    return out;
}

${userCode}

int main(int argc, char** argv) {
    if (argc != 2) return 90;
    int __case = -1;
    try { __case = stoi(argv[1]); } catch (...) { return 91; }
    string __answer;
    ostringstream __discard;
    streambuf* __old = cout.rdbuf(__discard.rdbuf());
    try {
        switch (__case) {
${cases}
            default: cout.rdbuf(__old); return 92;
        }
    } catch (...) {
        cout.rdbuf(__old);
        return 93;
    }
    cout.rdbuf(__old);
    cout << "${RESULT_MARKER}" << __answer;
    return 0;
}
`;
}

function killProcessTree(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
  } catch (_) {
    try { child.kill('SIGKILL'); } catch (_) {}
  }
}

function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;
  const cwd = options.cwd;
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let overflow = false;
    let timedOut = false;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stdout, stderr, timedOut, overflow, elapsedMs: Date.now() - started });
    };

    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env: { ...process.env, PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (err) {
      return resolve({ code: -1, stdout: '', stderr: err.message, timedOut: false, overflow: false, elapsedMs: Date.now() - started });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
      // No dependemos de que 'close' llegue para responder al navegador.
      setTimeout(() => finish({ code: -1, signal: 'SIGKILL' }), 150).unref();
    }, timeoutMs);

    const collect = (which) => (chunk) => {
      const text = chunk.toString('utf8');
      if (which === 'stdout') stdout += text;
      else stderr += text;
      if (stdout.length + stderr.length > MAX_OUTPUT && !overflow) {
        overflow = true;
        killProcessTree(child);
        setTimeout(() => finish({ code: -1, signal: 'SIGKILL' }), 150).unref();
      }
    };

    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    child.on('error', (err) => {
      stderr += `\n${err.message}`;
      finish({ code: -1 });
    });
    child.on('close', (code, signal) => finish({ code, signal }));
  });
}

async function judge(problem, userCode, mode = 'submit', log = () => {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cpp-judge-'));
  const sourcePath = path.join(tempDir, 'solution.cpp');
  const binaryPath = path.join(tempDir, 'solution');

  try {
    log(`directorio temporal ${tempDir}`);
    await fs.writeFile(sourcePath, buildHarness(userCode, problem), 'utf8');

    log('iniciando g++');
    const compile = await runProcess('g++', [
      sourcePath, '-std=c++17', '-O1', '-pipe', '-Wall', '-Wextra', '-o', binaryPath
    ], { cwd: tempDir, timeoutMs: 12000 });
    log(`g++ terminó code=${compile.code} timeout=${compile.timedOut} en ${compile.elapsedMs} ms`);

    if (compile.timedOut) {
      return { status: 'Compile Timeout', compileError: 'La compilación excedió 12 segundos.', results: [] };
    }
    if (compile.overflow) {
      return { status: 'Compile Error', compileError: 'La salida del compilador excedió el límite permitido.', results: [] };
    }
    if (compile.code !== 0) {
      return { status: 'Compile Error', compileError: compile.stderr.slice(0, 16000) || 'g++ terminó con error.', results: [] };
    }

    const indexedTests = problem.tests.map((test, index) => ({ test, index }));
    const selected = mode === 'run'
      ? indexedTests.filter(({ test }) => !test.hidden).slice(0, 3)
      : indexedTests;

    const results = [];
    let overall = 'Accepted';

    for (const { test, index } of selected) {
      log(`test ${index + 1} iniciado`);
      // El contenedor completo corre como usuario no privilegiado (USER node).
      // bash aplica límites básicos y timeout agrega una segunda barrera además
      // del timeout de Node.
      const runnerScript = 'ulimit -t 2 2>/dev/null || true; ulimit -v 262144 2>/dev/null || true; ulimit -f 2048 2>/dev/null || true; ulimit -n 64 2>/dev/null || true; ulimit -u 32 2>/dev/null || true; exec timeout -s KILL 3s "$1" "$2"';
      const run = await runProcess('bash', ['-lc', runnerScript, 'judge-runner', binaryPath, String(index)], {
        cwd: tempDir,
        timeoutMs: 3500
      });
      log(`test ${index + 1} terminó code=${run.code} timeout=${run.timedOut} en ${run.elapsedMs} ms`);

      let status = 'Accepted';
      let actual = '';

      if (run.timedOut || run.code === 124 || run.code === 137 || run.signal === 'SIGKILL') {
        status = 'Time Limit Exceeded';
      } else if (run.overflow) {
        status = 'Output Limit Exceeded';
      } else if (run.code !== 0) {
        status = 'Runtime Error';
      } else {
        const pos = run.stdout.lastIndexOf(RESULT_MARKER);
        if (pos < 0) {
          status = 'Runtime Error';
        } else {
          actual = run.stdout.slice(pos + RESULT_MARKER.length).trimEnd();
          const expected = String(test.expected).trimEnd();
          if (actual !== expected) status = 'Wrong Answer';
        }
      }

      if (status !== 'Accepted' && overall === 'Accepted') overall = status;
      results.push({
        index: index + 1,
        hidden: !!test.hidden,
        input: test.hidden ? 'Caso oculto' : test.input,
        expected: test.hidden ? undefined : (test.publicExpected ?? test.expected),
        actual: test.hidden ? undefined : actual,
        status,
        elapsedMs: run.elapsedMs,
        runtimeError: status === 'Runtime Error' ? run.stderr.slice(0, 4000) : undefined
      });

      if (status === 'Time Limit Exceeded' || status === 'Runtime Error' || status === 'Output Limit Exceeded') break;
    }

    return { status: overall, compileError: null, results };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function compilerDiagnostic() {
  const result = await runProcess('g++', ['--version'], { timeoutMs: 3000 });
  return {
    ok: result.code === 0 && !result.timedOut,
    code: result.code,
    timedOut: result.timedOut,
    elapsedMs: result.elapsedMs,
    output: (result.stdout || result.stderr).split('\n')[0].slice(0, 300)
  };
}

module.exports = { judge, compilerDiagnostic };
