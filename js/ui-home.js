/* Molxo Flow: главная и «Методика». Работает только в браузере. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined' || !MF.ui) return;
  var ui = MF.ui, el = ui.el;

  var SC = function () { return MF.scene; };
  // Схема: на телефоне (до 768 px) раскладка в две колонки, выше: в три; при смене ширины схема строится заново (старая отсоединяется и останавливается).
  var PHONE = '(max-width: 767px)';
  function mountScene(box, opts) {
    var sc = SC();
    if (!sc || !sc.buildScene) return;
    var mq = root.matchMedia ? root.matchMedia(PHONE) : null;
    var holder = null;
    function build() {
      if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
      holder = el('div', { class: 'scene-holder' });
      box.appendChild(holder);
      var o = {};
      Object.keys(opts).forEach(function (k) { o[k] = opts[k]; });
      o.layout = mq && mq.matches ? 'duo' : 'wide';
      sc.buildScene(holder, o);
    }
    build();
    if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', function () { if (box.isConnected !== false) build(); });
  }

  // «Живые экраны»: окно продукта с тремя фрагментами (ваш план, схема решения, документы ТЗ), собранными из реальных функций на фиксированных
  // вымышленных данных (MF.demoPlan). Вкладки: role=tablist, стрелки, Home/End. Текстов клиента здесь нет, только словари и идентификаторы.
  function renderProductWindow() {
    var demo = MF.demoPlan ? MF.demoPlan() : null;
    if (!demo || !demo.plan || !demo.plan.ready) return null;
    var plan = demo.plan;

    var opps = plan.opportunities.map(function (o) {
      var sol = MF.SOLUTIONS.filter(function (x) { return x.id === o.solutionId; })[0];
      return el('li', { class: 'pw-opp' }, [
        el('span', { class: 'pw-opp-title' }, MF.t(sol.titleKey)),
        el('span', { class: 'pw-opp-text' }, MF.t(sol.changesKey))
      ]);
    });
    // Цена уровня: только когда владелец задал валюту и цену (buildPlan иначе даёт null), своих цифр нет.
    var tiers = ['start', 'grow', 'scale'].filter(function (l) { return !!(plan.prices && plan.prices[l]); }).map(function (l) {
      return el('li', null, [el('span', { class: 'pw-tier' }, MF.t('tier.' + l + '.title')), ' ', el('span', { class: 'pw-price num' }, plan.prices[l])]);
    });
    var planPanel = el('div', { class: 'pw-plan' }, [
      el('p', { class: 'pw-goal' }, MF.t(demo.titleKey)),
      el('ol', { class: 'pw-opps', 'aria-label': MF.t('plan.opportunities') }, opps),
      tiers.length ? el('ul', { class: 'pw-tiers' }, tiers) : null
    ]);

    var sceneBox = el('div', { class: 'pw-scene', role: 'img', 'aria-label': MF.sceneAria(demo.view) });
    mountScene(sceneBox, { view: demo.view, compact: true, hidden: true });
    var scenePanel = el('div', null, [el('p', { class: 'pw-goal' }, MF.t('plan.scene.lead')), sceneBox]);

    var docsPanel = el('div', null, [
      // Контейнер русского содержимого помечен lang=ru целиком; подпись списка и пояснение остаются на языке интерфейса снаружи.
      el('div', { class: 'pw-docs-box', lang: 'ru' }, el('ol', { class: 'pw-docs' }, demo.docs.map(function (d, i) {
        return el('li', null, [el('span', { class: 'pw-file num' }, (i < 9 ? '0' : '') + (i + 1)), el('span', { class: 'pw-doc' }, d.title), el('span', { class: 'pw-name' }, d.file)]);
      }))),
      el('p', { class: 'pw-note', lang: MF.LANG }, MF.t('home.live.docsNote'))
    ]);

    var defs = [
      { id: 'plan', label: MF.t('plan.demoTitle'), body: planPanel },
      { id: 'scene', label: MF.t('plan.scene.title'), body: scenePanel },
      { id: 'docs', label: MF.t('home.live.docsTab'), body: docsPanel }
    ];
    var btns = [], panels = [];
    function select(i, focus) {
      btns.forEach(function (b, k) {
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
        b.setAttribute('tabindex', k === i ? '0' : '-1');
        // Не hidden: скрытая панель остаётся в сетке (css grid-stack), чтобы окно не меняло высоту; невидима и недоступна (is-off, inert).
        panels[k].className = 'pw-panel' + (k === i ? '' : ' is-off');
        if (k === i) panels[k].removeAttribute('inert'); else panels[k].setAttribute('inert', '');
        panels[k].setAttribute('aria-hidden', k === i ? 'false' : 'true');
      });
      if (focus) btns[i].focus();
    }
    defs.forEach(function (d, i) {
      var b = el('button', { type: 'button', role: 'tab', class: 'pw-tab', id: 'pw-tab-' + d.id, 'aria-controls': 'pw-panel-' + d.id, 'aria-selected': 'false', tabindex: '-1', on: {
        click: function () { select(i, false); },
        keydown: function (e) {
          var n = btns.length, to = -1;
          if (e.key === 'ArrowRight') to = (i + 1) % n;
          else if (e.key === 'ArrowLeft') to = (i + n - 1) % n;
          else if (e.key === 'Home') to = 0;
          else if (e.key === 'End') to = n - 1;
          if (to < 0) return;
          if (e.preventDefault) e.preventDefault();
          select(to, true);
        }
      } }, d.label);
      btns.push(b);
      panels.push(el('div', { class: 'pw-panel', role: 'tabpanel', id: 'pw-panel-' + d.id, 'aria-labelledby': 'pw-tab-' + d.id }, d.body));
    });
    select(0, false);

    return el('div', { class: 'pw-wrap' }, [
      el('div', { class: 'pw' }, [
        el('div', { class: 'pw-bar', 'aria-hidden': 'true' }, el('span', { class: 'pw-name-bar' }, 'Molxo Flow')),
        el('div', { class: 'pw-tabs', role: 'tablist', 'aria-label': MF.t('home.live.tabs') }, btns),
        el('div', { class: 'pw-panels' }, panels)
      ]),
      el('p', { class: 'pw-caption' }, MF.t('home.live.demo'))
    ]);
  }

  function renderHome(container, ctx) {
    function start() { ui.go('start'); }
    function toDemo() {
      var box = document.getElementById('home-demo');
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: SC() && SC().reduced && SC().reduced() ? 'auto' : 'smooth', block: 'start' });
    }

    // Пять целей: каждая строка ведёт в мастер на свою ветку.
    var goalCards = el('ul', { class: 'goal-grid goal-grid-home', 'aria-label': MF.t('home.goalsLabel') }, MF.GOALS.map(function (g) {
      return el('li', null, el('a', { href: '#/start/' + g.id, class: 'goal-card' }, [
        el('span', { class: 'goal-title' }, MF.t(g.titleKey)),
        el('span', { class: 'goal-hint' }, MF.t(g.hintKey))
      ]));
    }));

    // Подзаголовок обещает цену ориентиром, только когда владелец задал валюту и хотя бы одну цену.
    var prices = (MF.CONFIG && MF.CONFIG.prices) || {};
    var hasPrice = ['start', 'grow', 'scale'].some(function (l) { return !!MF.formatPrice(prices[l]); });
    var title = el('h1', { class: 'hero-title' }, MF.t('home.title'));

    // Пауза схемы стоит рядом со схемой; подпись «Пауза анимации» меняется на «Продолжить анимацию», aria-pressed повторяет состояние.
    var sc0 = SC();
    var pauseBtn = null;
    function pauseLabel(on) { return MF.t(on ? 'scene.resume' : 'scene.pause'); }
    if (sc0 && !(sc0.reduced && sc0.reduced())) {
      pauseBtn = el('button', { type: 'button', class: 'link-btn pause-btn', 'aria-pressed': sc0.isPaused() ? 'true' : 'false', on: { click: function () {
        var next = !sc0.isPaused();
        sc0.setPaused(next);
        pauseBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
        pauseBtn.textContent = pauseLabel(next);
      } } }, pauseLabel(sc0.isPaused()));
    }

    var hero = el('div', { class: 'hero-text' }, [
      el('p', { class: 'hero-label' }, MF.t('home.eyebrow')),
      title,
      el('p', { class: 'hero-sub' }, MF.t(hasPrice ? 'home.sub' : 'home.subNoPrice')),
      // Один вход: «Начать», одна мелкая строка и пять целей. ТЗ, демо, проверка готовности и ассистент ушли в блок «Другие способы» под героем.
      el('div', { class: 'hero-actions' }, el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, MF.t('home.final.cta'))),
      el('p', { class: 'hero-hint' }, MF.t('home.micro') + ' ' + MF.t('home.hint')),
      el('h2', { class: 'home-question' }, MF.t('home.question')),
      goalCards
    ]);

    // Схема читает сохранённый мастер: модули плана горят, остальные приглушены; без законченного мастера это демонстрация.
    // Экран перерисовывается при каждом возврате на главную, поэтому схема всегда строится по свежему состоянию.
    var ownWizard = ui.getWizard ? ui.getWizard() : null;
    // Подпись «по вашим ответам» только у схемы по собственному законченному мастеру; демо-мастер и пустой мастер дают схему по умолчанию.
    var sceneView = MF.sceneView ? MF.sceneView(ownWizard && ownWizard.demo ? null : ownWizard) : null;
    var sceneBox = el('div', { class: 'scene-box' });
    var stage = el('section', { class: 'stage', 'aria-label': MF.t('home.stage.title') }, [
      el('p', { class: 'stage-title', 'aria-hidden': 'true' }, [el('span', null, MF.t('home.stage.title')), el('em', null, MF.t(sceneView && sceneView.personal ? 'scene.cap.personal' : 'home.stage.tag'))]),
      sceneBox,
      pauseBtn ? el('div', { class: 'stage-tools' }, pauseBtn) : null
    ]);

    var heroBox = el('div', { class: 'hero-box' }, [
      el('div', { class: 'wrap' }, el('div', { class: 'hero' }, [hero, stage]))
    ]);

    // «Другие способы начать»: спокойная строка ссылок сразу под героем (ТЗ, демо, проверка готовности) и ассистент, если он настроен.
    var otherWrap = el('div', { class: 'wrap home-other-inner' }, [
      el('h2', { class: 'home-other-title' }, MF.t('home.other.title')),
      el('div', { class: 'home-other-links' }, [
        el('a', { href: '#/interview', class: 'link-btn' }, MF.t('home.secondary')),
        el('button', { type: 'button', class: 'link-btn', on: { click: toDemo } }, MF.t('home.demoLink')),
        el('a', { href: '#/quiz', class: 'link-btn' }, MF.t('home.quizLink'))
      ])
    ]);
    if (ui.renderAssistant) ui.renderAssistant(otherWrap);
    var other = el('section', { class: 'home-other', 'aria-label': MF.t('home.other.title') }, otherWrap);

    // «О Molxo» и доказательства: только заполненное владельцем в MF.CONFIG; пусто: раздела нет (процесс ниже и так на странице).
    var whoWrap = el('div', { class: 'wrap info-wrap rv' });
    ui.renderTrust(whoWrap);
    if (ui.renderAbout) ui.renderAbout(whoWrap);
    var who = whoWrap.children && whoWrap.children.length ? el('section', { class: 'home-section home-who' }, whoWrap) : null;

    // «Что вы получите»: бенто. Схема на две строки, рядом ТЗ и расчёт эффекта; вся ячейка: ссылка.
    function resultCard(href, title, text) {
      return el('li', null, el('a', { href: href, class: 'card result-card' }, [
        el('span', { class: 'result-title' }, title),
        el('span', { class: 'result-text' }, text)
      ]));
    }
    var results = el('section', { class: 'home-section', 'aria-labelledby': 'res-title' }, el('div', { class: 'wrap rv' }, [
      el('h2', { id: 'res-title', class: 'section-title' }, MF.t('home.res.title')),
      renderProductWindow(),
      el('ul', { class: 'result-grid', 'aria-label': MF.t('home.res.title') }, [
        resultCard('#/studio', MF.t('home.res.schema.title'), MF.t('home.res.schema.text')),
        resultCard('#/docs', MF.t('home.res.docs.title'), MF.t('home.res.docs.text')),
        resultCard('#/interview', MF.t('home.res.effect.title'), MF.t('home.res.effect.text'))
      ])
    ]));

    // «Как это работает» (общий блок с планом): линия-шина.
    var howBox = el('section', { class: 'home-section home-how' }, el('div', { class: 'wrap info-wrap rv' }));
    ui.renderHow(howBox.firstChild);

    // «Примеры»: три демо: строки-ссылки; шесть отраслей: две колонки текстовых ссылок. Что данные вымышленные, сказано один раз, в подзаголовке.
    var langSuffix = MF.LANG === 'uk' || MF.LANG === 'en' ? '.' + MF.LANG : '';
    var INDUSTRY_PAGES = ['real-estate', 'auto', 'trade', 'marketing', 'services', 'logistics'];
    var examples = el('section', { class: 'home-section', id: 'home-demo', 'aria-labelledby': 'demo-title' }, el('div', { class: 'wrap rv' }, [
      el('h2', { id: 'demo-title', class: 'section-title' }, MF.t('home.demo.title')),
      el('p', { class: 'section-kicker' }, MF.t('home.demo.lead')),
      el('ul', { class: 'row-list', 'aria-label': MF.t('home.demo.title') }, MF.WIZARD_DEMOS.map(function (d) {
        return el('li', null, el('a', { href: '#/demo/' + d.id, class: 'row-link' }, el('span', { class: 'row-link-text' }, el('span', { class: 'row-link-name' }, MF.t(d.titleKey)))));
      })),
      el('h3', { id: 'ind-title', class: 'examples-sub' }, MF.t('home.ind.title')),
      el('ul', { class: 'industry-links-grid', 'aria-labelledby': 'ind-title' }, INDUSTRY_PAGES.map(function (id) {
        return el('li', null, el('a', { href: 'industries/' + id + langSuffix + '.html', class: 'row-link' }, el('span', { class: 'row-link-text' }, [
          el('span', { class: 'row-link-name' }, MF.t('industry.' + id + '.title')),
          el('span', { class: 'row-link-sub' }, MF.t('home.ind.' + id))
        ])));
      }))
    ]));

    // «Данные остаются у вас»: приватность и безопасность в одном блоке, справа знак приватности (SVG).
    var privacyText = el('div', null, [
      el('h2', { id: 'prv-title', class: 'privacy-big' }, MF.t('home.privacy.big')),
      el('p', null, MF.t('home.privacy.text'))
    ]);
    ui.renderSecurity(privacyText, { bare: true });
    var privacy = el('section', { class: 'home-section', 'aria-labelledby': 'prv-title' }, el('div', { class: 'wrap privacy rv' }, [
      privacyText,
      el('div', { class: 'privacy-pic' }, ui.sign('privacy', MF.t('home.device.aria')))
    ]));

    // Финал.
    var finalBox = el('section', { class: 'home-section' }, el('div', { class: 'wrap' }, el('div', { class: 'final rv' }, [
      el('h2', { class: 'final-title' }, MF.t('home.final.title')),
      el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, MF.t('home.final.cta'))
    ])));

    // Порядок: оффер, доказательство, что получите, процесс, примеры и отрасли, безопасность, финальный призыв.
    var page = el('div', { class: 'page home' }, [heroBox, other, who, results, howBox, examples, privacy, finalBox]);
    container.appendChild(page);

    var sc = SC();
    if (sc) {
      sc.wordsIn(title);
      mountScene(sceneBox, { view: sceneView });
      sc.reveal(page);
    }
  }

  // Методика: семь нумерованных шагов без рамок; три допущения крупно, с меткой «допущение»; вопросы конструктора в свёрнутом блоке.
  function renderMethod(container, ctx) {
    var a = MF.DEFAULT_ASSUMPTIONS;
    var groups = MF.SECTIONS.map(function (s) {
      var qs = MF.QUESTIONS.filter(function (q) { return q.section === s.id; });
      return el('li', null, [el('strong', null, s.title + ': '), qs.map(function (q) { return q.n + '. ' + q.title; }).join(' ')]);
    });
    function step(n, title, kids) {
      return el('li', null, [
        el('span', { class: 'num method-no', 'aria-hidden': 'true' }, (n < 10 ? '0' : '') + n),
        el('div', { class: 'method-body' }, [el('h2', { class: 'block-title' }, title)].concat(kids))
      ]);
    }
    function fact(label, value) {
      return el('div', null, [
        el('dt', null, [label, ' ', el('span', { class: 'tag-assume' }, MF.t('assume.tag'))]),
        el('dd', { class: 'num' }, value)
      ]);
    }
    var count = MF.QUESTIONS.length;
    // Стоимость часа: на ru валюта «₽» стоит в самом тексте (допущение принято владельцем), на uk и en {currency} берётся из MF.CONFIG.currency.
    var rateText = MF.formatNumberLang(a.hourlyRate);
    // Единица в подписи допущения: «валюта/ч»; без валюты владельца число стоит без единицы (подпись и так говорит о цене часа).
    var rateUnit = MF.t('assume.unit.rub');
    // Валюта не задана и язык не русский: числа стоимости часа без единицы нет, показывать нечего.
    var noRate = MF.LANG !== 'ru' && !(MF.CONFIG && typeof MF.CONFIG.currency === 'string' && MF.CONFIG.currency.trim());
    container.appendChild(el('div', { class: 'page narrow method' }, [
      ui.pageHead(ui.routeLabel('method'), MF.t('method.title'), MF.t('method.lead')),
      el('ol', { class: 'method-steps' }, [
        step(1, MF.t('method.wizard.title'), [
          el('p', null, MF.t('method.wizard.text1')),
          el('p', null, MF.t('method.wizard.text2'))
        ]),
        step(2, MF.t('method.collect.title'), [
          el('p', null, MF.t('method.collect.text', { count: count }))
        ]),
        // Вопросы конструктора ТЗ только на русском: на uk и en список заменён пометкой.
        step(3, MF.t('method.questions.title', { count: count }), [
          MF.LANG === 'ru'
            ? el('details', { class: 'block-more method-more' }, [el('summary', null, MF.t('method.questions.show')), el('ul', { class: 'method-list block-more-body' }, groups)])
            : el('p', null, MF.t('method.questions.ruOnly'))
        ]),
        step(4, MF.t('method.ready.title'), [
          el('p', null, MF.t('method.ready.text', { count: count }))
        ]),
        step(5, MF.t('method.potential.title'), [
          el('p', null, noRate ? MF.t('method.potential.text1.norate', { minutes: a.minutesPerRun, share: Math.round(a.automationShare * 100) }) : MF.t('method.potential.text1', { minutes: a.minutesPerRun, share: Math.round(a.automationShare * 100), rate: rateText })),
          el('p', null, MF.t('method.potential.text2')),
          el('dl', { class: 'method-facts' }, [
            fact(MF.t('method.fact.minutes'), a.minutesPerRun + ' ' + MF.t('assume.unit.min')),
            fact(MF.t('method.fact.share'), Math.round(a.automationShare * 100) + MF.t('assume.unit.pct')),
            noRate ? null : fact(MF.t('method.fact.rate'), rateUnit.charAt(0) === '/' ? rateText : rateText + ' ' + rateUnit)
          ])
        ]),
        step(6, MF.t('method.docs.title'), [
          el('p', null, MF.t('method.docs.text'))
        ]),
        step(7, MF.t('method.privacy.title'), [
          el('p', null, MF.t('method.privacy'))
        ])
      ]),
      el('div', { class: 'method-actions' }, [
        el('a', { href: '#/start', class: 'btn btn-primary' }, MF.t('home.final.cta')),
        el('a', { href: '#/interview', class: 'btn btn-secondary' }, ctx.state.demo ? MF.t('method.toInterview.demo') : MF.t('method.toInterview')),
        el('a', { href: '#/', class: 'link-btn' }, MF.t('demo.home'))
      ])
    ]));
  }

  ui.registerView('home', renderHome);
  ui.registerView('method', renderMethod);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
