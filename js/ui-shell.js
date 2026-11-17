/* Molxo Flow: роутер, шапка, подвал, интервью и боковая панель. Работает только в браузере. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined') return;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ROUTES = { home: true, start: true, plan: true, demo: true, interview: true, studio: true, docs: true, method: true, quiz: true, demos: true, cabinet: true, offer: true };
  // Основная навигация: не больше пяти пунктов. «Мои заявки» появляется, только когда в кабинете есть что показать
  // (решает ui.cabinetNavVisible из ui-extra.js); квиз, предложение и методика-«Как это работает» остаются рабочими маршрутами.
  var NAV = ['start', 'demos', 'method', 'cabinet', 'interview'];
  // Какой пункт шапки подсвечивать на маршруте: Студия и Документы живут внутри конструктора ТЗ.
  var NAV_ACTIVE = { studio: 'interview', docs: 'interview', plan: 'start', demo: 'demos', quiz: 'start', offer: 'start' };
  var CONSTRUCTOR_ROUTES = { interview: true, studio: true, docs: true };
  var clearHooks = [];
  var PENDING = 'Нужно уточнить';

  var ui = MF.ui = MF.ui || {};
  var views = {};
  var store = null;
  var refs = {};
  var currentRoute = '';
  var focusAnswerNext = false;
  var statusMode = 'saved';
  var pendingLangFocus = '';

  /* ---------- DOM-помощник ---------- */
  // el('div', {class:'x', text:'…', on:{click:fn}, 'aria-label':'…'}, [детей])
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    fill(node, attrs, kids);
    return node;
  }
  function fill(node, attrs, kids) {
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
      else if (k === 'value') node.value = v;
      else node.setAttribute(k, v === true ? '' : String(v));
    });
    append(node, kids);
  }
  function append(node, kids) {
    if (kids === null || kids === undefined) return;
    (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }
  function svg(tag, attrs, kids) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    append(node, kids);
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  ui.el = el;
  ui.svg = svg;
  ui.clear = clear;
  // Заполнение полосы прогресса: доля 0..1 в --p, css масштабирует scaleX (анимируется только transform).
  ui.setProgress = function (node, fraction) {
    var v = String(Math.max(0, Math.min(1, fraction)));
    if (node.style && typeof node.style.setProperty === 'function') node.style.setProperty('--p', v); else if (node.style) node.style['--p'] = v;
  };

  // Единый заголовок экрана: моно-метка, h1, подзаголовок (порядок строго такой); метка «NN / РАЗДЕЛ» берётся из ключей route.*
  var ROUTE_NO = { start: '01', quiz: '02', demos: '03', method: '04', cabinet: '05', offer: '06', interview: '07', studio: '08', docs: '09' };
  ui.routeLabel = function (route) { return (ROUTE_NO[route] || '00') + ' / ' + MF.t('route.' + route); };
  ui.pageHead = function (label, title, lead) {
    return el('header', { class: 'page-head' }, [
      label ? el('p', { class: 'mono-label' }, label) : null,
      el('h1', { class: 'page-title' }, title),
      lead ? el('p', { class: 'lead' }, lead) : null
    ]);
  };
  // Знаки пустых состояний и блока приватности: тонкая линия, одна оранжевая деталь; рисуются кодом (kind: privacy | docs | schema), без растров.
  var SIGNS = {
    privacy: [['l', 'M80 12L114 25V57C114 81 98 97 80 106C62 97 46 81 46 57V25Z'], ['l', 'M68 56H92V76H68Z'], ['a', 'M72 56V49A8 8 0 0 1 88 49V56']],
    docs: [['l', 'M56 20H104V98H56Z'], ['l', 'M48 14H96V92H48Z'], ['l', 'M40 8H88V86H40Z'], ['l', 'M50 24H78'], ['l', 'M50 36H78'], ['a', 'M50 48H66']],
    schema: [['l', 'M14 46H42V74H14Z'], ['l', 'M66 46H94V74H66Z'], ['l', 'M118 46H146V74H118Z'], ['l', 'M42 60H66'], ['a', 'M94 60H118']]
  };
  ui.sign = function (kind, label) {
    var attrs = { viewBox: '0 0 160 120', 'class': 'sign', focusable: 'false', preserveAspectRatio: 'xMidYMid meet' };
    if (label) { attrs.role = 'img'; attrs['aria-label'] = label; } else attrs['aria-hidden'] = 'true';
    return svg('svg', attrs, (SIGNS[kind] || []).map(function (p) { return svg('path', { 'class': 'sg-' + p[0], d: p[1] }); }));
  };

  // Пустое состояние: картинка (pic: privacy | docs | schema), заголовок, текст и действия (одна главная кнопка, остальное ссылки).
  ui.empty = function (o) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'empty-pic is-' + o.pic, 'aria-hidden': 'true' }, ui.sign(o.pic)),
      el('div', { class: 'empty-body' }, [
        o.title ? el('h2', { class: 'empty-title' }, o.title) : null,
        o.text ? el('p', { class: 'empty-text' }, o.text) : null,
        el('div', { class: 'empty-actions' }, o.actions || [])
      ])
    ]);
  };

  function logo() {
    return svg('svg', { viewBox: '0 0 32 32', width: '32', height: '32', 'aria-hidden': 'true', focusable: 'false', 'class': 'logo' }, [
      svg('rect', { x: '1', y: '1', width: '30', height: '30', rx: '8' }),
      svg('path', { d: 'M8 22V10l8 8 8-8v12', fill: 'none', 'stroke-width': '2.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    ]);
  }

  /* ---------- состояние ---------- */
  ui.state = null;

  ui.setState = function (next, opts) {
    next = MF.withSavedAt(next, Date.now());
    ui.state = next;
    var ok = store.save(next);
    setStatus(ok ? 'saved' : 'unavailable');
    if (!(opts && opts.quiet)) ui.render();
  };

  function setStatus(mode) {
    statusMode = mode;
    var s = refs.status;
    if (!s) return;
    var text = mode === 'saved' ? MF.t('wizard.saved') : mode === 'cleared' ? MF.t('shell.statusCleared') : MF.t('wizard.unavailable');
    s.className = 'save-status is-' + mode;
    s.textContent = text;
  }

  /* ---------- подтверждение ---------- */
  function confirmAction(opts, onOk) {
    var dlg = refs.dialog;
    if (!dlg || typeof dlg.showModal !== 'function') {
      if (root.confirm && root.confirm(opts.title + '\n' + opts.text)) onOk();
      return;
    }
    refs.dialogTitle.textContent = opts.title;
    refs.dialogText.textContent = opts.text;
    refs.dialogOk.textContent = opts.okLabel || MF.t('shell.confirm');
    refs.dialogCancel.textContent = opts.cancelLabel || MF.t('shell.cancel');
    dlg.returnValue = '';
    dlg.onclose = function () {
      dlg.onclose = null;
      if (dlg.returnValue === 'ok') onOk();
    };
    dlg.showModal();
  }
  ui.confirm = confirmAction;

  function cancelConfirm() {
    var dlg = refs.dialog;
    if (dlg && dlg.open && typeof dlg.close === 'function') dlg.close('cancel');
  }

  function buildDialog() {
    // Заголовок не пустой даже до первого показа (его текст подставляет confirmAction).
    var title = el('h2', { id: 'dialog-title', class: 'dialog-title' }, MF.t('shell.confirm'));
    var text = el('p', { id: 'dialog-text', class: 'dialog-text' });
    var cancel = el('button', { type: 'button', class: 'btn btn-secondary', autofocus: true }, MF.t('shell.cancel'));
    var ok = el('button', { type: 'button', class: 'btn btn-danger' }, MF.t('shell.confirm'));
    var dlg = el('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title', 'aria-describedby': 'dialog-text' }, [
      title, text, el('div', { class: 'dialog-actions' }, [cancel, ok])
    ]);
    cancel.addEventListener('click', function () { dlg.close('cancel'); });
    ok.addEventListener('click', function () { dlg.close('ok'); });
    refs.dialog = dlg; refs.dialogTitle = title; refs.dialogText = text; refs.dialogOk = ok; refs.dialogCancel = cancel;
    return dlg;
  }

  /* ---------- сценарии проекта (демо, сброс, очистка) ---------- */
  function hasAnswers(state) { return MF.filledCount(state.answers) > 0; }
  function demoEdited(state) {
    return MF.QUESTIONS.some(function (q) { return (state.answers[q.id] || '') !== MF.DEMO_ANSWERS[q.id]; });
  }

  // Загрузить демо; если у пользователя есть свои ответы — спросить.
  ui.startDemo = function (opts) {
    var then = function () {
      var next = MF.loadDemo(ui.state);
      if (opts && opts.restart) next = MF.setCurrent(next, 1);
      ui.setState(next);
      if (opts && opts.go) ui.go(opts.go);
    };
    if (hasAnswers(ui.state) && !ui.state.demo) {
      confirmAction({ title: MF.t('shell.demo.title'), text: MF.t('shell.demo.text'), okLabel: MF.t('shell.demo.ok') }, then);
    } else then();
  };

  // Вернуться к пустому проекту (из демо или по кнопке «Начать свой проект»).
  ui.backToEmpty = function (opts) {
    var then = function () {
      ui.setState(MF.resetProject());
      if (opts && opts.go) ui.go(opts.go);
    };
    if (ui.state.demo && demoEdited(ui.state)) {
      confirmAction({ title: MF.t('shell.empty.title'), text: MF.t('shell.empty.text'), okLabel: MF.t('shell.empty.ok') }, then);
    } else then();
  };

  // Хуки очистки: экраны воронки стирают здесь свои данные (ответы мастера).
  ui.onClear = function (fn) { if (typeof fn === 'function') clearHooks.push(fn); };

  function clearProject() {
    confirmAction({
      title: MF.t('shell.clear.title'),
      text: MF.t('clear.text'),
      okLabel: MF.t('shell.clear.ok')
    }, function () {
      store.clear();
      ui.state = MF.resetProject();
      clearHooks.forEach(function (fn) { try { fn(); } catch (e) { /* очистка остальных данных продолжается */ } });
      ui.rebuildChrome();
      ui.render();
      setStatus(store.available ? 'cleared' : 'unavailable');
      ui.go('home');
    });
  }

  /* ---------- маршруты ---------- */
  function routeFromHash() {
    var h = (root.location && root.location.hash) || '';
    var name = h.replace(/^#\/?/, '').split(/[?\/]/)[0];
    if (name === '') return 'home';
    if (ROUTES[name]) return name;
    // Только «#/что-то» считается маршрутом: якорь вроде «#view» остаётся главной, а неизвестный маршрут показывает «не найдено».
    return h.charAt(1) === '/' ? 'notfound' : 'home';
  }

  ui.go = function (route) {
    var name = String(route || 'home').replace(/^#\/?/, '') || 'home';
    var hash = name === 'home' ? '#/' : '#/' + name;
    if (root.location.hash === hash) ui.render();
    else root.location.hash = hash;
  };

  ui.registerView = function (name, fn) {
    views[name] = fn;
    if (refs.view && currentRoute === name) ui.render();
  };

  function buildHeader() {
    var header = refs.header;
    clear(header);
    var navLinks = NAV.filter(function (n) {
      return n !== 'cabinet' || (typeof ui.cabinetNavVisible === 'function' && ui.cabinetNavVisible());
    }).map(function (n) {
      return el('a', { href: '#/' + n, 'data-route': n, class: 'nav-link' }, MF.t('route.' + n));
    });
    refs.navLinks = navLinks;
    header.className = 'app-header';
    var tools = el('div', { class: 'header-tools' }, [refs.status]);
    // Постоянная кнопка «Спросить ассистента»: есть только при заданном боте (решает ui.renderAskButton).
    if (ui.renderAskButton) ui.renderAskButton(tools);
    tools.appendChild(buildLangSwitch());
    // На телефоне пункты меню раскрываются кнопкой; кнопка ассистента при этом уходит в раскрытое меню.
    var toggle = el('button', {
      type: 'button', class: 'nav-toggle', 'aria-expanded': 'false', 'aria-controls': 'main-nav', 'aria-label': MF.t('shell.menu'),
      on: { click: function () { setNav(!navOpen(), false); } }
    }, el('span', { class: 'nav-toggle-bar', 'aria-hidden': 'true' }));
    var nav = el('nav', { id: 'main-nav', class: 'main-nav', 'aria-label': MF.t('shell.navAria') }, navLinks);
    if (ui.renderAskButton) {
      var navAsk = ui.renderAskButton(nav);
      if (navAsk) navAsk.className += ' nav-ask';
    }
    refs.navToggle = toggle;
    refs.nav = nav;
    nav.addEventListener('click', function (e) {
      var t = e && e.target;
      if (t && t.tagName && String(t.tagName).toLowerCase() === 'a') setNav(false, false);
    });
    header.addEventListener('keydown', function (e) {
      if (e && (e.key === 'Escape' || e.key === 'Esc') && navOpen()) setNav(false, true);
    });
    header.appendChild(el('div', { class: 'header-inner' }, [
      el('a', { href: '#/', class: 'brand', 'aria-label': MF.t('shell.brandAria') }, [logo(), el('span', { class: 'brand-name' }, 'Molxo Flow')]),
      toggle,
      nav,
      tools
    ]));
  }

  function navOpen() { return !!refs.navToggle && refs.navToggle.getAttribute('aria-expanded') === 'true'; }
  // Меню телефона: aria-expanded на кнопке, атрибут data-nav-open на шапке (его читает CSS); Esc возвращает фокус на кнопку.
  function setNav(open, focusToggle) {
    if (!refs.navToggle || !refs.header) return;
    refs.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) refs.header.setAttribute('data-nav-open', 'true'); else refs.header.removeAttribute('data-nav-open');
    if (focusToggle && refs.navToggle.focus) refs.navToggle.focus();
  }
  ui.closeNav = function () { setNav(false, false); };

  // Переключатель RU / UK / EN: кнопки с aria-pressed, выбор запоминает MF.setLang.
  function buildLangSwitch() {
    var buttons = (MF.LANGS || ['ru']).map(function (code) {
      return el('button', {
        type: 'button', class: 'lang-btn', 'data-lang': code, lang: code, 'aria-pressed': MF.LANG === code ? 'true' : 'false',
        // Видимый текст «UK» входит в доступное имя: «UK, Українська».
        'aria-label': code.toUpperCase() + ', ' + MF.langName(code), title: MF.langName(code),
        on: { click: function () { if (MF.LANG !== code && MF.setLang) { pendingLangFocus = code; MF.setLang(code); } } }
      }, code.toUpperCase());
    });
    return el('div', { class: 'lang-switch', role: 'group', 'aria-label': MF.t('lang.label') }, buttons);
  }

  function buildFooter() {
    var f = refs.footer;
    clear(f);
    f.appendChild(el('div', { class: 'footer-inner' }, [
      el('p', { class: 'footer-note' }, MF.t('footer.note')),
      el('nav', { class: 'footer-links', 'aria-label': MF.t('footer.linksAria') }, [
        el('a', { href: '#/method' }, MF.t('route.method')),
        el('a', { href: '#/interview' }, MF.t('route.interview'))
      ]),
      el('button', { type: 'button', class: 'clear-link', id: 'clear-data', on: { click: clearProject } }, MF.t('shell.clear.button'))
    ]));
  }

  // Перестраивает шапку, подвал, подписи страницы и баннер на текущем языке; фокус на кнопке языка сохраняется.
  ui.rebuildChrome = function () {
    if (!refs.header) return;
    var focusLang = pendingLangFocus || null;
    pendingLangFocus = '';
    var active = document.activeElement;
    if (!focusLang && active && active.getAttribute && active.classList && active.classList.contains('lang-btn')) focusLang = active.getAttribute('data-lang');
    buildHeader();
    if (refs.footer) buildFooter();
    if (refs.banner) refs.banner.setAttribute('aria-label', MF.t('shell.banner.aria'));
    var skip = document.querySelector('.skip-link');
    if (skip) skip.textContent = MF.t('shell.skip');
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', MF.t('shell.metaDescription'));
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', MF.t('shell.metaTitle'));
    setStatus(statusMode);
    if (focusLang) {
      var again = refs.header.querySelector('.lang-btn[data-lang="' + focusLang + '"]');
      if (again) again.focus({ preventScroll: true });
    }
  };

  // Сообщает чтецу экрана о смене языка (polite-область создаётся при запуске).
  function announceLang(code) {
    if (!refs.announce) return;
    refs.announce.textContent = '';
    refs.announce.textContent = MF.t('lang.announce', { name: MF.langName(code) });
  }

  // Флаг на body для стилей: нижняя панель действий (мастер, план) поднимает плавающий чат.
  ui.setBodyFlag = function (name, on) {
    var b = document.body;
    if (!b) return;
    if (on) b.setAttribute('data-' + name, 'true'); else b.removeAttribute('data-' + name);
  };

  function markNav(route) {
    var active = NAV_ACTIVE[route] || route;
    (refs.navLinks || []).forEach(function (a) {
      if (a.getAttribute('data-route') === active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function renderBanner() {
    var b = refs.banner;
    clear(b);
    if (!ui.state.demo) { b.hidden = true; return; }
    b.hidden = false;
    b.appendChild(el('div', { class: 'banner-inner' }, [
      el('p', { class: 'banner-text' }, [el('strong', null, MF.t('shell.banner.lead') + ' '), MF.t('shell.banner.text')]),
      el('button', { type: 'button', class: 'btn btn-secondary btn-small', on: { click: function () { ui.backToEmpty(); } } }, MF.t('shell.banner.reset'))
    ]));
  }

  function placeholder(container, name) {
    container.appendChild(el('section', { class: 'page narrow' }, [
      el('h1', { class: 'page-title' }, ROUTES[name] ? MF.t('route.' + name) : MF.t('shell.section')),
      el('p', { class: 'lead' }, MF.t('shell.placeholder')),
      el('a', { href: '#/', class: 'btn btn-secondary' }, MF.t('demo.home'))
    ]));
  }

  ui.render = function () {
    if (!refs.view) return;
    var route = routeFromHash();
    var changed = route !== currentRoute;
    currentRoute = route;
    markNav(route);
    renderBanner();
    var container = refs.view;
    clear(container);
    ui.setBodyFlag('actionbar', false);
    // Маршрут на body: стили скрывают плавающий чат на шагах мастера (#/start/...), чат остаётся в плане и в шапке.
    if (document.body && document.body.setAttribute) document.body.setAttribute('data-route', route);
    ui.closeNav();
    // Конструктор ТЗ остаётся русским: на другом языке интерфейса содержимое помечено lang="ru" для чтеца экрана.
    if (CONSTRUCTOR_ROUTES[route] && MF.LANG !== 'ru') container.setAttribute('lang', 'ru'); else container.removeAttribute('lang');
    var fn = views[route];
    try {
      if (CONSTRUCTOR_ROUTES[route] && typeof ui.prefillFromWizard === 'function') ui.prefillFromWizard();
      if (fn) fn(container, { state: ui.state, setState: ui.setState, go: ui.go });
      else placeholder(container, route);
    } catch (e) {
      clear(container);
      container.appendChild(el('section', { class: 'page narrow' }, [
        el('h1', { class: 'page-title' }, MF.t('shell.error.title')),
        el('p', { class: 'lead' }, MF.t('shell.error.text'))
      ]));
      if (root.console && root.console.warn) root.console.warn('Molxo Flow: ошибка показа раздела', e);
    }
    // Вход экрана только при смене маршрута: перерисовка того же (ответ на вопрос, язык, автосохранение) не мигает.
    // Шаг мастера входит сам (data-dir ставит мастер до перерисовки).
    var shown = container.children && container.children[0];
    if (!changed && shown && shown.classList && !(shown.getAttribute && shown.getAttribute('data-dir'))) shown.classList.add('no-anim');
    document.title = route === 'home' ? MF.t('shell.metaTitle') : MF.t('route.' + route) + ' | Molxo Flow';
    if (changed && refs.ready) {
      root.scrollTo(0, 0);
      container.focus({ preventScroll: true });
    }
  };

  function renderNotFound(container) {
    container.appendChild(el('section', { class: 'page narrow notfound' }, [
      ui.pageHead('404', MF.t('route.notfound'), MF.t('notfound.text')),
      ui.empty({ pic: 'schema', actions: [
        el('a', { href: '#/', class: 'btn btn-primary' }, MF.t('demo.home')),
        el('a', { href: '#/start', class: 'link-btn' }, MF.t('route.start'))
      ] })
    ]));
  }

  /* ---------- интервью ---------- */
  function sectionOf(q) {
    for (var i = 0; i < MF.SECTIONS.length; i++) if (MF.SECTIONS[i].id === q.section) return MF.SECTIONS[i];
    return { title: '' };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // Вкладки конструктора ТЗ: Вопросы, Студия, Документы, Ваш план.
  ui.renderConstructorTabs = function (container, active) {
    if (MF.LANG !== 'ru') {
      // Пометка и ссылка на мастер написаны на языке интерфейса (lang), остальной экран остаётся русским.
      container.appendChild(el('p', { class: 'ctabs-note muted small', role: 'note', lang: MF.LANG }, [
        MF.t('constructor.ru-only') + ' ',
        el('a', { href: '#/start', class: 'ctabs-back' }, MF.t('constructor.backToWizard', { lang: MF.langName(MF.LANG) }))
      ]));
    }
    var tabs = [['interview', MF.t('tabs.questions')], ['studio', MF.t('tabs.studio')], ['docs', MF.t('tabs.docs')], ['plan', MF.t('tabs.plan')]];
    container.appendChild(el('nav', { class: 'ctabs', lang: MF.LANG !== 'ru' ? MF.LANG : null, 'aria-label': MF.t('tabs.label') }, el('ul', { class: 'ctabs-list' }, tabs.map(function (t) {
      return el('li', null, el('a', { href: '#/' + t[0], class: 'ctab', 'aria-current': t[0] === active ? 'page' : null }, t[1]));
    }))));
  };

  function renderInterview(container) {
    var state = ui.state;
    ui.renderConstructorTabs(container, 'interview');
    var q = MF.QUESTIONS[state.current - 1];
    var total = MF.QUESTIONS.length;

    var area = el('textarea', {
      id: 'answer', class: 'answer', rows: '7', placeholder: q.placeholder,
      'aria-labelledby': 'q-title', 'aria-describedby': 'q-hint', value: state.answers[q.id] || ''
    });
    area.addEventListener('input', function () {
      ui.setState(MF.setAnswer(ui.state, q.id, area.value), { quiet: true });
      refreshLive();
    });

    var chips = el('ul', { class: 'chips', 'aria-label': 'Примеры ответа' }, q.chips.map(function (c) {
      return el('li', null, el('button', { type: 'button', class: 'chip', on: { click: function () {
        var cur = area.value;
        area.value = MF.isFilled(cur) ? cur.replace(/\s+$/, '') + '; ' + c : c;
        area.dispatchEvent(new Event('input'));
        area.focus();
      } } }, c));
    }));

    // Первый вопрос: кнопка не disabled (остаётся в Tab), а aria-disabled с пояснением; клик ничего не делает.
    var back = el('button', { type: 'button', class: 'btn btn-secondary' + (state.current <= 1 ? ' is-disabled' : ''), 'aria-disabled': state.current <= 1 ? 'true' : null, title: state.current <= 1 ? 'Это первый вопрос, назад идти некуда' : null, on: { click: function () {
      if (state.current <= 1) return;
      focusAnswerNext = true; ui.setState(MF.setCurrent(ui.state, state.current - 1));
    } } }, 'Назад');
    var next = state.current >= total
      ? el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { ui.go('docs'); } } }, 'К документам →')
      : el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () {
        focusAnswerNext = true; ui.setState(MF.setCurrent(ui.state, state.current + 1));
      } } }, 'Следующий вопрос');

    // Прогресс: одна полоска на все вопросы и число «07 / 15»; метка вопроса и раздел — в моно-метке
    var qFill = el('div', { class: 'bar-fill' });
    ui.setProgress(qFill, q.n / total);
    var card = el('section', { class: 'card question-card', 'aria-labelledby': 'q-title' }, [
      el('div', { class: 'q-progress' }, [
        el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(total), 'aria-valuenow': String(q.n), 'aria-label': 'Вопрос ' + q.n + ' из ' + total }, qFill),
        el('span', { class: 'num q-count' }, pad2(q.n) + ' / ' + total)
      ]),
      el('p', { class: 'mono-label' }, 'ВОПРОС · ' + sectionOf(q).title),
      el('h1', { id: 'q-title', class: 'question-title' }, q.title),
      el('p', { id: 'q-hint', class: 'hint' }, q.hint),
      area,
      el('p', { class: 'chips-label' }, 'Примеры (нажмите, чтобы подставить):'),
      chips,
      el('div', { class: 'card-actions' }, [back, next])
    ]);

    // навигатор по вопросам
    var navButtons = {};
    var navGroups = MF.SECTIONS.map(function (s) {
      var qs = MF.QUESTIONS.filter(function (x) { return x.section === s.id; });
      return el('li', { class: 'qnav-group' }, [
        el('span', { class: 'qnav-title' }, s.title),
        el('ul', { class: 'qnav-items' }, qs.map(function (x) {
          var b = el('button', { type: 'button', class: 'qnav-btn', on: { click: function () {
            focusAnswerNext = true; ui.setState(MF.setCurrent(ui.state, x.n));
          } } }, pad2(x.n));
          navButtons[x.id] = b;
          return el('li', null, b);
        }))
      ]);
    });
    var navigator = el('nav', { class: 'card qnav', 'aria-label': 'Все вопросы' }, [
      el('h2', { class: 'card-title' }, 'Все вопросы'),
      el('p', { class: 'muted small' }, 'Можно открыть любой вопрос. Точка отмечает вопросы с ответом.'),
      el('ul', { class: 'qnav-list' }, navGroups)
    ]);

    // Готовность требований живёт на экране конструктора; конструктор русский, подписи берутся из русского словаря.
    var rdValue = el('p', { class: 'readiness-value' });
    var rdBar = el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': MF.tIn('ru', 'home.stage.readyAria') }, el('div', { class: 'bar-fill' }));
    var rdLabel = el('p', { class: 'muted small' });
    var readiness = el('section', { class: 'card readiness-card', 'aria-labelledby': 'rd-title' }, el('div', { class: 'readiness' }, [
      el('div', { class: 'readiness-row' }, [el('h2', { id: 'rd-title', class: 'readiness-title' }, MF.tIn('ru', 'home.stage.ready')), rdValue]),
      rdBar, rdLabel
    ]));
    var side = el('aside', { class: 'workspace-side', 'aria-label': 'Живая схема' });
    var main = el('div', { class: 'workspace-main' }, [card, readiness, navigator]);
    container.appendChild(el('div', { class: 'page workspace' }, [main, side]));
    MF.ui.renderSidebar(side);

    function refreshLive() {
      MF.QUESTIONS.forEach(function (x) {
        var b = navButtons[x.id];
        var filled = MF.isFilled(ui.state.answers[x.id]);
        var cur = x.n === ui.state.current;
        b.className = 'qnav-btn' + (filled ? ' is-filled' : '') + (cur ? ' is-current' : '');
        b.setAttribute('aria-label', 'Вопрос ' + x.n + ': ' + x.title + (filled ? ', есть ответ' : ', без ответа'));
        if (cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      var r = MF.readiness(ui.state.answers);
      rdValue.textContent = '';
      rdValue.appendChild(document.createTextNode(String(r.percent)));
      rdValue.appendChild(el('span', { class: 'readiness-pct' }, '%'));
      rdBar.setAttribute('aria-valuenow', String(r.percent));
      ui.setProgress(rdBar.firstChild, r.percent / 100);
      rdLabel.textContent = MF.tIn('ru', 'home.stage.label', { n: r.filled, total: r.total });
      MF.ui.updateSidebar();
    }
    refreshLive();

    if (focusAnswerNext) {
      focusAnswerNext = false;
      card.scrollIntoView({ block: 'start' });
      area.focus({ preventScroll: true });
    }
  }

  /* ---------- боковая панель ---------- */
  var sb = null; // ссылки на узлы панели

  function panelSection(title, id, kids, cls) {
    return el('section', { class: 'side-block ' + (cls || ''), 'aria-labelledby': id }, [el('h2', { id: id, class: 'side-title' }, title)].concat(kids));
  }

  ui.renderSidebar = function (container) {
    clear(container);
    sb = {};
    sb.process = el('p', { class: 'side-process' });
    sb.steps = el('ol', { class: 'flow-steps' });
    sb.stepsEmpty = el('p', { class: 'muted' }, 'Опишите, как процесс выполняется сейчас');
    sb.potential = el('ul', { class: 'potential-lines' });
    sb.potNote = el('p', { class: 'muted small' });

    function assumption(key, label, unit, min, max, step) {
      var input = el('input', { type: 'number', inputmode: 'decimal', min: min, max: max, step: step, class: 'assume-input', id: 'as-' + key });
      input.addEventListener('input', function () {
        var v = key === 'automationShare' ? Number(input.value) / 100 : Number(input.value);
        if (input.value === '' || !isFinite(v)) return;
        ui.setState(MF.setAssumption(ui.state, key, v), { quiet: true });
        MF.ui.updateSidebar();
      });
      input.addEventListener('change', function () { MF.ui.updateSidebar(true); });
      sb[key] = input;
      return el('div', { class: 'assume-row' }, [
        el('label', { for: 'as-' + key, class: 'assume-label' }, [label, el('span', { class: 'tag-assume' }, 'допущение')]),
        el('span', { class: 'assume-field' }, [input, el('span', { class: 'assume-unit' }, unit)])
      ]);
    }
    var assumptions = el('div', { class: 'assume' }, [
      el('p', { class: 'assume-head' }, 'Допущения (измените под себя)'),
      assumption('minutesPerRun', 'Минут на один запуск', 'мин', '1', '1440', '1'),
      assumption('automationShare', 'Доля работы, которую берёт автоматизация', '%', '1', '100', '1'),
      assumption('hourlyRate', 'Стоимость часа работы', '₽/ч', '0', '10000000', '50')
    ]);

    sb.core = el('p', { class: 'core-count' });
    sb.coreBar = el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '11', 'aria-label': 'Ответов для ТЗ готово' }, el('div', { class: 'bar-fill' }));
    sb.integrations = el('div', { class: 'side-list' });
    sb.users = el('div', { class: 'side-list' });
    sb.result = el('p', { class: 'side-result' });
    sb.demoLink = el('button', { type: 'button', class: 'link-btn', on: { click: function () { ui.startDemo(); } } }, 'Показать результат на примере');

    container.appendChild(el('div', { class: 'side-card card' }, [
      panelSection('Ваш будущий процесс', 'sb-flow', [sb.process, sb.steps, sb.stepsEmpty]),
      panelSection('Предварительный потенциал', 'sb-pot', [sb.potential, sb.potNote, assumptions]),
      panelSection('Ответы для ТЗ', 'sb-core', [sb.core, sb.coreBar]),
      panelSection('Интеграции', 'sb-int', [sb.integrations]),
      panelSection('Пользователи', 'sb-users', [sb.users]),
      panelSection('Результат', 'sb-res', [sb.result]),
      el('p', { class: 'side-demo' }, sb.demoLink)
    ]));
    ui.updateSidebar(true);
  };

  function listInto(node, items) {
    clear(node);
    if (!items.length) { node.appendChild(el('p', { class: 'pending' }, PENDING)); return; }
    node.appendChild(el('ul', { class: 'tag-list' }, items.map(function (t) { return el('li', { class: 'tag' }, t); })));
  }

  // force=true — перезаписать и поля допущений, даже если в них стоит курсор.
  ui.updateSidebar = function (force) {
    if (!sb || !sb.steps.isConnected) return;
    var st = ui.state, sum = MF.sidebarSummary(st);
    sb.process.textContent = sum.process;
    sb.process.hidden = !sum.process;
    clear(sb.steps);
    sum.steps.forEach(function (s) {
      sb.steps.appendChild(el('li', { class: 'flow-step' }, [el('span', { class: 'flow-num', 'aria-hidden': 'true' }, String(s.n)), el('span', { class: 'flow-text' }, s.text)]));
    });
    sb.steps.hidden = sum.steps.length === 0;
    sb.stepsEmpty.hidden = sum.steps.length > 0;

    clear(sb.potential);
    sum.potential.lines.forEach(function (l) { sb.potential.appendChild(el('li', null, l)); });
    sb.potential.hidden = !sum.potential.ready;
    sb.potNote.textContent = sum.potential.note;
    sb.potNote.className = sum.potential.ready ? 'muted small' : 'pending';

    var a = st.assumptions;
    [['minutesPerRun', a.minutesPerRun], ['automationShare', Math.round(a.automationShare * 100)], ['hourlyRate', a.hourlyRate]].forEach(function (p) {
      var input = sb[p[0]];
      if (force || document.activeElement !== input) input.value = String(p[1]);
    });

    sb.core.textContent = sum.core.label;
    sb.coreBar.setAttribute('aria-valuenow', String(sum.core.ready));
    ui.setProgress(sb.coreBar.firstChild, sum.core.ready / sum.core.total);
    listInto(sb.integrations, sum.integrations);
    listInto(sb.users, sum.users);
    sb.result.textContent = sum.result;
    sb.result.className = 'side-result' + (sum.result === PENDING ? ' pending' : '');
  };

  /* ---------- запуск ---------- */
  ui.init = function () {
    if (refs.ready || refs.initing) return;
    refs.initing = true;
    refs.header = document.getElementById('app-header');
    refs.view = document.getElementById('view');
    refs.status = document.getElementById('save-status');
    store = MF.createStore(MF.getLocalStorage());
    ui.state = store.load();

    refs.banner = el('div', { id: 'demo-banner', class: 'demo-banner', role: 'region', 'aria-label': MF.t('shell.banner.aria'), hidden: true });
    refs.view.parentNode.insertBefore(refs.banner, refs.view);

    // Шапка и подвал строятся один раз: их наполняет ui.rebuildChrome ниже.
    refs.footer = el('footer', { class: 'app-footer', id: 'app-footer' });
    refs.view.parentNode.insertBefore(refs.footer, refs.view.nextSibling);
    document.body.appendChild(buildDialog());

    refs.announce = el('p', { id: 'lang-status', class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(refs.announce);
    var skip = document.querySelector('.skip-link');
    if (skip && skip.addEventListener) skip.addEventListener('click', function (e) {
      // «#view» не должен менять маршрут: фокус переносится на содержимое напрямую.
      if (e && e.preventDefault) e.preventDefault();
      refs.view.focus();
    });

    setStatus(store.available ? 'saved' : 'unavailable');
    ui.rebuildChrome();
    // Плавающий чат с менеджером (ИИ): есть только при заданном agentUrl (решает ui.renderChatWidget).
    if (ui.renderChatWidget) ui.renderChatWidget(document.body);
    if (MF.onLang) MF.onLang(function (code) { ui.rebuildChrome(); if (ui.renderChatWidget) ui.renderChatWidget(document.body); ui.render(); announceLang(code); });

    MF.ui.registerView('interview', renderInterview);
    MF.ui.registerView('notfound', renderNotFound);
    // Открытое подтверждение не переживает смену маршрута: иначе «ОК» выполнит действие уже на чужом экране.
    root.addEventListener('hashchange', function () { cancelConfirm(); ui.render(); });
    ui.render();
    refs.ready = true;
  };

  // Скрипты подключены с defer: во время их выполнения readyState равен interactive, запуск ждёт DOMContentLoaded.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', function () { ui.init(); });
  else root.setTimeout(function () { ui.init(); }, 0);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
