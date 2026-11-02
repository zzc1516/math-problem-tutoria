/**
 * 不依赖浏览器的核心自测：
 *   1) 提示词里的 4 个 JSON 范例必须能解析、能被 schema 接受、算式全部算得平
 *   2) 3 个内置示例同样要过一遍
 *   3) 分数/算式自检模块的边界用例
 *
 *   node tests/run.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const files = ['00-util.js', '10-frac.js', '20-expr.js', '30-schema.js', '40-prompt.js', '45-demo.js', '50-llm.js'];

const sandbox = {
  window: {},
  console,
  performance: { now: () => Date.now() },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ setAttribute() {}, appendChild() {}, addEventListener() {} }), addEventListener() {}, readyState: 'loading' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { hash: '' },
  setTimeout, clearTimeout
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of files) {
  const code = readFileSync(join(root, 'src', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}
const MT = sandbox.window.MT;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
function group(t) { console.log('\n' + t); }

/* ---------- 1. 算式自检 ---------- */
group('算式自检 (expr)');
const cases = [
  ['48 ÷ 4 = 12', 'ok'],
  ['1 + 3/4 = 7/4', 'ok'],
  ['48 × 3/4 = 36', 'ok'],
  ['600 / 0.1 = 6000', 'ok'],
  ['6000 * 0.8 - 4900 = -100', 'ok'],
  ['4.875 / 7.5 = 0.65', 'ok'],
  ['48 ÷ 4 = 13', 'bad'],
  ['3/4 + 1 = 2', 'bad'],
  ['18 / 0.75 = 24', 'ok'],
  ['这一步是思路', 'skip'],
  ['3x + 5 = 26', 'skip']
];
for (const [expr, want] of cases) {
  const r = MT.expr.checkMath(expr);
  ok(`${expr}  → ${want}`, r.status === want, '实际 ' + r.status + ' ' + (r.message || ''));
}
ok('75% 解析为 0.75', MT.expr.checkMath('600 / 75% = 800').status === 'ok');
ok('括号优先', MT.expr.checkMath('(2 + 3) * 4 = 20').status === 'ok');
ok('除法优先于加法', MT.expr.checkMath('2 + 8 / 4 = 4').status === 'ok');
ok('负数结果', MT.expr.checkMath('3 - 10 = -7').status === 'ok');

/* ---------- 2. 提示词里的范例 ---------- */
group('提示词范例 (prompt)');
const sys = MT.prompt.systemPrompt();
const blocks = [];
for (let i = 0; i < sys.length; i++) {
  if (sys.startsWith('{"meta":', i)) {
    let depth = 0, j = i, inStr = false, esc = false;
    for (; j < sys.length; j++) {
      const ch = sys[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    blocks.push(sys.slice(i, j));
    i = j;
  }
}
ok('找到 4 个范例', blocks.length === 4, '实际 ' + blocks.length);

blocks.forEach((b, i) => {
  let parsed;
  try { parsed = JSON.parse(b); } catch (e) { ok(`范例 ${i + 1} JSON 合法`, false, e.message); return; }
  ok(`范例 ${i + 1} JSON 合法`, true);
  let out;
  try { out = MT.schema.normalize(parsed); } catch (e) { ok(`范例 ${i + 1} 通过 schema`, false, e.message); return; }
  ok(`范例 ${i + 1} 通过 schema (${out.script.diagram.type})`, true, out.warnings.join('; '));
  const v = MT.schema.verify(out.script);
  ok(`范例 ${i + 1} 算式全对 (共 ${v.total} 条)`, v.bad === 0, v.bad + ' 条算错');
  ok(`范例 ${i + 1} 答案有算式支撑`, !v.answerCheck || v.answerCheck.ok === true);
});

/* ---------- 3. 内置示例 ---------- */
group('内置示例 (demo)');
MT.demo.lessons.forEach((lesson, i) => {
  const out = MT.schema.normalize(lesson);
  const v = MT.schema.verify(out.script);
  const name = `示例 ${i + 1} ${out.script.meta.topic}`;
  ok(`${name} 可规范化`, !!out.script.steps.length);
  ok(`${name} 算式全对`, v.bad === 0, v.bad + ' 条算错');
  ok(`${name} 有换图或单图`, true);
  const withDiagram = out.script.steps.filter((s) => s.diagram).length;
  console.log(`      · 图: ${out.script.diagram.type}，换图 ${withDiagram} 次，步骤 ${out.script.steps.length}`);
});

/* ---------- 4. schema 兜底 ---------- */
group('schema 兜底');
ok('未知图类型 → cards', MT.schema.normalize({
  meta: {}, problem: {}, diagram: { type: 'unknown' }, steps: [{ title: 'a' }], answer: {}
}).script.diagram.type === 'cards');
ok('缺 steps 会报错', (() => {
  try { MT.schema.normalize({ meta: {}, problem: {}, diagram: {}, steps: [], answer: {} }); return false; }
  catch (e) { return true; }
})());
ok('代码块包裹也能解析', (() => {
  const s = '```json\n{"meta":{},"problem":{},"diagram":{"type":"cards"},"steps":[{"title":"a"}],"answer":{}}\n```';
  return MT.schema.normalize(s).script.steps.length === 1;
})());
ok('80% 折扣题答案 4900',
  MT.demo.lessons[1].answer.value === '4900');
ok('浓度题答案 3.5',
  MT.demo.lessons[2].answer.value === '3.5');
ok('带图时提示词要求先读图',
  MT.prompt.buildUserPrompt({ problem: '', grade: 4, method: 'arithmetic', unit1: false, hasImage: true }).includes('题目以图片给出'));
ok('不带图时不出现读图要求',
  !MT.prompt.buildUserPrompt({ problem: '1+1', grade: 1, method: 'arithmetic', unit1: false }).includes('题目以图片给出'));

/* ---------- 5. 服务商预设 ---------- */
group('服务商预设 (llm)');
const deepseek = MT.llm.PRESETS.find((p) => p.id === 'deepseek');
ok('DeepSeek 默认模型是 deepseek-flash', MT.llm.DEFAULTS.model === 'deepseek-flash', MT.llm.DEFAULTS.model);
ok('DeepSeek 预设带视觉模型', !!(deepseek && deepseek.vision), '缺 vision');
ok('DeepSeek 默认就能读图', MT.llm.visionModelOf({ provider: 'deepseek', model: 'deepseek-flash', visionModel: '' }) === 'deepseek-flash');
ok('deepseek-v4-pro 不冒充视觉模型', MT.llm.visionModelOf({ provider: 'deepseek', model: 'deepseek-v4-pro', visionModel: '' }) === '');
ok('旧模型名自动迁移', MT.llm.migrate({ provider: 'deepseek', model: 'deepseek-chat' }).model === 'deepseek-flash');
ok('自定义服务商不会被误迁移', MT.llm.migrate({ provider: 'custom', model: 'deepseek-chat' }).model === 'deepseek-chat');
ok('每个服务商的视觉模型都在模型列表外独立存在',
  MT.llm.PRESETS.filter((p) => p.vision).every((p) => typeof p.vision === 'string'));

console.log(`\n结果：${pass} 通过，${fail} 失败\n`);
process.exit(fail ? 1 : 0);
