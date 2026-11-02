/* 10-frac.js —— 精确分数运算，供「算式自检」使用 */
(function () {
  const MT = (window.MT = window.MT || {});

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = a % b; a = b; b = t; }
    return a || 1;
  }

  class Frac {
    constructor(n, d) {
      n = Math.round(n); d = Math.round(d === undefined ? 1 : d);
      if (d === 0) throw new Error('除数不能为 0');
      if (d < 0) { n = -n; d = -d; }
      const g = gcd(n, d);
      this.n = n / g;
      this.d = d / g;
    }
    add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
    div(o) { if (o.n === 0) throw new Error('除以 0'); return new Frac(this.n * o.d, this.d * o.n); }
    neg() { return new Frac(-this.n, this.d); }
    eq(o) { return this.n === o.n && this.d === o.d; }
    lt(o) { return this.n * o.d < o.n * this.d; }
    get value() { return this.n / this.d; }
    toString() { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; }
    isZero() { return this.n === 0; }

    static of(x) { return x instanceof Frac ? x : new Frac(x, 1); }

    /** 解析 "3/4" / "0.75" / "-12" / "75%" */
    static parse(str) {
      let s = String(str).trim().replace(/\s+/g, '');
      let pct = false;
      if (s.endsWith('%')) { pct = true; s = s.slice(0, -1); }
      let f;
      const m = s.match(/^([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)$/);
      if (m) {
        f = new Frac(decToInt(m[1]) * (1), 1);
        const a = decOf(m[1]), b = decOf(m[2]);
        f = new Frac(a.n * b.d, a.d * b.n);
      } else {
        const d = decOf(s);
        f = new Frac(d.n, d.d);
      }
      return pct ? f.div(new Frac(100, 1)) : f;
    }
  }

  /** "3.75" -> {n:375,d:100} */
  function decOf(s) {
    s = String(s).trim();
    let sign = 1;
    if (s[0] === '-') { sign = -1; s = s.slice(1); }
    else if (s[0] === '+') s = s.slice(1);
    const dot = s.indexOf('.');
    if (dot < 0) return { n: sign * parseInt(s || '0', 10), d: 1 };
    const int = s.slice(0, dot) || '0';
    const frac = s.slice(dot + 1);
    const d = Math.pow(10, frac.length);
    return { n: sign * parseInt(int + frac, 10), d: d };
  }
  function decToInt(s) { const d = decOf(s); return d.n; }

  MT.Frac = Frac;
})();
