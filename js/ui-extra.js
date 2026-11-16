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

  // Запись плана в кабинет (вызывается при «Получить предложение»); пустой план не сохраняется.
  ui.saveToCabinet = function (w, plan) {
    if (!plan || !plan.ready || !plan.opportunities.length) return false;
    var first = byId(MF.SOLUTIONS, plan.opportunities[0].solutionId);
    var now = Date.now();
    return cabinetStore().add({
      id: 'p' + now, savedAt: now, goal: w.goal, industry: w.industry || null,
      planTitle: first ? MF.t(first.titleKey) : '', statusCode: ''
    });
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
  var quizAnswers = {};
  var quizShown = false;
  if (ui.onClear) ui.onClear(function () { quizAnswers = {}; quizShown = false; });

  function quizComplete() {
    return MF.QUIZ.every(function (q) { return q.kind === 'industry' || !!quizAnswers[q.id]; });
  }

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
    page.appendChild(el('h1', { class: 'page-title' }, MF.t('quiz.title')));
    page.appendChild(el('p', { class: 'lead' }, MF.t('quiz.lead')));

    var resultBox = el('section', { class: 'card quiz-result', 'aria-live': 'polite', hidden: true });
    var need = el('p', { class: 'pending small', role: 'alert', hidden: true }, MF.t('quiz.needAll'));

    function renderResult() {
      ui.clear(resultBox);
      if (!quizShown) { resultBox.hidden = true; return; }
      var res = MF.quizResult(quizAnswers);
      resultBox.hidden = false;
      var title = el('h2', { id: 'quiz-res-title', class: 'card-title', tabindex: '-1' }, MF.t('quiz.result.title'));
      var ideas = res.ideas.map(function (id) {
        var s = byId(MF.SOLUTIONS, id);
        if (!s) return null;
        return el('li', { class: 'card opp-card' }, [
          el('h3', { class: 'opp-title' }, MF.t(s.titleKey)),
          el('p', { class: 'opp-changes' }, MF.t(s.changesKey))
        ]);
      });
      var toWizard = '#/start' + (res.goal ? '/' + res.goal + (res.industry ? '/' + res.industry : '') : '');
      resultBox.appendChild(title);
      resultBox.appendChild(el('p', { class: 'quiz-score' }, MF.t('quiz.result.score', { score: res.score, max: res.max })));
      resultBox.appendChild(el('p', { class: 'quiz-level' }, [el('strong', null, MF.t('quiz.level.' + res.level)), ' ', MF.t('quiz.level.' + res.level + '.text')]));
      resultBox.appendChild(el('h3', { class: 'section-sub' }, MF.t('quiz.ideas.title')));
      resultBox.appendChild(el('p', { class: 'muted' }, MF.t('quiz.ideas.lead')));
      resultBox.appendChild(el('ol', { class: 'opp-list quiz-ideas' }, ideas));
      resultBox.appendChild(el('p', { class: 'small muted' }, MF.t('quiz.disclaimer')));
      resultBox.appendChild(el('div', { class: 'plan-links' }, [
        el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { useGoal(res); ui.go('plan'); } } }, MF.t('quiz.toPlan')),
        el('a', { href: toWizard, class: 'btn btn-secondary' }, MF.t('quiz.toWizard'))
      ]));
      title.focus({ preventScroll: false });
    }

    MF.QUIZ.forEach(function (q) {
      var buttons = [];
      function refresh() {
        buttons.forEach(function (b) {
          var on = quizAnswers[q.id] === b.id;
          b.node.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.node.className = 'chip chip-choice' + (on ? ' is-on' : '');
        });
      }
      var gid = 'quiz-q-' + q.id;
      var list = el('ul', { class: 'chips wizard-options', 'aria-labelledby': gid }, q.options.map(function (o) {
        var b = chip(MF.t(o.labelKey), false, function () {
          quizAnswers[q.id] = quizAnswers[q.id] === o.id ? '' : o.id;
          quizShown = false;
          need.hidden = true;
          refresh();
          renderResult();
        });
        buttons.push({ id: o.id, node: b });
        return el('li', null, b);
      }));
      page.appendChild(el('div', { class: 'wizard-group quiz-group', role: 'group', 'aria-labelledby': gid }, [
        el('h2', { id: gid, class: 'group-title' }, q.kind === 'industry' ? MF.t(q.labelKey) + ' (' + MF.t('quiz.optional') + ')' : MF.t(q.labelKey)),
        list
      ]));
      refresh();
    });

    page.appendChild(need);
    page.appendChild(el('div', { class: 'plan-links quiz-actions' }, [
      el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () {
        if (!quizComplete()) { need.hidden = false; return; }
        need.hidden = true;
        quizShown = true;
        renderResult();
      } } }, MF.t('quiz.submit')),
      el('button', { type: 'button', class: 'btn btn-secondary', on: { click: function () { quizAnswers = {}; quizShown = false; ui.render(); } } }, MF.t('quiz.reset'))
    ]));
    page.appendChild(resultBox);
    page.appendChild(el('p', { class: 'small muted' }, MF.t('quiz.note')));
    renderResult();
  }

  /* ---------- галерея демо ---------- */
  function renderDemos(container) {
    var page = el('div', { class: 'page demos-page' });
    container.appendChild(page);
    page.appendChild(el('h1', { class: 'page-title' }, MF.t('demos.title')));
    page.appendChild(el('p', { class: 'lead' }, MF.t('demos.lead')));
    page.appendChild(el('ul', { class: 'demo-grid', 'aria-label': MF.t('demos.title') }, MF.WIZARD_DEMOS.map(function (d) {
      return el('li', null, el('a', { href: '#/demo/' + d.id, class: 'card demo-card' }, [
        el('span', { class: 'tag-assume' }, MF.t('home.demo.tag')),
        el('span', { class: 'result-title' }, MF.t(d.titleKey)),
        d.descKey ? el('span', { class: 'small muted' }, MF.t(d.descKey)) : null,
        el('span', { class: 'result-more', 'aria-hidden': 'true' }, MF.t('home.demo.open'))
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

  function renderCabinet(container) {
    var store = cabinetStore();
    var page = el('div', { class: 'page narrow cabinet-page' });
    container.appendChild(page);
    page.appendChild(el('h1', { class: 'page-title' }, MF.t('cabinet.title')));
    page.appendChild(el('p', { class: 'lead' }, MF.t('cabinet.lead')));
    if (!store.available) page.appendChild(el('p', { class: 'pending', role: 'note' }, MF.t('cabinet.unavailable')));

    /* история */
    var listBox = el('div', { class: 'cabinet-list' });
    function renderList() {
      ui.clear(listBox);
      var entries = store.load();
      if (!entries.length) { listBox.appendChild(el('p', { class: 'muted' }, MF.t('cabinet.empty'))); return; }
      listBox.appendChild(el('ul', { class: 'cabinet-entries', 'aria-label': MF.t('cabinet.history') }, entries.map(function (e) {
        var goal = byId(MF.GOALS, e.goal), industry = byId(MF.INDUSTRIES, e.industry);
        var meta = [];
        var date = dateText(e.savedAt);
        if (date) meta.push(MF.t('cabinet.entry.date', { date: date }));
        if (goal) meta.push(MF.t('req.goal', { name: MF.t(goal.titleKey) }));
        if (industry) meta.push(MF.t('req.industry', { name: MF.t(industry.titleKey) }));
        return el('li', { class: 'card cabinet-entry' }, [
          el('h3', { class: 'opp-title' }, e.planTitle || MF.t('cabinet.untitled')),
          meta.length ? el('p', { class: 'small muted' }, meta.join(' · ')) : null,
          e.statusCode ? el('p', { class: 'small' }, MF.t('cabinet.entry.code', { code: e.statusCode })) : null
        ]);
      })));
    }

    /* статус по коду */
    var statusConfigured = MF.statusLink ? MF.statusLink('x').ok : false;
    var codeInput = el('input', { id: 'cab-code', type: 'text', class: 'answer field-input', maxlength: '200', autocomplete: 'off', 'aria-describedby': 'cab-code-hint' });
    var actionBox = el('div', { class: 'cabinet-action' });
    var rememberNote = el('p', { class: 'copy-status small', role: 'status', 'aria-live': 'polite' });
    function refreshStatus() {
      ui.clear(actionBox);
      var code = codeInput.value.trim();
      if (!statusConfigured) {
        actionBox.appendChild(el('button', { type: 'button', class: 'btn btn-primary', disabled: true }, MF.t('cabinet.status.check')));
        actionBox.appendChild(el('p', { class: 'pending small', role: 'note' }, MF.t('cabinet.status.stub')));
        return;
      }
      var link = MF.statusLink(code);
      if (!link.ok) {
        actionBox.appendChild(el('button', { type: 'button', class: 'btn btn-primary', disabled: true }, MF.t('cabinet.status.check')));
        actionBox.appendChild(el('p', { class: 'muted small' }, MF.t('cabinet.status.enter')));
        return;
      }
      actionBox.appendChild(el('a', { href: link.href, class: 'btn btn-primary' }, MF.t('cabinet.status.check')));
      actionBox.appendChild(el('p', { class: 'muted small' }, MF.t('cabinet.status.note')));
    }
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
    page.appendChild(el('section', { class: 'card cabinet-status', 'aria-labelledby': 'cab-status-title' }, [
      el('h2', { id: 'cab-status-title', class: 'card-title' }, MF.t('cabinet.status.title')),
      el('label', { 'for': 'cab-code', class: 'field-label' }, MF.t('cabinet.status.label')),
      codeInput,
      el('p', { id: 'cab-code-hint', class: 'small muted' }, MF.t('cabinet.status.hint')),
      el('div', { class: 'plan-actions' }, [actionBox, remember]),
      rememberNote
    ]));
    refreshStatus();

    /* передача заявки в Molxo Centr */
    var w = ui.getWizard();
    var href = intakeHref();
    var ready = !!w.goal;
    var sendNode = href
      ? el('a', { href: href, class: 'btn btn-primary' }, MF.t('cabinet.send.open'))
      : el('button', { type: 'button', class: 'btn btn-primary', disabled: true }, MF.t('cabinet.send.open'));
    var bundleBtn = el('button', { type: 'button', class: 'btn btn-secondary', disabled: !ready, on: { click: function () {
      if (!ui.download) return;
      var bundle = MF.handoffBundle(ui.getWizard(), ui.state.answers, { elapsedMs: Date.now() - loadedAt });
      ui.download('molxo-centr-handoff.json', MF.handoffJson(bundle), 'application/json');
    } } }, MF.t('cabinet.bundle'));
    page.appendChild(el('section', { class: 'card cabinet-send', 'aria-labelledby': 'cab-send-title' }, [
      el('h2', { id: 'cab-send-title', class: 'card-title' }, MF.t('cabinet.send.title')),
      el('p', { class: 'muted' }, MF.t('cabinet.send.text')),
      el('div', { class: 'plan-actions' }, [sendNode, bundleBtn]),
      href ? null : el('p', { class: 'pending small', role: 'note' }, MF.t('cabinet.send.stub')),
      el('p', { class: 'small muted' }, MF.t('cabinet.bundle.note')),
      ready ? null : el('p', { class: 'pending small', role: 'note' }, MF.t('cabinet.bundle.need'))
    ]));

    page.appendChild(el('h2', { class: 'section-sub' }, MF.t('cabinet.history')));
    page.appendChild(listBox);
    renderList();
    page.appendChild(el('p', { class: 'small muted' }, MF.t('cabinet.clearNote', { button: MF.t('shell.clear.button') })));
  }

  /* ---------- коммерческое предложение ---------- */
  function renderOffer(container) {
    var w = ui.getWizard();
    var plan = MF.buildPlan(w, ui.state.assumptions);
    var page = el('div', { class: 'page narrow offer-page' });
    container.appendChild(page);
    page.appendChild(el('h1', { class: 'page-title' }, MF.t('offer.title')));
    if (!plan.ready) {
      page.appendChild(el('p', { class: 'lead' }, MF.t('offer.empty')));
      page.appendChild(el('a', { href: '#/start', class: 'btn btn-primary' }, MF.t('plan.toStart')));
      return;
    }
    page.appendChild(el('p', { class: 'lead' }, MF.t('offer.lead')));
    function current() { return MF.buildOffer(ui.getWizard(), MF.buildPlan(ui.getWizard(), ui.state.assumptions)).text; }
    page.appendChild(el('section', { class: 'card offer-text', tabindex: '0', 'aria-label': MF.t('offer.title') }, current()));
    var c = copier(current, 'offer.copied');
    page.appendChild(el('div', { class: 'plan-actions' }, [
      el('button', { type: 'button', class: 'btn btn-primary', on: { click: c.onClick } }, MF.t('offer.copy')),
      el('button', { type: 'button', class: 'btn btn-secondary', on: { click: function () {
        if (ui.download) ui.download('molxo-flow-offer.txt', current(), 'text/plain;charset=utf-8');
      } } }, MF.t('offer.download')),
      el('a', { href: '#/plan', class: 'btn btn-secondary' }, MF.t('route.plan'))
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
    var action = link.kind === 'none'
      ? el('button', { type: 'button', class: 'btn btn-primary', disabled: true }, MF.t('call.button'))
      : el('a', { href: link.href, class: 'btn btn-primary' }, MF.t('call.button'));
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
    var card = el('section', { class: 'card call-card', 'aria-labelledby': 'call-title' }, [
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
      link.kind === 'none' ? el('p', { class: 'contact-missing', role: 'note' }, MF.t('plan.contactMissing')) : null,
      link.kind === 'telegram' ? el('p', { class: 'telegram-hint', role: 'note' }, MF.t('call.telegramHint')) : null,
      c.status, c.manualNote, c.manual
    ]);
    container.appendChild(card);
    return card;
  };

  ui.registerView('quiz', renderQuiz);
  ui.registerView('demos', renderDemos);
  ui.registerView('cabinet', renderCabinet);
  ui.registerView('offer', renderOffer);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
