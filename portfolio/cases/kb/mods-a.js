/* Knowledge Agent demo, part A: chat, dialogs, unanswered questions, sources, conflicts. */
(function (w) {
  'use strict';
  var KB = w.KB, t = KB.t, e = KB.esc, UI = KB.ui, U = KB.U, V = KB.views, A = KB.acts, I = KB.ins, F = KB.forms;
  U.chat = { aud: 'public', cite: null, typing: null, rows: {}, fresh: '' };
  U.dl = { tab: 'all', q: '', sel: 'd13', det: false, reply: '' };
  U.un = { open: null, err: '' };
  U.src = { sel: 's4', q: '', type: 'all', det: false, sync: {}, add: false, err: '', del: false };
  U.cf = {};
  var SUGGEST = ['q.delivery', 'q.warranty', 'q.return', 'q.discount', 'q.bike', 'q.hours'];
  var QKS = ['q.delivery', 'q.warranty', 'q.return', 'q.install', 'q.hours', 'q.repair', 'q.bike', 'q.discount', 'q.plan', 'q.status', 'q.human'];
  var typeTimer = null;

  function byId(arr, id) { var i; for (i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function dialog(id) { return byId(KB.S.dialogs, id); }
  function modelLabel(m) { return t('model.' + (m === 'search' || m === 'down' ? m : m)); }
  function kindBadge(k) {
    var c = { answer: 'ok', quote: 'info', idk: 'warn', denied: 'bad', down: 'bad' }[k] || 'info';
    return UI.badge(c, t('kind.' + k));
  }
  function ratingIcon(r) { return r > 0 ? '<span class="rate up" title="' + e(t('dl.good')) + '">' + UI.svg('up', 14) + '</span>' : (r < 0 ? '<span class="rate dn" title="' + e(t('dl.bad')) + '">' + UI.svg('down', 14) + '</span>' : ''); }

  /* ---------- shared answer markup ---------- */
  function answerHtml(d, live) {
    var res = d.res, segs = KB.segments(res), out = '', warn = '', i, c;
    if (live && U.chat.typing && U.chat.typing.id === d.id) {
      return '<p id="typ" class="typing">' + e(U.chat.typing.text) + '</p>';
    }
    for (i = 0; i < segs.length; i++) {
      out += '<p>' + e(segs[i].text) + (segs[i].cid ? ' <button type="button" class="cite" data-act="cite" data-id="' + segs[i].cid + '" aria-label="' + e(t('ch.source') + ' ' + segs[i].n) + '">[' + segs[i].n + ']</button>' : '') + '</p>';
    }
    if (res.cids.length) {
      var cf = KB.conflictOf(res.cids), st = false;
      res.cids.forEach(function (id) { c = KB.chunk(id); if (c && KB.stale(KB.src(c.src))) st = true; });
      if (cf.length) warn += '<button type="button" class="flag warn" data-act="gonav" data-id="conflicts">' + UI.svg('conflicts', 14) + '<span>' + e(t('ch.conflict')) + '</span></button>';
      if (st) warn += '<button type="button" class="flag warn" data-act="gonav" data-id="conflicts">' + UI.svg('refresh', 14) + '<span>' + e(t('ch.stale')) + '</span></button>';
    }
    if (res.kind === 'idk') warn += '<button type="button" class="flag info" data-act="gonav" data-id="unanswered">' + UI.svg('unanswered', 14) + '<span>' + e(t('ch.logged')) + '</span></button>';
    if (res.kind === 'denied') warn += '<span class="flag bad">' + UI.svg('lock', 14) + '<span>' + e(t('ch.restricted')) + '</span></span>';
    if (res.note === 'down') warn += '<span class="flag info">' + e(t('ch.fallback.down')) + '</span>';
    if (res.note === 'budget') warn += '<span class="flag info">' + e(t('ch.fallback.budget')) + '</span>';
    return out + (warn ? '<div class="flags">' + warn + '</div>' : '');
  }

  /* ---------- chat ---------- */
  function trace() {
    var S = KB.S, last = S.session.length ? S.session[S.session.length - 1] : null, rows = last ? U.chat.rows[last] : null, min = S.cfg.minScore;
    if (!last) return '<p class="hint">' + e(t('ch.trace.empty')) + '</p>';
    if (!rows || !rows.length) return '<p class="hint">' + e(t('ch.trace.none')) + '</p>';
    return '<ul class="trace">' + rows.slice(0, 6).map(function (r) {
      var s = KB.src(r.c.src), cls = r.blocked && r.ok ? 'bad' : (r.ok ? 'ok' : 'faint'), lab = r.blocked && r.ok ? t('ch.t.blocked') : (r.ok ? t('ch.t.used') : t('ch.t.below'));
      return '<li><div class="tr-h"><strong>' + e(KB.cTitle(r.c)) + '</strong><span class="pf-badge ' + (cls === 'faint' ? 'info' : cls) + '">' + e(lab) + '</span></div>' +
        '<div class="tr-m">' + e(KB.srcName(s)) + '</div><div class="bar"><i class="' + cls + '" style="width:' + Math.min(100, r.score * 22) + '%"></i><b style="left:' + Math.min(100, min * 22) + '%"></b></div></li>';
    }).join('') + '</ul><p class="hint">' + e(t('ch.trace.hint', { n: min })) + '</p>';
  }
  V.chat = function () {
    var S = KB.S, C = U.chat, em = KB.effModel(), msgs = '', i, d, last = S.session.length ? dialog(S.session[S.session.length - 1]) : null;
    msgs += '<div class="bub bot"><div class="who">' + e(t('ch.bot')) + '</div><p>' + e(S.cfg.greet || t('ch.greet.def')) + '</p></div>';
    for (i = 0; i < S.session.length; i++) {
      d = dialog(S.session[i]); if (!d) continue;
      msgs += '<div class="bub usr"><p>' + e(KB.dlgQ(d)) + '</p></div>';
      msgs += '<div class="bub bot"><div class="who">' + e(t('ch.bot')) + ' ' + UI.badge('info', modelLabel(d.res.model)) + ' ' + kindBadge(d.res.kind) + '</div>' + answerHtml(d, true) + '</div>';
      d.msgs.forEach(function (m) { msgs += '<div class="bub ' + (m.from === 'op' ? 'op' : 'usr') + '"><div class="who">' + e(m.from === 'op' ? t('dl.operator') : t('dl.customer')) + '</div><p>' + e(m.k ? t(m.k) : m.text) + '</p></div>'; });
      if (d.st === 'wait') msgs += '<p class="sysmsg">' + e(t('ch.waiting')) + '</p>';
      if (d.st === 'human') msgs += '<p class="sysmsg">' + e(t('ch.taken')) + '</p>';
    }
    var cite = '';
    if (C.cite) {
      var c = KB.chunk(C.cite), s = c ? KB.src(c.src) : null;
      if (c && s) cite = '<div class="card citecard"><div class="mh"><h3>' + e(KB.cTitle(c)) + '</h3><button type="button" class="rm-mini" data-act="cite" data-id="">' + e(t('btn.close')) + '</button></div>' +
        '<p class="meta">' + UI.svg(s.type, 14) + ' ' + e(KB.srcName(s)) + ' · ' + e(t('aud.' + s.aud)) + ' · ' + e(t('src.age', { n: s.age })) + '</p><p>' + e(KB.cText(c)) + '</p>' +
        '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="gosrc" data-id="' + s.id + '">' + e(t('ch.opensrc')) + '</button></div></div>';
    }
    var canAct = last && last.st !== 'wait' && last.st !== 'human';
    var tail = '';
    if (last && !U.chat.typing) {
      tail = '<div class="acts chat-acts">' + (last.rating === 0 ? '<span class="meta">' + e(t('ch.rate')) + '</span><button type="button" class="rm-mini" data-act="rate" data-v="1" data-id="' + last.id + '">' + UI.svg('up', 14) + ' ' + e(t('dl.good')) + '</button><button type="button" class="rm-mini" data-act="rate" data-v="-1" data-id="' + last.id + '">' + UI.svg('down', 14) + ' ' + e(t('dl.bad')) + '</button>' : '<span class="meta">' + e(t('ch.thanks')) + '</span>') +
        (canAct ? '<button type="button" class="rm-mini" data-act="human" data-id="' + last.id + '">' + e(t('ch.human')) + '</button>' : '') + '</div>';
    }
    return '<div class="chat"><div class="chat-main">' +
      '<div class="chat-bar">' + UI.seg('aud', [{ v: 'public', l: t('aud.public') }, { v: 'team', l: t('aud.team') }], C.aud, t('ch.audience')) +
      '<span class="chip-m">' + UI.svg('model', 14) + e(modelLabel(em.m)) + '</span>' + (S.cfg.widget ? '' : '<span class="flag warn">' + e(t('ch.widgetoff')) + '</span>') + '</div>' +
      '<div class="msgs" id="msgs" role="log" aria-live="polite">' + msgs + tail + '</div>' + cite +
      '<div class="chips">' + SUGGEST.map(function (k) { return '<button type="button" class="tagb" data-act="suggest" data-qk="' + k + '">' + e(t(k)) + '</button>'; }).join('') + '</div>' +
      '<form class="askf" data-form="ask"><label class="sr" for="ask-q">' + e(t('ch.input')) + '</label><input class="inp" id="ask-q" name="q" data-in="chatq" autocomplete="off" maxlength="200" placeholder="' + e(t('ch.input')) + '" value="' + e(C.fresh) + '"><button class="btn btn-sm" type="submit">' + UI.svg('send', 16) + '<span>' + e(t('ch.send')) + '</span></button></form>' +
      '</div><aside class="chat-side card"><h3>' + e(t('ch.trace.h')) + '</h3>' + trace() + '</aside></div>';
  };
  function ask(q) {
    var S = KB.S, C = U.chat, i, qk = null;
    q = String(q).replace(/^\s+|\s+$/g, ''); if (!q) return;
    finishTyping();
    for (i = 0; i < QKS.length; i++) if (t(QKS[i]).toLowerCase() === q.toLowerCase()) { qk = QKS[i]; break; }
    var res = KB.answer(q, C.aud), d = { id: 'd' + (S.nextD++), d: 0, m: S.clock, aud: C.aud, res: { kind: res.kind, cids: res.cids, model: res.model, note: res.note }, rating: 0, st: 'bot', subj: 'C-' + (2000 + S.nextD), msgs: [], seen: true };
    if (qk) d.qk = qk; else d.q = S.cfg.mask ? KB.mask(q) : q;
    S.dialogs.push(d); S.session.push(d.id); C.rows[d.id] = res.rows; C.cite = null; C.fresh = '';
    KB.tick(2);
    KB.log('answer', res.kind === 'idk' || res.kind === 'denied' ? 'lg.' + res.kind : 'lg.answer', { n: res.cids.length, model: 'model.' + res.model }, res.kind === 'answer' || res.kind === 'quote' ? 'info' : 'warn');
    if (res.cids.length) KB.conflictOf(res.cids).forEach(function (k) {
      if (!k.notified && S.cfg.nConf) { k.notified = true; KB.log('notify', 'lg.notify.conflict', { topic: k.topic }, 'warn'); }
    });
    startTyping(d);
    if (KB.rerender) KB.rerender();
  }
  KB.ask = ask;
  function startTyping(d) {
    var txt = KB.plain(d.res), pos = 0;
    if (w.PF.reduced || !txt) return;
    U.chat.typing = { id: d.id, text: '' };
    clearInterval(typeTimer);
    typeTimer = setInterval(function () {
      var el = w.document.getElementById('typ');
      if (!el || !U.chat.typing) { finishTyping(); return; }
      pos += 3; U.chat.typing.text = txt.slice(0, pos); el.textContent = U.chat.typing.text;
      var m = w.document.getElementById('msgs'); if (m) m.scrollTop = m.scrollHeight;
      if (pos >= txt.length) { finishTyping(); if (KB.rerender) KB.rerender(); }
    }, 22);
  }
  function finishTyping() { clearInterval(typeTimer); typeTimer = null; U.chat.typing = null; }
  KB.finishTyping = finishTyping;
  A.aud = function (b) { U.chat.aud = b.getAttribute('data-v'); };
  A.suggest = function (b) { ask(t(b.getAttribute('data-qk'))); };
  A.cite = function (b) { var id = b.getAttribute('data-id'); U.chat.cite = id || null; };
  A.rate = function (b) {
    var d = dialog(b.getAttribute('data-id')), v = +b.getAttribute('data-v'); if (!d) return;
    d.rating = v; KB.tick(1);
    if (v < 0 && KB.S.cfg.nNeg) KB.log('notify', 'lg.notify.neg', { who: d.subj }, 'warn');
    KB.toast('toast.thanks');
  };
  A.human = function (b) {
    var d = dialog(b.getAttribute('data-id')); if (!d) return;
    d.st = 'wait'; KB.tick(1);
    if (KB.S.cfg.nHandoff) KB.log('notify', 'lg.notify.handoff', { who: d.subj }, 'warn'); else KB.log('answer', 'lg.handoff', { who: d.subj }, 'info');
    KB.toast('toast.handoff');
  };
  A.gonav = function (b) { KB.go(b.getAttribute('data-id')); };
  A.gosrc = function (b) { U.src.sel = b.getAttribute('data-id'); U.src.det = true; KB.go('sources'); };
  F.ask = function (f) { var v = f.elements.q.value; U.chat.fresh = ''; ask(v); return true; };
  I.chatq = function (el) { U.chat.fresh = el.value; return true; };

  /* ---------- dialogs ---------- */
  function sortedDialogs() {
    return KB.S.dialogs.slice().sort(function (a, b) { return a.d !== b.d ? a.d - b.d : b.m - a.m; });
  }
  V.dialogs = function () {
    var S = KB.S, L = U.dl, q = L.q.toLowerCase(), all = sortedDialogs(), list, sel;
    var tabs = [{ v: 'all', l: t('dl.t.all') }, { v: 'wait', l: t('dl.t.wait') }, { v: 'neg', l: t('dl.t.neg') }, { v: 'idk', l: t('dl.t.idk') }];
    list = all.filter(function (d) {
      if (L.tab === 'wait' && d.st !== 'wait' && d.st !== 'human') return false;
      if (L.tab === 'neg' && d.rating >= 0) return false;
      if (L.tab === 'idk' && d.res.kind !== 'idk' && d.res.kind !== 'denied') return false;
      return !q || KB.dlgQ(d).toLowerCase().indexOf(q) >= 0 || d.subj.toLowerCase().indexOf(q) >= 0;
    });
    sel = dialog(L.sel) || list[0] || null;
    var waiting = S.dialogs.filter(function (d) { return d.st === 'wait'; }).length;
    var tabsH = '<div class="pf-tabs" role="group" aria-label="' + e(t('dl.filter')) + '">' + tabs.map(function (x) { return '<button type="button" data-act="dltab" data-v="' + x.v + '" aria-pressed="' + (L.tab === x.v) + '">' + e(x.l) + (x.v === 'wait' && waiting ? ' (' + waiting + ')' : '') + '</button>'; }).join('') + '</div>';
    var items = list.length ? list.map(function (d) {
      return '<li><button type="button" class="row' + (sel && sel.id === d.id ? ' on' : '') + '" data-act="dlsel" data-id="' + d.id + '"><span class="row-t">' + e(KB.dlgQ(d)) + '</span><span class="row-m">' + e(d.subj) + ' · ' + e(KB.fmtTime(d.d, d.m)) + '</span><span class="row-b">' + kindBadge(d.res.kind) + (d.st === 'wait' ? UI.badge('warn', t('dl.st.wait')) : (d.st === 'human' ? UI.badge('info', t('dl.st.human')) : '')) + ratingIcon(d.rating) + '</span></button></li>';
    }).join('') : '<li>' + UI.empty(t('dl.none')) + '</li>';
    return UI.head(t('mod.dialogs'), t('dl.sub')) +
      '<div class="md' + (L.det && sel ? ' has-det' : '') + '"><div class="md-list">' + tabsH + '<div class="tools"><label class="sr" for="dl-q">' + e(t('dl.search')) + '</label><input class="inp" id="dl-q" data-in="dlq" placeholder="' + e(t('dl.search')) + '" value="' + e(L.q) + '"></div><ul class="lst">' + items + '</ul></div>' +
      '<div class="md-det">' + (sel ? dlgDetail(sel) : UI.empty(t('dl.pick'))) + '</div></div>';
  };
  function dlgDetail(d) {
    var segs = '', ex = '', acts = '';
    segs = answerHtml(d, false);
    d.msgs.forEach(function (m) { ex += '<div class="bub ' + (m.from === 'op' ? 'op' : 'usr') + '"><div class="who">' + e(m.from === 'op' ? t('dl.operator') : t('dl.customer')) + '</div><p>' + e(m.k ? t(m.k) : m.text) + '</p></div>'; });
    if (d.st === 'wait') acts = '<button type="button" class="btn btn-sm" data-act="take" data-id="' + d.id + '">' + e(t('dl.take')) + '</button>';
    if (d.st === 'human') acts = '<form class="inline" data-form="reply" data-id="' + d.id + '"><label class="sr" for="dl-r">' + e(t('dl.reply')) + '</label><input class="inp" id="dl-r" name="r" maxlength="240" placeholder="' + e(t('dl.reply')) + '" autocomplete="off"><button class="btn btn-sm" type="submit">' + e(t('ch.send')) + '</button></form>' +
      '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="release" data-id="' + d.id + '">' + e(t('dl.release')) + '</button></div>';
    if (d.res.kind === 'idk' && !d.fixed && d.st !== 'wait') acts += '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="fixq" data-id="' + d.id + '">' + e(t('dl.addans')) + '</button></div>';
    if (d.rating < 0 && d.res.cids.length) acts += '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="fixsrc" data-id="' + d.id + '">' + e(t('dl.checksrc')) + '</button></div>';
    var cf = KB.conflictOf(d.res.cids);
    return '<button type="button" class="back" data-act="dlback">&larr; ' + e(t('btn.back')) + '</button><div class="det-title"><h3>' + e(d.subj) + '</h3>' + kindBadge(d.res.kind) + '</div>' +
      '<p class="meta">' + e(KB.fmtTime(d.d, d.m)) + ' · ' + e(t('aud.' + d.aud)) + ' · ' + e(modelLabel(d.res.model)) + ' · ' + e(t('dl.status')) + ': ' + e(t('dl.st.' + d.st)) + (d.rating ? ' · ' + e(d.rating > 0 ? t('dl.good') : t('dl.bad')) : '') + '</p>' +
      (cf.length ? '<div class="note warn"><span>' + e(t('dl.conflictnote')) + '</span><button type="button" class="lnk" data-act="gonav" data-id="conflicts">' + e(t('dl.openconf')) + '</button></div>' : '') +
      '<div class="msgs flat"><div class="bub usr"><p>' + e(KB.dlgQ(d)) + '</p></div><div class="bub bot"><div class="who">' + e(t('ch.bot')) + '</div>' + segs + '</div>' + ex + '</div>' + acts;
  }
  A.dltab = function (b) { U.dl.tab = b.getAttribute('data-v'); };
  A.dlsel = function (b) { U.dl.sel = b.getAttribute('data-id'); U.dl.det = true; };
  A.dlback = function () { U.dl.det = false; };
  I.dlq = function (el) { U.dl.q = el.value; };
  A.take = function (b) {
    var d = dialog(b.getAttribute('data-id')); d.st = 'human'; KB.tick(1);
    KB.log('answer', 'lg.take', { who: d.subj, name: KB.userName() }, 'info'); KB.toast('toast.taken');
  };
  A.release = function (b) {
    var d = dialog(b.getAttribute('data-id')); d.st = 'closed'; KB.tick(1);
    KB.log('answer', 'lg.release', { who: d.subj }, 'info'); KB.toast('toast.released');
  };
  F.reply = function (f) {
    var d = dialog(f.getAttribute('data-id')), v = f.elements.r.value.replace(/^\s+|\s+$/g, ''); if (!d || !v) return true;
    d.msgs.push({ from: 'op', text: KB.S.cfg.mask ? KB.mask(v) : v }); KB.tick(1);
    KB.log('answer', 'lg.reply', { who: d.subj }, 'info');
  };
  A.fixq = function (b) { var d = dialog(b.getAttribute('data-id')); U.un.open = KB.normQ(d); KB.go('unanswered'); };
  A.fixsrc = function (b) {
    var d = dialog(b.getAttribute('data-id')); var c = KB.chunk(d.res.cids[0]);
    if (c) { U.src.sel = c.src; U.src.det = true; KB.go('sources'); }
  };

  /* ---------- unanswered ---------- */
  V.unanswered = function () {
    var list = KB.unanswered(), S = KB.S, open = U.un.open, fixed = S.dialogs.filter(function (d) { return d.fixed; }).length;
    var rows = list.length ? list.map(function (g) {
      var qtxt = g.last.qk ? t(g.last.qk) : g.last.q, isOpen = open === g.key;
      var form = isOpen ? '<form class="addf" data-form="addans" data-key="' + e(g.key) + '"><div class="fgrid"><label class="wide">' + e(t('un.answer')) + '<textarea class="inp" name="a" rows="3" maxlength="400" placeholder="' + e(t('un.ph')) + '"></textarea></label>' +
        '<label>' + e(t('un.aud')) + '<select name="aud"><option value="public">' + e(t('aud.public')) + '</option><option value="team">' + e(t('aud.team')) + '</option></select></label></div>' +
        (U.un.err ? '<span class="fix">' + e(t(U.un.err)) + '</span>' : '') +
        '<div class="acts"><button type="submit" class="btn btn-sm">' + e(t('un.save')) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="unclose">' + e(t('btn.cancel')) + '</button></div></form>' : '';
      return '<li class="card"><div class="un-h"><div><strong>' + e(qtxt) + '</strong><p class="meta">' + e(t('un.count', { n: g.count })) + ' · ' + e(t('un.last')) + ' ' + e(KB.fmtTime(g.last.d, g.last.m)) + '</p></div>' +
        '<div class="acts"><span class="cnt">' + g.count + '</span>' + (isOpen ? '' : '<button type="button" class="btn btn-sm" data-act="unopen" data-key="' + e(g.key) + '">' + e(t('un.add')) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="undismiss" data-key="' + e(g.key) + '">' + e(t('un.dismiss')) + '</button>') + '</div></div>' + form + '</li>';
    }).join('') : '<li>' + UI.empty(t('un.none')) + '</li>';
    return UI.head(t('mod.unanswered'), t('un.sub')) +
      '<div class="note info"><span>' + e(t('un.how')) + '</span><span class="meta">' + e(t('un.resolved', { n: fixed })) + '</span></div>' +
      '<ul class="cards">' + rows + '</ul>' + (U.un.tryq ? '<div class="note ok"><span>' + e(t('un.try')) + '</span><button type="button" class="btn btn-sm" data-act="untry">' + e(t('un.tryb')) + '</button></div>' : '');
  };
  function ungroup(key) { return KB.S.dialogs.filter(function (d) { return d.res.kind === 'idk' && !d.fixed && KB.normQ(d) === key; }); }
  A.unopen = function (b) { U.un.open = b.getAttribute('data-key'); U.un.err = ''; };
  A.unclose = function () { U.un.open = null; U.un.err = ''; };
  A.undismiss = function (b) {
    var g = ungroup(b.getAttribute('data-key')); g.forEach(function (d) { d.fixed = true; });
    KB.tick(1); KB.log('source', 'lg.dismiss', { n: g.length }, 'info'); KB.toast('toast.dismissed');
  };
  F.addans = function (f) {
    var key = f.getAttribute('data-key'), a = f.elements.a.value.replace(/^\s+|\s+$/g, ''), g = ungroup(key);
    if (a.length < 12) { U.un.err = 'err.short'; return; }
    var qtxt = g.length ? (g[0].qk ? t(g[0].qk) : g[0].q) : key;
    KB.addAnswer(qtxt, a, f.elements.aud.value);
    g.forEach(function (d) { d.fixed = true; });
    U.un.open = null; U.un.err = ''; U.un.tryq = qtxt; KB.tick(2);
    KB.log('source', 'lg.addans', { aud: 'aud.' + f.elements.aud.value }, 'info'); KB.toast('toast.added');
  };
  A.untry = function () { var q = U.un.tryq; U.un.tryq = null; U.chat.aud = 'public'; KB.go('chat'); ask(q); };

  /* ---------- sources ---------- */
  function chunksOf(id) { return KB.S.chunks.filter(function (c) { return c.src === id; }); }
  V.sources = function () {
    var S = KB.S, L = U.src, q = L.q.toLowerCase(), types = ['all', 'site', 'pdf', 'doc', 'sheet', 'api', 'manual'];
    var list = S.sources.filter(function (s) { return (L.type === 'all' || s.type === L.type) && (!q || KB.srcName(s).toLowerCase().indexOf(q) >= 0); });
    var sel = KB.src(L.sel) || list[0] || null;
    var items = list.map(function (s) {
      var n = chunksOf(s.id).length, pr = L.sync[s.id];
      return '<li><button type="button" class="row' + (sel && sel.id === s.id ? ' on' : '') + (s.on ? '' : ' off') + '" data-act="srcsel" data-id="' + s.id + '"><span class="row-t">' + UI.svg(s.type, 16) + ' ' + e(KB.srcName(s)) + '</span>' +
        '<span class="row-m">' + e(t('type.' + s.type)) + ' · ' + e(t('src.frag', { n: n })) + ' · ' + e(t('src.age', { n: s.age })) + '</span>' +
        '<span class="row-b">' + UI.badge(s.aud === 'team' ? 'bad' : 'ok', t('aud.' + s.aud)) + (KB.stale(s) ? UI.badge('warn', t('src.stale')) : '') + (s.on ? '' : UI.badge('info', t('src.off'))) + (pr !== undefined ? UI.badge('info', pr + '%') : '') + '</span></button></li>';
    }).join('') || '<li>' + UI.empty(t('src.none')) + '</li>';
    var add = L.add ? addForm() : '';
    return UI.head(t('mod.sources'), t('src.sub'), '<button type="button" class="btn btn-sm" data-act="srcadd">' + UI.svg('plus', 16) + '<span>' + e(t('src.add')) + '</span></button>') + add +
      '<div class="md' + (L.det && sel ? ' has-det' : '') + '"><div class="md-list"><div class="pf-tabs" role="group" aria-label="' + e(t('src.filter')) + '">' + types.map(function (x) { return '<button type="button" data-act="srctype" data-v="' + x + '" aria-pressed="' + (L.type === x) + '">' + e(x === 'all' ? t('dl.t.all') : t('type.' + x)) + '</button>'; }).join('') + '</div>' +
      '<div class="tools"><label class="sr" for="src-q">' + e(t('src.search')) + '</label><input class="inp" id="src-q" data-in="srcq" placeholder="' + e(t('src.search')) + '" value="' + e(L.q) + '"></div><ul class="lst">' + items + '</ul></div>' +
      '<div class="md-det">' + (sel ? srcDetail(sel) : UI.empty(t('src.pick'))) + '</div></div>';
  };
  function addForm() {
    return '<form class="card addf" data-form="addsrc"><h4>' + e(t('src.add')) + '</h4><div class="fgrid"><label>' + e(t('src.f.name')) + '<input name="n" maxlength="60" autocomplete="off"></label>' +
      '<label>' + e(t('src.f.type')) + '<select name="ty">' + ['site', 'pdf', 'doc', 'sheet', 'api', 'manual'].map(function (x) { return '<option value="' + x + '">' + e(t('type.' + x)) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + e(t('src.f.aud')) + '<select name="aud"><option value="public">' + e(t('aud.public')) + '</option><option value="team">' + e(t('aud.team')) + '</option></select></label>' +
      '<label class="wide">' + e(t('src.f.text')) + '<textarea class="inp" name="x" rows="3" maxlength="500" placeholder="' + e(t('src.f.ph')) + '"></textarea></label></div>' +
      (U.src.err ? '<span class="fix">' + e(t(U.src.err)) + '</span>' : '') +
      '<div class="acts"><button type="submit" class="btn btn-sm">' + e(t('src.f.save')) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="srcadd">' + e(t('btn.cancel')) + '</button></div></form>';
  }
  function srcDetail(s) {
    var L = U.src, cs = chunksOf(s.id), pr = L.sync[s.id], busy = pr !== undefined;
    var fr = cs.map(function (c) {
      return '<li class="frag' + (c.on && s.on ? '' : ' off') + '"><div class="frag-h"><strong>' + e(KB.cTitle(c)) + '</strong><label class="chk sm"><input type="checkbox" data-in="chunkon" data-id="' + c.id + '"' + (c.on ? ' checked' : '') + '><span>' + e(t('src.use')) + '</span></label></div><p>' + e(KB.cText(c)) + '</p></li>';
    }).join('') || UI.empty(t('src.nofrag'));
    return '<button type="button" class="back" data-act="srcback">&larr; ' + e(t('btn.back')) + '</button><div class="det-title"><h3>' + UI.svg(s.type, 20) + ' ' + e(KB.srcName(s)) + '</h3>' + UI.badge(s.aud === 'team' ? 'bad' : 'ok', t('aud.' + s.aud)) + '</div>' +
      '<dl class="kv"><div><dt>' + e(t('src.f.type')) + '</dt><dd>' + e(t('type.' + s.type)) + '</dd></div><div><dt>' + e(t('src.lastsync')) + '</dt><dd>' + e(t('src.age', { n: s.age })) + (KB.stale(s) ? ' ' + UI.badge('warn', t('src.stale')) : '') + '</dd></div><div><dt>' + e(t('src.ver')) + '</dt><dd>v' + s.ver + '</dd></div><div><dt>' + e(t('src.frags')) + '</dt><dd>' + cs.length + '</dd></div></dl>' +
      (busy ? '<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pr + '"><i style="width:' + pr + '%"></i></div>' : '') +
      '<div class="acts"><button type="button" class="btn btn-sm" data-act="srcsync" data-id="' + s.id + '"' + (busy || s.type === 'manual' ? ' disabled' : '') + '>' + UI.svg('refresh', 16) + '<span>' + e(busy ? t('src.syncing') : t('src.sync')) + '</span></button>' +
      UI.sw('srcon', s.on, t('src.enabled'), ' data-id="' + s.id + '"') +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="srcaud" data-id="' + s.id + '">' + e(s.aud === 'team' ? t('src.makepub') : t('src.maketeam')) + '</button>' +
      (L.del ? '<button type="button" class="btn btn-sm danger" data-act="srcdel" data-id="' + s.id + '">' + e(t('src.confirmdel')) + '</button>' : '<button type="button" class="btn btn-ghost btn-sm" data-act="srcdelask">' + e(t('src.del')) + '</button>') + '</div>' +
      '<h4 class="sub">' + e(t('src.fraglist')) + '</h4><ul class="frags">' + fr + '</ul>';
  }
  A.srcsel = function (b) { U.src.sel = b.getAttribute('data-id'); U.src.det = true; U.src.del = false; };
  A.srcback = function () { U.src.det = false; };
  A.srctype = function (b) { U.src.type = b.getAttribute('data-v'); };
  I.srcq = function (el) { U.src.q = el.value; };
  A.srcadd = function () { U.src.add = !U.src.add; U.src.err = ''; };
  A.srcdelask = function () { U.src.del = true; };
  A.srcaud = function (b) {
    var s = KB.src(b.getAttribute('data-id')); s.aud = s.aud === 'team' ? 'public' : 'team'; KB.tick(1);
    KB.log('access', 'lg.srcaud', { name: 'src:' + s.id, aud: 'aud.' + s.aud }, 'info'); KB.toast('toast.saved');
  };
  A.srcdel = function (b) {
    var S = KB.S, id = b.getAttribute('data-id'), s = KB.src(id), nm = KB.srcName(s), ids = chunksOf(id).map(function (c) { return c.id; });
    S.sources = S.sources.filter(function (x) { return x.id !== id; });
    S.chunks = S.chunks.filter(function (c) { return c.src !== id; });
    S.conflicts = S.conflicts.filter(function (k) { return ids.indexOf(k.a) < 0 && ids.indexOf(k.b) < 0; });
    U.src.del = false; U.src.sel = S.sources.length ? S.sources[0].id : null; U.src.det = false; KB.tick(1);
    KB.log('source', 'lg.srcdel', { name: nm }, 'warn'); KB.toast('toast.removed');
  };
  I.srcon = function (el) { var s = KB.src(el.getAttribute('data-id')); s.on = el.checked; KB.tick(1); KB.log('source', s.on ? 'lg.srcon' : 'lg.srcoff', { name: 'src:' + s.id }, 'info'); };
  I.chunkon = function (el) { var c = KB.chunk(el.getAttribute('data-id')); c.on = el.checked; KB.tick(1); KB.log('source', c.on ? 'lg.fragon' : 'lg.fragoff', { name: KB.cTitle(c) }, 'info'); };
  F.addsrc = function (f) {
    var S = KB.S, n = f.elements.n.value.replace(/^\s+|\s+$/g, ''), x = f.elements.x.value.replace(/^\s+|\s+$/g, '');
    if (n.length < 3) { U.src.err = 'err.name'; return; }
    if (x.length < 20) { U.src.err = 'err.text'; return; }
    var toks = KB.tokens(n).concat(KB.tokens(x)).filter(function (z) { return z.length >= 5; }), stems = [], i;
    for (i = 0; i < toks.length && stems.length < 6; i++) { var st = toks[i].slice(0, Math.max(4, toks[i].length - 2)); if (stems.indexOf(st) < 0) stems.push(st); }
    if (!stems.length) stems = [n.toLowerCase().slice(0, 4)];
    var s = { id: 's' + (S.nextS++), type: f.elements.ty.value, aud: f.elements.aud.value, age: 0, on: true, ver: 1, pages: 1, nm: n };
    S.sources.push(s); S.chunks.push({ id: 'x' + (S.nextC++), src: s.id, on: true, ver: 0, title: n, text: x, kw: stems });
    U.src.add = false; U.src.err = ''; U.src.sel = s.id; U.src.det = true; KB.tick(2);
    KB.log('source', 'lg.add', { name: n }, 'info'); KB.toast('toast.added');
  };
  var syncT = {};
  A.srcsync = function (b) {
    var id = b.getAttribute('data-id'), L = U.src;
    if (L.sync[id] !== undefined) return;
    if (w.PF.reduced) { finishSync(id); return; }
    L.sync[id] = 0;
    syncT[id] = setInterval(function () {
      L.sync[id] += 20;
      if (L.sync[id] >= 100) { clearInterval(syncT[id]); finishSync(id); }
      if (KB.rerender) KB.rerender(true);
    }, 220);
  };
  function finishSync(id) {
    var S = KB.S, s = KB.src(id), n; delete U.src.sync[id];
    if (!s) return;
    s.age = 0; s.ver++; n = (s.ver % 3) + 1; KB.tick(2);
    KB.log('source', 'lg.sync', { name: 'src:' + id, n: n }, 'info');
    if (id === 's4') {
      var c8 = KB.chunk('c8');
      if (c8 && c8.ver === 0) {
        c8.ver = 1; c8.on = true;
        S.conflicts.forEach(function (k) { if (k.id === 'k1' && k.st === 'open') { k.st = 'resolved'; k.keep = 'auto'; KB.log('quality', 'lg.autores', { topic: k.topic }, 'info'); } });
      }
    }
    KB.toast('toast.synced');
    if (KB.rerender) KB.rerender();
  }

  /* ---------- conflicts and stale sources ---------- */
  function side(c, tag) {
    var s = KB.src(c.src);
    return '<div class="cf-side' + (c.on ? '' : ' off') + '"><span class="pf-badge info">' + tag + '</span><strong>' + e(KB.cTitle(c)) + '</strong><p class="meta">' + e(KB.srcName(s)) + ' · ' + e(t('src.age', { n: s.age })) + '</p><p>' + e(KB.cText(c)) + '</p></div>';
  }
  V.conflicts = function () {
    var S = KB.S, open = S.conflicts.filter(function (k) { return k.st === 'open'; }).length;
    var cards = S.conflicts.map(function (k) {
      var a = KB.chunk(k.a), b = KB.chunk(k.b); if (!a || !b) return '';
      var st = k.st === 'open' ? UI.badge('warn', t('cf.open')) : (k.st === 'dismissed' ? UI.badge('info', t('cf.dismissed')) : UI.badge('ok', t('cf.resolved')));
      var acts = k.st === 'open' ? '<div class="acts"><button type="button" class="btn btn-sm" data-act="cfkeep" data-id="' + k.id + '" data-v="a">' + e(t('cf.keepa')) + '</button><button type="button" class="btn btn-sm" data-act="cfkeep" data-id="' + k.id + '" data-v="b">' + e(t('cf.keepb')) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="cfdismiss" data-id="' + k.id + '">' + e(t('cf.notconf')) + '</button></div>' :
        '<div class="acts"><span class="meta">' + e(k.keep === 'auto' ? t('cf.auto') : (k.keep ? t('cf.kept', { name: KB.cTitle(KB.chunk(k.keep === 'a' ? k.a : k.b)) }) : '')) + '</span><button type="button" class="btn btn-ghost btn-sm" data-act="cfreopen" data-id="' + k.id + '">' + e(t('cf.reopen')) + '</button></div>';
      return '<li class="card"><div class="mh"><h4>' + e(t(k.topic)) + '</h4>' + st + '</div><div class="two">' + side(a, 'A') + side(b, 'B') + '</div>' + acts + '</li>';
    }).join('');
    var stale = S.sources.filter(function (s) { return KB.stale(s) && s.on; });
    var sl = stale.length ? stale.map(function (s) { return '<li><span>' + UI.svg(s.type, 16) + ' ' + e(KB.srcName(s)) + ' <span class="meta">' + e(t('src.age', { n: s.age })) + '</span></span><button type="button" class="btn btn-sm" data-act="srcsyncgo" data-id="' + s.id + '">' + e(t('src.sync')) + '</button></li>'; }).join('') : '<li>' + e(t('cf.nostale')) + '</li>';
    return UI.head(t('mod.conflicts'), t('cf.sub'), '<button type="button" class="btn btn-ghost btn-sm" data-act="cfscan">' + UI.svg('refresh', 16) + '<span>' + e(t('cf.scan')) + '</span></button>') +
      '<div class="note ' + (open ? 'warn' : 'info') + '"><span>' + e(open ? t('cf.openn', { n: open }) : t('cf.clean')) + '</span></div>' +
      '<ul class="cards">' + cards + '</ul>' +
      '<div class="card"><h4>' + e(t('cf.stale.h')) + '</h4><p class="hint">' + e(t('cf.stale.p')) + '</p><div class="inline"><label for="cf-sd" class="meta">' + e(t('cf.stale.days')) + '</label><input class="inp" id="cf-sd" type="number" min="7" max="365" data-in="staledays" value="' + S.cfg.staleDays + '"></div><ul class="mini">' + sl + '</ul></div>';
  };
  function keep(k, side2) {
    var win = side2 === 'a' ? KB.chunk(k.a) : KB.chunk(k.b), lose = side2 === 'a' ? KB.chunk(k.b) : KB.chunk(k.a);
    win.on = true; lose.on = false; k.st = 'resolved'; k.keep = side2; KB.tick(1);
    KB.log('quality', 'lg.cfres', { name: KB.cTitle(win) }, 'info'); KB.toast('toast.resolved');
  }
  A.cfkeep = function (b) { keep(byId(KB.S.conflicts, b.getAttribute('data-id')), b.getAttribute('data-v')); };
  A.cfdismiss = function (b) { var k = byId(KB.S.conflicts, b.getAttribute('data-id')); k.st = 'dismissed'; KB.tick(1); KB.log('quality', 'lg.cfdis', { topic: k.topic }, 'info'); };
  A.cfreopen = function (b) {
    var k = byId(KB.S.conflicts, b.getAttribute('data-id')); k.st = 'open'; k.keep = null; k.notified = false;
    KB.chunk(k.a).on = true; KB.chunk(k.b).on = true; KB.tick(1); KB.log('quality', 'lg.cfopen', { topic: k.topic }, 'warn');
  };
  A.cfscan = function () { KB.tick(2); KB.log('quality', 'lg.scan', {}, 'info'); KB.toast('toast.scanned'); };
  A.srcsyncgo = function (b) { U.src.sel = b.getAttribute('data-id'); A.srcsync(b); };
  I.staledays = function (el) { var v = +el.value; if (v >= 7 && v <= 365) { KB.S.cfg.staleDays = v; } return false; };
}(window));
