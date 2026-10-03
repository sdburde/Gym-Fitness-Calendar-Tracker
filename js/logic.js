/* GymCal business rules: day status, streaks, stats, series. Pure functions over one user document. */
(function () {
  'use strict';
  const { D } = Store;

  const num = v => (v === '' || v == null || v === true || v === false ? NaN : Number(v));
  const ex = (u, id) => u.exercises.find(e => e.id === id) || null;
  const cat = (u, e) => (e && u.categories.find(c => c.id === e.categoryId)) || null;
  const groupOf = (u, e) => (cat(u, e) || {}).group || 'other';
  const metric = (u, id) => u.metrics.find(m => m.id === id) || null;
  const builtin = (u, key) => u.metrics.find(m => m.builtin === key) || null;

  // Missed days are counted from here: a date the user picked, otherwise the 1st of the month the profile was created.
  const trackStart = u => u.profile.trackFrom || u.profile.startDate.slice(0, 8) + '01';

  function plannedFor(u, ds) {
    const day = u.days[ds];
    const ids = day && Array.isArray(day.plan) ? day.plan : (u.plan[D.dow(ds)] || []);
    return ids.filter(id => ex(u, id));
  }

  // Planned exercises plus anything logged on that day that is no longer in its plan.
  function dayItems(u, ds) {
    const planned = plannedFor(u, ds);
    const log = (u.days[ds] && u.days[ds].log) || {};
    const extra = Object.keys(log).filter(id => !planned.includes(id) && ex(u, id) &&
      (log[id].done || Object.keys(log[id].values || {}).length));
    return planned.concat(extra);
  }

  /* States:
   *  done     – every planned exercise completed (or a bonus workout on a rest day)
   *  partial  – past day, some but not all completed (only when partial completion is enabled)
   *  progress – today, some completed
   *  todo     – today, nothing completed yet
   *  missed   – past day with nothing completed (including days with no entry at all)
   *  rest     – nothing added yet (today or a future day)
   *  future   – planned, not yet due
   *  none     – before the profile started tracking
   * Measurements never influence the state. */
  function dayStatus(u, ds, today = D.today()) {
    const planned = plannedFor(u, ds);
    const log = (u.days[ds] && u.days[ds].log) || {};
    const isDone = id => !!(log[id] && log[id].done && ex(u, id));
    const done = planned.filter(isDone).length;
    const extra = Object.keys(log).filter(id => isDone(id) && !planned.includes(id));
    const base = { planned, done, total: planned.length, extra };

    // Before tracking started, a day only counts if something was added to it.
    const hasEntries = planned.length || Object.keys(log).some(id => ex(u, id));
    if (ds < trackStart(u) && !hasEntries) return { ...base, state: 'none' };
    // A past day with nothing logged counts as missed; today and future days stay open.
    if (!planned.length) return { ...base, state: extra.length ? 'done' : ds < today ? 'missed' : 'rest' };
    if (done === planned.length) return { ...base, state: 'done' };
    if (ds > today) return { ...base, state: 'future' };
    if (ds === today) return { ...base, state: done ? 'progress' : 'todo' };
    if (done && u.settings.partial) return { ...base, state: 'partial' };
    return { ...base, state: 'missed' };
  }

  function earliest(u) {
    let s = trackStart(u);
    for (const k in u.days) if (k < s && dayStatus(u, k).state !== 'none') s = k;
    return s;
  }

  // Streak counts completed workout days only. Rest days and today (until it ends) never break it.
  function streaks(u) {
    const today = D.today();
    let run = 0, best = 0;
    for (let ds = earliest(u); ds <= today; ds = D.add(ds, 1)) {
      const s = dayStatus(u, ds, today).state;
      if (s === 'done') { run++; if (run > best) best = run; }
      else if (s === 'missed' || s === 'partial') run = 0;
    }
    return { current: run, best };
  }

  function metricSeries(u, id) {
    return Object.keys(u.measurements).sort()
      .filter(ds => u.measurements[ds][id] != null && u.measurements[ds][id] !== '')
      .map(ds => ({ ds, v: u.measurements[ds][id] }));
  }
  const numericSeries = (u, id) => metricSeries(u, id).filter(p => isFinite(num(p.v))).map(p => ({ ds: p.ds, v: num(p.v) }));

  function latestBefore(u, id, ds) {
    const s = metricSeries(u, id).filter(p => p.ds < ds);
    return s.length ? s[s.length - 1] : null;
  }

  function metricChange(u, m, from, to) {
    if (!m) return null;
    const s = numericSeries(u, m.id);
    const before = s.filter(p => p.ds < from).pop();
    const inRange = s.filter(p => p.ds >= from && p.ds <= to);
    if (!inRange.length) return null;
    const base = before || inRange[0];
    const end = inRange[inRange.length - 1];
    return base === end ? null : end.v - base.v;
  }

  function cardioSessions(u, exId = 'all') {
    const out = [];
    Object.keys(u.days).sort().forEach(ds => {
      const log = u.days[ds].log || {};
      Object.keys(log).forEach(id => {
        const e = ex(u, id);
        if (!e || !log[id].done || groupOf(u, e) !== 'cardio') return;
        if (exId !== 'all' && id !== exId) return;
        const v = log[id].values || {};
        const distance = num(v.distance), duration = num(v.duration);
        out.push({
          ds, exId: id,
          distance: isFinite(distance) ? distance : 0,
          duration: isFinite(duration) ? duration : 0,
          pace: distance > 0 && duration > 0 ? duration / distance : null,
        });
      });
    });
    return out;
  }

  function monthStats(u, y, m) {
    const today = D.today();
    const first = D.str(new Date(y, m, 1)), last = D.str(new Date(y, m + 1, 0));
    const r = { done: 0, due: 0, missed: 0, partial: 0, rest: 0, cardioKm: 0 };
    for (let ds = first; ds <= last; ds = D.add(ds, 1)) {
      if (ds > today) break;
      const st = dayStatus(u, ds, today);
      if (st.state === 'done' && st.total) { r.done++; r.due++; }
      else if (st.state === 'missed') { r.missed++; r.due++; }
      else if (st.state === 'partial') { r.partial++; r.due++; }
      else if (st.state === 'rest') r.rest++;
    }
    cardioSessions(u).forEach(s => { if (s.ds >= first && s.ds <= last) r.cardioKm += s.distance; });
    r.pct = r.due ? Math.round(r.done / r.due * 100) : null;
    r.weight = metricChange(u, builtin(u, 'weight'), first, last);
    r.waist = metricChange(u, builtin(u, 'waist'), first, last);
    return r;
  }

  function heat(u, weeks = 12) {
    const today = D.today();
    const start = D.add(D.weekStart(today, u.settings.weekStart), -7 * (weeks - 1));
    const out = [];
    for (let i = 0; i < weeks * 7; i++) {
      const ds = D.add(start, i);
      out.push({ ds, state: ds > today ? 'blank' : dayStatus(u, ds, today).state });
    }
    return out;
  }

  const pace = minPerKm => {
    if (!minPerKm || !isFinite(minPerKm)) return '';
    let m = Math.floor(minPerKm), s = Math.round((minPerKm - m) * 60);
    if (s === 60) { m++; s = 0; }
    return m + ':' + String(s).padStart(2, '0');
  };

  function valueSummary(e, values) {
    if (!e || !values) return '';
    const parts = [];
    e.fields.forEach(f => {
      const v = values[f.key];
      if (v == null || v === '') return;
      if (f.key === 'sets') parts.push(v + '\u00a0sets');
      else if (f.key === 'reps') parts.push(v + '\u00a0reps');
      else if (f.key in Store.FIELD_PRESETS) parts.push(v + (f.unit ? '\u00a0' + f.unit : ''));
      else parts.push(f.label + ' ' + v + (f.unit ? '\u00a0' + f.unit : ''));
    });
    const p = num(values.duration) / num(values.distance);
    if (num(values.distance) > 0 && num(values.duration) > 0) parts.push(pace(p) + '\u00a0/km');
    return parts.join(' · ');
  }

  function ensureDay(u, ds) {
    const d = u.days[ds] || (u.days[ds] = {});
    d.log = d.log || {};
    if (d.notes == null) d.notes = '';
    return d;
  }

  // Detach a single date from the weekly template so it can be customised.
  function ownPlan(u, ds) {
    const d = ensureDay(u, ds);
    if (!Array.isArray(d.plan)) d.plan = plannedFor(u, ds).slice();
    return d.plan;
  }

  window.Logic = {
    num, trackStart, ex, cat, groupOf, metric, builtin, plannedFor, dayItems, dayStatus, streaks,
    metricSeries, numericSeries, latestBefore, metricChange, cardioSessions, monthStats, heat,
    pace, valueSummary, ensureDay, ownPlan,
  };
})();
