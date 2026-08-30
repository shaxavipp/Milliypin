// seed.js — birinchi ishga tushishda katalog bo'sh bo'lsa qo'yiladigan standart mahsulotlar.
// Faqat ikki yo'nalish: Telegram xizmatlari va o'yin donatlari.
//
// `field` — mijozdan so'raladigan ma'lumot turi:
//   username  → @foydalanuvchi nomi (Telegram xizmatlari)
//   playerId  → o'yin ID raqami
//   playerZone→ o'yin ID + server/zona (Mobile Legends kabi)
//   nickname  → o'yindagi nik (Standoff/Roblox)
//   link      → post/kanal havolasi (nakrutka)
"use strict";

const G = (id, group, icon, title, field, note, tiers) => ({
  id, category: "game", group, icon, title, field, note,
  active: true, tiers
});
const T = (id, group, icon, title, field, note, tiers) => ({
  id, category: "telegram", group, icon, title, field, note,
  active: true, tiers
});
// tier: { id, label, price (so'm), old (chizilgan narx, ixtiyoriy), badge, qty }

const CATALOG = [
  /* ---------------- Telegram xizmatlari ---------------- */
  T("tg-premium", "Telegram Premium", "crown", { uz: "Telegram Premium", ru: "Telegram Premium" }, "username",
    { uz: "Rasmiy obuna. @username to'g'ri yozilganiga ishonch hosil qiling.",
      ru: "Официальная подписка. Проверьте правильность @username." },
    [
      { id: "p3",  label: { uz: "3 oy",  ru: "3 месяца" },  price: 139000, old: 155000, badge: "" },
      { id: "p6",  label: { uz: "6 oy",  ru: "6 месяцев" }, price: 229000, old: 260000, badge: "TOP" },
      { id: "p12", label: { uz: "12 oy", ru: "12 месяцев" }, price: 389000, old: 450000, badge: "-14%" }
    ]),

  T("tg-stars", "Telegram Stars", "star4", { uz: "Telegram Stars", ru: "Telegram Stars" }, "username",
    { uz: "Yulduzlar 5-15 daqiqada hisobingizga tushadi.",
      ru: "Звёзды зачисляются в течение 5-15 минут." },
    [
      { id: "s50",   label: { uz: "50 yulduz", ru: "50 звёзд" },   price: 14000,  qty: 50 },
      { id: "s100",  label: { uz: "100 yulduz", ru: "100 звёзд" },  price: 26000,  qty: 100, badge: "TOP" },
      { id: "s250",  label: { uz: "250 yulduz", ru: "250 звёзд" },  price: 62000,  qty: 250 },
      { id: "s500",  label: { uz: "500 yulduz", ru: "500 звёзд" },  price: 119000, qty: 500 },
      { id: "s1000", label: { uz: "1000 yulduz", ru: "1000 звёзд" }, price: 232000, old: 250000, qty: 1000 }
    ]),

  T("tg-gift", "Telegram sovg'alari", "gift", { uz: "Premium sovg'alar", ru: "Премиум подарки" }, "username",
    { uz: "Sovg'a to'g'ridan-to'g'ri profilingizga yuboriladi.",
      ru: "Подарок отправляется прямо в ваш профиль." },
    [
      { id: "g15",  label: { uz: "Ayiqcha · 15 yulduz", ru: "Мишка · 15 звёзд" },   price: 6000 },
      { id: "g25",  label: { uz: "Yurak · 25 yulduz", ru: "Сердце · 25 звёзд" },    price: 9500 },
      { id: "g50",  label: { uz: "Guldasta · 50 yulduz", ru: "Букет · 50 звёзд" },  price: 18000, badge: "TOP" },
      { id: "g100", label: { uz: "Tort · 100 yulduz", ru: "Торт · 100 звёзд" },     price: 34000 }
    ]),

  T("tg-members", "Kanal xizmatlari", "megaphone", { uz: "Kanal obunachilari", ru: "Подписчики канала" }, "link",
    { uz: "Kanal ochiq bo'lishi shart. Havolani to'liq yuboring.",
      ru: "Канал должен быть открытым. Отправьте полную ссылку." },
    [
      { id: "m100",  label: { uz: "100 obunachi", ru: "100 подписчиков" },   price: 21000 },
      { id: "m500",  label: { uz: "500 obunachi", ru: "500 подписчиков" },   price: 95000, badge: "TOP" },
      { id: "m1000", label: { uz: "1000 obunachi", ru: "1000 подписчиков" }, price: 178000 }
    ]),

  T("tg-views", "Kanal xizmatlari", "eye", { uz: "Post ko'rishlari", ru: "Просмотры поста" }, "link",
    { uz: "Postning to'g'ridan-to'g'ri havolasini yuboring.",
      ru: "Отправьте прямую ссылку на пост." },
    [
      { id: "v1k",  label: { uz: "1 000 ko'rish", ru: "1 000 просмотров" },  price: 9000 },
      { id: "v5k",  label: { uz: "5 000 ko'rish", ru: "5 000 просмотров" },  price: 34000, badge: "TOP" },
      { id: "v10k", label: { uz: "10 000 ko'rish", ru: "10 000 просмотров" }, price: 61000 }
    ]),

  T("tg-reactions", "Kanal xizmatlari", "heart", { uz: "Reaksiyalar", ru: "Реакции" }, "link",
    { uz: "Post havolasi + kerakli reaksiya emojisini izohda yozing.",
      ru: "Ссылка на пост + нужный эмодзи укажите в комментарии." },
    [
      { id: "r100", label: { uz: "100 reaksiya", ru: "100 реакций" }, price: 12000 },
      { id: "r500", label: { uz: "500 reaksiya", ru: "500 реакций" }, price: 48000 }
    ]),

  /* ---------------- O'yin donatlari ---------------- */
  G("pubg", "PUBG Mobile", "target", { uz: "PUBG Mobile UC", ru: "PUBG Mobile UC" }, "playerId",
    { uz: "Player ID ni o'yin profilidan nusxalang (raqamlar).",
      ru: "Скопируйте Player ID из профиля игры (цифры)." },
    [
      { id: "uc60",   label: { uz: "60 UC", ru: "60 UC" },     price: 14500,  qty: 60 },
      { id: "uc325",  label: { uz: "325 UC", ru: "325 UC" },   price: 69000,  qty: 325, badge: "TOP" },
      { id: "uc660",  label: { uz: "660 UC", ru: "660 UC" },   price: 136000, qty: 660 },
      { id: "uc1800", label: { uz: "1800 UC", ru: "1800 UC" }, price: 335000, old: 360000, qty: 1800 },
      { id: "uc3850", label: { uz: "3850 UC", ru: "3850 UC" }, price: 668000, qty: 3850 }
    ]),

  G("freefire", "Free Fire", "flame", { uz: "Free Fire Olmos", ru: "Free Fire Алмазы" }, "playerId",
    { uz: "Free Fire ID raqamingizni kiriting.", ru: "Введите ваш Free Fire ID." },
    [
      { id: "d100", label: { uz: "100 olmos", ru: "100 алмазов" }, price: 16000, qty: 100 },
      { id: "d310", label: { uz: "310 olmos", ru: "310 алмазов" }, price: 46000, qty: 310, badge: "TOP" },
      { id: "d520", label: { uz: "520 olmos", ru: "520 алмазов" }, price: 76000, qty: 520 },
      { id: "d1060", label: { uz: "1060 olmos", ru: "1060 алмазов" }, price: 150000, qty: 1060 }
    ]),

  G("mlbb", "Mobile Legends", "sword", { uz: "Mobile Legends Olmos", ru: "Mobile Legends Алмазы" }, "playerZone",
    { uz: "ID va Zone ID ni o'yin profilidan oling (masalan 12345678 (1234)).",
      ru: "Возьмите ID и Zone ID из профиля игры (например 12345678 (1234))." },
    [
      { id: "ml86",  label: { uz: "86 olmos", ru: "86 алмазов" },   price: 24000, qty: 86 },
      { id: "ml172", label: { uz: "172 olmos", ru: "172 алмазов" }, price: 46000, qty: 172, badge: "TOP" },
      { id: "ml257", label: { uz: "257 olmos", ru: "257 алмазов" }, price: 68000, qty: 257 },
      { id: "ml706", label: { uz: "706 olmos", ru: "706 алмазов" }, price: 182000, qty: 706 }
    ]),

  G("standoff", "Standoff 2", "coin", { uz: "Standoff 2 Gold", ru: "Standoff 2 Голда" }, "nickname",
    { uz: "O'yindagi nikingizni aniq yozing (katta-kichik harf muhim).",
      ru: "Укажите точный игровой ник (регистр важен)." },
    [
      { id: "so120", label: { uz: "120 Gold", ru: "120 Gold" }, price: 19000, qty: 120 },
      { id: "so350", label: { uz: "350 Gold", ru: "350 Gold" }, price: 52000, qty: 350, badge: "TOP" },
      { id: "so800", label: { uz: "800 Gold", ru: "800 Gold" }, price: 112000, qty: 800 }
    ]),

  G("brawl", "Brawl Stars", "gem", { uz: "Brawl Stars Gems", ru: "Brawl Stars Гемы" }, "nickname",
    { uz: "Supercell ID pochtangiz bilan kirish talab qilinishi mumkin.",
      ru: "Может потребоваться вход через Supercell ID." },
    [
      { id: "bs30",  label: { uz: "30 Gems", ru: "30 Gems" },   price: 26000, qty: 30 },
      { id: "bs80",  label: { uz: "80 Gems", ru: "80 Gems" },   price: 62000, qty: 80, badge: "TOP" },
      { id: "bs170", label: { uz: "170 Gems", ru: "170 Gems" }, price: 124000, qty: 170 }
    ]),

  G("roblox", "Roblox", "box3", { uz: "Roblox Robux", ru: "Roblox Robux" }, "nickname",
    { uz: "Roblox username ingizni yozing (parol so'ralmaydi).",
      ru: "Укажите ваш Roblox username (пароль не требуется)." },
    [
      { id: "rb400",  label: { uz: "400 Robux", ru: "400 Robux" },   price: 68000, qty: 400 },
      { id: "rb800",  label: { uz: "800 Robux", ru: "800 Robux" },   price: 131000, qty: 800, badge: "TOP" },
      { id: "rb1700", label: { uz: "1700 Robux", ru: "1700 Robux" }, price: 268000, qty: 1700 }
    ]),

  G("codm", "Call of Duty Mobile", "helmet", { uz: "CODM CP", ru: "CODM CP" }, "playerId",
    { uz: "Open ID ni o'yin sozlamalaridan nusxalang.",
      ru: "Скопируйте Open ID из настроек игры." },
    [
      { id: "cp80",  label: { uz: "80 CP", ru: "80 CP" },   price: 15000, qty: 80 },
      { id: "cp420", label: { uz: "420 CP", ru: "420 CP" }, price: 71000, qty: 420, badge: "TOP" },
      { id: "cp880", label: { uz: "880 CP", ru: "880 CP" }, price: 141000, qty: 880 }
    ]),

  G("clash", "Clash of Clans", "castle", { uz: "Clash of Clans Gems", ru: "Clash of Clans Гемы" }, "nickname",
    { uz: "Player Tag (#XXXXXX) ni yuboring.", ru: "Отправьте Player Tag (#XXXXXX)." },
    [
      { id: "cc500",  label: { uz: "500 Gems", ru: "500 Gems" },   price: 63000, qty: 500 },
      { id: "cc1200", label: { uz: "1200 Gems", ru: "1200 Gems" }, price: 138000, qty: 1200, badge: "TOP" }
    ]),

  G("genshin", "Genshin Impact", "petal", { uz: "Genshin Genesis Crystals", ru: "Genshin Кристаллы" }, "playerZone",
    { uz: "UID va server (Asia/Europe/America) ni ko'rsating.",
      ru: "Укажите UID и сервер (Asia/Europe/America)." },
    [
      { id: "gi300",  label: { uz: "300 Crystals", ru: "300 Кристаллов" },   price: 62000, qty: 300 },
      { id: "gi980",  label: { uz: "980 Crystals", ru: "980 Кристаллов" },   price: 186000, qty: 980, badge: "TOP" },
      { id: "gi1980", label: { uz: "1980 Crystals", ru: "1980 Кристаллов" }, price: 358000, qty: 1980 }
    ])
];

