/*  Milliy Pin — Telegram Mini App serveri.
 *  Telegram xizmatlari va o'yin donatlari uchun donat platformasi.
 *
 *  Tashqi kutubxonasiz: faqat Node.js standart modullari + node:sqlite.
 *  Ishga tushirish:  node server.js       (PORT, BOT_TOKEN, ADMIN_IDS env orqali)
 */
"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const url = require("url");

const store = require("./db.js");
const { CATALOG } = require("./seed.js");

/* ═══════════════ Konfiguratsiya ═══════════════ */

const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",").map(s => Number(String(s).trim())).filter(Boolean);
const WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || "";
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_BODY = 2 * 1024 * 1024;

// Balansni to'ldirish oynasi va chegaralari
const TOPUP_TTL = 15 * 60 * 1000;
const MIN_TOPUP = 5000;
const MAX_TOPUP = 10000000;
const INITDATA_MAX_AGE = 12 * 60 * 60; // sekund

// Ma'lumot papkasi: Railway/Render'da /data volume, aks holda loyiha ichidagi ./data
let DATA_DIR = process.env.DATA_DIR || "/data";
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.accessSync(DATA_DIR, fs.constants.W_OK);
} catch (e) {
  DATA_DIR = path.join(__dirname, "data");
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
console.log("[milliypin] DATA_DIR =", DATA_DIR);

const db = store.openDb(DATA_DIR);

/* ═══════════════ Standart sozlamalar ═══════════════ */

const DEFAULTS = {
  shop: {
    brand: "Milliy Pin",
    supportUsername: process.env.SUPPORT_USERNAME || "milliypin_support",
    channelUrl: process.env.CHANNEL_URL || "",
    reviewsUrl: "",
    workHours: "09:00 – 23:00",
    noticeUz: "",
    noticeRu: ""
  },
  cards: [
    { id: "c1", type: "HUMO", number: "9860 0101 0101 0101", holder: "MILLIY PIN" },
    { id: "c2", type: "UZCARD", number: "8600 0202 0202 0202", holder: "MILLIY PIN" }
  ],
  channels: { order: process.env.ORDER_CHAT_ID || "", topup: process.env.TOPUP_CHAT_ID || "", log: "" },
  referral: { enabled: true, percent: 3, bonus: 0 },
  loyalty: {
    enabled: true,
    tiers: [
      { name: "Chinnigul", minSpent: 0, percent: 0 },
      { name: "Zargar", minSpent: 500000, percent: 2 },
      { name: "Amir", minSpent: 2000000, percent: 4 },
      { name: "Sohibqiron", minSpent: 6000000, percent: 6 }
    ]
  }
};

function cfg(key) {
  const v = store.setGet(db, key, null);
  return v === null ? JSON.parse(JSON.stringify(DEFAULTS[key])) : v;
}
function cfgPut(key, value) { store.setPut(db, key, value); }

// Birinchi ishga tushish: katalog bo'sh bo'lsa standart mahsulotlar qo'yiladi.
if (store.productsAll(db, false).length === 0) {
  store.productsReplaceAll(db, JSON.parse(JSON.stringify(CATALOG)));
  console.log("[milliypin] standart katalog yuklandi:", CATALOG.length, "ta mahsulot");
}

/* ═══════════════ Yordamchilar ═══════════════ */

const now = () => Date.now();
const uid7 = p => p + crypto.randomBytes(6).toString("hex");
const num = v => Number(v) || 0;
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(num(v))));
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max || 200);

