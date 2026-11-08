/* WebOS · Applications —— 全部内置应用的视图与交互 */
import { OS } from './core.js';
export const appViews = OS.appViews = {};
const V = appViews;
/* 隐藏工具类应用（不在启动台展示） */
OS.apps.push({ id: 'textview', name: '文本预览', icon: 'file-text', w: 620, h: 480, hidden: true, resizable: true }, { id: 'getinfo', name: '简介', icon: 'about', w: 340, h: 380, hidden: true, resizable: false });
const TODAY = new Date();
const dateStamp = (d) => (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + OS.pad(d.getHours()) + ':' + OS.pad(d.getMinutes());
/* ============================================================
   访达 Finder
   ============================================================ */
const FAV = [
    { name: '最近使用', icon: 'clock', path: OS.fs.home },
    { name: '桌面', icon: 'folder', path: OS.fs.desktopPath },
    { name: '文稿', icon: 'folder', path: OS.fs.documentsPath },
    { name: '下载', icon: 'folder', path: OS.fs.downloadsPath },
    { name: '图片', icon: 'folder', path: OS.fs.picturesPath },
    { name: '音乐', icon: 'folder', path: ['Macintosh HD', '用户', 'andi', '音乐'] },
    { name: '应用程序', icon: 'folder', path: OS.fs.applicationsPath }
];
V.finder = {
    render(win, opts) {
        if (!win._f)
            win._f = { path: OS.fs.home.slice(), view: 'grid', hist: [], hi: 0, selected: null, query: '' };
        const f = win._f;
        if (opts.path) {
            f.path = opts.path.slice();
            f.hist = [f.path.slice()];
            f.hi = 0;
        }
        else if (!f.hist.length) {
            f.hist = [f.path.slice()];
            f.hi = 0;
        }
        if (opts.title)
            win.setTitle(opts.title);
        return '<div class="finder">' +
            '<div class="sidebar">' +
            '<div class="side-title">个人收藏</div>' +
            FAV.map((x, i) => '<div class="side-item" data-fav="' + i + '">' + OS.symbol(x.icon === 'folder' ? 'folder' : x.icon, 16) + '<span>' + x.name + '</span></div>').join('') +
            '<div class="side-sep"></div><div class="side-title">位置</div>' +
            '<div class="side-item" data-root="1">' + OS.symbol('folder', 16) + '<span>Macintosh HD</span></div>' +
            '<div class="side-sep"></div><div class="side-title">标签</div>' +
            [['#ff453a', '红色'], ['#ff9f0a', '橙色'], ['#ffd60a', '黄色'], ['#30d158', '绿色'], ['#0a84ff', '蓝色'], ['#bf5af2', '紫色']]
                .map(([c, n]) => '<div class="side-item"><i class="side-dot" style="background:' + c + '"></i><span>' + n + '</span></div>').join('') +
            '</div>' +
            '<div class="finder-main">' +
            '<div class="toolbar">' +
            '<button class="tb-icon" data-nav="back" title="后退">' + OS.symbol('chevron-left') + '</button>' +
            '<button class="tb-icon" data-nav="forward" title="前进">' + OS.symbol('chevron-right') + '</button>' +
            '<div class="sep-v"></div>' +
            '<div class="segmented" data-view><button data-v="grid" title="图标视图">' + OS.symbol('grid', 14) + '</button><button data-v="list" title="列表视图">' + OS.symbol('list', 14) + '</button></div>' +
            '<div class="grow"></div>' +
            '<button class="tb-icon" data-act="newfolder" title="新建文件夹">' + OS.symbol('plus') + '</button>' +
            '<button class="tb-icon" data-act="info" title="显示简介">' + OS.symbol('info') + '</button>' +
            '<div class="search-field">' + OS.symbol('search', 13) + '<input placeholder="搜索" class="f-search"></div>' +
            '</div>' +
            '<div class="finder-path"></div>' +
            '<div class="finder-view"></div>' +
            '<div class="statusbar"></div>' +
            '</div></div>';
    },
    mount(win) {
        const f = win._f, root = win.body;
        const view = root.querySelector('.finder-view');
        const pathBar = root.querySelector('.finder-path');
        const status = root.querySelector('.statusbar');
        const search = root.querySelector('.f-search');
        function node() { return OS.fs.get(f.path) || OS.fs.root; }
        function navigate(p, push) {
            const n = OS.fs.get(p);
            if (!n || n.type !== 'dir')
                return;
            f.path = p.slice();
            f.selected = null;
            f.query = '';
            search.value = '';
            if (push !== false) {
                f.hist = f.hist.slice(0, f.hi + 1);
                f.hist.push(p.slice());
                f.hi = f.hist.length - 1;
            }
            refresh();
        }
        function refresh() {
            const n = node(), kids = (n.children || []).filter((c) => !f.query || c.name.toLowerCase().includes(f.query.toLowerCase()));
            win.setTitle(n.name === 'andi' ? 'andi' : n.name);
            pathBar.innerHTML = f.path.map((seg, i) => '<span class="fp-crumb" data-crumb="' + i + '">' + (i ? OS.symbol('chevron-right', 11) : OS.symbol('folder', 11)) + OS.esc(seg) + '</span>').join('');
            root.querySelectorAll('[data-view] button').forEach((b) => b.classList.toggle('on', b.dataset.v === f.view));
            root.querySelectorAll('.side-item[data-fav]').forEach((b) => {
                const p = FAV[+b.dataset.fav].path;
                b.classList.toggle('on', p.join('/') === f.path.join('/'));
            });
            root.querySelector('[data-nav="back"]').classList.toggle('disabled', f.hi <= 0);
            root.querySelector('[data-nav="forward"]').classList.toggle('disabled', f.hi >= f.hist.length - 1);
            if (!kids.length) {
                view.innerHTML = '<div class="empty-state">' + OS.symbol(f.query ? 'search' : 'folder', 48) +
                    '<div>' + (f.query ? '没有找到匹配的项目' : '此文件夹为空') + '</div></div>';
            }
            else if (f.view === 'grid') {
                view.innerHTML = '<div class="file-grid">' + kids.map((c, i) => '<div class="file-item' + (f.selected === c.name ? ' on' : '') + '" data-i="' + i + '" data-name="' + OS.esc(c.name) + '">' +
                    '<div class="fi-img">' + OS.icon(c.icon || (c.type === 'dir' ? 'folder' : 'file-text')) + '</div>' +
                    '<div class="fi-name">' + OS.esc(c.name) + '</div></div>').join('') + '</div>';
            }
            else {
                view.innerHTML = '<div class="file-list"><div class="fl-head"><span>名称</span><span>修改日期</span><span>大小</span><span>种类</span></div>' +
                    kids.map((c, i) => '<div class="fl-row' + (f.selected === c.name ? ' on' : '') + '" data-i="' + i + '" data-name="' + OS.esc(c.name) + '">' +
                        '<div class="fl-name">' + OS.icon(c.icon || (c.type === 'dir' ? 'folder' : 'file-text')) + OS.esc(c.name) + '</div>' +
                        '<div class="fl-cell">' + OS.esc(c.modified || '—') + '</div>' +
                        '<div class="fl-cell">' + OS.esc(c.size || '—') + '</div>' +
                        '<div class="fl-cell">' + (c.type === 'dir' ? '文件夹' : c.type === 'app' ? '应用程序' : c.name.split('.').pop().toUpperCase() + ' 文稿') + '</div></div>').join('') + '</div>';
            }
            status.textContent = kids.length + ' 个项目 · ' + f.path.join(' / ');
        }
        function items() { const n = node(); return (n.children || []).filter((c) => !f.query || c.name.toLowerCase().includes(f.query.toLowerCase())); }
        function selectedNode() { return items().find((c) => c.name === f.selected) || null; }
        view.addEventListener('click', (e) => {
            const it = e.target.closest('[data-i]');
            if (!it) {
                f.selected = null;
                refresh();
                return;
            }
            f.selected = it.dataset.name;
            refresh();
        });
        view.addEventListener('dblclick', (e) => {
            const it = e.target.closest('[data-i]');
            if (!it)
                return;
            const c = items().find((x) => x.name === it.dataset.name);
            if (!c)
                return;
            if (c.type === 'dir')
                navigate(f.path.concat(c.name));
            else
                OS.openFile(c, f.path.concat(c.name));
        });
        view.addEventListener('contextmenu', (e) => {
            const it = e.target.closest('[data-i]');
            if (!it)
                return;
            f.selected = it.dataset.name;
            refresh();
            const c = selectedNode();
            if (!c)
                return;
            OS.contextMenu(e, [
                { label: '打开', icon: 'folder', action: () => { if (c.type === 'dir')
                        navigate(f.path.concat(c.name));
                    else
                        OS.openFile(c); } },
                { label: '显示简介', icon: 'info', action: () => OS.showInfo(c) },
                { sep: true },
                { label: '移到废纸篓', icon: 'trash', action: () => OS.toast('已移到废纸篓', c.name, 'trash') }
            ]);
        });
        pathBar.addEventListener('click', (e) => {
            const c = e.target.closest('[data-crumb]');
            if (!c)
                return;
            navigate(f.path.slice(0, +c.dataset.crumb + 1));
        });
        root.querySelectorAll('.side-item[data-fav]').forEach((b) => b.addEventListener('click', () => navigate(FAV[+b.dataset.fav].path.slice())));
        root.querySelector('[data-root]').addEventListener('click', () => navigate(['Macintosh HD']));
        root.querySelector('[data-nav="back"]').addEventListener('click', () => { if (f.hi > 0) {
            f.hi--;
            f.path = f.hist[f.hi].slice();
            refresh();
        } });
        root.querySelector('[data-nav="forward"]').addEventListener('click', () => { if (f.hi < f.hist.length - 1) {
            f.hi++;
            f.path = f.hist[f.hi].slice();
            refresh();
        } });
        root.querySelectorAll('[data-view] button').forEach((b) => b.addEventListener('click', () => { f.view = b.dataset.v; refresh(); }));
        search.addEventListener('input', () => { f.query = search.value; refresh(); });
        root.querySelector('[data-act="newfolder"]').addEventListener('click', () => {
            const n = node();
            const base = '未命名文件夹';
            let name = base, i = 2;
            while ((n.children || []).some((c) => c.name === name))
                name = base + ' ' + (i++);
            n.children.push({ name: name, type: 'dir', icon: 'folder', children: [], modified: '今天' });
            f.selected = name;
            refresh();
            OS.toast('新建文件夹', name, 'folder');
        });
        root.querySelector('[data-act="info"]').addEventListener('click', () => {
            const c = selectedNode();
            if (c)
                OS.showInfo(c);
            else
                OS.showInfo({ name: node().name, type: 'dir', icon: 'folder', size: '—' });
        });
        refresh();
    }
};
V.trash = {
    render(win) {
        return '<div class="finder"><div class="sidebar"><div class="side-title">废纸篓</div>' +
            '<div class="side-item on">' + OS.symbol('trash', 16) + '<span>废纸篓</span><span class="side-count">0</span></div></div>' +
            '<div class="finder-main"><div class="toolbar"><button class="tb-icon" data-empty>' + OS.symbol('trash') + '</button><span class="tb-label">清倒废纸篓</span></div>' +
            '<div class="finder-view"><div class="empty-state">' + OS.icon('trash') + '<div>废纸篓是空的</div><div class="subtle" style="font-size:11px">删除的项目将显示在这里</div></div></div>' +
            '<div class="statusbar">0 个项目</div></div></div>';
    },
    mount(win) {
        win.body.querySelector('.empty-state').querySelector('svg').setAttribute('width', '56');
        win.body.querySelector('.empty-state svg').setAttribute('height', '56');
        win.body.querySelector('[data-empty]').addEventListener('click', () => OS.toast('废纸篓', '已经是空的了', 'trash'));
    }
};
/* 文本预览 / 简介 */
V.textview = {
    render(win, opts) {
        win.setTitle(opts.title || '文本预览');
        const lines = String(opts.content || '（空文稿）').split('\n');
        const html = lines.map((l) => {
            if (/^[-=]{4,}$/.test(l.trim()))
                return '<hr style="border:0;border-top:1px solid var(--win-sep);margin:14px 0">';
            if (/^#\s/.test(l))
                return '<h1>' + OS.esc(l.replace(/^#\s/, '')) + '</h1>';
            if (/^##\s/.test(l))
                return '<h2>' + OS.esc(l.replace(/^##\s/, '')) + '</h2>';
            return '<div>' + (OS.esc(l) || '&nbsp;') + '</div>';
        }).join('');
        return '<div class="text-view">' + html + '</div>';
    }
};
V.getinfo = {
    render(win, opts) {
        const n = opts.node || { name: '项目', type: 'dir', icon: 'folder' };
        win.setTitle(n.name + ' 简介');
        return '<div class="getinfo"><div class="gi-icon">' + OS.icon(n.icon || 'file-text') + '</div>' +
            '<h3>' + OS.esc(n.name) + '</h3><div class="muted" style="font-size:11px">' + (n.type === 'dir' ? '文件夹' : '文稿') + '</div>' +
            '<table><tr><td>种类</td><td>' + (n.type === 'dir' ? '文件夹' : n.type === 'app' ? '应用程序' : '纯文本文稿') + '</td></tr>' +
            '<tr><td>大小</td><td>' + OS.esc(n.size || '—') + '</td></tr>' +
            '<tr><td>修改时间</td><td>' + OS.esc(n.modified || '2026年11月7日') + '</td></tr>' +
            '<tr><td>位置</td><td>/' + OS.esc(n.path || 'Macintosh HD') + '</td></tr></table></div>';
    }
};
OS.showInfo = (node) => OS.openApp('getinfo', { node: node });
/* ============================================================
   Safari 浏览器
   ============================================================ */
const SITES = {
    webos: { tag: 'WEBOS · 首页', title: '把整个桌面，装进浏览器。', desc: '一套用 HTML、CSS 与 JavaScript 从零绘制的桌面系统：毛玻璃、动态壁纸、可拖拽窗口、调度中心与十余款内置应用。', color: 'linear-gradient(135deg,#4c5fd7,#8c4fd4 55%,#e4638b)', cards: [['12', '内置应用', '访达、终端、备忘录…'], ['4', '动态壁纸', '由 SVG 实时绘制'], ['0', '外部依赖', '完全离线可用'], ['60fps', '交互动效', '拖拽、缩放、聚焦']] },
    design: { tag: 'DESIGN', title: '细节，是最重要的事。', desc: '菜单栏的毛玻璃、程序坞的放大曲线、交通灯的高光、窗口打开时的微缩放——每一处都在向 macOS 致敬。', color: 'linear-gradient(135deg,#0f766e,#22a5b8 55%,#7dd3fc)', cards: [['28px', '背景模糊', 'saturate + blur'], ['22px', '图标圆角', '连续曲率'], ['.24s', '窗口动画', '缓动曲线'], ['∞', '渐变层次', '多层叠加']] },
    docs: { tag: 'DEVELOPER', title: '一份可阅读的源码。', desc: '项目按层拆分：core 负责图标与状态，window-manager 负责窗口生命周期，apps 负责每个应用，desktop 负责桌面外壳。', color: 'linear-gradient(135deg,#1e3a8a,#3b82f6 55%,#8b5cf6)', cards: [['core.js', '图标 / 壁纸 / 文件系统', ''], ['window-manager.js', '窗口 / 拖拽 / 缩放', ''], ['apps.js', '全部内置应用', ''], ['desktop.js', '菜单栏 / Dock / 快捷键', '']] },
    weather: { tag: 'WEATHER', title: '晴朗，22°', desc: '今天适合把窗口拖来拖去。傍晚时分西部天际会出现淡淡的暖色晚霞。', color: 'linear-gradient(135deg,#0284c7,#38bdf8 55%,#fbbf24)', cards: [['22°', '当前', '晴'], ['26°', '最高', '午后'], ['17°', '最低', '夜间'], ['10%', '降水', '无雨']] },
    calendar: { tag: 'CALENDAR', title: '今天，刚刚好。', desc: '日历应用里可以看到完整的月视图，点击任意日期查看当天日程。', color: 'linear-gradient(135deg,#b91c1c,#f97316 55%,#fbbf24)', cards: [['11 月', '当前月份', ''], ['7 日', '今天', '星期六'], ['3 项', '今日日程', ''], ['5 天', '本周剩余', '']] },
    appstore: { tag: 'APP STORE', title: '发现更多可能。', desc: '这个演示版本已内置完整的应用集合；启动台里可以查看全部应用。', color: 'linear-gradient(135deg,#1d4ed8,#0ea5e9 55%,#22d3ee)', cards: [['17', '应用总数', ''], ['✦', '精选推荐', ''], ['⌘', '快捷键', 'Spotlight / 调度中心'], ['★', '本地运行', '无需联网']] }
};
const FAVS = [
    { id: 'webos', name: 'WebOS 官网', letter: 'W', color: 'linear-gradient(140deg,#5b6ee1,#a855f7)' },
    { id: 'design', name: '设计语言', letter: 'D', color: 'linear-gradient(140deg,#0d9488,#38bdf8)' },
    { id: 'docs', name: '开发文档', letter: '</>', color: 'linear-gradient(140deg,#1e40af,#6366f1)' },
    { id: 'weather', name: '天气', letter: '☀', color: 'linear-gradient(140deg,#0284c7,#fbbf24)' },
    { id: 'calendar', name: '日历', letter: '7', color: 'linear-gradient(140deg,#dc2626,#f59e0b)' },
    { id: 'appstore', name: 'App Store', letter: 'A', color: 'linear-gradient(140deg,#2563eb,#22d3ee)' }
];
V.safari = {
    render(win) {
        if (!win._s)
            win._s = { hist: ['start'], hi: 0, url: '' };
        return '<div class="safari"><div class="safari-bar">' +
            '<button class="tb-icon" data-nav="back">' + OS.symbol('chevron-left') + '</button>' +
            '<button class="tb-icon" data-nav="forward">' + OS.symbol('chevron-right') + '</button>' +
            '<div class="sep-v"></div>' +
            '<div class="safari-url">' + OS.symbol('lock', 12) + '<input class="sf-url" placeholder="搜索或输入网站名称" spellcheck="false"><span class="su-lock">' + OS.symbol('refresh', 12) + '</span></div>' +
            '<button class="tb-icon" data-nav="home" title="起始页">' + OS.symbol('home') + '</button>' +
            '<button class="tb-icon" data-nav="share" title="分享">' + OS.symbol('share') + '</button>' +
            '</div><div class="safari-page"></div></div>';
    },
    mount(win) {
        const s = win._s, root = win.body, page = root.querySelector('.safari-page'), input = root.querySelector('.sf-url');
        function go(target, push) {
            if (push !== false) {
                s.hist = s.hist.slice(0, s.hi + 1);
                s.hist.push(target);
                s.hi = s.hist.length - 1;
            }
            renderPage(target);
        }
        function renderPage(target) {
            if (target === 'start') {
                input.value = '';
                page.innerHTML = '<div class="start-page"><div class="sp-hello">个人收藏</div>' +
                    '<div class="sp-sub">下午好 · ' + OS.dateText() + '</div>' +
                    '<div class="sp-section"><h3>常用网站 <span>· ' + FAVS.length + ' 个</span></h3><div class="fav-grid">' +
                    FAVS.map((f) => '<div class="fav-card" data-site="' + f.id + '"><div class="fc-icon" style="background:' + f.color + '">' + OS.esc(f.letter) + '</div><span>' + f.name + '</span></div>').join('') +
                    '</div></div>' +
                    '<div class="sp-section"><h3>隐私报告 <span>· 过去七天</span></h3>' +
                    '<div class="card" style="padding:16px;display:flex;align-items:center;gap:16px">' + OS.symbol('lock', 26) +
                    '<div><b style="font-size:12.5px">Safari 已阻止 0 个跟踪器</b><div class="muted" style="font-size:11px;margin-top:3px">本演示不加载任何外部资源，你的浏览只发生在这台设备上。</div></div></div></div>' +
                    '<div class="sp-section"><h3>Siri 建议</h3><div style="display:flex;gap:10px;flex-wrap:wrap">' +
                    ['欢迎使用 WebOS.txt', '系统设计', '终端技巧'].map((t) => '<span class="pill">' + OS.symbol('sparkles', 12) + t + '</span>').join('') +
                    '</div></div></div>';
            }
            else if (SITES[target]) {
                const st = SITES[target];
                input.value = 'webos://' + target;
                page.innerHTML = '<div class="web-page"><div class="web-hero" style="background:' + st.color + '">' +
                    '<div class="wh-tag">' + OS.esc(st.tag) + '</div><h1>' + OS.esc(st.title) + '</h1><p>' + OS.esc(st.desc) + '</p></div>' +
                    '<div class="web-content">' + st.cards.map(([a, b, c]) => '<div class="web-card"><div class="wc-num">' + OS.esc(a) + '</div><h4>' + OS.esc(b) + '</h4><p>' + OS.esc(c || 'WebOS · 内置页面') + '</p></div>').join('') + '</div></div>';
            }
            else {
                input.value = target;
                page.innerHTML = '<div class="empty-state" style="min-height:320px">' + OS.symbol('globe', 54) +
                    '<div style="font-size:15px;font-weight:600">Safari 打不开该网页</div>' +
                    '<div>演示版本只包含内置站点，试试输入 <b>webos</b>、<b>design</b> 或 <b>docs</b>。</div>' +
                    '<button class="btn primary" data-home style="margin-top:8px">返回起始页</button></div>';
            }
            page.scrollTop = 0;
            root.querySelector('[data-nav="back"]').classList.toggle('disabled', s.hi <= 0);
            root.querySelector('[data-nav="forward"]').classList.toggle('disabled', s.hi >= s.hist.length - 1);
        }
        page.addEventListener('click', (e) => {
            const f = e.target.closest('[data-site]');
            if (f) {
                go(f.dataset.site);
                return;
            }
            if (e.target.closest('[data-home]'))
                go('start');
        });
        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter')
                return;
            let raw = input.value.trim().toLowerCase();
            if (!raw) {
                go('start');
                return;
            }
            raw = raw.replace(/^https?:\/\//, '').replace(/^webos:\/\//, '').replace(/\/$/, '');
            go(raw);
        });
        root.querySelector('[data-nav="back"]').addEventListener('click', () => { if (s.hi > 0) {
            s.hi--;
            renderPage(s.hist[s.hi]);
        } });
        root.querySelector('[data-nav="forward"]').addEventListener('click', () => { if (s.hi < s.hist.length - 1) {
            s.hi++;
            renderPage(s.hist[s.hi]);
        } });
        root.querySelector('[data-nav="home"]').addEventListener('click', () => go('start'));
        root.querySelector('[data-nav="share"]').addEventListener('click', () => OS.toast('分享', '已拷贝当前页面链接', 'safari'));
        renderPage(s.hist[s.hi]);
    }
};
/* ============================================================
   终端 Terminal
   ============================================================ */
const FORTUNES = [
    '程序必须为人阅读而写，只是顺便让机器执行。 — SICP',
    '简单留给别人，复杂留给自己。',
    '今天适合重构一个窗口管理器。',
    'Talk is cheap. Show me the code.',
    '把桌面拖到屏幕外之前，请先保存。',
    '所有的毛玻璃，都是一层 blur()。'
];
V.terminal = {
    render(win) {
        if (!win._t)
            win._t = { cwd: OS.fs.home.slice(), hist: [], hi: 0 };
        return '<div class="terminal"><div class="term-out">' +
            '<div class="term-line">Last login: ' + OS.dateText() + ' on ttys001</div>' +
            '<div class="term-line" style="margin:8px 0 2px"><span class="term-accent">WebOS Terminal</span> <span class="term-dim">· 输入 help 查看可用命令</span></div>' +
            '</div>' +
            '<div class="term-input-row"><span class="term-prompt-user">andi@WebOS</span><span class="term-dim">:</span><span class="term-prompt-path">~</span><span class="term-dim">$ </span>' +
            '<input class="term-input" spellcheck="false" autocomplete="off" aria-label="终端输入"></div></div>';
    },
    mount(win) {
        const t = win._t, root = win.body;
        const out = root.querySelector('.term-out'), input = root.querySelector('.term-input');
        const promptPath = root.querySelector('.term-prompt-path');
        function write(html, cls) {
            const d = OS.el('div', 'term-line' + (cls ? ' ' + cls : ''), html);
            out.appendChild(d);
            out.scrollTop = out.scrollHeight;
        }
        function echo(cmd) {
            write('<span class="term-prompt-user">andi@WebOS</span><span class="term-dim">:</span><span class="term-prompt-path">' + OS.esc(t.cwd.slice(2).join('/') || '~') + '</span><span class="term-dim">$ </span>' + OS.esc(cmd));
        }
        function syncPath() {
            const tail = t.cwd.slice(2);
            promptPath.textContent = tail.length ? '/' + tail.join('/') : '~';
        }
        function resolve(arg) {
            if (!arg || arg === '~')
                return OS.fs.home.slice();
            if (arg === '/')
                return ['Macintosh HD'];
            if (arg === '..')
                return t.cwd.length > 1 ? t.cwd.slice(0, -1) : t.cwd.slice();
            if (arg.startsWith('/'))
                return ['Macintosh HD'].concat(arg.split('/').filter(Boolean));
            return t.cwd.concat(arg.split('/').filter((x) => x && x !== '.'));
        }
        function run(raw) {
            const cmd = raw.trim();
            echo(cmd);
            if (!cmd)
                return;
            t.hist.push(cmd);
            t.hi = t.hist.length;
            const parts = cmd.split(/\s+/), c = parts[0].toLowerCase(), arg = parts.slice(1).join(' ');
            const node = OS.fs.get(t.cwd);
            switch (c) {
                case 'help':
                    write('<span class="term-accent">可用命令</span>');
                    [['help', '显示这份帮助'], ['ls [路径]', '列出目录内容'], ['cd <路径>', '切换目录'], ['pwd', '当前路径'],
                        ['cat <文件>', '查看文件内容'], ['open <应用>', '打开应用 (finder/terminal/notes/...)'], ['echo <文本>', '输出文本'],
                        ['date', '显示当前日期'], ['whoami', '当前用户'], ['uname -a', '系统信息'], ['neofetch', '炫酷的系统信息'],
                        ['theme dark|light', '切换外观'], ['wallpaper', '列出壁纸；wallpaper <名称> 切换'], ['fortune', '来一句'],
                        ['history', '命令历史'], ['about', '关于 WebOS'], ['clear', '清屏']].forEach(([a, b]) => write('  <span class="term-ok">' + a.padEnd(24, ' ') + '</span><span class="term-dim">' + b + '</span>'));
                    break;
                case 'ls': {
                    const n = OS.fs.get(resolve(arg)) || node;
                    if (!n || n.type !== 'dir') {
                        write('ls: 不是目录', 'term-err');
                        break;
                    }
                    const kids = n.children || [];
                    if (!kids.length)
                        write('<span class="term-dim">（空目录）</span>');
                    else
                        write(kids.map((k) => '<span style="display:inline-block;min-width:190px;color:' +
                            (k.type === 'dir' ? '#6aa9e8' : k.type === 'app' ? '#6cc576' : '#e6e6e6') + '">' +
                            OS.esc(k.name) + (k.type === 'dir' ? '/' : '') + '</span>').join(''));
                    break;
                }
                case 'cd': {
                    const p = resolve(arg), n = OS.fs.get(p);
                    if (!n)
                        write('cd: 找不到目录: ' + OS.esc(arg), 'term-err');
                    else if (n.type !== 'dir')
                        write('cd: 不是目录: ' + OS.esc(arg), 'term-err');
                    else {
                        t.cwd = p;
                        syncPath();
                    }
                    break;
                }
                case 'pwd':
                    write('/' + t.cwd.join('/'));
                    break;
                case 'cat': {
                    const n = OS.fs.get(t.cwd.concat(arg.split('/').filter(Boolean)));
                    if (!n)
                        write('cat: 找不到文件: ' + OS.esc(arg), 'term-err');
                    else if (n.type === 'dir')
                        write('cat: 这是一个目录', 'term-err');
                    else
                        write(OS.esc(n.content || '（此文件为二进制内容）'));
                    break;
                }
                case 'echo':
                    write(OS.esc(arg));
                    break;
                case 'date':
                    write(new Date().toLocaleString('zh-CN', { dateStyle: 'full', timeStyle: 'medium' }));
                    break;
                case 'whoami':
                    write('andi');
                    break;
                case 'who':
                    write('andi    ttys001    ' + OS.dateText() + '     (WebOS 桌面会话)');
                    break;
                case 'uptime': {
                    const sec = Math.max(1, Math.round((Date.now() - (OS.bootTime || Date.now())) / 1000));
                    write(' ' + OS.clockText() + ' up ' + Math.floor(sec / 60) + ' min, 1 user, load averages: 0.18 0.24 0.21');
                    break;
                }
                case 'uname':
                    write('WebOS 1.0 (Sonoma-inspired) WebKernel 6.1 x86_64 / JavaScript Engine');
                    break;
                case 'clear':
                    out.innerHTML = '';
                    break;
                case 'history':
                    t.hist.forEach((h, i) => write('  <span class="term-dim">' + String(i + 1).padStart(3) + '</span>  ' + OS.esc(h)));
                    break;
                case 'open': {
                    const id = arg.toLowerCase().replace(/\.app$/, '');
                    const map = { finder: 'finder', safari: 'safari', terminal: 'terminal', notes: 'notes', calc: 'calculator', calculator: 'calculator', settings: 'settings', calendar: 'calendar', photos: 'photos', music: 'music', about: 'about', trash: 'trash', mail: 'mail', messages: 'messages' };
                    const app = map[id] || OS.apps.find((a) => a.en.toLowerCase() === id || a.id === id);
                    if (app) {
                        OS.openApp(typeof app === 'string' ? app : app.id);
                        write('<span class="term-ok">已打开 ' + OS.esc(arg) + '</span>');
                    }
                    else
                        write('open: 未找到应用 ' + OS.esc(arg) + '（试试 open notes）', 'term-err');
                    break;
                }
                case 'theme': {
                    const v = arg === 'light' || arg === '浅色' ? 'light' : 'dark';
                    OS.setTheme(v);
                    write('<span class="term-ok">外观已切换为 ' + (v === 'light' ? '浅色' : '深色') + '</span>');
                    break;
                }
                case 'wallpaper': {
                    if (!arg) {
                        write(Object.keys(OS.wallpapers).map((k) => k + ' (' + OS.wallpapers[k].name + ')').join('\n'));
                        break;
                    }
                    if (OS.wallpapers[arg]) {
                        OS.setWallpaper(arg);
                        write('<span class="term-ok">壁纸已更换：' + OS.wallpapers[arg].name + '</span>');
                    }
                    else
                        write('wallpaper: 可用值 ' + Object.keys(OS.wallpapers).join(', '), 'term-err');
                    break;
                }
                case 'fortune':
                    write('<span class="term-accent">' + OS.esc(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]) + '</span>');
                    break;
                case 'neofetch':
                    write('<span class="term-accent">        ╭──────────╮        </span>  <span class="term-ok">andi@WebOS</span>');
                    write('<span class="term-accent">      ╭─╯  ◉    ◉  ╰─╮      </span>  <span class="term-dim">──────────────────</span>');
                    write('<span class="term-accent">     │     ▂▂▂▂     │       </span>  OS: WebOS 1.0 (Browser)');
                    write('<span class="term-accent">     │   ╰──────╯   │       </span>  Shell: websh 1.0');
                    write('<span class="term-accent">      ╰────────────╯        </span>  DE: Glass Aqua');
                    write('<span class="term-accent">        ▁▁▁▁▁▁▁▁▁▁         </span>  Resolution: ' + window.innerWidth + 'x' + window.innerHeight);
                    write('<span class="term-dim">                             </span>  Theme: ' + OS.state.theme + ' / ' + OS.state.wallpaper);
                    write('<span class="term-dim">                             </span>  Apps: ' + OS.apps.length + '  Windows: ' + OS.wm.windows.length);
                    write('<span style="display:inline-block;margin-top:6px">  ' + ['#ff5f57', '#febc2e', '#28c840', '#0a84ff', '#bf5af2', '#ff375f', '#30d158', '#ff9f0a']
                        .map((x) => '<i style="display:inline-block;width:16px;height:9px;background:' + x + '"></i>').join('') + '</span>');
                    break;
                case 'about':
                    write('WebOS 1.0 — 一个用原生 HTML/CSS/JS 构建的 macOS 风格桌面演示。\n所有图标与壁纸均由 SVG 实时绘制，无任何外部依赖。');
                    break;
                case 'sudo':
                    write('andi 不在 sudoers 文件中。此事将被报告。 😌', 'term-err');
                    break;
                case 'exit':
                    write('使用 ⌘W 关闭窗口，或点击左上角红色按钮。');
                    break;
                case 'man':
                    write('没有 ' + OS.esc(arg || '该命令') + ' 的手册页。试试 help。', 'term-dim');
                    break;
                default: write('websh: command not found: ' + OS.esc(c) + '（输入 help 查看命令）', 'term-err');
            }
            out.scrollTop = out.scrollHeight;
        }
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const v = input.value;
                input.value = '';
                run(v);
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (t.hi > 0) {
                    t.hi--;
                    input.value = t.hist[t.hi] || '';
                }
            }
            else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (t.hi < t.hist.length) {
                    t.hi++;
                    input.value = t.hist[t.hi] || '';
                }
            }
            else if (e.key === 'l' && OS.isCmd(e)) {
                e.preventDefault();
                out.innerHTML = '';
            }
        });
        root.addEventListener('click', (e) => { if (!e.target.closest('input'))
            input.focus(); });
        syncPath();
        setTimeout(() => input.focus(), 60);
    }
};
/* ============================================================
   备忘录 Notes
   ============================================================ */
const DEFAULT_NOTES = [
    { id: 'n1', title: '欢迎使用 WebOS 👋', body: '这是一台运行在浏览器里的 Mac。\n\n· 拖动标题栏移动窗口\n· 拖拽窗口边缘改变大小\n· Command/Ctrl + 空格 打开聚焦搜索\n· F3 进入调度中心\n· 点击右上角时间查看通知中心\n\n备忘录内容会自动保存在本地。', updated: Date.now() - 3600000 },
    { id: 'n2', title: '周末计划', body: '周六\n  · 整理桌面文件夹\n  · 换一张壁纸\n  · 用终端敲一遍 neofetch\n\n周日\n  · 什么都不做，晒太阳', updated: Date.now() - 86400000 * 2 },
    { id: 'n3', title: '设计笔记', body: '毛玻璃的三要素：\n  1. 半透明底色\n  2. backdrop-filter: blur() + saturate()\n  3. 一圈极细的高光描边\n\n图标统一使用 100×100 viewBox，圆角 22，投影交给 CSS。', updated: Date.now() - 86400000 * 5 }
];
V.notes = {
    render(win) {
        if (!OS.state.notes) {
            OS.state.notes = DEFAULT_NOTES;
            OS.store.set('notes', OS.state.notes);
        }
        if (!win._n)
            win._n = { id: OS.state.notes[0].id, filter: '' };
        return '<div class="notes"><div class="sidebar notes-folders">' +
            '<div class="side-title">iCloud</div>' +
            '<div class="side-item on" data-folder="all">' + OS.symbol('bubble', 16) + '<span>全部备忘录</span><span class="side-count">' + OS.state.notes.length + '</span></div>' +
            '<div class="side-item" data-folder="recent">' + OS.symbol('clock', 16) + '<span>最近编辑</span></div>' +
            '<div class="side-sep"></div><div class="side-title">文件夹</div>' +
            '<div class="side-item" data-folder="work">' + OS.symbol('folder', 16) + '<span>工作</span></div>' +
            '<div class="side-item" data-folder="life">' + OS.symbol('folder', 16) + '<span>生活</span></div>' +
            '</div>' +
            '<div class="notes-list"><div class="nl-head"><span>备忘录</span><button class="tb-icon" data-new title="新建备忘录">' + OS.symbol('pen', 15) + '</button></div><div class="nl-items"></div></div>' +
            '<div class="notes-editor"><div class="ne-date"></div><input class="ne-title" placeholder="标题"><textarea class="ne-body" placeholder="开始写点什么…" spellcheck="false"></textarea></div>' +
            '</div>';
    },
    mount(win) {
        const n = win._n, root = win.body;
        const list = root.querySelector('.nl-items'), title = root.querySelector('.ne-title'), body = root.querySelector('.ne-body'), dateEl = root.querySelector('.ne-date');
        const notes = () => OS.state.notes;
        function current() { return notes().find((x) => x.id === n.id) || null; }
        function renderList() {
            list.innerHTML = notes().map((x) => '<div class="nl-item' + (x.id === n.id ? ' on' : '') + '" data-id="' + x.id + '"><b>' + OS.esc(x.title || '新备忘录') + '</b>' +
                '<p>' + OS.esc(dateStamp(new Date(x.updated))) + ' · ' + OS.esc((x.body || '').split('\n').filter(Boolean)[0] || '无附加文本') + '</p></div>').join('');
            root.querySelector('.side-count').textContent = String(notes().length);
        }
        function renderEditor() {
            const c = current();
            if (!c) {
                title.value = '';
                body.value = '';
                dateEl.textContent = '';
                return;
            }
            title.value = c.title;
            body.value = c.body;
            dateEl.textContent = dateStamp(new Date(c.updated));
        }
        let timer;
        function changed() {
            const c = current();
            if (!c)
                return;
            c.title = title.value;
            c.body = body.value;
            c.updated = Date.now();
            clearTimeout(timer);
            timer = setTimeout(() => { OS.store.set('notes', notes()); renderList(); dateEl.textContent = dateStamp(new Date(c.updated)); }, 260);
        }
        list.addEventListener('click', (e) => {
            const it = e.target.closest('[data-id]');
            if (!it)
                return;
            n.id = it.dataset.id;
            renderList();
            renderEditor();
        });
        title.addEventListener('input', changed);
        body.addEventListener('input', changed);
        root.querySelector('[data-new]').addEventListener('click', () => {
            const x = { id: OS.uid('note'), title: '', body: '', updated: Date.now() };
            notes().unshift(x);
            n.id = x.id;
            OS.store.set('notes', notes());
            renderList();
            renderEditor();
            title.focus();
        });
        win.setTools('<button class="tb-btn" data-del title="删除备忘录">' + OS.symbol('trash', 15) + '</button>');
        win.toolsEl.querySelector('[data-del]').addEventListener('click', () => {
            const i = notes().findIndex((x) => x.id === n.id);
            if (i < 0)
                return;
            const removed = notes().splice(i, 1)[0];
            if (!notes().length)
                notes().push({ id: OS.uid('note'), title: '新备忘录', body: '', updated: Date.now() });
            n.id = notes()[0].id;
            OS.store.set('notes', notes());
            renderList();
            renderEditor();
            OS.toast('备忘录已删除', removed.title || '新备忘录', 'notes');
        });
        root.querySelectorAll('[data-folder]').forEach((b) => b.addEventListener('click', () => {
            root.querySelectorAll('[data-folder]').forEach((x) => x.classList.toggle('on', x === b));
            renderEditor();
        }));
        renderList();
        renderEditor();
    }
};
/* ============================================================
   计算器 Calculator
   ============================================================ */
V.calculator = {
    render(win) {
        if (!win._c)
            win._c = { display: '0', acc: null, op: null, fresh: true, expr: '' };
        const keys = [
            ['AC', 'fn'], ['+/-', 'fn'], ['%', 'fn'], ['÷', 'op'],
            ['7', ''], ['8', ''], ['9', ''], ['×', 'op'],
            ['4', ''], ['5', ''], ['6', ''], ['−', 'op'],
            ['1', ''], ['2', ''], ['3', ''], ['+', 'op'],
            ['0', 'zero'], ['.', ''], ['=', 'op']
        ];
        return '<div class="calculator"><div class="calc-display"><div class="calc-expr"></div><div class="calc-value">0</div></div>' +
            '<div class="calc-keys">' + keys.map(([k, cls]) => '<button class="' + cls + '" data-k="' + k + '">' + k + '</button>').join('') + '</div></div>';
    },
    mount(win) {
        const c = win._c, root = win.body;
        const disp = root.querySelector('.calc-value'), expr = root.querySelector('.calc-expr');
        const fmt = (v) => {
            if (!isFinite(v))
                return '错误';
            const s = Number(v.toPrecision(12)).toString();
            if (s.length > 12 && Math.abs(v) >= 1)
                return v.toExponential(5);
            return s;
        };
        function show() {
            disp.textContent = c.display;
            disp.style.fontSize = c.display.length > 9 ? '30px' : c.display.length > 6 ? '38px' : '46px';
            expr.textContent = c.expr;
            root.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('sel', b.dataset.k === c.op));
        }
        function calculate(a, b, op) {
            if (op === '+')
                return a + b;
            if (op === '−')
                return a - b;
            if (op === '×')
                return a * b;
            if (op === '÷')
                return b === 0 ? NaN : a / b;
            return b;
        }
        function press(k) {
            if (/^[0-9]$/.test(k)) {
                c.display = (c.fresh || c.display === '0') ? k : (c.display.length < 14 ? c.display + k : c.display);
                c.fresh = false;
            }
            else if (k === '.') {
                if (c.fresh) {
                    c.display = '0.';
                    c.fresh = false;
                }
                else if (!c.display.includes('.'))
                    c.display += '.';
            }
            else if (k === 'AC') {
                c.display = '0';
                c.acc = null;
                c.op = null;
                c.expr = '';
                c.fresh = true;
            }
            else if (k === '+/-') {
                c.display = c.display.startsWith('-') ? c.display.slice(1) : (c.display === '0' ? '0' : '-' + c.display);
            }
            else if (k === '%') {
                c.display = fmt(parseFloat(c.display) / 100);
                c.fresh = true;
            }
            else if (['+', '−', '×', '÷'].includes(k)) {
                const cur = parseFloat(c.display);
                if (c.op && !c.fresh) {
                    const r = calculate(c.acc, cur, c.op);
                    c.display = fmt(r);
                    c.acc = r;
                }
                else
                    c.acc = cur;
                c.op = k;
                c.expr = fmt(c.acc) + ' ' + k;
                c.fresh = true;
            }
            else if (k === '=') {
                const cur = parseFloat(c.display);
                if (c.op && c.acc != null) {
                    const r = calculate(c.acc, cur, c.op);
                    c.expr = fmt(c.acc) + ' ' + c.op + ' ' + fmt(cur) + ' =';
                    c.display = fmt(r);
                }
                c.acc = null;
                c.op = null;
                c.fresh = true;
            }
            show();
        }
        root.querySelector('.calc-keys').addEventListener('click', (e) => {
            const b = e.target.closest('[data-k]');
            if (!b)
                return;
            press(b.dataset.k);
            b.classList.add('pressed');
            setTimeout(() => b.classList.remove('pressed'), 110);
        });
        const KEYMAP = { '/': '÷', '*': '×', '-': '−', '+': '+', 'Enter': '=', '=': '=', 'Escape': 'AC', 'c': 'AC', 'Backspace': 'AC', '%': '%', '.': '.' };
        window.addEventListener('keydown', (e) => {
            if (OS.wm.active() !== win || !document.body.contains(win.el))
                return;
            if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))
                return;
            let k = KEYMAP[e.key] || (/^[0-9]$/.test(e.key) ? e.key : null);
            if (!k)
                return;
            e.preventDefault();
            press(k);
            const b = root.querySelector('[data-k="' + k + '"]');
            if (b) {
                b.classList.add('pressed');
                setTimeout(() => b.classList.remove('pressed'), 110);
            }
        });
        show();
    }
};
/* ============================================================
   日历 Calendar
   ============================================================ */
