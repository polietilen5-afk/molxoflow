/* Molxo Flow: главная и «Методика». Работает только в браузере. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined' || !MF.ui) return;
  var ui = MF.ui, el = ui.el;

  var SC = function () { return MF.scene; };
  // Картинки блоков: обычные <img> с ленивой загрузкой; размеры заданы, чтобы страница не прыгала.
  var PICS = {
    schema: ['flow-schema.webp', 524, 480],
    docs: ['docs-stack.webp', 900, 675],
    effect: ['effect.webp', 720, 720],
    privacy: ['flow-privacy.webp', 797, 560]
  };
  function img(kind, alt) {
    var p = PICS[kind];
    return el('img', { src: 'img/' + p[0], alt: alt || '', width: p[1], height: p[2], loading: 'lazy', decoding: 'async' });
  }
  function pic(kind) {
    return el('div', { class: 'result-pic pic-' + kind, 'aria-hidden': 'true' }, img(kind, ''));
  }

  // Поле «Опишите задачу своими словами»: текст попадает в ответ business мастера (цель по умолчанию routine) и ведёт на шаг,
  // где он виден и правится. Пустое поле: ничего не пишется, фокус остаётся в поле. Текст идёт только через value.
  function submitFree(field) {
    var text = String(field.value || '').trim();
    if (!text) { field.focus(); return; }
    var w = ui.getWizard ? ui.getWizard() : MF.emptyWizard();
    if (w.demo) w = MF.emptyWizard();
    var n = w.goal ? w : MF.setWizardGoal(w, 'routine');
    n = MF.setWizardAnswer(n, 'business', text);
    n = MF.setWizardStep(n, 1);
    if (ui.saveWizard) ui.saveWizard(n);
    ui.go('start');
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

    // Одна строка ввода: поле и вторичная кнопка; главное действие первого экрана остаётся «Начать».
    var freeField = el('input', {
      type: 'text', id: 'hero-free', class: 'hero-free-input', name: 'task', autocomplete: 'off', maxlength: '2000',
      'aria-label': MF.t('home.free.label'), placeholder: MF.t('home.free.label')
    });
    var freeForm = el('form', { class: 'hero-free', novalidate: true, on: { submit: function (e) { e.preventDefault(); submitFree(freeField); } } }, [
      freeField,
      el('button', { type: 'submit', class: 'btn btn-secondary' }, MF.t('home.free.cta'))
    ]);

    var sc0 = SC();
    var pauseBtn = null;
    if (sc0 && !(sc0.reduced && sc0.reduced())) {
      pauseBtn = el('button', { type: 'button', class: 'link-btn pause-btn', 'aria-pressed': sc0.isPaused() ? 'true' : 'false', on: { click: function () {
        var next = !sc0.isPaused();
        sc0.setPaused(next);
        pauseBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      } } }, MF.t('scene.pause'));
    }

    var hero = el('div', { class: 'hero-text' }, [
      el('p', { class: 'mono-label hero-label' }, [el('span', { class: 'led', 'aria-hidden': 'true' }), 'Molxo Flow']),
      title,
      el('p', { class: 'hero-sub' }, MF.t(hasPrice ? 'home.sub' : 'home.subNoPrice')),
      el('p', { class: 'hero-stack' }, MF.t('home.stack')),
      // Один главный путь: «Начать». ТЗ, демо и проверка готовности собраны в одну строку ниже целей.
      el('div', { class: 'hero-actions' }, el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, MF.t('home.final.cta'))),
      el('h2', { class: 'home-question' }, MF.t('home.question')),
      goalCards,
      freeForm,
      el('p', { class: 'hero-links' }, [
        el('span', { class: 'hero-links-label' }, MF.t('home.knowLabel')),
        el('a', { href: '#/interview', class: 'link-btn' }, MF.t('home.secondary')),
        el('button', { type: 'button', class: 'link-btn', on: { click: toDemo } }, MF.t('home.demoLink')),
        el('a', { href: '#/quiz', class: 'link-btn' }, MF.t('home.quizLink'))
      ]),
      el('p', { class: 'hero-hint' }, MF.t('home.micro') + ' ' + MF.t('home.hint'))
    ]);
    // Бот и веб-чат: один блок «Задать вопрос ассистенту».
    if (ui.renderAssistant) ui.renderAssistant(hero);
    if (pauseBtn) hero.appendChild(pauseBtn);

    // Схема читает сохранённый мастер: модули плана горят, остальные приглушены; без законченного мастера это демонстрация.
    // Экран перерисовывается при каждом возврате на главную, поэтому схема всегда строится по свежему состоянию.
    var sceneView = MF.sceneView ? MF.sceneView(ui.getWizard ? ui.getWizard() : null) : null;
    var sceneBox = el('div', { class: 'scene-box' });
    var stage = el('section', { class: 'stage', 'aria-label': MF.t('home.stage.title') }, [
      el('p', { class: 'stage-title', 'aria-hidden': 'true' }, [el('span', null, MF.t('home.stage.title')), el('em', null, MF.t(sceneView && sceneView.personal ? 'scene.cap.personal' : 'home.stage.tag'))]),
      sceneBox
    ]);

    var canvas = el('canvas', { class: 'hero-field', 'aria-hidden': 'true' });
    var heroBox = el('div', { class: 'hero-box' }, [
      canvas,
      el('div', { class: 'wrap' }, el('div', { class: 'hero' }, [hero, stage]))
    ]);

    // «О Molxo» и доказательства: только заполненное владельцем в MF.CONFIG; пусто: раздела нет (процесс ниже и так на странице).
    var whoWrap = el('div', { class: 'wrap info-wrap rv' });
    ui.renderTrust(whoWrap);
    if (ui.renderAbout) ui.renderAbout(whoWrap);
    var who = whoWrap.children && whoWrap.children.length ? el('section', { class: 'home-section home-who' }, whoWrap) : null;

    // «Что вы получите»: бенто. Схема на две строки, рядом ТЗ и расчёт эффекта; вся ячейка: ссылка.
    function resultCard(href, title, text, kind) {
      return el('li', null, el('a', { href: href, class: 'card result-card' }, [
        pic(kind),
        el('span', { class: 'result-title' }, title),
        el('span', { class: 'result-text' }, text)
      ]));
    }
    var results = el('section', { class: 'home-section', 'aria-labelledby': 'res-title' }, el('div', { class: 'wrap rv' }, [
      el('h2', { id: 'res-title', class: 'section-title' }, MF.t('home.res.title')),
      el('p', { class: 'section-kicker' }, MF.t('home.res.lead')),
      el('ul', { class: 'result-grid', 'aria-label': MF.t('home.res.title') }, [
        resultCard('#/studio', MF.t('home.res.schema.title'), MF.t('home.res.schema.text'), 'schema'),
        resultCard('#/docs', MF.t('home.res.docs.title'), MF.t('home.res.docs.text'), 'docs'),
        resultCard('#/interview', MF.t('home.res.effect.title'), MF.t('home.res.effect.text'), 'effect')
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

    // «Данные остаются у вас»: приватность и безопасность в одном блоке, справа картинка.
    var privacyText = el('div', null, [
      el('h2', { id: 'prv-title', class: 'privacy-big' }, MF.t('home.privacy.big')),
      el('p', null, MF.t('home.privacy.text'))
    ]);
    ui.renderSecurity(privacyText, { bare: true });
    var privacy = el('section', { class: 'home-section', 'aria-labelledby': 'prv-title' }, el('div', { class: 'wrap privacy rv' }, [
      privacyText,
      el('div', { class: 'privacy-pic' }, img('privacy', MF.t('home.device.aria')))
    ]));

    // Финал.
    var finalBox = el('section', { class: 'home-section' }, el('div', { class: 'wrap' }, el('div', { class: 'final rv' }, [
      el('h2', { class: 'final-title' }, MF.t('home.final.title')),
      el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, MF.t('home.final.cta'))
    ])));

    // Порядок: оффер, доказательство, что получите, процесс, примеры и отрасли, безопасность, финальный призыв.
    var page = el('div', { class: 'page home' }, [heroBox, who, results, howBox, examples, privacy, finalBox]);
    container.appendChild(page);

    var sc = SC();
    if (sc) {
      sc.wordsIn(title);
      sc.buildScene(sceneBox, { view: sceneView });
      sc.mountField(canvas);
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
          el('p', null, MF.t('method.potential.text1', { minutes: a.minutesPerRun, share: Math.round(a.automationShare * 100), rate: rateText })),
          el('p', null, MF.t('method.potential.text2')),
          el('dl', { class: 'method-facts' }, [
            fact(MF.t('method.fact.minutes'), a.minutesPerRun + ' ' + MF.t('assume.unit.min')),
            fact(MF.t('method.fact.share'), Math.round(a.automationShare * 100) + MF.t('assume.unit.pct')),
            fact(MF.t('method.fact.rate'), rateUnit.charAt(0) === '/' ? rateText : rateText + ' ' + rateUnit)
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
