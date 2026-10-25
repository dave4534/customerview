(() => {
  const NAV = [
    ['overview', 'Customer overview'], ['financial-overview', 'Financial overview'], ['orders-overview', 'Orders overview'],
    ['account-security', 'Account & security'], ['quality', 'Quality'], ['gigs', 'Gigs']
  ];
  const BUILT = NAV.map((n) => n[0]);
  const MENU = ['Admin', 'Moderation', 'Users', 'Orders', 'Finance', 'Risk', 'Marketing', 'Content', 'Dev'];
  const MAX_DESC = 600;

  const S = { db: null, open: null, draft: '', gigFilter: 'Active gigs', collapsed: {}, active: 'overview', tab: 'seller' };
  try { S.collapsed = JSON.parse(localStorage.getItem('cv.collapsed') || '{}') || {}; } catch (e) {}
  const saveCollapsed = () => { try { localStorage.setItem('cv.collapsed', JSON.stringify(S.collapsed)); } catch (e) {} };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const d = (iso) => new Date(iso + 'T00:00:00');
  const fmt = (iso) => d(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10 < 4 ? n % 10 : 0]);
  const longDay = (iso) => d(iso).toLocaleDateString('en-US', { month: 'long' }) + ' ' + ord(d(iso).getDate());
  const money = (n) => '$' + n.toLocaleString('en-US');
  const axisMoney = (n) => (n >= 1000 ? '$' + n / 1000 + 'K' : '$' + n);
  const tenure = (iso) => {
    const a = d(iso), b = new Date();
    let y = b.getFullYear() - a.getFullYear();
    let anniv = new Date(a); anniv.setFullYear(a.getFullYear() + y);
    if (anniv > b) { y--; anniv = new Date(a); anniv.setFullYear(a.getFullYear() + y); }
    return `${y}y${Math.floor((b - anniv) / 864e5)}d`;
  };
  const nice = (v, list) => list.find((x) => x >= v) || list[list.length - 1];

  const X = '<svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const CHEV = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5-5 5 5"/></svg>';

  let STATIC = false;
  async function api(method, url, body) {
    if (!STATIC) {
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
      if (r && (r.headers.get('content-type') || '').includes('json')) {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Request failed');
        return j;
      }
      STATIC = true; // no API here (e.g. Vercel static hosting): run against the in-browser store
    }
    return window.CVStore.handle(method, url, body);
  }
  // Toast (Figma: light tinted bar, status icon, text, optional Undo, close X; auto-dismisses, closable any time)
  const TICON = {
    info: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#4a73e8"/><rect x="9" y="8.5" width="2" height="6" rx="1" fill="#fff"/><circle cx="10" cy="5.8" r="1.2" fill="#fff"/></svg>',
    success: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1dbf73"/><path d="M5.8 10.3l2.8 2.8 5.6-5.8" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#e03131"/><rect x="9" y="4.8" width="2" height="6.4" rx="1" fill="#fff"/><circle cx="10" cy="14.4" r="1.2" fill="#fff"/></svg>'
  };
  let toastEl, toastTimer, toastHost;
  function hideToast() {
    clearTimeout(toastTimer);
    const el = toastEl; toastEl = null;
    if (el) { el.classList.remove('in'); setTimeout(() => el.remove(), 200); }
  }
  function toast(msg, o) {
    o = o || {};
    const kind = o.kind || 'info';
    if (!toastHost) { toastHost = document.createElement('div'); toastHost.className = 'toasts'; toastHost.setAttribute('aria-live', 'polite'); document.body.appendChild(toastHost); }
    hideToast();
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="ti">${TICON[kind]}</span><span class="tt">${esc(msg)}</span>${o.undo ? '<button type="button" class="tundo">Undo</button>' : ''}<button type="button" class="tclose" aria-label="Close notification">${X}</button>`;
    el.querySelector('.tclose').addEventListener('click', hideToast);
    if (o.undo) el.querySelector('.tundo').addEventListener('click', () => { hideToast(); o.undo(); });
    const arm = () => { clearTimeout(toastTimer); toastTimer = setTimeout(() => { if (toastEl === el) hideToast(); }, 6000); };
    el.addEventListener('mouseenter', () => clearTimeout(toastTimer));
    el.addEventListener('mouseleave', arm);
    toastHost.appendChild(el);
    toastEl = el;
    requestAnimationFrame(() => el.classList.add('in'));
    arm();
  }
  // Run a server change, then show a success toast with Undo (destructive actions are always undoable).
  async function mutate(fn, okMsg, undo) {
    try {
      S.db = await fn();
      render();
      if (okMsg) toast(okMsg, { kind: 'success', undo: undo ? () => mutate(undo, 'Change undone') : null });
    } catch (e) { render(); toast(e.message, { kind: 'error' }); }
  }

  const CLOSE_BTN = '<button class="pbtn pri lg" data-act="close">Close</button>';
  let POPS = [];
  function popover(id, label, inner, opts) {
    if (S.open !== id) return '';
    const o = opts || {};
    const foot = o.foot === undefined ? CLOSE_BTN : o.foot;
    POPS.push(`<div class="overlay"><div class="scrim" data-act="close"></div><div class="pop${o.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}" data-pop="${id}">
      <div class="pophd"><h4>${esc(label)}</h4><button class="x" data-act="close" aria-label="Close">${X}</button></div><div class="popbody">${inner}</div>${foot ? `<div class="popfoot">${foot}</div>` : ''}</div></div>`);
    return '';
  }
  function trigger(id, text, cls) {
    return `<button class="${cls || 'lnk'}" data-act="toggle" data-id="${id}" data-trigger="${id}" aria-haspopup="dialog" aria-expanded="${S.open === id}">${esc(text)}</button>`;
  }
  const rows = (arr) => arr.map((r) => `<div class="pk"><div class="k">${esc(r[0])}</div><div class="pv">${esc(r[1])}</div></div>`).join('');
  const nlist = (arr) => `<div class="nlist">${arr.map((t) => `<div class="ni">${esc(t)} <button class="lnk lg">Action</button></div>`).join('')}</div>`;

  function cardShell(id, title, summary, body) {
    const closed = !!S.collapsed[id];
    return `<section id="${id}" class="card${closed ? ' closed' : ''}"><button class="hdr" data-act="section" data-id="${id}" aria-expanded="${!closed}" aria-controls="${id}-body">
      <h2 class="ttl">${esc(title)}</h2><span class="sumw">${summary}</span>
      <span class="chev">${CHEV}</span></button><div class="collapse"><div class="inner"><div class="body" id="${id}-body">${body}</div></div></div></section>`;
  }

  function overview() {
    const { customer: c, notifications, courses, tests, locationHistory, options, emailAccounts } = S.db;
    const active = notifications.filter((n) => n.status === 'Active');
    const sel = (id, label, val, opts, field) => `<div class="kv"><label class="k" for="${id}">${label}</label>
      <select id="${id}" class="sel${val ? '' : ' ph'}" data-field="${field}"><option value="">Select</option>${opts.map((o) => `<option value="${o.v}"${o.v === val ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select></div>`;
    const remaining = options.escalationBadges.filter((b) => !c.escalations.includes(b));
    const summary = `<span class="sum">${esc(c.username)} · ${esc(c.status)} · ${esc(c.location)}</span><span class="grow"></span>
        ${c.escalations.slice(0, 2).map((b) => `<span class="bdg red">${esc(b)}</span>`).join('')}
        ${active.length ? `<span class="pill">${active.length} notification${active.length > 1 ? 's' : ''}</span>` : ''}`;
    const body = `
      <div class="r1">
        <div class="profile">
          <button class="kebab" aria-label="More options"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="3" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="8" cy="13" r="1.4"/></svg></button>
          <div class="ava"><img src="assets/avatar.png" alt="Profile photo of ${esc(c.username)}"><span class="lvl">${esc(c.level).replace(' ', '<br>')}</span></div>
          <div class="uname">${esc(c.username)}</div>
          <p class="bio">${esc(c.bio)}</p>
          <div class="rate"><svg width="14" height="14" viewBox="0 0 16 16" fill="#f5b90f" aria-hidden="true"><path d="M8 1l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.4 3.5 14.8l.9-5L.8 6.3l5-.7z"/></svg><b>${c.rating}</b><span>(${c.reviews} reviews)</span></div>
          <div class="chipsrow"><div class="mini"><small>User type</small><strong>${esc(c.userType)}</strong></div><div class="mini"><small>Quality bucket</small><strong class="good">${esc(c.qualityBucket)}</strong></div></div>
        </div>
        <div class="info"><h3 class="h3">Customer information</h3>
          <div class="infogrid">
            <div>
              <div class="kv"><div class="k">Username</div><div class="v">${esc(c.username)}</div></div>
              <div class="kv"><div class="k">Status</div><div class="v">${esc(c.status)}</div></div>
              <div class="kv"><div class="k">Joined Fiverr on</div><div class="v">${fmt(c.joined)} (${tenure(c.joined)})</div></div>
              <div class="kv"><div class="k">Email</div><div class="v">${esc(c.email)}</div>
                <span class="anchor in">${trigger('email', 'Search')}${popover('email', 'Accounts using ' + c.email,
                  emailAccounts.map((a) => `<div class="pk"><div class="k">${esc(a.status)} · Joined ${esc(a.joined)}</div><div class="pv">${esc(a.username)}${a.self ? ' (this account)' : ''}</div></div>`).join('') +
                  (emailAccounts.length < 2 ? '<div class="pk"><div class="k">No other accounts use this email.</div></div>' : ''))}</span></div>
              <div class="kv"><div class="k">Location</div><div class="v">${esc(c.location)}</div>
                <span class="anchor in">${trigger('loc', 'View more')}${popover('loc', 'Location details', rows([
                  ['Registration country', c.registrationCountry], ['Phone country', c.phoneCountry], ['ID country', c.idCountry], ['Last login location', c.lastLogin]]))}</span></div>
            </div>
            <div>
              <div class="kv"><div class="k">Name</div><div class="v">${esc(c.name)}</div></div>
              <div class="kv"><div class="k">User ID</div><div class="v">${c.id}</div></div>
              ${sel('manage-type', 'Select manage type', c.manageType, options.manageTypes, 'manageType')}
              ${sel('managed-by', 'Managed by', c.managedBy, options.managers, 'managedBy')}
            </div>
          </div>
        </div>
        <div class="notif"><h3 class="h3">Notifications <span class="tip" tabindex="0" role="img" aria-label="Risk and trust alerts that need review">?<span class="tipbox">Risk and trust alerts that need review.</span></span></h3>
          <div class="notes">${active.length ? active.map((n) => `<div class="note">${esc(n.text)} <button class="lnk">Action</button></div>`).join('') : '<div class="note k">No active notifications.</div>'}</div>
          <span class="anchor in">${trigger('notifs', 'View all')}${popover('notifs', 'Notifications', nlist(notifications.map((n) => n.text)), { right: true, wide: true })}</span>
        </div>
      </div>
      <div class="r2">
        <div class="grp"><h3 class="h3">Escalations</h3><div class="bds">${c.escalations.map((b) => `<span class="bdg red">${esc(b)}</span>`).join('')}
          <span class="anchor in">${trigger('badge', 'Add Badge...', 'bdg add')}${popover('badge', 'Add escalation badge',
            remaining.length ? remaining.map((b) => `<button class="opt" data-act="addbadge" data-label="${esc(b)}">${esc(b)}</button>`).join('') : '<div class="pk"><div class="k">All badges already added.</div></div>', { foot: CLOSE_BTN })}</span></div></div>
        <div class="grp"><h3 class="h3">Product features</h3><div class="bds">${c.productFeatures.map((p) => `<span class="bdg ${p.tone}">${esc(p.label)}</span>`).join('')}</div></div>
      </div>
      <div class="r3">
        <div><div class="k">Description</div><div class="v pre">${esc(c.description)}</div>
          <span class="anchor in">${trigger('desc', 'Edit Description')}${popover('desc', 'Edit description',
            `<label class="k" for="desc-ta">Description (${MAX_DESC} characters max)</label>
             <textarea id="desc-ta" class="ta" rows="8" maxlength="${MAX_DESC}">${esc(S.draft)}</textarea>
             <div class="popft"><span id="desc-count">${S.draft.length} / ${MAX_DESC}</span></div>`, { foot: '<button class="pbtn lg" data-act="close">Cancel</button><button class="pbtn pri lg" data-act="savedesc">Save</button>' })}</span></div>
        <div>
          <div class="sec"><div class="k">Education</div>${c.education.map((e) => `<div class="v">• ${esc(e)}</div>`).join('')}</div>
          <div class="sec"><div class="k">Skills Tests</div><span class="anchor in">${trigger('tests', `View skill tests (${tests.length})`)}${popover('tests', `Skill tests (${tests.length})`, rows(tests.map((t) => [t.status, t.name])))}</span></div>
          <div class="sec"><div class="k">Occupation</div><div class="v">${esc(c.occupation)}</div></div>
        </div>
        <div>
          <div class="sec"><div class="k">Fiverr Learn</div>${courses.slice(0, 2).map((x) => `<div class="v">• ${esc(x.name)}<br>Started ${esc(x.started)} (${esc(x.state)})</div>`).join('')}
            <span class="anchor in">${trigger('courses', `View all courses (${courses.length})`)}${popover('courses', `Fiverr Learn courses (${courses.length})`, rows(courses.map((x) => [`Started ${x.started} · ${x.state}`, x.name])))}</span></div>
          <div class="sec"><div class="k">Registration source</div><div class="v">Source: ${esc(c.registration.source)}</div><div class="v">Medium: ${esc(c.registration.medium)}</div></div>
          <div class="sec"><div class="k">Website</div><span class="lnk static">${esc(c.website)}</span></div>
        </div>
        <div>
          <div class="sec"><label class="k" for="loc-sel">Location</label>
            <select id="loc-sel" class="sel" data-field="location">${options.locations.map((l) => `<option${l === c.location ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
          <div class="sec"><div class="k">Registration country</div><div class="v">${esc(c.registrationCountry)}</div></div>
          <div class="sec"><div class="k">Location changes</div>
            ${locationHistory.slice(0, 2).map((h) => `<div class="log"><small>${fmt(h.at)}</small><div class="v">${esc(h.text)}</div></div>`).join('')}
            <span class="anchor in">${trigger('locHist', 'View more')}${popover('locHist', 'Location change history',
              `<div class="scroll">${rows(locationHistory.map((h) => [fmt(h.at), h.text]))}</div>`, { right: true })}</span></div>
        </div>
      </div>`;
    return cardShell('overview', 'Customer overview', summary, body);
  }

  function chart(data) {
    const s = data.series;
    const oMax = nice(Math.max(...s.map((x) => x.orders), ...s.map((x) => x.cancellations)), [5, 10, 20, 50, 100]);
    const rMax = nice(Math.max(...s.map((x) => x.revenue)), [1000, 2000, 5000, 10000, 20000, 50000]);
    const grid = [0, 1, 2, 3, 4, 5].map((k) => `<div class="gl${k === 5 ? ' base' : ''}" style="top:${k * 20}%">
        <span class="l">${(oMax * (5 - k)) / 5}</span><span class="rr">${axisMoney((rMax * (5 - k)) / 5)}</span></div>`).join('');
    const x = (i) => (i + 0.5) * 20;
    const poly = (key, max) => s.map((p, i) => `${x(i)},${100 - (p[key] / max) * 100}`).join(' ');
    const cols = s.map((p) => {
      const rv = (p.revenue / rMax) * 100, cv = (p.cancellations / oMax) * 100;
      const below = rv > 68;
      const tipStyle = below ? `top:calc(${100 - rv}% + 18px)` : `bottom:calc(${rv}% + 20px)`;
      const tip = `<div class="ctip${below ? ' below' : ''}" style="${tipStyle}"><div class="tc"><b>${longDay(p.date)}</b>${p.orders} order${p.orders === 1 ? '' : 's'}<br>${money(p.revenue)} revenue${p.cancellations ? `<br>${p.cancellations} cancelled` : ''}</div><span class="ar"></span></div>`;
      return `<div class="col" tabindex="0" aria-label="${fmt(p.date)}: ${p.orders} orders, ${money(p.revenue)} revenue, ${p.cancellations} cancelled">
        <div class="bar" style="height:${(p.orders / oMax) * 100}%"></div>
        <span class="pt can" style="bottom:${cv}%"></span><span class="pt rev" style="bottom:${rv}%"></span>
        <span class="xl"><span class="lg">${fmt(p.date)}</span><span class="sm">${d(p.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></span>${tip}</div>`;
    }).join('');
    return `<div class="chart"><div class="plot">${grid}
      <svg class="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="${poly('cancellations', oMax)}" fill="none" stroke="#b5b6ba" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
        <polyline points="${poly('revenue', rMax)}" fill="none" stroke="#fc832b" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="cols">${cols}</div><span class="axt l">Orders</span><span class="axt r">Revenue</span></div>
      <div class="legend"><div><span class="sw"></span>Orders</div><div><span class="swl" style="background:#fc832b"></span>Revenue</div><div><span class="swl" style="background:#b5b6ba"></span>Cancellations</div></div></div>`;
  }

  function ordersOverview() {
    const o = S.db.ordersOverview && S.db.ordersOverview[S.tab];
    if (!o) return cardShell('orders-overview', 'Orders overview', '<span class="grow"></span>', '<div class="oo"><p class="k">Orders data is missing. The server is an older version: stop it (Ctrl+C in its Terminal window) and start it again.</p></div>');
    const summary = `<span class="sum">${o.inProgress} in progress · ${o.completed} completed · ${o.cancelled} cancelled</span><span class="grow"></span>`;
    const body = `<div class="oo">
      <div class="tabs" role="tablist" aria-label="Role">${['seller', 'buyer'].map((t) => `<button class="tab${S.tab === t ? ' on' : ''}" role="tab" aria-selected="${S.tab === t}" data-act="tab" data-id="${t}">${t === 'seller' ? 'Seller' : 'Buyer'}</button>`).join('')}</div>
      <div class="occard"><div class="otop">
        <div><div class="otitle">Orders &amp; revenue</div><div class="osub">${esc(o.range)}</div></div>
        <div class="stats"><div class="stat"><b>${o.inProgress}</b><span>In progress</span></div><div class="stat"><b>${o.completed}</b><span>Completed</span></div><div class="stat"><b>${o.cancelled}</b><span>Cancelled</span></div></div>
      </div>${chart(o)}</div></div>`;
    return cardShell('orders-overview', 'Orders overview', summary, body);
  }


  const money2 = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  const EXT = '<svg class="ext" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5H3a1 1 0 0 0-1 1V9a1 1 0 0 0 1 1h5.5a1 1 0 0 0 1-1V7M7 2h3v3M10 2L5.5 6.5"/></svg>';
  const qa = (text, msg, ext) => `<button class="lnk al" data-act="toast" data-msg="${esc(msg || text)}">${esc(text)}${ext ? ' ' + EXT : ''}</button>`;
  const kb = (val, label, extra) => `<div class="kb"><b>${val}</b><span class="kl">${label}${extra || ''}</span></div>`;
  const kvp = (k, v) => `<div class="kv"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`;
  const logs = (arr) => `<div class="logs">${arr.join('')}</div>`;
  const logi = (at, html) => `<div class="logi"><small>${esc(at)}</small><div>${html}</div></div>`;

  function financial() {
    const f = S.db.financial, c = S.db.customer;
    const b = f.balances, e = f.earning, r = f.revenue;
    const summary = `<span class="sum">${money2(b.fiverrMoney)} Fiverr Money · ${money2(r.readyToWithdraw)} ready to withdraw</span>`;
    const tipEarn = `<span class="tip" tabindex="0" role="img" aria-label="Earnings from completed orders">?<span class="tipbox">Earnings from completed orders, net of fees.</span></span>`;
    const body = `
      <div class="fin-top">
        <div class="fg g1"><div class="k">Balances</div><div class="fgrid cb">
          ${kb(money2(b.fiverrMoney), 'Fiverr Money')}${kb(money2(b.credits), 'Fiverr Credits')}${kb(money2(b.holds), 'Fiverr Holds')}
          <div class="kb"><span class="anchor in">${trigger('breakdown', 'View balances breakdown')}${popover('breakdown', 'Balances breakdown', rows(f.breakdown.map((x) => [x.label, money2(x.amount)])))}</span></div>
        </div></div>
        <div class="fg g2"><div class="k">Earning vs. Spending</div><div class="fgrid c1">
          ${kb(money2(e.earnings), 'Earnings', tipEarn)}${kb(money2(e.spending), 'Spending')}${kb(money2(e.debt), 'Debt')}
        </div></div>
        <div class="fg g3"><div class="k">Revenue</div><div class="fgrid cr">
          ${kb(money2(r.upcoming), 'Upcoming gains')}${kb(money2(r.awaitingClearance), 'Awaiting clearance')}${kb(money2(r.withdrawn), 'Withdrawn')}
          ${kb(money2(r.readyToWithdraw), 'Ready to withdraw')}${kb(money2(r.usedForPurchases), 'Used for purchases')}
        </div></div>
      </div>
      <div class="fin-cols">
        <div>
          <h3 class="h3 s16">Payoneer</h3>
          ${kvp('Application Type', esc(f.payoneer.type))}
          ${kvp('Application Status', esc(f.payoneer.status) + '<br>Payee ID: <span class="lnk static lk">' + esc(f.payoneer.payeeId) + '</span>')}
          <h3 class="h3 s16 mt">Paypal</h3>
          ${kvp('Paypal Email', esc(f.paypal.email))}
          <span class="anchor in">${trigger('ppHist', 'View history')}${popover('ppHist', 'Paypal history', rows(f.paypal.history.map((h) => [h.at, h.text])))}</span>
        </div>
        <div>
          <h3 class="h3 s16">Billing information</h3>
          ${kvp('Full name/Business name', esc(f.billing.name))}${kvp('Company name', esc(f.billing.company))}${kvp('Full address', esc(f.billing.address))}${kvp('Tax info', esc(f.billing.tax))}${kvp('Has billing agreement?', esc(f.billing.agreement))}
        </div>
        <div>
          <h3 class="h3 s16">W9 Check</h3>
          ${kvp('Citizenship', esc(f.w9.citizenship))}${kvp('Verifications status', esc(f.w9.status))}${kvp('Tipalti payee ID', esc(f.w9.tipalti))}
        </div>
        <div>
          <h3 class="h3 s16">Financial actions</h3>
          <div class="links">${qa('Tokens', 'Opened Tokens', true)}${qa('Transactions', 'Opened Transactions', true)}${qa('Payoneer', 'Opened Payoneer', true)}${qa('Internal transfer', 'Opened Internal transfer', true)}${qa('Refund existing balance', 'Refund flow would start here')}</div>
          <h3 class="h3 s16 mt2">Refunds</h3>
          ${logs(f.refunds.slice(0, 2).map((x) => logi(x.at, money2(x.amount))))}
          <span class="anchor in">${trigger('refunds', 'View all refunds')}${popover('refunds', 'Refunds', rows(f.refunds.map((x) => [x.at, money2(x.amount)])), { right: true })}</span>
        </div>
      </div>`;
    return cardShell('financial-overview', 'Financial overview', summary, body);
  }

  const ICONS = {
    behance: ['#1769ff', 'Bē'], dribbble: ['#ea4c89', '◔'], facebook: ['#3b5998', 'f'], twitter: ['#1da1f2', 't']
  };
  const idIcon = (id) => { const i = ICONS[id] || ['#7a7d85', '?']; return `<span class="sid" style="background:${i[0]}" aria-hidden="true">${i[1]}</span>`; };

  function accountSecurity() {
    const sc = S.db.security, c = S.db.customer, ph = sc.phone, idv = sc.idVerification;
    const summary = `<span class="sum">${esc(c.status)} · 2FA ${sc.twoFA ? 'enabled' : 'disabled'} · Withdrawals ${sc.withdrawalsBlocked ? 'blocked' : 'allowed'}</span>`;
    const phoneBlock = (title, x) => `<div class="kv"><div class="k">${title}</div><div class="v">Time: ${esc(x.time)}<br>Method / Country: ${esc(x.method)} / ${esc(x.country)}<br>Number: ${esc(x.number)}<br>Score: ${esc(x.score)}</div></div>`;
    const apiLink = (text, action, msg) => `<button class="lnk al" data-act="api" data-a="${action}" data-msg="${esc(msg)}">${esc(text)}</button>`;
    const body = `
      <div class="sec4">
        <div>
          <h3 class="h3 s16">Login history</h3>
          ${logs(sc.logins.slice(0, 2).map((l) => logi(l.at, `IP Address: ${esc(l.ip)}<br>Country: ${esc(l.country)}`)))}
          <span class="anchor in lgl">${trigger('logins', 'View all logins')}${popover('logins', 'Login history', logs(sc.logins.map((l) => logi(l.at, `${esc(l.ip)} · ${esc(l.country)}`))))}</span>
          <h3 class="h3 s16 mt3">User identities</h3>
          <div class="ids">${sc.identities.length ? sc.identities.map((i) => `<div class="idr">${idIcon(i.id)}<div>${esc(i.name)} (id:${esc(i.ref)})<br><button class="lnk" data-act="delid" data-id="${esc(i.id)}" aria-label="Delete ${esc(i.name)} identity">Delete</button></div></div>`).join('') : '<div class="k">No linked identities.</div>'}</div>
        </div>
        <div>
          <h3 class="h3 s16 h0">Password history</h3>
          <span class="anchor in">${trigger('pwHist', 'View password history')}${popover('pwHist', 'Password history', rows(sc.passwordHistory.map((h) => [h.at, h.text])))}</span>
          <h3 class="h3 s16 mt">Security question</h3>
          <div class="links">${qa('Reset security question', 'Security question reset link sent')}
          <span class="anchor in">${trigger('secQs', 'View security questions')}${popover('secQs', 'Security questions', rows(sc.questions.map((q) => [`Set ${q.set}`, q.q])))}</span></div>
          <h3 class="h3 s16 mt">ID verification</h3>
          <div class="links">${qa('Initiate ID verification', 'ID verification initiated')}</div>
          <div class="kv mt4"><div class="k">Verification</div><div class="v">Status: ${esc(idv.status)}<br>Initiation time: ${esc(idv.initiated)}<br>Expiration time: ${esc(idv.expires)}<br>Number of attempts: ${idv.attempts}</div></div>
          ${kvp('Document details', esc(idv.document))}${kvp('Name', esc(idv.name))}${kvp('Reason', esc(idv.reason))}
          ${qa('View ID verification details', 'Opened ID verification details', true)}
        </div>
        <div>
          <h3 class="h3 s16">Phone verification</h3>
          ${kvp('Status', esc(ph.status))}${phoneBlock('Last successful verification', ph.lastSuccess)}${phoneBlock('Last failed verification', ph.lastFailed)}
          <span class="anchor in">${trigger('phHist', 'View phone verification history')}${popover('phHist', 'Phone verification history', rows(ph.history.map((h) => [h.at, h.text])))}</span>
          <div class="k mt4">Phone actions</div>
          <div class="links">${qa('Reset verificaiton counters', 'Verification counters reset')}${qa('Allow actions for 24 hours', 'Actions allowed for 24 hours')}${qa('Delete phone verification', 'Phone verification deleted')}${qa('Verify phone', 'Phone marked as verified')}</div>
        </div>
        <div>
          <h3 class="h3 s16">Account actions</h3>
          <div class="links">
            ${c.status === 'Active' ? apiLink('Block', 'block', 'Account blocked') + apiLink('Restrict', 'restrict', 'Account restricted') + apiLink('Restrict & block', 'restrictBlock', 'Account restricted and blocked') : apiLink('Reinstate account', 'reinstate', 'Account reinstated')}
            <div class="al k2">Withdrawals ${sc.withdrawalsBlocked ? 'blocked' : 'allowed'} | ${apiLink(sc.withdrawalsBlocked ? 'Unblock' : 'Block', 'toggleWithdrawals', sc.withdrawalsBlocked ? 'Withdrawals unblocked' : 'Withdrawals blocked')}</div>
            ${qa('Reload all user counts', 'Reloading all user counts')}${qa('Reindex user', 'Reindex queued')}${qa('Recalculate user response time', 'Recalculating response time')}${qa('Rebuild user todos (last 30 days)', 'Rebuilding user todos')}${qa('Remove push notification', 'Push notification removed')}${qa('Mark user as spammer', 'User marked as spammer')}${qa('Unspam User (Spam at gate)', 'User unspammed')}
            <div class="al k2">2FA ${sc.twoFA ? 'enabled' : 'disabled'} | ${apiLink(sc.twoFA ? 'Disable' : 'Enable', 'toggle2fa', sc.twoFA ? '2FA disabled' : '2FA enabled')}</div>
          </div>
        </div>
      </div>`;
    return cardShell('account-security', 'Account & Security', summary, body);
  }


  const STAR = '<svg class="star" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l1.9 3.9 4.3.6-3.1 3 .7 4.3L7 10.8 3.2 12.8l.7-4.3-3.1-3 4.3-.6z" fill="#ffb33e"/></svg>';
  const rating = (r, label) => kvp(label, `${STAR} <b class="rt">${r.score.toFixed(1)}</b> <span class="rv">(${r.reviews} reviews)</span>`);
  const QUALITY_OPTS = ['High Quality', 'Medium Quality', 'Low Quality', 'Not rated'];
  const LEVELS = ['New Seller', 'Level 1', 'Level 2', 'Top Rated Seller'];

  function quality() {
    const q = S.db.quality;
    const summary = `<span class="sum">${esc(q.bucket)} · ${esc(q.suggested)} · ${esc(q.level)}</span>`;
    const lvl = q.level;
    const body = `
      <div class="sec4">
        <div>
          <h3 class="h3 s16">Quality bucket</h3>
          <div class="qb" aria-label="Quality bucket ${esc(q.bucket)}">${esc(q.bucket)}</div>
          <div class="qs">Quality/trust score</div>
          <div class="kv mt4"><label class="k" for="q-sel">Suggested seller quality</label>
            <select id="q-sel" class="sel" data-q="1">${QUALITY_OPTS.map((o) => `<option${o === q.suggested ? ' selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="k qn">${esc(q.changedNote)}</div>
        </div>
        <div>
          <h3 class="h3 s16 h0">Inbox blocking activity</h3>
          ${kvp('This user blocked', `${q.blocked} times | <span class="anchor in">${trigger('blockedHist', 'View history')}${popover('blockedHist', 'Users blocked by this user', rows(q.blockedHistory.map((h) => [h.at, h.text])))}</span>`)}
          ${kvp('This user was blocked', `${q.blockedBy} times | <span class="anchor in">${trigger('blockedByHist', 'View history')}${popover('blockedByHist', 'Blocks on this user', rows(q.blockedByHistory.map((h) => [h.at, h.text])))}</span>`)}
          <h3 class="h3 s16 mt">Reports</h3>
          ${kvp('Reported by User', `Messages: ${q.reportedBy.messages}<br>Gigs: ${q.reportedBy.gigs}`)}
          ${kvp('Reported on User', `Messages: ${q.reportedOn.messages} (${q.reportedOn.accuracy}% accuracy)<br>Gigs: ${q.reportedOn.gigs}`)}
        </div>
        <div>
          <h3 class="h3 s16 h0">Seller Rating</h3>
          ${rating(q.sellerPublic, 'Public Seller Rating')}${rating(q.sellerPrivate, 'Private Seller Rating')}
          <h3 class="h3 s16 mt">Buyer Rating</h3>
          ${rating(q.buyerPublic, 'Public Buyer Rating')}
        </div>
        <div>
          <h3 class="h3 s16 h0">Levels</h3>
          ${kvp('Current Level', `<span class="qlvl"><span class="qdot" aria-hidden="true"></span>${esc(lvl)}</span> | <span class="anchor in">${trigger('level', 'Change level')}${popover('level', 'Change level', LEVELS.map((l) => `<button class="opt" data-act="level" data-v="${l}"${l === lvl ? ' aria-current="true"' : ''}>${l}${l === lvl ? ' (current)' : ''}</button>`).join(''))}</span>`)}
          <div class="v">Evaluation period ends on<br>${esc(q.levelEnds)}</div>
        </div>
      </div>`;
    return cardShell('quality', 'Quality', summary, body);
  }

  const GFILTERS = ['Active gigs', 'All gigs', 'Approved', 'Pending', 'Deleted', 'Soft denied'];
  function gigs() {
    const all = S.db.gigs, F = S.gigFilter;
    const n = (st) => all.filter((g) => g.status === st).length;
    const list = all.filter((g) => (F === 'Active gigs' ? g.active : F === 'All gigs' ? true : g.status === F));
    const summary = `<span class="sum">${all.length} gigs · ${n('Approved')} approved · ${n('Pending')} pending</span>`;
    const stat = (v, l) => `<div class="gs"><b>${v}</b><button class="lnk" data-act="gfilter" data-v="${l === 'Soft denied' ? 'Soft denied' : l}">${l}</button></div>`;
    const tip = `<span class="tip" tabindex="0" role="img" aria-label="Date the gig was first published">?<span class="tipbox">Date the gig was first published.</span></span>`;
    const row = (g) => `<div class="grow-r" role="row">
      <div class="gc g1" role="cell"><img class="gimg" src="assets/gig-${g.image}.jpg" alt="" width="88" height="64"><div class="gtx"><div class="gt">${esc(g.title)}</div>
        <div class="gb">${g.pro ? '<span class="gbd dark">PRO</span>' : ''}${g.notPromoted ? '<span class="gbd warm">Pg Not Promoted</span>' : ''}</div>
        ${qa('ID: ' + g.id, 'Opened gig ' + g.id)}</div></div>
      <div class="gc g2" role="cell">${g.rating ? g.rating + '%' : '-'}</div>
      <div class="gc" role="cell">${esc(g.category)}</div>
      <div class="gc" role="cell">${esc(g.status)}</div>
      <div class="gc" role="cell">${g.prices.map(esc).join('<br>')}</div>
      <div class="gc" role="cell">${g.published ? esc(g.published) : '-'}</div>
      <div class="gc" role="cell">${esc(g.updated)}</div></div>`;
    const body = `
      <div class="gtop">
        <div class="gleft"><h3 class="h3 s16 h0">Gigs overview</h3>
          <div class="gstats">${stat(n('Approved'), 'Approved')}${stat(n('Deleted'), 'Deleted')}${stat(n('Soft denied'), 'Soft denied')}${stat(n('Pending'), 'Pending')}</div></div>
        <label class="filt"><span class="fl">Filter by: <b>${esc(F)}</b></span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5l5 5 5-5"/></svg>
          <select data-gfilter="1" aria-label="Filter gigs">${GFILTERS.map((o) => `<option${o === F ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
      </div>
      <div class="gscroll"><div class="gtable" role="table" aria-label="Gigs">
        <div class="ghead" role="row"><div class="gc g1" role="columnheader">Gig title</div><div class="gc g2" role="columnheader">Rating</div><div class="gc" role="columnheader">Category</div><div class="gc" role="columnheader">Status</div><div class="gc" role="columnheader">Prices</div><div class="gc" role="columnheader"><span class="hq">Published ${tip}</span></div><div class="gc" role="columnheader">Last updated</div></div>
        ${list.length ? list.map(row).join('') : '<div class="gempty">No gigs match this filter.</div>'}
      </div></div>`;
    return cardShell('gigs', 'Gigs', summary, body);
  }

  const BUILDERS = { overview, 'financial-overview': financial, 'orders-overview': ordersOverview, 'account-security': accountSecurity, quality, gigs };
  function view() {
    POPS = [];
    const secs = NAV.map(([id]) => BUILDERS[id]()).join('');
    const nav = (cls) => NAV.map(([id, l]) => `<a class="${cls(id)}" href="#${id}" data-act="nav" data-id="${id}">${esc(l)}</a>`).join('');
    return `
    <header class="top"><div class="topin"><div class="brand"><img src="assets/fi-logo.svg" alt="">Customer View</div>
      <button class="iconbtn" aria-label="Search"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L18 18"/></svg></button>
      <nav class="menu" aria-label="Main">${MENU.map((m) => `<button class="mi">${m}</button>`).join('')}</nav>
      <button class="logout">Log Out</button></div></header>
    <div class="shell"><aside class="side" aria-label="Sections">${nav((id) => (S.active === id ? 'on' : ''))}</aside>
      <main class="main"><nav class="chips" aria-label="Sections">${nav((id) => (S.active === id ? 'chip on' : 'chip'))}</nav><div class="smask" aria-hidden="true"></div>
        ${secs}
      </main></div>${POPS.join('')}`;
  }

  function render() {
    const root = document.getElementById('root');
    if (!S.db) { root.innerHTML = '<div style="padding:48px">Loading…</div>'; return; }
    root.innerHTML = view();
    document.body.classList.toggle('modal-open', !!S.open);
    stuck();
  }
  function afterOpenClose(prevOpen) {
    if (S.open && S.open !== prevOpen) {
      const p = document.querySelector('[data-pop="' + S.open + '"]');
      const t = p && (p.querySelector('textarea') || p.querySelector('.x'));
      if (t) { t.focus({ preventScroll: true }); if (t.tagName === 'TEXTAREA') t.setSelectionRange(t.value.length, t.value.length); }
    } else if (!S.open && prevOpen) {
      const t = document.querySelector('[data-trigger="' + prevOpen + '"]');
      if (t) t.focus({ preventScroll: true });
    }
  }
  function setOpen(id) {
    const prev = S.open;
    S.open = id;
    if (id === 'desc') S.draft = S.db.customer.description;
    render();
    afterOpenClose(prev);
  }

  // Collapse/expand: 400ms ease-out height + fade, with the header pinned in the viewport so the page never jumps.
  function toggleSection(id) {
    if (S.open) { S.open = null; render(); }
    const card = document.getElementById(id);
    const hdr = card.querySelector('.hdr');
    const before = hdr.getBoundingClientRect().top;
    const nowClosed = !S.collapsed[id];
    S.collapsed[id] = nowClosed; saveCollapsed();
    card.classList.add('anim');
    void card.offsetWidth;
    card.classList.toggle('closed', nowClosed);
    hdr.setAttribute('aria-expanded', String(!nowClosed));
    const t0 = performance.now();
    const keep = () => {
      const dlt = hdr.getBoundingClientRect().top - before;
      if (Math.abs(dlt) > 0.5) window.scrollBy(0, dlt);
      if (performance.now() - t0 < 460) requestAnimationFrame(keep); else card.classList.remove('anim');
    };
    requestAnimationFrame(keep);
  }

  // Anchor links: open the target section, then align its top with the top of the first nav link.
  let spyLock = false, lockTimer;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function goTo(id, instant) {
    S.active = id; S.open = null;
    if (S.collapsed[id]) { S.collapsed[id] = false; saveCollapsed(); }
    render();
    spyLock = true; clearTimeout(lockTimer); lockTimer = setTimeout(() => { spyLock = false; }, 1200);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: instant || reduce() ? 'auto' : 'smooth', block: 'start' });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
  }
  function spy() {
    if (spyLock || !S.db) return;
    const align = parseFloat(getComputedStyle(document.querySelector('.card') || document.body).scrollMarginTop) || 130;
    const cards = Array.from(document.querySelectorAll('main .card'));
    let cur = cards[0];
    cards.forEach((c) => { if (c.getBoundingClientRect().top <= align + 8) cur = c; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = cards[cards.length - 1];
    if (cur && S.active !== cur.id) {
      S.active = cur.id;
      document.querySelectorAll('.side a,.chips a').forEach((a) => {
        const on = a.dataset.id === cur.id;
        a.classList.toggle('on', on);
      });
    }
  }
  let ticking = false;
  function stuck() {
    const align = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--align')) || 130;
    const w = window.innerWidth <= 1023 ? 150 : align;
    document.querySelectorAll('main .card').forEach((c) => {
      const h = c.querySelector('.hdr');
      if (!h) return;
      const ct = c.getBoundingClientRect().top;
      const on = ct < w - 1 && Math.abs(h.getBoundingClientRect().top - w) <= 1;
      h.classList.toggle('stuck', on);
      // Clip everything of the card that sits above the pinned header (borders, shadow, content), regardless of rounding.
      c.style.clipPath = on ? `inset(${(w - ct).toFixed(2)}px 0 -24px 0 round 16px 16px 0 0)` : '';
    });
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; spy(); stuck(); }); } }, { passive: true });
  window.addEventListener('resize', stuck);

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'nav') { e.preventDefault(); return goTo(el.dataset.id); }
    if (act === 'toggle') return setOpen(S.open === el.dataset.id ? null : el.dataset.id);
    if (act === 'close') return setOpen(null);
    if (act === 'section') return toggleSection(el.dataset.id || 'overview');
    if (act === 'tab') { S.tab = el.dataset.id; render(); const t = document.querySelector('.tab.on'); if (t) t.focus({ preventScroll: true }); return; }
    if (act === 'toast') { toast(el.dataset.msg, { kind: 'info' }); return; }
    if (act === 'api') {
      const prev = { status: S.db.customer.status, withdrawalsBlocked: S.db.security.withdrawalsBlocked, twoFA: S.db.security.twoFA };
      mutate(() => api('POST', '/api/actions', { action: el.dataset.a }), el.dataset.msg, () => api('POST', '/api/restore', prev)); return;
    }
    if (act === 'delid') {
      const ident = S.db.security.identities.find((i) => i.id === el.dataset.id);
      mutate(() => api('DELETE', '/api/identities/' + encodeURIComponent(el.dataset.id)), 'Identity removed', () => api('POST', '/api/identities', { identity: ident })); return;
    }
    if (act === 'addbadge') { S.open = null; const l = el.dataset.label; mutate(() => api('POST', '/api/escalations', { label: l }), 'Badge added', () => api('DELETE', '/api/escalations/' + encodeURIComponent(l))); return; }
    if (act === 'savedesc') { S.open = null; const prev = S.db.customer.description; mutate(() => api('PATCH', '/api/customer', { description: S.draft }), 'Description saved', () => api('PATCH', '/api/customer', { description: prev })); return; }
    if (act === 'level') { S.open = null; const prev = S.db.quality.level, v = el.dataset.v; mutate(() => api('PATCH', '/api/quality', { level: v }), `Level changed to ${v}`, () => api('PATCH', '/api/quality', { level: prev })); return; }
    if (act === 'gfilter') { S.gigFilter = el.dataset.v; render(); return; }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'desc-ta') {
      S.draft = e.target.value;
      const n = document.getElementById('desc-count');
      if (n) n.textContent = S.draft.length + ' / ' + MAX_DESC;
    }
  });
  document.addEventListener('change', (e) => {
    const d = e.target.dataset || {};
    if (d.field) {
      const f = d.field, prev = S.db.customer[f], v = e.target.value;
      mutate(() => api('PATCH', '/api/customer', { [f]: v }), f === 'location' ? 'Location updated and logged in history' : 'Saved', () => api('PATCH', '/api/customer', { [f]: prev }));
    } else if (d.q) {
      const prev = { suggested: S.db.quality.suggested, note: S.db.quality.changedNote }, v = e.target.value;
      mutate(() => api('PATCH', '/api/quality', { suggested: v }), 'Suggested seller quality updated', () => api('PATCH', '/api/quality', prev));
    } else if (d.gfilter !== undefined) { S.gigFilter = e.target.value; render(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.open) setOpen(null); });

  render();
  api('GET', '/api/customer').then((db) => {
    S.db = db; render();
    const h = location.hash.slice(1);
    if (h && NAV.some(([id]) => id === h)) goTo(h, true); else spy();
  }).catch((err) => {
    console.error(err);
    document.getElementById('root').innerHTML = '<div style="padding:48px">Something went wrong: ' + esc(err && err.message || err) + '<br>If the server is not running, start it with <code>node server.js</code>.</div>';
  });
})();