const EV_BASE = [
    { time: '09:30', title: '晨间同步', dur: '30 分钟' },
    { time: '14:00', title: '设计评审', dur: '1 小时' },
    { time: '19:30', title: '散步 · 河边', dur: '自由' }
];
const EV_OFFSETS = [-12, -5, -1, 0, 0, 0, 2, 4, 9, 15, 21, 27];
V.calendar = {
    render(win) {
        if (!win._cal) {
            const ev = {};
            EV_OFFSETS.forEach((off, i) => {
                const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + off);
                const k = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
                (ev[k] || (ev[k] = [])).push(Object.assign({ id: OS.uid('ev') }, EV_BASE[i % EV_BASE.length], { off: off }));
            });
            win._cal = { year: TODAY.getFullYear(), month: TODAY.getMonth(), selected: new Date(TODAY), events: ev };
        }
        return '<div class="calendar"><div class="cal-toolbar">' +
            '<h2 class="cal-title"></h2>' +
            '<button class="btn" data-today>今天</button>' +
            '<div class="grow"></div>' +
            '<button class="tb-icon" data-step="-1">' + OS.symbol('chevron-left') + '</button>' +
            '<button class="tb-icon" data-step="1">' + OS.symbol('chevron-right') + '</button>' +
            '<button class="btn primary" data-add>+ 新建日程</button>' +
            '</div><div style="display:flex;flex:1;min-height:0">' +
            '<div style="flex:1;display:flex;flex-direction:column;min-width:0">' +
            '<div class="cal-weekdays">' + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((w) => '<span>' + w + '</span>').join('') + '</div>' +
            '<div class="cal-grid7"></div></div>' +
            '<div class="cal-side"></div></div></div>';
    },
    mount(win) {
        const c = win._cal, root = win.body;
        const title = root.querySelector('.cal-title'), grid = root.querySelector('.cal-grid7'), side = root.querySelector('.cal-side');
        const key = (d) => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
        const evOf = (d) => c.events[key(d)] || [];
        function refresh() {
            title.textContent = c.year + '年 ' + (c.month + 1) + '月';
            const first = new Date(c.year, c.month, 1), start = new Date(c.year, c.month, 1 - first.getDay());
            let html = '';
            for (let i = 0; i < 42; i++) {
                const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
                const dim = d.getMonth() !== c.month;
                const isToday = key(d) === key(TODAY);
                const sel = key(d) === key(c.selected);
                const evs = evOf(d);
                html += '<div class="cal-cell' + (dim ? ' dim' : '') + (isToday ? ' today' : '') + (sel ? ' selected' : '') + '" data-date="' + key(d) + '">' +
                    '<span class="cc-num">' + d.getDate() + '</span>' +
                    evs.slice(0, 2).map((e) => '<div class="cc-event">' + OS.esc(e.time + ' ' + e.title) + '</div>').join('') +
                    (evs.length > 2 ? '<div class="cc-event">+' + (evs.length - 2) + ' 项</div>' : '') + '</div>';
            }
            grid.innerHTML = html;
            const d = c.selected;
            side.innerHTML = '<h4>' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + OS.weekCN[d.getDay()] + '</h4>' +
                (evOf(d).length ? evOf(d).map((e) => '<div class="cal-ev"><b>' + OS.esc(e.title) + '</b><span>' + OS.esc(e.time) + ' · ' + OS.esc(e.dur) + '</span></div>').join('')
                    : '<div class="muted" style="font-size:11px;line-height:1.6">这一天没有安排。<br>留点空白也很好。</div>');
        }
        grid.addEventListener('click', (e) => {
            const cell = e.target.closest('[data-date]');
            if (!cell)
                return;
            const [y, m, d] = cell.dataset.date.split('-').map(Number);
            c.selected = new Date(y, m, d);
            if (m !== c.month || y !== c.year) {
                c.year = y;
                c.month = m;
            }
            refresh();
        });
        root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
            const nd = new Date(c.year, c.month + (+b.dataset.step), 1);
            c.year = nd.getFullYear();
            c.month = nd.getMonth();
            refresh();
        }));
        root.querySelector('[data-today]').addEventListener('click', () => {
            c.year = TODAY.getFullYear();
            c.month = TODAY.getMonth();
            c.selected = new Date(TODAY);
            refresh();
        });
        root.querySelector('[data-add]').addEventListener('click', () => {
            const scrim = OS.el('div', 'modal-scrim', '<div class="modal-card"><h3>新建日程</h3><p>为选中的日期添加一条安排</p>' +
                '<input class="btn" style="width:100%;height:32px;text-align:left;background:var(--field-bg);cursor:text" placeholder="日程标题" maxlength="30">' +
                '<div class="modal-actions" style="margin-top:14px"><button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>添加</button></div></div>');
            win.body.appendChild(scrim);
            const input = scrim.querySelector('input');
            input.focus();
            const close = () => scrim.remove();
            scrim.querySelector('[data-cancel]').addEventListener('click', close);
            scrim.addEventListener('click', (e) => { if (e.target === scrim)
                close(); });
            const add = () => {
                const v = input.value.trim();
                if (!v) {
                    close();
                    return;
                }
                (c.events[key(c.selected)] || (c.events[key(c.selected)] = [])).push({ id: OS.uid('ev'), time: '待定', title: v, dur: '自定义' });
                close();
                refresh();
                OS.toast('日程已添加', v, 'calendar');
            };
            scrim.querySelector('[data-ok]').addEventListener('click', add);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter')
                add(); if (e.key === 'Escape')
                close(); });
        });
        refresh();
    }
};
/* ============================================================
   照片 Photos（图形由 SVG 实时生成）
   ============================================================ */
