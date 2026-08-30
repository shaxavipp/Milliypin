// db.js — Milliy Pin ma'lumot qatlami.
// Node.js ichida mavjud `node:sqlite` (Node >= 22.5) ishlatiladi — tashqi kutubxona,
// node-gyp va native build shart emas, shu sabab Railway/Render/VPS'da bir xil ishlaydi.
//
// Saqlash modeli: har bir jadval "id + indekslanadigan ustunlar + data(JSON)" ko'rinishida.
// Shunday qilinganda mahsulot/buyurtma sxemasi kengaygan sayin migratsiya yozish shart
// bo'lmaydi, lekin ro'yxatlash va filtrlash baribir SQL indekslari orqali tez ishlaydi.
"use strict";

const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id       TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT '',
    pos      INTEGER NOT NULL DEFAULT 0,
    active   INTEGER NOT NULL DEFAULT 1,
    data     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_products_cat ON products(category, pos);

  CREATE TABLE IF NOT EXISTS orders (
    id     TEXT PRIMARY KEY,
    seq    INTEGER NOT NULL DEFAULT 0,
    uid    TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    ts     INTEGER NOT NULL DEFAULT 0,
    data   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_orders_uid ON orders(uid, ts DESC);
  CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status, ts DESC);

  CREATE TABLE IF NOT EXISTS payments (
    id     TEXT PRIMARY KEY,
    uid    TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    amount INTEGER NOT NULL DEFAULT 0,
    ts     INTEGER NOT NULL DEFAULT 0,
    data   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_payments_uid ON payments(uid, ts DESC);
  CREATE INDEX IF NOT EXISTS ix_payments_status ON payments(status, ts DESC);

  CREATE TABLE IF NOT EXISTS users (
    id      TEXT PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    ts      INTEGER NOT NULL DEFAULT 0,
    data    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS promos (
    code   TEXT PRIMARY KEY,
    active INTEGER NOT NULL DEFAULT 1,
    data   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id      TEXT PRIMARY KEY,
    orderId TEXT NOT NULL DEFAULT '',
    uid     TEXT NOT NULL DEFAULT '',
    ts      INTEGER NOT NULL DEFAULT 0,
    data    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_reviews_order ON reviews(orderId);
`;

function openDb(dataDir) {
  const db = new DatabaseSync(path.join(dataDir, "milliypin.db"));
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec(SCHEMA);
  return db;
}

const j = v => JSON.stringify(v);
const p = s => { try { return JSON.parse(s); } catch (e) { return null; } };

/* ---------- settings (kalit → ixtiyoriy JSON qiymat) ---------- */
function setGet(db, key, def) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return def;
  const v = p(row.value);
  return v === null ? def : v;
}
function setPut(db, key, value) {
  db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, j(value));
}

/* ---------- products ---------- */
function productsAll(db, onlyActive) {
  const sql = "SELECT data FROM products" + (onlyActive ? " WHERE active = 1" : "") + " ORDER BY pos ASC, rowid ASC";
  return db.prepare(sql).all().map(r => p(r.data)).filter(Boolean);
}
function productGet(db, id) {
  const row = db.prepare("SELECT data FROM products WHERE id = ?").get(String(id));
  return row ? p(row.data) : null;
}
function productPut(db, item) {
  db.prepare(`INSERT INTO products(id,category,pos,active,data) VALUES(?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET category=excluded.category, pos=excluded.pos,
                                            active=excluded.active, data=excluded.data`)
    .run(String(item.id), String(item.category || ""), Number(item.pos || 0),
         item.active === false ? 0 : 1, j(item));
}
function productDelete(db, id) {
  db.prepare("DELETE FROM products WHERE id = ?").run(String(id));
}
// Butun katalogni bitta tranzaksiyada almashtiradi (admin paneldagi "Nashr qilish").
function productsReplaceAll(db, list) {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM products");
    list.forEach((it, i) => { it.pos = i; productPut(db, it); });
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

/* ---------- users ---------- */
function userGet(db, uid) {
  const row = db.prepare("SELECT balance, data FROM users WHERE id = ?").get(String(uid));
  if (!row) return null;
  const u = p(row.data) || {};
  u.id = String(uid);
  u.balance = row.balance;
  return u;
}
function userPut(db, u) {
  const bal = Math.round(Number(u.balance) || 0);
  db.prepare(`INSERT INTO users(id,balance,ts,data) VALUES(?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET balance=excluded.balance, ts=excluded.ts, data=excluded.data`)
    .run(String(u.id), bal, Date.now(), j(Object.assign({}, u, { balance: bal })));
}
function usersAll(db) {
  return db.prepare("SELECT id, balance, data FROM users ORDER BY balance DESC").all()
    .map(r => Object.assign(p(r.data) || {}, { id: r.id, balance: r.balance }));
}
function usersCount(db) {
  return db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
}

/* ---------- orders ---------- */
function orderPut(db, o) {
  db.prepare(`INSERT INTO orders(id,seq,uid,status,ts,data) VALUES(?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET seq=excluded.seq, uid=excluded.uid,
                                            status=excluded.status, ts=excluded.ts, data=excluded.data`)
    .run(String(o.id), Number(o.seq || 0), String(o.uid || ""), String(o.status || "new"),
         Number(o.ts || Date.now()), j(o));
}
function orderGet(db, id) {
  const row = db.prepare("SELECT data FROM orders WHERE id = ?").get(String(id));
  return row ? p(row.data) : null;
}
function ordersByUser(db, uid, limit) {
  return db.prepare("SELECT data FROM orders WHERE uid = ? ORDER BY ts DESC LIMIT ?")
    .all(String(uid), Number(limit || 60)).map(r => p(r.data)).filter(Boolean);
}
function ordersByStatus(db, status, limit) {
  const sql = status
    ? "SELECT data FROM orders WHERE status = ? ORDER BY ts DESC LIMIT ?"
    : "SELECT data FROM orders ORDER BY ts DESC LIMIT ?";
  const rows = status ? db.prepare(sql).all(status, Number(limit || 200)) : db.prepare(sql).all(Number(limit || 200));
  return rows.map(r => p(r.data)).filter(Boolean);
}
function ordersSince(db, sinceTs) {
  return db.prepare("SELECT data FROM orders WHERE ts >= ? ORDER BY ts DESC").all(Number(sinceTs))
    .map(r => p(r.data)).filter(Boolean);
}
function nextOrderSeq(db) {
  const row = db.prepare("SELECT MAX(seq) AS m FROM orders").get();
  return (Number(row && row.m) || 0) + 1;
}

/* ---------- payments ---------- */
function paymentPut(db, pm) {
  db.prepare(`INSERT INTO payments(id,uid,status,amount,ts,data) VALUES(?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET uid=excluded.uid, status=excluded.status,
                                            amount=excluded.amount, ts=excluded.ts, data=excluded.data`)
    .run(String(pm.id), String(pm.uid || ""), String(pm.status || "pending"),
         Number(pm.amount || 0), Number(pm.ts || Date.now()), j(pm));
}
function paymentGet(db, id) {
  const row = db.prepare("SELECT data FROM payments WHERE id = ?").get(String(id));
  return row ? p(row.data) : null;
}
function paymentsByUser(db, uid, limit) {
  return db.prepare("SELECT data FROM payments WHERE uid = ? ORDER BY ts DESC LIMIT ?")
    .all(String(uid), Number(limit || 40)).map(r => p(r.data)).filter(Boolean);
}
function paymentsByStatus(db, status, limit) {
  return db.prepare("SELECT data FROM payments WHERE status = ? ORDER BY ts DESC LIMIT ?")
    .all(status, Number(limit || 200)).map(r => p(r.data)).filter(Boolean);
}
// Kutilayotgan to'lovlar orasidan aynan shu summani qidiradi (SMS avtomatik tasdiqlash uchun).
function pendingPaymentByAmount(db, amount) {
  const row = db.prepare("SELECT data FROM payments WHERE status = 'pending' AND amount = ? ORDER BY ts ASC LIMIT 1")
    .get(Number(amount));
  return row ? p(row.data) : null;
}
function pendingAmountsSet(db) {
  return new Set(db.prepare("SELECT amount FROM payments WHERE status = 'pending'").all().map(r => r.amount));
}
function paymentsExpire(db, olderThanTs) {
  const rows = db.prepare("SELECT data FROM payments WHERE status = 'pending' AND ts < ?").all(Number(olderThanTs));
  const list = rows.map(r => p(r.data)).filter(Boolean);
  list.forEach(pm => { pm.status = "expired"; paymentPut(db, pm); });
  return list;
}

/* ---------- promos ---------- */
function promosAll(db) {
  return db.prepare("SELECT data FROM promos ORDER BY rowid DESC").all().map(r => p(r.data)).filter(Boolean);
}
function promoGet(db, code) {
  const row = db.prepare("SELECT data FROM promos WHERE code = ?").get(String(code).toUpperCase());
  return row ? p(row.data) : null;
}
function promoPut(db, pr) {
  pr.code = String(pr.code).toUpperCase();
  db.prepare(`INSERT INTO promos(code,active,data) VALUES(?,?,?)
              ON CONFLICT(code) DO UPDATE SET active=excluded.active, data=excluded.data`)
    .run(pr.code, pr.active === false ? 0 : 1, j(pr));
}
function promoDelete(db, code) {
  db.prepare("DELETE FROM promos WHERE code = ?").run(String(code).toUpperCase());
}

/* ---------- reviews ---------- */
function reviewPut(db, r) {
  db.prepare(`INSERT INTO reviews(id,orderId,uid,ts,data) VALUES(?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET data=excluded.data`)
    .run(String(r.id), String(r.orderId || ""), String(r.uid || ""), Number(r.ts || Date.now()), j(r));
}
function reviewsAll(db, limit) {
  return db.prepare("SELECT data FROM reviews ORDER BY ts DESC LIMIT ?").all(Number(limit || 50))
    .map(r => p(r.data)).filter(Boolean);
}
function reviewedOrderIds(db, uid) {
  return new Set(db.prepare("SELECT orderId FROM reviews WHERE uid = ?").all(String(uid)).map(r => r.orderId));
}

module.exports = {
  openDb,
  setGet, setPut,
  productsAll, productGet, productPut, productDelete, productsReplaceAll,
  userGet, userPut, usersAll, usersCount,
  orderPut, orderGet, ordersByUser, ordersByStatus, ordersSince, nextOrderSeq,
  paymentPut, paymentGet, paymentsByUser, paymentsByStatus,
  pendingPaymentByAmount, pendingAmountsSet, paymentsExpire,
  promosAll, promoGet, promoPut, promoDelete,
  reviewPut, reviewsAll, reviewedOrderIds
};
