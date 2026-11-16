/* Molxo Flow: роутер, шапка, подвал, интервью и боковая панель. Работает только в браузере. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined') return;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ROUTE_TITLES = { home: 'Главная', interview: 'Требования', studio: 'Студия', docs: 'Документы', method: 'Методика' };
  var NAV = [['interview', 'Требования'], ['studio', 'Студия'], ['docs', 'Документы']];
  var PENDING = 'Нужно уточнить';

  var ui = MF.ui = MF.ui || {};
  var views = {};
  var store = null;
  var refs = {};
  var currentRoute = '';
  var focusAnswerNext = false;
  var statusMode = 'saved';

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
    var text = mode === 'saved' ? 'Сохранено' : mode === 'cleared' ? 'Данные очищены' : 'Не сохраняется (хранилище недоступно)';
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
    refs.dialogOk.textContent = opts.okLabel || 'Подтвердить';
    refs.dialogCancel.textContent = opts.cancelLabel || 'Отмена';
    dlg.returnValue = '';
    dlg.onclose = function () {
      dlg.onclose = null;
      if (dlg.returnValue === 'ok') onOk();
    };
    dlg.showModal();
  }
  ui.confirm = confirmAction;

  function buildDialog() {
    var title = el('h2', { id: 'dialog-title', class: 'dialog-title' });
    var text = el('p', { id: 'dialog-text', class: 'dialog-text' });
    var cancel = el('button', { type: 'button', class: 'btn btn-secondary', autofocus: true });
    var ok = el('button', { type: 'button', class: 'btn btn-danger' });
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
      confirmAction({ title: 'Заменить ваши ответы демо-примером?', text: 'Ваши текущие ответы будут заменены вымышленным примером «Обработка заявок». Вернуть их потом не получится.', okLabel: 'Заменить демо-примером' }, then);
    } else then();
  };

  // Вернуться к пустому проекту (из демо или по кнопке «Начать свой проект»).
  ui.backToEmpty = function (opts) {
    var then = function () {
      ui.setState(MF.resetProject());
      if (opts && opts.go) ui.go(opts.go);
    };
    if (ui.state.demo && demoEdited(ui.state)) {
      confirmAction({ title: 'Вернуться к пустому проекту?', text: 'Вы меняли демо-ответы. Эти правки будут потеряны.', okLabel: 'Вернуться к пустому проекту' }, then);
    } else then();
  };

  function clearProject() {
    confirmAction({
      title: 'Очистить данные проекта?',
      text: 'Все ответы и допущения будут удалены с этого устройства. Это действие нельзя отменить.',
      okLabel: 'Очистить данные'
    }, function () {
      store.clear();
      ui.state = MF.resetProject();
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
    return ROUTE_TITLES[name] ? name : 'home';
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
    var navLinks = NAV.map(function (n) {
      return el('a', { href: '#/' + n[0], 'data-route': n[0], class: 'nav-link' }, n[1]);
    });
    refs.navLinks = navLinks;
    refs.methodLink = el('a', { href: '#/method', 'data-route': 'method', class: 'nav-link nav-method' }, 'Методика');
    header.className = 'app-header';
    header.appendChild(el('div', { class: 'header-inner' }, [
      el('a', { href: '#/', class: 'brand', 'aria-label': 'Molxo Flow — на главную' }, [logo(), el('span', { class: 'brand-name' }, 'Molxo Flow')]),
      el('nav', { class: 'main-nav', 'aria-label': 'Разделы' }, navLinks),
      el('div', { class: 'header-tools' }, [refs.status, refs.methodLink])
    ]));
  }

  function markNav(route) {
    refs.navLinks.concat([refs.methodLink]).forEach(function (a) {
      if (a.getAttribute('data-route') === route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function renderBanner() {
    var b = refs.banner;
    clear(b);
    if (!ui.state.demo) { b.hidden = true; return; }
    b.hidden = false;
    b.appendChild(el('div', { class: 'banner-inner' }, [
      el('p', { class: 'banner-text' }, [el('strong', null, 'Это демо-пример. '), 'Ответы вымышлены, их можно править или начать с пустого проекта.']),
      el('button', { type: 'button', class: 'btn btn-secondary btn-small', on: { click: function () { ui.backToEmpty(); } } }, 'Вернуться к пустому проекту')
    ]));
  }

  function placeholder(container, name) {
    container.appendChild(el('section', { class: 'page narrow' }, [
      el('h1', { class: 'page-title' }, ROUTE_TITLES[name] || 'Раздел'),
      el('p', { class: 'lead' }, 'Этот раздел пока не готов. Вы можете продолжить работу в других разделах.'),
      el('a', { href: '#/', class: 'btn btn-secondary' }, 'На главную')
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
    var fn = views[route];
    try {
      if (fn) fn(container, { state: ui.state, setState: ui.setState, go: ui.go });
      else placeholder(container, route);
    } catch (e) {
      clear(container);
      container.appendChild(el('section', { class: 'page narrow' }, [
        el('h1', { class: 'page-title' }, 'Что-то пошло не так'),
        el('p', { class: 'lead' }, 'Раздел не удалось показать. Обновите страницу — ваши ответы сохранены на этом устройстве.')
      ]));
      if (root.console && root.console.warn) root.console.warn('Molxo Flow: ошибка показа раздела', e);
    }
    document.title = (route === 'home' ? '' : ROUTE_TITLES[route] + ' — ') + 'Molxo Flow';
    if (changed && refs.ready) {
      root.scrollTo(0, 0);
      container.focus({ preventScroll: true });
    }
  };

  /* ---------- интервью ---------- */
  function sectionOf(q) {
    for (var i = 0; i < MF.SECTIONS.length; i++) if (MF.SECTIONS[i].id === q.section) return MF.SECTIONS[i];
    return { title: '' };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function renderInterview(container) {
    var state = ui.state;
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

    var back = el('button', { type: 'button', class: 'btn btn-secondary', disabled: state.current <= 1, on: { click: function () {
      focusAnswerNext = true; ui.setState(MF.setCurrent(ui.state, state.current - 1));
    } } }, 'Назад');
    var next = state.current >= total
      ? el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { ui.go('docs'); } } }, 'К документам →')
      : el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () {
        focusAnswerNext = true; ui.setState(MF.setCurrent(ui.state, state.current + 1));
      } } }, 'Следующий вопрос');

    var card = el('section', { class: 'card question-card', 'aria-labelledby': 'q-title' }, [
      el('p', { class: 'eyebrow' }, ['ВОПРОС ' + pad2(q.n) + ' / ' + total, el('span', { class: 'eyebrow-section' }, ' · ' + sectionOf(q).title)]),
      el('h1', { id: 'q-title', class: 'question-title' }, q.title),
      el('p', { id: 'q-hint', class: 'hint' }, q.hint),
      area,
      el('p', { class: 'chips-label' }, 'Примеры — нажмите, чтобы подставить:'),
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

    var side = el('aside', { class: 'workspace-side', 'aria-label': 'Живая схема' });
    var main = el('div', { class: 'workspace-main' }, [card, navigator]);
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
    sb.coreBar.firstChild.style.width = Math.round(sum.core.ready / sum.core.total * 100) + '%';
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

    refs.banner = el('div', { id: 'demo-banner', class: 'demo-banner', role: 'region', 'aria-label': 'Демо-режим', hidden: true });
    refs.view.parentNode.insertBefore(refs.banner, refs.view);

    refs.footer = el('footer', { class: 'app-footer', id: 'app-footer' }, el('div', { class: 'footer-inner' }, [
      el('p', { class: 'footer-note' }, 'Данные хранятся только на этом устройстве, в браузере. Ничего не отправляется в сеть.'),
      el('button', { type: 'button', class: 'btn btn-secondary btn-small', id: 'clear-data', on: { click: clearProject } }, 'Очистить данные проекта')
    ]));
    refs.view.parentNode.insertBefore(refs.footer, refs.view.nextSibling);
    document.body.appendChild(buildDialog());

    buildHeader();
    setStatus(store.available ? 'saved' : 'unavailable');

    MF.ui.registerView('interview', renderInterview);
    root.addEventListener('hashchange', ui.render);
    ui.render();
    refs.ready = true;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ui.init(); });
  else root.setTimeout(function () { ui.init(); }, 0);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
