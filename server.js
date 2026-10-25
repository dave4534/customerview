// Customer View: zero-dependency Node server (Node 18+). Run: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'data', 'db.json');

const SEED = {
  customer: {
    id: 2484834,
    username: 'TranslationStation',
    name: 'Jill Seller',
    status: 'Active',
    joined: '2018-01-15',
    email: 'user@email.com',
    bio: 'We will take any format at any length and translate it to your satisfaction.',
    rating: 4.8,
    reviews: 15,
    level: 'LEVEL TWO',
    userType: 'RNC',
    qualityBucket: 'A+',
    manageType: '',
    managedBy: '',
    location: 'Tel Aviv, Israel',
    registrationCountry: 'Israel',
    phoneCountry: 'Greenland',
    idCountry: 'Israel',
    lastLogin: 'Tel Aviv, Israel',
    description: 'Hi, I\'m Talha. leading "The Workholics" agency, a full-service social media marketing/managing company. We are with 5+ years\' experience in content, marketing, social media management. We have spent the last 5years in creating award-winning content and profitable digital growth strategies for media.',
    education: ['Bfa in computer arts from Fashion institute of technology', 'Masters in Business from Boston University'],
    occupation: 'Social media expert',
    registration: { source: 'Affiliate source', medium: 'Value' },
    website: 'www.website.com',
    escalations: ['Security Issue', 'Suspicious Activity'],
    productFeatures: [{ label: 'PRO (Logo Design)', tone: 'dark' }, { label: 'PRO Demoted', tone: 'orange' }]
  },
  notifications: [
    { id: 1, status: 'Active', text: 'Customer has X active warnings.' },
    { id: 2, status: 'Active', text: 'Customer has X clones.' },
    { id: 3, status: 'Active', text: 'Location inconsistency: Customer phone country is different from registration country.' },
    { id: 4, status: 'Active', text: 'Location inconsistency: Customer ID country is different from phone country.' },
    { id: 5, status: 'Resolved', text: 'Email address changed twice in 30 days.' },
    { id: 6, status: 'Resolved', text: 'Login from a new country (Turkey).' }
  ],
  emailAccounts: [{ username: 'TranslationStation', status: 'Active', joined: 'Jan 15, 2018', self: true }],
  courses: [
    { name: 'Logo Design Course', started: 'Jan 20, 2021', state: 'In progress' },
    { name: 'Animation Course', started: 'Jan 20, 2021', state: 'Completed' },
    { name: 'Brand Identity Basics', started: 'Mar 2, 2021', state: 'Completed' },
    { name: 'Freelance Pricing', started: 'Apr 11, 2021', state: 'Completed' }
  ],
  tests: [
    { name: 'English', status: 'Passed' },
    { name: 'Translation basics', status: 'Passed' },
    { name: 'Content writing', status: 'Passed' },
    { name: 'Proofreading', status: 'Passed' }
  ],
  locationHistory: [
    { at: '2020-01-13', text: 'Changed to Greenland by person@email.com' },
    { at: '2020-01-12', text: 'Changed to Israel by person@email.com' },
    { at: '2019-11-03', text: 'Changed to Turkey by person@email.com' },
    { at: '2018-01-15', text: 'Registered from Israel' }
  ],
  ordersOverview: {
    seller: {
      range: 'Last 90 days', inProgress: 3, completed: 8, cancelled: 0,
      series: [
        { date: '2021-06-01', orders: 6, revenue: 1310, cancellations: 1 },
        { date: '2021-06-15', orders: 10, revenue: 1640, cancellations: 0 },
        { date: '2021-07-01', orders: 3, revenue: 2854, cancellations: 1 },
        { date: '2021-07-15', orders: 7, revenue: 1290, cancellations: 0 },
        { date: '2021-08-01', orders: 4, revenue: 2530, cancellations: 1 }
      ]
    },
    buyer: {
      range: 'Last 90 days', inProgress: 1, completed: 5, cancelled: 1,
      series: [
        { date: '2021-06-01', orders: 2, revenue: 320, cancellations: 0 },
        { date: '2021-06-15', orders: 4, revenue: 700, cancellations: 1 },
        { date: '2021-07-01', orders: 1, revenue: 150, cancellations: 0 },
        { date: '2021-07-15', orders: 3, revenue: 540, cancellations: 0 },
        { date: '2021-08-01', orders: 2, revenue: 410, cancellations: 0 }
      ]
    }
  },
  financial: {
    balances: { fiverrMoney: 4232.02, credits: 271, holds: 425 },
    earning: { earnings: 2948.59, spending: 4536, debt: 233 },
    revenue: { upcoming: 6391, readyToWithdraw: 453, awaitingClearance: 2948.59, usedForPurchases: 2948.59, withdrawn: 5342.22 },
    breakdown: [
      { label: 'Fiverr Money', amount: 4232.02 }, { label: 'Fiverr Credits', amount: 271 }, { label: 'Fiverr Holds', amount: 425 },
      { label: 'Awaiting clearance', amount: 2948.59 }, { label: 'Ready to withdraw', amount: 453 }
    ],
    payoneer: { type: 'Local Bank Transfer', status: 'Activated', payeeId: 'john-1234' },
    paypal: { email: 'person@email.com', history: [
      { at: 'Mar 14, 2021 @ 08:12 GMT', text: 'Email changed to person@email.com' },
      { at: 'Feb 20, 2020 @ 10:43 GMT', text: 'PayPal account linked' }
    ] },
    billing: { name: 'N/A', company: 'N/A', address: 'null', tax: 'null', agreement: 'No.' },
    w9: { citizenship: 'non_us', status: 'Completed: The seller completed W-9 form succesfully', tipalti: 'Available when citizenship field is US' },
    refunds: [
      { at: 'Feb 20, 2020 @ 10:43 GMT', amount: 233 }, { at: 'Feb 20, 2020 @ 10:43 GMT', amount: 68 },
      { at: 'Jan 9, 2020 @ 16:02 GMT', amount: 120 }, { at: 'Dec 2, 2019 @ 09:15 GMT', amount: 45 }
    ]
  },
  quality: {
    bucket: 'C-', suggested: 'High Quality', changedNote: 'High quality | Changed by: Lisa Tauber 2019-04-18 11:34:48 +0000',
    blocked: 27, blockedBy: 32,
    blockedHistory: [{ at: 'Feb 20, 2020', text: 'Blocked by buyer_4412 after an unanswered inbox request' }, { at: 'Jan 8, 2020', text: 'Blocked by buyer_9021 (spam report)' }, { at: 'Nov 2, 2019', text: 'Blocked by buyer_1188' }],
    blockedByHistory: [{ at: 'Mar 3, 2020', text: 'Blocked seller_5530 (off-platform requests)' }, { at: 'Feb 11, 2020', text: 'Blocked seller_2201' }, { at: 'Dec 19, 2019', text: 'Blocked seller_7742 (spam)' }],
    reportedBy: { messages: 0, gigs: 0 }, reportedOn: { messages: 1, accuracy: 100, gigs: 0 },
    sellerPublic: { score: 4.8, reviews: 24 }, sellerPrivate: { score: 4.6, reviews: 4 }, buyerPublic: { score: 5.0, reviews: 23 },
    level: 'Level 2', levelEnds: 'Feb 15, 2021, 00:00 GMT'
  },
  gigs: [
    {
      "id": "72238210",
      "title": "I will translate your website content",
      "status": "Approved",
      "image": 1,
      "published": "Oct 12, 2021",
      "updated": "Nov 3, 2021",
      "rating": 98,
      "category": "Graphics & design > Illustration",
      "prices": [
        "Basic: $15",
        "Standard: $35",
        "Premium: $60"
      ],
      "pro": true,
      "notPromoted": true,
      "active": true
    },
    {
      "id": "72238211",
      "title": "I will create an instagram account",
      "status": "Approved",
      "image": 2,
      "published": "Oct 31, 2021",
      "updated": "Nov 2, 2021",
      "rating": 94,
      "category": "Graphics & design > Illustration",
      "prices": [
        "Basic: $25",
        "Standard: $55",
        "Premium: $130"
      ],
      "pro": true,
      "notPromoted": true,
      "active": true
    },
    {
      "id": "72238212",
      "title": "I will write a blog post for your website",
      "status": "Approved",
      "image": 3,
      "published": "Nov 4, 2021",
      "updated": "Nov 13, 2021",
      "rating": 97,
      "category": "Graphics & design > Illustration",
      "prices": [
        "Basic: $45",
        "Standard: $70",
        "Premium: $90"
      ],
      "pro": true,
      "notPromoted": true,
      "active": true
    },
    {
      "id": "72238213",
      "title": "I will proofread and edit your document",
      "status": "Approved",
      "image": 1,
      "published": "Sep 2, 2021",
      "updated": "Oct 20, 2021",
      "rating": 96,
      "category": "Graphics & design > Illustration",
      "prices": [
        "Basic: $10",
        "Standard: $25",
        "Premium: $40"
      ],
      "pro": false,
      "notPromoted": false,
      "active": false
    },
    {
      "id": "72238214",
      "title": "I will localize your app copy to Hebrew",
      "status": "Approved",
      "image": 2,
      "published": "Aug 18, 2021",
      "updated": "Oct 1, 2021",
      "rating": 95,
      "category": "Graphics & design > Illustration",
      "prices": [
        "Basic: $30",
        "Standard: $60",
        "Premium: $110"
      ],
      "pro": true,
      "notPromoted": false,
      "active": false
    },
    {
      "id": "72238215",
      "title": "I will write SEO product descriptions",
      "status": "Pending",
      "image": 3,
      "published": "",
      "updated": "Nov 15, 2021",
      "rating": 0,
      "category": "Writing & translation",
      "prices": [
        "Basic: $20",
        "Standard: $45",
        "Premium: $80"
      ],
      "pro": false,
      "notPromoted": false,
      "active": false
    },
    {
      "id": "72238216",
      "title": "I will transcribe your audio files",
      "status": "Pending",
      "image": 1,
      "published": "",
      "updated": "Nov 14, 2021",
      "rating": 0,
      "category": "Writing & translation",
      "prices": [
        "Basic: $12",
        "Standard: $30",
        "Premium: $55"
      ],
      "pro": false,
      "notPromoted": false,
      "active": false
    },
    {
      "id": "72238217",
      "title": "I will translate your legal documents",
      "status": "Pending",
      "image": 2,
      "published": "",
      "updated": "Nov 12, 2021",
      "rating": 0,
      "category": "Writing & translation",
      "prices": [
        "Basic: $40",
        "Standard: $90",
        "Premium: $150"
      ],
      "pro": false,
      "notPromoted": false,
      "active": false
    },
    {
      "id": "72238218",
      "title": "I will manage your social media posts",
      "status": "Deleted",
      "image": 3,
      "published": "Jun 4, 2021",
      "updated": "Aug 9, 2021",
      "rating": 88,
      "category": "Writing & translation",
      "prices": [
        "Basic: $50",
        "Standard: $100",
        "Premium: $180"
      ],
      "pro": false,
      "notPromoted": false,
      "active": false
    },
    {
      "id": "72238219",
      "title": "I will design a simple logo",
      "status": "Deleted",
      "image": 1,
      "published": "May 11, 2021",
      "updated": "Jul 2, 2021",
      "rating": 90,
      "category": "Writing & translation",
      "prices": [
        "Basic: $35",
        "Standard: $65",
        "Premium: $120"
      ],
      "pro": false,
      "notPromoted": false,
      "active": false
    }
  ],
  security: {
    logins: [
      { at: 'Feb 20, 2020 @ 10:43 GMT', ip: '121.212.121.121', country: 'Turkey' },
      { at: 'Feb 20, 2020 @ 10:43 GMT', ip: '121.212.121.121', country: 'Turkey' },
      { at: 'Feb 18, 2020 @ 19:27 GMT', ip: '84.229.10.44', country: 'Israel' },
      { at: 'Feb 11, 2020 @ 07:05 GMT', ip: '84.229.10.44', country: 'Israel' }
    ],
    passwordHistory: [
      { at: 'Nov 3, 2019 @ 12:30 GMT', text: 'Password changed by user' },
      { at: 'Jan 15, 2018 @ 09:00 GMT', text: 'Password set at registration' }
    ],
    questions: [
      { q: 'What was the name of your first pet?', set: 'Jan 15, 2018' },
      { q: 'In what city were you born?', set: 'Jan 15, 2018' }
    ],
    identities: [
      { id: 'behance', name: 'Behance', ref: '123456789' }, { id: 'dribbble', name: 'Dribbble', ref: '123456789' },
      { id: 'facebook', name: 'Facebook', ref: '123456789' }, { id: 'twitter', name: 'Twitter', ref: '123456789' }
    ],
    idVerification: { status: 'Pending review', initiated: 'Feb 20, 2020', expires: 'Feb 27, 2020', attempts: 2, document: 'Nigeria', name: 'Jill Seller', reason: 'Name mismatch' },
    phone: {
      status: 'Verified',
      lastSuccess: { time: 'Feb 20, 2020 10:43', method: 'SMS', country: 'Turkey', number: '+90 555 000 0000', score: '0.92' },
      lastFailed: { time: 'Feb 19, 2020 21:07', method: 'Voice', country: 'Turkey', number: '+90 555 000 0000', score: '0.31' },
      history: [
        { at: 'Feb 20, 2020 @ 10:43 GMT', text: 'Verified by SMS' },
        { at: 'Feb 19, 2020 @ 21:07 GMT', text: 'Failed by voice call' },
        { at: 'Feb 19, 2020 @ 21:03 GMT', text: 'Verification requested' }
      ]
    },
    withdrawalsBlocked: true,
    twoFA: true
  },
  options: {
    manageTypes: [{ v: 'standard', l: 'Standard' }, { v: 'managed', l: 'Managed account' }, { v: 'agency', l: 'Agency' }],
    managers: [{ v: 'm1', l: 'Account manager 1' }, { v: 'm2', l: 'Account manager 2' }],
    locations: ['Tel Aviv, Israel', 'Greenland', 'Turkey'],
    escalationBadges: ['Payment Risk', 'Policy Violation', 'Needs Review']
  }
};

