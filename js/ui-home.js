/* Molxo Flow: главная и «Методика». Работает только в браузере. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined' || !MF.ui) return;
  var ui = MF.ui, el = ui.el;

  var SC = function () { return MF.scene; };
  function pic(kind) {
    var sc = SC();
    if (!sc) return null;
    var s = sc.svg, box = el('div', { class: 'result-pic pic-' + kind, 'aria-hidden': 'true' });
    var svg;
    if (kind === 'schema') {
      svg = s('svg', { viewBox: '0 0 280 104' });
      [['M40 52 H100', 0], ['M140 52 H200', 0.3], ['M220 52 Q250 52 250 80', 0.6]].forEach(function (p) {
        var path = s('path', { 'class': 'rp-line', d: p[0] }, svg); path.style.animationDelay = p[1] + 's';
      });
      [[28, 52, 13], [120, 52, 13], [212, 52, 13], [250, 88, 9]].forEach(function (c) { s('circle', { 'class': 'rp-node', cx: c[0], cy: c[1], r: c[2] }, svg); });
    } else if (kind === 'effect') {
      svg = s('svg', { viewBox: '0 0 180 104' });
      [[22, 58, 30], [54, 40, 48], [86, 48, 40], [118, 22, 66]].forEach(function (b, i) {
        var r = s('rect', { 'class': 'rp-bar', x: b[0], y: b[1], width: 22, height: b[2], rx: 3 }, svg); r.style.setProperty('--i', i);
      });
      s('path', { d: 'M16 90 H150', stroke: 'rgba(255,255,255,.16)' }, svg);
    } else {
      svg = s('svg', { viewBox: '0 0 180 104' });
      var g = s('g', { transform: 'translate(90 96)' }, svg);
      for (var i = 0; i < 12; i++) {
        var q = s('rect', { 'class': 'rp-sheet', x: -16, y: -70, width: 32, height: 64, rx: 3 }, g);
        q.style.setProperty('--i', i); q.style.setProperty('--r', ((i - 5.5) * 7) + 'deg');
      }
    }
    box.appendChild(svg);
    return box;
  }

  function devicePic() {
    var sc = SC();
    if (!sc) return null;
    var s = sc.svg;
    var svg = s('svg', { viewBox: '0 0 300 260', 'class': 'dev-pic', role: 'img', 'aria-label': MF.t('home.device.aria') });
    s('rect', { x: 40, y: 40, width: 220, height: 150, rx: 14, fill: '#13161B', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 1.5 }, svg);
    s('rect', { x: 20, y: 196, width: 260, height: 10, rx: 5, fill: '#1A1E25', stroke: 'rgba(255,255,255,.12)' }, svg);
    s('circle', { cx: 150, cy: 130, r: 62, fill: 'none', stroke: 'rgba(255,255,255,.08)', 'stroke-dasharray': '3 7' }, svg);
    s('circle', { cx: 150, cy: 130, r: 40, fill: 'none', stroke: 'rgba(255,255,255,.08)', 'stroke-dasharray': '3 7' }, svg);
    var o1 = s('g', { 'class': 'orbit' }, svg);
    s('circle', { cx: 212, cy: 130, r: 5, fill: '#FF6A2B' }, o1); s('circle', { cx: 88, cy: 130, r: 4, fill: '#FF6A2B', opacity: '.6' }, o1);
    var o2 = s('g', { 'class': 'orbit2' }, svg);
    s('circle', { cx: 150, cy: 90, r: 4, fill: '#FF6A2B', opacity: '.8' }, o2); s('circle', { cx: 150, cy: 170, r: 3.5, fill: '#FF6A2B', opacity: '.5' }, o2);
    s('path', { d: 'M150 108 l18 7 v14 c0 11 -8 19 -18 23 c-10 -4 -18 -12 -18 -23 v-14 z', fill: 'rgba(255,106,43,.16)', stroke: '#FF6A2B', 'stroke-width': 1.6 }, svg);
    s('path', { d: 'M143 131 l5 5 9 -10', fill: 'none', stroke: '#FF6A2B', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    return svg;
  }

  // Ступень появления: --i не больше 5, дальше без задержки (шаг --stagger задан в css).
  function stagger(k) { return '--i:' + Math.min(k, 5); }

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
    var hero = el('div', { class: 'hero-text' }, [
      el('p', { class: 'mono-label hero-label' }, [el('span', { class: 'led', 'aria-hidden': 'true' }), 'Molxo Flow']),
      title,
      el('p', { class: 'hero-sub' }, MF.t(hasPrice ? 'home.sub' : 'home.subNoPrice')),
      // Один главный путь: «Начать». ТЗ, демо и квиз вторичными ссылками.
      el('div', { class: 'hero-actions' }, el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, MF.t('home.final.cta'))),
      el('p', { class: 'hero-links' }, [
        el('a', { href: '#/interview', class: 'link-btn' }, MF.t('home.secondary')),
        el('button', { type: 'button', class: 'link-btn', on: { click: toDemo } }, MF.t('home.demoLink')),
        el('a', { href: '#/quiz', class: 'link-btn' }, MF.t('home.quizLink'))
      ]),
      el('h2', { class: 'home-question' }, MF.t('home.question')),
      goalCards,
      el('p', { class: 'hero-micro' }, MF.t('home.micro')),
      el('p', { class: 'hero-hint' }, MF.t('home.hint'))
    ]);
    // Бот и веб-чат: один блок «Задать вопрос ассистенту».
    if (ui.renderAssistant) ui.renderAssistant(hero);

    var sceneBox = el('div', { class: 'scene-box' });
    var stage = el('section', { class: 'stage', 'aria-label': MF.t('home.stage.title') }, [
      el('p', { class: 'stage-title', 'aria-hidden': 'true' }, [el('span', null, MF.t('home.stage.title')), el('em', null, MF.t('home.stage.tag'))]),
      sceneBox,
      el('p', { class: 'stage-note' }, MF.t('home.stage.note'))
    ]);

    var canvas = el('canvas', { class: 'hero-field', 'aria-hidden': 'true' });
    var heroBox = el('div', { class: 'hero-box' }, [
      canvas,
      el('div', { class: 'wrap' }, el('div', { class: 'hero' }, [hero, stage]))
    ]);

    // 02. «Как это работает» (общий блок с планом): линия-шина.
    var howBox = el('section', { class: 'home-section home-how' }, el('div', { class: 'wrap info-wrap' }));
    ui.renderHow(howBox.firstChild);

    // 03. «Что вы получите»: бенто. Схема на две строки, рядом ТЗ и расчёт эффекта; вся ячейка — ссылка со стрелкой.
    function resultCard(href, title, text, kind, k) {
      return el('li', { class: 'rv', style: stagger(k) }, el('a', { href: href, class: 'card result-card' }, [
        pic(kind),
        el('span', { class: 'result-title' }, title),
        el('span', { class: 'result-text' }, text),
        el('span', { class: 'result-more', 'aria-hidden': 'true' }, '↗')
      ]));
    }
    var results = el('section', { class: 'home-section', 'aria-labelledby': 'res-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'res-title', class: 'section-title rv' }, MF.t('home.res.title')),
      el('p', { class: 'section-kicker rv', style: stagger(1) }, MF.t('home.res.lead')),
      el('ul', { class: 'result-grid', 'aria-label': MF.t('home.res.title') }, [
        resultCard('#/studio', MF.t('home.res.schema.title'), MF.t('home.res.schema.text'), 'schema', 2),
        resultCard('#/docs', MF.t('home.res.docs.title'), MF.t('home.res.docs.text'), 'docs', 3),
        resultCard('#/interview', MF.t('home.res.effect.title'), MF.t('home.res.effect.text'), 'effect', 4)
      ])
    ]));

    // 04. «Примеры»: три демо — строки-ссылки; шесть отраслей — две колонки текстовых ссылок. Данные демо вымышленные, это сказано в каждой строке.
    var langSuffix = MF.LANG === 'uk' || MF.LANG === 'en' ? '.' + MF.LANG : '';
    var INDUSTRY_PAGES = ['real-estate', 'auto', 'trade', 'marketing', 'services', 'logistics'];
    var examples = el('section', { class: 'home-section', id: 'home-demo', 'aria-labelledby': 'demo-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'demo-title', class: 'section-title rv' }, MF.t('home.demo.title')),
      el('p', { class: 'section-kicker rv', style: stagger(1) }, MF.t('home.demo.lead')),
      el('ul', { class: 'row-list', 'aria-label': MF.t('home.demo.title') }, MF.WIZARD_DEMOS.map(function (d, k) {
        return el('li', { class: 'rv', style: stagger(k + 2) }, el('a', { href: '#/demo/' + d.id, class: 'row-link' }, [
          el('span', { class: 'tag-assume' }, MF.t('home.demo.tagShort')),
          el('span', { class: 'row-link-text' }, [
            el('span', { class: 'row-link-name' }, MF.t(d.titleKey)),
            el('span', { class: 'row-link-sub' }, MF.t('home.demo.tag'))
          ])
        ]));
      })),
      el('h3', { id: 'ind-title', class: 'examples-sub rv' }, MF.t('home.ind.title')),
      el('ul', { class: 'industry-links-grid', 'aria-labelledby': 'ind-title' }, INDUSTRY_PAGES.map(function (id, k) {
        return el('li', { class: 'rv', style: stagger(k) }, el('a', { href: 'industries/' + id + langSuffix + '.html', class: 'row-link' }, el('span', { class: 'row-link-text' }, [
          el('span', { class: 'row-link-name' }, MF.t('industry.' + id + '.title')),
          el('span', { class: 'row-link-sub' }, MF.t('home.ind.' + id))
        ])));
      }))
    ]));

    // 05. «Данные остаются у вас»: приватность и безопасность в одном блоке, справа картинка.
    var privacyText = el('div', { class: 'rv' }, [
      el('h2', { id: 'prv-title', class: 'privacy-big' }, MF.t('home.privacy.big')),
      el('p', null, MF.t('home.privacy.text'))
    ]);
    ui.renderSecurity(privacyText, { bare: true });
    var privacy = el('section', { class: 'home-section', 'aria-labelledby': 'prv-title' }, el('div', { class: 'wrap privacy' }, [
      privacyText,
      el('div', { class: 'rv privacy-pic', style: stagger(2) }, devicePic())
    ]));

    // 06. «Кто за этим стоит»: только заполненное владельцем в MF.CONFIG; пусто — раздела нет.
    var whoWrap = el('div', { class: 'wrap info-wrap' });
    ui.renderTrust(whoWrap);
    if (ui.renderAbout) ui.renderAbout(whoWrap);
    var who = whoWrap.children && whoWrap.children.length ? el('section', { class: 'home-section home-who' }, whoWrap) : null;

    // 07. Финал.
    var finalBox = el('section', { class: 'home-section' }, el('div', { class: 'wrap' }, el('div', { class: 'final rv' }, [
      el('h2', { class: 'final-title' }, MF.t('home.final.title')),
      el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, MF.t('home.final.cta'))
    ])));

    var page = el('div', { class: 'page home' }, [heroBox, howBox, results, examples, privacy, who, finalBox]);
    container.appendChild(page);

    var sc = SC();
    if (sc) {
      sc.wordsIn(title);
      sc.buildScene(sceneBox);
      sc.mountField(canvas);
      sc.tilt(heroBox, stage);
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
