/* providers.js — tashqi donat / SMM saytlari bilan ishlash qatlami.
 *
 * Nima uchun alohida fayl: server.js allaqachon katta, provayder mantiqi esa
 * mustaqil — uni alohida sinash ham oson.
 *
 * Ikki xil ulanish qo'llab-quvvatlanadi:
 *
 *   kind = "smm"   Perfect Panel standarti. Donat va nakrutka saytlarining
 *                  aksariyati aynan shu API'ni beradi:
 *                    POST url  key=...&action=add&service=..&link=..&quantity=..
 *                    javob:    {"order": 12345}
 *                    holat:    action=status&order=12345
 *                              {"status":"Completed","remains":0,"charge":"1.2"}
 *                    balans:   action=balance  → {"balance":"12.5","currency":"USD"}
 *                    xizmatlar: action=services → [{service,name,category,rate,min,max}]
 *
 *   kind = "http"  Ixtiyoriy sayt. Admin manzil qolipini yozadi, masalan:
 *                    https://sayt.uz/api/order?token={key}&sku={service}&id={target}&n={qty}
 *                  Qolipdagi {key} {service} {target} {qty} {orderId} almashtiriladi.
 *                  Javobda buyurtma raqami bo'lsa (idPath orqali) saqlanadi.
 *
 * API kaliti faqat serverda qoladi — admin paneliga ham niqoblangan holda
 * ("••••1234") qaytariladi.
 */
"use strict";

const https = require("https");
const http = require("http");
const { URL } = require("url");

const TIMEOUT = 20000;

