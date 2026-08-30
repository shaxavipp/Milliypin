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
    tab: "home", config: null, catalog: [], me: null, reviews: [], stats: null,
    pending: null, timerId: 0
  };
  window.MP = S;

  /* ══════════ Yordamchilar ══════════ */

  const nf = new Intl.NumberFormat("ru-RU");
  // ru-RU minglarni buzilmas probel bilan ajratadi; monoshriftda u juda keng chiqadi,
  // shu sabab ingichka probel (U+2009) ga almashtiriladi.
  const money = n => nf.format(Math.round(Number(n) || 0)).replace(/\u00A0/g, "\u2009");
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
  function openSheet(title, html, cb) {
    el("sheetTitle").textContent = title || "";
    el("sheetBody").innerHTML = html;
    el("sheetWrap").hidden = false;
    document.body.style.overflow = "hidden";
    onSheetClose = cb || null;
    if (tg && tg.BackButton) tg.BackButton.show();
  }
  function closeSheet() {
    if (el("sheetWrap").hidden) return;
    el("sheetWrap").hidden = true;
    document.body.style.overflow = "";
    clearInterval(S.timerId);
    const c = onSheetClose; onSheetClose = null;
    if (c) c();
    if (tg && tg.BackButton) tg.BackButton.hide();
  }
  window.mpSheet = openSheet;
  window.mpCloseSheet = closeSheet;

  /* ══════════ Mavzu ══════════ */

  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem("mp_theme", mode); } catch (e) {}
    el("themeBtn").innerHTML = ICO(mode === "dark" ? "sun" : "moon", 16);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", mode === "dark" ? "#0B1418" : "#F3EADA");
  }
  const themeNow = () => document.documentElement.getAttribute("data-theme");
  function toggleTheme() { applyTheme(themeNow() === "dark" ? "light" : "dark"); render(); }

  function toggleLang() {
    const L = window.I18N.langs;
    window.I18N.set(L[(L.indexOf(window.I18N.lang) + 1) % L.length]);
    el("langBtn").textContent = window.I18N.lang.toUpperCase();
    render();
  }

  /* ══════════ Umumiy bo'laklar ══════════ */

  const sect = (title, more) =>
    `<div class="sect"><h3>${title}</h3>${more || ""}</div>`;

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

  // Plitadagi yorliq — faqat haqiqiy chegirma bo'lganda. Har mahsulotda "TOP" turgani
  // yorliqni ma'nosiz qilardi; chegirma foizi esa aniq ma'lumot beradi.
  function tileTag(it) {
    const d = (it.tiers || []).find(x => x.old && x.old > x.price);
    return d ? "−" + Math.round((1 - d.price / d.old) * 100) + "%" : "";
  }

  function tile(it) {
    const tag = tileTag(it);
    return `<button class="tile" data-item="${esc(it.id)}" data-glaze="${glazeOf(it.group || it.id)}">
      <span class="tile-top">
        ${tag ? `<span class="tile-tag">${esc(tag)}</span>` : ""}
        ${ICO(it.icon, 26) || ICO("gift", 26)}
      </span>
      <span class="tile-body">
        <span class="tile-n">${esc(pick(it.title))}</span>
        <span class="tile-p price"><span class="from">${t("prod.from")}</span>${money(minPrice(it))}</span>
      </span>
    </button>`;
  }

  // Bo'lim bo'yicha tanlangan filtr (guruh nomi yoki "all")
  const filter = { telegram: "all", game: "all" };

  function catalogView(cat) {
    const items = S.catalog.filter(i => i.category === cat);
    if (!items.length) return empty("box", t("cat.empty"));

    // Har guruhda ko'pincha bitta mahsulot bo'ladi, shuning uchun guruhlar alohida
    // bo'lim emas, filtr chiplari sifatida ko'rsatiladi — ro'yxat zich va qisqa qoladi.
    const groups = [];
    items.forEach(i => { const g = i.group || "—"; if (!groups.includes(g)) groups.push(g); });
    const on = groups.includes(filter[cat]) ? filter[cat] : "all";
    const shown = on === "all" ? items : items.filter(i => (i.group || "—") === on);

    return `<div class="pills pills--v" data-filter="${cat}">
        <button class="pill ${on === "all" ? "on" : ""}" data-f="all">${t("home.all")}</button>
        ${groups.map(g => `<button class="pill ${on === g ? "on" : ""}" data-f="${esc(g)}">${esc(g)}</button>`).join("")}
      </div>
      <div class="grid">${shown.map(tile).join("")}</div>`;
  }

  /* ══════════ Ko'rinish: Bosh ══════════ */

  function viewHome() {
    const bal = S.me ? S.me.balance : 0;
    const l = S.me && S.me.loyalty;
    const notice = S.config && pick(S.config.notice);
    const st = S.stats;
    const nTg = S.catalog.filter(i => i.category === "telegram").length;
    const nG = S.catalog.filter(i => i.category === "game").length;
    const top = S.catalog.filter(i => (i.tiers || []).some(x => x.badge)).slice(0, 6);

    return `
      <section class="balcard">
        <div class="bal-k">${t("home.balance")}</div>
        <div class="bal-v">${money(bal)}<span class="cur">${t("common.som")}</span></div>
        ${l && l.current ? `<span class="bal-tier">${ICO("star4", 12)}${esc(l.current.name)}${l.current.percent ? " · " + l.current.percent + "%" : ""}</span>` : ""}
        <div class="bal-acts">
          <button class="btn btn--gold btn-1" data-act="topup">${ICO("wallet")}${t("home.topup")}</button>
          <button class="btn btn--line btn-1" data-go="orders">${ICO("scroll")}${t("home.history")}</button>
        </div>
      </section>

      ${notice ? `<div class="ocard" style="margin-top:9px;border-left:2px solid var(--gold)">
        <div class="oc-b" style="margin:0">${esc(notice)}</div></div>` : ""}

      ${sect(t("home.cats"))}
      <div class="duo">
        <button class="duotile" data-go="telegram">
          ${ICO("plane", 22)}
          <div class="n">${t("home.tg")}</div>
          <div class="d">${t("home.tgSub")}</div>
          <div class="c">${nTg} ${t("home.pcs")}</div>
        </button>
        <button class="duotile" data-go="games">
          ${ICO("pad", 22)}
          <div class="n">${t("home.games")}</div>
          <div class="d">${t("home.gamesSub")}</div>
          <div class="c">${nG} ${t("home.pcs")}</div>
        </button>
      </div>

      ${top.length ? sect(t("home.popular")) + `<div class="grid">${top.map(tile).join("")}</div>` : ""}

      ${sect(t("home.stats"))}
      <div class="stats">
        <div class="stat"><div class="stat-v">${st ? money(st.users) : "—"}</div><div class="stat-k">${t("home.statUsers")}</div></div>
        <div class="stat"><div class="stat-v">${st ? money(st.orders) : "—"}</div><div class="stat-k">${t("home.statOrders")}</div></div>
        <div class="stat"><div class="stat-v">24/7</div><div class="stat-k">${t("home.trust3")}</div></div>
      </div>

      ${S.reviews.length ? sect(t("home.reviews")) + `<div class="rows">
        ${S.reviews.slice(0, 4).map(r => `<div class="row">
          <span class="row-ic" style="color:var(--gold)">${ICO("star", 19)}</span>
          <span class="row-b">
            <span class="row-t">${esc(r.name || "—")} · ${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span>
            <span class="row-s">${esc(r.text || r.itemTitle || "")}</span>
          </span>
        </div>`).join("")}
      </div>` : ""}

      <div class="center tiny mut" style="margin-top:22px">
        ${esc((S.config && S.config.brand) || "Milliy Pin")}${S.config && S.config.workHours ? " · " + esc(S.config.workHours) : ""}
      </div>`;
  }

  const viewTelegram = () => sect(t("cat.tgTitle")) .replace('class="sect"', 'class="sect sect--first"') + catalogView("telegram");
  const viewGames = () => sect(t("cat.gamesTitle")).replace('class="sect"', 'class="sect sect--first"') + catalogView("game");

  /* ══════════ Ko'rinish: Buyurtmalar ══════════ */

  const dt = ts => new Date(ts).toLocaleString("ru-RU",
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  function viewOrders() {
    const orders = (S.me && S.me.orders) || [];
    const pays = (S.me && S.me.payments) || [];

    const body = orders.length ? orders.map(o => `
      <div class="ocard">
        <div class="oc-top">
          <span class="oc-n">${ICO(o.itemIcon || "gift", 16)}<span>#${o.seq} ${esc(o.itemTitle)}</span></span>
          <span class="tag tag--${esc(o.status)}">${t("st." + o.status)}</span>
        </div>
        <div class="oc-b">
          ${esc(o.tierLabel)}${o.qty > 1 ? " × " + o.qty : ""} · <b class="price">${som(o.total)}</b>
          <div><span class="oc-target">${esc(o.target)}</span></div>
        </div>
        <div class="oc-m">
          <span>${ICO("clock", 12)}${dt(o.ts)}</span>
          ${o.discount ? `<span>${ICO("tag", 12)}−${som(o.discount)}</span>` : ""}
          ${o.cashback ? `<span>${ICO("gift", 12)}+${som(o.cashback)}</span>` : ""}
        </div>
        ${o.canReview ? `<div class="oc-acts"><button class="btn btn--line" data-review="${esc(o.id)}">${ICO("star")}${t("orders.review")}</button></div>` : ""}
      </div>`).join("")
      : empty("scroll", t("orders.empty"), t("orders.emptySub"));

    const payList = pays.length ? sect(t("orders.payments")) + `<div class="rows">
      ${pays.map(p => `<div class="row">
        <span class="row-ic">${ICO("card", 19)}</span>
        <span class="row-b">
          <span class="row-t price">${som(p.amount)}</span>
          <span class="row-s">${esc(p.cardType || "")} · ${dt(p.ts)}</span>
        </span>
        <span class="row-e"><span class="tag tag--${esc(p.status)}">${t("st." + p.status)}</span></span>
      </div>`).join("")}</div>` : "";

    return sect(t("orders.title")).replace('class="sect"', 'class="sect sect--first"') + body + payList;
  }

  /* ══════════ Ko'rinish: Profil ══════════ */

  function viewProfile() {
    const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    const me = S.me || { balance: 0, spent: 0, orders: [] };
    const c = S.config || {};
    const l = me.loyalty;
    const left = l && l.next ? Math.max(0, l.next.minSpent - me.spent) : 0;
    const pct = l && l.next && l.next.minSpent ? Math.min(100, Math.round(me.spent / l.next.minSpent * 100)) : 0;

    const link = (icon, text, val, href) =>
      `<a class="menu-i" href="${esc(href)}" target="_blank" rel="noopener">
        ${ICO(icon)}<span class="menu-t">${text}</span>
        <span class="menu-v">${val ? esc(val) : ""}${ICO("chevron", 14)}</span></a>`;

    return `
      <div class="prof">
        <div class="prof-av">${esc((u.first_name || "M").trim().charAt(0).toUpperCase())}</div>
        <div style="min-width:0">
          <div class="prof-n">${esc(u.first_name || "Mehmon")} ${esc(u.last_name || "")}</div>
          <div class="prof-id">${u.username ? "@" + esc(u.username) : "ID " + esc(me.id || "—")}</div>
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
        <button class="menu-i" data-act="topup">${ICO("wallet")}<span class="menu-t">${t("home.topup")}</span><span class="menu-v">${ICO("chevron", 14)}</span></button>
        <button class="menu-i" data-act="referral">${ICO("users")}<span class="menu-t">${t("profile.referral")}</span>
          <span class="menu-v">${c.referral && c.referral.enabled ? c.referral.percent + "%" : "—"}${ICO("chevron", 14)}</span></button>
        <button class="menu-i" data-act="lang">${ICO("globe")}<span class="menu-t">${t("profile.lang")}</span>
          <span class="menu-v">${window.I18N.lang.toUpperCase()}</span></button>
        <button class="menu-i" data-act="theme">${ICO(themeNow() === "dark" ? "moon" : "sun")}<span class="menu-t">${t("profile.theme")}</span>
          <span class="menu-v">${themeNow() === "dark" ? t("profile.dark") : t("profile.light")}</span></button>
      </div>

      <div class="menu">
        ${c.support ? link("send", t("profile.support"), "@" + c.support, "https://t.me/" + c.support) : ""}
        ${c.channelUrl ? link("megaphone", t("profile.channel"), "", c.channelUrl) : ""}
        ${c.reviewsUrl ? link("star", t("profile.reviews"), "", c.reviewsUrl) : ""}
      </div>

      ${me.isAdmin ? `<div class="menu">
        <button class="menu-i" data-act="admin">${ICO("shield")}<span class="menu-t">${t("profile.admin")}</span><span class="menu-v">${ICO("chevron", 14)}</span></button>
      </div>` : ""}

      <div class="center tiny mut" style="margin-top:20px">Milliy Pin · v1.1</div>`;
  }

  /* ══════════ Mahsulot oynasi ══════════ */

  const FIELD = {
    username:   ["field.username", "field.usernamePh"],
    playerId:   ["field.playerId", "field.playerIdPh"],
    playerZone: ["field.playerZone", "field.playerZonePh"],
    nickname:   ["field.nickname", "field.nicknamePh"],
    link:       ["field.link", "field.linkPh"]
  };

  const O = { item: null, tierId: "", promo: "", discount: 0 };
  const curTier = () => (O.item.tiers || []).find(x => x.id === O.tierId) || O.item.tiers[0];
  const subtotal = () => Number(curTier().price) || 0;
  const total = () => Math.max(0, subtotal() - O.discount);

  function openProduct(id) {
    const it = S.catalog.find(x => x.id === id);
    if (!it) return;
    O.item = it; O.tierId = (it.tiers[0] || {}).id || ""; O.promo = ""; O.discount = 0;

    const f = FIELD[it.field] || FIELD.playerId;
    const note = pick(it.note);

    openSheet(pick(it.title), `
      <div style="display:flex;align-items:center;gap:11px">
        <span class="row-ic" style="width:44px;height:44px">${ICO(it.icon || "gift", 24)}</span>
        <div>
          <div style="font-weight:800;font-size:14.5px;letter-spacing:-.02em">${esc(pick(it.title))}</div>
          <div class="tiny mut">${esc(it.group || "")}</div>
        </div>
      </div>

      <div class="lbl">${t("prod.choose")}</div>
      <div class="tiers" id="tierBox">
        ${it.tiers.map(x => `<button class="tier ${x.id === O.tierId ? "on" : ""}" data-tier="${esc(x.id)}">
          ${x.badge ? `<span class="tier-tag">${esc(x.badge)}</span>` : ""}
          <span class="tier-l">${esc(pick(x.label))}</span>
          <span class="tier-price">${money(x.price)}${x.old ? `<span class="tier-old">${money(x.old)}</span>` : ""}</span>
        </button>`).join("")}
      </div>

      <label for="target">${t(f[0])}</label>
      <input class="input" id="target" placeholder="${esc(t(f[1]))}" autocomplete="off" spellcheck="false">
      ${note ? `<div class="hint">${ICO("info", 13)}<span>${esc(note)}</span></div>` : ""}

      <label for="promo">${t("prod.promo")}</label>
      <div class="inline">
        <input class="input" id="promo" placeholder="MILLIY10" autocomplete="off" style="text-transform:uppercase">
        <button class="btn btn--line" id="promoBtn">${t("prod.promoApply")}</button>
      </div>
      <div id="promoMsg"></div>

      <label for="comment">${t("prod.comment")}</label>
      <textarea class="textarea" id="comment" placeholder="${esc(t("prod.commentPh"))}"></textarea>

      <div class="calc">
        <div class="calc-r"><span>${t("prod.subtotal")}</span><b class="price" id="cSub"></b></div>
        <div class="calc-r" id="cDiscRow" hidden><span>${t("prod.discount")}</span><b class="price" id="cDisc" style="color:var(--ok)"></b></div>
        <div class="calc-r calc-r--total"><span>${t("prod.total")}</span><b class="price" id="cTot"></b></div>
      </div>

      <div style="margin-top:12px" id="buyBox"></div>`);

    el("tierBox").addEventListener("click", e => {
      const b = e.target.closest("[data-tier]");
      if (!b) return;
      O.tierId = b.getAttribute("data-tier"); O.promo = ""; O.discount = 0;
      el("promoMsg").innerHTML = ""; el("promo").value = "";
      [...el("tierBox").children].forEach(c => c.classList.toggle("on", c === b));
      haptic(); refreshCalc();
    });

    el("promoBtn").onclick = async () => {
      const code = el("promo").value.trim().toUpperCase();
      const msg = el("promoMsg");
      if (!code) { O.promo = ""; O.discount = 0; msg.innerHTML = ""; return refreshCalc(); }
      try {
        const r = await api("/api/promo/check", { body: { code, subtotal: subtotal() } });
        O.promo = code; O.discount = r.discount || 0;
        msg.innerHTML = `<div class="okline">−${som(O.discount)}</div>`;
        haptic("ok");
      } catch (e) {
        O.promo = ""; O.discount = 0;
        msg.innerHTML = `<div class="errline">${esc(errText(e))}</div>`;
        haptic("err");
      }
      refreshCalc();
    };

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
      ? `<button class="btn btn--acc btn-w" id="buyBtn">${ICO("check")}${t("prod.buy")}</button>`
      : `<div class="errline center">${t("prod.notEnough")} · ${som(tot - bal)}</div>
         <button class="btn btn--gold btn-w" style="margin-top:8px" data-act="topup">${ICO("wallet")}${t("prod.needTopup")}</button>`;
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
      await loadMe();
      go("orders");
    } catch (e) {
      toast(errText(e), "err");
      b.disabled = false; b.innerHTML = ICO("check") + t("prod.buy");
    }
  }

  /* ══════════ Balansni to'ldirish ══════════ */

  const TP = { amount: 50000, cardId: "" };

  function openTopup() {
    const c = S.config || {};
    const cards = c.cards || [];
    if (!cards.length) return toast(t("err.server_error"), "err");
    TP.amount = 50000; TP.cardId = cards[0].id;
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
      <button class="btn btn--gold btn-w" id="next" style="margin-top:13px">${t("topup.next")}${ICO("chevron")}</button>`);

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
    const total = Math.max(1, (p.expiresAt || 0) - p.ts);
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

      <button class="btn btn--acc btn-w" id="paid" style="margin-top:14px">${ICO("check")}${t("topup.paid")}</button>
      <button class="btn btn--danger btn-w" id="cancel" style="margin-top:8px">${t("topup.cancel")}</button>
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
      const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
      node.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      const hot = left < 120000;
      node.classList.toggle("hot", hot);
      const bar = el("tmbar");
      if (bar) { bar.style.width = (left / total * 100) + "%"; bar.classList.toggle("hot", hot); }
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

  /* ══════════ Referal ══════════ */

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
      <div class="ocard" style="margin:0">
        <div class="sm">${t("ref.desc", { p: r.percent })}</div>
      </div>
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
    el("refShare").onclick = () => {
      const u = "https://t.me/share/url?url=" + encodeURIComponent(link) +
        "&text=" + encodeURIComponent(t("ref.shareText"));
      if (tg && tg.openTelegramLink) tg.openTelegramLink(u); else window.open(u, "_blank");
    };
  }

  /* ══════════ Sharh ══════════ */

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

  /* ══════════ Navigatsiya ══════════ */

  const TABS = [
    { id: "home", icon: "arch", key: "nav.home" },
    { id: "telegram", icon: "plane", key: "nav.tg" },
    { id: "games", icon: "pad", key: "nav.games" },
    { id: "orders", icon: "scroll", key: "nav.orders" },
    { id: "profile", icon: "user", key: "nav.profile" }
  ];
  const VIEWS = { home: viewHome, telegram: viewTelegram, games: viewGames, orders: viewOrders, profile: viewProfile };

  function buildTabs() {
    const bar = el("tabbar");
    bar.innerHTML = `<span class="tabpill" id="tabpill"></span>` +
      TABS.map(x => `<button data-tab="${x.id}" class="${x.id === S.tab ? "on" : ""}">
        ${ICO(x.icon, 21)}<span>${t(x.key)}</span></button>`).join("");
  }

  function movePill() {
    const bar = el("tabbar"), pill = el("tabpill");
    const btn = bar.querySelector('[data-tab="' + S.tab + '"]');
    if (!btn || !pill) return;
    pill.style.left = btn.offsetLeft + "px";
    pill.style.width = btn.offsetWidth + "px";
    pill.classList.add("on");
  }

  function render() {
    el("view").innerHTML = (VIEWS[S.tab] || viewHome)();
    el("balVal").textContent = money(S.me ? S.me.balance : 0);
    el("balIco").innerHTML = ICO("wallet", 14);
    el("markSub").textContent = t("brand.sub");
    buildTabs();
    requestAnimationFrame(movePill);
    window.scrollTo(0, 0);
  }
  window.mpRender = render;

  function go(tab) {
    if (!VIEWS[tab]) return;
    S.tab = tab; render(); haptic();
  }
  window.mpGo = go;

  /* ══════════ Hodisalar ══════════ */

  document.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) return closeSheet();

    const tab = e.target.closest("[data-tab]");
    if (tab) return go(tab.getAttribute("data-tab"));

    const goBtn = e.target.closest("[data-go]");
    if (goBtn) return go(goBtn.getAttribute("data-go"));

    const f = e.target.closest("[data-f]");
    if (f) {
      const box = f.closest("[data-filter]");
      filter[box.getAttribute("data-filter")] = f.getAttribute("data-f");
      haptic();
      return render();
    }

    const item = e.target.closest("[data-item]");
    if (item) return openProduct(item.getAttribute("data-item"));

    const rev = e.target.closest("[data-review]");
    if (rev) return openReview(rev.getAttribute("data-review"));

    const act = e.target.closest("[data-act]");
    if (!act) return;
    const a = act.getAttribute("data-act");
    if (a === "topup") return openTopup();
    if (a === "referral") return openReferral();
    if (a === "admin") return window.mpOpenAdmin && window.mpOpenAdmin();
    if (a === "lang") return toggleLang();
    if (a === "theme") return toggleTheme();
  });

  el("langBtn").onclick = toggleLang;
  el("themeBtn").onclick = toggleTheme;
  el("balPill").onclick = openTopup;
  window.addEventListener("resize", movePill);

  /* ══════════ Yuklash ══════════ */

  async function loadMe() {
    try { S.me = await api("/api/me"); }
    catch (e) { if (e.code === "auth" || e.code === "expired") S.me = null; return; }
    el("balVal").textContent = money(S.me.balance);
    const open = (S.me.payments || []).find(p =>
      p.status === "pending" && p.expiresAt > Date.now() && !p.claimedAt);
    if (open && !S.pending && el("sheetWrap").hidden) { S.pending = open; showWait(open); }
  }
  const loadCatalog = () => api("/api/catalog").then(c => { S.catalog = c || []; }).catch(() => {});
  const loadConfig = () => api("/api/config").then(c => { S.config = c; }).catch(() => {});
  const loadReviews = () => api("/api/reviews").then(c => { S.reviews = c || []; }).catch(() => {});
  const loadStats = () => api("/api/stats").then(c => { S.stats = c; }).catch(() => {});

  async function boot() {
    let saved = null;
    try { saved = localStorage.getItem("mp_theme"); } catch (e) {}
    applyTheme(saved || ((tg && tg.colorScheme === "dark") ? "dark" : "light"));
    el("langBtn").textContent = window.I18N.lang.toUpperCase();
    el("sheetX").innerHTML = ICO("x", 14);
    document.documentElement.lang = window.I18N.lang;

    if (tg) {
      try {
        tg.ready(); tg.expand();
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        if (tg.BackButton) tg.BackButton.onClick(closeSheet);
        let lang = null;
        try { lang = localStorage.getItem("mp_lang"); } catch (e) {}
        const code = tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
        if (!lang && code && code.startsWith("ru")) window.I18N.set("ru");
      } catch (e) {}
    }

    await Promise.all([loadConfig(), loadCatalog(), loadMe(), loadReviews(), loadStats()]);
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
      loadMe().then(() => { if (["home", "orders", "profile"].includes(S.tab)) render(); });
    }, 25000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) loadMe().then(render); });
  }

  boot();
})();
