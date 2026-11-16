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
      return el('li', { class: 'card how-step' }, [
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
    var kids = head('sec-title', 'security.title', 'security.lead').concat([
      el('ul', { class: 'security-list', 'aria-label': MF.t('security.aria') }, items.map(function (t) { return el('li', { class: 'security-item' }, t); }))
    ]);
    if (o.intelligence) kids.push(el('p', { class: 'security-note', role: 'note' }, MF.t('security.intelligence')));
    if (MF.botLink && MF.botLink().ok) kids.push(el('p', { class: 'security-note', role: 'note' }, MF.t('security.bot')));
    var box = el('section', { class: 'info-block security-block', 'aria-labelledby': 'sec-title' }, kids);
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
      el('p', { class: 'ai-badge-row', 'aria-hidden': 'true' }, el('span', { class: 'ai-badge' }, MF.t('agent.ai'))),
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
      el('span', { class: 'ai-badge', 'aria-hidden': 'true' }, MF.t('agent.ai'))
    ]);
    container.appendChild(btn);
    return btn;
  };

  // «Открыть чат на сайте»: только при верном MF.CONFIG.agentUrl; чат живёт на отдельном адресе и сервере, это сказано в тексте.
  ui.renderAgentWeb = function (container) {
    var link = MF.agentLink ? MF.agentLink() : { ok: false, href: '' };
    if (!link.ok) return null;
    var card = el('section', { class: 'card bot-card agent-web', 'aria-labelledby': 'agent-web-title' }, [
      el('p', { class: 'ai-badge-row', 'aria-hidden': 'true' }, el('span', { class: 'ai-badge' }, MF.t('agent.ai'))),
      el('h2', { id: 'agent-web-title', class: 'card-title' }, MF.t('agent.webTitle')),
      el('p', { class: 'bot-text' }, MF.t('agent.webText')),
      el('p', { class: 'bot-note small muted' }, MF.t('agent.webNote')),
      el('a', { href: link.href, class: 'btn btn-secondary bot-link', 'aria-label': MF.t('agent.webAria') }, MF.t('agent.web'))
    ]);
    container.appendChild(card);
    return card;
  };

  // Плавающий чат с менеджером (ИИ): кнопка в углу экрана и панель с iframe. Только при верном MF.CONFIG.agentUrl;
  // адрес чата загружается лишь при первом открытии панели, до этого iframe не существует.
  var chatWidget = null;
  ui.renderChatWidget = function (container) {
    if (chatWidget) chatWidget.dispose();
    chatWidget = null;
    var link = MF.agentLink ? MF.agentLink() : { ok: false, href: '' };
    if (!link.ok) return null;
    var frame = null, opened = false;
    var button = el('button', { type: 'button', class: 'chat-fab', 'aria-label': MF.t('agent.chatAria'), 'aria-expanded': 'false', 'aria-controls': 'chat-panel', on: { click: function () { if (opened) close(); else open(); } } }, [
      MF.t('agent.chat') + ' ',
      el('span', { class: 'ai-badge', 'aria-hidden': 'true' }, MF.t('agent.ai'))
    ]);
    var body = el('div', { class: 'chat-body' });
    var closeBtn = el('button', { type: 'button', class: 'chat-close', 'aria-label': MF.t('agent.chatClose'), on: { click: function () { close(); } } }, '×');
    var panel = el('div', { id: 'chat-panel', class: 'chat-panel', role: 'dialog', 'aria-labelledby': 'chat-panel-title', hidden: true }, [
      el('div', { class: 'chat-head' }, [
        el('h2', { id: 'chat-panel-title', class: 'chat-title' }, MF.t('agent.chatTitle')),
        closeBtn
      ]),
      body
    ]);
    panel.hidden = true;
    function onKey(e) { if (e && (e.key === 'Escape' || e.key === 'Esc')) close(); }
    function open() {
      if (opened) return;
      opened = true;
      if (!frame) {
        frame = el('iframe', { class: 'chat-frame', src: link.href + 'chat', title: MF.t('agent.chatTitle'), sandbox: 'allow-scripts allow-same-origin allow-forms', referrerpolicy: 'no-referrer' });
        body.appendChild(frame);
      }
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKey);
      closeBtn.focus();
    }
    function close() {
      if (!opened) return;
      opened = false;
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey);
      button.focus();
    }
    var rootNode = el('div', { class: 'chat-widget' }, [button, panel]);
    container.appendChild(rootNode);
    function dispose() {
      document.removeEventListener('keydown', onKey);
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
          return el('li', { class: 'card trust-item' }, [el('h3', { class: 'trust-title' }, it.title), el('p', { class: 'trust-text' }, it.text)]);
        }))
      ]);
      container.appendChild(box);
      shown.push(box);
    });
    return shown;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