function send(res, code, obj) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function sendEtag(req, res, obj) {
  const body = JSON.stringify(obj);
  const etag = '"' + crypto.createHash("sha1").update(body).digest("hex").slice(0, 24) + '"';
  if (req.headers["if-none-match"] === etag) { res.writeHead(304, { ETag: etag }); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache", ETag: etag });
  res.end(body);
}
function readBody(req, res, cb) {
  let buf = "", size = 0, dead = false;
  req.on("data", c => {
    size += c.length;
    if (size > MAX_BODY) { dead = true; send(res, 413, { error: "too_large" }); req.destroy(); }
    else buf += c;
  });
  req.on("end", () => {
    if (dead) return;
    try { cb(JSON.parse(buf || "{}")); }
    catch (e) { send(res, 400, { error: "bad_json" }); }
  });
}

/* ---------- Telegram initData tekshiruvi ---------- */
function checkInitData(initData) {
  try {
    if (!initData || !BOT_TOKEN) return { reason: "auth", user: null };
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { reason: "auth", user: null };
    params.delete("hash");
    const dcs = [...params.entries()].map(([k, v]) => k + "=" + v).sort().join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const mine = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
    const a = Buffer.from(mine, "hex"), b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { reason: "auth", user: null };
    const authDate = num(params.get("auth_date"));
    if (!authDate) return { reason: "auth", user: null };
    if (Date.now() / 1000 - authDate > INITDATA_MAX_AGE) return { reason: "expired", user: null };
    const u = JSON.parse(params.get("user") || "null");
    if (u) u._startParam = params.get("start_param") || "";
    return { reason: "ok", user: u };
  } catch (e) { return { reason: "auth", user: null }; }
}
function auth(req) {
  const r = checkInitData(req.headers["x-init-data"] || "");
  req._authReason = r.reason;
  return r.user;
}
const isAdmin = u => !!u && ADMIN_IDS.indexOf(u.id) !== -1;

function requireUser(req, res) {
  const u = auth(req);
  if (!u) { send(res, 401, { error: req._authReason === "expired" ? "expired" : "auth" }); return null; }
  return u;
}
function requireAdmin(req, res) {
  const u = auth(req);
  if (!u) { send(res, 401, { error: "auth" }); return null; }
  if (!isAdmin(u)) { send(res, 403, { error: "not_admin" }); return null; }
  return u;
}

/* ---------- Foydalanuvchi hisobi ---------- */
function account(tgUser, startParam) {
  const id = String(tgUser.id);
  let u = store.userGet(db, id);
  const fresh = !u;
  if (!u) {
    u = {
      id, balance: 0, spent: 0, createdAt: now(),
      firstName: "", username: "", refBy: "", refEarned: 0, lang: "uz", blocked: false
    };
  }
  u.firstName = str(tgUser.first_name, 64);
  u.username = str(tgUser.username, 64);
  u.lastSeen = now();
  // Referal: faqat birinchi kirishda va o'ziga o'zi bo'lmasa biriktiriladi.
  const ref = str(startParam || tgUser._startParam, 40).replace(/^ref_?/, "");
  if (fresh && ref && /^\d+$/.test(ref) && ref !== id && store.userGet(db, ref)) u.refBy = ref;
  store.userPut(db, u);
  return u;
}
function balanceAdd(uidStr, delta, reason) {
  const u = store.userGet(db, String(uidStr));
  if (!u) return null;
  u.balance = Math.max(0, Math.round(num(u.balance) + num(delta)));
  store.userPut(db, u);
  if (reason) console.log("[balans]", uidStr, delta > 0 ? "+" + delta : delta, reason);
  return u;
}
function loyaltyTier(spent) {
  const l = cfg("loyalty");
  if (!l.enabled) return null;
  const tiers = (l.tiers || []).slice().sort((a, b) => a.minSpent - b.minSpent);
  let cur = tiers[0] || null, next = null;
  for (const t of tiers) { if (spent >= t.minSpent) cur = t; else { next = t; break; } }
  return { current: cur, next };
}

/* ═══════════════ Telegram Bot API ═══════════════ */

function tgApi(method, payload) {
  return new Promise(resolve => {
    if (!BOT_TOKEN) return resolve({ ok: false, description: "no BOT_TOKEN" });
    const body = Buffer.from(JSON.stringify(payload));
    const req = https.request({
      hostname: "api.telegram.org", path: "/bot" + BOT_TOKEN + "/" + method, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": body.length }, timeout: 15000
    }, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({ ok: false, description: d }); } });
    });
    req.on("error", e => resolve({ ok: false, description: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, description: "timeout" }); });
    req.end(body);
  });
}
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tgSend(chatId, text, extra) {
  if (!chatId) return Promise.resolve({ ok: false });
  return tgApi("sendMessage", Object.assign({
    chat_id: String(chatId), text, parse_mode: "HTML", disable_web_page_preview: true
  }, extra || {}));
}
function tgEdit(chatId, messageId, text) {
  if (!chatId || !messageId) return Promise.resolve({ ok: false });
  return tgApi("editMessageText", {
    chat_id: String(chatId), message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true
  });
}
// Telegram sendDocument — multipart/form-data qo'lda yig'iladi (tashqi kutubxonasiz).
function tgSendDocument(chatId, buffer, filename, caption) {
  return new Promise(resolve => {
    if (!BOT_TOKEN || !chatId) return resolve({ ok: false, description: "no bot/chat" });
    const boundary = "----MilliyPin" + crypto.randomBytes(12).toString("hex");
    const part = (name, value) =>
      Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n");
    const fileHead = Buffer.from("--" + boundary +
      "\r\nContent-Disposition: form-data; name=\"document\"; filename=\"" + filename + "\"" +
      "\r\nContent-Type: text/csv\r\n\r\n");
    const body = Buffer.concat([
      part("chat_id", String(chatId)),
      caption ? part("caption", caption) : Buffer.alloc(0),
      fileHead, buffer, Buffer.from("\r\n--" + boundary + "--\r\n")
    ]);
    const req = https.request({
      hostname: "api.telegram.org", path: "/bot" + BOT_TOKEN + "/sendDocument", method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=" + boundary, "Content-Length": body.length },
      timeout: 30000
    }, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({ ok: false, description: d }); } });
    });
    req.on("error", e => resolve({ ok: false, description: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, description: "timeout" }); });
    req.end(body);
  });
}

const chan = kind => str(cfg("channels")[kind], 40);

const MONEY = n => new Intl.NumberFormat("uz-UZ").format(Math.round(num(n))) + " so'm";
const STATUS_LABEL = {
  new: "🕐 Yangi", processing: "⏳ Bajarilmoqda", done: "✅ Bajarildi", canceled: "❌ Bekor qilindi"
};

