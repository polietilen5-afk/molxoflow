/* Conversation engine shared by the AI consultant (site chat) and the Telegram bot, plus the knowledge base module. */
(function (w) {
  'use strict';
  var BK = w.BK, T = BK.T, el = BK.el, icon = BK.icon;
  BK.ud({ kbTab: 'list', aiTest: '', botTab: 'chat' });

  /* ---------- knowledge base helpers ---------- */
  BK.kbTitle = function (e) { return e.t || T('kb.' + e.id + '.t'); };
  BK.kbAnswer = function (e) { return e.a || T('kb.' + e.id + '.a'); };
  BK.kbKw = function (e) { return e.kw || (e.built ? T('kb.' + e.id + '.kw') : ''); };
  function hoursText() {
    var D = BK.DB, d, rng = [], out = [], i, a, b, h;
    for (d = 0; d < 7; d++) {
      a = 9999; b = 0;
      D.staff.forEach(function (s) { h = s.on ? s.hours[d] : null; if (h) { a = Math.min(a, h[0]); b = Math.max(b, h[1]); } });
      rng.push(b ? BK.hhmm(a) + '–' + BK.hhmm(b) : null);
    }
    for (i = 0; i < 7; i++) {
      if (!rng[i]) continue;
      var j = i; while (j + 1 < 7 && rng[j + 1] === rng[i]) j++;
      var f = BK.fmt(BK.addDays('2026-11-16', i), 'wd'), l = BK.fmt(BK.addDays('2026-11-16', j), 'wd');
      out.push((i === j ? f : f + '–' + l) + ' ' + rng[i]); i = j;
    }
    return out.join(', ');
  }
  BK.expand = function (s) {
    var D = BK.DB;
    return BK.fill(s, { hours: hoursText(), phone: D.settings.phone, addr: D.settings.addr, name: D.settings.name, lead: D.settings.lead,
      prices: D.services.filter(function (x) { return x.on; }).map(function (x) { return BK.svcName(x.id) + ' ' + BK.cu(x.price) + ', ' + x.dur + ' ' + T('min'); }).join('; ') });
  };
  /* returns {e, score} or null */
  BK.kbMatch = function (q) {
    q = String(q).toLowerCase();
    var best = null;
    BK.DB.kb.forEach(function (e) {
      if (!e.on) return;
      var score = 0, kws = BK.kbKw(e).toLowerCase().split(','), tw = BK.kbTitle(e).toLowerCase().split(/\s+/);
      kws.forEach(function (k) { k = k.trim(); if (k.length > 1 && q.indexOf(k) >= 0) score += 2; });
      if (!e.built && !BK.kbKw(e)) tw.forEach(function (x) { if (x.length > 3 && q.indexOf(x) >= 0) score += 1; });
      if (score && (!best || score > best.score)) best = { e: e, score: score };
    });
    return best;
  };
  function greetHit(q) { q = q.replace(/[!.,?]/g, '').trim(); return T('chat.kw.hi').toLowerCase().split(',').some(function (k) { k = k.trim(); return k && (q === k || q.indexOf(k + ' ') === 0); }); }
  function kwHit(key, q) { return T(key).toLowerCase().split(',').some(function (k) { k = k.trim(); return k.length > 1 && q.indexOf(k) >= 0; }); }

  /* ---------- engine ---------- */
  var busy = {};
  function C(ch) { return BK.DB.chats[ch]; }
  function push(ch, m) { C(ch).msgs.push(m); }
  function later(ch, fn) {
    busy[ch] = true; BK.render('.chat-in input');
    w.setTimeout(function () { busy[ch] = false; fn(); BK.render('.chat-in input'); }, w.PF && w.PF.reduced ? 0 : 420);
  }
  function chip(k, act, arg, v) { return { k: k, v: v || {}, act: act, arg: arg }; }
  function say(ch, k, v, chips, extra) { var m = { from: 'b', k: k, v: v || {}, chips: chips || null }; if (extra) for (var x in extra) m[x] = extra[x]; push(ch, m); return m; }
  function menu(ch) { return [chip('chat.c.book', 'book'), chip('chat.c.mine', 'mine'), chip('chat.c.prices', 'prices'), chip('chat.c.hours', 'kbq', 'hours')]; }
  function activeSvcs() { return BK.DB.services.filter(function (s) { return s.on; }); }
  function slotChips(svc, n) {
    return BK.firstSlots(svc, n).map(function (x) { return { slot: x, act: 'slot', arg: x }; });
  }
  function persona() { return BK.client(BK.DB.persona) || BK.DB.clients[0]; }
  function offerSlots(ch, svc) {
    var f = C(ch).flow, sl = slotChips(svc, 6);
    if (!sl.length) { say(ch, 'chat.noSlots', {}, menu(ch)); return; }
    sl.push(chip('chat.c.otherDay', 'days'));
    say(ch, 'chat.pickSlot', { svc: svc }, sl);
  }
  function confirmStep(ch) {
    var f = C(ch).flow, p = f.contact;
    say(ch, 'chat.confirm', { svc: f.svc, d: f.slot.d, tm: f.slot.t, staff: BK.staffName(f.slot.staff), name: p.name }, [chip('chat.c.ok', 'ok'), chip('chat.c.change', 'book')]);
  }
  BK.chat = {
    busy: function (ch) { return !!busy[ch]; },
    start: function (ch) {
      var D = BK.DB; C(ch).flow = null;
      say(ch, ch === 'ai' ? 'chat.helloAi' : 'chat.helloBot', { name: D.settings.name }, menu(ch));
    },
    act: function (ch, act, arg, label) {
      var f = C(ch).flow || (C(ch).flow = {});
      if (label) push(ch, label);
      if (act === 'book') { C(ch).flow = {}; later(ch, function () { say(ch, 'chat.pickSvc', {}, activeSvcs().map(function (s) { return { txt: BK.svcName(s.id) + ' · ' + BK.cu(s.price), act: 'svc', arg: s.id, k: '' }; })); }); }
      else if (act === 'svc') { f.svc = arg; later(ch, function () { offerSlots(ch, arg); }); }
      else if (act === 'days') {
        later(ch, function () {
          var out = [], i, d;
          for (i = 0; i < BK.DB.settings.lead && out.length < 6; i++) { d = BK.addDays(BK.TODAY, i); if (BK.slotsFor(f.svc, 'any', d).length) out.push({ dayc: d, act: 'day', arg: d }); }
          say(ch, 'chat.pickDay', {}, out.length ? out : null);
        });
      } else if (act === 'day') {
        later(ch, function () {
          var ss = BK.slotsFor(f.svc, 'any', arg).slice(0, 8).map(function (x) { return { slot: { d: arg, t: x.t, staff: x.staff }, act: 'slot', arg: { d: arg, t: x.t, staff: x.staff } }; });
          say(ch, 'chat.pickSlot', { svc: f.svc }, ss.length ? ss : menu(ch));
        });
      } else if (act === 'slot') {
        f.slot = arg;
        later(ch, function () {
          if (ch === 'bot') { f.contact = { name: persona().name, phone: persona().phone, id: persona().id }; confirmStep(ch); }
          else say(ch, 'chat.askContact', {}, null, { form: true });
        });
      } else if (act === 'contact') { f.contact = arg; later(ch, function () { confirmStep(ch); }); }
      else if (act === 'ok') {
        later(ch, function () {
          var r = BK.book({ svc: f.svc, staff: f.slot.staff, date: f.slot.d, time: f.slot.t, name: f.contact.name, phone: f.contact.phone, client: f.contact.id || null, src: ch });
          if (!r.ok) { say(ch, 'chat.taken', {}, slotChips(f.svc, 4).concat([chip('chat.c.otherDay', 'days')])); return; }
          C(ch).flow = {};
          say(ch, 'chat.booked', { code: r.b.code, svc: r.b.svc, d: r.b.date, tm: r.b.time, staff: BK.staffName(r.b.staff) }, menu(ch));
        });
      } else if (act === 'mine') {
        later(ch, function () {
          var p = persona(), L = BK.DB.bookings.filter(function (b) { return b.client === p.id && BK.active(b) && BK.abs(b.date, b.time) >= BK.nowAbs(); }).sort(function (a, b) { return BK.abs(a.date, a.time) - BK.abs(b.date, b.time); });
          if (!L.length) say(ch, 'chat.noMine', { name: p.name }, menu(ch));
          else say(ch, 'chat.mine', { name: p.name }, L.map(function (b) { return { txt: b.code + ' · ' + BK.when(b) + ' · ' + BK.svcName(b.svc) + ' · ' + T('st.' + b.status) + ' ✕', act: 'cancel', arg: b.id, k: '', aria: T('chat.cancelBk', { code: b.code }) }; }).concat([chip('chat.c.menu', 'menu')]), { list: L.map(function (b) { return b.id; }) });
        });
      } else if (act === 'cancel') {
        var b = BK.booking(arg);
        later(ch, function () {
          if (b && BK.setStatus(b, 'cancelled', 'reason.plans', 'client')) say(ch, 'chat.cancelled', { code: b.code }, menu(ch));
          else say(ch, 'chat.cantCancel', {}, menu(ch));
        });
      } else if (act === 'prices') { later(ch, function () { say(ch, 'chat.prices', {}, menu(ch), { prices: true }); }); }
      else if (act === 'kbq') { later(ch, function () { var e = BK.byId(BK.DB.kb, arg); if (e) say(ch, '', {}, menu(ch), { kb: e.id }); }); }
      else if (act === 'human') { later(ch, function () { BK.notify('handoff', { q: 'chat.humanAsk' }); BK.log('ai', 'ai.handoff', { q: T('chat.humanAsk') }, null, 'client'); say(ch, 'chat.human', {}, menu(ch)); }); }
      else if (act === 'menu') { later(ch, function () { say(ch, 'chat.menu', {}, menu(ch)); }); }
    },
    /* free text from the client */
    user: function (ch, text) {
      text = String(text || '').trim(); if (!text || busy[ch]) return;
      push(ch, { from: 'u', text: text });
      var q = text.toLowerCase(), tr = { q: text, intent: 'kb', kb: null, score: 0, esc: false };
      BK.DB.trace = tr;
      later(ch, function () {
        if (greetHit(q)) { tr.intent = 'greet'; say(ch, 'chat.menu', {}, menu(ch)); return; }
        if (kwHit('chat.kw.human', q)) { tr.intent = 'human'; tr.esc = true; BK.notify('handoff', { q: text }); BK.log('ai', 'ai.handoff', { q: text }, null, 'client'); say(ch, 'chat.human', {}, menu(ch)); return; }
        if (kwHit('chat.kw.mine', q)) { tr.intent = 'mine'; BK.chat.act(ch, 'mine'); return; }
        if (kwHit('chat.kw.book', q)) { tr.intent = 'book'; C(ch).flow = {}; say(ch, 'chat.pickSvc', {}, activeSvcs().map(function (s) { return { txt: BK.svcName(s.id) + ' · ' + BK.cu(s.price), act: 'svc', arg: s.id, k: '' }; })); return; }
        var m = BK.kbMatch(q);
        if (m) { tr.kb = m.e.id; tr.score = m.score; say(ch, '', {}, menu(ch), { kb: m.e.id }); return; }
        tr.intent = 'none'; tr.esc = true;
        if (!BK.DB.unanswered.some(function (u) { return u.q === text; })) BK.DB.unanswered.unshift({ id: BK.nextId('u'), q: text, ch: ch, t: BK.stamp() });
        BK.notify('handoff', { q: text }); BK.log('ai', 'ai.unknown', { q: text }, null, 'client');
        say(ch, 'chat.unknown', {}, [chip('chat.c.human', 'human')].concat(menu(ch)));
      });
    }
  };

  /* ---------- chat rendering ---------- */
  function chipLabel(c) {
    if (c.slot) return BK.fmt(c.slot.d, 'full') + ', ' + BK.hhmm(c.slot.t) + ' · ' + BK.staffName(c.slot.staff);
    if (c.dayc) return BK.fmt(c.dayc, 'full');
    return c.txt || T(c.k, BK.fv(c.v));
  }
  function bubbleText(m) {
    if (m.from === 'u') return m.text || T(m.k, BK.fv(m.v));
    if (m.kb) { var e = BK.byId(BK.DB.kb, m.kb); return e ? BK.expand(BK.kbAnswer(e)) : ''; }
    return T(m.k, BK.fv(m.v));
  }
  function contactForm(ch) {
    var p = persona();
    var form = BK.form([
      { k: 'name', label: T('f.name'), req: true, minlen: 2, maxlength: 40, value: p.name },
      { k: 'phone', label: T('f.phone'), type: 'tel', req: true, pattern: /^\+?[\d\s()-]{7,20}$/, patternMsg: 'v.phone', value: p.phone }
    ]);
    var box = el('div', { cls: 'cform' }, [form.node, BK.btn(T('chat.send'), function () {
      if (!form.validate()) return;
      var v = form.get(), ex = BK.findClient(v.phone);
      BK.chat.act(ch, 'contact', { name: v.name, phone: v.phone, id: ex ? ex.id : null }, { from: 'u', k: 'chat.shared', v: { name: v.name } });
    })]);
    return box;
  }
  function renderChat(ch, theme) {
    var D = BK.DB, c = C(ch), wrap = el('div', { cls: 'chat ' + theme });
    if (!c.msgs.length) BK.chat.start(ch);
    var log = el('div', { cls: 'chat-log', role: 'log', 'aria-live': 'polite', 'aria-label': T(ch === 'ai' ? 'ai.logLabel' : 'bot.logLabel') });
    var last = c.msgs.length - 1;
    c.msgs.forEach(function (m, i) {
      var live = i === last && m.from === 'b';
      var b = el('div', { cls: 'msg ' + (m.from === 'u' ? 'me' : 'bot') }, [el('p', { text: bubbleText(m) })]);
      if (m.kb) { var e = BK.byId(D.kb, m.kb); if (e) b.appendChild(el('small', { cls: 'src-note' }, [icon('book'), T('chat.source', { t: BK.kbTitle(e) })])); }
      if (m.prices) b.appendChild(el('ul', { cls: 'pl' }, D.services.filter(function (s) { return s.on; }).map(function (s) { return el('li', {}, [el('span', { text: BK.svcName(s.id) }), el('b', { text: BK.cu(s.price) })]); })));
      if (m.form && live && !busy[ch]) b.appendChild(contactForm(ch));
      if (m.chips && m.chips.length) b.appendChild(el('div', { cls: 'chips' }, m.chips.map(function (x) {
        var lab = chipLabel(x);
        return el('button', { type: 'button', cls: 'qchip', disabled: !live || busy[ch], 'aria-label': x.aria || null, text: lab, onclick: function () { BK.chat.act(ch, x.act, x.arg, { from: 'u', text: x.slot || x.dayc ? lab : lab.replace(/ ✕$/, '') }); } });
      })));
      log.appendChild(b);
    });
    if (busy[ch]) log.appendChild(el('div', { cls: 'msg bot typing', 'aria-label': T('chat.typing') }, [el('i'), el('i'), el('i')]));
    wrap.appendChild(log);
    var inp = el('input', { cls: 'in', type: 'text', maxlength: 160, placeholder: T('chat.ph'), 'aria-label': T('chat.ph'), disabled: busy[ch] });
    var f = el('form', { cls: 'chat-in', onsubmit: function (e) { e.preventDefault(); var v = inp.value; inp.value = ''; BK.chat.user(ch, v); } }, [inp, el('button', { type: 'submit', cls: 'btn btn-sm', 'aria-label': T('chat.send') }, [icon('send')])]);
    wrap.appendChild(f);
    return wrap;
  }
  BK.renderChat = renderChat;
  BK.chatReset = function (ch) { BK.DB.chats[ch] = { msgs: [], flow: null }; };

  /* ---------- AI consultant module ---------- */
  BK.registerMod('ai', { icon: 'ai', badge: function () { return 0; }, render: function (box) {
    var D = BK.DB, S = D.settings;
    box.appendChild(BK.head(T('ai.h'), T('ai.sub'), [BK.btn(T('ai.restart'), function () { BK.chatReset('ai'); D.trace = null; BK.render('.chat-in input'); }, 'btn-ghost')]));
    var cols = el('div', { cls: 'aicols' });
    var left = el('div', { cls: 'aileft' });
    left.appendChild(el('div', { cls: 'tg-head' }, [el('span', { cls: 'av', text: 'AI' }), el('div', {}, [el('b', { text: T('ai.widgetName', { name: S.name }) }), el('small', { text: S.ai ? T('ai.online') : T('ai.offline') })])]));
    left.appendChild(S.ai ? renderChat('ai', 'web') : el('div', { cls: 'empty' }, [el('b', { text: T('ai.offT') }), el('span', { text: T('ai.offP') })]));
    cols.appendChild(left);
    var right = el('div', { cls: 'airight' });
    var tr = D.trace;
    var tc = el('div', { cls: 'card-b' }, [el('h3', { text: T('ai.trace') })]);
    if (!tr) tc.appendChild(el('p', { text: T('ai.traceEmpty') }));
    else {
      var e = tr.kb ? BK.byId(D.kb, tr.kb) : null;
      tc.appendChild(el('dl', { cls: 'kv one' }, [
        el('div', {}, [el('dt', { text: T('ai.tq') }), el('dd', { text: tr.q })]),
        el('div', {}, [el('dt', { text: T('ai.ti') }), el('dd', { text: T('ai.int.' + tr.intent) })]),
        el('div', {}, [el('dt', { text: T('ai.tk') }), el('dd', { text: e ? BK.kbTitle(e) + ' (' + tr.score + ')' : T('ai.tkNone') })]),
        el('div', {}, [el('dt', { text: T('ai.te') }), el('dd', {}, [BK.badge(tr.esc ? 'warn' : 'ok', tr.esc ? T('ai.esc') : T('ai.auto'))])])
      ]));
    }
    right.appendChild(tc);
    var rules = el('div', { cls: 'card-b' }, [el('h3', { text: T('ai.rules') }), el('ul', { cls: 'rules' }, [T('ai.r1'), T('ai.r2'), T('ai.r3'), T('ai.r4')].map(function (x) { return el('li', {}, [icon('shield'), el('span', { text: x })]); }))]);
    right.appendChild(rules);
    var go = el('div', { cls: 'acts' }, [BK.btn(T('ai.toKb'), function () { BK.go('kb'); }, 'btn-ghost'), BK.btn(T('ai.toList'), function () { BK.go('list', { lf: { st: 'pending', per: 'up', src: 'ai', staff: 'all', q: '' } }); }, 'btn-ghost')]);
    right.appendChild(go);
    cols.appendChild(right); box.appendChild(cols);
    box.appendChild(el('p', { cls: 'hint-s', text: T('ai.hint') }));
  } });

  /* ---------- knowledge base module ---------- */
  function editKb(e, pre) {
    var form = BK.form([
      { k: 't', label: T('kb.title'), req: true, minlen: 3, maxlength: 60, value: e ? BK.kbTitle(e) : (pre || '') },
      { k: 'a', label: T('kb.answer'), type: 'textarea', rows: 4, req: true, minlen: 10, maxlength: 400, help: T('kb.tokens'), value: e ? BK.kbAnswer(e) : '' },
      { k: 'kw', label: T('kb.kw'), req: true, minlen: 3, maxlength: 120, help: T('kb.kwHelp'), value: e ? BK.kbKw(e) : (pre ? pre.toLowerCase().split(/\s+/).filter(function (x) { return x.length > 3; }).join(', ') : '') }
    ]);
    BK.dialog(e ? T('kb.edit') : T('kb.add'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get();
      if (e) { e.t = v.t; e.a = v.a; e.kw = v.kw; e.built = false; BK.log('kb', 'kb.edit', { name: v.t }); }
      else { BK.DB.kb.push({ id: BK.nextId('k'), t: v.t, a: v.a, kw: v.kw, on: true, built: false }); BK.log('kb', 'kb.new', { name: v.t }); }
      BK.toast(T('toast.saved')); BK.render();
    } }], { wide: true });
  }
  BK.registerMod('kb', { icon: 'book', badge: function () { return BK.DB.unanswered.length; }, render: function (box) {
    var U = BK.UI, D = BK.DB;
    box.appendChild(BK.head(T('kb.h'), T('kb.sub'), [BK.btn(T('kb.add'), function () { editKb(null); })]));
    box.appendChild(BK.tabs([['list', T('kb.tabList'), D.kb.length], ['test', T('kb.tabTest')], ['una', T('kb.tabUna'), D.unanswered.length]], U.kbTab, function (t) { U.kbTab = t; BK.render('[data-tab="' + t + '"]'); }, T('kb.h')));
    if (U.kbTab === 'list') {
      box.appendChild(BK.table([
        { h: T('kb.title'), f: function (e) { return el('b', { text: BK.kbTitle(e) }); } },
        { h: T('kb.answer'), f: function (e) { return BK.expand(BK.kbAnswer(e)).slice(0, 110) + (BK.expand(BK.kbAnswer(e)).length > 110 ? '…' : ''); } },
        { h: T('kb.kw'), f: function (e) { return BK.kbKw(e); } },
        { h: T('f.status'), f: function (e) { return el('button', { type: 'button', cls: 'tog' + (e.on ? ' on' : ''), role: 'switch', 'aria-checked': e.on ? 'true' : 'false', 'aria-label': BK.kbTitle(e), onclick: function () { e.on = !e.on; BK.log('kb', e.on ? 'kb.on' : 'kb.off', { name: BK.kbTitle(e) }); BK.render('.tog'); } }, [el('i'), el('span', { text: e.on ? T('on') : T('off') })]); } },
        { h: '', f: function (e) { return el('span', { cls: 'acts' }, [BK.link(T('svc.editBtn'), function () { editKb(e); }), e.built ? null : BK.link(T('kb.del'), function () { BK.confirm(T('kb.delT'), T('kb.delP', { name: BK.kbTitle(e) }), T('kb.del'), function () { D.kb.splice(D.kb.indexOf(e), 1); BK.log('kb', 'kb.del', { name: BK.kbTitle(e) }); BK.render(); }); })]); } }
      ], D.kb));
      box.appendChild(el('p', { cls: 'hint-s', text: T('kb.hint') }));
    } else if (U.kbTab === 'test') {
      var inp = el('input', { cls: 'in', type: 'text', id: 'kbq', maxlength: 160, placeholder: T('kb.testPh'), 'aria-label': T('kb.testPh'), value: U.aiTest });
      var out = el('div', { cls: 'card-b', 'aria-live': 'polite' });
      function run() {
        U.aiTest = inp.value; out.innerHTML = '';
        var m = U.aiTest.trim() ? BK.kbMatch(U.aiTest) : null;
        if (!U.aiTest.trim()) { out.appendChild(el('p', { text: T('kb.testHint') })); return; }
        if (!m) { out.appendChild(el('p', { cls: 'note-r' }, [icon('alert'), T('kb.testNone')])); return; }
        out.appendChild(el('h3', { text: T('kb.testFound', { t: BK.kbTitle(m.e), n: m.score }) }));
        out.appendChild(el('p', { text: BK.expand(BK.kbAnswer(m.e)) }));
      }
      var f = el('form', { cls: 'filters', onsubmit: function (e) { e.preventDefault(); run(); } }, [inp, BK.btn(T('kb.testBtn'), function () { run(); })]);
      f.lastChild.type = 'submit';
      box.appendChild(f); run(); box.appendChild(out);
    } else {
      if (!D.unanswered.length) box.appendChild(el('div', { cls: 'empty' }, [el('b', { text: T('kb.unaNone') }), el('span', { text: T('kb.unaNoneP') })]));
      else {
        box.appendChild(el('p', { cls: 'lead-s', text: T('kb.unaP') }));
        box.appendChild(BK.table([
          { h: T('kb.question'), f: function (u) { return u.qk ? T(u.qk) : u.q; } },
          { h: T('f.source'), f: function (u) { return BK.badge('', T('ch.' + u.ch)); } },
          { h: T('f.created'), f: function (u) { return u.t; } },
          { h: '', f: function (u) { return el('span', { cls: 'acts' }, [BK.link(T('kb.toKb'), function () { editKb(null, u.qk ? T(u.qk) : u.q); D.pendingU = u.id; }), BK.link(T('kb.dismiss'), function () { D.unanswered.splice(D.unanswered.indexOf(u), 1); BK.log('kb', 'kb.dismiss', {}); BK.render(); })]); } }
        ], D.unanswered));
      }
    }
  } });
  /* adding an answer for a queued question removes it from the queue */
  var origLog = BK.log;
  BK.log = function (mod, key, vars, ref, actor) {
    origLog(mod, key, vars, ref, actor);
    if (key === 'kb.new' && BK.DB.pendingU) { var i = BK.DB.unanswered.map(function (u) { return u.id; }).indexOf(BK.DB.pendingU); if (i >= 0) BK.DB.unanswered.splice(i, 1); BK.DB.pendingU = null; }
  };

  /* ---------- Telegram bot module ---------- */
  function feedText(f) {
    var v = BK.fv(f.vars);
    if (f.kind === 'handoff' && typeof f.vars.q === 'string' && (f.vars.q.indexOf('una.') === 0 || f.vars.q.indexOf('chat.') === 0)) v.q = T(f.vars.q);
    return T('f.' + f.kind, v);
  }
  BK.registerMod('bot', { icon: 'bot', render: function (box) {
    var U = BK.UI, D = BK.DB, S = D.settings;
    box.appendChild(BK.head(T('bot.h'), T('bot.sub'), U.botTab === 'chat' ? [BK.btn(T('ai.restart'), function () { BK.chatReset('bot'); BK.render('.chat-in input'); }, 'btn-ghost')] : []));
    box.appendChild(BK.tabs([['chat', T('bot.tabChat')], ['feed', T('bot.tabFeed'), D.feed.filter(function (f) { return !f.muted; }).length], ['cfg', T('bot.tabCfg')]], U.botTab, function (t) { U.botTab = t; BK.render('[data-tab="' + t + '"]'); }, T('bot.h')));
    if (U.botTab === 'chat') {
      var ph = el('div', { cls: 'phone' }, [el('div', { cls: 'tg-head' }, [el('span', { cls: 'av', text: 'B' }), el('div', {}, [el('b', { text: T('bot.name', { name: S.name }) }), el('small', { text: S.bot ? T('bot.status') : T('ai.offline') })])])]);
      ph.appendChild(S.bot ? renderChat('bot', 'tg') : el('div', { cls: 'empty' }, [el('b', { text: T('bot.offT') }), el('span', { text: T('bot.offP') })]));
      box.appendChild(el('div', { cls: 'botcols' }, [ph, el('div', { cls: 'card-b' }, [el('h3', { text: T('bot.cmds') }), el('ul', { cls: 'cmds' }, ['start', 'book', 'my', 'prices', 'help'].map(function (c) { return el('li', {}, [el('code', { text: '/' + c }), el('span', { text: T('bot.cmd.' + c) })]); })), el('p', { cls: 'lead-s', text: T('bot.persona', { name: BK.client(D.persona).name }) }), el('p', { cls: 'hint-s', text: T('bot.hint') })])]));
    } else if (U.botTab === 'feed') {
      var wrap = el('div', { cls: 'feed' });
      if (!D.feed.length) wrap.appendChild(el('div', { cls: 'empty' }, [el('b', { text: T('bot.feedEmpty') })]));
      D.feed.slice(0, 30).forEach(function (f) {
        var b = f.ref ? BK.booking(f.ref) : null, it = el('article', { cls: 'fi' + (f.muted ? ' muted' : '') }, [el('header', {}, [el('span', { cls: 'fk', text: T('fk.' + f.kind) }), el('time', { text: f.t })]), el('p', { text: feedText(f) })]);
        if (f.muted) it.appendChild(el('small', { cls: 'mut', text: T('bot.muted') }));
        if (f.kind === 'new' && b) {
          if (b.status === 'pending') it.appendChild(el('div', { cls: 'acts' }, [
            BK.btn(T('card.confirm'), function () { BK.setStatus(b, 'confirmed'); BK.toast(T('toast.confirmed', { code: b.code })); BK.render('.fi'); }),
            BK.btn(T('card.decline'), function () { BK.setStatus(b, 'cancelled', 'reason.biz'); BK.render('.fi'); }, 'btn-ghost'),
            BK.link(T('home.open'), function () { BK.bookingCard(b.id); })]));
          else it.appendChild(el('div', { cls: 'acts' }, [BK.stBadge(b.status), BK.link(T('home.open'), function () { BK.bookingCard(b.id); })]));
        }
        if (f.kind === 'handoff') it.appendChild(el('div', { cls: 'acts' }, [BK.link(T('bot.toKb'), function () { BK.go('kb', { kbTab: 'una' }); })]));
        wrap.appendChild(it);
      });
      box.appendChild(wrap);
    } else {
      var tg = S.tg, ed = BK.can('settings') || BK.DB.role === 'admin';
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('bot.conn') }), el('dl', { cls: 'kv' }, [
        el('div', {}, [el('dt', { text: T('bot.account') }), el('dd', { text: '@booking_demo_bot' })]),
        el('div', {}, [el('dt', { text: T('bot.chatId') }), el('dd', { text: '•••• 4821' })]),
        el('div', {}, [el('dt', { text: T('bot.webhook') }), el('dd', {}, [BK.badge('ok', T('bot.ok'))])]),
        el('div', {}, [el('dt', { text: T('bot.lang') }), el('dd', { text: T('bot.langV') })])])]));
      var tgl = function (label, obj, key, logk) {
        return el('button', { type: 'button', cls: 'tog' + (obj[key] !== false ? ' on' : ''), role: 'switch', 'aria-checked': obj[key] !== false ? 'true' : 'false', onclick: function () { obj[key] = !(obj[key] !== false); BK.log('bot', 'bot.sw', { what: label, on: obj[key] ? T('on') : T('off') }); BK.render('.tog'); } }, [el('i'), el('span', { text: label })]);
      };
      var sw = el('div', { cls: 'card-b' }, [el('h3', { text: T('bot.notif') }), el('p', { cls: 'lead-s', text: T('bot.notifP') }),
        el('div', { cls: 'cfg' }, [tgl(T('bot.swAll'), tg, 'on'), tgl(T('fk.new'), tg, 'new'), tgl(T('fk.cancel'), tg, 'cancel'), tgl(T('fk.moved'), tg, 'moved'), tgl(T('fk.handoff'), tg, 'handoff'), tgl(T('fk.remind'), tg, 'remind')]),
        el('div', { cls: 'acts' }, [BK.btn(T('bot.test'), function () { BK.notify('test', {}); BK.toast(T('toast.testSent')); BK.render(); }, 'btn-ghost'), tgl(T('bot.swBot'), S, 'bot')])]);
      box.appendChild(sw);
    }
  } });
}(window));