const PHOTO_PALETTES = [
    ['#1e2a5a', '#6f5ac4', '#ffb28a'], ['#08324a', '#1282a3', '#f6d58a'], ['#3b1a4a', '#c04d7a', '#ffbf86'],
    ['#0d3b35', '#2f8f76', '#e4f0b0'], ['#2a2350', '#6845a8', '#f189b0'], ['#3d2617', '#b16a3c', '#f4cf8e'],
    ['#101d3d', '#3a5fa8', '#a9d7f5'], ['#4a1430', '#a83a5f', '#ffc09a'], ['#12303c', '#2a7c8c', '#c8e7d8'],
    ['#2d2050', '#7b52b8', '#ffd0a0'], ['#3a2a1c', '#96734b', '#e9d3a6'], ['#0a2638', '#1d6c8c', '#8fd4d2']
];
OS.photoSVG = (i, prefix) => {
    const p = (prefix || 'ph') + (++phSeq);
    const pal = PHOTO_PALETTES[i % PHOTO_PALETTES.length];
    const sunX = 90 + (i * 67) % 230, sunY = 70 + (i * 31) % 40;
    const h1 = 150 + (i * 23) % 55, h2 = 185 + (i * 17) % 45;
    return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="' + p + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + pal[0] + '"/><stop offset=".62" stop-color="' + pal[1] + '"/><stop offset="1" stop-color="' + pal[2] + '"/></linearGradient>' +
        '<radialGradient id="' + p + 'b"><stop offset="0" stop-color="' + pal[2] + '" stop-opacity=".95"/><stop offset="1" stop-color="' + pal[2] + '" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="400" height="300" fill="url(#' + p + 'a)"/>' +
        '<circle cx="' + sunX + '" cy="' + sunY + '" r="76" fill="url(#' + p + 'b)"/>' +
        '<circle cx="' + sunX + '" cy="' + sunY + '" r="20" fill="' + pal[2] + '" opacity=".85"/>' +
        '<path d="M0 ' + h1 + 'L70 ' + (h1 - 45) + 'l55 30 60 -60 75 55 60 -35 80 45v115H0Z" fill="' + pal[0] + '" opacity=".58"/>' +
        '<path d="M0 ' + h2 + 'L80 ' + (h2 - 30) + 'l60 22 70 -38 80 40 60 -20 50 26v100H0Z" fill="' + pal[0] + '" opacity=".82"/>' +
        '<path d="M0 ' + (h2 + 32) + 'h400" stroke="' + pal[2] + '" stroke-width="1.5" opacity=".3"/>' +
        '<path d="M0 ' + (h2 + 52) + 'h400M0 ' + (h2 + 74) + 'h400" stroke="' + pal[2] + '" stroke-width="1" opacity=".16"/>' +
        '<path d="M' + (sunX - 40) + ' 300q40 -60 80 0" fill="' + pal[0] + '" opacity=".5"/></svg>';
};
let phSeq = 0;
const PHOTO_CAPTIONS = ['晨曦', '海岸线', '城市夜色', '山间雾气', '秋日午后', '静谧湖面', '蓝色时刻', '晚霞', '远山', '暮色', '沙丘', '归途'];
V.photos = {
    render(win) {
        if (!win._p)
            win._p = { album: 'all', lightbox: -1 };
        return '<div class="photos"><div class="sidebar">' +
            '<div class="side-title">图库</div>' +
            [['all', '图库', 'photo'], ['recent', '最近项目', 'clock'], ['fav', '个人收藏', 'heart'], ['memories', '回忆', 'sparkles']]
                .map(([k, n, i]) => '<div class="side-item' + (k === 'all' ? ' on' : '') + '" data-album="' + k + '">' + OS.symbol(String(i), 16) + '<span>' + n + '</span></div>').join('') +
            '<div class="side-sep"></div><div class="side-title">相簿</div>' +
            [['旅行 2026', 'folder'], ['随手拍', 'folder'], ['壁纸素材', 'folder']]
                .map(([n, i]) => '<div class="side-item">' + OS.symbol(String(i), 16) + '<span>' + n + '</span></div>').join('') +
            '</div><div class="photos-main"><div class="toolbar">' +
            '<span class="tb-label" style="font-size:13px;font-weight:600;color:var(--win-text)">图库</span>' +
            '<div class="grow"></div><span class="tb-label">12 张照片</span>' +
            '<button class="tb-icon" data-slide title="幻灯片">' + OS.symbol('play', 15) + '</button>' +
            '</div><div class="photo-grid"></div></div></div>';
    },
    mount(win) {
        const p = win._p, root = win.body, grid = root.querySelector('.photo-grid');
        function draw() {
            let ids = Array.from({ length: 12 }, (_, i) => i);
            if (p.album === 'recent')
                ids = [0, 1, 2, 3, 4, 5];
            if (p.album === 'fav')
                ids = [2, 5, 8, 10];
            if (p.album === 'memories')
                ids = [1, 4, 7, 9, 11];
            grid.innerHTML = ids.map((i) => '<div class="photo-tile" data-i="' + i + '">' + OS.photoSVG(i) +
                '<span class="pt-label">' + PHOTO_CAPTIONS[i] + '</span></div>').join('');
        }
        function openLB(i) {
            p.lightbox = i;
            const lb = OS.el('div', 'lightbox', '<button class="lb-close">×</button><div class="lb-img" id="lbimg"></div>' +
                '<div class="lb-cap"><span class="lb-title"></span> · <span class="muted">' + (i + 1) + ' / 12</span></div>' +
                '<div style="display:flex;gap:14px"><button class="btn" data-prev>' + OS.symbol('chevron-left', 14) + '</button>' +
                '<button class="btn" data-next>' + OS.symbol('chevron-right', 14) + '</button></div>');
            win.body.appendChild(lb);
            const upd = () => {
                lb.querySelector('#lbimg').innerHTML = OS.photoSVG(p.lightbox);
                lb.querySelector('.lb-title').textContent = PHOTO_CAPTIONS[p.lightbox];
                lb.querySelector('.lb-cap .muted').textContent = (p.lightbox + 1) + ' / 12';
            };
            upd();
            const step = (d) => { p.lightbox = (p.lightbox + d + 12) % 12; upd(); };
            lb.querySelector('[data-prev]').addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
            lb.querySelector('[data-next]').addEventListener('click', (e) => { e.stopPropagation(); step(1); });
            lb.querySelector('.lb-close').addEventListener('click', () => lb.remove());
            lb.addEventListener('click', (e) => { if (e.target === lb)
                lb.remove(); });
            lb._step = step;
        }
        grid.addEventListener('click', (e) => {
            const t = e.target.closest('[data-i]');
            if (t)
                openLB(+t.dataset.i);
        });
        root.querySelectorAll('[data-album]').forEach((b) => b.addEventListener('click', () => {
            root.querySelectorAll('[data-album]').forEach((x) => x.classList.toggle('on', x === b));
            p.album = b.dataset.album;
            draw();
        }));
        root.querySelector('[data-slide]').addEventListener('click', () => openLB(0));
        win._photoOpen = openLB;
        draw();
        if (win.opts && typeof win.opts.photo === 'number')
            openLB(win.opts.photo);
    }
};
/* ============================================================
   音乐 Music（模拟播放）
   ============================================================ */
