/* 20-expr.js —— 算式求值 + 讲解步骤自检
   目标：模型算错的地方，浏览器这边要抓得住。
   支持：整数、小数、分数、百分号、括号、+-×÷，左右两边用 = 比较。 */
(function () {
  const MT = (window.MT = window.MT || {});
  const Frac = MT.Frac;

  function tokenize(src) {
    const s = String(src)
      .replace(/[＋]/g, '+').replace(/[－—–−]/g, '-')
      .replace(/[×✕✖·⋅]/g, '*').replace(/[÷／]/g, '/')
      .replace(/[（]/g, '(').replace(/[）]/g, ')')
      .replace(/\s+/g, '');
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const raw = s.slice(i, j);
        if ((raw.match(/\./g) || []).length > 1) throw new Error('数字格式错误：' + raw);
        tokens.push({ t: 'num', v: raw });
        i = j;
      } else if ('+-*/()%'.includes(c)) {
        tokens.push({ t: c });
        i++;
      } else {
        throw new Error('看不懂的符号：' + c);
      }
    }
    return tokens;
  }

  function parse(tokens) {
    let p = 0;
    const peek = () => tokens[p];
    const eat = (t) => { if (tokens[p] && tokens[p].t === t) { p++; return true; } return false; };

    function expr() {
      let left = term();
      for (;;) {
        if (eat('+')) left = left.add(term());
        else if (eat('-')) left = left.sub(term());
        else return left;
      }
    }
    function term() {
      let left = unary();
      for (;;) {
        if (eat('*')) left = left.mul(unary());
        else if (eat('/')) left = left.div(unary());
        else return left;
      }
    }
    function unary() {
      if (eat('-')) return unary().neg();
      if (eat('+')) return unary();
      return postfix();
    }
    function postfix() {
      let v = primary();
      while (eat('%')) v = v.div(new Frac(100, 1));
      return v;
    }
    function primary() {
      const tk = peek();
      if (!tk) throw new Error('算式不完整');
      if (tk.t === 'num') { p++; return Frac.parse(tk.v); }
      if (tk.t === '(') {
        p++;
        const v = expr();
        if (!eat(')')) throw new Error('括号没有配对');
        return v;
      }
      throw new Error('算式里多了个符号：' + (tk.v || tk.t));
    }

    const v = expr();
    if (p < tokens.length) throw new Error('算式多出一段：' + tokens.slice(p).map((x) => x.v || x.t).join(''));
    return v;
  }

  function evalExpr(s) {
    const tokens = tokenize(s);
    if (!tokens.length) throw new Error('空算式');
    return parse(tokens);
  }

  /** 从可能夹带单位的算式里提炼纯算术部分；含字母/汉字则放弃核查 */
  function cleanMath(raw) {
    let s = String(raw || '');
    if (/[a-zA-Z]/.test(s)) return { skip: true, reason: '含字母（方程变形），跳过自动核查' };
    if (/[甲乙丙丁A-Za-z]/.test(s)) return { skip: true, reason: '含未知量名称，跳过自动核查' };
    // 去掉单位、说明文字：只保留算术字符与百分号
    s = s.replace(/[^0-9.+\-*/×÷（）()＝=%\s]/g, ' ');
    s = s.replace(/[＝]/g, '=');
    s = s.replace(/\s+/g, '');
    if (!/[0-9]/.test(s)) return { skip: true, reason: '这一步没有可计算的数字' };
    if (!s.includes('=')) return { skip: true, reason: '这一步是思路说明，不是算式' };
    return { skip: false, text: s };
  }

  /**
   * 核查一条算式，例如 "48 ÷ 4 = 12"
   * @returns {{status:'ok'|'bad'|'skip', message?:string, value?:Frac}}
   */
  function checkMath(raw) {
    const cleaned = cleanMath(raw);
    if (cleaned.skip) return { status: 'skip', message: cleaned.reason };
    const parts = cleaned.text.split('=');
    try {
      if (parts.length === 1) {
        return { status: 'ok', value: evalExpr(parts[0]) };
      }
      const vals = parts.map((p) => evalExpr(p));
      const first = vals[0];
      for (let i = 1; i < vals.length; i++) {
        if (!first.eq(vals[i])) {
          return {
            status: 'bad',
            message: `等号两边不相等：左边 ${first.toString()}，右边 ${vals[i].toString()}`,
            left: first, right: vals[i]
          };
        }
      }
      return { status: 'ok', value: first, parts: vals };
    } catch (e) {
      return { status: 'skip', message: e.message };
    }
  }

  /** 两个数值字符串是否数学上相等（用于核对最终答案） */
  function sameValue(a, b) {
    if (a == null || b == null || a === '' || b === '') return null;
    try { return Frac.parse(String(a).replace(/[^\d.\-/]/g, '')).eq(Frac.parse(String(b).replace(/[^\d.\-/]/g, ''))); }
    catch (e) { return null; }
  }

  MT.expr = { evalExpr, checkMath, cleanMath, sameValue };
})();