function orderCard(o) {
  const uName = o.username ? "@" + o.username : o.uid;
  return [
    "🧾 <b>Buyurtma #" + o.seq + "</b>",
    "",
    "▫️ Mahsulot: <b>" + esc(o.itemTitle) + "</b>",
    "▫️ Paket: <b>" + esc(o.tierLabel) + "</b>",
    "▫️ Ma'lumot: <code>" + esc(o.target) + "</code>",
    o.comment ? "▫️ Izoh: " + esc(o.comment) : "",
    "▫️ Summa: <b>" + MONEY(o.total) + "</b>" + (o.discount ? " (chegirma " + MONEY(o.discount) + ")" : ""),
    "▫️ Mijoz: " + esc(uName) + " (<code>" + o.uid + "</code>)",
    "",
    "Holat: <b>" + (STATUS_LABEL[o.status] || o.status) + "</b>"
  ].filter(Boolean).join("\n");
}
function topupCard(p) {
  const uName = p.username ? "@" + p.username : p.uid;
  const st = { pending: "🕐 Kutilmoqda", confirmed: "✅ Tasdiqlandi", rejected: "❌ Rad etildi", expired: "⌛ Muddati o'tdi" };
  return [
    "💳 <b>Balans to'ldirish</b>",
    "",
    "▫️ Summa: <b>" + MONEY(p.amount) + "</b>",
    "▫️ Karta: " + esc(p.cardType) + " · <code>" + esc(p.cardNumber) + "</code>",
    "▫️ Mijoz: " + esc(uName) + " (<code>" + p.uid + "</code>)",
    "",
    "Holat: <b>" + (st[p.status] || p.status) + "</b>"
  ].join("\n");
}

async function notifyOrder(o) {
  const text = orderCard(o);
  const cid = chan("order");
  if (cid) {
    if (o.chanMsgId) await tgEdit(cid, o.chanMsgId, text);
    else {
      const r = await tgSend(cid, text);
      if (r && r.ok && r.result) { o.chanMsgId = r.result.message_id; store.orderPut(db, o); }
    }
  }
  const mine = {
    new: "🧾 Buyurtmangiz #" + o.seq + " qabul qilindi. Tez orada bajariladi.",
    processing: "⏳ Buyurtma #" + o.seq + " bajarilmoqda.",
    done: "✅ Buyurtma #" + o.seq + " muvaffaqiyatli bajarildi. Xaridingiz uchun rahmat!",
    canceled: "❌ Buyurtma #" + o.seq + " bekor qilindi." + (o.refunded ? " " + MONEY(o.total) + " balansingizga qaytarildi." : "")
  }[o.status];
  if (mine) tgSend(o.uid, mine);
}
async function notifyTopup(p) {
  const text = topupCard(p);
  const cid = chan("topup") || chan("order");
  if (cid) {
    if (p.chanMsgId) await tgEdit(cid, p.chanMsgId, text);
    else {
      const r = await tgSend(cid, text);
      if (r && r.ok && r.result) { p.chanMsgId = r.result.message_id; store.paymentPut(db, p); }
    }
  }
  if (p.status === "confirmed") tgSend(p.uid, "✅ Balansingiz " + MONEY(p.amount) + " ga to'ldirildi.");
  if (p.status === "rejected") tgSend(p.uid, "❌ To'lov tasdiqlanmadi. Iltimos, qo'llab-quvvatlash bilan bog'laning.");
}

/* ═══════════════ Biznes-mantiq ═══════════════ */

function expirePending() {
  const gone = store.paymentsExpire(db, now() - TOPUP_TTL);
  gone.forEach(p => notifyTopup(p));
}
setInterval(expirePending, 60 * 1000).unref();

// Har bir kutilayotgan to'lovga betakror summa beriladi — bank SMS'ida to'lovni
// aynan shu tiyinlar (masalan 50 000 → 50 137) orqali xatosiz taniб olish uchun.
function uniqueAmount(base) {
  const taken = store.pendingAmountsSet(db);
  for (let i = 0; i < 900; i++) {
    const cand = base + i;
    if (!taken.has(cand)) return cand;
  }
  return base + Math.floor(Math.random() * 900);
}

function validatePromo(code, user, subtotal) {
  const pr = store.promoGet(db, code);
  if (!pr || pr.active === false) return { ok: false, error: "promo_not_found" };
  if (pr.expiresAt && now() > pr.expiresAt) return { ok: false, error: "promo_expired" };
  if (pr.maxUses && num(pr.usedCount) >= pr.maxUses) return { ok: false, error: "promo_used_up" };
  if (pr.minOrder && subtotal < pr.minOrder) return { ok: false, error: "promo_min_order", minOrder: pr.minOrder };
  const perUser = num((pr.usedBy || {})[user.id]);
  if (perUser >= (pr.perUserLimit || 1)) return { ok: false, error: "promo_already_used" };
  const discount = pr.type === "fixed"
    ? Math.min(num(pr.value), subtotal)
    : Math.floor(subtotal * clampInt(pr.value, 1, 90) / 100);
  return { ok: true, promo: pr, discount };
}
function consumePromo(pr, uidStr) {
  pr.usedCount = num(pr.usedCount) + 1;
  pr.usedBy = pr.usedBy || {};
  pr.usedBy[uidStr] = num(pr.usedBy[uidStr]) + 1;
  store.promoPut(db, pr);
}

// Buyurtma bajarilganda: referal foizi + sodiqlik keshbeki hisoblanadi.
function rewardOnDone(o) {
  if (o.rewarded) return;
  o.rewarded = true;
  const buyer = store.userGet(db, o.uid);
  if (buyer) {
    buyer.spent = num(buyer.spent) + num(o.total);
    store.userPut(db, buyer);

    const l = loyaltyTier(buyer.spent);
    if (l && l.current && l.current.percent > 0) {
      const cash = Math.floor(num(o.total) * l.current.percent / 100);
      if (cash > 0) {
        balanceAdd(buyer.id, cash, "loyalty");
        o.cashback = cash;
        tgSend(buyer.id, "🎁 <b>" + esc(l.current.name) + "</b> darajangiz uchun " + MONEY(cash) + " keshbek qo'shildi.");
      }
    }
    const ref = cfg("referral");
    if (ref.enabled && buyer.refBy) {
      const bonus = Math.floor(num(o.total) * clampInt(ref.percent, 0, 50) / 100);
      if (bonus > 0 && balanceAdd(buyer.refBy, bonus, "referral")) {
        const inviter = store.userGet(db, buyer.refBy);
        if (inviter) { inviter.refEarned = num(inviter.refEarned) + bonus; store.userPut(db, inviter); }
        tgSend(buyer.refBy, "🤝 Taklif qilgan do'stingiz xarid qildi — " + MONEY(bonus) + " bonus oldingiz.");
      }
    }
  }
  store.orderPut(db, o);
}

