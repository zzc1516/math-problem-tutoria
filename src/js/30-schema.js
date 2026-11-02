/* 30-schema.js —— LessonScript 讲解脚本协议：规范化、校验、自检 */
(function () {
  const MT = (window.MT = window.MT || {});
  const U = MT.util;

  const DIAGRAM_TYPES = ['segment', 'bars', 'balance', 'area', 'solid', 'route', 'table', 'numberline', 'percentbar', 'cross', 'cards'];
  const OP_TYPES = ['focus', 'dim', 'show', 'hide', 'set', 'mark', 'pulse'];
  const PHASES = ['理解', '关系', '列式', '计算', '检验'];

  /** 从模型返回的文本里抠出 JSON 对象 */
  function extractJson(text) {
    if (typeof text !== 'string') return text;
    let s = text.trim();
    if (s.startsWith('```')) {
      s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first > 0 || last < s.length - 1) {
      if (first >= 0 && last > first) s = s.slice(first, last + 1);
    }
    return JSON.parse(s);
  }

  function asArray(x) { return Array.isArray(x) ? x : (x == null ? [] : [x]); }
  function str(x) { return x == null ? '' : String(x); }
  function pickColor(c) {
    const map = { red: 'red', orange: 'orange', blue: 'blue', green: 'green', purple: 'purple', amber: 'amber', gray: 'gray' };
    return map[str(c).toLowerCase()] || 'blue';
  }

  function normalizeDiagram(d) {
    d = d && typeof d === 'object' ? d : {};
    let type = str(d.type).toLowerCase();
    if (!DIAGRAM_TYPES.includes(type)) type = 'cards';
    const out = { type, title: str(d.title) };

    if (type === 'segment') {
      out.parts = asArray(d.parts).slice(0, 6).map((p, i) => ({
        id: str(p.id) || 'p' + (i + 1),
        ratio: Math.max(1, Number(p.ratio) || 1),
        label: str(p.label),
        value: str(p.value),
        color: pickColor(p.color || ['blue', 'orange', 'green', 'purple'][i % 4])
      }));
      if (!out.parts.length) out.parts = [{ id: 'p1', ratio: 1, label: '', value: '', color: 'blue' }];
      out.total = d.total ? { id: str(d.total.id) || 'total', label: str(d.total.label), value: str(d.total.value) } : null;
      out.unitOne = d.unitOne && str(d.unitOne.id) ? { id: str(d.unitOne.id), label: str(d.unitOne.label || '1') } : null;
      out.question = d.question ? { id: str(d.question.id) || 'q', label: str(d.question.label) } : null;
    } else if (type === 'bars') {
      out.rows = asArray(d.rows).slice(0, 6).map((r, i) => ({
        id: str(r.id) || 'r' + (i + 1),
        label: str(r.label),
        ratio: Math.max(1, Math.min(12, Number(r.ratio) || 1)),
        value: str(r.value),
        color: pickColor(r.color || ['blue', 'orange', 'green', 'purple'][i % 4])
      }));
      if (!out.rows.length) out.rows = [{ id: 'r1', label: '', ratio: 1, value: '', color: 'blue' }];
      out.unit = str(d.unit || '份');
    } else if (type === 'balance') {
      const side = (s, defId) => ({
        label: str(s && s.label),
        items: asArray(s && s.items).slice(0, 4).map((it, i) => ({
          id: str(it.id) || defId + (i + 1), text: str(it.text)
        }))
      });
      out.left = side(d.left, 'l');
      out.right = side(d.right, 'r');
      out.hint = str(d.hint);
    } else if (type === 'area') {
      const shapes = ['rect', 'triangle', 'parallelogram', 'trapezoid', 'circle', 'composite'];
      out.shape = shapes.includes(str(d.shape).toLowerCase()) ? str(d.shape).toLowerCase() : 'rect';
      out.dims = Object.assign({ w: 8, h: 5, b: 6, b2: 4, h2: 4, r: 3 }, d.dims || {});
      for (const k in out.dims) out.dims[k] = Number(out.dims[k]) || out.dims[k];
      out.unit = str(d.unit || '厘米');
      out.labels = d.labels || {};
      out.formula = str(d.formula);
    } else if (type === 'solid') {
      const shapes = ['cuboid', 'cube', 'cylinder', 'cone', 'prism'];
      out.shape = shapes.includes(str(d.shape).toLowerCase()) ? str(d.shape).toLowerCase() : 'cuboid';
      out.dims = Object.assign({ l: 5, w: 3, h: 4, r: 2 }, d.dims || {});
      for (const k in out.dims) out.dims[k] = Number(out.dims[k]) || out.dims[k];
      out.unit = str(d.unit || '厘米');
      out.formula = str(d.formula);
    } else if (type === 'route') {
      out.length = Number(d.length) || 100;
      out.unit = str(d.unit || '千米');
      out.travelers = asArray(d.travelers).slice(0, 3).map((t, i) => ({
        id: str(t.id) || 't' + (i + 1),
        name: str(t.name),
        pos: Number(t.pos) || 0,
        dir: Number(t.dir) >= 0 ? 1 : -1,
        speed: str(t.speed),
        color: pickColor(t.color || ['blue', 'orange', 'green'][i % 3])
      }));
      out.marks = asArray(d.marks).slice(0, 4).map((m, i) => ({
        id: str(m.id) || 'm' + (i + 1), at: Number(m.at) || 0, label: str(m.label)
      }));
    } else if (type === 'table') {
      out.cols = asArray(d.cols).slice(0, 5).map((c, i) => ({ key: str(c.key) || 'c' + i, label: str(c.label) }));
      out.rows = asArray(d.rows).slice(0, 12).map((r, i) => ({
        id: str(r.id) || 'row' + (i + 1),
        cells: asArray(r.cells).map(str)
      }));
    } else if (type === 'numberline') {
      out.min = Number(d.min) || 0;
      out.max = d.max == null ? 1 : Number(d.max);
      out.ticks = asArray(d.ticks).slice(0, 20).map((t, i) => ({
        id: str(t.id) || 'tick' + i,
        value: Number(t.value) || 0,
        label: str(t.label)
      }));
      out.marks = asArray(d.marks).slice(0, 4).map((m, i) => ({
        id: str(m.id) || 'mark' + i, value: Number(m.value) || 0, label: str(m.label), color: pickColor(m.color || 'orange')
      }));
      out.refs = asArray(d.refs).slice(0, 3).map((r, i) => ({
        id: str(r.id) || 'ref' + i, at: Number(r.at) || 0, label: str(r.label), color: pickColor(r.color || 'green')
      }));
      out.spans = asArray(d.spans).slice(0, 4).map((r, i) => ({
        id: str(r.id) || 'span' + i,
        from: Number(r.from) || 0, to: Number(r.to) || 0,
        label: str(r.label), color: pickColor(r.color || 'orange')
      }));
    } else if (type === 'percentbar') {
      out.rows = asArray(d.rows).slice(0, 3).map((r, i) => ({
        id: str(r.id) || 'pb' + (i + 1),
        label: str(r.label),
        total: str(r.total),
        segments: asArray(r.segments).slice(0, 4).map((sg, k) => ({
          id: str(sg.id) || 'pbs' + (i + 1) + k,
          pct: Math.max(0, Number(sg.pct) || 0),
          label: str(sg.label),
          color: pickColor(sg.color || ['orange', 'blue', 'green', 'purple'][k % 4])
        }))
      }));
      if (!out.rows.length) out.rows = [{ id: 'pb1', label: '', total: '', segments: [{ id: 'pbs1', pct: 100, label: '', color: 'blue' }] }];
      out.note = str(d.note);
    } else if (type === 'cross') {
      out.rows = asArray(d.rows).slice(0, 2).map((r, i) => ({
        id: str(r.id) || 'cr' + (i + 1),
        label: str(r.label),
        value: str(r.value),
        share: str(r.share),
        color: pickColor(r.color || ['orange', 'blue', 'green'][i % 3])
      }));
      if (out.rows.length < 2) out.rows.push({ id: 'cr2', label: '', value: '', share: '', color: 'blue' });
      const mid = d.mid || {};
      out.mid = { id: str(mid.id) || 'mid', value: str(mid.value), label: str(mid.label) || '混合后' };
      out.ratio = str(d.ratio);
      out.note = str(d.note);
    } else {
      out.cards = asArray(d.cards).slice(0, 4).map((c, i) => ({
        id: str(c.id) || 'c' + (i + 1),
        title: str(c.title),
        lines: asArray(c.lines).map(str),
        color: pickColor(c.color || ['blue', 'orange', 'green', 'purple'][i % 4])
      }));
      if (!out.cards.length) out.cards = [{ id: 'c1', title: '题目信息', lines: [''], color: 'blue' }];
    }
    return out;
  }

  function normalize(raw) {
    const warnings = [];
    let obj;
    try { obj = typeof raw === 'string' ? extractJson(raw) : raw; }
    catch (e) { throw new Error('返回内容不是合法 JSON：' + e.message.slice(0, 80)); }
    if (!obj || typeof obj !== 'object') throw new Error('返回内容不是对象');

    const meta = obj.meta || {};
    const grade = U.clamp(parseInt(meta.grade, 10) || 3, 1, 6);
    const method = meta.method === 'equation' ? 'equation' : 'arithmetic';

    const problem = obj.problem || {};
    const diagram = normalizeDiagram(obj.diagram);

    const steps = asArray(obj.steps).slice(0, 12).map((s, i) => {
      const ops = asArray(s.ops).filter((o) => o && OP_TYPES.includes(str(o.op))).map((o) => {
        const out = { op: str(o.op) };
        if (o.id) out.id = str(o.id);
        if (o.ids) out.ids = asArray(o.ids).map(str);
        if (o.text != null) out.text = str(o.text);
        if (o.note != null) out.note = str(o.note);
        return out;
      });
      return {
        n: i + 1,
        phase: PHASES.includes(str(s.phase)) ? str(s.phase) : (i === 0 ? '理解' : '计算'),
        title: str(s.title) || '第 ' + (i + 1) + ' 步',
        text: str(s.text),
        math: str(s.math),
        why: str(s.why),
        tip: str(s.tip),
        ops,
        diagram: s.diagram && typeof s.diagram === 'object' ? normalizeDiagram(s.diagram) : null,
        check: null
      };
    });
    if (!steps.length) throw new Error('模型没有给出讲解步骤');

    const ans = obj.answer || {};
    const script = {
      meta: {
        topic: str(meta.topic) || '数学题',
        grade,
        method,
        unit1: !!meta.unit1,
        unit1Used: !!meta.unit1Used,
        gradeFit: ['ok', 'above', 'below'].includes(str(meta.gradeFit)) ? str(meta.gradeFit) : 'ok',
        note: str(meta.note)
      },
      problem: {
        text: str(problem.text),
        givens: asArray(problem.givens).slice(0, 6).map((g) => ({
          name: str(g.name), value: str(g.value), unit: str(g.unit)
        })),
        question: str(problem.question)
      },
      plan: {
        headline: str((obj.plan || {}).headline),
        relation: str((obj.plan || {}).relation)
      },
      diagram,
      steps,
      answer: {
        value: str(ans.value),
        unit: str(ans.unit),
        sentence: str(ans.sentence)
      },
      checks: asArray(obj.checks).map(str).slice(0, 5),
      warning: str(obj.warning),
      raw: obj
    };

    // 图形 id 体检：ops 引用了不存在的 id 时给出提示（不阻断渲染）
    // 注意：某一步换了图之后，后面的步骤都活在那张新图上
    let currentIds = collectIds(diagram);
    const missing = new Set();
    steps.forEach((s) => {
      if (s.diagram) currentIds = collectIds(s.diagram);
      s.ops.forEach((o) => {
        (o.ids || (o.id ? [o.id] : [])).forEach((id) => {
          if (id === 'beam' || id === 'tilt') return;
          if (!currentIds.has(id)) missing.add(id);
        });
      });
    });
    if (missing.size) warnings.push('图解缺少图元：' + Array.from(missing).join('、'));

    return { script, warnings };
  }

  function collectIds(d) {
    const ids = new Set();
    const add = (x) => { if (x && x.id) ids.add(x.id); };
    if (d.type === 'segment') { d.parts.forEach(add); if (d.total) add(d.total); if (d.unitOne) add(d.unitOne.id); if (d.question) add(d.question); }
    if (d.type === 'bars') d.rows.forEach(add);
    if (d.type === 'balance') { d.left.items.forEach(add); d.right.items.forEach(add); }
    if (d.type === 'route') { d.travelers.forEach(add); d.marks.forEach(add); }
    if (d.type === 'table') d.rows.forEach(add);
    if (d.type === 'numberline') {
      d.ticks.forEach(add); d.marks.forEach(add);
      (d.refs || []).forEach(add); (d.spans || []).forEach(add);
    }
    if (d.type === 'percentbar') d.rows.forEach((r) => { add(r); r.segments.forEach(add); });
    if (d.type === 'cross') { d.rows.forEach(add); if (d.mid) add(d.mid); }
    if (d.type === 'cards') d.cards.forEach(add);
    return ids;
  }

  /** 自检：逐条核对算式，并把最终答案与最后一条算式对齐 */
  function verify(script) {
    let ok = 0, bad = 0, skip = 0;
    const results = [];
    script.steps.forEach((s) => {
      if (!s.math) { results.push(null); return; }
      const r = MT.expr.checkMath(s.math);
      s.check = r.status;
      results.push(r);
      if (r.status === 'ok') ok++;
      else if (r.status === 'bad') bad++;
      else skip++;
    });

    // 答案必须能在某一步的算式结果里找到（检验步骤算的是别的量，所以不比对最后一步）
    let answerCheck = null;
    if (script.answer.value) {
      const target = String(script.answer.value).replace(/[^\d.\-/]/g, '');
      let found = false;
      results.forEach((r) => {
        if (!found && r && r.status === 'ok' && r.value) {
          if (MT.expr.sameValue(target, r.value.toString()) === true) found = true;
        }
      });
      answerCheck = found ? { ok: true } : { ok: false };
    }
    return { ok, bad, skip, results, answerCheck, total: ok + bad };
  }

  /** 兜底图解：把题干变成信息卡片 */
  function fallbackDiagram(problemText) {
    return normalizeDiagram({
      type: 'cards',
      cards: [
        { id: 'c1', title: '已知条件', lines: [problemText || '（无）'], color: 'blue' },
        { id: 'c2', title: '要解决的问题', lines: ['见下方讲解步骤'], color: 'orange' }
      ]
    });
  }

  MT.schema = {
    normalize, verify, extractJson, fallbackDiagram,
    DIAGRAM_TYPES, OP_TYPES, PHASES
  };
})();
