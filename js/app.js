/* GymCal UI: views, sheets, and event handling. */
(function () {
  'use strict';
  const { D, GROUPS, FIELD_PRESETS, METRIC_TYPES } = Store;
  const L = Logic;

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const fmt = (n, dp = 1) => {
    const v = Number(n);
    if (n == null || n === '' || !isFinite(v)) return '—';
    return v.toLocaleString(undefined, { maximumFractionDigits: dp });
  };
  const signed = (n, dp = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n), dp);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map(m => m.slice(0, 3));
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WDS = WD.map(w => w.slice(0, 3));
  const longDate = ds => { const d = D.parse(ds); return MONTHS[d.getMonth()] + ' ' + d.getDate(); };
  const shortDate = ds => { const d = D.parse(ds); return MON[d.getMonth()] + ' ' + d.getDate(); };
  const weekday = ds => WD[D.dow(ds)];

  const AVATARS = ['💪', '🏃', '🧘', '🏋️', '🚴', '⚡', '🔥', '🌟', '🦁', '🐯', '🌸', '🍀'];
  const COLORS = ['#2563eb', '#0ea5e9', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0d9488', '#475569'];
  const RANGES = { '1W': 7, '1M': 30, '3M': 91, '6M': 182, '1Y': 365, All: 0 };

  const STATUS = {
    done: { label: 'Workout completed', short: 'Done' },
    partial: { label: 'Partially completed', short: 'Partial' },
    progress: { label: 'In progress', short: 'In progress' },
    todo: { label: 'Not started yet', short: 'To do' },
    missed: { label: 'Missed', short: 'Missed' },
    rest: { label: 'Rest day', short: 'Rest' },
    future: { label: 'Planned', short: 'Planned' },
    none: { label: 'Not tracked', short: '—' },
  };

  const ICONS = {
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    dumbbell: '<path d="M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    chevL: '<path d="M15 18l-6-6 6-6"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>',
    chevD: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.5 2.4 3.5 5.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  };
  const ic = (n, cls = '') => '<svg class="ic ' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>';

  const avatar = (m, size = '') => '<span class="avatar ' + size + '" style="--av:' + esc(m.color) + '">' + esc(m.avatar) + '</span>';
  const groupIcon = (u, e) => GROUPS[L.groupOf(u, e)].icon;
  const metricIcon = m => m.builtin === 'weight' ? '⚖️' : m.builtin === 'waist' ? '📏' :
    /sleep/i.test(m.name) ? '😴' : /step/i.test(m.name) ? '👣' : /calor/i.test(m.name) ? '🔥' : m.type === 'percentage' ? '📊' : '📐';
  const isNumericMetric = m => m.type !== 'text' && m.type !== 'bool';
  const metricValue = (m, v) => m.type === 'bool' ? (v ? 'Yes' : 'No') : m.type === 'text' ? esc(v) : fmt(v, 2) + (m.unit ? ' ' + esc(m.unit) : '');
  const planName = (u, ids) => ids.map(id => L.ex(u, id).name).join(' + ');

  /* ---------- UI state ---------- */
  const ui = {
    view: 'home',
    month: D.today().slice(0, 7),
    selected: D.today(),
    filter: 'all',
    exTab: 'list',
    range: {},
    cardioEx: 'all',
    cardioChart: 'session',
    otherMetric: null,
    logAll: false,
    calView: (() => { try { return localStorage.getItem('gymcal.calView') || 'month'; } catch (e) { return 'month'; } })(),
    qaOpen: null,
    qaGroup: 'strength',
    sheet: null,
    charts: [],
  };

  const unlocked = new Set((() => { try { return JSON.parse(sessionStorage.getItem('gymcal.unlocked') || '[]'); } catch (e) { return []; } })());
  const markUnlocked = id => { unlocked.add(id); try { sessionStorage.setItem('gymcal.unlocked', JSON.stringify([...unlocked])); } catch (e) { /* ignore */ } };
  const isLocked = id => { const m = Store.meta(id); return !!(m && m.pinHash && !unlocked.has(id)); };

  async function hashPin(pin, salt) {
    const data = new TextEncoder().encode(salt + ':' + pin);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0;
    data.forEach(b => { h = (h * 31 + b) | 0; });
    return 'x' + h;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  Store.onError = toast;
  Store.onSaved = () => Sync.schedule();
  Sync.onStatus(() => {
    const chip = document.getElementById('sync-chip');
    if (chip) chip.outerHTML = syncChip();
    else if (Store.activeMeta() && Sync.status().state !== 'off' && !ui.sheet) render();
  });
  // New data from another device: refresh now, or when the open window closes.
  Sync.onData(() => { if (!ui.sheet) render(); });

  let saveTimer;
  const save = () => Store.save();
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); };

  function applyTheme(t) {
    const r = document.documentElement;
    if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
    const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('meta[name="theme-color"]').setAttribute('content', dark ? '#0b1a2e' : '#162e51');
  }

  /* ---------- top-level render ---------- */
  function render() {
    ui.charts = [];
    const app = $('#app');
    const meta = Store.activeMeta();
    if (!meta) {
      applyTheme('system');
      app.classList.add('bare');
      $('#topbar').innerHTML = '';
      $('#view').innerHTML = viewWelcome();
      return;
    }
    const u = Store.active();
    applyTheme(u.settings.theme);
    if (isLocked(meta.id)) {
      app.classList.add('bare');
      $('#topbar').innerHTML = '';
      $('#view').innerHTML = viewLock(meta);
      const inp = $('#view input[name=pin]');
      if (inp) inp.focus();
      return;
    }
    app.classList.remove('bare');
    $('#nav').innerHTML = navHtml();
    $('#topbar').innerHTML = topbarHtml(meta);
    $('#ex-names').innerHTML = u.exercises.map(e => '<option value="' + esc(e.name) + '"></option>').join('');
    $('#view').innerHTML = VIEWS[ui.view](u) +
      '<footer class="app-foot"><span>GymCal · Family workout calendar</span><span>Data is stored privately on this device.</span></footer>';
    drawCharts();
  }
  const drawCharts = () => ui.charts.forEach(fn => fn());
  // Past days are read-only. A single past date can be unlocked (until the sheet closes)
  // by typing the profile name three times.
  let unlockedDay = null;
  const canEdit = ds => ds >= D.today() || ds === unlockedDay;
  function guard(ds) {
    if (canEdit(ds)) return true;
    toast('🔒 ' + longDate(ds) + ' is over and locked');
    return false;
  }

  function focusQuickAdd(target) {
    const inp = document.querySelector('.quick-add[data-target="' + target + '"] input[name=name]');
    if (inp) inp.focus({ preventScroll: true });
  }

  const TABS = [['home', 'Calendar', 'calendar'], ['progress', 'Progress', 'chart']];
  function navHtml() {
    return '<div class="brand"><img src="icon.svg" alt="" width="34" height="34"><span>GymCal</span></div>' +
      TABS.map(([v, l, i]) => '<button class="tab ' + (ui.view === v ? 'active' : '') + '" data-action="nav" data-view="' + v + '" aria-current="' + (ui.view === v ? 'page' : 'false') + '">' +
        '<span class="tab-ic">' + ic(i) + '</span><span>' + l + '</span></button>').join('');
  }

  function topbarHtml(meta) {
    return '<span class="mob-brand"><img src="icon.svg" alt="" width="28" height="28">GymCal</span>' +
      '<button class="user-pill" data-action="open-switcher" aria-label="Switch profile">' + avatar(meta) +
      '<span class="user-name">' + esc(meta.name) + '</span>' + ic('chevD', 'chev') + '</button>' +
      '<span class="topbar-right">' + syncChip() +
      '<button class="btn btn-primary only-wide" data-action="open-day" data-date="' + D.today() + '">' + ic('plus') + 'Log today</button></span>';
  }

  // Persistent storage: browsers may otherwise clear site data when space is low (or, on Safari, after weeks unused).
  let storageKept = null;
  async function keepStorage() {
    if (!navigator.storage || !navigator.storage.persist) return;
    try { storageKept = (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch (e) { storageKept = false; }
    if (ui.view === 'profile' && !ui.sheet) render();
  }

  const SYNC_LABEL = { idle: 'Sync', syncing: 'Syncing…', ok: 'Synced', offline: 'Offline', error: 'Sync error' };
  function syncChip() {
    const st = Sync.status();
    if (st.state === 'off') return '';
    const title = st.message || (st.at ? 'Last synced ' + st.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'GitHub sync');
    return '<button class="sync-chip s-' + st.state + '" id="sync-chip" data-action="open-sync" title="' + esc(title) + '">' + ic('cloud') + '<span>' + SYNC_LABEL[st.state] + '</span></button>';
  }

  /* ---------- welcome / lock ---------- */
  function profileFields(m) {
    return '<label class="field"><span>Name</span><input class="input" name="name" required maxlength="30" autocomplete="off" placeholder="e.g. Saurabh" value="' + esc(m.name) + '"></label>' +
      '<div class="field"><span>Avatar</span><div class="avatar-pick">' +
      AVATARS.map(a => '<label><input type="radio" name="avatar" value="' + a + '"' + (a === m.avatar ? ' checked' : '') + '><span>' + a + '</span></label>').join('') + '</div></div>' +
      '<div class="field"><span>Colour</span><div class="color-pick">' +
      COLORS.map(c => '<label><input type="radio" name="color" value="' + c + '"' + (c === m.color ? ' checked' : '') + '><span style="--c:' + c + '"></span></label>').join('') + '</div></div>';
  }

  function viewWelcome() {
    return '<div class="welcome"><div class="welcome-card">' +
      '<img class="welcome-logo" src="icon.svg" alt="" width="64" height="64">' +
      '<h1>Never miss a workout.</h1>' +
      '<p class="muted">A clean calendar for your workouts. Click any date, type what you did, and track your progress. Each family member gets their own private profile.</p>' +
      '<form data-form="welcome">' + profileFields({ name: '', avatar: AVATARS[0], color: COLORS[0] }) +
      '<button class="btn btn-primary btn-lg btn-block" type="submit">Create my profile</button></form>' +
      '<div class="or"><span>or</span></div>' +
      '<button class="btn btn-ghost btn-block" data-action="open-sync">' + ic('cloud') + 'Already use GymCal? Connect GitHub sync</button>' +
      '<p class="fine">Data is saved in this browser. Turn on GitHub sync to keep it safe and share it across devices.</p>' +
      '</div></div>';
  }

  function viewLock(meta) {
    const others = Store.list().filter(m => m.id !== meta.id);
    return '<div class="welcome"><div class="welcome-card center">' + avatar(meta, 'xl') +
      '<h1>' + esc(meta.name) + '</h1><p class="muted">This profile is protected. Enter the PIN to continue.</p>' +
      '<form data-form="unlock"><input class="input pin-input" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="••••" aria-label="PIN">' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit">Unlock</button></form>' +
      (others.length ? '<div class="or"><span>switch profile</span></div><div class="lock-others">' +
        others.map(m => '<button class="lock-user" data-action="lock-switch" data-id="' + m.id + '">' + avatar(m) + '<span>' + esc(m.name) + '</span></button>').join('') + '</div>' : '') +
      '</div></div>';
  }

  /* ---------- HOME / CALENDAR ---------- */
  function viewHome(u) {
    return calendarCard(u);
  }

  function pill(state, total) {
    const label = state === 'done' && !total ? 'Bonus' : STATUS[state].short;
    return '<span class="pill s-' + state + '">' + label + '</span>';
  }

  // Type-a-name quick add: picks an existing exercise or creates a new one of the chosen type.
  function quickAdd(u, target, alwaysOpen) {
    const [kind, val] = target.split(':');
    const pick = kind === 'day' ? 'data-mode="day" data-date="' + val + '"' : 'data-mode="plan" data-dow="' + val + '"';
    if (!alwaysOpen && ui.qaOpen !== target) {
      return '<button class="add-row sm" data-action="qa-open" data-target="' + target + '">' + ic('plus') + 'Add exercise</button>';
    }
    return '<form class="quick-add" data-form="quick-add" data-target="' + target + '">' +
      '<input class="input" name="name" list="ex-names" placeholder="Type exercise name…" autocomplete="off" maxlength="40" required aria-label="Exercise name">' +
      '<select class="input" name="group" aria-label="Type">' + Object.keys(GROUPS).map(g =>
        '<option value="' + g + '"' + (g === ui.qaGroup ? ' selected' : '') + '>' + GROUPS[g].icon + ' ' + GROUPS[g].label + '</option>').join('') + '</select>' +
      '<button class="btn btn-primary" type="submit">' + ic('plus') + '<span>Add</span></button></form>' +
      '<button class="link sm qa-pick" data-action="open-pick" ' + pick + '>or choose from my exercise list</button>';
  }

  function groupFilter(u, ds) {
    if (ui.filter === 'all') return { match: true };
    const g = ui.filter.slice(6);
    return { match: L.dayItems(u, ds).some(id => L.groupOf(u, L.ex(u, id)) === g) };
  }

  // Measurements and the note for a date, shown under the exercises in its calendar box.
  function dayExtras(u, ds) {
    const meas = u.measurements[ds] || {};
    const has = v => v != null && v !== '';
    const rows = u.metrics.filter(m => has(meas[m.id])).map(m => {
      const v = meas[m.id];
      const val = m.type === 'bool' ? (v ? 'Yes' : 'No') : m.type === 'text' ? esc(v) : fmt(v, 2) + (m.unit ? '<em>' + esc(m.unit) + '</em>' : '');
      return '<span class="dm"><span class="dm-l">' + esc(m.name) + '</span><b>' + val + '</b></span>';
    }).join('');
    const note = (u.days[ds] || {}).notes;
    if (!rows && !note) return '';
    return '<span class="day-extra">' + rows + (note ? '<span class="dnote">' + esc(note.trim()) + '</span>' : '') + '</span>';
  }

  function dayCell(u, ds, today) {
    const st = L.dayStatus(u, ds, today);
    const fi = groupFilter(u, ds);
    const items = L.dayItems(u, ds);
    const log = (u.days[ds] || {}).log || {};
    const missedDay = st.state === 'missed' || st.state === 'partial';
    let list = items.map(id => {
      const done = log[id] && log[id].done;
      const vals = log[id] ? L.valueSummary(L.ex(u, id), log[id].values) : '';
      const e = L.ex(u, id);
      return '<span class="di' + (done ? ' done' : missedDay ? ' miss' : '') + '"><span class="di-t" title="' + GROUPS[L.groupOf(u, e)].label + '">' + groupIcon(u, e) + '</span>' + esc(e.name) + '</span>' +
        (vals ? '<span class="di-v">' + esc(vals) + '</span>' : '');
    }).join('');
    const cls = ['day', 's-' + st.state, ds === today ? 'is-today' : '', ds === ui.selected ? 'is-selected' : '', fi.match ? '' : 'dim', ds < today ? 'is-past' : ''].join(' ');
    return '<button class="' + cls + '" data-action="open-day" data-date="' + ds + '" aria-label="' + weekday(ds) + ' ' + longDate(ds) + ': ' + STATUS[st.state].label +
      (items.length ? ', ' + esc(planName(u, items)) : '') + '">' +
      '<span class="day-top">' + (fi.val ? '<span class="dv">' + fi.val + '</span>'
        : items.length && (st.state === 'missed' || st.state === 'partial') ? '<span class="miss-flag ' + st.state + '" title="' + STATUS[st.state].label + '">' + (st.state === 'missed' ? '✕ Missed' : '◐ Partial') + '</span>'
        : '<span class="dot"></span>') + '<span class="dn">' + D.parse(ds).getDate() + '</span></span>' +
      '<span class="day-list">' + (items.length ? list : st.state === 'missed' ? '<span class="di missed-day">Missed</span>' : '') + '</span>' +
      dayExtras(u, ds) + '</button>';
  }

  function dayBox(u, ds, today) {
    const st = L.dayStatus(u, ds, today);
    const fi = groupFilter(u, ds);
    const items = L.dayItems(u, ds);
    const log = (u.days[ds] || {}).log || {};
    const future = ds > today;
    const locked = !canEdit(ds);
    const meas = u.measurements[ds] || {};
    const ms = u.metrics.filter(x => meas[x.id] != null && meas[x.id] !== '').map(x => esc(x.name) + ' <b>' + metricValue(x, meas[x.id]) + '</b>').join(' · ');
    const rows = items.map(id => {
      const e = L.ex(u, id);
      const l = log[id] || {};
      const sum = L.valueSummary(e, l.values);
      return '<div class="bx-row' + (l.done ? ' is-done' : '') + '">' +
        '<button class="bx-check" data-action="toggle-ex" data-date="' + ds + '" data-ex="' + id + '"' + (future || locked ? ' disabled' : '') + ' aria-pressed="' + !!l.done + '" aria-label="Mark ' + esc(e.name) + ' done"><span class="check">' + ic('check') + '</span></button>' +
        '<span class="bx-name"><b>' + groupIcon(u, e) + ' ' + esc(e.name) + '</b>' + (sum ? '<small>' + esc(sum) + '</small>' : '') + '</span>' +
        (locked ? '' : '<button class="icon-btn sm danger" data-action="day-remove-ex" data-date="' + ds + '" data-ex="' + id + '" aria-label="Remove ' + esc(e.name) + '">' + ic('x') + '</button>') + '</div>';
    }).join('');
    const d = D.parse(ds);
    return '<section class="daybox s-' + st.state + (ds === today ? ' is-today' : '') + (fi.match ? '' : ' dim') + '" id="box-' + ds + '">' +
      '<div class="daybox-head"><button class="daybox-date" data-action="open-day" data-date="' + ds + '"><b>' + d.getDate() + '</b><span><small>' + weekday(ds) + (ds === today ? ' · Today' : '') + '</small><em>' + MONTHS[d.getMonth()] + '</em></span></button>' +
      (items.length || st.state === 'missed' ? pill(st.state, st.total) : '') + '</div>' +
      (rows ? '<div class="bx-list">' + rows + '</div>' : st.state === 'missed' ? '<p class="bx-missed">No workout logged</p>' : '') +
      (ms ? '<p class="bx-meas">' + ms + '</p>' : '') +
      ((u.days[ds] || {}).notes ? '<p class="bx-note">' + esc(u.days[ds].notes.trim()) + '</p>' : '') +
      (locked ? '<p class="bx-locked">' + ic('lock') + 'Locked</p>' : quickAdd(u, 'day:' + ds)) + '</section>';
  }

  function calendarCard(u) {
    const [y, m] = ui.month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const ws = u.settings.weekStart;
    const lead = (first.getDay() - ws + 7) % 7;
    const today = D.today();
    let body;
    if (ui.calView === 'list') {
      body = '<div class="daybox-grid">' + Array.from({ length: days }, (_, i) => dayBox(u, D.str(new Date(y, m - 1, i + 1)), today)).join('') + '</div>';
    } else {
      let cells = Array.from({ length: 7 }, (_, i) => '<div class="wd">' + WDS[(ws + i) % 7] + '</div>').join('');
      cells += '<div class="day blank"></div>'.repeat(lead);
      for (let d = 1; d <= days; d++) cells += dayCell(u, D.str(new Date(y, m - 1, d)), today);
      body = '<div class="cal-grid">' + cells + '</div>';
    }
    const ms = L.monthStats(u, y, m - 1);
    const isCurrent = ui.month === today.slice(0, 7);
    return '<section class="card cal-card' + (ui.calView === 'list' ? ' is-list' : '') + '">' +
      '<div class="cal-head"><h2>' + MONTHS[m - 1] + ' <span>' + y + '</span></h2><div class="cal-nav">' +
      (isCurrent ? '' : '<button class="chip" data-action="month-today">Today</button>') +
      '<button class="icon-btn" data-action="month" data-n="-1" aria-label="Previous month">' + ic('chevL') + '</button>' +
      '<button class="icon-btn" data-action="month" data-n="1" aria-label="Next month">' + ic('chevR') + '</button></div></div>' +
      '<div class="seg cal-view">' +
      '<button class="' + (ui.calView !== 'list' ? 'active' : '') + '" data-action="cal-view" data-view="month">' + ic('calendar') + 'Month</button>' +
      '<button class="' + (ui.calView === 'list' ? 'active' : '') + '" data-action="cal-view" data-view="list">' + ic('list') + 'List</button></div>' +
      '<div class="chips type-filter" role="group" aria-label="Show">' +
      [['all', 'All']].concat(Object.keys(GROUPS).map(g => ['group:' + g, GROUPS[g].icon + ' ' + GROUPS[g].label]))
        .map(([f, l]) => '<button class="chip' + (ui.filter === f ? ' active' : '') + '" data-action="filter" data-filter="' + f + '" aria-pressed="' + (ui.filter === f) + '">' + l + '</button>').join('') +
      '</div>' + body +
      '<div class="legend"><span><i class="lg s-done"></i>' + ms.done + ' done</span>' +
      (u.settings.partial ? '<span><i class="lg s-partial"></i>' + ms.partial + ' partial</span>' : '') +
      '<span><i class="lg s-missed"></i>' + ms.missed + ' missed</span></div>' +
      '</section>';
  }

  /* ---------- PROGRESS ---------- */
  function stat(icon, label, value, extra = '') {
    return '<div class="stat"><span class="stat-ic">' + icon + '</span><small>' + label + '</small><b>' + value + '</b>' + extra + '</div>';
  }

  function viewProgress(u) {
    const now = new Date();
    const ms = L.monthStats(u, now.getFullYear(), now.getMonth());
    const sk = L.streaks(u);
    const wm = L.builtin(u, 'weight'), xm = L.builtin(u, 'waist');
    const unitOf = m => m ? ' ' + esc(m.unit) : '';
    const others = u.metrics.filter(m => m.enabled && !m.builtin && isNumericMetric(m));
    if (!others.some(m => m.id === ui.otherMetric)) ui.otherMetric = others.length ? others[0].id : null;

    let html = '<div class="page-head"><h1>Progress</h1><p class="muted">Consistency first. Everything else follows.</p></div><div class="progress-grid">';
    html += '<section class="card span-2"><div class="card-head"><h2>This month</h2><span class="muted small">' + MONTHS[now.getMonth()] + '</span></div><div class="stat-grid">' +
      (u.settings.showStreak ? stat('🔥', 'Workout streak', sk.current + '<em> days</em>') : '') +
      stat('🏋️', 'Workouts', ms.done + '<em> / ' + ms.due + '</em>') +
      stat('📈', 'Completion', ms.pct == null ? '—' : ms.pct + '<em>%</em>') +
      stat('🏃', 'Cardio distance', fmt(ms.cardioKm, 1) + '<em> km</em>') +
      (wm && wm.enabled ? stat('⚖️', esc(wm.name), ms.weight == null ? '—' : signed(ms.weight) + '<em>' + unitOf(wm) + '</em>') : '') +
      (xm && xm.enabled ? stat('📏', esc(xm.name), ms.waist == null ? '—' : signed(ms.waist) + '<em>' + unitOf(xm) + '</em>') : '') +
      '</div><div class="consistency"><div class="row"><span>Workout consistency</span><b>' + (ms.pct == null ? '—' : ms.pct + '%') + '</b></div>' +
      '<div class="meter big"><i style="width:' + (ms.pct || 0) + '%"></i></div></div></section>';

    html += streakCard(u, sk);
    if (wm && wm.enabled) html += metricCard(u, wm);
    if (xm && xm.enabled) html += metricCard(u, xm);
    html += cardioCard(u);
    if (others.length) {
      const sel = '<select class="input input-sm" data-input="other-metric" aria-label="Metric">' +
        others.map(m => '<option value="' + m.id + '"' + (m.id === ui.otherMetric ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select>';
      html += metricCard(u, L.metric(u, ui.otherMetric), sel);
    }
    return html + '</div>';
  }

  function streakCard(u, sk) {
    const cells = L.heat(u, 12).map(c => '<i class="s-' + c.state + '" title="' + shortDate(c.ds) + ' · ' + (STATUS[c.state] ? STATUS[c.state].label : '') + '"></i>').join('');
    return '<section class="card"><div class="card-head"><h2>Streak</h2><span class="muted small">exercise days only</span></div>' +
      '<div class="streak-row"><div class="streak-box"><span>🔥</span><b>' + sk.current + '</b><small>Current streak</small></div>' +
      '<div class="streak-box"><span>🏆</span><b>' + sk.best + '</b><small>Longest streak</small></div></div>' +
      '<p class="mini-title">Last 12 weeks</p><div class="heat">' + cells + '</div>' +
      '<div class="legend"><span><i class="lg s-done"></i>Done</span><span><i class="lg s-partial"></i>Partial</span><span><i class="lg s-missed"></i>Missed</span><span><i class="lg s-rest"></i>Rest</span></div></section>';
  }

  let chartSeq = 0;
  const chartId = () => 'ch' + (++chartSeq);
  const xDay = ms => { const d = new Date(ms); return MON[d.getMonth()] + ' ' + d.getDate(); };

  function metricCard(u, m, headExtra = '') {
    const all = L.numericSeries(u, m.id);
    const range = ui.range[m.id] || '3M';
    const from = RANGES[range] ? D.add(D.today(), -RANGES[range] + 1) : '';
    const pts = all.filter(p => p.ds >= from);
    const cur = all[all.length - 1], start = all[0];
    const change = cur && start && cur !== start ? cur.v - start.v : null;
    const id = chartId();
    const unit = esc(m.unit);
    ui.charts.push(() => {
      const el = document.getElementById(id);
      if (el) Charts.line(el, pts.map(p => ({ x: D.parse(p.ds).getTime(), y: p.v, ds: p.ds })), {
        label: m.name + ' over time', xfmt: xDay, empty: 'No ' + esc(m.name.toLowerCase()) + ' entries in this range',
        tip: p => '<b>' + fmt(p.y, 2) + ' ' + unit + '</b><span>' + shortDate(p.ds) + '</span>',
      });
    });
    return '<section class="card"><div class="card-head"><h2>' + metricIcon(m) + ' ' + esc(m.name) + '</h2>' + headExtra + '</div>' +
      '<div class="kpis"><div><small>Current</small><b>' + (cur ? fmt(cur.v, 2) : '—') + '<em> ' + unit + '</em></b></div>' +
      '<div><small>Starting</small><b>' + (start ? fmt(start.v, 2) : '—') + '<em> ' + unit + '</em></b></div>' +
      '<div><small>Change</small><b class="' + (change == null ? '' : change < 0 ? 'neg' : 'pos') + '">' + (change == null ? '—' : signed(change, 2)) + '<em> ' + unit + '</em></b></div></div>' +
      '<div class="chips sm">' + Object.keys(RANGES).map(r => '<button class="chip' + (r === range ? ' active' : '') + '" data-action="range" data-metric="' + m.id + '" data-range="' + r + '">' + r + '</button>').join('') + '</div>' +
      '<div class="chart" id="' + id + '"></div></section>';
  }

  function cardioCard(u) {
    const cardio = u.exercises.filter(e => L.groupOf(u, e) === 'cardio');
    if (ui.cardioEx !== 'all' && !cardio.some(e => e.id === ui.cardioEx)) ui.cardioEx = 'all';
    const sessions = L.cardioSessions(u, ui.cardioEx);
    const withDist = sessions.filter(s => s.distance > 0);
    const total = withDist.reduce((a, s) => a + s.distance, 0);
    const longest = withDist.reduce((a, s) => Math.max(a, s.distance), 0);
    const types = [['session', 'Per workout'], ['weekly', 'Weekly km'], ['monthly', 'Monthly km'], ['freq', 'Frequency'], ['duration', 'Duration'], ['pace', 'Pace']];
    const id = chartId();
    const ws = u.settings.weekStart;
    const today = D.today();

    ui.charts.push(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const t = ui.cardioChart;
      if (t === 'session' || t === 'duration') {
        const key = t === 'session' ? 'distance' : 'duration';
        const unit = t === 'session' ? 'km' : 'min';
        const list = sessions.filter(s => s[key] > 0).slice(-20);
        Charts.bar(el, list.map(s => ({ label: shortDate(s.ds).replace(' ', ' '), value: s[key], tip: '<b>' + fmt(s[key], 1) + ' ' + unit + '</b><span>' + esc(L.ex(u, s.exId).name) + ' · ' + shortDate(s.ds) + '</span>' })),
          { empty: 'Log cardio with ' + (key === 'distance' ? 'a distance' : 'a duration') + ' to see this chart' });
      } else if (t === 'weekly' || t === 'freq') {
        const start = D.add(D.weekStart(today, ws), -77);
        const bars = Array.from({ length: 12 }, (_, i) => {
          const a = D.add(start, i * 7), b = D.add(a, 6);
          const inWeek = sessions.filter(s => s.ds >= a && s.ds <= b);
          const v = t === 'weekly' ? inWeek.reduce((x, s) => x + s.distance, 0) : inWeek.length;
          return { label: shortDate(a).replace(' ', ' '), value: v, tip: '<b>' + (t === 'weekly' ? fmt(v, 1) + ' km' : v + (v === 1 ? ' session' : ' sessions')) + '</b><span>Week of ' + shortDate(a) + '</span>' };
        });
        Charts.bar(el, bars, { empty: 'No cardio in the last 12 weeks' });
      } else if (t === 'monthly') {
        const now = new Date();
        const bars = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
          const key = D.str(d).slice(0, 7);
          const v = sessions.filter(s => s.ds.slice(0, 7) === key).reduce((x, s) => x + s.distance, 0);
          return { label: MON[d.getMonth()], value: v, tip: '<b>' + fmt(v, 1) + ' km</b><span>' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + '</span>' };
        });
        Charts.bar(el, bars, { empty: 'No cardio distance in the last 12 months' });
      } else {
        const list = sessions.filter(s => s.pace);
        Charts.line(el, list.map(s => ({ x: D.parse(s.ds).getTime(), y: s.pace, ds: s.ds })), {
          xfmt: xDay, yfmt: L.pace, empty: 'Log distance and duration to see your pace',
          tip: p => '<b>' + L.pace(p.y) + ' /km</b><span>' + shortDate(p.ds) + '</span>',
        });
      }
    });

    return '<section class="card span-2"><div class="card-head"><h2>🏃 Cardio</h2>' +
      '<select class="input input-sm" data-input="cardio-ex" aria-label="Activity"><option value="all">All cardio</option>' +
      cardio.map(e => '<option value="' + e.id + '"' + (e.id === ui.cardioEx ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('') + '</select></div>' +
      '<div class="stat-grid four">' + stat('📍', 'Total distance', fmt(total, 1) + '<em> km</em>') + stat('🔁', 'Sessions', sessions.length) +
      stat('➗', 'Average', withDist.length ? fmt(total / withDist.length, 1) + '<em> km</em>' : '—') + stat('🏅', 'Longest', longest ? fmt(longest, 1) + '<em> km</em>' : '—') + '</div>' +
      '<div class="chips sm">' + types.map(([k, l]) => '<button class="chip' + (ui.cardioChart === k ? ' active' : '') + '" data-action="cardio-chart" data-type="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<div class="chart" id="' + id + '"></div></section>';
  }

  /* ---------- EXERCISES & PLAN ---------- */

  /* ---------- PROFILE & SETTINGS ---------- */
  function setRow(title, sub, control) {
    return '<div class="set-row"><div class="set-text"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + control + '</div>';
  }
  const toggle = (key, on) => '<label class="switch"><input type="checkbox" data-input="pref" data-key="' + key + '"' + (on ? ' checked' : '') + '><i></i></label>';
  const segPref = (key, val, opts) => '<div class="seg sm">' + opts.map(([v, l]) => '<button class="' + (String(val) === String(v) ? 'active' : '') + '" data-action="pref-set" data-key="' + key + '" data-val="' + v + '">' + l + '</button>').join('') + '</div>';

  function viewProfile(u) {
    const meta = Store.activeMeta();
    const s = u.settings;
    const since = new Date(u.profile.createdAt);
    const notifSupported = 'Notification' in window;
    let html = '<div class="page-head"><h1>Profile</h1></div><div class="profile-grid"><div class="col">';

    html += '<section class="card profile-card">' + avatar(meta, 'xl') + '<div><h2>' + esc(meta.name) + '</h2><p class="muted small">Tracking since ' + MON[since.getMonth()] + ' ' + since.getFullYear() + '</p></div>' +
      '<button class="btn btn-soft btn-sm" data-action="edit-profile">' + ic('edit') + 'Edit</button></section>';

    html += '<section class="card"><div class="card-head"><h2>' + ic('users') + ' Family</h2></div><div class="member-list">' +
      Store.list().map(m => '<button class="member' + (m.id === meta.id ? ' active' : '') + '" data-action="switch-user" data-id="' + m.id + '">' + avatar(m) +
        '<span>' + esc(m.name) + '</span>' + (m.pinHash ? ic('lock', 'muted-ic') : '') + (m.id === meta.id ? '<span class="tag">Active</span>' : '') + '</button>').join('') +
      '</div><button class="btn btn-ghost btn-block" data-action="add-member">' + ic('plus') + 'Add family member</button></section>';

    html += '<section class="card"><div class="card-head"><h2>📐 Custom metrics</h2><button class="link" data-action="new-metric">+ Add</button></div>' +
      '<p class="muted small">Measurements never affect your workout status.</p>' +
      u.metrics.map(m => '<div class="ex-row' + (m.enabled ? '' : ' off') + '"><label class="switch"><input type="checkbox" data-input="metric-enabled" data-id="' + m.id + '"' + (m.enabled ? ' checked' : '') + '><i></i></label>' +
        '<div class="ex-row-main"><b>' + metricIcon(m) + ' ' + esc(m.name) + '</b><small>' + METRIC_TYPES[m.type] + (m.unit ? ' · ' + esc(m.unit) : '') + ' · ' + (m.frequency === 'weekly' ? 'Weekly' : 'Daily') + '</small></div>' +
        '<button class="icon-btn" data-action="edit-metric" data-id="' + m.id + '" aria-label="Edit">' + ic('edit') + '</button></div>').join('') + '</section>';

    html += '</div><div class="col">';

    html += '<section class="card"><div class="card-head"><h2>Preferences</h2></div>' +
      setRow('Theme', '', segPref('theme', s.theme, [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])) +
      setRow('Week starts on', '', segPref('weekStart', s.weekStart, [[1, 'Mon'], [0, 'Sun']])) +
      setRow('Count missed days from', 'Past days with no workout after this date show as ✕ Missed.',
        '<input class="input input-sm date" type="date" data-input="track-from" max="' + D.today() + '" value="' + L.trackStart(u) + '">') +
      setRow('Partial completion', 'Show 🟡 when only some exercises were done. Off = 🔴.', toggle('partial', s.partial)) +
      setRow('Workout streak', 'Show your streak on the home screen.', toggle('showStreak', s.showStreak)) + '</section>';

    html += '<section class="card"><div class="card-head"><h2>' + ic('bell') + ' Notifications</h2></div>' +
      (notifSupported ? setRow('Workout reminder', 'Reminds you if today\'s workout isn\'t done.', toggle('notify.enabled', s.notify.enabled)) +
        (s.notify.enabled ? setRow('Reminder time', '', '<input class="input input-sm time" type="time" data-input="pref" data-key="notify.time" value="' + esc(s.notify.time) + '">') +
          setRow('Missed-workout alert', 'Sent at 21:30 if the workout is still open.', toggle('notify.missed', s.notify.missed)) : '') +
        '<p class="muted small">Reminders appear while GymCal is open in a tab or installed as an app.</p>'
        : '<p class="muted small">This browser does not support notifications.</p>') + '</section>';

    const sc = Sync.config(), sst = Sync.status();
    const keptText = storageKept === true ? 'Protected — this browser will not clear GymCal\'s data on its own.'
      : storageKept === false ? 'Not protected — the browser may clear it (e.g. Safari after 7 days unused). Install the app to the home screen and turn on GitHub sync.'
      : 'Checking…';
    html += '<section class="card"><div class="card-head"><h2>' + ic('cloud') + ' Cloud sync (GitHub)</h2></div>' +
      setRow('Browser storage', keptText, '<span class="pill ' + (storageKept ? 's-done' : 's-missed') + '">' + (storageKept ? 'Kept' : storageKept === false ? 'At risk' : '…') + '</span>') +
      (sc ? setRow('Connected', esc(sc.owner + '/' + sc.repo + ' · ' + sc.path) + '<br>' + esc(sst.message || (sst.at ? 'Last synced ' + sst.at.toLocaleString() : SYNC_LABEL[sst.state] || '')),
        '<div class="btn-pair"><button class="btn btn-soft btn-sm" data-action="sync-now">Sync now</button><button class="btn btn-soft btn-sm" data-action="open-sync">Edit</button></div>')
        : setRow('Off', 'Data is saved only in this browser. Connect a private GitHub repo to keep it permanently and share it between phones and computers.',
          '<button class="btn btn-primary btn-sm" data-action="open-sync">Set up</button>')) + '</section>';
    html += '<section class="card"><div class="card-head"><h2>' + ic('lock') + ' Privacy & data</h2></div>' +
      setRow('Profile PIN', meta.pinHash ? 'PIN is on. Others need it to open your profile.' : 'Keep family members out of your profile.',
        meta.pinHash ? '<div class="btn-pair"><button class="btn btn-soft btn-sm" data-action="set-pin">Change</button><button class="btn btn-danger btn-sm" data-action="remove-pin">Remove</button></div>'
          : '<button class="btn btn-soft btn-sm" data-action="set-pin">Set PIN</button>') +
      setRow('Export', 'Download this profile as a JSON backup.', '<button class="btn btn-soft btn-sm" data-action="export">' + ic('download') + 'Export</button>') +
      setRow('Import', 'Restore a backup as a new profile.', '<button class="btn btn-soft btn-sm" data-action="import">' + ic('upload') + 'Import</button>') +
      setRow('Delete profile', 'Permanently removes ' + esc(meta.name) + '\'s data from this device.', '<button class="btn btn-danger btn-sm" data-action="delete-profile">' + ic('trash') + 'Delete</button>') +
      '<input type="file" id="import-file" accept="application/json,.json" hidden data-input="import">' +
      '<p class="muted small">' + (Sync.config() ? 'Data is saved in this browser and synced to your private GitHub repo.' : 'All data lives in this browser only.') + ' Each profile is stored separately.</p></section>';

    return html + '</div></div>';
  }

  const VIEWS = { home: viewHome, progress: viewProgress, profile: viewProfile };

  /* ---------- SHEETS ---------- */
  function sheetHead(title, sub = '', back = false) {
    return '<div class="sheet-head">' + (back ? '<button class="icon-btn" data-action="sheet-back" aria-label="Back">' + ic('chevL') + '</button>' : '') +
      '<div class="sheet-title">' + (sub ? '<p class="eyebrow">' + sub + '</p>' : '') + '<h2>' + title + '</h2></div>' +
      '<button class="icon-btn" data-action="close-sheet" aria-label="Close">' + ic('x') + '</button></div>';
  }

  const SHEETS = {};

  SHEETS.day = (u, s) => {
    const ds = s.date;
    const today = D.today();
    const st = L.dayStatus(u, ds, today);
    const day = u.days[ds] || {};
    const log = day.log || {};
    const items = L.dayItems(u, ds);
    const future = ds > today;
    const locked = !canEdit(ds);
    const strength = items.filter(id => L.groupOf(u, L.ex(u, id)) !== 'cardio');
    const cardio = items.filter(id => L.groupOf(u, L.ex(u, id)) === 'cardio');
    const meas = u.measurements[ds] || {};
    const metrics = u.metrics.filter(m => m.enabled || (meas[m.id] != null && meas[m.id] !== ''));
    const sub = st.total ? st.done + ' of ' + st.total + ' planned exercises done' : st.extra.length ? 'Workout logged' : st.state === 'missed' ? 'No workout was logged on this day' : 'Nothing added yet';
    const bannerLabel = st.state === 'done' && !st.total ? 'Bonus workout' : STATUS[st.state].label;

    let html = '<div class="sheet-head day-head">' +
      '<button class="icon-btn" data-action="day-shift" data-n="-1" aria-label="Previous day">' + ic('chevL') + '</button>' +
      '<div class="sheet-title center"><p class="eyebrow">' + weekday(ds) + (ds === today ? ' · Today' : '') + '</p><h2>' + longDate(ds) + ', ' + ds.slice(0, 4) + '</h2></div>' +
      '<button class="icon-btn" data-action="day-shift" data-n="1" aria-label="Next day">' + ic('chevR') + '</button>' +
      '<button class="icon-btn" data-action="close-sheet" aria-label="Close">' + ic('x') + '</button></div>';

    html += '<div class="sheet-scroll"><div class="status-banner s-' + st.state + '"><span class="big-dot">' +
      (st.state === 'done' ? ic('check') : st.state === 'missed' ? ic('x') : '') + '</span><div><b>' + bannerLabel + '</b><small>' + sub + '</small></div></div>' +
      (locked ? '<div class="lock-note">' + ic('lock') + '<div><b>Read only — this day is over.</b><small>Past days are locked to keep your history honest.</small></div>' +
        '<button class="btn btn-soft btn-sm" data-action="ask-unlock" data-date="' + ds + '">Unlock</button></div>' : '') +
      (ds === unlockedDay && ds < today ? '<div class="lock-note open">' + ic('edit') + '<div><b>Editing a past day</b><small>It locks again when you close this window.</small></div></div>' : '');

    const section = (title, ids, action) => '<div class="sec-head"><h3>' + title + '</h3>' + action + '</div>' +
      ids.map(id => exItem(u, ds, id, log, s.open === id, future, locked)).join('');
    const canMarkAll = st.total && st.done < st.total && !future && !locked;
    html += section('🏋️ Exercises', strength, canMarkAll ? '<button class="link sm" data-action="complete-all" data-date="' + ds + '">Mark all done</button>' : '');
    if (!strength.length) html += '<p class="muted small pad">' + (cardio.length ? 'No strength work planned.' : 'No exercises planned for this day.') + '</p>';
    if (cardio.length) html += section('🏃 Cardio', cardio, '');
    if (!locked) html += '<div class="sheet-qa">' + quickAdd(u, 'day:' + ds, true) + '</div>';
    if (future) html += '<p class="muted small pad">You can tick exercises off once the day arrives.</p>';

    html += '<div class="sec-head" id="measure-sec"><h3>📏 Body measurements</h3><small class="muted">Doesn\'t affect workout status</small></div>';
    html += metrics.length ? '<div class="measure-grid">' + metrics.map(m => metricInput(u, m, meas[m.id], ds, locked)).join('') + '</div>'
      : '<p class="muted small pad">No metrics enabled. Turn some on in Profile.</p>';

    html += '<div class="sec-head"><h3>📝 Notes</h3></div><textarea class="input" rows="3" data-input="notes" data-date="' + ds + '" placeholder="How did it feel?"' + (locked ? ' disabled' : '') + '>' + esc(day.notes || '') + '</textarea></div>';
    html += '<div class="sheet-foot">' + (locked ? '<button class="btn btn-primary btn-lg btn-block" data-action="close-sheet">Close</button>'
      : '<button class="btn btn-primary btn-lg btn-block" data-action="close-sheet" data-toast="Saved ✓">Save</button>') + '</div>';
    return html;
  };

  function exItem(u, ds, id, log, open, future, locked) {
    const e = L.ex(u, id);
    const l = log[id] || {};
    const vals = l.values || {};
    const sum = L.valueSummary(e, vals);
    const planned = L.plannedFor(u, ds).includes(id);
    let html = '<div class="ex-item' + (l.done ? ' is-done' : '') + (open ? ' is-open' : '') + '"><div class="ex-main">' +
      '<button class="check-btn" data-action="toggle-ex" data-date="' + ds + '" data-ex="' + id + '"' + (future || locked ? ' disabled' : '') + ' aria-pressed="' + !!l.done + '" aria-label="Mark ' + esc(e.name) + ' done">' +
      '<span class="check">' + ic('check') + '</span></button>' +
      '<button class="ex-title" data-action="expand-ex" data-ex="' + id + '" aria-expanded="' + open + '"><span><b>' + esc(e.name) + (planned ? '' : ' <em class="tag">Extra</em>') + '</b>' +
      '<small>' + esc(sum || (e.fields.length ? 'Tap to add details (optional)' : (L.cat(u, e) || {}).name || '')) + '</small></span>' + ic('chevD', 'chev') + '</button></div>';
    if (open) {
      html += '<div class="ex-fields"><div class="field-grid">' + e.fields.map(f => {
        const v = vals[f.key];
        const type = f.type === 'time' ? 'time' : f.type === 'text' ? 'text' : 'number';
        return '<label class="field"><span>' + esc(f.label) + '</span><div class="input-unit"><input class="input" type="' + type + '"' +
          (type === 'number' ? ' inputmode="decimal" step="any" min="0"' : '') + ' data-input="exval" data-date="' + ds + '" data-ex="' + id + '" data-key="' + esc(f.key) + '" value="' + esc(v == null ? '' : v) + '"' + (locked ? ' disabled' : '') + '>' +
          (f.unit ? '<em>' + esc(f.unit) + '</em>' : '') + '</div></label>';
      }).join('') + '</div>' +
        '<div class="ex-fields-foot"><span class="muted small pace" data-pace="' + id + '">' + (L.num(vals.distance) > 0 && L.num(vals.duration) > 0 ? 'Pace ' + L.pace(L.num(vals.duration) / L.num(vals.distance)) + ' /km' : '') + '</span>' +
        (locked ? '' : '<button class="link sm danger" data-action="day-remove-ex" data-ex="' + id + '">Remove from this day</button>') + '</div></div>';
    }
    return html + '</div>';
  }

  function metricInput(u, m, val, ds, locked) {
    const label = metricIcon(m) + ' ' + esc(m.name) + (m.frequency === 'weekly' ? ' <em class="tag">weekly</em>' : '');
    const attrs = 'data-input="metric" data-date="' + ds + '" data-metric="' + m.id + '"' + (locked ? ' disabled' : '');
    if (m.type === 'bool') {
      return '<div class="field bool-field"><span>' + label + '</span><label class="switch"><input type="checkbox" ' + attrs + (val === true ? ' checked' : '') + '><i></i></label></div>';
    }
    if (m.type === 'text') {
      return '<label class="field span-all"><span>' + label + '</span><input class="input" type="text" ' + attrs + ' value="' + esc(val == null ? '' : val) + '"></label>';
    }
    const prev = L.latestBefore(u, m.id, ds);
    return '<label class="field"><span>' + label + '</span><div class="input-unit"><input class="input" type="number" inputmode="decimal" step="any" ' + attrs +
      ' value="' + esc(val == null ? '' : val) + '" placeholder="' + (prev ? esc(prev.v) : '') + '">' + (m.unit ? '<em>' + esc(m.unit) + '</em>' : '') + '</div></label>';
  }

  SHEETS.daylock = (u, s) => {
    const name = esc(u.profile.name);
    return sheetHead('Edit a past day?', weekday(s.date) + ', ' + longDate(s.date)) +
      '<div class="sheet-scroll"><div class="lock-note">' + ic('lock') + '<div><b>This day is over and locked.</b>' +
      '<small>Past workouts can\'t be changed. To edit it anyway, type your profile name <b>' + name + '</b> in all three boxes.</small></div></div>' +
      '<form data-form="daylock" id="daylock-form">' + [1, 2, 3].map(i =>
        '<label class="field"><span>Type “' + name + '” (' + i + ' of 3)</span><input class="input" name="n' + i + '" data-nopaste autocomplete="off" autocapitalize="off" spellcheck="false" required' + (i === 1 ? ' autofocus' : '') + '></label>').join('') +
      '</form></div><div class="sheet-foot row"><button class="btn btn-ghost grow" data-action="view-day" data-date="' + s.date + '">View only</button>' +
      '<button class="btn btn-primary grow" type="submit" form="daylock-form">' + ic('lock') + 'Unlock & edit</button></div>';
  };

  SHEETS.sync = (u, s) => {
    const c = Sync.config() || { owner: '', repo: 'gymcal-data', path: 'gymcal-data.json', token: '' };
    const st = Sync.status();
    return sheetHead('GitHub sync', 'Keep your data permanently') + '<div class="sheet-scroll">' +
      (st.state === 'error' ? '<div class="lock-note err">' + ic('x') + '<div><b>Sync failed</b><small>' + esc(st.message) + '</small></div></div>' : '') +
      (st.state === 'ok' && c.token ? '<div class="lock-note ok">' + ic('check') + '<div><b>Connected</b><small>Last synced ' + esc(st.at.toLocaleString()) + '</small></div></div>' : '') +
      '<p class="muted small">Your family\'s data is saved as one file in a <b>private</b> GitHub repository that only you can see. Every device you connect shares the same data, and it survives clearing the browser.</p>' +
      '<details class="howto"' + (c.token ? '' : ' open') + '><summary>How to set it up (2 minutes, once)</summary><ol>' +
      '<li>On GitHub, create a new <b>private</b> repository, for example <code>gymcal-data</code>. It can stay empty.</li>' +
      '<li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>. ' +
        '(Or: click your <b>profile picture</b> top-right → <b>Settings</b> → bottom of the left menu → <b>Developer settings</b> → <b>Personal access tokens → Fine-grained tokens → Generate new token</b>. ' +
        'This is your <b>account</b> Settings, not the repository\'s Settings tab.)</li>' +
      '<li>Under <b>Repository access</b> choose <b>Only select repositories</b> and pick that data repo.</li>' +
      '<li>Under <b>Permissions → Repository permissions</b>, set <b>Contents</b> to <b>Read and write</b>. Nothing else is needed.</li>' +
      '<li>Generate the token, copy it, and paste it below. Repeat steps on each device using the same token.</li></ol></details>' +
      '<form data-form="sync" id="sync-form">' +
      '<div class="inline-2"><label class="field"><span>GitHub username</span><input class="input" name="owner" required autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(c.owner) + '" placeholder="e.g. sdburde"></label>' +
      '<label class="field"><span>Private data repo</span><input class="input" name="repo" required autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(c.repo) + '"></label></div>' +
      '<label class="field"><span>Access token</span><input class="input" name="token" type="password" required autocomplete="off" spellcheck="false" value="' + esc(c.token) + '" placeholder="github_pat_…"></label>' +
      '<label class="field"><span>File name</span><input class="input" name="path" required autocomplete="off" spellcheck="false" value="' + esc(c.path) + '"></label>' +
      '<p class="muted small">The token is stored only in this browser and is sent only to GitHub. Use a token limited to the data repo, as above.</p>' +
      '</form></div><div class="sheet-foot row">' +
      (Sync.config() ? '<button class="btn btn-danger" data-action="sync-disconnect">Disconnect</button>' : '') +
      '<button class="btn btn-primary btn-lg grow" type="submit" form="sync-form">' + ic('cloud') + (Sync.config() ? 'Save & sync' : 'Connect') + '</button></div>';
  };

  SHEETS.pick = (u, s) => {
    const current = s.mode === 'day' ? L.plannedFor(u, s.date) : (u.plan[s.dow] || []);
    const title = s.mode === 'day' ? 'Add to ' + longDate(s.date) : WD[s.dow] + ' plan';
    let html = sheetHead(title, s.mode === 'day' ? 'This date only' : 'Every ' + WD[s.dow], !!s.back) + '<div class="sheet-scroll">';
    Object.keys(GROUPS).forEach(g => {
      const cats = u.categories.filter(c => c.group === g);
      const exs = cats.flatMap(c => u.exercises.filter(e => e.categoryId === c.id && e.active));
      if (!exs.length) return;
      html += '<div class="sec-head"><h3>' + GROUPS[g].icon + ' ' + GROUPS[g].label + '</h3></div><div class="pick-list">' +
        exs.map(e => {
          const on = current.includes(e.id);
          return '<button class="pick-row' + (on ? ' is-on' : '') + '" data-action="pick-toggle" data-ex="' + e.id + '" aria-pressed="' + on + '"><span class="check">' + ic('check') + '</span>' +
            '<span class="check-label"><b>' + esc(e.name) + '</b><small>' + esc((L.cat(u, e) || {}).name || '') + '</small></span></button>';
        }).join('') + '</div>';
    });
    html += '</div>';
    html += '<div class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" data-action="sheet-back">Done</button></div>';
    return html;
  };

  SHEETS.switcher = (u, s) => {
    return sheetHead('Select profile') + '<div class="sheet-scroll"><div class="radio-list">' +
      Store.list().map(m => '<button class="radio-row' + (m.id === s.pick ? ' is-on' : '') + '" data-action="pick-user" data-id="' + m.id + '">' +
        '<span class="radio"></span>' + avatar(m) + '<span class="rr-name">' + esc(m.name) + '</span>' + (m.pinHash ? ic('lock', 'muted-ic') : '') + '</button>').join('') +
      '</div><button class="add-row" data-action="add-member">' + ic('plus') + 'Add family member</button>' +
      '<button class="link block-link" data-action="nav" data-view="profile">Profile & settings</button></div>' +
      '<div class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" data-action="do-switch">Switch</button></div>';
  };

  SHEETS.profile = (u, s) => {
    const meta = s.mode === 'edit' ? Store.activeMeta() : { name: '', avatar: AVATARS[Store.list().length % AVATARS.length], color: COLORS[Store.list().length % COLORS.length] };
    return sheetHead(s.mode === 'edit' ? 'Edit profile' : 'Add family member', '', !!s.back) +
      '<div class="sheet-scroll"><form data-form="profile" id="profile-form">' + profileFields(meta) + '' + '</form>' +
      (s.mode === 'add' ? '<p class="muted small">Each member gets their own exercises, plan, calendar and measurements.</p>' : '') + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" type="submit" form="profile-form">' + (s.mode === 'edit' ? 'Save' : 'Add member') + '</button></div>';
  };

  SHEETS.metric = (u, s) => {
    const m = s.id ? L.metric(u, s.id) : { name: '', unit: '', type: 'decimal', frequency: 'daily', enabled: true };
    return sheetHead(s.id ? 'Edit metric' : 'Add metric') + '<div class="sheet-scroll"><form data-form="metric" id="metric-form">' +
      '<label class="field"><span>Name</span><input class="input" name="name" required maxlength="30" value="' + esc(m.name) + '" placeholder="e.g. Chest size"></label>' +
      (m.builtin ? '<p class="muted small">Rename freely — e.g. Waist → Belly or Abdomen.</p>' : '') +
      '<div class="inline-2"><label class="field"><span>Unit</span><input class="input" name="unit" maxlength="10" value="' + esc(m.unit) + '" placeholder="cm"></label>' +
      '<label class="field"><span>Type</span><select class="input" name="type">' + Object.keys(METRIC_TYPES).map(t => '<option value="' + t + '"' + (t === m.type ? ' selected' : '') + '>' + METRIC_TYPES[t] + '</option>').join('') + '</select></label></div>' +
      '<div class="field"><span>Track</span><div class="seg"><label class="seg-radio"><input type="radio" name="frequency" value="daily"' + (m.frequency !== 'weekly' ? ' checked' : '') + '><span>Daily</span></label>' +
      '<label class="seg-radio"><input type="radio" name="frequency" value="weekly"' + (m.frequency === 'weekly' ? ' checked' : '') + '><span>Weekly</span></label></div></div>' +
      '<label class="set-row"><div class="set-text"><b>Enabled</b><small>Show in the day screen and charts</small></div><span class="switch"><input type="checkbox" name="enabled"' + (m.enabled ? ' checked' : '') + '><i></i></span></label>' +
      '</form></div><div class="sheet-foot row">' + (s.id && !m.builtin ? '<button class="btn btn-danger" data-action="delete-metric">' + ic('trash') + '</button>' : '') +
      '<button class="btn btn-primary btn-lg grow" type="submit" form="metric-form">Save metric</button></div>';
  };

  SHEETS.pin = (u, s) => {
    const meta = Store.meta(s.target);
    return sheetHead('Enter PIN', esc(meta.name)) + '<div class="sheet-scroll center">' + avatar(meta, 'xl') +
      '<form data-form="pin-check" id="pin-form"><input class="input pin-input" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="••••" aria-label="PIN" autofocus></form></div>' +
      '<div class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" type="submit" form="pin-form">Unlock & switch</button></div>';
  };

  SHEETS.setpin = () => sheetHead('Set a PIN') + '<div class="sheet-scroll"><form data-form="pin-set" id="setpin-form">' +
    '<label class="field"><span>New PIN (4–8 digits)</span><input class="input pin-input" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required autocomplete="new-password"></label>' +
    '<label class="field"><span>Repeat PIN</span><input class="input pin-input" name="confirm" type="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required autocomplete="new-password"></label>' +
    '<p class="muted small">The PIN keeps family members from casually opening your profile on a shared device. It does not encrypt data.</p></form></div>' +
    '<div class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" type="submit" form="setpin-form">Save PIN</button></div>';

  function openSheet(state) {
    ui.sheet = state;
    renderSheet();
  }

  function renderSheet() {
    const root = $('#sheet-root');
    const s = ui.sheet;
    if (!s) return;
    const u = Store.active();
    const html = SHEETS[s.type](u, s);
    let panel = root.querySelector('.sheet');
    if (!panel) {
      root.innerHTML = '<div class="overlay" data-action="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"></div>';
      panel = root.querySelector('.sheet');
      panel.innerHTML = html;
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => root.classList.add('open'));
    } else {
      const scroller = panel.querySelector('.sheet-scroll');
      const top = scroller && panel.dataset.type === s.type ? scroller.scrollTop : 0;
      panel.innerHTML = html;
      const sc = panel.querySelector('.sheet-scroll');
      if (sc) sc.scrollTop = top;
    }
    panel.dataset.type = s.type;
    panel.className = 'sheet sheet-' + s.type;
    if (s.focus === 'measure') {
      s.focus = null;
      const target = panel.querySelector('#measure-sec');
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
    const auto = panel.querySelector('[autofocus]');
    if (auto) setTimeout(() => auto.focus(), 320);
  }

  function closeSheet(msg) {
    const root = $('#sheet-root');
    ui.sheet = null;
    unlockedDay = null;
    ui.qaOpen = null;
    root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { if (!ui.sheet) root.innerHTML = ''; }, 300);
    save();
    render();
    if (msg) toast(msg);
  }

  function sheetBack() {
    const back = ui.sheet && ui.sheet.back;
    if (back) { ui.sheet = back; renderSheet(); } else closeSheet();
  }

  /* ---------- domain actions ---------- */
  function openDay(ds, focus) {
    ui.selected = ds;
    ui.month = ds.slice(0, 7);
    if (!canEdit(ds)) { openSheet({ type: 'daylock', date: ds }); return; }
    openSheet({ type: 'day', date: ds, open: null, focus });
    const u = Store.active();
    if (!focus && !L.dayItems(u, ds).length && window.matchMedia('(hover: hover)').matches) setTimeout(() => focusQuickAdd('day:' + ds), 340);
  }

  function refresh() { save(); if (ui.sheet) renderSheet(); else render(); }

  function toggleEx(ds, id) {
    if (!guard(ds)) return;
    const u = Store.active();
    const day = L.ensureDay(u, ds);
    const entry = day.log[id] || (day.log[id] = { done: false, values: {} });
    const before = L.dayStatus(u, ds).state;
    entry.done = !entry.done;
    const after = L.dayStatus(u, ds);
    if (after.state === 'done' && before !== 'done' && after.total) toast('🎉 Workout complete!');
    refresh();
  }

  function completeAll(ds) {
    if (!guard(ds)) return;
    const u = Store.active();
    const day = L.ensureDay(u, ds);
    L.plannedFor(u, ds).forEach(id => { (day.log[id] || (day.log[id] = { done: false, values: {} })).done = true; });
    toast('🎉 Workout complete!');
    refresh();
  }

  function switchUser(id) {
    if (!Store.meta(id)) return;
    if (id === Store.activeId()) { if (ui.sheet) closeSheet(); return; }
    if (isLocked(id)) { openSheet({ type: 'pin', target: id }); return; }
    Store.switchTo(id);
    resetView();
    if (ui.sheet) closeSheet(); else render();
    toast('Switched to ' + Store.meta(id).name);
  }

  function resetView() {
    ui.filter = 'all';
    ui.selected = D.today();
    ui.month = D.today().slice(0, 7);
    ui.cardioEx = 'all';
    ui.otherMetric = null;
    ui.qaOpen = null;
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  const ACTIONS = {
    nav: el => { ui.view = el.dataset.view; if (ui.sheet) closeSheet(); else render(); window.scrollTo(0, 0); },
    'open-switcher': () => openSheet({ type: 'switcher', pick: Store.activeId() }),
    'pick-user': el => { ui.sheet.pick = el.dataset.id; renderSheet(); },
    'do-switch': () => switchUser(ui.sheet.pick),
    'switch-user': el => switchUser(el.dataset.id),
    'lock-switch': el => { Store.switchTo(el.dataset.id); resetView(); render(); },
    'add-member': () => openSheet({ type: 'profile', mode: 'add', back: ui.sheet && ui.sheet.type === 'switcher' ? ui.sheet : null }),
    'edit-profile': () => openSheet({ type: 'profile', mode: 'edit' }),

    month: el => { const [y, m] = ui.month.split('-').map(Number); ui.month = D.str(new Date(y, m - 1 + Number(el.dataset.n), 1)).slice(0, 7); ui.logAll = false; render(); },
    'month-today': () => { ui.month = D.today().slice(0, 7); render(); },
    'open-day': el => openDay(el.dataset.date || D.today(), el.dataset.focus),
    'toggle-ex': el => toggleEx(el.dataset.date, el.dataset.ex),
    'complete-all': el => completeAll(el.dataset.date),
    'expand-ex': el => { ui.sheet.open = ui.sheet.open === el.dataset.ex ? null : el.dataset.ex; renderSheet(); },
    'day-shift': el => { ui.sheet.date = D.add(ui.sheet.date, Number(el.dataset.n)); ui.sheet.open = null; ui.selected = ui.sheet.date; ui.month = ui.selected.slice(0, 7); renderSheet(); },
    'day-remove-ex': el => {
      const u = Store.active(), ds = el.dataset.date || ui.sheet.date, id = el.dataset.ex;
      if (!guard(ds)) return;
      const plan = L.ownPlan(u, ds);
      const i = plan.indexOf(id);
      if (i >= 0) plan.splice(i, 1);
      delete L.ensureDay(u, ds).log[id];
      if (ui.sheet) ui.sheet.open = null;
      refresh();
    },
    'open-pick': el => (el.dataset.mode !== 'day' || guard(el.dataset.date)) && openSheet({ type: 'pick', mode: el.dataset.mode, date: el.dataset.date, dow: Number(el.dataset.dow), back: ui.sheet }),
    'pick-toggle': el => {
      const s = ui.sheet, id = el.dataset.ex;
      const flip = arr => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); };
      if (s.mode === 'day') {
        if (!guard(s.date)) return;
        const u = Store.active();
        const plan = L.ownPlan(u, s.date);
        if (plan.includes(id)) delete L.ensureDay(u, s.date).log[id];
        flip(plan);
        refresh();
      }
    },
    'close-sheet': el => closeSheet(el.dataset.toast),
    'open-sync': () => openSheet({ type: 'sync' }),
    'sync-now': async () => { await Sync.run(); render(); const st = Sync.status(); toast(st.state === 'ok' ? 'Synced ✓' : st.message || 'Sync failed'); },
    'sync-disconnect': () => {
      if (!confirm('Stop syncing on this device? Your data stays in this browser and in the GitHub repo.')) return;
      Sync.disconnect();
      closeSheet('Sync turned off on this device');
    },
    'view-day': el => openSheet({ type: 'day', date: el.dataset.date, open: null }),
    'ask-unlock': el => openSheet({ type: 'daylock', date: el.dataset.date }),
    'qa-open': el => {
      const t = el.dataset.target;
      if (t.startsWith('day:') && !guard(t.slice(4))) return;
      ui.qaOpen = t;
      refresh();
      focusQuickAdd(t);
    },
    filter: el => { ui.filter = el.dataset.filter; render(); },
    'cal-view': el => {
      ui.calView = el.dataset.view;
      try { localStorage.setItem('gymcal.calView', ui.calView); } catch (e) { /* ignore */ }
      render();
      const box = document.getElementById('box-' + D.today());
      if (ui.calView === 'list' && box) box.scrollIntoView({ block: 'center' });
    },
    'sheet-back': () => sheetBack(),

    range: el => { ui.range[el.dataset.metric] = el.dataset.range; render(); },
    'cardio-chart': el => { ui.cardioChart = el.dataset.type; render(); },

    'new-metric': () => openSheet({ type: 'metric', id: null }),
    'edit-metric': el => openSheet({ type: 'metric', id: el.dataset.id }),
    'delete-metric': () => {
      const u = Store.active(), m = L.metric(u, ui.sheet.id);
      if (!confirm('Delete "' + m.name + '" and all its entries?')) return;
      u.metrics = u.metrics.filter(x => x.id !== m.id);
      Object.values(u.measurements).forEach(v => { delete v[m.id]; });
      closeSheet('Metric deleted');
    },

    'pref-set': el => {
      const u = Store.active();
      const v = el.dataset.val;
      u.settings[el.dataset.key] = el.dataset.key === 'weekStart' ? Number(v) : v;
      save();
      render();
    },
    'set-pin': () => openSheet({ type: 'setpin' }),
    'remove-pin': () => {
      if (!confirm('Remove the PIN from this profile?')) return;
      Store.setPin(Store.activeId(), null);
      render();
      toast('PIN removed');
    },
    export: () => {
      const u = Store.active();
      download('gymcal-' + u.profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + D.today() + '.json',
        JSON.stringify({ app: 'gymcal', exportedAt: new Date().toISOString(), data: u }, null, 2));
    },
    import: () => $('#import-file').click(),
    'delete-profile': () => {
      const meta = Store.activeMeta();
      if (!confirm('Delete ' + meta.name + '\'s profile and ALL their data from this device? This cannot be undone.')) return;
      Store.remove(meta.id);
      resetView();
      ui.view = 'home';
      render();
      toast('Profile deleted');
    },
  };

  const FORMS = {
    welcome: fd => {
      const name = String(fd.get('name') || '').trim();
      if (!name) return;
      Store.create({ name, avatar: fd.get('avatar') || AVATARS[0], color: fd.get('color') || COLORS[0] });
      resetView();
      render();
      toast('Welcome, ' + name + '! Your plan is ready to customise.');
    },
    profile: fd => {
      const name = String(fd.get('name') || '').trim();
      if (!name) return;
      const data = { name, avatar: fd.get('avatar'), color: fd.get('color') };
      if (ui.sheet.mode === 'edit') { Store.updateProfile(Store.activeId(), data); closeSheet('Profile saved'); return; }
      Store.create(data);
      resetView();
      ui.view = 'home';
      closeSheet('Added ' + name + ' — now active');
    },
    metric: fd => {
      const u = Store.active(), s = ui.sheet;
      const data = {
        name: String(fd.get('name')).trim(), unit: String(fd.get('unit') || '').trim(), type: fd.get('type'),
        frequency: fd.get('frequency') || 'daily', enabled: fd.get('enabled') === 'on',
      };
      if (!data.name) return;
      if (s.id) Object.assign(L.metric(u, s.id), data);
      else u.metrics.push({ id: Store.uid('m'), ...data });
      closeSheet(s.id ? 'Metric saved' : 'Metric added');
    },
    'quick-add': (fd, f) => {
      const u = Store.active();
      const name = String(fd.get('name') || '').trim().replace(/\s+/g, ' ');
      if (!name) return;
      const group = fd.get('group') || 'strength';
      ui.qaGroup = group;
      let e = u.exercises.find(x => x.name.toLowerCase() === name.toLowerCase());
      const created = !e;
      if (!e) {
        let c = u.categories.find(x => x.group === group && x.name === 'Custom');
        if (!c) { c = { id: Store.uid('cat'), name: 'Custom', group }; u.categories.push(c); }
        const presets = group === 'cardio' ? ['distance', 'duration'] : group === 'other' ? ['duration'] : ['weight', 'sets', 'reps'];
        e = { id: Store.uid('ex'), name, categoryId: c.id, fields: presets.map(k => ({ ...FIELD_PRESETS[k] })), active: true };
        u.exercises.push(e);
      }
      e.active = true;
      const target = f.dataset.target;
      const sep = target.indexOf(':');
      const kind = target.slice(0, sep), val = target.slice(sep + 1);
      let list;
      if (kind !== 'day' || !guard(val)) return;
      list = L.ownPlan(u, val);
      if (list.includes(e.id)) { toast(e.name + ' is already in this list'); return; }
      list.push(e.id);
      ui.qaOpen = target;
      refresh();
      focusQuickAdd(target);
      toast('Added ' + e.name + (created ? ' (new ' + GROUPS[group].label.toLowerCase() + ' exercise)' : ''));
    },
    sync: async (fd, f) => {
      const c = {
        owner: String(fd.get('owner') || '').trim().replace(/^@/, ''),
        repo: String(fd.get('repo') || '').trim().replace(/\.git$/, ''),
        token: String(fd.get('token') || '').trim(),
        path: String(fd.get('path') || 'gymcal-data.json').trim().replace(/^\/+/, ''),
      };
      if (!c.owner || !c.repo || !c.token || !c.path) return;
      const btn = f.ownerDocument.querySelector('[form="sync-form"][type=submit]');
      if (btn) { btn.disabled = true; btn.lastChild.textContent = 'Connecting…'; }
      await Sync.configure(c);
      const st = Sync.status();
      if (st.state === 'ok') {
        if (!Store.activeMeta()) { closeSheet(); toast('Connected — no profiles in the repo yet. Create yours.'); return; }
        closeSheet('Connected — data is synced ✓');
      } else renderSheet();
    },
    daylock: (fd, f) => {
      const ds = ui.sheet.date;
      const name = Store.active().profile.name.trim().toLowerCase();
      let ok = true;
      ['n1', 'n2', 'n3'].forEach(k => {
        const good = String(fd.get(k) || '').trim().toLowerCase() === name;
        f.querySelector('[name=' + k + ']').setAttribute('aria-invalid', String(!good));
        if (!good) ok = false;
      });
      if (!ok) { toast('Type your name exactly, in all 3 boxes'); return; }
      unlockedDay = ds;
      openSheet({ type: 'day', date: ds, open: null });
      toast('🔓 ' + longDate(ds) + ' unlocked for this edit');
    },
    unlock: async fd => {
      const meta = Store.activeMeta();
      if (await hashPin(String(fd.get('pin')), meta.id) === meta.pinHash) { markUnlocked(meta.id); render(); }
      else { toast('Wrong PIN'); const i = $('#view input[name=pin]'); i.value = ''; i.focus(); }
    },
    'pin-check': async fd => {
      const id = ui.sheet.target;
      if (await hashPin(String(fd.get('pin')), id) === Store.meta(id).pinHash) { markUnlocked(id); switchUser(id); }
      else { toast('Wrong PIN'); const i = $('#pin-form input'); i.value = ''; i.focus(); }
    },
    'pin-set': async fd => {
      const pin = String(fd.get('pin')), confirmPin = String(fd.get('confirm'));
      if (!/^\d{4,8}$/.test(pin)) { toast('Use 4–8 digits'); return; }
      if (pin !== confirmPin) { toast('PINs don\'t match'); return; }
      const id = Store.activeId();
      Store.setPin(id, await hashPin(pin, id));
      markUnlocked(id);
      closeSheet('PIN saved');
    },
  };

  function setPref(u, key, value) {
    const parts = key.split('.');
    let o = u.settings;
    while (parts.length > 1) o = o[parts.shift()];
    o[parts[0]] = value;
  }

  const INPUTS = {
    exval: el => {
      const u = Store.active(), ds = el.dataset.date, id = el.dataset.ex, k = el.dataset.key;
      if (!canEdit(ds)) return;
      const day = L.ensureDay(u, ds);
      const entry = day.log[id] || (day.log[id] = { done: false, values: {} });
      entry.values = entry.values || {};
      const raw = el.value.trim();
      if (raw === '') delete entry.values[k];
      else entry.values[k] = el.type === 'number' && isFinite(Number(raw)) ? Number(raw) : raw;
      const p = $('[data-pace="' + id + '"]');
      if (p) {
        const dist = L.num(entry.values.distance), dur = L.num(entry.values.duration);
        p.textContent = dist > 0 && dur > 0 ? 'Pace ' + L.pace(dur / dist) + ' /km' : '';
      }
      saveSoon();
    },
    metric: el => {
      const u = Store.active(), ds = el.dataset.date, id = el.dataset.metric;
      if (!canEdit(ds)) return;
      const m = L.metric(u, id);
      const meas = u.measurements[ds] || (u.measurements[ds] = {});
      if (m.type === 'bool') { if (el.checked) meas[id] = true; else delete meas[id]; }
      else {
        const raw = el.value.trim();
        if (raw === '') delete meas[id];
        else meas[id] = m.type === 'text' ? raw : (isFinite(Number(raw)) ? Number(raw) : raw);
      }
      if (!Object.keys(meas).length) delete u.measurements[ds];
      saveSoon();
    },
    notes: el => { if (!canEdit(el.dataset.date)) return; L.ensureDay(Store.active(), el.dataset.date).notes = el.value; saveSoon(); },
    'metric-enabled': el => { L.metric(Store.active(), el.dataset.id).enabled = el.checked; save(); render(); },
    'track-from': el => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value) || el.value > D.today()) return;
      Store.active().profile.trackFrom = el.value;
      save();
      render();
      toast('Missed days now counted from ' + longDate(el.value));
    },
    'cardio-ex': el => { ui.cardioEx = el.value; render(); },
    'other-metric': el => { ui.otherMetric = el.value; render(); },
    pref: async el => {
      const u = Store.active(), key = el.dataset.key;
      const value = el.type === 'checkbox' ? el.checked : el.value;
      if (key === 'notify.enabled' && value) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast('Notifications are blocked for this site'); el.checked = false; return; }
      }
      setPref(u, key, value);
      save();
      render();
      if (key === 'notify.enabled' && value) toast('Reminders on');
    },
    import: el => {
      const file = el.files && el.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          Store.importDoc(parsed.data || parsed);
          resetView();
          ui.view = 'home';
          render();
          toast('Profile imported');
        } catch (e) { toast('Import failed: ' + e.message); }
      };
      reader.readAsText(file);
      el.value = '';
    },
  };

  // Text-like inputs save as you type; toggles/selects act on change.
  const LIVE = new Set(['exval', 'metric', 'notes']);

  /* ---------- notifications ---------- */
  function notify(title, body) {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icon.svg', badge: 'icon.svg' })).catch(() => { });
    } else {
      try { new Notification(title, { body, icon: 'icon.svg' }); } catch (e) { /* ignore */ }
    }
  }

  function checkNotifications() {
    const meta = Store.activeMeta();
    if (!meta || !('Notification' in window) || Notification.permission !== 'granted') return;
    const u = Store.active();
    const n = u.settings.notify;
    if (!n.enabled) return;
    const today = D.today();
    const st = L.dayStatus(u, today);
    if (!st.total || st.state === 'done') return;
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const key = 'gymcal.notified.' + meta.id + '.' + today;
    let sent = {};
    try { sent = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { /* ignore */ }
    if (hhmm >= n.time && !sent.reminder) {
      notify('🏋️ Workout reminder', 'Your ' + planName(u, st.planned) + ' workout is waiting for you.');
      sent.reminder = true;
    }
    if (n.missed && hhmm >= '21:30' && !sent.missed) {
      notify('⚠️ Workout not done yet', 'You had a planned workout today — there\'s still time.');
      sent.missed = true;
    }
    try { localStorage.setItem(key, JSON.stringify(sent)); } catch (e) { /* ignore */ }
  }

  /* ---------- boot ---------- */
  function init() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const fn = ACTIONS[el.dataset.action];
      if (fn) fn(el, e);
    });
    document.addEventListener('submit', e => {
      const f = e.target.closest('form[data-form]');
      if (!f) return;
      e.preventDefault();
      FORMS[f.dataset.form](new FormData(f), f);
    });
    const onInput = live => e => {
      const el = e.target.closest('[data-input]');
      if (!el) return;
      const k = el.dataset.input;
      if (LIVE.has(k) === live && INPUTS[k]) INPUTS[k](el);
    };
    document.addEventListener('input', onInput(true));
    document.addEventListener('change', onInput(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) closeSheet(); });
    ['paste', 'drop'].forEach(t => document.addEventListener(t, e => {
      if (e.target.closest && e.target.closest('[data-nopaste]')) { e.preventDefault(); toast('Please type your name — pasting is off'); }
    }));

    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawCharts, 150); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { const u = Store.active(); if (u) applyTheme(u.settings.theme); });

    let lastDay = D.today();
    setInterval(() => {
      if (D.today() !== lastDay) { lastDay = D.today(); if (!ui.sheet) render(); }
      checkNotifications();
    }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkNotifications(); Sync.run(); } });
    window.addEventListener('online', () => Sync.run());
    window.addEventListener('focus', () => Sync.schedule(300));
    setInterval(() => { if (!document.hidden) Sync.run(); }, 60000);

    render();
    checkNotifications();
    Sync.run();
    keepStorage();

    if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost|^http:\/\/127\./.test(location.href)) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    }
  }

  init();
})();
