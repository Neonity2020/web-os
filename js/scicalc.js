/* ============================================================
   科学计算器 Scientific Calculator
   表达式由手写递归下降解析器求值，不使用 eval / Function
   ============================================================ */
(function () {
  'use strict';
  const OS = window.OS;
  const V = OS.appViews;

  /* ---------------- 求值引擎 ---------------- */
  const DEG = Math.PI / 180;
  const CONSTANTS = { pi: Math.PI, e: Math.E };

  function factorial(n) {
    if (Math.abs(n - Math.round(n)) > 1e-9 || n < 0 || n > 170) throw new Error('阶乘仅支持 0–170 的整数');
    n = Math.round(n);
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  function needPositive(x, name) { if (x <= 0) throw new Error(name + ' 的真数必须大于 0'); return x; }

  const FUNCTIONS = {
    sin: (x, deg) => Math.sin(deg ? x * DEG : x),
    cos: (x, deg) => Math.cos(deg ? x * DEG : x),
    tan: (x, deg) => Math.tan(deg ? x * DEG : x),
    asin: (x, deg) => { if (Math.abs(x) > 1) throw new Error('sin⁻¹ 的定义域为 [-1, 1]'); const r = Math.asin(x); return deg ? r / DEG : r; },
    acos: (x, deg) => { if (Math.abs(x) > 1) throw new Error('cos⁻¹ 的定义域为 [-1, 1]'); const r = Math.acos(x); return deg ? r / DEG : r; },
    atan: (x, deg) => { const r = Math.atan(x); return deg ? r / DEG : r; },
    sinh: (x) => Math.sinh(x),
    cosh: (x) => Math.cosh(x),
    tanh: (x) => Math.tanh(x),
    asinh: (x) => Math.asinh(x),
    acosh: (x) => { if (x < 1) throw new Error('cosh⁻¹ 的定义域为 [1, +∞)'); return Math.acosh(x); },
    atanh: (x) => { if (Math.abs(x) >= 1) throw new Error('tanh⁻¹ 的定义域为 (-1, 1)'); return Math.atanh(x); },
    sqrt: (x) => { if (x < 0) throw new Error('负数没有实数平方根'); return Math.sqrt(x); },
    cbrt: (x) => Math.cbrt(x),
    abs: (x) => Math.abs(x),
    exp: (x) => Math.exp(x),
    pow10: (x) => Math.pow(10, x),
    pow2: (x) => Math.pow(2, x),
    ln: (x) => Math.log(needPositive(x, 'ln')),
    log: (x) => Math.log10(needPositive(x, 'log')),
    log2: (x) => Math.log2(needPositive(x, 'log₂'))
  };

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === ' ') { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        /* 支持科学计数法（1.2e-5），这样大数结果可以继续参与下一步运算 */
        const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
        if (!m || m[0] === '.') throw new Error('数字格式不正确');
        tokens.push({ t: 'num', v: m[0] });
        i += m[0].length;
        continue;
      }
      if (/[a-zA-Z]/.test(ch)) {
        const m = /^[a-zA-Z][a-zA-Z0-9]*/.exec(src.slice(i));
        tokens.push({ t: 'ident', v: m[0] });
        i += m[0].length;
        continue;
      }
      if ('+-*/^()!%'.indexOf(ch) >= 0) { tokens.push({ t: ch, v: ch }); i++; continue; }
      throw new Error('无法识别的字符「' + ch + '」');
    }
    return tokens;
  }

  function parse(tokens, ctx) {
    let pos = 0;
    const peek = () => tokens[pos];
    const at = (t) => !!(tokens[pos] && tokens[pos].t === t);
    const startsPrimary = (tok) => !!tok && (tok.t === 'num' || tok.t === 'ident' || tok.t === '(');

    function parsePrimary() {
      const tok = peek();
      if (!tok) throw new Error('表达式不完整');
      if (tok.t === 'num') { pos++; return parseFloat(tok.v); }
      if (tok.t === '(') {
        pos++;
        const v = parseAdd();
        if (!at(')')) throw new Error('缺少右括号');
        pos++;
        return v;
      }
      if (tok.t === 'ident') {
        pos++;
        const name = tok.v;
        if (name === 'Ans') return ctx.ans;
        if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) return CONSTANTS[name];
        const fn = FUNCTIONS[name];
        if (!fn) throw new Error('未知的名称「' + name + '」');
        if (!at('(')) throw new Error('函数「' + name + '」后面需要括号');
        pos++;
        const arg = parseAdd();
        if (!at(')')) throw new Error('缺少右括号');
        pos++;
        return fn(arg, ctx.deg);
      }
      throw new Error('「' + tok.v + '」附近缺少数字');
    }
    function parsePostfix() {
      let v = parsePrimary();
      for (;;) {
        if (at('!')) { pos++; v = factorial(v); }
        else if (at('%')) { pos++; v = v / 100; }
        else break;
      }
      return v;
    }
    function parsePower() {
      const base = parsePostfix();
      if (at('^')) { pos++; return Math.pow(base, parseUnary()); }
      return base;
    }
    function parseUnary() {
      if (at('-')) { pos++; return -parseUnary(); }
      if (at('+')) { pos++; return parseUnary(); }
      return parsePower();
    }
    function parseMul() {
      let v = parseUnary();
      for (;;) {
        if (at('*')) { pos++; v = v * parseUnary(); }
        else if (at('/')) {
          pos++;
          const d = parseUnary();
          if (d === 0) throw new Error('不能除以 0');
          v = v / d;
        } else if (startsPrimary(peek())) { v = v * parseUnary(); }
        else break;
      }
      return v;
    }
    function parseAdd() {
      let v = parseMul();
      for (;;) {
        if (at('+')) { pos++; v = v + parseMul(); }
        else if (at('-')) { pos++; v = v - parseMul(); }
        else break;
      }
      return v;
    }

    const value = parseAdd();
    if (pos < tokens.length) throw new Error('「' + tokens[pos].v + '」附近有多余的内容');
    return value;
  }

  /* 求值前整理：去掉末尾悬空的运算符，自动补齐右括号 */
  function normalize(expr) {
    let s = String(expr || '').replace(/\s+/g, '');
    s = s.replace(/[+\-*/^]+$/, '');
    if (!s) throw new Error('请输入表达式');
    const open = (s.match(/\(/g) || []).length;
    const close = (s.match(/\)/g) || []).length;
    if (close > open) throw new Error('右括号多于左括号');
    if (open > close) s += ')'.repeat(open - close);
    return s;
  }

  function evaluate(expr, opts) {
    opts = opts || {};
    const value = parse(tokenize(normalize(expr)), { deg: opts.deg !== false, ans: opts.ans || 0 });
    if (typeof value !== 'number' || isNaN(value)) throw new Error('结果无效，请检查定义域');
    if (!isFinite(value)) throw new Error('结果超出数值范围');
    return value;
  }

  /* 消除浮点尾巴与三角函数的近零误差 */
  function clean(v) {
    if (Math.abs(v) < 1e-12) return 0;
    const r = Math.round(v);
    if (Math.abs(v - r) < 1e-12 && Math.abs(v) < 1e15) return r;
    return v;
  }
  function fmt(v) {
    v = clean(v);
    const abs = Math.abs(v);
    if (v !== 0 && (abs >= 1e13 || abs < 1e-9)) return v.toExponential(7).replace(/\.?0+e/, 'e');
    return String(Number(v.toPrecision(12)));
  }

  /* 显示用符号：内部表达式始终是 ASCII，只在展示时美化 */
  const PRETTY = {
    pi: 'π', e: 'e', Ans: 'Ans',
    sqrt: '√', cbrt: '∛', exp: 'e^', pow10: '10^', pow2: '2^',
    asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹',
    asinh: 'sinh⁻¹', acosh: 'cosh⁻¹', atanh: 'tanh⁻¹',
    log2: 'log₂', ln: 'ln', log: 'log', abs: 'abs',
    sin: 'sin', cos: 'cos', tan: 'tan', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh'
  };
  function pretty(expr) {
    try {
      return tokenize(expr).map((tok) => {
        if (tok.t === 'num') return tok.v;
        if (tok.t === 'ident') return PRETTY[tok.v] || tok.v;
        if (tok.t === '*') return ' × ';
        if (tok.t === '/') return ' ÷ ';
        if (tok.t === '+') return ' + ';
        if (tok.t === '-') return ' − ';
        return tok.v;
      }).join('');
    } catch (e) { return expr; }
  }

  OS.sciCalc = { evaluate: evaluate, format: fmt, pretty: pretty, normalize: normalize };

  /* ---------------- 键盘定义 ---------------- */
  const ALT_INSERT = {
    'exp(': 'pow2(', 'ln(': 'log2(',
    'sin(': 'asin(', 'cos(': 'acos(', 'tan(': 'atan(',
    'sinh(': 'asinh(', 'cosh(': 'acosh(', 'tanh(': 'atanh('
  };
  const ALT_LABEL = {
    'exp(': '2ˣ', 'ln(': 'log₂',
    'sin(': 'sin⁻¹', 'cos(': 'cos⁻¹', 'tan(': 'tan⁻¹',
    'sinh(': 'sinh⁻¹', 'cosh(': 'cosh⁻¹', 'tanh(': 'tanh⁻¹'
  };
  const num = (k) => ({ k: k, label: k, cls: 'num' });
  const sci = (k, label) => ({ k: k, label: label, cls: 'sci' });
  const KEYS = [
    sci('(', '('), sci(')', ')'), sci('mc', 'mc'), sci('m+', 'm+'), sci('m-', 'm-'), sci('mr', 'mr'),
    { k: 'AC', label: 'AC', cls: 'fn' }, { k: 'neg', label: '±', cls: 'fn' }, { k: '%', label: '%', cls: 'fn' },
    { k: '/', label: '÷', cls: 'op' },

    { k: '2nd', label: '2nd', cls: 'sci toggle' },
    sci('^2', 'x²'), sci('^3', 'x³'), sci('^', 'xʸ'), sci('exp(', 'eˣ'), sci('pow10(', '10ˣ'),
    num('7'), num('8'), num('9'), { k: '*', label: '×', cls: 'op' },

    sci('recip', '1/x'), sci('sqrt(', '√'), sci('cbrt(', '∛'), sci('yroot', 'ʸ√x'), sci('ln(', 'ln'), sci('log(', 'log'),
    num('4'), num('5'), num('6'), { k: '-', label: '−', cls: 'op' },

    sci('!', 'x!'), sci('sin(', 'sin'), sci('cos(', 'cos'), sci('tan(', 'tan'), sci('pi', 'π'), sci('e', 'e'),
    num('1'), num('2'), num('3'), { k: '+', label: '+', cls: 'op' },

    { k: 'deg', label: 'Rad', cls: 'sci toggle' },
    sci('sinh(', 'sinh'), sci('cosh(', 'cosh'), sci('tanh(', 'tanh'), sci('Ans', 'Ans'), sci('back', '⌫'),
    { k: '0', label: '0', cls: 'num zero' }, num('.'), { k: '=', label: '=', cls: 'op' }
  ];

  V.scicalc = {
    render(win) {
      if (!win._sc) {
        win._sc = {
          expr: '', ans: 0, mem: 0, deg: true, second: false,
          justEval: false, error: '', history: [], showHistory: false, lastExpr: ''
        };
      }
      return '<div class="scicalc">' +
        '<div class="sc-display">' +
          '<div class="sc-flags">' +
            '<span class="sc-flag" data-flag="deg">DEG</span>' +
            '<span class="sc-flag" data-flag="second">2nd</span>' +
            '<span class="sc-flag" data-flag="mem">M</span>' +
            '<div class="grow"></div>' +
            '<button class="sc-link" data-act="basic" title="切换到基本计算器">基本型</button>' +
            '<button class="sc-link" data-act="history">历史</button>' +
          '</div>' +
          '<div class="sc-expr"></div>' +
          '<div class="sc-value">0</div>' +
        '</div>' +
        '<div class="sc-body">' +
          '<div class="sc-keys">' + KEYS.map((b) =>
            '<button class="' + b.cls + '" data-k="' + b.k + '" data-label="' + b.label + '">' + b.label + '</button>'
          ).join('') + '</div>' +
          '<div class="sc-history hidden">' +
            '<div class="sc-hist-head"><span>计算历史</span><div class="grow"></div>' +
            '<button class="sc-link" data-act="clearhist">清除</button>' +
            '<button class="sc-link" data-act="closehist">完成</button></div>' +
            '<div class="sc-hist-list"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    },
    mount(win) {
      const s = win._sc, root = win.body;
      const exprEl = root.querySelector('.sc-expr');
      const valueEl = root.querySelector('.sc-value');
      const histEl = root.querySelector('.sc-history');

      function currentValue() {
        if (s.justEval) return s.ans;
        if (!s.expr) return s.ans;
        return evaluate(s.expr, { deg: s.deg, ans: s.ans });
      }

      function show() {
        root.querySelector('[data-flag="deg"]').textContent = s.deg ? 'DEG' : 'RAD';
        root.querySelector('[data-flag="deg"]').classList.toggle('on', true);
        root.querySelector('[data-flag="second"]').classList.toggle('on', s.second);
        root.querySelector('[data-flag="mem"]').classList.toggle('on', s.mem !== 0);
        root.querySelectorAll('[data-k]').forEach((b) => {
          if (ALT_LABEL[b.dataset.k]) b.textContent = s.second ? ALT_LABEL[b.dataset.k] : b.dataset.label;
          if (b.dataset.k === '2nd') b.classList.toggle('on', s.second);
          if (b.dataset.k === 'deg') { b.textContent = s.deg ? 'Rad' : 'Deg'; b.classList.toggle('on', !s.deg); }
        });
        exprEl.classList.toggle('err', !!s.error);
        if (s.error) {
          exprEl.textContent = s.error;
          valueEl.textContent = '错误';
        } else if (s.justEval) {
          exprEl.textContent = pretty(s.lastExpr) + ' =';
          valueEl.textContent = fmt(s.ans);
        } else {
          valueEl.textContent = s.expr ? pretty(s.expr) : '0';
          let preview = '';
          if (s.expr && /[+\-*/^()!%]|[a-zA-Z]/.test(s.expr)) {
            try { preview = '= ' + fmt(evaluate(s.expr, { deg: s.deg, ans: s.ans })); } catch (e) { preview = ''; }
          }
          exprEl.textContent = preview;
        }
        const len = valueEl.textContent.length;
        valueEl.style.fontSize = len > 22 ? '24px' : len > 14 ? '30px' : len > 9 ? '38px' : '46px';
        /* 长表达式始终滚动到末尾，让最新输入可见 */
        valueEl.scrollLeft = valueEl.scrollWidth;
        exprEl.scrollLeft = exprEl.scrollWidth;
        histEl.classList.toggle('hidden', !s.showHistory);
        if (s.showHistory) renderHistory();
      }

      function renderHistory() {
        const list = root.querySelector('.sc-hist-list');
        if (!s.history.length) {
          list.innerHTML = '<div class="sc-hist-empty">还没有计算记录<br><span>按下 = 后会保存在这里，点击可重新载入表达式</span></div>';
          return;
        }
        list.innerHTML = s.history.map((h, i) =>
          '<button class="sc-hist-item" data-h="' + i + '">' +
          '<span class="sc-hist-expr">' + OS.esc(h.pretty) + '</span>' +
          '<span class="sc-hist-result">' + OS.esc(h.result) + '</span></button>'
        ).join('');
      }

      function insertFunction(fn) {
        if (s.justEval) { s.expr = fn + s.expr + ')'; s.justEval = false; }
        else s.expr += fn;
      }
      function negate() {
        if (!s.expr) { s.expr = '-'; return; }
        if (s.justEval) { s.expr = '-(' + s.expr + ')'; s.justEval = false; return; }
        const m = /(-?)((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/.exec(s.expr);
        if (!m) { s.expr = '-(' + s.expr + ')'; return; }
        const start = s.expr.length - m[0].length;
        const before = start > 0 ? s.expr[start - 1] : '';
        /* 前面是数字/右括号/常量时，这个减号是二元减号，不能当成负号删掉 */
        const unary = !!m[1] && (!before || /[+\-*/^(]/.test(before));
        if (m[1] && unary) s.expr = s.expr.slice(0, start) + m[2];
        else if (m[1]) s.expr = s.expr.slice(0, start) + '-(-' + m[2] + ')';
        else s.expr = s.expr.slice(0, start) + '-' + m[2];
      }
      function backspace() {
        if (s.justEval) { s.expr = ''; s.justEval = false; return; }
        const m = /([a-zA-Z][a-zA-Z0-9]*\(|[a-zA-Z][a-zA-Z0-9]*)$/.exec(s.expr);
        s.expr = m ? s.expr.slice(0, -m[0].length) : s.expr.slice(0, -1);
      }

      function press(k) {
        const hadError = !!s.error;
        s.error = '';
        if (k === 'AC') { s.expr = ''; s.justEval = false; }
        else if (k === 'back') backspace();
        else if (k === '2nd') s.second = !s.second;
        else if (k === 'deg') s.deg = !s.deg;
        else if (k === 'neg') negate();
        else if (k === 'mc') s.mem = 0;
        else if (k === 'mr') {
          s.expr += String(s.mem);
          s.justEval = false;
        } else if (k === 'm+' || k === 'm-') {
          try {
            const v = currentValue();
            s.mem = clean(s.mem + (k === 'm+' ? v : -v));
            OS.toast('记忆', (k === 'm+' ? '已加上 ' : '已减去 ') + fmt(v) + ' · M = ' + fmt(s.mem), 'calculator');
          } catch (err) { s.error = err.message; }
        } else if (k === 'recip') {
          s.expr = s.expr ? '1/(' + s.expr + ')' : '1/(';
          s.justEval = false;
        } else if (k === 'yroot') {
          if (s.justEval) { s.expr = '(' + s.expr + ')^(1/('; s.justEval = false; }
          else s.expr += '^(1/(';
        } else if (k === '=') {
          if (!s.expr) { show(); return; }
          try {
            const text = s.expr;
            const v = evaluate(text, { deg: s.deg, ans: s.ans });
            s.ans = v; s.lastExpr = text; s.expr = String(v); s.justEval = true;
            s.history.unshift({ expr: text, pretty: pretty(normalize(text)), result: fmt(v) });
            if (s.history.length > 30) s.history.pop();
          } catch (err) { s.error = err.message; s.justEval = false; }
        } else {
          const insert = (s.second && ALT_INSERT[k]) || k;
          if (insert.charAt(insert.length - 1) === '(' && /[a-zA-Z]/.test(insert)) insertFunction(insert);
          else if (k === 'pi' || k === 'e' || k === 'Ans') {
            if (s.justEval) { s.expr = ''; s.justEval = false; }
            s.expr += k;
          } else {
            if (s.justEval) {
              if (/^[0-9.]$/.test(insert) || insert === '(') s.expr = '';
              s.justEval = false;
            }
            /* 报错后直接输入数字，视为重新开始，而不是接在错误表达式后面 */
            if (hadError && /^[0-9.]$/.test(insert)) s.expr = '';
            s.expr += insert;
          }
        }
        show();
      }

      root.querySelector('.sc-keys').addEventListener('click', (e) => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        press(b.dataset.k);
        b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 110);
      });
      root.querySelector('[data-act="history"]').addEventListener('click', () => { s.showHistory = true; show(); });
      root.querySelector('[data-act="closehist"]').addEventListener('click', () => { s.showHistory = false; show(); });
      root.querySelector('[data-act="clearhist"]').addEventListener('click', () => { s.history = []; renderHistory(); });
      root.querySelector('[data-act="basic"]').addEventListener('click', () => OS.openApp('calculator'));
      root.querySelector('.sc-hist-list').addEventListener('click', (e) => {
        const b = e.target.closest('[data-h]'); if (!b) return;
        const h = s.history[+b.dataset.h]; if (!h) return;
        s.expr = h.expr; s.justEval = false; s.error = ''; s.showHistory = false;
        show();
      });

      /* 键盘输入：窗口关闭后自动解绑 */
      if (win._scKeyHandler) window.removeEventListener('keydown', win._scKeyHandler);
      const KEYMAP = {
        '*': '*', '/': '/', '+': '+', '-': '-', '^': '^', '(': '(', ')': ')',
        '!': '!', '%': '%', '.': '.', 'Enter': '=', '=': '=',
        'Backspace': 'back', 'Escape': 'AC', 'Delete': 'AC'
      };
      win._scKeyHandler = (e) => {
        if (!document.body.contains(win.el)) { window.removeEventListener('keydown', win._scKeyHandler); return; }
        if (OS.wm.active() !== win || e.metaKey || e.ctrlKey || e.altKey) return;
        const ae = document.activeElement;
        if (ae && /INPUT|TEXTAREA/.test(ae.tagName)) return;
        const k = KEYMAP[e.key] || (/^[0-9]$/.test(e.key) ? e.key : null);
        if (!k) return;
        e.preventDefault(); e.stopPropagation();
        press(k);
        const b = root.querySelector('[data-k="' + k + '"]');
        if (b) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 110); }
      };
      window.addEventListener('keydown', win._scKeyHandler);

      win.setTools('<button class="sc-title-tool" data-act="basic-title" title="切换到基本计算器">fx</button>');
      win.toolsEl.querySelector('[data-act="basic-title"]').addEventListener('click', () => OS.openApp('calculator'));
      show();
    }
  };
})();