// Eski o'rnatmalarda mahsulot ikonkasi emoji bo'lgan. Server ishga tushganda shu
// jadval orqali bir marta chizilgan ikonka kalitiga ko'chiriladi (README'dagi
// yangilanish qadamisiz). Ro'yxatda yo'q emoji "gift" ga tushadi.
const ICON_FROM_EMOJI = {
  "\u{1F451}": "crown", "\u2B50": "star4", "\u{1F381}": "gift", "\u{1F4E3}": "megaphone",
  "\u{1F441}": "eye", "\u2764": "heart", "\u{1F52B}": "target", "\u{1F525}": "flame",
  "\u2694": "sword", "\u{1F3AF}": "coin", "\u{1F4A5}": "gem", "\u{1F7E5}": "box3",
  "\u{1FA96}": "helmet", "\u{1F3F0}": "castle", "\u{1F338}": "petal", "\u{1F3AE}": "pad",
  "\u2708": "plane", "\u{1F4B3}": "card"
};
// Chizilgan ikonka kalitlari (icons.js dagi to'plam bilan bir xil bo'lishi shart)
const ICON_KEYS = [
  "crown", "star4", "star", "gift", "megaphone", "eye", "heart", "target", "flame",
  "sword", "coin", "gem", "castle", "helmet", "box3", "petal", "pad", "plane", "card",
  "wallet", "box", "users", "shield", "globe"
];

function normalizeIcon(raw) {
  const v = String(raw || "").trim();
  if (ICON_KEYS.indexOf(v) !== -1) return v;
  // emoji variatsiya belgisi (U+FE0F) olib tashlanadi, keyin jadvaldan qidiriladi
  const bare = v.replace(/\uFE0F/g, "");
  return ICON_FROM_EMOJI[bare] || "gift";
}

module.exports = { CATALOG, ICON_KEYS, normalizeIcon };
