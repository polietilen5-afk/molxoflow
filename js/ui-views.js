/* Molxo Flow: виды «Студия» и «Документы». Работает только в браузере. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined' || !MF.ui) return;
  var ui = MF.ui, el = ui.el;

  // Скачивание без сети: Blob + <a download>.
  function download(name, data, type) {
    var blob = new Blob([data], { type: type });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name, class: 'visually-hidden' });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    root.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  ui.download = download;

  // ---------- Студия ----------
  var selectedModule = 0;

  function renderStudio(container) {
    ui.renderConstructorTabs(container, 'studio');
    var modules = MF.MODULES;
    var buttons = [];
    var roleBox = el('div', { class: 'module-detail card', 'aria-live': 'polite' });

    function showModule(i) {
      selectedModule = i;
      buttons.forEach(function (b, k) {
        b.setAttribute('aria-pressed', k === i ? 'true' : 'false');
        if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        b.classList.toggle('is-selected', k === i);
      });
      var m = modules[i];
      ui.clear(roleBox);
      roleBox.appendChild(el('p', { class: 'eyebrow' }, 'МОДУЛЬ ' + (i + 1) + ' ИЗ ' + modules.length));
      roleBox.appendChild(el('h2', { class: 'card-title' }, m.title));
      roleBox.appendChild(el('p', { class: 'module-role' }, m.role));
      roleBox.appendChild(el('ul', { class: 'tag-list', 'aria-label': 'Теги модуля' },
        m.tags.map(function (t) { return el('li', { class: 'tag tag-' + MF.MODULE_TAGS.indexOf(t) }, t); })));
    }

    var chain = [];
    modules.forEach(function (m, i) {
      var btn = el('button', { type: 'button', class: 'module-btn', 'aria-pressed': 'false', on: { click: function () { showModule(i); } } }, [
        el('span', { class: 'module-num', 'aria-hidden': 'true' }, String(i + 1)),
        el('span', { class: 'module-name' }, m.title)
      ]);
      buttons.push(btn);
      chain.push(el('li', { class: 'module-item' }, btn));
      if (i < modules.length - 1) chain.push(el('li', { class: 'module-link', 'aria-hidden': 'true' }, el('span', { class: 'flow-dot' })));
    });

    var legend = el('ul', { class: 'tag-list legend-list', 'aria-label': 'Легенда тегов' },
      MF.MODULE_TAGS.map(function (t, k) { return el('li', { class: 'tag tag-' + k }, t); }));

    container.appendChild(el('div', { class: 'page studio' }, [
      el('h1', { class: 'page-title' }, 'Студия'),
      el('p', { class: 'lead' }, 'Так процесс проходит через шесть модулей: от входных данных до результата. Выберите модуль, чтобы увидеть его роль.'),
      el('div', { class: 'card studio-card' }, [
        el('ol', { class: 'module-chain', 'aria-label': 'Цепочка модулей' }, chain)
      ]),
      roleBox,
      el('section', { class: 'card legend', 'aria-labelledby': 'legend-title' }, [
        el('h2', { id: 'legend-title', class: 'card-title' }, 'Легенда тегов'),
        legend
      ]),
      el('div', { class: 'studio-actions' }, [
        el('button', { type: 'button', class: 'btn btn-primary btn-large', on: { click: function () { ui.go('interview'); } } }, 'Начать Discovery →')
      ])
    ]));
    showModule(selectedModule);
  }

  // ---------- Документы ----------
  var selectedDoc = 0;

  function renderDocs(container, ctx) {
    ui.renderConstructorTabs(container, 'docs');
    var docs = MF.buildDocs(ctx.state);
    var items = [];
    var title = el('h2', { class: 'card-title doc-title' });
    var fileName = el('p', { class: 'muted small doc-file' });
    var pre = el('pre', { class: 'doc-preview', tabindex: '0', 'aria-label': 'Предпросмотр документа' });
    var dlBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-small', on: { click: function () {
      var d = docs[selectedDoc];
      download(d.file, d.content, 'text/markdown;charset=utf-8');
    } } }, 'Скачать .md');

    function show(i) {
      selectedDoc = i;
      var d = docs[i];
      items.forEach(function (b, k) {
        b.setAttribute('aria-pressed', k === i ? 'true' : 'false');
        if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        b.classList.toggle('is-selected', k === i);
      });
      title.textContent = d.title;
      fileName.textContent = d.file;
      pre.textContent = d.content;
      pre.scrollTop = 0;
    }

    var list = el('ul', { class: 'doc-list', 'aria-label': 'Список документов' }, docs.map(function (d, i) {
      var b = el('button', { type: 'button', class: 'doc-btn', 'aria-pressed': 'false', on: { click: function () { show(i); } } }, [
        el('span', { class: 'doc-num', 'aria-hidden': 'true' }, String(i + 1 < 10 ? '0' + (i + 1) : i + 1)),
        el('span', { class: 'doc-name' }, d.title)
      ]);
      items.push(b);
      return el('li', null, b);
    }));

    var zipBtn = el('button', { type: 'button', class: 'btn btn-primary', on: { click: function () {
      // Пакет «Для разработчика»: сводка 00-svodka-dlya-centr.md и 12 документов.
      var wizard = typeof ui.getWizard === 'function' ? ui.getWizard() : MF.emptyWizard();
      var bytes = MF.buildZip(MF.devFiles(ui.state, wizard));
      download('molxo-flow-tz.zip', bytes, 'application/zip');
    } } }, 'Скачать всё (ZIP)');

    var pendingCount = docs.filter(function (d) { return d.content.indexOf(MF.PENDING_MARK) >= 0; }).length;

    container.appendChild(el('div', { class: 'page docs' }, [
      el('h1', { class: 'page-title' }, 'Документы'),
      el('p', { class: 'lead' }, 'Двенадцать файлов технического задания в формате Markdown. Выберите файл для предпросмотра, скачайте его или весь пакет.'),
      el('p', { class: 'muted small docs-zip-note' }, MF.t('docs.zipNote')),
      pendingCount ? el('p', { class: 'pending docs-pending' }, 'В ' + pendingCount + ' из ' + docs.length + ' документов есть пометки «' + MF.PENDING_MARK + '»: ответьте на вопросы, и они пропадут.') : null,
      el('div', { class: 'docs-layout' }, [
        el('div', { class: 'card docs-side' }, [list, el('div', { class: 'docs-zip' }, zipBtn)]),
        el('div', { class: 'card docs-main' }, [
          el('div', { class: 'doc-head' }, [el('div', { class: 'doc-head-text' }, [title, fileName]), dlBtn]),
          pre
        ])
      ])
    ]));
    show(Math.min(selectedDoc, docs.length - 1));
  }

  ui.registerView('studio', renderStudio);
  ui.registerView('docs', renderDocs);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
