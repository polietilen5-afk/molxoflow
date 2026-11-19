/* Auto Diagnostic demo: error codes, history, profile hub, settings, plan, activity log. */
(function () {
  'use strict';
  const AD = window.AD, t = AD.t, esc = AD.esc, $ = AD.$, SC = AD.screens;
  const on = (root, fn) => { root.onclick = e => fn(e, sel => e.target.closest(sel)); };
  const chips = (list, cur, attr) => '<div class="ad-chips scroll">' + list.map(x => '<button type="button" class="ad-chip" data-' + attr + '="' + x[0] + '" aria-pressed="' + (cur === x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>';

  /* ---------- error codes ---------- */
  const codeList = p => {
    const q = (p.q || '').trim().toLowerCase();
    const l = AD.OBD.filter(o => (p.cat === 'all' || o.cat === p.cat) && (!q || o.c.toLowerCase().indexOf(q) >= 0 || t('ob.' + o.c + '.n').toLowerCase().indexOf(q) >= 0));
    if (!l.length) {
      const fmt = /^[pcbu]\d{4}$/i.test(q);
      return '<p class="ad-empty">' + esc(fmt ? t('code.unknown', { code: q.toUpperCase() }) : t('code.none')) + '</p>';
    }
    return '<ul class="ad-list">' + l.map(o => '<li><button type="button" class="ad-card row" data-code="' + o.c + '"><b class="ad-code">' + o.c + '</b><span class="grow"><b>' + esc(t('ob.' + o.c + '.n')) + '</b><small>' + esc(t('cat.' + o.cat)) + '</small></span>' + AD.badge(o.sev === 'high' ? 'bad' : o.sev === 'medium' ? 'warn' : 'ok', t('sev.' + o.sev)) + '</button></li>').join('') + '</ul>';
  };
  SC.codes = {
    title: 'ttl.codes',
    render(p) {
      if (!p.cat) p.cat = 'all';
      return '<p class="ad-muted">' + esc(t('code.lead')) + '</p><label class="ad-search">' + AD.icon('search', 18) + '<input id="cd-q" type="search" value="' + esc(p.q || '') + '" placeholder="' + esc(t('code.ph')) + '" aria-label="' + esc(t('code.ph')) + '" autocomplete="off"></label>' +
        chips([['all', t('f.all')]].concat(AD.CATS.map(c => [c, t('cat.' + c)])), p.cat, 'cat') + '<div id="cd-list">' + codeList(p) + '</div>';
    },
    bind(root, p) {
      const q = $('cd-q'), list = () => { $('cd-list').innerHTML = codeList(p); };
      q.oninput = () => { p.q = q.value; list(); };
      if (p.q && p.q.toUpperCase() === 'P0171' && !p.seen) { p.seen = true; }
      on(root, (e, c) => {
        let b;
        if ((b = c('[data-cat]'))) { p.cat = b.getAttribute('data-cat'); AD.render(false); }
        else if ((b = c('[data-code]'))) AD.go('code', { c: b.getAttribute('data-code') });
      });
    }
  };
  SC.code = {
    title: 'ttl.code',
    render(p) {
      const o = AD.OBD.filter(x => x.c === p.c)[0]; if (!o) return '';
      const S = AD.S;
      return '<div class="ad-card"><div class="ad-row2"><b class="ad-code big">' + o.c + '</b>' + AD.badge(o.sev === 'high' ? 'bad' : o.sev === 'medium' ? 'warn' : 'ok', t('sev.' + o.sev)) + '</div><h4 class="ad-h">' + esc(t('ob.' + o.c + '.n')) + '</h4><p class="ad-sub">' + esc(t('ob.' + o.c + '.d')) + '</p>' +
        '<small class="ad-k">' + esc(t('code.cat')) + '</small><b>' + esc(t('cat.' + o.cat)) + '</b><small class="ad-k mt">' + esc(t('code.likely')) + '</small><b>' + esc(t('cz.' + o.hint + '.n')) + '</b></div>' +
        '<label class="ad-lab" for="cd-car">' + esc(t('code.attach')) + '</label><select id="cd-car">' + S.cars.map(c => '<option value="' + c.id + '"' + (c.id === S.active ? ' selected' : '') + '>' + esc(AD.carName(c)) + '</option>').join('') + '</select>' +
        '<div class="ad-actions"><button type="button" class="ad-btn" data-att="1">' + esc(t('code.attachBtn')) + '</button><button type="button" class="ad-btn ghost" data-dx="1">' + AD.icon('diag', 16) + esc(t('code.diag')) + '</button></div>';
    },
    bind(root, p) {
      const o = AD.OBD.filter(x => x.c === p.c)[0]; if (!o) return;
      on(root, (e, q) => {
        if (q('[data-att]')) {
          const c = AD.car($('cd-car').value);
          if (c.codes.indexOf(o.c) >= 0) { AD.toast(t('code.dup')); return; }
          c.codes.push(o.c); AD.log('car', 'lg.code', { code: o.c, car: AD.carName(c) }); AD.toast(t('code.attOk'));
        } else if (q('[data-dx]')) {
          const S = AD.S; S.active = $('cd-car').value;
          const bo = {}; bo[o.hint] = 3;
          S.draft = { step: 2, carId: S.active, cat: o.cat, sym: [], note: '', boost: bo, chat: [], qi: 0, typing: false, hint: o.c };
          AD.openIn('diagnose', 'diag');
        }
      });
    }
  };

  /* ---------- history ---------- */
  const histList = p => {
    const S = AD.S, q = (p.q || '').trim().toLowerCase();
    const l = S.diags.slice().sort((a, b) => b.date - a.date).filter(d => (p.car === 'all' || d.carId === p.car) && (p.st === 'all' || d.status === p.st) && (!q || t('cat.' + d.cat).toLowerCase().indexOf(q) >= 0 || d.sym.some(s => t('sy.' + s).toLowerCase().indexOf(q) >= 0) || t('cz.' + AD.analyze(d).causes[0].id + '.n').toLowerCase().indexOf(q) >= 0));
    if (!l.length) return '<p class="ad-empty">' + esc(t('hist.none')) + '</p>';
    return '<ul class="ad-list">' + l.map(d => {
      const an = AD.analyze(d), top = an.causes[0];
      return '<li class="ad-card"><button type="button" class="ad-hist" data-d="' + d.id + '"><span class="grow"><b>' + esc(t('cz.' + top.id + '.n')) + '</b><small>' + esc(AD.fmtDate(d.date, true) + ' · ' + AD.carName(AD.car(d.carId)) + ' · ' + t('cat.' + d.cat)) + '</small>' +
        '<span class="ad-car-meta">' + AD.urgBadge(an.urg) + AD.badge(d.status === 'fixed' ? 'ok' : d.status === 'booked' ? 'info' : 'warn', t('st.' + d.status)) + (d.est ? AD.badge('info', AD.range(d.est.total)) : '') + '</span></span>' + AD.icon('right', 18) + '</button>' +
        '<button type="button" class="ad-ic sm del" data-del="' + d.id + '" aria-label="' + esc(t('btn.remove')) + '">' + AD.icon('trash', 18) + '</button></li>';
    }).join('') + '</ul>';
  };
  SC.history = {
    title: 'ttl.hist',
    render(p) {
      const S = AD.S; if (!p.car) { p.car = 'all'; p.st = 'all'; }
      return '<label class="ad-search">' + AD.icon('search', 18) + '<input id="hs-q" type="search" value="' + esc(p.q || '') + '" placeholder="' + esc(t('hist.ph')) + '" aria-label="' + esc(t('hist.ph')) + '" autocomplete="off"></label>' +
        chips([['all', t('f.all')]].concat(S.cars.map(c => [c.id, AD.carName(c)])), p.car, 'car') + chips([['all', t('f.all')], ['open', t('st.open')], ['booked', t('st.booked')], ['fixed', t('st.fixed')]], p.st, 'st') +
        '<div id="hs-list">' + histList(p) + '</div>';
    },
    bind(root, p) {
      const q = $('hs-q'); q.oninput = () => { p.q = q.value; $('hs-list').innerHTML = histList(p); };
      on(root, (e, c) => {
        let b;
        if ((b = c('[data-car]'))) { p.car = b.getAttribute('data-car'); AD.render(false); }
        else if ((b = c('[data-st]'))) { p.st = b.getAttribute('data-st'); AD.render(false); }
        else if ((b = c('[data-d]'))) AD.go('result', { id: b.getAttribute('data-d') });
        else if ((b = c('[data-del]'))) { const id = b.getAttribute('data-del'); AD.confirm(t('hist.delH'), t('hist.delP'), t('btn.remove'), () => { const S = AD.S; S.diags = S.diags.filter(x => x.id !== id); AD.log('diag', 'lg.diagDel', {}); AD.render(false); }, true); }
      });
    }
  };

  /* ---------- profile hub ---------- */
  SC.more = {
    title: 'ttl.more',
    render() {
      const S = AD.S, up = S.bookings.filter(b => b.status === 'booked').length, lim = AD.limits();
      const row = (k, ic, extra) => '<li><button type="button" class="ad-card row" data-m="' + k + '"><span class="ad-ico">' + AD.icon(ic, 20) + '</span><span class="grow"><b>' + esc(t('more.' + k)) + '</b><small>' + esc(t('more.' + k + '.d')) + '</small></span>' + (extra || '') + AD.icon('right', 18) + '</button></li>';
      return '<div class="ad-card prof"><span class="ad-avatar" aria-hidden="true">AM</span><span class="grow"><b>' + esc(t('prof.name')) + '</b><small>' + esc(t('prof.sub', { n: S.cars.length })) + '</small></span>' + AD.badge(S.plan.tier === 'plus' ? 'info' : 'ok', t('plan.' + S.plan.tier)) + '</div>' +
        '<ul class="ad-list">' + row('reminders', 'bell', AD.remsDue() ? AD.badge('warn', AD.remsDue()) : '') + row('bookings', 'cal', up ? AD.badge('info', up) : '') + row('plan', 'star') + row('settings', 'user') + row('log', 'log') + '</ul><p class="ad-disc">' + esc(t('more.disc')) + '</p>';
    },
    bind(root) {
      on(root, (e, c) => { const b = c('[data-m]'); if (!b) return; const m = b.getAttribute('data-m'); if (m === 'reminders') { AD.tab('garage'); AD.go('reminders'); } else AD.go(m); });
    }
  };

  /* ---------- settings ---------- */
  SC.settings = {
    title: 'ttl.set',
    render() {
      const s = AD.S.set, L = MFI18N.lang();
      const tg = (k, lab) => '<button type="button" class="ad-check" data-tg="' + k + '" aria-pressed="' + !!s[k] + '"><i>' + (s[k] ? AD.icon('check', 16) : '') + '</i>' + esc(t(lab)) + '</button>';
      return '<h4 class="ad-h2">' + esc(t('set.lang')) + '</h4><div class="ad-seg" role="group" aria-label="' + esc(t('set.lang')) + '">' + ['en', 'ru', 'uk'].map(x => '<button type="button" data-lg="' + x + '" lang="' + x + '" aria-pressed="' + (L === x) + '">' + esc(t('lang.' + x)) + '</button>').join('') + '</div>' +
        '<h4 class="ad-h2">' + esc(t('set.pricing')) + '</h4><div class="ad-two"><div><label class="ad-lab" for="st-reg">' + esc(t('cs.region')) + '</label><select id="st-reg">' + Object.keys(AD.REGIONS).map(r => '<option value="' + r + '"' + (s.region === r ? ' selected' : '') + '>' + esc(t('reg.' + r)) + '</option>').join('') + '</select></div>' +
        '<div><label class="ad-lab" for="st-cls">' + esc(t('cs.cls')) + '</label><select id="st-cls">' + Object.keys(AD.CLASSES).map(r => '<option value="' + r + '"' + (s.cls === r ? ' selected' : '') + '>' + esc(t('cls.' + r)) + '</option>').join('') + '</select></div></div>' +
        '<h4 class="ad-h2">' + esc(t('set.units')) + '</h4><div class="ad-seg" role="group" aria-label="' + esc(t('set.units')) + '">' + ['km', 'mi'].map(u => '<button type="button" data-un="' + u + '" aria-pressed="' + (s.units === u) + '">' + esc(t('unit.' + u)) + '</button>').join('') + '</div>' +
        '<h4 class="ad-h2">' + esc(t('set.notif')) + '</h4><div class="ad-checks">' + tg('nRem', 'set.nRem') + tg('nDiag', 'set.nDiag') + tg('nBook', 'set.nBook') + '</div>' +
        '<h4 class="ad-h2">' + esc(t('set.privacy')) + '</h4><p class="ad-muted">' + esc(t('set.privP')) + '</p><button type="button" class="ad-btn ghost danger wide" data-reset="1">' + esc(t('set.reset')) + '</button>';
    },
    bind(root) {
      const S = AD.S;
      $('st-reg').onchange = e => { S.set.region = e.target.value; AD.log('set', 'lg.set', { what: t('cs.region') + ': ' + t('reg.' + S.set.region) }); AD.renderSide(); };
      $('st-cls').onchange = e => { S.set.cls = e.target.value; AD.log('set', 'lg.set', { what: t('cs.cls') + ': ' + t('cls.' + S.set.cls) }); AD.renderSide(); };
      on(root, (e, c) => {
        let b;
        if ((b = c('[data-lg]'))) { MFI18N.setLang(b.getAttribute('data-lg')); }
        else if ((b = c('[data-un]'))) { S.set.units = b.getAttribute('data-un'); AD.log('set', 'lg.set', { what: t('set.units') + ': ' + t('unit.' + S.set.units) }); AD.render(false); }
        else if ((b = c('[data-tg]'))) { const k = b.getAttribute('data-tg'); S.set[k] = !S.set[k]; AD.log('set', 'lg.set', { what: t('set.' + k) + ': ' + t(S.set[k] ? 'on' : 'off') }); AD.render(false); }
        else if (c('[data-reset]')) AD.confirm(t('set.resetH'), t('set.resetP'), t('set.reset'), () => { AD.reset(); AD.toast(t('set.resetOk')); }, true);
      });
    }
  };

  /* ---------- plan ---------- */
  SC.plan = {
    title: 'ttl.plan',
    render() {
      const S = AD.S, lim = AD.limits(), pl = S.plan, free = pl.tier === 'free';
      const rows = [['plan.r1', '3', '10'], ['plan.r2', '3', t('plan.unl')], ['plan.r3', t('plan.yes'), t('plan.yes')], ['plan.r4', t('plan.yes'), t('plan.yes')], ['plan.r5', t('plan.no'), t('plan.yes')], ['plan.r6', t('plan.std'), t('plan.prio')]];
      return '<div class="ad-card"><div class="ad-row2"><span class="grow"><small class="ad-k">' + esc(t('plan.cur')) + '</small><b class="ad-big">' + esc(t('plan.' + pl.tier)) + '</b></span>' + AD.badge(free ? 'ok' : 'info', t('plan.' + pl.tier)) + '</div>' +
        '<small class="ad-k">' + esc(t('plan.usage')) + '</small><div class="ad-meter" role="img" aria-label="' + esc(t('plan.usage')) + '"><i style="width:' + (free ? Math.min(100, pl.used / lim.diags * 100) : 100) + '%"></i></div><p class="ad-sub">' + esc(free ? t('plan.usedOf', { a: pl.used, b: lim.diags }) : t('plan.usedUnl', { a: pl.used })) + '</p>' +
        '<small class="ad-k">' + esc(t('plan.cars')) + '</small><p class="ad-sub">' + esc(S.cars.length + ' / ' + lim.cars) + '</p></div>' +
        '<table class="ad-tbl cmp"><thead><tr><th></th><th>' + esc(t('plan.free')) + '</th><th>' + esc(t('plan.plus')) + '</th></tr></thead><tbody>' + rows.map(r => '<tr><td>' + esc(t(r[0])) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table>' +
        '<button type="button" class="ad-btn wide" data-sw="1">' + esc(free ? t('plan.up') : t('plan.down')) + '</button><p class="ad-disc">' + esc(t('plan.demo')) + '</p>';
    },
    bind(root) {
      on(root, (e, c) => {
        if (!c('[data-sw]')) return;
        const S = AD.S, to = S.plan.tier === 'free' ? 'plus' : 'free';
        AD.confirm(t('plan.swH'), t('plan.swP', { name: t('plan.' + to) }), t('btn.confirm'), () => {
          S.plan.tier = to; if (to === 'plus') { } else if (S.cars.length > 3) { }
          AD.log('plan', 'lg.plan', { name: t('plan.' + to) }); AD.toast(t('plan.swOk')); AD.render(false);
        });
      });
    }
  };

  /* ---------- activity log ---------- */
  const TYPES = ['all', 'diag', 'car', 'book', 'rem', 'set', 'plan'];
  SC.log = {
    title: 'ttl.log',
    render(p) {
      if (!p.f) p.f = 'all';
      const l = AD.S.log.filter(e => p.f === 'all' || e.type === p.f).sort((a, b) => b.ts - a.ts);
      return chips(TYPES.map(x => [x, t('lgt.' + x)]), p.f, 'f') + (l.length ? '<ul class="ad-timeline">' + l.map(e => '<li><span class="ad-dot ' + e.type + '"></span><span class="grow"><b>' + esc(AD.logText(e)) + '</b><small>' + esc(AD.fmtDate(e.ts, true) + ' · ' + t('lgt.' + e.type)) + '</small></span></li>').join('') + '</ul>' : '<p class="ad-empty">' + esc(t('log.none')) + '</p>');
    },
    bind(root, p) { on(root, (e, c) => { const b = c('[data-f]'); if (b) { p.f = b.getAttribute('data-f'); AD.render(false); } }); }
  };
}());
