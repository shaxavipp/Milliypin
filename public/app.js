/* app.js — Milliy Pin, mijoz qismi.
   Freymvorksiz. Holat bitta S obyektida; ko'rinishlar HTML satr sifatida yig'iladi,
   ikonkalar icons.js dagi ICO() orqali qo'yiladi (emoji ishlatilmaydi). */
(function () {
  "use strict";

  const tg = window.Telegram && window.Telegram.WebApp;
  const t = (k, v) => window.I18N.t(k, v);
  const pick = v => window.I18N.pick(v);
  const ICO = window.ICO;
  const el = id => document.getElementById(id);

  const S = {
    tab: "home", config: null, catalog: [], me: null, reviews: null, stats: null,
    promos: [], pending: null, timerId: 0,
    query: "", group: "all", orderFilter: "all", orderTab: "ord", myPromo: "", openFaq: -1
  };
  window.MP = S;

  try { S.myPromo = localStorage.getItem("mp_promo") || ""; } catch (e) {}

  /* ══════════ Yordamchilar ══════════ */

  const nf = new Intl.NumberFormat("ru-RU");
  // ru-RU minglarni buzilmas probel bilan ajratadi; monoshriftda u juda keng chiqadi,
  // shu sabab ingichka probel (U+2009) ga almashtiriladi.
  const money = n => nf.format(Math.round(Number(n) || 0)).replace(/ /g, " ");
  const som = n => money(n) + " " + t("common.som");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  window.escHtml = esc;

  function haptic(kind) {
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (kind === "ok") tg.HapticFeedback.notificationOccurred("success");
      else if (kind === "err") tg.HapticFeedback.notificationOccurred("error");
      else tg.HapticFeedback.impactOccurred("light");
    } catch (e) {}
  }

  let toastT = 0;
  function toast(msg, kind) {
    const n = el("toast");
    n.className = "toast" + (kind ? " " + kind : "");
    n.textContent = msg;
    n.hidden = false;
    haptic(kind);
    clearTimeout(toastT);
    toastT = setTimeout(() => { n.hidden = true; }, 2600);
  }
  window.mpToast = toast;

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast(t("topup.copied"), "ok"); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(t("topup.copied"), "ok"); } catch (e2) { toast(text); }
      ta.remove();
    }
  }
  window.mpCopy = copy;

  const openLink = url => {
    if (!url) return;
    if (tg && tg.openTelegramLink && /^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url);
    else if (tg && tg.openLink) tg.openLink(url);
    else window.open(url, "_blank");
  };

  /* ══════════ API ══════════ */

  async function api(path, opts) {
    opts = opts || {};
    const headers = { "X-Init-Data": (tg && tg.initData) || "" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    let r;
    try {
      r = await fetch(path, {
        method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
        headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) { throw Object.assign(new Error("network"), { code: "network" }); }
    let data = null;
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) throw Object.assign(new Error((data && data.error) || "server_error"),
      { code: (data && data.error) || "server_error", data });
    return data;
  }
  window.mpApi = api;

  function errText(e) {
    const key = "err." + (e && e.code ? e.code : "server_error");
    const msg = t(key);
    return msg === key ? t("err.server_error") : msg;
  }
  window.mpErr = errText;

  /* ══════════ Sheet ══════════ */

  let onSheetClose = null;
  // Telegram "orqaga" tugmasi: ichki ekrani bor oyna (masalan admin panel) uni
  // yopish o'rniga bir qadam orqaga qaytarishi kerak. Shu vazifani mpSetSheetBack
  // orqali o'rnatilgan ishlovchi bajaradi; true qaytarsa oyna yopilmaydi.
  let sheetBack = null;
  window.mpSetSheetBack = fn => { sheetBack = typeof fn === "function" ? fn : null; };

  // opts.icon berilsa sarlavha yonida mahsulot belgisi ko'rinadi — shunda
  // nomni oyna ichida takror yozish shart emas.
  function openSheet(title, html, cb, opts) {
    const ic = el("sheetIcon");
    ic.innerHTML = (opts && opts.icon) || "";
    ic.hidden = !(opts && opts.icon);
    ic.setAttribute("data-glaze", (opts && opts.glaze) || "0");
    el("sheetTitle").textContent = title || "";
    el("sheetBody").innerHTML = html;
    el("sheetWrap").hidden = false;
    el("sheetBody").scrollTop = 0;
    document.body.style.overflow = "hidden";
    onSheetClose = cb || null;
    sheetBack = null;
    if (tg && tg.BackButton) tg.BackButton.show();
  }
  function closeSheet() {
    if (el("sheetWrap").hidden) return;
    el("sheetWrap").hidden = true;
    document.body.style.overflow = "";
    clearInterval(S.timerId);
    sheetBack = null;
    const c = onSheetClose; onSheetClose = null;
    if (c) c();
    if (tg && tg.BackButton) tg.BackButton.hide();
  }
  window.mpSheet = openSheet;
  window.mpCloseSheet = closeSheet;

  /* ══════════ Tasdiq / matn so'rash ══════════ */
  // Telegram WebView'da window.confirm va window.prompt barcha mijozlarda
  // ishlamaydi (iOS'da jim o'tib ketadi). Shuning uchun o'z oynamiz.

  let askDone = null;

  function askClose(val) {
    if (el("askWrap").hidden) return;
    el("askWrap").hidden = true;
    const f = askDone; askDone = null;
    if (f) f(val);
  }

  function ask(o) {
    return new Promise(resolve => {
      askClose(null);                       // ochiq oyna bo'lsa — bekor qilinadi
      askDone = resolve;
      const inp = el("askInput");
      el("askTitle").textContent = o.title || "";
      el("askText").textContent = o.text || "";
      el("askText").hidden = !o.text;
      inp.hidden = !o.input;
      inp.value = o.value || "";
      inp.placeholder = o.placeholder || "";
      el("askNo").textContent = o.no || t("common.cancel");
      const yes = el("askYes");
      yes.textContent = o.yes || t("common.yes");
      yes.className = "btn btn-1 " + (o.danger ? "btn--clay" : "btn--acc");
      el("askWrap").hidden = false;
      haptic("light");
      if (o.input) setTimeout(() => inp.focus(), 60);
    });
  }

  el("askYes").addEventListener("click", () => {
    const inp = el("askInput");
    askClose(inp.hidden ? true : inp.value.trim());
  });
  el("askInput").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); el("askYes").click(); }
  });
  document.getElementById("askWrap").addEventListener("click", e => {
    if (e.target.closest("[data-askno]")) askClose(null);
  });

  // Tasdiq: true yoki null. Matn so'rash: kiritilgan satr yoki null (bekor).
  window.mpConfirm = (title, o) => ask(Object.assign({ title, danger: true }, o || {}));
  window.mpPrompt = (title, o) => ask(Object.assign({ title, input: true }, o || {}));
  window.mpAskOpen = () => !el("askWrap").hidden;
  window.mpAskClose = () => askClose(null);

  /* ══════════ Mavzu va til ══════════ */

  // Animatsiyani kamaytirish — eski telefonlarda ilova sezilarli tezlashadi.
  // Tanlov localStorage'da saqlanadi, tizimning "reduce motion" sozlamasi esa
  // CSS darajasida alohida hurmat qilinadi.
  function animOff() {
    try { return localStorage.getItem("mp_anim") === "off"; } catch (e) { return false; }
  }
  function applyAnim() {
    document.documentElement.setAttribute("data-anim", animOff() ? "off" : "on");
  }
  function toggleAnim() {
    const next = animOff() ? "on" : "off";
    try { localStorage.setItem("mp_anim", next); } catch (e) {}
    applyAnim(); haptic(); render();
  }

  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem("mp_theme", mode); } catch (e) {}
    el("themeBtn").innerHTML = ICO(mode === "dark" ? "sun" : "moon", 16);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", mode === "dark" ? "#070C18" : "#F3EADA");
  }
  const themeNow = () => document.documentElement.getAttribute("data-theme");
  function toggleTheme() { applyTheme(themeNow() === "dark" ? "light" : "dark"); render(); }

  function setLang(l) {
    window.I18N.set(l);
    el("langBtn").textContent = window.I18N.lang.toUpperCase();
    render();
  }
  const toggleLang = () => {
    const L = window.I18N.langs;
    setLang(L[(L.indexOf(window.I18N.lang) + 1) % L.length]);
  };

  /* ══════════ Umumiy bo'laklar ══════════ */

  const sect = (title, right, icon) =>
    `<div class="sect">${icon ? ICO(icon, 15) : ""}<h3>${title}</h3>${right || ""}</div>`;

  const empty = (icon, title, sub) =>
    `<div class="empty">${ICO(icon, 34)}<div class="empty-t">${title}</div>${sub ? `<div class="empty-s">${sub}</div>` : ""}</div>`;

  const minPrice = it => {
    const p = (it.tiers || []).map(x => Number(x.price) || 0).filter(x => x > 0);
    return p.length ? Math.min.apply(null, p) : 0;
  };

  // Guruhga qarab sirlash rangi — bir xil o'yin doim bir xil rangda ko'rinadi
  const glazeMap = {};
  function glazeOf(group) {
    if (!(group in glazeMap)) glazeMap[group] = Object.keys(glazeMap).length % 4;
    return glazeMap[group];
  }

  // Plitadagi yorliq — faqat haqiqiy chegirma bo'lganda
  function tileTag(it) {
    const d = (it.tiers || []).find(x => x.old && x.old > x.price);
    return d ? "−" + Math.round((1 - d.price / d.old) * 100) + "%" : "";
  }

  function tile(it) {
    const tag = tileTag(it);
    const cover = it.cover || it.image;
    return `<button class="tile ${it.maint ? "maint" : ""} ${cover ? "has-cover" : ""}"
      data-item="${esc(it.id)}" data-glaze="${glazeOf(it.group || it.id)}">
      <span class="tile-top">
        ${cover ? `<img class="tile-cover" src="${esc(cover)}" alt="" loading="lazy"
              onerror="this.remove();this.closest('.tile').classList.remove('has-cover')">` : ""}
        ${cover ? "" : `<span class="medal" aria-hidden="true"></span>`}
        ${ICO(it.icon, 32) || ICO("gift", 32)}
        ${it.region ? `<span class="tile-region">${esc(it.region)}</span>` : ""}
        ${tag && !it.maint ? `<span class="tile-tag">${esc(tag)}</span>` : ""}
        ${it.maint ? `<span class="tile-maint">${t("maint")}</span>` : ""}
      </span>
      <span class="tile-body">
        <span class="tile-n">${esc(pick(it.title))}</span>
        <span class="tile-p price"><span class="from">${t("prod.from")}</span>${money(minPrice(it))}</span>
      </span>
    </button>`;
  }

  /* ══════════ Ko'rinish: Asosiy ══════════ */

  // To'ldirish sahifasida tugma darhol summa oynasini ochadi, boshqa joyda —
  // avval to'ldirish bo'limiga o'tkazadi.
  function balanceCard(inTopup) {
    const bal = S.me ? S.me.balance : 0;
    const l = S.me && S.me.loyalty;
    const act = inTopup ? 'data-act="topupOpen"' : 'data-go="topup"';
    return `<section class="balcard">
      <span class="dome"><svg viewBox="0 0 64 64"><use href="#dome"/></svg></span>
      <div class="bal-head">
        <div>
          <span class="bal-k">${t("home.balance")}</span>
          <div class="bal-v">${money(bal)}<span class="cur">${t("common.som")}</span></div>
          ${l && l.current ? `<span class="bal-tier">${esc(l.current.name)}${l.current.percent ? " · " + l.current.percent + "%" : ""}</span>` : ""}
        </div>
      </div>
      <div class="bal-quick">
        <button ${act}>${ICO("wallet", 18)}${t("home.topup")}</button>
        <button data-act="promos">${ICO("tag", 18)}${t("home.quickPromo")}</button>
        <button data-act="support">${ICO("send", 18)}${t("home.quickHelp")}</button>
      </div>
    </section>`;
  }

  function viewHome() {
    const notice = S.config && pick(S.config.notice);
    const st = S.stats;
    const top = S.catalog.filter(i => !i.maint).slice(0, 6);

    // "Yana buyurtma qilish" — mijoz oxirgi olgan mahsulotlari. Doimiy
    // xaridorlar uchun eng qisqa yo'l: katalogni qidirib o'tirmaydi.
    const seen = [];
    ((S.me && S.me.orders) || []).forEach(o => {
      if (seen.length >= 6 || seen.indexOf(o.itemId) !== -1) return;
      seen.push(o.itemId);
    });
    const recent = seen.map(id => S.catalog.find(x => x.id === id))
      .filter(x => x && !x.maint).slice(0, 5);

    return `
      ${balanceCard()}

      ${notice ? `<div class="notice">${ICO("info", 15)}<span>${esc(notice)}</span></div>` : ""}

      ${recent.length ? sect(t("home.again"), "", "refresh") + `<div class="strip">
        ${recent.map(it => `<button class="stripi" data-item="${esc(it.id)}" data-glaze="${glazeOf(it.group || it.id)}">
          <span class="stripi-ic">${ICO(it.icon, 20) || ICO("gift", 20)}</span>
          <span class="stripi-t">${esc(pick(it.title))}</span>
        </button>`).join("")}
      </div>` : ""}

      ${sect(t("home.popular"), `<button class="more" data-go="catalog">${t("home.all")}</button>`, "palak")}
      <div class="grid">${top.map(tile).join("")}</div>

      ${sect(t("home.stats"), "", "minora")}
      <div class="stats">
        <div class="stat"><div class="stat-v">${st ? money(st.users) : "—"}</div><div class="stat-k">${t("home.statUsers")}</div></div>
        <div class="stat"><div class="stat-v">${st ? money(st.orders) : "—"}</div><div class="stat-k">${t("home.statOrders")}</div></div>
        <div class="stat"><div class="stat-v">24/7</div><div class="stat-k">${t("profile.support")}</div></div>
      </div>

      <button class="wide" data-act="leaders" style="margin-top:14px">
        <span class="wide-ic">${ICO("palak", 19)}</span>
        <span class="wide-b">
          <span class="wide-t">${t("lb.title")}</span>
          <span class="wide-s">${t("lb.sub")}</span>
        </span>
        ${ICO("chevron", 15)}
      </button>

      ${rateCard()}

      <div class="center tiny mut" style="margin-top:22px">
        ${esc((S.config && S.config.brand) || "Milliy Pin")}${S.config && S.config.workHours ? " · " + esc(S.config.workHours) : ""}
      </div>`;
  }

  // Mijozlar bahosi: o'rtacha ball, yulduzlar va oxirgi sharh
  function rateCard() {
    const r = S.reviews;
    if (!r || !r.count) return "";
    const top = (r.items || []).find(x => x.text) || r.items[0] || {};
    const full = Math.round(r.average);
    return sect(t("home.reviews"), "", "star") + `
      <div class="ratecard">
        <div class="rate-big">
          <div class="rate-v">${r.average.toFixed(1)}</div>
          <div class="rate-stars">
            ${[1, 2, 3, 4, 5].map(i => `<span class="${i <= full ? "" : "off"}">${ICO("star", 11)}</span>`).join("")}
          </div>
          <div class="rate-c">${money(r.count)} ${t("home.reviewsCount")}</div>
        </div>
        <div class="rate-q">
          <div class="rate-t">${esc(top.text || top.itemTitle || "")}</div>
          <div class="rate-a">
            <span class="rate-av">${esc((top.name || "M").trim().charAt(0).toUpperCase())}</span>
            <span class="rate-n">${esc(top.name || "—")}</span>
          </div>
        </div>
      </div>`;
  }

  /* ══════════ Ko'rinish: Katalog ══════════ */

  function catalogGrid() {
    const all = S.catalog;
    const on = S.group;
    const q = S.query.trim().toLowerCase();
    let shown = on === "all" ? all : all.filter(i => (i.category || "game") === on);
    if (q) shown = shown.filter(i =>
      pick(i.title).toLowerCase().includes(q) || String(i.group || "").toLowerCase().includes(q));
    return shown.length ? `<div class="grid">${shown.map(tile).join("")}</div>`
                        : empty("search", t("cat.nores"));
  }

  function viewCatalog() {
    // Filtr guruh emas, turkum bo'yicha: guruhlar deyarli har mahsulotga
    // bittadan to'g'ri kelardi va chiplar ro'yxati katalogning o'zidek uzayib
    // ketardi. Ikki turkum — "Telegram" va "O'yinlar" — bir qatorga sig'adi.
    const cats = [];
    S.catalog.forEach(i => { const c2 = i.category || "game"; if (!cats.includes(c2)) cats.push(c2); });
    if (S.group !== "all" && !cats.includes(S.group)) S.group = "all";

    return `
      ${sect(t("cat.title"), "", "peshtoq").replace('class="sect"', 'class="sect sect--first"')}
      <div class="search">
        ${ICO("search", 17)}
        <input id="q" placeholder="${esc(t("cat.search"))}" value="${esc(S.query)}" autocomplete="off">
      </div>
      <div class="pills pills--v">
        <button class="pill ${S.group === "all" ? "on" : ""}" data-f="all">${t("home.all")}</button>
        ${cats.map(g => `<button class="pill ${S.group === g ? "on" : ""}" data-f="${esc(g)}">${t("cat." + g)}</button>`).join("")}
      </div>
      <div id="gridBox">${catalogGrid()}</div>`;
  }

  /* ══════════ Ko'rinish: To'ldirish ══════════ */

  const METHODS = [
    { id: "uzcard", type: "UZCARD", k: "topup.mUzcard", d: "topup.mCard" },
    { id: "humo",   type: "HUMO",   k: "topup.mHumo",   d: "topup.mCard" }
  ];

  function viewTopup() {
    const c = S.config || {};
    const cards = c.cards || [];
    // Har bir karta turi uchun rekvizit sozlangan bo'lsagina usul faol bo'ladi
    const has = type => cards.some(x => String(x.type).toUpperCase() === type);

    // Yakunlanmagan to'lov bo'lsa — eng ustida ko'rinadi. Ilova yopilib
    // qaytadan ochilsa ham mijoz kutayotgan to'lovini yo'qotmaydi.
    const open = (((S.me && S.me.payments) || []).find(p =>
      p.status === "pending" && Number(p.expiresAt || 0) > Date.now()));
    const last = ((S.me && S.me.payments) || []).slice(0, 3);

    return `
      ${balanceCard(true)}

      ${open ? `<button class="wide wide--warn" data-pay="${esc(open.id)}" style="margin-top:12px">
        <span class="wide-ic">${ICO("clock", 19)}</span>
        <span class="wide-b">
          <span class="wide-t">${open.claimedAt ? t("topup.inCheck") : t("topup.unfinished")}</span>
          <span class="wide-s price">${som(open.amount)}</span>
        </span>
        ${ICO("chevron", 15)}
      </button>` : ""}

      ${sect(t("topup.method"), "", "wallet")}
      <div class="methods">
        ${METHODS.map(m => `<button class="method ${has(m.type) ? "" : "off"}" data-m="${m.id}">
          <span class="method-ic">${ICO("card", 19)}</span>
          <span style="min-width:0">
            <span class="method-n">${t(m.k)}</span>
            <span class="method-d">${t(m.d)}</span>
          </span>
        </button>`).join("")}
      </div>
      <div class="hint" style="margin:9px 14px 0">${ICO("info", 13)}<span>${t("topup.min")}: ${som(c.minTopup || 5000)}</span></div>

      ${sect(t("topup.links"), "", "list")}
      <div class="menu">
        <button class="menu-i" data-act="howto">${ICO("info")}
          <span class="menu-t">${t("topup.how")}</span>
          <span class="menu-v">${ICO("chevron", 14)}</span></button>
        ${c.support ? `<button class="menu-i" data-act="support">${ICO("send")}
          <span class="menu-t">${t("topup.help")}</span>
          <span class="menu-v">@${esc(c.support)}${ICO("chevron", 14)}</span></button>` : ""}
      </div>

      ${last.length ? sect(t("topup.recent"), `<button class="more" data-otab-go="pay">${t("home.all")}</button>`, "clock") + `
      <div class="rows">
        ${last.map(p => `<div class="row">
          <span class="row-ic">${ICO("card", 19)}</span>
          <span class="row-b">
            <span class="row-t price">${som(p.amount)}</span>
            <span class="row-s">${esc(p.cardType || "")} · ${dt(p.ts)}</span>
          </span>
          <span class="row-e"><span class="tag tag--${esc(p.status)}">${t("st." + p.status)}</span></span>
        </div>`).join("")}
      </div>` : ""}`;
  }

  /* ══════════ Ko'rinish: Buyurtmalar ══════════ */

  const dt = ts => new Date(ts).toLocaleString("ru-RU",
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const OFILTER = [
    { id: "all", key: "orders.fAll" }, { id: "open", key: "orders.fOpen" },
    { id: "done", key: "st.done" }, { id: "canceled", key: "st.canceled" }
  ];

  function viewOrders() {
    const all = (S.me && S.me.orders) || [];
    const pays = (S.me && S.me.payments) || [];

    // Ikki bo'lim: buyurtmalar va moliya (to'ldirishlar). Ilgari ikkalasi
    // bir ustunda ustma-ust turardi va to'lovlarni topish uchun uzoq surish
    // kerak bo'lardi.
    const seg = `<div class="seg seg--w">
      <button class="${S.orderTab === "pay" ? "" : "on"}" data-otab="ord">${t("orders.tab")}</button>
      <button class="${S.orderTab === "pay" ? "on" : ""}" data-otab="pay">${t("orders.payments")}</button>
    </div>`;

    if (S.orderTab === "pay") {
      return seg + (pays.length ? `<div class="rows">
        ${pays.map(p => `<div class="row">
          <span class="row-ic">${ICO("card", 19)}</span>
          <span class="row-b">
            <span class="row-t price">${som(p.amount)}</span>
            <span class="row-s">${esc(p.cardType || "")} · ${dt(p.ts)}</span>
          </span>
          <span class="row-e"><span class="tag tag--${esc(p.status)}">${t("st." + p.status)}</span></span>
        </div>`).join("")}</div>`
        : empty("card", t("orders.noPay")));
    }

    const f = S.orderFilter;
    const orders = f === "all" ? all
      : f === "open" ? all.filter(o => o.status === "new" || o.status === "processing")
      : all.filter(o => o.status === f);

    const filterBar = all.length > 3 ? `<div class="pills pills--v">
      ${OFILTER.map(x => `<button class="pill ${x.id === f ? "on" : ""}" data-of="${x.id}">${t(x.key)}</button>`).join("")}
    </div>` : "";

    // Ixcham qator: bosilganda to'liq ma'lumot oynasi ochiladi.
    const body = orders.length ? `<div class="rows">${orders.map(o => `
      <button class="row" data-odet="${esc(o.id)}">
        <span class="row-ic">${ICO(o.itemIcon || "gift", 19)}</span>
        <span class="row-b">
          <span class="row-t">${esc(o.itemTitle)}</span>
          <span class="row-s">${esc(o.tierLabel)} · ${dt(o.ts)}</span>
        </span>
        <span class="row-e">
          <span class="row-am price">−${money(o.total)}</span>
          <span class="tag tag--${esc(o.status)}">${t("st." + o.status)}</span>
        </span>
      </button>`).join("")}</div>`
      : empty("scroll", f === "all" ? t("orders.empty") : t("orders.emptyFilter"),
              f === "all" ? t("orders.emptySub") : "");

    return seg + filterBar + body;
  }

  // Buyurtma tafsiloti: raqam, ma'lumot, narx, holat va sana — jadval qatorlarida,
  // ostida esa amallar (baholash, qayta buyurtma, ID nusxasi).
  function openOrder(id) {
    const o = ((S.me && S.me.orders) || []).find(x => x.id === id);
    if (!o) return;
    const row = (k, v, cls) => `<div class="dl-r"><span>${k}</span><b class="${cls || ""}">${v}</b></div>`;
    openSheet("#" + o.seq + " · " + o.itemTitle, `
      <div class="pmeta">
        <span class="pmeta-t">${esc(o.tierLabel)}${o.qty > 1 ? " × " + o.qty : ""}</span>
        <span class="tag tag--${esc(o.status)}">${t("st." + o.status)}</span>
      </div>

      <div class="dl">
        ${row(t("orders.num"), "#" + o.seq)}
        ${row(t("orders.target"), `<span class="oc-target" data-copy="${esc(o.target)}">${esc(o.target)}</span>`)}
        ${row(t("prod.total"), som(o.total), "price")}
        ${o.discount ? row(t("prod.discount"), "−" + som(o.discount), "price") : ""}
        ${o.cashback ? row(t("orders.cashback"), "+" + som(o.cashback), "price") : ""}
        ${row(t("orders.date"), dt(o.ts))}
        ${o.comment ? row(t("prod.comment"), esc(o.comment)) : ""}
        ${o.note ? row(t("orders.note"), esc(o.note)) : ""}
        ${o.cancelReason ? row(t("orders.reason"), esc(o.cancelReason)) : ""}
      </div>

      <div class="acts" style="margin-top:13px">
        ${o.canReview ? `<button class="btn btn--line btn-1" data-review="${esc(o.id)}">${ICO("star", 14)}${t("orders.review")}</button>` : ""}
        <button class="btn btn--acc btn-1" data-repeat="${esc(o.id)}">${ICO("refresh", 14)}${t("orders.repeat")}</button>
      </div>`, null, { icon: ICO(o.itemIcon || "gift", 20) });
  }

  /* ══════════ Ko'rinish: Profil ══════════ */

  function viewProfile() {
    const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    const me = S.me || { balance: 0, spent: 0, orders: [] };
    const c = S.config || {};
    const l = me.loyalty;
    const left = l && l.next ? Math.max(0, l.next.minSpent - me.spent) : 0;
    const pct = l && l.next && l.next.minSpent ? Math.min(100, Math.round(me.spent / l.next.minSpent * 100)) : 0;

    const links = (c.links || []).filter(x => x.title);
    const socials = c.socials || [];
    const faq = c.faq || [];

    const notifOn = me.notifEnabled !== false;
    const refSub = c.referral && c.referral.enabled
      ? t("ref.desc", { p: c.referral.percent }) : t("ref.cardSub");
    const loyaltySub = l && l.current
      ? l.current.name + (l.current.percent ? " · " + l.current.percent + "%" : "") +
        (l.next ? " · " + t("profile.toNext").toLowerCase() + " " + som(left) : "")
      : "—";

    // Rangli ikonkali qator: chapda ikonka, o'rtada nom va izoh, o'ngda boshqaruv
    // (segment yoki kalit) yoxud o'q. attr berilsa qator bosiladigan bo'ladi.
    const svc = (icon, color, title, sub, right, attr) => {
      const tag = attr ? "button" : "div";
      return `<${tag} class="svc"${attr ? " " + attr : ""}>
        <span class="svc-ic lc-${color}">${ICO(icon, 17)}</span>
        <span class="svc-b">
          <span class="svc-t">${title}</span>
          ${sub ? `<span class="svc-s">${esc(sub)}</span>` : ""}
        </span>
        <span class="svc-r">${right || (attr ? ICO("chevron", 14) : "")}</span>
      </${tag}>`;
    };

    return `
      <div class="prof">
        <div class="prof-av">${esc((u.first_name || "M").trim().charAt(0).toUpperCase())}</div>
        <div style="min-width:0">
          <div class="prof-n">${esc(u.first_name || t("home.guest"))} ${esc(u.last_name || "")}</div>
          <button class="idcopy" data-copy="${esc(me.id || "")}">
            ${u.username ? "@" + esc(u.username) + " · " : ""}ID ${esc(me.id || "—")}${ICO("copy", 12)}
          </button>
          ${l && l.current ? `<div class="prof-tier">${esc(l.current.name)}</div>` : ""}
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-v">${money(me.balance)}</div><div class="stat-k">${t("profile.balance")}</div></div>
        <div class="stat"><div class="stat-v">${money(me.spent)}</div><div class="stat-k">${t("profile.spent")}</div></div>
        <div class="stat"><div class="stat-v">${(me.orders || []).length}</div><div class="stat-k">${t("profile.orders")}</div></div>
      </div>

      ${l && l.next ? `<div class="ocard" style="margin-top:9px">
        <div class="tiny mut">${t("profile.toNext")} <b style="color:var(--gold)">${esc(l.next.name)}</b> — <span class="price">${som(left)}</span></div>
        <div class="progress"><i style="width:${pct}%"></i></div>
      </div>` : ""}

      <div class="menu">
        ${svc("tag", "gold", t("promo.title"), t("promo.sub"),
          S.myPromo ? `<span class="tag tag--done">${esc(S.myPromo)}</span>` : "",
          'data-act="promos"')}
      </div>

      <div class="menu">
        ${svc("palak", "gold", t("profile.loyalty"), loyaltySub, "", 'data-act="loyalty"')}
        ${svc("users", "acc", t("ref.card"), refSub, "", 'data-act="referral"')}
        ${svc("star", "clay", t("lb.title"), t("lb.sub"), "", 'data-act="leaders"')}
        ${c.support ? svc("send", "ok", t("profile.support"), "@" + c.support, "",
            'data-open="https://t.me/' + esc(c.support) + '"') : ""}
      </div>

      <div class="menu">
        ${svc("globe", "acc", t("profile.lang"), "",
          `<span class="seg">${window.I18N.langs.map(x =>
            `<button class="${x === window.I18N.lang ? "on" : ""}" data-lang="${x}">${x.toUpperCase()}</button>`).join("")}</span>`)}
        ${svc(themeNow() === "dark" ? "moon" : "sun", "warn", t("profile.theme"), "",
          `<span class="seg">
             <button class="${themeNow() === "dark" ? "on" : ""}" data-settheme="dark">${ICO("moon", 13)}</button>
             <button class="${themeNow() === "light" ? "on" : ""}" data-settheme="light">${ICO("sun", 13)}</button>
           </span>`)}
        ${svc("megaphone", "err", t("profile.notif"), t("profile.notifSub"),
          `<span class="sw-sm ${notifOn ? "on" : ""}" id="notifSw"><i></i></span>`)}
        ${svc("flame", "clay", t("profile.anim"), t("profile.animSub"),
          `<span class="sw-sm ${animOff() ? "" : "on"}" id="animSw"><i></i></span>`)}
      </div>

      ${c.channelUrl || c.reviewsUrl ? `<div class="menu">
        ${c.channelUrl ? svc("megaphone", "acc", t("profile.channel"), c.channelUrl, "",
            'data-open="' + esc(c.channelUrl) + '"') : ""}
        ${c.reviewsUrl ? svc("star", "gold", t("profile.reviews"), "", "",
            'data-open="' + esc(c.reviewsUrl) + '"') : ""}
      </div>` : ""}

      ${links.length ? sect(t("topup.links"), "", "list") + `<div class="wrap">
        ${links.map(x => {
          const tag = x.url ? "button" : "div";
          return `<${tag} class="linkrow"${x.url ? ` data-open="${esc(x.url)}"` : ""}>
            <span class="linkrow-ic lc-${esc(x.color || "acc")}">${ICO(x.icon || "info", 18)}</span>
            <span style="flex:1;min-width:0">
              <span class="linkrow-t">${esc(x.title)}</span>
              ${x.sub ? `<span class="linkrow-s">${esc(x.sub)}</span>` : ""}
            </span>
            ${x.url ? ICO("chevron", 15) : ""}
          </${tag}>`;
        }).join("")}
      </div>` : ""}

      ${socials.length ? sect(t("profile.socials"), "", "megaphone") + `<div class="socials">
        ${socials.map(x => `<button class="social" data-open="${esc(x.url)}">
          ${ICO(x.icon || "send", 22)}<span>${esc(x.title)}</span>
        </button>`).join("")}
      </div>` : ""}

      ${faq.length ? sect(t("profile.faq"), "", "info") + `<div class="faq" id="faqBox">
        ${faq.map((x, i) => `<div class="faq-i ${i === S.openFaq ? "open" : ""}">
          <button class="faq-q" data-faq="${i}">
            <span class="faq-n">${String(i + 1).padStart(2, "0")}</span>
            <span class="faq-t">${esc(x.q)}</span>
            ${ICO("plus", 15)}
          </button>
          ${i === S.openFaq ? `<div class="faq-a">${esc(x.a)}</div>` : ""}
        </div>`).join("")}
      </div>` : ""}

      ${me.isAdmin ? `<div class="menu">
        ${svc("shield", "gold", t("profile.admin"), t("profile.adminSub"), "", 'data-act="admin"')}
      </div>` : ""}

      ${c.about ? `<div class="center tiny mut" style="margin:20px 14px 0;line-height:1.5">${esc(c.about)}</div>` : ""}
      <div class="center tiny mut" style="margin-top:10px">Milliy Pin · v1.3</div>`;
  }

  /* ══════════ Mahsulot oynasi ══════════ */

  const FIELD = {
    username:   ["field.username", "field.usernamePh"],
    playerId:   ["field.playerId", "field.playerIdPh"],
    playerZone: ["field.playerZone", "field.playerZonePh"],
    nickname:   ["field.nickname", "field.nicknamePh"],
    link:       ["field.link", "field.linkPh"]
  };

  // Sarlavha kartasi: yuqorida o'yin/xizmat nomi, ostida valyuta turi.
  // Nom guruh bilan boshlansa, takror yozilmaydi ("PUBG Mobile" + "UC").
  function headParts(it) {
    const title = pick(it.title);
    const group = String(it.group || "").trim();
    if (group && title.toLowerCase().startsWith(group.toLowerCase())) {
      const rest = title.slice(group.length).trim();
      return { main: group, sub: rest || title };
    }
    return { main: title, sub: group };
  }

  // Shu mahsulot uchun oxirgi 3 ta betakror ID (eng yangisi birinchi).
  function savedTargets(itemId) {
    const out = [];
    ((S.me && S.me.orders) || []).forEach(o => {
      if (o.itemId !== itemId) return;
      const v = String(o.target || "").trim();
      if (v && out.indexOf(v) === -1 && out.length < 3) out.push(v);
    });
    return out;
  }

  const O = { item: null, tierId: "", promo: "", discount: 0 };
  const curTier = () => (O.item.tiers || []).find(x => x.id === O.tierId) || O.item.tiers[0];
  const subtotal = () => Number(curTier().price) || 0;
  const total = () => Math.max(0, subtotal() - O.discount);

  function openProduct(id, prefill) {
    const it = S.catalog.find(x => x.id === id);
    if (!it) return;
    if (it.maint) return toast(t("err.maintenance"), "err");

    prefill = prefill || {};
    O.item = it;
    O.tierId = (it.tiers || []).some(x => x.id === prefill.tierId)
      ? prefill.tierId : ((it.tiers[0] || {}).id || "");
    O.promo = ""; O.discount = 0;
    const f = FIELD[it.field] || FIELD.playerId;
    const note = pick(it.note);
    const head = headParts(it);
    const cover = it.cover || it.image;

    // Ilgari kiritilgan ID'lar — o'z tarixidan olinadi, har safar qo'lda
    // yozib o'tirmaslik uchun (raqobatchilarda "saqlangan ID" shunday ishlaydi).
    const saved = savedTargets(it.id);

    openSheet(pick(it.title), `
      ${head.sub && head.sub !== head.main || it.region ? `<div class="pmeta">
        ${head.sub && head.sub !== head.main ? `<span class="pmeta-t">${esc(head.sub)}</span>` : ""}
        ${it.region ? `<span class="phead-reg">${esc(it.region)}</span>` : ""}
      </div>` : ""}

      <label for="target">${t(f[0])}</label>
      <input class="input" id="target" placeholder="${esc(t(f[1]))}" autocomplete="off" spellcheck="false">
      ${saved.length ? `<div class="saved" id="savedBox">
        <span class="saved-k">${t("prod.saved")}</span>
        ${saved.map(v => `<button class="chip" data-fill="${esc(v)}">${esc(v)}</button>`).join("")}
      </div>` : ""}
      ${note ? `<div class="hint">${ICO("info", 13)}<span>${esc(note)}</span></div>` : ""}

      <div class="lbl">${t("prod.choose")}</div>
      <div class="tiers" id="tierBox">
        ${it.tiers.map(x => `<button class="tier ${x.id === O.tierId ? "on" : ""}" data-tier="${esc(x.id)}">
          ${x.badge ? `<span class="tier-tag">${esc(x.badge)}</span>` : ""}
          <span class="tier-ic">${ICO(it.icon, 17) || ICO("gift", 17)}</span>
          <span class="tier-b">
            <span class="tier-l">${esc(pick(x.label))}</span>
            <span class="tier-price">${money(x.price)}${x.old ? `<span class="tier-old">${money(x.old)}</span>` : ""}</span>
          </span>
        </button>`).join("")}
      </div>

      <details class="fold" ${S.myPromo ? "open" : ""}>
        <summary>${ICO("tag", 14)}<span>${t("prod.promo")}</span>${ICO("chevron", 14)}</summary>
        <div class="inline" style="margin-top:9px">
          <input class="input" id="promo" placeholder="MILLIY10" autocomplete="off"
                 value="${esc(S.myPromo)}" style="text-transform:uppercase">
          <button class="btn btn--line" id="promoBtn">${t("prod.promoApply")}</button>
        </div>
        <div id="promoMsg"></div>
      </details>

      <details class="fold">
        <summary>${ICO("scroll", 14)}<span>${t("prod.comment")}</span>${ICO("chevron", 14)}</summary>
        <textarea class="textarea" id="comment" placeholder="${esc(t("prod.commentPh"))}"
                  style="margin-top:9px"></textarea>
      </details>

      <div class="calc">
        <div class="calc-r"><span>${t("prod.subtotal")}</span><b class="price" id="cSub"></b></div>
        <div class="calc-r" id="cDiscRow" hidden><span>${t("prod.discount")}</span><b class="price" id="cDisc" style="color:var(--ok)"></b></div>
        <div class="calc-r calc-r--total"><span>${t("prod.total")}</span><b class="price" id="cTot"></b></div>
      </div>

      <div class="buybar" id="buyBox"></div>`, null, {
      icon: (cover ? `<img src="${esc(cover)}" alt="" onerror="this.remove()">` : "") +
            (ICO(it.icon, 20) || ICO("gift", 20)),
      glaze: glazeOf(it.group || it.id)
    });

    el("tierBox").addEventListener("click", e => {
      const b = e.target.closest("[data-tier]");
      if (!b) return;
      O.tierId = b.getAttribute("data-tier");
      [...el("tierBox").children].forEach(c => c.classList.toggle("on", c === b));
      haptic();
      if (O.promo) applyPromo(true); else refreshCalc();
    });
    el("promoBtn").onclick = applyPromo;
    const sb = el("savedBox");
    if (sb) sb.addEventListener("click", e => {
      const c = e.target.closest("[data-fill]");
      if (!c) return;
      el("target").value = c.getAttribute("data-fill");
      haptic();
    });
    if (prefill.target) el("target").value = prefill.target;
    if (S.myPromo) applyPromo(true); else refreshCalc();
  }

  async function applyPromo(silent) {
    const code = el("promo").value.trim().toUpperCase();
    const msg = el("promoMsg");
    if (!code) { O.promo = ""; O.discount = 0; msg.innerHTML = ""; return refreshCalc(); }
    try {
      const r = await api("/api/promo/check", { body: { code, subtotal: subtotal() } });
      O.promo = code; O.discount = r.discount || 0;
      msg.innerHTML = `<div class="okline">−${som(O.discount)}</div>`;
    } catch (e) {
      O.promo = ""; O.discount = 0;
      // Oyna ochilishida saqlangan kod bu mahsulotga to'g'ri kelmasligi mumkin —
      // bunday holatda xato ko'rsatilmaydi, kod shunchaki qo'llanmaydi.
      msg.innerHTML = silent === true ? "" : `<div class="errline">${esc(errText(e))}</div>`;
    }
    refreshCalc();
  }

  function refreshCalc() {
    const bal = S.me ? S.me.balance : 0;
    const tot = total();
    el("cSub").textContent = som(subtotal());
    el("cTot").textContent = som(tot);
    el("cDiscRow").hidden = O.discount <= 0;
    if (O.discount > 0) el("cDisc").textContent = "−" + som(O.discount);

    el("buyBox").innerHTML = bal >= tot
      ? `<button class="btn btn--acc btn-w" id="buyBtn">${ICO("check")}${t("prod.buy")} · ${som(tot)}</button>`
      : `<div class="errline center" style="margin:0 0 8px">${t("prod.notEnough")} · ${som(tot - bal)}</div>
         <button class="btn btn--gold btn-w" data-go="topup" data-close>${ICO("plus")}${t("prod.needTopup")}</button>`;
    const b = el("buyBtn");
    if (b) b.onclick = submitOrder;
  }

  async function submitOrder() {
    const target = el("target").value.trim();
    if (target.length < 2) { toast(t("err.target"), "err"); el("target").focus(); return; }
    const b = el("buyBtn");
    b.disabled = true; b.textContent = t("common.loading");
    try {
      const r = await api("/api/order", {
        body: { itemId: O.item.id, tierId: O.tierId, qty: 1, target,
                comment: el("comment").value.trim(), promo: O.promo }
      });
      closeSheet();
      toast(t("ok.ordered") + " #" + r.order.seq, "ok");
      if (O.promo) { S.myPromo = ""; try { localStorage.removeItem("mp_promo"); } catch (e) {} }
      await loadMe();
      go("orders");
    } catch (e) {
      toast(errText(e), "err");
      b.disabled = false; b.innerHTML = ICO("check") + t("prod.buy");
    }
  }

  // Eski buyurtmani takrorlash: mahsulot va paket oldindan tanlanadi,
  // ma'lumot maydoni ham to'ldiriladi — mijoz faqat tasdiqlaydi.
  function repeatOrder(orderId) {
    const o = ((S.me && S.me.orders) || []).find(x => x.id === orderId);
    if (!o) return;
    const item = S.catalog.find(x => x.id === o.itemId);
    if (!item) return toast(t("err.item_gone"), "err");
    if (item.maint) return toast(t("err.maintenance"), "err");
    const tier = (item.tiers || []).find(x => x.id === o.tierId);
    openProduct(item.id, { tierId: tier ? tier.id : "", target: o.target });
  }

  /* ══════════ Balansni to'ldirish ══════════ */

  function openTopup(methodType) {
    const c = S.config || {};
    const cards = (c.cards || []).filter(x =>
      !methodType || String(x.type).toUpperCase() === methodType);
    if (!cards.length) return toast(t("err.server_error"), "err");

    const TP = { amount: 50000, cardId: cards[0].id };
    const presets = [20000, 50000, 100000, 200000, 500000, 1000000];

    openSheet(t("topup.title"), `
      <label for="amt">${t("topup.amount")}</label>
      <div class="chips" id="chips">
        ${presets.map(v => `<button data-amt="${v}" class="${v === TP.amount ? "on" : ""}">${money(v)}</button>`).join("")}
      </div>
      <input class="input price" id="amt" inputmode="numeric" style="margin-top:7px"
             placeholder="${esc(t("topup.amountPh"))}" value="${TP.amount}">
      <div class="hint">${ICO("info", 13)}<span>${t("topup.min")}: ${som(c.minTopup || 5000)}</span></div>

      <label>${t("topup.card")}</label>
      <div class="rows" style="padding:0" id="cards">
        ${cards.map(cd => `<button class="row" data-card="${esc(cd.id)}"
          ${cd.id === TP.cardId ? 'style="border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)"' : ""}>
          <span class="row-ic">${ICO("card", 19)}</span>
          <span class="row-b"><span class="row-t">${esc(cd.type)}</span>
          <span class="row-s price">${esc(cd.number)}</span></span>
        </button>`).join("")}
      </div>

      <div class="hint" style="margin-top:12px">${ICO("lock", 13)}<span>${t("topup.rules")}</span></div>
      <div class="buybar"><button class="btn btn--gold btn-w" id="next">${t("topup.next")}${ICO("chevron")}</button></div>`);

    el("chips").addEventListener("click", e => {
      const b = e.target.closest("[data-amt]");
      if (!b) return;
      TP.amount = Number(b.getAttribute("data-amt"));
      el("amt").value = TP.amount;
      [...el("chips").children].forEach(c2 => c2.classList.toggle("on", c2 === b));
      haptic();
    });
    el("amt").addEventListener("input", e => {
      e.target.value = e.target.value.replace(/\D/g, "");
      TP.amount = Number(e.target.value) || 0;
      [...el("chips").children].forEach(c2 => c2.classList.remove("on"));
    });
    el("cards").addEventListener("click", e => {
      const b = e.target.closest("[data-card]");
      if (!b) return;
      TP.cardId = b.getAttribute("data-card");
      [...el("cards").children].forEach(c2 => {
        const on = c2 === b;
        c2.style.borderColor = on ? "var(--acc)" : "";
        c2.style.boxShadow = on ? "inset 0 0 0 1px var(--acc)" : "";
      });
      haptic();
    });
    el("next").onclick = async () => {
      if (TP.amount < ((S.config && S.config.minTopup) || 5000)) return toast(t("err.min_topup"), "err");
      const b = el("next");
      b.disabled = true; b.textContent = t("common.loading");
      try {
        const p = await api("/api/topup", { body: { amount: TP.amount, cardId: TP.cardId } });
        S.pending = p;
        showWait(p);
      } catch (e) {
        toast(errText(e), "err");
        b.disabled = false; b.innerHTML = t("topup.next") + ICO("chevron");
      }
    };
  }
  window.mpOpenTopup = openTopup;

  function showWait(p) {
    const span = Math.max(1, (p.expiresAt || 0) - p.ts);
    openSheet(t("topup.title"), `
      <div class="paycard">
        <button class="btn btn--line btn-sm pc-copy" data-copy="${esc(String(p.cardNumber).replace(/\s/g, ""))}">${ICO("copy", 14)}</button>
        <div class="pc-k">${esc(p.cardType)}</div>
        <div class="pc-num">${esc(p.cardNumber)}</div>
        <div class="pc-h">${esc(p.cardHolder || "")}</div>
      </div>

      <div class="huge-wrap" data-copy="${p.amount}">
        <div class="huge">${money(p.amount)}</div>
        <div class="huge-k">${t("topup.exact")}</div>
      </div>

      <div class="steps">
        <div class="step"><span class="step-n">1</span><span class="step-t">${t("topup.s1")}</span></div>
        <div class="step"><span class="step-n">2</span><span class="step-t">${t("topup.s2")}</span></div>
        <div class="step"><span class="step-n">3</span><span class="step-t">${t("topup.s3")}</span></div>
      </div>

      <div class="timer-row">${ICO("clock", 16)}<span class="timer" id="tm">--:--</span></div>
      <div class="timer-bar"><i id="tmbar" style="width:100%"></i></div>

      <div class="buybar">
        <button class="btn btn--acc btn-w" id="paid">${ICO("check")}${t("topup.paid")}</button>
        <button class="btn btn--danger btn-w" id="cancel" style="margin-top:8px">${t("topup.cancel")}</button>
      </div>
    `, () => { S.pending = null; });

    el("sheetBody").addEventListener("click", e => {
      const c = e.target.closest("[data-copy]");
      if (c) copy(c.getAttribute("data-copy"));
    });

    clearInterval(S.timerId);
    const tick = () => {
      const node = el("tm");
      if (!node) return clearInterval(S.timerId);
      const left = Math.max(0, (p.expiresAt || 0) - Date.now());
      const m = Math.floor(left / 60000), sec = Math.floor(left % 60000 / 1000);
      node.textContent = String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
      const hot = left < 120000;
      node.classList.toggle("hot", hot);
      const bar = el("tmbar");
      if (bar) { bar.style.width = (left / span * 100) + "%"; bar.classList.toggle("hot", hot); }
      if (left <= 0) { clearInterval(S.timerId); closeSheet(); toast(t("st.expired"), "err"); loadMe().then(render); }
    };
    tick();
    S.timerId = setInterval(tick, 1000);

    el("paid").onclick = async () => {
      const b = el("paid");
      b.disabled = true; b.textContent = t("common.loading");
      try {
        await api("/api/topup/paid", { body: { id: p.id } });
        clearInterval(S.timerId);
        el("sheetBody").innerHTML =
          empty("clock", t("topup.waiting"), som(p.amount)) +
          `<button class="btn btn--line btn-w" data-close>${t("common.close")}</button>`;
        haptic("ok");
        loadMe();
      } catch (e) {
        toast(errText(e), "err");
        b.disabled = false; b.innerHTML = ICO("check") + t("topup.paid");
      }
    };
    el("cancel").onclick = async () => {
      try { await api("/api/topup/cancel", { body: { id: p.id } }); } catch (e) {}
      closeSheet(); loadMe().then(render);
    };
  }

  /* ══════════ Referal / reyting / promokod ══════════ */

  async function openReferral() {
    openSheet(t("ref.title"), `<div class="skel"></div>`);
    let r;
    try { r = await api("/api/referral"); }
    catch (e) { el("sheetBody").innerHTML = `<div class="errline">${esc(errText(e))}</div>`; return; }
    if (!r.enabled) { el("sheetBody").innerHTML = empty("users", t("ref.off")); return; }

    const bot = (S.config && S.config.botUsername) || "";
    const link = bot ? "https://t.me/" + bot + "?startapp=ref" + r.code
                     : location.origin + "/?ref=" + r.code;

    el("sheetBody").innerHTML = `
      <div class="ocard" style="margin:0"><div class="sm">${t("ref.desc", { p: r.percent })}</div></div>
      <div class="stats" style="padding:0;margin-top:9px">
        <div class="stat"><div class="stat-v">${r.invited}</div><div class="stat-k">${t("ref.invited")}</div></div>
        <div class="stat"><div class="stat-v">${r.invitedActive}</div><div class="stat-k">${t("ref.active")}</div></div>
        <div class="stat"><div class="stat-v">${money(r.earned)}</div><div class="stat-k">${t("ref.earned")}</div></div>
      </div>
      <label>${t("ref.link")}</label>
      <input class="input" readonly value="${esc(link)}">
      <button class="btn btn--gold btn-w" id="refCopy" style="margin-top:10px">${ICO("copy")}${t("ref.copy")}</button>
      <button class="btn btn--line btn-w" id="refShare" style="margin-top:8px">${ICO("send")}${t("ref.share")}</button>`;

    el("refCopy").onclick = () => copy(link);
    el("refShare").onclick = () => openLink("https://t.me/share/url?url=" +
      encodeURIComponent(link) + "&text=" + encodeURIComponent(t("ref.shareText")));
  }

  const LB_PERIODS = ["today", "week", "month", "all"];

  function podiumHTML(list) {
    const top = list.slice(0, 3);
    if (!top.length) return "";
    const byRank = {};
    top.forEach(x => { byRank[x.rank] = x; });
    // Ko'rinish tartibi: 2-chi chapda, 1-chi markazda, 3-chi o'ngda
    return `<div class="podium">${[2, 1, 3].map(pos => {
      const r = byRank[pos];
      if (!r) return `<div class="pod pod-${pos}"></div>`;
      return `<div class="pod pod-${pos}">
        <span class="pod-ring">
          <span class="pod-av">${esc(r.name.trim().charAt(0).toUpperCase())}</span>
          <span class="pod-medal">${pos}</span>
        </span>
        <span class="pod-n">${esc(r.name)}</span>
        <span class="pod-v">${money(r.total)}</span>
        <span class="pod-c">${r.count} ${t("lb.orders")}</span>
        <span class="pod-bar">${pos}</span>
      </div>`;
    }).join("")}</div>`;
  }

  const lbRow = r => `<div class="lb-row">
    <span class="lb-rank">${r.rank}</span>
    <span class="lb-n">${esc(r.name)}<span class="lb-c">${r.count} ${t("lb.orders")}</span></span>
    <span class="lb-v">${money(r.total)}</span>
  </div>`;

  async function openLeaders() {
    let period = "all";

    openSheet(t("lb.title"), `
      <div class="lb-period" id="lbSeg">
        ${LB_PERIODS.map(p => `<button data-period="${p}" class="${p === period ? "on" : ""}">${t("lb." + p)}</button>`).join("")}
      </div>
      <div id="lbBody"><div class="skel"></div></div>`);

    async function load() {
      const box = el("lbBody");
      box.innerHTML = `<div class="skel"></div>`;
      let r;
      try { r = await api("/api/leaderboard?period=" + period); }
      catch (e) { box.innerHTML = `<div class="errline">${esc(errText(e))}</div>`; return; }

      const list = r.leaderboard || [];
      if (!list.length) { box.innerHTML = empty("palak", t("lb.empty")); return; }

      const rest = list.slice(3);
      box.innerHTML =
        (r.me && r.me.rank ? `<div class="lb-row lb-me">
            <span class="lb-rank">${r.me.rank}</span>
            <span class="lb-n">${t("lb.you")}<span class="lb-c">${r.me.count} ${t("lb.orders")}</span></span>
            <span class="lb-v">${money(r.me.total)}</span>
          </div>` : "") +
        podiumHTML(list) +
        (rest.length ? `<div class="lb">${rest.map(lbRow).join("")}</div>` : "");
    }

    el("lbSeg").addEventListener("click", e => {
      const b = e.target.closest("[data-period]");
      if (!b) return;
      period = b.getAttribute("data-period");
      [...el("lbSeg").children].forEach(c => c.classList.toggle("on", c === b));
      haptic();
      load();
    });
    load();
  }


  async function toggleNotif() {
    const sw = el("notifSw");
    if (!sw) return;
    const next = !sw.classList.contains("on");
    sw.classList.toggle("on", next);
    haptic();
    try {
      await api("/api/notif", { body: { enabled: next } });
      if (S.me) S.me.notifEnabled = next;
    } catch (e) {
      sw.classList.toggle("on", !next);
      toast(errText(e), "err");
    }
  }

  function openLoyalty() {
    const l = S.me && S.me.loyalty;
    const tiers = (S.config && S.config.loyalty && S.config.loyalty.tiers) || [];
    if (!tiers.length) return toast(t("err.server_error"), "err");
    const spent = (S.me && S.me.spent) || 0;

    openSheet(t("profile.loyalty"), `
      <div class="ocard" style="margin:0">
        <div class="tiny mut">${t("profile.spent")}</div>
        <div class="bal-v" style="font-size:24px">${money(spent)}<span class="cur">${t("common.som")}</span></div>
      </div>
      <div class="rows" style="padding:0;margin-top:11px">
        ${tiers.slice().sort((a, b) => a.minSpent - b.minSpent).map(x => {
          const reached = spent >= x.minSpent;
          const now = l && l.current && l.current.name === x.name;
          return `<div class="row" ${now ? 'style="border-color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold)"' : ""}>
            <span class="row-ic" style="color:${reached ? "var(--gold)" : "var(--mut)"}">${ICO("palak", 19)}</span>
            <span class="row-b">
              <span class="row-t">${esc(x.name)}${now ? " · " + t("lb.you") : ""}</span>
              <span class="row-s">${som(x.minSpent)} ${t("profile.fromSpent")}</span>
            </span>
            <span class="row-e"><span class="row-p">${x.percent}%</span></span>
          </div>`;
        }).join("")}
      </div>
      <div class="hint" style="margin-top:12px">${ICO("info", 13)}<span>${t("profile.loyaltyHint")}</span></div>
      <button class="btn btn--line btn-w" style="margin-top:12px" data-close>${t("common.close")}</button>`);
  }

  // Promokod oynasi: kodni tekshirib saqlash va ochiq kodlar ro'yxati.
  // Ilgari bu blok profil sahifasining o'rtasida turardi — endi u faqat
  // kerak bo'lganda ochiladi va profil ro'yxati tozaroq ko'rinadi.
  function openPromos() {
    openSheet(t("promo.title"), `
      <div class="inline">
        <input class="input" id="promoIn" placeholder="${esc(t("promo.ph"))}"
               value="${esc(S.myPromo)}" autocomplete="off" style="text-transform:uppercase">
        <button class="btn btn--acc" id="promoSave">${t("promo.check")}</button>
      </div>
      <div id="promoMsg"></div>
      <div class="lbl">${t("promo.avail")}</div>
      <div class="promolist">
        ${S.promos.length ? S.promos.map(p => `<button class="promoitem" data-promo="${esc(p.code)}">
          <span style="flex:1;min-width:0">
            <span class="promo-code">${esc(p.code)}</span>
            <span class="promo-note">${esc(p.note || (p.type === "fixed" ? som(p.value) : p.value + "%"))}</span>
          </span>
          <span class="promo-take">${t("promo.take")}</span>
        </button>`).join("")
        : `<div class="tiny mut">${t("promo.none")}</div>`}
      </div>
      <div class="hint" style="margin-top:12px">${ICO("info", 13)}<span>${t("promo.hint")}</span></div>`,
      null, { icon: ICO("tag", 20), glaze: 2 });

    el("promoSave").onclick = savePromo;
    // Ro'yxat hali yuklanmagan bo'lsa — yuklab, oynani yangilaymiz. Bu orada
    // boshqa oyna ochilgan bo'lsa tegmaymiz (aks holda u almashib ketardi).
    if (!S.promos.length) loadPromos().then(() => {
      if (S.promos.length && el("sheetTitle").textContent === t("promo.title")) openPromos();
    });
  }

  async function savePromo() {
    const code = el("promoIn").value.trim().toUpperCase();
    const msg = el("promoMsg");
    if (!code) {
      S.myPromo = "";
      try { localStorage.removeItem("mp_promo"); } catch (e) {}
      msg.innerHTML = "";
      return;
    }
    try {
      // Katta summa bilan tekshirish kodning o'zi amal qilishini aniqlaydi;
      // minimal buyurtma sharti buyurtma paytida qayta tekshiriladi.
      await api("/api/promo/check", { body: { code, subtotal: 1000000 } });
      S.myPromo = code;
      try { localStorage.setItem("mp_promo", code); } catch (e) {}
      msg.innerHTML = `<div class="okline">${t("promo.saved")}</div>`;
      haptic("ok");
    } catch (e) {
      msg.innerHTML = `<div class="errline">${esc(errText(e))}</div>`;
      haptic("err");
    }
  }

  /* ══════════ Sharh va yordam ══════════ */

  function openReview(orderId) {
    let stars = 5;
    openSheet(t("orders.reviewTitle"), `
      <div class="center" id="starBox" style="display:flex;justify-content:center;gap:8px;margin:6px 0 2px">
        ${[1, 2, 3, 4, 5].map(i => `<button data-star="${i}" style="color:var(--gold)">${ICO("star", 28)}</button>`).join("")}
      </div>
      <label for="revText">${t("orders.reviewText")}</label>
      <textarea class="textarea" id="revText" maxlength="300"></textarea>
      <button class="btn btn--acc btn-w" id="revSend" style="margin-top:12px">${ICO("send")}${t("orders.send")}</button>`);

    const paint = () => [...el("starBox").children].forEach((n, i) => {
      n.style.opacity = i < stars ? "1" : ".28";
    });
    paint();
    el("starBox").addEventListener("click", e => {
      const s = e.target.closest("[data-star]");
      if (!s) return;
      stars = Number(s.getAttribute("data-star"));
      haptic(); paint();
    });
    el("revSend").onclick = async () => {
      try {
        await api("/api/review", { body: { orderId, stars, text: el("revText").value.trim() } });
        closeSheet();
        toast(t("orders.thanks"), "ok");
        loadMe().then(render);
        loadReviews();
      } catch (e) { toast(errText(e), "err"); }
    };
  }

  function openHowTo() {
    openSheet(t("topup.how"), `
      <div class="steps">
        <div class="step"><span class="step-n">1</span><span class="step-t">${t("topup.s1")}</span></div>
        <div class="step"><span class="step-n">2</span><span class="step-t">${t("topup.s2")}</span></div>
        <div class="step"><span class="step-n">3</span><span class="step-t">${t("topup.s3")}</span></div>
      </div>
      <div class="hint" style="margin-top:12px">${ICO("lock", 13)}<span>${t("topup.rules")}</span></div>
      <button class="btn btn--acc btn-w" style="margin-top:14px" data-close>${t("common.close")}</button>`);
  }

  /* ══════════ Navigatsiya ══════════ */

  const TABS = [
    { id: "home",    icon: "arch",   key: "nav.home" },
    { id: "catalog", icon: "pad",    key: "nav.catalog" },
    { id: "topup",   icon: "wallet", key: "nav.topup" },
    { id: "orders",  icon: "scroll", key: "nav.orders" },
    { id: "profile", icon: "user",   key: "nav.profile" }
  ];
  const VIEWS = { home: viewHome, catalog: viewCatalog, topup: viewTopup, orders: viewOrders, profile: viewProfile };

  function renderGreeting() {
    const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    const name = u.first_name || t("home.guest");
    const inside = u.photo_url
      ? `<img src="${esc(u.photo_url)}" alt="">`
      : esc(name.trim().charAt(0).toUpperCase());
    el("hiBox").innerHTML = `
      <span class="hi-av">${inside}</span>
      <span class="hi-t">
        <span class="hi-k">${t("home.hi")}</span>
        <span class="hi-n">${esc(name)}</span>
      </span>`;
  }

  function buildTabs() {
    el("tabbar").innerHTML = `<span class="tabpill" id="tabpill"></span>` +
      TABS.map(x => `<button data-tab="${x.id}" class="${x.id === S.tab ? "on" : ""}">
        ${ICO(x.icon, 21)}<span>${t(x.key)}</span></button>`).join("");
  }

  function movePill() {
    const pill = el("tabpill");
    const btn = el("tabbar").querySelector('[data-tab="' + S.tab + '"]');
    if (!btn || !pill) return;
    pill.style.left = btn.offsetLeft + "px";
    pill.style.width = btn.offsetWidth + "px";
    pill.classList.add("on");
  }

  function render() {
    el("view").innerHTML = (VIEWS[S.tab] || viewHome)();
    renderGreeting();
    buildTabs();
    requestAnimationFrame(movePill);
    bindView();
    window.scrollTo(0, 0);
  }
  window.mpRender = render;

  // Ko'rinishga xos maydonlar har render'dan keyin ulanadi. Qidiruvda faqat to'r
  // qismi almashtiriladi — shunda kiritish maydoni fokusni yo'qotmaydi.
  function bindView() {
    const q = el("q");
    if (q) q.addEventListener("input", e => {
      S.query = e.target.value;
      const box = el("gridBox");
      if (box) box.innerHTML = catalogGrid();
    });
  }

  function go(tab) {
    if (!VIEWS[tab]) return;
    S.tab = tab; render(); haptic();
    if (tab === "profile" && !S.promos.length) {
      loadPromos().then(() => { if (S.tab === "profile") render(); });
    }
  }
  window.mpGo = go;

  /* ══════════ Hodisalar ══════════ */

  document.addEventListener("click", e => {
    const tab = e.target.closest("[data-tab]");
    if (tab) return go(tab.getAttribute("data-tab"));

    const goBtn = e.target.closest("[data-go]");
    if (goBtn) {
      if (goBtn.hasAttribute("data-close")) closeSheet();
      return go(goBtn.getAttribute("data-go"));
    }
    if (e.target.closest("[data-close]")) return closeSheet();

    const fq = e.target.closest("[data-faq]");
    if (fq) {
      const i = Number(fq.getAttribute("data-faq"));
      S.openFaq = S.openFaq === i ? -1 : i;
      haptic();
      return render();
    }

    const lang = e.target.closest("[data-lang]");
    if (lang) return setLang(lang.getAttribute("data-lang"));

    const th = e.target.closest("[data-settheme]");
    if (th) {
      const mode = th.getAttribute("data-settheme");
      if (mode !== themeNow()) { applyTheme(mode); render(); }
      return;
    }

    const cp = e.target.closest("[data-copy]");
    if (cp && !e.target.closest(".sh-body")) {
      const v = cp.getAttribute("data-copy");
      if (v) copy(v);
      return;
    }

    if (e.target.closest("#notifSw")) return toggleNotif();
    if (e.target.closest("#animSw")) return toggleAnim();

    const f = e.target.closest("[data-f]");
    if (f) { S.group = f.getAttribute("data-f"); haptic(); return render(); }

    const m = e.target.closest("[data-m]");
    if (m && !m.classList.contains("off")) {
      const meth = METHODS.find(x => x.id === m.getAttribute("data-m"));
      return openTopup(meth ? meth.type : null);
    }

    const item = e.target.closest("[data-item]");
    if (item) return openProduct(item.getAttribute("data-item"));

    const of = e.target.closest("[data-of]");
    if (of) { S.orderFilter = of.getAttribute("data-of"); haptic(); return render(); }

    const pay = e.target.closest("[data-pay]");
    if (pay) {
      const p = ((S.me && S.me.payments) || []).find(x => x.id === pay.getAttribute("data-pay"));
      if (p) { S.pending = p; return showWait(p); }
    }

    const otabGo = e.target.closest("[data-otab-go]");
    if (otabGo) { S.orderTab = otabGo.getAttribute("data-otab-go"); return go("orders"); }

    const otab = e.target.closest("[data-otab]");
    if (otab) { S.orderTab = otab.getAttribute("data-otab"); haptic(); return render(); }

    const odet = e.target.closest("[data-odet]");
    if (odet) return openOrder(odet.getAttribute("data-odet"));

    const rep = e.target.closest("[data-repeat]");
    if (rep) return repeatOrder(rep.getAttribute("data-repeat"));

    const rev = e.target.closest("[data-review]");
    if (rev) return openReview(rev.getAttribute("data-review"));

    // Tafsilot oynasidagi ID'ni nusxalash (sheet ichida ham ishlashi kerak)
    const cps = e.target.closest(".sh-body [data-copy]");
    if (cps) { const v = cps.getAttribute("data-copy"); if (v) copy(v); return; }

    const promo = e.target.closest("[data-promo]");
    if (promo) {
      const code = promo.getAttribute("data-promo");
      S.myPromo = code;
      try { localStorage.setItem("mp_promo", code); } catch (e2) {}
      copy(code);
      toast(t("promo.saved"), "ok");
      closeSheet();
      return render();
    }

    const link = e.target.closest("[data-open]");
    if (link) return openLink(link.getAttribute("data-open"));

    const act = e.target.closest("[data-act]");
    if (!act) return;
    const a = act.getAttribute("data-act");
    if (a === "topupOpen") return openTopup();
    if (a === "loyalty") return openLoyalty();
    if (a === "referral") return openReferral();
    if (a === "leaders") return openLeaders();
    if (a === "promos") return openPromos();
    if (a === "howto") return openHowTo();
    if (a === "support") return openLink("https://t.me/" + ((S.config && S.config.support) || ""));
    if (a === "admin") return window.mpOpenAdmin && window.mpOpenAdmin();
    if (a === "theme") return toggleTheme();
  });

  el("langBtn").onclick = toggleLang;
  el("themeBtn").onclick = toggleTheme;
  window.addEventListener("resize", movePill);

  /* ══════════ Yuklash ══════════ */

  async function loadMe() {
    try { S.me = await api("/api/me"); }
    catch (e) { if (e.code === "auth" || e.code === "expired") S.me = null; return; }
    const open = (S.me.payments || []).find(p =>
      p.status === "pending" && p.expiresAt > Date.now() && !p.claimedAt);
    if (open && !S.pending && el("sheetWrap").hidden) { S.pending = open; showWait(open); }
  }
  const loadCatalog = () => api("/api/catalog").then(c => { S.catalog = c || []; }).catch(() => {});
  const loadConfig = () => api("/api/config").then(c => { S.config = c; }).catch(() => {});
  const loadReviews = () => api("/api/reviews").then(c => { S.reviews = c || null; }).catch(() => {});
  const loadStats = () => api("/api/stats").then(c => { S.stats = c; }).catch(() => {});
  const loadPromos = () => api("/api/promos").then(c => { S.promos = c || []; }).catch(() => {});

  async function boot() {
    let saved = null;
    try { saved = localStorage.getItem("mp_theme"); } catch (e) {}
    applyTheme(saved || "dark");
    applyAnim();
    el("langBtn").textContent = window.I18N.lang.toUpperCase();
    el("sheetX").innerHTML = ICO("x", 14);
    document.documentElement.lang = window.I18N.lang;

    if (tg) {
      try {
        tg.ready(); tg.expand();
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        if (tg.BackButton) tg.BackButton.onClick(() => {
          if (window.mpAskOpen()) return window.mpAskClose();
          if (sheetBack && sheetBack() === true) return;
          closeSheet();
        });
        let lang = null;
        try { lang = localStorage.getItem("mp_lang"); } catch (e) {}
        const code = tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
        if (!lang && code && code.startsWith("ru")) window.I18N.set("ru");
      } catch (e) {}
    }

    await Promise.all([loadConfig(), loadCatalog(), loadMe(), loadReviews(), loadStats(), loadPromos()]);
    if (!tg || !tg.initData) toast(t("err.auth"), "err");

    render();
    el("app").hidden = false;
    requestAnimationFrame(movePill);
    setTimeout(() => {
      el("splash").classList.add("off");
      setTimeout(() => { el("splash").style.display = "none"; }, 450);
    }, 480);

    setInterval(() => {
      if (document.hidden) return;
      loadMe().then(() => { if (["home", "orders", "profile", "topup"].includes(S.tab)) render(); });
    }, 25000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) loadMe().then(render); });
  }

  boot();
})();