function load() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    let changed = false;
    for (const k of Object.keys(SEED)) if (!(k in db)) { db[k] = JSON.parse(JSON.stringify(SEED[k])); changed = true; }
    if (changed) save(db);
    return db;
  }
  catch { save(SEED); return JSON.parse(JSON.stringify(SEED)); }
}
function save(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

const EDITABLE = {
  description: (v) => typeof v === 'string' && v.length <= 600,
  manageType: (v) => v === '' || SEED.options.manageTypes.some((o) => o.v === v),
  managedBy: (v) => v === '' || SEED.options.managers.some((o) => o.v === v),
  location: (v) => SEED.options.locations.includes(v)
};

function send(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
  });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png' };

async function api(req, res, url) {
  const db = load();
  const c = db.customer;
  if (url === '/api/customer' && req.method === 'GET') return send(res, 200, db);
  if (url === '/api/customer' && req.method === 'PATCH') {
    const body = await readBody(req);
    for (const [k, v] of Object.entries(body)) {
      if (!EDITABLE[k]) return send(res, 400, { error: `Field "${k}" is not editable` });
      if (!EDITABLE[k](v)) return send(res, 400, { error: `Invalid value for "${k}"` });
    }
    if (body.location && body.location !== c.location) {
      db.locationHistory.unshift({ at: new Date().toISOString().slice(0, 10), text: `Changed to ${body.location.split(',')[0]} by you` });
    }
    Object.assign(c, body);
    save(db);
    return send(res, 200, db);
  }
  if (url === '/api/escalations' && req.method === 'POST') {
    const { label } = await readBody(req);
    if (!SEED.options.escalationBadges.includes(label)) return send(res, 400, { error: 'Unknown badge' });
    if (!c.escalations.includes(label)) c.escalations.push(label);
    save(db);
    return send(res, 200, db);
  }
  const del = url.match(/^\/api\/escalations\/(.+)$/);
  if (del && req.method === 'DELETE') {
    c.escalations = c.escalations.filter((b) => b !== decodeURIComponent(del[1]));
    save(db);
    return send(res, 200, db);
  }
  if (url === '/api/actions' && req.method === 'POST') {
    const { action } = await readBody(req);
    const map = { block: 'Blocked', restrict: 'Restricted', restrictBlock: 'Restricted & blocked', reinstate: 'Active' };
    if (map[action]) c.status = map[action];
    else if (action === 'toggleWithdrawals') db.security.withdrawalsBlocked = !db.security.withdrawalsBlocked;
    else if (action === 'toggle2fa') db.security.twoFA = !db.security.twoFA;
    else return send(res, 400, { error: 'Unknown action' });
    save(db);
    return send(res, 200, db);
  }
  const idDel = url.match(/^\/api\/identities\/(.+)$/);
  if (idDel && req.method === 'DELETE') {
    db.security.identities = db.security.identities.filter((i) => i.id !== decodeURIComponent(idDel[1]));
    save(db);
    return send(res, 200, db);
  }
  if (url === '/api/quality' && req.method === 'PATCH') {
    const b = await readBody(req);
    const okS = ['High Quality', 'Medium Quality', 'Low Quality', 'Not rated'], okL = ['New Seller', 'Level 1', 'Level 2', 'Top Rated Seller'];
    if ('suggested' in b) { if (!okS.includes(b.suggested)) return send(res, 400, { error: 'Invalid quality' }); db.quality.suggested = b.suggested; db.quality.changedNote = typeof b.note === 'string' ? b.note : `${b.suggested} | Changed by: You ${new Date().toISOString().replace('T', ' ').slice(0, 19)} +0000`; }
    if ('level' in b) { if (!okL.includes(b.level)) return send(res, 400, { error: 'Invalid level' }); db.quality.level = b.level; }
    save(db);
    return send(res, 200, db);
  }
  if (url === '/api/restore' && req.method === 'POST') {
    const b = await readBody(req);
    if (typeof b.status === 'string') c.status = b.status;
    if (typeof b.withdrawalsBlocked === 'boolean') db.security.withdrawalsBlocked = b.withdrawalsBlocked;
    if (typeof b.twoFA === 'boolean') db.security.twoFA = b.twoFA;
    save(db);
    return send(res, 200, db);
  }
  if (url === '/api/identities' && req.method === 'POST') {
    const { identity } = await readBody(req);
    if (!identity || !identity.id) return send(res, 400, { error: 'Invalid identity' });
    if (!db.security.identities.some((i) => i.id === identity.id)) db.security.identities.push(identity);
    save(db);
    return send(res, 200, db);
  }
  if (url === '/api/reset' && req.method === 'POST') { save(SEED); return send(res, 200, SEED); }
  return send(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  try {
    if (url.startsWith('/api/')) return await api(req, res, url);
    const file = path.normalize(path.join(PUBLIC, url === '/' ? 'index.html' : url));
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log(`Customer View running at http://localhost:${PORT}`));
