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

  function renderHome(container, ctx) {
    var r = MF.readiness(ctx.state.answers);

    function start() { ui.go('start'); }
    function toDemo() {
      var box = document.getElementById('home-demo');
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: SC() && SC().reduced && SC().reduced() ? 'auto' : 'smooth', block: 'start' });
    }

    // Пять целей: каждая карточка ведёт в мастер на свою ветку.
    var goalCards = el('ul', { class: 'goal-grid goal-grid-home', 'aria-label': MF.t('home.goalsLabel') }, MF.GOALS.map(function (g) {
      return el('li', null, el('a', { href: '#/start/' + g.id, class: 'goal-card' }, [
        el('span', { class: 'goal-title' }, MF.t(g.titleKey)),
        el('span', { class: 'goal-hint' }, MF.t(g.hintKey))
      ]));
    }));

    var title = el('h1', { class: 'hero-title' }, MF.t('home.title'));
    var hero = el('div', { class: 'hero-text' }, [
      title,
      el('p', { class: 'hero-sub' }, MF.t('home.sub')),
      el('h2', { class: 'home-question' }, MF.t('home.question')),
      goalCards,
      el('div', { class: 'hero-actions' }, [
        el('a', { href: '#/interview', class: 'btn btn-secondary' }, MF.t('home.secondary')),
        el('button', { type: 'button', class: 'link-btn', on: { click: toDemo } }, MF.t('home.demoLink'))
      ]),
      el('p', { class: 'hero-micro' }, MF.t('home.micro')),
      el('p', { class: 'hero-hint' }, MF.t('home.hint'))
    ]);
    ui.renderBotCard(hero);

    var sceneBox = el('div', { class: 'scene-box' });
    var stage = el('section', { class: 'stage', 'aria-labelledby': 'rd-title' }, [
      el('p', { class: 'stage-title', 'aria-hidden': 'true' }, [el('span', null, MF.t('home.stage.title')), el('em', null, MF.t('home.stage.tag'))]),
      sceneBox,
      el('div', { class: 'readiness' }, [
        el('div', { class: 'readiness-row' }, [
          el('h2', { id: 'rd-title', class: 'readiness-title' }, MF.t('home.stage.ready')),
          el('p', { class: 'readiness-value' }, [String(r.percent), el('span', { class: 'readiness-pct' }, '%')])
        ]),
        el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(r.percent), 'aria-label': MF.t('home.stage.readyAria') },
          el('div', { class: 'bar-fill', style: 'width:' + r.percent + '%' })),
        el('p', { class: 'muted small' }, MF.t('home.stage.label', { n: r.filled, total: r.total }))
      ]),
      el('p', { class: 'stage-note' }, MF.t('home.stage.note'))
    ]);

    var canvas = el('canvas', { class: 'hero-field', 'aria-hidden': 'true' });
    var heroBox = el('div', { class: 'hero-box' }, [
      canvas, el('div', { class: 'hero-glow', 'aria-hidden': 'true' }),
      el('div', { class: 'wrap' }, el('div', { class: 'hero' }, [hero, stage]))
    ]);

    // Три демо: вымышленные данные, каждая карточка открывает «Ваш план».
    var demos = el('section', { class: 'home-section', id: 'home-demo', 'aria-labelledby': 'demo-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'demo-title', class: 'section-title rv' }, MF.t('home.demo.title')),
      el('p', { class: 'section-kicker rv', style: '--d:.08s' }, MF.t('home.demo.lead')),
      el('ul', { class: 'demo-grid', 'aria-label': MF.t('home.demo.title') }, MF.WIZARD_DEMOS.map(function (d, k) {
        return el('li', { class: 'rv', style: '--d:' + (0.1 + k * 0.1) + 's' }, el('a', { href: '#/demo/' + d.id, class: 'card demo-card' }, [
          el('span', { class: 'tag-assume' }, MF.t('home.demo.tag')),
          el('span', { class: 'result-title' }, MF.t(d.titleKey)),
          el('span', { class: 'result-more', 'aria-hidden': 'true' }, MF.t('home.demo.open'))
        ]));
      }))
    ]));

    // Отраслевые страницы лежат отдельными файлами по языкам: real-estate.html, real-estate.uk.html, real-estate.en.html.
    var langSuffix = MF.LANG === 'uk' || MF.LANG === 'en' ? '.' + MF.LANG : '';
    var industries = el('section', { class: 'home-section', 'aria-labelledby': 'ind-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'ind-title', class: 'section-title rv' }, MF.t('home.ind.title')),
      el('p', { class: 'section-kicker rv', style: '--d:.08s' }, MF.t('home.ind.lead')),
      el('ul', { class: 'industry-links-grid', 'aria-label': MF.t('home.ind.title') }, [
        el('li', { class: 'rv', style: '--d:.1s' }, el('a', { href: 'industries/real-estate' + langSuffix + '.html', class: 'card demo-card' }, [
          el('span', { class: 'result-title' }, MF.t('industry.real-estate.title')),
          el('span', { class: 'result-text' }, MF.t('home.ind.real-estate'))
        ])),
        el('li', { class: 'rv', style: '--d:.2s' }, el('a', { href: 'industries/auto' + langSuffix + '.html', class: 'card demo-card' }, [
          el('span', { class: 'result-title' }, MF.t('industry.auto.title')),
          el('span', { class: 'result-text' }, MF.t('home.ind.auto'))
        ]))
      ])
    ]));

    function resultCard(href, title, text, kind, d) {
      return el('li', { class: 'rv', style: '--d:' + d + 's' }, el('a', { href: href, class: 'card result-card' }, [
        pic(kind),
        el('span', { class: 'result-title' }, title),
        el('span', { class: 'result-text' }, text),
        el('span', { class: 'result-more', 'aria-hidden': 'true' }, MF.t('home.res.open'))
      ]));
    }
    var results = el('section', { class: 'home-section', 'aria-labelledby': 'res-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'res-title', class: 'section-title rv' }, MF.t('home.res.title')),
      el('p', { class: 'section-kicker rv', style: '--d:.08s' }, MF.t('home.res.lead')),
      el('ul', { class: 'result-grid', 'aria-label': MF.t('home.res.title') }, [
        resultCard('#/studio', MF.t('home.res.schema.title'), MF.t('home.res.schema.text'), 'schema', 0.1),
        resultCard('#/interview', MF.t('home.res.effect.title'), MF.t('home.res.effect.text'), 'effect', 0.2),
        resultCard('#/docs', MF.t('home.res.docs.title'), MF.t('home.res.docs.text'), 'docs', 0.3)
      ])
    ]));

    var blocks = el('section', { class: 'home-section', 'aria-labelledby': 'blk-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'blk-title', class: 'section-title rv' }, MF.t('home.blocks.title')),
      el('p', { class: 'section-kicker rv', style: '--d:.08s' }, MF.t('home.blocks.lead')),
      // Названия блоков конструктора ТЗ только на русском: на uk и en вместо списка короткая пометка.
      MF.LANG === 'ru'
        ? el('ol', { class: 'blocks-line', 'aria-label': MF.t('home.blocks.aria') }, MF.SECTIONS.map(function (sec, k) {
          return el('li', { style: '--k:' + k }, el('b', null, sec.title));
        }))
        : el('p', { class: 'muted rv', style: '--d:.12s' }, MF.t('home.blocks.ruOnly'))
    ]));

    var privacy = el('section', { class: 'home-section', 'aria-labelledby': 'prv-title' }, el('div', { class: 'wrap privacy' }, [
      el('div', { class: 'rv' }, [
        el('h2', { id: 'prv-title', class: 'privacy-big' }, MF.t('home.privacy.big')),
        el('p', null, MF.t('home.privacy.text'))
      ]),
      el('div', { class: 'rv privacy-pic', style: '--d:.15s' }, devicePic())
    ]));

    // Общие блоки: те же, что на странице «Ваш план».
    var infoBox = el('section', { class: 'home-section home-info' }, el('div', { class: 'wrap info-wrap' }));
    var infoWrap = infoBox.firstChild;
    ui.renderHow(infoWrap);
    ui.renderSecurity(infoWrap);
    ui.renderTrust(infoWrap);

    var finalBox = el('section', { class: 'home-section' }, el('div', { class: 'wrap' }, el('div', { class: 'final rv' }, [
      el('h2', { class: 'final-title' }, MF.t('home.final.title')),
      el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, MF.t('home.final.cta'))
    ])));

    var page = el('div', { class: 'page home' }, [heroBox, demos, industries, results, infoBox, blocks, privacy, finalBox]);
    container.appendChild(page);

    var sc = SC();
    if (sc) {
      sc.wordsIn(title);
      sc.buildScene(sceneBox);
      sc.mountField(canvas);
      sc.tilt(heroBox, stage);
      sc.reveal(page);
      sc.glow(page);
    }
  }

  function renderMethod(container, ctx) {
    var a = MF.DEFAULT_ASSUMPTIONS;
    var groups = MF.SECTIONS.map(function (s) {
      var qs = MF.QUESTIONS.filter(function (q) { return q.section === s.id; });
      return el('li', null, [el('strong', null, s.title + ': '), qs.map(function (q) { return q.n + '. ' + q.title; }).join(' ')]);
    });
    function block(title, kids) {
      return el('section', { class: 'card method-block' }, [el('h2', { class: 'card-title' }, title)].concat(kids));
    }
    var count = MF.QUESTIONS.length;
    container.appendChild(el('div', { class: 'page narrow method' }, [
      el('h1', { class: 'page-title' }, MF.t('method.title')),
      el('p', { class: 'lead' }, MF.t('method.lead')),
      block(MF.t('method.wizard.title'), [
        el('p', null, MF.t('method.wizard.text1')),
        el('p', null, MF.t('method.wizard.text2'))
      ]),
      block(MF.t('method.collect.title'), [
        el('p', null, MF.t('method.collect.text', { count: count }))
      ]),
      // Вопросы конструктора ТЗ только на русском: на uk и en список заменён пометкой.
      block(MF.t('method.questions.title', { count: count }), [
        MF.LANG === 'ru' ? el('ul', { class: 'method-list' }, groups) : el('p', null, MF.t('method.questions.ruOnly'))
      ]),
      block(MF.t('method.ready.title'), [
        el('p', null, MF.t('method.ready.text', { count: count }))
      ]),
      block(MF.t('method.potential.title'), [
        el('p', null, MF.t('method.potential.text1', { minutes: a.minutesPerRun, share: Math.round(a.automationShare * 100), rate: MF.formatNumber(a.hourlyRate) })),
        el('p', null, MF.t('method.potential.text2'))
      ]),
      block(MF.t('method.docs.title'), [
        el('p', null, MF.t('method.docs.text'))
      ]),
      block(MF.t('method.privacy.title'), [
        el('p', null, MF.t('method.privacy'))
      ]),
      el('div', { class: 'method-actions' }, [
        el('a', { href: '#/start', class: 'btn btn-primary' }, MF.t('home.final.cta')),
        el('a', { href: '#/interview', class: 'btn btn-secondary' }, ctx.state.demo ? MF.t('method.toInterview.demo') : MF.t('method.toInterview')),
        el('a', { href: '#/', class: 'btn btn-secondary' }, MF.t('demo.home'))
      ])
    ]));
  }

  ui.registerView('home', renderHome);
  ui.registerView('method', renderMethod);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
