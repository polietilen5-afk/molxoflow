/* Knowledge Agent demo: fictional data, shared state and the retrieval engine. No network, no storage. */
(function (w) {
  'use strict';
  var KB = w.KB = { acts: {}, ins: {}, forms: {}, views: {}, U: {}, ui: {} };
  var t = KB.t = function (k, v) { return w.MFI18N.t(k, v); };
  var e = KB.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  KB.NAV = [
    { g: 'nav.g.work', m: ['chat', 'dialogs', 'unanswered'] },
    { g: 'nav.g.know', m: ['sources', 'conflicts', 'quality'] },
    { g: 'nav.g.ctl', m: ['analytics', 'access', 'model', 'privacy', 'channels', 'journal'] }
  ];
  KB.MODS = [];
  KB.NAV.forEach(function (g) { g.m.forEach(function (m) { KB.MODS.push(m); }); });

  /* ---------- initial state ---------- */
  function perms() {
    var all = {}, o = {}, ed = {}, op = {}, an = {}, i;
    for (i = 0; i < KB.MODS.length; i++) { all[KB.MODS[i]] = true; o[KB.MODS[i]] = false; ed[KB.MODS[i]] = false; op[KB.MODS[i]] = false; an[KB.MODS[i]] = false; }
    ['chat', 'sources', 'unanswered', 'conflicts', 'quality', 'analytics'].forEach(function (m) { ed[m] = true; });
    ['chat', 'dialogs', 'unanswered', 'analytics'].forEach(function (m) { op[m] = true; });
    ['analytics', 'quality', 'journal'].forEach(function (m) { an[m] = true; });
    return { owner: all, editor: ed, operator: op, analyst: an };
  }
  function dlg(id, d, min, qk, aud, kind, cids, rating, st, subj, model) {
    return { id: id, d: d, m: min, qk: qk, aud: aud, res: { kind: kind, cids: cids, model: model || 'cloud' }, rating: rating, st: st, subj: subj, msgs: [], seen: true };
  }
  function def() {
    var S = {
      clock: 12 * 60 + 40, role: 'owner', uid: 100,
      sources: [
        { id: 's1', type: 'site', aud: 'public', age: 3, on: true, ver: 4, pages: 2 },
        { id: 's2', type: 'pdf', aud: 'public', age: 12, on: true, ver: 2, pages: 6 },
        { id: 's3', type: 'doc', aud: 'public', age: 9, on: true, ver: 3, pages: 3 },
        { id: 's4', type: 'sheet', aud: 'public', age: 41, on: true, ver: 7, pages: 1 },
        { id: 's5', type: 'doc', aud: 'team', age: 5, on: true, ver: 2, pages: 8 },
        { id: 's6', type: 'manual', aud: 'public', age: 1, on: true, ver: 5, pages: 0 },
        { id: 's7', type: 'site', aud: 'public', age: 6, on: true, ver: 3, pages: 2 },
        { id: 's8', type: 'api', aud: 'public', age: 0, on: true, ver: 1, pages: 0 }
      ],
      chunks: [
        { id: 'c1', src: 's1', on: true, ver: 0 }, { id: 'c2', src: 's1', on: true, ver: 0 },
        { id: 'c3', src: 's2', on: true, ver: 0 }, { id: 'c4', src: 's2', on: true, ver: 0 },
        { id: 'c5', src: 's3', on: true, ver: 0 }, { id: 'c6', src: 's3', on: true, ver: 0 },
        { id: 'c7', src: 's4', on: true, ver: 0 }, { id: 'c8', src: 's4', on: true, ver: 0 },
        { id: 'c9', src: 's8', on: true, ver: 0 },
        { id: 'c10', src: 's5', on: true, ver: 0 }, { id: 'c11', src: 's5', on: true, ver: 0 },
        { id: 'c12', src: 's6', on: true, ver: 0 },
        { id: 'c13', src: 's7', on: true, ver: 0 }, { id: 'c14', src: 's7', on: true, ver: 0 }
      ],
      conflicts: [
        { id: 'k1', a: 'c1', b: 'c8', topic: 'cf.t1', st: 'open' },
        { id: 'k2', a: 'c3', b: 'c14', topic: 'cf.t2', st: 'open' }
      ],
      dialogs: [
        dlg('d1', 6, 612, 'q.hours', 'public', 'answer', ['c12'], 1, 'closed', 'C-1001'),
        dlg('d2', 6, 655, 'q.bike', 'public', 'idk', [], 0, 'closed', 'C-1002'),
        dlg('d3', 5, 540, 'q.delivery', 'public', 'answer', ['c1', 'c8'], 0, 'closed', 'C-1003'),
        dlg('d4', 5, 701, 'q.warranty', 'public', 'answer', ['c3', 'c14'], -1, 'closed', 'C-1004'),
        dlg('d5', 4, 585, 'q.return', 'public', 'answer', ['c5'], 1, 'closed', 'C-1005', 'local'),
        dlg('d6', 4, 640, 'q.discount', 'public', 'denied', [], 0, 'closed', 'C-1006'),
        dlg('d7', 3, 560, 'q.bike', 'public', 'idk', [], 0, 'closed', 'C-1007', 'local'),
        dlg('d8', 3, 604, 'q.install', 'public', 'answer', ['c2'], 1, 'closed', 'C-1008'),
        dlg('d9', 2, 570, 'q.plan', 'public', 'idk', [], 0, 'closed', 'C-1009'),
        dlg('d10', 2, 660, 'q.status', 'public', 'answer', ['c9'], 1, 'closed', 'C-1010'),
        dlg('d11', 1, 590, 'q.bike', 'public', 'idk', [], -1, 'closed', 'C-1011'),
        dlg('d12', 1, 630, 'q.repair', 'public', 'answer', ['c13'], 0, 'closed', 'C-1012'),
        dlg('d13', 0, 538, 'q.human', 'public', 'idk', [], 0, 'wait', 'C-1013'),
        dlg('d14', 0, 566, 'q.delivery', 'public', 'answer', ['c1', 'c8'], -1, 'closed', 'C-1014'),
        dlg('d15', 0, 603, 'q.bike', 'public', 'idk', [], 0, 'closed', 'C-1015'),
        dlg('d16', 0, 641, 'q.plan', 'public', 'idk', [], 0, 'closed', 'C-1016'),
        dlg('d17', 45, 600, 'q.hours', 'public', 'answer', ['c12'], 1, 'closed', 'C-0931'),
        dlg('d18', 120, 555, 'q.return', 'public', 'answer', ['c5'], 0, 'closed', 'C-0877'),
        dlg('d19', 200, 610, 'q.delivery', 'public', 'answer', ['c1'], 1, 'closed', 'C-0802')
      ],
      session: [],
      log: [
        { d: 0, m: 8 * 60 + 2, type: 'source', k: 'lg.sync', v: { name: 'src:s8', n: 0 }, l: 'info' },
        { d: 0, m: 9 * 60 + 15, type: 'notify', k: 'lg.notify.handoff', v: { who: 'C-1013' }, l: 'warn' },
        { d: 1, m: 17 * 60 + 40, type: 'access', k: 'lg.role', v: { name: 'Max T.', role: 'role.analyst' }, l: 'info' },
        { d: 1, m: 11 * 60 + 5, type: 'model', k: 'lg.model', v: { model: 'model.cloud' }, l: 'info' },
        { d: 2, m: 10 * 60 + 12, type: 'quality', k: 'lg.eval', v: { ok: 6, n: 8 }, l: 'warn' },
        { d: 3, m: 15 * 60 + 30, type: 'source', k: 'lg.add', v: { name: 'src:s7' }, l: 'info' },
        { d: 3, m: 9 * 60 + 1, type: 'privacy', k: 'lg.mask', v: { on: 'on' }, l: 'info' },
        { d: 5, m: 14 * 60 + 20, type: 'system', k: 'lg.backup', v: {}, l: 'info' }
      ],
      users: [
        { id: 'u1', name: 'Alex M.', role: 'owner', tfa: true, st: 'active' },
        { id: 'u2', name: 'Dana K.', role: 'editor', tfa: true, st: 'active' },
        { id: 'u3', name: 'Sam R.', role: 'operator', tfa: false, st: 'active' },
        { id: 'u4', name: 'Lena P.', role: 'operator', tfa: true, st: 'active' },
        { id: 'u5', name: 'Max T.', role: 'analyst', tfa: false, st: 'invited' }
      ],
      perm: perms(),
      cfg: {
        model: 'cloud', size: 'm', minScore: 2, fallback: true, outage: false, limit: 20, spent: 13.4, keyOk: true, tested: '',
        mask: true, retention: 90, staleDays: 30, greet: '',
        widget: true, color: 'amber', pos: 'right', tg: true, mail: false, rate: 20,
        nHandoff: true, nNeg: true, nConf: true
      },
      ev: { ran: false, res: [], score: null }, customTests: [],
      subjFound: null, nextC: 1, nextD: 20, nextU: 6, nextS: 9, nextK: 3
    };
    return S;
  }
  KB.S = null;
  KB.reset = function () { KB.S = def(); KB.U = KB.U || {}; };

  /* ---------- helpers ---------- */
  KB.fmtTime = function (d, m) {
    var hh = Math.floor(m / 60), mm = m % 60, s = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    return d === 0 ? t('time.today') + ' ' + s : t('time.ago', { n: d }) + ' ' + s;
  };
  KB.tick = function (n) { KB.S.clock = Math.min(23 * 60 + 58, KB.S.clock + (n || 2)); };
  KB.log = function (type, k, v, l) { KB.S.log.unshift({ d: 0, m: KB.S.clock, type: type, k: k, v: v || {}, l: l || 'info' }); };
  KB.src = function (id) { var a = KB.S.sources, i; for (i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; };
  KB.chunk = function (id) { var a = KB.S.chunks, i; for (i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; };
  KB.srcName = function (s) { return s.nm || t('src.' + s.id + '.name'); };
  KB.cTitle = function (c) { return c.title || t('kb.' + c.id + '.title'); };
  KB.cText = function (c) { return c.text || t('kb.' + c.id + '.text' + (c.ver ? c.ver : '')); };
  KB.cKw = function (c) { return c.kw || String(t('kb.' + c.id + '.kw')).split(','); };
  KB.stale = function (s) { return s.age > KB.S.cfg.staleDays; };
  KB.role = function () { return KB.S.role; };
  KB.can = function (mod) { return !!KB.S.perm[KB.S.role][mod]; };
  KB.dlgQ = function (d) { return d.qk ? t(d.qk) : d.q; };
  KB.userName = function () {
    var us = KB.S.users, i; for (i = 0; i < us.length; i++) if (us[i].role === KB.S.role) return us[i].name;
    return 'Alex M.';
  };

  /* ---------- retrieval engine ---------- */
  function tokens(q) {
    return String(q).toLowerCase().split(/[^a-z0-9À-ɏЀ-ӿ]+/).filter(function (x) { return x.length >= 2; });
  }
  KB.tokens = tokens;
  function hitStem(tk, stem) { return stem && (tk.indexOf(stem) === 0 || (tk.length >= 5 && stem.indexOf(tk) === 0)); }
  KB.score = function (toks, c) {
    var kw = KB.cKw(c), s = 0, i, j, hit;
    for (i = 0; i < kw.length; i++) {
      hit = false;
      for (j = 0; j < toks.length; j++) if (hitStem(toks[j], kw[i])) { hit = true; break; }
      if (hit) s += i === 0 ? 2 : 1;
    }
    return s;
  };
  KB.conflictOf = function (cids) {
    var out = [];
    KB.S.conflicts.forEach(function (k) { if (k.st === 'open' && cids.indexOf(k.a) >= 0 && cids.indexOf(k.b) >= 0) out.push(k); });
    return out;
  };
  /* returns {rows:[{c,score,ok,blocked}], hits:[rows above threshold and allowed], blocked:[rows]} */
  KB.search = function (q, aud) {
    var toks = tokens(q), S = KB.S, min = S.cfg.minScore, rows = [];
    S.chunks.forEach(function (c) {
      var s = KB.src(c.src), sc;
      if (!c.on || !s || !s.on) return;
      sc = KB.score(toks, c);
      if (sc > 0) rows.push({ c: c, score: sc, ok: sc >= min, blocked: s.aud === 'team' && aud !== 'team' });
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    return {
      rows: rows,
      hits: rows.filter(function (r) { return r.ok && !r.blocked; }),
      blocked: rows.filter(function (r) { return r.ok && r.blocked; })
    };
  };
  /* effective model after outage / budget / fallback rules */
  KB.effModel = function () {
    var c = KB.S.cfg;
    if (c.model === 'off') return { m: 'search', note: '' };
    if (c.model === 'cloud') {
      if (c.outage || !c.keyOk) return c.fallback ? { m: 'search', note: 'down' } : { m: 'down', note: 'down' };
      if (c.spent >= c.limit) return c.fallback ? { m: 'local', note: 'budget' } : { m: 'down', note: 'budget' };
      return { m: 'cloud', note: '' };
    }
    return { m: 'local', note: '' };
  };
  KB.answer = function (q, aud) {
    var r = KB.search(q, aud), em = KB.effModel(), res;
    if (em.m === 'down') return { kind: 'down', cids: [], model: 'down', note: em.note, rows: r.rows };
    if (!r.hits.length) return { kind: r.blocked.length ? 'denied' : 'idk', cids: [], model: em.m, note: em.note, rows: r.rows };
    var n = em.m === 'cloud' ? 3 : (em.m === 'local' ? 2 : 1);
    res = { kind: em.m === 'search' ? 'quote' : 'answer', cids: r.hits.slice(0, n).map(function (x) { return x.c.id; }), model: em.m, note: em.note, rows: r.rows };
    if (em.m === 'cloud') KB.S.cfg.spent = Math.round((KB.S.cfg.spent + 0.8) * 10) / 10;
    return res;
  };
  /* the text of an answer built from stored chunk ids (renders in the current language) */
  KB.segments = function (res) {
    var out = [], i, c;
    if (res.kind === 'idk') return [{ text: t('ans.idk') }];
    if (res.kind === 'denied') return [{ text: t('ans.denied') }];
    if (res.kind === 'down') return [{ text: t('ans.down') }];
    for (i = 0; i < res.cids.length; i++) {
      c = KB.chunk(res.cids[i]); if (!c) continue;
      out.push({ text: KB.cText(c), cid: c.id, n: i + 1 });
    }
    if (res.kind === 'quote' && out.length) out[0].text = t('ans.quote') + ' ' + out[0].text;
    return out;
  };
  KB.plain = function (res) { return KB.segments(res).map(function (x) { return x.text; }).join(' '); };

  /* an operator answer becomes a new fragment of the "Operator answers" source */
  KB.addAnswer = function (question, answer, aud) {
    var S = KB.S, toks = tokens(question).filter(function (x) { return x.length >= 4; }), stems = [], i;
    toks.sort(function (a, b) { return b.length - a.length; });
    for (i = 0; i < toks.length; i++) { var st = toks[i].slice(0, Math.max(4, toks[i].length - 2)); if (stems.indexOf(st) < 0) stems.push(st); }
    if (!stems.length) stems = [String(question).toLowerCase().slice(0, 5)];
    var id = 'x' + (S.nextC++);
    S.chunks.push({ id: id, src: 's6', on: true, ver: 0, title: question, text: answer, kw: stems });
    var s6 = KB.src('s6'); s6.age = 0; s6.ver++;
    if (aud === 'team') { /* a team-only answer lives in its own closed source */
      var ns = { id: 's' + (S.nextS++), type: 'manual', aud: 'team', age: 0, on: true, ver: 1, pages: 0, nm: t('src.team.answers') };
      S.sources.push(ns); S.chunks[S.chunks.length - 1].src = ns.id; s6.ver--;
    }
    return id;
  };

  /* normalised key for grouping unanswered questions */
  KB.normQ = function (d) { return d.qk ? d.qk : String(d.q).toLowerCase().replace(/[^a-z0-9À-ɏЀ-ӿ ]+/g, '').trim(); };
  KB.unanswered = function () {
    var map = {}, out = [];
    KB.S.dialogs.forEach(function (d) {
      if (d.res.kind !== 'idk' || d.fixed) return;
      var k = KB.normQ(d);
      if (!map[k]) { map[k] = { key: k, count: 0, last: d, ids: [] }; out.push(map[k]); }
      map[k].count++; map[k].ids.push(d.id);
      if (d.d < map[k].last.d || (d.d === map[k].last.d && d.m > map[k].last.m)) map[k].last = d;
    });
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  };

  /* quality set: question key, expected fragment id or null (must say "I don't know" or refuse) */
  KB.TESTS = [
    { qk: 'q.delivery', exp: 'c1' }, { qk: 'q.warranty', exp: 'c3' }, { qk: 'q.return', exp: 'c5' },
    { qk: 'q.install', exp: 'c2' }, { qk: 'q.hours', exp: 'c12' }, { qk: 'q.repair', exp: 'c13' },
    { qk: 'q.gift', exp: null }, { qk: 'q.discount', exp: null }
  ];
  KB.runEval = function () {
    var S = KB.S, saved = S.cfg.spent, n = 0;
    var list = KB.TESTS.map(function (x) { return { label: t(x.qk), exp: x.exp }; }).concat((S.customTests || []).map(function (x) { return { label: x.q, exp: x.exp }; }));
    var res = list.map(function (x) {
      var r = KB.answer(x.label, 'public'), ok;
      if (x.exp === 'any') ok = r.kind === 'answer' || r.kind === 'quote';
      else if (x.exp) ok = r.cids.indexOf(x.exp) >= 0;
      else ok = r.kind === 'idk' || r.kind === 'denied';
      return { label: x.label, exp: x.exp, got: r.cids.slice(), kind: r.kind, ok: ok };
    });
    S.cfg.spent = saved;
    res.forEach(function (r) { if (r.ok) n++; });
    S.ev = { ran: true, res: res, score: n };
    KB.log('quality', 'lg.eval', { ok: n, n: res.length }, n === res.length ? 'info' : 'warn');
    return n;
  };

  /* ---------- masking for the privacy module ---------- */
  KB.mask = function (s) {
    return String(s)
      .replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, '**email**')
      .replace(/\b\d(?:[ -]?\d){12,18}\b/g, '**card**')
      .replace(/\+?\d[\d ()-]{7,}\d/g, '**phone**');
  };

  /* ---------- ui helpers ---------- */
  var UI = KB.ui;
  var PATH = {
    chat: 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5',
    dialogs: 'M3 6h12v8H8l-3 3v-3H3zM17 9h4v8h-2v3l-3-3h-4v-2',
    unanswered: 'M12 4a5 5 0 0 0-5 5h3a2 2 0 1 1 3 1.7c-1.2.8-1.7 1.6-1.7 3M12 18v2',
    sources: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
    conflicts: 'M12 3l9 16H3zM12 10v4M12 17v.5',
    quality: 'M5 12l4 4 10-10M4 20h16',
    analytics: 'M5 20V10M12 20V4M19 20v-7',
    access: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9.5 12l2 2 3.5-4',
    model: 'M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M7 6h10v12H7zM10 10h4v4h-4z',
    privacy: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5zM12 15v3',
    channels: 'M4 13a8 8 0 0 1 16 0M2 13h3v5H2zM19 13h3v5h-3zM17 19c-1 2-3 2-5 2',
    journal: 'M6 3h11l3 3v15H6zM9 9h8M9 13h8M9 17h5',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z',
    more: 'M4 7h16M4 12h16M4 17h16',
    send: 'M4 12l16-8-6 16-3-7z',
    refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
    plus: 'M12 5v14M5 12h14',
    up: 'M7 11l5-6 5 6M12 5v14',
    down: 'M7 13l5 6 5-6M12 19V5',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6',
    site: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    pdf: 'M6 3h9l4 4v14H6zM9 14h6M9 17h6M9 11h3',
    doc: 'M6 3h9l4 4v14H6zM9 10h6M9 13h6M9 16h4',
    sheet: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
    manual: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
    api: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12'
  };
  UI.svg = function (name, sz) {
    var p = PATH[name] || name;
    return '<svg viewBox="0 0 24 24" width="' + (sz || 18) + '" height="' + (sz || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + p + '"/></svg>';
  };
  UI.badge = function (cls, text) { return '<span class="pf-badge ' + cls + '">' + e(text) + '</span>'; };
  UI.seg = function (act, opts, cur, label) {
    return '<div class="seg" role="group" aria-label="' + e(label || '') + '">' + opts.map(function (o) {
      return '<button type="button" data-act="' + act + '" data-v="' + e(o.v) + '" aria-pressed="' + (cur === o.v) + '">' + e(o.l) + '</button>';
    }).join('') + '</div>';
  };
  UI.sw = function (inKey, on, label, extra) {
    return '<label class="chk"><input type="checkbox" data-in="' + inKey + '"' + (extra || '') + (on ? ' checked' : '') + '><span>' + e(label) + '</span></label>';
  };
  UI.head = function (title, sub, right) {
    return '<div class="mh"><div><h3>' + e(title) + '</h3>' + (sub ? '<p>' + e(sub) + '</p>' : '') + '</div>' + (right || '') + '</div>';
  };
  UI.empty = function (text) { return '<p class="empty">' + e(text) + '</p>'; };
  KB.toast = function (key, v) { KB.U.toast = t(key, v); };
}(window));
