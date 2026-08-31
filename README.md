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
| Tarixiy belgilar | Go'ri Amir gumbazi (balans kartasi), Registon peshtoqi (navigatsiya va bo'lim sarlavhasi), minora, suzani palagi, plita ortidagi girih medalyoni |
| Plita | Mahsulot rasmi (admin qo'yadi, kvadrat maydon) yoki naqsh ustidagi chizilgan ikonka va girih medalyoni (4:3); hudud yorlig'i (GLOBAL / SNG / AVTO / GIFTS) va chegirma foizi |
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
| **Bosh** | Salomlashuv, uch tugmali balans kartasi (to'ldirish / promokod / yordam), "Yana buyurtma qilish" tasmasi, ommabop xizmatlar to'ri, statistika, Top donaterlar, mijozlar bahosi kartasi |
| **O'yinlar** | Qidiruv, turkum filtri (Barchasi / Telegram / O'yinlar), 3 ustunli katalog. Chegirma foizi va hudud yorlig'i plitada; texnik ishdagi xizmat xiralashadi va sotib olinmaydi |
| **To'ldirish** | Balans, yakunlanmagan to'lov (bir bosishda kutish oynasiga qaytadi), to'lov usullari (UZCARD / HUMO), eng kam summa, yordam havolalari, oxirgi to'lovlar |
| **Buyurtma** | "Buyurtmalar / To'lovlar" segmenti, qidiruv, holat filtri, ixcham qatorlar; qator bosilsa tafsilot oynasi — yo'l chizig'i, jadval, qayta buyurtma, baholash, bekor qilish va operatorga yozish |
| **Profil** | Statistika, daraja, promokod oynasi, sodiqlik / sevimlilar / referal / Top donaterlar / yordam / ulashish qatorlari, til va mavzu, bildirishnoma va animatsiya kalitlari, havolalar, ijtimoiy tarmoqlar, savol-javob akkordeoni, ilova haqida, admin panel |

Mahsulot oynasi o'yin do'konlaridagidek yig'ilgan: yuqorida **muqova rasmi**
(ustida nom, valyuta turi, hudud yorlig'i, sevimlilar belgisi va haqiqiy
sharhlardan hisoblangan baho), ostida **ID maydoni** — yonida "Tekshirish" va
"Qayerdan olinadi?" tugmalari hamda saqlangan ID chiplari, keyin **paket
kartochkalari** ikki ustunda (rasm, miqdor, narx, chizilgan eski narx).
Mahsulot ichida bo'limlar bo'lsa ("UC" va "To'plamlar" kabi) ular yuqorida
yorliq bo'lib chiqadi. Eng ostida yig'iladigan promokod va izoh, hisob-kitob
va yopishqoq "Sotib olish" paneli.

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
- **Saqlangan ID'lar**: mahsulotga ilgari kiritilgan ID chip sifatida turadi —
  har safar qo'lda yozish shart emas
- **Sevimlilar**: mahsulot muqovasidagi yurak belgisi bosilsa mahsulot profildagi
  ro'yxatga tushadi (serverda saqlanadi, qurilma almashsa ham qoladi)
- **ID tekshirish**: kiritilgan ID formati darhol tekshiriladi — noto'g'ri
  terilgan raqam buyurtmadan oldin aytiladi
- **Buyurtma yo'li**: qabul qilindi → bajarilmoqda → bajarildi, har bosqichning
  vaqti bilan; bekor qilinganda sababi ham ko'rinadi
- **Buyurtmani bekor qilish**: hali ishga olinmagan buyurtmani mijoz o'zi bekor
  qiladi, pul darhol balansga qaytadi (olingandan keyin — operatorga yozish)
- Sarlavha panelida **balans chipi**, navigatsiyada **ochiq buyurtma soni**
- Barcha **sharhlar ro'yxati** (bosh sahifadagi baho kartasidan ochiladi)
- Buyurtma ko'p bo'lsa ro'yxat ustida qidiruv; bo'sh holatlarda yo'l
  ko'rsatuvchi tugmalar; tarmoq uzilsa "Qayta urinish"
- Bosh sahifada **"Yana buyurtma qilish"** tasmasi — oxirgi olingan mahsulotlar
- Buyurtmalar tarixi: "Buyurtmalar / To'lovlar" segmenti, holat filtri,
  qator bosilsa **tafsilot oynasi** (raqam, ma'lumot, summa, chegirma, keshbek,
  izoh, bekor qilish sababi), bir bosishda **qayta buyurtma** va baholash
- To'ldirish sahifasida yakunlanmagan to'lov eng ustida — ilova yopilib
  qaytadan ochilsa ham kutish oynasi bir bosishda qaytadi
- Promokodni saqlash — keyingi buyurtmaga avtomatik qo'llanadi
- **Animatsiyalarni kamaytirish** kaliti — eski telefonlarda ilova tezlashadi
  (tizimning "reduce motion" sozlamasi ham hurmat qilinadi)
- Top donaterlar reytingi: **Bugun / Hafta / Oy / Hammasi** davri, uchlik podium,
  buyurtmalar soni va o'z o'rningiz alohida qatorda (ismlar qisqartirilgan, ID ochilmaydi)
- Sodiqlik darajalari oynasi: barcha bosqichlar, keshbek foizi va joriy o'rin
- Bildirishnomalarni o'chirish — bot shaxsiy xabar yubormaydi
- Referal dastur — do'st har xarid qilganda foiz balansga tushadi
- Sodiqlik darajalari (Chinnigul → Zargar → Amir → Sohibqiron) va avtomatik keshbek
- Buyurtma holati o'zgarganda botdan xabar keladi

**Admin uchun** (Profil → Admin panel; faqat `ADMIN_IDS` ro'yxatidagilar ko'radi)

Panel bitta menyu ekranidan boshlanadi: yuqorida davr segmenti (**Bugun / Hafta / Oy /
Hammasi**) va olti ko'rsatkich, keyin "Moliya" tugmasi, so'ng barcha bo'limlar **ikki
ustunli to'rda** — telefonda hammasi bir ko'rinishda turadi, surish shart emas.
Kutayotgan ish bor bo'limda tugma ustida qizil son chiqadi.

| Bo'lim | Nima qilinadi |
|---|---|
| **Moliya** | Kutayotgan to'lovlar va ochiq buyurtmalar bir bosishda tasdiqlanadi; mijozni ID/@username bo'yicha topib balansiga qo'shish/yechish, bloklash va to'liq tarixini ko'rish |
| **Buyurtmalar** | Holat filtri va #raqam / @username / ID / mahsulot bo'yicha qidiruv; "Olindi / Bajarildi / Bekor". Bajarilganda ixtiyoriy izoh (kod, havola) mijozga xabar bilan boradi; bekor qilinganda sabab yoziladi va pul avtomatik qaytadi |
| **To'lovlar** | Holat filtri va ID / @username / summa bo'yicha qidiruv (qidirilganda filtr o'zi "Hammasi" ga o'tadi) |
| **Mijozlar** | Qidiruv, balans +/−, bloklash, tarix va mijozga shaxsiy xabar yuborish |
| **Katalog** | Mahsulot qatorlari ikonkali tugmalar bilan (yuqoriga / tahrirlash / ko'rinish / o'chirish); muqova va paket rasmlari **telefondan yuklanadi**, paketga bo'lim nomi beriladi; yashil **Nashr qilish** va ko'k **Yangi mahsulot** |
| **Promokodlar** | Foiz yoki so'mda, limit, min. buyurtma va mijozga ko'rinadigan izoh bilan |
| **Sharhlar** | Mijoz sharhlarini ko'rish, tahrirlash (baho, nom, matn) va nomaqbulini o'chirish |
| **Sozlamalar** | Kartalar, kanallar (chat_id), referal, sodiqlik darajalari, yordam havolalari, ijtimoiy tarmoqlar, savol-javob, e'lon va "ilova haqida" matni |
| **Tarqatma** | Barcha foydalanuvchilarga xabar |
| **Avtomatika** | Tashqi donat / SMM saytlarini ulash: provayder qo'shish, balansni tekshirish, xizmatlar ro'yxatidan ID topish; buyurtma avtomatik yuboriladi va holati kuzatiladi |
| **Tahlil** | 30 kunlik savdo grafigi, bugun/hafta/oy tushumi, oyning ko'p sotilganlari, yangi va faol mijozlar, **qaytmagan mijozlar** ro'yxati (har biriga xabar yuborish tugmasi bilan) |
| **Zaxira / JSON** | Katalogni JSON sifatida eksport qilish va qaytadan import qilish |
| **CSV Telegramga** | Buyurtmalar hisobotini adminning shaxsiy chatiga hujjat sifatida yuborish |

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
   | `TG_WEBHOOK_SECRET` | O'zingiz o'ylab topgan maxfiy so'z, masalan `milliypin-2026-xY7q`. Bank SMS'idan avtomatik tasdiqlash va kanaldagi tugmalar shusiz ishlamaydi. |

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

Keyin `/start`, kanaldagi tugmalar va bank SMS'ini o'qish ishlashi uchun webhook
o'rnating — brauzerda shu manzilni oching (TOKEN, domen va sekretni o'zingiznikiga
almashtiring; `secret_token` aynan `TG_WEBHOOK_SECRET` bilan bir xil bo'lsin):

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://xxxxx.up.railway.app/tg/webhook&secret_token=milliypin-2026-xY7q
```

`{"ok":true}` javobi kelsa — tayyor.

### 5-qadam. Ilovani sozlash

Botni oching → ilovaga kiring → **Profil → Admin panel** (faqat `ADMIN_IDS` dagilarga ko'rinadi):

1. **Sozlamalar** → o'z kartalaringizni kiriting (HUMO / UZCARD raqami va egasi),
   support username va kanal havolasini yozing → **Saqlash**.
2. **Sozlamalar → Kanallar** → buyurtmalar va to'lovlar uchun kanal `chat_id` sini kiriting,
   yonidagi tugma bilan sinov xabari yuboring. Bot o'sha kanalda **admin** bo'lishi shart.
   `chat_id` ni bilish uchun kanalga botni qo'shing va `/id` deb yozing — bot
   raqamni o'zi qaytaradi (kanallarniki `-100...` bilan boshlanadi).
3. **Katalog** → narxlarni o'zgartiring, mahsulotga rasm havolasi va hudud yorlig'ini qo'ying →
   **Nashr qilish** tugmasini bosing (shundagina o'zgarish mijozlarga ko'rinadi).

### Donat saytlarini API orqali ulash (avtomatika)

Buyurtmani qo'lda bajarish shart emas: **Admin panel → Avtomatika** bo'limiga
tashqi donat / nakrutka saytini ulaysiz, keyin **Katalog → paket** ichida
provayder va xizmat ID'sini ko'rsatasiz. Mijoz xarid qilgan zahoti buyurtma
o'sha saytga yuboriladi, bajarilgach o'zi «Bajarildi» bo'ladi.

**Ikki xil ulanish**

| Turi | Kimga | Qanday ishlaydi |
|---|---|---|
| **SMM / Perfect Panel** | Donat va nakrutka saytlarining aksariyati | `POST url` → `key`, `action=add\|status\|balance\|services`. Balans, xizmatlar ro'yxati va avtomatik holat kuzatuvi to'liq ishlaydi |
| **Ixtiyoriy havola** | Boshqacha API bergan saytlar | Manzil qolipi yoziladi: `https://sayt.uz/api?token={key}&sku={service}&id={target}&n={qty}`. Javobdagi buyurtma raqami `idPath` orqali olinadi, holat esa `statusUrl` orqali so'raladi |

Qoliplardagi `{key}` `{service}` `{target}` `{qty}` `{orderId}` `{extId}` avtomatik
almashtiriladi.

**Ulash tartibi**

1. Saytdan API kalitini oling.
2. **Avtomatika → Provayder qo'shish** → nomi, turi, manzili va kalitini yozing → **Saqlash**.
3. **Balans** tugmasi bilan tekshiring — balans ko'rinsa ulanish to'g'ri.
4. **Xizmatlar** tugmasi bilan ro'yxatni oching, kerakli xizmat ID'sini nusxalang.
5. **Katalog → mahsulot → paket** ichidagi *Provayder ID*, *Xizmat ID* va *Miqdor*
   maydonlarini to'ldiring → **Nashr qilish**.

**Xavfsizlik va ishonchlilik**

- API kaliti faqat serverda saqlanadi; admin paneliga ham niqoblangan
  (`••••1234`) holda qaytadi va tahrirlashda qayta yozish shart emas.
- Yuborishda xato bo'lsa buyurtma **«yangi»** bo'lib qoladi (holat o'zgarmaydi),
  kanalga ogohlantirish tushadi va admin uni qo'lda bajaradi — **pul yo'qolmaydi**.
- Provayder buyurtmani bekor qilsa, pul mijoz balansiga **bir marta** qaytariladi.
- Holat har 5 daqiqada tekshiriladi; admin panelidagi «Holatni tekshirish» va
  «Qayta yuborish» tugmalari bilan darhol ham tekshirsa bo'ladi.
- Faqat `http(s)` manzillar qabul qilinadi, javob hajmi cheklangan, so'rov
  20 soniyada uziladi.

### Rasmlar

Mahsulot muqovasi va paket rasmlari admin panelidan **telefondan tanlanadi**:
brauzer rasmni 512px (paket rasmini 300px) gacha kichraytiradi, server uni
`DATA_DIR/img` papkasiga yozadi va katalogda faqat qisqa manzil qoladi
(`/img/xxxx.jpg`). Shuning uchun:

- katalog javobi kichik bo'lib qoladi — ilova tez ochiladi;
- rasmlar brauzerda bir yil keshlanadi;
- Railway'da **volume `/data` ga ulangan bo'lsa** rasmlar deploy'dan keyin ham
  saqlanib qoladi (volume bo'lmasa rasmlar ham, baza ham o'chib ketadi).

Xohlasangiz tashqi havola (`https://...`) ham yozish mumkin — maydonga
qo'lda kiritiladi.

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
| `TG_WEBHOOK_SECRET` | tavsiya | `setWebhook` dagi `secret_token` bilan bir xil bo'lsin. **Busiz bank SMS'idan avtomatik tasdiqlash va kanaldagi tugmalar ishlamaydi** — soxta xabar bilan balans to'ldirib olishning oldini olish uchun. |
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

## Telegramning o'zidan boshqarish

Buyurtmalar va to'lovlar kanaliga tushgan har bir kartochka ostida tugmalar bo'ladi —
admin ilovani ochmasdan, to'g'ridan-to'g'ri Telegramdan ishlaydi:

| Kartochka | Tugmalar |
|---|---|
| Buyurtma | «⏳ Olindi» · «✅ Bajarildi» · «❌ Bekor qilish» |
| To'lov | «✅ Tasdiqlash» · «❌ Rad etish» |

- Tugmani bosgan odam `ADMIN_IDS` da bo'lishi shart — begona odamga «faqat adminlar
  uchun» degan ogohlantirish chiqadi va holat o'zgarmaydi.
- Bekor qilish ikki bosqichli: pul qaytariladigan amal bo'lgani uchun oldin
  «Ha, bekor qilinsin» tasdig'i so'raladi.
- Amal bajarilgach kartochka matni yangilanadi va tugmalar o'chadi — kanalda
  buyurtmaning joriy holati doim ko'rinib turadi.
- `TG_WEBHOOK_SECRET` o'rnatilmagan bo'lsa tugmalar ishlamaydi (yuqoridagi sabab).

Bot buyruqlari: `/start` — ilovani ochish, `/help` — yordam, `/id` — chat va
foydalanuvchi ID'si (kanalda yozilsa kanalning `chat_id` sini qaytaradi).

**Avtomatik tasdiqlash.** To'lovlar kanaliga (Sozlamalar → To'lovlar kanali) `humocard` yoki
`cardxabar` kabi bank botini qo'shsangiz va webhook ishlab tursa, server o'sha xabardan
summani o'qib, aynan shu summani kutayotgan to'lovni **o'zi tasdiqlaydi** — admin aralashuvi
kerak bo'lmaydi. Summa mos kelmasa, to'lov qo'lda tasdiqlash uchun kutib turadi.

Muddati o'tgan to'lovlar har daqiqada avtomatik `expired` ga o'tadi — lekin mijoz
«To'lov qildim» bosgan so'rov bundan mustasno: u admin qaroriga qadar kutib turadi.

---

## Loyiha tuzilishi

```
server.js        HTTP server, API, Telegram Bot API va webhook  (tashqi kutubxonasiz)
db.js            SQLite qatlami (node:sqlite) — mahsulot, buyurtma, to'lov, mijoz, promokod
providers.js     Tashqi donat / SMM saytlari qatlami (Perfect Panel va ixtiyoriy havola)
seed.js          Birinchi ishga tushishdagi standart katalog
public/
  index.html     Ilova karkasi (splash, sarlavha, tablar, sheet, tasdiq oynasi) va logotip SVG
  styles.css     Dizayn tizimi: rang tokenlari, naqsh, kunduz/tun rejimi
  icons.js       Qo'lda chizilgan SVG ikonkalar to'plami
  i18n.js        UZ / RU matnlar
  app.js         Mijoz mantiqi: ko'rinishlar, buyurtma, to'ldirish, referal, sharh
  admin.js       Admin panel (12 bo'lim)
test/run.js      87 ta integratsion test — npm test
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
Top donaterlar reytingi, texnik ishdagi mahsulotni sotib bo'lmasligi va sharh boshqaruvi.

## Xavfsizlik

- Har bir so'rov `X-Init-Data` sarlavhasidagi Telegram imzosi bilan tekshiriladi
  (HMAC-SHA256, doimiy vaqtli solishtirish); 12 soatdan eski `auth_date` rad etiladi.
- Admin huquqi faqat serverdagi `ADMIN_IDS` bilan aniqlanadi — panelni "ochish" hech narsa bermaydi,
  har bir admin so'rovi qaytadan tekshiriladi.
- Balans faqat serverda o'zgaradi; mijoz jo'natgan narx yoki chegirma qabul qilinmaydi —
  hammasi katalogdan va promokod jadvalidan qayta hisoblanadi.
- Webhook `secret_token` bilan himoyalanadi. Sekret o'rnatilmagan bo'lsa, bank SMS'idan
  **avtomatik tasdiqlash butunlay o'chiriladi** — aks holda webhook manzilini topgan
  odam soxta "pul keldi" xabari bilan o'ziga balans yozdirib olishi mumkin edi.
- Mijoz "To'lov qildim" bosgan so'rov avtomatik o'chmaydi — admin ko'rmaguncha kutib turadi.
- Bajarilgan buyurtma bekor qilinmaydi: pul o'tgan, keshbek va referal bonusi to'langan.
  Bunday holatda admin balansni qo'lda to'g'irlaydi, shunda hisob buzilmaydi.
- Admin kiritgan havolalar `http(s)` yoki `tg` sxemasida bo'lishi tekshiriladi.
- Bloklangan mijoz na buyurtma bera oladi, na balans to'ldira oladi.
- Kanaldagi tugmalarni faqat `ADMIN_IDS` dagi akkauntlar bosa oladi va callback
  faqat to'g'ri `secret_token` bilan kelgan bo'lsa qabul qilinadi.

## Ishlash

- `/api/stats` va `/api/leaderboard` natijasi 60 soniya keshlanadi — ilova ochilganda
  minglab buyurtma qayta-qayta skanerlanmaydi (buyurtma bajarilganda kesh darhol tozalanadi).
- Katalog va sozlamalar `ETag` bilan beriladi: o'zgarmagan bo'lsa `304` qaytadi.
- `SIGTERM`/`SIGINT` da server ulanishlarni yopib, SQLite bazasini toza yopadi —
  qayta deploy paytida WAL fayli nuqtaga keltiriladi.

## Keyingi bosqich

Click / Payme merchant integratsiyasi, Telegram Stars orqali to'lov, xizmatlarni avtomatik
yetkazish uchun tashqi API'lar (SMM panel, Fragment), buyurtmalar bo'yicha kengaytirilgan filtr.