function publicCatalog() {
  return store.productsAll(db, true).map(it => ({
    id: it.id, category: it.category, group: it.group, icon: it.icon, title: it.title,
    field: it.field, note: it.note, image: it.image || "",
    tiers: (it.tiers || []).filter(t => t.active !== false)
  })).filter(it => it.tiers.length);
}

function myView(u) {
  const acc = store.userGet(db, String(u.id)) || { balance: 0, spent: 0 };
  const reviewed = store.reviewedOrderIds(db, acc.id);
  const l = loyaltyTier(num(acc.spent));
  return {
    id: acc.id,
    balance: num(acc.balance),
    spent: num(acc.spent),
    refEarned: num(acc.refEarned),
    isAdmin: isAdmin(u),
    loyalty: l,
    orders: store.ordersByUser(db, acc.id, 60).map(o => Object.assign({}, o, {
      canReview: o.status === "done" && !reviewed.has(o.id), chanMsgId: undefined
    })),
    payments: store.paymentsByUser(db, acc.id, 30).map(p => Object.assign({}, p, { chanMsgId: undefined }))
  };
}

/* ═══════════════ Statik fayllar ═══════════════ */

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2"
};
function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep) && file !== path.join(PUBLIC_DIR, "index.html")) {
    return send(res, 403, { error: "forbidden" });
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA: noma'lum yo'l → index.html
      return fs.readFile(path.join(PUBLIC_DIR, "index.html"), (e2, html) => {
        if (e2) return send(res, 404, { error: "not_found" });
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
        res.end(html);
      });
    }
    const ext = path.extname(file).toLowerCase();
    const cache = ext === ".html" ? "no-cache" : "public, max-age=300";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache });
    res.end(data);
  });
}

/* ═══════════════ Marshrutlar ═══════════════ */

const routes = {};
const route = (method, p, handler) => { routes[method + " " + p] = handler; };

/* ---------- Ochiq ---------- */

route("GET", "/api/config", (req, res) => {
  const shop = cfg("shop"), ref = cfg("referral"), loy = cfg("loyalty");
  sendEtag(req, res, {
    brand: shop.brand,
    support: shop.supportUsername,
    channelUrl: shop.channelUrl,
    reviewsUrl: shop.reviewsUrl,
    workHours: shop.workHours,
    notice: { uz: shop.noticeUz || "", ru: shop.noticeRu || "" },
    cards: cfg("cards").map(c => ({ id: c.id, type: c.type, number: c.number, holder: c.holder })),
    referral: { enabled: !!ref.enabled, percent: ref.percent },
    loyalty: { enabled: !!loy.enabled, tiers: loy.tiers },
    minTopup: MIN_TOPUP, maxTopup: MAX_TOPUP, topupMinutes: Math.round(TOPUP_TTL / 60000),
    botConfigured: !!BOT_TOKEN,
    botUsername: _botUsername
  });
});

route("GET", "/api/catalog", (req, res) => sendEtag(req, res, publicCatalog()));

route("GET", "/api/reviews", (req, res) => {
  send(res, 200, store.reviewsAll(db, 40).map(r => ({
    stars: r.stars, text: r.text, name: r.name, ts: r.ts, itemTitle: r.itemTitle
  })));
});

route("GET", "/api/stats", (req, res) => {
  const done = store.ordersByStatus(db, "done", 5000);
  send(res, 200, {
    users: store.usersCount(db),
    orders: done.length,
    volume: done.reduce((s, o) => s + num(o.total), 0)
  });
});

/* ---------- Foydalanuvchi ---------- */

route("GET", "/api/me", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  account(u, u._startParam);
  expirePending();
  send(res, 200, myView(u));
});

route("GET", "/api/referral", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  const acc = account(u);
  const ref = cfg("referral");
  const invited = store.usersAll(db).filter(x => x.refBy === acc.id);
  send(res, 200, {
    enabled: !!ref.enabled,
    percent: ref.percent,
    code: acc.id,
    earned: num(acc.refEarned),
    invited: invited.length,
    invitedActive: invited.filter(x => num(x.spent) > 0).length
  });
});

route("POST", "/api/promo/check", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  readBody(req, res, b => {
    const acc = account(u);
    const r = validatePromo(str(b.code, 32).toUpperCase(), acc, clampInt(b.subtotal, 0, 1e9));
    send(res, r.ok ? 200 : 400, r);
  });
});

route("POST", "/api/topup", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  readBody(req, res, b => {
    const acc = account(u);
    const base = clampInt(b.amount, 0, MAX_TOPUP);
    if (base < MIN_TOPUP) return send(res, 400, { error: "min_topup", min: MIN_TOPUP });
    const cards = cfg("cards");
    const card = cards.find(c => c.id === str(b.cardId, 20)) || cards[0];
    if (!card) return send(res, 503, { error: "no_cards" });

    expirePending();
    const open = store.paymentsByUser(db, acc.id, 10).filter(p => p.status === "pending");
    if (open.length >= 2) return send(res, 429, { error: "too_many_pending" });

    const p = {
      id: uid7("pay_"), uid: acc.id, username: acc.username, name: acc.firstName,
      base, amount: uniqueAmount(base), status: "pending", ts: now(),
      expiresAt: now() + TOPUP_TTL, cardId: card.id, cardType: card.type,
      cardNumber: card.number, cardHolder: card.holder
    };
    store.paymentPut(db, p);
    notifyTopup(p);
    send(res, 200, p);
  });
});

