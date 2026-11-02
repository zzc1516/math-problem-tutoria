/* 70-player.js —— 讲解播放器：把 ops 变成图上的一次次变化 */
(function () {
  const MT = (window.MT = window.MT || {});
  const NS = 'http://www.w3.org/2000/svg';

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svgNode(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  class Player {
    constructor(host, script, opts) {
      this.host = host;
      this.script = script;
      this.opts = opts || {};
      this.index = -1;
      this.playing = false;
      this.timer = null;
      this.handle = null;
      this.calloutEl = null;
      this.marks = [];
      this.lastSpec = null;
      this.mount();
    }

    get steps() { return this.script.steps; }

    mount(spec, swap) {
      this.host.innerHTML = '';
      const { svg, reg } = MT.diagrams.render(spec || this.script.diagram);
      this.handle = { svg, reg };
      this.host.appendChild(svg);
      if (swap) svg.classList.add('swap-in');
      this.svg = svg;
      this.index = -1;
    }

    /** 清空所有 op 造成的状态，重新画一遍 */
    resetCanvas(spec, swap) {
      this.mount(spec, swap);
    }

    find(id) { return this.handle.reg[id] || null; }

    clearOverlays() {
      if (this.calloutEl) { this.calloutEl.remove(); this.calloutEl = null; }
      this.marks.forEach((m) => m.remove());
      this.marks = [];
    }

    /** 依次应用 0..i 步的 ops */
    goto(i, animate) {
      const n = this.steps.length;
      i = Math.max(0, Math.min(n - 1, i));
      if (i === this.index) return;
      const forward = i > this.index;

      // 步骤可以带自己的图：从最近一次换图的那一步开始应用 ops
      let start = 0;
      for (let k = i; k >= 0; k--) { if (this.steps[k].diagram) { start = k; break; } }
      const spec = this.steps[start].diagram || this.script.diagram;
      const swapped = this.lastSpec !== spec;
      this.lastSpec = spec;

      this.resetCanvas(spec, swapped);
      this.clearOverlays();
      if (this.opts.onNote) this.opts.onNote('');
      this.pendingFocus = new Set();
      this.pendingNote = '';

      for (let k = start; k <= i; k++) {
        const isCurrent = k === i;
        this.steps[k].ops.forEach((op) => this.applyOp(op, isCurrent && animate !== false));
      }
      this.applySpotlight();

      // 移除上一次遗留的 focus（只保留当前步产生的）
      this.index = i;
      const step = this.steps[i];

      // 自动滚动到当前步骤（由外部处理）
      if (this.opts.onStep) this.opts.onStep(i, step, forward);
    }

    applyOp(op, animate) {
      if (!op) return;
      const ids = op.ids || (op.id ? [op.id] : []);
      const els = ids.map((id) => this.find(id)).filter(Boolean);

      switch (op.op) {
        case 'focus': {
          (op.ids || []).forEach((id) => this.pendingFocus.add(id));
          if (op.text) this.pendingNote = op.text;
          break;
        }
        case 'dim':
          els.forEach((el) => el.classList.add('dim'));
          break;
        case 'show':
          els.forEach((el) => el.classList.remove('hidden'));
          break;
        case 'hide':
          els.forEach((el) => el.classList.add('hidden'));
          break;
        case 'set': {
          const el = this.find(op.id);
          if (!el) break;
          if (el._special) { el._special(op.text); break; }
          if (el._text) {
            el._text.textContent = op.text;
            if (animate) {
              el._text.classList.remove('mark-in');
              void el._text.offsetWidth;
              el._text.classList.add('mark-in');
            }
          }
          break;
        }
        case 'mark':
          els.forEach((el) => this.addMark(el, op.text || '✓'));
          break;
        case 'pulse':
          els.forEach((el) => {
            if (reduceMotion) return;
            el.classList.remove('pulse');
            void el.getBoundingClientRect();
            el.classList.add('pulse');
            setTimeout(() => el.classList.remove('pulse'), 2400);
          });
          break;
      }
    }

    /** 当前步的聚光灯：同一步里的多个 focus 取并集 */
    applySpotlight() {
      const ids = this.pendingFocus;
      if (!ids || !ids.size) return;
      const reg = this.handle.reg;
      Object.keys(reg).forEach((id) => {
        reg[id].classList.remove('focus');
        reg[id].classList.remove('dim');
      });
      let hit = 0;
      Object.keys(reg).forEach((id) => {
        if (ids.has(id)) { reg[id].classList.add('focus'); hit++; }
        else reg[id].classList.add('dim');
      });
      if (!hit) {
        // 一个都没对上：宁可不压暗，也不要让整张图灰掉
        Object.keys(reg).forEach((id) => reg[id].classList.remove('dim'));
        return;
      }
      if (this.opts.onNote) this.opts.onNote(this.pendingNote || '');
    }

    showCallout(el, str) {      if (this.calloutEl) this.calloutEl.remove();
      let bb;
      try { bb = el.getBBox(); } catch (e) { return; }
      const W = MT.diagrams.W;
      const w = Math.min(300, Math.max(90, str.length * 14 + 26));
      const h = 34;
      let cx = bb.x + bb.width / 2;
      let x = Math.max(8, Math.min(W - w - 8, cx - w / 2));
      let y = bb.y - h - 14;
      if (y < 6) y = bb.y + bb.height + 12;

      const g = svgNode('g', { class: 'callout mark-in' });
      g.appendChild(svgNode('rect', { x, y, width: w, height: h, rx: 10, fill: '#2B3644', opacity: 0.96 }));
      const tailX = cx;
      const tailY = y < bb.y ? y + h : y;
      const dir = y < bb.y ? 1 : -1;
      g.appendChild(svgNode('path', {
        d: `M${tailX - 7} ${tailY} L${tailX} ${tailY + dir * 8} L${tailX + 7} ${tailY} Z`,
        fill: '#2B3644', opacity: 0.96
      }));
      g.appendChild(svgNode('text', {
        x: x + w / 2, y: y + 22, 'text-anchor': 'middle',
        fill: '#fff', 'font-size': 13.5, 'font-weight': 600
      }, str.length > 20 ? str.slice(0, 19) + '…' : str));
      this.svg.appendChild(g);
      this.calloutEl = g;
    }

    addMark(el, str) {
      let bb;
      try { bb = el.getBBox(); } catch (e) { return; }
      const w = Math.max(28, str.length * 13 + 18);
      const x = Math.min(MT.diagrams.W - w - 6, bb.x + bb.width - 4);
      const y = Math.max(4, bb.y - 16);
      const g = svgNode('g', { class: 'mark-in' });
      g.appendChild(svgNode('rect', { x, y, width: w, height: 26, rx: 13, fill: '#2FA36B' }));
      g.appendChild(svgNode('text', {
        x: x + w / 2, y: y + 18, 'text-anchor': 'middle', fill: '#fff',
        'font-size': 13, 'font-weight': 700
      }, str.length > 8 ? str.slice(0, 8) : str));
      this.svg.appendChild(g);
      this.marks.push(g);
    }

    play() {
      if (this.playing) return;
      if (this.index >= this.steps.length - 1) this.goto(0, true);
      this.playing = true;
      this.notifyPlay();
      const tick = () => {
        if (!this.playing) return;
        if (this.index >= this.steps.length - 1) { this.stop(); return; }
        this.goto(this.index + 1, true);
        this.timer = setTimeout(tick, this.opts.interval || 1500);
      };
      this.timer = setTimeout(tick, 260);
    }

    stop() {
      this.playing = false;
      clearTimeout(this.timer);
      this.timer = null;
      this.notifyPlay();
    }

    next() { this.stop(); if (this.index < this.steps.length - 1) this.goto(this.index + 1, true); }
    prev() { this.stop(); if (this.index > 0) this.goto(this.index - 1, true); }
    restart() { this.stop(); this.goto(0, true); }
    jump(i) { this.stop(); this.goto(i, true); }

    notifyPlay() { if (this.opts.onPlay) this.opts.onPlay(this.playing); }
  }

  MT.Player = Player;
})();
