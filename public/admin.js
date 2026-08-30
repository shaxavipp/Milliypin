/* admin.js — Milliy Pin admin paneli.
   Faqat ADMIN_IDS ro'yxatidagi Telegram akkauntlarga ochiladi (server ham har bir
   so'rovni qayta tekshiradi, ya'ni panelni "ko'rish" hech narsa bermaydi). */
(function () {
  "use strict";

  const t = k => window.I18N.t(k);
  const esc = s => window.escHtml(s);
  const api = (...a) => window.mpApi(...a);
  const toast = (...a) => window.mpToast(...a);
  const errText = e => window.mpErr(e);
  const el = id => document.getElementById(id);
  const ICO = window.ICO;

  const nf = new Intl.NumberFormat("ru-RU");
  const money = n => nf.format(Math.round(Number(n) || 0)).replace(/\u00A0/g, "\u2009");
  const som = n => money(n) + " so'm";
  const dt = ts => new Date(ts).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const TABS = [
    { id: "dash",     ic: "chart",     label: "Umumiy" },
    { id: "money",    ic: "wallet",    label: "Moliya" },
    { id: "orders",   ic: "scroll",    label: "Buyurtmalar" },
    { id: "payments", ic: "card",      label: "To'lovlar" },
    { id: "users",    ic: "users",     label: "Mijozlar" },
    { id: "catalog",  ic: "box",       label: "Katalog" },
    { id: "promo",    ic: "tag",       label: "Promokod" },
    { id: "settings", ic: "cog",       label: "Sozlamalar" },
    { id: "cast",     ic: "megaphone", label: "Tarqatma" }
  ];

  const A = { tab: "dash", data: {}, catalog: [], settings: null, orderFilter: "new", period: "today", payFilter: "pending", payQuery: "" };

  function openAdmin() {
    window.mpSheet("Admin panel", `
      <div class="pills" id="admTabs">
        ${TABS.map(x => `<button class="pill ${x.id === A.tab ? "on" : ""}" data-adm="${x.id}">${ICO(x.ic, 14)}${x.label}</button>`).join("")}
      </div>
      <div id="admBody"><div class="skel"></div></div>`);
    el("admTabs").addEventListener("click", e => {
      const b = e.target.closest("[data-adm]");
      if (!b) return;
      A.tab = b.getAttribute("data-adm");
      [...el("admTabs").children].forEach(c => c.classList.toggle("on", c === b));
      renderTab();
    });
    renderTab();
  }
  window.mpOpenAdmin = openAdmin;

  // Har render'da #admBody yangi tugun bilan almashtiriladi — shu sabab oldingi
  // render biriktirgan hodisa tinglovchilari to'planib qolmaydi.
  const body = html => {
    const old = el("admBody");
    if (!old) return;
    const n = document.createElement("div");
    n.id = "admBody";
    n.innerHTML = html;
    old.replaceWith(n);
  };
  const loading = () => body(`<div class="skel"></div><div class="skel" style="margin-top:9px"></div>`);

  async function renderTab() {
    loading();
    try {
      if (A.tab === "dash") return await tabDash();
      if (A.tab === "money") return await tabMoney();
      if (A.tab === "orders") return await tabOrders();
      if (A.tab === "payments") return await tabPayments();
      if (A.tab === "users") return await tabUsers();
      if (A.tab === "catalog") return await tabCatalog();
      if (A.tab === "promo") return await tabPromo();
      if (A.tab === "settings") return await tabSettings();
      if (A.tab === "cast") return tabCast();
    } catch (e) {
      body(`<div class="errline">${esc(errText(e))}</div>`);
    }
  }

  /* ─────────── Umumiy ─────────── */
  const PERIODS = [
    { id: "today", label: "Bugun" }, { id: "week", label: "Hafta" },
    { id: "month", label: "Oy" }, { id: "all", label: "Hammasi" }
  ];

  async function tabDash() {
    const d = await api("/api/admin/overview?period=" + A.period);
    body(`
      <div class="lb-period" id="pSeg">
        ${PERIODS.map(p => `<button data-p="${p.id}" class="${p.id === A.period ? "on" : ""}">${p.label}</button>`).join("")}
      </div>

      <div class="kpi">
        <div class="kpi-b"><div class="kpi-v">${money(d.revenue)}</div><div class="kpi-k">Tushum</div></div>
        <div class="kpi-b"><div class="kpi-v">${money(d.topups)}</div><div class="kpi-k">To'ldirildi</div></div>
        <div class="kpi-b"><div class="kpi-v">${money(d.orders)}</div><div class="kpi-k">Bajarilgan buyurtma</div></div>
        <div class="kpi-b"><div class="kpi-v">${money(d.usersNew)}</div><div class="kpi-k">Yangi mijoz</div></div>
        <div class="kpi-b"><div class="kpi-v">${money(d.users)}</div><div class="kpi-k">Jami mijoz</div></div>
        <div class="kpi-b"><div class="kpi-v">${money(d.balances)}</div><div class="kpi-k">Balanslar yig'indisi</div></div>
      </div>

      ${(d.pendingPayments || d.pendingOrders || d.processingOrders) ? `
      <button class="wide" style="margin:11px 0 0;width:100%" data-goto="money">
        <span class="wide-ic" style="color:var(--clay);background:var(--claysoft);border-color:var(--clay)">${ICO("alert", 19)}</span>
        <span class="wide-b">
          <span class="wide-t">Kutayotgan ishlar</span>
          <span class="wide-s">${d.pendingPayments} to'lov · ${d.pendingOrders + d.processingOrders} buyurtma</span>
        </span>
        ${ICO("chevron", 15)}
      </button>` : ""}

      ${d.top && d.top.length ? `
      <div class="sect"><h3>Eng ko'p sotilgan</h3></div>
      <div class="rows" style="padding:0">
        ${d.top.map((x, i) => `<div class="row">
          <span class="row-ic">${i + 1}</span>
          <span class="row-b"><span class="row-t">${esc(x.title)}</span></span>
          <span class="row-e"><span class="row-p">${x.n}</span></span>
        </div>`).join("")}
      </div>` : ""}

      <div class="acts">
        <button class="btn btn--line btn-sm" id="admExport">${ICO("download", 14)}CSV Telegramga</button>
        <button class="btn btn--line btn-sm" id="admReload">${ICO("refresh", 14)}Yangilash</button>
      </div>`);

    el("pSeg").addEventListener("click", e => {
      const b = e.target.closest("[data-p]");
      if (!b) return;
      A.period = b.getAttribute("data-p");
      renderTab();
    });
    el("admBody").addEventListener("click", e => {
      const g = e.target.closest("[data-goto]");
      if (!g) return;
      A.tab = g.getAttribute("data-goto");
      [...el("admTabs").children].forEach(c =>
        c.classList.toggle("on", c.getAttribute("data-adm") === A.tab));
      renderTab();
    });
    el("admReload").onclick = renderTab;
    el("admExport").onclick = async () => {
      const b = el("admExport");
      b.disabled = true;
      try {
        const r = await api("/api/admin/export", { body: {} });
        toast("Telegramga yuborildi: " + r.rows + " qator", "ok");
      } catch (e) { toast(errText(e), "err"); }
      b.disabled = false;
    };
  }

  /* ─────────── Moliya: kutayotgan to'lov va buyurtmalar + mijoz qidiruvi ─────────── */

  async function tabMoney() {
    const d = await api("/api/admin/money");

    const payRow = p => `<div class="mrow">
      <span class="mrow-b">
        <span class="mrow-t price">${som(p.amount)}${p.claimedAt ? " · to'ladim" : ""}</span>
        <span class="mrow-s">${esc(p.cardType || "")} · ${p.username ? "@" + esc(p.username) : esc(p.uid)} · ${dt(p.ts)}</span>
      </span>
      <span class="mrow-a">
        <button class="ok" data-pay="confirm" data-id="${esc(p.id)}">${ICO("check", 15)}</button>
        <button class="no" data-pay="reject" data-id="${esc(p.id)}">${ICO("x", 15)}</button>
      </span>
    </div>`;

    const ordRow = o => `<div class="mrow">
      <span class="mrow-b">
        <span class="mrow-t">#${o.seq} ${esc(o.itemTitle)} · <span class="price">${som(o.total)}</span></span>
        <span class="mrow-s">${esc(o.tierLabel)} → ${esc(o.target)}</span>
      </span>
      <span class="mrow-a">
        <button class="ok" data-ord="done" data-id="${esc(o.id)}">${ICO("check", 15)}</button>
        <button class="no" data-ord="cancel" data-id="${esc(o.id)}">${ICO("x", 15)}</button>
      </span>
    </div>`;

    body(`
      <div class="sect"><h3>Kutayotgan to'lovlar</h3></div>
      <div class="ocard" style="margin:0">
        ${d.payments.length ? d.payments.map(payRow).join("") : `<div class="tiny mut">Bo'sh</div>`}
      </div>

      <div class="sect"><h3>Ochiq buyurtmalar</h3></div>
      <div class="ocard" style="margin:0">
        ${d.orders.length ? d.orders.map(ordRow).join("") : `<div class="tiny mut">Bo'sh</div>`}
      </div>

      <div class="sect"><h3>Mijoz qidirish</h3></div>
      <div class="inline" style="padding:0 0 2px">
        <input class="input" id="mq" placeholder="ID yoki @username">
        <button class="btn btn--acc" id="mqBtn">${ICO("search", 15)}</button>
      </div>
      <div id="mqRes"></div>`);

    el("mqBtn").onclick = () => findUser(el("mq").value.trim());
    el("mq").addEventListener("keydown", e => { if (e.key === "Enter") findUser(el("mq").value.trim()); });

    el("admBody").addEventListener("click", async e => {
      const p = e.target.closest("[data-pay]");
      const o = e.target.closest("[data-ord]");
      if (!p && !o) return;
      const btn = p || o;
      btn.disabled = true;
      try {
        await api(p ? "/api/admin/payment" : "/api/admin/order", {
          body: { id: btn.getAttribute("data-id"), action: btn.getAttribute(p ? "data-pay" : "data-ord") }
        });
        toast("Bajarildi", "ok");
        renderTab();
      } catch (err) { toast(errText(err), "err"); btn.disabled = false; }
    });
  }

  async function findUser(q) {
    const box = el("mqRes");
    if (!q) { box.innerHTML = ""; return; }
    let list = [];
    try { list = await api("/api/admin/users?q=" + encodeURIComponent(q)); }
    catch (e) { box.innerHTML = `<div class="errline">${esc(errText(e))}</div>`; return; }

    box.innerHTML = list.length ? list.slice(0, 10).map(u => `
      <div class="ocard" style="margin:9px 0 0">
        <div class="oc-top">
          <span class="oc-n"><span data-copy="${esc(u.id)}">${u.username ? "@" + esc(u.username) : esc(u.firstName || u.id)}</span></span>
          <span class="tag tag--${u.blocked ? "canceled" : "done"}">${u.blocked ? "Bloklangan" : "Aktiv"}</span>
        </div>
        <div class="oc-b tiny">ID ${esc(u.id)} · Balans <b class="price">${som(u.balance)}</b> · Sarflagan ${som(u.spent || 0)}</div>
        <div class="inline" style="margin-top:9px">
          <input class="input" inputmode="numeric" placeholder="Summa" data-amt="${esc(u.id)}">
          <button class="btn btn--acc btn-sm" data-badd="${esc(u.id)}">${ICO("plus", 14)}</button>
          <button class="btn btn--danger btn-sm" data-bsub="${esc(u.id)}">${ICO("minus", 14)}</button>
        </div>
        <div class="acts">
          <button class="btn btn--line btn-sm" data-hist="${esc(u.id)}">${ICO("clock", 14)}Tarix</button>
          <button class="btn btn--line btn-sm" data-block="${esc(u.id)}" data-on="${u.blocked ? "0" : "1"}">
            ${u.blocked ? ICO("eye", 14) + "Ochish" : ICO("lock", 14) + "Bloklash"}</button>
        </div>
      </div>`).join("") : `<div class="tiny mut" style="margin-top:9px">Topilmadi</div>`;

    box.addEventListener("click", async e => {
      const add = e.target.closest("[data-badd]"), sub = e.target.closest("[data-bsub]");
      if (add || sub) {
        const id = (add || sub).getAttribute(add ? "data-badd" : "data-bsub");
        const inp = box.querySelector('[data-amt="' + id + '"]');
        const v = Math.round(Number(inp && inp.value) || 0);
        if (!v) return toast("Summani kiriting", "err");
        try {
          await api("/api/admin/user", { body: { id, action: "balance", delta: add ? v : -v } });
          toast("Bajarildi", "ok");
          findUser(q);
        } catch (err) { toast(errText(err), "err"); }
        return;
      }
      const blk = e.target.closest("[data-block]");
      if (blk) {
        try {
          await api("/api/admin/user", {
            body: { id: blk.getAttribute("data-block"), action: "block", blocked: blk.getAttribute("data-on") === "1" }
          });
          findUser(q);
        } catch (err) { toast(errText(err), "err"); }
        return;
      }
      const h = e.target.closest("[data-hist]");
      if (h) openHistory(h.getAttribute("data-hist"));
    });
  }

  async function openHistory(uid) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="skel"></div>`;
    let d;
    try { d = await api("/api/admin/history?id=" + encodeURIComponent(uid)); }
    catch (e) { return toast(errText(e), "err"); }

    const rows = [
      ...d.orders.map(o => ({ ts: o.ts, kind: "order", label: "#" + o.seq + " " + o.itemTitle,
        sub: o.tierLabel + " → " + o.target, amount: -o.total, status: o.status })),
      ...d.payments.map(p => ({ ts: p.ts, kind: "pay", label: "To'ldirish",
        sub: (p.cardType || "") + " · o'tkazma " + som(p.amount), amount: p.base || p.amount, status: p.status }))
    ].sort((a, b) => b.ts - a.ts).slice(0, 60);

    window.mpSheet((d.user.username ? "@" + d.user.username : "ID " + d.user.id) + " — tarix", `
      <div class="stats" style="padding:0">
        <div class="stat"><div class="stat-v">${money(d.user.balance)}</div><div class="stat-k">Balans</div></div>
        <div class="stat"><div class="stat-v">${money(d.user.spent || 0)}</div><div class="stat-k">Sarflagan</div></div>
        <div class="stat"><div class="stat-v">${d.orders.length}</div><div class="stat-k">Buyurtma</div></div>
      </div>
      <div class="rows" style="padding:0;margin-top:11px">
        ${rows.length ? rows.map(r => `<div class="row">
          <span class="row-ic">${ICO(r.kind === "pay" ? "card" : "scroll", 19)}</span>
          <span class="row-b">
            <span class="row-t">${esc(r.label)}</span>
            <span class="row-s">${esc(r.sub)} · ${dt(r.ts)}</span>
          </span>
          <span class="row-e">
            <span class="row-p" style="color:${r.amount > 0 ? "var(--ok)" : "var(--txt)"}">
              ${r.amount > 0 ? "+" : ""}${money(r.amount)}</span>
            <span class="tag tag--${esc(r.status)}" style="margin-top:3px;display:inline-block">${t("st." + r.status)}</span>
          </span>
        </div>`).join("") : `<div class="tiny mut">Bo'sh</div>`}
      </div>`);
  }

  /* ─────────── Buyurtmalar ─────────── */
  const OSTATUS = [
    { id: "new", label: "Yangi" }, { id: "processing", label: "Jarayonda" },
    { id: "done", label: "Bajarilgan" }, { id: "canceled", label: "Bekor" }, { id: "all", label: "Hammasi" }
  ];

  async function tabOrders() {
    const list = await api("/api/admin/orders?status=" + encodeURIComponent(A.orderFilter));
    body(`
      <div class="pills">
        ${OSTATUS.map(s => `<button class="pill ${s.id === A.orderFilter ? "on" : ""}" data-ost="${s.id}">${s.label}</button>`).join("")}
      </div>
      ${list.length ? list.map(o => `
        <div class="ocard">
          <div class="oc-top">
            <span class="oc-n">#${o.seq} ${esc(o.itemIcon || "")} ${esc(o.itemTitle)}</span>
            <span class="tag tag--${esc(o.status)}">${t("st." + o.status)}</span>
          </div>
          <div class="oc-b">
            ${esc(o.tierLabel)}${o.qty > 1 ? " × " + o.qty : ""} · <b>${som(o.total)}</b>
            <div><span class="oc-target" data-copy="${esc(o.target)}">${esc(o.target)}</span></div>
            ${o.comment ? `<div class="tiny mut" style="margin-top:4px">${esc(o.comment)}</div>` : ""}
          </div>
          <div class="oc-m">
            <span>${ICO("clock", 12)}${dt(o.ts)}</span>
            <span data-copy="${esc(o.uid)}">${ICO("user", 12)}${o.username ? "@" + esc(o.username) : esc(o.uid)}</span>
            ${o.promoCode ? `<span>${ICO("tag", 12)}${esc(o.promoCode)}</span>` : ""}
          </div>
          ${o.status === "new" || o.status === "processing" ? `
          <div class="acts">
            ${o.status === "new" ? `<button class="btn btn--line btn-sm" data-ord="processing" data-id="${esc(o.id)}">${ICO("clock",14)}Olindi</button>` : ""}
            <button class="btn btn--acc btn-sm" data-ord="done" data-id="${esc(o.id)}">${ICO("check",14)}Bajarildi</button>
            <button class="btn btn--danger btn-sm" data-ord="cancel" data-id="${esc(o.id)}">${ICO("x",14)}Bekor</button>
          </div>` : ""}
        </div>`).join("")
        : `<div class="empty">${ICO("box",34)}<div class="empty-t">Bo'sh</div></div>`}`);

    el("admBody").addEventListener("click", async e => {
      const f = e.target.closest("[data-ost]");
      if (f) { A.orderFilter = f.getAttribute("data-ost"); return renderTab(); }

      const c = e.target.closest("[data-copy]");
      if (c) return window.mpCopy(c.getAttribute("data-copy"));

      const b = e.target.closest("[data-ord]");
      if (!b) return;
      const action = b.getAttribute("data-ord");
      let note = "";
      if (action === "cancel") {
        note = prompt("Bekor qilish sababi (ixtiyoriy):") || "";
      }
      b.disabled = true;
      try {
        await api("/api/admin/order", { body: { id: b.getAttribute("data-id"), action, note } });
        toast("Bajarildi", "ok");
        renderTab();
      } catch (err) { toast(errText(err), "err"); b.disabled = false; }
    });
  }

  /* ─────────── To'lovlar ─────────── */
  const PSTATUS = [
    { id: "pending", label: "Kutilmoqda" }, { id: "confirmed", label: "Tasdiqlangan" },
    { id: "rejected", label: "Rad etilgan" }, { id: "expired", label: "Muddati o'tgan" },
    { id: "all", label: "Hammasi" }
  ];

  async function tabPayments() {
    const list = await api("/api/admin/payments?status=" + encodeURIComponent(A.payFilter) +
      (A.payQuery ? "&q=" + encodeURIComponent(A.payQuery) : ""));

    body(`
      <div class="pills">
        ${PSTATUS.map(x => `<button class="pill ${x.id === A.payFilter ? "on" : ""}" data-pst="${x.id}">${x.label}</button>`).join("")}
      </div>
      <div class="inline" style="margin-bottom:11px">
        <input class="input" id="pq" placeholder="ID / @username / summa" value="${esc(A.payQuery)}">
        <button class="btn btn--acc" id="pqBtn">${ICO("search", 15)}</button>
      </div>
      <div class="hint" style="margin-bottom:11px">${ICO("info", 13)}<span>Bank SMS'idagi summa bilan solishtiring. Tasdiqlangach mijoz balansiga <b>asosiy summa</b> tushadi.</span></div>
      ${list.length ? list.map(p => `
        <div class="ocard">
          <div class="oc-top">
            <span class="oc-n" data-copy="${p.amount}">${som(p.amount)}</span>
            <span class="tag tag--${esc(p.status)}">${p.status === "pending" && p.claimedAt ? "To'ladim" : t("st." + p.status)}</span>
          </div>
          <div class="oc-b tiny">
            Hisobga tushadi: <b class="price">${som(p.base || p.amount)}</b> · ${esc(p.cardType)} ${esc(p.cardNumber || "")}
          </div>
          <div class="oc-m">
            <span>${ICO("clock", 12)}${dt(p.ts)}</span>
            <span data-copy="${esc(p.uid)}">${ICO("user", 12)}${p.username ? "@" + esc(p.username) : esc(p.uid)}</span>
            ${p.confirmedBy ? `<span>${ICO("check", 12)}${esc(p.confirmedBy)}</span>` : ""}
          </div>
          ${p.status === "pending" ? `<div class="acts">
            <button class="btn btn--acc btn-sm" data-pay="confirm" data-id="${esc(p.id)}">${ICO("check", 14)}Tasdiqlash</button>
            <button class="btn btn--danger btn-sm" data-pay="reject" data-id="${esc(p.id)}">${ICO("x", 14)}Rad etish</button>
          </div>` : ""}
        </div>`).join("")
        : `<div class="empty">${ICO("card", 34)}<div class="empty-t">Bo'sh</div></div>`}`);

    el("pqBtn").onclick = () => { A.payQuery = el("pq").value.trim(); renderTab(); };
    el("pq").addEventListener("keydown", e => {
      if (e.key === "Enter") { A.payQuery = el("pq").value.trim(); renderTab(); }
    });

    el("admBody").addEventListener("click", async e => {
      const f = e.target.closest("[data-pst]");
      if (f) { A.payFilter = f.getAttribute("data-pst"); return renderTab(); }

      const c = e.target.closest("[data-copy]");
      if (c) return window.mpCopy(c.getAttribute("data-copy"));

      const b = e.target.closest("[data-pay]");
      if (!b) return;
      b.disabled = true;
      try {
        await api("/api/admin/payment", { body: { id: b.getAttribute("data-id"), action: b.getAttribute("data-pay") } });
        toast("Bajarildi", "ok");
        renderTab();
      } catch (err) { toast(errText(err), "err"); b.disabled = false; }
    });
  }

  /* ─────────── Mijozlar ─────────── */
  async function tabUsers(query) {
    const list = await api("/api/admin/users" + (query ? "?q=" + encodeURIComponent(query) : ""));
    body(`
      <div style="display:flex;gap:8px">
        <input class="input" id="uq" placeholder="ID yoki @username" value="${esc(query || "")}">
        <button class="btn btn--line btn-sm" id="uqBtn" style="flex:none">${ICO("search",14)}</button>
      </div>
      <div class="rows" style="margin-top:12px">
        ${list.length ? list.map(u => `
          <div class="ocard">
            <div class="oc-top">
              <span class="oc-n" data-copy="${esc(u.id)}">${u.username ? "@" + esc(u.username) : esc(u.firstName || u.id)}</span>
              <span class="tag tag--${u.blocked ? "canceled" : "done"}">${u.blocked ? "Bloklangan" : "Aktiv"}</span>
            </div>
            <div class="ocard__body tiny">
              Balans: <b>${som(u.balance)}</b> · Sarflagan: ${som(u.spent || 0)}
              ${u.refBy ? ` · Taklif: ${esc(u.refBy)}` : ""}
            </div>
            <div class="oc-m"><span>ID: ${esc(u.id)}</span></div>
            <div class="acts">
              <button class="btn btn--line btn-sm" data-bal="${esc(u.id)}">${ICO("wallet",14)}Balans ±</button>
              <button class="btn btn--line btn-sm" data-block="${esc(u.id)}" data-on="${u.blocked ? "0" : "1"}">${u.blocked ? ICO("eye", 14) + "Ochish" : ICO("lock", 14) + "Bloklash"}</button>
            </div>
          </div>`).join("")
          : `<div class="empty"><div class="empty-i">${ICO("search",14)}</div><div class="empty-t">Topilmadi</div></div>`}
      </div>`);

    el("uqBtn").onclick = () => tabUsers(el("uq").value.trim());
    el("uq").addEventListener("keydown", e => { if (e.key === "Enter") tabUsers(el("uq").value.trim()); });

    el("admBody").addEventListener("click", async e => {
      const c = e.target.closest("[data-copy]");
      if (c) return window.mpCopy(c.getAttribute("data-copy"));

      const bal = e.target.closest("[data-bal]");
      if (bal) {
        const v = prompt("Balansga qo'shish (manfiy = yechish), so'mda:", "10000");
        if (v === null) return;
        const delta = Number(String(v).replace(/[^\d-]/g, ""));
        if (!delta) return;
        try {
          await api("/api/admin/user", { body: { id: bal.getAttribute("data-bal"), action: "balance", delta } });
          toast("Bajarildi", "ok");
          tabUsers(el("uq").value.trim());
        } catch (err) { toast(errText(err), "err"); }
        return;
      }
      const blk = e.target.closest("[data-block]");
      if (blk) {
        try {
          await api("/api/admin/user", {
            body: { id: blk.getAttribute("data-block"), action: "block", blocked: blk.getAttribute("data-on") === "1" }
          });
          tabUsers(el("uq").value.trim());
        } catch (err) { toast(errText(err), "err"); }
      }
    });
  }

  /* ─────────── Katalog ─────────── */
  async function tabCatalog() {
    A.catalog = await api("/api/admin/catalog");
    renderCatalog();
  }
  function renderCatalog() {
    body(`
      <div class="acts" style="margin-top:0">
        <button class="btn btn--gold" id="catSave">${ICO("send",14)}Nashr qilish</button>
        <button class="btn btn--line btn-sm" id="catAdd">${ICO("plus",14)}Mahsulot</button>
      </div>
      <div class="hint">O'zgarishlar faqat “Nashr qilish” bosilganda barcha mijozlarga tarqaladi.</div>
      <div class="rows" style="margin-top:12px">
        ${A.catalog.map((it, i) => `
          <div class="ocard">
            <div class="oc-top">
              <span class="oc-n">${ICO(it.icon || "gift", 16)}<span>${esc(window.I18N.pick(it.title) || it.id)}</span></span>
              <span class="tag tag--${it.active === false ? "canceled" : "done"}">${it.active === false ? "Yopiq" : "Aktiv"}</span>
            </div>
            <div class="ocard__body tiny muted">${esc(it.group || "")} · ${it.category === "telegram" ? "Telegram" : "O'yin"} · ${(it.tiers || []).length} paket</div>
            <div class="acts">
              <button class="btn btn--line btn-sm" data-cedit="${i}">${ICO("edit",14)}Tahrirlash</button>
              <button class="btn btn--line btn-sm" data-ctoggle="${i}">${it.active === false ? ICO("eye", 14) + "Yoqish" : ICO("eyeoff", 14) + "Yashirish"}</button>
              <button class="btn btn--line btn-sm" data-cup="${i}">&uarr;</button>
              <button class="btn btn--line btn-sm" data-cdown="${i}">&darr;</button>
              <button class="btn btn--danger btn-sm" data-cdel="${i}">${ICO("trash",14)}</button>
            </div>
          </div>`).join("")}
      </div>`);

    el("catSave").onclick = async () => {
      try {
        const r = await api("/api/admin/catalog", { body: { items: A.catalog } });
        toast("Nashr qilindi: " + r.count, "ok");
        window.mpApi("/api/catalog").then(c => { window.MP.catalog = c; });
      } catch (e) { toast(errText(e), "err"); }
    };
    el("catAdd").onclick = () => {
      A.catalog.push({
        id: "it_" + Date.now().toString(36), category: "game", group: "Yangi guruh", icon: "pad",
        title: { uz: "Yangi mahsulot", ru: "Новый товар" }, field: "playerId",
        note: { uz: "", ru: "" }, active: true,
        tiers: [{ id: "t1", label: { uz: "Paket 1", ru: "Пакет 1" }, price: 10000, old: 0, badge: "", qty: 0, active: true }]
      });
      editItem(A.catalog.length - 1);
    };

    el("admBody").addEventListener("click", e => {
      const g = sel => { const n = e.target.closest("[data-" + sel + "]"); return n ? Number(n.getAttribute("data-" + sel)) : -1; };
      let i;
      if ((i = g("cedit")) >= 0) return editItem(i);
      if ((i = g("ctoggle")) >= 0) { A.catalog[i].active = A.catalog[i].active === false; return renderCatalog(); }
      if ((i = g("cup")) > 0) { const x = A.catalog.splice(i, 1)[0]; A.catalog.splice(i - 1, 0, x); return renderCatalog(); }
      if ((i = g("cdown")) >= 0 && i < A.catalog.length - 1) { const x = A.catalog.splice(i, 1)[0]; A.catalog.splice(i + 1, 0, x); return renderCatalog(); }
      if ((i = g("cdel")) >= 0) {
        if (confirm("Mahsulot o'chirilsinmi?")) { A.catalog.splice(i, 1); renderCatalog(); }
      }
    });
  }

  const FIELDS = [
    ["username", "Telegram username"], ["playerId", "Player ID"],
    ["playerZone", "ID + Zone/Server"], ["nickname", "Nik"], ["link", "Havola"]
  ];

  function editItem(i) {
    const it = A.catalog[i];
    body(`
      <button class="btn btn--line btn-sm" id="catBack" style="margin-bottom:12px">${ICO("back",14)}${t("common.back")}</button>
      <div class="fld"><label class="lbl">Bo'lim</label>
        <select class="input" id="fCat">
          <option value="game" ${it.category === "game" ? "selected" : ""}>O'yinlar</option>
          <option value="telegram" ${it.category === "telegram" ? "selected" : ""}>Telegram</option>
        </select></div>
      <div class="fld"><label class="lbl">Guruh (o'yin/xizmat nomi)</label>
        <input class="input" id="fGroup" value="${esc(it.group || "")}"></div>
      <div class="fld"><label class="lbl">Ikonka kaliti (crown, star4, target...)</label>
        <input class="input" id="fIcon" value="${esc(it.icon || "")}" maxlength="20"></div>
      <div class="fld"><label class="lbl">Muqova rasmi (havola)</label>
        <input class="input" id="fCover" value="${esc(it.cover || "")}" placeholder="https://..."></div>
      <div class="editgrid">
        <div><label class="lbl">Hudud yorlig'i</label>
          <input class="input" id="fRegion" value="${esc(it.region || "")}" placeholder="GLOBAL / SNG / AVTO"></div>
        <div><label class="lbl">Reyting (1-5)</label>
          <input class="input" id="fRating" inputmode="decimal" value="${Number(it.rating) || 5}"></div>
      </div>
      <div class="switch"><span class="lbl">Texnik ish (sotib bo'lmaydi)</span>
        <span class="sw ${it.maint ? "on" : ""}" id="fMaint"><i></i></span></div>
      <div class="fld"><label class="lbl">Nomi (UZ)</label>
        <input class="input" id="fTitleUz" value="${esc((it.title || {}).uz || "")}"></div>
      <div class="fld"><label class="lbl">Nomi (RU)</label>
        <input class="input" id="fTitleRu" value="${esc((it.title || {}).ru || "")}"></div>
      <div class="fld"><label class="lbl">Mijozdan so'raladigan ma'lumot</label>
        <select class="input" id="fField">
          ${FIELDS.map(f => `<option value="${f[0]}" ${it.field === f[0] ? "selected" : ""}>${f[1]}</option>`).join("")}
        </select></div>
      <div class="fld"><label class="lbl">Eslatma (UZ)</label>
        <textarea class="textarea" id="fNoteUz">${esc((it.note || {}).uz || "")}</textarea></div>
      <div class="fld"><label class="lbl">Eslatma (RU)</label>
        <textarea class="textarea" id="fNoteRu">${esc((it.note || {}).ru || "")}</textarea></div>

      <div class="sect"><h3>Paketlar</h3></div>
      <div id="tierRows">
        ${(it.tiers || []).map((x, k) => tierRow(x, k)).join("")}
      </div>
      <button class="btn btn--line btn-w" id="tierAdd" style="margin-top:9px">${ICO("plus",14)}Paket qo'shish</button>
      <button class="btn btn--gold btn-w" id="itemOk" style="margin-top:14px">${ICO("check",14)}Saqlash</button>
      <div class="hint">Saqlagach “Nashr qilish” tugmasini bosishni unutmang.</div>`);

    el("catBack").onclick = renderCatalog;
    el("fMaint").onclick = () => el("fMaint").classList.toggle("on");
    el("tierAdd").onclick = () => {
      const wrap = document.createElement("div");
      wrap.innerHTML = tierRow({ id: "t" + Date.now().toString(36), label: {}, price: 0 }, el("tierRows").children.length);
      el("tierRows").appendChild(wrap.firstElementChild);
    };
    el("tierRows").addEventListener("click", e => {
      const d = e.target.closest("[data-tdel]");
      if (d) d.closest(".card").remove();
    });
    el("itemOk").onclick = () => {
      it.category = el("fCat").value;
      it.group = el("fGroup").value.trim();
      it.icon = el("fIcon").value.trim();
      it.cover = el("fCover").value.trim();
      it.region = el("fRegion").value.trim().toUpperCase();
      it.rating = Math.min(5, Math.max(1, Number(el("fRating").value) || 5));
      it.maint = el("fMaint").classList.contains("on");
      it.title = { uz: el("fTitleUz").value.trim(), ru: el("fTitleRu").value.trim() };
      it.field = el("fField").value;
      it.note = { uz: el("fNoteUz").value.trim(), ru: el("fNoteRu").value.trim() };
      it.tiers = [...el("tierRows").children].map(row => ({
        id: row.querySelector("[data-k=id]").value.trim() || "t" + Math.random().toString(36).slice(2, 7),
        label: { uz: row.querySelector("[data-k=lu]").value.trim(), ru: row.querySelector("[data-k=lr]").value.trim() },
        price: Number(row.querySelector("[data-k=price]").value) || 0,
        old: Number(row.querySelector("[data-k=old]").value) || 0,
        badge: row.querySelector("[data-k=badge]").value.trim(),
        qty: Number(row.querySelector("[data-k=qty]").value) || 0,
        active: true
      })).filter(x => x.label.uz || x.label.ru);
      toast("Saqlandi", "ok");
      renderCatalog();
    };
  }

  function tierRow(x, k) {
    return `<div class="editrow">
      <div style="display:flex;gap:7px;align-items:center">
        <b class="tiny">Paket ${k + 1}</b>
        <button class="btn btn--danger btn-sm" data-tdel style="margin-left:auto;padding:5px 10px;font-size:12px">${ICO("trash",14)}</button>
      </div>
      <input type="hidden" data-k="id" value="${esc(x.id || "")}">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px">
        <input class="input" data-k="lu" placeholder="Nomi UZ" value="${esc((x.label || {}).uz || "")}">
        <input class="input" data-k="lr" placeholder="Nomi RU" value="${esc((x.label || {}).ru || "")}">
        <input class="input" data-k="price" inputmode="numeric" placeholder="Narx" value="${Number(x.price) || 0}">
        <input class="input" data-k="old" inputmode="numeric" placeholder="Eski narx" value="${Number(x.old) || 0}">
        <input class="input" data-k="badge" placeholder="Yorliq (TOP)" value="${esc(x.badge || "")}">
        <input class="input" data-k="qty" inputmode="numeric" placeholder="Miqdor" value="${Number(x.qty) || 0}">
      </div>
    </div>`;
  }

  /* ─────────── Promokod ─────────── */
  async function tabPromo() {
    const s = await api("/api/admin/settings");
    A.settings = s;
    body(`
      <div class="ocard" style="margin:0">
        <b>Yangi promokod</b>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px">
          <input class="input" id="pCode" placeholder="MILLIY10" style="text-transform:uppercase">
          <select class="input" id="pType"><option value="percent">Foiz %</option><option value="fixed">So'm</option></select>
          <input class="input" id="pValue" inputmode="numeric" placeholder="Qiymat (10)">
          <input class="input" id="pMin" inputmode="numeric" placeholder="Min. buyurtma">
          <input class="input" id="pMax" inputmode="numeric" placeholder="Umumiy limit (0 = cheksiz)">
          <input class="input" id="pPer" inputmode="numeric" placeholder="1 kishiga" value="1">
        </div>
        <button class="btn btn--gold btn-w" id="pAdd" style="margin-top:10px">${ICO("plus",14)}Qo'shish</button>
      </div>
      <div class="rows" style="margin-top:12px">
        ${(s.promos || []).length ? s.promos.map(p => `
          <div class="row">
            <div class="row-ic">${ICO("tag",19)}</div>
            <div class="row-b">
              <div class="row-t">${esc(p.code)} · ${p.type === "fixed" ? som(p.value) : p.value + "%"}</div>
              <div class="row-s">Ishlatilgan: ${p.usedCount || 0}${p.maxUses ? " / " + p.maxUses : ""}${p.minOrder ? " · min " + som(p.minOrder) : ""}</div>
            </div>
            <div class="row-e" style="display:flex;gap:5px">
              <button class="btn btn--line btn-sm" data-ptog="${esc(p.code)}" style="padding:6px 9px">${p.active ? ICO("eye", 14) : ICO("eyeoff", 14)}</button>
              <button class="btn btn--danger btn-sm" data-pdel="${esc(p.code)}" style="padding:6px 9px">${ICO("trash",14)}</button>
            </div>
          </div>`).join("")
          : `<div class="empty"><div class="empty-i">${ICO("tag",19)}</div><div class="empty-t">Promokod yo'q</div></div>`}
      </div>`);

    el("pAdd").onclick = async () => {
      const code = el("pCode").value.trim().toUpperCase();
      if (!code) return toast("Kod kiriting", "err");
      try {
        await api("/api/admin/promo", {
          body: {
            action: "save", code, type: el("pType").value,
            value: Number(el("pValue").value) || 0,
            minOrder: Number(el("pMin").value) || 0,
            maxUses: Number(el("pMax").value) || 0,
            perUserLimit: Number(el("pPer").value) || 1
          }
        });
        toast("Qo'shildi", "ok");
        renderTab();
      } catch (e) { toast(errText(e), "err"); }
    };
    el("admBody").addEventListener("click", async e => {
      const tg2 = e.target.closest("[data-ptog]");
      const dl = e.target.closest("[data-pdel]");
      if (!tg2 && !dl) return;
      try {
        await api("/api/admin/promo", {
          body: dl ? { action: "delete", code: dl.getAttribute("data-pdel") }
                   : { action: "toggle", code: tg2.getAttribute("data-ptog") }
        });
        renderTab();
      } catch (err) { toast(errText(err), "err"); }
    });
  }

  /* ─────────── Sozlamalar ─────────── */
  async function tabSettings() {
    const s = await api("/api/admin/settings");
    A.settings = s;
    body(`
      <div class="sect"><h3>Do'kon</h3></div>
      <div class="fld"><label class="lbl">Nomi</label><input class="input" id="sBrand" value="${esc(s.shop.brand)}"></div>
      <div class="fld"><label class="lbl">Support username (@ siz)</label><input class="input" id="sSup" value="${esc(s.shop.supportUsername)}"></div>
      <div class="fld"><label class="lbl">Kanal havolasi</label><input class="input" id="sChan" value="${esc(s.shop.channelUrl)}"></div>
      <div class="fld"><label class="lbl">Sharhlar havolasi</label><input class="input" id="sRev" value="${esc(s.shop.reviewsUrl)}"></div>
      <div class="fld"><label class="lbl">Ish vaqti</label><input class="input" id="sHours" value="${esc(s.shop.workHours)}"></div>
      <div class="fld"><label class="lbl">E'lon (UZ)</label><textarea class="textarea" id="sNoteUz">${esc(s.shop.noticeUz)}</textarea></div>
      <div class="fld"><label class="lbl">E'lon (RU)</label><textarea class="textarea" id="sNoteRu">${esc(s.shop.noticeRu)}</textarea></div>

      <div class="sect"><h3>Kartalar</h3></div>
      <div id="cardRows">${(s.cards || []).map(cardRow).join("")}</div>
      <button class="btn btn--line btn-w" id="cardAdd" style="margin-top:9px">${ICO("plus",14)}Karta</button>

      <div class="sect"><h3>Kanallar (chat_id)</h3></div>
      <div class="fld"><label class="lbl">Buyurtmalar kanali</label>
        <div style="display:flex;gap:7px"><input class="input" id="chOrder" value="${esc(s.channels.order)}">
        <button class="btn btn--line btn-sm" data-chtest="chOrder" style="flex:none">${ICO("send",14)}</button></div></div>
      <div class="fld"><label class="lbl">To'lovlar kanali (SMS botlari shu yerda)</label>
        <div style="display:flex;gap:7px"><input class="input" id="chTopup" value="${esc(s.channels.topup)}">
        <button class="btn btn--line btn-sm" data-chtest="chTopup" style="flex:none">${ICO("send",14)}</button></div></div>
      <div class="fld"><label class="lbl">Loglar kanali</label>
        <div style="display:flex;gap:7px"><input class="input" id="chLog" value="${esc(s.channels.log)}">
        <button class="btn btn--line btn-sm" data-chtest="chLog" style="flex:none">${ICO("send",14)}</button></div></div>

      <div class="sect"><h3>Referal</h3></div>
      <div class="fld"><label class="lbl">
        <input type="checkbox" id="rEn" ${s.referral.enabled ? "checked" : ""}> Yoqilgan</label></div>
      <div class="fld"><label class="lbl">Har xariddan foiz (%)</label>
        <input class="input" id="rPct" inputmode="numeric" value="${s.referral.percent}"></div>

      <div class="sect"><h3>Sodiqlik darajalari</h3></div>
      <div class="fld"><label class="lbl">
        <input type="checkbox" id="lEn" ${s.loyalty.enabled ? "checked" : ""}> Yoqilgan</label></div>
      <div id="tierCfg">${(s.loyalty.tiers || []).map(loyRow).join("")}</div>
      <button class="btn btn--line btn-w" id="loyAdd" style="margin-top:9px">${ICO("plus",14)}Daraja</button>

      <button class="btn btn--gold btn-w" id="setSave" style="margin-top:16px">${ICO("check",14)}Saqlash</button>
      <div class="hint">Adminlar: ${(s.adminIds || []).join(", ") || "—"} (ADMIN_IDS env orqali).</div>`);

    el("cardAdd").onclick = () => {
      const w = document.createElement("div");
      w.innerHTML = cardRow({ id: "c" + Date.now().toString(36), type: "HUMO", number: "", holder: "" });
      el("cardRows").appendChild(w.firstElementChild);
    };
    el("loyAdd").onclick = () => {
      const w = document.createElement("div");
      w.innerHTML = loyRow({ name: "", minSpent: 0, percent: 0 });
      el("tierCfg").appendChild(w.firstElementChild);
    };
    el("admBody").addEventListener("click", async e => {
      const d = e.target.closest("[data-rowdel]");
      if (d) return d.closest(".card").remove();
      const ct = e.target.closest("[data-chtest]");
      if (ct) {
        const chatId = el(ct.getAttribute("data-chtest")).value.trim();
        try {
          await api("/api/admin/channel-test", { body: { chatId } });
          toast("Yuborildi", "ok");
        } catch (err) { toast((err.data && err.data.error) || errText(err), "err"); }
      }
    });

    el("setSave").onclick = async () => {
      const cards = [...el("cardRows").children].map(r => ({
        id: r.querySelector("[data-k=id]").value,
        type: r.querySelector("[data-k=type]").value,
        number: r.querySelector("[data-k=num]").value.trim(),
        holder: r.querySelector("[data-k=holder]").value.trim()
      })).filter(c => c.number);
      const tiers = [...el("tierCfg").children].map(r => ({
        name: r.querySelector("[data-k=name]").value.trim(),
        minSpent: Number(r.querySelector("[data-k=min]").value) || 0,
        percent: Number(r.querySelector("[data-k=pct]").value) || 0
      })).filter(x => x.name);
      const rows = (boxId, keys) => [...el(boxId).children].map(r => {
        const o = {};
        keys.forEach(k => {
          const n = r.querySelector("[data-k=" + k + "]");
          o[k] = n ? n.value.trim() : "";
        });
        return o;
      });
      try {
        await api("/api/admin/settings", {
          body: {
            links: rows("linkRows", ["icon", "color", "title", "sub", "url"]),
            socials: rows("socRows", ["icon", "title", "url"]),
            faq: rows("faqRows", ["q", "a"]),
            about: el("sAbout").value.trim(),
            shop: {
              brand: el("sBrand").value, supportUsername: el("sSup").value,
              channelUrl: el("sChan").value, reviewsUrl: el("sRev").value,
              workHours: el("sHours").value,
              noticeUz: el("sNoteUz").value, noticeRu: el("sNoteRu").value
            },
            cards,
            channels: { order: el("chOrder").value, topup: el("chTopup").value, log: el("chLog").value },
            referral: { enabled: el("rEn").checked, percent: Number(el("rPct").value) || 0 },
            loyalty: { enabled: el("lEn").checked, tiers }
          }
        });
        toast(t("ok.saved"), "ok");
        window.mpApi("/api/config").then(c => { window.MP.config = c; window.mpRender(); });
      } catch (e) { toast(errText(e), "err"); }
    };
  }

  function cardRow(c) {
    return `<div class="editrow">
      <input type="hidden" data-k="id" value="${esc(c.id || "")}">
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:7px">
        <select class="input" data-k="type">
          <option ${c.type === "HUMO" ? "selected" : ""}>HUMO</option>
          <option ${c.type === "UZCARD" ? "selected" : ""}>UZCARD</option>
        </select>
        <input class="input" data-k="num" placeholder="0000 0000 0000 0000" value="${esc(c.number || "")}">
      </div>
      <div style="display:flex;gap:7px;margin-top:7px">
        <input class="input" data-k="holder" placeholder="KARTA EGASI" value="${esc(c.holder || "")}">
        <button class="btn btn--danger btn-sm" data-rowdel style="flex:none;padding:8px 12px">${ICO("trash",14)}</button>
      </div>
    </div>`;
  }
  function loyRow(x) {
    return `<div class="card" style="padding:11px;margin-top:9px;display:grid;grid-template-columns:1.2fr 1fr .7fr auto;gap:7px;align-items:center">
      <input class="input" data-k="name" placeholder="Nom" value="${esc(x.name || "")}">
      <input class="input" data-k="min" inputmode="numeric" placeholder="Summa" value="${Number(x.minSpent) || 0}">
      <input class="input" data-k="pct" inputmode="numeric" placeholder="%" value="${Number(x.percent) || 0}">
      <button class="btn btn--danger btn-sm" data-rowdel style="padding:8px 11px">${ICO("trash",14)}</button>
    </div>`;
  }

  /* ─────────── Tarqatma ─────────── */
  function tabCast() {
    body(`
      <div class="hint">Xabar barcha bloklanmagan foydalanuvchilarga yuboriladi. HTML teglar (&lt;b&gt;, &lt;i&gt;, &lt;a&gt;) ishlaydi.</div>
      <div class="field"><textarea class="textarea" id="castText" style="min-height:150px" maxlength="3500"
        placeholder="Milliy Pin&#10;&#10;Yangi chegirmalar boshlandi!"></textarea></div>
      <button class="btn btn--gold btn-w" id="castSend">${ICO("send",14)}Yuborish</button>`);
    el("castSend").onclick = async () => {
      const text = el("castText").value.trim();
      if (!text) return toast("Matn kiriting", "err");
      if (!confirm("Xabar barcha foydalanuvchilarga yuborilsinmi?")) return;
      const b = el("castSend");
      b.disabled = true; b.textContent = t("common.loading");
      try {
        const r = await api("/api/admin/broadcast", { body: { text } });
        toast("Navbatga qo'yildi: " + r.queued, "ok");
      } catch (e) { toast(errText(e), "err"); }
      b.disabled = false; b.innerHTML = ICO("send", 14) + "Yuborish";
    };
  }
})();
