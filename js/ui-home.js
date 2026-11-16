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
    var svg = s('svg', { viewBox: '0 0 300 260', 'class': 'dev-pic', role: 'img', 'aria-label': 'Ответы остаются внутри этого устройства' });
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

    function start() {
      if (ui.state.demo) ui.backToEmpty({ go: 'interview' });
      else ui.go('interview');
    }
    var startBtn = el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, 'Начать свой проект');
    var demoBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-large', on: { click: function () {
      ui.startDemo({ restart: true, go: 'interview' });
    } } }, 'Посмотреть готовое демо');

    var title = el('h1', { class: 'hero-title' }, 'От идеи до понятного плана');
    var hero = el('div', { class: 'hero-text' }, [
      title,
      el('p', { class: 'hero-sub' }, 'Покажите процесс — мы соберём решение'),
      el('p', { class: 'lead' }, 'Отвечайте обычными словами, как рассказали бы коллеге: без терминов и схем. Мы сами сложим ответы в схему процесса, оценим эффект и подготовим техническое задание.'),
      el('div', { class: 'hero-actions' }, [startBtn, demoBtn]),
      el('p', { class: 'hero-hint' }, '5–10 минут · можно отвечать приблизительно · всё редактируется')
    ]);

    var sceneBox = el('div', { class: 'scene-box' });
    var stage = el('section', { class: 'stage', 'aria-labelledby': 'rd-title' }, [
      el('p', { class: 'stage-title', 'aria-hidden': 'true' }, [el('span', null, 'Схема процесса'), el('em', null, 'демонстрация')]),
      sceneBox,
      el('div', { class: 'readiness' }, [
        el('div', { class: 'readiness-row' }, [
          el('h2', { id: 'rd-title', class: 'readiness-title' }, 'Готовность требований'),
          el('p', { class: 'readiness-value' }, [String(r.percent), el('span', { class: 'readiness-pct' }, '%')])
        ]),
        el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(r.percent), 'aria-label': 'Готовность требований, %' },
          el('div', { class: 'bar-fill', style: 'width:' + r.percent + '%' })),
        el('p', { class: 'muted small' }, r.label)
      ]),
      el('p', { class: 'stage-note' }, 'Схема на этом экране собирается для примера. Ваша появится из ваших ответов.')
    ]);

    var canvas = el('canvas', { class: 'hero-field', 'aria-hidden': 'true' });
    var heroBox = el('div', { class: 'hero-box' }, [
      canvas, el('div', { class: 'hero-glow', 'aria-hidden': 'true' }),
      el('div', { class: 'wrap' }, el('div', { class: 'hero' }, [hero, stage]))
    ]);

    function resultCard(href, title, text, kind, d) {
      return el('li', { class: 'rv', style: '--d:' + d + 's' }, el('a', { href: href, class: 'card result-card' }, [
        pic(kind),
        el('span', { class: 'result-title' }, title),
        el('span', { class: 'result-text' }, text),
        el('span', { class: 'result-more', 'aria-hidden': 'true' }, 'Открыть →')
      ]));
    }
    var results = el('section', { class: 'home-section', 'aria-labelledby': 'res-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'res-title', class: 'section-title rv' }, 'Что вы получите'),
      el('p', { class: 'section-kicker rv', style: '--d:.08s' }, 'Три результата из одних и тех же ответов.'),
      el('ul', { class: 'result-grid', 'aria-label': 'Что вы получите' }, [
        resultCard('#/studio', 'Наглядная схема', 'Процесс по модулям: от входных данных до результата.', 'schema', 0.1),
        resultCard('#/interview', 'Расчёт эффекта', 'Предварительная оценка времени и стоимости по вашим ответам.', 'effect', 0.2),
        resultCard('#/docs', 'Готовое ТЗ: 12 файлов', 'Документы в формате Markdown для команды разработки.', 'docs', 0.3)
      ])
    ]));

    var blocks = el('section', { class: 'home-section', 'aria-labelledby': 'blk-title' }, el('div', { class: 'wrap' }, [
      el('h2', { id: 'blk-title', class: 'section-title rv' }, 'Блоки интервью'),
      el('p', { class: 'section-kicker rv', style: '--d:.08s' }, 'Вопросы сгруппированы по смыслу. Отвечать можно приблизительно, всё редактируется.'),
      el('ol', { class: 'blocks-line', 'aria-label': 'Разделы интервью' }, MF.SECTIONS.map(function (sec, k) {
        return el('li', { style: '--k:' + k }, el('b', null, sec.title));
      }))
    ]));

    var privacy = el('section', { class: 'home-section', 'aria-labelledby': 'prv-title' }, el('div', { class: 'wrap privacy' }, [
      el('div', { class: 'rv' }, [
        el('h2', { id: 'prv-title', class: 'privacy-big' }, 'Всё работает в вашем браузере.'),
        el('p', null, 'Ответы сохраняются только на этом устройстве.')
      ]),
      el('div', { class: 'rv privacy-pic', style: '--d:.15s' }, devicePic())
    ]));

    var finalBox = el('section', { class: 'home-section' }, el('div', { class: 'wrap' }, el('div', { class: 'final rv' }, [
      el('h2', { class: 'final-title' }, 'Расскажите процесс — получите план.'),
      el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: start } }, 'Начать свой проект')
    ])));

    var page = el('div', { class: 'page home' }, [heroBox, results, blocks, privacy, finalBox]);
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
    container.appendChild(el('div', { class: 'page narrow method' }, [
      el('h1', { class: 'page-title' }, 'Методика'),
      el('p', { class: 'lead' }, 'Коротко о том, как Molxo Flow собирает требования и что делает с вашими ответами.'),
      block('Как устроен сбор требований', [
        el('p', null, 'Вы отвечаете на ' + MF.QUESTIONS.length + ' вопросов обычными словами. Отвечать можно приблизительно, к любому вопросу можно вернуться и поправить ответ. Рядом, в боковой панели, сразу видно, как из ответов складывается схема процесса.')
      ]),
      block(MF.QUESTIONS.length + ' вопросов по разделам', [el('ul', { class: 'method-list' }, groups)]),
      block('Как считается готовность', [
        el('p', null, 'Готовность требований — доля вопросов, на которые есть ответ: заполненные вопросы делятся на ' + MF.QUESTIONS.length + ' и округляются до процента. Пустой ответ или одни пробелы не считаются. Отдельный счётчик «Ответы для ТЗ» показывает, сколько из 11 ключевых вопросов (с 1 по 11) заполнено.')
      ]),
      block('Как считается предварительный потенциал', [
        el('p', null, 'Число запусков в месяц берётся из ответа на вопрос 5. Дальше работают три допущения: ' + a.minutesPerRun + ' мин на один запуск, ' + Math.round(a.automationShare * 100) + '% работы берёт автоматизация, ' + MF.formatNumber(a.hourlyRate) + ' ₽ за час. Это не факты о вашем бизнесе, а стартовые значения: их можно изменить в боковой панели интервью. Без числа запусков расчёт не показывается и стоит пометка «Нужно уточнить».'),
        el('p', null, 'Оценка предварительная и нужна для ориентира, а не для бюджета.')
      ]),
      block('Документы', [
        el('p', null, 'Из ответов собирается пакет из 12 файлов в формате Markdown. Если на вопрос нет ответа, в документе остаётся явная пометка «Не заполнено», ничего не придумывается.')
      ]),
      block('Приватность', [
        el('p', null, 'Всё работает в вашем браузере. Ответы сохраняются только на этом устройстве, в локальном хранилище браузера, и автоматически. Нет аккаунтов, паролей, платежей, аналитики и отправки данных в сеть. Удалить всё можно кнопкой «Очистить данные проекта» внизу страницы.')
      ]),
      el('div', { class: 'method-actions' }, [
        el('a', { href: '#/interview', class: 'btn btn-primary' }, ctx.state.demo ? 'К интервью' : 'Перейти к вопросам'),
        el('a', { href: '#/', class: 'btn btn-secondary' }, 'На главную')
      ])
    ]));
  }

  ui.registerView('home', renderHome);
  ui.registerView('method', renderMethod);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
