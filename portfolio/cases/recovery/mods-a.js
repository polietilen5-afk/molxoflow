/* Recovery Desk demo modules: overview, payment events, failed-payment cases (with card), customers. */
(function () {
  'use strict';
  const RC = window.RC, S = RC.S, t = RC.t, esc = RC.esc, UI = RC.ui;
  const fresh = () => ({
    events: { q: '', type: 'all', st: 'all', sel: null }, cases: { q: '', st: 'all', reason: 'all' }, customers: { q: '', h: 'all' },
    ctab: 'timeline', campaigns: { tab: 'active' }, rules: { code: 'expired_card', attempt: '1' },
    studio: { caseId: '', tpl: 'soft_followup', tone: 'friendly', subject: '', body: '', busy: false, fallback: false },
    outbox: { st: 'all', q: '', open: null }, portal: { caseId: '', step: 'form', decline: false }, analytics: { tab: 'summary' },
    integ: {}, privacy: { tab: 'policy' }, access: { tab: 'users' }, audit: { who: 'all', q: '', ent: 'all' }
  });
  Object.assign(UI, fresh());
  UI.reset = () => { const f = fresh(); Object.keys(f).forEach(k => { UI[k] = f[k]; }); };
  const isOpen = c => c.status === 'campaign' || c.status === 'paused' || c.status === 'attention';
  const ago = d => RC.fmtStamp(d);
  RC.openCases = () => S.cases.filter(isOpen);
  RC.eligible = () => S.customers.filter(c => c.status !== 'canceled' && !RC.openOf(c.id));
  RC.stepDots = c => `<span class="rc-stp" aria-label="${esc(t('cs.progress', { a: c.steps.filter(s => s.state === 'sent').length, b: c.steps.length }))}">${c.steps.map(s => `<i class="${s.state}"></i>`).join('')}</span>`;
  RC.cardExp = cu => String(cu.exp.m).padStart(2, '0') + '/' + String(cu.exp.y).slice(2);
  RC.cardState = cu => { const n = S.now, y = n.getFullYear(), m = n.getMonth() + 1; return cu.exp.y < y || (cu.exp.y === y && cu.exp.m < m) ? 'exp' : (cu.exp.y === y && cu.exp.m <= m + 1) ? 'soon' : 'ok'; };
  RC.letter = (m) => {
    const c = RC.caseById(m.caseId), cu = RC.cust(m.cid);
    if (m.custom) return m.custom;
    const v = { name: cu ? cu.contact.split(' ')[0] : '', plan: t('plan.' + (cu ? cu.plan : 'pro')), reason: t('reasonh.' + (c ? c.reason : 'card_declined')), amount: RC.fmtMoney(c ? c.amount : 0), link: 'recovery.demo/pay/' + RC.hex8(RC.hs(m.caseId || m.id)).slice(0, 6) };
    return { subject: t('tpl.' + m.tpl + '.subj', v), body: t('tpl.' + m.tpl + '.body', v) };
  };
  const kpiCases = (act, st, n, label, tone) => RC.kpi(act, `data-st="${st}"`, n, label, tone);

  /* ================= overview ================= */
  RC.mods.overview = {
    render() {
      const open = RC.openCases(), camp = S.cases.filter(c => c.status === 'campaign'), att = S.cases.filter(c => c.status === 'attention');
      const rec = S.cases.filter(c => c.status === 'recovered'), sum = a => a.reduce((x, c) => x + c.amount, 0);
      const mailsToday = S.mails.filter(m => m.sentAt && RC.sameDay(m.sentAt, S.now)).length;
      const nextUp = camp.map(c => ({ c, s: RC.nextStep(c) })).filter(x => x.s).sort((a, b) => a.s.due - b.s.due).slice(0, 5);
      const withMail = S.cases.filter(c => c.steps.some(s => s.state === 'sent')).length;
      const opened = S.cases.filter(c => S.mails.some(m => m.caseId === c.id && (m.state === 'opened' || m.state === 'clicked'))).length;
      const clicked = S.cases.filter(c => S.mails.some(m => m.caseId === c.id && m.state === 'clicked')).length;
      const fun = [[t('ov.f1'), S.cases.length], [t('ov.f2'), withMail], [t('ov.f3'), opened], [t('ov.f4'), clicked], [t('ov.f5'), rec.length]];
      const todo = S.mails.filter(m => m.state === 'review' || m.state === 'failed' || m.state === 'bounced');
      const rec6 = S.audit.slice(0, 6);
      return `<div class="rc-kpis">${[
        kpiCases('ov-f', 'open', open.length, t('ov.open'), 'info'), kpiCases('ov-f', 'campaign', camp.length, t('ov.camp'), 'info'), kpiCases('ov-f', 'attention', att.length, t('ov.att'), att.length ? 'bad' : 'ok'),
        kpiCases('ov-f', 'recovered', RC.fmtMoney(sum(rec)), t('ov.rec'), 'ok'), kpiCases('ov-f', 'open', RC.fmtMoney(sum(open)), t('ov.risk'), 'warn'), RC.kpi('ov-out', '', mailsToday, t('ov.mails'), 'info')].join('')}</div>
      <section class="rc-pane rc-guide"><h3 class="rc-h3">${esc(t('ov.guideH'))}</h3><ol class="rc-gsteps">
        <li><span>${esc(t('ov.g1'))}</span>${RC.btn('ov-sim', t('ov.g1b'), { perm: 'act', icon: 'events' })}</li>
        <li><span>${esc(t('ov.g2'))}</span>${RC.btn('ov-tick', t('sim.tick'), { perm: 'act', icon: 'clock' })}</li>
        <li><span>${esc(t('ov.g3'))}</span>${RC.btn('ov-portal', t('ov.g3b'), { ghost: true, icon: 'portal' })}</li></ol></section>
      <div class="rc-grid2">
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('ov.funnel'))}</h3><ul class="rc-bars">${fun.map((f, i) => `<li><span class="rc-bl">${esc(f[0])}</span><span class="rc-bw">${RC.bar(S.cases.length ? f[1] / S.cases.length * 100 : 0, i === 4 ? '' : 'info')}</span><b>${f[1]}</b></li>`).join('')}</ul></section>
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('ov.next'))}</h3>${nextUp.length ? `<ul class="rc-list">${nextUp.map(x => `<li><button type="button" class="rc-ev" data-act="open-case" data-id="${x.c.id}"><span class="rc-evb"><strong>${esc(RC.cname(x.c.cid))}</strong><span class="rc-muted">${esc(t('ov.step', { n: x.s.n, tpl: t('tpl.' + RC.stepTpl(x.c, x.s.n) + '.n') }))}</span></span>${RC.badge(x.s.due <= S.now ? 'warn' : 'info', RC.fmtStamp(x.s.due))}</button></li>`).join('')}</ul>` : RC.empty(t('ov.nonext'))}
          ${RC.btn('goto', t('ov.allCamp'), { ghost: true, cls: 'rc-more', data: 'data-mod="campaigns"' })}</section>
      </div>
      <div class="rc-grid2">
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('ov.todo'))}</h3>${att.length + todo.length ? `<ul class="rc-list">${att.map(c => `<li><button type="button" class="rc-ev overdue" data-act="open-case" data-id="${c.id}"><span class="rc-evb"><strong>${esc(RC.cname(c.cid))}</strong><span class="rc-muted">${esc(t('ov.hard', { reason: t('reason.' + c.reason) }))}</span></span>${RC.badge('bad', t('cst.attention'))}</button></li>`).join('')}${todo.slice(0, 4).map(m => `<li><button type="button" class="rc-ev soon" data-act="goto" data-mod="outbox" data-ui="outbox.open=${m.id}"><span class="rc-evb"><strong>${esc(RC.cname(m.cid))}</strong><span class="rc-muted">${esc(t('tpl.' + m.tpl + '.n'))}</span></span>${RC.badge(m.state === 'review' ? 'info' : 'warn', t('mst.' + m.state))}</button></li>`).join('')}</ul>` : RC.empty(t('ov.alldone'))}</section>
        <section class="rc-pane"><h3 class="rc-h3">${esc(t('ov.recent'))}</h3><ul class="rc-hist">${rec6.map(a => `<li><span class="rc-dot"></span><div><strong>${esc(RC.auditText(a))}</strong><span class="rc-muted">${esc(a.who === 'system' ? t('who.system') : a.who)} / ${esc(ago(a.at))}</span></div></li>`).join('')}</ul></section>
      </div>`;
    },
    act(a, el) {
      if (a === 'ov-f') { const st = el.getAttribute('data-st'); UI.cases.q = ''; UI.cases.reason = 'all'; UI.cases.st = st; RC.go('cases', () => { S.sel = null; }); }
      if (a === 'ov-out') RC.go('outbox');
      if (a === 'ov-sim') RC.go('events', null), RC.mods.events.simulate();
      if (a === 'ov-tick') { const r = RC.tick(1); RC.refresh(); RC.toast(t('sim.done', { s: r.sent, r: r.rec, l: r.lost })); }
      if (a === 'ov-portal') RC.go('portal');
    }
  };

  /* ================= payment events ================= */
  const EV_TYPES = ['invoice.payment_failed', 'invoice.paid', 'payment_method.updated', 'subscription.canceled'];
  const evTone = s => ({ processed: 'ok', merged: 'info', duplicate: 'warn', rejected: 'bad' }[s] || 'info');
  RC.mods.events = {
    simulate() {
      const el = RC.eligible();
      if (!S.integ.provider.on) { RC.toast(t('ev.off')); return; }
      if (!el.length) { RC.toast(t('ev.noCust')); return; }
      RC.dialog({
        title: t('ev.simTitle'), note: t('ev.simNote'), submit: t('ev.simGo'), values: { cid: el[0].id, reason: 'expired_card', amount: String(RC.PLANS[el[0].plan]) },
        fields: v => [
          { name: 'cid', label: t('f.customer'), type: 'select', options: el.map(c => [c.id, c.name + ' / ' + t('plan.' + c.plan)]) },
          { name: 'reason', label: t('f.reason'), type: 'select', options: RC.CODES.map(k => [k, t('reason.' + k)]) },
          { name: 'amount', label: t('f.amount'), type: 'number', hint: t('f.amountHint') }],
        onSubmit(v) {
          const e = {}, amt = Number(v.amount);
          if (!v.cid || !RC.cust(v.cid)) e.cid = t('err.required');
          if (!(amt > 0) || amt > 100000 || Math.floor(amt) !== amt) e.amount = t('err.amount');
          if (Object.keys(e).length) return e;
          const r = RC.receive({ cid: v.cid, reason: v.reason, amount: amt });
          UI.events.sel = r.ev ? r.ev.id : null;
          RC.toast(r.ev.status === 'processed' ? t('ev.ok', { c: r.c.id, n: r.c.status === 'attention' ? t('ev.okAtt') : t('ev.okCamp') }) : t('ev.' + r.ev.status));
        }
      });
    },
    replay() {
      const last = S.events.find(e => e.type === 'invoice.payment_failed' && e.status !== 'duplicate' && e.cid);
      if (!last) return;
      const r = RC.receive({ id: last.id, cid: last.cid, reason: last.reason, amount: last.amount });
      if (r.err) { RC.toast(t('ev.off')); return; }
      UI.events.sel = r.ev.id; RC.toast(t('ev.' + r.ev.status));
    },
    render() {
      const U = UI.events, q = U.q.trim().toLowerCase();
      let rows = S.events.filter(e => (U.type === 'all' || e.type === U.type) && (U.st === 'all' || e.status === U.st) && (!q || e.id.toLowerCase().indexOf(q) >= 0 || RC.cname(e.cid).toLowerCase().indexOf(q) >= 0));
      const tr = rows.slice(0, 40).map(e => ({ attr: `data-act="ev-sel" data-id="${e.id}"`, cls: U.sel === e.id ? 'sel' : '', cc: ['', 'c-veh'], cells: [esc(ago(e.at)), `<span class="rc-mono">${esc(t('evt.' + e.type))}</span><span class="rc-muted rc-mono">${esc(e.id)}</span>`, e.cid ? RC.custLink(e.cid) : `<span class="rc-muted">${esc(t('anon'))}</span>`, e.amount != null ? RC.fmtMoney(e.amount) : '', RC.badge(evTone(e.status), t('est.' + e.status)), e.caseId && RC.caseById(e.caseId) ? RC.caseLink(RC.caseById(e.caseId)) : ''] }));
      const sel = S.events.find(e => e.id === U.sel);
      return `<div class="rc-tools">${RC.search('events.q', U.q, t('ev.search'), 'evq')}${RC.btn('ev-sim', t('ev.sim'), { perm: 'act', icon: 'plus' })}${RC.btn('ev-replay', t('ev.replay'), { perm: 'act', ghost: true, icon: 'reset' })}</div>
      <div class="rc-tools rc-tools2">${RC.chips('events.type', [['all', t('f.all')]].concat(EV_TYPES.map(k => [k, t('evt.' + k)])), U.type)}</div>
      <div class="rc-tools rc-tools2">${RC.chips('events.st', [['all', t('f.all')]].concat(['processed', 'merged', 'duplicate', 'rejected'].map(k => [k, t('est.' + k)])), U.st)}</div>
      <p class="rc-count">${esc(t('f.count', { n: rows.length }))}${S.integ.provider.on ? '' : ' / ' + esc(t('ev.off'))}</p>
      ${rows.length ? RC.table([t('col.time'), t('col.event'), t('col.customer'), t('col.amount'), t('col.result'), t('col.case')], tr) : RC.empty(t('f.none'), t('f.noneHint'))}
      ${sel ? this.payload(sel) : `<p class="rc-hint">${esc(t('ev.pickHint'))}</p>`}`;
    },
    payload(e) {
      const cu = e.cid ? RC.cust(e.cid) : null;
      const obj = { id: e.id, type: e.type, created: e.at.toISOString().slice(0, 19) + 'Z', data: { object: { customer: cu ? 'cu_' + RC.hex8(RC.hs(cu.id)).slice(0, 8) : null, amount_due: e.amount, currency: 'cu', attempt_count: 1, last_error: e.reason || null } } };
      const sig = e.status === 'rejected' ? 'bad' : 'ok';
      return `<section class="rc-pane rc-mt"><div class="rc-dhead"><h3 class="rc-h3">${esc(t('ev.payload'))} <span class="rc-mono">${esc(e.id)}</span></h3>${RC.badge(evTone(e.status), t('est.' + e.status))}</div>
        <ul class="rc-checks"><li class="${sig}">${esc(t('ev.chkSig'))}: <b>${esc(t(sig === 'ok' ? 'ev.valid' : 'ev.invalid'))}</b></li><li class="${e.status === 'duplicate' ? 'warn' : 'ok'}">${esc(t('ev.chkIdem'))}: <b>${esc(t(e.status === 'duplicate' ? 'ev.seen' : 'ev.first'))}</b></li><li class="ok">${esc(t('ev.chkQueue'))}: <b>${esc(t(e.status === 'processed' || e.status === 'merged' ? 'ev.acked' : 'ev.held'))}</b></li></ul>
        <pre class="rc-code" tabindex="0">${esc(JSON.stringify(obj, null, 2))}</pre></section>`;
    },
    act(a, el) {
      if (a === 'ev-sim') this.simulate();
      if (a === 'ev-replay') { this.replay(); RC.refresh(); }
      if (a === 'ev-sel') { UI.events.sel = el.getAttribute('data-id'); RC.paint(); }
    }
  };

  /* ================= cases ================= */
  const noteDialog = c => RC.dialog({
    title: t('cs.noteH'), values: { text: '' }, fields: () => [{ name: 'text', label: t('cs.noteL'), type: 'textarea' }],
    onSubmit(v) { const x = (v.text || '').trim(); if (x.length < 3) return { text: t('err.short') }; c.notes.unshift({ at: S.now, who: RC.WHO[S.role], text: x }); RC.act('note', { cid: c.cid, caseId: c.id }); RC.toast(t('cs.noteSaved')); }
  });
  const confirmDlg = (title, note, submit, fn) => RC.dialog({ title, submit, fields: () => [{ type: 'info', name: 'i', text: note }], onSubmit() { fn(); } });
  RC.mods.cases = {
    render() { return S.sel && RC.caseById(S.sel) ? this.card(RC.caseById(S.sel)) : this.list(); },
    list() {
      const U = UI.cases, q = U.q.trim().toLowerCase();
      const rows = S.cases.filter(c => (U.st === 'all' || (U.st === 'open' ? isOpen(c) : c.status === U.st)) && (U.reason === 'all' || c.reason === U.reason) && (!q || c.id.toLowerCase().indexOf(q) >= 0 || RC.cname(c.cid).toLowerCase().indexOf(q) >= 0));
      const tr = rows.map(c => { const n = RC.nextStep(c), cu = RC.cust(c.cid); return { cls: c.status, cc: ['c-veh'], cells: [RC.caseLink(c), RC.custLink(c.cid), `${RC.fmtMoney(c.amount)}<span class="rc-d">${esc(t('plan.' + cu.plan))}</span>`, RC.stBadge(c.status), RC.stepDots(c), c.status === 'campaign' && n ? esc(RC.fmtStamp(n.due)) : '<span class="rc-muted">-</span>', esc(RC.fmtShort(c.opened))] }; });
      return `<div class="rc-tools">${RC.search('cases.q', U.q, t('cs.search'), 'csq')}${RC.select('cases.reason', [['all', t('f.all')]].concat(RC.CODES.map(k => [k, t('reason.' + k)])), U.reason, t('f.reason'))}${RC.btn('cs-new', t('cs.new'), { perm: 'act', icon: 'plus' })}</div>
      <div class="rc-tools rc-tools2">${RC.chips('cases.st', [['all', t('f.all')], ['open', t('cst.open')], ['campaign', t('cst.campaign')], ['attention', t('cst.attention')], ['paused', t('cst.paused')], ['recovered', t('cst.recovered')], ['lost', t('cst.lost')]], U.st)}</div>
      <p class="rc-count">${esc(t('f.count', { n: rows.length }))}</p>
      ${rows.length ? RC.table([t('col.case'), t('col.customer'), t('col.amount'), t('col.status'), t('col.steps'), t('col.next'), t('col.opened')], tr) : RC.empty(t('f.none'), t('f.noneHint'))}`;
    },
    card(c) {
      const cu = RC.cust(c.cid), rule = RC.S.rules[c.reason], n = RC.nextStep(c), U = UI.ctab;
      const tabs = [['timeline', t('ct.timeline')], ['emails', t('ct.emails')], ['payment', t('ct.payment')], ['notes', t('ct.notes', { n: c.notes.length })]];
      const mails = S.mails.filter(m => m.caseId === c.id);
      let body = '';
      if (U === 'timeline') { const lg = S.audit.filter(a => a.caseId === c.id); body = lg.length ? `<ul class="rc-hist">${lg.map(a => `<li><span class="rc-dot"></span><div><strong>${esc(RC.auditText(a))}</strong><span class="rc-muted">${esc(a.who === 'system' ? t('who.system') : a.who)} / ${esc(ago(a.at))}</span></div></li>`).join('')}</ul>` : RC.empty(t('f.none')); }
      if (U === 'emails') body = mails.length ? `<ul class="rc-log">${mails.map(m => `<li><span class="rc-k">${esc(t('ov.stepN', { n: m.step || '+' }))}</span><div class="rc-lb"><strong>${esc(RC.letter(m).subject)}</strong><span class="rc-muted">${esc(t('tpl.' + m.tpl + '.n'))} / ${esc(m.sentAt ? RC.fmtStamp(m.sentAt) : '-')}</span></div>${RC.badge(this.mTone(m.state), t('mst.' + m.state))}${RC.btn('goto', t('cs.viewMail'), { ghost: true, data: `data-mod="outbox" data-ui="outbox.open=${m.id}"` })}</li>`).join('')}</ul>` : RC.empty(t('cs.noMails'));
      if (U === 'payment') {
        const evs = S.events.filter(e => e.caseId === c.id);
        body = `<dl class="rc-facts rc-facts3"><div><dt>${esc(t('rl.cat'))}</dt><dd>${esc(t('cat.' + rule.cat))}</dd></div><div><dt>${esc(t('rl.delay'))}</dt><dd>${esc(rule.max === 0 ? '-' : t('rl.hours', { n: rule.delay }))}</dd></div><div><dt>${esc(t('rl.max'))}</dt><dd>${rule.max}</dd></div></dl>
          <h4 class="rc-h4">${esc(t('cs.provEvents'))}</h4>${evs.length ? `<ul class="rc-log">${evs.map(e => `<li><span class="rc-k rc-mono">${esc(e.id.slice(3, 9))}</span><div class="rc-lb"><strong>${esc(t('evt.' + e.type))}</strong><span class="rc-muted">${esc(ago(e.at))}</span></div>${RC.badge(evTone(e.status), t('est.' + e.status))}</li>`).join('')}</ul>` : RC.empty(t('f.none'))}`;
      }
      if (U === 'notes') body = (c.notes.length ? `<ul class="rc-hist">${c.notes.map(x => `<li><span class="rc-dot"></span><div><strong>${esc(x.text)}</strong><span class="rc-muted">${esc(x.who)} / ${esc(ago(x.at))}</span></div></li>`).join('')}</ul>` : RC.empty(t('cs.noNotes'))) + RC.btn('cs-note', t('cs.addNote'), { perm: 'act', icon: 'plus', cls: 'rc-mt' });
      const st = c.steps.map(s => `<li class="${s.state}"><b>${esc(t('ov.stepN', { n: s.n }))}</b><span>${esc(t('tpl.' + RC.stepTpl(c, s.n) + '.n'))}</span><small>${esc(s.state === 'sent' ? RC.fmtStamp(s.at) : s.state === 'planned' ? RC.fmtStamp(s.due) : t('ss.' + s.state))}</small></li>`).join('');
      const act = [];
      if (c.status === 'campaign') { if (n) act.push(RC.btn('cs-send', t('cs.sendNow'), { perm: 'act', icon: 'outbox' })); act.push(RC.btn('cs-pause', t('cs.pause'), { perm: 'act', ghost: true, icon: 'pause' })); act.push(RC.btn('cs-paid', t('cs.markPaid'), { perm: 'act', ghost: true, icon: 'check' })); act.push(RC.btn('cs-lost', t('cs.close'), { perm: 'act', ghost: true, icon: 'x' })); }
      if (c.status === 'paused') { act.push(RC.btn('cs-resume', t('cs.resume'), { perm: 'act', icon: 'play' })); act.push(RC.btn('cs-paid', t('cs.markPaid'), { perm: 'act', ghost: true, icon: 'check' })); act.push(RC.btn('cs-lost', t('cs.close'), { perm: 'act', ghost: true, icon: 'x' })); }
      if (c.status === 'attention') { act.push(RC.btn('cs-start', t('cs.startAnyway'), { perm: 'act', icon: 'play' })); act.push(RC.btn('cs-lost', t('cs.close'), { perm: 'act', ghost: true, icon: 'x' })); }
      if (isOpen(c)) act.push(RC.btn('cs-page', t('cs.openPage'), { ghost: true, icon: 'portal' }));
      act.push(RC.btn('cs-ai', t('cs.writeAi'), { perm: 'act', ghost: true, icon: 'studio' }));
      return `<button type="button" class="btn btn-sm btn-ghost rc-back" data-act="cs-back">${RC.ico('left', 16)}<span>${esc(t('back'))}</span></button>
      <div class="rc-dhead"><h3 class="rc-dtitle"><span class="rc-mono">${esc(c.id)}</span> / ${esc(cu.name)}</h3><div class="rc-bset">${RC.stBadge(c.status)}${RC.badge('info', t('reason.' + c.reason))}</div></div>
      <dl class="rc-facts"><div><dt>${esc(t('col.amount'))}</dt><dd>${esc(RC.fmtMoney(c.amount))}</dd></div><div><dt>${esc(t('col.customer'))}</dt><dd><button type="button" class="rc-open" data-act="open-c" data-id="${cu.id}"><span class="rc-model">${esc(cu.name)}</span><span class="rc-plate">${esc(t('plan.' + cu.plan))}</span></button></dd></div><div><dt>${esc(t('cs.source'))}</dt><dd>${esc(t('src.' + c.source))}</dd></div><div><dt>${esc(t('col.opened'))}</dt><dd>${esc(RC.fmtStamp(c.opened))}</dd></div></dl>
      <ol class="rc-steps2">${st}</ol>
      <div class="rc-actions">${act.join('')}</div>
      ${RC.tabs('ctab', [['timeline', t('ct.timeline')], ['emails', t('ct.emails')], ['payment', t('ct.payment')], ['notes', t('ct.notes', { n: c.notes.length })]], U, t('cs.tabs')).replace('data-name="ctab"', 'data-name="ctab"')}
      <div class="rc-tabbody">${body}</div>`;
    },
    mTone: s => ({ delivered: 'ok', opened: 'ok', clicked: 'ok', queued: 'info', review: 'info', failed: 'bad', bounced: 'bad', rejected: 'warn' }[s] || 'info'),
    act(a, el) {
      const c = S.sel ? RC.caseById(S.sel) : null;
      if (a === 'cs-back') { S.sel = null; RC.paint(); return; }
      if (a === 'cs-new') {
        const elg = RC.eligible(); if (!elg.length) { RC.toast(t('ev.noCust')); return; }
        RC.dialog({ title: t('cs.newH'), note: t('cs.newNote'), values: { cid: elg[0].id, reason: 'card_declined', amount: String(RC.PLANS[elg[0].plan]) }, fields: () => [{ name: 'cid', label: t('f.customer'), type: 'select', options: elg.map(x => [x.id, x.name]) }, { name: 'reason', label: t('f.reason'), type: 'select', options: RC.CODES.map(k => [k, t('reason.' + k)]) }, { name: 'amount', label: t('f.amount'), type: 'number' }],
          onSubmit(v) { const amt = Number(v.amount), e = {}; if (!(amt > 0) || amt > 100000 || Math.floor(amt) !== amt) e.amount = t('err.amount'); if (Object.keys(e).length) return e; const n = RC.openCase(v.cid, v.reason, amt, { source: 'manual', who: RC.WHO[S.role], noEvent: true }); S.sel = n.id; UI.ctab = 'timeline'; RC.toast(t('cs.created', { c: n.id })); } });
        return;
      }
      if (!c) return;
      if (a === 'cs-note') noteDialog(c);
      if (a === 'cs-send') {
        const s = RC.nextStep(c), cu = RC.cust(c.cid); if (!s) return;
        if (cu.optOut) { RC.toast(t('cs.optBlock')); return; }
        s.state = 'sent'; s.at = S.now; const m = RC.enqueue(c, s.n, RC.stepTpl(c, s.n), { who: RC.WHO[S.role] }); s.mail = m.id;
        RC.toast(t('cs.sent', { st: t('mst.' + m.state) })); RC.refresh();
      }
      if (a === 'cs-pause') { c.status = 'paused'; RC.act('paused', { cid: c.cid, caseId: c.id }); RC.refresh(); }
      if (a === 'cs-resume') { c.status = 'campaign'; RC.act('resumed', { cid: c.cid, caseId: c.id }); RC.sendDue(c); RC.refresh(); }
      if (a === 'cs-start') confirmDlg(t('cs.startH'), t('cs.startNote'), t('cs.startAnyway'), () => { c.status = 'campaign'; RC.act('started', { cid: c.cid, caseId: c.id }); RC.sendDue(c); });
      if (a === 'cs-paid') confirmDlg(t('cs.paidH'), t('cs.paidNote'), t('cs.markPaid'), () => { RC.act('paidManual', { cid: c.cid, caseId: c.id }); RC.recover(c, 'manual', 0); });
      if (a === 'cs-lost') confirmDlg(t('cs.closeH'), t('cs.closeNote'), t('cs.close'), () => { RC.act('closed', { cid: c.cid, caseId: c.id }); RC.markLost(c); });
      if (a === 'cs-page') { UI.portal.caseId = c.id; UI.portal.step = 'form'; RC.go('portal'); }
      if (a === 'cs-ai') { UI.studio.caseId = c.id; UI.studio.subject = ''; UI.studio.body = ''; RC.go('studio'); }
    }
  };

  /* ================= customers ================= */
  RC.mods.customers = {
    render() { return S.csel && RC.cust(S.csel) ? this.card(RC.cust(S.csel)) : this.list(); },
    cardCell(cu) { const st = RC.cardState(cu); return `<span class="rc-mono">•• ${esc(cu.last4)} / ${esc(RC.cardExp(cu))}</span>${st !== 'ok' ? RC.badge(st === 'exp' ? 'bad' : 'warn', t('cu.' + st)) : ''}`; },
    list() {
      const U = UI.customers, q = U.q.trim().toLowerCase();
      const rows = S.customers.filter(c => (U.h === 'all' || RC.health(c) === U.h) && (!q || c.name.toLowerCase().indexOf(q) >= 0 || c.contact.toLowerCase().indexOf(q) >= 0 || c.email.indexOf(q) >= 0));
      const tr = rows.map(c => ({ cc: ['c-veh'], cells: [RC.custLink(c.id), esc(t('plan.' + c.plan)) + `<span class="rc-d">${esc(RC.fmtMoney(RC.PLANS[c.plan]))}</span>`, RC.badge({ active: 'ok', past_due: 'warn', canceled: 'bad' }[c.status], t('sub.' + c.status)), RC.badge({ healthy: 'ok', at_risk: 'warn', recovering: 'info', failed: 'bad' }[RC.health(c)], t('hl.' + RC.health(c))), this.cardCell(c), String(S.cases.filter(x => x.cid === c.id && isOpen(x)).length)] }));
      return `<div class="rc-tools">${RC.search('customers.q', U.q, t('cu.search'), 'cuq')}</div>
      <div class="rc-tools rc-tools2">${RC.chips('customers.h', [['all', t('f.all')], ['healthy', t('hl.healthy')], ['at_risk', t('hl.at_risk')], ['recovering', t('hl.recovering')], ['failed', t('hl.failed')]], U.h)}</div>
      <p class="rc-count">${esc(t('f.count', { n: rows.length }))}</p>
      ${rows.length ? RC.table([t('col.customer'), t('col.plan'), t('col.sub'), t('col.health'), t('col.card'), t('col.openCases')], tr) : RC.empty(t('f.none'), t('f.noneHint'))}`;
    },
    card(cu) {
      const cs = S.cases.filter(c => c.cid === cu.id), open = RC.openOf(cu.id), ms = S.mails.filter(m => m.cid === cu.id);
      return `<button type="button" class="btn btn-sm btn-ghost rc-back" data-act="cu-back">${RC.ico('left', 16)}<span>${esc(t('back'))}</span></button>
      <div class="rc-dhead"><h3 class="rc-dtitle">${esc(cu.name)}</h3><div class="rc-bset">${RC.badge({ active: 'ok', past_due: 'warn', canceled: 'bad' }[cu.status], t('sub.' + cu.status))}${RC.badge({ healthy: 'ok', at_risk: 'warn', recovering: 'info', failed: 'bad' }[RC.health(cu)], t('hl.' + RC.health(cu)))}${cu.optOut ? RC.badge('warn', t('cu.optout')) : ''}${cu.bounce ? RC.badge('bad', t('cu.bounce')) : ''}</div></div>
      <dl class="rc-facts"><div><dt>${esc(t('cu.contact'))}</dt><dd>${esc(cu.contact)}</dd></div><div><dt>${esc(t('f.email'))}</dt><dd>${esc(cu.email)}</dd></div><div><dt>${esc(t('col.plan'))}</dt><dd>${esc(t('plan.' + cu.plan))} / ${esc(RC.fmtMoney(RC.PLANS[cu.plan]))}</dd></div><div><dt>${esc(t('col.card'))}</dt><dd>${this.cardCell(cu)}</dd></div><div><dt>${esc(t('cu.since'))}</dt><dd>${esc(t('cu.months', { n: cu.months }))}</dd></div><div><dt>${esc(t('f.lang'))}</dt><dd>${esc(t('lang.' + cu.lang))}</dd></div></dl>
      <div class="rc-actions">${RC.btn('cu-edit', t('cu.edit'), { perm: 'act', icon: 'studio' })}${open ? RC.btn('cu-page', t('cs.openPage'), { ghost: true, icon: 'portal' }) : (cu.status !== 'canceled' ? RC.btn('cu-case', t('cs.new'), { perm: 'act', ghost: true, icon: 'plus' }) : '')}</div>
      ${RC.sw('cu-opt', cu.optOut, t('cu.optSw'), 'act')}<p class="rc-hint">${esc(t('cu.optHint'))}</p>
      <h4 class="rc-h4">${esc(t('cu.cases', { n: cs.length }))}</h4>${cs.length ? `<ul class="rc-log">${cs.map(c => `<li><span class="rc-k rc-mono">${esc(c.id)}</span><div class="rc-lb"><strong>${esc(t('reason.' + c.reason))}</strong><span class="rc-muted">${esc(RC.fmtMoney(c.amount))} / ${esc(RC.fmtShort(c.opened))}</span></div>${RC.stBadge(c.status)}${RC.btn('open-case', t('open'), { ghost: true, data: `data-id="${c.id}"` })}</li>`).join('')}</ul>` : RC.empty(t('cu.noCases'))}
      <h4 class="rc-h4">${esc(t('cu.mails', { n: ms.length }))}</h4>${ms.length ? `<ul class="rc-log">${ms.slice(0, 6).map(m => `<li><span class="rc-k">${esc(t('ov.stepN', { n: m.step || '+' }))}</span><div class="rc-lb"><strong>${esc(RC.letter(m).subject)}</strong><span class="rc-muted">${esc(m.sentAt ? RC.fmtStamp(m.sentAt) : '-')}</span></div>${RC.badge(RC.mods.cases.mTone(m.state), t('mst.' + m.state))}</li>`).join('')}</ul>` : RC.empty(t('f.none'))}`;
    },
    act(a, el) {
      const cu = S.csel ? RC.cust(S.csel) : null;
      if (a === 'cu-back') { S.csel = null; RC.paint(); return; }
      if (!cu) return;
      if (a === 'cu-opt' || a === 'sw') { cu.optOut = !cu.optOut; RC.act(cu.optOut ? 'optout' : 'optin', { cid: cu.id }); RC.toast(t(cu.optOut ? 'cu.optOn' : 'cu.optOff')); RC.refresh(); return; }
      if (a === 'cu-page') { const o = RC.openOf(cu.id); UI.portal.caseId = o.id; UI.portal.step = 'form'; RC.go('portal'); }
      if (a === 'cu-case') { RC.go('cases', null); RC.mods.cases.act('cs-new', el); }
      if (a === 'cu-edit') RC.dialog({ title: t('cu.edit'), values: { contact: cu.contact, email: cu.email, lang: cu.lang }, fields: () => [{ name: 'contact', label: t('cu.contact') }, { name: 'email', label: t('f.email'), type: 'text' }, { name: 'lang', label: t('f.lang'), type: 'select', options: [['en', t('lang.en')], ['ru', t('lang.ru')], ['uk', t('lang.uk')]] }],
        onSubmit(v) { const e = {}; if ((v.contact || '').trim().length < 2) e.contact = t('err.short'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v.email || '').trim())) e.email = t('err.email'); if (Object.keys(e).length) return e; cu.contact = v.contact.trim(); cu.email = v.email.trim(); cu.lang = v.lang; cu.bounce = false; RC.act('custEdit', { cid: cu.id }); RC.toast(t('saved')); } });
    }
  };
}());
