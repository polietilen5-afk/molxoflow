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
  ui.renderBotCard = function (container) {
    var link = MF.botLink ? MF.botLink() : { ok: false, href: '' };
    if (!link.ok) return null;
    var card = el('section', { class: 'card bot-card', 'aria-labelledby': 'bot-title' }, [
      el('h2', { id: 'bot-title', class: 'card-title' }, MF.t('botcard.title')),
      el('p', { class: 'bot-text' }, MF.t('botcard.text')),
      el('p', { class: 'bot-note small muted' }, MF.t('botcard.note')),
      el('a', { href: link.href, class: 'btn btn-primary bot-link' }, MF.t('botcard.open'))
    ]);
    container.appendChild(card);
    return card;
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
