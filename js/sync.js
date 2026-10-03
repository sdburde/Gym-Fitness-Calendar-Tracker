/* GymCal cloud sync: keeps the whole family's data in one JSON file inside a private GitHub repo.
 * The browser copy stays the working copy (so the app works offline); this module pulls the file,
 * merges it (newest copy of each profile wins), and pushes back when this device has newer changes.
 * Settings (including the access token) are stored on this device only and never synced.
 */
(function () {
  'use strict';

  const CFG_KEY = 'gymcal.sync.v1';
  const API = 'https://api.github.com';
  let status = { state: 'off', message: '', at: null };
  let timer = null;
  let running = null;
  let again = false;
  const statusListeners = [];
  const dataListeners = [];

  function cfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) { return null; }
  }

  function setCfg(c) {
    try {
      if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c)); else localStorage.removeItem(CFG_KEY);
    } catch (e) { /* ignore */ }
    setStatus(c ? 'idle' : 'off');
  }

  function setStatus(state, message = '') {
    status = { state, message, at: state === 'ok' ? new Date() : status.at };
    statusListeners.forEach(fn => fn(status));
  }

  const fileUrl = c => API + '/repos/' + encodeURIComponent(c.owner) + '/' + encodeURIComponent(c.repo) +
    '/contents/' + c.path.split('/').map(encodeURIComponent).join('/');

  const headers = c => ({
    Authorization: 'Bearer ' + c.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });

  // UTF-8 safe base64 (names and notes may contain emoji or non-English text).
  function toBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromBase64(b64) {
    const bin = atob(String(b64).replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
  }

  async function failure(res, action) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch (e) { /* ignore */ }
    const why = {
      401: 'GitHub rejected the token. Check it is correct and not expired.',
      403: 'The token is not allowed to ' + action + ' this repository (needs Contents: read and write), or GitHub rate-limited the request.',
      404: 'Repository not found. Check the owner and repo name, and that the token can access that repo.',
    }[res.status] || 'GitHub error ' + res.status + (detail ? ': ' + detail : '');
    const err = new Error(why);
    err.status = res.status;
    return err;
  }

  async function pull(c) {
    const ref = c.branch ? '?ref=' + encodeURIComponent(c.branch) : '';
    const res = await fetch(fileUrl(c) + ref, { headers: headers(c), cache: 'no-store' });
    if (res.status === 404) {
      // A missing file is fine (first sync); a missing repo is not.
      const repo = await fetch(API + '/repos/' + encodeURIComponent(c.owner) + '/' + encodeURIComponent(c.repo), { headers: headers(c), cache: 'no-store' });
      if (!repo.ok) throw await failure(repo, 'read');
      return { sha: null, data: null };
    }
    if (!res.ok) throw await failure(res, 'read');
    const json = await res.json();
    let data = null;
    try { data = JSON.parse(fromBase64(json.content)); } catch (e) { throw new Error('The data file in the repo is not valid GymCal data.'); }
    return { sha: json.sha, data };
  }

  async function push(c, data, sha) {
    const body = {
      message: 'GymCal sync ' + new Date().toISOString(),
      content: toBase64(JSON.stringify(data)),
    };
    if (sha) body.sha = sha;
    if (c.branch) body.branch = c.branch;
    const res = await fetch(fileUrl(c), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers(c)), body: JSON.stringify(body) });
    if (res.status === 409 || (res.status === 422 && sha === null)) {
      const err = new Error('conflict');
      err.conflict = true;
      throw err;
    }
    if (!res.ok) throw await failure(res, 'write to');
  }

  // Pull → merge → push if this device has anything newer. Retries when another device wrote in between.
  function run() {
    const c = cfg();
    if (!c) return Promise.resolve();
    if (running) { again = true; return running; }
    if (!navigator.onLine) { setStatus('offline', 'Offline — changes are kept on this device and will sync later.'); return Promise.resolve(); }
    running = (async () => {
      setStatus('syncing');
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const remote = await pull(c);
          if (Store.merge(remote.data)) dataListeners.forEach(fn => fn());
          const local = Store.bundle();
          if (remote.data && Store.fingerprint(remote.data) === Store.fingerprint(local)) break;
          if (!remote.data && !Object.keys(local.docs).length && !Object.keys(local.deleted).length) break;
          try { await push(c, local, remote.sha); break; } catch (e) {
            if (e.conflict && attempt < 2) continue;
            throw e;
          }
        }
        setStatus('ok');
      } catch (e) {
        setStatus(navigator.onLine ? 'error' : 'offline', navigator.onLine ? (e.message || 'Sync failed') : 'Offline — changes are kept on this device and will sync later.');
      }
      running = null;
      if (again) { again = false; run(); }
    })();
    return running;
  }

  function schedule(delay = 1500) {
    if (!cfg()) return;
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  }

  window.Sync = {
    config: cfg,
    configure(c) { setCfg(c); return c ? run() : Promise.resolve(); },
    disconnect() { setCfg(null); },
    run,
    schedule,
    status: () => status,
    onStatus(fn) { statusListeners.push(fn); },
    onData(fn) { dataListeners.push(fn); },
  };

  if (cfg()) status.state = 'idle';
})();
