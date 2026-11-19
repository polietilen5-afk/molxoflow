/* Booking Desk demo core: shared store, helpers, permissions, audit log, shell. All data is fictional. */
(function (w) {
  'use strict';
  var BK = w.BK = { mods: {}, order: [] };
  var T = BK.T = function (k, v) { return w.MFI18N.t(k, v); };
  var doc = w.document;

  /* ---------- DOM helpers ---------- */
  function el(tag, a, kids) {
    var e = doc.createElement(tag), k;
    a = a || {};
    for (k in a) {
      if (!Object.prototype.hasOwnProperty.call(a, k)) continue;
      var v = a[k];
      if (k === 'text') e.textContent = v;
      else if (k === 'cls') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'object' ? c : doc.createTextNode(String(c))); });
    return e;
  }
  BK.el = el;
  var ICONS = {
    home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>', cal: '<path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5S14.5 17.900 12 20.500C9.500 17.900 8.400 15.100 8.400 12S9.500 6.100 12 3.500z"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14.8c1.8.7 3 2.4 3 5.2"/>',
    tag: '<path d="M4 4h8l8 8-8 8-8-8z"/><circle cx="8.5" cy="8.5" r="1.2"/>', team: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.800 3-6 7-6s7 2.200 7 6"/>',
    bot: '<path d="M4 5h16v11H11l-5 4v-4H4z"/><path d="M8 10h8M8 13h5"/>', ai: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM18 16l.8 2.200L21 19l-2.200.8L18 22l-.8-2.200L15 19l2.200-.8z"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>', bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',
    chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M18.400 5.600l-2.100 2.100M7.700 16.300l-2.100 2.100"/>',
    log: '<path d="M4 6h16M4 12h16M4 18h10"/>', lock: '<path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z"/>', search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.200-4.200"/>',
    alert: '<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 17v.5"/>', back: '<path d="M15 5 8 12l7 7"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="m6 6 12 12M18 6 6 18"/>', check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>', send: '<path d="M4 12 20 4l-4 16-4-6z"/>',
    shield: '<path d="M12 3 5 6v5c0 4.500 3 8 7 10 4-2 7-5.500 7-10V6z"/><path d="m9 12 2.200 2.200L15.500 10"/>', clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 4 2.400 5 5.600.7-4.100 3.800 1.100 5.500L12 16.400 7 19l1.100-5.500L4 9.700 9.600 9z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  var icon = BK.icon = function (n) { return el('span', { cls: 'ic', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>' }); };
  BK.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- toast & dialog ---------- */
  var toastEl = null, toastT = 0;
  BK.toast = function (msg) {
    if (!toastEl) { toastEl = el('div', { cls: 'bk-toast', role: 'status', 'aria-live': 'polite' }); doc.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  };
  /* buttons: [{text, cls, onclick(dlg) -> false keeps open}] */
  BK.dialog = function (title, body, buttons, opts) {
    var d = el('dialog', { cls: 'bk-dlg' + (opts && opts.wide ? ' wide' : ''), 'aria-labelledby': 'dlgT' });
    var head = el('div', { cls: 'dlg-h' }, [el('h3', { id: 'dlgT', text: title }), el('button', { type: 'button', cls: 'dlg-x', 'aria-label': T('dlg.close'), onclick: function () { d.close(); } }, [icon('x')])]);
    var foot = el('div', { cls: 'dlg-f' });
    (buttons || []).forEach(function (b) {
      foot.appendChild(el('button', { type: 'button', cls: 'btn btn-sm' + (b.ghost ? ' btn-ghost' : ''), text: b.text, onclick: function () { if (b.onclick && b.onclick(d) === false) return; d.close(); } }));
    });
    if (!buttons || !buttons.length) foot.appendChild(el('button', { type: 'button', cls: 'btn btn-sm btn-ghost', text: T('dlg.close'), onclick: function () { d.close(); } }));
    d.appendChild(head); d.appendChild(el('div', { cls: 'dlg-b' }, [body])); d.appendChild(foot);
    var from = doc.activeElement;
    d.addEventListener('close', function () { d.remove(); if (from && from.isConnected) from.focus({ preventScroll: true }); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    doc.body.appendChild(d); d.showModal();
    return d;
  };
  BK.confirm = function (title, text, okText, fn) { BK.dialog(title, el('p', { text: text }), [{ text: T('dlg.cancel'), ghost: true }, { text: okText, onclick: function () { fn(); } }]); };

  /* ---------- forms ---------- */
  /* fields: [{k,label,type,opts:[[v,label]],value,req,min,max,help,rows,pattern}] */
  BK.form = function (fields, validate) {
    var wrap = el('form', { cls: 'bk-form', novalidate: true, onsubmit: function (e) { e.preventDefault(); } }), refs = {};
    fields.forEach(function (f) {
      var inp;
      if (f.type === 'select') {
        inp = el('select', { cls: 'in', id: 'ff-' + f.k, name: f.k });
        f.opts.forEach(function (o) { inp.appendChild(el('option', { value: o[0], text: o[1] })); });
      } else if (f.type === 'textarea') inp = el('textarea', { cls: 'in ta', id: 'ff-' + f.k, name: f.k, rows: f.rows || 3 });
      else inp = el('input', { cls: 'in', id: 'ff-' + f.k, name: f.k, type: f.type || 'text', min: f.min, max: f.max, maxlength: f.maxlength });
      if (f.value !== undefined && f.value !== null) inp.value = f.value;
      if (f.disabled) inp.disabled = true;
      var err = el('span', { cls: 'err', id: 'err-' + f.k, role: 'alert' });
      inp.setAttribute('aria-describedby', 'err-' + f.k + (f.help ? ' hp-' + f.k : ''));
      refs[f.k] = { inp: inp, err: err, f: f };
      wrap.appendChild(el('div', { cls: 'fl' }, [el('label', { 'for': 'ff-' + f.k, text: f.label + (f.req ? ' *' : '') }), inp, f.help ? el('small', { id: 'hp-' + f.k, text: f.help }) : null, err]));
    });
    var api = {
      node: wrap,
      get: function () { var o = {}; for (var k in refs) o[k] = refs[k].inp.value.trim ? refs[k].inp.value.trim() : refs[k].inp.value; return o; },
      validate: function () {
        var v = api.get(), bad = null, k, m;
        for (k in refs) {
          m = '';
          var f = refs[k].f;
          if (f.req && !v[k]) m = T('v.req');
          else if (v[k] && f.type === 'number') { var n = Number(v[k]); if (isNaN(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) m = T('v.range', { min: f.min, max: f.max }); }
          else if (v[k] && f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v[k])) m = T('v.date');
          else if (v[k] && f.minlen && v[k].length < f.minlen) m = T('v.minlen', { n: f.minlen });
          else if (v[k] && f.pattern && !f.pattern.test(v[k])) m = T(f.patternMsg || 'v.format');
          refs[k].err.textContent = m;
          if (m) { refs[k].inp.setAttribute('aria-invalid', 'true'); if (!bad) bad = refs[k].inp; } else refs[k].inp.removeAttribute('aria-invalid');
        }
        if (!bad && validate) {
          var ex = validate(v) || {};
          for (k in ex) { if (refs[k]) { refs[k].err.textContent = T(ex[k].key || ex[k], ex[k].vars); refs[k].inp.setAttribute('aria-invalid', 'true'); if (!bad) bad = refs[k].inp; } }
        }
        if (bad) bad.focus();
        return !bad;
      },
      set: function (k, val) { refs[k].inp.value = val; },
      ref: function (k) { return refs[k].inp; }
    };
    return api;
  };

  /* ---------- tables: real table on desktop, cards on phones ---------- */
  BK.table = function (cols, rows, opts) {
    opts = opts || {};
    var t = el('table', { cls: 'rt' + (opts.cls ? ' ' + opts.cls : '') });
    var tr = el('tr'); cols.forEach(function (c) { tr.appendChild(el('th', { scope: 'col', text: c.h, cls: c.cls })); });
    t.appendChild(el('thead', {}, [tr]));
    var tb = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr', { cls: opts.rowCls ? opts.rowCls(r) : '' });
      cols.forEach(function (c, i) {
        var v = c.f(r);
        var td = el('td', { 'data-l': c.h, cls: (c.cls || '') + (i === 0 ? ' first' : '') });
        if (v !== null && v !== undefined) td.appendChild(typeof v === 'object' ? v : doc.createTextNode(String(v)));
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    var box = el('div', { cls: 'rt-wrap' }, [t]);
    if (!rows.length) return el('div', { cls: 'empty' }, [el('b', { text: opts.empty || T('empty.none') }), el('span', { text: opts.emptyHint || '' })]);
    return box;
  };
  BK.badge = function (kind, text) { return el('span', { cls: 'pf-badge ' + kind, text: text }); };
  BK.btn = function (text, fn, cls) { return el('button', { type: 'button', cls: 'btn btn-sm ' + (cls || ''), text: text, onclick: fn }); };
  BK.link = function (text, fn) { return el('button', { type: 'button', cls: 'lnk', text: text, onclick: fn }); };
  BK.locked = function (text) { return el('span', { cls: 'lockedv' }, [icon('lock'), el('span', { text: text || T('hidden') })]); };
  BK.tabs = function (list, cur, onpick, label) {
    var n = el('div', { cls: 'tabs sub', role: 'tablist', 'aria-label': label || '' });
    list.forEach(function (t) {
      n.appendChild(el('button', { type: 'button', role: 'tab', 'aria-selected': cur === t[0] ? 'true' : 'false', tabindex: cur === t[0] ? '0' : '-1', 'data-tab': t[0], onclick: function () { onpick(t[0]); } }, [t[1], t[2] ? el('em', { cls: 'cnt', text: String(t[2]) }) : null]));
    });
    n.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = [].slice.call(n.querySelectorAll('[role="tab"]')), i = bs.indexOf(doc.activeElement);
      if (i < 0) return; i = (i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length; bs[i].click();
      var nb = BK.root.querySelector('[data-tab="' + bs[i].getAttribute('data-tab') + '"]'); if (nb) nb.focus();
    });
    return n;
  };
  BK.head = function (title, sub, actions) {
    return el('div', { cls: 'mod-h' }, [el('div', {}, [el('h2', { text: title }), sub ? el('p', { text: sub }) : null]), actions && actions.length ? el('div', { cls: 'mod-a' }, actions) : null]);
  };

}(window));
