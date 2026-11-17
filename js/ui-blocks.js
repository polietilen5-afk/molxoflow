/* Molxo Flow: общие блоки главной и страницы «Ваш план» — «Как мы работаем», «Безопасность и контроль»,
   карточка бота, кейсы, отзывы и гарантии владельца. Работает только в браузере.
   Все тексты через MF.t; содержимое MF.CONFIG (кейсы, отзывы, гарантии, бот) выводится только текстом. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined' || !MF.ui || !MF.ui.el) return;
  var ui = MF.ui, el = ui.el;

  // Заголовок блока: h2 с id, связанным с aria-labelledby секции.
  function head(id, titleKey, leadKey) {
    return [
      el('h2', { id: id, class: 'section-sub info-title' }, MF.t(titleKey)),
      leadKey ? el('p', { class: 'info-lead muted' }, MF.t(leadKey)) : null
    ];
  }

  // «Как мы работаем»: четыре шага. Без обещаний сроков, цен и результата.
  ui.renderHow = function (container) {
    var steps = [1, 2, 3, 4].map(function (n) {
      return el('li', { class: 'how-step' }, [
        el('span', { class: 'how-num', 'aria-hidden': 'true' }, String(n)),
        el('h3', { class: 'how-name' }, MF.t('how.' + n + '.title')),
        el('p', { class: 'how-text' }, MF.t('how.' + n + '.text'))
      ]);
    });
    var box = el('section', { class: 'info-block how-block', 'aria-labelledby': 'how-title' },
      head('how-title', 'how.title', 'how.lead').concat([el('ol', { class: 'how-steps', 'aria-label': MF.t('how.aria') }, steps)]));
    container.appendChild(box);
    return box;
  };

  // «Безопасность и контроль»: только то, что верно для сайта. opts.intelligence добавляет оговорку про законные источники.
  ui.renderSecurity = function (container, opts) {
    var o = opts || {};
    var items = [
      MF.t('security.1'),
      MF.t('security.2'),
      MF.t('security.3', { button: MF.t('shell.clear.button') }),
      MF.t('security.4')
    ];
    // opts.bare: список без собственного заголовка (на главной он стоит под заголовком «Данные остаются у вас»).
    var list = el('ul', { class: 'security-list', 'aria-label': MF.t('security.aria') }, items.map(function (t) { return el('li', { class: 'security-item' }, t); }));
    var kids = o.bare ? [list] : head('sec-title', 'security.title', 'security.lead').concat([list]);
    if (o.intelligence) kids.push(el('p', { class: 'security-note', role: 'note' }, MF.t('security.intelligence')));
    if (MF.botLink && MF.botLink().ok) kids.push(el('p', { class: 'security-note', role: 'note' }, MF.t('security.bot')));
    var box = el('section', o.bare ? { class: 'info-block security-block', 'aria-label': MF.t('security.title') } : { class: 'info-block security-block', 'aria-labelledby': 'sec-title' }, kids);
    container.appendChild(box);
    return box;
  };

  // Карточка бота: только при верном MF.CONFIG.bot; ссылка tg://resolve?domain=имя, пояснение, что отвечает ИИ.
  // opts.code (из MF.botStartCode) добавляет в ссылку контекст плана; недопустимый код отбрасывает MF.botLink.
  ui.renderBotCard = function (container, opts) {
    var code = opts && typeof opts.code === 'string' ? opts.code : '';
    var link = MF.botLink ? MF.botLink(code) : { ok: false, href: '' };
    if (!link.ok) return null;
    var withContext = !!code && link.href.indexOf('&start=') >= 0;
    var card = el('section', { class: 'card bot-card', 'aria-labelledby': 'bot-title' }, [
      el('p', { class: 'ai-badge-row' }, el('span', { class: 'ai-badge' }, MF.t('agent.ai'))),
      el('h2', { id: 'bot-title', class: 'card-title' }, MF.t('botcard.title')),
      el('p', { class: 'bot-text' }, MF.t('botcard.text')),
      el('p', { class: 'bot-note small muted' }, MF.t('botcard.note')),
      withContext ? el('p', { class: 'bot-note small muted' }, MF.t('botcard.context')) : null,
      el('a', { href: link.href, class: 'btn btn-secondary bot-link' }, MF.t('botcard.open'))
    ]);
    container.appendChild(card);
    return card;
  };

  // Постоянная кнопка «Спросить ассистента» (шапка): только при верном MF.CONFIG.bot, с пометкой ИИ.
  ui.renderAskButton = function (container) {
    var link = MF.botLink ? MF.botLink() : { ok: false, href: '' };
    if (!link.ok) return null;
    var btn = el('a', { href: link.href, class: 'btn btn-secondary btn-small ask-btn', 'aria-label': MF.t('agent.askAria') }, [
      MF.t('agent.ask') + ' ',
      el('span', { class: 'ai-badge' }, MF.t('agent.ai'))
    ]);
    container.appendChild(btn);
    return btn;
  };

  // «Открыть чат на сайте»: только при верном MF.CONFIG.agentUrl; чат живёт на отдельном адресе и сервере, это сказано в тексте.
  ui.renderAgentWeb = function (container) {
    var link = MF.agentLink ? MF.agentLink() : { ok: false, href: '' };
    if (!link.ok) return null;
    var card = el('section', { class: 'card bot-card agent-web', 'aria-labelledby': 'agent-web-title' }, [
      el('p', { class: 'ai-badge-row' }, el('span', { class: 'ai-badge' }, MF.t('agent.ai'))),
      el('h2', { id: 'agent-web-title', class: 'card-title' }, MF.t('agent.webTitle')),
      el('p', { class: 'bot-text' }, MF.t('agent.webText')),
      el('p', { class: 'bot-note small muted' }, MF.t('agent.webNote')),
      el('a', { href: link.href, class: 'btn btn-secondary bot-link', 'aria-label': MF.t('agent.webAria') }, MF.t('agent.web'))
    ]);
    container.appendChild(card);
    return card;
  };

  // Один блок «Задать вопрос ассистенту» вместо двух карточек: ссылка на Telegram (при верном bot) и на чат на сайте (при верном agentUrl).
  // opts.code (из MF.botStartCode) добавляет в ссылку на бота контекст плана. Нет ни бота, ни чата: null.
  ui.renderAssistant = function (container, opts) {
    var code = opts && typeof opts.code === 'string' ? opts.code : '';
    var bot = MF.botLink ? MF.botLink(code) : { ok: false, href: '' };
    var web = MF.agentLink ? MF.agentLink() : { ok: false, href: '' };
    if (!bot.ok && !web.ok) return null;
    var withContext = bot.ok && !!code && bot.href.indexOf('&start=') >= 0;
    var links = [];
    if (bot.ok) links.push(el('a', { href: bot.href, class: 'btn btn-secondary bot-link' }, MF.t('botcard.open')));
    if (web.ok) links.push(el('a', { href: web.href, class: 'btn btn-secondary bot-link', 'aria-label': MF.t('agent.webAria') }, MF.t('agent.web')));
    var card = el('section', { class: 'card bot-card assistant-card', 'aria-labelledby': 'assistant-title' }, [
      el('p', { class: 'ai-badge-row' }, el('span', { class: 'ai-badge' }, MF.t('agent.ai'))),
      el('h2', { id: 'assistant-title', class: 'card-title' }, MF.t('assistant.title')),
      el('p', { class: 'bot-text' }, MF.t('botcard.text')),
      el('p', { class: 'bot-note small muted' }, MF.t('assistant.note')),
      withContext ? el('p', { class: 'bot-note small muted' }, MF.t('botcard.context')) : null,
      el('div', { class: 'assistant-links' }, links)
    ]);
    container.appendChild(card);
    return card;
  };

  // Заголовок уровня: понятное название крупно, код START/GROW/SCALE мелко рядом.
  ui.tierTitle = function (level, id, tag) {
    return el(tag || 'h3', { id: id, class: 'tier-title' }, [
      el('span', { class: 'tier-name' }, MF.t('tier.' + level + '.name')),
      ' ',
      el('span', { class: 'tier-code' }, MF.t('tier.' + level + '.title'))
    ]);
  };

  // Плавающий чат с менеджером (ИИ): кнопка в углу экрана и панель с iframe. Только при верном MF.CONFIG.agentUrl;
  // адрес чата загружается лишь при первом открытии панели, до этого iframe не существует.
  // На телефоне (до 640 px) панель на весь экран работает как модальное окно: aria-modal, фон inert, фокус не уходит за панель.
  var chatWidget = null;
  var LOAD_WAIT_MS = 8000;
  var BACKGROUND_IDS = ['app-header', 'view', 'app-footer', 'demo-banner'];
  function narrowScreen() {
    try { return !!(root.matchMedia && root.matchMedia('(max-width: 640px)').matches); } catch (e) { return false; }
  }
  function prefersReduced() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  // Анимация окна идёт только если есть WAAPI и пользователь не просил убрать движение; иначе окно меняется мгновенно.
  function canAnimate(node) { return typeof node.animate === 'function' && !prefersReduced(); }
  // Пружина окна: настоящая кривая linear() там, где она поддерживается; иначе запасной cubic-bezier (значения те же, что в css --spring-soft).
  var SPRING_FALLBACK = 'cubic-bezier(.2, 1.15, .3, 1)';
  var SPRING_LINEAR = 'linear(0, .1 5%, .38 13%, .7 23%, .92 35%, 1.02 47%, 1.015 60%, 1)';
  function springEasing() {
    try { if (root.CSS && root.CSS.supports && root.CSS.supports('transition-timing-function', 'linear(0, 1)')) return SPRING_LINEAR; } catch (e) { /* запасной вариант */ }
    return SPRING_FALLBACK;
  }

  // Счётчик числа: один раз при первом показе, до 600 мс, ease-out по прогрессу. В DOM сразу итог (для чтеца экрана и без скрипта);
  // при prefers-reduced-motion, без rAF и повторно число не анимируется. fmt: число -> строка.
  ui.countUp = function (node, to, fmt) {
    var finalText = fmt(to);
    node.textContent = finalText;
    if (prefersReduced() || node.getAttribute('data-done') || typeof root.requestAnimationFrame !== 'function') return;
    node.setAttribute('data-done', '1');
    function run() {
      var t0 = null;
      function tick(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3);
        node.textContent = p < 1 ? fmt(Math.round(to * e)) : finalText;
        if (p < 1) root.requestAnimationFrame(tick);
      }
      root.requestAnimationFrame(tick);
    }
    if (typeof root.IntersectionObserver === 'function') {
      try {
        var io = new root.IntersectionObserver(function (es) {
          if (es[0] && es[0].isIntersecting) { io.disconnect(); run(); }
        }, { threshold: 0 });
        io.observe(node);
        return;
      } catch (e) { /* без наблюдателя считаем сразу */ }
    }
    run();
  };
  // Иконка чата 20 px (круглый пузырь с хвостом); рисуется кодом, без файлов и сети.
  function chatIcon() {
    var sc = MF.scene;
    if (!sc || !sc.svg) return el('span', { class: 'chat-fab-icon', 'aria-hidden': 'true' });
    var svg = sc.svg('svg', { viewBox: '0 0 20 20', 'class': 'chat-fab-icon', 'aria-hidden': 'true', focusable: 'false' });
    sc.svg('path', { d: 'M3.5 4.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H3.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, svg);
    return svg;
  }
  ui.renderChatWidget = function (container) {
    if (chatWidget) chatWidget.dispose();
    chatWidget = null;
    var link = MF.agentLink ? MF.agentLink() : { ok: false, href: '' };
    if (!link.ok) return null;
    var frame = null, opened = false, modal = false, loaded = false, timer = null;
    var button = el('button', { type: 'button', class: 'chat-fab', 'aria-label': MF.t('agent.chatAria'), 'aria-expanded': 'false', 'aria-controls': 'chat-panel', on: { click: function () { if (opened) close(); else open(); } } }, [
      chatIcon(),
      el('span', { class: 'chat-fab-label' }, MF.t('agent.chat')),
      ' ',
      el('span', { class: 'ai-badge' }, MF.t('agent.ai'))
    ]);
    // Пока чат не загрузился: текст-статус и скелет из трёх полос (aria-hidden); на теле aria-busy до load.
    var status = el('p', { class: 'chat-status', role: 'status' }, [MF.t('agent.chatLoading'), el('span', { class: 'chat-skel', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')])]);
    var body = el('div', { class: 'chat-body', 'aria-busy': 'true' }, status);
    var closeBtn = el('button', { type: 'button', class: 'chat-close', 'aria-label': MF.t('agent.chatClose'), on: { click: function () { close(); } } }, '×');
    var panel = el('div', { id: 'chat-panel', class: 'chat-panel', role: 'dialog', 'aria-labelledby': 'chat-panel-title', hidden: true }, [
      el('div', { class: 'chat-head' }, [
        el('h2', { id: 'chat-panel-title', class: 'chat-title' }, MF.t('agent.chatTitle')),
        closeBtn
      ]),
      body
    ]);
    panel.hidden = true;

    function inside(node) { return !!(node && panel.contains && panel.contains(node)); }
    function onKey(e) {
      if (!e) return;
      if (e.key === 'Escape' || e.key === 'Esc') { close(); return; }
      // Фон inert: Tab не должен уходить за панель; из iframe клавиши до страницы не доходят.
      if (modal && e.key === 'Tab' && !inside(document.activeElement)) {
        if (e.preventDefault) e.preventDefault();
        closeBtn.focus();
      }
    }
    function onFocusIn(e) { if (modal && opened && e && e.target && !inside(e.target)) closeBtn.focus(); }
    function setInert(on) {
      BACKGROUND_IDS.forEach(function (id) {
        var node = document.getElementById ? document.getElementById(id) : null;
        if (!node) return;
        if (on) node.setAttribute('inert', ''); else node.removeAttribute('inert');
      });
      if (on) button.setAttribute('inert', ''); else button.removeAttribute('inert');
    }
    function stopTimer() { if (timer !== null) { root.clearTimeout(timer); timer = null; } }
    function onLoad() { loaded = true; stopTimer(); status.hidden = true; body.setAttribute('aria-busy', 'false'); }
    // Чат не загрузился за отведённое время: сообщение и, если задан бот, ссылка на Telegram.
    function onSlow() {
      timer = null;
      if (loaded) return;
      ui.clear(status);
      status.hidden = false;
      body.setAttribute('aria-busy', 'false');
      status.appendChild(document.createTextNode(MF.t('agent.chatUnavailable') + ' '));
      var bot = MF.botLink ? MF.botLink() : { ok: false, href: '' };
      if (bot.ok) status.appendChild(el('a', { href: bot.href, class: 'chat-status-link' }, MF.t('agent.chatTelegram')));
      else status.appendChild(document.createTextNode(MF.t('agent.chatLater')));
    }
    // Окно растёт из угла кнопки (origin справа внизу) с пружиной и закрывается быстрее и ближе; hidden ставится после конца выхода.
    // Фокус и aria переключаются сразу, не дожидаясь анимации. На телефоне (лист на весь экран) — сдвиг снизу и прозрачность без масштаба.
    var enterAnim = null, exitAnim = null;
    function stopAnims() {
      if (exitAnim) { exitAnim.onfinish = null; exitAnim.cancel(); exitAnim = null; }
      if (enterAnim) { enterAnim.cancel(); enterAnim = null; }
      if (panel.style) panel.style.pointerEvents = '';
    }
    function showPanel() {
      stopAnims();
      panel.hidden = false;
      if (!canAnimate(panel)) return;
      var small = narrowScreen();
      enterAnim = panel.animate(
        [{ opacity: 0, transform: small ? 'translateY(24px)' : 'translateY(12px) scale(.94)' }, { opacity: 1, transform: 'none' }],
        { duration: 280, easing: small ? 'cubic-bezier(.32, .72, 0, 1)' : springEasing(), fill: 'backwards' }
      );
    }
    function hidePanel() {
      stopAnims();
      if (!canAnimate(panel)) { panel.hidden = true; return; }
      var small = narrowScreen();
      if (panel.style) panel.style.pointerEvents = 'none';
      var a = panel.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: small ? 'translateY(24px)' : 'translateY(8px) scale(.97)' }],
        { duration: 140, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }
      );
      exitAnim = a;
      a.onfinish = function () {
        if (exitAnim !== a) return;
        exitAnim = null;
        panel.hidden = true;
        if (panel.style) panel.style.pointerEvents = '';
        a.cancel();
      };
    }
    function open() {
      if (opened) return;
      opened = true;
      if (!frame) {
        frame = el('iframe', { class: 'chat-frame', src: link.href + 'chat', title: MF.t('agent.chatTitle'), sandbox: 'allow-scripts allow-same-origin allow-forms', referrerpolicy: 'no-referrer', on: { load: onLoad } });
        body.appendChild(frame);
        timer = root.setTimeout(onSlow, LOAD_WAIT_MS);
        if (timer && typeof timer.unref === 'function') timer.unref();
      }
      modal = narrowScreen();
      if (modal) {
        panel.setAttribute('aria-modal', 'true');
        setInert(true);
        document.addEventListener('focusin', onFocusIn);
      }
      showPanel();
      button.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKey);
      closeBtn.focus();
    }
    function release() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      if (modal) { panel.removeAttribute('aria-modal'); setInert(false); }
      modal = false;
    }
    function close() {
      if (!opened) return;
      opened = false;
      hidePanel();
      button.setAttribute('aria-expanded', 'false');
      release();
      button.focus();
    }
    var rootNode = el('div', { class: 'chat-widget' }, [button, panel]);
    container.appendChild(rootNode);
    function dispose() {
      stopTimer();
      stopAnims();
      if (opened) { opened = false; release(); }
      if (rootNode.parentNode) rootNode.parentNode.removeChild(rootNode);
    }
    chatWidget = { root: rootNode, button: button, panel: panel, open: open, close: close, dispose: dispose };
    return chatWidget;
  };

  // «Кто за этим стоит»: только при непустом MF.CONFIG.about.text; текст владельца выводится только текстом.
  ui.renderAbout = function (container) {
    var slot = MF.aboutSlot ? MF.aboutSlot() : null;
    if (!slot) return null;
    var box = el('section', { class: 'info-block about-block', 'aria-labelledby': 'about-title' }, [
      el('h2', { id: 'about-title', class: 'section-sub info-title' }, slot.title || MF.t('about.title')),
      el('p', { class: 'about-text' }, slot.text)
    ]);
    container.appendChild(box);
    return box;
  };

  // Кейсы, отзывы, гарантии владельца: каждый список только когда непуст; текст только текстом.
  ui.renderTrust = function (container) {
    var slots = MF.trustSlots ? MF.trustSlots() : { cases: [], reviews: [], guarantees: [] };
    var shown = [];
    [['cases', 'trust.cases'], ['reviews', 'trust.reviews'], ['guarantees', 'trust.guarantees']].forEach(function (pair) {
      var list = slots[pair[0]];
      if (!list || !list.length) return;
      var id = 'trust-' + pair[0];
      var box = el('section', { class: 'info-block trust-block trust-' + pair[0], 'aria-labelledby': id }, [
        el('h2', { id: id, class: 'section-sub info-title' }, MF.t(pair[1])),
        el('ul', { class: 'trust-list' }, list.map(function (it) {
          return el('li', { class: 'trust-item' }, [el('h3', { class: 'trust-title' }, it.title), el('p', { class: 'trust-text' }, it.text)]);
        }))
      ]);
      container.appendChild(box);
      shown.push(box);
    });
    return shown;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
