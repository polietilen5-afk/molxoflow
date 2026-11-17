/* Molxo Flow: дополнительные экраны воронки - квиз готовности к ИИ, галерея демо, «Мои заявки» (кабинет),
   коммерческое предложение и блок «Договориться о звонке». Работает только в браузере.
   Логика берётся из MF.* (quiz, offer, handoff, wizard); все тексты через MF.t; пользовательский текст - только textContent. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined' || !MF.ui || !MF.ui.el || !MF.ui.registerView) return;
  var ui = MF.ui, el = ui.el;
  var loadedAt = Date.now();

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- кабинет: история планов на этом устройстве ---------- */
  var cabinet = null;
  function cabinetStore() {
    if (!cabinet) cabinet = MF.createCabinetStore(MF.getLocalStorage());
    return cabinet;
  }
  // «Очистить данные проекта» стирает и кабинет; язык не трогается.
  if (ui.onClear) ui.onClear(function () { cabinetStore().clear(); });

  // Запись плана в кабинет (вызывается при «Отправить заявку»); пустой план не сохраняется.
  // После записи шапка перестраивается: пункт «Мои заявки» появляется, когда в кабинете есть записи.
  ui.saveToCabinet = function (w, plan) {
    if (!plan || !plan.ready || !plan.opportunities.length) return false;
    var first = byId(MF.SOLUTIONS, plan.opportunities[0].solutionId);
    var now = Date.now();
    var saved = cabinetStore().add({
      id: 'p' + now, savedAt: now, goal: w.goal, industry: w.industry || null,
      planTitle: first ? MF.t(first.titleKey) : '', statusCode: ''
    });
    if (saved && ui.rebuildChrome) ui.rebuildChrome();
    return saved;
  };

  // Пункт меню «Мои заявки» нужен, только если в кабинете есть записи или настроен приём или проверка статуса.
  // Прямой маршрут #/cabinet работает всегда.
  ui.cabinetNavVisible = function () {
    var has = false;
    try { has = cabinetStore().load().length > 0; } catch (e) { has = false; }
    return has || statusConfigured() || !!intakeHref();
  };

  /* ---------- общие помощники ---------- */
  function copier(getText, okKey) {
    var status = el('p', { class: 'copy-status small', role: 'status', 'aria-live': 'polite' });
    var manualNote = el('p', { class: 'pending small', hidden: true }, MF.t('plan.copyManual'));
    var manual = el('textarea', { class: 'answer plan-manual', rows: '8', readonly: true, hidden: true, 'aria-label': MF.t('plan.requestText') });
    function onClick() {
      var text = getText();
      var done = function () { status.textContent = MF.t(okKey); manual.hidden = true; manualNote.hidden = true; };
      var fail = function () {
        status.textContent = '';
        manual.value = text;
        manual.hidden = false; manualNote.hidden = false;
        manual.focus();
        manual.select();
      };
      if (ui.copyText) ui.copyText(text, done, fail); else fail();
    }
    return { status: status, manualNote: manualNote, manual: manual, onClick: onClick };
  }

  function dateLocale() { return MF.LANG === 'uk' ? 'uk-UA' : (MF.LANG === 'en' ? 'en-GB' : 'ru-RU'); }
  function dateText(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleDateString(dateLocale()); } catch (e) { return ''; }
  }

  // Чип-переключатель: aria-pressed, цель нажатия не меньше 44 px (css/start.css).
  function chip(label, on, onClick) {
    return el('button', { type: 'button', class: 'chip chip-choice' + (on ? ' is-on' : ''), 'aria-pressed': on ? 'true' : 'false', on: { click: onClick } }, label);
  }

  /* ---------- квиз ---------- */
  // Один вопрос на экран, как в мастере: прогресс из сегментов, «Назад», «Далее», «Пропустить» у необязательной отрасли, результат с крупным числом.
  // Мышь и касание переходят дальше через 180 мс; с клавиатуры (Enter, Пробел) ответ только отмечается, переход по «Далее».
  var quizAnswers = {};
  var quizShown = false;
  var quizStep = 0;
  var quizTimer = null;
  if (ui.onClear) ui.onClear(function () { quizAnswers = {}; quizShown = false; quizStep = 0; });

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function useGoal(res) {
    var w = ui.getWizard();
    var base = w.demo ? MF.emptyWizard() : w;
    var next = MF.setWizardGoal(base, res.goal);
    if (res.industry) next = MF.setWizardIndustry(next, res.industry);
    ui.saveWizard(next);
  }

  function renderQuiz(container) {
    var page = el('div', { class: 'page narrow quiz-page' });
    container.appendChild(page);
    page.appendChild(ui.pageHead(MF.t('route.quiz'), MF.t('quiz.title'), MF.t('quiz.lead')));
    var stage = el('div', { class: 'quiz-stage' });
    page.appendChild(stage);
    page.appendChild(el('p', { class: 'note quiz-foot' }, MF.t('quiz.note')));
    var total = MF.QUIZ.length;

    function restart() {
      quizAnswers = {}; quizShown = false; quizStep = 0;
      renderStep(true);
    }

    function renderStep(focus) {
      ui.clear(stage);
      if (quizTimer) { root.clearTimeout(quizTimer); quizTimer = null; }
      var i = quizStep, q = MF.QUIZ[i];
      var last = i === total - 1;
      var gid = 'quiz-q-' + q.id;

      function advance() {
        if (quizTimer) { root.clearTimeout(quizTimer); quizTimer = null; }
        if (last) { quizShown = true; renderResult(true); } else { quizStep = i + 1; renderStep(true); }
      }

      var segments = MF.QUIZ.map(function (x, k) {
        return el('li', { class: k < i ? 'is-done' : '', 'aria-current': k === i ? 'step' : null }, el('span', { class: 'visually-hidden' }, String(k + 1)));
      });
      stage.appendChild(el('div', { class: 'quiz-progress', role: 'group', 'aria-label': MF.t('quiz.step', { n: i + 1, total: total }) }, [
        el('p', { class: 'num quiz-count', 'aria-hidden': 'true' }, [el('b', null, pad2(i + 1)), ' / ' + pad2(total)]),
        i > 0 ? el('button', { type: 'button', class: 'link-btn quiz-back', on: { click: function () { quizStep = i - 1; renderStep(true); } } }, MF.t('quiz.back')) : null,
        el('ol', { class: 'quiz-segments' }, segments)
      ]));

      var heading = el('h2', { id: gid, class: 'quiz-question', tabindex: '-1' }, MF.t(q.labelKey));
      var next = el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () {
        if (!quizAnswers[q.id]) return;
        advance();
      } } }, last ? MF.t('quiz.submit') : MF.t('quiz.next'));
      var why = el('p', { id: 'quiz-next-why', class: 'btn-why' }, MF.t('quiz.pick'));
      var buttons = [];
      function refresh() {
        var picked = !!quizAnswers[q.id];
        buttons.forEach(function (b) { b.node.setAttribute('aria-pressed', quizAnswers[q.id] === b.id ? 'true' : 'false'); });
        next.className = 'btn btn-primary' + (picked ? '' : ' is-disabled');
        if (picked) { next.removeAttribute('aria-disabled'); next.removeAttribute('aria-describedby'); } else { next.setAttribute('aria-disabled', 'true'); next.setAttribute('aria-describedby', 'quiz-next-why'); }
        why.hidden = picked;
      }
      var options = q.options.map(function (o) {
        var b = el('button', { type: 'button', class: 'quiz-option', 'aria-pressed': 'false', on: { click: function (e) {
          quizAnswers[q.id] = o.id;
          refresh();
          // detail === 0: нажатие с клавиатуры, там без автоперехода
          if (e && e.detail === 0) return;
          if (quizTimer) root.clearTimeout(quizTimer);
          quizTimer = root.setTimeout(function () { quizTimer = null; if (quizStep === i && !quizShown) advance(); }, 180);
        } } }, [el('span', { class: 'quiz-dot', 'aria-hidden': 'true' }), el('span', { class: 'quiz-option-text' }, MF.t(o.labelKey))]);
        buttons.push({ id: o.id, node: b });
        return el('li', null, b);
      });
      var stepCard = el('section', { class: 'card quiz-step', 'aria-labelledby': gid }, [
        heading,
        el('ul', { class: 'quiz-options' + (q.kind === 'score' ? '' : ' is-two'), 'aria-labelledby': gid }, options),
        el('div', { class: 'quiz-nav' }, [
          el('div', { class: 'btn-with-why' }, [next, why]),
          q.kind === 'industry' ? el('button', { type: 'button', class: 'link-btn', on: { click: advance } }, MF.t('quiz.skip')) : null
        ])
      ]);
      stage.appendChild(stepCard);
      // вход карточки только при переходе по действию пользователя (не при первом показе и не при перерисовке)
      if (focus) stepCard.classList.add('is-enter');
      refresh();
      if (focus) heading.focus({ preventScroll: false });
    }

    function renderResult(focus) {
      ui.clear(stage);
      var res = MF.quizResult(quizAnswers);
      var title = el('h2', { id: 'quiz-res-title', class: 'block-title quiz-result-title', tabindex: '-1' }, MF.t('quiz.result.title'));
      var scoreText = MF.t('quiz.result.score', { score: res.score, max: res.max });
      var fill = el('div', { class: 'bar-fill' });
      ui.setProgress(fill, 0);
      var bar = el('div', { class: 'bar quiz-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(res.max), 'aria-valuenow': String(res.score), 'aria-label': scoreText }, fill);
      // шкала заполняется один раз: сначала ноль, на следующем кадре итог (переход transform в css)
      var later = root.requestAnimationFrame ? function (f) { root.requestAnimationFrame(function () { root.requestAnimationFrame(f); }); } : function (f) { f(); };
      later(function () { ui.setProgress(fill, res.max ? res.score / res.max : 0); });
      var ideas = res.ideas.map(function (id, k) {
        var s = byId(MF.SOLUTIONS, id);
        if (!s) return null;
        return el('li', { class: 'quiz-idea' }, [
          el('span', { class: 'num', 'aria-hidden': 'true' }, pad2(k + 1)),
          el('div', null, [el('p', { class: 'quiz-idea-title' }, MF.t(s.titleKey)), el('p', { class: 'quiz-idea-text' }, MF.t(s.changesKey))])
        ]);
      });
      // Число в кружке сразу итоговое (без «набегания»): иначе при снимке посреди счёта оно расходится с текстом «N из M».
      var scoreNum = el('span', { class: 'cnt' }, String(res.score));
      var toWizard = '#/start' + (res.goal ? '/' + res.goal + (res.industry ? '/' + res.industry : '') : '');
      var resultCard = el('section', { class: 'quiz-result', 'aria-labelledby': 'quiz-res-title' }, [
        title,
        el('div', { class: 'quiz-result-head' }, [
          el('p', { class: 'num quiz-score' }, [el('span', { 'aria-hidden': 'true' }, [scoreNum, el('span', { class: 'quiz-score-max' }, '/' + res.max)]), el('span', { class: 'visually-hidden' }, scoreText)]),
          el('p', { class: 'quiz-level' }, [el('strong', null, MF.t('quiz.level.' + res.level)), MF.t('quiz.level.' + res.level + '.text')])
        ]),
        bar,
        el('h3', { class: 'group-title' }, MF.t('quiz.ideas.title')),
        el('p', { class: 'muted' }, MF.t('quiz.ideas.lead')),
        el('ol', { class: 'quiz-ideas' }, ideas),
        el('p', { class: 'note' }, MF.t('quiz.disclaimer')),
        el('div', { class: 'quiz-result-actions' }, [
          el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { useGoal(res); ui.go('plan'); } } }, MF.t('quiz.toPlan')),
          el('a', { href: toWizard, class: 'btn btn-secondary' }, MF.t('quiz.toWizard')),
          el('button', { type: 'button', class: 'link-btn quiz-edit', on: { click: function () { quizShown = false; quizStep = total - 1; renderStep(true); } } }, MF.t('quiz.back')),
          el('button', { type: 'button', class: 'link-btn quiz-again', on: { click: restart } }, MF.t('quiz.reset'))
        ])
      ]);
      stage.appendChild(resultCard);
      if (focus) resultCard.classList.add('is-enter');
      if (focus) title.focus({ preventScroll: false });
    }

    if (quizShown && MF.QUIZ.every(function (q) { return q.kind === 'industry' || !!quizAnswers[q.id]; })) renderResult(false);
    else { quizShown = false; renderStep(false); }
  }

  /* ---------- галерея демо ---------- */
  // Знаки отраслей (те же, что на отраслевых страницах): inline-SVG, цвет currentColor.
  var INDUSTRY_ICONS = {
    'real-estate': [['path', { d: 'M3 11.5 12 4l9 7.5' }], ['path', { d: 'M5.5 10v10h13V10' }], ['path', { d: 'M10 20v-5.5h4V20' }]],
    auto: [['path', { d: 'M4 15.5 5.7 10a2 2 0 0 1 1.9-1.4h8.8A2 2 0 0 1 18.3 10L20 15.5' }], ['path', { d: 'M3 15.5h18V19H3z' }], ['circle', { cx: '7.5', cy: '19', r: '1.6' }], ['circle', { cx: '16.5', cy: '19', r: '1.6' }]],
    trade: [['path', { d: 'M5 8h14l-1 12H6L5 8z' }], ['path', { d: 'M9 8V6.5a3 3 0 0 1 6 0V8' }]],
    marketing: [['path', { d: 'M3 5h18l-7 8v6l-4-2v-4L3 5z' }]],
    services: [['path', { d: 'M4 5h16v11H9.5L4 20V5z' }], ['path', { d: 'M8 9.5h8' }], ['path', { d: 'M8 12.5h5' }]]
  };
  function iconSvg(cls, size, vb, parts) {
    return ui.svg('svg', {
      viewBox: vb, width: String(size), height: String(size), fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'aria-hidden': 'true', focusable: 'false', 'class': cls
    }, parts.map(function (p) { return ui.svg(p[0], p[1]); }));
  }

  function renderDemos(container) {
    var page = el('div', { class: 'page narrow demos-page' });
    container.appendChild(page);
    page.appendChild(ui.pageHead(ui.routeLabel('demos'), MF.t('demos.title'), MF.t('demos.lead')));
    page.appendChild(el('p', { class: 'note' }, MF.t('demos.note')));
    page.appendChild(el('ul', { class: 'demo-list', 'aria-label': MF.t('demos.title') }, MF.WIZARD_DEMOS.map(function (d, k) {
      var ind = byId(MF.INDUSTRIES, d.wizard && d.wizard.industry);
      var icon = ind && INDUSTRY_ICONS[ind.id];
      return el('li', null, el('a', { href: '#/demo/' + d.id, class: 'demo-row' }, [
        icon ? iconSvg('demo-mark', 28, '0 0 24 24', icon) : el('span', { class: 'num demo-idx', 'aria-hidden': 'true' }, pad2(k + 1)),
        el('span', { class: 'demo-body' }, [
          el('span', { class: 'result-title' }, MF.t(d.titleKey)),
          el('span', { class: 'small muted' }, MF.t(d.descKey || 'demo.' + d.id + '.desc')),
          el('span', { class: 'demo-tags' }, [
            el('span', { class: 'tag-assume' }, MF.t('home.demo.tag')),
            ind ? el('span', { class: 'tag-plain' }, MF.t(ind.titleKey)) : null
          ])
        ]),
        iconSvg('demo-arrow', 20, '0 0 20 20', [['path', { d: 'M4 10h11M11 5.5 15.5 10 11 14.5' }]])
      ]));
    })));
  }

  /* ---------- «Мои заявки» ---------- */
  // Адрес приёма заявок Control Center: хост без схемы в MF.CONFIG.intakeUrl; ссылка наследует схему страницы.
  function intakeHref() {
    var v = MF.CONFIG && typeof MF.CONFIG.intakeUrl === 'string' ? MF.CONFIG.intakeUrl.trim() : '';
    if (v.length > 253 || !/^[a-z0-9.-]+$/i.test(v) || v.indexOf('.') < 1 || /\.\.|^[.-]|[.-]$/.test(v)) return '';
    return '/' + '/' + v + '/';
  }

  function statusConfigured() { return MF.statusLink ? MF.statusLink('x').ok : false; }

  function renderCabinet(container) {
    var store = cabinetStore();
    var page = el('div', { class: 'page cabinet-page' });
    container.appendChild(page);
    page.appendChild(ui.pageHead(ui.routeLabel('cabinet'), MF.t('cabinet.title'), MF.t('cabinet.lead')));
    if (!store.available) page.appendChild(el('p', { class: 'note is-warn', role: 'note' }, MF.t('cabinet.unavailable')));

    /* история: лента времени; пусто — экран-приглашение с одной кнопкой */
    var listBox = el('div', { class: 'cabinet-list' });
    function renderList() {
      ui.clear(listBox);
      var entries = store.load();
      if (!entries.length) {
        listBox.appendChild(ui.empty({ pic: 'privacy', title: MF.t('empty.cabinet.title'), text: MF.t('cabinet.empty'), actions: [
          el('a', { href: '#/start', class: 'btn btn-primary' }, MF.t('plan.toStart'))
        ] }));
        return;
      }
      listBox.appendChild(el('ul', { class: 'cabinet-entries', 'aria-label': MF.t('cabinet.history') }, entries.map(function (e) {
        var goal = byId(MF.GOALS, e.goal), industry = byId(MF.INDUSTRIES, e.industry);
        var tags = [];
        var date = dateText(e.savedAt);
        if (goal) tags.push(MF.t('req.goal', { name: MF.t(goal.titleKey) }));
        if (industry) tags.push(MF.t('req.industry', { name: MF.t(industry.titleKey) }));
        return el('li', { class: 'entry' }, [
          date ? el('span', { class: 'num entry-date' }, MF.t('cabinet.entry.date', { date: date })) : null,
          el('h3', { class: 'entry-title' }, e.planTitle || MF.t('cabinet.untitled')),
          tags.length ? el('p', { class: 'entry-tags' }, tags.map(function (t) { return el('span', { class: 'tag-plain' }, t); })) : null,
          e.statusCode ? el('p', { class: 'num entry-code' }, MF.t('cabinet.entry.code', { code: e.statusCode })) : null
        ]);
      })));
    }
    var history = el('section', { class: 'cabinet-history', 'aria-labelledby': 'cab-history-title' }, [
      el('h2', { id: 'cab-history-title', class: 'block-title' }, MF.t('cabinet.history')),
      listBox
    ]);
    renderList();

    var side = [];
    /* статус по коду: блок есть, только когда владелец указал адрес (statusUrl); иначе нейтральная фраза или ничего */
    if (!statusConfigured()) {
      var soonKind = MF.contactLink('x').kind;
      if (soonKind === 'telegram' || soonKind === 'mailto') {
        side.push(el('p', { class: 'note cabinet-soon', role: 'note' }, MF.t(soonKind === 'mailto' ? 'cabinet.status.soonMail' : 'cabinet.status.soon')));
      }
    } else {
      var codeInput = el('input', { id: 'cab-code', type: 'text', class: 'answer field-input', maxlength: '200', autocomplete: 'off', 'aria-describedby': 'cab-code-hint' });
      var actionBox = el('div', { class: 'cabinet-action' });
      var rememberNote = el('p', { class: 'copy-status small', role: 'status', 'aria-live': 'polite' });
      var refreshStatus = function () {
        ui.clear(actionBox);
        var link = MF.statusLink(codeInput.value.trim());
        if (!link.ok) {
          // aria-disabled вместо disabled: кнопка остаётся в Tab, причина в подсказке рядом.
          actionBox.appendChild(el('button', { type: 'button', class: 'btn btn-secondary is-disabled', 'aria-disabled': 'true', 'aria-describedby': 'cab-status-why' }, MF.t('cabinet.status.check')));
          actionBox.appendChild(el('p', { id: 'cab-status-why', class: 'btn-why' }, MF.t('cabinet.status.enter')));
          return;
        }
        actionBox.appendChild(el('a', { href: link.href, class: 'btn btn-secondary' }, MF.t('cabinet.status.check')));
        actionBox.appendChild(el('p', { class: 'btn-why' }, MF.t('cabinet.status.note')));
      };
      codeInput.addEventListener('input', function () { rememberNote.textContent = ''; refreshStatus(); });
      var remember = el('button', { type: 'button', class: 'btn btn-secondary', on: { click: function () {
        var code = codeInput.value.trim();
        var entries = store.load();
        if (!code) { rememberNote.textContent = MF.t('cabinet.status.enter'); return; }
        if (!entries.length) { rememberNote.textContent = MF.t('cabinet.status.noEntry'); return; }
        var latest = entries[0];
        latest.statusCode = code;
        rememberNote.textContent = store.add(latest) ? MF.t('cabinet.status.saved') : MF.t('cabinet.unavailable');
        renderList();
      } } }, MF.t('cabinet.status.remember'));
      side.push(el('section', { class: 'card cabinet-status', 'aria-labelledby': 'cab-status-title' }, [
        el('h2', { id: 'cab-status-title', class: 'card-title' }, MF.t('cabinet.status.title')),
        el('label', { 'for': 'cab-code', class: 'field-label' }, MF.t('cabinet.status.label')),
        codeInput,
        el('p', { id: 'cab-code-hint', class: 'small muted' }, MF.t('cabinet.status.hint')),
        el('div', { class: 'plan-actions' }, [actionBox, remember]),
        rememberNote
      ]));
      refreshStatus();
    }

    /* передача заявки разработчикам: главная кнопка блока — «Открыть приём» при заданном intakeUrl, иначе «Скачать пакет» */
    var w = ui.getWizard();
    var href = intakeHref();
    var ready = !!w.goal;
    var sendNode = href ? el('a', { href: href, class: 'btn btn-primary' }, MF.t('cabinet.send.open')) : null;
    // Без цели файл собрать нельзя: aria-disabled (кнопка остаётся в Tab), причина текстом рядом.
    var bundleBtn = el('button', { type: 'button', class: 'btn ' + (href ? 'btn-secondary' : 'btn-primary') + (ready ? '' : ' is-disabled'), 'aria-disabled': ready ? null : 'true', 'aria-describedby': ready ? null : 'cab-bundle-need', on: { click: function () {
      if (!ui.download || !ui.getWizard().goal) return;
      var bundle = MF.handoffBundle(ui.getWizard(), ui.state.answers, { elapsedMs: Date.now() - loadedAt });
      ui.download('molxo-centr-handoff.json', MF.handoffJson(bundle), 'application/json');
    } } }, MF.t('cabinet.bundle'));
    side.push(el('section', { class: 'card send-card', 'aria-labelledby': 'cab-send-title' }, [
      el('h2', { id: 'cab-send-title', class: 'card-title' }, MF.t('cabinet.send.title')),
      href ? el('p', { class: 'muted' }, MF.t('cabinet.send.text')) : null,
      el('div', { class: 'send-actions' }, [sendNode, bundleBtn]),
      el('p', { class: 'small muted' }, MF.t('cabinet.bundle.note')),
      ready ? null : el('p', { id: 'cab-bundle-need', class: 'btn-why', role: 'note' }, MF.t('cabinet.bundle.need'))
    ]));

    // Пустая история: призыв один («Выбрать цель»), блоки отправки и статуса свёрнуты.
    var hasEntries = store.load().length > 0;
    var sideBox = hasEntries
      ? el('div', { class: 'cabinet-side' }, side)
      : el('details', { class: 'block-more cabinet-side' }, [el('summary', null, MF.t('cabinet.more')), el('div', { class: 'block-more-body' }, side)]);
    page.appendChild(el('div', { class: 'cabinet-layout' + ((statusConfigured() || href) ? ' has-side' : '') }, [history, sideBox]));
    page.appendChild(el('p', { class: 'note cabinet-clear' }, MF.t('cabinet.clearNote', { button: MF.t('shell.clear.button') })));
  }

  /* ---------- коммерческое предложение ---------- */
  function renderOffer(container) {
    var w = ui.getWizard();
    var plan = MF.buildPlan(w, ui.state.assumptions);
    var page = el('div', { class: 'page narrow offer-page' });
    container.appendChild(page);
    if (!plan.ready) {
      page.appendChild(ui.pageHead(ui.routeLabel('offer'), MF.t('offer.title'), null));
      page.appendChild(ui.empty({ pic: 'docs', title: MF.t('empty.offer.title'), text: MF.t('offer.empty'), actions: [
        el('a', { href: '#/start', class: 'btn btn-primary' }, MF.t('plan.toStart'))
      ] }));
      return;
    }
    page.appendChild(ui.pageHead(ui.routeLabel('offer'), MF.t('offer.title'), MF.t('offer.lead')));
    // Подсветка только у уровня, подходящего под бюджет клиента (MF.matchTier вернёт null без однозначного совпадения).
    var fit = MF.matchTier ? MF.matchTier(w) : null;
    // Цен нет вовсе: заглушка стоит один раз, в тексте предложения ниже, а не в каждой карточке.
    page.appendChild(el('div', { class: 'tiers offer-tiers page-wide' }, ['start', 'grow', 'scale'].map(function (l) {
      var price = plan.prices && plan.prices[l];
      return el('section', { class: 'card tier-card tier-' + l + (fit === l ? ' is-fit' : ''), 'aria-labelledby': 'offer-tier-' + l }, [
        fit === l ? el('p', { class: 'tier-flag' }, MF.t('plan.tier.fit')) : null,
        ui.tierTitle(l, 'offer-tier-' + l, 'h2'),
        price ? el('p', { class: 'tier-price tier-price-big' }, price) : null,
        el('p', { class: 'tier-lead muted' }, MF.t('tier.' + l + '.lead')),
        el('ul', { class: 'tier-items' }, plan.tiers[l].map(function (k) { return el('li', null, MF.t(k)); }))
      ]);
    })));
    // Оговорки отдельным блоком, не внутри текста предложения.
    page.appendChild(el('div', { class: 'note is-warn offer-terms', role: 'note' }, [
      el('p', { class: 'mono-label' }, MF.t('offer.terms')),
      el('p', null, MF.t('offer.prelim'))
    ]));
    function current() { return MF.buildOffer(ui.getWizard(), MF.buildPlan(ui.getWizard(), ui.state.assumptions)).text; }
    page.appendChild(el('section', { class: 'offer-text', role: 'region', tabindex: '0', 'aria-label': MF.t('offer.title') }, current()));
    var c = copier(current, 'offer.copied');
    page.appendChild(el('div', { class: 'offer-actions' }, [
      el('button', { type: 'button', class: 'btn btn-primary', on: { click: c.onClick } }, MF.t('offer.copy')),
      el('button', { type: 'button', class: 'btn btn-secondary', on: { click: function () {
        if (ui.download) ui.download('molxo-flow-offer.txt', current(), 'text/plain;charset=utf-8');
      } } }, MF.t('offer.download')),
      el('a', { href: '#/plan', class: 'link-btn' }, MF.t('route.plan'))
    ]));
    page.appendChild(c.status);
    page.appendChild(c.manualNote);
    page.appendChild(c.manual);
  }

  /* ---------- «Договориться о звонке» (блок на странице плана) ---------- */
  var WINDOWS = ['morning', 'day', 'evening'];
  var call = { windows: [], tz: null, topic: '' };
  function detectTz() {
    try { return String((root.Intl && root.Intl.DateTimeFormat().resolvedOptions().timeZone) || ''); } catch (e) { return ''; }
  }
  if (ui.onClear) ui.onClear(function () { call = { windows: [], tz: null, topic: '' }; });

  ui.renderCallBlock = function (container) {
    if (call.tz === null) call.tz = detectTz();
    function text() {
      return MF.callText({
        windows: WINDOWS.filter(function (id) { return call.windows.indexOf(id) >= 0; }).map(function (id) { return MF.t('call.win.' + id); }),
        tz: call.tz, topic: call.topic
      });
    }
    var link = MF.contactLink(text());
    // Без канала связи кнопка не disabled, а aria-disabled: остаётся в Tab, причина названа в подсказке рядом.
    var action = link.kind === 'none'
      ? el('button', { type: 'button', class: 'btn btn-primary is-disabled', 'aria-disabled': 'true', 'aria-describedby': 'call-no-contact' }, MF.t('call.send'))
      : el('a', { href: link.href, class: 'btn btn-primary' }, MF.t('call.send'));
    function refresh() {
      if (link.kind === 'mailto') action.setAttribute('href', MF.contactLink(text()).href);
    }
    var chips = WINDOWS.map(function (id) {
      var b = chip(MF.t('call.win.' + id), call.windows.indexOf(id) >= 0, function () {
        var on = call.windows.indexOf(id) < 0;
        call.windows = on ? call.windows.concat([id]) : call.windows.filter(function (x) { return x !== id; });
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.className = 'chip chip-choice' + (on ? ' is-on' : '');
        refresh();
      });
      return el('li', null, b);
    });
    var tz = el('input', { id: 'call-tz', type: 'text', class: 'answer field-input', maxlength: '64', value: call.tz, autocomplete: 'off' });
    tz.addEventListener('input', function () { call.tz = tz.value; refresh(); });
    var topic = el('input', { id: 'call-topic', type: 'text', class: 'answer field-input', maxlength: '300', value: call.topic, autocomplete: 'off' });
    topic.addEventListener('input', function () { call.topic = topic.value; refresh(); });
    var c = copier(text, 'call.copied');
    // Форма звонка свёрнута: на странице плана главный призыв один, «Отправить заявку по этому плану».
    var panel = el('div', { id: 'call-panel', class: 'card call-panel', 'aria-labelledby': 'call-title', hidden: true }, [
      el('h2', { id: 'call-title', class: 'card-title' }, MF.t('call.title')),
      el('p', { class: 'muted' }, MF.t('call.lead')),
      el('div', { class: 'call-field', role: 'group', 'aria-labelledby': 'call-win-label' }, [
        el('p', { id: 'call-win-label', class: 'field-label' }, MF.t('call.label.windows')),
        el('ul', { class: 'chips wizard-options' }, chips)
      ]),
      el('div', { class: 'call-field' }, [el('label', { 'for': 'call-tz', class: 'field-label' }, MF.t('call.label.tz')), tz]),
      el('div', { class: 'call-field' }, [el('label', { 'for': 'call-topic', class: 'field-label' }, MF.t('call.label.topic')), topic]),
      el('div', { class: 'plan-actions' }, [
        action,
        el('button', { type: 'button', class: 'btn btn-secondary', on: { click: c.onClick } }, MF.t('call.copy'))
      ]),
      link.kind === 'none' ? el('p', { id: 'call-no-contact', class: 'contact-missing', role: 'note' }, MF.t('plan.contactMissing')) : null,
      link.kind === 'telegram' ? el('p', { class: 'request-hint small muted', role: 'note' }, MF.t('call.telegramHint')) : null,
      c.status, c.manualNote, c.manual
    ]);
    var toggle = el('button', { type: 'button', class: 'link-btn call-toggle', 'aria-expanded': 'false', 'aria-controls': 'call-panel', on: { click: function () {
      var open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    } } }, MF.t('call.button'));
    var card = el('section', { class: 'call-card', 'aria-label': MF.t('call.button') }, [toggle, panel]);
    container.appendChild(card);
    return card;
  };

  ui.registerView('quiz', renderQuiz);
  ui.registerView('demos', renderDemos);
  ui.registerView('cabinet', renderCabinet);
  ui.registerView('offer', renderOffer);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
