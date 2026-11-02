/* 55-agent.js —— 解题智能体：调用 → 解析 → 自检 → 必要时修一次
   支持题目以图片给出：图片直接随消息发给视觉模型，由它自己看图、读数、建模。 */
(function () {
  const MT = (window.MT = window.MT || {});
  const P = MT.prompt, S = MT.schema, L = MT.llm;

  function clip(text, n) {
    const s = String(text || '');
    return s.length > n ? s.slice(0, n) + '\n…（后略）' : s;
  }

  /** 给多模态 content 追加一句提醒（content 可能是字符串，也可能是 [{type:'text'|'image_url'}]） */
  function withNote(content, note) {
    if (Array.isArray(content)) return content.concat([{ type: 'text', text: note }]);
    return content + note;
  }

  /**
   * 完整解题流程
   * @param {{problem:string, grade:number, method:string, unit1:boolean, image?:string, nudge?:string, onPhase?:Function}} opts
   * @returns {Promise<{script, verify, warnings, ms, calls, repaired, model}>}
   */
  async function solve(opts) {
    const t0 = performance.now();
    const { problem, grade, method, unit1, image, nudge, onPhase } = opts;
    const phase = onPhase || function () {};
    let calls = 0;
    let repaired = false;

    // 带图时必须用视觉模型；没有视觉模型就直接拒绝，别让它瞎猜
    const cfg = L.getConfig();
    const vision = image ? L.visionModelOf(cfg) : '';
    if (image && !vision) {
      const e = new Error('带图讲解需要视觉模型：请在设置里选一个能看图的模型（如 qwen-vl-max / Qwen2.5-VL / Kimi vision）');
      e.code = 'NO_VISION';
      throw e;
    }
    const model = vision || cfg.model;
    const callOpts = { config: { model } };

    const userPrompt = P.buildUserPrompt({ problem, grade, method, unit1, hasImage: !!image });
    const userContent = image
      ? [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: image } }]
      : userPrompt;

    const firstMessages = () => {
      const m = [
        { role: 'system', content: P.systemPrompt() },
        { role: 'user', content: userContent }
      ];
      if (nudge) m.push({ role: 'user', content: '上一版讲得不够清楚。请换一种更直观的讲法重讲一次：' + nudge });
      return m;
    };

    phase(image ? 'reading' : 'thinking');
    let text = await L.chat(firstMessages(), callOpts);
    calls++;

    phase('parsing');
    let out;
    try {
      out = S.normalize(text);
    } catch (e1) {
      phase('repair');
      text = await L.chat([
        { role: 'system', content: P.systemPrompt() },
        {
          role: 'user',
          content: withNote(userContent,
            `\n\n注意：你上一次的输出无法解析（${e1.message}）。请严格只输出一个合法的 JSON 对象，不要包代码块，不要多余文字。`)
        }
      ], callOpts);
      calls++;
      out = S.normalize(text);
    }

    phase('checking');
    let v = S.verify(out.script);

    // 算错时请求模型修正一次
    const needFix = v.bad > 0 || (v.answerCheck && v.answerCheck.ok === false);
    if (needFix) {
      try {
        phase('fixing');
        repaired = true;
        const badSteps = out.script.steps.filter((st) => st.check === 'bad')
          .map((st) => `第${st.n}步「${st.title}」算式 ${st.math}：${(v.results[st.n - 1] || {}).message || '算错了'}`);
        const answerMsg = v.answerCheck && v.answerCheck.ok === false
          ? `最终答案写的是 ${out.script.answer.value}，但讲解的算式里没有任何一步算出这个数，请对照检查。`
          : '';
        const fixMsg = `你刚生成的讲解里，有算式对不上：
${badSteps.join('\n')}
${answerMsg}
请重新核对，输出**修正后的完整 JSON**（结构不变，只改错的地方），不要解释。`;
        const fixedText = await L.chat([
          { role: 'system', content: P.systemPrompt() },
          { role: 'user', content: userContent },
          { role: 'assistant', content: clip(JSON.stringify(out.script.raw || out.script), 12000) },
          { role: 'user', content: fixMsg }
        ], callOpts);
        calls++;
        const fixed = S.normalize(fixedText);
        const v2 = S.verify(fixed.script);
        if (v2.bad <= v.bad) { out = fixed; v = v2; }
      } catch (e) {
        // 修复失败就保留原稿，由界面标出可疑步骤
      }
    }

    return {
      script: out.script,
      warnings: out.warnings,
      verify: v,
      ms: Math.round(performance.now() - t0),
      calls,
      repaired,
      model
    };
  }

  /** 追问：回答并指回图上 */
  async function ask(script, question) {
    const text = await L.chat([
      { role: 'system', content: '你是一位耐心的小学数学老师，回答要短、要具体、要打比方。只输出 JSON。' },
      { role: 'user', content: P.buildAskPrompt(script, question) }
    ]);
    let obj;
    try {
      obj = S.extractJson(text);
    } catch (e) {
      return { text: String(text).slice(0, 160), focus: [], step: 0 };
    }
    return {
      text: String((obj && obj.text) || '').slice(0, 220),
      focus: Array.isArray(obj && obj.focus) ? obj.focus.slice(0, 2) : [],
      step: Number(obj && obj.step) || 0
    };
  }

  MT.agent = { solve, ask };
})();