route("POST", "/api/topup/paid", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  readBody(req, res, b => {
    const p = store.paymentGet(db, str(b.id, 40));
    if (!p || p.uid !== String(u.id)) return send(res, 404, { error: "not_found" });
    if (p.status !== "pending") return send(res, 400, { error: "not_pending", status: p.status });
    p.claimedAt = now();
    p.expiresAt = now() + TOPUP_TTL; // admin tekshirgunicha muddat uzaytiriladi
    store.paymentPut(db, p);
    tgSend(chan("topup") || chan("order"), "🔔 Mijoz <b>" + MONEY(p.amount) + "</b> to'lovni amalga oshirdim dedi. Tekshiring.");
    notifyTopup(p);
    send(res, 200, { ok: true });
  });
});

route("POST", "/api/topup/cancel", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  readBody(req, res, b => {
    const p = store.paymentGet(db, str(b.id, 40));
    if (!p || p.uid !== String(u.id)) return send(res, 404, { error: "not_found" });
    if (p.status !== "pending") return send(res, 400, { error: "not_pending" });
    p.status = "rejected"; p.canceledByUser = true;
    store.paymentPut(db, p);
    notifyTopup(p);
    send(res, 200, { ok: true });
  });
});

route("POST", "/api/order", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  readBody(req, res, b => {
    const acc = account(u);
    if (acc.blocked) return send(res, 403, { error: "blocked" });

    const item = store.productGet(db, str(b.itemId, 40));
    if (!item || item.active === false) return send(res, 404, { error: "item_not_found" });
    const tier = (item.tiers || []).find(t => t.id === str(b.tierId, 40));
    if (!tier || tier.active === false) return send(res, 404, { error: "tier_not_found" });

    const qty = clampInt(b.qty || 1, 1, 20);
    const target = str(b.target, 120);
    if (target.length < 2) return send(res, 400, { error: "target_required" });

    const subtotal = num(tier.price) * qty;
    let discount = 0, promo = null;
    const code = str(b.promo, 32).toUpperCase();
    if (code) {
      const v = validatePromo(code, acc, subtotal);
      if (!v.ok) return send(res, 400, v);
      discount = v.discount; promo = v.promo;
    }
    const total = Math.max(0, subtotal - discount);
    if (num(acc.balance) < total) return send(res, 400, { error: "insufficient", need: total - num(acc.balance) });

    balanceAdd(acc.id, -total, "order");
    if (promo) consumePromo(promo, acc.id);

    const o = {
      id: uid7("ord_"), seq: store.nextOrderSeq(db), uid: acc.id,
      username: acc.username, name: acc.firstName,
      itemId: item.id, itemTitle: (item.title && (item.title.uz || item.title)) || item.id,
      itemIcon: item.icon || "", category: item.category, field: item.field,
      tierId: tier.id, tierLabel: (tier.label && (tier.label.uz || tier.label)) || tier.id,
      qty, target, comment: str(b.comment, 200),
      subtotal, discount, total, promoCode: promo ? promo.code : "",
      status: "new", ts: now()
    };
    store.orderPut(db, o);
    notifyOrder(o);
    send(res, 200, { ok: true, order: o, balance: num(store.userGet(db, acc.id).balance) });
  });
});

route("POST", "/api/review", (req, res) => {
  const u = requireUser(req, res); if (!u) return;
  readBody(req, res, b => {
    const acc = account(u);
    const o = store.orderGet(db, str(b.orderId, 40));
    if (!o || o.uid !== acc.id) return send(res, 404, { error: "not_found" });
    if (o.status !== "done") return send(res, 400, { error: "not_done" });
    if (store.reviewedOrderIds(db, acc.id).has(o.id)) return send(res, 400, { error: "already_reviewed" });
    const r = {
      id: uid7("rev_"), orderId: o.id, uid: acc.id, ts: now(),
      stars: clampInt(b.stars, 1, 5), text: str(b.text, 300),
      name: acc.firstName || ("ID " + acc.id.slice(-4)), itemTitle: o.itemTitle
    };
    store.reviewPut(db, r);
    tgSend(chan("log") || chan("order"), "⭐ Yangi sharh (" + r.stars + "/5): " + esc(r.text || "—") + "\n" + esc(r.itemTitle));
    send(res, 200, { ok: true });
  });
});

/* ---------- Admin ---------- */

route("GET", "/api/admin/overview", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const dayAgo = now() - 24 * 3600 * 1000;
  const weekAgo = now() - 7 * 24 * 3600 * 1000;
  const recent = store.ordersSince(db, weekAgo);
  const doneAll = store.ordersByStatus(db, "done", 5000);
  const sum = list => list.reduce((s, o) => s + num(o.total), 0);
  send(res, 200, {
    users: store.usersCount(db),
    pendingOrders: store.ordersByStatus(db, "new", 500).length,
    processingOrders: store.ordersByStatus(db, "processing", 500).length,
    pendingPayments: store.paymentsByStatus(db, "pending", 500).length,
    revenueDay: sum(recent.filter(o => o.status === "done" && o.ts >= dayAgo)),
    revenueWeek: sum(recent.filter(o => o.status === "done")),
    revenueAll: sum(doneAll),
    ordersAll: doneAll.length,
    top: Object.entries(doneAll.reduce((m, o) => {
      m[o.itemTitle] = (m[o.itemTitle] || 0) + 1; return m;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([title, n]) => ({ title, n }))
  });
});

route("GET", "/api/admin/orders", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const q = new URLSearchParams(url.parse(req.url).query || "");
  const st = str(q.get("status"), 20);
  send(res, 200, store.ordersByStatus(db, st && st !== "all" ? st : null, 200));
});

