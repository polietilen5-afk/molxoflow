/* Recovery Desk demo: application shell, helpers, dialogs, navigation. */
(function () {
  'use strict';
  const RC = window.RC, S = RC.S, t = RC.t, esc = RC.esc;
  RC.ui = {};
  RC.mods = {};
  const $ = id => document.getElementById(id);
  RC.$ = $;

  /* simple line pictograms */
  const IC = {
    overview: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
    events: '<path d="M11 2.5 5 11h4l-1 6.5L15 8.5h-4l0-6Z"/>',
    cases: '<rect x="2.5" y="4.5" width="15" height="11" rx="2"/><path d="M2.5 8h15M5.5 12h3"/><path d="m13 11 3 3M16 11l-3 3"/>',
    customers: '<circle cx="7.5" cy="7" r="2.6"/><path d="M2.8 16c.4-2.6 2.2-4 4.7-4s4.3 1.4 4.7 4M13 4.6a2.4 2.4 0 0 1 0 4.8M14.5 12.2c1.4.4 2.4 1.6 2.7 3.8"/>',
    campaigns: '<circle cx="4.5" cy="10" r="1.8"/><circle cx="10" cy="10" r="1.8"/><circle cx="15.5" cy="10" r="1.8"/><path d="M6.3 10h2M11.8 10h2"/>',
    rules: '<path d="M4 6h12M4 14h12"/><circle cx="8" cy="6" r="1.8"/><circle cx="13" cy="14" r="1.8"/>',
    studio: '<path d="M4 16 5 12 13.5 3.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8 15l-4 1Z"/><path d="m12 5 3 3"/>',
    outbox: '<path d="M3 10.5 17 3.5 13 16.5 9.5 11.5 3 10.5Z"/><path d="m9.5 11.5 7.5-8"/>',
    portal: '<rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M3 7.5h14M6 11.5h4M6 14h2"/>',
    analytics: '<path d="M4 16V9M9 16V4M14 16v-5M3 16.5h14"/>',
    integrations: '<path d="M8 6 6 8a2.8 2.8 0 0 0 4 4l1-1M12 14l2-2a2.8 2.8 0 0 0-4-4L9 9"/>',
    privacy: '<path d="M10 2.5 16 5v4.5c0 3.6-2.4 6.2-6 8-3.6-1.8-6-4.4-6-8V5l6-2.5Z"/><path d="m7.2 10 2 2 3.6-3.8"/>',
    access: '<circle cx="7" cy="10" r="3"/><path d="M10 10h7M14.5 10v2.5M17 10v2"/>',
    audit: '<path d="M5 3h8l3 3v11H5V3Z"/><path d="M8 9h5M8 12h5M8 15h3"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/>', plus: '<path d="M10 4v12M4 10h12"/>', download: '<path d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 14.5V16h12v-1.5"/>',
    menu: '<path d="M3.5 6h13M3.5 10h13M3.5 14h13"/>', check: '<path d="m4.5 10.5 3.5 3.5 7.5-8"/>', x: '<path d="m5 5 10 10M15 5 5 15"/>',
    left: '<path d="m12 4-6 6 6 6"/>', right: '<path d="m8 4 6 6-6 6"/>', play: '<path d="M6 4l10 6-10 6V4Z"/>', clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4.5l3 1.8"/>',
    mail: '<rect x="3" y="5" width="14" height="10" rx="2"/><path d="m3.5 6 6.5 5 6.5-5"/>', spark: '<path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.5 2.5M12 12l2.5 2.5M14.5 5.5 12 8M8 12l-2.5 2.5"/>',
    reset: '<path d="M4 10a6 6 0 1 0 2-4.5M4 3.5V6.5h3"/>', pause: '<path d="M6.5 4.5v11M13.5 4.5v11"/>', warn: '<path d="M10 3 18 16.5H2L10 3Z"/><path d="M10 8v4M10 14.2v.1"/>', lock: '<rect x="4.5" y="9" width="11" height="8" rx="1.6"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>'
  };
  RC.ico = (k, s) => `<svg viewBox="0 0 20 20" width="${s || 20}" height="${s || 20}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.audit}</svg>`;

  /* html helpers */
  const TONE = { ok: 'ok', warn: 'warn', bad: 'bad', info: 'info' };
  RC.badge = (tone, text) => `<span class="pf-badge ${TONE[tone] || 'info'}">${esc(text)}</span>`;
  RC.stBadge = st => RC.badge({ campaign: 'info', recovered: 'ok', lost: 'bad', paused: 'warn', attention: 'bad' }[st] || 'info', t('cst.' + st));
  RC.chips = (name, opts, cur) => `<div class="pf-tabs rc-chips" role="group">${opts.map(o => `<button type="button" data-act="chip" data-name="${name}" data-v="${o[0]}" aria-pressed="${cur === o[0]}">${esc(o[1])}</button>`).join('')}</div>`;
  RC.tabs = (name, list, cur, label) => `<div class="pf-tabs rc-tabs" role="tablist" aria-label="${esc(label || '')}">${list.map(o => `<button type="button" role="tab" data-act="tab" data-name="${name}" data-v="${o[0]}" aria-selected="${cur === o[0]}">${esc(o[1])}</button>`).join('')}</div>`;
  RC.select = (path, opts, cur, label) => `<label class="rc-lbl"><span>${esc(label)}</span><select data-set="${path}">${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(cur) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
  RC.search = (path, val, ph, fk) => `<div class="rc-search">${RC.ico('search', 18)}<input type="search" data-set="${path}" data-live="1" data-fk="${fk}" value="${esc(val)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" autocomplete="off" spellcheck="false"></div>`;
  RC.btn = (act, label, o) => { o = o || {}; const ok = o.perm ? RC.can(o.perm) : true; return `<button type="button" class="btn btn-sm ${o.ghost ? 'btn-ghost' : ''} ${o.cls || ''}" data-act="${act}" ${o.data || ''} ${ok ? '' : 'disabled aria-disabled="true" title="' + esc(t('perm.no')) + '"'}>${o.icon ? RC.ico(o.icon, 16) : ''}<span>${esc(label)}</span></button>`; };
  RC.empty = (h, p) => `<div class="rc-empty"><p class="rc-empty-h">${esc(h)}</p><p>${esc(p || '')}</p></div>`;
  RC.table = (cols, rows) => `<div class="rc-tw"><table class="rc-table"><thead><tr>${cols.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr class="${r.cls || ''}" ${r.attr || ''}>${r.cells.map((c, i) => `<td data-label="${esc(cols[i])}" class="${(r.cc && r.cc[i]) || ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  RC.kpi = (act, data, n, label, tone) => `<button type="button" class="rc-tile ${tone || ''}" data-act="${act}" ${data || ''}><span class="rc-n">${n}</span><span class="rc-l">${esc(label)}</span></button>`;
  RC.bar = (pct, tone) => `<span class="rc-bar2 ${tone || ''}" aria-hidden="true"><i style="width:${Math.max(2, Math.min(100, pct))}%"></i></span>`;
  RC.sw = (name, on, label, perm) => `<label class="rc-check rc-sw"><input type="checkbox" data-act="sw" data-name="${name}" ${on ? 'checked' : ''} ${perm && !RC.can(perm) ? 'disabled' : ''}><span>${esc(label)}</span></label>`;
  RC.custLink = id => { const c = RC.cust(id); return c ? `<button type="button" class="rc-open" data-act="open-c" data-id="${c.id}"><span class="rc-model">${esc(c.name)}</span><span class="rc-plate">${esc(c.contact)}</span></button>` : `<span class="rc-muted">${esc(t('anon'))}</span>`; };
  RC.caseLink = c => `<button type="button" class="rc-open" data-act="open-case" data-id="${c.id}"><span class="rc-model rc-mono">${esc(c.id)}</span><span class="rc-plate">${esc(t('reason.' + c.reason))}</span></button>`;
  RC.field = f => {
    const id = 'ff-' + f.name, err = f.err ? `<span class="rc-err" id="${id}-e" role="alert">${esc(f.err)}</span>` : '', inv = f.err ? ` aria-invalid="true" aria-describedby="${id}-e"` : '';
    if (f.type === 'checkbox') return `<label class="rc-check"><input type="checkbox" name="${f.name}" id="${id}" ${f.value ? 'checked' : ''}${inv}><span>${esc(f.label)}</span></label>${err}`;
    let ctl;
    if (f.type === 'select') ctl = `<select name="${f.name}" id="${id}"${inv}>${f.options.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(f.value) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') ctl = `<textarea name="${f.name}" id="${id}" rows="${f.rows || 3}"${inv}>${esc(f.value || '')}</textarea>`;
    else ctl = `<input name="${f.name}" id="${id}" type="${f.type || 'text'}" value="${esc(f.value == null ? '' : f.value)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} autocomplete="off"${inv}>`;
    return `<div class="rc-fld"><label for="${id}">${esc(f.label)}</label>${ctl}${f.hint ? `<span class="rc-hint">${esc(f.hint)}</span>` : ''}${err}</div>`;
  };

  /* toast */
  let toastT = null;
  RC.toast = msg => { const el = $('rc-toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4600); };

  /* dialog */
  let dlg = null, dlgOpener = null;
  const readForm = form => { const o = {}; new FormData(form).forEach((v, k) => { o[k] = v; }); form.querySelectorAll('input[type=checkbox]').forEach(c => { o[c.name] = c.checked; }); return o; };
  function drawDialog(vals, errs) {
    const host = $('rc-dlg');
    const fields = dlg.fields(vals).map(f => { f.err = errs && errs[f.name]; if (vals && vals[f.name] !== undefined && f.type !== 'info') f.value = vals[f.name]; return f.type === 'info' ? `<p class="rc-dinfo">${f.html ? f.text : esc(f.text)}</p>` : RC.field(f); }).join('');
    host.innerHTML = `<div class="rc-modal-bg" data-act="dlg-x"></div><form class="rc-modal" role="dialog" aria-modal="true" aria-labelledby="rc-dt" novalidate><h3 id="rc-dt" class="rc-h3">${esc(dlg.title)}</h3>${dlg.note ? `<p class="rc-sub">${esc(dlg.note)}</p>` : ''}<div class="rc-form">${fields}</div><div class="rc-mact"><button type="button" class="btn btn-sm btn-ghost" data-act="dlg-x">${esc(t('cancel'))}</button><button type="submit" class="btn btn-sm">${esc(dlg.submit || t('save'))}</button></div></form>`;
    host.hidden = false;
    const bad = host.querySelector('[aria-invalid="true"]') || host.querySelector('input,select,textarea');
    if (bad) bad.focus();
  }
  RC.dialog = cfg => { dlg = cfg; dlgOpener = document.activeElement; drawDialog(cfg.values || {}, null); };
  RC.closeDialog = () => { const h = $('rc-dlg'); h.hidden = true; h.innerHTML = ''; dlg = null; if (dlgOpener && document.contains(dlgOpener)) dlgOpener.focus({ preventScroll: true }); };
  $('rc-dlg').addEventListener('submit', e => {
    e.preventDefault();
    const vals = readForm(e.target), errs = dlg.onSubmit(vals);
    if (errs && Object.keys(errs).length) { drawDialog(vals, errs); return; }
    RC.closeDialog(); RC.refresh();
  });
  $('rc-dlg').addEventListener('click', e => { if (e.target.closest('[data-act="dlg-x"]')) RC.closeDialog(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg) RC.closeDialog(); });

  /* paint with focus preserved */
  RC.paint = () => {
    const m = RC.mods[S.mod], root = $('rc-mod'), a = document.activeElement;
    const fk = a && a.getAttribute ? a.getAttribute('data-fk') : null, ss = a && a.selectionStart;
    root.innerHTML = m.render();
    if (fk) { const n = root.querySelector('[data-fk="' + fk + '"]'); if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(ss, ss); } catch (e) { /* not a text field */ } } }
    if (m.after) m.after(root);
  };
  function renderSim() {
    $('rc-clock').textContent = t('sim.date', { d: RC.fmtDate(S.now), t: RC.fmtTime(S.now) });
    const sel = $('rc-role');
    sel.innerHTML = RC.ROLES.map(r => `<option value="${r}"${S.role === r ? ' selected' : ''}>${esc(t('role.' + r))}</option>`).join('');
  }
  RC.refresh = () => { renderNav(); renderSim(); $('rc-ribbon').hidden = S.role === 'admin'; $('rc-ribbon').textContent = t('ribbon.' + S.role); RC.paint(); };

  /* navigation */
  const ORDER = ['overview', 'events', 'cases', 'customers', 'campaigns', 'rules', 'studio', 'outbox', 'portal', 'analytics', 'integrations', 'privacy', 'access', 'audit'];
  RC.ORDER = ORDER;
  function badgeFor(m) {
    if (m === 'cases') return S.cases.filter(c => c.status === 'attention').length;
    if (m === 'outbox') return S.mails.filter(x => x.state === 'review' || x.state === 'failed').length;
    if (m === 'campaigns') return S.cases.filter(c => c.status === 'campaign').length;
    return 0;
  }
  function renderNav() {
    $('rc-nav').innerHTML = ORDER.filter(RC.modVisible).map(m => {
      const b = badgeFor(m);
      return `<button type="button" class="rc-nv" data-go-mod="${m}" aria-current="${S.mod === m ? 'page' : 'false'}">${RC.ico(m)}<span class="rc-nvl">${esc(t('mod.' + m))}</span>${b ? `<span class="rc-nb">${b}</span>` : ''}</button>`;
    }).join('');
    $('rc-modname').textContent = t('mod.' + S.mod);
  }
  RC.go = (mod, opts, scroll) => {
    if (!RC.mods[mod]) return;
    if (!RC.modVisible(mod)) mod = 'overview';
    S.mod = mod; if (opts) opts();
    $('rc').classList.remove('menu');
    $('rc-menu').setAttribute('aria-expanded', 'false');
    RC.refresh();
    if (scroll) $('rc').scrollIntoView({ behavior: window.PF && PF.reduced ? 'auto' : 'smooth', block: 'start' });
    else { const top = $('rc').getBoundingClientRect().top; if (top < 0) $('rc').scrollIntoView({ block: 'start' }); }
  };
  RC.openCaseCard = (id, tab) => { RC.go('cases', () => { S.sel = id; RC.ui.ctab = tab || 'timeline'; }); };
  RC.openCust = id => { RC.go('customers', () => { S.csel = id; }); };

  /* generic events */
  const root = $('rc-mod');
  RC.setPath = (path, val) => { const p = path.split('.'); let o = RC.ui; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = val; };
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const m = RC.mods[S.mod], act = el.getAttribute('data-act');
    if (act === 'chip') { RC.setPath(el.getAttribute('data-name'), el.getAttribute('data-v')); RC.paint(); return; }
    if (act === 'tab') { const v = el.getAttribute('data-v'); RC.setPath(el.getAttribute('data-name'), v); RC.paint(); const n = root.querySelector('[data-act="tab"][data-v="' + v + '"]'); if (n && e.detail === 0) n.focus(); return; }
    if (act === 'open-case') { RC.openCaseCard(el.getAttribute('data-id')); return; }
    if (act === 'open-c') { RC.openCust(el.getAttribute('data-id')); return; }
    if (act === 'goto') { RC.go(el.getAttribute('data-mod'), () => { const u = el.getAttribute('data-ui'); if (u) { const [p, v] = u.split('='); RC.setPath(p, v); } }); return; }
    if (m.act) m.act(act, el, e);
  });
  const onSet = e => {
    const el = e.target.closest('[data-set]'); if (!el) return;
    if (e.type === 'input' && !el.hasAttribute('data-live')) return;
    if (e.type === 'change' && el.hasAttribute('data-live')) return;
    RC.setPath(el.getAttribute('data-set'), el.type === 'checkbox' ? el.checked : el.value);
    const m = RC.mods[S.mod]; if (m.onset) m.onset(el);
    RC.paint();
  };
  root.addEventListener('input', onSet); root.addEventListener('change', onSet);
  root.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tl = e.target.closest('[role=tab]'); if (!tl) return;
    const all = Array.from(tl.parentNode.querySelectorAll('[role=tab]')), i = all.indexOf(tl), n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    n.focus(); n.click(); e.preventDefault();
    const again = root.querySelector('[data-act="tab"][data-v="' + n.getAttribute('data-v') + '"]'); if (again) again.focus();
  });
  $('rc-nav').addEventListener('click', e => { const b = e.target.closest('[data-go-mod]'); if (b) { S.sel = null; S.csel = null; RC.go(b.getAttribute('data-go-mod')); $('rc-mod').focus({ preventScroll: true }); } });
  $('rc-menu').addEventListener('click', () => { const f = $('rc'); f.classList.toggle('menu'); $('rc-menu').setAttribute('aria-expanded', String(f.classList.contains('menu'))); });
  $('rc-role').addEventListener('change', e => {
    S.role = e.target.value; if (!RC.modVisible(S.mod)) S.mod = 'overview';
    RC.toast(t('role.switched', { role: t('role.' + S.role) })); RC.refresh();
  });
  $('rc-tick').addEventListener('click', () => {
    if (!RC.can('act')) { RC.toast(t('perm.no')); return; }
    const r = RC.tick(1); RC.refresh();
    RC.toast(t('sim.done', { s: r.sent, r: r.rec, l: r.lost }));
  });
  $('rc-reset').addEventListener('click', () => { RC.reset(); RC.ui.reset && RC.ui.reset(); RC.refresh(); RC.toast(t('sim.reset')); });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-go]'); if (!a) return;
    e.preventDefault(); S.sel = null; S.csel = null; RC.go(a.getAttribute('data-go'), null, true);
  });
}());
