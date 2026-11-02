/* 80-app.js —— 界面与流程 */
(function () {
  const MT = (window.MT = window.MT || {});
  const { $, $$, el, store, toast, inlineMd, escapeHtml } = MT.util;

  const state = {
    grade: store.get('grade', 4),
    method: store.get('method', 'arithmetic'),
    unit1: store.get('unit1', false),
    script: null,
    player: null,
    verify: null,
    busy: false
  };

  /* ---------------- 控件 ---------------- */
  function initControls() {
    const gc = $('#gradeChips');
    for (let g = 1; g <= 6; g++) {
      const b = el('button', { type: 'button', class: 'chip', 'data-grade': g, text: g + '年级' });
      b.addEventListener('click', () => setGrade(g));
      gc.appendChild(b);
    }
    $$('#methodChips .chip').forEach((b) => b.addEventListener('click', () => setMethod(b.dataset.method)));
    $('#unit1').addEventListener('change', (e) => {
      state.unit1 = e.target.checked;
      store.set('unit1', state.unit1);
      $('#unit1Text').textContent = state.unit1 ? '使用' : '不用';
      updateHint();
    });
    syncControls();
  }

  function syncControls() {
    $$('#gradeChips .chip').forEach((b) => b.classList.toggle('active', Number(b.dataset.grade) === state.grade));
    $$('#methodChips .chip').forEach((b) => b.classList.toggle('active', b.dataset.method === state.method));
    $('#unit1').checked = state.unit1;
    $('#unit1Text').textContent = state.unit1 ? '使用' : '不用';
    updateHint();
  }

  function setGrade(g) {
    state.grade = g;
    store.set('grade', g);
    $$('#gradeChips .chip').forEach((b) => b.classList.toggle('active', Number(b.dataset.grade) === g));
    updateHint();
  }

  function setMethod(m) {
    state.method = m;
    store.set('method', m);
    $$('#methodChips .chip').forEach((b) => b.classList.toggle('active', b.dataset.method === m));
    updateHint();
  }

  function updateHint() {
    const hint = $('#ctrlHint');
    hint.classList.remove('strong');
    if (state.method === 'equation' && state.grade <= 3) {
      hint.textContent = '三年级以下用方程会跳步，建议先用算术解；如果孩子已经会设未知数，也可以继续。';
      hint.classList.add('strong');
    } else if (state.unit1 && state.grade <= 4) {
      hint.textContent = '单位 1 一般从五年级分数乘除开始用。低年级选了也没关系——遇到不涉及的题会自动忽略。';
      hint.classList.add('strong');
    } else if (state.grade >= 5 && state.method === 'arithmetic' && !state.unit1) {
      hint.textContent = '五年级以上遇到分数、百分数、倍比题时，打开「单位 1」讲得更透。';
    } else {
      hint.textContent = '三年级以上推荐「算术解」；五六年级可试「方程解」；单位 1 只在分数、百分数、倍比题里起作用。';
    }
  }

  /* ---------------- 示例题 ---------------- */
  function initExamples() {
    const wrap = $('#examples');
    MT.demo.examples.forEach((ex) => {
      const b = el('button', { type: 'button', class: 'example', text: ex.label, title: ex.text });
      b.addEventListener('click', () => {
        $('#problem').value = ex.text;
        setGrade(ex.grade);
        $('#problem').focus();
      });
      wrap.appendChild(b);
    });
  }

  function randomExample() {
    const list = MT.demo.examples;
    const ex = list[Math.floor(Math.random() * list.length)];
    $('#problem').value = ex.text;
    setGrade(ex.grade);
    toast('换了一道：' + ex.label);
  }

  /* ---------------- 加载遮罩 ---------------- */
  let loadingTimer = null, loadingStart = 0;
  const TIPS = [
    '把题目拆成数量关系',
    '想一想：谁是单位 1？',
    '先画图，再列式',
    '线段长度要按份数成比例',
    '算完回头验一验',
    '图上找不到依据的算式，不要写'
  ];

  function showLoading(hasImage) {
    const box = $('#loading');
    box.hidden = false;
    loadingStart = performance.now();
    let tipIndex = 0;
    $('#loadingTitle').textContent = hasImage ? '正在读图…' : '正在读题…';
    $('#loadingTip').textContent = TIPS[0];
    $('#loadingBar').style.width = '6%';
    $('#loadingTime').textContent = '0.0s';
    clearInterval(loadingTimer);
    loadingTimer = setInterval(() => {
      const t = (performance.now() - loadingStart) / 1000;
      $('#loadingTime').textContent = t.toFixed(1) + 's';
      $('#loadingBar').style.width = Math.min(88, 6 + t * 4.2).toFixed(0) + '%';
      tipIndex = Math.floor(t / 2.6) % TIPS.length;
      $('#loadingTip').textContent = TIPS[tipIndex];
      if (t > 3) $('#loadingTitle').textContent = '正在构思图解…';
      if (t > 8) $('#loadingTitle').textContent = '正在写讲解…';
      if (t > 16) $('#loadingTitle').textContent = '模型在慢慢想，再等一下…';
    }, 200);
  }

  function hideLoading(ok) {
    clearInterval(loadingTimer);
    const bar = $('#loadingBar');
    bar.style.width = '100%';
    setTimeout(() => { $('#loading').hidden = true; bar.style.width = '6%'; }, ok ? 260 : 0);
  }

  /* ---------------- 解题 ---------------- */
  async function solve(opts) {
    opts = opts || {};
    if (state.busy) return;
    const problem = (opts.problem != null ? opts.problem : $('#problem').value || '').trim();
    const image = opts.image !== undefined ? opts.image : (shotData ? shotData.dataUrl : null);
    if (!problem && !image) {
      toast('贴一道题，或者拍张照片');
      $('#problem').focus();
      return;
    }
    if (!MT.llm.isConfigured()) {
      openSettings();
      toast('先连接一个模型：填好服务商和 API Key 就可以开始了');
      return;
    }
    if (image && !MT.llm.visionModelOf(MT.llm.getConfig())) {
      hintVision();
      toast('带图讲解要选一个能看图的模型', 'err', 4200);
      return;
    }

    state.busy = true;
    const btn = $('#btnSolve');
    btn.classList.add('busy');
    btn.querySelector('.solve-txt').textContent = '讲解中';
    showLoading(!!image);

    try {
      const res = await MT.agent.solve({
        problem, grade: state.grade, method: state.method, unit1: state.unit1,
        image: image || undefined,
        nudge: opts.nudge,
        onPhase: (p) => {
          const map = { reading: '正在读图…', thinking: '正在读题…', parsing: '正在整理图解…', checking: '正在核对算式…', fixing: '发现一处可疑，正在复核…', repair: '格式没对上，重新生成…' };
          if (map[p]) $('#loadingTitle').textContent = map[p];
        }
      });
      hideLoading(true);
      render(res);
      if (problem) store.set('lastProblem', problem);
      state.lastModel = res.model;
    } catch (e) {
      hideLoading(false);
      console.error(e);
      const msg = String(e.message || e);
      toast(msg.startsWith('还没有') ? msg : '出错了：' + msg.slice(0, 100), 'err', 5600);
    } finally {
      state.busy = false;
      btn.classList.remove('busy');
      btn.querySelector('.solve-txt').textContent = '开始讲解';
    }
  }

  /* ---------------- 渲染一节课 ---------------- */
  function render(res) {
    const script = res.script;
    state.script = script;
    state.verify = res.verify;

    // 头部
    $('#metaTopic').textContent = script.meta.topic || '数学题';
    $('#stageTitle').textContent = script.plan.headline || script.problem.question || '讲解';

    const tags = [];
    tags.push(`<span class="tag blue">${MT.prompt.GRADE_NAME[script.meta.grade]}·${script.meta.method === 'equation' ? '方程解' : '算术解'}</span>`);
    if (script.meta.unit1Used) tags.push('<span class="tag purple">用了单位 1</span>');
    else if (script.meta.unit1) tags.push('<span class="tag">未涉及单位 1</span>');
    if (script.meta.gradeFit === 'above') tags.push('<span class="tag amber">超出本年级</span>');
    if (script.meta.gradeFit === 'below') tags.push('<span class="tag">低于本年级</span>');
    if (res.warnings && res.warnings.length) tags.push('<span class="tag amber">图解待完善</span>');
    $('#stageMeta').innerHTML = tags.join('');

    // 播放器
    if (state.player) state.player.stop();
    const svgHost = $('#svgHost');
    $('#narration').hidden = true;
    state.player = new MT.Player(svgHost, script, {
      interval: Number($('#speed').value),
      onStep: onStepChange,
      onNote: (text) => {
        const n = $('#narration');
        if (!text) { n.hidden = true; n.textContent = ''; return; }
        n.hidden = false;
        n.textContent = text;
        n.classList.remove('in');
        void n.offsetWidth;
        n.classList.add('in');
      },
      onPlay: (playing) => {
        $('#player').classList.toggle('playing', playing);
        $('#btnPlay').title = playing ? '暂停' : '自动播放';
      }
    });

    // 步骤列表
    renderSteps(script, res.verify);

    // 底部信息
    renderFoot(script, res);

    // 自检徽标
    const pill = $('#checkPill');
    const bad = res.verify ? res.verify.bad : 0;
    pill.hidden = false;
    pill.classList.toggle('bad', bad > 0);
    pill.textContent = bad > 0 ? `${bad} 处算式待核对` : (res.verify && res.verify.total ? '✓ 算式已复核' : '✓ 讲解完成');

    // 追问可用
    $('#qaInput').disabled = false;
    $('#qaSend').disabled = false;
    $('#qaLog').innerHTML = '';
    $('#btnRethink').hidden = false;

    state.player.goto(0, true);
  }

  function renderSteps(script, verify) {
    const list = $('#stepsList');
    list.innerHTML = '';
    script.steps.forEach((s, i) => {
      const li = el('li', { class: 'step', 'data-i': i });
      const num = el('span', { class: 'step-num', text: String(i + 1) });
      const body = el('div', { class: 'step-body' });

      const head = el('div', { class: 'step-title' });
      head.innerHTML = escapeHtml(s.title) + `<span class="phase">${escapeHtml(s.phase)}</span>`;
      body.appendChild(head);

      if (s.text) body.appendChild(el('div', { class: 'step-text' }, inlineMd(s.text)));
      if (s.math) body.appendChild(el('div', { class: 'step-math', text: s.math }));
      if (s.why) body.appendChild(el('div', { class: 'step-why', text: '💡 ' + s.why }));

      const r = verify && verify.results[i];
      if (r && r.status === 'bad') {
        body.appendChild(el('div', { class: 'step-err', text: '⚠ 这一步算不平：' + (r.message || '') }));
        li.classList.add('bad');
      }

      li.appendChild(num);
      li.appendChild(body);
      li.addEventListener('click', () => { if (state.player) state.player.jump(i); });
      list.appendChild(li);
    });
  }

  function renderFoot(script, res) {
    const foot = $('#stageFoot');
    foot.innerHTML = '';
    if (script.plan.relation) {
      const chip = el('span', { class: 'formula-chip', text: script.plan.relation });
      foot.appendChild(el('span', { text: '数量关系：' }));
      foot.appendChild(chip);
    }
    if (script.meta.note) {
      foot.appendChild(el('span', { class: 'tag', text: script.meta.note }));
    }
    (script.checks || []).slice(0, 3).forEach((c) => {
      const ok = MT.expr.checkMath(c).status !== 'bad';
      const chip = el('span', { class: 'formula-chip', text: (ok ? '✓ ' : '⚠ ') + c });
      chip.style.background = ok ? '#E7F6EE' : '#FDEDE9';
      chip.style.borderColor = ok ? '#C8EAD8' : '#F6CFC6';
      chip.style.color = ok ? '#1F7A4D' : '#A33A28';
      foot.appendChild(chip);
    });
    if (script.answer.sentence) {
      foot.appendChild(el('span', { class: 'tag green', text: '答案：' + script.answer.sentence }));
    }
  }

  function onStepChange(i, step) {
    $$('#stepsList .step').forEach((li, k) => {
      li.classList.toggle('active', k === i);
      li.classList.toggle('done', k < i);
    });
    const n = state.script.steps.length;
    $('#stepCounter').textContent = (i + 1) + ' / ' + n;
    $('#stepName').textContent = step.title || '';
    $('#trackFill').style.width = ((i + 1) / n * 100) + '%';

    const active = $('#stepsList .step.active');
    if (active) {
      const list = $('#stepsList');
      const top = active.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top + active.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTo({ top: top - 12, behavior: 'smooth' });
      }
    }
  }

  /* ---------------- 追问 ---------------- */
  function initQA() {
    const form = $('#qaForm');
    const input = $('#qaInput');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q || !state.script) return;
      input.value = '';
      appendBubble('ask', q);
      const pending = appendBubble('ans', '正在想…', 'pending');
      input.disabled = true;
      try {
        const res = await MT.agent.ask(state.script, q);
        pending.classList.remove('pending');
        pending.textContent = res.text || '这个问题我还没想清楚，换个问法试试？';
        if (res.step && state.player) state.player.jump(Math.max(0, res.step - 1));
        if (res.focus && res.focus.length && state.player) {
          state.player.applyOp({ op: 'focus', ids: res.focus, text: '' });
        }
      } catch (err) {
        pending.classList.remove('pending');
        pending.textContent = '没问上：' + String(err.message || err).slice(0, 80);
      } finally {
        input.disabled = false;
        $('#qaSend').disabled = false;
        input.focus();
      }
    });
    $('#qaLog').addEventListener('click', (e) => e.stopPropagation());
  }

  function appendBubble(kind, text, extraClass) {
    const log = $('#qaLog');
    const b = el('div', { class: 'qa-bubble ' + kind + (extraClass ? ' ' + extraClass : ''), text });
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  /* ---------------- 内置示例（无需 Key） ---------------- */
  let demoIndex = -1;
  function showDemo(advance, force) {
    const list = MT.demo.lessons;
    if (force != null) demoIndex = force % list.length;
    else if (advance) demoIndex = (demoIndex + 1) % list.length;
    else demoIndex = Math.max(0, demoIndex);

    const out = MT.schema.normalize(list[demoIndex]);
    const v = MT.schema.verify(out.script);
    render({ script: out.script, warnings: out.warnings, verify: v, ms: 0, calls: 0 });
    if (advance || force != null) {
      toast(`内置示例 ${demoIndex + 1}/${list.length}：${out.script.meta.topic || ''}（不需要 Key）`);
    }
  }

  /* ---------------- 拍照 / 上传题目图片 ---------------- */
  let shotData = null;

  function setShotStatus(text, cls) {
    const n = $('#shotStatus');
    n.textContent = text;
    n.className = cls || '';
  }

  function clearShot() {
    shotData = null;
    $('#shotRow').hidden = true;
    $('#shotImg').removeAttribute('src');
    $('#problem').placeholder = PLACEHOLDER_DEFAULT;
  }

  const PLACEHOLDER_DEFAULT = '把题目粘贴到这里，比如：小明有 48 元，小红的钱是小明的 3/4，两个人一共有多少元？';

  function hintVision() {
    openSettings();
    setTimeout(() => {
      const inp = $('#visionModel');
      inp.focus();
      inp.style.borderColor = '#FFB392';
      $('#testResult').textContent = '拍照/传图讲解必须用一个能看图的模型，填好识图模型再保存';
      $('#testResult').className = 'test-result bad';
    }, 140);
  }

  async function handleImage(file) {
    if (!file) return;
    if (!/^image\//.test(file.type || '')) { toast('请选择图片文件（JPG / PNG）'); return; }
    if (file.size > 12 * 1024 * 1024) { toast('图片超过 12MB，先压缩一下'); return; }

    try {
      const small = await MT.image.shrink(file);
      shotData = small;
      $('#shotImg').src = small.dataUrl;
      $('#shotTitle').textContent = `题目图片 · ${small.w}×${small.h}`;
      $('#shotRow').hidden = false;

      const cfg = MT.llm.getConfig();
      const vm = MT.llm.visionModelOf(cfg);
      if (!MT.llm.isConfigured()) {
        setShotStatus('已附加 · 还没配置模型', 'bad');
        openSettings();
        return;
      }
      if (!vm) {
        const preset = MT.llm.PRESETS.find((x) => x.id === cfg.provider);
        const name = (preset && preset.name) || '当前服务商';
        setShotStatus(`已附加 · ${name}看不了图，要换个服务商`, 'bad');
        toast(`${name}没有视觉模型：请在设置里换成 通义千问 / 硅基流动 / Kimi 之一，再回来讲解`, 'err', 6200);
        hintVision();
        return;
      }
      setShotStatus(`已附加 · 将用 ${vm} 读图讲解`, 'ok');
      $('#problem').placeholder = '（可选）补充说明，比如：只讲第 2 问，或者图上第 3 题';
      $('#problem').focus();
    } catch (e) {
      toast(String(e.message || e), 'err');
    }
  }

  function initShoot() {
    const input = $('#fileInput');
    $('#btnShoot').addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (f) handleImage(f);
      input.value = '';
    });
    $('#shotRemove').addEventListener('click', clearShot);

    const ask = $('.ask');
    ['dragenter', 'dragover'].forEach((ev) => ask.addEventListener(ev, (e) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      ask.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach((ev) => ask.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && e.relatedTarget && ask.contains(e.relatedTarget)) return;
      ask.classList.remove('dragover');
    }));
    ask.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleImage(f);
    });

    $('#problem').addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type && it.type.indexOf('image/') === 0) {
          e.preventDefault();
          handleImage(it.getAsFile());
          return;
        }
      }
    });
  }

  /* ---------------- 设置 ---------------- */
  function fillPreset(id) {
    const p = MT.llm.PRESETS.find((x) => x.id === id) || MT.llm.PRESETS[0];
    $('#baseUrl').value = p.base;
    $('#model').value = p.model;
    $('#providerNote').textContent = p.note;
    const chips = $('#modelChips');
    chips.innerHTML = '';
    (p.models || []).forEach((m) => {
      const c = el('button', { type: 'button', class: 'chip', text: m });
      c.addEventListener('click', () => { $('#model').value = m; });
      chips.appendChild(c);
    });
    $('#visionModel').value = p.vision || '';
    const vchips = $('#visionChips');
    vchips.innerHTML = '';
    if (!(p.visionModels || []).length) {
      vchips.appendChild(el('span', { class: 'field-note', text: '这家没有内置视觉模型，可以留空' }));
    }
    (p.visionModels || []).forEach((m) => {
      const c = el('button', { type: 'button', class: 'chip', text: m });
      c.addEventListener('click', () => { $('#visionModel').value = m; });
      vchips.appendChild(c);
    });
  }

  function openSettings() {
    const cfg = MT.llm.getConfig();
    const sel = $('#provider');
    if (!sel.options.length) {
      MT.llm.PRESETS.forEach((p) => sel.appendChild(el('option', { value: p.id, text: p.name })));
    }
    sel.value = cfg.provider;
    $('#baseUrl').value = cfg.baseUrl;
    $('#model').value = cfg.model;
    $('#apiKey').value = cfg.apiKey;
    $('#temperature').value = cfg.temperature;
    $('#tempVal').textContent = cfg.temperature;
    $('#jsonMode').checked = cfg.jsonMode;
    $('#thinking').value = cfg.thinking || 'auto';
    const preset = MT.llm.PRESETS.find((x) => x.id === cfg.provider) || MT.llm.PRESETS[0];
    $('#visionModel').value = cfg.visionModel || preset.vision || '';
    $('#providerNote').textContent = preset.note;
    const chips = $('#modelChips');
    chips.innerHTML = '';
    (preset.models || []).forEach((m) => {
      const c = el('button', { type: 'button', class: 'chip', text: m });
      c.addEventListener('click', () => { $('#model').value = m; });
      chips.appendChild(c);
    });
    const vchips = $('#visionChips');
    vchips.innerHTML = '';
    if (!(preset.visionModels || []).length) {
      vchips.appendChild(el('span', { class: 'field-note', text: '这家服务商没有视觉模型，拍图讲解请换成通义千问 / 硅基流动 / Kimi' }));
    }
    (preset.visionModels || []).forEach((m) => {
      const c = el('button', { type: 'button', class: 'chip', text: m });
      c.addEventListener('click', () => { $('#visionModel').value = m; });
      vchips.appendChild(c);
    });
    $('#testResult').textContent = '';
    $('#testResult').className = 'test-result';
    $('#settingsModal').hidden = false;
  }

  function closeSettings() { $('#settingsModal').hidden = true; }

  function readForm() {
    return {
      provider: $('#provider').value,
      baseUrl: $('#baseUrl').value.trim(),
      model: $('#model').value.trim(),
      visionModel: $('#visionModel').value.trim(),
      apiKey: $('#apiKey').value.trim(),
      temperature: Number($('#temperature').value),
      thinking: $('#thinking').value,
      jsonMode: $('#jsonMode').checked
    };
  }

  function updateModelPill() {
    const cfg = MT.llm.getConfig();
    const pill = $('#modelPill');
    if (cfg.apiKey && cfg.model) {
      pill.textContent = cfg.model;
      pill.className = 'model-pill ok';
      pill.title = '已连接：' + cfg.model;
    } else {
      pill.textContent = '未配置模型';
      pill.className = 'model-pill warn';
      pill.title = '点右上角设置，填入 API Key';
    }
  }

  function initSettings() {
    $('#btnSettings').addEventListener('click', openSettings);
    $$('#settingsModal [data-close]').forEach((n) => n.addEventListener('click', closeSettings));
    $('#provider').addEventListener('change', (e) => fillPreset(e.target.value));
    $('#temperature').addEventListener('input', (e) => { $('#tempVal').textContent = e.target.value; });
    $('#btnEye').addEventListener('click', () => {
      const inp = $('#apiKey');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      $('#btnEye').textContent = inp.type === 'password' ? '显示' : '隐藏';
    });
    $('#btnSaveSettings').addEventListener('click', () => {
      MT.llm.saveConfig(readForm());
      updateModelPill();
      closeSettings();
      toast('设置已保存（只存在这台电脑上）', 'ok');
    });
    $('#btnClearKey').addEventListener('click', () => {
      MT.llm.clearKey();
      $('#apiKey').value = '';
      updateModelPill();
      toast('已清除密钥');
    });
    $('#btnTest').addEventListener('click', async () => {
      const cfg = readForm();
      const box = $('#testResult');
      if (!cfg.apiKey) { box.textContent = '先填 API Key'; box.className = 'test-result bad'; return; }
      box.textContent = '测试中…';
      box.className = 'test-result';
      try {
        const r = await MT.llm.test(cfg);
        box.textContent = `连接成功 · ${r.ms}ms`;
        box.className = 'test-result ok';
      } catch (e) {
        box.textContent = String(e.message || e).slice(0, 60);
        box.className = 'test-result bad';
      }
    });

    // 直接问服务商要当前可用的模型名，避免内置列表过期
    $('#btnModels').addEventListener('click', async () => {
      const note = $('#modelListNote');
      const cfg = readForm();
      if (!cfg.apiKey) { note.textContent = '先填 API Key'; note.className = 'field-note bad'; return; }
      note.textContent = '拉取中…';
      note.className = 'field-note';
      try {
        const list = await MT.llm.listModels(cfg);
        if (!list.length) throw new Error('服务商没有返回模型');
        const chips = $('#modelChips');
        chips.innerHTML = '';
        list.forEach((m) => {
          const c = el('button', { type: 'button', class: 'chip', text: m });
          c.addEventListener('click', () => { $('#model').value = m; });
          chips.appendChild(c);
        });
        note.textContent = `已拉取 ${list.length} 个模型，点一下就能选`;
        note.className = 'field-note ok';
      } catch (e) {
        note.textContent = String(e.message || e).slice(0, 50);
        note.className = 'field-note bad';
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#settingsModal').hidden) closeSettings();
    });
  }

  /* ---------------- 播放器按钮 ---------------- */
  function initPlayer() {
    $('#btnPlay').addEventListener('click', () => {
      if (!state.player) return;
      if (state.player.playing) state.player.stop(); else state.player.play();
    });
    $('#btnNext').addEventListener('click', () => state.player && state.player.next());
    $('#btnPrev').addEventListener('click', () => state.player && state.player.prev());
    $('#btnRestart').addEventListener('click', () => state.player && state.player.restart());
    $('#speed').addEventListener('change', (e) => { if (state.player) state.player.opts.interval = Number(e.target.value); });

    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (!state.player) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); state.player.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); state.player.prev(); }
      else if (e.key === ' ') { e.preventDefault(); if (state.player.playing) state.player.stop(); else state.player.play(); }
    });
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    if (!$('#gradeChips')) return; // 非主页面（如渲染预览页）直接跳过
    initControls();
    initExamples();
    initSettings();
    initPlayer();
    initQA();
    initShoot();
    updateModelPill();
    updateHint();

    $('#btnSolve').addEventListener('click', () => solve());
    $('#problem').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') solve();
    });
    $('#btnClear').addEventListener('click', () => {
      $('#problem').value = '';
      clearShot();
      $('#problem').focus();
    });
    $('#btnRandom').addEventListener('click', randomExample);
    $('#btnRethink').addEventListener('click', () => {
      solve({ nudge: '换一种更直观的讲解顺序，多用图上的动作，少讲抽象的话。' });
    });
    $('#btnDemo').addEventListener('click', () => showDemo(true));

    const last = store.get('lastProblem', '');
    if (last) $('#problem').value = last;

    // 便于截图/演示：打开 #demo / #demo1..3 / #demo3s4（第 4 步）直接渲染内置示例
    const hash = location.hash.match(/^#demo(\d)?(?:s(\d+))?$/);
    if (hash) {
      const idx = hash[1] ? Number(hash[1]) - 1 : 0;
      const stepN = Number(hash[2]) || 0;
      setTimeout(() => {
        showDemo(false, idx);
        if (stepN && state.player) state.player.jump(stepN - 1);
      }, 80);
    }

    if (!MT.llm.isConfigured()) {
      setTimeout(() => toast('第一次使用：点右上角「设置」填入 API Key，或先点「看示例」'), 900);
    }

    // 调试/演示用锚点
    if (location.hash === '#settings') {
      openSettings();
      const card = $('.modal-card');
      if (card) card.style.animation = 'none';
      const adv = $('.advanced');
      if (adv) adv.setAttribute('open', '');
    }
    if (location.hash === '#shot') {
      const fake = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="300"><rect width="520" height="300" fill="#fff"/>
         <text x="26" y="46" font-size="17" fill="#333">9. 甲容器中有纯酒精 10 kg，乙容器中有水</text>
         <text x="26" y="76" font-size="17" fill="#333">18 kg。第一次将甲容器中的一部分纯酒精倒</text>
         <text x="26" y="106" font-size="17" fill="#333">入乙容器中……</text></svg>`
      );
      $('#shotImg').src = fake;
      $('#shotTitle').textContent = '题目图片 · 1400×980';
      $('#shotRow').hidden = false;
      setShotStatus('已附加 · 将用 qwen-vl-max 读图讲解', 'ok');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  MT.app = { state, solve, render, openSettings };
})();
