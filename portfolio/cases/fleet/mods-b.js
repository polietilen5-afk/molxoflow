/* Fleet Desk demo modules: repairs, fuel, directories. */
(function () {
  'use strict';
  const FD = window.FD, S = FD.S, t = FD.t, esc = FD.esc, UI = FD.ui;
  const deptOpts = () => S.depts.map(d => [d.id, FD.deptName(d.id)]);
  FD.noteText = n => /^(sv|rp)\./.test(n) ? t(n) : n;
  const rtitle = r => /^rp\./.test(r.title) ? t(r.title) : r.title;
  const RTITLES = ['rp.brakes', 'rp.susp', 'rp.leak', 'rp.tyres', 'rp.lights', 'rp.coolant', 'rp.paint'];
  const RTONE = { requested: 'warn', approved: 'info', inwork: 'info', done: 'ok', rejected: 'bad' };
  const garages = () => S.cp.filter(c => c.type === 'garage').map(c => [c.id, c.name]);

  /* ================= repairs ================= */
  FD.newRepair = vid => {
    FD.dialog({
      title: t('rep.new'), note: t('rep.newNote'), submit: t('rep.create'), values: { vid: vid || S.vehicles[0].id, kind: 'rp.brakes', shop: 'k1' },
      fields: () => [{ name: 'vid', label: t('col.vehicle'), type: 'select', options: S.vehicles.map(v => [v.id, v.plate + ' / ' + v.model]) },
        { name: 'kind', label: t('rep.work'), type: 'select', options: RTITLES.map(k => [k, t(k)]).concat([['custom', t('rep.custom')]]) },
        { name: 'custom', label: t('rep.customText') }, { name: 'shop', label: t('cp.garage'), type: 'select', options: garages() }, { name: 'part', label: t('rep.firstPart'), hint: t('rep.firstPartHint') }],
      onSubmit(f) {
        const e = {}; if (f.kind === 'custom' && !String(f.custom).trim()) e.custom = t('e.req');
        if (S.repairs.some(r => r.vid === f.vid && ['requested', 'approved', 'inwork'].indexOf(r.status) >= 0 && r.title === (f.kind === 'custom' ? f.custom.trim() : f.kind))) e.kind = t('rep.dup');
        if (Object.keys(e).length) return e;
        const v = FD.vehicle(f.vid), r = { id: 'R-' + (105 + S.repairs.filter(x => x.opened > FD.addDays(FD.today, -1)).length + S.seq), vid: f.vid, status: 'requested', title: f.kind === 'custom' ? String(f.custom).trim() : f.kind, shop: f.shop, opened: new Date(), started: null, closed: null, cost: 0, parts: String(f.part).trim() ? [{ name: String(f.part).trim(), qty: 1, analog: '' }] : [] };
        S.repairs.unshift(r); UI.repairs.open = r.id; UI.repairs.st = 'all'; FD.audit('repnew', { id: r.id, plate: v.plate }, v.id); FD.toast(t('rep.created', { id: r.id })); FD.go('repairs'); return null;
      }
    });
  };
  const setStatus = (r, st, key) => { const v = FD.vehicle(r.vid); r.status = st; FD.audit(key, { id: r.id, plate: v.plate }, v.id); };
  function repList() {
    const u = UI.repairs, q = u.q.trim().toLowerCase();
    const base = S.repairs.filter(r => !q || (r.id + ' ' + FD.vehicle(r.vid).plate + ' ' + rtitle(r) + ' ' + FD.cpName(r.shop)).toLowerCase().indexOf(q) >= 0);
    const cnt = s => base.filter(r => r.status === s).length;
    const list = base.filter(r => u.st === 'all' || r.status === u.st);
    const total = S.repairs.filter(r => r.status === 'done').reduce((a, r) => a + r.cost, 0);
    return `<div class="fd-tools">${FD.search('repairs.q', u.q, t('rep.search'), 'rq')}<span class="fd-grow"></span>${FD.btn('rep-new', t('rep.new'), { icon: 'plus', perm: 'repair.create' })}</div>
      ${FD.chips('repairs.st', [['all', t('filter.all')]].concat(['requested', 'approved', 'inwork', 'done', 'rejected'].map(s => [s, t('rst.' + s) + ' ' + cnt(s)])), u.st)}
      <p class="fd-count">${esc(t('rep.total', { n: list.length, sum: FD.fmtCu(total) }))}</p>
      ${list.length ? FD.table([t('rep.id'), t('col.vehicle'), t('rep.work'), t('cp.garage'), t('col.status'), t('rep.parts'), t('rep.cost')], list.map(r => { const v = FD.vehicle(r.vid); return { cls: '', attr: `data-act="rep-open" data-id="${r.id}"`, cells: [`<strong>${esc(r.id)}</strong>`, FD.vlink(v), esc(rtitle(r)), esc(FD.cpName(r.shop)), FD.badge(RTONE[r.status], t('rst.' + r.status)), r.parts.length, r.status === 'done' ? esc(FD.fmtCu(r.cost)) : '-'], cc: ['c-veh', '', '', '', 'c-status', '', 'c-odo'] }; })) : FD.empty(t('empty.h'), t('empty.p'))}`;
  }
  function repDetail(r) {
    const v = FD.vehicle(r.vid), open = ['requested', 'approved', 'inwork'].indexOf(r.status) >= 0;
    const steps = [['requested', r.opened], ['approved', null], ['inwork', r.started], ['done', r.closed]];
    const order = ['requested', 'approved', 'inwork', 'done'], cur = r.status === 'rejected' ? -1 : order.indexOf(r.status);
    const act = [];
    if (r.status === 'requested') { act.push(FD.btn('rep-approve', t('rep.approve'), { perm: 'repair.approve' })); act.push(FD.btn('rep-reject', t('rep.reject'), { ghost: true, perm: 'repair.approve' })); }
    if (r.status === 'approved') act.push(FD.btn('rep-start', t('rep.start'), { perm: 'repair.work' }));
    if (r.status === 'inwork') act.push(FD.btn('rep-done', t('rep.done'), { perm: 'repair.work' }));
    const parts = r.parts.length ? FD.table([t('part.name'), t('part.qty'), t('part.analog'), ''], r.parts.map((p, i) => ({ cells: [esc(p.name), p.qty, p.analog ? esc(p.analog) : `<span class="fd-muted">${esc(t('part.none'))}</span>`, open && FD.can('repair.create') ? FD.btn('part-rm', t('part.rm'), { ghost: true, data: `data-i="${i}"` }) : ''], cc: ['c-veh', '', '', 'c-act'] }))) : FD.empty(t('part.empty'));
    return `<button type="button" class="btn btn-sm btn-ghost fd-back" data-act="rep-back">${esc(t('rep.back'))}</button>
      <div class="fd-dhead"><div><h3 class="fd-dtitle">${esc(r.id)} / ${esc(rtitle(r))}</h3><p class="fd-sub">${FD.vlink(v)}</p></div>${FD.badge(RTONE[r.status], t('rst.' + r.status))}</div>
      <ol class="fd-steps2" aria-label="${esc(t('rep.flow'))}">${steps.map((s, i) => `<li class="${i < cur ? 'done' : (i === cur ? 'cur' : '')}"><span>${esc(t('rst.' + s[0]))}</span><small>${s[1] ? esc(FD.fmtShort(s[1])) : ''}</small></li>`).join('')}</ol>${r.status === 'rejected' ? `<p class="fd-err">${esc(t('rep.rejected'))}</p>` : ''}
      <dl class="fd-facts"><div><dt>${esc(t('cp.garage'))}</dt><dd>${esc(FD.cpName(r.shop))}</dd></div><div><dt>${esc(t('rep.opened'))}</dt><dd>${esc(FD.fmtDate(r.opened))}</dd></div><div><dt>${esc(t('rep.cost'))}</dt><dd>${r.status === 'done' ? esc(FD.fmtCu(r.cost)) : '-'}</dd></div><div><dt>${esc(t('col.status'))}</dt><dd>${esc(t('vstate.' + v.state))}</dd></div></dl>
      <div class="fd-actions">${act.join('')}</div>
      <h4 class="fd-h4">${esc(t('rep.parts'))}</h4>${parts}
      ${open ? `<form class="fd-inline" data-form="part"><div class="fd-fld"><label for="pt-n">${esc(t('part.name'))}</label><input id="pt-n" name="name" autocomplete="off"></div><div class="fd-fld fd-narrow"><label for="pt-q">${esc(t('part.qty'))}</label><input id="pt-q" name="qty" type="number" min="1" value="1"></div><div class="fd-fld"><label for="pt-a">${esc(t('part.analog'))}</label><input id="pt-a" name="analog" autocomplete="off" placeholder="${esc(t('part.analogPh'))}"></div><button type="submit" class="btn btn-sm" ${FD.can('repair.create') ? '' : 'disabled title="' + esc(t('perm.no')) + '"'}>${esc(t('part.add'))}</button></form><p class="fd-err" id="pt-err" role="alert"></p>` : ''}`;
  }
  FD.mods.repairs = {
    render() { const r = S.repairs.find(x => x.id === UI.repairs.open); return r ? repDetail(r) : repList(); },
    after(root) {
      const f = root.querySelector('[data-form="part"]'); if (!f) return;
      f.addEventListener('submit', e => {
        e.preventDefault(); if (!FD.can('repair.create')) return;
        const r = S.repairs.find(x => x.id === UI.repairs.open), err = root.querySelector('#pt-err'), name = f.name.value.trim(), qty = Number(f.qty.value);
        if (!name) { err.textContent = t('e.req'); f.name.focus(); return; }
        if (!(qty >= 1 && qty <= 99)) { err.textContent = t('e.qty'); f.qty.focus(); return; }
        r.parts.push({ name, qty, analog: f.analog.value.trim() }); FD.audit('part', { id: r.id }, r.vid); FD.paint();
      });
    },
    act(a, el) {
      const u = UI.repairs, r = S.repairs.find(x => x.id === u.open);
      if (a === 'rep-open') { u.open = el.getAttribute('data-id'); FD.paint(); }
      else if (a === 'rep-back') { u.open = null; FD.paint(); }
      else if (a === 'rep-new') FD.newRepair(null);
      else if (a === 'rep-approve') { setStatus(r, 'approved', 'repapprove'); FD.toast(t('rep.approved', { id: r.id })); FD.refresh(); }
      else if (a === 'rep-reject') { setStatus(r, 'rejected', 'reprej'); FD.toast(t('rep.rejToast', { id: r.id })); FD.refresh(); }
      else if (a === 'rep-start') { const v = FD.vehicle(r.vid); r.started = new Date(); v.state = 'repair'; setStatus(r, 'inwork', 'repstart'); FD.toast(t('rep.startToast', { plate: v.plate })); FD.refresh(); }
      else if (a === 'part-rm') { r.parts.splice(+el.getAttribute('data-i'), 1); FD.paint(); }
      else if (a === 'rep-done') {
        const v = FD.vehicle(r.vid);
        FD.dialog({
          title: t('rep.done'), note: t('rep.doneNote'), values: { cost: '', odo: String(v.odo) },
          fields: () => [{ name: 'cost', label: t('rep.costIn'), type: 'number', min: 1 }, { name: 'odo', label: t('fact.odo'), type: 'number', min: 0 }],
          onSubmit(f) {
            const e = {}, c = Number(f.cost), o = Number(f.odo); if (!(c > 0)) e.cost = t('e.num'); if (f.odo === '' || !(o >= v.odo)) e.odo = t('e.odoLow', { n: FD.fmtNum(v.odo) });
            if (Object.keys(e).length) return e;
            r.cost = c; r.closed = new Date(); r.status = 'done'; v.state = 'active'; if (o > v.odo) { v.odo = o; v.odoLog.push({ date: new Date(), km: o }); }
            v.svcLog.unshift({ kind: 'repair', note: r.title, date: new Date(FD.today), km: v.odo, shop: r.shop }); FD.audit('repdone', { id: r.id, plate: v.plate }, v.id); FD.toast(t('rep.doneToast', { plate: v.plate })); return null;
          }
        });
      }
    }
  };

  /* ================= fuel ================= */
  const devClass = d => d > S.rules.N7.thr ? 'bad' : (d > 0 ? 'warn' : 'ok');
  function fuelLog() {
    const u = UI.fuel, q = u.q.trim().toLowerCase();
    const scope = FD.scoped().map(v => v.id);
    let list = S.fuel.filter(f => scope.indexOf(f.vid) >= 0 && (u.vid === 'all' || f.vid === u.vid) && (!q || (f.station + ' ' + FD.vehicle(f.vid).plate).toLowerCase().indexOf(q) >= 0) && (!u.flag || f.cons > FD.normOf(FD.vehicle(f.vid)) * 1.1));
    const tl = list.reduce((a, f) => a + f.litres, 0);
    return `<div class="fd-tools">${FD.search('fuel.q', u.q, t('fuel.search'), 'fq')}${FD.select('fuel.vid', [['all', t('filter.all')]].concat(S.vehicles.map(v => [v.id, v.plate])), u.vid, t('col.vehicle'))}<label class="fd-check"><input type="checkbox" data-set="fuel.flag" ${u.flag ? 'checked' : ''}><span>${esc(t('fuel.flagOnly'))}</span></label><span class="fd-grow"></span>${FD.btn('fuel-add', t('fuel.add'), { icon: 'plus', perm: 'fuel.add' })}</div>
      <p class="fd-count">${esc(t('fuel.count', { n: list.length, l: FD.fmtNum(tl) }))}</p>
      ${list.length ? FD.table([t('fuel.date'), t('col.vehicle'), t('fuel.station'), t('fuel.litres'), t('fuel.odo'), t('fuel.cons'), t('fuel.card')], list.slice(0, 40).map(f => { const v = FD.vehicle(f.vid), hi = f.cons > FD.normOf(v) * 1.1, cd = S.cards.find(c => c.id === f.card); return { cells: [esc(FD.fmtShort(f.date)), FD.vlink(v), esc(f.station), esc(t('fuel.l', { n: f.litres })), esc(FD.fmtKm(f.odo)), `<span class="${hi ? 'fd-hi' : ''}">${f.cons}</span>`, `<span class="fd-mono">${esc(cd ? cd.num : '-')}</span>`], cc: ['c-veh', '', '', '', '', '', ''] }; })) : FD.empty(t('empty.h'), t('empty.p'))}`;
  }
  function fuelCards() {
    const freeVeh = S.vehicles.filter(v => !v.card);
    return `<div class="fd-tools"><p class="fd-sub fd-grow">${esc(t('card.rule'))}</p>${FD.btn('card-add', t('card.add'), { icon: 'plus', perm: 'card.manage' })}</div>
      ${FD.table([t('fuel.card'), t('col.status'), t('col.vehicle'), t('card.limitCol'), ''], S.cards.map(c => { const v = c.vid ? FD.vehicle(c.vid) : null; return { cells: [`<span class="fd-mono">${esc(c.num)}</span>`, FD.badge(c.status === 'active' ? (c.vid ? 'ok' : 'info') : 'bad', t('card.st.' + (c.status === 'active' && !c.vid ? 'free' : c.status))), v ? FD.vlink(v) : '-', esc(t('fuel.limit', { n: c.limit })), (c.vid ? FD.btn('card-unbind', t('card.unbind'), { ghost: true, data: `data-id="${c.id}"`, perm: 'card.manage' }) : (c.status !== 'blocked' ? FD.btn('card-bind', t('card.bind'), { data: `data-id="${c.id}"`, perm: 'card.manage' }) : '')) + FD.btn('card-block', c.status === 'blocked' ? t('card.unblock') : t('card.block'), { ghost: true, data: `data-id="${c.id}"`, perm: 'card.manage' })], cc: ['c-veh', 'c-status', '', '', 'c-act'] }; }))}
      <p class="fd-hint">${esc(t('card.noCard', { n: freeVeh.length }))}</p>`;
  }
  function fuelNorms() {
    const rows = FD.scoped().map(v => ({ v, d: FD.dev(v), a: FD.avgCons(v), n: FD.normOf(v) })).sort((a, b) => b.d - a.d);
    return `<p class="fd-sub">${esc(t('norm.hint', { n: S.rules.N7.thr }))}</p>${FD.table([t('col.vehicle'), t('norm.norm'), t('norm.avg'), t('norm.dev'), t('col.status')], rows.map(x => ({ cls: x.d > S.rules.N7.thr ? 'overdue' : '', cells: [FD.vlink(x.v), esc(x.n + ' ' + t('fuel.cons')), esc(x.a + ' ' + t('fuel.cons')), `<span class="fd-devc">${FD.bar(50 + x.d * 2, devClass(x.d))}<b class="${x.d > S.rules.N7.thr ? 'fd-hi' : ''}">${x.d > 0 ? '+' : ''}${x.d}%</b></span>`, FD.badge(x.d > S.rules.N7.thr ? 'overdue' : 'ok', x.d > S.rules.N7.thr ? t('fuel.flagged') : t('fuel.within'))], cc: ['c-veh', '', '', '', 'c-status'] })))}`;
  }
  FD.mods.fuel = {
    render() { const u = UI.fuel; return `<div class="fd-modhead">${FD.tabs('fuel.tab', [['log', t('fuel.tabLog')], ['cards', t('fuel.tabCards')], ['norms', t('fuel.tabNorms')]], u.tab, t('mod.fuel'))}</div>${u.tab === 'log' ? fuelLog() : (u.tab === 'cards' ? fuelCards() : fuelNorms())}`; },
    act(a, el) {
      const id = el.getAttribute('data-id'), c = S.cards.find(x => x.id === id);
      if (a === 'fuel-add') {
        FD.dialog({
          title: t('fuel.add'), values: { vid: UI.fuel.vid !== 'all' ? UI.fuel.vid : S.vehicles[0].id, station: 'Station 12' }, submit: t('save'),
          fields: () => [{ name: 'vid', label: t('col.vehicle'), type: 'select', options: S.vehicles.map(v => [v.id, v.plate + ' / ' + v.model]) }, { name: 'litres', label: t('fuel.litres'), type: 'number', min: 1 }, { name: 'odo', label: t('fuel.odo'), type: 'number', min: 0, hint: t('fuel.odoHint') }, { name: 'station', label: t('fuel.station') }],
          onSubmit(f) {
            const v = FD.vehicle(f.vid), prev = S.fuel.filter(x => x.vid === v.id)[0], e = {}, l = Number(f.litres), o = Number(f.odo);
            if (!v.card) e.vid = t('fuel.needCard'); if (!(l >= 1 && l <= 400)) e.litres = t('e.num');
            const base = prev ? prev.odo : v.odoLog[0].km; if (f.odo === '' || !(o > 0)) e.odo = t('e.num'); else if (o - base < 50) e.odo = t('e.odoPrev', { n: FD.fmtNum(base) });
            if (!String(f.station).trim()) e.station = t('e.req');
            if (Object.keys(e).length) return e;
            const cons = Math.round(l / (o - base) * 1000) / 10;
            S.fuel.unshift({ id: FD.nid('f'), vid: v.id, date: new Date(), station: String(f.station).trim(), litres: l, odo: o, cons, card: v.card });
            if (o > v.odo) { v.odo = o; v.odoLog.push({ date: new Date(), km: o }); } FD.audit('fuel', { plate: v.plate, l }, v.id); FD.toast(t('fuel.added', { plate: v.plate, c: cons })); return null;
          }
        });
      } else if (a === 'card-add') {
        FD.dialog({
          title: t('card.add'), fields: () => [{ name: 'num', label: t('card.num'), hint: t('card.numHint') }, { name: 'limit', label: t('card.limitCol'), type: 'number', min: 1 }], values: { limit: '400' },
          onSubmit(f) { const e = {}, n = String(f.num).trim(); if (!/^\d{4}$/.test(n)) e.num = t('card.numErr'); else if (S.cards.some(x => x.num.slice(-4) === n)) e.num = t('card.dup'); if (!(Number(f.limit) >= 1)) e.limit = t('e.num'); if (Object.keys(e).length) return e; S.cards.push({ id: FD.nid('fc'), num: 'FC ••• ' + n, status: 'active', vid: null, limit: Number(f.limit) }); FD.audit('cardAdd', { card: 'FC ••• ' + n }); FD.toast(t('card.added')); return null; }
        });
      } else if (a === 'card-bind') {
        const opts = S.vehicles.filter(v => !v.card).map(v => [v.id, v.plate + ' / ' + v.model]);
        FD.dialog({
          title: t('card.bind') + ': ' + c.num, fields: () => opts.length ? [{ name: 'vid', label: t('col.vehicle'), type: 'select', options: opts }] : [{ type: 'info', name: 'i', text: t('card.noFree') }], values: {},
          onSubmit(f) { if (!opts.length) return { vid: t('card.noFree') }; const v = FD.vehicle(f.vid || opts[0][0]); if (v.card) return { vid: t('card.has') }; v.card = c.id; c.vid = v.id; c.status = 'active'; FD.audit('cardbind', { card: c.num, plate: v.plate }, v.id); FD.toast(t('card.bound', { plate: v.plate })); return null; }
        });
      } else if (a === 'card-unbind') {
        const v = FD.vehicle(c.vid);
        FD.dialog({ title: t('card.unbind') + ': ' + c.num, submit: t('card.unbind'), fields: () => [{ type: 'info', name: 'i', text: t('card.unbindNote', { plate: v.plate }) }], values: {}, onSubmit() { v.card = null; c.vid = null; FD.audit('cardunbind', { card: c.num, plate: v.plate }, v.id); FD.toast(t('card.unbound')); return null; } });
      } else if (a === 'card-block') {
        if (c.status === 'blocked') { c.status = 'active'; FD.audit('cardunblock', { card: c.num }); }
        else { if (c.vid) { const v = FD.vehicle(c.vid); v.card = null; c.vid = null; } c.status = 'blocked'; FD.audit('cardblock', { card: c.num }); }
        FD.toast(t('card.toggled')); FD.refresh();
      }
    }
  };

  /* ================= directories ================= */
  const usedCp = id => S.repairs.some(r => r.shop === id) || S.vehicles.some(v => v.svcLog.some(l => l.shop === id) || Object.keys(v.docs).some(k => v.docs[k] && v.docs[k].cp === id));
  const PROLES = ['driver', 'mechanic', 'manager', 'head', 'admin'];
  function dirStaff() {
    const u = UI.dir, q = u.q.trim().toLowerCase();
    const list = S.people.filter(p => !q || (p.name + ' ' + t('prole.' + p.role) + ' ' + FD.deptName(p.dept)).toLowerCase().indexOf(q) >= 0);
    return `<div class="fd-tools">${FD.search('dir.q', u.q, t('dir.search'), 'dq')}<span class="fd-grow"></span>${FD.btn('st-add', t('dir.addPerson'), { icon: 'plus', perm: 'dir.edit' })}</div>
      <p class="fd-count">${esc(t('dir.count', { n: list.length }))}</p>${FD.table([t('dir.name'), t('dir.role'), t('col.dept'), t('col.vehicle'), t('dir.msgr'), t('col.status'), ''], list.map(p => { const v = S.vehicles.find(x => x.driver === p.id); return { cells: [`<strong>${esc(p.name)}</strong>`, esc(t('prole.' + p.role)), esc(FD.deptName(p.dept)), v ? FD.vlink(v) : '-', FD.badge(p.msgr ? 'ok' : 'info', p.msgr ? t('dir.linked') : t('dir.notLinked')), FD.badge(p.active ? 'ok' : 'bad', p.active ? t('dir.active') : t('dir.dismissed')), FD.btn('st-edit', t('edit'), { ghost: true, data: `data-id="${p.id}"`, perm: 'dir.edit' }) + FD.btn('st-toggle', p.active ? t('dir.dismiss') : t('dir.reinstate'), { ghost: true, data: `data-id="${p.id}"`, perm: 'dir.edit' })], cc: ['c-veh', '', '', '', '', 'c-status', 'c-act'] }; }))}`;
  }
  function dirCp() {
    const u = UI.dir, q = u.q.trim().toLowerCase(), types = ['garage', 'insurer', 'lab', 'owner'];
    const list = S.cp.filter(c => (u.cpType === 'all' || c.type === u.cpType) && (!q || c.name.toLowerCase().indexOf(q) >= 0));
    return `<div class="fd-tools">${FD.search('dir.q', u.q, t('dir.search'), 'dq')}${FD.chips('dir.cpType', [['all', t('filter.all')]].concat(types.map(k => [k, t('cp.' + k + 's')])), u.cpType)}<span class="fd-grow"></span>${FD.btn('cp-add', t('dir.addCp'), { icon: 'plus', perm: 'dir.edit' })}</div>
      ${FD.table([t('dir.name'), t('dir.type'), t('dir.usage'), ''], list.map(c => ({ cells: [`<strong>${esc(c.name)}</strong>`, esc(t('cp.' + c.type)), FD.badge(usedCp(c.id) ? 'info' : 'ok', usedCp(c.id) ? t('dir.inUse') : t('dir.unused')), FD.btn('cp-edit', t('edit'), { ghost: true, data: `data-id="${c.id}"`, perm: 'dir.edit' }) + FD.btn('cp-del', t('dir.delete'), { ghost: true, data: `data-id="${c.id}"`, perm: 'dir.edit' })], cc: ['c-veh', '', '', 'c-act'] })))}`;
  }
  function dirDept() {
    return `<div class="fd-tools"><span class="fd-grow"></span>${FD.btn('dp-add', t('dir.addDept'), { icon: 'plus', perm: 'dir.edit' })}</div>
      ${FD.table([t('dir.name'), t('dir.head'), t('dir.vehicles'), t('dir.people'), ''], S.depts.map(d => ({ cells: [`<strong>${esc(FD.deptName(d.id))}</strong>`, esc(FD.pname(d.head)), S.vehicles.filter(v => v.dept === d.id).length, S.people.filter(p => p.dept === d.id && p.active).length, FD.btn('dp-edit', t('edit'), { ghost: true, data: `data-id="${d.id}"`, perm: 'dir.edit' })], cc: ['c-veh', '', '', '', 'c-act'] })))}`;
  }
  function dirComp() {
    return `<div class="fd-tools"><span class="fd-grow"></span>${FD.btn('co-add', t('dir.addCo'), { icon: 'plus', perm: 'dir.edit' })}</div>
      ${FD.table([t('dir.name'), t('dir.code'), t('dir.vehicles'), ''], S.companies.map(c => ({ cells: [`<strong>${esc(c.name)}</strong>`, `<span class="fd-mono">${esc(c.code)}</span>`, S.vehicles.filter(v => v.company === c.id).length, FD.btn('co-edit', t('edit'), { ghost: true, data: `data-id="${c.id}"`, perm: 'dir.edit' })], cc: ['c-veh', '', '', 'c-act'] })))}<p class="fd-hint">${esc(t('dir.coHint'))}</p>`;
  }
  const uniq = (list, f, val, self) => list.some(x => x.id !== self && String(f(x)).toLowerCase() === String(val).trim().toLowerCase());
  FD.mods.directories = {
    render() { const u = UI.dir; return `<div class="fd-modhead">${FD.tabs('dir.tab', [['staff', t('dir.tabStaff')], ['cp', t('dir.tabCp')], ['dept', t('dir.tabDept')], ['comp', t('dir.tabComp')]], u.tab, t('mod.directories'))}</div>${({ staff: dirStaff, cp: dirCp, dept: dirDept, comp: dirComp })[u.tab]()}`; },
    act(a, el) {
      const id = el.getAttribute('data-id');
      if (a === 'st-add' || a === 'st-edit') {
        const p = a === 'st-edit' ? FD.person(id) : null;
        FD.dialog({
          title: p ? t('edit') + ': ' + p.name : t('dir.addPerson'), values: p ? { name: p.name, role: p.role, dept: p.dept, msgr: p.msgr } : { role: 'driver', dept: 'dispatch', msgr: false },
          fields: () => [{ name: 'name', label: t('dir.name') }, { name: 'role', label: t('dir.role'), type: 'select', options: PROLES.map(r => [r, t('prole.' + r)]) }, { name: 'dept', label: t('col.dept'), type: 'select', options: deptOpts() }, { name: 'msgr', label: t('dir.msgrLink'), type: 'checkbox' }],
          onSubmit(f) {
            const e = {}; if (!String(f.name).trim()) e.name = t('e.req'); else if (uniq(S.people, x => x.name, f.name, p && p.id)) e.name = t('e.dup'); if (Object.keys(e).length) return e;
            if (p) Object.assign(p, { name: f.name.trim(), role: f.role, dept: f.dept, msgr: f.msgr }); else S.people.push({ id: FD.nid('p'), name: f.name.trim(), role: f.role, dept: f.dept, msgr: f.msgr, active: true });
            FD.audit(p ? 'dirEditP' : 'dirAddP', { name: f.name.trim() }); FD.toast(t('dir.saved')); return null;
          }
        });
      } else if (a === 'st-toggle') {
        const p = FD.person(id), v = S.vehicles.find(x => x.driver === p.id);
        if (p.active) {
          FD.dialog({ title: t('dir.dismiss') + ': ' + p.name, submit: t('dir.dismiss'), values: {}, fields: () => [{ type: 'info', name: 'i', text: v ? t('dir.dismissVeh', { plate: v.plate }) : t('dir.dismissNote') }], onSubmit() { p.active = false; if (v) { v.driver = null; FD.audit('driver', { plate: v.plate, name: '-' }, v.id); } FD.audit('dismiss', { name: p.name }); FD.toast(t('dir.dismissed2', { name: p.name })); return null; } });
        } else { p.active = true; FD.audit('reinstate', { name: p.name }); FD.toast(t('dir.saved')); FD.refresh(); }
      } else if (a === 'cp-add' || a === 'cp-edit') {
        const c = a === 'cp-edit' ? S.cp.find(x => x.id === id) : null;
        FD.dialog({
          title: c ? t('edit') + ': ' + c.name : t('dir.addCp'), values: c ? { name: c.name, type: c.type } : { type: 'garage' },
          fields: () => [{ name: 'name', label: t('dir.name') }, { name: 'type', label: t('dir.type'), type: 'select', options: ['garage', 'insurer', 'lab', 'owner'].map(k => [k, t('cp.' + k)]) }],
          onSubmit(f) { const e = {}; if (!String(f.name).trim()) e.name = t('e.req'); else if (uniq(S.cp, x => x.name, f.name, c && c.id)) e.name = t('e.dup'); if (c && f.type !== c.type && usedCp(c.id)) e.type = t('dir.typeLocked'); if (Object.keys(e).length) return e; if (c) { c.name = f.name.trim(); c.type = f.type; } else S.cp.push({ id: FD.nid('k'), name: f.name.trim(), type: f.type }); FD.audit(c ? 'dirEditC' : 'dirAddC', { name: f.name.trim() }); FD.toast(t('dir.saved')); return null; }
        });
      } else if (a === 'cp-del') {
        const c = S.cp.find(x => x.id === id);
        if (usedCp(id)) { FD.toast(t('dir.cantDelete', { name: c.name })); return; }
        S.cp.splice(S.cp.indexOf(c), 1); FD.audit('dirDel', { name: c.name }); FD.toast(t('dir.deleted', { name: c.name })); FD.refresh();
      } else if (a === 'dp-add' || a === 'dp-edit') {
        const d = a === 'dp-edit' ? S.depts.find(x => x.id === id) : null;
        FD.dialog({
          title: d ? t('edit') + ': ' + FD.deptName(d.id) : t('dir.addDept'), values: d ? { name: FD.deptName(d.id), head: d.head || '' } : { head: '' },
          fields: () => [{ name: 'name', label: t('dir.name') }, { name: 'head', label: t('dir.head'), type: 'select', options: [['', t('dir.noHead')]].concat(S.people.filter(p => p.active).map(p => [p.id, p.name])) }],
          onSubmit(f) { const e = {}, nm = String(f.name).trim(); if (!nm) e.name = t('e.req'); else if (S.depts.some(x => (!d || x.id !== d.id) && FD.deptName(x.id).toLowerCase() === nm.toLowerCase())) e.name = t('e.dup'); if (Object.keys(e).length) return e; if (d) { d.name = nm; d.head = f.head || null; } else S.depts.push({ id: FD.nid('d'), name: nm, head: f.head || null }); FD.audit('dirEditD', { name: nm }); FD.toast(t('dir.saved')); return null; }
        });
      } else if (a === 'co-add' || a === 'co-edit') {
        const c = a === 'co-edit' ? S.companies.find(x => x.id === id) : null;
        FD.dialog({
          title: c ? t('edit') + ': ' + c.name : t('dir.addCo'), values: c ? { name: c.name, code: c.code } : {}, fields: () => [{ name: 'name', label: t('dir.name') }, { name: 'code', label: t('dir.code'), hint: t('dir.codeHint') }],
          onSubmit(f) { const e = {}; if (!String(f.name).trim()) e.name = t('e.req'); else if (uniq(S.companies, x => x.name, f.name, c && c.id)) e.name = t('e.dup'); if (!/^[A-Z]{2}-\d{3}$/.test(String(f.code).trim().toUpperCase())) e.code = t('dir.codeErr'); else if (uniq(S.companies, x => x.code, f.code, c && c.id)) e.code = t('e.dup'); if (Object.keys(e).length) return e; const code = f.code.trim().toUpperCase(); if (c) { c.name = f.name.trim(); c.code = code; } else S.companies.push({ id: FD.nid('c'), name: f.name.trim(), code }); FD.audit('dirEditCo', { name: f.name.trim() }); FD.toast(t('dir.saved')); return null; }
        });
      }
    }
  };
}());
