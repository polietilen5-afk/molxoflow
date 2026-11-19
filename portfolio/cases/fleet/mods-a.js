/* Fleet Desk demo modules: overview, vehicles (with card), deadlines. */
(function () {
  'use strict';
  const FD = window.FD, S = FD.S, t = FD.t, esc = FD.esc, UI = FD.ui;
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parseIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 9) : null; };
  FD.iso = iso; FD.parseIso = parseIso;
  FD.auditText = e => {
    const v = Object.assign({}, e.vars);
    if (v.doc) v.doc = t('doc.' + v.doc);
    if (v.what) v.what = FD.cpName(v.what);
    if (v.sys) v.sys = t('sys.' + v.sys);
    if (v.state && e.key === 'vstate') v.state = t('vstate.' + v.state);
    return t('a.' + e.key, v);
  };
  const drivers = freeFor => S.people.filter(p => p.role === 'driver' && p.active && (!S.vehicles.some(v => v.driver === p.id && v.id !== freeFor)));
  const deptOpts = () => S.depts.map(d => [d.id, FD.deptName(d.id)]);
  const vstate = v => v.state === 'active' ? null : FD.badge(v.state === 'repair' ? 'warn' : 'info', t('vstate.' + v.state));

  /* ================= overview ================= */
  FD.mods.overview = {
    render() {
      const vs = FD.scoped(), sums = vs.map(v => ({ v, s: FD.sum(v) }));
      const c = { all: vs.length, overdue: 0, soon: 0, repair: 0, svc: 0, active: 0 };
      sums.forEach(x => { c[x.s.state] !== undefined && c[x.s.state]++; if (x.v.state === 'repair') c.repair++; if (x.v.state === 'active') c.active++; if (x.s.items.some(i => (i.kind === 'svc' || i.kind === 'svckm') && i.state !== 'ok')) c.svc++; });
      const docsDue = sums.filter(x => x.s.items.some(i => !i.km && i.kind !== 'svc' && i.state !== 'ok')).length;
      const kp = [['ov-f', 'st=all', c.all, 'ov.total', 'info'], ['ov-f', 'state=active', c.active, 'ov.active', 'ok'], ['ov-f', 'state=repair', c.repair, 'ov.repair', 'warn'], ['ov-f', 'st=overdue', c.overdue, 'ov.overdue', 'bad'], ['ov-f', 'st=soon', c.soon, 'ov.soon', 'warn'], ['ov-svc', '', c.svc, 'ov.svc', 'warn']];
      const depts = S.depts.filter(d => FD.scoped().some(v => v.dept === d.id)).map(d => {
        const g = sums.filter(x => x.v.dept === d.id), n = st => g.filter(x => x.s.state === st).length;
        return { cells: [`<button type="button" class="fd-open" data-act="ov-d" data-id="${d.id}"><span class="fd-model">${esc(FD.deptName(d.id))}</span><span class="fd-plate">${esc(FD.pname(d.head))}</span></button>`, g.length, n('overdue') ? FD.badge('overdue', n('overdue')) : '0', n('soon') ? FD.badge('soon', n('soon')) : '0', g.filter(x => x.v.state === 'repair').length] };
      });
      const due = [];
      sums.forEach(x => x.s.items.forEach(i => { if (i.state !== 'ok' && !i.km) due.push({ v: x.v, i }); }));
      due.sort((a, b) => a.i.days - b.i.days);
      const rep = S.repairs.filter(r => ['requested', 'approved', 'inwork'].indexOf(r.status) >= 0);
      const rc = s => S.repairs.filter(r => r.status === s).length;
      const rec = S.audit.filter(a => !a.vid || vs.some(v => v.id === a.vid)).slice(0, 6);
      return `<div class="fd-kpis">${kp.map(k => FD.kpi(k[0], `data-ui="${k[1]}"`, k[2], t(k[3]), k[4])).join('')}</div>
      <div class="fd-grid2">
        <section class="fd-pane"><h3 class="fd-h3">${esc(t('ov.byDept'))}</h3>${FD.table([t('col.dept'), t('ov.veh'), t('status.overdue'), t('status.soon'), t('vstate.repair')], depts)}</section>
        <section class="fd-pane"><h3 class="fd-h3">${esc(t('ov.nearest'))}</h3>${due.length ? `<ul class="fd-list">${due.slice(0, 7).map(x => `<li><button type="button" class="fd-ev ${x.i.state}" data-act="open-v" data-id="${x.v.id}"><span class="fd-evb"><strong>${esc(x.v.plate)}</strong><span class="fd-muted">${esc(x.v.model)} / ${esc(t('doc.' + x.i.kind))}</span></span>${FD.badge(x.i.state, FD.dayText(x.i.days))}</button></li>`).join('')}</ul>` : FD.empty(t('ov.none'))}
          <button type="button" class="btn btn-sm btn-ghost fd-more" data-act="goto" data-mod="deadlines">${esc(t('ov.allDeadlines'))}</button></section>
      </div>
      <div class="fd-grid2">
        ${FD.modVisible('repairs') ? `<section class="fd-pane"><h3 class="fd-h3">${esc(t('mod.repairs'))}</h3><p class="fd-sub">${esc(t('ov.repSum', { a: rc('requested'), b: rc('approved'), c: rc('inwork') }))}</p><ul class="fd-list">${rep.slice(0, 4).map(r => { const v = FD.vehicle(r.vid); return `<li><button type="button" class="fd-ev" data-act="goto" data-mod="repairs" data-ui="repairs.open=${r.id}"><span class="fd-evb"><strong>${esc(r.id)} / ${esc(v.plate)}</strong><span class="fd-muted">${esc(t(r.title))}</span></span>${FD.badge(r.status === 'inwork' ? 'info' : (r.status === 'requested' ? 'warn' : 'ok'), t('rst.' + r.status))}</button></li>`; }).join('')}</ul></section>` : `<section class="fd-pane"><h3 class="fd-h3">${esc(t('ov.docsTitle'))}</h3><p class="fd-sub">${esc(t('ov.docsDue', { n: docsDue }))}</p></section>`}
        <section class="fd-pane"><h3 class="fd-h3">${esc(t('ov.recent'))}</h3><ul class="fd-hist">${rec.map(a => `<li><span class="fd-dot"></span><div><strong>${esc(FD.auditText(a))}</strong><span class="fd-muted">${esc(a.who)} / ${esc(FD.fmtStamp(a.at))}</span></div></li>`).join('')}</ul></section>
      </div>`;
    },
    act(a, el) {
      if (a === 'ov-f') { UI.vehicles.st = 'all'; UI.vehicles.state = 'all'; UI.vehicles.dept = 'all'; UI.vehicles.q = ''; const [p, v] = el.getAttribute('data-ui').split('='); UI.vehicles[p] = v; FD.go('vehicles', () => { S.sel = null; }); }
      if (a === 'ov-d') { UI.vehicles.st = 'all'; UI.vehicles.state = 'all'; UI.vehicles.q = ''; UI.vehicles.dept = el.getAttribute('data-id'); FD.go('vehicles', () => { S.sel = null; }); }
      if (a === 'ov-svc') { UI.deadlines.tab = 'list'; UI.deadlines.type = 'svc'; UI.deadlines.st = 'all'; UI.deadlines.dept = 'all'; FD.go('deadlines'); }
    }
  };

  /* ================= vehicles ================= */
  function filtered() {
    const u = UI.vehicles, q = u.q.trim().toLowerCase();
    const list = FD.scoped().map(v => ({ v, s: FD.sum(v) })).filter(x => {
      if (u.st !== 'all' && x.s.state !== u.st) return false;
      if (u.dept !== 'all' && x.v.dept !== u.dept) return false;
      if (u.state !== 'all' && x.v.state !== u.state) return false;
      if (!q) return true;
      return [x.v.plate, x.v.model, x.v.vin, FD.pname(x.v.driver), t('type.' + x.v.type), FD.deptName(x.v.dept)].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    list.sort((a, b) => {
      if (u.sort === 'odo') return b.v.odo - a.v.odo;
      if (u.sort === 'plate') return a.v.plate < b.v.plate ? -1 : 1;
      if (u.sort === 'deadline') return a.s.next.days - b.s.next.days;
      return (FD.RANK[a.s.state] - FD.RANK[b.s.state]) || (a.s.next.days - b.s.next.days);
    });
    return list;
  }
  function vList() {
    const u = UI.vehicles, list = filtered(), cnt = {};
    FD.scoped().forEach(v => { const s = FD.sum(v).state; cnt[s] = (cnt[s] || 0) + 1; });
    const rows = list.map(x => ({
      cls: x.s.state, attr: `data-act="open-v" data-id="${x.v.id}"`,
      cells: [FD.vlink(x.v) + (vstate(x.v) || ''), FD.badge(x.s.state), esc(t('type.' + x.v.type)), esc(FD.deptName(x.v.dept)), esc(FD.pname(x.v.driver)), `<span class="fd-nx">${esc(t('doc.' + x.s.next.kind))}</span><span class="fd-d ${x.s.next.state}">${esc(FD.itemText(x.s.next))}</span>`, esc(FD.fmtKm(x.v.odo))],
      cc: ['c-veh', 'c-status', '', '', '', 'c-next', 'c-odo']
    }));
    return `<div class="fd-tools">${FD.search('vehicles.q', u.q, t('search.ph'), 'vq')}
      ${FD.select('vehicles.dept', [['all', t('filter.all')]].concat(deptOpts()), u.dept, t('col.dept'))}
      ${FD.select('vehicles.state', [['all', t('filter.all')], ['active', t('vstate.active')], ['repair', t('vstate.repair')], ['off', t('vstate.off')]], u.state, t('vf.state'))}
      ${FD.select('vehicles.sort', [['urgency', t('sort.urgency')], ['deadline', t('sort.deadline')], ['odo', t('sort.odo')], ['plate', t('sort.plate')]], u.sort, t('sort.label'))}</div>
    <div class="fd-tools fd-tools2">${FD.chips('vehicles.st', [['all', t('filter.all')], ['overdue', t('filter.overdue') + ' ' + (cnt.overdue || 0)], ['soon', t('filter.soon') + ' ' + (cnt.soon || 0)], ['ok', t('filter.ok') + ' ' + (cnt.ok || 0)]], u.st, `aria-label="${esc(t('filter.label'))}"`)}
      <span class="fd-grow"></span>${FD.btn('v-export', t('x.btn'), { ghost: true, icon: 'download', perm: 'export' })}${FD.btn('v-add', t('v.add'), { icon: 'plus', perm: 'vehicle.add' })}</div>
    <p class="fd-count" aria-live="polite">${esc(t('count', { n: list.length, m: FD.scoped().length }))}</p>
    ${rows.length ? FD.table([t('col.vehicle'), t('col.status'), t('col.type'), t('col.dept'), t('col.driver'), t('col.next'), t('col.odo')], rows) : FD.empty(t('empty.h'), t('empty.p')) + `<p class="fd-center">${FD.btn('v-clear', t('empty.btn'), { ghost: true })}</p>`}`;
  }

  function dlgAddVehicle() {
    FD.dialog({
      title: t('v.add'), note: t('v.addNote'), submit: t('v.addSubmit'), values: { type: 'van', dept: 'dispatch', company: 'c1', year: String(FD.today.getFullYear() - 1), odo: '0' },
      fields: () => [
        { name: 'plate', label: t('f.plate'), ph: 'AB 0000 XX', hint: t('f.plateHint') }, { name: 'vin', label: 'VIN', hint: t('f.vinHint') }, { name: 'model', label: t('f.model') },
        { name: 'type', label: t('col.type'), type: 'select', options: ['pickup', 'van', 'sedan', 'truck'].map(k => [k, t('type.' + k)]) },
        { name: 'dept', label: t('col.dept'), type: 'select', options: deptOpts() }, { name: 'company', label: t('f.company'), type: 'select', options: S.companies.map(c => [c.id, c.name]) },
        { name: 'year', label: t('fact.year'), type: 'number' }, { name: 'odo', label: t('fact.odo'), type: 'number', min: 0 }],
      onSubmit(v) {
        const e = {}, plate = String(v.plate).trim().toUpperCase().replace(/\s+/g, ' '), vin = String(v.vin).trim().toUpperCase();
        if (!/^[A-Z]{2} \d{4} [A-Z]{2}$/.test(plate)) e.plate = t('e.plate'); else if (S.vehicles.some(x => x.plate === plate)) e.plate = t('e.plateDup');
        if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) e.vin = t('e.vin'); else if (S.vehicles.some(x => x.vin === vin)) e.vin = t('e.vinDup');
        if (!String(v.model).trim()) e.model = t('e.req');
        const y = +v.year; if (!(y >= 1990 && y <= FD.today.getFullYear() + 1)) e.year = t('e.year');
        const odo = +v.odo; if (!(odo >= 0) || v.odo === '') e.odo = t('e.num');
        if (Object.keys(e).length) return e;
        const nv = { id: FD.nid('v'), plate, model: String(v.model).trim(), type: v.type, dept: v.dept, driver: null, year: y, odo, vin, color: 'white', fuel: 'diesel', vol: 2.0, power: 100, gear: 'manual', company: v.company, reg: 'RC ' + (200000 + S.seq), state: 'active', card: null, normS: 10, normW: 10.8, svc: { date: FD.addDays(FD.today, 180), km: odo + 15000 }, docs: { ins: null, comp: null, insp: null, poa: null }, svcLog: [], odoLog: [{ date: FD.today, km: odo }] };
        S.vehicles.push(nv); FD.audit('vadd', { plate }, nv.id); FD.toast(t('v.added', { plate })); UI.vehicles.q = ''; UI.vehicles.st = 'all'; UI.vehicles.dept = 'all'; UI.vehicles.state = 'all';
        S.sel = nv.id; S.vtab = 'docs'; return null;
      }
    });
  }

  /* card */
  function spark(v) {
    const pts = S.fuel.filter(f => f.vid === v.id).slice(0, 6).reverse(), W = 320, H = 84, pad = 10, norm = FD.normOf(v), lo = norm * 0.8, hi = norm * 1.3;
    if (pts.length < 2) return '';
    const y = c => H - pad - (Math.min(hi, Math.max(lo, c)) - lo) / (hi - lo) * (H - pad * 2), x = i => pad + i * (W - pad * 2) / (pts.length - 1);
    return `<svg class="fd-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('fuel.chart'))}"><line x1="${pad}" x2="${W - pad}" y1="${y(norm).toFixed(1)}" y2="${y(norm).toFixed(1)}" class="norm"/><polyline points="${pts.map((p, i) => x(i).toFixed(1) + ',' + y(p.cons).toFixed(1)).join(' ')}"/>${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.cons).toFixed(1)}" r="3.2" class="${p.cons > norm * 1.1 ? 'hi' : ''}"/>`).join('')}</svg>`;
  }
  function docRow(v, k) {
    const d = v.docs[k], ed = FD.can('doc.edit');
    if (!d) return `<li class="fd-doc none"><span class="fd-ic">${FD.ico(k)}</span><div class="fd-dbody"><strong>${esc(t('doc.' + k))}</strong><span class="fd-muted">${esc(t('docs.none'))}</span></div><div class="fd-dside">${FD.btn('doc-add', t('docs.add'), { ghost: true, data: `data-k="${k}"`, perm: 'doc.edit' })}</div></li>`;
    const n = FD.daysTo(d.date), st = FD.itemState(k, n), pct = Math.round(n / 365 * 100);
    return `<li class="fd-doc ${st}"><span class="fd-ic">${FD.ico(k)}</span><div class="fd-dbody"><strong>${esc(t('doc.' + k))}</strong><span class="fd-muted">${esc(t('docs.valid', { date: FD.fmtDate(d.date) }))} / ${esc(d.num)}${d.cp ? ' / ' + esc(FD.cpName(d.cp)) : ''}</span>
      <span class="fd-scan ${d.scan ? 'on' : ''}">${FD.ico('file', 14)} ${esc(d.scan ? t('docs.scan', { f: k + '_' + v.plate.replace(/\s/g, '') + '.pdf' }) : t('docs.noScan'))}</span>${FD.bar(n < 0 ? 4 : pct, st)}</div>
      <div class="fd-dside">${FD.badge(st, FD.dayText(n))}${FD.btn('doc-scan', d.scan ? t('docs.scanRm') : t('docs.scanAdd'), { ghost: true, data: `data-k="${k}"`, perm: 'doc.edit' })}${FD.btn('doc-renew', t('docs.renew'), { data: `data-k="${k}"`, perm: 'doc.edit' })}</div></li>`;
  }
  function card() {
    const v = FD.vehicle(S.sel), sm = FD.sum(v), can = a => FD.can(a);
    const tabs = [['docs', t('dt.docs')], ['svc', t('dt.svc')], ['mile', t('dt.mile')], ['fuel', t('dt.fuel')], ['pass', t('dt.pass')], ['hist', t('dt.hist')]];
    let body = '';
    if (S.vtab === 'docs') body = `<ul class="fd-docs">${FD.DOC_KINDS.map(k => docRow(v, k)).join('')}</ul>`;
    else if (S.vtab === 'svc') {
      const ss = FD.items(v).filter(i => i.kind === 'svc' || i.kind === 'svckm');
      const reps = S.repairs.filter(r => r.vid === v.id);
      body = `<div class="fd-grid2">${ss.map(i => `<div class="fd-doc ${i.state}"><span class="fd-ic">${FD.ico(i.kind)}</span><div class="fd-dbody"><strong>${esc(t('doc.' + i.kind))}</strong><span class="fd-muted">${esc(i.kind === 'svc' ? FD.fmtDate(v.svc.date) : FD.fmtKm(v.svc.km))}</span></div>${FD.badge(i.state, FD.itemText(i))}</div>`).join('')}</div>
      <div class="fd-actions fd-mt">${FD.btn('svc-log', t('svc.log'), { perm: 'svc.log' })}${FD.btn('rep-new', t('rep.new'), { ghost: true, perm: 'repair.create' })}</div>
      <h4 class="fd-h4">${esc(t('svc.history'))}</h4><ul class="fd-log">${v.svcLog.slice().sort((a, b) => b.date - a.date).map(e => `<li><span class="fd-k ${e.kind}">${esc(t('svc.' + e.kind))}</span><div class="fd-lb"><strong>${esc(FD.noteText(e.note))}</strong><span class="fd-muted">${esc(FD.cpName(e.shop))} / ${esc(FD.fmtKm(e.km))}</span></div><time>${esc(FD.fmtDate(e.date))}</time></li>`).join('')}</ul>
      ${reps.length ? `<h4 class="fd-h4">${esc(t('mod.repairs'))}</h4><ul class="fd-list">${reps.map(r => `<li><button type="button" class="fd-ev" data-act="goto" data-mod="repairs" data-ui="repairs.open=${r.id}"><span class="fd-evb"><strong>${esc(r.id)}</strong><span class="fd-muted">${esc(t(r.title))} / ${esc(FD.cpName(r.shop))}</span></span>${FD.badge(r.status === 'done' ? 'ok' : (r.status === 'rejected' ? 'bad' : 'info'), t('rst.' + r.status))}</button></li>`).join('')}</ul>` : ''}`;
    } else if (S.vtab === 'mile') {
      body = `<div class="fd-fuelhead"><div><span class="fd-muted">${esc(t('fact.odo'))}</span><strong class="fd-big">${esc(FD.fmtKm(v.odo))}</strong></div><div><span class="fd-muted">${esc(t('mile.last'))}</span><strong>${esc(FD.fmtDate(FD.lastOdoDate(v)))}</strong></div></div>
      <form class="fd-inline" data-form="mileage"><div class="fd-fld"><label for="mi-km">${esc(t('mile.new'))}</label><input id="mi-km" name="km" type="number" min="0" inputmode="numeric" autocomplete="off"></div><label class="fd-check"><input type="checkbox" name="force"><span>${esc(t('mile.confirm'))}</span></label><button type="submit" class="btn btn-sm" ${can('mileage') ? '' : 'disabled title="' + esc(t('perm.no')) + '"'}>${esc(t('mile.save'))}</button></form>
      <p class="fd-hint">${esc(S.settings.protect ? t('mile.protectOn') : t('mile.protectOff'))}</p><p class="fd-err" id="mi-err" role="alert"></p>
      <h4 class="fd-h4">${esc(t('mile.log'))}</h4><ul class="fd-log">${v.odoLog.slice().reverse().slice(0, 8).map(e => `<li><div class="fd-lb"><strong>${esc(FD.fmtKm(e.km))}</strong></div><time>${esc(FD.fmtDate(e.date))}</time></li>`).join('')}</ul>`;
    } else if (S.vtab === 'fuel') {
      const cd = S.cards.find(c => c.id === v.card), fs = S.fuel.filter(f => f.vid === v.id).slice(0, 6), dv = FD.dev(v);
      body = `<div class="fd-fuelhead"><div><span class="fd-muted">${esc(t('fuel.card'))}</span><strong class="fd-mono">${esc(cd ? cd.num : t('fuel.noCard'))}</strong>${cd ? `<span class="fd-muted">${esc(t('fuel.limit', { n: cd.limit }))}</span>` : ''}</div><div><span class="fd-muted">${esc(t('fuel.norms'))}</span><strong>${esc(t('fuel.normsVal', { a: v.normS, b: v.normW }))}</strong></div><div><span class="fd-muted">${esc(t('fuel.avg', { n: FD.avgCons(v) }))}</span>${FD.badge(dv > S.rules.N7.thr ? 'overdue' : 'ok', dv > 0 ? t('fuel.above', { n: dv }) : t('fuel.within'))}</div></div>
      <div class="fd-actions">${FD.btn('norm-edit', t('fuel.normEdit'), { ghost: true, perm: 'svc.log' })}${FD.btn('goto-fuel', t('fuel.open'), { ghost: true })}</div>${spark(v)}
      <ul class="fd-log fd-fuel"><li class="fd-lhead" aria-hidden="true"><span>${esc(t('fuel.date'))}</span><span>${esc(t('fuel.station'))}</span><span>${esc(t('fuel.litres'))}</span><span>${esc(t('fuel.odo'))}</span><span>${esc(t('fuel.cons'))}</span></li>${fs.map(f => `<li><time>${esc(FD.fmtShort(f.date))}</time><span>${esc(f.station)}</span><span>${esc(t('fuel.l', { n: f.litres }))}</span><span>${esc(FD.fmtKm(f.odo))}</span><span class="${f.cons > FD.normOf(v) * 1.1 ? 'fd-hi' : ''}">${f.cons}</span></li>`).join('')}</ul>`;
    } else if (S.vtab === 'pass') {
      const F = (k, val) => `<div><dt>${esc(t(k))}</dt><dd>${val}</dd></div>`;
      body = `<dl class="fd-facts fd-facts3">${F('f.model', esc(v.model))}${F('col.type', esc(t('type.' + v.type)))}${F('fact.year', v.year)}${F('f.vin', `<span class="fd-mono">${esc(v.vin)}</span>`)}${F('f.reg', esc(v.reg))}${F('f.color', esc(t('color.' + v.color)))}${F('f.engine', esc(t('f.engineVal', { f: t('fuelt.' + v.fuel), v: v.vol, p: v.power })))}${F('f.gear', esc(t('gear.' + v.gear)))}${F('f.company', esc(FD.companyName(v.company)))}${F('col.dept', esc(FD.deptName(v.dept)))}${F('col.driver', esc(FD.pname(v.driver)))}${F('fact.odo', esc(FD.fmtKm(v.odo)))}</dl>
      <div class="fd-actions fd-mt">${FD.btn('v-edit', t('v.edit'), { perm: 'vehicle.edit' })}${FD.btn('v-state', v.state === 'off' ? t('v.setActive') : t('v.setOff'), { ghost: true, perm: 'vehicle.edit', cls: v.state === 'repair' ? '' : '' })}</div>`;
    } else {
      const h = S.audit.filter(a => a.vid === v.id);
      body = h.length ? `<ul class="fd-hist">${h.map(a => `<li><span class="fd-dot"></span><div><strong>${esc(FD.auditText(a))}</strong><span class="fd-muted">${esc(a.who)} / ${esc(FD.fmtDate(a.at))}, ${esc(FD.fmtTime(a.at))}</span></div></li>`).join('')}</ul>` : FD.empty(t('hist.none'));
    }
    return `<button type="button" class="btn btn-sm btn-ghost fd-back" data-act="v-back">${esc(t('back'))}</button>
      <div class="fd-dhead"><div><h3 class="fd-dtitle">${esc(v.model)} <span class="fd-plate">${esc(v.plate)}</span></h3><p class="fd-sub">${esc(t('type.' + v.type))} / ${esc(FD.deptName(v.dept))} / ${esc(FD.pname(v.driver))}</p></div><div class="fd-bset">${FD.badge(sm.state)}${vstate(v) || ''}</div></div>
      ${FD.tabs('vtab', tabs, S.vtab, t('dt.label'))}<div class="fd-vbody" role="tabpanel">${body}</div>`;
  }

  FD.mods.vehicles = {
    render() { if (S.sel && !FD.vehicle(S.sel)) S.sel = null; return S.sel ? card() : vList(); },
    onset() { /* list filters repaint automatically */ },
    after(root) {
      const f = root.querySelector('[data-form="mileage"]');
      if (f) f.addEventListener('submit', e => {
        e.preventDefault(); const v = FD.vehicle(S.sel), km = Number(f.km.value), err = root.querySelector('#mi-err');
        if (!FD.can('mileage')) return;
        if (f.km.value === '' || !(km >= 0)) { err.textContent = t('e.num'); f.km.focus(); return; }
        if (km < v.odo && S.settings.protect && !f.force.checked) { err.textContent = t('mile.blocked', { cur: FD.fmtNum(v.odo) }); f.km.focus(); return; }
        const dec = km < v.odo; v.odo = km; v.odoLog.push({ date: new Date(), km });
        FD.audit(dec ? 'odoDec' : 'odo', { km: FD.fmtNum(km), plate: v.plate }, v.id); FD.toast(t('mile.saved', { km: FD.fmtNum(km) })); FD.refresh();
      });
    },
    act(a, el) {
      const v = FD.vehicle(S.sel);
      if (a === 'v-back') { S.sel = null; FD.paint(); }
      else if (a === 'v-clear') { Object.assign(UI.vehicles, { q: '', st: 'all', dept: 'all', state: 'all' }); FD.paint(); }
      else if (a === 'v-add') dlgAddVehicle();
      else if (a === 'v-export') { const n = filtered().length; FD.audit('export', { n }); S.xlog.unshift({ at: new Date(), sys: 'sheet', n, ok: true, who: FD.me(), out: true }); FD.toast(t('x.toast', { n })); FD.paint(); }
      else if (a === 'goto-fuel') { UI.fuel.vid = v.id; UI.fuel.tab = 'log'; FD.go('fuel'); }
      else if (a === 'doc-scan') { const k = el.getAttribute('data-k'); v.docs[k].scan = !v.docs[k].scan; FD.audit(v.docs[k].scan ? 'scanAdd' : 'scanRm', { doc: k, plate: v.plate }, v.id); FD.toast(t(v.docs[k].scan ? 'docs.scanOk' : 'docs.scanGone')); FD.refresh(); }
      else if (a === 'doc-renew' || a === 'doc-add') {
        const k = el.getAttribute('data-k'), cur = v.docs[k], add = a === 'doc-add';
        FD.dialog({
          title: t(add ? 'docs.addTitle' : 'docs.renewTitle', { doc: t('doc.' + k) }), submit: t('save'), values: { date: iso(FD.addDays(cur && FD.daysTo(cur.date) > 0 ? cur.date : FD.today, 365)), num: cur ? cur.num.replace(/\d+$/, m => String(+m + 1)) : k.toUpperCase() + '-' + (7000 + S.seq), cp: cur ? cur.cp : (k === 'insp' ? 'k7' : 'k5') },
          fields: () => [{ name: 'date', label: t('docs.newDate'), type: 'date' }, { name: 'num', label: t('docs.num') }].concat(k === 'poa' ? [] : [{ name: 'cp', label: t(k === 'insp' ? 'cp.lab' : 'cp.insurer'), type: 'select', options: S.cp.filter(c => c.type === (k === 'insp' ? 'lab' : 'insurer')).map(c => [c.id, c.name]) }]),
          onSubmit(f) {
            const e = {}, d = parseIso(f.date);
            if (!d) e.date = t('e.date'); else if (FD.daysTo(d) <= 0) e.date = t('e.dateFuture'); else if (cur && d <= cur.date) e.date = t('e.dateLater');
            if (!String(f.num).trim()) e.num = t('e.req');
            if (Object.keys(e).length) return e;
            v.docs[k] = { date: d, num: String(f.num).trim(), cp: k === 'poa' ? null : f.cp, scan: cur ? cur.scan : false };
            FD.audit(add ? 'docAdd' : 'doc', { doc: k, plate: v.plate }, v.id); FD.toast(t('docs.toast', { doc: t('doc.' + k), plate: v.plate, date: FD.fmtDate(d) })); return null;
          }
        });
      } else if (a === 'svc-log') {
        FD.dialog({
          title: t('svc.log'), values: { note: 'sv.routine', shop: 'k1', km: String(v.odo) }, submit: t('save'),
          fields: () => [{ name: 'note', label: t('svc.work'), type: 'select', options: ['sv.routine'].concat(NOTES_LIST).map(k => [k, t(k)]) }, { name: 'shop', label: t('cp.garage'), type: 'select', options: S.cp.filter(c => c.type === 'garage').map(c => [c.id, c.name]) }, { name: 'km', label: t('fact.odo'), type: 'number', min: 0 }],
          onSubmit(f) {
            const km = Number(f.km); if (f.km === '' || !(km >= 0)) return { km: t('e.num') }; if (km > v.odo + 50000) return { km: t('e.num') };
            v.svcLog.unshift({ kind: 'service', note: f.note, date: new Date(FD.today), km, shop: f.shop }); v.svc = { date: FD.addDays(FD.today, 180), km: km + 15000 }; if (km > v.odo) { v.odo = km; v.odoLog.push({ date: new Date(), km }); }
            FD.audit('svc', { plate: v.plate }, v.id); FD.toast(t('svc.logged', { plate: v.plate, date: FD.fmtDate(v.svc.date) })); return null;
          }
        });
      } else if (a === 'rep-new') FD.newRepair(v.id);
      else if (a === 'norm-edit') {
        FD.dialog({
          title: t('fuel.normEdit'), values: { a: String(v.normS), b: String(v.normW) }, fields: () => [{ name: 'a', label: t('fuel.normS'), type: 'number' }, { name: 'b', label: t('fuel.normW'), type: 'number' }],
          onSubmit(f) { const e = {}, a2 = Number(f.a), b2 = Number(f.b); if (!(a2 > 1 && a2 < 80)) e.a = t('e.num'); if (!(b2 > 1 && b2 < 80)) e.b = t('e.num'); if (Object.keys(e).length) return e; v.normS = a2; v.normW = b2; FD.audit('norm', { plate: v.plate }, v.id); FD.toast(t('fuel.normSaved')); return null; }
        });
      } else if (a === 'v-edit') {
        FD.dialog({
          title: t('v.edit'), values: { driver: v.driver || '', dept: v.dept, company: v.company }, fields: () => [
            { name: 'driver', label: t('col.driver'), type: 'select', options: [['', t('v.noDriver')]].concat(drivers(v.id).concat(v.driver ? [FD.person(v.driver)] : []).filter((p, i, arr) => arr.indexOf(p) === i).map(p => [p.id, p.name])) },
            { name: 'dept', label: t('col.dept'), type: 'select', options: deptOpts() }, { name: 'company', label: t('f.company'), type: 'select', options: S.companies.map(c => [c.id, c.name]) }],
          onSubmit(f) { const ch = f.driver !== (v.driver || ''); v.driver = f.driver || null; v.dept = f.dept; v.company = f.company; FD.audit(ch ? 'driver' : 'vedit', { plate: v.plate, name: FD.pname(v.driver) }, v.id); FD.toast(t('v.saved')); return null; }
        });
      } else if (a === 'v-state') { v.state = v.state === 'off' ? 'active' : 'off'; FD.audit('vstate', { plate: v.plate, state: v.state }, v.id); FD.toast(t('v.stateSet', { state: t('vstate.' + v.state) })); FD.refresh(); }
    }
  };
  const NOTES_LIST = ['sv.oil', 'sv.brakes', 'sv.tyres', 'sv.susp', 'sv.coolant', 'sv.lights'];

  /* ================= deadlines ================= */
  function allItems() {
    const out = [];
    FD.scoped().forEach(v => FD.items(v).forEach(i => out.push({ v, i })));
    return out;
  }
  function dlFilter() {
    const u = UI.deadlines;
    return allItems().filter(x => (u.type === 'all' || x.i.kind === u.type) && (u.st === 'all' || x.i.state === u.st) && (u.dept === 'all' || x.v.dept === u.dept)).sort((a, b) => a.i.days - b.i.days);
  }
  function calendar() {
    const u = UI.deadlines, first = new Date(u.calY, u.calM, 1), dim = new Date(u.calY, u.calM + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
    const ev = allItems().filter(x => !x.i.km && x.i.date.getFullYear() === u.calY && x.i.date.getMonth() === u.calM && (u.dept === 'all' || x.v.dept === u.dept)).sort((a, b) => a.i.date - b.i.date);
    const by = {}; ev.forEach(e => { (by[e.i.date.getDate()] = by[e.i.date.getDate()] || []).push(e); });
    const mn = new Intl.DateTimeFormat(FD.loc(), { month: 'long', year: 'numeric' }).format(first);
    let h = `<div class="fd-calhead"><button type="button" class="fd-sq" data-act="cal" data-d="-1" aria-label="${esc(t('cal.prev'))}">${FD.ico('left', 18)}</button><h3 class="fd-h3 fd-month" id="fd-month">${esc(mn)}</h3><button type="button" class="fd-sq" data-act="cal" data-d="1" aria-label="${esc(t('cal.next'))}">${FD.ico('right', 18)}</button></div><div class="fd-wd">`;
    for (let k = 0; k < 7; k++) h += `<span>${esc(new Intl.DateTimeFormat(FD.loc(), { weekday: 'short' }).format(new Date(2024, 0, 1 + k)))}</span>`;
    h += '</div><div class="fd-days">' + '<span class="fd-blank"></span>'.repeat(lead);
    for (let d = 1; d <= dim; d++) {
      const l = by[d] || [], dt = new Date(u.calY, u.calM, d);
      h += `<button type="button" class="fd-day${FD.sameDay(dt, FD.today) ? ' today' : ''}${u.day === d ? ' sel' : ''}" data-act="cal-day" data-d="${d}" aria-pressed="${u.day === d}" aria-label="${esc(t('cal.day', { date: FD.fmtDate(dt), n: l.length }))}"><span class="fd-dn">${d}</span><span class="fd-dots">${l.slice(0, 4).map(e => `<i class="${e.i.state}"></i>`).join('')}</span></button>`;
    }
    const shown = u.day ? (by[u.day] || []) : ev;
    h += `</div><div class="fd-evhead"><h4 class="fd-h4">${esc(u.day ? t('cal.on', { date: FD.fmtDate(new Date(u.calY, u.calM, u.day)) }) : t('cal.all', { month: mn }))}</h4>${u.day ? FD.btn('cal-clear', t('cal.clear'), { ghost: true }) : ''}</div>`;
    h += shown.length ? `<ul class="fd-list">${shown.map(e => `<li><button type="button" class="fd-ev ${e.i.state}" data-act="open-v" data-id="${e.v.id}"><span class="fd-evd">${esc(FD.fmtShort(e.i.date))}</span><span class="fd-evb"><strong>${esc(e.v.plate)}</strong><span class="fd-muted">${esc(e.v.model)} / ${esc(t('doc.' + e.i.kind))}</span></span>${FD.badge(e.i.state, FD.dayText(e.i.days))}</button></li>`).join('')}</ul>` : `<p class="fd-muted">${esc(t('cal.empty'))}</p>`;
    return h;
  }
  FD.mods.deadlines = {
    render() {
      const u = UI.deadlines, all = allItems(), cnt = s => all.filter(x => x.i.state === s).length;
      let body;
      if (u.tab === 'cal') body = calendar();
      else {
        const list = dlFilter();
        body = `<div class="fd-tools">${FD.select('deadlines.type', [['all', t('filter.all')]].concat(['ins', 'comp', 'insp', 'poa', 'svc', 'svckm'].map(k => [k, t('doc.' + k)])), u.type, t('dl.type'))}${FD.select('deadlines.dept', [['all', t('filter.all')]].concat(deptOpts()), u.dept, t('col.dept'))}${FD.chips('deadlines.st', [['all', t('filter.all')], ['overdue', t('filter.overdue') + ' ' + cnt('overdue')], ['soon', t('filter.soon') + ' ' + cnt('soon')], ['ok', t('filter.ok')]], u.st)}</div>
        <p class="fd-count">${esc(t('dl.count', { n: list.length }))}</p>
        ${list.length ? FD.table([t('col.vehicle'), t('dl.item'), t('dl.due'), t('col.status'), ''], list.slice(0, 60).map(x => ({ cls: x.i.state, cells: [FD.vlink(x.v), `<span class="fd-ic fd-ic-s">${FD.ico(x.i.kind, 16)}</span> ${esc(t('doc.' + x.i.kind))}`, esc(x.i.km ? FD.fmtKm(x.v.svc.km) : FD.fmtDate(x.i.date)), FD.badge(x.i.state, FD.itemText(x.i)), (!x.i.km && x.i.kind !== 'svc' && x.i.state !== 'ok') ? FD.btn('dl-renew', t('docs.renew'), { ghost: true, data: `data-id="${x.v.id}" data-k="${x.i.kind}"`, perm: 'doc.edit' }) : ''], cc: ['c-veh', '', '', 'c-status', 'c-act'] }))) : FD.empty(t('empty.h'), t('empty.p'))}`;
      }
      return `<div class="fd-modhead">${FD.tabs('deadlines.tab', [['list', t('dl.list')], ['cal', t('tab.calendar')]], u.tab, t('mod.deadlines'))}<span class="fd-grow"></span><span class="fd-muted">${esc(t('dl.thrHint'))}</span></div>${body}`;
    },
    act(a, el) {
      const u = UI.deadlines;
      if (a === 'cal') { u.calM += +el.getAttribute('data-d'); if (u.calM < 0) { u.calM = 11; u.calY--; } if (u.calM > 11) { u.calM = 0; u.calY++; } u.day = null; FD.paint(); }
      else if (a === 'cal-day') { const d = +el.getAttribute('data-d'); u.day = u.day === d ? null : d; FD.paint(); const n = FD.$('fd-mod').querySelector('[data-d="' + d + '"]'); if (n) n.focus({ preventScroll: true }); }
      else if (a === 'cal-clear') { u.day = null; FD.paint(); }
      else if (a === 'dl-renew') { S.sel = el.getAttribute('data-id'); S.vtab = 'docs'; FD.go('vehicles'); FD.toast(t('dl.hintRenew')); }
    }
  };
}());
