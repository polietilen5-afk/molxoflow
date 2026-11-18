/* Molxo Flow: вход к ИИ-агенту. Два входа к одному агенту: кнопка Telegram в шапке и плавающий чат в углу (как в поддержке).
   Значения берутся из agent/config.js (window.MOLXO_AGENT); пусто или неверно = элемент не создаётся.
   Тексты из словарей MFI18N (ключи agent.*), перерисовываются при смене языка. Адрес чата грузится только при первом открытии. */
(function (w) {
  'use strict';
  var I = w.MFI18N, d = w.document, C = w.MOLXO_AGENT || {};
  if (!I || !d) return;

  function validBot(v) { return typeof v === 'string' && /^[A-Za-z0-9_]{3,64}$/.test(v) ? v : ''; }
  function validHost(v) {
    if (typeof v !== 'string' || v.length > 253) return '';
    if (!/^[a-z0-9.-]+$/i.test(v) || v.indexOf('.') < 1 || /\.\.|^[.-]|[.-]$/.test(v)) return '';
    return v;
  }
  var bot = validBot(C.bot), host = validHost(C.agentUrl);
  if (!bot && !host) return;
  var tgHref = bot ? 'https://t.me/' + bot : '';

  function el(tag, attrs, kids) {
    var n = d.createElement(tag), k;
    if (attrs) for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? d.createTextNode(c) : c); });
    return n;
  }
  function icon() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = d.createElementNS(NS, 'svg'), path = d.createElementNS(NS, 'path');
    svg.setAttribute('viewBox', '0 0 20 20'); svg.setAttribute('class', 'agent-fab-ico'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    path.setAttribute('d', 'M3.5 4.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H3.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5'); path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }
  var texts = []; // [узел, ключ, атрибут или '']
  function bind(node, key, attr) { texts.push([node, key, attr || '']); return node; }
  function refresh() {
    texts.forEach(function (x) {
      var v = I.t(x[1]);
      if (x[2]) x[0].setAttribute(x[2], v); else x[0].textContent = v;
    });
  }

  /* кнопка Telegram в шапке */
  var askBtn = null;
  if (tgHref) {
    var tools = d.querySelector('.top-r');
    if (tools) {
      askBtn = el('a', { 'class': 'btn btn-sm btn-ghost agent-ask', href: tgHref, target: '_blank', rel: 'noopener' }, [
        bind(el('span'), 'agent.ask'), el('span', { 'class': 'agent-ai', 'aria-hidden': 'true' }, ['AI'])
      ]);
      tools.insertBefore(askBtn, tools.firstChild);
    }
  }

  /* плавающий чат */
  if (host) {
    var open = false, loadedFrame = false, frame = null, slowTimer = null;
    var fab = el('button', { type: 'button', 'class': 'agent-fab', 'aria-expanded': 'false', 'aria-controls': 'agent-panel' }, [
      icon(),
      bind(el('span', { 'class': 'agent-fab-label' }), 'agent.fab'),
      el('span', { 'class': 'agent-ai', 'aria-hidden': 'true' }, ['AI'])
    ]);
    bind(fab, 'agent.fab.aria', 'aria-label');

    var closeBtn = el('button', { type: 'button', 'class': 'agent-close' }, ['\u00d7']);
    bind(closeBtn, 'agent.close', 'aria-label');
    var title = bind(el('h2', { 'class': 'agent-title', id: 'agent-title' }), 'agent.title');
    var note = bind(el('p', { 'class': 'agent-note' }), 'agent.note');
    var slow = el('p', { 'class': 'agent-slow', hidden: 'hidden' }, [bind(el('span'), 'agent.slow')]);
    if (tgHref) slow.appendChild(el('a', { href: tgHref, target: '_blank', rel: 'noopener' }, [bind(el('span'), 'agent.tg')]));
    var tgRow = tgHref ? el('p', { 'class': 'agent-tgrow' }, [el('a', { href: tgHref, target: '_blank', rel: 'noopener' }, [bind(el('span'), 'agent.tg')])]) : null;
    var body = el('div', { 'class': 'agent-body' }, [slow]);
    var panel = el('div', { id: 'agent-panel', 'class': 'agent-panel', role: 'dialog', 'aria-labelledby': 'agent-title', hidden: 'hidden', tabindex: '-1' }, [
      el('div', { 'class': 'agent-bezel' }, [el('div', { 'class': 'agent-screen' }, [
        el('span', { 'class': 'agent-island', 'aria-hidden': 'true' }),
        el('div', { 'class': 'agent-head' }, [title, closeBtn]), note, tgRow, body
      ])])
    ]);
    var wrap = el('div', { 'class': 'agent-widget' }, [fab, panel]);
    d.body.appendChild(wrap);

    function ensureFrame() {
      if (loadedFrame) return;
      loadedFrame = true;
      frame = el('iframe', { 'class': 'agent-frame', title: '', sandbox: 'allow-scripts allow-same-origin allow-forms', referrerpolicy: 'no-referrer' });
      bind(frame, 'agent.frame', 'title');
      frame.addEventListener('load', function () { if (slowTimer) { w.clearTimeout(slowTimer); slowTimer = null; } slow.hidden = true; });
      body.insertBefore(frame, slow);
      slowTimer = w.setTimeout(function () { slow.hidden = false; }, 8000);
      frame.setAttribute('src', 'https://' + host + '/');
      refresh();
    }
    function setOpen(v) {
      open = v;
      fab.setAttribute('aria-expanded', v ? 'true' : 'false');
      panel.hidden = !v;
      wrap.className = 'agent-widget' + (v ? ' is-open' : '');
      if (v) { ensureFrame(); try { panel.focus(); } catch (e) {} }
      else { try { fab.focus(); } catch (e2) {} }
    }
    fab.addEventListener('click', function () { setOpen(!open); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    d.addEventListener('keydown', function (e) { if (open && (e.key === 'Escape' || e.key === 'Esc')) setOpen(false); });
  }

  refresh();
  I.onChange(refresh);
})(window);
