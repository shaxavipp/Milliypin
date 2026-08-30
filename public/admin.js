/* admin.js — Milliy Pin admin paneli.
 *
 * Tuzilma: bitta menyu ekrani + mustaqil bo'lim ekranlari. Ilgari bo'limlar
 * gorizontal siljiydigan chiplarda edi — telefonda ular ekrandan chiqib ketardi
 * va qaysi bo'lim borligini ko'rish uchun surish kerak bo'lardi. Endi menyuda
 * hamma bo'lim ikki ustunli to'rda ko'rinib turadi, ichkariga kirilganda esa
 * yuqorida "orqaga" qatori bo'ladi.
 *
 * Faqat ADMIN_IDS ro'yxatidagi Telegram akkauntlarga ochiladi; server ham har bir
 * so'rovni qayta tekshiradi, ya'ni panelni "ko'rish" hech narsa bermaydi. */
(function () {
  "use strict";

  const t = k => window.I18N.t(k);
  const esc = s => window.escHtml(s);
  const api = (...a) => window.mpApi(...a);
  const toast = (...a) => window.mpToast(...a);
  const errText = e => window.mpErr(e);
  const ask = (title, o) => window.mpConfirm(title, o);
  const askText = (title, o) => window.mpPrompt(title, o);
  const el = id => document.getElementById(id);
  const ICO = window.ICO;

  const nf = new Intl.NumberFormat("ru-RU");
  const money = n => nf.format(Math.round(Number(n) || 0)).replace(/ /g, " ");
  const som = n => money(n) + " so'm";
  const dt = ts => new Date(ts).toLocaleString("ru-RU",
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const A = {
    screen: "menu",
    period: "today",
    orderFilter: "new",
    payFilter: "pending",
    payQuery: "",
    orderQuery: "",
    userQuery: "",
    catalog: [],
    settings: null
  };

  /* ═══════════ Karkas ═══════════ */

  function openAdmin() {
    window.mpSheet("Admin panel", `<div id="admBody"><div class="skel"></div></div>`);
    go("menu");
  }
  window.mpOpenAdmin = openAdmin;

  // Har render'da #admBody yangi tugun bilan almashtiriladi — shu sabab oldingi
  // render biriktirgan hodisa tinglovchilari to'planib qolmaydi.
  function body(html) {
    const old = el("admBody");
    if (!old) return;
    const n = document.createElement("div");
    n.id = "admBody";
    n.innerHTML = html;
    old.replaceWith(n);
  }
  const loading = () => body(`<div class="skel"></div><div class="skel" style="margin-top:8px"></div>`);

  const SCREENS = {
    menu:     { title: "Admin panel",   render: scrMenu },
    money:    { title: "Moliya",        render: scrMoney },
    orders:   { title: "Buyurtmalar",   render: scrOrders },
    payments: { title: "To'lovlar",     render: scrPayments },
    users:    { title: "Mijozlar",      render: scrUsers },
    catalog:  { title: "Katalog",       render: scrCatalog },
    promo:    { title: "Promokodlar",   render: scrPromo },
    reviews:  { title: "Sharhlar",      render: scrReviews },
    settings: { title: "Sozlamalar",    render: scrSettings },
    cast:     { title: "Tarqatma",      render: scrCast },
    backup:   { title: "Zaxira / JSON", render: scrBackup }
  };

  async function go(screen) {
    A.screen = SCREENS[screen] ? screen : "menu";
    const s = SCREENS[A.screen];
    const title = el("sheetTitle");
    if (title) title.textContent = s.title;
    loading();
    try { await s.render(); }
    catch (e) { body(backBar() + `<div class="errline">${esc(errText(e))}</div>`); }
    const b = el("admBack");
    if (b) b.onclick = () => go("menu");
    // Telegram "orqaga" tugmasi panelni yopmasin — menyuga qaytarsin
    window.mpSetSheetBack(A.screen === "menu" ? null : () => { go("menu"); return true; });
    const sb = document.querySelector(".sh-body");
    if (sb) sb.scrollTop = 0;
  }

  const backBar = () => A.screen === "menu" ? "" :
    `<button class="admback" id="admBack">${ICO("back", 15)}Bo'limlar</button>`;

  /* ═══════════ Menyu ═══════════ */

  const PERIODS = [
    { id: "today", label: "Bugun" }, { id: "week", label: "Hafta" },
    { id: "month", label: "Oy" }, { id: "all", label: "Hammasi" }
  ];

  // Menyu tugmalari — ikki ustunli to'r. `badge` — diqqat talab qiladigan son.
  const MENU = [
    { id: "orders",   ic: "scroll",    label: "Buyurtmalar", badge: d => d.pendingOrders + d.processingOrders },
    { id: "payments", ic: "card",      label: "To'lovlar",   badge: d => d.pendingPayments },
    { id: "users",    ic: "users",     label: "Mijozlar" },
    { id: "catalog",  ic: "box",       label: "Katalog" },
    { id: "promo",    ic: "tag",       label: "Promokodlar" },
    { id: "reviews",  ic: "star",      label: "Sharhlar" },
    { id: "settings", ic: "cog",       label: "Sozlamalar" },
    { id: "cast",     ic: "megaphone", label: "Tarqatma" }
  ];

  async function scrMenu() {
    const d = await api("/api/admin/overview?period=" + A.period);
    const open = d.pendingOrders + d.processingOrders + d.pendingPayments;

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

      <button class="admhero ${open ? "hot" : ""}" data-go="money">
        <span class="admhero-ic">${ICO("wallet", 20)}</span>
        <span class="admhero-b">
          <span class="admhero-t">Moliya — to'lov va buyurtmalar</span>
          <span class="admhero-s">${open
            ? d.pendingPayments + " to'lov · " + (d.pendingOrders + d.processingOrders) + " buyurtma kutmoqda"
            : "Kutayotgan ish yo'q"}</span>
        </span>
        ${ICO("chevron", 16)}
      </button>

      <div class="sect"><h3>Bo'limlar</h3></div>
      <div class="admgrid">
        ${MENU.map(m => {
          const n = m.badge ? m.badge(d) : 0;
          return `<button class="admtile" data-go="${m.id}">
            ${n ? `<span class="admtile-badge">${n}</span>` : ""}
            ${ICO(m.ic, 20)}
            <span class="admtile-t">${m.label}</span>
          </button>`;
        }).join("")}
      </div>

      ${d.top && d.top.length ? `
        <div class="sect"><h3>Eng ko'p sotilgan</h3></div>
        <div class="rows" style="padding:0">
          ${d.top.map((x, i) => `<div class="row">
            <span class="row-ic">${i + 1}</span>
            <span class="row-b"><span class="row-t">${esc(x.title)}</span></span>
            <span class="row-e"><span class="row-p">${x.n}</span></span>
          </div>`).join("")}
        </div>` : ""}

      <div class="admgrid" style="margin-top:11px">
        <button class="admtile" data-go="backup">${ICO("download", 20)}<span class="admtile-t">Zaxira / JSON</span></button>
        <button class="admtile" id="admExport">${ICO("send", 20)}<span class="admtile-t">CSV Telegramga</span></button>
      </div>`);

    el("pSeg").addEventListener("click", e => {
      const b = e.target.closest("[data-p]");
      if (!b) return;
      A.period = b.getAttribute("data-p");
      go("menu");
    });
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

  /* ═══════════ Moliya ═══════════ */

  async function scrMoney() {
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

    body(`${backBar()}
      <div class="sect sect--first"><h3>Kutayotgan to'lovlar</h3></div>
      <div class="ocard" style="margin:0">
        ${d.payments.length ? d.payments.map(payRow).join("") : `<div class="tiny mut">Bo'sh</div>`}
      </div>

      <div class="sect"><h3>Ochiq buyurtmalar</h3></div>
      <div class="ocard" style="margin:0">
        ${d.orders.length ? d.orders.map(ordRow).join("") : `<div class="tiny mut">Bo'sh</div>`}
      </div>

      <div class="sect"><h3>Mijoz qidirish</h3></div>
      <div class="inline">
        <input class="input" id="mq" placeholder="ID yoki @username" value="${esc(A.userQuery)}">
        <button class="btn btn--acc" id="mqBtn">${ICO("search", 15)}</button>
      </div>
      <div id="mqRes"></div>`);

    const run = () => { A.userQuery = el("mq").value.trim(); findUser(A.userQuery, "mqRes"); };
    el("mqBtn").onclick = run;
    el("mq").addEventListener("keydown", e => { if (e.key === "Enter") run(); });
    if (A.userQuery) findUser(A.userQuery, "mqRes");

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
        go("money");
      } catch (err) { toast(errText(err), "err"); btn.disabled = false; }
    });
  }

  /* ═══════════ Buyurtmalar ═══════════ */

  const OSTATUS = [
    { id: "new", label: "Yangi" }, { id: "processing", label: "Jarayonda" },
    { id: "done", label: "Bajarilgan" }, { id: "canceled", label: "Bekor" }, { id: "all", label: "Hammasi" }
  ];

  async function scrOrders() {
    const list = await api("/api/admin/orders?status=" + encodeURIComponent(A.orderFilter) +
      (A.orderQuery ? "&q=" + encodeURIComponent(A.orderQuery) : ""));
    body(`${backBar()}
      <div class="pills">
        ${OSTATUS.map(s => `<button class="pill ${s.id === A.orderFilter ? "on" : ""}" data-ost="${s.id}">${s.label}</button>`).join("")}
      </div>
      <div class="inline" style="margin-bottom:11px">
        <input class="input" id="oq" placeholder="#raqam / @username / ID / mahsulot" value="${esc(A.orderQuery)}">
        <button class="btn ${A.orderQuery ? "btn--line" : "btn--acc"}" id="oqBtn">${ICO(A.orderQuery ? "x" : "search", 15)}</button>
      </div>
      <div class="tiny mut" style="margin:-4px 0 9px">Topildi: ${list.length} ta</div>
      ${list.length ? list.map(o => `
        <div class="ocard" style="margin-left:0;margin-right:0">
          <div class="oc-top">
            <span class="oc-n">${ICO(o.itemIcon || "gift", 16)}<span>#${o.seq} ${esc(o.itemTitle)}</span></span>
            <span class="tag tag--${esc(o.status)}">${t("st." + o.status)}</span>
          </div>
          <div class="oc-b">
            ${esc(o.tierLabel)}${o.qty > 1 ? " × " + o.qty : ""} · <b class="price">${som(o.total)}</b>
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
            ${o.status === "new" ? `<button class="btn btn--line btn-sm" data-ord="processing" data-id="${esc(o.id)}">${ICO("clock", 14)}Olindi</button>` : ""}
            <button class="btn btn--acc btn-sm" data-ord="done" data-id="${esc(o.id)}">${ICO("check", 14)}Bajarildi</button>
            <button class="btn btn--danger btn-sm" data-ord="cancel" data-id="${esc(o.id)}">${ICO("x", 14)}Bekor</button>
          </div>` : ""}
        </div>`).join("")
        : `<div class="empty">${ICO("scroll", 34)}<div class="empty-t">Bo'sh</div></div>`}`);

    // Qidiruvda holat filtri "Hammasi" ga o'tadi: admin #32 ni izlaganda u
    // qaysi holatda ekanini bilmaydi, "Yangi" filtri esa uni yashirib qo'yardi.
    const runQ = () => {
      A.orderQuery = el("oq").value.trim();
      if (A.orderQuery) A.orderFilter = "all";
      go("orders");
    };
    el("oqBtn").onclick = () => {
      if (A.orderQuery) { el("oq").value = ""; }
      runQ();
    };
    el("oq").onkeydown = e => { if (e.key === "Enter") runQ(); };

    el("admBody").addEventListener("click", async e => {
      const f = e.target.closest("[data-ost]");
      if (f) { A.orderFilter = f.getAttribute("data-ost"); return go("orders"); }

      const c = e.target.closest("[data-copy]");
      if (c) return window.mpCopy(c.getAttribute("data-copy"));

      const b = e.target.closest("[data-ord]");
      if (!b) return;
      const action = b.getAttribute("data-ord");
      let note = "";
      if (action === "cancel") {
        note = await askText("Buyurtmani bekor qilish", {
          text: "Sabab mijozga xabar qilinadi. Bo'sh qoldirsangiz ham bo'ladi.",
          placeholder: "Masalan: ID noto'g'ri", no: "Orqaga", yes: "Bekor qilinsin", danger: true
        });
        if (note === null) return;
      }
      if (action === "done" && !(await ask("Buyurtma bajarildi deb belgilansinmi?",
        { yes: "Bajarildi", danger: false }))) return;
      b.disabled = true;
      try {
        await api("/api/admin/order", { body: { id: b.getAttribute("data-id"), action, note } });
        toast("Bajarildi", "ok");
        go("orders");
      } catch (err) { toast(errText(err), "err"); b.disabled = false; }
    });
  }

  /* ═══════════ To'lovlar ═══════════ */

  const PSTATUS = [
    { id: "pending", label: "Kutilmoqda" }, { id: "confirmed", label: "Tasdiqlangan" },
    { id: "rejected", label: "Rad etilgan" }, { id: "expired", label: "Muddati o'tgan" },
    { id: "all", label: "Hammasi" }
  ];

  async function scrPayments() {
    const list = await api("/api/admin/payments?status=" + encodeURIComponent(A.payFilter) +
      (A.payQuery ? "&q=" + encodeURIComponent(A.payQuery) : ""));

    body(`${backBar()}
      <div class="pills">
        ${PSTATUS.map(x => `<button class="pill ${x.id === A.payFilter ? "on" : ""}" data-pst="${x.id}">${x.label}</button>`).join("")}
      </div>
      <div class="inline" style="margin-bottom:11px">
        <input class="input" id="pq" placeholder="ID / @username / summa" value="${esc(A.payQuery)}">
        <button class="btn ${A.payQuery ? "btn--line" : "btn--acc"}" id="pqBtn">${ICO(A.payQuery ? "x" : "search", 15)}</button>
      </div>
      <div class="hint" style="margin-bottom:11px">${ICO("info", 13)}<span>Bank SMS'idagi summa bilan solishtiring. Tasdiqlangach mijoz balansiga <b>asosiy summa</b> tushadi.</span></div>
      ${list.length ? list.map(p => `
        <div class="ocard" style="margin-left:0;margin-right:0">
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

    const run = () => {
      A.payQuery = el("pq").value.trim();
      if (A.payQuery) A.payFilter = "all";
      go("payments");
    };
    el("pqBtn").onclick = () => {
      if (A.payQuery) { el("pq").value = ""; }
      run();
    };
    el("pq").addEventListener("keydown", e => { if (e.key === "Enter") run(); });

    el("admBody").addEventListener("click", async e => {
      const f = e.target.closest("[data-pst]");
      if (f) { A.payFilter = f.getAttribute("data-pst"); return go("payments"); }

      const c = e.target.closest("[data-copy]");
      if (c) return window.mpCopy(c.getAttribute("data-copy"));

      const b = e.target.closest("[data-pay]");
      if (!b) return;
      b.disabled = true;
      try {
        await api("/api/admin/payment", { body: { id: b.getAttribute("data-id"), action: b.getAttribute("data-pay") } });
        toast("Bajarildi", "ok");
        go("payments");
      } catch (err) { toast(errText(err), "err"); b.disabled = false; }
    });
  }

  /* ═══════════ Mijozlar ═══════════ */

  async function scrUsers() {
    body(`${backBar()}
      <div class="inline">
        <input class="input" id="uq" placeholder="ID yoki @username" value="${esc(A.userQuery)}">
        <button class="btn btn--acc" id="uqBtn">${ICO("search", 15)}</button>
      </div>
      <div id="uqRes"></div>`);
    const run = () => { A.userQuery = el("uq").value.trim(); findUser(A.userQuery, "uqRes"); };
    el("uqBtn").onclick = run;
    el("uq").addEventListener("keydown", e => { if (e.key === "Enter") run(); });
    findUser(A.userQuery, "uqRes");
  }

  // Mijoz qidiruvi natijasi — Moliya va Mijozlar ekranlarida bir xil ishlatiladi
  async function findUser(q, boxId) {
    const box = el(boxId);
    if (!box) return;
    box.innerHTML = `<div class="skel" style="margin-top:9px"></div>`;
    let list = [];
    try { list = await api("/api/admin/users" + (q ? "?q=" + encodeURIComponent(q) : "")); }
    catch (e) { box.innerHTML = `<div class="errline">${esc(errText(e))}</div>`; return; }

    box.innerHTML = list.length ? list.slice(0, 20).map(u => `
      <div class="ocard" style="margin:9px 0 0">
        <div class="oc-top">
          <span class="oc-n" data-copy="${esc(u.id)}">${u.username ? "@" + esc(u.username) : esc(u.firstName || u.id)}</span>
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

    box.onclick = async e => {
      const cp = e.target.closest("[data-copy]");
      if (cp) return window.mpCopy(cp.getAttribute("data-copy"));

      const add = e.target.closest("[data-badd]"), sub = e.target.closest("[data-bsub]");
      if (add || sub) {
        const id = (add || sub).getAttribute(add ? "data-badd" : "data-bsub");
        const inp = box.querySelector('[data-amt="' + id + '"]');
        const v = Math.round(Number(inp && inp.value) || 0);
        if (!v) return toast("Summani kiriting", "err");
        try {
          await api("/api/admin/user", { body: { id, action: "balance", delta: add ? v : -v } });
          toast("Bajarildi", "ok");
          findUser(q, boxId);
        } catch (err) { toast(errText(err), "err"); }
        return;
      }
      const blk = e.target.closest("[data-block]");
      if (blk) {
        try {
          await api("/api/admin/user", {
            body: { id: blk.getAttribute("data-block"), action: "block", blocked: blk.getAttribute("data-on") === "1" }
          });
          findUser(q, boxId);
        } catch (err) { toast(errText(err), "err"); }
        return;
      }
      const h = e.target.closest("[data-hist]");
      if (h) openHistory(h.getAttribute("data-hist"));
    };
  }

  async function openHistory(uid) {
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
      </div>
      <button class="btn btn--line btn-w" style="margin-top:12px" id="histBack">${ICO("back", 14)}Admin panelga</button>`);

    const back = () => { const s = A.screen; openAdmin(); go(s); };
    el("histBack").onclick = back;
    window.mpSetSheetBack(() => { back(); return true; });
  }

  /* ═══════════ Katalog ═══════════ */

  async function scrCatalog() {
    A.catalog = await api("/api/admin/catalog");
    renderCatalog();
  }

  function renderCatalog() {
    window.mpSetSheetBack(() => { go("menu"); return true; });
    body(`${backBar()}
      <button class="btn btn--ok btn-w" id="catSave">${ICO("send", 15)}Nashr qilish — hammaga ko'rsatish</button>
      <div class="hint" style="margin-top:7px">${ICO("info", 13)}<span>Joriy katalogni serverga yuboradi: barcha mijozlar darhol ko'radi.</span></div>
      <button class="btn btn--acc btn-w" id="catAdd" style="margin-top:9px">${ICO("plus", 15)}Yangi mahsulot</button>

      <div class="sect"><h3>Katalog · ${A.catalog.length} ta</h3></div>
      <div class="catlist">
        ${A.catalog.map((it, i) => `
          <div class="catrow ${it.active === false ? "off" : ""}">
            <span class="catrow-b">
              <span class="catrow-t">${esc(window.I18N.pick(it.title) || it.id)}</span>
              <span class="catrow-s">${esc(it.group || "—")} · ${(it.tiers || []).length} paket${it.maint ? " · texnik ish" : ""}</span>
            </span>
            <span class="catrow-a">
              <button data-cup="${i}" title="Yuqoriga">${ICO("back", 14)}</button>
              <button data-cedit="${i}" title="Tahrirlash">${ICO("edit", 14)}</button>
              <button data-ctoggle="${i}" title="Ko'rinish">${ICO(it.active === false ? "eyeoff" : "eye", 14)}</button>
              <button class="del" data-cdel="${i}" title="O'chirish">${ICO("trash", 14)}</button>
            </span>
          </div>`).join("")}
      </div>`);

    el("catSave").onclick = async () => {
      const b = el("catSave");
      b.disabled = true;
      try {
        const r = await api("/api/admin/catalog", { body: { items: A.catalog } });
        toast("Nashr qilindi: " + r.count + " ta", "ok");
        api("/api/catalog").then(c => { window.MP.catalog = c; window.mpRender(); });
      } catch (e) { toast(errText(e), "err"); }
      b.disabled = false;
    };
    el("catAdd").onclick = () => {
      A.catalog.unshift({
        id: "it_" + Date.now().toString(36), category: "game", group: "Yangi guruh", icon: "pad",
        title: { uz: "Yangi mahsulot", ru: "Новый товар" }, field: "playerId",
        note: { uz: "", ru: "" }, cover: "", region: "", rating: 5, active: true, maint: false,
        tiers: [{ id: "t1", label: { uz: "Paket 1", ru: "Пакет 1" }, price: 10000, old: 0, badge: "", qty: 0, active: true }]
      });
      editItem(0);
    };

    el("admBody").addEventListener("click", async e => {
      const num = sel => {
        const n = e.target.closest("[data-" + sel + "]");
        return n ? Number(n.getAttribute("data-" + sel)) : -1;
      };
      let i;
      if ((i = num("cedit")) >= 0) return editItem(i);
      if ((i = num("ctoggle")) >= 0) { A.catalog[i].active = A.catalog[i].active === false; return renderCatalog(); }
      if ((i = num("cup")) >= 0) {
        if (i === 0) return;
        const x = A.catalog.splice(i, 1)[0];
        A.catalog.splice(i - 1, 0, x);
        return renderCatalog();
      }
      if ((i = num("cdel")) >= 0) {
        const idx = i;
        const nm = window.I18N.pick((A.catalog[idx] || {}).title);
        if (await ask("Mahsulot o'chirilsinmi?", { text: nm, yes: "O'chirish" })) {
          A.catalog.splice(idx, 1);
          renderCatalog();
        }
        return;
      }
    });
  }

  const FIELDS = [
    ["username", "Telegram username"], ["playerId", "Player ID"],
    ["playerZone", "ID + Zone/Server"], ["nickname", "Nik"], ["link", "Havola"]
  ];
  const PROD_ICONS = ["crown", "star4", "gift", "megaphone", "eye", "heart", "target", "flame",
    "sword", "coin", "gem", "castle", "helmet", "box3", "petal", "pad", "card", "wallet"];

  function editItem(i) {
    const it = A.catalog[i];
    body(`
      <button class="admback" id="catBack">${ICO("back", 15)}Katalog</button>

      <div class="fld"><label class="lbl">Bo'lim</label>
        <select class="input" id="fCat">
          <option value="game" ${it.category === "game" ? "selected" : ""}>O'yinlar</option>
          <option value="telegram" ${it.category === "telegram" ? "selected" : ""}>Telegram</option>
        </select></div>
      <div class="editgrid">
        <div><label class="lbl">Guruh</label>
          <input class="input" id="fGroup" value="${esc(it.group || "")}"></div>
        <div><label class="lbl">Ikonka</label>
          <select class="input" id="fIcon">
            ${PROD_ICONS.map(k => `<option ${it.icon === k ? "selected" : ""}>${k}</option>`).join("")}
          </select></div>
      </div>
      <div class="editgrid">
        <div><label class="lbl">Nomi (UZ)</label>
          <input class="input" id="fTitleUz" value="${esc((it.title || {}).uz || "")}"></div>
        <div><label class="lbl">Nomi (RU)</label>
          <input class="input" id="fTitleRu" value="${esc((it.title || {}).ru || "")}"></div>
      </div>
      <div class="fld"><label class="lbl">Muqova rasmi (havola)</label>
        <input class="input" id="fCover" value="${esc(it.cover || "")}" placeholder="https://..."></div>
      <div class="editgrid">
        <div><label class="lbl">Hudud yorlig'i</label>
          <input class="input" id="fRegion" value="${esc(it.region || "")}" placeholder="GLOBAL / SNG / AVTO"></div>
        <div><label class="lbl">Reyting (1-5)</label>
          <input class="input" id="fRating" inputmode="decimal" value="${Number(it.rating) || 5}"></div>
      </div>
      <div class="fld"><label class="lbl">Mijozdan so'raladigan ma'lumot</label>
        <select class="input" id="fField">
          ${FIELDS.map(f => `<option value="${f[0]}" ${it.field === f[0] ? "selected" : ""}>${f[1]}</option>`).join("")}
        </select></div>
      <div class="fld"><label class="lbl">Eslatma (UZ)</label>
        <textarea class="textarea" id="fNoteUz">${esc((it.note || {}).uz || "")}</textarea></div>
      <div class="fld"><label class="lbl">Eslatma (RU)</label>
        <textarea class="textarea" id="fNoteRu">${esc((it.note || {}).ru || "")}</textarea></div>
      <div class="switch"><span class="lbl">Texnik ish (sotib bo'lmaydi)</span>
        <span class="sw ${it.maint ? "on" : ""}" id="fMaint"><i></i></span></div>

      <div class="sect"><h3>Paketlar</h3></div>
      <div id="tierRows">${(it.tiers || []).map(tierRow).join("")}</div>
      <button class="btn btn--line btn-w" id="tierAdd" style="margin-top:9px">${ICO("plus", 14)}Paket qo'shish</button>
      <button class="btn btn--acc btn-w" id="itemOk" style="margin-top:12px">${ICO("check", 15)}Saqlash</button>
      <div class="hint" style="margin-top:7px">${ICO("info", 13)}<span>Saqlagach “Nashr qilish” tugmasini bosishni unutmang.</span></div>`);

    el("catBack").onclick = renderCatalog;
    window.mpSetSheetBack(() => { renderCatalog(); return true; });
    el("fMaint").onclick = () => el("fMaint").classList.toggle("on");
    el("tierAdd").onclick = () => {
      const w = document.createElement("div");
      w.innerHTML = tierRow({ id: "t" + Date.now().toString(36), label: {}, price: 0 });
      el("tierRows").appendChild(w.firstElementChild);
    };
    el("tierRows").addEventListener("click", e => {
      const d = e.target.closest("[data-tdel]");
      if (d) d.closest(".editrow").remove();
    });
    el("itemOk").onclick = () => {
      it.category = el("fCat").value;
      it.group = el("fGroup").value.trim();
      it.icon = el("fIcon").value;
      it.title = { uz: el("fTitleUz").value.trim(), ru: el("fTitleRu").value.trim() };
      it.cover = el("fCover").value.trim();
      it.region = el("fRegion").value.trim().toUpperCase();
      it.rating = Math.min(5, Math.max(1, Number(el("fRating").value) || 5));
      it.field = el("fField").value;
      it.note = { uz: el("fNoteUz").value.trim(), ru: el("fNoteRu").value.trim() };
      it.maint = el("fMaint").classList.contains("on");
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

  function tierRow(x) {
    return `<div class="editrow">
      <input type="hidden" data-k="id" value="${esc(x.id || "")}">
      <div class="editgrid">
        <input class="input" data-k="lu" placeholder="Nomi UZ" value="${esc((x.label || {}).uz || "")}">
        <input class="input" data-k="lr" placeholder="Nomi RU" value="${esc((x.label || {}).ru || "")}">
        <input class="input" data-k="price" inputmode="numeric" placeholder="Narx" value="${Number(x.price) || 0}">
        <input class="input" data-k="old" inputmode="numeric" placeholder="Eski narx" value="${Number(x.old) || 0}">
        <input class="input" data-k="badge" placeholder="Yorliq (TOP)" value="${esc(x.badge || "")}">
        <input class="input" data-k="qty" inputmode="numeric" placeholder="Miqdor" value="${Number(x.qty) || 0}">
      </div>
      <button class="btn btn--danger btn-sm btn-w" data-tdel style="margin-top:7px">${ICO("trash", 14)}Paketni o'chirish</button>
    </div>`;
  }

  /* ═══════════ Promokodlar ═══════════ */

  async function scrPromo() {
    const s = await api("/api/admin/settings");
    A.settings = s;
    body(`${backBar()}
      <div class="ocard" style="margin:0">
        <b>Yangi promokod</b>
        <div class="editgrid" style="margin-top:9px">
          <input class="input" id="pCode" placeholder="MILLIY10" style="text-transform:uppercase">
          <select class="input" id="pType"><option value="percent">Foiz %</option><option value="fixed">So'm</option></select>
          <input class="input" id="pValue" inputmode="numeric" placeholder="Qiymat (10)">
          <input class="input" id="pMin" inputmode="numeric" placeholder="Min. buyurtma">
          <input class="input" id="pMax" inputmode="numeric" placeholder="Umumiy limit (0 = cheksiz)">
          <input class="input" id="pPer" inputmode="numeric" placeholder="1 kishiga" value="1">
        </div>
        <input class="input" id="pNote" placeholder="Izoh (mijozga ko'rinadi)" style="margin-top:7px">
        <button class="btn btn--acc btn-w" id="pAdd" style="margin-top:10px">${ICO("plus", 14)}Qo'shish</button>
      </div>

      <div class="sect"><h3>Mavjud kodlar</h3></div>
      <div class="rows" style="padding:0">
        ${(s.promos || []).length ? s.promos.map(p => `
          <div class="row">
            <span class="row-ic">${ICO("tag", 19)}</span>
            <span class="row-b">
              <span class="row-t">${esc(p.code)} · ${p.type === "fixed" ? som(p.value) : p.value + "%"}</span>
              <span class="row-s">Ishlatilgan: ${p.usedCount || 0}${p.maxUses ? " / " + p.maxUses : ""}${p.minOrder ? " · min " + som(p.minOrder) : ""}</span>
            </span>
            <span class="row-e" style="display:flex;gap:5px">
              <button class="btn btn--line btn-sm" data-ptog="${esc(p.code)}">${p.active ? ICO("eye", 14) : ICO("eyeoff", 14)}</button>
              <button class="btn btn--danger btn-sm" data-pdel="${esc(p.code)}">${ICO("trash", 14)}</button>
            </span>
          </div>`).join("")
          : `<div class="tiny mut">Promokod yo'q</div>`}
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
            perUserLimit: Number(el("pPer").value) || 1,
            note: el("pNote").value.trim()
          }
        });
        toast("Qo'shildi", "ok");
        go("promo");
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
        go("promo");
      } catch (err) { toast(errText(err), "err"); }
    });
  }

  /* ═══════════ Sharhlar ═══════════ */

  async function scrReviews() {
    const list = await api("/api/admin/reviews");
    body(`${backBar()}
      <div class="hint" style="margin-bottom:11px">${ICO("info", 13)}<span>Sharh bosh sahifadagi baho kartasida ko'rinadi. Nomaqbulini o'chirib tashlang.</span></div>
      ${list.length ? list.map(r => `
        <div class="ocard" style="margin-left:0;margin-right:0">
          <div class="oc-top">
            <span class="oc-n">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)} ${esc(r.name || "—")}</span>
            <button class="btn btn--danger btn-sm" data-rdel="${esc(r.id)}">${ICO("trash", 14)}</button>
          </div>
          ${r.text ? `<div class="oc-b">${esc(r.text)}</div>` : ""}
          <div class="oc-m">
            <span>${ICO("clock", 12)}${dt(r.ts)}</span>
            <span>${ICO("box", 12)}${esc(r.itemTitle || "")}</span>
          </div>
        </div>`).join("")
        : `<div class="empty">${ICO("star", 34)}<div class="empty-t">Sharh yo'q</div></div>`}`);

    el("admBody").addEventListener("click", async e => {
      const d = e.target.closest("[data-rdel]");
      if (!d) return;
      if (!(await ask("Sharh o'chirilsinmi?", { yes: "O'chirish" }))) return;
      try {
        await api("/api/admin/review", { body: { action: "delete", id: d.getAttribute("data-rdel") } });
        toast("O'chirildi", "ok");
        go("reviews");
      } catch (err) { toast(errText(err), "err"); }
    });
  }

  /* ═══════════ Zaxira / JSON ═══════════ */

  async function scrBackup() {
    const list = await api("/api/admin/catalog");
    const json = JSON.stringify(list);
    body(`${backBar()}
      <div class="sect sect--first"><h3>Katalogni eksport qilish</h3></div>
      <div class="hint">${ICO("info", 13)}<span>Shu JSON'ni nusxalab saqlang — kerak bo'lganda qaytadan import qilasiz.</span></div>
      <textarea class="textarea code" id="expBox" readonly style="min-height:110px;margin-top:9px">${esc(json)}</textarea>
      <button class="btn btn--line btn-w" id="expCopy" style="margin-top:9px">${ICO("copy", 14)}JSON nusxalash</button>

      <div class="sect"><h3>Katalogni import qilish</h3></div>
      <div class="hint">${ICO("alert", 13)}<span>Import joriy katalogni <b>butunlay almashtiradi</b>. Avval eksportni saqlab qo'ying.</span></div>
      <textarea class="textarea code" id="impBox" placeholder="[ ... ]" style="min-height:110px;margin-top:9px"></textarea>
      <button class="btn btn--danger btn-w" id="impBtn" style="margin-top:9px">${ICO("download", 14)}Katalogni import qilish</button>

      <div class="tiny mut center" style="margin-top:14px">Mahsulot: ${list.length} ta · ${(json.length / 1024).toFixed(1)} KB</div>`);

    el("expCopy").onclick = () => window.mpCopy(json);
    el("impBtn").onclick = async () => {
      let items;
      try { items = JSON.parse(el("impBox").value); }
      catch (e) { return toast("JSON noto'g'ri", "err"); }
      if (!Array.isArray(items) || !items.length) return toast("Ro'yxat bo'sh", "err");
      if (!(await ask("Katalog almashtirilsinmi?", {
        text: "Joriy katalog o'rniga " + items.length + " ta mahsulot yoziladi. Bu amalni qaytarib bo'lmaydi.",
        yes: "Almashtirish"
      }))) return;
      try {
        const r = await api("/api/admin/catalog", { body: { items } });
        toast("Import qilindi: " + r.count + " ta", "ok");
        api("/api/catalog").then(c => { window.MP.catalog = c; window.mpRender(); });
        go("catalog");
      } catch (e) { toast(errText(e), "err"); }
    };
  }

  /* ═══════════ Sozlamalar ═══════════ */

  const ICON_KEYS = ["info", "send", "alert", "star", "megaphone", "globe", "card", "wallet",
    "users", "gift", "shield", "lock", "clock", "list"];
  const COLORS = ["acc", "ok", "warn", "err", "gold", "clay"];

  async function scrSettings() {
    const s = await api("/api/admin/settings");
    A.settings = s;
    body(`${backBar()}
      <div class="sect sect--first"><h3>Do'kon</h3></div>
      <div class="fld"><label class="lbl">Nomi</label><input class="input" id="sBrand" value="${esc(s.shop.brand)}"></div>
      <div class="editgrid">
        <div><label class="lbl">Support (@ siz)</label><input class="input" id="sSup" value="${esc(s.shop.supportUsername)}"></div>
        <div><label class="lbl">Ish vaqti</label><input class="input" id="sHours" value="${esc(s.shop.workHours)}"></div>
      </div>
      <div class="fld"><label class="lbl">Kanal havolasi</label><input class="input" id="sChan" value="${esc(s.shop.channelUrl)}"></div>
      <div class="fld"><label class="lbl">Sharhlar havolasi</label><input class="input" id="sRev" value="${esc(s.shop.reviewsUrl)}"></div>
      <div class="fld"><label class="lbl">E'lon (UZ)</label><textarea class="textarea" id="sNoteUz">${esc(s.shop.noticeUz)}</textarea></div>
      <div class="fld"><label class="lbl">E'lon (RU)</label><textarea class="textarea" id="sNoteRu">${esc(s.shop.noticeRu)}</textarea></div>

      <div class="sect"><h3>Kartalar</h3></div>
      <div id="cardRows">${(s.cards || []).map(cardRow).join("")}</div>
      <button class="btn btn--line btn-w" id="cardAdd" style="margin-top:9px">${ICO("plus", 14)}Karta</button>

      <div class="sect"><h3>Kanallar (chat_id)</h3></div>
      <div class="fld"><label class="lbl">Buyurtmalar kanali</label>
        <div class="inline"><input class="input" id="chOrder" value="${esc(s.channels.order)}">
        <button class="btn btn--line" data-chtest="chOrder">${ICO("send", 15)}</button></div></div>
      <div class="fld"><label class="lbl">To'lovlar kanali (SMS botlari shu yerda)</label>
        <div class="inline"><input class="input" id="chTopup" value="${esc(s.channels.topup)}">
        <button class="btn btn--line" data-chtest="chTopup">${ICO("send", 15)}</button></div></div>
      <div class="fld"><label class="lbl">Loglar kanali</label>
        <div class="inline"><input class="input" id="chLog" value="${esc(s.channels.log)}">
        <button class="btn btn--line" data-chtest="chLog">${ICO("send", 15)}</button></div></div>

      <div class="sect"><h3>Referal</h3></div>
      <div class="switch"><span class="lbl">Yoqilgan</span>
        <span class="sw ${s.referral.enabled ? "on" : ""}" id="rEn"><i></i></span></div>
      <div class="fld"><label class="lbl">Har xariddan foiz (%)</label>
        <input class="input" id="rPct" inputmode="numeric" value="${s.referral.percent}"></div>

      <div class="sect"><h3>Sodiqlik darajalari</h3></div>
      <div class="switch"><span class="lbl">Yoqilgan</span>
        <span class="sw ${s.loyalty.enabled ? "on" : ""}" id="lEn"><i></i></span></div>
      <div id="tierCfg">${(s.loyalty.tiers || []).map(loyRow).join("")}</div>
      <button class="btn btn--line btn-w" id="loyAdd" style="margin-top:9px">${ICO("plus", 14)}Daraja</button>

      <div class="sect"><h3>Yordam havolalari</h3></div>
      <div id="linkRows">${(s.links || []).map(linkRow).join("")}</div>
      <button class="btn btn--line btn-w" id="linkAdd" style="margin-top:9px">${ICO("plus", 14)}Havola</button>

      <div class="sect"><h3>Ijtimoiy tarmoqlar</h3></div>
      <div id="socRows">${(s.socials || []).map(socRow).join("")}</div>
      <button class="btn btn--line btn-w" id="socAdd" style="margin-top:9px">${ICO("plus", 14)}Tarmoq</button>

      <div class="sect"><h3>Savol-javob</h3></div>
      <div id="faqRows">${(s.faq || []).map(faqRow).join("")}</div>
      <button class="btn btn--line btn-w" id="faqAdd" style="margin-top:9px">${ICO("plus", 14)}Savol</button>

      <div class="fld"><label class="lbl">Ilova haqida</label>
        <textarea class="textarea" id="sAbout">${esc(s.about || "")}</textarea></div>

      <button class="btn btn--acc btn-w" id="setSave" style="margin-top:14px">${ICO("check", 15)}Saqlash</button>
      <div class="tiny mut center" style="margin-top:9px">Adminlar: ${(s.adminIds || []).join(", ") || "—"} (ADMIN_IDS env)</div>`);

    const adder = (boxId, tpl) => () => {
      const w = document.createElement("div");
      w.innerHTML = tpl();
      el(boxId).appendChild(w.firstElementChild);
    };
    el("cardAdd").onclick = adder("cardRows", () => cardRow({ id: "c" + Date.now().toString(36), type: "HUMO" }));
    el("loyAdd").onclick = adder("tierCfg", () => loyRow({}));
    el("linkAdd").onclick = adder("linkRows", () => linkRow({ icon: "info", color: "acc" }));
    el("socAdd").onclick = adder("socRows", () => socRow({ icon: "send" }));
    el("faqAdd").onclick = adder("faqRows", () => faqRow({}));
    el("rEn").onclick = () => el("rEn").classList.toggle("on");
    el("lEn").onclick = () => el("lEn").classList.toggle("on");

    el("admBody").addEventListener("click", async e => {
      const d = e.target.closest("[data-rowdel]");
      if (d) return d.closest(".editrow").remove();
      const ct = e.target.closest("[data-chtest]");
      if (ct) {
        const chatId = el(ct.getAttribute("data-chtest")).value.trim();
        try { await api("/api/admin/channel-test", { body: { chatId } }); toast("Yuborildi", "ok"); }
        catch (err) { toast((err.data && err.data.error) || errText(err), "err"); }
      }
    });

    el("setSave").onclick = async () => {
      const rows = (boxId, keys) => [...el(boxId).children].map(r => {
        const o = {};
        keys.forEach(k => {
          const n = r.querySelector("[data-k=" + k + "]");
          o[k] = n ? n.value.trim() : "";
        });
        return o;
      });
      const cards = rows("cardRows", ["id", "type", "num", "holder"])
        .map(c => ({ id: c.id, type: c.type, number: c.num, holder: c.holder }))
        .filter(c => c.number);
      const tiers = rows("tierCfg", ["name", "min", "pct"])
        .map(x => ({ name: x.name, minSpent: Number(x.min) || 0, percent: Number(x.pct) || 0 }))
        .filter(x => x.name);
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
            referral: { enabled: el("rEn").classList.contains("on"), percent: Number(el("rPct").value) || 0 },
            loyalty: { enabled: el("lEn").classList.contains("on"), tiers }
          }
        });
        toast(t("ok.saved"), "ok");
        api("/api/config").then(c => { window.MP.config = c; window.mpRender(); });
      } catch (e) { toast(errText(e), "err"); }
    };
  }

  function cardRow(c) {
    return `<div class="editrow">
      <input type="hidden" data-k="id" value="${esc(c.id || "")}">
      <div class="editgrid">
        <select class="input" data-k="type">
          <option ${c.type === "HUMO" ? "selected" : ""}>HUMO</option>
          <option ${c.type === "UZCARD" ? "selected" : ""}>UZCARD</option>
        </select>
        <input class="input" data-k="num" placeholder="0000 0000 0000 0000" value="${esc(c.number || "")}">
      </div>
      <div class="inline" style="margin-top:7px">
        <input class="input" data-k="holder" placeholder="KARTA EGASI" value="${esc(c.holder || "")}">
        <button class="btn btn--danger btn-sm" data-rowdel>${ICO("trash", 14)}</button>
      </div>
    </div>`;
  }
  function loyRow(x) {
    return `<div class="editrow">
      <div class="editgrid">
        <input class="input" data-k="name" placeholder="Nom" value="${esc(x.name || "")}">
        <input class="input" data-k="min" inputmode="numeric" placeholder="Summa" value="${Number(x.minSpent) || 0}">
      </div>
      <div class="inline" style="margin-top:7px">
        <input class="input" data-k="pct" inputmode="numeric" placeholder="Keshbek %" value="${Number(x.percent) || 0}">
        <button class="btn btn--danger btn-sm" data-rowdel>${ICO("trash", 14)}</button>
      </div>
    </div>`;
  }
  function linkRow(x) {
    return `<div class="editrow">
      <div class="editgrid">
        <select class="input" data-k="icon">
          ${ICON_KEYS.map(k => `<option ${x.icon === k ? "selected" : ""}>${k}</option>`).join("")}
        </select>
        <select class="input" data-k="color">
          ${COLORS.map(k => `<option ${x.color === k ? "selected" : ""}>${k}</option>`).join("")}
        </select>
      </div>
      <input class="input" data-k="title" placeholder="Sarlavha" value="${esc(x.title || "")}" style="margin-top:7px">
      <input class="input" data-k="sub" placeholder="Izoh" value="${esc(x.sub || "")}" style="margin-top:7px">
      <div class="inline" style="margin-top:7px">
        <input class="input" data-k="url" placeholder="https://... (bo'sh = faqat matn)" value="${esc(x.url || "")}">
        <button class="btn btn--danger btn-sm" data-rowdel>${ICO("trash", 14)}</button>
      </div>
    </div>`;
  }
  function socRow(x) {
    return `<div class="editrow">
      <div class="inline">
        <select class="input" data-k="icon" style="flex:0 0 108px">
          ${ICON_KEYS.map(k => `<option ${x.icon === k ? "selected" : ""}>${k}</option>`).join("")}
        </select>
        <input class="input" data-k="title" placeholder="Nom" value="${esc(x.title || "")}">
        <button class="btn btn--danger btn-sm" data-rowdel>${ICO("trash", 14)}</button>
      </div>
      <input class="input" data-k="url" placeholder="https://..." value="${esc(x.url || "")}" style="margin-top:7px">
    </div>`;
  }
  function faqRow(x) {
    return `<div class="editrow">
      <div class="inline">
        <input class="input" data-k="q" placeholder="Savol" value="${esc(x.q || "")}">
        <button class="btn btn--danger btn-sm" data-rowdel>${ICO("trash", 14)}</button>
      </div>
      <textarea class="textarea" data-k="a" placeholder="Javob" style="margin-top:7px;min-height:54px">${esc(x.a || "")}</textarea>
    </div>`;
  }

  /* ═══════════ Tarqatma ═══════════ */

  function scrCast() {
    body(`${backBar()}
      <div class="hint">${ICO("alert", 13)}<span>Xabar barcha bloklanmagan foydalanuvchilarga yuboriladi. Bildirishnomani o'chirganlar olmaydi. HTML teglar (&lt;b&gt;, &lt;i&gt;, &lt;a&gt;) ishlaydi.</span></div>
      <div class="fld"><textarea class="textarea" id="castText" style="min-height:150px" maxlength="3500"
        placeholder="Milliy Pin&#10;&#10;Yangi chegirmalar boshlandi!"></textarea></div>
      <button class="btn btn--acc btn-w" id="castSend">${ICO("send", 15)}Yuborish</button>`);

    el("castSend").onclick = async () => {
      const text = el("castText").value.trim();
      if (!text) return toast("Matn kiriting", "err");
      if (!(await ask("Xabar yuborilsinmi?", {
        text: "Xabar barcha ro'yxatdan o'tgan mijozlarga boradi.", yes: "Yuborish", danger: false
      }))) return;
      const b = el("castSend");
      b.disabled = true; b.textContent = t("common.loading");
      try {
        const r = await api("/api/admin/broadcast", { body: { text } });
        toast("Navbatga qo'yildi: " + r.queued, "ok");
      } catch (e) { toast(errText(e), "err"); }
      b.disabled = false; b.innerHTML = ICO("send", 15) + "Yuborish";
    };
  }

  /* ═══════════ Umumiy navigatsiya ═══════════ */

  document.addEventListener("click", e => {
    const g = e.target.closest("#admBody [data-go]");
    if (g) go(g.getAttribute("data-go"));
  });
})();