const TRACKS = [
    ['Midnight Drive', 'WebOS Studio', '3:42'], ['Paper Planes', 'The Glass Hours', '4:08'],
    ['Blue Hour', 'Norther', '3:16'], ['Sunset Boulevard', 'Aqua', '5:02'],
    ['Quiet Rain', 'Lo-Fi Collective', '2:58'], ['Neon Harbor', 'WebOS Studio', '3:34'],
    ['First Light', 'Norther', '4:21'], ['Slow Motion', 'The Glass Hours', '3:07']
];
V.music = {
    render(win) {
        if (!win._m)
            win._m = { idx: 0, playing: false, elapsed: 0, shuffle: false, repeat: false };
        return '<div class="music"><div class="sidebar">' +
            '<div class="side-title">资料库</div>' +
            [['最近添加', 'clock'], ['艺人', 'music'], ['专辑', 'grid'], ['歌曲', 'music']].map(([n, i], k) => '<div class="side-item' + (k === 0 ? ' on' : '') + '">' + OS.symbol(String(i), 16) + '<span>' + n + '</span></div>').join('') +
            '<div class="side-sep"></div><div class="side-title">播放列表</div>' +
            [['深夜电台', 'heart'], ['放松时刻', 'sparkles'], ['工作日', 'sun']].map(([n, i]) => '<div class="side-item">' + OS.symbol(String(i), 16) + '<span>' + n + '</span></div>').join('') +
            '</div>' +
            '<div style="flex:1;display:flex;flex-direction:column;min-width:0">' +
            '<div class="music-main"><div class="music-hero"><div class="music-cover"><span>Chill<br>Mix</span></div>' +
            '<div class="music-meta"><div class="mm-tag">播放列表 · WebOS Studio</div><h1>深夜电台</h1>' +
            '<p>8 首歌曲 · 约 30 分钟 · 由代码生成的静音演示</p>' +
            '<button class="btn primary" data-playall>' + OS.symbol('play', 13) + ' 播放全部</button></div></div>' +
            '<div class="track-list"></div></div>' +
            '<div class="music-player"><div class="mp-now"><div class="mp-art"></div><div style="min-width:0"><b class="mp-title"></b><span class="mp-artist"></span></div></div>' +
            '<div class="mp-controls"><button data-ctrl="prev">' + OS.symbol('prev', 16) + '</button>' +
            '<button class="play" data-ctrl="play">' + OS.symbol('play', 16) + '</button>' +
            '<button data-ctrl="next">' + OS.symbol('next', 16) + '</button></div>' +
            '<div class="mp-progress"><span class="mp-cur">0:00</span><input type="range" min="0" max="100" value="0" class="mp-seek"><span class="mp-total">3:42</span></div>' +
            '<div class="mp-extra"><div class="mp-wave">' + Array.from({ length: 9 }, () => '<i></i>').join('') + '</div>' + OS.symbol('volume', 15) +
            '<input type="range" min="0" max="100" value="' + OS.state.volume + '" class="mp-vol" style="width:64px"></div></div></div></div>';
    },
    mount(win) {
        const m = win._m, root = win.body;
        const list = root.querySelector('.track-list'), playBtn = root.querySelector('[data-ctrl="play"]');
        const seek = root.querySelector('.mp-seek'), cur = root.querySelector('.mp-cur'), total = root.querySelector('.mp-total');
        const dur = (i) => { const [a, b] = TRACKS[i][2].split(':').map(Number); return a * 60 + b; };
        const fmt = (s) => Math.floor(s / 60) + ':' + OS.pad(Math.floor(s % 60));
        function refresh() {
            list.innerHTML = TRACKS.map((t, i) => '<div class="track-row' + (i === m.idx ? ' on' : '') + '" data-i="' + i + '">' +
                '<span class="tr-num">' + (i === m.idx && m.playing ? '♪' : i + 1) + '</span>' +
                '<span class="tr-name">' + OS.esc(t[0]) + '</span><span class="tr-dur">' + t[2] + '</span>' +
                '<span class="tr-dur">' + OS.symbol('heart', 13) + '</span></div>').join('');
            root.querySelector('.mp-title').textContent = TRACKS[m.idx][0];
            root.querySelector('.mp-artist').textContent = TRACKS[m.idx][1];
            total.textContent = TRACKS[m.idx][2];
            cur.textContent = fmt(m.elapsed);
            seek.value = Math.round(m.elapsed / dur(m.idx) * 100);
            playBtn.innerHTML = OS.symbol(m.playing ? 'pause' : 'play', 16);
            root.querySelector('.mp-wave').classList.toggle('playing', m.playing);
        }
        function select(i, autoplay) {
            m.idx = (i + TRACKS.length) % TRACKS.length;
            m.elapsed = 0;
            if (autoplay)
                m.playing = true;
            refresh();
        }
        function toggle() { m.playing = !m.playing; refresh(); }
        list.addEventListener('click', (e) => {
            const r = e.target.closest('[data-i]');
            if (!r)
                return;
            const i = +r.dataset.i;
            if (i === m.idx)
                toggle();
            else
                select(i, true);
        });
        playBtn.addEventListener('click', toggle);
        root.querySelector('[data-ctrl="prev"]').addEventListener('click', () => select(m.idx - 1, m.playing));
        root.querySelector('[data-ctrl="next"]').addEventListener('click', () => select(m.idx + 1, m.playing));
        root.querySelector('[data-playall]').addEventListener('click', () => { select(0, true); OS.toast('正在播放', '深夜电台 · 8 首歌曲', 'music'); });
        seek.addEventListener('input', () => { m.elapsed = (+seek.value / 100) * dur(m.idx); cur.textContent = fmt(m.elapsed); });
        root.querySelector('.mp-vol').addEventListener('input', (e) => OS.save('volume', +e.target.value));
        const timer = setInterval(() => {
            if (!document.body.contains(win.el)) {
                clearInterval(timer);
                return;
            }
            if (!m.playing)
                return;
            m.elapsed += .25;
            if (m.elapsed >= dur(m.idx)) {
                if (m.repeat)
                    m.elapsed = 0;
                else
                    select(m.shuffle ? Math.floor(Math.random() * TRACKS.length) : m.idx + 1, true);
                return;
            }
            cur.textContent = fmt(m.elapsed);
            seek.value = Math.round(m.elapsed / dur(m.idx) * 100);
        }, 250);
        refresh();
    }
};
/* ============================================================
   系统设置 Settings
   ============================================================ */
