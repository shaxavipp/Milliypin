# Milliy Pin — Telegram Mini App

**Telegram xizmatlari va o'yin donatlari** uchun donat platformasi. Ikki til (UZ / RU),
kunduzgi va tungi rejim.

## Dizayn tizimi

**Tarix va zamon birga.** Asos — zamonaviy tungi interfeys (shisha panellar, suzuvchi
navigatsiya, zich koshin to'ri); ustiga Samarqand me'morchiligining chiziqli qatlami
qo'yilgan. Kunduzgi mavzu — "saman va sopol" (Rishton kulolchiligi).

| Qatlam | Yechim |
|---|---|
| Palitra | Tungi lojuvard osmon `#070C18`, gumbaz feruzasi `#2FA8C4`, zar `#D6A94A`, sopol `#C4664A` |
| Tarixiy belgilar | Go'ri Amir gumbazi (balans kartasi va banner), madrasa ayvoni — takrorlanuvchi sivri yoylar galereyasi (banner poydevori), Registon peshtoqi (navigatsiya va bo'lim sarlavhasi), minora, suzani palagi |
| Plita | Mahsulot rasmi (admin qo'yadi) yoki chizilgan ikonka; hudud yorlig'i (GLOBAL / SNG / AVTO / GIFTS), reyting va chegirma foizi |
| Bezak to'ri | Girih — sakkiz qirrali yulduz + burilgan kvadrat; koshin haoshiyasi (uchburchak-nuqta zanjirasi) sarlavha ostida |
| Ikonkalar | **Emoji yo'q.** 45 dan ortiq ikonka bitta qo'lda chizilgan: 24×24 to'r, 1.6px chiziq (`public/icons.js`) |
| Shrift | `Archivo` — interfeys; `IBM Plex Mono` + `tabular-nums` — barcha raqamlar |
| Geometriya | Karta 12px, yorliq 4px, 3 ustunli to'r, 4px qadamli to'r |
| Logotip | Girih yulduzi ichida gumbaz va "MP" tamg'asi — bitta SVG `<use>` orqali |

## Ilova tuzilishi

Pastki navigatsiya beshta bo'limdan iborat: **Bosh · O'yinlar · To'ldirish · Buyurtma · Profil**.
Telegram xizmatlari alohida tab emas — ular umumiy katalog ichida, o'yinlar bilan bir qatorda
turadi (Telegram Premium, Stars, sovg'alar, kanal xizmatlari).

| Sahifa | Nimalar bor |
|---|---|
| **Bosh** | Salomlashuv, uch tugmali balans kartasi (to'ldirish / promokod / yordam), banner, ommabop xizmatlar to'ri, statistika, Top donaterlar, mijozlar bahosi kartasi |
| **O'yinlar** | Qidiruv, guruh filtrlari, 3 ustunli katalog. Har plitada reyting va chegirma foizi; texnik ishdagi xizmat xiralashadi va sotib olinmaydi |
| **To'ldirish** | Balans, to'lov usullari (UZCARD / HUMO), eng kam summa, "Qanday to'ldirish?" va texnik yordam havolalari |
| **Buyurtma** | Buyurtmalar va to'lovlar tarixi, bajarilganini baholash |
| **Profil** | Statistika, daraja, promokod kiritish va mavjud promokodlar ro'yxati, referal va Top donaterlar kartochkalari, til/mavzu, rangli yordam havolalari, ijtimoiy tarmoqlar, savol-javob akkordeoni, ilova haqida, admin panel |

Mahsulot oynasi: sarlavha kartasi (o'yin nomi + valyuta turi), ID/username maydoni,
paketlar ro'yxati, promokod, izoh, hisob-kitob va yopishqoq "Sotib olish" paneli.

Ilova ichida faqat ikki yo'nalish bor va boshqa hech nima yo'q:

| Yo'nalish | Nimalar bor |
|---|---|
| **Telegram xizmatlari** | Telegram Premium (3/6/12 oy), Telegram Stars, Premium sovg'alar, kanal obunachilari, post ko'rishlari, reaksiyalar |
| **O'yin donatlari** | PUBG Mobile UC, Free Fire olmoslari, Mobile Legends olmoslari, Standoff 2 Gold, Brawl Stars Gems, Roblox Robux, CODM CP, Clash of Clans Gems, Genshin Impact Crystals |

---

## Nimalar ishlaydi

**Mijoz uchun**
- Balans (serverda saqlanadi, har Telegram ID uchun alohida)
- HUMO / UZCARD orqali to'ldirish — har bir to'lovga **betakror summa** beriladi
  (masalan 100 000 → 100 137), shu bilan bank SMS'idan to'lov xatosiz tanib olinadi
- Paket tanlash, promokod, izoh, mahsulotga mos ma'lumot maydoni
  (@username / Player ID / ID+Zone / nik / havola)
- Buyurtmalar tarixi va bajarilgan buyurtmani baholash
- Promokodni profilda saqlash — keyingi buyurtmaga avtomatik qo'llanadi
- Top donaterlar reytingi (ismlar qisqartirilgan, ID ochilmaydi)
- Referal dastur — do'st har xarid qilganda foiz balansga tushadi
- Sodiqlik darajalari (Chinnigul → Zargar → Amir → Sohibqiron) va avtomatik keshbek
- Buyurtma holati o'zgarganda botdan xabar keladi

**Admin uchun** (Profil → Admin panel; faqat `ADMIN_IDS` ro'yxatidagilar ko'radi)
- Umumiy: kunlik / haftalik / umumiy tushum, ochiq buyurtmalar, eng ko'p sotilganlar, CSV hisobot
- Buyurtmalar: holat bo'yicha filtr, "Olindi / Bajarildi / Bekor" (bekor qilinsa pul avtomatik qaytadi)
- To'lovlar: kutayotgan to'lovni tasdiqlash yoki rad etish
- Mijozlar: qidiruv, balansga qo'lda +/−, bloklash
- Katalog: mahsulot va paketlar, muqova rasmi havolasi, hudud yorlig'i, reyting va
  "texnik ish" holati → **Nashr qilish**
- Promokodlar: foiz yoki so'mda, limit va min. buyurtma bilan
- Sozlamalar: kartalar, kanallar (chat_id), referal foizi, sodiqlik darajalari, e'lon matni,
  yordam havolalari, ijtimoiy tarmoqlar, savol-javob va "ilova haqida" matni
- Tarqatma: barcha foydalanuvchilarga xabar

---

## Ishga tushirish — 5 qadam

Talab: **Node.js 22.5+** (ichki `node:sqlite` moduli uchun). Tashqi kutubxona **yo'q**.

### 1-qadam. Bot yaratish

Telegramda **@BotFather** ga kiring:

```
/newbot          → bot nomi va username beriladi
                   javobda TOKEN keladi: 8123456789:AAF...
```

O'zingizning Telegram ID'ingizni bilish uchun **@userinfobot** ga `/start` yozing —
u raqamli ID beradi (masalan `5606872249`). Bu ID admin panelni ochish uchun kerak.

### 2-qadam. Kodni GitHub'ga qo'yish

Repozitoriy allaqachon GitHub'da bo'lsa, shu branchni `main` ga qo'shing yoki
to'g'ridan-to'g'ri shu branchdan deploy qiling.

### 3-qadam. Railway'ga deploy

1. [railway.com](https://railway.com) → **Login with GitHub**.
2. **New Project → Deploy from GitHub repo** → shu repozitoriyni tanlang.
   Railway `package.json` ni ko'rib Node.js ekanini o'zi aniqlaydi va `npm start` ni ishga tushiradi.
3. Service → **Variables** → **New Variable** bo'limida ikkita qiymat qo'shing:

   | Nomi | Qiymati |
   |---|---|
   | `BOT_TOKEN` | BotFather bergan token |
   | `ADMIN_IDS` | Sizning Telegram ID'ingiz (bir nechta bo'lsa vergul bilan) |

4. Service → **Settings → Networking → Generate Domain** →
   `xxxxx.up.railway.app` havolasi chiqadi. Uni brauzerda ochib tekshiring —
   ilova ochilishi kerak (Telegramdan tashqarida "Ilovani Telegram orqali oching" deb yozadi, bu normal).
5. **Muhim:** service → **Add Volume** → mount path `/data`.
   Volume bo'lmasa baza har deploy'da o'chib ketadi (balanslar, buyurtmalar yo'qoladi).

### 4-qadam. Botni ilovaga ulash

@BotFather da:

```
/mybots → botingiz → Bot Settings → Menu Button
          → havola: https://xxxxx.up.railway.app

/mybots → botingiz → Configure Mini App → Enable
          → o'sha havolani qo'ying
```

Keyin `/start` va bank SMS'ini o'qish ishlashi uchun webhook o'rnating —
brauzerda shu manzilni oching (TOKEN va domenni o'zingiznikiga almashtiring):

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://xxxxx.up.railway.app/tg/webhook
```

`{"ok":true}` javobi kelsa — tayyor.

### 5-qadam. Ilovani sozlash

Botni oching → ilovaga kiring → **Profil → Admin panel** (faqat `ADMIN_IDS` dagilarga ko'rinadi):

1. **Sozlamalar** → o'z kartalaringizni kiriting (HUMO / UZCARD raqami va egasi),
   support username va kanal havolasini yozing → **Saqlash**.
2. **Sozlamalar → Kanallar** → buyurtmalar va to'lovlar uchun kanal `chat_id` sini kiriting,
   yonidagi tugma bilan sinov xabari yuboring. Bot o'sha kanalda **admin** bo'lishi shart.
3. **Katalog** → narxlarni o'zgartiring, mahsulotga rasm havolasi va hudud yorlig'ini qo'ying →
   **Nashr qilish** tugmasini bosing (shundagina o'zgarish mijozlarga ko'rinadi).

### Mahalliy kompyuterda sinash

```bash
git clone <repo>
cd Milliypin
BOT_TOKEN=8123456789:AAF... ADMIN_IDS=5606872249 npm start
# http://localhost:3000
```

Telegramsiz brauzerda katalog ko'rinadi, lekin xarid qilib bo'lmaydi —
imzo tekshiruvi Telegram ichida ishlaydi.

### Muhit o'zgaruvchilari

| O'zgaruvchi | Majburiy | Nima uchun |
|---|---|---|
| `BOT_TOKEN` | ha | @BotFather bergan token. Bo'lmasa API yopiq turadi. |
| `ADMIN_IDS` | ha | Vergul bilan ajratilgan Telegram ID'lar — faqat shular admin panelni ochadi. |
| `PORT` | — | Standart 3000 (Railway o'zi beradi). |
| `DATA_DIR` | — | Baza papkasi. Standart `/data`, yozib bo'lmasa `./data`. |
| `TG_WEBHOOK_SECRET` | — | `setWebhook` dagi `secret_token` bilan bir xil bo'lsin — begona so'rovlarni to'sadi. |
| `SUPPORT_USERNAME` | — | Boshlang'ich support username (keyin admin paneldan o'zgartiriladi). |
| `ORDER_CHAT_ID` / `TOPUP_CHAT_ID` | — | Kanallarning boshlang'ich qiymati (keyin admin panel ustun turadi). |

---

## To'lov oqimi

```
Mijoz: summa + karta → "Davom etish"
   ↓  server betakror summa beradi (100 000 → 100 137) va 15 daqiqalik taymer qo'yadi
Mijoz: aynan shu summani o'tkazadi → "To'lov qildim"
   ↓  to'lovlar kanaliga xabar ketadi
Admin: bank SMS'ini tekshirib "Tasdiqlash"  →  balansga ASOSIY summa tushadi
```

**Avtomatik tasdiqlash.** To'lovlar kanaliga (Sozlamalar → To'lovlar kanali) `humocard` yoki
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
  index.html     Ilova karkasi (splash, sarlavha, tablar, sheet) va logotip SVG
  styles.css     Dizayn tizimi: rang tokenlari, naqsh, kunduz/tun rejimi
  icons.js       Qo'lda chizilgan SVG ikonkalar to'plami
  i18n.js        UZ / RU matnlar
  app.js         Mijoz mantiqi: ko'rinishlar, buyurtma, to'ldirish, referal, sharh
  admin.js       Admin panel (8 bo'lim)
test/run.js      41 ta integratsion test — npm test
```

**Yangilashda:** ilgari mahsulot ikonkasi emoji edi. Server ishga tushganda saqlangan
emoji bir marta chizilgan ikonka kalitiga avtomatik ko'chiriladi — qo'lda hech narsa
qilish shart emas (`seed.js` dagi `normalizeIcon`).

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
katalogni nashr qilish, sozlamalar, sodiqlik darajalari, ochiq promokodlar ro'yxati,
Top donaterlar reytingi va texnik ishdagi mahsulotni sotib bo'lmasligi.

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
