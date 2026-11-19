/* Route Match demo modules, part 2: rules, templates, groups, settings, analytics, journal, export. */
(function (w) {
  'use strict';
  var RM = w.RM, t = function (k, v) { return w.MFI18N.t(k, v); }, e = RM.esc, UI = RM.ui, U = RM.U;
  U.tp = { sel: 't1', detail: false, lead: '' };
  U.jr = { kind: 'all', q: '' };
  U.ex = { scope: 'all', fmt: 'csv' };
  var DEF_RULES = { high: 70, review: 40, near: 40, fuzzy: 80, pDay: 15, pFull: 20, pType: 25 };

  function download(name, text, mime) {
    try {
      var b = new w.Blob([text], { type: mime }), a = w.document.createElement('a');
      a.href = w.URL.createObjectURL(b); a.download = name; w.document.body.appendChild(a); a.click(); w.document.body.removeChild(a);
      w.setTimeout(function () { w.URL.revokeObjectURL(a.href); }, 500);
    } catch (er) { /* ignore */ }
  }

  /* ================= RULES ================= */
  var SL = [['high', 50, 95, '%'], ['review', 10, 69, '%'], ['near', 5, 100, 'km'], ['fuzzy', 60, 95, '%'], ['pDay', 0, 40, ''], ['pFull', 0, 40, ''], ['pType', 0, 50, '']];
  function sim() {
    var cnt = { high: 0, review: 0, unrec: 0 }, rows = '';
    RM.S.leads.forEach(function (l) { if (l.status !== 'rejected') cnt[RM.klass(l)]++; });
    var tot = cnt.high + cnt.review + cnt.unrec || 1;
    var bars = ['high', 'review', 'unrec'].map(function (k) {
      return '<div class="bar"><span>' + e(t('tab.' + k)) + '</span><i style="--w:' + Math.round(cnt[k] / tot * 100) + '%" class="b-' + k + '"></i><b>' + cnt[k] + '</b></div>';
    }).join('');
    RM.S.leads.slice(0, 8).forEach(function (l) {
      var b = RM.best(l);
      rows += '<li><span>' + e(l.id + ' ' + RM.leadTitle(l)) + '</span>' + (b ? '<span class="hint">' + e(t('tier.' + b.tier)) + ' / ' + b.s + '</span>' + UI.meter(b.lv) : UI.badge(t('tab.unrec'), 'bad')) + '</li>';
    });
    return bars + '<ul class="mini sim">' + rows + '</ul>';
  }
  function rulesView() {
    var R = RM.S.rules;
    var sl = SL.map(function (x) {
      var k = x[0];
      return '<div class="rng"><label for="rg-' + k + '">' + e(t('rule.' + k)) + '</label><div class="rng-in"><input type="range" id="rg-' + k + '" min="' + x[1] + '" max="' + x[2] + '" value="' + R[k] + '" data-in="rule.set" data-k="' + k + '"><output id="ro-' + k + '">' + R[k] + (x[3] === '%' ? '%' : (x[3] === 'km' ? ' ' + t('unit.km') : '')) + '</output></div><p class="hint">' + e(t('rule.' + k + '.h')) + '</p></div>';
    }).join('');
    var tiers = ['exact', 'nearby', 'partial', 'country'].map(function (k) { return '<li><strong>' + e(t('tier.' + k)) + '</strong><span>' + e(t('tier.' + k + '.h')) + '</span></li>'; }).join('');
    return '<div class="two"><div>' + UI.head(t('mod.rules'), t('rule.sub'), '<button type="button" class="btn btn-ghost btn-sm" data-act="rule.reset">' + e(t('rule.reset')) + '</button>') + UI.card(t('rule.thresholds'), sl) + '</div><div>' +
      UI.card(t('rule.sim'), '<p class="hint">' + e(t('rule.sim.p')) + '</p><div id="sim">' + sim() + '</div>') + UI.card(t('rule.tiers'), '<ul class="defs">' + tiers + '</ul><p class="hint">' + e(t('rule.both')) + '</p>') + '</div></div>';
  }
  RM.ins['rule.set'] = function (el, ev, type) {
    var k = el.getAttribute('data-k'), R = RM.S.rules, v = parseInt(el.value, 10);
    if (k === 'review' && v >= R.high) v = R.high - 1;
    if (k === 'high' && v <= R.review) v = R.review + 1;
    R[k] = v; el.value = v;
    var o = w.document.getElementById('ro-' + k), sp = SL.filter(function (x) { return x[0] === k; })[0];
    if (o) o.textContent = v + (sp[3] === '%' ? '%' : (sp[3] === 'km' ? ' ' + t('unit.km') : ''));
    var s = w.document.getElementById('sim'); if (s) s.innerHTML = sim();
    if (type === 'change') RM.log('rule', 'lg.rule', { k: t('rule.' + k), v: v });
    return true;
  };
  RM.acts['rule.reset'] = function () { var k; for (k in DEF_RULES) RM.S.rules[k] = DEF_RULES[k]; RM.log('rule', 'lg.rule.reset', {}); U.toast = t('toast.reset'); };

  /* ================= TEMPLATES ================= */
  var PH = ['name', 'from', 'to', 'route', 'days', 'time', 'qty'];
  function tplView() {
    var S = RM.S, sel = S.tpl.filter(function (x) { return x.id === U.tp.sel; })[0] || S.tpl[0];
    var list = S.tpl.map(function (x) { return '<li><button type="button" class="it' + (sel.id === x.id ? ' is-sel' : '') + '" data-act="tpl.open" data-id="' + x.id + '"><span class="it-top"><strong>' + e(RM.tplName(x)) + '</strong><span class="it-id">' + e(t('tplk.' + x.kind)) + '</span></span><span class="it-sub">' + e(RM.tplText(x)) + '</span></button></li>'; }).join('');
    var lead = RM.leadById(U.tp.lead) || S.leads[0], leadOpts = S.leads.slice(0, 20).map(function (l) { return '<option value="' + l.id + '"' + (lead && l.id === lead.id ? ' selected' : '') + '>' + e(l.id + ' ' + RM.leadTitle(l)) + '</option>'; }).join('');
    var prev = lead ? RM.render(sel, lead, RM.best(lead)) : '';
    var det = '<div class="det-in">' + UI.back('tpl.back') + '<div class="det-title"><h3>' + e(RM.tplName(sel)) + '</h3>' + UI.badge(t('tplk.' + sel.kind), 'info') + '</div>' +
      UI.card(t('tpl.text'), '<textarea class="inp" id="tpl-text" rows="6" data-in="tpl.text" data-id="' + sel.id + '" maxlength="600" aria-label="' + e(t('tpl.text')) + '">' + e(RM.tplText(sel)) + '</textarea><div class="tags">' + PH.map(function (p) { return '<button type="button" class="tagb" data-act="tpl.ph" data-id="' + sel.id + '" data-p="' + p + '">{' + p + '}</button>'; }).join('') + '</div><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="tpl.default" data-id="' + sel.id + '">' + e(t('tpl.default')) + '</button>' + (sel.custom ? '<button type="button" class="btn btn-ghost btn-sm" data-act="tpl.del" data-id="' + sel.id + '">' + e(t('btn.remove')) + '</button>' : '') + '</div>') +
      UI.card(t('tpl.preview'), '<label class="inl">' + e(t('tpl.formlead')) + '<select data-in="tpl.lead">' + leadOpts + '</select></label><div class="rm-reply" id="tpl-prev">' + e(prev) + '</div>') + '</div>';
    var add = UI.card(t('tpl.add'), '<form class="fgrid" data-form="tpl.create"><label>' + e(t('rt.name')) + '<input type="text" name="name" maxlength="40"></label><label>' + e(t('tpl.kind')) + '<select name="kind">' + ['passenger', 'parcel', 'noroute', 'decline'].map(function (k) { return '<option value="' + k + '">' + e(t('tplk.' + k)) + '</option>'; }).join('') + '</select></label><div class="wide"><button type="submit" class="btn btn-sm">' + e(t('btn.add')) + '</button> <span class="msg" id="tpl-msg" role="status"></span></div></form>');
    return '<div class="md' + (U.tp.detail ? ' is-detail' : '') + '"><div class="md-list">' + UI.head(t('mod.templates'), t('tpl.sub')) + '<ul class="lst">' + list + '</ul></div><div class="md-det">' + det + add + '</div></div>';
  }
  RM.acts['tpl.open'] = function (el) { U.tp.sel = el.getAttribute('data-id'); U.tp.detail = true; };
  RM.acts['tpl.back'] = function () { U.tp.detail = false; };
  RM.acts['tpl.default'] = function (el) { var x = RM.S.tpl.filter(function (y) { return y.id === el.getAttribute('data-id'); })[0]; if (x) { x.text = x.custom ? '' : null; RM.log('rule', 'lg.tpl', { name: RM.tplName(x) }); } };
  RM.acts['tpl.del'] = function (el) { var S = RM.S; S.tpl = S.tpl.filter(function (y) { return y.id !== el.getAttribute('data-id'); }); U.tp.sel = S.tpl[0].id; U.tp.detail = false; RM.log('rule', 'lg.tpl.del', {}); };
  RM.acts['tpl.ph'] = function (el) {
    var x = RM.S.tpl.filter(function (y) { return y.id === el.getAttribute('data-id'); })[0], ta = w.document.getElementById('tpl-text'); if (!x || !ta) return;
    var txt = ta.value, pos = ta.selectionStart === undefined ? txt.length : ta.selectionStart;
    x.text = txt.slice(0, pos) + '{' + el.getAttribute('data-p') + '}' + txt.slice(pos);
  };
  RM.ins['tpl.text'] = function (el, ev, type) {
    var x = RM.S.tpl.filter(function (y) { return y.id === el.getAttribute('data-id'); })[0]; if (!x) return true;
    x.text = el.value;
    var lead = RM.leadById(U.tp.lead) || RM.S.leads[0], p = w.document.getElementById('tpl-prev');
    if (p && lead) p.textContent = RM.render(x, lead, RM.best(lead));
    if (type === 'change') RM.log('rule', 'lg.tpl', { name: RM.tplName(x) });
    return true;
  };
  RM.ins['tpl.lead'] = function (el) { U.tp.lead = el.value; };
  RM.forms['tpl.create'] = function (f) {
    var S = RM.S, nm = f.name.value.replace(/^\s+|\s+$/g, '');
    if (!nm) { w.document.getElementById('tpl-msg').textContent = t('rt.err.name'); return true; }
    var x = { id: 't' + (S.nextTpl++), kind: f.kind.value, name: nm, custom: true, text: t('tpl.def.' + f.kind.value) };
    S.tpl.push(x); U.tp.sel = x.id; U.tp.detail = true; RM.log('rule', 'lg.tpl.add', { name: nm }); U.toast = t('toast.saved');
  };

  /* ================= GROUPS ================= */
  function groupsView() {
    var S = RM.S, h = '';
    h += UI.head(t('mod.groups'), t('grp.sub'));
    h += '<div class="two"><div>';
    h += UI.card(t('grp.watched'), '<ul class="rows">' + S.groups.map(function (g) {
      var n = 0, ln = 0; S.items.forEach(function (it) { if (RM.META[it.mid].g === g.id) { n++; if (it.state === 'lead') ln++; } });
      var last = S.items.filter(function (it) { return RM.META[it.mid].g === g.id; })[0];
      return '<li class="row"><div><strong>' + e(t('grp.' + g.id)) + '</strong>' + (g.auto ? ' ' + UI.badge(t('grp.auto'), 'warn') : '') + '<p class="hint">' + e(t('grp.stat', { n: n, l: ln })) + (last ? ' / ' + e(t('grp.last', { time: last.time })) : '') + '</p></div>' + UI.sw(g.on, t('grp.toggle', { name: t('grp.' + g.id) }), 'grp.toggle', g.id) + '</li>';
    }).join('') + '</ul><p class="hint">' + e(t('grp.hint')) + '</p>');
    h += UI.card(t('grp.excl'), '<p class="hint">' + e(t('grp.excl.p')) + '</p><div class="tags">' + (S.excl.length ? S.excl.map(function (k, i) { return '<span class="tagx">' + e(k) + '<button type="button" data-act="grp.delkw" data-i="' + i + '" aria-label="' + e(t('btn.remove') + ' ' + k) + '">×</button></span>'; }).join('') : '<span class="hint">' + e(t('grp.excl.none')) + '</span>') + '</div><form class="inline" data-form="grp.addkw"><input type="text" name="kw" maxlength="30" placeholder="' + e(t('grp.kw.ph')) + '" aria-label="' + e(t('grp.kw.ph')) + '"><button type="submit" class="btn btn-sm">' + e(t('btn.add')) + '</button></form><p class="msg" id="kw-msg" role="status"></p>');
    h += '</div><div>';
    h += UI.card(t('col.title'), '<p class="status-line"><span class="rm-live' + (S.paused ? ' is-off' : '') + '"><i aria-hidden="true"></i>' + e(S.paused ? t('col.stopped') : t('col.running')) + '</span></p><p class="hint">' + e(t('col.p')) + '</p><label class="inl">' + e(t('col.interval')) + '<select data-in="cfg.set" data-k="interval">' + [2, 4, 8].map(function (n) { return '<option value="' + n + '"' + (S.cfg.interval === n ? ' selected' : '') + '>' + n + ' ' + e(t('unit.s')) + '</option>'; }).join('') + '</select></label><div class="acts"><button type="button" class="btn btn-sm" data-act="col.toggle">' + e(S.paused ? t('col.start') : t('col.stop')) + '</button></div>');
    h += UI.card(t('grp.how'), '<ol class="steps"><li class="st st-ok"><span class="st-dot"></span><div><strong>' + e(t('grp.how.1')) + '</strong></div></li><li class="st st-ok"><span class="st-dot"></span><div><strong>' + e(t('grp.how.2')) + '</strong></div></li><li class="st st-ok"><span class="st-dot"></span><div><strong>' + e(t('grp.how.3')) + '</strong></div></li></ol>');
    return h + '</div></div>';
  }
  RM.acts['grp.toggle'] = function (el) { RM.toggleGroup(el.getAttribute('data-id')); };
  RM.acts['grp.delkw'] = function (el) { var a = RM.S.excl.splice(+el.getAttribute('data-i'), 1); RM.log('rule', 'lg.kw.del', { kw: a[0] }); };
  RM.acts['col.toggle'] = function () { RM.S.paused = !RM.S.paused; RM.log('system', RM.S.paused ? 'lg.col.stop' : 'lg.col.start', {}, RM.S.paused ? 'warn' : 'info'); if (RM.S.paused && RM.S.cfg.tgCollector) RM.log('alert', 'lg.alert.col', {}, 'warn'); RM.timer(); };
  RM.forms['grp.addkw'] = function (f) {
    var k = f.kw.value.replace(/^\s+|\s+$/g, '');
    if (!k) { w.document.getElementById('kw-msg').textContent = t('ct.err.empty'); return true; }
    if (RM.S.excl.some(function (x) { return x.toLowerCase() === k.toLowerCase(); })) { w.document.getElementById('kw-msg').textContent = t('ct.err.dup'); return true; }
    RM.S.excl.push(k); RM.log('rule', 'lg.kw.add', { kw: k }); U.toast = t('toast.saved');
  };

  /* ================= SETTINGS ================= */
  function row(label, hint, ctl) { return '<div class="srow"><div><strong>' + e(label) + '</strong>' + (hint ? '<p class="hint">' + e(hint) + '</p>' : '') + '</div><div class="srow-c">' + ctl + '</div></div>'; }
  function tg(k, label, hint) { return row(label, hint, UI.sw(RM.S.cfg[k], label, 'cfg.toggle', k)); }
  function settingsView() {
    var S = RM.S, c = S.cfg, why = RM.llmWhy();
    var done = [
      [c.key, t('setup.key')], [S.routes.some(function (r) { return r.on; }), t('setup.routes')], [S.groups.some(function (g) { return g.on; }), t('setup.groups')], [c.tg, t('setup.notify')]
    ];
    var h = UI.head(t('mod.settings'), t('set.sub'));
    h += '<div class="two"><div>';
    h += UI.card(t('setup.h'), '<ul class="check">' + done.map(function (x) { return '<li class="' + (x[0] ? 'is-done' : '') + '"><span aria-hidden="true">' + (x[0] ? '✓' : '•') + '</span>' + e(x[1]) + '</li>'; }).join('') + '</ul><p class="hint">' + e(t('set.edition')) + '</p>');
    h += UI.card(t('llm.h'),
      tg('llmOn', t('llm.on'), t('llm.on.h')) +
      row(t('llm.provider'), '', '<div class="seg" role="group" aria-label="' + e(t('llm.provider')) + '">' + ['cloud', 'alt', 'self'].map(function (p) { return '<button type="button" data-act="cfg.provider" data-id="' + p + '" aria-pressed="' + (c.provider === p) + '">' + e(t('prov.' + p)) + '</button>'; }).join('') + '</div>') +
      row(t('llm.key'), t('llm.key.h'), UI.sw(c.key, t('llm.key'), 'cfg.toggle', 'key')) +
      row(t('llm.model'), '', '<select data-in="cfg.set" data-k="model" aria-label="' + e(t('llm.model')) + '">' + ['small', 'std', 'large'].map(function (m) { return '<option value="' + m + '"' + (c.model === m ? ' selected' : '') + '>' + e(t('model.' + m)) + '</option>'; }).join('') + '</select>') +
      row(t('llm.test'), '', '<button type="button" class="btn btn-ghost btn-sm" data-act="cfg.test">' + e(t('llm.test.btn')) + '</button>') +
      '<p class="status-line">' + (why ? UI.badge(t('llm.state.' + why), 'warn') + ' <span class="hint">' + e(t('llm.fallback')) + '</span>' : UI.badge(t('llm.state.ok'), 'ok')) + '</p>');
    h += UI.card(t('bud.h'), '<div class="bar"><span>' + e(t('bud.used')) + '</span><i style="--w:' + Math.min(100, Math.round(c.used / c.limit * 100)) + '%" class="b-' + (c.used >= c.limit ? 'unrec' : 'high') + '"></i><b>' + c.used + '/' + c.limit + '</b></div>' +
      row(t('bud.limit'), t('bud.limit.h'), '<input type="number" min="1" max="500" value="' + c.limit + '" data-in="cfg.set" data-k="limit" aria-label="' + e(t('bud.limit')) + '">') +
      '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="cfg.resetbud">' + e(t('bud.reset')) + '</button></div>');
    h += '</div><div>';
    h += UI.card(t('proc.h'), tg('prefilter', t('proc.pre'), t('proc.pre.h')) + tg('corridor', t('proc.cor'), t('proc.cor.h')) + row(t('proc.sla'), t('proc.sla.h'), '<input type="number" min="5" max="600" value="' + c.sla + '" data-in="cfg.set" data-k="sla" aria-label="' + e(t('proc.sla')) + '"> ' + e(t('unit.min'))));
    h += UI.card(t('ntf.h'), tg('tg', t('ntf.tg'), t('ntf.tg.h')) + tg('tgCollector', t('ntf.col'), t('ntf.col.h')) +
      row(t('ntf.repeat'), '', '<select data-in="cfg.set" data-k="repeat" aria-label="' + e(t('ntf.repeat')) + '">' + [5, 15, 60].map(function (n) { return '<option value="' + n + '"' + (c.repeat === n ? ' selected' : '') + '>' + n + ' ' + e(t('unit.min')) + '</option>'; }).join('') + '</select>') +
      tg('quiet', t('ntf.quiet'), t('ntf.quiet.h')) +
      (c.quiet ? row(t('ntf.window'), '', '<input type="time" value="' + c.qFrom + '" data-in="cfg.set" data-k="qFrom" aria-label="' + e(t('ntf.from')) + '"> <input type="time" value="' + c.qTo + '" data-in="cfg.set" data-k="qTo" aria-label="' + e(t('ntf.to')) + '">') : '') +
      '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="cfg.tgtest">' + e(t('ntf.test')) + '</button></div>');
    h += UI.card(t('bk.h'), tg('backup', t('bk.on'), t('bk.on.h')) + row(t('bk.every'), '', '<select data-in="cfg.set" data-k="every" aria-label="' + e(t('bk.every')) + '">' + ['daily', 'weekly'].map(function (k) { return '<option value="' + k + '"' + (c.every === k ? ' selected' : '') + '>' + e(t('bk.' + k)) + '</option>'; }).join('') + '</select>') +
      row(t('bk.keep'), '', '<input type="number" min="1" max="60" value="' + c.keep + '" data-in="cfg.set" data-k="keep" aria-label="' + e(t('bk.keep')) + '">') +
      '<p class="hint">' + e(t('bk.count', { n: c.backups })) + '</p><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="cfg.backup">' + e(t('bk.now')) + '</button></div>');
    h += UI.card(t('misc.h'), tg('portal', t('misc.portal'), t('misc.portal.h')) + tg('autostart', t('misc.auto'), t('misc.auto.h')) + '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="cfg.restart">' + e(t('misc.restart')) + '</button></div>');
    return h + '</div></div>';
  }
  RM.acts['cfg.toggle'] = function (el) {
    var k = el.getAttribute('data-id'), c = RM.S.cfg; c[k] = !c[k];
    RM.log('rule', 'lg.cfg.' + (c[k] ? 'on' : 'off'), { k: t('cfgk.' + k) });
  };
  RM.acts['cfg.provider'] = function (el) { RM.S.cfg.provider = el.getAttribute('data-id'); RM.log('rule', 'lg.provider', { p: t('prov.' + RM.S.cfg.provider) }); };
  RM.acts['cfg.test'] = function () {
    var why = RM.llmWhy();
    if (why === 'off' || why === 'nokey') { RM.log('error', 'lg.llm.test.fail', {}, 'warn'); U.toast = t('toast.testfail'); }
    else { RM.log('system', 'lg.llm.test.ok', {}); U.toast = t('toast.testok'); }
  };
  RM.acts['cfg.tgtest'] = function () { RM.log('alert', RM.S.cfg.tg ? 'lg.tg.test' : 'lg.tg.test.off', {}, RM.S.cfg.tg ? 'info' : 'warn'); U.toast = t(RM.S.cfg.tg ? 'toast.tgtest' : 'toast.testfail'); };
  RM.acts['cfg.backup'] = function () { RM.S.cfg.backups = Math.min(RM.S.cfg.keep, RM.S.cfg.backups + 1); RM.log('system', 'lg.backup', {}); U.toast = t('toast.backup'); };
  RM.acts['cfg.resetbud'] = function () { var c = RM.S.cfg; c.used = 0; c.budgetAlerted = false; RM.log('system', 'lg.bud.reset', {}); };
  RM.acts['cfg.restart'] = function () { RM.restart(); U.toast = t('toast.restart'); };
  RM.ins['cfg.set'] = function (el, ev, type) {
    var k = el.getAttribute('data-k'), c = RM.S.cfg;
    if (type !== 'change') return true;
    if (el.type === 'number') {
      var v = parseInt(el.value, 10); if (!(v >= +el.min)) v = +el.min; if (v > +el.max) v = +el.max; c[k] = v; el.value = v;
    } else if (k === 'interval' || k === 'repeat' || k === 'keep') c[k] = parseInt(el.value, 10);
    else c[k] = el.value;
    RM.log('rule', 'lg.cfg.set', { k: t('cfgk.' + k), v: el.value });
    if (k === 'interval') RM.timer();
    if (k === 'limit') { c.budgetAlerted = c.used >= c.limit; }
  };

  /* ================= ANALYTICS ================= */
  function bar(label, n, tot, cls) { return '<div class="bar"><span>' + e(label) + '</span><i style="--w:' + (tot ? Math.round(n / tot * 100) : 0) + '%" class="b-' + (cls || 'high') + '"></i><b>' + n + '</b></div>'; }
  function analyticsView() {
    var S = RM.S, ls = S.leads, proc = S.items.filter(function (i) { return i.state !== 'ignored'; }).length;
    var fit = ls.filter(function (l) { var k = RM.klass(l); return k !== 'unrec'; }).length;
    var by = function (s) { return ls.filter(function (l) { return l.status === s; }).length; };
    var tile = function (n, l) { return '<div class="tile"><b>' + n + '</b><span>' + e(l) + '</span></div>'; };
    var h = UI.head(t('mod.analytics'), t('an.sub'));
    h += '<div class="tiles">' + tile(proc, t('an.proc')) + tile(ls.length, t('an.leads')) + tile(fit, t('stat.fit')) + tile(by('confirmed'), t('stt.confirmed')) + tile(by('corrected'), t('stt.corrected')) + tile(by('rejected'), t('stt.rejected')) + '</div>';
    h += '<div class="two"><div>';
    h += UI.card(t('an.funnel'), bar(t('an.proc'), proc, proc) + bar(t('an.leads'), ls.length, proc) + bar(t('stat.fit'), fit, proc, 'review') + bar(t('stt.confirmed'), by('confirmed'), proc, 'ok'));
    var wd = [1, 2, 3, 4, 5, 6, 7].map(function (d) { return bar(t('wd.' + d), ls.filter(function (l) { return l.day === d; }).length, ls.length || 1, 'info'); }).join('');
    h += UI.card(t('an.byday'), wd);
    h += '</div><div>';
    h += UI.card(t('an.groups'), S.groups.map(function (g) { return bar(t('grp.' + g.id), S.items.filter(function (i) { return RM.META[i.mid].g === g.id; }).length, S.items.length || 1, 'info'); }).join(''));
    var src = function (k) { return ls.filter(function (l) { return l.src === k; }).length; };
    h += UI.card(t('an.src'), bar(t('src.llm'), src('llm'), ls.length || 1, 'ok') + bar(t('src.regex'), src('regex'), ls.length || 1, 'review') + bar(t('src.failed'), src('failed'), ls.length || 1, 'unrec') + '<p class="hint">' + e(t('an.src.h')) + '</p>');
    var cor = ls.filter(function (l) { return l.edited; }).length, dup = ls.filter(function (l) { return l.dup; }).length;
    h += UI.card(t('an.quality'), bar(t('an.corrected'), cor, ls.length || 1, 'review') + bar(t('an.dups'), dup, ls.length || 1, 'info') + bar(t('stt.rejected'), by('rejected'), ls.length || 1, 'unrec') + '<p class="hint">' + e(t('an.q.h')) + '</p>');
    return h + '</div></div>';
  }

  /* ================= JOURNAL ================= */
  var KINDS = ['all', 'parse', 'status', 'route', 'rule', 'alert', 'error', 'system'];
  function jrList() {
    var q = U.jr.q.toLowerCase(), n = 0, h = '';
    RM.S.log.forEach(function (en) {
      if (U.jr.kind !== 'all' && en.kind !== U.jr.kind) return;
      var tx = RM.logText(en); if (q && tx.toLowerCase().indexOf(q) < 0) return;
      n++; if (n > 120) return;
      h += '<li class="lg lg-' + en.lvl + '"><span class="lg-t">' + en.time + '</span>' + UI.badge(t('jk.' + en.kind), en.lvl === 'warn' ? 'warn' : (en.kind === 'alert' ? 'bad' : (en.kind === 'status' ? 'ok' : 'info'))) + '<span class="lg-x">' + e(tx) + '</span></li>';
    });
    return n ? h : '<li class="rm-empty">' + e(t('jr.empty')) + '</li>';
  }
  function journalView() {
    return UI.head(t('mod.journal'), t('jr.sub'), '<button type="button" class="btn btn-ghost btn-sm" data-act="jr.export">' + e(t('jr.export')) + '</button>') +
      '<div class="tools"><input type="search" class="inp" data-in="jr.q" value="' + e(U.jr.q) + '" placeholder="' + e(t('jr.search')) + '" aria-label="' + e(t('jr.search')) + '"></div>' +
      '<div class="tabs-sc">' + UI.chips('jr.kind', U.jr.kind, KINDS.map(function (k) { return { id: k }; }), function (x) { return x.id === 'all' ? t('feed.all') : t('jk.' + x.id); }) + '</div>' +
      '<ul class="logs" id="jr-list">' + jrList() + '</ul>';
  }
  RM.acts['jr.kind'] = function (el) { U.jr.kind = el.getAttribute('data-id'); };
  RM.ins['jr.q'] = function (el) { U.jr.q = el.value; var ul = w.document.getElementById('jr-list'); if (ul) ul.innerHTML = jrList(); return true; };
  RM.acts['jr.export'] = function () {
    var c = RM.S.cfg, txt = 'Route Match / diagnostics (demo)\nllm: ' + (c.llmOn ? 'on' : 'off') + ', key configured: ' + (c.key ? 'yes' : 'no') + ', prefilter: ' + (c.prefilter ? 'on' : 'off') + '\n\n' +
      RM.S.log.slice(0, 200).map(function (en) { return en.time + ' [' + en.kind + '] ' + RM.logText(en); }).join('\n');
    download('diagnostics-demo.txt', txt, 'text/plain'); RM.log('system', 'lg.diag', {}); U.toast = t('toast.diag');
  };

  /* ================= EXPORT ================= */
  function exRows() {
    var s = U.ex.scope;
    return RM.S.leads.filter(function (l) { return s === 'all' || l.status === s; }).map(function (l) {
      var b = RM.best(l);
      return { id: l.id, status: l.status, type: l.type, from: l.from ? RM.cityName(l.from) : l.rawF, to: l.to ? RM.cityName(l.to) : l.rawT, day: t('wd.' + l.day), qty: RM.qty(l), contact: l.phone, route: b ? RM.routeName(b.route) : '', priority: b ? b.lv : 'none', source: l.src, notes: l.notes };
    });
  }
  function csv(rows) {
    var keys = ['id', 'status', 'type', 'from', 'to', 'day', 'qty', 'contact', 'route', 'priority', 'source', 'notes'];
    var q = function (v) { v = String(v === undefined ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return keys.join(',') + '\n' + rows.map(function (r) { return keys.map(function (k) { return q(r[k]); }).join(','); }).join('\n');
  }
  function exportView() {
    var S = RM.S, rows = exRows(), queue = S.leads.filter(function (l) { return l.status === 'confirmed' && !S.sent[l.id]; });
    var h = UI.head(t('mod.export'), t('ex.sub'));
    h += '<div class="two"><div>' + UI.card(t('ex.file'),
      '<div class="fgrid"><label>' + e(t('ex.scope')) + '<select data-in="ex.scope">' + ['all', 'new', 'confirmed', 'corrected', 'rejected'].map(function (k) { return '<option value="' + k + '"' + (U.ex.scope === k ? ' selected' : '') + '>' + e(k === 'all' ? t('feed.all') : t('stt.' + k)) + '</option>'; }).join('') + '</select></label><label>' + e(t('ex.fmt')) + '<select data-in="ex.fmt"><option value="csv"' + (U.ex.fmt === 'csv' ? ' selected' : '') + '>CSV</option><option value="json"' + (U.ex.fmt === 'json' ? ' selected' : '') + '>JSON</option></select></label></div>' +
      '<p class="hint">' + e(t('ex.count', { n: rows.length })) + '</p><div class="acts"><button type="button" class="btn btn-sm" data-act="ex.dl"' + (rows.length ? '' : ' disabled') + '>' + e(t('ex.dl')) + '</button></div>') +
      UI.card(t('ex.portal'), '<p class="hint">' + e(t(S.cfg.portal ? 'ex.portal.on' : 'ex.portal.off')) + '</p>' + (queue.length ? '<ul class="mini">' + queue.map(function (l) { return '<li>' + e(l.id + ' ' + RM.leadTitle(l)) + '</li>'; }).join('') + '</ul>' : '<p class="hint">' + e(t('ex.queue.none')) + '</p>') +
        '<div class="acts"><button type="button" class="btn btn-sm" data-act="ex.send"' + (S.cfg.portal && queue.length ? '' : ' disabled') + '>' + e(t('ex.send')) + '</button>' + (S.cfg.portal ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-act="ex.enable">' + e(t('ex.enable')) + '</button>') + '</div>') + '</div><div>' +
      UI.card(t('ex.preview'), rows.length ? '<ul class="mini pv">' + rows.slice(0, 8).map(function (r) { return '<li><strong>' + e(r.id) + '</strong> ' + e(r.from + ' → ' + r.to) + '<span class="hint">' + e(r.day + ' / ' + r.qty + ' / ' + t('stt.' + r.status)) + '</span></li>'; }).join('') + '</ul>' : '<p class="hint">' + e(t('leads.empty')) + '</p>') + '</div></div>';
    return h;
  }
  RM.ins['ex.scope'] = function (el) { U.ex.scope = el.value; };
  RM.ins['ex.fmt'] = function (el) { U.ex.fmt = el.value; };
  RM.acts['ex.dl'] = function () {
    var rows = exRows();
    if (U.ex.fmt === 'json') download('leads-demo.json', JSON.stringify(rows, null, 2), 'application/json');
    else download('leads-demo.csv', csv(rows), 'text/csv');
    RM.log('system', 'lg.export', { n: rows.length, f: U.ex.fmt.toUpperCase() }); U.toast = t('toast.exported');
  };
  RM.acts['ex.enable'] = function () { RM.S.cfg.portal = true; RM.log('rule', 'lg.cfg.on', { k: t('cfgk.portal') }); };
  RM.acts['ex.send'] = function () {
    var n = 0; RM.S.leads.forEach(function (l) { if (l.status === 'confirmed' && !RM.S.sent[l.id]) { RM.S.sent[l.id] = true; n++; } });
    RM.log('system', 'lg.portal', { n: n }); U.toast = t('toast.sent');
  };

  /* ---------- registry ---------- */
  RM.views = RM.views || {};
  RM.views.rules = rulesView; RM.views.templates = tplView; RM.views.groups = groupsView; RM.views.settings = settingsView;
  RM.views.analytics = analyticsView; RM.views.journal = journalView; RM.views.export = exportView;
}(window));
