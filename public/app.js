/* app.js — Milliy Pin Mini App mijoz qismi.
   Freymvorksiz: holat bitta S obyektida, ko'rinishlar HTML satr sifatida yig'iladi. */
(function () {
  "use strict";

  const tg = window.Telegram && window.Telegram.WebApp;
  const t = (k, v) => window.I18N.t(k, v);
  const pick = v => window.I18N.pick(v);

  /* ─────────── Holat ─────────── */
  const S = {
    tab: "home",
    config: null,
    catalog: [],
    me: null,
    reviews: [],
    stats: null,
    ready: false,
    pendingPayment: null,
    timerId: 0
  };
  window.MP = S; // admin.js shu holatdan foydalanadi

  /* ─────────── Yordamchilar ─────────── */
  const $ = sel => document.querySelector(sel);
  const el = id => document.getElementById(id);

  const nf = new Intl.NumberFormat("ru-RU");
  const money = n => nf.format(Math.round(Number(n) || 0));
  const som = n => money(n) + " " + t("common.som");

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  window.escHtml = escHtml;

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
    n.className = "toast" + (kind === "err" ? " is-err" : kind === "ok" ? " is-ok" : "");
    n.textContent = msg;
    n.hidden = false;
    haptic(kind);
    clearTimeout(toastT);
    toastT = setTimeout(() => { n.hidden = true; }, 2600);
  }
  window.mpToast = toast;

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t("topup.copied"), "ok");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(t("topup.copied"), "ok"); } catch (e2) { toast(text); }
      ta.remove();
    }
  }
  window.mpCopy = copy;

  /* ─────────── API ─────────── */
  async function api(pathname, opts) {
    opts = opts || {};
    const headers = { "X-Init-Data": (tg && tg.initData) || "" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    let r;
    try {
      r = await fetch(pathname, {
        method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      throw Object.assign(new Error("network"), { code: "network" });
    }
    let data = null;
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) {
      const code = (data && data.error) || "server_error";
      throw Object.assign(new Error(code), { code, data });
    }
    return data;
  }
  window.mpApi = api;

  function apiErrText(e) {
    const key = "err." + (e && e.code ? e.code : "server_error");
    const msg = t(key);
    return msg === key ? t("err.server_error") : msg;
  }
  window.mpErr = apiErrText;

  /* ─────────── Sheet (pastdan chiquvchi oyna) ─────────── */
  let sheetOnClose = null;
  function openSheet(title, html, onClose) {
    el("sheetTitle").textContent = title || "";
    el("sheetBody").innerHTML = html;
    el("sheet").hidden = false;
    document.body.style.overflow = "hidden";
    sheetOnClose = onClose || null;
    if (tg && tg.BackButton) { tg.BackButton.show(); }
  }
  function closeSheet() {
    if (el("sheet").hidden) return;
    el("sheet").hidden = true;
    document.body.style.overflow = "";
    clearInterval(S.timerId);
    const cb = sheetOnClose; sheetOnClose = null;
    if (cb) cb();
    if (tg && tg.BackButton) tg.BackButton.hide();
  }
  window.mpSheet = openSheet;
  window.mpCloseSheet = closeSheet;

  document.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) closeSheet();
  });

  /* ─────────── Mavzu va til ─────────── */
  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem("mp_theme", mode); } catch (e) {}
    const b = el("themeBtn");
    if (b) b.textContent = mode === "dark" ? "☀️" : "🌙";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "dark" ? "#0A1B2E" : "#0E2A47");
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("mp_theme"); } catch (e) {}
    if (!saved) saved = (tg && tg.colorScheme === "dark") ? "dark" : "light";
    applyTheme(saved);
  }

  /* ─────────── Umumiy bo'laklar ─────────── */
  const STATUS_KEY = s => "st." + s;

  function tierMinPrice(item) {
    const ps = (item.tiers || []).map(x => Number(x.price) || 0).filter(x => x > 0);
    return ps.length ? Math.min.apply(null, ps) : 0;
  }

  function productCard(item) {
    const badge = (item.tiers || []).find(x => x.badge);
    const title = pick(item.title);
    // Guruh nomi mahsulot nomi bilan bir xil bo'lsa ikki marta yozilmaydi
    const group = item.group && item.group !== title ? item.group : "";
    return `<button class="pcard" data-open-item="${escHtml(item.id)}">
      <span class="pcard__arch"></span>
      ${badge ? `<span class="pcard__badge">${escHtml(badge.badge)}</span>` : ""}
      <span class="pcard__ico">${escHtml(item.icon || "🎁")}</span>
      <div class="pcard__title">${escHtml(title)}</div>
      <div class="pcard__group">${group ? escHtml(group) : "&nbsp;"}</div>
      <div class="pcard__foot">
        <span class="pcard__from">${t("prod.from")}</span>
        <span class="pcard__price">${som(tierMinPrice(item))}</span>
      </div>
    </button>`;
  }

  function categoryList(cat) {
    const items = S.catalog.filter(i => i.category === cat);
    if (!items.length) return `<div class="empty"><div class="empty__ico">🪶</div><div class="empty__t">${t("cat.empty")}</div></div>`;
    // Guruh bo'yicha ajratiladi (PUBG Mobile, Telegram Premium...)
    const groups = [];
    items.forEach(i => {
      const g = i.group || "—";
      let bucket = groups.find(x => x.name === g);
      if (!bucket) { bucket = { name: g, items: [] }; groups.push(bucket); }
      bucket.items.push(i);
    });
    return groups.map(g => `
      <div class="section">
        <div class="section__head"><h3 class="section__title">${escHtml(g.name)}</h3></div>
        <div class="grid">${g.items.map(productCard).join("")}</div>
      </div>`).join("");
  }

  function loyaltyChip() {
    const l = S.me && S.me.loyalty;
    if (!l || !l.current) return "";
    return `<span class="hero__tier">🏅 ${escHtml(l.current.name)}${l.current.percent ? " · " + l.current.percent + "%" : ""}</span>`;
  }

  /* ─────────── Ko'rinishlar ─────────── */

  function viewHome() {
    const bal = S.me ? S.me.balance : 0;
    const notice = S.config && pick(S.config.notice);
    const st = S.stats;
    const tgCount = S.catalog.filter(i => i.category === "telegram").length;
    const gCount = S.catalog.filter(i => i.category === "game").length;

    const popular = S.catalog
      .filter(i => (i.tiers || []).some(x => x.badge))
      .slice(0, 6);

    return `
      <section class="hero">
        <div class="hero__label">${t("home.balance")}</div>
        <div class="hero__amount">${money(bal)}<small>${t("common.som")}</small></div>
        ${loyaltyChip()}
        <div class="hero__actions">
          <button class="btn btn--gold" data-act="topup">💳 ${t("home.topup")}</button>
          <button class="btn btn--ghost" data-tab-go="orders">🧾 ${t("home.history")}</button>
        </div>
      </section>

      ${notice ? `<div class="card" style="padding:12px 14px;margin-top:12px;border-left:4px solid var(--gold)">
        <div class="tiny" style="font-weight:600">📢 ${escHtml(notice)}</div></div>` : ""}

      <div class="divider"><span>${t("home.cats")}</span></div>
      <div class="tiles" style="margin-top:12px">
        <button class="tile" data-tab-go="telegram">
          <div class="tile__ico">✈️</div>
          <div class="tile__name">${t("home.tg")}</div>
          <div class="tile__sub">${t("home.tgSub")} · ${tgCount}</div>
        </button>
        <button class="tile" data-tab-go="games">
          <div class="tile__ico">🎮</div>
          <div class="tile__name">${t("home.games")}</div>
          <div class="tile__sub">${t("home.gamesSub")} · ${gCount}</div>
        </button>
      </div>

      ${popular.length ? `
      <div class="section">
        <div class="section__head">
          <h3 class="section__title">${t("home.popular")}</h3>
        </div>
        <div class="grid">${popular.map(productCard).join("")}</div>
      </div>` : ""}

      <div class="divider"><span>${t("home.stats")}</span></div>
      <div class="statgrid">
        <div class="stat"><div class="stat__v">${st ? money(st.users) : "—"}</div><div class="stat__l">${t("home.statUsers")}</div></div>
        <div class="stat"><div class="stat__v">${st ? money(st.orders) : "—"}</div><div class="stat__l">${t("home.statOrders")}</div></div>
        <div class="stat"><div class="stat__v">24/7</div><div class="stat__l">${t("home.trust3")}</div></div>
      </div>

      ${S.reviews.length ? `
      <div class="section">
        <div class="section__head"><h3 class="section__title">${t("home.reviews")}</h3></div>
        <div class="rowlist">
          ${S.reviews.slice(0, 5).map(r => `
            <div class="rowcard">
              <div class="rowcard__ico">${"⭐".repeat(Math.max(1, Math.min(5, r.stars))).slice(0, 2)}</div>
              <div class="rowcard__body">
                <div class="rowcard__title">${escHtml(r.name || "—")} · ${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
                <div class="rowcard__sub">${escHtml(r.text || r.itemTitle || "")}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>` : ""}

      <div class="section center tiny muted" style="padding-bottom:8px">
        🇺🇿 ${escHtml((S.config && S.config.brand) || "Milliy Pin")} · ${escHtml((S.config && S.config.workHours) || "")}
      </div>`;
  }

  const viewTelegram = () => `<div class="section" style="margin-top:8px">
      <div class="section__head"><h2 class="section__title">✈️ ${t("cat.tgTitle")}</h2></div>
    </div>${categoryList("telegram")}`;

  const viewGames = () => `<div class="section" style="margin-top:8px">
      <div class="section__head"><h2 class="section__title">🎮 ${t("cat.gamesTitle")}</h2></div>
    </div>${categoryList("game")}`;

  function viewOrders() {
    const orders = (S.me && S.me.orders) || [];
    const pays = (S.me && S.me.payments) || [];
    const dt = ts => new Date(ts).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

    const ordersHtml = orders.length ? orders.map(o => `
      <div class="ocard">
        <div class="ocard__top">
          <span class="ocard__no">#${o.seq} · ${escHtml(o.itemIcon || "")} ${escHtml(o.itemTitle)}</span>
          <span class="pill pill--${escHtml(o.status)}">${t(STATUS_KEY(o.status))}</span>
        </div>
        <div class="ocard__body">
          ${escHtml(o.tierLabel)}${o.qty > 1 ? " × " + o.qty : ""} · <b>${som(o.total)}</b>
          <div class="tiny muted" style="margin-top:4px">→ ${escHtml(o.target)}</div>
        </div>
        <div class="ocard__meta">
          <span>🕘 ${dt(o.ts)}</span>
          ${o.discount ? `<span>🎟 −${som(o.discount)}</span>` : ""}
          ${o.cashback ? `<span>🎁 +${som(o.cashback)}</span>` : ""}
        </div>
        ${o.canReview ? `<div style="margin-top:10px"><button class="btn btn--line btn--wide" data-review="${escHtml(o.id)}">⭐ ${t("orders.review")}</button></div>` : ""}
      </div>`).join("") : `
      <div class="empty">
        <div class="empty__ico">🧾</div>
        <div class="empty__t">${t("orders.empty")}</div>
        <div class="empty__s">${t("orders.emptySub")}</div>
      </div>`;

    const paysHtml = pays.length ? `
      <div class="divider"><span>${t("orders.payments")}</span></div>
      <div class="rowlist" style="margin-top:10px">
        ${pays.map(p => `
          <div class="rowcard">
            <div class="rowcard__ico">💳</div>
            <div class="rowcard__body">
              <div class="rowcard__title">${som(p.amount)}</div>
              <div class="rowcard__sub">${escHtml(p.cardType || "")} · ${dt(p.ts)}</div>
            </div>
            <div class="rowcard__end"><span class="pill pill--${escHtml(p.status)}">${t(STATUS_KEY(p.status))}</span></div>
          </div>`).join("")}
      </div>` : "";

    return `<div class="section" style="margin-top:8px">
        <div class="section__head"><h2 class="section__title">🧾 ${t("orders.title")}</h2></div>
      </div>${ordersHtml}${paysHtml}`;
  }

  function viewProfile() {
    const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    const me = S.me || { balance: 0, spent: 0, orders: [] };
    const c = S.config || {};
    const initial = (u.first_name || "M").trim().charAt(0).toUpperCase();
    const l = me.loyalty;
    const toNext = l && l.next ? Math.max(0, l.next.minSpent - me.spent) : 0;

    return `
      <div class="prof">
        <div class="prof__ava">${escHtml(initial)}</div>
        <div style="min-width:0">
          <div class="prof__name">${escHtml(u.first_name || "Mehmon")} ${escHtml(u.last_name || "")}</div>
          <div class="prof__id">${u.username ? "@" + escHtml(u.username) : "ID " + escHtml(me.id || "—")}</div>
          ${l && l.current ? `<div class="tiny" style="margin-top:5px;color:var(--gold);font-weight:700">🏅 ${escHtml(l.current.name)}</div>` : ""}
        </div>
      </div>

      <div class="statgrid">
        <div class="stat"><div class="stat__v">${money(me.balance)}</div><div class="stat__l">${t("profile.balance")}</div></div>
        <div class="stat"><div class="stat__v">${money(me.spent)}</div><div class="stat__l">${t("profile.spent")}</div></div>
        <div class="stat"><div class="stat__v">${(me.orders || []).length}</div><div class="stat__l">${t("profile.orders")}</div></div>
      </div>

      ${l && l.next ? `<div class="card" style="padding:12px 14px;margin-top:11px">
        <div class="tiny muted">${t("profile.toNext")} <b>${escHtml(l.next.name)}</b> — ${som(toNext)}</div>
        <div style="height:6px;border-radius:6px;background:var(--paper-2);margin-top:8px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100, l.next.minSpent ? Math.round(me.spent / l.next.minSpent * 100) : 0)}%;background:linear-gradient(90deg,var(--gold),var(--teal))"></div>
        </div>
      </div>` : ""}

      <div class="menulist">
        <button class="menuitem" data-act="topup">
          <span class="menuitem__ico">💳</span><span class="menuitem__t">${t("home.topup")}</span><span class="menuitem__v">›</span>
        </button>
        <button class="menuitem" data-act="referral">
          <span class="menuitem__ico">🤝</span><span class="menuitem__t">${t("profile.referral")}</span>
          <span class="menuitem__v">${c.referral && c.referral.enabled ? c.referral.percent + "%" : "—"}</span>
        </button>
        <button class="menuitem" data-act="lang">
          <span class="menuitem__ico">🌐</span><span class="menuitem__t">${t("profile.lang")}</span>
          <span class="menuitem__v">${window.I18N.lang.toUpperCase()}</span>
        </button>
        <button class="menuitem" data-act="theme">
          <span class="menuitem__ico">🎨</span><span class="menuitem__t">${t("profile.theme")}</span>
          <span class="menuitem__v">${document.documentElement.getAttribute("data-theme") === "dark" ? "🌙" : "☀️"}</span>
        </button>
      </div>

      <div class="menulist">
        ${c.support ? `<a class="menuitem" href="https://t.me/${escHtml(c.support)}" target="_blank" rel="noopener">
          <span class="menuitem__ico">🛟</span><span class="menuitem__t">${t("profile.support")}</span><span class="menuitem__v">@${escHtml(c.support)}</span>
        </a>` : ""}
        ${c.channelUrl ? `<a class="menuitem" href="${escHtml(c.channelUrl)}" target="_blank" rel="noopener">
          <span class="menuitem__ico">📣</span><span class="menuitem__t">${t("profile.channel")}</span><span class="menuitem__v">›</span>
        </a>` : ""}
        ${c.reviewsUrl ? `<a class="menuitem" href="${escHtml(c.reviewsUrl)}" target="_blank" rel="noopener">
          <span class="menuitem__ico">⭐</span><span class="menuitem__t">${t("profile.reviews")}</span><span class="menuitem__v">›</span>
        </a>` : ""}
      </div>

      ${me.isAdmin ? `<div class="menulist">
        <button class="menuitem" data-act="admin">
          <span class="menuitem__ico">🛡</span><span class="menuitem__t">${t("profile.admin")}</span><span class="menuitem__v">›</span>
        </button>
      </div>` : ""}

      <div class="section center tiny muted">Milliy Pin · v1.0</div>`;
  }

  /* ─────────── Mahsulot oynasi ─────────── */

  function fieldMeta(field) {
    const map = {
      username: ["field.username", "field.usernamePh"],
      playerId: ["field.playerId", "field.playerIdPh"],
      playerZone: ["field.playerZone", "field.playerZonePh"],
      nickname: ["field.nickname", "field.nicknamePh"],
      link: ["field.link", "field.linkPh"]
    };
    const m = map[field] || map.playerId;
    return { label: t(m[0]), ph: t(m[1]) };
  }

  const OS = { item: null, tierId: "", qty: 1, promo: "", discount: 0 };

  function openProduct(itemId) {
    const item = S.catalog.find(i => i.id === itemId);
    if (!item) return;
    OS.item = item;
    OS.tierId = (item.tiers[0] || {}).id || "";
    OS.qty = 1; OS.promo = ""; OS.discount = 0;
    openSheet(pick(item.title), productSheetHtml());
    bindProductSheet();
  }
  window.mpOpenProduct = openProduct;

  function currentTier() { return (OS.item.tiers || []).find(x => x.id === OS.tierId) || OS.item.tiers[0]; }
  function currentSubtotal() { return (Number(currentTier().price) || 0) * OS.qty; }
  function currentTotal() { return Math.max(0, currentSubtotal() - OS.discount); }

  function productSheetHtml() {
    const item = OS.item;
    const f = fieldMeta(item.field);
    const note = pick(item.note);
    const bal = S.me ? S.me.balance : 0;
    const total = currentTotal();
    const enough = bal >= total;

    return `
      <div style="display:flex;align-items:center;gap:12px">
        <div class="pcard__ico" style="width:52px;height:52px;font-size:26px">${escHtml(item.icon || "🎁")}</div>
        <div>
          <div style="font-weight:800">${escHtml(pick(item.title))}</div>
          <div class="tiny muted">${escHtml(item.group || "")}</div>
        </div>
      </div>

      <div class="field">
        <label class="field__label">${t("prod.choose")}</label>
        <div class="tiers" id="tierBox">
          ${item.tiers.map(x => `
            <button class="tier ${x.id === OS.tierId ? "is-on" : ""}" data-tier="${escHtml(x.id)}">
              ${x.badge ? `<span class="tier__badge">${escHtml(x.badge)}</span>` : ""}
              <div class="tier__label">${escHtml(pick(x.label))}</div>
              <div class="tier__price">${money(x.price)}${x.old ? `<span class="tier__old">${money(x.old)}</span>` : ""}</div>
            </button>`).join("")}
        </div>
      </div>

      <div class="field">
        <label class="field__label">${f.label}</label>
        <input class="input" id="targetInput" placeholder="${escHtml(f.ph)}" autocomplete="off" spellcheck="false">
        ${note ? `<div class="hint">ℹ️ ${escHtml(note)}</div>` : ""}
      </div>

      <div class="field">
        <label class="field__label">${t("prod.promo")}</label>
        <div style="display:flex;gap:8px">
          <input class="input" id="promoInput" placeholder="MILLIY10" autocomplete="off" style="text-transform:uppercase">
          <button class="btn btn--line" id="promoBtn" style="flex:none">${t("prod.promoApply")}</button>
        </div>
        <div id="promoMsg"></div>
      </div>

      <div class="field">
        <label class="field__label">${t("prod.comment")}</label>
        <textarea class="textarea" id="commentInput" placeholder="${escHtml(t("prod.commentPh"))}"></textarea>
      </div>

      <div class="card" style="padding:12px 14px;margin-top:16px">
        <div class="sumrow"><span>${t("prod.subtotal")}</span><b id="sumSub">${som(currentSubtotal())}</b></div>
        <div class="sumrow" id="sumDiscRow" ${OS.discount ? "" : 'style="display:none"'}>
          <span>${t("prod.discount")}</span><b id="sumDisc" style="color:var(--green)">−${som(OS.discount)}</b>
        </div>
        <div class="sumrow sumrow--total"><span>${t("prod.total")}</span><b id="sumTotal">${som(total)}</b></div>
      </div>

      <div style="margin-top:14px" id="buyBox">
        ${enough
          ? `<button class="btn btn--gold btn--wide" id="buyBtn">🛒 ${t("prod.buy")}</button>`
          : `<div class="err center">${t("prod.notEnough")} · ${som(total - bal)}</div>
             <button class="btn btn--teal btn--wide" style="margin-top:9px" data-act="topup">💳 ${t("prod.needTopup")}</button>`}
      </div>`;
  }

  function refreshSums() {
    const bal = S.me ? S.me.balance : 0;
    const total = currentTotal();
    el("sumSub").textContent = som(currentSubtotal());
    el("sumTotal").textContent = som(total);
    const dr = el("sumDiscRow");
    if (OS.discount > 0) { dr.style.display = ""; el("sumDisc").textContent = "−" + som(OS.discount); }
    else dr.style.display = "none";

    const box = el("buyBox");
    box.innerHTML = bal >= total
      ? `<button class="btn btn--gold btn--wide" id="buyBtn">🛒 ${t("prod.buy")}</button>`
      : `<div class="err center">${t("prod.notEnough")} · ${som(total - bal)}</div>
         <button class="btn btn--teal btn--wide" style="margin-top:9px" data-act="topup">💳 ${t("prod.needTopup")}</button>`;
    const bb = el("buyBtn");
    if (bb) bb.onclick = submitOrder;
  }

  function bindProductSheet() {
    el("tierBox").addEventListener("click", e => {
      const b = e.target.closest("[data-tier]");
      if (!b) return;
      OS.tierId = b.getAttribute("data-tier");
      OS.discount = 0; OS.promo = "";
      el("promoMsg").innerHTML = "";
      [...el("tierBox").children].forEach(c => c.classList.toggle("is-on", c === b));
      haptic();
      refreshSums();
    });

    el("promoBtn").onclick = async () => {
      const code = el("promoInput").value.trim().toUpperCase();
      const msg = el("promoMsg");
      if (!code) { OS.promo = ""; OS.discount = 0; msg.innerHTML = ""; return refreshSums(); }
      try {
        const r = await api("/api/promo/check", { body: { code, subtotal: currentSubtotal() } });
        OS.promo = code; OS.discount = r.discount || 0;
        msg.innerHTML = `<div class="hint" style="color:var(--green);font-weight:700">✅ −${som(OS.discount)}</div>`;
        haptic("ok");
      } catch (e) {
        OS.promo = ""; OS.discount = 0;
        msg.innerHTML = `<div class="err">${escHtml(apiErrText(e))}</div>`;
        haptic("err");
      }
      refreshSums();
    };

    const bb = el("buyBtn");
    if (bb) bb.onclick = submitOrder;
  }

  async function submitOrder() {
    const target = el("targetInput").value.trim();
    if (target.length < 2) { toast(t("err.target"), "err"); el("targetInput").focus(); return; }
    const btn = el("buyBtn");
    if (btn) { btn.disabled = true; btn.textContent = t("common.loading"); }
    try {
      const r = await api("/api/order", {
        body: {
          itemId: OS.item.id, tierId: OS.tierId, qty: OS.qty,
          target, comment: el("commentInput").value.trim(), promo: OS.promo
        }
      });
      closeSheet();
      toast(t("ok.ordered"), "ok");
      await loadMe();
      go("orders");
      if (tg && tg.showPopup) {
        try {
          tg.showPopup({
            title: t("ok.ordered"),
            message: "#" + r.order.seq + " · " + pick(OS.item.title) + "\n" + som(r.order.total),
            buttons: [{ type: "ok" }]
          });
        } catch (e) {}
      }
    } catch (e) {
      toast(apiErrText(e), "err");
      if (btn) { btn.disabled = false; btn.textContent = "🛒 " + t("prod.buy"); }
    }
  }

  /* ─────────── Balansni to'ldirish ─────────── */

  const TS = { amount: 0, cardId: "" };

  function openTopup() {
    const c = S.config || {};
    const cards = c.cards || [];
    if (!cards.length) { toast("—", "err"); return; }
    TS.amount = 50000;
    TS.cardId = cards[0].id;
    const presets = [20000, 50000, 100000, 200000, 500000, 1000000];

    openSheet("💳 " + t("topup.title"), `
      <div class="field" style="margin-top:2px">
        <label class="field__label">${t("topup.amount")}</label>
        <div class="amounts" id="presetBox">
          ${presets.map(v => `<button data-amount="${v}" class="${v === TS.amount ? "is-on" : ""}">${money(v)}</button>`).join("")}
        </div>
        <input class="input" id="amountInput" inputmode="numeric" style="margin-top:9px"
               placeholder="${escHtml(t("topup.amountPh"))}" value="${TS.amount}">
        <div class="hint">${t("topup.min")}: ${som(c.minTopup || 5000)}</div>
      </div>

      <div class="field">
        <label class="field__label">${t("topup.card")}</label>
        <div class="rowlist" id="cardBox">
          ${cards.map(cd => `
            <button class="rowcard" data-card="${escHtml(cd.id)}" style="${cd.id === TS.cardId ? "border-color:var(--gold);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 22%,transparent)" : ""}">
              <div class="rowcard__ico">${cd.type === "UZCARD" ? "🟩" : "🟦"}</div>
              <div class="rowcard__body">
                <div class="rowcard__title">${escHtml(cd.type)}</div>
                <div class="rowcard__sub">${escHtml(cd.number)}</div>
              </div>
            </button>`).join("")}
        </div>
      </div>

      <div class="hint" style="margin-top:12px">🔒 ${t("topup.rules")}</div>
      <button class="btn btn--gold btn--wide" id="topupNext" style="margin-top:14px">${t("topup.next")} →</button>
    `);

    el("presetBox").addEventListener("click", e => {
      const b = e.target.closest("[data-amount]");
      if (!b) return;
      TS.amount = Number(b.getAttribute("data-amount"));
      el("amountInput").value = TS.amount;
      [...el("presetBox").children].forEach(c2 => c2.classList.toggle("is-on", c2 === b));
      haptic();
    });
    el("amountInput").addEventListener("input", e => {
      const v = e.target.value.replace(/\D/g, "");
      e.target.value = v;
      TS.amount = Number(v) || 0;
      [...el("presetBox").children].forEach(c2 => c2.classList.remove("is-on"));
    });
    el("cardBox").addEventListener("click", e => {
      const b = e.target.closest("[data-card]");
      if (!b) return;
      TS.cardId = b.getAttribute("data-card");
      [...el("cardBox").children].forEach(c2 => {
        c2.style.borderColor = c2 === b ? "var(--gold)" : "";
        c2.style.boxShadow = c2 === b ? "0 0 0 2px color-mix(in srgb,var(--gold) 22%,transparent)" : "";
      });
      haptic();
    });
    el("topupNext").onclick = async () => {
      const min = (S.config && S.config.minTopup) || 5000;
      if (TS.amount < min) { toast(t("err.min_topup"), "err"); return; }
      const b = el("topupNext");
      b.disabled = true; b.textContent = t("common.loading");
      try {
        const p = await api("/api/topup", { body: { amount: TS.amount, cardId: TS.cardId } });
        S.pendingPayment = p;
        showPaymentWait(p);
      } catch (e) {
        toast(apiErrText(e), "err");
        b.disabled = false; b.textContent = t("topup.next") + " →";
      }
    };
  }
  window.mpOpenTopup = openTopup;

  function showPaymentWait(p) {
    openSheet("💳 " + t("topup.title"), `
      <div class="paycard">
        <button class="chip paycard__copy" data-copy="${escHtml(String(p.cardNumber).replace(/\s/g, ""))}">📋</button>
        <div class="paycard__type">${escHtml(p.cardType)}</div>
        <div class="paycard__num">${escHtml(p.cardNumber)}</div>
        <div class="paycard__holder">${escHtml(p.cardHolder || "")}</div>
      </div>

      <div class="bigamount">
        <div class="bigamount__v" data-copy="${p.amount}">${money(p.amount)} ${t("common.som")}</div>
        <div class="bigamount__l">${t("topup.exact")}</div>
      </div>
      <div class="hint">⚠️ ${t("topup.exactHint")}</div>

      <div class="center" style="margin-top:14px">
        <span class="timer">⏳ <span id="topupTimer">--:--</span></span>
        <div class="tiny muted" style="margin-top:3px">${t("topup.left")}</div>
      </div>

      <button class="btn btn--gold btn--wide" id="paidBtn" style="margin-top:16px">${t("topup.paid")}</button>
      <button class="btn btn--line btn--wide" id="cancelPayBtn" style="margin-top:9px">${t("topup.cancel")}</button>
    `, () => { S.pendingPayment = null; });

    el("sheetBody").addEventListener("click", e => {
      const c = e.target.closest("[data-copy]");
      if (c) copy(c.getAttribute("data-copy"));
    });

    clearInterval(S.timerId);
    const tick = () => {
      const left = Math.max(0, (p.expiresAt || 0) - Date.now());
      const node = el("topupTimer");
      if (!node) return clearInterval(S.timerId);
      const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
      node.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      if (left <= 0) { clearInterval(S.timerId); closeSheet(); toast(t("st.expired"), "err"); loadMe(); }
    };
    tick();
    S.timerId = setInterval(tick, 1000);

    el("paidBtn").onclick = async () => {
      const b = el("paidBtn");
      b.disabled = true; b.textContent = t("common.loading");
      try {
        await api("/api/topup/paid", { body: { id: p.id } });
        clearInterval(S.timerId);
        el("sheetBody").innerHTML = `
          <div class="empty">
            <div class="empty__ico">⏳</div>
            <div class="empty__t">${t("topup.waiting")}</div>
            <div class="empty__s">${som(p.amount)}</div>
          </div>
          <button class="btn btn--gold btn--wide" data-close>${t("common.close")}</button>`;
        haptic("ok");
        loadMe();
      } catch (e) {
        toast(apiErrText(e), "err");
        b.disabled = false; b.textContent = t("topup.paid");
      }
    };
    el("cancelPayBtn").onclick = async () => {
      try { await api("/api/topup/cancel", { body: { id: p.id } }); } catch (e) {}
      closeSheet(); loadMe();
    };
  }

  /* ─────────── Referal ─────────── */

  async function openReferral() {
    openSheet("🤝 " + t("ref.title"), `<div class="skel"></div>`);
    let r;
    try { r = await api("/api/referral"); }
    catch (e) { el("sheetBody").innerHTML = `<div class="err">${escHtml(apiErrText(e))}</div>`; return; }

    if (!r.enabled) { el("sheetBody").innerHTML = `<div class="empty"><div class="empty__ico">😴</div><div class="empty__t">${t("ref.off")}</div></div>`; return; }
    const bot = (S.config && S.config.botUsername) || "";
    const link = bot
      ? "https://t.me/" + bot + "?startapp=ref" + r.code
      : location.origin + "/?ref=" + r.code;

    el("sheetBody").innerHTML = `
      <div class="card" style="padding:14px;background:linear-gradient(140deg,var(--gold-3),var(--surface))">
        <div style="font-weight:700">${t("ref.desc", { p: r.percent })}</div>
      </div>
      <div class="statgrid">
        <div class="stat"><div class="stat__v">${r.invited}</div><div class="stat__l">${t("ref.invited")}</div></div>
        <div class="stat"><div class="stat__v">${r.invitedActive}</div><div class="stat__l">${t("ref.active")}</div></div>
        <div class="stat"><div class="stat__v">${money(r.earned)}</div><div class="stat__l">${t("ref.earned")}</div></div>
      </div>
      <div class="field">
        <label class="field__label">${t("ref.link")}</label>
        <input class="input" id="refLink" readonly value="${escHtml(link)}">
      </div>
      <button class="btn btn--gold btn--wide" id="refCopy" style="margin-top:10px">📋 ${t("ref.copy")}</button>
      <button class="btn btn--line btn--wide" id="refShare" style="margin-top:9px">📤 ${t("ref.share")}</button>`;

    el("refCopy").onclick = () => copy(link);
    el("refShare").onclick = () => {
      const text = encodeURIComponent("🇺🇿 Milliy Pin — Telegram va o'yin donatlari eng qulay narxda!");
      const u = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + text;
      if (tg && tg.openTelegramLink) tg.openTelegramLink(u); else window.open(u, "_blank");
    };
  }

  /* ─────────── Sharh ─────────── */

  function openReview(orderId) {
    let stars = 5;
    openSheet("⭐ " + t("orders.reviewTitle"), `
      <div class="center" id="starBox" style="font-size:34px;letter-spacing:6px;margin:6px 0 2px">
        ${[1, 2, 3, 4, 5].map(i => `<span data-star="${i}" style="cursor:pointer">★</span>`).join("")}
      </div>
      <div class="field">
        <label class="field__label">${t("orders.reviewText")}</label>
        <textarea class="textarea" id="revText" maxlength="300"></textarea>
      </div>
      <button class="btn btn--gold btn--wide" id="revSend" style="margin-top:12px">${t("orders.send")}</button>`);

    const paint = () => [...el("starBox").children].forEach((n, i) => {
      n.textContent = i < stars ? "★" : "☆";
      n.style.color = i < stars ? "var(--gold)" : "var(--ink-3)";
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
      } catch (e) { toast(apiErrText(e), "err"); }
    };
  }

  /* ─────────── Navigatsiya va render ─────────── */

  const VIEWS = { home: viewHome, telegram: viewTelegram, games: viewGames, orders: viewOrders, profile: viewProfile };

  function render() {
    el("view").innerHTML = (VIEWS[S.tab] || viewHome)();
    el("balanceValue").textContent = money(S.me ? S.me.balance : 0);
    [...el("tabbar").children].forEach(b => b.classList.toggle("is-active", b.getAttribute("data-tab") === S.tab));
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  window.mpRender = render;

  function go(tab) {
    if (!VIEWS[tab]) return;
    S.tab = tab;
    render();
    haptic();
  }
  window.mpGo = go;

  document.addEventListener("click", e => {
    const tab = e.target.closest("[data-tab]");
    if (tab && tab.parentElement && tab.parentElement.id === "tabbar") return go(tab.getAttribute("data-tab"));

    const goTab = e.target.closest("[data-tab-go]");
    if (goTab) return go(goTab.getAttribute("data-tab-go"));

    const openItem = e.target.closest("[data-open-item]");
    if (openItem) return openProduct(openItem.getAttribute("data-open-item"));

    const rev = e.target.closest("[data-review]");
    if (rev) return openReview(rev.getAttribute("data-review"));

    const act = e.target.closest("[data-act]");
    if (act) {
      const a = act.getAttribute("data-act");
      if (a === "topup") return openTopup();
      if (a === "referral") return openReferral();
      if (a === "admin") return window.mpOpenAdmin && window.mpOpenAdmin();
      if (a === "lang") {
        const langs = window.I18N.langs;
        window.I18N.set(langs[(langs.indexOf(window.I18N.lang) + 1) % langs.length]);
        return render();
      }
      if (a === "theme") {
        applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
        return render();
      }
    }
  });

  el("langBtn").onclick = () => {
    const langs = window.I18N.langs;
    window.I18N.set(langs[(langs.indexOf(window.I18N.lang) + 1) % langs.length]);
    el("langBtn").textContent = window.I18N.lang.toUpperCase();
    render();
  };
  el("themeBtn").onclick = () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    render();
  };
  el("balanceChip").onclick = () => openTopup();

  /* ─────────── Ma'lumot yuklash ─────────── */

  async function loadMe() {
    try { S.me = await api("/api/me"); }
    catch (e) {
      if (e.code === "auth" || e.code === "expired") S.me = null;
      return;
    }
    el("balanceValue").textContent = money(S.me.balance);
    // Yakunlanmagan to'lov bo'lsa — foydalanuvchi ilovaga qaytganda darhol ko'rsatiladi
    const open = (S.me.payments || []).find(p => p.status === "pending" && p.expiresAt > Date.now() && !p.claimedAt);
    if (open && !S.pendingPayment && el("sheet").hidden) {
      S.pendingPayment = open;
      showPaymentWait(open);
    }
  }
  async function loadCatalog() { try { S.catalog = await api("/api/catalog") || []; } catch (e) {} }
  async function loadConfig() { try { S.config = await api("/api/config"); } catch (e) {} }
  async function loadReviews() { try { S.reviews = await api("/api/reviews") || []; } catch (e) {} }
  async function loadStats() { try { S.stats = await api("/api/stats"); } catch (e) {} }

  async function boot() {
    initTheme();
    el("langBtn").textContent = window.I18N.lang.toUpperCase();
    document.documentElement.lang = window.I18N.lang;

    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor("#0E2A47");
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        if (tg.BackButton) tg.BackButton.onClick(closeSheet);
        const b = tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
        let saved = null;
        try { saved = localStorage.getItem("mp_lang"); } catch (e) {}
        if (!saved && b && b.startsWith("ru")) window.I18N.set("ru");
      } catch (e) {}
    }

    await Promise.all([loadConfig(), loadCatalog(), loadMe(), loadReviews(), loadStats()]);

    if (!tg || !tg.initData) {
      // Brauzerda ochilgan — katalogni ko'rsatamiz, lekin xarid qilinmaydi
      toast(t("err.auth"), "err");
    }

    S.ready = true;
    render();
    el("app").hidden = false;
    setTimeout(() => {
      el("splash").classList.add("is-gone");
      setTimeout(() => { el("splash").style.display = "none"; }, 500);
    }, 550);

    // Fon yangilanishi: ilova ochiq turganda balans/buyurtma holati yangilanib boradi
    setInterval(() => {
      if (document.hidden) return;
      loadMe().then(() => { if (S.tab === "orders" || S.tab === "home" || S.tab === "profile") render(); });
    }, 25000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) loadMe().then(render); });
  }

  boot();
})();
