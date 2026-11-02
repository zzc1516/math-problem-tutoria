/* 00-util.js —— 基础工具：DOM、存储、提示、格式化 */
(function () {
  const MT = (window.MT = window.MT || {});

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, attrs, html) => {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 8);

  const store = {
    get(k, def) {
      try {
        const v = localStorage.getItem('mt.' + k);
        return v == null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem('mt.' + k, JSON.stringify(v)); } catch (e) { /* 隐私模式忽略 */ }
    },
    del(k) { try { localStorage.removeItem('mt.' + k); } catch (e) {} }
  };

  let toastTimer = null;
  function toast(msg, kind, ms) {
    const wrap = $('#toastWrap');
    if (!wrap) return;
    const t = el('div', { class: 'toast ' + (kind || '') , text: msg });
    wrap.appendChild(t);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 320);
    }, ms || 2600);
  }

  /** 把数字格式化成好看的中文表达：整数原样，小数最多两位 */
  function num(v) {
    if (v == null || v === '' || isNaN(v)) return String(v == null ? '' : v);
    const n = Number(v);
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n * 100) / 100);
  }

  /** 中文数字（1-6 年级） */
  function cnNum(n) {
    const cn = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    return n >= 0 && n <= 10 ? cn[n] : String(n);
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /** 简易 Markdown 行内渲染（**粗体** 和 `代码`），用于讲解文本 */
  function inlineMd(s) {
    let out = escapeHtml(s);
    out = out.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    out = out.replace(/`(.+?)`/g, '<code>$1</code>');
    return out;
  }

  MT.util = { $, $$, el, clamp, sleep, uid, store, toast, num, cnNum, debounce, escapeHtml, inlineMd };
})();
