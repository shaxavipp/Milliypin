/* test/run.js — tashqi kutubxonasiz integratsion testlar.
   Ishga tushirish: npm test
   Server vaqtinchalik DATA_DIR bilan ko'tariladi, initData imzosi sinov tokeni
   bilan yasaladi — ya'ni haqiqiy Telegram kerak emas. */
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BOT_TOKEN = "123456:TEST-TOKEN-FOR-MILLIYPIN";
const ADMIN_ID = 111111;
const USER_ID = 222222;
const REF_ID = 333333;
const PORT = 4123 + Math.floor(Math.random() * 400);

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "milliypin-test-"));
process.env.DATA_DIR = DATA_DIR;
process.env.BOT_TOKEN = BOT_TOKEN;
process.env.ADMIN_IDS = String(ADMIN_ID);
process.env.PORT = String(PORT);
const WH_SECRET = "test-webhook-secret";
process.env.TG_WEBHOOK_SECRET = WH_SECRET;

const app = require("../server.js");

/* ---------- yordamchilar ---------- */

let passed = 0, failed = 0;
async function it(name, fn) {
  try { await fn(); passed++; console.log("  ✅ " + name); }
  catch (e) { failed++; console.log("  ❌ " + name + "\n     " + (e && e.message)); }
}
function group(name) { console.log("\n▌ " + name); }

function initDataFor(user) {
  const params = new URLSearchParams({
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AAA"
  });
  const dcs = [...params.entries()].map(([k, v]) => k + "=" + v).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  params.set("hash", crypto.createHmac("sha256", secret).update(dcs).digest("hex"));
  return params.toString();
}

const ADMIN = { id: ADMIN_ID, first_name: "Admin", username: "adm" };
const USER = { id: USER_ID, first_name: "Doniyor", username: "doniyor" };
const FRIEND = { id: REF_ID, first_name: "Sardor", username: "sardor" };

