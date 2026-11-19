/* Auto Diagnostic demo: garage, car card, add car, reminders, service booking. */
(function () {
  'use strict';
  const AD = window.AD, t = AD.t, esc = AD.esc, $ = AD.$, SC = AD.screens;
  const on = (root, fn) => { root.onclick = e => fn(e, sel => e.target.closest(sel)); };

  /* ---------- garage ---------- */
  SC.garage = {
    title: 'ttl.garage',
    action: () => '<button type="button" class="ad-ic" data-add="1" aria-label="' + esc(t('car.add')) + '">' + AD.icon('plus') + '</button>',
    render() {
      const S = AD.S, lim = AD.limits();
      const open = S.diags.filter(d => d.status !== 'fixed').length;
      let h = '<div class="ad-stats"><button type="button" class="ad-stat" data-go="reminders"><b class="' + (AD.remsDue() ? 'warn' : '') + '">' + AD.remsDue() + '</b><span>' + esc(t('gar.due')) + '</span></button>' +
        '<button type="button" class="ad-stat" data-go="history"><b>' + open + '</b><span>' + esc(t('gar.open')) + '</span></button>' +
        '<button type="button" class="ad-stat" data-go="plan"><b>' + (S.plan.tier === 'free' ? S.plan.used + '/' + lim.diags : '∞') + '</b><span>' + esc(t('gar.used')) + '</span></button></div>';
      h += '<ul class="ad-list">' + S.cars.map(c => {
        const nd = c.docs.map(d => ({ d: d, s: AD.docState(d) })).sort((a, b) => a.s.n - b.s.n)[0];
        return '<li><button type="button" class="ad-card ad-car' + (S.active === c.id ? ' on' : '') + '" data-car="' + c.id + '">' +
          '<span class="ad-car-ic">' + AD.icon('car', 26) + '</span><span class="ad-car-main"><b>' + esc(AD.carName(c)) + '</b>' +
          '<small>' + esc(c.year + ' · ' + c.plate + ' · ' + AD.dist(c.km)) + '</small>' +
          '<span class="ad-car-meta">' + (S.active === c.id ? AD.badge('info', t('car.active')) : '') + AD.badge(nd.s.st, t('doc.' + nd.d.k) + ' ' + (nd.s.n < 0 ? t('doc.exp') : t('doc.in', { n: nd.s.n }))) +
          (c.codes.length ? AD.badge('warn', c.codes.length + ' ' + t('car.codes')) : '') + '</span></span>' + AD.icon('right', 18) + '</button></li>';
      }).join('') + '</ul>';
      h += '<button type="button" class="ad-btn wide" data-newdiag="1">' + AD.icon('diag', 18) + esc(t('gar.diag')) + '</button>';
      h += '<button type="button" class="ad-btn ghost wide" data-go="reminders">' + AD.icon('bell', 18) + esc(t('gar.rem')) + '</button>';
      return h;
    },
    bind(root) {
      on(root, (e, c) => {
        let b;
        if ((b = c('[data-car]'))) { AD.S.active = b.getAttribute('data-car'); AD.go('car', { id: AD.S.active }); }
        else if (c('[data-newdiag]')) { const d = AD.S.draft; AD.S.draft = null; AD.tab('diagnose'); }
        else if ((b = c('[data-go]'))) { const g = b.getAttribute('data-go'); if (g === 'history') AD.tab('history'); else if (g === 'plan') AD.openIn('more', 'plan'); else AD.go('reminders'); }
      });
      const add = document.querySelector('[data-add]'); if (add) add.onclick = () => AD.go('carform');
    }
  };

  /* ---------- car card ---------- */
  SC.car = {
    title: 'ttl.car',
    render(p) {
      const S = AD.S, c = AD.car(p.id); if (!c) return '<p class="ad-empty">' + esc(t('empty.car')) + '</p>';
      const rems = S.rems.filter(r => r.carId === c.id), ds = S.diags.filter(d => d.carId === c.id).slice(0, 3);
      let h = '<div class="ad-card"><h4 class="ad-h">' + esc(AD.carName(c)) + '</h4><p class="ad-sub">' + esc(c.year + ' · ' + c.plate + ' · ' + t('tier.' + AD.MAKES[c.make])) + '</p>' +
        '<label class="ad-lab" for="ad-km">' + esc(t('car.km')) + ' (' + esc(t(S.set.units === 'mi' ? 'unit.mi' : 'unit.km')) + ')</label><div class="ad-inline"><input id="ad-km" type="number" inputmode="numeric" min="0" value="' + Math.round(AD.toU(c.km)) + '"><button type="button" class="ad-btn sm" data-km="1">' + esc(t('car.update')) + '</button></div><p class="ad-err" id="ad-km-err" role="alert"></p></div>';
      h += '<h4 class="ad-h2">' + esc(t('car.docs')) + '</h4><ul class="ad-list">' + c.docs.map((d, i) => {
        const s = AD.docState(d);
        return '<li class="ad-card row"><span class="grow"><b>' + esc(t('doc.' + d.k)) + '</b><small>' + esc(AD.fmtDate(d.d, true)) + '</small></span>' + AD.badge(s.st, s.n < 0 ? t('doc.exp') : t('doc.in', { n: s.n })) + '<button type="button" class="ad-btn sm ghost" data-ren="' + i + '">' + esc(t('doc.ren')) + '</button></li>';
      }).join('') + '</ul>';
      h += '<h4 class="ad-h2">' + esc(t('car.codesH')) + '</h4>' + (c.codes.length ? '<div class="ad-chips">' + c.codes.map(k => '<span class="ad-chip static">' + esc(k) + '<button type="button" data-rmcode="' + k + '" aria-label="' + esc(t('btn.remove') + ' ' + k) + '">' + AD.icon('x', 14) + '</button></span>').join('') + '</div>' : '<p class="ad-muted">' + esc(t('car.noCodes')) + '</p>');
      h += '<h4 class="ad-h2">' + esc(t('car.remH')) + '</h4>' + (rems.length ? '<ul class="ad-list">' + rems.map(r => { const s = AD.remStatus(r); return '<li class="ad-card row"><span class="grow"><b>' + esc(AD.remName(r)) + '</b></span>' + AD.badge(s.st === 'over' ? 'bad' : s.st === 'soon' ? 'warn' : 'ok', t('rs.' + s.st)) + '</li>'; }).join('') + '</ul>' : '<p class="ad-muted">' + esc(t('rem.none')) + '</p>');
      h += '<h4 class="ad-h2">' + esc(t('car.diagH')) + '</h4>' + (ds.length ? '<ul class="ad-list">' + ds.map(d => '<li><button type="button" class="ad-card row" data-d="' + d.id + '"><span class="grow"><b>' + esc(t('cat.' + d.cat)) + '</b><small>' + esc(AD.fmtDate(d.date)) + '</small></span>' + AD.badge(d.status === 'fixed' ? 'ok' : d.status === 'booked' ? 'info' : 'warn', t('st.' + d.status)) + '</button></li>').join('') + '</ul>' : '<p class="ad-muted">' + esc(t('car.noDiag')) + '</p>');
      h += '<div class="ad-actions"><button type="button" class="ad-btn" data-diag="1">' + esc(t('car.diag')) + '</button>' + (S.active !== c.id ? '<button type="button" class="ad-btn ghost" data-act="1">' + esc(t('car.setActive')) + '</button>' : '') + '<button type="button" class="ad-btn ghost danger" data-del="1">' + esc(t('car.remove')) + '</button></div>';
      return h;
    },
    bind(root, p) {
      const c = AD.car(p.id); if (!c) return;
      const inp = $('ad-km');
      if (p.focusKm && inp) { inp.value = Math.round(AD.toU(c.km + 4000)); setTimeout(() => inp.focus(), 50); p.focusKm = false; }
      const setKm = v => { const old = c.km; c.km = v; AD.log('car', 'lg.km', { car: AD.carName(c), km: AD.dist(v) }); AD.toast(t('car.kmOk')); AD.render(false); };
      on(root, (e, q) => {
        let b;
        if (q('[data-km]')) {
          const v = Math.round(AD.fromU(parseFloat(inp.value))), err = $('ad-km-err');
          if (isNaN(v) || v < 0 || v > 999999) { err.textContent = t('err.km'); return; }
          err.textContent = '';
          if (v < c.km) AD.confirm(t('car.lowH'), t('car.lowP'), t('btn.confirm'), () => setKm(v)); else if (v !== c.km) setKm(v);
        } else if ((b = q('[data-ren]'))) {
          const d = c.docs[+b.getAttribute('data-ren')]; d.d = d.d < AD.day0 ? AD.addDays(365) : d.d + 365 * 86400000;
          AD.log('car', 'lg.doc', { car: AD.carName(c), doc: t('doc.' + d.k) }); AD.toast(t('doc.renOk')); AD.render(false);
        } else if ((b = q('[data-rmcode]'))) {
          c.codes = c.codes.filter(k => k !== b.getAttribute('data-rmcode')); AD.render(false);
        } else if ((b = q('[data-d]'))) { AD.openIn('history', 'result', { id: b.getAttribute('data-d') }); }
        else if (q('[data-diag]')) { AD.S.draft = null; AD.S.active = c.id; AD.tab('diagnose'); }
        else if (q('[data-act]')) { AD.S.active = c.id; AD.toast(t('car.activeOk')); AD.render(false); }
        else if (q('[data-del]')) {
          if (AD.S.cars.length < 2) { AD.sheet({ title: t('car.lastH'), body: '<p>' + esc(t('car.lastP')) + '</p>', actions: [{ label: t('btn.ok') }] }); return; }
          AD.confirm(t('car.delH'), t('car.delP'), t('car.remove'), () => {
            AD.S.cars = AD.S.cars.filter(x => x.id !== c.id); AD.S.rems = AD.S.rems.filter(r => r.carId !== c.id);
            if (AD.S.active === c.id) AD.S.active = AD.S.cars[0].id;
            AD.log('car', 'lg.carDel', { car: AD.carName(c) }); AD.back();
          }, true);
        }
      });
    }
  };

  /* ---------- add car ---------- */
  SC.carform = {
    title: 'ttl.carform',
    render() {
      const lim = AD.limits();
      if (AD.S.cars.length >= lim.cars) return '<div class="ad-card"><h4 class="ad-h">' + esc(t('car.limH')) + '</h4><p class="ad-sub">' + esc(t('car.limP', { n: lim.cars })) + '</p><button type="button" class="ad-btn wide" data-plan="1">' + esc(t('plan.see')) + '</button></div>';
      return '<form class="ad-form" novalidate id="ad-cf">' +
        '<label class="ad-lab" for="cf-make">' + esc(t('f.make')) + '</label><select id="cf-make">' + Object.keys(AD.MAKES).map(m => '<option>' + esc(m) + '</option>').join('') + '</select>' +
        '<label class="ad-lab" for="cf-model">' + esc(t('f.model')) + '</label><input id="cf-model" type="text" maxlength="24" autocomplete="off"><p class="ad-err" id="cf-e1" role="alert"></p>' +
        '<label class="ad-lab" for="cf-year">' + esc(t('f.year')) + '</label><input id="cf-year" type="number" inputmode="numeric" value="2019"><p class="ad-err" id="cf-e2" role="alert"></p>' +
        '<label class="ad-lab" for="cf-plate">' + esc(t('f.plate')) + '</label><input id="cf-plate" type="text" maxlength="12" placeholder="AB 0000 XX" autocomplete="off"><p class="ad-err" id="cf-e3" role="alert"></p>' +
        '<label class="ad-lab" for="cf-km">' + esc(t('car.km')) + '</label><input id="cf-km" type="number" inputmode="numeric" value="80000"><p class="ad-err" id="cf-e4" role="alert"></p>' +
        '<button type="submit" class="ad-btn wide">' + esc(t('car.save')) + '</button></form>';
    },
    bind(root) {
      const pl = root.querySelector('[data-plan]'); if (pl) pl.onclick = () => AD.openIn('more', 'plan');
      const f = $('ad-cf'); if (!f) return;
      f.onsubmit = e => {
        e.preventDefault();
        const model = $('cf-model').value.trim(), year = parseInt($('cf-year').value, 10), plate = $('cf-plate').value.trim().toUpperCase(), km = parseInt($('cf-km').value, 10);
        const E = { 1: model.length < 2 ? t('err.model') : '', 2: (isNaN(year) || year < 1990 || year > 2027) ? t('err.year') : '', 3: plate && !/^[A-Z0-9 -]{4,12}$/.test(plate) ? t('err.plate') : '', 4: (isNaN(km) || km < 0 || km > 999999) ? t('err.km') : '' };
        let bad = false; for (const k in E) { $('cf-e' + k).textContent = E[k]; if (E[k]) bad = true; }
        if (bad) return;
        const S = AD.S, make = $('cf-make').value, c = { id: 'c' + (S.carSeq++), make: make, model: model, year: year, plate: plate || '—', km: AD.fromU(km) === km ? km : Math.round(AD.fromU(km)), docs: [{ k: 'ins', d: AD.addDays(200) }, { k: 'insp', d: AD.addDays(300) }], codes: [] };
        S.cars.push(c); S.active = c.id;
        S.rems.push({ id: 'r' + (S.remSeq++), carId: c.id, kind: 'oil', every: 10000, months: 12, lastKm: c.km, lastD: AD.day0, on: true });
        AD.log('car', 'lg.carAdd', { car: AD.carName(c) }); AD.toast(t('car.addOk'));
        AD.S.nav.stack = [{ id: 'garage', p: {} }, { id: 'car', p: { id: c.id } }]; AD.render(true);
      };
    }
  };

  /* ---------- reminders ---------- */
  AD.remName = r => r.name ? r.name : t('rk.' + r.kind);
  SC.reminders = {
    title: 'ttl.rem',
    action: () => '<button type="button" class="ad-ic" data-addrem="1" aria-label="' + esc(t('rem.add')) + '">' + AD.icon('plus') + '</button>',
    render(p) {
      const S = AD.S, f = p.car || 'all';
      const list = S.rems.filter(r => f === 'all' || r.carId === f);
      const order = { over: 0, soon: 1, ok: 2 };
      list.sort((a, b) => order[AD.remStatus(a).st] - order[AD.remStatus(b).st]);
      const due = S.rems.filter(r => r.on && AD.remStatus(r).st !== 'ok')[0];
      let h = '<div class="ad-chips scroll">' + [['all', t('f.all')]].concat(S.cars.map(c => [c.id, AD.carName(c)])).map(x => '<button type="button" class="ad-chip" data-fc="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
      h += '<div class="ad-push">' + AD.icon('bell', 18) + '<span>' + (!S.set.nRem ? esc(t('rem.pushOff')) : due ? esc(t('rem.push', { name: AD.remName(due), car: AD.carName(AD.car(due.carId)) })) : esc(t('rem.pushNone'))) + '</span></div>';
      h += list.length ? '<ul class="ad-list">' + list.map(r => {
        const s = AD.remStatus(r), c = AD.car(r.carId), bits = [];
        if (s.kmLeft != null) bits.push(s.kmLeft < 0 ? t('rem.kmOver', { n: AD.dist(-s.kmLeft) }) : t('rem.kmLeft', { n: AD.dist(s.kmLeft) }));
        if (s.daysLeft != null) bits.push(s.daysLeft < 0 ? t('rem.dOver', { n: -s.daysLeft }) : t('rem.dLeft', { n: s.daysLeft }));
        return '<li class="ad-card"><div class="ad-row2"><span class="grow"><b>' + esc(AD.remName(r)) + '</b><small>' + esc(AD.carName(c)) + '</small></span>' + AD.badge(s.st === 'over' ? 'bad' : s.st === 'soon' ? 'warn' : 'ok', t('rs.' + s.st)) + '</div><p class="ad-sub">' + esc(bits.join(' · ')) + '</p>' +
          '<div class="ad-actions"><button type="button" class="ad-btn sm" data-done="' + r.id + '">' + esc(t('rem.done')) + '</button><button type="button" class="ad-btn sm ghost" data-tg="' + r.id + '" aria-pressed="' + r.on + '">' + esc(r.on ? t('rem.on') : t('rem.off')) + '</button><button type="button" class="ad-btn sm ghost" data-book="' + r.id + '">' + esc(t('rem.book')) + '</button><button type="button" class="ad-ic sm" data-delr="' + r.id + '" aria-label="' + esc(t('btn.remove')) + '">' + AD.icon('trash', 18) + '</button></div></li>';
      }).join('') + '</ul>' : '<p class="ad-empty">' + esc(t('rem.none')) + '</p>';
      return h;
    },
    bind(root, p) {
      const S = AD.S;
      const add = document.querySelector('[data-addrem]');
      if (add) add.onclick = () => {
        AD.sheet({
          title: t('rem.add'), keepOpen: true,
          body: '<label class="ad-lab" for="rm-car">' + esc(t('f.car')) + '</label><select id="rm-car">' + S.cars.map(c => '<option value="' + c.id + '"' + (c.id === S.active ? ' selected' : '') + '>' + esc(AD.carName(c)) + '</option>').join('') + '</select>' +
            '<label class="ad-lab" for="rm-kind">' + esc(t('rem.kind')) + '</label><select id="rm-kind">' + Object.keys(AD.REM_KINDS).map(k => '<option value="' + k + '">' + esc(t('rk.' + k)) + '</option>').join('') + '</select>' +
            '<label class="ad-lab" for="rm-km">' + esc(t('rem.everyKm')) + '</label><input id="rm-km" type="number" inputmode="numeric" value="10000">' +
            '<label class="ad-lab" for="rm-mo">' + esc(t('rem.everyMo')) + '</label><input id="rm-mo" type="number" inputmode="numeric" value="12"><p class="ad-err" id="rm-err" role="alert"></p>',
          actions: [{ label: t('btn.cancel'), cls: 'ghost' }, { label: t('btn.save'), keep: true, fn: () => {
            const km = parseInt($('rm-km').value, 10) || 0, mo = parseInt($('rm-mo').value, 10) || 0;
            if (km <= 0 && mo <= 0) { $('rm-err').textContent = t('err.interval'); return; }
            const car = AD.car($('rm-car').value), kind = $('rm-kind').value;
            S.rems.push({ id: 'r' + (S.remSeq++), carId: car.id, kind: kind, every: Math.round(AD.fromU(km)), months: mo, lastKm: car.km, lastD: AD.day0, on: true });
            AD.log('rem', 'lg.remAdd', { car: AD.carName(car), name: t('rk.' + kind) }); AD.closeSheet(); AD.toast(t('rem.addOk')); AD.render(false);
          } }]
        });
        const sel = $('rm-kind');
        sel.onchange = () => { const d = AD.REM_KINDS[sel.value]; $('rm-km').value = Math.round(AD.toU(d[0])); $('rm-mo').value = d[1]; };
        sel.onchange();
      };
      on(root, (e, q) => {
        let b;
        if ((b = q('[data-fc]'))) { p.car = b.getAttribute('data-fc'); AD.render(false); }
        else if ((b = q('[data-done]'))) {
          const r = S.rems.filter(x => x.id === b.getAttribute('data-done'))[0], c = AD.car(r.carId);
          r.lastKm = c.km; r.lastD = AD.day0; AD.log('rem', 'lg.remDone', { car: AD.carName(c), name: AD.remName(r) }); AD.toast(t('rem.doneOk')); AD.render(false);
        } else if ((b = q('[data-tg]'))) { const r = S.rems.filter(x => x.id === b.getAttribute('data-tg'))[0]; r.on = !r.on; AD.render(false); }
        else if ((b = q('[data-book]'))) { const r = S.rems.filter(x => x.id === b.getAttribute('data-book'))[0]; AD.openIn('more', 'book', { init: true, carId: r.carId, remName: AD.remName(r) }); }
        else if ((b = q('[data-delr]'))) { const id = b.getAttribute('data-delr'); AD.confirm(t('rem.delH'), t('rem.delP'), t('btn.remove'), () => { S.rems = S.rems.filter(x => x.id !== id); AD.render(false); }, true); }
      });
    }
  };

  /* ---------- bookings list ---------- */
  SC.bookings = {
    title: 'ttl.book',
    action: () => '<button type="button" class="ad-ic" data-newbk="1" aria-label="' + esc(t('bk.new')) + '">' + AD.icon('plus') + '</button>',
    render() {
      const S = AD.S, up = S.bookings.filter(b => b.status === 'booked'), past = S.bookings.filter(b => b.status !== 'booked');
      const card = b => {
        const s = AD.svc(b.svc), c = AD.car(b.carId);
        return '<li class="ad-card"><div class="ad-row2"><span class="grow"><b>' + esc(s.name) + '</b><small>' + esc(AD.carName(c)) + '</small></span>' + AD.badge(b.status === 'booked' ? 'info' : b.status === 'done' ? 'ok' : 'bad', t('bk.' + b.status)) + '</div>' +
          '<p class="ad-sub">' + esc(AD.fmtDate(b.date, true) + ' · ' + b.slot) + '</p><p class="ad-sub">' + esc(b.job ? t('cz.' + b.job + '.n') : (b.remName || t('bk.general'))) + '</p>' +
          (b.status === 'booked' ? '<div class="ad-actions"><button type="button" class="ad-btn sm" data-fin="' + b.id + '">' + esc(t('bk.finish')) + '</button><button type="button" class="ad-btn sm ghost" data-res="' + b.id + '">' + esc(t('bk.resched')) + '</button><button type="button" class="ad-btn sm ghost danger" data-can="' + b.id + '">' + esc(t('bk.cancel')) + '</button></div>' : '') + '</li>';
      };
      return '<h4 class="ad-h2">' + esc(t('bk.up')) + '</h4>' + (up.length ? '<ul class="ad-list">' + up.map(card).join('') + '</ul>' : '<p class="ad-empty">' + esc(t('bk.noUp')) + '</p>') +
        '<h4 class="ad-h2">' + esc(t('bk.past')) + '</h4>' + (past.length ? '<ul class="ad-list">' + past.map(card).join('') + '</ul>' : '<p class="ad-muted">' + esc(t('bk.noPast')) + '</p>');
    },
    bind(root) {
      const S = AD.S, nb = document.querySelector('[data-newbk]'); if (nb) nb.onclick = () => AD.go('book', { init: true });
      const by = id => S.bookings.filter(b => b.id === id)[0];
      on(root, (e, q) => {
        let b;
        if ((b = q('[data-can]'))) { const bk = by(b.getAttribute('data-can')); AD.confirm(t('bk.canH'), t('bk.canP'), t('bk.cancel'), () => { bk.status = 'canceled'; const d = AD.diag(bk.diagId); if (d && d.status === 'booked') { d.status = 'open'; d.bookingId = null; } AD.log('book', 'lg.bkCan', { svc: AD.svc(bk.svc).name }); AD.toast(t('bk.canOk')); AD.render(false); }, true); }
        else if ((b = q('[data-fin]'))) {
          const bk = by(b.getAttribute('data-fin')); bk.status = 'done';
          const d = AD.diag(bk.diagId); if (d) d.status = 'fixed';
          const car = AD.car(bk.carId); S.rems.forEach(r => { if (r.carId === car.id && bk.remName && AD.remName(r) === bk.remName) { r.lastKm = car.km; r.lastD = AD.day0; } });
          AD.log('book', 'lg.done', { svc: AD.svc(bk.svc).name }); AD.toast(t('bk.finOk')); AD.render(false);
        } else if ((b = q('[data-res]'))) { AD.go('book', { init: true, resched: b.getAttribute('data-res') }); }
      });
    }
  };

  /* ---------- book a service ---------- */
  const open = (svc, day, slot) => {
    const dt = new Date(day), idx = AD.SLOTS.indexOf(slot);
    const fake = ((svc.id.charCodeAt(1) + dt.getDate() + idx * 3) % 4) === 0;
    const real = AD.S.bookings.some(b => b.status === 'booked' && b.svc === svc.id && b.date === day && b.slot === slot);
    return !(fake || real);
  };
  const days = () => { const a = []; for (let i = 1; a.length < 7; i++) { const ms = AD.addDays(i); if (new Date(ms).getDay() !== 0) a.push(ms); } return a; };
  SC.book = {
    title: 'ttl.bookf',
    render(p) {
      const S = AD.S;
      if (p.init) {
        const b = p.resched ? S.bookings.filter(x => x.id === p.resched)[0] : null;
        const d = p.diagId ? AD.diag(p.diagId) : null;
        S.bk = { id: b ? b.id : null, carId: b ? b.carId : (d ? d.carId : (p.carId || S.active)), svc: b ? b.svc : (p.svc || null), day: null, slot: null, diagId: b ? b.diagId : (p.diagId || null), job: b ? b.job : (p.cause || null), remName: b ? b.remName : p.remName || null, err: '' };
        if (!S.bk.svc) { const m = AD.SERVICES.filter(s => s.region === S.set.region && s.cls === S.set.cls)[0]; S.bk.svc = m ? m.id : null; }
        p.init = false;
      }
      const k = S.bk, sv = AD.svc(k.svc);
      let h = '<label class="ad-lab" for="bk-car">' + esc(t('f.car')) + '</label><select id="bk-car">' + S.cars.map(c => '<option value="' + c.id + '"' + (c.id === k.carId ? ' selected' : '') + '>' + esc(AD.carName(c)) + '</option>').join('') + '</select>';
      h += '<div class="ad-card"><small class="ad-k">' + esc(t('bk.job')) + '</small><b>' + esc(k.job ? t('cz.' + k.job + '.n') : (k.remName || t('bk.general'))) + '</b></div>';
      h += '<h4 class="ad-h2">' + esc(t('bk.svc')) + '</h4><ul class="ad-list">' + AD.SERVICES.map(s => '<li><button type="button" class="ad-card ad-svc' + (k.svc === s.id ? ' on' : '') + '" data-svc="' + s.id + '" aria-pressed="' + (k.svc === s.id) + '"><b>' + esc(s.name) + '</b><small>' + esc(t('reg.' + s.region) + ' · ' + t('cls.' + s.cls) + ' · ' + s.dist + ' ' + t('unit.km') + ' · ' + s.rate) + '</small>' + ((s.region === S.set.region && s.cls === S.set.cls) ? AD.badge('info', t('bk.rec')) : '') + '</button></li>').join('') + '</ul>';
      h += '<h4 class="ad-h2">' + esc(t('bk.day')) + '</h4><div class="ad-chips scroll">' + days().map(d => '<button type="button" class="ad-chip" data-day="' + d + '" aria-pressed="' + (k.day === d) + '">' + esc(AD.fmtDay(d)) + '</button>').join('') + '</div>';
      h += '<h4 class="ad-h2">' + esc(t('bk.slot')) + '</h4>';
      if (k.day && sv) h += '<div class="ad-slots">' + AD.SLOTS.map(s => { const ok = open(sv, k.day, s); return '<button type="button" class="ad-chip" data-slot="' + s + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + (k.slot === s) + '">' + s + (ok ? '' : '<small>' + esc(t('bk.taken')) + '</small>') + '</button>'; }).join('') + '</div>';
      else h += '<p class="ad-muted">' + esc(t('bk.pickDay')) + '</p>';
      h += '<p class="ad-err" role="alert">' + esc(k.err) + '</p><button type="button" class="ad-btn wide" data-ok="1">' + esc(t(k.id ? 'bk.confirmRes' : 'bk.confirm')) + '</button>';
      return h;
    },
    bind(root, p) {
      const S = AD.S, k = S.bk;
      const car = $('bk-car'); if (car) car.onchange = () => { k.carId = car.value; };
      on(root, (e, q) => {
        let b;
        if ((b = q('[data-svc]'))) { k.svc = b.getAttribute('data-svc'); k.slot = null; k.err = ''; AD.render(false); }
        else if ((b = q('[data-day]'))) { k.day = +b.getAttribute('data-day'); k.slot = null; k.err = ''; AD.render(false); }
        else if ((b = q('[data-slot]'))) { k.slot = b.getAttribute('data-slot'); k.err = ''; AD.render(false); }
        else if (q('[data-ok]')) {
          if (!k.svc || !k.day || !k.slot) { k.err = t('err.slot'); AD.render(false); return; }
          const sv = AD.svc(k.svc), c = AD.car(k.carId);
          AD.sheet({
            title: t('bk.sumH'), body: '<ul class="ad-sum"><li><span>' + esc(t('f.car')) + '</span><b>' + esc(AD.carName(c)) + '</b></li><li><span>' + esc(t('bk.svc')) + '</span><b>' + esc(sv.name) + '</b></li><li><span>' + esc(t('bk.when')) + '</span><b>' + esc(AD.fmtDate(k.day, true) + ', ' + k.slot) + '</b></li><li><span>' + esc(t('bk.job')) + '</span><b>' + esc(k.job ? t('cz.' + k.job + '.n') : (k.remName || t('bk.general'))) + '</b></li></ul>',
            actions: [{ label: t('btn.cancel'), cls: 'ghost' }, { label: t(k.id ? 'bk.confirmRes' : 'bk.confirm'), fn: () => {
              let bk;
              if (k.id) { bk = S.bookings.filter(x => x.id === k.id)[0]; bk.date = k.day; bk.slot = k.slot; bk.svc = k.svc; bk.carId = k.carId; AD.log('book', 'lg.bkRes', { svc: sv.name }); }
              else {
                bk = { id: 'b' + (S.bookSeq++), carId: k.carId, svc: k.svc, date: k.day, slot: k.slot, job: k.job, remName: k.remName, diagId: k.diagId, status: 'booked', note: '' };
                S.bookings.unshift(bk); AD.log('book', 'lg.bk', { svc: sv.name, car: AD.carName(c) });
                const d = AD.diag(k.diagId); if (d) { d.bookingId = bk.id; if (d.status === 'open') d.status = 'booked'; }
              }
              AD.toast(t('bk.okToast'));
              S.nav.tab = 'more'; S.nav.stack = [{ id: 'more', p: {} }, { id: 'bookings', p: {} }]; AD.render(true);
            } }]
          });
        }
      });
    }
  };
}());
