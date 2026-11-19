/* Knowledge Agent demo, part B: quality, analytics, access, model, privacy, channels, journal. */
(function (w) {
  'use strict';
  var KB = w.KB, t = KB.t, e = KB.esc, UI = KB.ui, U = KB.U, V = KB.views, A = KB.acts, I = KB.ins, F = KB.forms;
  U.ev = { err: '' };
  U.ac = { tab: 'users', err: '' };
  U.md = { testing: false };
  U.pv = { sample: '', subj: 'C-1013', found: false, del: false, exp: false };
  U.ch = { copied: false };
  U.jr = { type: 'all', q: '', csv: false };
  var ROLES = ['owner', 'editor', 'operator', 'analyst'];

  function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }
  function modelName(m) { return t('model.' + m); }

  /* ---------- quality ---------- */
  V.quality = function () {
    var S = KB.S, ev = S.ev, em = KB.effModel(), rows = '';
    var tests = KB.TESTS.map(function (x) { return { label: t(x.qk), exp: x.exp }; });
    (S.customTests || []).forEach(function (x) { tests.push({ label: x.q, exp: x.exp, custom: true }); });
    if (ev.ran) {
      rows = ev.res.map(function (r, i) {
        var ex = r.exp === 'any' ? t('ev.exp.answer') : (r.exp ? KB.cTitle(KB.chunk(r.exp) || { id: r.exp }) : t('ev.exp.none'));
        var got = r.got.length ? r.got.map(function (id) { var c = KB.chunk(id); return c ? KB.cTitle(c) : id; }).join(', ') : t('kind.' + r.kind);
        return '<li class="ev-row ' + (r.ok ? 'ok' : 'bad') + '"><div><strong>' + e(r.label) + '</strong><p class="meta">' + e(t('ev.expected')) + ': ' + e(ex) + '</p><p class="meta">' + e(t('ev.got')) + ': ' + e(got) + '</p></div><div class="acts">' + UI.badge(r.ok ? 'ok' : 'bad', r.ok ? t('ev.pass') : t('ev.fail')) +
          (!r.ok ? '<button type="button" class="lnk" data-act="evfix" data-i="' + i + '">' + e(t('ev.fix')) + '</button>' : '') + '</div></li>';
      }).join('');
    } else {
      rows = tests.map(function (x) { return '<li class="ev-row"><div><strong>' + e(x.label) + '</strong><p class="meta">' + e(t('ev.expected')) + ': ' + e(x.exp === 'any' ? t('ev.exp.answer') : (x.exp ? KB.cTitle(KB.chunk(x.exp) || { id: x.exp }) : t('ev.exp.none'))) + '</p></div>' + UI.badge('info', t('ev.notrun')) + '</li>'; }).join('');
    }
    var score = ev.ran ? ev.score + ' / ' + ev.res.length : '—';
    var pc = ev.ran ? pct(ev.score, ev.res.length) : 0;
    return UI.head(t('mod.quality'), t('ev.sub'), '<button type="button" class="btn btn-sm" data-act="evrun">' + UI.svg('quality', 16) + '<span>' + e(t('ev.run')) + '</span></button>') +
      '<div class="two"><div class="card score"><p class="meta">' + e(t('ev.score')) + '</p><div class="big">' + e(score) + '</div><div class="bar thick"><i class="' + (pc >= 90 ? 'ok' : 'warn') + '" style="width:' + pc + '%"></i></div>' +
      '<p class="hint">' + e(t('ev.using', { model: modelName(em.m), n: S.cfg.minScore })) + '</p></div>' +
      '<form class="card addf" data-form="addtest"><h4>' + e(t('ev.add')) + '</h4><div class="fgrid"><label class="wide">' + e(t('ev.q')) + '<input name="q" maxlength="120" autocomplete="off"></label>' +
      '<label class="wide">' + e(t('ev.should')) + '<select name="x"><option value="any">' + e(t('ev.exp.answer')) + '</option><option value="none">' + e(t('ev.exp.none')) + '</option></select></label></div>' +
      (U.ev.err ? '<span class="fix">' + e(t(U.ev.err)) + '</span>' : '') + '<div class="acts"><button type="submit" class="btn btn-ghost btn-sm">' + e(t('ev.addb')) + '</button></div></form></div>' +
      '<ul class="ev">' + rows + '</ul>';
  };
  A.evrun = function () {
    var S = KB.S;
    S.customTests = S.customTests || [];
    KB.runEval(); KB.tick(3); KB.toast('toast.evaluated');
  };
  A.evfix = function (b) {
    var r = KB.S.ev.res[+b.getAttribute('data-i')];
    if (r.exp && r.exp !== 'any') { var c = KB.chunk(r.exp); if (c) { U.src.sel = c.src; U.src.det = true; KB.go('sources'); return; } }
    KB.go('model');
  };
  F.addtest = function (f) {
    var q = f.elements.q.value.replace(/^\s+|\s+$/g, '');
    if (q.length < 6) { U.ev.err = 'err.q'; return; }
    KB.S.customTests = KB.S.customTests || [];
    KB.S.customTests.push({ q: q, exp: f.elements.x.value === 'none' ? null : 'any' });
    KB.S.ev = { ran: false, res: [], score: null }; U.ev.err = ''; KB.toast('toast.added');
  };

  /* ---------- analytics ---------- */
  V.analytics = function () {
    var S = KB.S, ds = S.dialogs.filter(function (x) { return x.d <= 6; }), n = ds.length, kinds = { answer: 0, quote: 0, idk: 0, denied: 0, down: 0 }, up = 0, dn = 0, hand = 0, days = [0, 0, 0, 0, 0, 0, 0], ans = [0, 0, 0, 0, 0, 0, 0], use = {}, i;
    ds.forEach(function (d) {
      kinds[d.res.kind]++; if (d.rating > 0) up++; if (d.rating < 0) dn++;
      if (d.st === 'wait' || d.st === 'human' || d.msgs.length) hand++;
      var ix = 6 - Math.min(6, d.d); days[ix]++; if (d.res.kind === 'answer' || d.res.kind === 'quote') ans[ix]++;
      d.res.cids.forEach(function (id) { var c = KB.chunk(id); if (c) use[c.src] = (use[c.src] || 0) + 1; });
    });
    var answered = kinds.answer + kinds.quote, mx = Math.max.apply(null, days.concat([1])), bars = '';
    for (i = 0; i < 7; i++) {
      bars += '<li><span class="bl">' + e(i === 6 ? t('time.today') : t('time.ago', { n: 6 - i })) + '</span><div class="stack" style="width:' + Math.round(days[i] * 100 / mx) + '%"><i class="ok" style="flex:' + ans[i] + '"></i><i class="warn" style="flex:' + (days[i] - ans[i]) + '"></i></div><b>' + days[i] + '</b></li>';
    }
    var srcRows = Object.keys(use).sort(function (a, b) { return use[b] - use[a]; }).slice(0, 6).map(function (id) {
      var s = KB.src(id); if (!s) return '';
      return '<li><span class="bl wide">' + e(KB.srcName(s)) + '</span><div class="stack" style="width:' + Math.round(use[id] * 100 / Math.max.apply(null, Object.keys(use).map(function (k) { return use[k]; }))) + '%"><i class="info" style="flex:1"></i></div><b>' + use[id] + '</b></li>';
    }).join('');
    var topUn = KB.unanswered().slice(0, 3).map(function (g) { return '<li><span>' + e(g.last.qk ? t(g.last.qk) : g.last.q) + '</span><b>' + g.count + '</b></li>'; }).join('') || '<li>' + e(t('un.none')) + '</li>';
    var kindRows = ['answer', 'quote', 'idk', 'denied', 'down'].filter(function (k) { return kinds[k]; }).map(function (k) { return '<li><span class="bl wide">' + e(t('kind.' + k)) + '</span><div class="stack" style="width:' + pct(kinds[k], n) + '%"><i class="' + (k === 'answer' || k === 'quote' ? 'ok' : 'warn') + '" style="flex:1"></i></div><b>' + kinds[k] + '</b></li>'; }).join('');
    var tile = function (lab, val, sub, cls) { return '<div class="tile ' + (cls || '') + '"><span class="meta">' + e(lab) + '</span><strong>' + e(val) + '</strong><span class="sub">' + e(sub || '') + '</span></div>'; };
    return UI.head(t('mod.analytics'), t('an.sub')) +
      '<div class="tiles">' + tile(t('an.total'), String(n), t('an.week')) + tile(t('an.answered'), pct(answered, n) + '%', answered + ' / ' + n, 'ok') + tile(t('an.idk'), String(kinds.idk), t('an.unans'), 'warn') +
      tile(t('an.rating'), up + dn ? pct(up, up + dn) + '%' : '—', up + ' / ' + dn) + tile(t('an.handoff'), String(hand), t('an.dialogs')) + tile(t('an.spent'), S.cfg.spent.toFixed(1), t('an.of', { n: S.cfg.limit })) + '</div>' +
      '<div class="two"><div class="card"><h4>' + e(t('an.perday')) + '</h4><ul class="hbars">' + bars + '</ul><p class="legend"><i class="ok"></i>' + e(t('an.leg.ans')) + ' <i class="warn"></i>' + e(t('an.leg.no')) + '</p></div>' +
      '<div class="card"><h4>' + e(t('an.outcomes')) + '</h4><ul class="hbars">' + kindRows + '</ul></div></div>' +
      '<div class="two"><div class="card"><h4>' + e(t('an.bysrc')) + '</h4><ul class="hbars">' + (srcRows || '<li>' + e(t('an.nodata')) + '</li>') + '</ul></div>' +
      '<div class="card"><h4>' + e(t('an.topun')) + '</h4><ul class="mini">' + topUn + '</ul><div class="acts"><button type="button" class="lnk" data-act="gonav" data-id="unanswered">' + e(t('an.openun')) + '</button></div></div></div>';
  };

  /* ---------- access ---------- */
  V.access = function () {
    var S = KB.S, L = U.ac, isOwner = S.role === 'owner';
    var tabs = [{ v: 'users', l: t('ac.t.users') }, { v: 'matrix', l: t('ac.t.matrix') }, { v: 'audience', l: t('ac.t.aud') }];
    var head = '<div class="pf-tabs" role="group" aria-label="' + e(t('ac.tabs')) + '">' + tabs.map(function (x) { return '<button type="button" data-act="actab" data-v="' + x.v + '" aria-pressed="' + (L.tab === x.v) + '">' + e(x.l) + '</button>'; }).join('') + '</div>';
    var body = '';
    if (L.tab === 'users') {
      body = '<ul class="cards">' + S.users.map(function (u) {
        return '<li class="card user"><div class="u-h"><span class="avatar" aria-hidden="true">' + e(u.name.charAt(0)) + '</span><div><strong>' + e(u.name) + '</strong><p class="meta">' + (u.st === 'invited' ? e(t('ac.invited')) : e(t('ac.active'))) + '</p></div></div><div class="acts">' +
          '<label class="sel">' + e(t('ac.role')) + '<select data-in="urole" data-id="' + u.id + '"' + (isOwner && u.id !== 'u1' ? '' : ' disabled') + '>' + ROLES.map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + e(t('role.' + r)) + '</option>'; }).join('') + '</select></label>' +
          UI.sw('utfa', u.tfa, t('ac.2fa'), ' data-id="' + u.id + '"' + (isOwner ? '' : ' disabled')) + '</div></li>';
      }).join('') + '</ul>' +
        '<form class="card addf" data-form="invite"><h4>' + e(t('ac.invite')) + '</h4><div class="fgrid"><label>' + e(t('ac.name')) + '<input name="n" maxlength="40" autocomplete="off"></label><label>' + e(t('ac.role')) + '<select name="r">' + ROLES.slice(1).map(function (r) { return '<option value="' + r + '">' + e(t('role.' + r)) + '</option>'; }).join('') + '</select></label></div>' +
        (L.err ? '<span class="fix">' + e(t(L.err)) + '</span>' : '') + '<div class="acts"><button type="submit" class="btn btn-sm"' + (isOwner ? '' : ' disabled') + '>' + e(t('ac.send')) + '</button></div></form>';
    } else if (L.tab === 'matrix') {
      body = (isOwner ? '' : '<div class="note warn"><span>' + e(t('ac.readonly')) + '</span></div>') + '<div class="mx"><table><thead><tr><th>' + e(t('ac.module')) + '</th>' + ROLES.map(function (r) { return '<th>' + e(t('role.' + r)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        KB.MODS.map(function (m) {
          return '<tr><th scope="row">' + e(t('mod.' + m)) + '</th>' + ROLES.map(function (r) {
            return '<td data-l="' + e(t('role.' + r)) + '"><label class="chk sm"><input type="checkbox" data-in="perm" data-r="' + r + '" data-m="' + m + '"' + (S.perm[r][m] ? ' checked' : '') + (isOwner && r !== 'owner' ? '' : ' disabled') + '><span class="sr">' + e(t('mod.' + m) + ' / ' + t('role.' + r)) + '</span><span aria-hidden="true">' + (S.perm[r][m] ? '✓' : '–') + '</span></label></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    } else {
      body = '<div class="card"><h4>' + e(t('ac.aud.h')) + '</h4><p class="hint">' + e(t('ac.aud.p')) + '</p><ul class="mini">' + S.sources.map(function (s) {
        return '<li><span>' + UI.svg(s.type, 16) + ' ' + e(KB.srcName(s)) + '</span><span>' + UI.badge(s.aud === 'team' ? 'bad' : 'ok', t('aud.' + s.aud)) + '</span></li>';
      }).join('') + '</ul><div class="acts"><button type="button" class="lnk" data-act="gonav" data-id="sources">' + e(t('ac.aud.go')) + '</button></div></div>';
    }
    return UI.head(t('mod.access'), t('ac.sub')) + head + body;
  };
  A.actab = function (b) { U.ac.tab = b.getAttribute('data-v'); U.ac.err = ''; };
  I.urole = function (el) {
    var u = KB.S.users.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; u.role = el.value; KB.tick(1);
    KB.log('access', 'lg.role', { name: u.name, role: 'role.' + u.role }, 'info'); KB.toast('toast.saved');
  };
  I.utfa = function (el) {
    var u = KB.S.users.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; u.tfa = el.checked; KB.tick(1);
    KB.log('access', el.checked ? 'lg.tfaon' : 'lg.tfaoff', { name: u.name }, el.checked ? 'info' : 'warn');
  };
  I.perm = function (el) {
    var r = el.getAttribute('data-r'), m = el.getAttribute('data-m'); KB.S.perm[r][m] = el.checked; KB.tick(1);
    KB.log('access', 'lg.perm', { role: 'role.' + r, mod: 'mod.' + m, on: el.checked ? 'on' : 'off' }, 'info');
  };
  F.invite = function (f) {
    var n = f.elements.n.value.replace(/^\s+|\s+$/g, '');
    if (n.length < 2) { U.ac.err = 'err.name'; return; }
    var S = KB.S; S.users.push({ id: 'u' + (S.nextU++), name: n, role: f.elements.r.value, tfa: false, st: 'invited' }); U.ac.err = ''; KB.tick(1);
    KB.log('access', 'lg.invite', { name: n, role: 'role.' + f.elements.r.value }, 'info'); KB.toast('toast.invited');
  };

  /* ---------- model ---------- */
  V.model = function () {
    var S = KB.S, c = S.cfg, em = KB.effModel(), over = c.spent >= c.limit, pc = Math.min(100, pct(c.spent, c.limit));
    var card = function (id, ico) {
      return '<button type="button" class="mcard" data-act="mset" data-v="' + id + '" aria-pressed="' + (c.model === id) + '">' + UI.svg(ico, 22) + '<strong>' + e(t('model.' + id)) + '</strong><span>' + e(t('model.' + id + '.p')) + '</span></button>';
    };
    var local = c.model === 'local' ? '<div class="card"><h4>' + e(t('md.size')) + '</h4>' + UI.seg('msize', [{ v: 's', l: t('md.s') }, { v: 'm', l: t('md.m') }, { v: 'l', l: t('md.l') }], c.size, t('md.size')) + '<p class="hint">' + e(t('md.size.' + c.size)) + '</p></div>' : '';
    var cloud = c.model === 'cloud' ? '<div class="card"><h4>' + e(t('md.cloud')) + '</h4><div class="acts">' + UI.sw('keyok', c.keyOk, t('md.key')) + UI.sw('outage', c.outage, t('md.outage')) + '</div><p class="hint">' + e(t('md.key.hint')) + '</p>' +
      '<div class="meter"><div class="mh"><strong>' + e(t('md.budget')) + '</strong><span class="meta">' + c.spent.toFixed(1) + ' / ' + c.limit + ' ' + e(t('md.units')) + '</span></div><div class="bar thick"><i class="' + (over ? 'bad' : 'ok') + '" style="width:' + pc + '%"></i></div></div>' +
      '<div class="inline"><label for="md-lim" class="meta">' + e(t('md.limit')) + '</label><input class="inp" id="md-lim" type="number" min="1" max="500" data-in="limit" value="' + c.limit + '"></div>' + (over ? '<div class="note bad"><span>' + e(t('md.over')) + '</span></div>' : '') + '</div>' : '';
    return UI.head(t('mod.model'), t('md.sub')) +
      '<div class="mcards">' + card('local', 'model') + card('cloud', 'site') + card('off', 'sources') + '</div>' +
      '<div class="note ' + (em.note ? 'warn' : 'info') + '"><span>' + e(t('md.now', { model: modelName(em.m) })) + (em.note ? ' (' + e(t('md.note.' + em.note)) + ')' : '') + '</span></div>' + local + cloud +
      '<div class="card"><h4>' + e(t('md.strict')) + '</h4><div class="rng"><label class="sr" for="md-min">' + e(t('md.strict')) + '</label><input type="range" id="md-min" min="1" max="3" step="1" data-in="minscore" value="' + c.minScore + '"><b>' + c.minScore + '</b></div><p class="hint">' + e(t('md.strict.' + c.minScore)) + '</p>' +
      '<div class="acts">' + UI.sw('fallback', c.fallback, t('md.fallback')) + '</div><p class="hint">' + e(t('md.fallback.p')) + '</p></div>' +
      '<div class="card"><h4>' + e(t('md.test')) + '</h4><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="mtest"' + (U.md.testing ? ' disabled' : '') + '>' + e(U.md.testing ? t('md.testing') : t('md.test.b')) + '</button>' +
      (c.tested ? '<span class="pf-badge ' + (c.tested === 'ok' ? 'ok' : 'bad') + '">' + e(t('md.res.' + c.tested)) + '</span>' : '') + '</div></div>';
  };
  A.mset = function (b) {
    var v = b.getAttribute('data-v'); KB.S.cfg.model = v; KB.S.cfg.tested = ''; KB.S.ev = { ran: false, res: [], score: null }; KB.tick(1);
    KB.log('model', 'lg.model', { model: 'model.' + v }, 'info'); KB.toast('toast.saved');
  };
  A.msize = function (b) { KB.S.cfg.size = b.getAttribute('data-v'); KB.log('model', 'lg.size', { size: 'md.' + b.getAttribute('data-v') }, 'info'); };
  I.keyok = function (el) { KB.S.cfg.keyOk = el.checked; if (!el.checked) KB.S.cfg.outage = true; else KB.S.cfg.outage = false; KB.log('model', 'lg.key', { on: el.checked ? 'on' : 'off' }, 'warn'); };
  I.outage = function (el) { KB.S.cfg.outage = el.checked; KB.log('model', 'lg.outage', { on: el.checked ? 'on' : 'off' }, el.checked ? 'warn' : 'info'); };
  I.fallback = function (el) { KB.S.cfg.fallback = el.checked; KB.log('model', 'lg.fallback', { on: el.checked ? 'on' : 'off' }, 'info'); };
  I.minscore = function (el, ev, type) { KB.S.cfg.minScore = +el.value; KB.S.ev = { ran: false, res: [], score: null }; if (type === 'change') KB.log('model', 'lg.strict', { n: el.value }, 'info'); };
  I.limit = function (el) { var v = +el.value; if (v >= 1 && v <= 500) KB.S.cfg.limit = v; return false; };
  A.mtest = function () {
    U.md.testing = true;
    setTimeout(function () {
      U.md.testing = false; KB.S.cfg.tested = (KB.S.cfg.model === 'cloud' && KB.S.cfg.outage) ? 'fail' : 'ok';
      KB.log('model', 'lg.test', { res: 'md.res.' + KB.S.cfg.tested }, KB.S.cfg.tested === 'ok' ? 'info' : 'warn');
      if (KB.rerender) KB.rerender();
    }, w.PF.reduced ? 0 : 900);
  };

  /* ---------- privacy ---------- */
  V.privacy = function () {
    var S = KB.S, P = U.pv, c = S.cfg, sample = P.sample || t('pv.sample');
    var old = S.dialogs.filter(function (d) { return d.d >= c.retention; }).length;
    var subjD = S.dialogs.filter(function (d) { return d.subj === P.subj; });
    var found = P.found ? (subjD.length ? '<div class="note info"><span>' + e(t('pv.found', { n: subjD.length })) + '</span><div class="note-act"><button type="button" class="btn btn-ghost btn-sm" data-act="pvexp">' + e(t('pv.export')) + '</button>' +
      (P.del ? '<button type="button" class="btn btn-sm danger" data-act="pverase">' + e(t('pv.confirm')) + '</button>' : '<button type="button" class="btn btn-ghost btn-sm" data-act="pvdelask">' + e(t('pv.erase')) + '</button>') + '</div></div>' : '<div class="note warn"><span>' + e(t('pv.none')) + '</span></div>') : '';
    var exp = P.exp && subjD.length ? '<pre class="code">' + e(JSON.stringify(subjD.map(function (d) { return { id: d.id, when: KB.fmtTime(d.d, d.m), question: KB.dlgQ(d), outcome: d.res.kind }; }), null, 1)) + '</pre>' : '';
    return UI.head(t('mod.privacy'), t('pv.sub')) +
      '<div class="two"><div class="card"><h4>' + e(t('pv.mask.h')) + '</h4><div class="acts">' + UI.sw('mask', c.mask, t('pv.mask')) + '</div><p class="hint">' + e(t('pv.mask.p')) + '</p>' +
      '<label class="lbl" for="pv-s">' + e(t('pv.try')) + '</label><textarea class="inp" id="pv-s" rows="3" data-in="pvsample">' + e(sample) + '</textarea><p class="meta">' + e(t('pv.out')) + '</p><pre class="code">' + e(c.mask ? KB.mask(sample) : sample) + '</pre></div>' +
      '<div class="card"><h4>' + e(t('pv.ret.h')) + '</h4><label class="meta" for="pv-r">' + e(t('pv.ret')) + '</label><select class="inp" id="pv-r" data-in="retention">' + [30, 90, 180, 365].map(function (d) { return '<option value="' + d + '"' + (c.retention === d ? ' selected' : '') + '>' + e(t('pv.days', { n: d })) + '</option>'; }).join('') + '</select>' +
      '<p class="hint">' + e(t('pv.ret.p', { n: old })) + '</p><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="pvpurge"' + (old ? '' : ' disabled') + '>' + e(t('pv.purge')) + '</button></div></div></div>' +
      '<div class="card"><h4>' + e(t('pv.subj.h')) + '</h4><p class="hint">' + e(t('pv.subj.p')) + '</p><form class="inline" data-form="subj"><label class="sr" for="pv-id">' + e(t('pv.id')) + '</label><input class="inp" id="pv-id" name="s" value="' + e(P.subj) + '" maxlength="12" autocomplete="off"><button class="btn btn-sm" type="submit">' + e(t('pv.find')) + '</button></form>' + found + exp + '</div>' +
      '<div class="card"><h4>' + e(t('pv.host.h')) + '</h4><p class="hint">' + e(c.model === 'cloud' ? t('pv.host.cloud') : t('pv.host.local')) + '</p></div>';
  };
  I.mask = function (el) { KB.S.cfg.mask = el.checked; KB.log('privacy', 'lg.mask', { on: el.checked ? 'on' : 'off' }, 'info'); };
  I.pvsample = function (el) { U.pv.sample = el.value; return false; };
  I.retention = function (el) { KB.S.cfg.retention = +el.value; KB.log('privacy', 'lg.ret', { n: el.value }, 'info'); };
  A.pvpurge = function () {
    var S = KB.S, n = S.dialogs.filter(function (d) { return d.d >= S.cfg.retention; }).length;
    S.dialogs = S.dialogs.filter(function (d) { return d.d < S.cfg.retention; }); KB.tick(1);
    KB.log('privacy', 'lg.purge', { n: n }, 'warn'); KB.toast('toast.purged');
  };
  F.subj = function (f) { U.pv.subj = f.elements.s.value.replace(/^\s+|\s+$/g, ''); U.pv.found = true; U.pv.del = false; U.pv.exp = false; };
  A.pvexp = function () { U.pv.exp = !U.pv.exp; };
  A.pvdelask = function () { U.pv.del = true; };
  A.pverase = function () {
    var S = KB.S, s = U.pv.subj, n = S.dialogs.filter(function (d) { return d.subj === s; }).length;
    S.dialogs = S.dialogs.filter(function (d) { return d.subj !== s; }); S.session = S.session.filter(function (id) { return !!S.dialogs.filter(function (d) { return d.id === id; }).length; });
    U.pv.del = false; U.pv.exp = false; KB.tick(1); KB.log('privacy', 'lg.erase', { n: n, who: s }, 'warn'); KB.toast('toast.erased');
  };

  /* ---------- channels ---------- */
  var COLORS = { amber: '#ffb23e', blue: '#6ab0ff', green: '#5bd08a', slate: '#d6dbe6' };
  V.channels = function () {
    var S = KB.S, c = S.cfg, greet = c.greet || t('ch.greet.def');
    var sw = Object.keys(COLORS).map(function (k) { return '<button type="button" class="swatch' + (c.color === k ? ' on' : '') + '" data-act="chcolor" data-v="' + k + '" style="--sw:' + COLORS[k] + '" aria-pressed="' + (c.color === k) + '" aria-label="' + e(t('chn.c.' + k)) + '"></button>'; }).join('');
    var prev = '<div class="wprev ' + c.pos + (c.widget ? '' : ' off') + '" style="--wc:' + COLORS[c.color] + '"><div class="wp-h">' + e(t('chn.wtitle')) + '</div><div class="wp-b"><p class="wb">' + e(greet) + '</p><p class="wu">' + e(t('q.delivery')) + '</p></div><span class="wp-btn" aria-hidden="true">' + UI.svg('chat', 20) + '</span></div>';
    return UI.head(t('mod.channels'), t('chn.sub')) +
      '<div class="two"><div class="card"><h4>' + e(t('chn.widget')) + '</h4><div class="acts">' + UI.sw('widget', c.widget, t('chn.widget.on')) + '</div>' +
      '<p class="meta">' + e(t('chn.color')) + '</p><div class="swatches">' + sw + '</div>' + UI.seg('chpos', [{ v: 'right', l: t('chn.right') }, { v: 'left', l: t('chn.left') }], c.pos, t('chn.pos')) +
      '<label class="lbl" for="ch-g">' + e(t('chn.greet')) + '</label><input class="inp" id="ch-g" data-in="greet" maxlength="120" placeholder="' + e(t('ch.greet.def')) + '" value="' + e(c.greet) + '">' +
      '<label class="lbl" for="ch-code">' + e(t('chn.embed')) + '</label><pre class="code" id="ch-code">&lt;script src="/widget.js" data-key="PUBLIC_KEY" async&gt;&lt;/script&gt;</pre><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="chcopy">' + e(U.ch.copied ? t('chn.copied') : t('chn.copy')) + '</button></div></div>' +
      '<div class="card"><h4>' + e(t('chn.preview')) + '</h4><div class="stage">' + prev + '</div></div></div>' +
      '<div class="two"><div class="card"><h4>' + e(t('chn.channels')) + '</h4><ul class="mini"><li><span>' + e(t('chn.web')) + '</span>' + UI.badge(c.widget ? 'ok' : 'info', c.widget ? t('chn.on') : t('chn.off')) + '</li>' +
      '<li><span>Telegram</span>' + UI.sw('tg', c.tg, t('chn.on')) + '</li><li><span>' + e(t('chn.mail')) + '</span>' + UI.sw('mail', c.mail, t('chn.on')) + '</li></ul>' +
      '<div class="inline"><label for="ch-rate" class="meta">' + e(t('chn.rate')) + '</label><input class="inp" id="ch-rate" type="number" min="1" max="120" data-in="rate" value="' + c.rate + '"></div></div>' +
      '<div class="card"><h4>' + e(t('chn.notify')) + '</h4><p class="hint">' + e(t('chn.notify.p')) + '</p><div class="stackc">' + UI.sw('nhand', c.nHandoff, t('chn.n.hand')) + UI.sw('nneg', c.nNeg, t('chn.n.neg')) + UI.sw('nconf', c.nConf, t('chn.n.conf')) + '</div><p class="meta">' + e(t('chn.to')) + ' ' + (c.tg ? 'Telegram' : e(t('chn.mail'))) + '</p></div></div>';
  };
  I.widget = function (el) { KB.S.cfg.widget = el.checked; KB.log('system', 'lg.widget', { on: el.checked ? 'on' : 'off' }, el.checked ? 'info' : 'warn'); };
  A.chcolor = function (b) { KB.S.cfg.color = b.getAttribute('data-v'); };
  A.chpos = function (b) { KB.S.cfg.pos = b.getAttribute('data-v'); };
  I.greet = function (el) { KB.S.cfg.greet = el.value; };
  A.chcopy = function () { U.ch.copied = true; setTimeout(function () { U.ch.copied = false; if (KB.rerender) KB.rerender(true); }, 1800); KB.toast('toast.copied'); };
  I.tg = function (el) { KB.S.cfg.tg = el.checked; KB.log('system', 'lg.tg', { on: el.checked ? 'on' : 'off' }, 'info'); };
  I.mail = function (el) { KB.S.cfg.mail = el.checked; KB.log('system', 'lg.mail', { on: el.checked ? 'on' : 'off' }, 'info'); };
  I.rate = function (el) { var v = +el.value; if (v >= 1 && v <= 120) KB.S.cfg.rate = v; return false; };
  I.nhand = function (el) { KB.S.cfg.nHandoff = el.checked; };
  I.nneg = function (el) { KB.S.cfg.nNeg = el.checked; };
  I.nconf = function (el) { KB.S.cfg.nConf = el.checked; };

  /* ---------- journal ---------- */
  function vars(v) {
    var o = {}, k, x, s;
    for (k in v) {
      x = v[k];
      if (typeof x === 'string') {
        if (x.indexOf('src:') === 0) { s = KB.src(x.slice(4)); x = s ? KB.srcName(s) : '—'; }
        else if (/^(role|model|aud|cf|md|mod)\./.test(x)) x = t(x);
        else if (x === 'on' || x === 'off') x = t('lg.' + x);
      }
      o[k] = x;
    }
    return o;
  }
  KB.logText = function (r) { return t(r.k, vars(r.v)); };
  V.journal = function () {
    var S = KB.S, L = U.jr, q = L.q.toLowerCase(), types = ['all', 'answer', 'source', 'quality', 'access', 'model', 'privacy', 'notify', 'system'];
    var rows = S.log.filter(function (r) { return (L.type === 'all' || r.type === L.type) && (!q || KB.logText(r).toLowerCase().indexOf(q) >= 0); });
    var list = rows.length ? rows.map(function (r) {
      return '<li class="jr ' + r.l + '"><span class="jt">' + e(KB.fmtTime(r.d, r.m)) + '</span>' + UI.badge(r.l === 'warn' ? 'warn' : (r.l === 'bad' ? 'bad' : 'info'), t('jr.type.' + r.type)) + '<span class="jx">' + e(KB.logText(r)) + '</span></li>';
    }).join('') : '<li>' + UI.empty(t('jr.none')) + '</li>';
    var csv = L.csv ? '<pre class="code">' + e(['time;type;event'].concat(rows.slice(0, 8).map(function (r) { return KB.fmtTime(r.d, r.m) + ';' + r.type + ';' + KB.logText(r).replace(/;/g, ','); })).join('\n')) + '</pre>' : '';
    return UI.head(t('mod.journal'), t('jr.sub'), '<button type="button" class="btn btn-ghost btn-sm" data-act="jrcsv">' + e(L.csv ? t('jr.hide') : t('jr.csv')) + '</button>') +
      '<div class="pf-tabs" role="group" aria-label="' + e(t('jr.filter')) + '">' + types.map(function (x) { return '<button type="button" data-act="jrtype" data-v="' + x + '" aria-pressed="' + (L.type === x) + '">' + e(x === 'all' ? t('dl.t.all') : t('jr.type.' + x)) + '</button>'; }).join('') + '</div>' +
      '<div class="tools"><label class="sr" for="jr-q">' + e(t('jr.search')) + '</label><input class="inp" id="jr-q" data-in="jrq" placeholder="' + e(t('jr.search')) + '" value="' + e(L.q) + '"></div>' + csv + '<ul class="journal">' + list + '</ul>';
  };
  A.jrtype = function (b) { U.jr.type = b.getAttribute('data-v'); };
  A.jrcsv = function () { U.jr.csv = !U.jr.csv; };
  I.jrq = function (el) { U.jr.q = el.value; };
}(window));