async function call(pathname, opts) {
  opts = opts || {};
  const headers = {};
  if (opts.as) headers["X-Init-Data"] = initDataFor(opts.as);
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch("http://127.0.0.1:" + PORT + pathname, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  return { status: r.status, data };
}

// Telegram webhook'iga update yuborish (sekret sarlavhasi bilan yoki busiz)
async function webhook(update, secret) {
  const headers = { "Content-Type": "application/json" };
  if (secret !== null) headers["x-telegram-bot-api-secret-token"] = secret || WH_SECRET;
  const r = await fetch("http://127.0.0.1:" + PORT + "/tg/webhook", {
    method: "POST", headers, body: JSON.stringify(update)
  });
  await r.text();
  await new Promise(res => setTimeout(res, 60)); // ishlov tugasin
  return r.status;
}
const cbq = (from, data) => ({
  callback_query: { id: "cb" + Date.now(), from, data, message: { message_id: 1, chat: { id: -100123 } } }
});

/* ---------- soxta provayder sayti ----------
   Perfect Panel standartini taqlid qiladi: add / status / balance / services. */
const http = require("http");
const PROV_PORT = PORT + 700;
const provState = { orders: {}, next: 1000, lastAdd: null };
const provServer = http.createServer((req, res) => {
  let body = "";
  req.on("data", c => body += c);
  req.on("end", () => {
    const q = new URLSearchParams(body);
    const action = q.get("action");
    const reply = o => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (q.get("key") !== "PROV-KEY") return reply({ error: "Incorrect API key" });
    if (action === "balance") return reply({ balance: "42.50", currency: "USD" });
    if (action === "services") return reply([
      { service: "77", name: "PUBG UC 60", category: "Games", rate: "1.20", min: 1, max: 100 },
      { service: "88", name: "Telegram Premium", category: "Telegram", rate: "5.00", min: 1, max: 10 }
    ]);
    if (action === "add") {
      if (q.get("service") === "999") return reply({ error: "Service not found" });
      const id = String(provState.next++);
      provState.orders[id] = { status: "Pending", remains: q.get("quantity") };
      provState.lastAdd = { service: q.get("service"), link: q.get("link"), quantity: q.get("quantity") };
      return reply({ order: Number(id) });
    }
    if (action === "status") {
      const out = {};
      String(q.get("orders") || "").split(",").forEach(id => {
        out[id] = provState.orders[id] || { error: "Incorrect order ID" };
      });
      return reply(out);
    }
    reply({ error: "unknown action" });
  });
});
provServer.listen(PROV_PORT, "127.0.0.1");
const PROV_URL = "http://127.0.0.1:" + PROV_PORT + "/api/v2";

/* ---------- testlar ---------- */

async function main() {
  await new Promise(res => setTimeout(res, 350)); // server tinglashni boshlasin

  group("Imzo (initData) tekshiruvi");
  await it("to'g'ri imzo qabul qilinadi", () => {
    const r = app.checkInitData(initDataFor(USER));
    assert.strictEqual(r.reason, "ok");
    assert.strictEqual(r.user.id, USER_ID);
  });
  await it("buzilgan imzo rad etiladi", () => {
    const bad = initDataFor(USER).replace(/hash=[0-9a-f]+/, "hash=" + "0".repeat(64));
    assert.strictEqual(app.checkInitData(bad).reason, "auth");
  });
  await it("bo'sh initData rad etiladi", () => {
    assert.strictEqual(app.checkInitData("").reason, "auth");
  });
  await it("eski auth_date 'expired' beradi", () => {
    const params = new URLSearchParams({
      user: JSON.stringify(USER),
      auth_date: String(Math.floor(Date.now() / 1000) - 48 * 3600)
    });
    const dcs = [...params.entries()].map(([k, v]) => k + "=" + v).sort().join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    params.set("hash", crypto.createHmac("sha256", secret).update(dcs).digest("hex"));
    assert.strictEqual(app.checkInitData(params.toString()).reason, "expired");
  });

  group("SMS summasini o'qish");
  await it("so'mli xabardan summa olinadi", () => {
    assert.strictEqual(app.parseSmsAmount("HUMO: 50 137 so'm kirim. Balans 1 200 000"), 50137);
  });
  await it("UZS formatidagi summa olinadi", () => {
    assert.strictEqual(app.parseSmsAmount("Popolnenie 100000.00 UZS"), 100000);
  });
  await it("juda kichik summa e'tiborsiz qoldiriladi", () => {
    assert.strictEqual(app.parseSmsAmount("kod: 123"), 0);
  });

  group("Ochiq API");
  await it("/api/config javob beradi", async () => {
    const r = await call("/api/config");
    assert.strictEqual(r.status, 200);
    assert.ok(r.data.cards.length > 0);
    assert.strictEqual(r.data.brand, "Milliy Pin");
  });
  await it("katalogda faqat telegram va o'yin bo'limlari bor", async () => {
    const r = await call("/api/catalog");
    assert.strictEqual(r.status, 200);
    assert.ok(r.data.length >= 10, "katalog bo'sh");
    const cats = new Set(r.data.map(x => x.category));
    assert.deepStrictEqual([...cats].sort(), ["game", "telegram"]);
  });
  await it("har bir mahsulotda kamida bitta paket bor", async () => {
    const r = await call("/api/catalog");
    r.data.forEach(i => assert.ok(i.tiers.length > 0, i.id + " paketsiz"));
  });

  group("Ruxsat");
  await it("imzosiz /api/me — 401", async () => {
    assert.strictEqual((await call("/api/me")).status, 401);
  });
  await it("oddiy foydalanuvchi admin API'ga kira olmaydi", async () => {
    assert.strictEqual((await call("/api/admin/overview", { as: USER })).status, 403);
  });
  await it("admin admin API'ga kiradi", async () => {
    assert.strictEqual((await call("/api/admin/overview", { as: ADMIN })).status, 200);
  });

  group("Balansni to'ldirish");
  let payment = null;
  await it("foydalanuvchi ro'yxatdan o'tadi, balans 0", async () => {
    const r = await call("/api/me", { as: USER });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.balance, 0);
  });
  await it("juda kichik summa rad etiladi", async () => {
    const r = await call("/api/topup", { as: USER, body: { amount: 100 } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.data.error, "min_topup");
  });
  await it("to'lov so'rovi betakror summa bilan yaratiladi", async () => {
    const r = await call("/api/topup", { as: USER, body: { amount: 100000 } });
    assert.strictEqual(r.status, 200);
    payment = r.data;
    assert.strictEqual(payment.base, 100000);
    assert.ok(payment.amount >= 100000 && payment.amount < 100900);
    assert.strictEqual(payment.status, "pending");
  });
  await it("ikkinchi to'lov boshqa summa oladi", async () => {
    const r = await call("/api/topup", { as: USER, body: { amount: 100000 } });
    assert.strictEqual(r.status, 200);
    assert.notStrictEqual(r.data.amount, payment.amount);
    await call("/api/topup/cancel", { as: USER, body: { id: r.data.id } });
  });
  await it("boshqa foydalanuvchi to'lovni bekor qila olmaydi", async () => {
    const r = await call("/api/topup/cancel", { as: FRIEND, body: { id: payment.id } });
    assert.strictEqual(r.status, 404);
  });
  await it("admin tasdiqlagach balansga ASOSIY summa tushadi", async () => {
    const r = await call("/api/admin/payment", { as: ADMIN, body: { id: payment.id, action: "confirm" } });
    assert.strictEqual(r.status, 200);
    const me = await call("/api/me", { as: USER });
    assert.strictEqual(me.data.balance, 100000);
  });
  await it("bir to'lov ikki marta tasdiqlanmaydi", async () => {
    const r = await call("/api/admin/payment", { as: ADMIN, body: { id: payment.id, action: "confirm" } });
    assert.strictEqual(r.status, 400);
    const me = await call("/api/me", { as: USER });
    assert.strictEqual(me.data.balance, 100000);
  });

  group("Buyurtma");
  let catalog = (await call("/api/catalog")).data;
  const stars = catalog.find(x => x.id === "tg-stars");
  const cheap = stars.tiers.find(x => x.price <= 30000) || stars.tiers[0];
  let order = null;

  await it("ma'lumot bo'sh bo'lsa buyurtma rad etiladi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "" } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.data.error, "target_required");
  });
  await it("mavjud bo'lmagan paket rad etiladi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: "yo-q", target: "@doniyor" } });
    assert.strictEqual(r.status, 404);
  });
  await it("buyurtma balansdan yechadi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    assert.strictEqual(r.status, 200);
    order = r.data.order;
    assert.strictEqual(order.total, cheap.price);
    assert.strictEqual(r.data.balance, 100000 - cheap.price);
  });
  await it("balans yetmasa buyurtma o'tmaydi", async () => {
    const dear = catalog.flatMap(i => i.tiers.map(x => ({ i, x })))
      .sort((a, b) => b.x.price - a.x.price)[0];
    const r = await call("/api/order", { as: USER, body: { itemId: dear.i.id, tierId: dear.x.id, target: "12345" } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.data.error, "insufficient");
  });
  await it("bekor qilinganda pul qaytadi", async () => {
    const before = (await call("/api/me", { as: USER })).data.balance;
    const r2 = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    const o2 = r2.data.order;
    await call("/api/admin/order", { as: ADMIN, body: { id: o2.id, action: "cancel", note: "test" } });
    const after = (await call("/api/me", { as: USER })).data.balance;
    assert.strictEqual(after, before);
  });
  await it("bajarilgan buyurtma 'spent' ga qo'shiladi", async () => {
    const r = await call("/api/admin/order", { as: ADMIN, body: { id: order.id, action: "done" } });
    assert.strictEqual(r.status, 200);
    const me = await call("/api/me", { as: USER });
    assert.ok(me.data.spent >= cheap.price);
    assert.strictEqual(me.data.orders.find(o => o.id === order.id).status, "done");
  });
  await it("bajarilgan buyurtma qayta bajarilmaydi", async () => {
    const r = await call("/api/admin/order", { as: ADMIN, body: { id: order.id, action: "done" } });
    assert.strictEqual(r.status, 400);
  });

  group("Promokod");
  await it("admin promokod yaratadi", async () => {
    const r = await call("/api/admin/promo", {
      as: ADMIN, body: { action: "save", code: "milliy10", type: "percent", value: 10, perUserLimit: 1 }
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.promo.code, "MILLIY10");
  });
  await it("promokod chegirmani hisoblaydi", async () => {
    const r = await call("/api/promo/check", { as: USER, body: { code: "MILLIY10", subtotal: 50000 } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.discount, 5000);
  });
  await it("noma'lum promokod rad etiladi", async () => {
    const r = await call("/api/promo/check", { as: USER, body: { code: "YOQ", subtotal: 50000 } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.data.error, "promo_not_found");
  });
  await it("promokod buyurtmada bir marta ishlaydi", async () => {
    await call("/api/admin/payment", { as: ADMIN, body: { id: "x", action: "confirm" } }); // shovqin
    const top = await call("/api/topup", { as: USER, body: { amount: 200000 } });
    await call("/api/admin/payment", { as: ADMIN, body: { id: top.data.id, action: "confirm" } });

    const first = await call("/api/order", {
      as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor", promo: "MILLIY10" }
    });
    assert.strictEqual(first.status, 200);
    assert.strictEqual(first.data.order.discount, Math.floor(cheap.price * 0.1));

    const second = await call("/api/order", {
      as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor", promo: "MILLIY10" }
    });
    assert.strictEqual(second.status, 400);
    assert.strictEqual(second.data.error, "promo_already_used");
  });

  group("Sharh");
  await it("faqat bajarilgan buyurtmani baholash mumkin", async () => {
    const r = await call("/api/review", { as: USER, body: { orderId: order.id, stars: 5, text: "Zo'r!" } });
    assert.strictEqual(r.status, 200);
    const again = await call("/api/review", { as: USER, body: { orderId: order.id, stars: 5 } });
    assert.strictEqual(again.status, 400);
    const list = await call("/api/reviews");
    assert.ok(list.data.items.some(x => x.text === "Zo'r!"));
    assert.ok(list.data.count >= 1);
    assert.ok(list.data.average > 0 && list.data.average <= 5);
  });

  group("Admin katalog boshqaruvi");
  await it("katalogni nashr qilish ishlaydi", async () => {
    const cur = (await call("/api/admin/catalog", { as: ADMIN })).data;
    cur[0].group = "Sinov guruhi";
    const r = await call("/api/admin/catalog", { as: ADMIN, body: { items: cur } });
    assert.strictEqual(r.status, 200);
    const pub = (await call("/api/catalog")).data;
    assert.strictEqual(pub[0].group, "Sinov guruhi");
  });
  await it("oddiy foydalanuvchi katalogni o'zgartira olmaydi", async () => {
    const r = await call("/api/admin/catalog", { as: USER, body: { items: [] } });
    assert.strictEqual(r.status, 403);
    assert.ok((await call("/api/catalog")).data.length > 0);
  });
  await it("noaktiv mahsulot ochiq katalogda ko'rinmaydi", async () => {
    const cur = (await call("/api/admin/catalog", { as: ADMIN })).data;
    cur[0].active = false;
    const hiddenId = cur[0].id;
    await call("/api/admin/catalog", { as: ADMIN, body: { items: cur } });
    const pub = (await call("/api/catalog")).data;
    assert.ok(!pub.some(x => x.id === hiddenId));
    cur[0].active = true;
    await call("/api/admin/catalog", { as: ADMIN, body: { items: cur } });
  });

  group("Sozlamalar va sodiqlik");
  await it("sozlamalar saqlanadi", async () => {
    const r = await call("/api/admin/settings", {
      as: ADMIN, body: { shop: { brand: "Milliy Pin", supportUsername: "@mp_help", workHours: "10:00 – 22:00" } }
    });
    assert.strictEqual(r.status, 200);
    const c = await call("/api/config");
    assert.strictEqual(c.data.support, "mp_help");
    assert.strictEqual(c.data.workHours, "10:00 – 22:00");
  });
  await it("sodiqlik darajasi sarflangan summaga qarab hisoblanadi", () => {
    assert.strictEqual(app.loyaltyTier(0).current.name, "Chinnigul");
    assert.strictEqual(app.loyaltyTier(600000).current.name, "Zargar");
    assert.strictEqual(app.loyaltyTier(9000000).current.name, "Sohibqiron");
    assert.strictEqual(app.loyaltyTier(9000000).next, null);
  });


  group("Yangi ochiq API'lar");
  await it("/api/promos faqat ochiq va amaldagi kodlarni beradi", async () => {
    await call("/api/admin/promo", {
      as: ADMIN, body: { action: "save", code: "YOPIQ", type: "percent", value: 5, public: false }
    });
    const r = await call("/api/promos");
    assert.strictEqual(r.status, 200);
    assert.ok(r.data.some(x => x.code === "MILLIY10"), "ochiq kod ko'rinmadi");
    assert.ok(!r.data.some(x => x.code === "YOPIQ"), "yopiq kod ko'rinib qoldi");
    assert.ok(!("usedBy" in (r.data[0] || {})), "ichki maydon sizib chiqdi");
  });
  await it("/api/leaderboard tartiblaydi va ID chiqarmaydi", async () => {
    const r = await call("/api/leaderboard");
    assert.strictEqual(r.status, 200);
    const list = r.data.leaderboard;
    assert.ok(list.length >= 1, "reyting bo'sh");
    assert.strictEqual(list[0].rank, 1);
    assert.ok(!("uid" in list[0]) && !("id" in list[0]), "foydalanuvchi ID si ochiq chiqdi");
    assert.ok(list[0].count >= 1, "buyurtmalar soni yo'q");
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].total >= list[i].total);
  });
  await it("reytingda davr filtri ishlaydi", async () => {
    const all = await call("/api/leaderboard?period=all");
    const today = await call("/api/leaderboard?period=today");
    assert.strictEqual(today.data.period, "today");
    assert.ok(all.data.leaderboard.length >= today.data.leaderboard.length);
    const bad = await call("/api/leaderboard?period=hack");
    assert.strictEqual(bad.data.period, "all", "noma'lum davr 'all' ga tushishi kerak");
  });
  await it("imzo bilan reytingda o'z o'rni qaytadi", async () => {
    const anon = await call("/api/leaderboard");
    assert.strictEqual(anon.data.me, null);
    const mine = await call("/api/leaderboard", { as: USER });
    assert.ok(mine.data.me, "me bo'limi yo'q");
    assert.ok(mine.data.me.rank >= 1);
    assert.ok(mine.data.me.total > 0);
  });
  await it("admin statistikasi davr bo'yicha hisoblanadi", async () => {
    const r = await call("/api/admin/overview?period=month", { as: ADMIN });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.period, "month");
    assert.ok(r.data.users >= 1);
    assert.ok(r.data.revenue >= 0 && r.data.balances >= 0);
  });
  await it("moliya ekrani kutayotgan to'lov va buyurtmalarni beradi", async () => {
    const r = await call("/api/admin/money", { as: ADMIN });
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.data.payments) && Array.isArray(r.data.orders));
    assert.strictEqual((await call("/api/admin/money", { as: USER })).status, 403);
  });
  await it("mijoz tarixi to'liq qaytadi", async () => {
    const r = await call("/api/admin/history?id=" + USER_ID, { as: ADMIN });
    assert.strictEqual(r.status, 200);
    assert.ok(r.data.orders.length >= 1);
    assert.ok(r.data.payments.length >= 1);
    assert.strictEqual((await call("/api/admin/history?id=999999", { as: ADMIN })).status, 404);
  });
  await it("bildirishnomani o'chirish va yoqish saqlanadi", async () => {
    let r = await call("/api/notif", { as: USER, body: { enabled: false } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await call("/api/me", { as: USER })).data.notifEnabled, false);
    await call("/api/notif", { as: USER, body: { enabled: true } });
    assert.strictEqual((await call("/api/me", { as: USER })).data.notifEnabled, true);
  });
  await it("sharhlarni admin ko'radi va o'chiradi", async () => {
    const list = await call("/api/admin/reviews", { as: ADMIN });
    assert.strictEqual(list.status, 200);
    assert.ok(list.data.length >= 1, "sharh ro'yxati bo'sh");
    const id = list.data[0].id;

    assert.strictEqual((await call("/api/admin/reviews", { as: USER })).status, 403);

    const del = await call("/api/admin/review", { as: ADMIN, body: { action: "delete", id } });
    assert.strictEqual(del.status, 200);
    const after = await call("/api/admin/reviews", { as: ADMIN });
    assert.ok(!after.data.some(x => x.id === id), "sharh o'chmadi");

    const bad = await call("/api/admin/review", { as: ADMIN, body: { action: "hack", id } });
    assert.strictEqual(bad.status, 400);
  });
  await it("texnik ishdagi mahsulotni sotib bo'lmaydi", async () => {
    const cur = (await call("/api/admin/catalog", { as: ADMIN })).data;
    const target = cur.find(x => x.id === "tg-stars");
    target.maint = true;
    await call("/api/admin/catalog", { as: ADMIN, body: { items: cur } });

    const pub = (await call("/api/catalog")).data.find(x => x.id === "tg-stars");
    assert.strictEqual(pub.maint, true, "maint bayrog'i katalogda yo'q");

    const r = await call("/api/order", {
      as: USER, body: { itemId: "tg-stars", tierId: cheap.id, target: "@doniyor" }
    });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.data.error, "maintenance");

    target.maint = false;
    await call("/api/admin/catalog", { as: ADMIN, body: { items: cur } });
  });


  group("Tuzatilgan kamchiliklar");
  await it("'To'lov qildim' bosilgan to'lov avtomatik o'chmaydi", async () => {
    const top = await call("/api/topup", { as: FRIEND, body: { amount: 60000 } });
    assert.strictEqual(top.status, 200);
    await call("/api/topup/paid", { as: FRIEND, body: { id: top.data.id } });

    // muddatni o'tkazib yuboramiz — claimedAt bo'lgani uchun baribir kutib turishi kerak
    const store = app.store, db = app.db;
    const p = store.paymentGet(db, top.data.id);
    p.expiresAt = Date.now() - 60000;
    store.paymentPut(db, p);

    const list = await call("/api/admin/payments?status=pending", { as: ADMIN });
    assert.ok(list.data.some(x => x.id === top.data.id), "to'lov ro'yxatdan yo'qoldi");
    assert.strictEqual(store.paymentGet(db, top.data.id).status, "pending");
    await call("/api/admin/payment", { as: ADMIN, body: { id: top.data.id, action: "reject" } });
  });
  await it("bosilmagan to'lov muddati o'tsa expired bo'ladi", async () => {
    const top = await call("/api/topup", { as: FRIEND, body: { amount: 61000 } });
    const store = app.store, db = app.db;
    const p = store.paymentGet(db, top.data.id);
    p.expiresAt = Date.now() - 60000;
    store.paymentPut(db, p);

    await call("/api/admin/payments?status=pending", { as: ADMIN }); // expirePending ishga tushadi
    assert.strictEqual(store.paymentGet(db, top.data.id).status, "expired");
  });
  await it("bajarilgan buyurtma bekor qilinmaydi", async () => {
    const r = await call("/api/admin/order", { as: ADMIN, body: { id: order.id, action: "cancel" } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.data.error, "already_done");
    const me = await call("/api/me", { as: USER });
    assert.strictEqual(me.data.orders.find(o => o.id === order.id).status, "done");
  });
  await it("bloklangan mijoz balans to'ldira olmaydi", async () => {
    await call("/api/admin/user", { as: ADMIN, body: { id: String(REF_ID), action: "block", blocked: true } });
    const r = await call("/api/topup", { as: FRIEND, body: { amount: 50000 } });
    assert.strictEqual(r.status, 403);
    assert.strictEqual(r.data.error, "blocked");
    await call("/api/admin/user", { as: ADMIN, body: { id: String(REF_ID), action: "block", blocked: false } });
  });
  await it("admin havolasida faqat http(s) va tg sxemasi saqlanadi", async () => {
    await call("/api/admin/settings", {
      as: ADMIN,
      body: {
        shop: { brand: "Milliy Pin", channelUrl: "javascript:alert(1)", reviewsUrl: "https://t.me/ok" },
        socials: [{ icon: "send", title: "TG", url: "javascript:alert(2)" }]
      }
    });
    const c = await call("/api/config");
    assert.strictEqual(c.data.channelUrl, "", "xavfli sxema o'tib ketdi");
    assert.strictEqual(c.data.reviewsUrl, "https://t.me/ok");
    assert.strictEqual(c.data.socials.length, 0, "xavfli havolali tarmoq qoldi");
  });

  group("Telegramdagi admin tugmalari");
  await it("sekretsiz kelgan webhook rad etiladi", async () => {
    const st = await webhook(cbq(ADMIN, "o:done:xxx"), "boshqa-sekret");
    assert.strictEqual(st, 403);
  });
  await it("admin tugmasi buyurtmani bajarilgan qiladi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    assert.strictEqual(r.status, 200);
    const id = r.data.order.id;
    assert.strictEqual(await webhook(cbq(ADMIN, "o:proc:" + id)), 200);
    assert.strictEqual(app.store.orderGet(app.db, id).status, "processing");
    assert.strictEqual(await webhook(cbq(ADMIN, "o:done:" + id)), 200);
    assert.strictEqual(app.store.orderGet(app.db, id).status, "done");
  });
  await it("admin bo'lmagan odam tugmani bossa holat o'zgarmaydi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    const id = r.data.order.id;
    await webhook(cbq(USER, "o:done:" + id));
    assert.strictEqual(app.store.orderGet(app.db, id).status, "new");
    await call("/api/admin/order", { as: ADMIN, body: { id, action: "cancel", note: "tozalash" } });
  });
  await it("bekor qilish ikki bosqichli: birinchi bosishda holat saqlanadi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    const id = r.data.order.id;
    await webhook(cbq(ADMIN, "o:cancel:" + id));
    assert.strictEqual(app.store.orderGet(app.db, id).status, "new", "birinchi bosishda bekor bo'lib ketdi");
    await webhook(cbq(ADMIN, "o:cancelY:" + id));
    assert.strictEqual(app.store.orderGet(app.db, id).status, "canceled");
  });
  await it("to'lov tugmasi balansni to'ldiradi", async () => {
    const top = await call("/api/topup", { as: USER, body: { amount: 70000 } });
    const before = (await call("/api/me", { as: USER })).data.balance;
    await webhook(cbq(ADMIN, "p:ok:" + top.data.id));
    assert.strictEqual(app.store.paymentGet(app.db, top.data.id).status, "confirmed");
    const after = (await call("/api/me", { as: USER })).data.balance;
    assert.strictEqual(after, before + 70000);
  });

  group("Admin — mijozga xabar va izoh");
  await it("bo'sh xabar rad etiladi", async () => {
    const r = await call("/api/admin/user", { as: ADMIN, body: { id: String(USER_ID), action: "message", text: "  " } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.data.error, "text_required");
  });
  await it("mijozga xabar yuboriladi", async () => {
    const r = await call("/api/admin/user", { as: ADMIN, body: { id: String(USER_ID), action: "message", text: "Salom" } });
    assert.strictEqual(r.status, 200);
  });
  await it("bajarilgan buyurtmaning izohi saqlanadi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    const id = r.data.order.id;
    await call("/api/admin/order", { as: ADMIN, body: { id, action: "done", note: "kod 4821" } });
    assert.strictEqual(app.store.orderGet(app.db, id).note, "kod 4821");
  });
  await it("mijoz bo'lmagan ID rad etiladi", async () => {
    const r = await call("/api/admin/user", { as: ADMIN, body: { id: "999999999", action: "message", text: "x" } });
    assert.strictEqual(r.status, 404);
  });

  group("Rasm yuklash va paket maydonlari");
  // 1x1 piksellik haqiqiy JPEG (base64)
  const TINY_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
  let imgUrl = "";
  await it("admin rasm yuklaydi va qisqa manzil qaytadi", async () => {
    const r = await call("/api/admin/upload", { as: ADMIN, body: { data: TINY_JPEG } });
    assert.strictEqual(r.status, 200);
    assert.ok(/^\/img\/[a-f0-9]+\.jpg$/.test(r.data.url), "manzil noto'g'ri: " + r.data.url);
    imgUrl = r.data.url;
  });
  await it("yuklangan rasm ochiladi", async () => {
    const res = await fetch("http://127.0.0.1:" + PORT + imgUrl);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("content-type"), "image/jpeg");
  });
  await it("rasm bo'lmagan ma'lumot rad etiladi", async () => {
    const r = await call("/api/admin/upload", { as: ADMIN, body: { data: "javascript:alert(1)" } });
    assert.strictEqual(r.status, 400);
  });
  await it("oddiy mijoz rasm yuklay olmaydi", async () => {
    const r = await call("/api/admin/upload", { as: USER, body: { data: TINY_JPEG } });
    assert.strictEqual(r.status, 403);
  });
  await it("paketning bo'limi va rasmi saqlanadi", async () => {
    const list = (await call("/api/admin/catalog", { as: ADMIN })).data;
    const item = list.find(x => x.id === "tg-stars");
    item.tiers[0].cat = "Yulduz";
    item.tiers[0].image = imgUrl;
    item.tiers[0].badge = "TOP";
    const r = await call("/api/admin/catalog", { as: ADMIN, body: { items: list } });
    assert.strictEqual(r.status, 200);
    const pub = (await call("/api/catalog")).data.find(x => x.id === "tg-stars");
    assert.strictEqual(pub.tiers[0].cat, "Yulduz");
    assert.strictEqual(pub.tiers[0].image, imgUrl);
  });
  await it("xavfli rasm manzili katalogga tushmaydi", async () => {
    const list = (await call("/api/admin/catalog", { as: ADMIN })).data;
    const item = list.find(x => x.id === "tg-stars");
    item.cover = "javascript:alert(1)";
    item.tiers[0].image = "data:text/html,<script>";
    await call("/api/admin/catalog", { as: ADMIN, body: { items: list } });
    const pub = (await call("/api/catalog")).data.find(x => x.id === "tg-stars");
    assert.strictEqual(pub.cover, "");
    assert.strictEqual(pub.tiers[0].image, "");
  });
  await it("katalogda mahsulot bahosi va sharh soni bo'ladi", async () => {
    const pub = (await call("/api/catalog")).data[0];
    assert.ok(typeof pub.revN === "number");
    assert.ok(typeof pub.revAvg === "number");
  });
  await it("admin sharhni tahrirlaydi", async () => {
    const all = (await call("/api/admin/reviews", { as: ADMIN })).data;
    if (!all.length) return;
    const r = await call("/api/admin/review", {
      as: ADMIN, body: { action: "edit", id: all[0].id, stars: 4, text: "tahrirlandi" }
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.review.stars, 4);
    assert.strictEqual(r.data.review.text, "tahrirlandi");
  });

  group("Mijoz buyurtmani bekor qiladi");
  await it("yangi buyurtma bekor qilinadi va pul qaytadi", async () => {
    const before = (await call("/api/me", { as: USER })).data.balance;
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    const id = r.data.order.id;
    const c = await call("/api/order/cancel", { as: USER, body: { id } });
    assert.strictEqual(c.status, 200);
    assert.strictEqual(app.store.orderGet(app.db, id).status, "canceled");
    const after = (await call("/api/me", { as: USER })).data.balance;
    assert.strictEqual(after, before);
  });
  await it("ishga olingan buyurtmani mijoz bekor qila olmaydi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    const id = r.data.order.id;
    await call("/api/admin/order", { as: ADMIN, body: { id, action: "processing" } });
    const c = await call("/api/order/cancel", { as: USER, body: { id } });
    assert.strictEqual(c.status, 400);
    assert.strictEqual(c.data.error, "too_late");
    await call("/api/admin/order", { as: ADMIN, body: { id, action: "cancel", note: "tozalash" } });
  });
  await it("boshqa mijozning buyurtmasi bekor qilinmaydi", async () => {
    const r = await call("/api/order", { as: USER, body: { itemId: stars.id, tierId: cheap.id, target: "@doniyor" } });
    const c = await call("/api/order/cancel", { as: FRIEND, body: { id: r.data.order.id } });
    assert.strictEqual(c.status, 404);
    await call("/api/order/cancel", { as: USER, body: { id: r.data.order.id } });
  });

  group("Tashqi provayder (avtomatika)");
  let provId = "";
  await it("provayder saqlanadi va kalit niqoblanadi", async () => {
    const r = await call("/api/admin/providers", {
      as: ADMIN,
      body: { items: [{ name: "Test panel", kind: "smm", url: PROV_URL, key: "PROV-KEY", active: true }] }
    });
    assert.strictEqual(r.status, 200);
    const list = (await call("/api/admin/providers", { as: ADMIN })).data;
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].keyMask, "••••-KEY");
    assert.ok(!("key" in list[0]), "API kalit javobda ochiq ketdi");
    provId = list[0].id;
  });
  await it("balans va xizmatlar ro'yxati olinadi", async () => {
    const b = await call("/api/admin/provider-balance?id=" + provId, { as: ADMIN });
    assert.strictEqual(b.status, 200);
    assert.strictEqual(b.data.balance, 42.5);
    const s2 = await call("/api/admin/provider-services?id=" + provId + "&q=pubg", { as: ADMIN });
    assert.strictEqual(s2.data.count, 2);
    assert.strictEqual(s2.data.items.length, 1);
    assert.strictEqual(s2.data.items[0].service, "77");
  });
  await it("kalitni qayta yozmasdan tahrirlash mumkin", async () => {
    const list = (await call("/api/admin/providers", { as: ADMIN })).data;
    list[0].name = "Panel 2";
    await call("/api/admin/providers", { as: ADMIN, body: { items: list } });
    const b = await call("/api/admin/provider-balance?id=" + provId, { as: ADMIN });
    assert.strictEqual(b.status, 200, "niqob saqlangach kalit yo'qoldi");
  });

  let autoOrderId = "";
  await it("avtomatik paket buyurtmasi provayderga yuboriladi", async () => {
    const cat = (await call("/api/admin/catalog", { as: ADMIN })).data;
    const item = cat.find(x => x.id === "tg-stars");
    item.tiers[0].auto = { provider: provId, service: "77", qty: 50 };
    await call("/api/admin/catalog", { as: ADMIN, body: { items: cat } });

    const r = await call("/api/order", {
      as: USER, body: { itemId: "tg-stars", tierId: item.tiers[0].id, target: "@doniyor" }
    });
    assert.strictEqual(r.status, 200);
    autoOrderId = r.data.order.id;

    // Yuborish javobdan keyin fonda ketadi
    for (let i = 0; i < 40 && !app.store.orderGet(app.db, autoOrderId).extId; i++)
      await new Promise(res => setTimeout(res, 50));

    const o = app.store.orderGet(app.db, autoOrderId);
    assert.ok(o.extId, "extId saqlanmadi");
    assert.strictEqual(o.status, "processing");
    assert.strictEqual(provState.lastAdd.service, "77");
    assert.strictEqual(provState.lastAdd.link, "@doniyor");
    assert.strictEqual(provState.lastAdd.quantity, "50");
  });
  await it("provayder bajargach buyurtma o'zi 'bajarildi' bo'ladi", async () => {
    const o = app.store.orderGet(app.db, autoOrderId);
    provState.orders[o.extId] = { status: "Completed", remains: 0, charge: "1.2" };
    const r = await call("/api/admin/provider-retry", { as: ADMIN, body: { id: autoOrderId, action: "check" } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(app.store.orderGet(app.db, autoOrderId).status, "done");
  });
  await it("provayder bekor qilsa pul qaytadi", async () => {
    const cat = (await call("/api/admin/catalog", { as: ADMIN })).data;
    const item = cat.find(x => x.id === "tg-stars");
    const before = (await call("/api/me", { as: USER })).data.balance;
    const r = await call("/api/order", {
      as: USER, body: { itemId: "tg-stars", tierId: item.tiers[0].id, target: "@doniyor" }
    });
    const id = r.data.order.id;
    for (let i = 0; i < 40 && !app.store.orderGet(app.db, id).extId; i++)
      await new Promise(res => setTimeout(res, 50));
    const o = app.store.orderGet(app.db, id);
    provState.orders[o.extId] = { status: "Canceled" };
    await call("/api/admin/provider-retry", { as: ADMIN, body: { id, action: "check" } });
    const done = app.store.orderGet(app.db, id);
    assert.strictEqual(done.status, "canceled");
    assert.strictEqual(done.refunded, true);
    const after = (await call("/api/me", { as: USER })).data.balance;
    assert.strictEqual(after, before);
  });
  await it("provayder xatosida buyurtma qo'lda bajarish uchun ochiq qoladi", async () => {
    const cat = (await call("/api/admin/catalog", { as: ADMIN })).data;
    const item = cat.find(x => x.id === "tg-stars");
    item.tiers[0].auto = { provider: provId, service: "999", qty: 1 };
    await call("/api/admin/catalog", { as: ADMIN, body: { items: cat } });

    const r = await call("/api/order", {
      as: USER, body: { itemId: "tg-stars", tierId: item.tiers[0].id, target: "@doniyor" }
    });
    const id = r.data.order.id;
    for (let i = 0; i < 40 && app.store.orderGet(app.db, id).autoState !== "error"; i++)
      await new Promise(res => setTimeout(res, 50));
    const o = app.store.orderGet(app.db, id);
    assert.strictEqual(o.status, "new", "xatoda ham holat o'zgarib ketdi");
    assert.strictEqual(o.autoState, "error");
    assert.ok(o.autoError.includes("Service not found"));

    // Tozalash: avtomatikani o'chiramiz
    item.tiers[0].auto = { provider: "", service: "", qty: 0 };
    await call("/api/admin/catalog", { as: ADMIN, body: { items: cat } });
    await call("/api/admin/order", { as: ADMIN, body: { id, action: "cancel", note: "test" } });
  });
  await it("provayder sozlamalari faqat adminga ochiq", async () => {
    assert.strictEqual((await call("/api/admin/providers", { as: USER })).status, 403);
    assert.strictEqual((await call("/api/admin/provider-balance?id=" + provId, { as: USER })).status, 403);
  });

  group("Sevimlilar");
  await it("mahsulot sevimlilarga qo'shiladi va olinadi", async () => {
    const on = await call("/api/favorite", { as: USER, body: { itemId: stars.id } });
    assert.strictEqual(on.status, 200);
    assert.strictEqual(on.data.on, true);
    assert.ok(on.data.favorites.includes(stars.id));

    const me = await call("/api/me", { as: USER });
    assert.ok(me.data.favorites.includes(stars.id));

    const off = await call("/api/favorite", { as: USER, body: { itemId: stars.id } });
    assert.strictEqual(off.data.on, false);
    assert.ok(!off.data.favorites.includes(stars.id));
  });
  await it("bo'sh mahsulot ID rad etiladi", async () => {
    const r = await call("/api/favorite", { as: USER, body: {} });
    assert.strictEqual(r.status, 400);
  });

  group("Tahlil ekrani");
  await it("dashboard 30 kunlik qatorni beradi", async () => {
    const r = await call("/api/admin/dashboard", { as: ADMIN });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.daily.length, 30);
    assert.ok(typeof r.data.sales.today === "number");
    assert.ok(Array.isArray(r.data.top));
    assert.ok(Array.isArray(r.data.churn));
  });
  await it("dashboard faqat adminlarga ochiq", async () => {
    const r = await call("/api/admin/dashboard", { as: USER });
    assert.strictEqual(r.status, 403);
  });

  group("Admin qidiruvi");
  await it("buyurtma raqami bo'yicha topiladi", async () => {
    const all = (await call("/api/admin/orders?status=all", { as: ADMIN })).data;
    const one = all[0];
    const r = await call("/api/admin/orders?status=all&q=" + one.seq, { as: ADMIN });
    assert.strictEqual(r.data.length, 1);
    assert.strictEqual(r.data[0].id, one.id);
  });
  await it("username va ma'lumot bo'yicha topiladi", async () => {
    const byName = await call("/api/admin/orders?status=all&q=@doniyor", { as: ADMIN });
    assert.ok(byName.data.length >= 1, "username bo'yicha topilmadi");
    const none = await call("/api/admin/orders?status=all&q=yo-q-bunday", { as: ADMIN });
    assert.strictEqual(none.data.length, 0);
  });

  group("Statistika");
  await it("/api/stats haqiqiy sonlarni beradi", async () => {
    const r = await call("/api/stats");
    assert.strictEqual(r.status, 200);
    assert.ok(r.data.users >= 1);
    assert.ok(r.data.orders >= 1);
  });

  provServer.close();
  console.log("\n─────────────────────────────");
  console.log(passed + " ta test o'tdi, " + failed + " ta xato");
  app.server.close();
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e) {}
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