const ACCENTS = ['auto', '#0a84ff', '#bf5af2', '#ff375f', '#ff9f0a', '#30d158', '#64d2ff'];
const SECTIONS = [
    { id: 'appearance', name: '外观', icon: 'palette' },
    { id: 'wallpaper', name: '墙纸', icon: 'photo' },
    { id: 'dock', name: '程序坞与菜单栏', icon: 'dock' },
    { id: 'general', name: '通用', icon: 'gear' },
    { id: 'about', name: '关于本机', icon: 'info' }
];
V.settings = {
    render(win) {
        if (!win._set)
            win._set = { section: 'appearance' };
        return '<div class="settings"><div class="sidebar settings-side">' +
            '<div class="ss-user"><div class="ss-avatar">A</div><div><b>andi</b><span>Apple 账户 · 本地</span></div></div>' +
            SECTIONS.map((s) => '<div class="side-item" data-sec="' + s.id + '">' + OS.symbol(s.icon, 16) + '<span>' + s.name + '</span></div>').join('') +
            '</div><div class="settings-content"></div></div>';
    },
    mount(win) {
        const st = win._set, root = win.body, content = root.querySelector('.settings-content');
        function draw() {
            root.querySelectorAll('[data-sec]').forEach((b) => b.classList.toggle('on', b.dataset.sec === st.section));
            const s = SECTIONS.find((x) => x.id === st.section);
            content.innerHTML = '<h2>' + s.name + '</h2><div class="sc-sub">更改会立即生效，并保存在这台设备上。</div>' + body();
            bind();
        }
        function body() {
            if (st.section === 'appearance') {
                return '<div class="settings-section"><h3>外观</h3><div class="appearance-options">' +
                    [['light', '浅色', ''], ['dark', '深色', 'dark'], ['auto', '自动', 'auto']].map(([k, n, cls]) => '<div class="appearance-opt ' + cls + (OS.state.theme === k ? ' on' : '') + '" data-theme="' + k + '">' +
                        '<div class="ap-preview"><div class="ap-bar"></div><div class="ap-body"></div></div><div style="margin-top:7px">' + n + '</div></div>').join('') +
                    '</div></div>' +
                    '<div class="settings-section"><h3>强调色</h3><div class="accent-dots">' +
                    ACCENTS.map((c) => '<i data-accent="' + c + '" class="' + (OS.state.accent === c ? 'on' : '') + '" style="background:' +
                        (c === 'auto' ? 'linear-gradient(135deg,#8e8e93 0 50%,#0a84ff 50%)' : c) + '"></i>').join('') +
                    '</div></div>' +
                    '<div class="settings-section"><h3>预览</h3><div class="card" style="padding:16px;display:flex;align-items:center;gap:14px">' +
                    '<div style="width:38px;height:38px;border-radius:10px;background:var(--accent)"></div>' +
                    '<div><b style="font-size:12.5px">当前主题</b><div class="muted" style="font-size:11px;margin-top:3px">窗口、菜单与控件颜色会随设置实时变化</div></div>' +
                    '<button class="btn" style="margin-left:auto" data-preview>发送测试通知</button></div></div>';
            }
            if (st.section === 'wallpaper') {
                return '<div class="settings-section"><h3>当前墙纸 · ' + OS.esc((OS.wallpapers[OS.state.wallpaper] || {}).name || '') + '</h3>' +
                    '<div class="wall-grid">' + Object.keys(OS.wallpapers).map((id, i) => '<div class="wall-opt' + (OS.state.wallpaper === id ? ' on' : '') + '" data-wall="' + id + '">' +
                    '<div class="wo-img">' + OS.wallpaperSVG(id, 'th' + i) + '</div><span>' + OS.wallpapers[id].name + '</span></div>').join('') +
                    '</div></div>' +
                    '<div class="settings-section"><h3>说明</h3><div class="card muted" style="padding:14px;font-size:11.5px;line-height:1.7">' +
                    '全部壁纸均由内联 SVG 渐变与曲线实时绘制，不加载任何图片文件。深色与浅色外观会对壁纸应用不同的亮度滤镜。</div></div>';
            }
            if (st.section === 'dock') {
                return '<div class="settings-section"><h3>程序坞</h3><div class="card" style="padding:6px 16px">' +
                    '<div class="row-setting"><div class="rs-label">大小<div class="rs-desc">调整 Dock 图标尺寸</div></div>' +
                    '<input type="range" min="38" max="66" value="' + OS.state.dockSize + '" data-docksize style="width:150px"><span class="muted" style="font-size:11px;width:30px">' + OS.state.dockSize + '</span></div>' +
                    '<div class="row-setting"><div class="rs-label">放大效果<div class="rs-desc">指针悬停时放大相邻图标</div></div><div class="switch' + (OS.state.dockMagnify ? ' on' : '') + '" data-sw="dockMagnify"></div></div>' +
                    '<div class="row-setting"><div class="rs-label">自动隐藏程序坞<div class="rs-desc">将指针移到屏幕底部以显示</div></div><div class="switch' + (OS.state.dockAutohide ? ' on' : '') + '" data-sw="dockAutohide"></div></div>' +
                    '</div></div>' +
                    '<div class="settings-section"><h3>快捷键</h3><div class="card" style="padding:12px 16px;font-size:11.5px;line-height:2">' +
                    '⌘ / Ctrl + 空格　聚焦搜索<br>F3 / Ctrl + ↑　调度中心<br>⌘ / Ctrl + W　关闭窗口<br>⌘ / Ctrl + M　最小化窗口</div></div>';
            }
            if (st.section === 'general') {
                return '<div class="settings-section"><h3>系统信息</h3><div class="card" style="padding:10px 16px">' +
                    '<table class="info-table"><tr><td>名称</td><td>WebOS</td></tr><tr><td>版本</td><td>1.0 (Build 2026.11)</td></tr>' +
                    '<tr><td>运行环境</td><td>Web Browser · JavaScript</td></tr><tr><td>窗口数量</td><td>' + OS.wm.windows.length + ' 个已打开</td></tr>' +
                    '<tr><td>屏幕分辨率</td><td>' + window.innerWidth + ' × ' + window.innerHeight + '</td></tr></table></div></div>' +
                    '<div class="settings-section"><h3>存储</h3><div class="card" style="padding:14px">' +
                    '<div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:8px"><span>本地数据</span><span class="muted">备忘录 · 偏好设置</span></div>' +
                    '<div style="height:8px;border-radius:5px;background:var(--field-bg);overflow:hidden"><div style="height:100%;width:18%;background:linear-gradient(90deg,#0a84ff,#64d2ff);border-radius:5px"></div></div>' +
                    '<div class="muted" style="font-size:10.5px;margin-top:7px">所有数据仅保存在此浏览器的 localStorage 中</div></div></div>' +
                    '<div class="settings-section"><h3>重置</h3><button class="btn" data-reset>恢复默认设置</button></div>';
            }
            return '<div class="settings-section"><div class="card" style="padding:24px;text-align:center">' +
                '<div style="width:74px;height:86px;margin:0 auto;color:var(--win-text)">' + OS.appleLogo(74) + '</div>' +
                '<h3 style="margin:12px 0 4px;font-size:17px">WebOS</h3><div class="muted" style="font-size:11.5px">版本 1.0 · 致敬 macOS</div>' +
                '<div style="margin-top:18px;font-size:11.5px;line-height:1.9" class="muted">由 HTML、CSS 与原生 JavaScript 构建<br>无框架、无外部资源、无网络请求</div>' +
                '<button class="btn primary" style="margin-top:16px" data-aboutwin>打开「关于本机」</button></div></div>';
        }
        function bind() {
            content.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => { OS.setTheme(b.dataset.theme); draw(); }));
            content.querySelectorAll('[data-accent]').forEach((b) => b.addEventListener('click', () => { OS.setAccent(b.dataset.accent); draw(); }));
            content.querySelectorAll('[data-wall]').forEach((b) => b.addEventListener('click', () => { OS.setWallpaper(b.dataset.wall); draw(); }));
            content.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
                const k = b.dataset.sw;
                OS.save(k, !OS.state[k]);
                b.classList.toggle('on', OS.state[k]);
                OS.emit('settings', { key: k, value: OS.state[k] });
            }));
            const slider = content.querySelector('[data-docksize]');
            if (slider)
                slider.addEventListener('input', () => {
                    const v = +slider.value;
                    OS.save('dockSize', v);
                    slider.nextElementSibling.textContent = String(v);
                });
            const reset = content.querySelector('[data-reset]');
            if (reset)
                reset.addEventListener('click', () => {
                    ['theme', 'wallpaper', 'accent', 'dockSize', 'dockMagnify', 'dockAutohide'].forEach((k) => OS.store.set(k, null));
                    location.reload();
                });
            const pv = content.querySelector('[data-preview]');
            if (pv)
                pv.addEventListener('click', () => OS.toast('测试通知', '这就是通知的样式', 'settings'));
            const aw = content.querySelector('[data-aboutwin]');
            if (aw)
                aw.addEventListener('click', () => OS.openApp('about'));
        }
        root.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => { st.section = b.dataset.sec; draw(); }));
        draw();
    }
};
/* ============================================================
   关于本机
   ============================================================ */
