// Browser-side stand-in for server.js (used when no API is available, e.g. on Vercel). State lives in localStorage.
(() => {
  const KEY = 'cv.db.v1';
  let SEED = null, db = null;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  async function ensure() {
    if (db) return;
    SEED = await (await fetch('seed.json')).json();
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db) db = clone(SEED);
    for (const k of Object.keys(SEED)) if (!(k in db)) db[k] = clone(SEED[k]);
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const bad = (m) => { throw new Error(m); };
  async function handle(method, url, body) {
    await ensure();
    body = body || {};
    const c = db.customer, opt = SEED.options;
    const EDITABLE = {
      description: (v) => typeof v === 'string' && v.length <= 600,
      manageType: (v) => v === '' || opt.manageTypes.some((o) => o.v === v),
      managedBy: (v) => v === '' || opt.managers.some((o) => o.v === v),
      location: (v) => opt.locations.includes(v)
    };
    if (url === '/api/customer' && method === 'GET') return clone(db);
    if (url === '/api/customer' && method === 'PATCH') {
      for (const [k, v] of Object.entries(body)) {
        if (!EDITABLE[k]) bad(`Field "${k}" is not editable`);
        if (!EDITABLE[k](v)) bad(`Invalid value for "${k}"`);
      }
      if (body.location && body.location !== c.location) db.locationHistory.unshift({ at: new Date().toISOString().slice(0, 10), text: `Changed to ${body.location.split(',')[0]} by you` });
      Object.assign(c, body); save(); return clone(db);
    }
    if (url === '/api/escalations' && method === 'POST') {
      if (!opt.escalationBadges.includes(body.label)) bad('Unknown badge');
      if (!c.escalations.includes(body.label)) c.escalations.push(body.label);
      save(); return clone(db);
    }
    let m = url.match(/^\/api\/escalations\/(.+)$/);
    if (m && method === 'DELETE') { c.escalations = c.escalations.filter((b) => b !== decodeURIComponent(m[1])); save(); return clone(db); }
    if (url === '/api/actions' && method === 'POST') {
      const map = { block: 'Blocked', restrict: 'Restricted', restrictBlock: 'Restricted & blocked', reinstate: 'Active' };
      if (map[body.action]) c.status = map[body.action];
      else if (body.action === 'toggleWithdrawals') db.security.withdrawalsBlocked = !db.security.withdrawalsBlocked;
      else if (body.action === 'toggle2fa') db.security.twoFA = !db.security.twoFA;
      else bad('Unknown action');
      save(); return clone(db);
    }
    m = url.match(/^\/api\/identities\/(.+)$/);
    if (m && method === 'DELETE') { db.security.identities = db.security.identities.filter((i) => i.id !== decodeURIComponent(m[1])); save(); return clone(db); }
    if (url === '/api/identities' && method === 'POST') {
      if (!body.identity || !body.identity.id) bad('Invalid identity');
      if (!db.security.identities.some((i) => i.id === body.identity.id)) db.security.identities.push(body.identity);
      save(); return clone(db);
    }
    if (url === '/api/quality' && method === 'PATCH') {
      const okS = ['High Quality', 'Medium Quality', 'Low Quality', 'Not rated'], okL = ['New Seller', 'Level 1', 'Level 2', 'Top Rated Seller'];
      if ('suggested' in body) { if (!okS.includes(body.suggested)) bad('Invalid quality'); db.quality.suggested = body.suggested; db.quality.changedNote = typeof body.note === 'string' ? body.note : `${body.suggested} | Changed by: You ${new Date().toISOString().replace('T', ' ').slice(0, 19)} +0000`; }
      if ('level' in body) { if (!okL.includes(body.level)) bad('Invalid level'); db.quality.level = body.level; }
      save(); return clone(db);
    }
    if (url === '/api/restore' && method === 'POST') {
      if (typeof body.status === 'string') c.status = body.status;
      if (typeof body.withdrawalsBlocked === 'boolean') db.security.withdrawalsBlocked = body.withdrawalsBlocked;
      if (typeof body.twoFA === 'boolean') db.security.twoFA = body.twoFA;
      save(); return clone(db);
    }
    if (url === '/api/reset' && method === 'POST') { db = clone(SEED); save(); return clone(db); }
    bad('Not found');
  }
  window.CVStore = { handle };
})();
