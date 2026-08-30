# 🇺🇿 Milliy Pin — Telegram Mini App

**Telegram xizmatlari va o'yin donatlari** uchun donat platformasi. O'zbek milliy uslubidagi
interfeys (Registon ko'ki, zar naqshlar, girih ornamenti), ikki til (UZ / RU), kunduzgi va
tungi rejim.

Ilova ichida faqat ikki yo'nalish bor va boshqa hech nima yo'q:

| Bo'lim | Nimalar bor |
|---|---|
| ✈️ **Telegram xizmatlari** | Telegram Premium (3/6/12 oy), Telegram Stars, Premium sovg'alar, kanal obunachilari, post ko'rishlari, reaksiyalar |
| 🎮 **O'yin donatlari** | PUBG Mobile UC, Free Fire olmoslari, Mobile Legends olmoslari, Standoff 2 Gold, Brawl Stars Gems, Roblox Robux, CODM CP, Clash of Clans Gems, Genshin Impact Crystals |

---

## Nimalar ishlaydi

**Mijoz uchun**
- Balans (serverda saqlanadi, har Telegram ID uchun alohida)
- HUMO / UZCARD orqali to'ldirish — har bir to'lovga **betakror summa** beriladi
  (masalan 100 000 → 100 137), shu bilan bank SMS'idan to'lov xatosiz tanib olinadi
- Paket tanlash, promokod, izoh, mahsulotga mos ma'lumot maydoni
  (@username / Player ID / ID+Zone / nik / havola)
- Buyurtmalar tarixi va bajarilgan buyurtmani ⭐ baholash
- Referal dastur — do'st har xarid qilganda foiz balansga tushadi
- Sodiqlik darajalari (Chinnigul → Zargar → Amir → Sohibqiron) va avtomatik keshbek
- Buyurtma holati o'zgarganda botdan xabar keladi

**Admin uchun** (Profil → 🛡 Admin panel; faqat `ADMIN_IDS` ro'yxatidagilar ko'radi)
- 📊 Umumiy: kunlik / haftalik / umumiy tushum, ochiq buyurtmalar, eng ko'p sotilganlar, CSV hisobot
- 🧾 Buyurtmalar: holat bo'yicha filtr, "Olindi / Bajarildi / Bekor" (bekor qilinsa pul avtomatik qaytadi)
- 💳 To'lovlar: kutayotgan to'lovni tasdiqlash yoki rad etish
- 👥 Mijozlar: qidiruv, balansga qo'lda +/−, bloklash
- 📦 Katalog: mahsulot va paketlarni qo'shish/tahrirlash/tartiblash → **Nashr qilish**
- 🎟 Promokodlar: foiz yoki so'mda, limit va min. buyurtma bilan
- ⚙️ Sozlamalar: kartalar, kanallar (chat_id), referal foizi, sodiqlik darajalari, e'lon matni
- 📢 Tarqatma: barcha foydalanuvchilarga xabar

---

## Ishga tushirish

Talab: **Node.js 22.5+** (ichki `node:sqlite` moduli uchun). Tashqi kutubxona **yo'q**.

```bash
BOT_TOKEN=123456:AA...  ADMIN_IDS=5606872249  node server.js
# http://localhost:3000
```

### Railway / Render'ga deploy

1. Repozitoriyni GitHub'ga yuklang.
2. **Railway → New Project → Deploy from GitHub repo** → shu repo. `npm start` avtomatik ishga tushadi.
3. **Variables** bo'limiga quyidagilarni qo'shing (pastdagi jadval).
4. **Settings → Networking → Generate Domain** → `xxx.up.railway.app` havolasini oling.
5. Tavsiya: **Add Volume**, mount path `/data` — shunda baza qayta deploy'da saqlanib qoladi.
   Volume bo'lmasa, ma'lumot loyiha ichidagi `./data` papkaga yoziladi va deploy'da yo'qoladi.

### Muhit o'zgaruvchilari

| O'zgaruvchi | Majburiy | Nima uchun |
|---|---|---|
| `BOT_TOKEN` | ✅ | @BotFather bergan token. Bo'lmasa initData imzosi tekshirilmaydi va API yopiq turadi. |
| `ADMIN_IDS` | ✅ | Vergul bilan ajratilgan Telegram ID'lar — faqat shular admin panelni ochadi. |
| `PORT` | — | Standart 3000 (Railway o'zi beradi). |
| `DATA_DIR` | — | Baza papkasi. Standart `/data`, yozib bo'lmasa `./data`. |
| `TG_WEBHOOK_SECRET` | — | `setWebhook` dagi `secret_token` bilan bir xil bo'lsin — begona so'rovlarni to'sadi. |
| `SUPPORT_USERNAME` | — | Boshlang'ich support username (keyin admin paneldan o'zgartiriladi). |
| `ORDER_CHAT_ID` / `TOPUP_CHAT_ID` | — | Kanallarning boshlang'ich qiymati (keyin admin panel ustun turadi). |

### BotFather sozlamalari

1. `/mybots` → botingiz → **Bot Settings → Menu Button** → havola: sizning domeningiz.
2. `/mybots` → **Configure Mini App** → o'sha havola.
3. Bot xabarlari va `/start` ishlashi uchun webhook o'rnating:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domen>/tg/webhook&secret_token=<TG_WEBHOOK_SECRET>"
```

---

## To'lov oqimi

```
Mijoz: summa + karta → "Davom etish"
   ↓  server betakror summa beradi (100 000 → 100 137) va 15 daqiqalik taymer qo'yadi
Mijoz: aynan shu summani o'tkazadi → "✅ To'lov qildim"
   ↓  to'lovlar kanaliga xabar ketadi
Admin: bank SMS'ini tekshirib "✅ Tasdiqlash"  →  balansga ASOSIY summa tushadi
```

**Avtomatik tasdiqlash.** To'lovlar kanaliga (`⚙️ Sozlamalar → 💳 To'lovlar`) `humocard` yoki
`cardxabar` kabi bank botini qo'shsangiz va webhook ishlab tursa, server o'sha xabardan
summani o'qib, aynan shu summani kutayotgan to'lovni **o'zi tasdiqlaydi** — admin aralashuvi
kerak bo'lmaydi. Summa mos kelmasa, to'lov qo'lda tasdiqlash uchun kutib turadi.

Muddati o'tgan to'lovlar har daqiqada avtomatik `expired` ga o'tadi.

---

## Loyiha tuzilishi

```
server.js        HTTP server, API, Telegram Bot API va webhook  (tashqi kutubxonasiz)
db.js            SQLite qatlami (node:sqlite) — mahsulot, buyurtma, to'lov, mijoz, promokod
seed.js          Birinchi ishga tushishdagi standart katalog
public/
  index.html     Ilova karkasi (splash, sarlavha, tablar, sheet)
  styles.css     Milliy uslub: rang tokenlari, ornament, kunduz/tun rejimi
  i18n.js        UZ / RU matnlar
  app.js         Mijoz mantiqi: ko'rinishlar, buyurtma, to'ldirish, referal, sharh
  admin.js       Admin panel (8 bo'lim)
test/run.js      38 ta integratsion test — npm test
```

Ma'lumot bazasi: `$DATA_DIR/milliypin.db` (WAL rejimi). Har bir jadval
`id + indekslanadigan ustunlar + data(JSON)` ko'rinishida — shu sabab sxema kengayganda
migratsiya yozish shart emas, lekin ro'yxatlash SQL indekslari orqali tez ishlaydi.

## Testlar

```bash
npm test
```

Test serverni vaqtinchalik papka bilan ko'taradi, sinov `BOT_TOKEN` orqali haqiqiy
`initData` imzosini yasaydi va quyidagilarni tekshiradi: imzo tekshiruvi (buzilgan va eskirgan
imzolar rad etilishi), SMS summasini o'qish, ruxsatlar (oddiy foydalanuvchi admin API'ga
kira olmasligi), to'liq to'lov oqimi, buyurtma va pul qaytarish, promokod limitlari, sharhlar,
katalogni nashr qilish, sozlamalar va sodiqlik darajalari.

## Xavfsizlik

- Har bir so'rov `X-Init-Data` sarlavhasidagi Telegram imzosi bilan tekshiriladi
  (HMAC-SHA256, doimiy vaqtli solishtirish); 12 soatdan eski `auth_date` rad etiladi.
- Admin huquqi faqat serverdagi `ADMIN_IDS` bilan aniqlanadi — panelni "ochish" hech narsa bermaydi,
  har bir admin so'rovi qaytadan tekshiriladi.
- Balans faqat serverda o'zgaradi; mijoz jo'natgan narx yoki chegirma qabul qilinmaydi —
  hammasi katalogdan va promokod jadvalidan qayta hisoblanadi.
- Webhook `secret_token` bilan himoyalanadi.

## Keyingi bosqich

Click / Payme merchant integratsiyasi, Telegram Stars orqali to'lov, xizmatlarni avtomatik
yetkazish uchun tashqi API'lar (SMM panel, Fragment), buyurtmalar bo'yicha kengaytirilgan filtr.