V.about = {
    render() {
        return '<div class="about"><div class="about-logo">' + OS.appleLogo(92) + '</div>' +
            '<h1>WebOS</h1><div class="ab-ver">版本 1.0 (Build 2026.11)</div>' +
            '<div class="about-grid">' +
            '<div class="ag-k">芯片</div><div>Web Engine V8 · 虚拟 8 核</div>' +
            '<div class="ag-k">内存</div><div>充足的想象力</div>' +
            '<div class="ag-k">启动磁盘</div><div>Macintosh HD（浏览器内）</div>' +
            '<div class="ag-k">图形</div><div>SVG / CSS · 硬件加速</div>' +
            '<div class="ag-k">序列号</div><div>WB-OS-2026-NOV07</div>' +
            '<div class="ag-k">桌面</div><div>Glass Aqua · ' + (OS.state.theme === 'dark' ? '深色' : '浅色') + '外观</div>' +
            '</div>' +
            '<div class="about-btns"><button class="btn" data-more>更多信息…</button><button class="btn primary" data-update>软件更新…</button></div>' +
            '<div class="about-foot">© 2026 WebOS Studio. 本作品为界面设计演示，与 Apple Inc. 无关联。<br>所有图标、壁纸与图形均由代码实时绘制。</div></div>';
    },
    mount(win) {
        win.body.querySelector('[data-more]').addEventListener('click', () => OS.openApp('settings'));
        win.body.querySelector('[data-update]').addEventListener('click', () => OS.toast('软件更新', 'WebOS 已是最新版本 (1.0)', 'about'));
    }
};
/* ============================================================
   邮件 / 信息
   ============================================================ */