route("POST", "/api/admin/order", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, b => {
    const o = store.orderGet(db, str(b.id, 40));
    if (!o) return send(res, 404, { error: "not_found" });
    const action = str(b.action, 20);
    if (action === "processing" && o.status === "new") o.status = "processing";
    else if (action === "done" && o.status !== "done" && o.status !== "canceled") {
      o.status = "done"; o.doneAt = now(); o.note = str(b.note, 300) || o.note;
      rewardOnDone(o);
    } else if (action === "cancel" && o.status !== "canceled") {
      if (o.status !== "done") { balanceAdd(o.uid, o.total, "refund"); o.refunded = true; }
      o.status = "canceled"; o.cancelReason = str(b.note, 200);
    } else return send(res, 400, { error: "bad_action", status: o.status });
    store.orderPut(db, o);
    notifyOrder(o);
    send(res, 200, { ok: true, order: o });
  });
});

route("GET", "/api/admin/payments", (req, res) => {
  if (!requireAdmin(req, res)) return;
  expirePending();
  const q = new URLSearchParams(url.parse(req.url).query || "");
  send(res, 200, store.paymentsByStatus(db, str(q.get("status"), 20) || "pending", 200));
});

route("POST", "/api/admin/payment", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, b => {
    const p = store.paymentGet(db, str(b.id, 40));
    if (!p) return send(res, 404, { error: "not_found" });
    if (p.status === "confirmed") return send(res, 400, { error: "already_confirmed" });
    if (str(b.action, 20) === "confirm") {
      p.status = "confirmed"; p.confirmedAt = now(); p.confirmedBy = "admin";
      balanceAdd(p.uid, p.base || p.amount, "topup");
    } else {
      p.status = "rejected"; p.rejectReason = str(b.note, 200);
    }
    store.paymentPut(db, p);
    notifyTopup(p);
    send(res, 200, { ok: true, payment: p });
  });
});

route("GET", "/api/admin/catalog", (req, res) => {
  if (!requireAdmin(req, res)) return;
  send(res, 200, store.productsAll(db, false));
});

route("POST", "/api/admin/catalog", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, b => {
    if (!Array.isArray(b.items)) return send(res, 400, { error: "items_required" });
    if (b.items.length > 500) return send(res, 400, { error: "too_many" });
    const clean = b.items.map((it, i) => ({
      id: str(it.id, 40) || uid7("it_"),
      category: str(it.category, 20) === "telegram" ? "telegram" : "game",
      group: str(it.group, 60), icon: str(it.icon, 12),
      title: { uz: str((it.title || {}).uz, 80), ru: str((it.title || {}).ru, 80) },
      field: str(it.field, 20) || "playerId",
      note: { uz: str((it.note || {}).uz, 240), ru: str((it.note || {}).ru, 240) },
      image: str(it.image, 400), active: it.active !== false, pos: i,
      tiers: (it.tiers || []).slice(0, 40).map(t => ({
        id: str(t.id, 40) || uid7("t_"),
        label: { uz: str((t.label || {}).uz, 60), ru: str((t.label || {}).ru, 60) },
        price: clampInt(t.price, 0, 1e9),
        old: t.old ? clampInt(t.old, 0, 1e9) : 0,
        badge: str(t.badge, 12), qty: clampInt(t.qty, 0, 1e9),
        active: t.active !== false
      }))
    }));
    store.productsReplaceAll(db, clean);
    send(res, 200, { ok: true, count: clean.length });
  });
});

route("GET", "/api/admin/users", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const q = new URLSearchParams(url.parse(req.url).query || "");
  const needle = str(q.get("q"), 40).toLowerCase().replace(/^@/, "");
  let list = store.usersAll(db);
  if (needle) list = list.filter(u =>
    u.id.includes(needle) ||
    String(u.username || "").toLowerCase().includes(needle) ||
    String(u.firstName || "").toLowerCase().includes(needle));
  send(res, 200, list.slice(0, 100));
});

route("POST", "/api/admin/user", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, b => {
    const target = store.userGet(db, str(b.id, 30));
    if (!target) return send(res, 404, { error: "not_found" });
    const action = str(b.action, 20);
    if (action === "balance") {
      const delta = clampInt(b.delta, -1e9, 1e9);
      balanceAdd(target.id, delta, "admin");
      if (delta !== 0) {
        tgSend(target.id, delta > 0
          ? "➕ Balansingizga " + MONEY(delta) + " qo'shildi."
          : "➖ Balansingizdan " + MONEY(-delta) + " yechildi.");
      }
    } else if (action === "block") {
      target.blocked = !!b.blocked;
      store.userPut(db, target);
    } else return send(res, 400, { error: "bad_action" });
    send(res, 200, { ok: true, user: store.userGet(db, target.id) });
  });
});

