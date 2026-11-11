/* ============================================================
   WebOS · Mini Office
   内置文稿演示 + 本地 OOXML（DOCX / PPTX / XLSX）只读预览
   ============================================================ */
(function () {
  'use strict';
  const OS = window.OS;
  const V = OS.appViews;

  const KIND = {
    pptx: { label: 'PPTX', name: '演示文稿', icon: 'file-pptx', color: '#d96c43' },
    docx: { label: 'DOCX', name: '文字文档', icon: 'file-docx', color: '#3b82c4' },
    xlsx: { label: 'XLSX', name: '电子表格', icon: 'file-xlsx', color: '#2c8a5b' }
  };

  const asCells = (rows) => rows.map((row) => row.map((v) =>
    v && typeof v === 'object' ? v : { v: v == null ? '' : v }
  ));

  const SAMPLES = [
    {
      id: 'pitch', name: 'WebOS 产品简报.pptx', kind: 'pptx', meta: '4 张幻灯片 · 内置示例',
      data: { slides: [
        {
          layout: 'cover', kicker: 'WEBOS / PRODUCT OVERVIEW', title: '把桌面，\n装进浏览器。',
          subtitle: '一个由 HTML、CSS 与 JavaScript 构成的极简桌面体验。', footer: 'WEBOS STUDIO · 2026'
        },
        {
          layout: 'columns', kicker: '01 / SYSTEM', title: '轻量，但不简单。',
          subtitle: '从窗口管理到应用生态，每一层都保持清晰、直接。',
          items: [
            ['01', '窗口系统', '拖拽、缩放、最小化与调度中心，让多任务自然发生。'],
            ['02', '原生应用', '访达、备忘录、日历与 Office，共享一致的交互语言。'],
            ['03', '本地优先', '无需账户，无需上传。所有演示内容都留在浏览器里。']
          ]
        },
        {
          layout: 'metrics', kicker: '02 / PRINCIPLES', title: '少即是多，细节即体验。',
          subtitle: '用尽可能少的视觉元素，建立足够清晰的信息层级。',
          metrics: [['0', '外部依赖'], ['3', '办公格式'], ['100%', '本地解析']],
          note: '设计不是装饰，而是让复杂的事情看起来理所当然。'
        },
        {
          layout: 'closing', kicker: '03 / NEXT', title: '现在，开始创作。',
          subtitle: '打开一份文档，或者把本地文件拖进来。\n简单办公，从这里开始。', footer: 'MINI OFFICE · READ ONLY'
        }
      ] }
    },
    {
      id: 'memo', name: '设计原则.docx', kind: 'docx', meta: '3 页 · 内置示例',
      data: { blocks: [
        { type: 'eyebrow', text: 'WEBOS STUDIO / DESIGN NOTES' },
        { type: 'title', text: '少即是多。\n简单，需要被认真设计。' },
        { type: 'lead', text: '一份关于界面、节奏与克制的设计备忘录。' },
        { type: 'meta', text: '设计团队　·　2026 年 11 月　·　阅读约 3 分钟' },
        { type: 'h1', text: '01　先建立秩序，再表达个性' },
        { type: 'p', text: '极简并不意味着空无一物，而是让每一个留下的元素都有明确职责。窗口的边界、文字的字重、按钮的间距，都在回答同一个问题：用户下一步应该看哪里？' },
        { type: 'p', text: '当层级足够清晰，装饰就可以退到幕后。颜色用于表达状态，阴影用于表达空间，动效用于表达因果。除此之外，保持克制。' },
        { type: 'quote', text: '好的界面不需要解释自己。它让注意力停留在内容上，而不是控件上。' },
        { type: 'h1', text: '02　让反馈发生在动作之后' },
        { type: 'p', text: '每一次点击、拖动与选择，都应该得到即时且可预期的回应。反馈不必喧哗，一个轻微的缩放、一段短促的过渡，就足以让界面显得可靠。' },
        { type: 'list', items: ['一致性比惊艳更重要：相同的动作，应当产生相同的结果。', '可逆性降低心理负担：关闭、撤销与返回始终触手可及。', '内容优先于容器：工具应该出现得及时，也应该消失得彻底。'] },
        { type: 'h1', text: '03　把复杂留给系统' },
        { type: 'p', text: 'Mini Office 将复杂的 Office Open XML 结构转化为清爽的阅读视图。文件在本机解析，不上传服务器；用户只需要选择文件，然后专注阅读。' },
        { type: 'table', rows: [['原则', '系统行为', '用户体验'], ['清晰', '建立稳定的信息层级', '快速找到重点'], ['克制', '减少无意义的视觉噪声', '保持长时间专注'], ['可信', '即时反馈与本地处理', '理解并掌控每一步']] },
        { type: 'p', text: '最终，我们追求的不是“看起来简单”，而是“用起来自然”。这就是 Mini Office 的起点。' }
      ] }
    },
    {
      id: 'budget', name: '季度预算.xlsx', kind: 'xlsx', meta: '2 个工作表 · 内置示例',
      data: { sheets: [
        { name: '年度预算', rows: asCells([
          ['WebOS · 2026 年度预算', '', '', '', '', '', '单位：人民币'],
          ['项目', '负责人', 'Q1', 'Q2', 'Q3', 'Q4', '年度合计'],
          ['产品研发', '设计与工程', 128000, 142000, 150000, 160000, { v: 580000, f: 'SUM(C3:F3)' }],
          ['视觉与内容', '品牌工作室', 42000, 48000, 52000, 58000, { v: 200000, f: 'SUM(C4:F4)' }],
          ['云服务', '基础设施', 36000, 36000, 42000, 42000, { v: 156000, f: 'SUM(C5:F5)' }],
          ['市场与社区', '增长团队', 28000, 32000, 46000, 54000, { v: 160000, f: 'SUM(C6:F6)' }],
          ['预留预算', '运营', 20000, 20000, 20000, 20000, { v: 80000, f: 'SUM(C7:F7)' }],
          ['合计', '', { v: 254000, f: 'SUM(C3:C7)' }, { v: 278000, f: 'SUM(D3:D7)' }, { v: 310000, f: 'SUM(E3:E7)' }, { v: 334000, f: 'SUM(F3:F7)' }, { v: 1176000, f: 'SUM(G3:G7)' }],
          [], ['备注', '数值仅用于演示；点击单元格可查看公式。']
        ]) },
        { name: '关键指标', rows: asCells([
          ['指标', '目标', '当前', '完成率'],
          ['内置应用', 20, 19, '95%'],
          ['支持格式', 3, 3, '100%'],
          ['本地预览', '是', '是', '完成'],
          ['用户满意度', '4.8 / 5', '4.9 / 5', '102%']
        ]) }
      ] }
    }
  ];

  /* ---------------- 示例文稿渲染 ---------------- */
  function pptSlide(slide, index, thumb) {
    const title = OS.esc(slide.title || '未命名幻灯片').replace(/\n/g, '<br>');
    let body = '';
    if (slide.layout === 'cover' || slide.layout === 'closing') {
      body = '<div class="ppt-orb"></div><div class="ppt-cover-copy"><div class="ppt-kicker">' + OS.esc(slide.kicker || '') + '</div>' +
        '<h1>' + title + '</h1><p>' + OS.esc(slide.subtitle || '').replace(/\n/g, '<br>') + '</p></div>' +
        '<div class="ppt-footer">' + OS.esc(slide.footer || 'WEBOS') + '</div>';
    } else if (slide.layout === 'columns') {
      body = '<div class="ppt-kicker">' + OS.esc(slide.kicker || '') + '</div><h2>' + title + '</h2>' +
        '<p class="ppt-subtitle">' + OS.esc(slide.subtitle || '') + '</p><div class="ppt-column-grid">' +
        (slide.items || []).map((it) => '<div><span>' + OS.esc(it[0]) + '</span><h3>' + OS.esc(it[1]) + '</h3><p>' + OS.esc(it[2]) + '</p></div>').join('') + '</div>';
    } else if (slide.layout === 'metrics') {
      body = '<div class="ppt-kicker">' + OS.esc(slide.kicker || '') + '</div><h2>' + title + '</h2>' +
        '<p class="ppt-subtitle">' + OS.esc(slide.subtitle || '') + '</p><div class="ppt-metric-grid">' +
        (slide.metrics || []).map((m) => '<div><b>' + OS.esc(m[0]) + '</b><span>' + OS.esc(m[1]) + '</span></div>').join('') + '</div>' +
        '<div class="ppt-note">' + OS.esc(slide.note || '') + '</div>';
    } else {
      body = '<div class="ppt-kicker">' + OS.esc(slide.kicker || 'LOCAL PRESENTATION') + '</div><h2>' + title + '</h2>' +
        '<div class="ppt-bullets">' + (slide.bullets || []).map((b) => '<p>' + OS.esc(b) + '</p>').join('') + '</div>';
    }
    return '<div class="ppt-slide ppt-' + OS.esc(slide.layout || 'external') + (thumb ? ' is-thumb' : '') + '">' + body +
      '<span class="ppt-page">' + OS.pad(index + 1) + '</span></div>';
  }

  function docxBlock(b) {
    if (b.type === 'title') return '<h1 class="doc-title">' + OS.esc(b.text).replace(/\n/g, '<br>') + '</h1>';
    if (b.type === 'eyebrow') return '<div class="doc-eyebrow">' + OS.esc(b.text) + '</div>';
    if (b.type === 'lead') return '<p class="doc-lead">' + OS.esc(b.text) + '</p>';
    if (b.type === 'meta') return '<div class="doc-meta-line">' + OS.esc(b.text) + '</div>';
    if (b.type === 'h1' || b.type === 'h2') return '<h2>' + OS.esc(b.text) + '</h2>';
    if (b.type === 'quote') return '<blockquote>' + OS.esc(b.text) + '</blockquote>';
    if (b.type === 'list') return '<ul>' + (b.items || []).map((x) => '<li>' + OS.esc(x) + '</li>').join('') + '</ul>';
    if (b.type === 'table') return '<table class="doc-table">' + b.rows.map((r, i) => '<tr>' + r.map((c) => '<' + (i ? 'td' : 'th') + '>' + OS.esc(c) + '</' + (i ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</table>';
    return '<p>' + OS.esc(b.text || '') + '</p>';
  }

  const colName = (n) => {
    let s = '';
    n += 1;
    while (n) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
    return s;
  };
  const cellText = (cell) => {
    const v = cell && cell.v != null ? cell.v : '';
    return typeof v === 'number' ? v.toLocaleString('zh-CN', { maximumFractionDigits: 8 }) : String(v);
  };

  /* ---------------- 应用界面 ---------------- */
  V.office = {
    render(win, opts) {
      const requested = opts.demo || (opts.node && opts.node.demo);
      if (!win._o) win._o = { docs: SAMPLES.slice(), selected: requested || null, slide: 0, sheet: 0, cell: null, playing: false, loading: false };
      else if (requested) { win._o.selected = requested; win._o.slide = 0; win._o.sheet = 0; win._o.cell = null; }
      return '<div class="office-app">' +
        '<aside class="office-sidebar">' +
          '<button class="office-brand" data-office-home><span class="office-mark"><i></i><i></i><i></i><i></i></span><span><b>极简 Office</b><small> documents, simply.</small></span></button>' +
          '<div class="office-file-list"></div>' +
          '<div class="office-side-foot"><i></i><span>本地解析 · 文件不会上传</span></div>' +
        '</aside>' +
        '<section class="office-main">' +
          '<header class="office-toolbar"><div class="office-current"></div><div class="grow"></div>' +
            '<span class="office-readonly">只读预览</span><button class="btn" data-office-open>' + OS.symbol('folder', 14) + ' 打开文件</button>' +
            '<input type="file" class="office-file-input" accept=".docx,.pptx,.xlsx" hidden>' +
          '</header>' +
          '<div class="office-content"></div>' +
          '<footer class="office-status"><span class="office-status-text">就绪</span><span>DOCX&nbsp;&nbsp;·&nbsp;&nbsp;PPTX&nbsp;&nbsp;·&nbsp;&nbsp;XLSX</span></footer>' +
        '</section></div>';
    },

    mount(win) {
      const s = win._o, root = win.body;
      const list = root.querySelector('.office-file-list'), content = root.querySelector('.office-content');
      const current = root.querySelector('.office-current'), status = root.querySelector('.office-status-text');
      const fileInput = root.querySelector('.office-file-input');
      let loadToken = 0;

      const doc = () => s.docs.find((d) => d.id === s.selected) || null;
      function stop() { s.playing = false; }
      function select(id) {
        if (s.selected === id) return;
        stop(); s.selected = id; s.slide = 0; s.sheet = 0; s.cell = null; draw();
      }
      function drawList() {
        const group = (title, docs) => '<div class="office-group-title"><span>' + title + '</span><i>' + docs.length + '</i></div>' +
          docs.map((d) => '<button class="office-file' + (d.id === s.selected ? ' on' : '') + '" data-doc="' + d.id + '">' +
            '<span class="office-file-icon" style="--kind:' + KIND[d.kind].color + '">' + OS.symbol(d.kind === 'pptx' ? 'layout' : d.kind === 'xlsx' ? 'grid' : 'file-text', 16) + '</span>' +
            '<span><b>' + OS.esc(d.name) + '</b><small>' + KIND[d.kind].label + ' · ' + OS.esc(d.local ? '本机文件' : '示例') + '</small></span></button>').join('');
        list.innerHTML = group('示例文稿', s.docs.filter((d) => !d.local)) +
          (s.docs.some((d) => d.local) ? group('本机文件', s.docs.filter((d) => d.local)) : '');
      }
      function drawHome() {
        win.setTitle('极简 Office');
        current.innerHTML = '<div class="office-home-label">工作台</div>';
        content.innerHTML = '<div class="office-home">' +
          '<div class="office-home-head"><div class="office-home-kicker">MINI OFFICE</div><h1>文档，简单一点。</h1><p>打开、阅读、演示。没有多余步骤，也没有云端等待。</p></div>' +
          '<div class="office-doc-cards">' + SAMPLES.map((d) => {
            const preview = d.kind === 'pptx' ? '<div class="mini-ppt"><i></i><b>WebOS</b><span></span><span></span></div>' :
              d.kind === 'docx' ? '<div class="mini-doc"><b></b><b></b><span></span><span></span><span></span><span></span></div>' :
              '<div class="mini-sheet">' + Array.from({ length: 20 }, (_, i) => '<i class="' + (i < 5 ? 'head' : '') + '"></i>').join('') + '</div>';
            return '<button class="office-doc-card" data-open-sample="' + d.id + '">' + preview +
              '<span class="office-card-kind" style="color:' + KIND[d.kind].color + '">' + KIND[d.kind].label + '</span>' +
              '<h3>' + OS.esc(d.name.replace(/\.(pptx|docx|xlsx)$/i, '')) + '</h3><p>' + OS.esc(d.meta) + '</p>' +
              '<span class="office-card-open">打开文稿 ' + OS.symbol('arrow-right', 13) + '</span></button>';
          }).join('') + '</div>' +
          '<button class="office-drop-hint" data-office-open><span>' + OS.symbol('plus', 20) + '</span><div><b>打开本机文档</b><small>选择或拖入 .docx、.pptx、.xlsx 文件，最大 40 MB</small></div></button>' +
          '</div>';
        status.textContent = '3 份示例文稿 · 支持本机文件';
      }
      function drawPpt(d) {
        const slides = d.data.slides || [];
        if (!slides.length) { content.innerHTML = '<div class="office-error">这份演示文稿中没有可显示的幻灯片。</div>'; return; }
        s.slide = OS.clamp(s.slide, 0, slides.length - 1);
        content.innerHTML = '<div class="ppt-viewer"><div class="slide-strip">' + slides.map((sl, i) =>
          '<button class="slide-thumb' + (i === s.slide ? ' on' : '') + '" data-slide="' + i + '"><span>' + (i + 1) + '</span>' + pptSlide(sl, i, true) + '</button>').join('') + '</div>' +
          '<div class="ppt-stage"><div class="ppt-canvas">' + pptSlide(slides[s.slide], s.slide, false) + '</div>' +
          '<div class="ppt-controls"><button class="tb-icon" data-ppt-prev title="上一张">' + OS.symbol('chevron-left', 15) + '</button>' +
          '<span>' + (s.slide + 1) + ' / ' + slides.length + '</span>' +
          '<button class="tb-icon" data-ppt-next title="下一张">' + OS.symbol('chevron-right', 15) + '</button><i></i>' +
          '<button class="ppt-play" data-ppt-play>' + OS.symbol(s.playing ? 'pause' : 'play', 12) + (s.playing ? ' 暂停' : ' 自动播放') + '</button></div></div></div>';
        status.textContent = '第 ' + (s.slide + 1) + ' 张，共 ' + slides.length + ' 张 · 方向键切换';
      }
      function drawDocx(d) {
        content.innerHTML = '<div class="docx-canvas"><article class="docx-paper">' +
          (d.data.blocks || []).map(docxBlock).join('') + '<footer class="doc-footer">MINI OFFICE · 只读文档预览</footer></article></div>';
        status.textContent = (d.data.blocks || []).length + ' 个内容区块 · 自动重排版面';
      }
      function drawXlsx(d) {
        const sheets = d.data.sheets || [];
        if (!sheets.length) { content.innerHTML = '<div class="office-error">这份工作簿中没有可显示的工作表。</div>'; return; }
        s.sheet = OS.clamp(s.sheet, 0, sheets.length - 1);
        const sheet = sheets[s.sheet], rows = sheet.rows || [];
        const cols = Math.max(1, ...rows.map((r) => r.length));
        const active = s.cell && rows[s.cell.r] && rows[s.cell.r][s.cell.c] ? s.cell : { r: 0, c: 0 };
        const activeCell = rows[active.r] && rows[active.r][active.c];
        let table = '<table class="xlsx-table"><thead><tr><th class="xlsx-corner"></th>' +
          Array.from({ length: cols }, (_, c) => '<th>' + colName(c) + '</th>').join('') + '</tr></thead><tbody>';
        rows.forEach((row, r) => {
          table += '<tr><th>' + (r + 1) + '</th>' + Array.from({ length: cols }, (_, c) => {
            const cell = row[c] || { v: '' }, selected = active.r === r && active.c === c;
            return '<td class="' + (selected ? 'selected ' : '') + (typeof cell.v === 'number' ? 'number' : '') + '" data-cell="' + r + ',' + c + '" title="' + OS.esc(cellText(cell)) + '">' + OS.esc(cellText(cell)) + '</td>';
          }).join('') + '</tr>';
        });
        table += '</tbody></table>';
        content.innerHTML = '<div class="xlsx-viewer"><div class="xlsx-formula"><span class="xlsx-namebox">' + colName(active.c) + (active.r + 1) + '</span><span class="xlsx-fx">fx</span>' +
          '<input class="xlsx-formula-input" readonly value="' + OS.esc(activeCell && activeCell.f ? '=' + activeCell.f : cellText(activeCell)) + '" aria-label="单元格内容"></div>' +
          '<div class="xlsx-grid">' + table + '</div><div class="xlsx-tabs">' + sheets.map((sh, i) =>
            '<button class="' + (i === s.sheet ? 'on' : '') + '" data-sheet="' + i + '">' + OS.symbol('grid', 12) + OS.esc(sh.name || 'Sheet' + (i + 1)) + '</button>').join('') +
          '<span>' + rows.length + ' 行 × ' + cols + ' 列</span></div></div>';
        status.textContent = sheet.name + ' · ' + (activeCell && activeCell.f ? '公式：=' + activeCell.f : '点击单元格查看内容');
      }
      function draw() {
        drawList();
        const d = doc();
        root.querySelector('.office-readonly').classList.toggle('hidden', !d);
        if (!d) { drawHome(); return; }
        win.setTitle(d.name);
        current.innerHTML = '<span class="office-kind-badge" style="--kind:' + KIND[d.kind].color + '">' + KIND[d.kind].label + '</span>' +
          '<div><b>' + OS.esc(d.name) + '</b><small>' + OS.esc(d.meta || KIND[d.kind].name) + '</small></div>';
        if (d.kind === 'pptx') drawPpt(d);
        else if (d.kind === 'docx') drawDocx(d);
        else drawXlsx(d);
      }

      async function openLocal(file) {
        if (!file) return;
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!KIND[ext]) { OS.toast('无法打开文件', '请选择 DOCX、PPTX 或 XLSX 格式', 'office'); return; }
        if (file.size > 40 * 1024 * 1024) { OS.toast('文件过大', '轻量预览支持最大 40 MB 的文件', 'office'); return; }
        stop();
        const token = ++loadToken;
        s.loading = true;
        win.setTitle(file.name);
        content.innerHTML = '<div class="office-loading"><span class="office-spinner"></span><h3>正在打开 ' + OS.esc(file.name) + '</h3><p>正在本机解析文档结构，文件不会上传。</p></div>';
        status.textContent = '正在读取…';
        try {
          const data = await OS.miniOffice.parseFile(file);
          if (token !== loadToken) return;
          const id = 'local_' + Date.now();
          s.docs.push({ id: id, name: file.name, kind: ext, data: data, local: true, meta: KIND[ext].name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB' });
          s.selected = id; s.slide = 0; s.sheet = 0; s.cell = null; s.loading = false;
          draw();
          OS.toast('文档已打开', file.name + ' · 仅在本机预览', KIND[ext].icon);
        } catch (err) {
          if (token !== loadToken) return;
          console.error('[Mini Office]', err);
          s.loading = false;
          content.innerHTML = '<div class="office-error"><span>' + OS.symbol('info', 30) + '</span><h3>暂时无法预览这份文件</h3><p>' + OS.esc(err.message || '文件结构不受支持') + '</p><button class="btn primary" data-office-home>返回示例文稿</button></div>';
          status.textContent = '打开失败';
          OS.toast('无法打开文档', err.message || '请确认文件未损坏且格式正确', 'office');
        } finally { fileInput.value = ''; }
      }

      root.addEventListener('click', (e) => {
        const file = e.target.closest('[data-doc]'); if (file) { select(file.dataset.doc); return; }
        const sample = e.target.closest('[data-open-sample]'); if (sample) { select(sample.dataset.openSample); return; }
        if (e.target.closest('[data-office-home]')) { stop(); loadToken++; s.selected = null; s.loading = false; draw(); return; }
        if (e.target.closest('[data-office-open]')) { fileInput.click(); return; }
        const thumb = e.target.closest('[data-slide]'); if (thumb) { stop(); s.slide = +thumb.dataset.slide; draw(); return; }
        if (e.target.closest('[data-ppt-prev]')) { stop(); s.slide = Math.max(0, s.slide - 1); draw(); return; }
        if (e.target.closest('[data-ppt-next]')) { stop(); s.slide = Math.min((doc().data.slides.length - 1), s.slide + 1); draw(); return; }
        if (e.target.closest('[data-ppt-play]')) { s.playing = !s.playing; draw(); return; }
        const tab = e.target.closest('[data-sheet]'); if (tab) { s.sheet = +tab.dataset.sheet; s.cell = null; draw(); return; }
        const cell = e.target.closest('[data-cell]'); if (cell) { const [r, c] = cell.dataset.cell.split(',').map(Number); s.cell = { r: r, c: c }; draw(); }
      });
      fileInput.addEventListener('change', () => openLocal(fileInput.files[0]));
      ['dragenter', 'dragover'].forEach((type) => root.addEventListener(type, (e) => { e.preventDefault(); root.querySelector('.office-app').classList.add('dragging-file'); }));
      ['dragleave', 'drop'].forEach((type) => root.addEventListener(type, (e) => { e.preventDefault(); root.querySelector('.office-app').classList.remove('dragging-file'); }));
      root.addEventListener('drop', (e) => openLocal(e.dataTransfer.files[0]));

      const timer = setInterval(() => {
        if (!document.body.contains(win.el)) { clearInterval(timer); return; }
        const d = doc();
        if (!s.playing || !d || d.kind !== 'pptx') return;
        s.slide = (s.slide + 1) % d.data.slides.length;
        draw();
      }, 3600);
      window.addEventListener('keydown', (e) => {
        if (!document.body.contains(win.el) || OS.wm.active() !== win || !doc() || doc().kind !== 'pptx') return;
        if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); stop(); s.slide = Math.min(doc().data.slides.length - 1, s.slide + 1); draw(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); s.slide = Math.max(0, s.slide - 1); draw(); }
      });
      draw();
      /* 由访达「打开本机文件…」传入：在本机解析并打开，无需上传 */
      if (win.opts.file) {
        const localFile = win.opts.file;
        delete win.opts.file;
        openLocal(localFile);
      }
    }
  };

  /* ---------------- 轻量 ZIP / OOXML 读取器 ---------------- */
  const utf8 = new TextDecoder('utf-8');
  const children = (el, name) => Array.from(el.childNodes || []).filter((n) => n.nodeType === 1 && (!name || n.localName === name));
  const descendants = (el, name) => Array.from(el.getElementsByTagName('*')).filter((n) => n.localName === name);
  const attr = (el, name) => {
    if (!el) return '';
    if (el.hasAttribute(name)) return el.getAttribute(name);
    const a = Array.from(el.attributes || []).find((x) => x.localName === name);
    return a ? a.value : '';
  };
  const xmlText = (el) => descendants(el, 't').map((n) => n.textContent || '').join('');
  function parseXml(bytes) {
    const doc = new DOMParser().parseFromString(utf8.decode(bytes), 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('文档中的 XML 结构无效或已损坏。');
    return doc;
  }

  class ZipPackage {
    constructor(buffer) {
      this.view = new DataView(buffer);
      this.bytes = new Uint8Array(buffer);
      this.entries = new Map();
      this.readDirectory();
    }
    readDirectory() {
      const v = this.view, len = v.byteLength;
      if (len < 22) throw new Error('这不是有效的 Office Open XML 文件。');
      let eocd = -1;
      for (let i = len - 22; i >= Math.max(0, len - 66000); i--) {
        if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      }
      if (eocd < 0) throw new Error('找不到文档的 ZIP 目录，请确认文件扩展名与实际格式一致。');
      const count = v.getUint16(eocd + 10, true);
      let p = v.getUint32(eocd + 16, true);
      for (let i = 0; i < count; i++) {
        if (p + 46 > len || v.getUint32(p, true) !== 0x02014b50) break;
        const flags = v.getUint16(p + 8, true), method = v.getUint16(p + 10, true);
        const size = v.getUint32(p + 20, true), nameLen = v.getUint16(p + 28, true);
        const extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
        const local = v.getUint32(p + 42, true), name = utf8.decode(this.bytes.subarray(p + 46, p + 46 + nameLen));
        if (!name.endsWith('/')) this.entries.set(name, { flags: flags, method: method, size: size, local: local });
        p += 46 + nameLen + extraLen + commentLen;
      }
      if (!this.entries.size) throw new Error('文档中没有可读取的内容。');
    }
    async read(name) {
      const entry = this.entries.get(name);
      if (!entry) return null;
      if (entry.flags & 1) throw new Error('加密文档暂不支持，请先移除密码保护。');
      const v = this.view, p = entry.local;
      if (v.getUint32(p, true) !== 0x04034b50) throw new Error('文档的本地文件结构无效。');
      const nameLen = v.getUint16(p + 26, true), extraLen = v.getUint16(p + 28, true);
      const start = p + 30 + nameLen + extraLen;
      const data = this.bytes.subarray(start, start + entry.size);
      if (entry.method === 0) return data;
      if (entry.method !== 8) throw new Error('文档使用了暂不支持的压缩方式。');
      if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持本地解压，请使用最新版 Chrome、Edge 或 Safari。');
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    async xml(name) {
      const bytes = await this.read(name);
      if (!bytes) throw new Error('文档缺少必要组件：' + name);
      return parseXml(bytes);
    }
    names(prefix) { return Array.from(this.entries.keys()).filter((n) => n.startsWith(prefix)); }
  }

  function partPath(base, target) {
    if (target.startsWith('/')) return target.slice(1);
    const parts = base.split('/').slice(0, -1).concat(target.split('/'));
    const out = [];
    parts.forEach((p) => { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); });
    return out.join('/');
  }
  async function relationships(zip, part) {
    const bits = part.split('/'), file = bits.pop();
    const relName = bits.concat('_rels', file + '.rels').join('/');
    const bytes = await zip.read(relName);
    if (!bytes) return {};
    const doc = parseXml(bytes), out = {};
    Array.from(doc.documentElement.childNodes).forEach((r) => { if (r.localName === 'Relationship') out[attr(r, 'Id')] = partPath(part, attr(r, 'Target')); });
    return out;
  }

  async function parseDocx(zip) {
    const doc = await zip.xml('word/document.xml');
    const body = descendants(doc, 'body')[0];
    if (!body) throw new Error('DOCX 中找不到正文内容。');
    const blocks = [];
    children(body).forEach((node) => {
      if (node.localName === 'p') {
        const text = xmlText(node).trim();
        if (!text) return;
        const pPr = children(node, 'pPr')[0];
        const style = attr(descendants(pPr || node, 'pStyle')[0], 'val');
        const isList = !!children(pPr || node, 'numPr').length;
        let type = 'p';
        if (/title|标题$/i.test(style) && !/heading/i.test(style)) type = 'h1';
        if (/heading\s*1|标题\s*1/i.test(style)) type = 'h1';
        else if (/heading\s*[2-9]|标题\s*[2-9]/i.test(style)) type = 'h2';
        if (isList) type = 'li';
        if (type === 'li' && blocks.length && blocks[blocks.length - 1].type === 'list') blocks[blocks.length - 1].items.push(text);
        else blocks.push(type === 'li' ? { type: 'list', items: [text] } : { type: type, text: text });
      } else if (node.localName === 'tbl') {
        const rows = children(node, 'tr').map((tr) => children(tr, 'tc').map((tc) => descendants(tc, 'p').map(xmlText).filter(Boolean).join(' ').trim()));
        if (rows.length) blocks.push({ type: 'table', rows: rows });
      }
    });
    if (!blocks.length) blocks.push({ type: 'p', text: '这份文档没有可提取的文字内容。' });
    return { blocks: blocks.slice(0, 1500) };
  }

  async function parsePptx(zip) {
    const names = zip.names('ppt/slides/slide').filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => (+a.match(/slide(\d+)/)[1]) - (+b.match(/slide(\d+)/)[1]));
    if (!names.length) throw new Error('PPTX 中找不到幻灯片。');
    const slides = [];
    for (const name of names.slice(0, 200)) {
      const doc = await zip.xml(name), shapes = descendants(doc, 'sp');
      let title = '', bullets = [];
      shapes.forEach((sp) => {
        const ph = descendants(sp, 'ph')[0], phType = attr(ph, 'type');
        const paras = descendants(sp, 'txBody').flatMap((tx) => children(tx, 'p')).map((p) => xmlText(p).trim()).filter(Boolean);
        if (!paras.length) return;
        if (!title && (phType === 'title' || phType === 'ctrTitle')) title = paras.join(' ');
        else bullets = bullets.concat(paras);
      });
      if (!title) title = bullets.shift() || '未命名幻灯片';
      if (!bullets.length && !shapes.length) bullets = descendants(doc, 'p').map((p) => xmlText(p).trim()).filter(Boolean).slice(1);
      slides.push({ layout: 'external', kicker: 'LOCAL PRESENTATION', title: title, bullets: bullets.slice(0, 16) });
    }
    return { slides: slides };
  }

  const cellColumn = (ref) => {
    const letters = (ref.match(/^[A-Z]+/i) || ['A'])[0].toUpperCase();
    let n = 0;
    for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
    return n - 1;
  };
  async function parseXlsx(zip) {
    let shared = [];
    const sharedBytes = await zip.read('xl/sharedStrings.xml');
    if (sharedBytes) shared = descendants(parseXml(sharedBytes), 'si').map(xmlText);
    const workbook = await zip.xml('xl/workbook.xml'), rels = await relationships(zip, 'xl/workbook.xml');
    let sheets = descendants(workbook, 'sheet').map((s) => ({ name: attr(s, 'name') || 'Sheet', path: rels[attr(s, 'id')] }));
    if (!sheets.length) sheets = zip.names('xl/worksheets/sheet').filter((n) => n.endsWith('.xml')).map((n, i) => ({ name: 'Sheet' + (i + 1), path: n }));
    if (!sheets.length) throw new Error('XLSX 中找不到工作表。');
    const out = [];
    for (const sh of sheets.slice(0, 20)) {
      if (!sh.path || !zip.entries.has(sh.path)) continue;
      const doc = await zip.xml(sh.path), sheetData = descendants(doc, 'sheetData')[0];
      const rows = [];
      children(sheetData || doc.documentElement, 'row').slice(0, 500).forEach((rowNode, fallbackRow) => {
        const r = Math.min(499, Math.max(0, (+attr(rowNode, 'r') || fallbackRow + 1) - 1));
        const row = rows[r] || (rows[r] = []);
        children(rowNode, 'c').forEach((c, fallbackCol) => {
          const ref = attr(c, 'r'), col = ref ? cellColumn(ref) : fallbackCol;
          if (col > 59) return;
          const type = attr(c, 't'), vEl = children(c, 'v')[0], fEl = children(c, 'f')[0];
          let value = vEl ? vEl.textContent : '';
          if (type === 's') value = shared[+value] || '';
          else if (type === 'inlineStr') value = descendants(c, 'is').map(xmlText).join('');
          else if (type === 'b') value = value === '1' ? 'TRUE' : 'FALSE';
          else if (!type && /^-?\d+(\.\d+)?$/.test(value) && value.length < 16) value = Number(value);
          row[col] = { v: value, f: fEl ? fEl.textContent : '' };
        });
      });
      out.push({ name: sh.name, rows: Array.from({ length: rows.length }, (_, i) => rows[i] || []) });
    }
    if (!out.length) throw new Error('无法读取工作表内容。');
    return { sheets: out };
  }

  OS.miniOffice = {
    samples: SAMPLES,
    async parseFile(file) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const buffer = await file.arrayBuffer();
      const zip = new ZipPackage(buffer);
      if (!zip.entries.has('[Content_Types].xml')) throw new Error('这不是有效的 Office Open XML 文档。');
      if (ext === 'docx') return parseDocx(zip);
      if (ext === 'pptx') return parsePptx(zip);
      if (ext === 'xlsx') return parseXlsx(zip);
      throw new Error('暂不支持 .' + ext + ' 格式。');
    }
  };
})();