const MAILS = [
    { from: 'WebOS 团队', subject: '欢迎来到 WebOS 👋', preview: '感谢体验这套桌面系统，这里有一些上手小贴士…', time: '09:41', body: '你好，andi：\n\n欢迎来到 WebOS！\n\n不妨先试试这些：\n· 拖动窗口标题栏，感受一下惯性\n· 按 ⌘ + 空格 打开聚焦搜索\n· 到「系统设置」换一张壁纸\n· 在终端里输入 neofetch\n\n祝使用愉快。\nWebOS 团队', unread: true },
    { from: '设计周报', subject: '第 45 周 · 毛玻璃与层次', preview: '本周我们讨论了背景模糊、描边高光与阴影的关系…', time: '昨天', body: '本周主题：毛玻璃与层次。\n\n背景模糊建议保持在 24–32px，并叠加 saturate(180%) 让色彩更鲜活。描边只用 1px、低不透明度的白色，就能模拟玻璃边缘的高光。\n\n下周见。', unread: true },
    { from: '日历', subject: '明天 14:00 设计评审', preview: '你已受邀参加「设计评审」，地点：线上会议室…', time: '周四', body: '日程提醒\n\n设计评审\n时间：14:00 – 15:00\n地点：线上会议室\n参与者：andi、设计组' },
    { from: '系统通知', subject: '本地存储已就绪', preview: '你的备忘录与偏好设置将自动保存在本机…', time: '周三', body: '本地存储已就绪。\n\n所有偏好设置与备忘录均保存在浏览器的 localStorage 中，不会上传到任何服务器。' }
];
V.mail = {
    render(win) {
        if (!win._mail)
            win._mail = { idx: 0 };
        return '<div class="finder"><div class="sidebar"><div class="side-title">邮箱</div>' +
            [['收件箱', 'bubble', 4], ['VIP', 'star', 2], ['已发送', 'share', 0], ['草稿', 'pen', 1], ['废纸篓', 'trash', 0]].map(([n, i, c], k) => '<div class="side-item' + (k === 0 ? ' on' : '') + '">' + OS.symbol(String(i), 16) + '<span>' + n + '</span><span class="side-count">' + c + '</span></div>').join('') +
            '</div><div class="notes-list" style="width:250px"></div>' +
            '<div class="content-pane" style="padding:26px 32px;overflow:auto"><div class="mail-content"></div></div></div>';
    },
    mount(win) {
        const m = win._mail, root = win.body, list = root.querySelector('.notes-list'), pane = root.querySelector('.mail-content');
        function draw() {
            list.innerHTML = '<div class="nl-head"><span>收件箱</span><span class="muted">4 封邮件</span></div><div class="nl-items">' +
                MAILS.map((x, i) => '<div class="nl-item' + (i === m.idx ? ' on' : '') + '" data-i="' + i + '">' +
                    '<b>' + (x.unread ? '● ' : '') + OS.esc(x.from) + '</b><p>' + OS.esc(x.subject) + '</p>' +
                    '<p class="subtle">' + x.time + ' · ' + OS.esc(x.preview) + '</p></div>').join('') + '</div>';
            const x = MAILS[m.idx];
            pane.innerHTML = '<div class="muted" style="font-size:11px">' + x.time + '</div><h2 style="font-size:20px;margin:8px 0 14px">' + OS.esc(x.subject) + '</h2>' +
                '<div style="display:flex;align-items:center;gap:10px;padding-bottom:16px;border-bottom:1px solid var(--win-sep)">' +
                '<div class="ss-avatar" style="width:34px;height:34px;font-size:13px">' + OS.esc(x.from[0]) + '</div>' +
                '<div><b style="font-size:12px">' + OS.esc(x.from) + '</b><div class="muted" style="font-size:10.5px">发送给：andi</div></div></div>' +
                '<div class="text-view" style="padding:18px 0">' + OS.esc(x.body) + '</div>';
        }
        list.addEventListener('click', (e) => { const it = e.target.closest('[data-i]'); if (it) {
            m.idx = +it.dataset.i;
            draw();
        } });
        draw();
    }
};
V.messages = {
    render(win) {
        return '<div class="finder"><div class="notes-list" style="width:250px"><div class="nl-head"><span>信息</span><button class="tb-icon">' + OS.symbol('pen', 15) + '</button></div>' +
            '<div class="nl-items"><div class="nl-item on"><b>设计小组 👩‍🎨</b><p>周五的方案我放到共享文件夹了</p></div>' +
            '<div class="nl-item"><b>Lin</b><p>周末一起去看展吗？</p></div>' +
            '<div class="nl-item"><b>提醒事项</b><p>别忘了换壁纸</p></div></div></div>' +
            '<div class="content-pane"><div style="height:48px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--win-sep);font-size:12px;font-weight:600">设计小组</div>' +
            '<div class="msg-thread win-scroll" style="flex:1;padding:20px 24px;display:flex;flex-direction:column;gap:10px"></div>' +
            '<div style="padding:12px 16px;border-top:1px solid var(--win-sep);display:flex;gap:8px"><input class="btn msg-input" style="flex:1;height:32px;text-align:left;cursor:text" placeholder="输入信息…"><button class="btn primary msg-send">发送</button></div></div></div>';
    },
    mount(win) {
        const root = win.body, thread = root.querySelector('.msg-thread'), input = root.querySelector('.msg-input');
        const seed = [
            ['them', '周五的方案我放到共享文件夹了，记得看一下～', '14:02'],
            ['me', '收到！我待会儿用访达打开', '14:04'],
            ['them', '顺便把壁纸也换了吧，新的那张好看', '14:05'],
            ['me', '哈哈好，已经换成「日落沙丘」了', '14:06']
        ];
        const bubble = (who, text) => '<div style="align-self:' + (who === 'me' ? 'flex-end' : 'flex-start') + ';max-width:70%;padding:9px 13px;border-radius:16px;font-size:12px;line-height:1.5;' +
            (who === 'me' ? 'background:var(--accent);color:#fff;border-bottom-right-radius:5px' : 'background:var(--win-fill);border-bottom-left-radius:5px') + '">' + OS.esc(text) + '</div>';
        thread.innerHTML = seed.map(([w, t]) => bubble(w, t)).join('');
        const send = () => {
            const v = input.value.trim();
            if (!v)
                return;
            thread.insertAdjacentHTML('beforeend', bubble('me', v));
            input.value = '';
            thread.scrollTop = thread.scrollHeight;
            setTimeout(() => {
                const replies = ['收到 👌', '好呀，我看看', '哈哈确实好看', '稍等我确认一下'];
                thread.insertAdjacentHTML('beforeend', bubble('them', replies[Math.floor(Math.random() * replies.length)]));
                thread.scrollTop = thread.scrollHeight;
            }, 900);
        };
        root.querySelector('.msg-send').addEventListener('click', send);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter')
            send(); });
    }
};
/* ============================================================
   通用展示页（天气 / 地图 / App Store 等）
   ============================================================ */