route("GET", "/api/admin/settings", (req, res) => {
  if (!requireAdmin(req, res)) return;
  send(res, 200, {
    shop: cfg("shop"), cards: cfg("cards"), channels: cfg("channels"),
    referral: cfg("referral"), loyalty: cfg("loyalty"),
    promos: store.promosAll(db), adminIds: ADMIN_IDS
  });
});

route("POST", "/api/admin/settings", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, b => {
    if (b.shop) cfgPut("shop", {
      brand: str(b.shop.brand, 40) || "Milliy Pin",
      supportUsername: str(b.shop.supportUsername, 40).replace(/^@/, ""),
      channelUrl: str(b.shop.channelUrl, 200),
      reviewsUrl: str(b.shop.reviewsUrl, 200),
      workHours: str(b.shop.workHours, 40),
      noticeUz: str(b.shop.noticeUz, 300),
      noticeRu: str(b.shop.noticeRu, 300)
    });
    if (Array.isArray(b.cards)) cfgPut("cards", b.cards.slice(0, 8).map((c, i) => ({
      id: str(c.id, 20) || "c" + (i + 1),
      type: str(c.type, 12).toUpperCase() || "HUMO",
      number: str(c.number, 30), holder: str(c.holder, 40).toUpperCase()
    })).filter(c => c.number));
    if (b.channels) cfgPut("channels", {
      order: str(b.channels.order, 40), topup: str(b.channels.topup, 40), log: str(b.channels.log, 40)
    });
    if (b.referral) cfgPut("referral", {
      enabled: !!b.referral.enabled, percent: clampInt(b.referral.percent, 0, 50), bonus: clampInt(b.referral.bonus, 0, 1e7)
    });
    if (b.loyalty) cfgPut("loyalty", {
      enabled: !!b.loyalty.enabled,
      tiers: (b.loyalty.tiers || []).slice(0, 8).map(t => ({
        name: str(t.name, 30), minSpent: clampInt(t.minSpent, 0, 1e9), percent: clampInt(t.percent, 0, 30)
      })).filter(t => t.name)
    });
    send(res, 200, { ok: true });
  });
});

route("POST", "/api/admin/channel-test", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, async b => {
    const cid = str(b.chatId, 40);
    if (!cid) return send(res, 400, { error: "chat_id_required" });
    const r = await tgSend(cid, "✅ <b>Milliy Pin</b> — sinov xabari. Kanal to'g'ri ulangan.");
    send(res, r && r.ok ? 200 : 400, { ok: !!(r && r.ok), error: r && r.description });
  });
});

route("POST", "/api/admin/promo", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, b => {
    const action = str(b.action, 20);
    const code = str(b.code, 32).toUpperCase().replace(/\s+/g, "");
    if (!code) return send(res, 400, { error: "code_required" });
    if (action === "delete") { store.promoDelete(db, code); return send(res, 200, { ok: true }); }
    if (action === "toggle") {
      const pr = store.promoGet(db, code);
      if (!pr) return send(res, 404, { error: "not_found" });
      pr.active = !pr.active; store.promoPut(db, pr);
      return send(res, 200, { ok: true, promo: pr });
    }
    const existing = store.promoGet(db, code);
    const pr = {
      code,
      type: str(b.type, 10) === "fixed" ? "fixed" : "percent",
      value: clampInt(b.value, 1, b.type === "fixed" ? 1e8 : 90),
      minOrder: clampInt(b.minOrder, 0, 1e9),
      maxUses: clampInt(b.maxUses, 0, 1e6),
      perUserLimit: clampInt(b.perUserLimit || 1, 1, 100),
      expiresAt: b.expiresAt ? Number(b.expiresAt) : 0,
      active: b.active !== false,
      usedCount: existing ? num(existing.usedCount) : 0,
      usedBy: existing ? (existing.usedBy || {}) : {},
      createdAt: existing ? existing.createdAt : now()
    };
    store.promoPut(db, pr);
    send(res, 200, { ok: true, promo: pr });
  });
});

route("POST", "/api/admin/broadcast", (req, res) => {
  if (!requireAdmin(req, res)) return;
  readBody(req, res, async b => {
    const text = str(b.text, 3500);
    if (!text) return send(res, 400, { error: "text_required" });
    const users = store.usersAll(db).filter(u => !u.blocked);
    send(res, 200, { ok: true, queued: users.length });
    let sent = 0, failed = 0;
    for (const u of users) {
      const r = await tgSend(u.id, text);
      if (r && r.ok) sent++; else failed++;
      await new Promise(s => setTimeout(s, 40)); // ~25 xabar/sekund — Telegram limiti ichida
    }
    const admin = ADMIN_IDS[0];
    if (admin) tgSend(admin, "📢 Tarqatma yakunlandi.\nYuborildi: " + sent + "\nXato: " + failed);
  });
});

// Buyurtmalar CSV'i adminning shaxsiy chatiga hujjat sifatida yuboriladi —
// Mini App ichida oddiy yuklab olish havolasi ishlamaydi (initData sarlavhasi yo'q).
route("POST", "/api/admin/export", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  readBody(req, res, async () => {
    const rows = [["id", "raqam", "sana", "uid", "username", "mahsulot", "paket", "target", "summa", "holat"]];
    store.ordersByStatus(db, null, 5000).forEach(o => rows.push([
      o.id, o.seq, new Date(o.ts).toISOString(), o.uid, o.username || "",
      o.itemTitle, o.tierLabel, o.target, o.total, o.status
    ]));
    const csv = "﻿" + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n");
    const r = await tgSendDocument(admin.id, Buffer.from(csv, "utf8"),
      "milliypin-" + new Date().toISOString().slice(0, 10) + ".csv",
      "📊 Buyurtmalar hisoboti — " + (rows.length - 1) + " ta yozuv");
    send(res, r && r.ok ? 200 : 400, { ok: !!(r && r.ok), rows: rows.length - 1, error: r && r.description });
  });
});

