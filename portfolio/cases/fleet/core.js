/* Fleet Desk demo: application shell, helpers, dialogs, navigation. */
(function () {
  'use strict';
  const FD = window.FD, S = FD.S, t = FD.t, esc = FD.esc;
  FD.ui = { vehicles: { q: '', st: 'all', dept: 'all', state: 'all', sort: 'urgency' }, deadlines: { tab: 'list', type: 'all', st: 'all', dept: 'all', calY: FD.today.getFullYear(), calM: FD.today.getMonth(), day: null }, repairs: { st: 'all', q: '', open: null }, fuel: { tab: 'log', vid: 'all', q: '', flag: false }, dir: { tab: 'staff', q: '', cpType: 'all' }, notif: { tab: 'rules', rule: 'N1', vid: 'v1', fr: 'all', fch: 'all', fst: 'all', q: '' }, reports: { tab: 'cons', dept: 'all' }, access: { tab: 'users' }, audit: { who: 'all', q: '', ent: 'all' } };
  FD.mods = {};
  const $ = id => document.getElementById(id);
  FD.$ = $;

  /* icons: simple line pictograms */
  const IC = {
    overview: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
    vehicles: '<path d="M3 12v-2l1.6-4.2A1.5 1.5 0 0 1 6 5h8a1.5 1.5 0 0 1 1.4.8L17 10v2"/><path d="M3 12h14v3H3z"/><circle cx="6.5" cy="15" r="1.2"/><circle cx="13.5" cy="15" r="1.2"/>',
    deadlines: '<rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/>',
    repairs: '<path d="M12.5 3.5a3.8 3.8 0 0 0-3.3 5.3L3.8 14.2a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a3.8 3.8 0 0 0 5.3-3.3l-2.3 2.3-2-.5-.5-2 2.3-2.3Z"/>',
    fuel: '<path d="M5 17V4.5A1.5 1.5 0 0 1 6.5 3h4A1.5 1.5 0 0 1 12 4.5V17M4 17h9M12 8h1.5a1.5 1.5 0 0 1 1.5 1.5V13a1 1 0 0 0 2 0V7l-2-2"/>',
    directories: '<path d="M4 4h12v12H4z"/><path d="M4 8h12M8 8v8"/>',
    notifications: '<path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13L5 14Z"/><path d="M8.5 17.5a1.6 1.6 0 0 0 3 0"/>',
    reports: '<path d="M4 16V9M9 16V4M14 16v-5M3 16.5h14"/>',
    import: '<path d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 14.5V16h12v-1.5"/>',
    integrations: '<path d="M8 6 6 8a2.8 2.8 0 0 0 4 4l1-1M12 14l2-2a2.8 2.8 0 0 0-4-4L9 9"/>',
    access: '<circle cx="10" cy="7" r="3"/><path d="M4 16.5c.6-3 3-4.5 6-4.5s5.4 1.5 6 4.5"/>',
    audit: '<path d="M5 3h8l3 3v11H5V3Z"/><path d="M8 9h5M8 12h5M8 15h3"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/>',
    plus: '<path d="M10 4v12M4 10h12"/>', download: '<path d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 14.5V16h12v-1.5"/>',
    menu: '<path d="M3.5 6h13M3.5 10h13M3.5 14h13"/>', check: '<path d="m4.5 10.5 3.5 3.5 7.5-8"/>', x: '<path d="m5 5 10 10M15 5 5 15"/>',
    shield: '<path d="M10 2.5 16 5v4.5c0 3.6-2.4 6.2-6 8-3.6-1.8-6-4.4-6-8V5l6-2.5Z"/>', file: '<path d="M5 3h7l3 3v11H5V3Z"/><path d="M12 3v3h3M7.5 10h5M7.5 13h5"/>',
    left: '<path d="m12 4-6 6 6 6"/>', right: '<path d="m8 4 6 6-6 6"/>', msg: '<path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2v-6Z"/>',
    team: '<circle cx="7.5" cy="7" r="2.6"/><path d="M2.8 16c.4-2.6 2.2-4 4.7-4s4.3 1.4 4.7 4M13 4.6a2.4 2.4 0 0 1 0 4.8M14.5 12.2c1.4.4 2.4 1.6 2.7 3.8"/>',
    email: '<rect x="3" y="5" width="14" height="10" rx="2"/><path d="m3.5 6 6.5 5 6.5-5"/>', svc: '<path d="M12.5 3.5a3.8 3.8 0 0 0-3.3 5.3L3.8 14.2a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a3.8 3.8 0 0 0 5.3-3.3l-2.3 2.3-2-.5-.5-2 2.3-2.3Z"/>',
    ins: '<path d="M10 2.5 16 5v4.5c0 3.6-2.4 6.2-6 8-3.6-1.8-6-4.4-6-8V5l6-2.5Z"/>', comp: '<path d="M10 2.5 16 5v4.5c0 3.6-2.4 6.2-6 8-3.6-1.8-6-4.4-6-8V5l6-2.5Z"/><path d="m7.2 10 2 2 3.6-3.8"/>',
    insp: '<rect x="3.5" y="3.5" width="13" height="13" rx="2"/><path d="m7 10.2 2.2 2.2L13.2 8"/>', poa: '<path d="M5 3h7l3 3v11H5V3Z"/><path d="M12 3v3h3M7.5 10h5M7.5 13h5"/>', svckm: '<path d="M3 13a7 7 0 1 1 14 0"/><path d="m10 13 3-4"/>'
  };
  FD.ico = (k, s) => `<svg viewBox="0 0 20 20" width="${s || 20}" height="${s || 20}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.file}</svg>`;

  /* html helpers */
  FD.badge = (state, text) => `<span class="pf-badge ${{ overdue: 'bad', soon: 'warn', ok: 'ok', info: 'info', bad: 'bad', warn: 'warn' }[state] || 'info'}">${esc(text || t('status.' + state))}</span>`;
  FD.chips = (name, opts, cur, extra) => `<div class="pf-tabs fd-chips" role="group" ${extra || ''}>${opts.map(o => `<button type="button" data-act="chip" data-name="${name}" data-v="${o[0]}" aria-pressed="${cur === o[0]}">${esc(o[1])}</button>`).join('')}</div>`;
  FD.tabs = (name, list, cur, label) => `<div class="pf-tabs fd-tabs" role="tablist" aria-label="${esc(label || '')}">${list.map(o => `<button type="button" role="tab" data-act="tab" data-name="${name}" data-v="${o[0]}" aria-selected="${cur === o[0]}">${esc(o[1])}</button>`).join('')}</div>`;
  FD.select = (path, opts, cur, label, cls) => `<label class="fd-lbl ${cls || ''}"><span>${esc(label)}</span><select data-set="${path}">${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(cur) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
  FD.search = (path, val, ph, fk) => `<div class="fd-search">${FD.ico('search', 18)}<input type="search" data-set="${path}" data-live="1" data-fk="${fk}" value="${esc(val)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" autocomplete="off" spellcheck="false"></div>`;
  FD.btn = (act, label, o) => { o = o || {}; const ok = o.perm ? FD.can(o.perm) : true; return `<button type="button" class="btn btn-sm ${o.ghost ? 'btn-ghost' : ''} ${o.cls || ''}" data-act="${act}" ${o.data || ''} ${ok ? '' : 'disabled aria-disabled="true" title="' + esc(t('perm.no')) + '"'}>${o.icon ? FD.ico(o.icon, 16) : ''}<span>${esc(label)}</span></button>`; };
  FD.empty = (h, p) => `<div class="fd-empty"><p class="fd-empty-h">${esc(h)}</p><p>${esc(p || '')}</p></div>`;
  FD.table = (cols, rows) => `<div class="fd-tw"><table class="fd-table"><thead><tr>${cols.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr class="${r.cls || ''}" ${r.attr || ''}>${r.cells.map((c, i) => `<td data-label="${esc(cols[i])}" class="${(r.cc && r.cc[i]) || ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  FD.kpi = (act, data, n, label, tone) => `<button type="button" class="fd-tile ${tone || ''}" data-act="${act}" ${data || ''}><span class="fd-n">${n}</span><span class="fd-l">${esc(label)}</span></button>`;
  FD.vlink = v => `<button type="button" class="fd-open" data-act="open-v" data-id="${v.id}"><span class="fd-model">${esc(v.model)}</span><span class="fd-plate">${esc(v.plate)}</span></button>`;
  FD.bar = (pct, tone) => `<span class="fd-bar2 ${tone || ''}" aria-hidden="true"><i style="width:${Math.max(2, Math.min(100, pct))}%"></i></span>`;
  FD.field = f => {
    const id = 'ff-' + f.name, err = f.err ? `<span class="fd-err" id="${id}-e" role="alert">${esc(f.err)}</span>` : '', inv = f.err ? ` aria-invalid="true" aria-describedby="${id}-e"` : '';
    if (f.type === 'checkbox') return `<label class="fd-check"><input type="checkbox" name="${f.name}" id="${id}" ${f.value ? 'checked' : ''}${inv}><span>${esc(f.label)}</span></label>${err}`;
    let ctl;
    if (f.type === 'select') ctl = `<select name="${f.name}" id="${id}"${inv}>${f.options.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(f.value) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') ctl = `<textarea name="${f.name}" id="${id}" rows="3"${inv}>${esc(f.value || '')}</textarea>`;
    else ctl = `<input name="${f.name}" id="${id}" type="${f.type || 'text'}" value="${esc(f.value == null ? '' : f.value)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} autocomplete="off"${inv}>`;
    return `<div class="fd-fld"><label for="${id}">${esc(f.label)}</label>${ctl}${f.hint ? `<span class="fd-hint">${esc(f.hint)}</span>` : ''}${err}</div>`;
  };

  /* toast */
  let toastT = null;
  FD.toast = msg => { const el = $('fd-toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200); };

  /* dialog */
  let dlg = null, dlgOpener = null;
  const readForm = form => { const o = {}; new FormData(form).forEach((v, k) => { o[k] = v; }); form.querySelectorAll('input[type=checkbox]').forEach(c => { o[c.name] = c.checked; }); return o; };
  function drawDialog(vals, errs) {
    const host = $('fd-dlg');
    const fields = dlg.fields(vals).map(f => { f.err = errs && errs[f.name]; if (vals && vals[f.name] !== undefined && f.type !== 'info') f.value = vals[f.name]; return f.type === 'info' ? `<p class="fd-dinfo">${esc(f.text)}</p>` : FD.field(f); }).join('');
    host.innerHTML = `<div class="fd-modal-bg" data-act="dlg-x"></div><form class="fd-modal" role="dialog" aria-modal="true" aria-labelledby="fd-dt" novalidate><h3 id="fd-dt" class="fd-h3">${esc(dlg.title)}</h3>${dlg.note ? `<p class="fd-sub">${esc(dlg.note)}</p>` : ''}<div class="fd-form">${fields}</div><div class="fd-mact"><button type="button" class="btn btn-sm btn-ghost" data-act="dlg-x">${esc(t('cancel'))}</button><button type="submit" class="btn btn-sm">${esc(dlg.submit || t('save'))}</button></div></form>`;
    host.hidden = false;
    const bad = host.querySelector('[aria-invalid="true"]') || host.querySelector('input,select,textarea');
    if (bad) bad.focus();
  }
  FD.dialog = cfg => { dlg = cfg; dlgOpener = document.activeElement; drawDialog(cfg.values || {}, null); };
  FD.closeDialog = () => { const h = $('fd-dlg'); h.hidden = true; h.innerHTML = ''; dlg = null; if (dlgOpener && document.contains(dlgOpener)) dlgOpener.focus({ preventScroll: true }); };
  $('fd-dlg').addEventListener('submit', e => {
    e.preventDefault();
    const vals = readForm(e.target), errs = dlg.onSubmit(vals);
    if (errs && Object.keys(errs).length) { drawDialog(vals, errs); return; }
    FD.closeDialog(); FD.refresh();
  });
  $('fd-dlg').addEventListener('click', e => { if (e.target.closest('[data-act="dlg-x"]')) FD.closeDialog(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg) FD.closeDialog(); });

  /* paint with focus preserved */
  FD.paint = () => {
    const m = FD.mods[S.mod], root = $('fd-mod'), a = document.activeElement;
    const fk = a && a.getAttribute ? a.getAttribute('data-fk') : null, ss = a && a.selectionStart;
    root.innerHTML = m.render();
    if (fk) { const n = root.querySelector('[data-fk="' + fk + '"]'); if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(ss, ss); } catch (e) { /* not a text field */ } } }
    if (m.after) m.after(root);
  };
  FD.refresh = () => { renderNav(); $('fd-ribbon').hidden = S.role !== 'head'; FD.paint(); };

  /* navigation */
  const ORDER = ['overview', 'vehicles', 'deadlines', 'repairs', 'fuel', 'directories', 'notifications', 'reports', 'import', 'integrations', 'access', 'audit'];
  FD.ORDER = ORDER;
  function badgeFor(m) {
    if (m === 'deadlines') return FD.scoped().filter(v => FD.sum(v).state === 'overdue').length;
    if (m === 'repairs') return S.repairs.filter(r => r.status === 'requested').length;
    if (m === 'notifications') return FD.candidates().length;
    if (m === 'fuel') return S.vehicles.filter(v => FD.dev(v) > S.rules.N7.thr).length;
    return 0;
  }
  function renderNav() {
    const side = $('fd-nav');
    side.innerHTML = ORDER.filter(FD.modVisible).map(m => {
      const b = badgeFor(m);
      return `<button type="button" class="fd-nv" data-go-mod="${m}" aria-current="${S.mod === m ? 'page' : 'false'}">${FD.ico(m)}<span class="fd-nvl">${esc(t('mod.' + m))}</span>${b ? `<span class="fd-nb">${b}</span>` : ''}</button>`;
    }).join('');
    $('fd-modname').textContent = t('mod.' + S.mod);
    const sel = $('fd-role');
    sel.innerHTML = FD.ROLES.map(r => `<option value="${r}"${S.role === r ? ' selected' : ''}>${esc(t('role.' + r))}</option>`).join('');
  }
  FD.go = (mod, opts, scroll) => {
    if (!FD.mods[mod]) return;
    if (!FD.modVisible(mod)) mod = 'overview';
    S.mod = mod; if (opts) opts();
    $('fd').classList.remove('menu');
    FD.refresh();
    if (scroll) $('fd').scrollIntoView({ behavior: window.PF && PF.reduced ? 'auto' : 'smooth', block: 'start' });
    else { const top = $('fd').getBoundingClientRect().top; if (top < 0) $('fd').scrollIntoView({ block: 'start' }); }
  };
  FD.openVehicle = (id, tab) => { FD.go('vehicles', () => { S.sel = id; S.vtab = tab || 'docs'; }); };

  /* generic events */
  const root = $('fd-mod');
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const m = FD.mods[S.mod], act = el.getAttribute('data-act');
    if (act === 'chip') { FD.setPath(el.getAttribute('data-name'), el.getAttribute('data-v')); FD.paint(); return; }
    if (act === 'tab') { FD.setPath(el.getAttribute('data-name'), el.getAttribute('data-v')); FD.paint(); const n = root.querySelector('[data-act="tab"][data-v="' + el.getAttribute('data-v') + '"]'); if (n && e.detail === 0) n.focus(); return; }
    if (act === 'open-v') { S.sel = el.getAttribute('data-id'); S.vtab = 'docs'; FD.go('vehicles'); return; }
    if (act === 'goto') { FD.go(el.getAttribute('data-mod'), () => { if (el.getAttribute('data-ui')) { const [p, v] = el.getAttribute('data-ui').split('='); FD.setPath(p, v); } }); return; }
    if (m.act) m.act(act, el, e);
  });
  FD.setPath = (path, val) => { if (path === 'vtab') { S.vtab = val; return; } const p = path.split('.'); let o = FD.ui; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = val; };
  const onSet = e => {
    const el = e.target.closest('[data-set]'); if (!el) return;
    if (e.type === 'input' && !el.hasAttribute('data-live')) return;
    if (e.type === 'change' && el.hasAttribute('data-live')) return;
    FD.setPath(el.getAttribute('data-set'), el.type === 'checkbox' ? el.checked : el.value);
    const m = FD.mods[S.mod]; if (m.onset) m.onset(el);
    FD.paint();
  };
  root.addEventListener('input', onSet); root.addEventListener('change', onSet);
  root.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tl = e.target.closest('[role=tab]'); if (!tl) return;
    const all = Array.from(tl.parentNode.querySelectorAll('[role=tab]')), i = all.indexOf(tl), n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    n.focus(); n.click(); e.preventDefault();
    const again = root.querySelector('[data-act="tab"][data-v="' + n.getAttribute('data-v') + '"]'); if (again) again.focus();
  });
  $('fd-nav').addEventListener('click', e => { const b = e.target.closest('[data-go-mod]'); if (b) { S.sel = null; FD.go(b.getAttribute('data-go-mod')); $('fd-mod').focus({ preventScroll: true }); } });
  $('fd-menu').addEventListener('click', () => { const f = $('fd'); f.classList.toggle('menu'); $('fd-menu').setAttribute('aria-expanded', String(f.classList.contains('menu'))); });
  $('fd-role').addEventListener('change', e => {
    S.role = e.target.value; if (!FD.modVisible(S.mod)) S.mod = 'overview';
    FD.toast(t('role.switched', { role: t('role.' + S.role) })); FD.refresh();
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-go]'); if (!a) return;
    e.preventDefault(); S.sel = null; FD.go(a.getAttribute('data-go'), null, true);
  });
}());