const GENERIC_INFO = {
    weather: ['天气', '看看接下来几天的天气。这个演示版本展示了界面框架，实时天气数据需要连接外部服务。', 'sun'],
    maps: ['地图', '探索地点与路线。界面框架已就绪，地图数据需要接入地图服务。', 'globe'],
    appstore: ['App Store', '发现与下载应用。本演示版本的全部应用已经预装，可以直接从启动台打开。', 'star'],
    reminder: ['提醒事项', '记录待办与清单。当前版本中，日程请前往「日历」应用查看。', 'check'],
    clock: ['时钟', '世界时钟、闹钟与计时器。菜单栏右侧已经显示了实时时间。', 'clock']
};
V._generic = {
    render(win) {
        const def = win.def;
        const info = GENERIC_INFO[win.appId] || [def.name, '这是 WebOS 的一个内置应用窗口。', 'info'];
        win.setTitle(info[0]);
        return '<div class="content-pane"><div class="win-scroll" style="padding:34px 38px">' +
            '<div style="display:flex;align-items:center;gap:20px">' +
            '<div style="width:88px;height:88px;flex:none">' + OS.icon(def.icon) + '</div>' +
            '<div><h2 style="margin:0;font-size:22px">' + OS.esc(info[0]) + '</h2>' +
            '<div class="muted" style="font-size:12px;margin-top:6px;max-width:440px;line-height:1.7">' + OS.esc(info[1]) + '</div></div></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-top:28px">' +
            [['⌘', '快捷键', '聚焦搜索与调度中心'], ['◈', '原生绘制', '无第三方依赖'], ['✦', '即时响应', '设置更改实时生效']]
                .map(([a, b, c]) => '<div class="web-card"><div class="wc-num">' + a + '</div><h4>' + b + '</h4><p>' + c + '</p></div>').join('') +
            '</div><div style="margin-top:24px;display:flex;gap:10px">' +
            '<button class="btn primary" data-open-settings>打开系统设置</button>' +
            '<button class="btn" data-open-launchpad>查看全部应用</button></div>' +
            '</div></div>';
    },
    mount(win) {
        win.body.querySelector('[data-open-settings]').addEventListener('click', () => OS.openApp('settings'));
        win.body.querySelector('[data-open-launchpad]').addEventListener('click', () => OS.emit('launchpad'));
    }
};
/* ============================================================
   文件打开分发
   ============================================================ */
OS.openFile = (node, path) => {
    if (!node)
        return;
    const p = path || [];
    switch (node.type) {
        case 'dir':
            OS.openApp('finder', { path: p.length ? p : OS.fs.home.slice(), title: node.name });
            break;
        case 'app':
            OS.openApp(node.app);
            break;
        case 'text':
            OS.openApp('textview', { title: node.name, content: node.content || '（空文稿）' });
            break;
        case 'image':
            OS.openApp('photos', { photo: node.photo || 0 });
            break;
        case 'audio':
            OS.openApp('music');
            break;
        case 'disk':
            OS.showInfo(Object.assign({ path: p.slice(0, -1).join('/') }, node));
            break;
        default: OS.toast('无法打开', node.name + ' · 此演示版本暂不支持该类型', node.icon || 'file-text');
    }
};
//# sourceMappingURL=apps.js.map