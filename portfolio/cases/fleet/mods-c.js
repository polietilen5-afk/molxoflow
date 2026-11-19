/* Fleet Desk demo modules: notifications, reports, import/export, integrations, access and settings, audit. */
(function () {
  'use strict';
  const FD = window.FD, S = FD.S, t = FD.t, esc = FD.esc, UI = FD.ui;
  const CH = ['messenger', 'team', 'email'];
  const deptOpts = () => S.depts.map(d => [d.id, FD.deptName(d.id)]);
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  /* ================= notifications ================= */
  S.queue = []; let timer = null;
  function pump() {
    clearTimeout(timer); timer = null;
    if (FD.vis === false) { timer = setTimeout(pump, 600); return; }
    if (!S.queue.length) { S.running = false; FD.refresh(); return; }
    const c = S.queue.shift(), e = FD.sendCand(c); e.fresh = true; setTimeout(() => { e.fresh = false; }, 1500);
    FD.refresh();
    timer = setTimeout(pump, window.PF && PF.reduced ? 0 : 600);
  }
  FD.runCheck = auto => {
    if (S.running) return;
    const c = FD.candidates().slice(0, 8); S.lastCheck = new Date();
    FD.audit('check', { n: c.length });
    if (!c.length) { if (!auto) FD.toast(t('n.none')); FD.refresh(); return; }
    S.queue = c; S.running = true; if (!auto) FD.toast(t('n.sent', { n: c.length })); pump();
  };
  function previewEvent(rule, v) {
    const its = FD.items(v), kindOf = { N1: 'ins', N2: 'comp', N3: 'svckm', N4: 'svc', N5: 'insp', N6: 'poa' }[rule];
    const e = { rule, vid: v.id, role: S.rules[rule].role, kind: kindOf || 'x', days: 0, test: false, res: {} };
    if (kindOf) { const it = its.find(i => i.kind === kindOf); if (it) { e.days = it.days; e.left = it.left; } else { e.days = 12; e.left = 800; } }
    if (rule === 'N7') e.pct = Math.max(12, FD.dev(v)); if (rule === 'N8') e.days = Math.max(31, -FD.daysTo(FD.lastOdoDate(v))); if (rule === 'N9') e.rid = 'R-102'; if (rule === 'N10') e.sys = 'fuel';
    if (rule === 'N8') e.days = e.days;
    return e;
  }
  const chIcons = res => Object.keys(res).map(k => `<span class="fd-chi ${res[k]}" title="${esc(t('ch.' + k) + ': ' + t('res.' + res[k]))}">${FD.ico(k, 15)}</span>`).join('');
  function rulesTab() {
    const edit = FD.can('rules.edit'), pend = FD.candidates().length;
    return `<div class="fd-tools"><p class="fd-sub fd-grow">${esc(t('n.sub'))} ${esc(S.lastCheck ? t('n.last', { time: FD.fmtStamp(S.lastCheck) }) : t('n.never'))}</p>${FD.btn('n-run', t('n.run') + (pend ? ' (' + pend + ')' : ''), { perm: 'notif.run', cls: S.running ? 'busy' : '' })}</div>
      ${FD.table(['', t('n.event'), t('n.thr'), t('n.channels'), t('n.to'), t('n.on')], Object.keys(S.rules).map(id => { const r = S.rules[id]; return { cls: r.on ? '' : 'off', cells: [`<strong>${id}</strong>`, esc(t('rule.' + id)), `<input class="fd-num" type="number" data-rule="${id}" data-f="thr" value="${r.thr}" aria-label="${esc(t('n.thr') + ' ' + id)}" ${edit ? '' : 'disabled'}> <span class="fd-muted fd-inl">${esc(t('unit.' + r.unit))}</span>`, `<span class="fd-chgrp">${CH.map(k => `<label class="fd-chk2" title="${esc(t('ch.' + k))}"><input type="checkbox" data-rule="${id}" data-f="ch" data-ch="${k}" ${r.ch[k] ? 'checked' : ''} ${edit ? '' : 'disabled'} aria-label="${esc(t('ch.' + k) + ' ' + id)}"><span>${FD.ico(k, 16)}</span></label>`).join('')}</span>`, `<select data-rule="${id}" data-f="role" aria-label="${esc(t('n.to') + ' ' + id)}" ${edit ? '' : 'disabled'}>${['admin', 'manager', 'mechanic', 'head'].map(k => `<option value="${k}"${r.role === k ? ' selected' : ''}>${esc(t('role.' + k))}</option>`).join('')}</select>`, `<label class="fd-check fd-sw"><input type="checkbox" data-rule="${id}" data-f="on" ${r.on ? 'checked' : ''} ${edit ? '' : 'disabled'} aria-label="${esc(t('n.on') + ' ' + id)}"><span>${esc(r.on ? t('n.enabled') : t('n.disabled'))}</span></label>`], cc: ['', 'c-veh', '', '', '', 'c-act'] }; }))}
      <p class="fd-hint">${esc(edit ? t('n.rulesHint') : t('n.rulesRo'))}</p>`;
  }
  function previewTab() {
    const u = UI.notif, rule = S.rules[u.rule], v = FD.vehicle(u.vid), e = previewEvent(u.rule, v);
    return `<div class="fd-tools">${FD.select('notif.rule', Object.keys(S.rules).map(k => [k, k + ' / ' + t('rule.' + k)]), u.rule, t('n.event'))}${FD.select('notif.vid', S.vehicles.map(x => [x.id, x.plate]), u.vid, t('col.vehicle'))}</div>
      <div class="fd-prev">${CH.filter(k => rule.ch[k]).map(k => `<div class="fd-bubble"><span class="fd-ch">${FD.ico(k, 18)}</span><div><span class="fd-muted">${esc(t('ch.' + k))} / ${esc(t('n.to'))}: ${esc(t('role.' + rule.role))}${FD.chOk(k) ? '' : ' / ' + esc(t('res.failed'))}</span><p>${esc(FD.msgText(e))}</p></div>${FD.btn('n-test', t('n.test'), { ghost: true, data: `data-ch="${k}"`, perm: 'notif.run' })}</div>`).join('') || FD.empty(t('n.noCh'))}</div>
      <p class="fd-hint">${esc(t('n.prevHint'))}</p>`;
  }
  function journalTab() {
    const u = UI.notif, q = u.q.trim().toLowerCase();
    const list = S.feed.slice().sort((a, b) => b.at - a.at).filter(e => (u.fr === 'all' || e.rule === u.fr) && (u.fch === 'all' || e.res[u.fch]) && (u.fst === 'all' || (u.fst === 'failed' ? Object.values(e.res).indexOf('failed') >= 0 : (u.fst === 'test' ? e.test : !e.test && Object.values(e.res).indexOf('failed') < 0))) && (!q || (FD.msgText(e)).toLowerCase().indexOf(q) >= 0));
    return `<div class="fd-tools">${FD.search('notif.q', u.q, t('n.search'), 'nq')}${FD.select('notif.fr', [['all', t('filter.all')]].concat(Object.keys(S.rules).map(k => [k, k])), u.fr, t('n.event'))}${FD.select('notif.fch', [['all', t('filter.all')]].concat(CH.map(k => [k, t('ch.' + k)])), u.fch, t('n.channels'))}${FD.select('notif.fst', [['all', t('filter.all')], ['ok', t('res.sent')], ['failed', t('res.failed')], ['test', t('n.testLbl')]], u.fst, t('col.status'))}</div>
      <p class="fd-count">${esc(t('n.count', { n: list.length }))}</p>
      ${list.length ? FD.table([t('n.time'), t('n.event'), t('n.msg'), t('n.channels'), ''], list.slice(0, 40).map(e => { const failed = Object.values(e.res).indexOf('failed') >= 0; return { cls: (e.fresh && !(window.PF && PF.reduced) ? 'fresh ' : '') + (failed ? 'overdue' : ''), cells: [esc(FD.fmtStamp(e.at)), `<strong>${e.rule}</strong>`, `${esc(FD.msgText(e))}<span class="fd-muted">${esc(t('n.to'))}: ${esc(t('role.' + e.role))}</span>`, chIcons(e.res), failed ? FD.btn('n-retry', t('n.retry'), { ghost: true, data: `data-id="${e.id}"`, perm: 'notif.run' }) : ''], cc: ['', '', 'c-veh', '', 'c-act'] }; })) : FD.empty(t('n.empty'))}`;
  }
  FD.mods.notifications = {
    render() { const u = UI.notif; return `<div class="fd-modhead">${FD.tabs('notif.tab', [['rules', t('n.tabRules')], ['preview', t('n.tabPreview')], ['journal', t('n.tabJournal')]], u.tab, t('mod.notifications'))}</div>${u.tab === 'rules' ? rulesTab() : (u.tab === 'preview' ? previewTab() : journalTab())}`; },
    after(root) {
      root.querySelectorAll('[data-rule]').forEach(el => el.addEventListener('change', () => {
        const id = el.getAttribute('data-rule'), f = el.getAttribute('data-f'), r = S.rules[id];
        if (!FD.can('rules.edit')) return;
        if (f === 'thr') { const n = Number(el.value), lim = { d: [1, 365], km: [100, 10000], '%': [1, 100], x: [1, 1] }[r.unit]; if (!(n >= lim[0] && n <= lim[1])) { FD.toast(t('n.thrErr', { a: lim[0], b: lim[1] })); FD.paint(); return; } r.thr = n; FD.audit('rule', { id, thr: n }); FD.toast(t('n.thrSaved', { id })); }
        else if (f === 'ch') { r.ch[el.getAttribute('data-ch')] = el.checked; FD.audit('ruleCh', { id }); }
        else if (f === 'on') { r.on = el.checked; FD.audit(el.checked ? 'ruleOn' : 'ruleOff', { id }); }
        else if (f === 'role') { r.role = el.value; FD.audit('ruleTo', { id, role: t('role.' + el.value) }); }
        FD.refresh();
      }));
    },
    act(a, el) {
      if (a === 'n-run') FD.runCheck(false);
      else if (a === 'n-test') {
        const k = el.getAttribute('data-ch'), e = { id: FD.nid('m'), at: new Date(), rule: UI.notif.rule, vid: UI.notif.vid, test: true, role: S.rules[UI.notif.rule].role, res: { [k]: FD.chOk(k) ? 'sent' : 'failed' } };
        S.feed.unshift(e); FD.audit('test', { id: e.rule, ch: t('ch.' + k) }); FD.toast(t(FD.chOk(k) ? 'n.testOk' : 'n.testFail', { ch: t('ch.' + k) })); FD.refresh();
      } else if (a === 'n-retry') {
        const e = S.feed.find(x => x.id === el.getAttribute('data-id')); let any = false;
        Object.keys(e.res).forEach(k => { if (e.res[k] === 'failed' && FD.chOk(k)) { e.res[k] = 'sent'; any = true; } });
        FD.toast(t(any ? 'n.retryOk' : 'n.retryFail')); if (any) FD.audit('retry', { id: e.rule }); FD.refresh();
      }
    }
  };

  /* ================= reports ================= */
  const rtitle = r => /^rp\./.test(r.title) ? t(r.title) : r.title;
  function repVehicles() { return FD.scoped().filter(v => UI.reports.dept === 'all' || v.dept === UI.reports.dept); }
  function repBody() {
    const tab = UI.reports.tab, vs = repVehicles(), ids = vs.map(v => v.id);
    if (tab === 'cons') {
      const rows = vs.map(v => ({ v, a: FD.avgCons(v), n: FD.normOf(v), d: FD.dev(v) })).sort((a, b) => b.d - a.d), max = Math.max.apply(null, rows.map(r => Math.max(r.a, r.n))) || 1;
      return `<p class="fd-sub">${esc(t('rp.consHint'))}</p><ul class="fd-bars">${rows.map(r => `<li><span class="fd-bl">${FD.vlink(r.v)}</span><span class="fd-bw"><span class="fd-bar2 ${r.d > S.rules.N7.thr ? 'bad' : 'ok'}"><i style="width:${pct(r.a, max)}%"></i></span><span class="fd-bar2 norm"><i style="width:${pct(r.n, max)}%"></i></span></span><b class="${r.d > S.rules.N7.thr ? 'fd-hi' : ''}">${r.a} / ${r.n}</b></li>`).join('')}</ul><p class="fd-legend"><span class="lg ok"></span>${esc(t('rp.actual'))} <span class="lg norm"></span>${esc(t('rp.norm'))}</p>`;
    }
    if (tab === 'down') {
      const rows = vs.map(v => { const rs = S.repairs.filter(r => r.vid === v.id && r.started); const days = rs.reduce((a, r) => a + Math.max(1, Math.round(((r.closed || new Date()) - r.started) / 864e5)), 0); return { v, days, n: rs.length }; }).filter(r => r.n).sort((a, b) => b.days - a.days), max = Math.max.apply(null, rows.map(r => r.days)) || 1;
      return `<p class="fd-sub">${esc(t('rp.downHint'))}</p>${rows.length ? `<ul class="fd-bars">${rows.map(r => `<li><span class="fd-bl">${FD.vlink(r.v)}</span><span class="fd-bw"><span class="fd-bar2 warn"><i style="width:${pct(r.days, max)}%"></i></span></span><b>${esc(t('rp.days', { n: r.days, r: r.n }))}</b></li>`).join('')}</ul>` : FD.empty(t('empty.h'))}`;
    }
    if (tab === 'cost') {
      const done = S.repairs.filter(r => r.status === 'done' && ids.indexOf(r.vid) >= 0), tot = done.reduce((a, r) => a + r.cost, 0);
      const grp = (key, label) => { const m = {}; done.forEach(r => { const k = key(r); m[k] = (m[k] || 0) + r.cost; }); const arr = Object.keys(m).map(k => [label(k), m[k]]).sort((a, b) => b[1] - a[1]), max = arr.length ? arr[0][1] : 1; return `<ul class="fd-bars">${arr.map(a => `<li><span class="fd-bl">${esc(a[0])}</span><span class="fd-bw"><span class="fd-bar2 ok"><i style="width:${pct(a[1], max)}%"></i></span></span><b>${esc(FD.fmtCu(a[1]))}</b></li>`).join('')}</ul>`; };
      return `<div class="fd-fuelhead"><div><span class="fd-muted">${esc(t('rp.totalCost'))}</span><strong class="fd-big">${esc(FD.fmtCu(tot))}</strong></div><div><span class="fd-muted">${esc(t('rp.count'))}</span><strong class="fd-big">${done.length}</strong></div><div><span class="fd-muted">${esc(t('rp.avg'))}</span><strong class="fd-big">${esc(FD.fmtCu(done.length ? Math.round(tot / done.length) : 0))}</strong></div></div>
        <h4 class="fd-h4">${esc(t('rp.byDept'))}</h4>${grp(r => FD.vehicle(r.vid).dept, k => FD.deptName(k))}<h4 class="fd-h4">${esc(t('rp.byShop'))}</h4>${grp(r => r.shop, k => FD.cpName(k))}<h4 class="fd-h4">${esc(t('rp.byWork'))}</h4>${grp(r => r.title, k => /^rp\./.test(k) ? t(k) : k)}`;
    }
    const kinds = FD.DOC_KINDS, miss = [];
    const rows = kinds.map(k => { let have = 0, scan = 0; vs.forEach(v => { const d = v.docs[k]; if (d) { have++; if (d.scan) scan++; else miss.push({ v, k, why: 'scan' }); } else miss.push({ v, k, why: 'doc' }); }); return { k, have, scan }; });
    return `<ul class="fd-bars">${rows.map(r => `<li><span class="fd-bl">${esc(t('doc.' + r.k))}</span><span class="fd-bw"><span class="fd-bar2 ok"><i style="width:${pct(r.have, vs.length)}%"></i></span><span class="fd-bar2 info"><i style="width:${pct(r.scan, vs.length)}%"></i></span></span><b>${esc(t('rp.cover', { a: r.have, b: vs.length, c: r.scan }))}</b></li>`).join('')}</ul><p class="fd-legend"><span class="lg ok"></span>${esc(t('rp.onFile'))} <span class="lg info"></span>${esc(t('rp.withScan'))}</p>
      <h4 class="fd-h4">${esc(t('rp.missing'))}</h4>${miss.length ? `<ul class="fd-list">${miss.slice(0, 8).map(m => `<li><button type="button" class="fd-ev ${m.why === 'doc' ? 'overdue' : 'soon'}" data-act="open-v" data-id="${m.v.id}"><span class="fd-evb"><strong>${esc(m.v.plate)}</strong><span class="fd-muted">${esc(t('doc.' + m.k))}</span></span>${FD.badge(m.why === 'doc' ? 'overdue' : 'soon', t(m.why === 'doc' ? 'rp.noDoc' : 'docs.noScan'))}</button></li>`).join('')}</ul>` : FD.empty(t('rp.allGood'))}`;
  }
  FD.mods.reports = {
    render() {
      const u = UI.reports;
      return `<div class="fd-modhead">${FD.tabs('reports.tab', [['cons', t('rp.tabCons')], ['down', t('rp.tabDown')], ['cost', t('rp.tabCost')], ['comp', t('rp.tabComp')]], u.tab, t('mod.reports'))}</div>
      <div class="fd-tools">${FD.select('reports.dept', [['all', t('filter.all')]].concat(deptOpts().filter(d => FD.scoped().some(v => v.dept === d[0]))), u.dept, t('col.dept'))}<span class="fd-grow"></span>${FD.btn('rp-export', t('rp.export'), { ghost: true, icon: 'download', perm: 'export' })}</div>${repBody()}`;
    },
    act(a) { if (a === 'rp-export') { FD.audit('export', { n: repVehicles().length }); S.xlog.unshift({ at: new Date(), sys: 'sheet', n: repVehicles().length, ok: true, who: FD.me(), out: true }); FD.toast(t('x.toast', { n: repVehicles().length })); } }
  };

  /* ================= import / export ================= */
  const SAMPLE = [
    { plate: 'AB 2101 XX', vin: 'FD1A2B3C4D5E6F7G8', model: 'Cargo V3', type: 'van', dept: 'dispatch', odo: 12000 },
    { plate: 'AB 2102 XX', vin: 'FD9H8J7K6L5M4N3P2', model: 'Ridgeback P4', type: 'pickup', dept: 'field', odo: 31800 },
    { plate: 'AB 2103 XX', vin: '', model: 'Metro S', type: 'sedan', dept: 'sales', odo: 8400 },
    { plate: 'AB 2104 XX', vin: 'FD1234IO56789QXYZ', model: 'Haul T7', type: 'truck', dept: 'warehouse', odo: 96500 },
    { plate: 'AB 0101 XX', vin: 'FD0000AAAA1111BBB', model: 'Ridgeback P4', type: 'pickup', dept: 'field', odo: 84210 },
    { plate: 'AB 2106 XX', vin: 'FD5R6S7T8U9V0W1X2', model: 'Cargo V2', type: 'van', dept: 'dispatch', odo: 54000, date: '31/31/2026' },
    { plate: 'AB 21 XX', vin: 'FD3Y4Z5A6B7C8D9E0', model: 'Metro S', type: 'sedan', dept: 'sales', odo: 1000 },
    { plate: 'AB 2108 XX', vin: 'FD7F8G9H0J1K2L3M4', model: 'Haul T9', type: 'truck', dept: 'garage5', odo: 70200 }
  ];
  function checkRows() {
    return SAMPLE.map((r, i) => {
      let st = 'ok', msg = 'imp.ok';
      if (!/^[A-Z]{2} \d{4} [A-Z]{2}$/.test(r.plate)) { st = 'error'; msg = 'imp.badPlate'; }
      else if (S.vehicles.some(v => v.plate === r.plate)) { st = 'error'; msg = 'imp.dupPlate'; }
      else if (!S.depts.some(d => d.id === r.dept)) { st = 'error'; msg = 'imp.badDept'; }
      else if (!r.vin) { st = 'warn'; msg = 'imp.noVin'; }
      else if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(r.vin)) { st = 'warn'; msg = 'imp.badVin'; }
      else if (S.vehicles.some(v => v.vin === r.vin)) { st = 'warn'; msg = 'imp.dupVin'; }
      else if (r.date) { st = 'warn'; msg = 'imp.badDate'; }
      return { i: i + 1, r, st, msg };
    });
  }
  function importTab() {
    const rows = S.imp.rows, ok = rows.filter(x => x.st === 'ok').length, w = rows.filter(x => x.st === 'warn').length, er = rows.filter(x => x.st === 'error').length;
    return `<div class="fd-pane"><div class="fd-fuelhead"><div><span class="fd-muted">${esc(t('imp.file'))}</span><strong class="fd-mono">fleet_2026_sample.xlsx</strong><span class="fd-muted">${esc(t('imp.fileNote', { n: SAMPLE.length }))}</span></div></div>
      <div class="fd-actions">${FD.btn('imp-check', t('imp.check'), { perm: 'import' })}${FD.btn('imp-apply', t('imp.apply'), { perm: 'import', cls: S.imp.stage === 'checked' && ok + w ? '' : 'dim', data: S.imp.stage === 'checked' && ok + w ? '' : 'disabled aria-disabled="true"' })}</div></div>
      ${S.imp.stage === 'idle' ? `<p class="fd-hint">${esc(t('imp.hint'))}</p>` : `<div class="fd-kpis fd-kpis3">${FD.kpi('', 'tabindex="-1"', ok, t('imp.sumOk'), 'ok')}${FD.kpi('', 'tabindex="-1"', w, t('imp.sumWarn'), 'warn')}${FD.kpi('', 'tabindex="-1"', er, t('imp.sumErr'), 'bad')}</div>
      ${FD.table(['#', t('f.plate'), t('f.model'), t('col.status'), t('imp.problem')], rows.map(x => ({ cls: x.st === 'error' ? 'overdue' : (x.st === 'warn' ? 'soon' : ''), cells: [x.i, `<span class="fd-mono">${esc(x.r.plate)}</span>`, esc(x.r.model), FD.badge(x.st === 'ok' ? 'ok' : (x.st === 'warn' ? 'warn' : 'bad'), t('imp.st.' + x.st)), esc(t(x.msg))], cc: ['', 'c-veh', '', 'c-status', ''] })))}
      ${S.imp.stage === 'applied' ? `<p class="fd-okmsg">${esc(t('imp.done', { n: S.imp.added }))} <button type="button" class="btn btn-sm btn-ghost" data-act="goto" data-mod="vehicles">${esc(t('mod.vehicles'))}</button></p>` : ''}`}`;
  }
  function exportTab() {
    const e = UI.exp, n = { veh: S.vehicles.length, doc: S.vehicles.reduce((a, v) => a + Object.keys(v.docs).filter(k => v.docs[k]).length, 0), svc: S.vehicles.reduce((a, v) => a + v.svcLog.length, 0), fuel: S.fuel.length, rep: S.repairs.length };
    return `<div class="fd-pane"><p class="fd-sub">${esc(t('exp.hint'))}</p><div class="fd-checks">${['veh', 'doc', 'svc', 'fuel', 'rep'].map(k => `<label class="fd-check"><input type="checkbox" data-set="exp.${k}" ${e[k] ? 'checked' : ''}><span>${esc(t('exp.' + k, { n: n[k] }))}</span></label>`).join('')}</div>
      <div class="fd-actions fd-mt">${FD.btn('exp-run', t('exp.run'), { icon: 'download', perm: 'export' })}${FD.btn('exp-tpl', t('exp.tpl'), { ghost: true })}</div></div>
      <h4 class="fd-h4">${esc(t('exp.recent'))}</h4>${xlogTable(S.xlog.filter(x => x.sys === 'sheet'))}`;
  }
  UI.exp = { veh: true, doc: true, svc: false, fuel: false, rep: false }; UI.imp = { tab: 'imp' };
  FD.mods.import = {
    render() { return `<div class="fd-modhead">${FD.tabs('imp.tab', [['imp', t('imp.tabImport')], ['exp', t('imp.tabExport')]], UI.imp.tab, t('mod.import'))}</div>${UI.imp.tab === 'imp' ? importTab() : exportTab()}`; },
    act(a) {
      if (a === 'imp-check') { S.imp.rows = checkRows(); S.imp.stage = 'checked'; FD.audit('impCheck', { n: SAMPLE.length }); FD.paint(); }
      else if (a === 'imp-apply') {
        const good = S.imp.rows.filter(x => x.st !== 'error'); let n = 0;
        good.forEach(x => { const r = x.r, hasVin = x.msg === 'imp.ok' || x.msg === 'imp.badDate'; const nv = { id: FD.nid('v'), plate: r.plate, model: r.model, type: r.type, dept: r.dept, driver: null, year: 2022, odo: r.odo, vin: hasVin ? r.vin : '', color: 'white', fuel: 'diesel', vol: 2.0, power: 100, gear: 'manual', company: 'c1', reg: 'RC ' + (300000 + S.seq), state: 'active', card: null, normS: 10, normW: 10.8, svc: { date: FD.addDays(FD.today, 150), km: r.odo + 15000 }, docs: { ins: null, comp: null, insp: null, poa: null }, svcLog: [], odoLog: [{ date: FD.today, km: r.odo }] }; S.vehicles.push(nv); FD.audit('vadd', { plate: r.plate }, nv.id); n++; });
        S.imp.added = n; S.imp.stage = 'applied'; FD.audit('import', { n }); S.xlog.unshift({ at: new Date(), sys: 'sheet', n, ok: true, who: FD.me() }); FD.toast(t('imp.done', { n })); FD.refresh();
      } else if (a === 'exp-run') { const e = UI.exp, c = (e.veh ? S.vehicles.length : 0) + (e.doc ? 1 : 0); if (!Object.keys(e).some(k => e[k])) { FD.toast(t('exp.none')); return; } const n = S.vehicles.length; FD.audit('export', { n }); S.xlog.unshift({ at: new Date(), sys: 'sheet', n, ok: true, who: FD.me(), out: true }); FD.toast(t('x.toast', { n })); FD.paint(); }
      else if (a === 'exp-tpl') FD.toast(t('exp.tplToast'));
    }
  };

  /* ================= integrations ================= */
  function xlogTable(list) {
    return list.length ? FD.table([t('n.time'), t('int.sys'), t('int.dir'), t('int.rows'), t('col.status'), t('int.by')], list.slice(0, 10).map(x => ({ cells: [esc(FD.fmtStamp(x.at)), esc(t('sys.' + x.sys)), esc(t(x.out ? 'int.out' : 'int.in')), x.n, FD.badge(x.ok ? 'ok' : 'bad', x.ok ? t('res.sent') : t('res.failed')), esc(x.who === 'job' ? t('int.job') : x.who)] }))) : FD.empty(t('empty.h'));
  }
  FD.mods.integrations = {
    render() {
      const I = S.integ, fuelErr = I.fuel.status === 'error', subs = S.people.filter(p => p.active && p.msgr).length;
      const card = (k, name, state, body, acts) => `<section class="fd-pane fd-int"><div class="fd-dhead"><h3 class="fd-h3">${FD.ico(k, 18)} ${esc(name)}</h3>${state}</div>${body}<div class="fd-actions">${acts}</div></section>`;
      return `<div class="fd-grid2">
        ${card('fuel', t('int.fuel'), FD.badge(fuelErr ? 'bad' : 'ok', fuelErr ? t('int.error') : t('int.ok')), `<p class="fd-sub">${esc(t('int.fuelNote'))}</p><p class="fd-muted">${esc(t('int.last', { time: FD.fmtStamp(I.fuel.last) }))}</p>`, FD.btn('int-sync', t('int.sync'), { perm: 'integ' }) + FD.btn('int-outage', fuelErr ? t('int.restore') : t('int.outage'), { ghost: true, perm: 'integ' }))}
        ${card('messenger', t('int.messenger'), FD.badge(I.messenger.on ? 'ok' : 'bad', I.messenger.on ? t('int.connected') : t('int.disconnected')), `<p class="fd-sub">${esc(t('int.msgrNote', { n: subs }))}</p>`, FD.btn('int-tog', I.messenger.on ? t('int.disconnect') : t('int.connect'), { ghost: true, data: 'data-k="messenger"', perm: 'integ' }))}
        ${card('team', t('int.team'), FD.badge(I.team.on ? 'ok' : 'bad', I.team.on ? t('int.connected') : t('int.disconnected')), `<p class="fd-sub">${esc(t('int.teamNote'))}</p>`, FD.btn('int-tog', I.team.on ? t('int.disconnect') : t('int.connect'), { ghost: true, data: 'data-k="team"', perm: 'integ' }))}
        ${card('email', t('int.mail'), FD.badge(I.mail.on ? 'ok' : 'bad', I.mail.on ? t('int.connected') : t('int.disconnected')), `<p class="fd-sub">${esc(t('int.mailNote'))}</p>`, FD.btn('int-tog', I.mail.on ? t('int.disconnect') : t('int.connect'), { ghost: true, data: 'data-k="mail"', perm: 'integ' }))}
        ${card('file', t('int.backup'), FD.badge(I.backup.ok ? 'ok' : 'bad', I.backup.ok ? t('int.ok') : t('int.error')), `<p class="fd-sub">${esc(t('int.backupNote'))}</p><p class="fd-muted">${esc(t('int.last', { time: FD.fmtStamp(I.backup.last) }))}</p>`, FD.btn('int-backup', t('int.backupRun'), { ghost: true, perm: 'integ' }))}
      </div><h4 class="fd-h4">${esc(t('int.journal'))}</h4>${xlogTable(S.xlog)}<p class="fd-hint">${esc(t('int.linkHint'))}</p>`;
    },
    act(a, el) {
      const I = S.integ;
      if (a === 'int-tog') { const k = el.getAttribute('data-k'); I[k].on = !I[k].on; FD.audit('chan', { ch: t('int.' + k), state: t(I[k].on ? 'int.connected' : 'int.disconnected') }); FD.toast(t(I[k].on ? 'int.connectedToast' : 'int.disconnectedToast')); FD.refresh(); }
      else if (a === 'int-outage') { I.fuel.status = I.fuel.status === 'error' ? 'ok' : 'error'; FD.audit('outage', { state: t(I.fuel.status === 'ok' ? 'int.ok' : 'int.error') }); FD.toast(t(I.fuel.status === 'ok' ? 'int.restoredToast' : 'int.outageToast')); FD.refresh(); }
      else if (a === 'int-sync') {
        if (I.fuel.status === 'error') { S.xlog.unshift({ at: new Date(), sys: 'fuel', n: 0, ok: false, who: FD.me() }); FD.audit('syncFail', {}); FD.toast(t('int.syncFail')); FD.refresh(); return; }
        const pool = S.vehicles.filter(v => v.card), add = 2 + (S.seq % 2); let n = 0;
        for (let i = 0; i < add; i++) { const v = pool[(S.seq + i * 5) % pool.length], prev = S.fuel.filter(f => f.vid === v.id)[0] || { odo: v.odo - 300 }, gap = 380 + i * 60, cons = Math.round(FD.normOf(v) * (0.95 + i * 0.03) * 10) / 10; S.fuel.unshift({ id: FD.nid('f'), vid: v.id, date: new Date(), station: 'Station ' + (11 + i * 7), litres: Math.round(gap * cons / 100), odo: prev.odo + gap, cons, card: v.card }); if (prev.odo + gap > v.odo) { v.odo = prev.odo + gap; v.odoLog.push({ date: new Date(), km: v.odo }); } n++; S.seq++; }
        I.fuel.last = new Date(); S.xlog.unshift({ at: new Date(), sys: 'fuel', n, ok: true, who: FD.me() }); FD.audit('sync', { n }); FD.toast(t('int.synced', { n })); FD.refresh();
      } else if (a === 'int-backup') { I.backup.last = new Date(); I.backup.ok = true; S.xlog.unshift({ at: new Date(), sys: 'backup', n: 1, ok: true, who: FD.me() }); FD.audit('backup', {}); FD.toast(t('int.backupOk')); FD.refresh(); }
    }
  };

  /* ================= access and settings ================= */
  const ACT_LIST = ['vehicle.add', 'vehicle.edit', 'doc.edit', 'mileage', 'repair.create', 'repair.approve', 'repair.work', 'fuel.add', 'card.manage', 'dir.edit', 'rules.edit', 'notif.run', 'export', 'import', 'settings'];
  function accessBody() {
    const tab = UI.access.tab, adm = FD.can('settings');
    if (tab === 'users') {
      const users = S.people.filter(p => p.active && p.role !== 'driver');
      return `<p class="fd-sub">${esc(t('acc.usersHint'))}</p>${FD.table([t('dir.name'), t('acc.email'), t('acc.role'), t('acc.scope')], users.map(p => ({ cells: [`<strong>${esc(p.name)}</strong>`, `<span class="fd-mono">${esc(p.name.toLowerCase().replace(/[^a-z]/g, ''))}@northline.example</span>`, `<select data-user="${p.id}" aria-label="${esc(t('acc.role') + ' ' + p.name)}" ${adm ? '' : 'disabled'}>${['admin', 'manager', 'mechanic', 'head'].map(k => `<option value="${k}"${p.role === k ? ' selected' : ''}>${esc(t('role.' + k))}</option>`).join('')}</select>`, esc(p.role === 'head' ? FD.deptName(p.dept) : t('acc.allDepts'))], cc: ['c-veh', '', '', ''] })))}`;
    }
    if (tab === 'roles') {
      const cur = S.role, mark = (list, r) => list.indexOf(r) >= 0 ? `<span class="fd-yes">${FD.ico('check', 16)}<span class="sr">${esc(t('acc.yes'))}</span></span>` : `<span class="fd-no">-<span class="sr">${esc(t('acc.no'))}</span></span>`;
      const head = [t('acc.right')].concat(FD.ROLES.map(r => t('role.' + r)));
      const rows = FD.ORDER.map(m => ({ cells: [esc(t('acc.open', { m: t('mod.' + m) }))].concat(FD.ROLES.map(r => mark(FD.MODS[m], r))), cc: ['c-veh'] })).concat(ACT_LIST.map(a => ({ cells: [esc(t('act.' + a))].concat(FD.ROLES.map(r => mark(FD.ACTS[a], r))), cc: ['c-veh'] })));
      return `<p class="fd-sub">${esc(t('acc.rolesHint', { r: t('role.' + cur) }))}</p>${FD.table(head, rows)}<p class="fd-hint">${esc(t('acc.headScope'))}</p>`;
    }
    const st = S.settings;
    return `<div class="fd-pane fd-setts"><label class="fd-lbl"><span>${esc(t('set.hour'))}</span><select data-st="hour" ${adm ? '' : 'disabled'}>${[6, 7, 8, 9, 10].map(h => `<option value="${h}"${st.hour === h ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></label>
      <label class="fd-check"><input type="checkbox" data-st="protect" ${st.protect ? 'checked' : ''} ${adm ? '' : 'disabled'}><span>${esc(t('set.protect'))}</span></label>
      <label class="fd-check"><input type="checkbox" data-st="merge" ${st.merge ? 'checked' : ''} ${adm ? '' : 'disabled'}><span>${esc(t('set.merge'))}</span></label>
      <label class="fd-check"><input type="checkbox" checked disabled><span>${esc(t('set.once'))}</span></label>
      <p class="fd-hint">${esc(t('set.hint'))}</p><button type="button" class="btn btn-sm btn-ghost" data-act="goto" data-mod="notifications">${esc(t('set.thrLink'))}</button></div>`;
  }
  FD.mods.access = {
    render() { return `<div class="fd-modhead">${FD.tabs('access.tab', [['users', t('acc.tabUsers')], ['roles', t('acc.tabRoles')], ['set', t('acc.tabSet')]], UI.access.tab, t('mod.access'))}</div>${accessBody()}`; },
    after(root) {
      root.querySelectorAll('[data-user]').forEach(el => el.addEventListener('change', () => { const p = FD.person(el.getAttribute('data-user')); if (!FD.can('settings')) return; p.role = el.value; FD.audit('role', { name: p.name, role: t('role.' + el.value) }); FD.toast(t('acc.roleSaved')); FD.refresh(); }));
      root.querySelectorAll('[data-st]').forEach(el => el.addEventListener('change', () => { if (!FD.can('settings')) return; const k = el.getAttribute('data-st'); S.settings[k] = el.type === 'checkbox' ? el.checked : Number(el.value); FD.audit('setting', { k: t('set.' + k) }); FD.toast(t('set.saved')); FD.refresh(); }));
    }
  };

  /* ================= audit ================= */
  FD.mods.audit = {
    render() {
      const u = UI.audit, q = u.q.trim().toLowerCase(), whos = Array.from(new Set(S.audit.map(a => a.who)));
      const grp = k => /^(doc|docAdd|scanAdd|scanRm)$/.test(k) ? 'docs' : /^(rep|part)/.test(k) ? 'rep' : /^(rule|test|check|retry|chan|outage|sync|backup)/.test(k) ? 'sys' : /^(card|fuel|norm)/.test(k) ? 'fuel' : /^(dir|dismiss|reinstate|role|setting)/.test(k) ? 'adm' : 'veh';
      const list = S.audit.filter(a => (u.who === 'all' || a.who === u.who) && (u.ent === 'all' || grp(a.key) === u.ent) && (!q || FD.auditText(a).toLowerCase().indexOf(q) >= 0));
      return `<div class="fd-tools">${FD.search('audit.q', u.q, t('aud.search'), 'aq')}${FD.select('audit.who', [['all', t('filter.all')]].concat(whos.map(w => [w, w])), u.who, t('aud.who'))}${FD.select('audit.ent', [['all', t('filter.all')]].concat(['veh', 'docs', 'rep', 'fuel', 'sys', 'adm'].map(k => [k, t('aud.g.' + k)])), u.ent, t('aud.ent'))}</div>
      <p class="fd-count">${esc(t('aud.count', { n: list.length }))}</p><p class="fd-hint">${esc(t('aud.note'))}</p>
      ${list.length ? FD.table([t('n.time'), t('aud.who'), t('acc.role'), t('aud.what'), ''], list.slice(0, 60).map(a => ({ cells: [esc(FD.fmtDate(a.at) + ', ' + FD.fmtTime(a.at)), esc(a.who), esc(t('role.' + a.role)), esc(FD.auditText(a)), a.vid && FD.vehicle(a.vid) ? FD.vlink(FD.vehicle(a.vid)) : ''], cc: ['', '', '', 'c-veh', ''] }))) : FD.empty(t('empty.h'), t('empty.p'))}`;
    }
  };
}());
