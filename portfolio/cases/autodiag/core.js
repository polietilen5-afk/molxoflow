/* Auto Diagnostic demo: engine (analysis, pricing, reminders), router, shell, side panel. */
(function () {
  'use strict';
  const AD = window.AD, t = AD.t, esc = AD.esc, $ = AD.$;
  AD.screens = {};

  /* ---------- icons (simple line pictograms) ---------- */
  const IC = {
    garage: '<path d="M3 9.5 10 4l7 5.5V16H3V9.5Z"/><path d="M6.5 16v-4h7v4M6.5 12.5h7"/>',
    diag: '<circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.8 3.8M9 6.5v5M6.5 9h5"/>',
    codes: '<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M6.5 8.5h7M6.5 11.5h4"/>',
    history: '<path d="M3.5 10a6.5 6.5 0 1 0 2-4.7M3.5 4v3.5H7"/><path d="M10 6.5V10l2.5 1.5"/>',
    more: '<circle cx="5" cy="10" r="1.3"/><circle cx="10" cy="10" r="1.3"/><circle cx="15" cy="10" r="1.3"/>',
    back: '<path d="m12 4-6 6 6 6"/>', plus: '<path d="M10 4v12M4 10h12"/>', x: '<path d="m5 5 10 10M15 5 5 15"/>',
    check: '<path d="m4.5 10.5 3.5 3.5 7.5-8"/>', right: '<path d="m8 4 6 6-6 6"/>',
    cal: '<rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/>',
    bell: '<path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13L5 14Z"/><path d="M8.5 17.5a1.6 1.6 0 0 0 3 0"/>',
    wrench: '<path d="M12.5 3.5a3.8 3.8 0 0 0-3.3 5.3L3.8 14.2a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a3.8 3.8 0 0 0 5.3-3.3l-2.3 2.3-2-.5-.5-2 2.3-2.3Z"/>',
    coin: '<circle cx="10" cy="10" r="6.5"/><path d="M12.3 7.6c-.4-.7-1.2-1.1-2.3-1.1-1.3 0-2.2.6-2.2 1.6 0 2.2 4.6 1 4.6 3.2 0 1-1 1.7-2.4 1.7-1.2 0-2.1-.5-2.5-1.3M10 5v1.5M10 13.5V15"/>',
    user: '<circle cx="10" cy="7" r="3"/><path d="M4 16.5c.6-3 3-4.5 6-4.5s5.4 1.5 6 4.5"/>',
    log: '<path d="M5 3h8l3 3v11H5V3Z"/><path d="M8 9h5M8 12h5M8 15h3"/>',
    star: '<path d="m10 3.5 2 4.2 4.5.6-3.3 3.1.8 4.5L10 13.7 6 15.9l.8-4.5L3.5 8.3 8 7.7l2-4.2Z"/>',
    send: '<path d="M3.5 10 16.5 3.5 13 16.5l-3-5-6.5-1.5Z"/>',
    warn: '<path d="M10 3.5 17 16H3L10 3.5Z"/><path d="M10 8.5v3.3M10 14h.01"/>',
    chat: '<path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2v-6Z"/>',
    car: '<path d="M3 12v-2l1.6-4.2A1.5 1.5 0 0 1 6 5h8a1.5 1.5 0 0 1 1.4.8L17 10v2"/><path d="M3 12h14v3H3z"/><circle cx="6.5" cy="15" r="1.2"/><circle cx="13.5" cy="15" r="1.2"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/>',
    trash: '<path d="M4.5 6h11M8 6V4h4v2M6 6l.7 10h6.6L14 6"/>',
    globe: '<circle cx="10" cy="10" r="6.5"/><path d="M3.5 10h13M10 3.5c2 2 2.6 4.2 2.6 6.5s-.6 4.5-2.6 6.5c-2-2-2.6-4.2-2.6-6.5S8 5.5 10 3.5Z"/>',
    pin: '<path d="M10 17s5-4.4 5-8.5a5 5 0 0 0-10 0C5 12.6 10 17 10 17Z"/><circle cx="10" cy="8.5" r="1.8"/>'
  };
  AD.icon = (n, s) => '<svg viewBox="0 0 20 20" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';

  /* ---------- formatting ---------- */
  AD.fmtDate = (ms, withYear) => {
    try { return new Date(ms).toLocaleDateString(MFI18N.lang(), withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }); } catch (e) { return new Date(ms).toDateString(); }
  };
  AD.fmtDay = ms => { try { return new Date(ms).toLocaleDateString(MFI18N.lang(), { weekday: 'short', day: 'numeric' }); } catch (e) { return String(ms); } };
  AD.num = n => { try { return Math.round(n).toLocaleString(MFI18N.lang()); } catch (e) { return String(Math.round(n)); } };
  AD.cu = n => AD.num(n) + ' ' + t('unit.cu');
  AD.range = r => r[0] === r[1] ? AD.cu(r[0]) : AD.num(r[0]) + ' – ' + AD.num(r[1]) + ' ' + t('unit.cu');
  AD.toU = km => AD.S.set.units === 'mi' ? km * 0.621371 : km;
  AD.fromU = v => AD.S.set.units === 'mi' ? v / 0.621371 : v;
  AD.dist = km => AD.num(AD.toU(km)) + ' ' + t(AD.S.set.units === 'mi' ? 'unit.mi' : 'unit.km');
  AD.car = id => AD.S.cars.filter(c => c.id === id)[0];
  AD.carName = c => c ? c.make + ' ' + c.model : '';
  AD.svc = id => AD.SERVICES.filter(s => s.id === id)[0];
  AD.diag = id => AD.S.diags.filter(d => d.id === id)[0];
  AD.badge = (cls, txt) => '<span class="pf-badge ' + cls + '">' + esc(txt) + '</span>';
  AD.urgBadge = u => AD.badge(u === 'critical' || u === 'high' ? 'bad' : u === 'medium' ? 'warn' : 'ok', t('urg.' + u));
  AD.limits = () => AD.S.plan.tier === 'plus' ? { cars: 10, diags: 999 } : { cars: 3, diags: 3 };

  /* ---------- log ---------- */
  AD.log = (type, k, v) => { AD.S.log.unshift({ ts: Date.now(), type: type, k: k, v: v || {} }); };
  AD.logText = e => {
    const v = {};
    Object.keys(e.v || {}).forEach(key => { const x = e.v[key]; v[key] = x && typeof x === 'object' ? t(x.k) : x; });
    return t(e.k, v);
  };

  /* ---------- analysis ---------- */
  const URG = { low: 0, medium: 1, high: 2, critical: 3 }, URGN = ['low', 'medium', 'high', 'critical'];
  AD.analyze = d => {
    const sc = {}, ids = Object.keys(AD.CAUSES).filter(c => AD.CAUSES[c].cat === d.cat);
    ids.forEach(c => { sc[c] = 0; });
    d.sym.forEach(s => { const w = AD.SYM[s] && AD.SYM[s].w; if (w) Object.keys(w).forEach(c => { if (sc[c] != null) sc[c] += w[c]; }); });
    Object.keys(d.boost || {}).forEach(c => { if (sc[c] != null) sc[c] += d.boost[c]; });
    let sum = 0; ids.forEach(c => { sum += sc[c]; });
    const list = ids.map(c => {
      const share = sum > 0 ? sc[c] / sum : 1 / ids.length;
      const pct = Math.max(6, Math.min(94, Math.round(share * 90 + 4)));
      return { id: c, pct: pct, level: pct >= 60 ? 'high' : pct >= 35 ? 'mid' : 'low' };
    }).sort((a, b) => b.pct - a.pct);
    let u = URG[AD.CAUSES[list[0].id].urg];
    if (d.sym.indexOf('br_soft') >= 0) u = 3;
    if (d.sym.indexOf('eng_heat') >= 0) u = Math.max(u, 2);
    return { causes: list, urg: URGN[u] };
  };
  AD.estimate = (d, cause, o) => {
    const c = AD.CAUSES[cause], car = AD.car(d.carId), cl = AD.CLASSES[o.cls];
    const rate = AD.RATE * AD.TIER[AD.MAKES[car ? car.make : 'Kestrel'] || 'std'] * AD.REGIONS[o.region] * cl.labor;
    const wn = t('cz.' + cause + '.w').split('|'), pn = t('cz.' + cause + '.p').split('|');
    const works = c.w.map((h, i) => ({ n: wn[i] || '', h: h, r: [h * rate * 0.9, h * rate * 1.2] }));
    const parts = c.p.map((p, i) => ({ n: pn[i] || '', r: [p[0] * cl.part, p[1] * cl.part] }));
    const sum = (arr, i) => arr.reduce((a, x) => a + x.r[i], 0);
    const fee = o.fee ? AD.DIAG_FEE * AD.REGIONS[o.region] : 0;
    return { works: works, parts: parts, fee: fee, labor: [sum(works, 0), sum(works, 1)], partsT: [sum(parts, 0), sum(parts, 1)], total: [sum(works, 0) + sum(parts, 0) + fee, sum(works, 1) + sum(parts, 1) + fee], rate: rate };
  };
  AD.remStatus = r => {
    const car = AD.car(r.carId); if (!car) return { st: 'ok', kmLeft: null, daysLeft: null };
    const kmLeft = r.every ? r.lastKm + r.every - car.km : null;
    const daysLeft = r.months ? Math.round((r.lastD + r.months * 30.4 * 86400000 - AD.day0) / 86400000) : null;
    let st = 'ok';
    if ((kmLeft != null && kmLeft < 0) || (daysLeft != null && daysLeft < 0)) st = 'over';
    else if ((kmLeft != null && kmLeft < 1500) || (daysLeft != null && daysLeft < 30)) st = 'soon';
    return { st: st, kmLeft: kmLeft, daysLeft: daysLeft };
  };
  AD.remsDue = () => AD.S.rems.filter(r => AD.remStatus(r).st !== 'ok').length;
  AD.docState = d => { const n = Math.round((d.d - AD.day0) / 86400000); return { n: n, st: n < 0 ? 'bad' : n < 30 ? 'warn' : 'ok' }; };
  AD.makeDiag = () => {
    const S = AD.S, dr = S.draft, d = { id: 'd' + (S.diagSeq++), carId: dr.carId, cat: dr.cat, sym: dr.sym.slice(), boost: JSON.parse(JSON.stringify(dr.boost)), note: dr.note, date: Date.now(), status: 'open', checked: {}, est: null, bookingId: null };
    if (S.plan.tier === 'free') S.plan.used++;
    S.diags.unshift(d);
    const top = AD.analyze(d).causes[0].id, c = AD.car(d.carId);
    AD.log('diag', 'lg.diag', { car: AD.carName(c), cause: { k: 'cz.' + top + '.n' } });
    return d;
  };

  /* ---------- toast and sheet ---------- */
  let toastT = 0;
  AD.toast = msg => {
    const el = $('ad-toast'); if (!el) return;
    el.textContent = msg; el.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(() => { el.hidden = true; }, 2600);
  };
  AD.closeSheet = () => { const s = $('ad-sheet'); if (s) { s.hidden = true; s.innerHTML = ''; } };
  AD.sheet = o => {
    const s = $('ad-sheet');
    s.innerHTML = '<div class="ad-sheet-bg" data-sh="x"></div><div class="ad-sheet-box" role="dialog" aria-modal="true" aria-labelledby="ad-sh-t"><h3 id="ad-sh-t">' + esc(o.title) + '</h3>' +
      (o.body ? '<div class="ad-sh-body">' + o.body + '</div>' : '') +
      '<div class="ad-sh-act">' + (o.actions || []).map((a, i) => '<button type="button" class="ad-btn ' + (a.cls || '') + '" data-sh="' + i + '">' + esc(a.label) + '</button>').join('') + '</div></div>';
    s.hidden = false;
    s.onclick = e => {
      const b = e.target.closest('[data-sh]'); if (!b) return;
      const k = b.getAttribute('data-sh');
      if (k === 'x') { AD.closeSheet(); return; }
      const a = o.actions[+k]; if (a.keep !== true) AD.closeSheet();
      if (a.fn) a.fn();
    };
    const f = s.querySelector('.ad-sh-act .ad-btn'); if (f) f.focus();
  };
  AD.confirm = (title, body, okLabel, fn, danger) => AD.sheet({ title: title, body: '<p>' + esc(body) + '</p>', actions: [{ label: t('btn.cancel'), cls: 'ghost' }, { label: okLabel, cls: danger ? 'danger' : '', fn: fn }] });

  /* ---------- router ---------- */
  const TABROOT = { garage: 'garage', diagnose: 'diag', codes: 'codes', history: 'history', more: 'more' };
  AD.go = (id, params, replace) => {
    const n = AD.S.nav, fr = { id: id, p: params || {} };
    if (replace) n.stack[n.stack.length - 1] = fr; else n.stack.push(fr);
    AD.render(true);
  };
  AD.back = () => { const n = AD.S.nav; if (n.stack.length > 1) n.stack.pop(); AD.render(true); };
  AD.tab = tab => { const n = AD.S.nav; n.tab = tab; n.stack = [{ id: TABROOT[tab], p: {} }]; AD.render(true); };
  AD.openIn = (tab, id, params) => { const n = AD.S.nav; n.tab = tab; n.stack = [{ id: TABROOT[tab], p: id === TABROOT[tab] ? (params || {}) : {} }]; if (id !== TABROOT[tab]) n.stack.push({ id: id, p: params || {} }); AD.render(true); };
  AD.cur = () => { const st = AD.S.nav.stack; return st[st.length - 1]; };

  const TABS = [['garage', 'garage'], ['diagnose', 'diag'], ['codes', 'codes'], ['history', 'history'], ['more', 'more']];
  AD.renderTabs = () => {
    $('ad-tabs').innerHTML = TABS.map(x => {
      const on = AD.S.nav.tab === x[0];
      return '<button type="button" class="ad-tab" data-tab="' + x[0] + '"' + (on ? ' aria-current="page"' : '') + '>' + AD.icon(x[1], 22) + '<span>' + esc(t('tab.' + x[0])) + '</span></button>';
    }).join('');
  };

  AD.render = scroll => {
    const fr = AD.cur(), sc = AD.screens[fr.id], root = $('ad-screen');
    if (!sc) return;
    const st = AD.S.nav.stack, canBack = st.length > 1;
    const right = sc.action ? sc.action(fr.p) : '';
    root.innerHTML = '<header class="ad-head">' + (canBack ? '<button type="button" class="ad-back" data-back="1" aria-label="' + esc(t('btn.back')) + '">' + AD.icon('back') + '</button>' : '') +
      '<h3 class="ad-title">' + esc(t(typeof sc.title === 'function' ? sc.title(fr.p) : sc.title)) + '</h3>' + right + '</header><div class="ad-body" id="ad-body">' + sc.render(fr.p) + '</div>';
    if (sc.bind) sc.bind($('ad-body'), fr.p);
    AD.renderTabs();
    if (scroll) { root.scrollTop = 0; }
    AD.renderSide();
  };

  /* modules used by the side panel and the capability grid */
  AD.MODS = {
    garage: ['garage', 'garage'], diagnose: ['diagnose', 'diag'], chat: ['diagnose', 'chat'], result: ['history', 'result'], cost: ['history', 'cost'],
    codes: ['codes', 'codes'], book: ['more', 'bookings'], history: ['history', 'history'], reminders: ['garage', 'reminders'], profile: ['more', 'settings'],
    plan: ['more', 'plan'], log: ['more', 'log']
  };
  AD.ensureDraft = () => {
    const S = AD.S;
    if (!S.draft) S.draft = { step: 1, carId: S.active, cat: 'brakes', sym: ['br_squeal'], note: '', boost: {}, chat: [], qi: 0, done: false, ready: false };
    return S.draft;
  };
  AD.openModule = m => {
    const S = AD.S, def = AD.MODS[m]; if (!def) return;
    let p = {};
    if (m === 'chat') { const d = AD.ensureDraft(); if (!d.chat.length) d.step = 3; if (!d.sym.length) d.sym = ['br_squeal']; }
    if (m === 'result' || m === 'cost') { const d = S.diags[0]; if (!d) { AD.openIn('diagnose', 'diag'); return; } p = { id: d.id, cause: AD.analyze(d).causes[0].id }; }
    AD.openIn(def[0], def[1], p);
    const r = $('ad-phone'); if (r && r.scrollIntoView && window.innerWidth < 1100) r.scrollIntoView({ block: 'start' });
  };

  /* ---------- side panel ---------- */
  AD.SCN = ['brakes', 'critical', 'code', 'mileage', 'limit'];
  AD.runScenario = k => {
    const S = AD.S;
    S.scenario = k;
    if (k === 'brakes') {
      S.draft = { step: 2, carId: 'c1', cat: 'brakes', sym: ['br_squeal'], note: '', boost: {}, chat: [], qi: 0, done: false, ready: false };
      AD.openIn('diagnose', 'diag');
    } else if (k === 'critical') {
      S.draft = { step: 3, carId: 'c2', cat: 'brakes', sym: ['br_soft', 'br_pull'], note: '', boost: {}, chat: [], qi: 0, done: false, ready: false };
      AD.openIn('diagnose', 'diag');
    } else if (k === 'code') {
      AD.openIn('codes', 'codes', { q: 'P0171' });
    } else if (k === 'mileage') {
      S.active = 'c1';
      AD.openIn('garage', 'car', { id: 'c1', focusKm: true });
    } else if (k === 'limit') {
      S.plan.tier = 'free'; S.plan.used = 3;
      S.draft = null;
      AD.openIn('diagnose', 'diag');
    }
    AD.renderSide();
  };
  AD.renderSide = () => {
    const S = AD.S, cur = AD.cur();
    const live = $('ad-live'); if (!live) return;
    const open = S.diags.filter(d => d.status !== 'fixed').length;
    const up = S.bookings.filter(b => b.status === 'booked').length;
    const rows = [['live.diags', S.diags.length], ['live.open', open], ['live.rems', AD.remsDue()], ['live.book', up], ['live.plan', S.plan.tier === 'free' ? S.plan.used + ' / ' + AD.limits().diags : t('plan.unl')], ['live.log', S.log.length]];
    live.innerHTML = rows.map(r => '<li><span>' + esc(t(r[0])) + '</span><b>' + esc(r[1]) + '</b></li>').join('');
    const mods = $('ad-side-mods');
    mods.innerHTML = Object.keys(AD.MODS).map(m => {
      const def = AD.MODS[m], on = def[1] === cur.id || (m === 'garage' && cur.id === 'car') || (m === 'book' && cur.id === 'book');
      return '<li><button type="button" data-mod="' + m + '"' + (on ? ' aria-current="true"' : '') + '>' + esc(t('mod.' + m)) + '</button></li>';
    }).join('');
    const sc = $('ad-scn');
    sc.innerHTML = AD.SCN.map(k => '<li><button type="button" class="ad-scn-b" data-scn="' + k + '"' + (S.scenario === k ? ' aria-pressed="true"' : '') + '><b>' + esc(t('scn.' + k)) + '</b><span>' + esc(t('scn.' + k + '.d')) + '</span></button></li>').join('');
    const hint = $('ad-scn-hint'); hint.hidden = !S.scenario; if (S.scenario) hint.textContent = t('scn.' + S.scenario + '.h');
  };

  AD.refresh = () => { AD.closeSheet(); AD.render(false); };
  AD.reset = () => { const keepNav = null; AD.seed(); AD.S.scenario = null; AD.render(true); };
}());
