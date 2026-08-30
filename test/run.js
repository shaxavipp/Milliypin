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
  await it("/api/leaderboard xaridorlarni tartiblab beradi va ID chiqarmaydi", async () => {
    const r = await call("/api/leaderboard");
    assert.strictEqual(r.status, 200);
    assert.ok(r.data.length >= 1);
    assert.strictEqual(r.data[0].rank, 1);
    assert.ok(!("id" in r.data[0]), "foydalanuvchi ID si ochiq chiqdi");
    for (let i = 1; i < r.data.length; i++) assert.ok(r.data[i - 1].spent >= r.data[i].spent);
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

  group("Statistika");
  await it("/api/stats haqiqiy sonlarni beradi", async () => {
    const r = await call("/api/stats");
    assert.strictEqual(r.status, 200);
    assert.ok(r.data.users >= 1);
    assert.ok(r.data.orders >= 1);
  });

  console.log("\n─────────────────────────────");
  console.log(passed + " ta test o'tdi, " + failed + " ta xato");
  app.server.close();
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e) {}
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