/* ── Past darajali HTTP so'rov (tashqi kutubxonasiz) ── */
function request(method, urlStr, { body, headers, form } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error("bad_url")); }
    if (u.protocol !== "https:" && u.protocol !== "http:") return reject(new Error("bad_url"));

    const lib = u.protocol === "https:" ? https : http;
    const payload = form ? new URLSearchParams(form).toString() : (body || "");
    const h = Object.assign({}, headers);
    if (payload) {
      h["Content-Type"] = h["Content-Type"] ||
        (form ? "application/x-www-form-urlencoded" : "application/json");
      h["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = lib.request({
      protocol: u.protocol, hostname: u.hostname, port: u.port || undefined,
      path: u.pathname + u.search, method, headers: h, timeout: TIMEOUT
    }, r => {
      let buf = "";
      r.on("data", c => {
        buf += c;
        // Javob haddan tashqari katta bo'lsa uzamiz — xotirani himoya qilish
        if (buf.length > 4 * 1024 * 1024) req.destroy(new Error("too_large"));
      });
      r.on("end", () => resolve({ status: r.statusCode || 0, text: buf }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", err => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

function parseJson(text) {
  try { return JSON.parse(text || "null"); } catch (e) { return null; }
}

// "data.order" kabi yo'l bo'yicha qiymat olish
function pick(obj, path) {
  if (!path) return undefined;
  return String(path).split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
}

// Qolipdagi {kalit} larni almashtiradi. Qiymatlar URL uchun kodlanadi.
function fill(tpl, vals) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) =>
    vals[k] === undefined ? m : encodeURIComponent(String(vals[k])));
}

/* ── Perfect Panel (kind = "smm") ── */
async function smmCall(p, params) {
  const r = await request("POST", p.url, { form: Object.assign({ key: p.key }, params) });
  const j = parseJson(r.text);
  if (j == null) throw new Error("bad_response");
  if (j && j.error) throw new Error(String(j.error).slice(0, 120));
  return j;
}

/* ── Umumiy amallar ── */

// Provayder balansi — admin sozlash to'g'riligini shu bilan tekshiradi.
async function balance(p) {
  if (p.kind !== "smm") throw new Error("unsupported");
  const j = await smmCall(p, { action: "balance" });
  return { balance: Number(j.balance) || 0, currency: String(j.currency || "").slice(0, 8) };
}

// Xizmatlar ro'yxati — admin kerakli xizmat ID'sini shu yerdan topadi.
async function services(p) {
  if (p.kind !== "smm") throw new Error("unsupported");
  const j = await smmCall(p, { action: "services" });
  if (!Array.isArray(j)) throw new Error("bad_response");
  return j.slice(0, 5000).map(s => ({
    service: String(s.service),
    name: String(s.name || "").slice(0, 160),
    category: String(s.category || "").slice(0, 80),
    rate: Number(s.rate) || 0,
    min: Number(s.min) || 0,
    max: Number(s.max) || 0
  }));
}

// Buyurtmani provayderga yuborish. Qaytadi: { extId, raw }
async function place(p, { service, target, qty, orderId }) {
  if (p.kind === "smm") {
    const j = await smmCall(p, {
      action: "add",
      service: String(service),
      link: String(target),
      quantity: String(qty || 1)
    });
    const id = j.order || j.id || pick(j, "data.order");
    if (!id) throw new Error("no_order_id");
    return { extId: String(id), raw: j };
  }

  // kind = "http": manzil qolipi bo'yicha oddiy so'rov
  const url = fill(p.url, { key: p.key, service, target, qty, orderId });
  const method = (p.method || "GET").toUpperCase() === "POST" ? "POST" : "GET";
  const r = await request(method, url, {
    headers: p.authHeader ? { Authorization: p.authHeader } : undefined,
    body: method === "POST" && p.bodyTemplate
      ? fill(p.bodyTemplate, { key: p.key, service, target, qty, orderId }) : undefined
  });
  if (r.status < 200 || r.status >= 300) throw new Error("http_" + r.status);
  const j = parseJson(r.text);
  const id = j ? (pick(j, p.idPath || "order") || pick(j, "id") || pick(j, "data.id")) : null;
  return { extId: id ? String(id) : "", raw: j || { text: r.text.slice(0, 300) } };
}

// Bir yoki bir nechta buyurtma holati. Qaytadi: { extId: {status, remains, charge} }
async function status(p, extIds) {
  const ids = (extIds || []).map(String).filter(Boolean);
  if (!ids.length) return {};

  if (p.kind === "smm") {
    // Perfect Panel bir so'rovda 100 tagacha buyurtmani qaytaradi
    const j = await smmCall(p, { action: "status", orders: ids.join(",") });
    const out = {};
    if (ids.length === 1 && j && !j[ids[0]] && (j.status || j.charge !== undefined)) {
      out[ids[0]] = normStatus(j);
    } else {
      ids.forEach(id => { if (j && j[id] && !j[id].error) out[id] = normStatus(j[id]); });
    }
    return out;
  }

  if (!p.statusUrl) return {};
  const out = {};
  for (const id of ids.slice(0, 40)) {
    try {
      const r = await request("GET", fill(p.statusUrl, { key: p.key, orderId: id, extId: id }), {
        headers: p.authHeader ? { Authorization: p.authHeader } : undefined
      });
      const j = parseJson(r.text);
      const raw = p.statusPath ? pick(j, p.statusPath) : (j && (j.status || j.state));
      if (raw !== undefined && raw !== null) out[id] = normStatus({ status: raw });
    } catch (e) { /* bitta buyurtma xatosi qolganini to'xtatmasin */ }
  }
  return out;
}

// Turli saytlar turlicha yozadi — hammasini uchta holatga keltiramiz.
function normStatus(j) {
  const raw = String((j && j.status) || "").toLowerCase().trim();
  let state = "pending";
  if (["completed", "complete", "done", "success", "finished", "delivered"].includes(raw)) state = "done";
  else if (["canceled", "cancelled", "refunded", "fail", "failed", "error", "rejected"].includes(raw)) state = "failed";
  else if (["partial"].includes(raw)) state = "partial";
  return {
    state,
    raw: raw.slice(0, 40),
    remains: j && j.remains != null ? Number(j.remains) : null,
    charge: j && j.charge != null ? String(j.charge).slice(0, 20) : null
  };
}

// Mijoz tomoniga chiqadigan xavfsiz ko'rinish — kalit niqoblanadi.
function publicView(p) {
  const k = String(p.key || "");
  return {
    id: p.id, name: p.name, kind: p.kind, url: p.url, active: p.active !== false,
    keyMask: k ? "••••" + k.slice(-4) : "",
    hasKey: !!k,
    method: p.method || "GET", idPath: p.idPath || "", statusUrl: p.statusUrl || "",
    statusPath: p.statusPath || "", bodyTemplate: p.bodyTemplate || "", authHeader: p.authHeader ? "••••" : ""
  };
}

module.exports = { balance, services, place, status, normStatus, publicView, fill, pick };
