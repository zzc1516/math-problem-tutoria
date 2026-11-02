/* 60-diagrams.js —— 9 种 SVG 图解渲染器
   每个渲染器返回 { svg, reg }：reg 记录 id → {el, text, special}，
   播放器通过 ops 操作这些元素，实现「讲到哪、图变到哪」。 */
(function () {
  const MT = (window.MT = window.MT || {});
  const NS = 'http://www.w3.org/2000/svg';
  const W = 880, H = 520;

  const C = {
    blue: { main: '#2D9CDB', soft: '#E9F5FD', deep: '#1B6D9B' },
    orange: { main: '#FF8A4C', soft: '#FFF0E9', deep: '#C2560F' },
    green: { main: '#3CB179', soft: '#E7F6EE', deep: '#1F7A4D' },
    purple: { main: '#8E6BD8', soft: '#F1ECFC', deep: '#5E44A6' },
    amber: { main: '#EBA33A', soft: '#FDF3E2', deep: '#96630F' },
    gray: { main: '#93A2B0', soft: '#F1F4F7', deep: '#5A6875' },
    red: { main: '#E0533F', soft: '#FDEDE9', deep: '#A33A28' }
  };
  const color = (k) => C[k] || C.blue;

  function s(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] == null || attrs[k] === '') continue;
      n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    return n;
  }

  function text(x, y, str, cls, extra) {
    const t = s('text', Object.assign({ x, y, class: cls || 'lbl', 'text-anchor': 'middle' }, extra || {}), str);
    return t;
  }

  function bracket(x0, x1, y, dir, colorHex) {
    const d = dir > 0
      ? `M${x0} ${y - 12} V${y} H${x1} V${y - 12}`
      : `M${x0} ${y + 12} V${y} H${x1} V${y + 12}`;
    return s('path', { d, fill: 'none', stroke: colorHex || '#C7D2DC', 'stroke-width': 2, 'stroke-linecap': 'round' });
  }

  function pill(x, y, w, h, fill, stroke) {
    return s('rect', { x, y, width: w, height: h, rx: h / 2, fill: fill || '#fff', stroke: stroke || '#E3DACD', 'stroke-width': 1.4 });
  }

  function reg(map, id, el, textEl, special) {
    if (!id) return;
    if (textEl) el._text = textEl;
    if (special) el._special = special;
    map[id] = el;
  }

  function title(svg, str) {
    if (!str) return;
    svg.appendChild(s('text', { x: W / 2, y: 38, class: 'title', 'text-anchor': 'middle' }, str));
  }

  /* ==================== 1. 线段图 ==================== */
  function renderSegment(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title);
    const x0 = 92, totalW = 700, barY = 186, barH = 68;
    const sum = spec.parts.reduce((a, p) => a + p.ratio, 0) || 1;
    const gap = 5;
    const usable = totalW - gap * (spec.parts.length - 1);

    let cursor = x0;
    const spans = [];
    spec.parts.forEach((p, i) => {
      const w = usable * (p.ratio / sum);
      spans.push({ x: cursor, w, p });
      cursor += w + gap;
    });

    // 总量大括号
    if (spec.total) {
      const g = s('g', { class: 'el', 'data-id': spec.total.id });
      const center = x0 + totalW / 2;
      g.appendChild(s('text', { x: center - 34, y: 122, class: 'note', 'text-anchor': 'end' }, spec.total.label || ''));
      const tv = s('text', { x: center + 34, y: 122, class: 'val', 'text-anchor': 'start' }, '');
      g.appendChild(tv);
      g.appendChild(bracket(x0, x0 + totalW, 138, 1, '#B9C7D4'));
      svg.appendChild(g);
      reg[spec.total.id] = g;
      g._text = tv;
      tv.textContent = spec.total.value || '';
      // 让 set 也能同时改 label
      g._label = g.firstChild;
    }

    spans.forEach(({ x, w, p }) => {
      const c = color(p.color);
      const g = s('g', { class: 'el', 'data-id': p.id });
      g.appendChild(s('rect', {
        x, y: barY, width: w, height: barH, rx: 10,
        fill: c.soft, stroke: c.main, 'stroke-width': 1.8
      }));
      if (p.label) {
        g.appendChild(text(x + w / 2, barY - 16, p.label, 'lbl', { fill: c.deep }));
      }
      const valText = text(x + w / 2, barY + barH / 2 + 6, p.value || '', 'val', { fill: c.deep, 'font-size': 16 });
      g.appendChild(valText);
      svg.appendChild(g);
      reg[p.id] = g;
      g._text = valText;
    });

    // 单位 1
    if (spec.unitOne) {
      const sp = spans.find((x) => x.p.id === spec.unitOne.id);
      if (sp) {
        const g = s('g', { class: 'el', 'data-id': spec.unitOne.id + '__u1' });
        g.appendChild(bracket(sp.x + 2, sp.x + sp.w - 2, barY + barH + 16, -1, C.orange.main));
        g.appendChild(text(sp.x + sp.w / 2, barY + barH + 44, spec.unitOne.label || '1', 'lbl', { fill: C.orange.deep, 'font-size': 15 }));
        svg.appendChild(g);
        reg[spec.unitOne.id + '__u1'] = g;
      }
    }

    // 问题
    if (spec.question && spec.question.label) {
      const qw = Math.max(150, spec.question.label.length * 15 + 40);
      const g = s('g', { class: 'el', 'data-id': spec.question.id });
      g.appendChild(pill(W / 2 - qw / 2, 352, qw, 42, '#FFF8F2', '#FFC9AC'));
      g.appendChild(text(W / 2, 379, spec.question.label, 'lbl', { fill: '#B4551F' }));
      svg.appendChild(g);
      reg[spec.question.id] = g;
    }

    return svg;
  }

  /* ==================== 2. 份数方块图 ==================== */
  function renderBars(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title);
    const n = spec.rows.length;
    const rowH = Math.min(96, 380 / Math.max(1, n));
    const startY = 150;
    const sq = Math.min(52, Math.max(34, 520 / Math.max(1, Math.max(...spec.rows.map((r) => r.ratio)))));

    spec.rows.forEach((r, i) => {
      const c = color(r.color);
      const y = startY + i * rowH;
      const g = s('g', { class: 'el', 'data-id': r.id });

      g.appendChild(text(140, y + sq / 2 + 6, r.label || '', 'lbl', { 'text-anchor': 'end', fill: c.deep }));

      for (let k = 0; k < r.ratio; k++) {
        g.appendChild(s('rect', {
          x: 160 + k * (sq + 9), y, width: sq, height: sq, rx: 9,
          fill: k === 0 ? c.main : c.soft, stroke: c.main, 'stroke-width': 1.6, opacity: k === 0 ? 0.92 : 1
        }));
      }
      const valX = 160 + r.ratio * (sq + 9) + 18;
      const vt = s('text', { x: valX, y: y + sq / 2 + 7, class: 'val', fill: c.deep }, r.value || '');
      g.appendChild(vt);
      svg.appendChild(g);
      reg[r.id] = g;
      g._text = vt;
    });

    svg.appendChild(s('text', { x: 160, y: 112, class: 'sm' }, '每 1 个方块 = 1 ' + (spec.unit || '份')));
    if (!spec.title) svg.appendChild(s('text', { x: W / 2, y: 60, class: 'title', 'text-anchor': 'middle' }, '份数图'));
    return svg;
  }

  /* ==================== 3. 天平图 ==================== */
  function renderBalance(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title || '天平');
    const cx = W / 2, beamY = 172;

    const beamGroup = s('g', { class: 'el', 'data-id': 'beam' });
    reg.beam = beamGroup;
    beamGroup._special = (v) => {
      const deg = v === 'left' ? -4 : v === 'right' ? 4 : 0;
      beamGroup.setAttribute('transform', `rotate(${deg} ${cx} ${beamY})`);
    };

    // 横梁 + 支点
    beamGroup.appendChild(s('rect', { x: cx - 250, y: beamY - 7, width: 500, height: 14, rx: 7, fill: '#F0B23C' }));
    beamGroup.appendChild(s('circle', { cx, cy: beamY, r: 13, fill: '#D98F1C' }));
    beamGroup.appendChild(s('path', { d: `M${cx} ${beamY + 10} L${cx} ${beamY + 196}`, stroke: '#C08A22', 'stroke-width': 9, 'stroke-linecap': 'round' }));
    beamGroup.appendChild(s('path', { d: `M${cx - 62} ${beamY + 250} L${cx + 62} ${beamY + 250} L${cx} ${beamY + 196} Z`, fill: '#F6C765', stroke: '#D98F1C', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    beamGroup.appendChild(s('rect', { x: cx - 88, y: beamY + 248, width: 176, height: 13, rx: 6, fill: '#E8B24A' }));

    [
      { side: 'left', x: cx - 200, data: spec.left, color: C.blue },
      { side: 'right', x: cx + 200, data: spec.right, color: C.orange }
    ].forEach(({ side, x, data, color }) => {
      const items = data.items || [];
      const trayW = 250;
      const sideY = beamY + 58;
      const trayH = 42 + Math.max(1, items.length) * 46;
      const g = s('g', { class: 'el' });

      // 吊绳 + 托盘
      g.appendChild(s('path', { d: `M${x} ${beamY + 4} L${x - 104} ${sideY} M${x} ${beamY + 4} L${x + 104} ${sideY}`, stroke: '#C9B08A', 'stroke-width': 2 }));
      g.appendChild(s('rect', { x: x - trayW / 2, y: sideY, width: trayW, height: trayH, rx: 14, fill: '#FFFDF8', stroke: '#D9BE8F', 'stroke-width': 1.6 }));
      g.appendChild(s('rect', { x: x - trayW / 2 - 8, y: sideY - 7, width: trayW + 16, height: 12, rx: 6, fill: '#F7EAD2', stroke: '#D9BE8F', 'stroke-width': 1.2 }));

      // 托盘标题（可被 set 改写）
      const headT = s('text', { x, y: sideY + 28, class: 'lbl', 'text-anchor': 'middle', fill: color.deep, 'font-size': 14 }, data.label || '');
      g.appendChild(headT);
      g._text = headT;

      // 物品：从上往下排，不再顶到横梁
      let yy = sideY + 60;
      items.forEach((it, i) => {
        const txt = String(it.text || '');
        const cw = Math.min(trayW - 20, Math.max(80, txt.length * 14 + 26));
        const ig = s('g', { class: 'el', 'data-id': it.id });
        ig.appendChild(s('rect', { x: x - cw / 2, y: yy - 26, width: cw, height: 38, rx: 10, fill: i % 2 ? '#E9F5FD' : '#FFF0E9', stroke: i % 2 ? '#9FD0EC' : '#FFB894', 'stroke-width': 1.6 }));
        const tx = s('text', { x, y: yy, class: 'lbl', 'text-anchor': 'middle', fill: '#2B4A63', 'font-size': 14 }, txt);
        ig.appendChild(tx);
        ig._text = tx;
        g.appendChild(ig);
        reg[it.id] = ig;
        yy += 46;
      });

      beamGroup.appendChild(g);
      reg[side] = g;
    });

    svg.appendChild(beamGroup);

    if (spec.hint) {
      svg.appendChild(pill(cx - 150, 470, 300, 34, '#F4FBF7', '#BDE3CE'));
      svg.appendChild(text(cx, 493, spec.hint, 'note', { fill: '#2C7A54' }));
    }
    return svg;
  }

  /* ==================== 4. 平面图形 ==================== */
  function renderArea(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title);
    const d = spec.dims;
    const boxX = 110, boxY = 120, boxW = 660, boxH = 280;
    const shape = spec.shape;

    let g = s('g', { class: 'el', 'data-id': 'rect' });
    let bw = 0, bh = 0, ox = 0, oy = 0;

    if (shape === 'circle') {
      const r = Math.min(boxW, boxH) / 2 - 20;
      const cx = W / 2, cy = boxY + boxH / 2;
      g.appendChild(s('circle', { cx, cy, r, fill: C.blue.soft, stroke: C.blue.main, 'stroke-width': 2.4 }));
      g.appendChild(s('path', { d: `M${cx} ${cy} L${cx + r} ${cy}`, stroke: C.blue.deep, 'stroke-width': 2, 'stroke-dasharray': '6 5' }));
      g.appendChild(s('circle', { cx, cy, r: 4, fill: C.blue.deep }));
      g.appendChild(text(cx + r / 2, cy - 12, 'r = ' + d.r, 'lbl', { fill: C.blue.deep }));
      g.appendChild(text(cx, cy + r + 34, (spec.labels && spec.labels.bottom) || '', 'note'));
    } else {
      const baseW = shape === 'triangle' ? (d.b || d.w || 8) : (shape === 'trapezoid' ? (d.b || 10) : (d.w || 8));
      const k = Math.min(boxW / (baseW || 8), boxH / (d.h || 5)) * 0.86;
      bw = (baseW || 8) * k; bh = (d.h || 5) * k;
      ox = W / 2 - bw / 2; oy = boxY + (boxH - bh) / 2;

      if (shape === 'rect') {
        g.appendChild(s('rect', { x: ox, y: oy, width: bw, height: bh, rx: 4, fill: C.blue.soft, stroke: C.blue.main, 'stroke-width': 2.4 }));
        // 单位方格
        if (d.w <= 14 && d.h <= 14) {
          for (let i = 1; i < d.w; i++) g.appendChild(s('line', { x1: ox + (bw / d.w) * i, y1: oy, x2: ox + (bw / d.w) * i, y2: oy + bh, stroke: '#B9DEF3', 'stroke-width': 1 }));
          for (let j = 1; j < d.h; j++) g.appendChild(s('line', { x1: ox, y1: oy + (bh / d.h) * j, x2: ox + bw, y2: oy + (bh / d.h) * j, stroke: '#B9DEF3', 'stroke-width': 1 }));
        }
      } else if (shape === 'triangle') {
        g.appendChild(s('path', { d: `M${ox} ${oy + bh} L${ox + bw / 2} ${oy} L${ox + bw} ${oy + bh} Z`, fill: C.orange.soft, stroke: C.orange.main, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
        g.appendChild(s('path', { d: `M${ox + bw / 2} ${oy} L${ox + bw / 2} ${oy + bh}`, stroke: C.orange.deep, 'stroke-width': 1.6, 'stroke-dasharray': '5 5' }));
      } else if (shape === 'parallelogram') {
        const sk = Math.min(60, bw * 0.2);
        g.appendChild(s('path', { d: `M${ox + sk} ${oy} L${ox + bw} ${oy} L${ox + bw - sk} ${oy + bh} L${ox} ${oy + bh} Z`, fill: C.green.soft, stroke: C.green.main, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
        g.appendChild(s('path', { d: `M${ox + sk} ${oy} L${ox + sk} ${oy + bh}`, stroke: C.green.deep, 'stroke-width': 1.6, 'stroke-dasharray': '5 5' }));
      } else if (shape === 'trapezoid') {
        const top = bw * ((d.b2 || 4) / (d.b || 10));
        g.appendChild(s('path', { d: `M${ox + (bw - top) / 2} ${oy} L${ox + (bw + top) / 2} ${oy} L${ox + bw} ${oy + bh} L${ox} ${oy + bh} Z`, fill: C.purple.soft, stroke: C.purple.main, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
      } else {
        g.appendChild(s('rect', { x: ox, y: oy, width: bw, height: bh, rx: 4, fill: C.amber.soft, stroke: C.amber.main, 'stroke-width': 2.4 }));
        g.appendChild(s('path', { d: `M${ox} ${oy} L${ox + bw} ${oy + bh}`, stroke: C.amber.deep, 'stroke-width': 2, 'stroke-dasharray': '6 5' }));
      }

      // 边长标注
      const L = spec.labels || {};
      g.appendChild(text(ox + bw / 2, oy + bh + 30, L.bottom || ((d.b || d.w) + ' ' + spec.unit), 'note'));
      g.appendChild(text(ox - 16, oy + bh / 2 + 5, L.left || ((d.w || d.h) + ' ' + spec.unit), 'note', { 'text-anchor': 'end' }));
      if (shape === 'trapezoid') g.appendChild(text(ox + bw / 2, oy - 14, L.top || ((d.b2 || 4) + ' ' + spec.unit), 'note'));
      else if (shape !== 'rect') g.appendChild(text(ox + bw - 6, oy - 12, L.top || ((d.h || 5) + ' ' + spec.unit), 'note', { 'text-anchor': 'start' }));
      else g.appendChild(text(ox + bw + 16, oy + bh / 2 + 5, L.right || ((d.h || 5) + ' ' + spec.unit), 'note', { 'text-anchor': 'start' }));
    }

    svg.appendChild(g);
    reg.rect = g;
    reg.shape = g;

    if (spec.formula) {
      const fw = Math.max(200, spec.formula.length * 13 + 40);
      svg.appendChild(pill(W / 2 - fw / 2, 442, fw, 44, '#EAF6FD', '#BFE0F2'));
      svg.appendChild(text(W / 2, 470, spec.formula, 'val', { fill: '#1B6D9B', 'font-size': 16 }));
    }
    return svg;
  }

  /* ==================== 5. 立体图形 ==================== */
  function renderSolid(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title);
    const d = spec.dims;
    const g = s('g', { class: 'el', 'data-id': 'solid' });
    reg.solid = g;

    if (spec.shape === 'cylinder' || spec.shape === 'cone') {
      const r = 110, h = 210;
      const cx = W / 2, top = 150, bottom = top + h;
      if (spec.shape === 'cylinder') {
        g.appendChild(s('path', { d: `M${cx - r} ${top} L${cx - r} ${bottom} A${r} 34 0 0 0 ${cx + r} ${bottom} L${cx + r} ${top}`, fill: '#E9F5FD', stroke: '#2D9CDB', 'stroke-width': 2.4 }));
        g.appendChild(s('ellipse', { cx, cy: top, rx: r, ry: 34, fill: '#D6EEFB', stroke: '#2D9CDB', 'stroke-width': 2.4 }));
        g.appendChild(s('path', { d: `M${cx} ${top} L${cx + r} ${top}`, stroke: '#1B6D9B', 'stroke-width': 2, 'stroke-dasharray': '6 5' }));
        g.appendChild(text(cx + r / 2, top - 10, 'r = ' + d.r, 'note', { fill: '#1B6D9B' }));
        g.appendChild(text(cx + r + 22, top + h / 2, 'h = ' + (d.h || 4), 'note', { 'text-anchor': 'start' }));
        g.appendChild(s('path', { d: `M${cx + r + 8} ${top} L${cx + r + 8} ${bottom}`, stroke: '#9FB3C2', 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }));
      } else {
        g.appendChild(s('path', { d: `M${cx} ${top} L${cx - r} ${bottom} A${r} 34 0 0 0 ${cx + r} ${bottom} Z`, fill: '#FFF0E9', stroke: '#FF8A4C', 'stroke-width': 2.4 }));
        g.appendChild(s('path', { d: `M${cx} ${top} L${cx + r} ${bottom}`, stroke: '#E07B3F', 'stroke-width': 1.8, 'stroke-dasharray': '6 5' }));
        g.appendChild(text(cx + 20, top + h / 2, 'h = ' + (d.h || 4), 'note', { 'text-anchor': 'start', fill: '#C2560F' }));
      }
    } else {
      const w = 230, h = 150, dx = 110, dy = -80;
      const x = W / 2 - w / 2 - 30, y = 250;
      g.appendChild(s('path', { d: `M${x} ${y} L${x + dx} ${y + dy} L${x + w + dx} ${y + dy} L${x + w} ${y} Z`, fill: '#D6EEFB', stroke: '#2D9CDB', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
      g.appendChild(s('path', { d: `M${x + w} ${y} L${x + w + dx} ${y + dy} L${x + w + dx} ${y + dy + h} L${x + w} ${y + h} Z`, fill: '#C2E4F6', stroke: '#2D9CDB', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
      g.appendChild(s('rect', { x, y, width: w, height: h, fill: '#E9F5FD', stroke: '#2D9CDB', 'stroke-width': 2.4 }));
      g.appendChild(s('path', { d: `M${x} ${y} L${x + dx} ${y + dy}`, stroke: '#2D9CDB', 'stroke-width': 2 }));
      g.appendChild(s('path', { d: `M${x + dx} ${y + dy} L${x + dx} ${y + dy + h}`, stroke: '#9FB3C2', 'stroke-width': 1.4, 'stroke-dasharray': '5 5' }));
      g.appendChild(s('path', { d: `M${x + dx} ${y + dy + h} L${x + w + dx} ${y + dy + h}`, stroke: '#9FB3C2', 'stroke-width': 1.4, 'stroke-dasharray': '5 5' }));

      g.appendChild(text(x + w / 2, y + h + 30, '长 ' + (d.l || 5) + ' ' + spec.unit, 'note'));
      g.appendChild(text(x - 14, y + h / 2 + 4, '高 ' + (d.h || 4), 'note', { 'text-anchor': 'end' }));
      g.appendChild(text(x + w + dx / 2, y + dy - 14, '宽 ' + (d.w || 3), 'note', { 'text-anchor': 'middle' }));
    }

    svg.appendChild(g);
    if (spec.formula) {
      const fw = Math.max(220, spec.formula.length * 13 + 40);
      svg.appendChild(pill(W / 2 - fw / 2, 442, fw, 44, '#EAF6FD', '#BFE0F2'));
      svg.appendChild(text(W / 2, 470, spec.formula, 'val', { fill: '#1B6D9B', 'font-size': 16 }));
    }
    return svg;
  }

  /* ==================== 6. 行程图 ==================== */
  function renderRoute(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title || '行程图');
    const x0 = 90, x1 = 790, y = 300, len = spec.length || 100;
    const px = (v) => x0 + (x1 - x0) * (v / len);

    svg.appendChild(s('line', { x1: x0, y1: y, x2: x1, y2: y, stroke: '#D6CEC1', 'stroke-width': 8, 'stroke-linecap': 'round' }));
    svg.appendChild(s('line', { x1: x0, y1: y, x2: x1, y2: y, stroke: '#F6E7CF', 'stroke-width': 3, 'stroke-dasharray': '18 14', 'stroke-linecap': 'round' }));

    (spec.marks || []).forEach((m) => {
      const g = s('g', { class: 'el', 'data-id': m.id });
      const x = px(m.at);
      g.appendChild(s('line', { x1: x, y1: y - 20, x2: x, y2: y + 20, stroke: '#B9C7D4', 'stroke-width': 2, 'stroke-dasharray': '4 4' }));
      g.appendChild(s('circle', { cx: x, cy: y, r: 7, fill: '#fff', stroke: '#93A2B0', 'stroke-width': 3 }));
      g.appendChild(text(x, y + 46, m.label, 'note'));
      svg.appendChild(g);
      reg[m.id] = g;
    });

    (spec.travelers || []).forEach((t) => {
      const c = color(t.color);
      const g = s('g', { class: 'el', 'data-id': t.id });
      const x = px(t.pos);
      g.appendChild(s('rect', { x: x - 30, y: y - 96, width: 60, height: 44, rx: 12, fill: c.main, opacity: 0.95 }));
      g.appendChild(text(x, y - 67, t.dir > 0 ? '▶' : '◀', 'lbl', { fill: '#fff', 'font-size': 18 }));
      g.appendChild(s('line', { x1: x + t.dir * 16, y1: y - 20, x2: x + t.dir * 76, y2: y - 20, stroke: c.main, 'stroke-width': 3, 'stroke-linecap': 'round' }));
      g.appendChild(s('path', {
        d: t.dir > 0 ? `M${x + 76} ${y - 20} l-11 -6 v12 z` : `M${x - 76} ${y - 20} l11 -6 v12 z`,
        fill: c.main
      }));
      const tx = s('text', { x, y: y - 112, class: 'lbl', 'text-anchor': 'middle', fill: c.deep }, t.name);
      g.appendChild(tx);
      g._text = tx;
      g.appendChild(text(x, y + 76, t.speed, 'sm', { fill: c.deep }));
      svg.appendChild(g);
      reg[t.id] = g;
    });

    svg.appendChild(bracket(x0, x1, 120, 1, '#C7D2DC'));
    svg.appendChild(text(W / 2, 106, '全程 ' + len + ' ' + spec.unit, 'note'));
    return svg;
  }

  /* ==================== 7. 表格 ==================== */
  function renderTable(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title);
    const cols = spec.cols.length, rows = spec.rows.length;
    const tw = Math.min(720, cols * 160), th = Math.min(52, 340 / Math.max(1, rows + 1));
    const x0 = (W - tw) / 2, y0 = 120, cw = tw / cols;

    svg.appendChild(s('rect', { x: x0, y: y0, width: tw, height: th, rx: 10, fill: '#2B4A63' }));
    spec.cols.forEach((c, i) => {
      svg.appendChild(text(x0 + cw * (i + 0.5), y0 + th / 2 + 6, c.label, 'lbl', { fill: '#fff', 'font-size': 14 }));
    });

    spec.rows.forEach((r, ri) => {
      const y = y0 + th + ri * th;
      const g = s('g', { class: 'el', 'data-id': r.id });
      g.appendChild(s('rect', { x: x0, y, width: tw, height: th, fill: ri % 2 ? '#FBF8F3' : '#fff', stroke: '#EDE6DA', 'stroke-width': 1 }));
      r.cells.forEach((cell, ci) => {
        const t = s('text', { x: x0 + cw * (ci + 0.5), y: y + th / 2 + 6, class: ci === cols - 1 ? 'val' : 'lbl', 'text-anchor': 'middle', fill: ci === cols - 1 ? '#1B6D9B' : '#3B4A58' }, cell);
        g.appendChild(t);
      });
      svg.appendChild(g);
      reg[r.id] = g;
    });
    return svg;
  }

  /* ==================== 8. 数量轴 ==================== */
  function renderNumberline(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title || '数量轴');
    const x0 = 110, x1 = 770, y = 340;
    const min = spec.min, max = spec.max;
    const px = (v) => x0 + (x1 - x0) * ((v - min) / (max - min || 1));
    const clampX = (v) => Math.max(x0, Math.min(x1, v));

    // 区间（画在轴上方：宽的在上面，窄的在下面，避免引线打架）
    const spans = (spec.spans || [])
      .map((sp, i) => ({ sp, i, w: Math.abs((sp.to || 0) - (sp.from || 0)) }))
      .sort((a, b) => b.w - a.w);

    spans.forEach(({ sp, i }, rank) => {
      const c = color(sp.color);
      const a = clampX(px(Math.min(sp.from, sp.to)));
      const b = clampX(px(Math.max(sp.from, sp.to)));
      const yy = 150 + rank * 50;
      const g = s('g', { class: 'el', 'data-id': sp.id });
      g.appendChild(s('line', { x1: a, y1: yy + 6, x2: a, y2: y - 10, stroke: c.main, 'stroke-width': 1.4, 'stroke-dasharray': '4 5', opacity: 0.4 }));
      g.appendChild(s('line', { x1: b, y1: yy + 6, x2: b, y2: y - 10, stroke: c.main, 'stroke-width': 1.4, 'stroke-dasharray': '4 5', opacity: 0.4 }));
      g.appendChild(bracket(a, b, yy, 1, c.main));
      const label = sp.label || '';
      const tw = label.length * 13 + 16;
      const mid = (a + b) / 2;
      const lx = Math.max(4, Math.min(W - tw - 4, mid - tw / 2));
      g.appendChild(s('rect', { x: lx, y: yy - 30, width: tw, height: 24, rx: 12, fill: '#fff', stroke: c.main, 'stroke-width': 1.2, opacity: 0.96 }));
      const spanT = text(lx + tw / 2, yy - 13, label, 'note', { fill: c.deep, 'font-size': 12.5 });
      g.appendChild(spanT);
      g._text = spanT;
      svg.appendChild(g);
      reg[sp.id] = g;
    });

    // 轴
    svg.appendChild(s('line', { x1: x0 - 26, y1: y, x2: x1 + 34, y2: y, stroke: '#8C9AA8', 'stroke-width': 2.6 }));
    svg.appendChild(s('path', { d: `M${x1 + 34} ${y} l-13 -6 v12 z`, fill: '#8C9AA8' }));

    (spec.ticks.length ? spec.ticks : [{ value: min, label: String(min) }, { value: max, label: String(max) }]).forEach((t) => {
      const x = px(t.value);
      const tg = s('g', { class: 'el', 'data-id': t.id });
      tg.appendChild(s('line', { x1: x, y1: y - 9, x2: x, y2: y + 9, stroke: '#8C9AA8', 'stroke-width': 2 }));
      tg.appendChild(s('circle', { cx: x, cy: y, r: 3.4, fill: '#8C9AA8' }));
      if (t.label) {
        const tt = text(x, y + 32, t.label, 'note');
        tg.appendChild(tt);
        tg._text = tt;
      }
      svg.appendChild(tg);
      if (t.id) reg[t.id] = tg;
    });

    // 标记（图钉）
    (spec.marks || []).forEach((m) => {
      const c = color(m.color);
      const x = px(m.value);
      const g = s('g', { class: 'el', 'data-id': m.id });
      g.appendChild(s('path', { d: `M${x} ${y - 12} l-8 -14 h16 z`, fill: c.main }));
      g.appendChild(s('line', { x1: x, y1: y - 26, x2: x, y2: y - 56, stroke: c.main, 'stroke-width': 2 }));
      g.appendChild(text(x, y - 66, m.label, 'lbl', { fill: c.deep }));
      svg.appendChild(g);
      reg[m.id] = g;
    });

    // 参考线（成本线之类）
    (spec.refs || []).forEach((r) => {
      const c = color(r.color);
      const x = px(r.at);
      const g = s('g', { class: 'el', 'data-id': r.id });
      g.appendChild(s('line', { x1: x, y1: y - 5, x2: x, y2: y + 56, stroke: c.main, 'stroke-width': 2.6, 'stroke-dasharray': '7 6' }));
      g.appendChild(s('circle', { cx: x, cy: y, r: 6, fill: '#fff', stroke: c.main, 'stroke-width': 3 }));
      const label = r.label || '';
      const tw = Math.max(78, label.length * 13 + 22);
      const lx = Math.max(6, Math.min(W - tw - 6, x - tw / 2));
      g.appendChild(s('rect', { x: lx, y: y + 62, width: tw, height: 30, rx: 15, fill: c.soft, stroke: c.main, 'stroke-width': 1.4 }));
      const refT = text(lx + tw / 2, y + 82, label, 'lbl', { fill: c.deep, 'font-size': 12.5 });
      g.appendChild(refT);
      g._text = refT;
      svg.appendChild(g);
      reg[r.id] = g;
    });

    return svg;
  }

  /* ==================== 9. 浓度条 ==================== */
  function renderPercentBar(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title);
    const x0 = 196, barW = 600, h = 58;
    const startY = 130;   // 紧贴标题下方，别留一大片空白
    const rowH = 132;

    spec.rows.forEach((r, i) => {
      const y = startY + i * rowH;
      const g = s('g', { class: 'el', 'data-id': r.id });

      g.appendChild(s('text', { x: x0 - 22, y: y + h / 2 - 2, class: 'lbl', 'text-anchor': 'end', fill: '#3B4A58' }, r.label || ''));
      const totalT = s('text', { x: x0 - 22, y: y + h / 2 + 22, class: 'val', 'text-anchor': 'end', fill: '#8A96A2', 'font-size': 13 }, r.total || '');
      g.appendChild(totalT);
      g._text = totalT;

      const sum = r.segments.reduce((a, sg) => a + sg.pct, 0) || 100;
      let cursor = x0;
      r.segments.forEach((sg) => {
        const w = Math.max(6, barW * (sg.pct / sum));
        const c = color(sg.color);
        const sgg = s('g', { class: 'el', 'data-id': sg.id });
        sgg.appendChild(s('rect', { x: cursor, y, width: Math.max(4, w - 4), height: h, rx: 10, fill: c.soft, stroke: c.main, 'stroke-width': 1.8 }));
        sgg.appendChild(text(cursor + w / 2, y + 20, sg.pct + '%', 'sm', { fill: c.deep }));
        const labelT = s('text', { x: cursor + w / 2, y: y + h / 2 + 16, class: 'lbl', 'text-anchor': 'middle', fill: c.deep, 'font-size': 13 }, sg.label);
        sgg.appendChild(labelT);
        sgg._text = labelT;
        g.appendChild(sgg);
        reg[sg.id] = sgg;
        cursor += w;
      });

      svg.appendChild(g);
      reg[r.id] = g;
    });

    if (spec.note) {
      // 紧跟在最后一根条下面，别在画布底部留一大片空白
      const ny = startY + spec.rows.length * rowH - 30;
      const nw = Math.max(320, spec.note.length * 15 + 40);
      svg.appendChild(pill(W / 2 - nw / 2, ny, nw, 38, '#FFF8F2', '#FFC9AC'));
      svg.appendChild(text(W / 2, ny + 25, spec.note, 'note', { fill: '#B4551F' }));
    }
    return svg;
  }

  /* ==================== 10. 十字交叉 ==================== */
  function renderCross(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title || '十字交叉');
    const lx = 330, rx = 560, cx = 445;
    const yTop = 190, yBot = 350, yMid = 270;

    // 交叉的两条斜线
    svg.appendChild(s('line', { x1: lx, y1: yTop, x2: rx, y2: yBot, stroke: '#C7D2DC', 'stroke-width': 2.4 }));
    svg.appendChild(s('line', { x1: lx, y1: yBot, x2: rx, y2: yTop, stroke: '#C7D2DC', 'stroke-width': 2.4 }));

    spec.rows.forEach((r, i) => {
      const c = color(r.color);
      const y = i === 0 ? yTop : yBot;
      const g = s('g', { class: 'el', 'data-id': r.id });

      g.appendChild(s('circle', { cx: lx - 8, cy: y, r: 8, fill: c.main }));
      g.appendChild(s('text', { x: lx - 28, y: y - 6, class: 'lbl', 'text-anchor': 'end', fill: c.deep }, r.label || ''));
      g.appendChild(s('text', { x: lx - 28, y: y + 22, class: 'val', 'text-anchor': 'end', 'font-size': 17 }, r.value || ''));

      const shareT = s('text', { x: rx + 20, y: y + 8, class: 'val', 'text-anchor': 'start', fill: c.deep, 'font-size': 17 }, r.share || '');
      g.appendChild(shareT);
      g._text = shareT;
      svg.appendChild(g);
      reg[r.id] = g;
    });

    // 中间结果
    const mid = spec.mid;
    const mg = s('g', { class: 'el', 'data-id': mid.id });
    mg.appendChild(s('rect', { x: cx - 56, y: yMid - 26, width: 112, height: 52, rx: 26, fill: '#fff', stroke: '#FFB894', 'stroke-width': 2.6 }));
    const mv = s('text', { x: cx, y: yMid + 7, class: 'val', 'text-anchor': 'middle', 'font-size': 19, fill: '#B4551F' }, mid.value || '');
    mg.appendChild(mv);
    mg._text = mv;
    mg.appendChild(text(cx, yMid + 52, mid.label || '', 'sm'));
    svg.appendChild(mg);
    reg[mid.id] = mg;

    if (spec.ratio) {
      const tw = Math.max(220, spec.ratio.length * 16 + 50);
      svg.appendChild(pill(W / 2 - tw / 2, 410, tw, 44, '#EAF6FD', '#BFE0F2'));
      svg.appendChild(text(W / 2, 439, spec.ratio, 'val', { fill: '#1B6D9B', 'font-size': 17 }));
    }
    if (spec.note) {
      svg.appendChild(text(W / 2, 486, spec.note, 'note'));
    }
    return svg;
  }

  /* ==================== 9. 信息卡（兜底） ==================== */
  function renderCards(spec, reg) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg' });
    title(svg, spec.title);
    const n = spec.cards.length;
    const cw = n > 1 ? 380 : 620, ch = 150, gap = 26;
    const totalW = n * cw + (n - 1) * gap;
    const x0 = (W - totalW) / 2, y0 = 130;

    spec.cards.forEach((c, i) => {
      const col = color(c.color);
      const x = x0 + i * (cw + gap);
      const g = s('g', { class: 'el', 'data-id': c.id });
      g.appendChild(s('rect', { x, y: y0, width: cw, height: ch, rx: 16, fill: '#fff', stroke: '#E8E1D6', 'stroke-width': 1.6 }));
      g.appendChild(s('rect', { x, y: y0, width: 6, height: ch, rx: 3, fill: col.main }));
      g.appendChild(text(x + 26, y0 + 40, c.title || '', 'lbl', { 'text-anchor': 'start', fill: col.deep, 'font-size': 15 }));
      c.lines.slice(0, 4).forEach((line, li) => {
        g.appendChild(text(x + 26, y0 + 74 + li * 24, line, 'note', { 'text-anchor': 'start' }));
      });
      svg.appendChild(g);
      reg[c.id] = g;
    });

    if (n > 1) {
      const ax = x0 + cw + gap / 2;
      svg.appendChild(s('path', { d: `M${ax - 12} ${y0 + ch / 2} h20`, stroke: '#C7D2DC', 'stroke-width': 2.4 }));
      svg.appendChild(s('path', { d: `M${ax + 8} ${y0 + ch / 2} l-8 -6 v12 z`, fill: '#C7D2DC' }));
    }
    return svg;
  }

  const RENDERERS = {
    segment: renderSegment,
    bars: renderBars,
    balance: renderBalance,
    area: renderArea,
    solid: renderSolid,
    route: renderRoute,
    table: renderTable,
    numberline: renderNumberline,
    percentbar: renderPercentBar,
    cross: renderCross,
    cards: renderCards
  };

  function render(spec) {
    const reg = {};
    const fn = RENDERERS[spec.type] || renderCards;
    let svg;
    try {
      svg = fn(spec.type === 'cards' && !spec.cards ? Object.assign({}, spec, { cards: [{ id: 'c1', title: '题目', lines: [''] }] }) : spec, reg);
    } catch (e) {
      console.error('图解渲染失败', e);
      svg = renderCards({ type: 'cards', cards: [{ id: 'c1', title: '图解生成失败', lines: [String(e.message).slice(0, 40)], color: 'red' }] }, reg);
    }
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return { svg, reg };
  }

  /** 把 viewBox 收缩到内容真实范围：留白越少，同样舞台里字就越大 */
  function fit(svg, pad) {
    pad = pad == null ? 26 : pad;
    let bb;
    try { bb = svg.getBBox(); } catch (e) { return null; }
    if (!bb || bb.width < 20 || bb.height < 20) return null;
    const w = bb.width + pad * 2;
    const h = bb.height + pad * 2;
    svg.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${w} ${h}`);
    return { w, h };
  }

  MT.diagrams = { render, fit, COLORS: C, W, H };
})();
