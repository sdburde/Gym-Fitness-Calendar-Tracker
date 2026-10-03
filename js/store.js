/* GymCal data layer.
 * Every family member gets their own document stored under its own key
 * (gymcal.user.<id>.v1). A small index stores only the profile directory
 * (name/avatar/color/pin hash) so the switcher never loads another user's data.
 */
(function () {
  'use strict';

  const INDEX_KEY = 'gymcal.index.v1';
  const userKey = id => 'gymcal.user.' + id + '.v1';
  const pad = n => String(n).padStart(2, '0');

  // Dates are handled as local "YYYY-MM-DD" strings to avoid timezone drift.
  const D = {
    str(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    today() { return D.str(new Date()); },
    add(s, n) { const d = D.parse(s); d.setDate(d.getDate() + n); return D.str(d); },
    dow(s) { return D.parse(s).getDay(); },
    diff(a, b) { return Math.round((D.parse(b) - D.parse(a)) / 864e5); },
    weekStart(s, ws) { return D.add(s, -((D.dow(s) - ws + 7) % 7)); },
  };

  const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const FIELD_PRESETS = {
    weight: { key: 'weight', label: 'Weight', unit: 'kg', type: 'decimal' },
    sets: { key: 'sets', label: 'Sets', unit: '', type: 'number' },
    reps: { key: 'reps', label: 'Reps', unit: '', type: 'number' },
    duration: { key: 'duration', label: 'Duration', unit: 'min', type: 'decimal' },
    distance: { key: 'distance', label: 'Distance', unit: 'km', type: 'decimal' },
    calories: { key: 'calories', label: 'Calories', unit: 'kcal', type: 'number' },
    time: { key: 'time', label: 'Time', unit: '', type: 'time' },
  };

  const GROUPS = {
    strength: { label: 'Strength', icon: '🏋️' },
    cardio: { label: 'Cardio', icon: '🏃' },
    other: { label: 'Other', icon: '🧘' },
  };

  const METRIC_TYPES = {
    number: 'Number', decimal: 'Decimal', text: 'Text', bool: 'Yes / No',
    duration: 'Duration', distance: 'Distance', percentage: 'Percentage',
  };

  const DEFAULT_SETTINGS = {
    partial: true, weekStart: 1, theme: 'system', showStreak: true,
    notify: { enabled: false, time: '18:00', missed: true },
  };

  function read(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) {
      console.error(e);
      if (Store.onError) Store.onError('Could not save — browser storage is full or blocked.');
      return false;
    }
  }

  function defaultMetrics() {
    return [
      { id: 'm_weight', name: 'Weight', unit: 'kg', type: 'decimal', frequency: 'daily', enabled: true, builtin: 'weight' },
      { id: 'm_waist', name: 'Waist', unit: 'cm', type: 'decimal', frequency: 'weekly', enabled: true, builtin: 'waist' },
    ];
  }

  // New profiles start blank: no built-in exercises or plan. The user types their own.
  function newUserDoc(profile) {
    return {
      schema: 2,
      profile,
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      categories: [],
      exercises: [],
      plan: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      days: {},          // 'YYYY-MM-DD' -> { plan?: [exId], log: { exId: { done, values } }, notes }
      metrics: defaultMetrics(),
      measurements: {},  // 'YYYY-MM-DD' -> { metricId: value }
    };
  }

  // Profiles from earlier versions came pre-filled. Remove built-in items the user never used.
  const SEEDED = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Abs/Core', 'Running', 'Walking', 'Cycling',
    'Swimming', 'HIIT', 'Stair Climbing', 'Stretching', 'Yoga', 'Mobility', 'Bench Press', 'Incline Dumbbell Press', 'Cable Fly',
    'Lat Pulldown', 'Seated Row', 'Squat'];
  const SEEDED_METRICS = /^m_(chest|arm|thigh|bodyfat|sleep|calories|steps)$/;
  function stripSeeded(doc) {
    const used = new Set();
    Object.values(doc.days).forEach(d => {
      const log = d.log || {};
      Object.keys(log).forEach(id => { if (log[id].done || Object.keys(log[id].values || {}).length) used.add(id); });
    });
    // Plans were only ever pre-filled, so drop untouched entries everywhere.
    Object.values(doc.days).forEach(d => { if (Array.isArray(d.plan)) d.plan = d.plan.filter(id => used.has(id)); });
    for (let i = 0; i < 7; i++) doc.plan[i] = [];
    doc.exercises = doc.exercises.filter(e => used.has(e.id) || !SEEDED.includes(e.name));
    doc.categories = doc.categories.filter(c => doc.exercises.some(e => e.categoryId === c.id));
    const hasData = id => Object.values(doc.measurements).some(m => m[id] != null);
    doc.metrics = doc.metrics.filter(m => !SEEDED_METRICS.test(m.id) || m.enabled || hasData(m.id));
    doc.schema = 2;
  }

  function migrate(doc) {
    doc.settings = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), doc.settings || {});
    doc.settings.notify = Object.assign({}, DEFAULT_SETTINGS.notify, doc.settings.notify || {});
    doc.days = doc.days || {};
    doc.measurements = doc.measurements || {};
    doc.metrics = doc.metrics || defaultMetrics();
    doc.plan = doc.plan || {};
    for (let i = 0; i < 7; i++) doc.plan[i] = doc.plan[i] || [];
    if (!doc.profile.startDate) doc.profile.startDate = D.str(new Date(doc.profile.createdAt || Date.now()));
    doc.categories = doc.categories || [];
    doc.exercises = doc.exercises || [];
    return doc;
  }

  let index = read(INDEX_KEY) || { activeUserId: null, users: [] };
  index.deleted = index.deleted || {};   // userId -> time the profile was deleted (so deletions sync too)
  const cache = {};
  const saveIndex = () => write(INDEX_KEY, index);
  const clone = o => JSON.parse(JSON.stringify(o));
  const changed = () => { if (Store.onSaved) Store.onSaved(); };

  // The directory entry mirrors the profile stored in the user's own document.
  function upsertMeta(id, p) {
    let m = index.users.find(u => u.id === id);
    if (!m) { m = { id }; index.users.push(m); }
    Object.assign(m, { name: p.name, avatar: p.avatar || '💪', color: p.color || '#005ea2', pinHash: p.pinHash || null });
  }

  function dropLocal(id) {
    try { localStorage.removeItem(userKey(id)); } catch (e) { /* ignore */ }
    delete cache[id];
    index.users = index.users.filter(u => u.id !== id);
    if (index.activeUserId === id) index.activeUserId = index.users.length ? index.users[0].id : null;
  }

  // Bump the change time and persist. Every edit goes through here, which is what sync compares.
  function persist(id) {
    const doc = cache[id];
    if (!doc) return false;
    doc.updatedAt = Date.now();
    const ok = write(userKey(id), doc);
    changed();
    return ok;
  }

  const Store = {
    D, uid, FIELD_PRESETS, GROUPS, METRIC_TYPES,
    onError: null,
    onSaved: null,

    list: () => index.users.slice(),
    meta: id => index.users.find(u => u.id === id) || null,
    activeId: () => index.activeUserId,
    activeMeta() { return this.meta(index.activeUserId); },

    get(id) {
      if (!cache[id]) {
        const doc = read(userKey(id));
        if (doc) {
          cache[id] = migrate(doc);
          if ((doc.schema || 1) < 2) { stripSeeded(doc); write(userKey(id), doc); }
          const m = this.meta(id);
          if (m && m.pinHash && !doc.profile.pinHash) doc.profile.pinHash = m.pinHash;
        }
      }
      return cache[id] || null;
    },
    active() { return index.activeUserId ? this.get(index.activeUserId) : null; },

    create({ name, avatar, color }) {
      const id = uid('user');
      const profile = { id, name, avatar, color, createdAt: new Date().toISOString(), startDate: D.today() };
      cache[id] = newUserDoc(profile);
      upsertMeta(id, profile);
      index.activeUserId = id;
      saveIndex();
      persist(id);
      return id;
    },

    switchTo(id) {
      if (!this.meta(id)) return;
      index.activeUserId = id;
      saveIndex();
    },

    remove(id) {
      dropLocal(id);
      index.deleted[id] = Date.now();
      saveIndex();
      changed();
    },

    save(id = index.activeUserId) { return persist(id); },

    updateProfile(id, patch) {
      const doc = this.get(id);
      if (!doc) return;
      ['name', 'avatar', 'color'].forEach(k => { if (patch[k] != null) doc.profile[k] = patch[k]; });
      upsertMeta(id, doc.profile);
      saveIndex();
      persist(id);
    },

    setPin(id, hash) {
      const doc = this.get(id);
      if (!doc) return;
      doc.profile.pinHash = hash;
      upsertMeta(id, doc.profile);
      saveIndex();
      persist(id);
    },

    importDoc(raw) {
      if (!raw || !raw.profile || !Array.isArray(raw.exercises)) throw new Error('Not a GymCal profile file');
      const doc = migrate(clone(raw));
      const id = uid('user');
      doc.profile.id = id;
      doc.profile.pinHash = null;
      if (index.users.some(u => u.name === doc.profile.name)) doc.profile.name += ' (imported)';
      cache[id] = doc;
      upsertMeta(id, doc.profile);
      index.activeUserId = id;
      saveIndex();
      persist(id);
      return id;
    },

    /* ---------- sync support ---------- */

    // Everything shared across devices: every profile's document plus deletions.
    // Which profile is active stays per device.
    bundle() {
      const docs = {};
      index.users.forEach(m => { const d = this.get(m.id); if (d) docs[m.id] = d; });
      return { app: 'gymcal', format: 1, deleted: Object.assign({}, index.deleted), docs };
    },

    // A short summary that changes whenever any profile changes; equal fingerprints mean nothing to sync.
    fingerprint(b) {
      if (!b || !b.docs) return '';
      const docs = Object.keys(b.docs).sort().map(k => k + ':' + (b.docs[k].updatedAt || 0));
      const del = Object.keys(b.deleted || {}).sort().map(k => k + ':' + b.deleted[k]);
      return docs.join(',') + '|' + del.join(',');
    },

    // Merge a bundle from the cloud: for each profile the most recently changed copy wins.
    // Returns true when local data changed.
    merge(remote) {
      if (!remote || !remote.docs) return false;
      let didChange = false;
      Object.entries(remote.deleted || {}).forEach(([id, t]) => {
        if (!(index.deleted[id] >= t)) index.deleted[id] = t;
      });
      Object.entries(remote.docs).forEach(([id, rd]) => {
        if (!rd || !rd.profile) return;
        if (index.deleted[id] >= (rd.updatedAt || 0)) return;
        const ld = this.get(id);
        if (!ld || (rd.updatedAt || 0) > (ld.updatedAt || 0)) {
          cache[id] = migrate(clone(rd));
          write(userKey(id), cache[id]);
          upsertMeta(id, cache[id].profile);
          didChange = true;
        }
      });
      Object.entries(index.deleted).forEach(([id, t]) => {
        const d = this.meta(id) && this.get(id);
        if (d && (d.updatedAt || 0) <= t) { dropLocal(id); didChange = true; }
      });
      if (!this.meta(index.activeUserId)) index.activeUserId = index.users.length ? index.users[0].id : null;
      saveIndex();
      return didChange;
    },
  };

  window.Store = Store;
})();