/* ═══════════════ Telegram webhook (bot) ═══════════════ */

function botStartText(name) {
  return [
    "🇺🇿 <b>Milliy Pin</b> — assalomu alaykum" + (name ? ", " + esc(name) : "") + "!",
    "",
    "Bu yerda Telegram xizmatlari va o'yin donatlari eng qulay narxda:",
    "• Telegram Premium, Stars va sovg'alar",
    "• PUBG UC, Free Fire olmoslari, MLBB, Standoff 2 va boshqalar",
    "",
    "Ilovani ochish uchun pastdagi tugmani bosing 👇"
  ].join("\n");
}

async function handleUpdate(upd) {
  const msg = upd.message || upd.edited_message;
  if (!msg || !msg.text) return;
  const chatId = msg.chat && msg.chat.id;
  const text = String(msg.text || "");

  // Shaxsiy chatdagi /start — foydalanuvchini ro'yxatga oladi va referalni biriktiradi.
  if (msg.chat && msg.chat.type === "private" && text.startsWith("/start")) {
    const param = text.split(/\s+/)[1] || "";
    account(msg.from, param);
    await tgSend(chatId, botStartText(msg.from.first_name), {
      reply_markup: { inline_keyboard: [[{ text: "🎮 Ilovani ochish", url: "https://t.me/" + (await botUsername()) + "?startapp" }]] }
    });
    return;
  }

  if (msg.chat && msg.chat.type === "private" && text.startsWith("/id")) {
    await tgSend(chatId, "Sizning ID: <code>" + msg.from.id + "</code>\nChat ID: <code>" + chatId + "</code>");
    return;
  }

  // SMS bilan avtomatik tasdiqlash: to'lovlar kanalida bank/karta boti yozgan
  // xabardan summani ajratib, aynan shu summani kutayotgan to'lovni tasdiqlaydi.
  const smsChat = str(cfg("channels").topup, 40);
  if (smsChat && String(chatId) === smsChat) {
    const amount = parseSmsAmount(text);
    if (amount) {
      const p = store.pendingPaymentByAmount(db, amount);
      if (p) {
        p.status = "confirmed"; p.confirmedAt = now(); p.confirmedBy = "sms";
        balanceAdd(p.uid, p.base || p.amount, "topup-sms");
        store.paymentPut(db, p);
        notifyTopup(p);
        await tgSend(chatId, "🤖 Avtomatik tasdiqlandi: " + MONEY(amount) + " → <code>" + p.uid + "</code>");
      }
    }
  }
}

// "50 137 so'm", "+50137.00 UZS", "50137,00" kabi ko'rinishlardan summani oladi.
function parseSmsAmount(text) {
  const m = String(text).replace(/ /g, " ").match(/(\d[\d\s.,]{2,15})\s*(so'?m|sum|uzs|UZS)?/i);
  if (!m) return 0;
  const digits = m[1].replace(/[^\d.,]/g, "").replace(/,(\d{2})$/, ".$1").replace(/[\s,]/g, "");
  const val = Math.round(parseFloat(digits));
  return val >= MIN_TOPUP && val <= MAX_TOPUP ? val : 0;
}

let _botUsername = "";
async function botUsername() {
  if (_botUsername) return _botUsername;
  const r = await tgApi("getMe", {});
  _botUsername = (r && r.ok && r.result && r.result.username) || "";
  return _botUsername;
}

/* ═══════════════ HTTP server ═══════════════ */

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || "/");
  const pathname = decodeURIComponent(parsed.pathname || "/");

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Init-Data" });
    return res.end();
  }
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Telegram webhook
  if (pathname === "/tg/webhook" && req.method === "POST") {
    if (WEBHOOK_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET) {
      return send(res, 403, { error: "bad_secret" });
    }
    return readBody(req, res, body => {
      send(res, 200, { ok: true });
      handleUpdate(body).catch(e => console.log("[webhook]", e.message));
    });
  }

  if (pathname === "/healthz") return send(res, 200, { ok: true, ts: now() });

  const handler = routes[req.method + " " + pathname];
  if (handler) {
    if (pathname.startsWith("/api/") && !BOT_TOKEN && pathname !== "/api/config"
        && pathname !== "/api/catalog" && pathname !== "/api/reviews" && pathname !== "/api/stats") {
      return send(res, 503, { error: "no_bot_token" });
    }
    try { return handler(req, res); }
    catch (e) { console.log("[api]", pathname, e.message); return send(res, 500, { error: "server_error" }); }
  }
  if (pathname.startsWith("/api/")) return send(res, 404, { error: "not_found" });

  return serveStatic(req, res, pathname);
});

if (BOT_TOKEN) botUsername().then(u => u && console.log("[milliypin] bot: @" + u));

server.listen(PORT, () => {
  console.log("[milliypin] server http://localhost:" + PORT);
  if (!BOT_TOKEN) console.log("[milliypin] DIQQAT: BOT_TOKEN o'rnatilmagan — API faqat ochiq yo'llarda ishlaydi.");
  if (!ADMIN_IDS.length) console.log("[milliypin] DIQQAT: ADMIN_IDS bo'sh — admin panel hech kimga ochilmaydi.");
});

module.exports = { server, parseSmsAmount, checkInitData, validatePromo, loyaltyTier, db, store };
