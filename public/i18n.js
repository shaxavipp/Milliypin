/* i18n.js — Milliy Pin interfeys matnlari (o'zbekcha va ruscha).
   Kalitlar nuqta bilan guruhlangan: "nav.home", "order.title" va h.k. */
(function () {
  "use strict";

  const DICT = {
    uz: {
      "nav.home": "Bosh", "nav.tg": "Telegram", "nav.games": "O'yinlar",
      "nav.orders": "Buyurtma", "nav.profile": "Profil",

      "home.balance": "Sizning balansingiz",
      "home.topup": "To'ldirish",
      "home.history": "Tarix",
      "home.cats": "Bo'limlar",
      "home.tg": "Telegram xizmatlari",
      "home.tgSub": "Premium, Stars, sovg'alar",
      "home.games": "O'yin donatlari",
      "home.gamesSub": "UC, olmos, gold va boshqalar",
      "home.popular": "Ommabop",
      "home.reviews": "Mijozlar fikri",
      "home.all": "Barchasi",
      "home.trust1": "Tez yetkazish",
      "home.trust2": "Rasmiy manbalar",
      "home.trust3": "24/7 yordam",
      "home.stats": "Bizga ishonishadi",
      "home.statUsers": "foydalanuvchi",
      "home.statOrders": "buyurtma",

      "cat.tgTitle": "Telegram xizmatlari",
      "cat.gamesTitle": "O'yin donatlari",
      "cat.empty": "Bu bo'limda hozircha mahsulot yo'q",

      "prod.from": "dan",
      "prod.choose": "Paketni tanlang",
      "prod.qty": "Soni",
      "prod.promo": "Promokod (ixtiyoriy)",
      "prod.promoApply": "Qo'llash",
      "prod.comment": "Izoh (ixtiyoriy)",
      "prod.commentPh": "Qo'shimcha ma'lumot...",
      "prod.subtotal": "Mahsulot narxi",
      "prod.discount": "Chegirma",
      "prod.total": "Jami to'lov",
      "prod.buy": "Sotib olish",
      "prod.needTopup": "Balansni to'ldirish",
      "prod.notEnough": "Balans yetarli emas",

      "field.username": "Telegram username",
      "field.usernamePh": "@foydalanuvchi",
      "field.playerId": "O'yinchi ID (Player ID)",
      "field.playerIdPh": "Masalan: 5123456789",
      "field.playerZone": "ID va Server / Zone",
      "field.playerZonePh": "Masalan: 12345678 (1234)",
      "field.nickname": "O'yindagi nik",
      "field.nicknamePh": "Nikingizni yozing",
      "field.link": "Havola",
      "field.linkPh": "https://t.me/...",

      "topup.title": "Balansni to'ldirish",
      "topup.amount": "Summa",
      "topup.amountPh": "Masalan: 50000",
      "topup.card": "To'lov kartasi",
      "topup.next": "Davom etish",
      "topup.copy": "Nusxa olish",
      "topup.copied": "Nusxa olindi",
      "topup.exact": "Aynan shu summani o'tkazing",
      "topup.exactHint": "Summa oxiridagi raqamlar to'lovingizni tanib olish uchun. Boshqa summa yuborilsa, tasdiqlash kechikadi.",
      "topup.paid": "✅ To'lov qildim",
      "topup.cancel": "Bekor qilish",
      "topup.left": "Qolgan vaqt",
      "topup.waiting": "To'lovingiz tekshirilmoqda. Odatda 5-15 daqiqa vaqt oladi.",
      "topup.min": "Eng kam summa",
      "topup.rules": "Faqat shaxsiy kartadan o'tkazma qiling. Chek rasmi kerak emas — summa avtomatik tanib olinadi.",

      "orders.title": "Mening buyurtmalarim",
      "orders.empty": "Hozircha buyurtma yo'q",
      "orders.emptySub": "Birinchi buyurtmangizni bering — bir necha daqiqada bajariladi.",
      "orders.payments": "To'lovlar",
      "orders.review": "Baholash",
      "orders.reviewTitle": "Buyurtmani baholang",
      "orders.reviewText": "Fikringiz (ixtiyoriy)",
      "orders.send": "Yuborish",
      "orders.thanks": "Fikringiz uchun rahmat!",

      "profile.title": "Profil",
      "profile.balance": "Balans",
      "profile.spent": "Sarflangan",
      "profile.orders": "Buyurtma",
      "profile.referral": "Do'stlarni taklif qilish",
      "profile.support": "Qo'llab-quvvatlash",
      "profile.channel": "Rasmiy kanal",
      "profile.reviews": "Sharhlar",
      "profile.lang": "Til",
      "profile.theme": "Ko'rinish",
      "profile.admin": "Admin panel",
      "profile.level": "Daraja",
      "profile.toNext": "Keyingi darajagacha",

      "ref.title": "Referal dastur",
      "ref.desc": "Do'stingiz havolangiz orqali kirib xarid qilsa, har xaridining {p}% i balansingizga tushadi.",
      "ref.link": "Sizning havolangiz",
      "ref.copy": "Havoladan nusxa olish",
      "ref.share": "Do'stlarga yuborish",
      "ref.invited": "Taklif qilingan",
      "ref.active": "Xarid qilgan",
      "ref.earned": "Ishlangan",
      "ref.off": "Referal dastur vaqtincha o'chirilgan.",

      "st.new": "Yangi", "st.processing": "Bajarilmoqda", "st.done": "Bajarildi", "st.canceled": "Bekor qilindi",
      "st.pending": "Kutilmoqda", "st.confirmed": "Tasdiqlandi", "st.rejected": "Rad etildi", "st.expired": "Muddati o'tdi",

      "err.auth": "Ilovani Telegram orqali oching.",
      "err.expired": "Sessiya eskirdi — ilovani qayta oching.",
      "err.network": "Tarmoq xatosi. Qayta urinib ko'ring.",
      "err.insufficient": "Balansingiz yetarli emas.",
      "err.target": "Ma'lumotni to'liq kiriting.",
      "err.min_topup": "Summa juda kichik.",
      "err.promo_not_found": "Bunday promokod topilmadi.",
      "err.promo_expired": "Promokod muddati tugagan.",
      "err.promo_used_up": "Promokod limiti tugagan.",
      "err.promo_already_used": "Siz bu promokoddan foydalangansiz.",
      "err.promo_min_order": "Promokod uchun buyurtma summasi yetarli emas.",
      "err.too_many_pending": "Sizda tasdiqlanmagan to'lov bor. Avval uni yakunlang.",
      "err.blocked": "Hisobingiz vaqtincha bloklangan.",
      "err.no_bot_token": "Server hali sozlanmagan.",
      "err.server_error": "Server xatosi.",

      "ok.ordered": "Buyurtma qabul qilindi!",
      "ok.saved": "Saqlandi",
      "common.close": "Yopish",
      "common.cancel": "Bekor qilish",
      "common.confirm": "Tasdiqlash",
      "common.loading": "Yuklanmoqda...",
      "common.som": "so'm",
      "common.back": "Orqaga"
    },

    ru: {
      "nav.home": "Главная", "nav.tg": "Telegram", "nav.games": "Игры",
      "nav.orders": "Заказы", "nav.profile": "Профиль",

      "home.balance": "Ваш баланс",
      "home.topup": "Пополнить",
      "home.history": "История",
      "home.cats": "Разделы",
      "home.tg": "Услуги Telegram",
      "home.tgSub": "Premium, Stars, подарки",
      "home.games": "Донат в игры",
      "home.gamesSub": "UC, алмазы, голда и др.",
      "home.popular": "Популярное",
      "home.reviews": "Отзывы клиентов",
      "home.all": "Все",
      "home.trust1": "Быстрая доставка",
      "home.trust2": "Официальные источники",
      "home.trust3": "Поддержка 24/7",
      "home.stats": "Нам доверяют",
      "home.statUsers": "пользователей",
      "home.statOrders": "заказов",

      "cat.tgTitle": "Услуги Telegram",
      "cat.gamesTitle": "Донат в игры",
      "cat.empty": "В этом разделе пока нет товаров",

      "prod.from": "от",
      "prod.choose": "Выберите пакет",
      "prod.qty": "Количество",
      "prod.promo": "Промокод (необязательно)",
      "prod.promoApply": "Применить",
      "prod.comment": "Комментарий (необязательно)",
      "prod.commentPh": "Дополнительная информация...",
      "prod.subtotal": "Стоимость",
      "prod.discount": "Скидка",
      "prod.total": "Итого",
      "prod.buy": "Купить",
      "prod.needTopup": "Пополнить баланс",
      "prod.notEnough": "Недостаточно средств",

      "field.username": "Telegram username",
      "field.usernamePh": "@пользователь",
      "field.playerId": "ID игрока (Player ID)",
      "field.playerIdPh": "Например: 5123456789",
      "field.playerZone": "ID и Сервер / Zone",
      "field.playerZonePh": "Например: 12345678 (1234)",
      "field.nickname": "Игровой ник",
      "field.nicknamePh": "Укажите ваш ник",
      "field.link": "Ссылка",
      "field.linkPh": "https://t.me/...",

      "topup.title": "Пополнение баланса",
      "topup.amount": "Сумма",
      "topup.amountPh": "Например: 50000",
      "topup.card": "Карта для оплаты",
      "topup.next": "Продолжить",
      "topup.copy": "Копировать",
      "topup.copied": "Скопировано",
      "topup.exact": "Переведите ровно эту сумму",
      "topup.exactHint": "Последние цифры суммы нужны для распознавания вашего платежа. Другая сумма задержит подтверждение.",
      "topup.paid": "✅ Я оплатил",
      "topup.cancel": "Отменить",
      "topup.left": "Осталось",
      "topup.waiting": "Платёж проверяется. Обычно это занимает 5-15 минут.",
      "topup.min": "Минимальная сумма",
      "topup.rules": "Переводите только с личной карты. Чек не нужен — сумма распознаётся автоматически.",

      "orders.title": "Мои заказы",
      "orders.empty": "Заказов пока нет",
      "orders.emptySub": "Сделайте первый заказ — он выполнится за несколько минут.",
      "orders.payments": "Платежи",
      "orders.review": "Оценить",
      "orders.reviewTitle": "Оцените заказ",
      "orders.reviewText": "Ваш отзыв (необязательно)",
      "orders.send": "Отправить",
      "orders.thanks": "Спасибо за отзыв!",

      "profile.title": "Профиль",
      "profile.balance": "Баланс",
      "profile.spent": "Потрачено",
      "profile.orders": "Заказы",
      "profile.referral": "Пригласить друзей",
      "profile.support": "Поддержка",
      "profile.channel": "Официальный канал",
      "profile.reviews": "Отзывы",
      "profile.lang": "Язык",
      "profile.theme": "Тема",
      "profile.admin": "Админ-панель",
      "profile.level": "Уровень",
      "profile.toNext": "До следующего уровня",

      "ref.title": "Реферальная программа",
      "ref.desc": "Если друг зайдёт по вашей ссылке и что-то купит, {p}% с каждой покупки поступит на ваш баланс.",
      "ref.link": "Ваша ссылка",
      "ref.copy": "Скопировать ссылку",
      "ref.share": "Отправить друзьям",
      "ref.invited": "Приглашено",
      "ref.active": "С покупками",
      "ref.earned": "Заработано",
      "ref.off": "Реферальная программа временно отключена.",

      "st.new": "Новый", "st.processing": "Выполняется", "st.done": "Выполнен", "st.canceled": "Отменён",
      "st.pending": "Ожидает", "st.confirmed": "Подтверждён", "st.rejected": "Отклонён", "st.expired": "Истёк",

      "err.auth": "Откройте приложение через Telegram.",
      "err.expired": "Сессия устарела — откройте приложение заново.",
      "err.network": "Ошибка сети. Попробуйте ещё раз.",
      "err.insufficient": "Недостаточно средств на балансе.",
      "err.target": "Заполните данные полностью.",
      "err.min_topup": "Сумма слишком мала.",
      "err.promo_not_found": "Такой промокод не найден.",
      "err.promo_expired": "Срок промокода истёк.",
      "err.promo_used_up": "Лимит промокода исчерпан.",
      "err.promo_already_used": "Вы уже использовали этот промокод.",
      "err.promo_min_order": "Сумма заказа мала для этого промокода.",
      "err.too_many_pending": "У вас есть неподтверждённый платёж. Сначала завершите его.",
      "err.blocked": "Ваш аккаунт временно заблокирован.",
      "err.no_bot_token": "Сервер ещё не настроен.",
      "err.server_error": "Ошибка сервера.",

      "ok.ordered": "Заказ принят!",
      "ok.saved": "Сохранено",
      "common.close": "Закрыть",
      "common.cancel": "Отмена",
      "common.confirm": "Подтвердить",
      "common.loading": "Загрузка...",
      "common.som": "сум",
      "common.back": "Назад"
    }
  };

  let lang = "uz";
  try { lang = localStorage.getItem("mp_lang") || "uz"; } catch (e) {}
  if (!DICT[lang]) lang = "uz";

  window.I18N = {
    get lang() { return lang; },
    set(l) {
      if (!DICT[l]) return;
      lang = l;
      try { localStorage.setItem("mp_lang", l); } catch (e) {}
      document.documentElement.lang = l;
    },
    // t("ref.desc", {p: 3}) — {p} kabi o'rniga qo'yish qo'llab-quvvatlanadi
    t(key, vars) {
      let s = (DICT[lang] && DICT[lang][key]) || (DICT.uz[key]) || key;
      if (vars) Object.keys(vars).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
      return s;
    },
    // Ko'p tilli maydon: {uz:"...", ru:"..."} yoki oddiy satr
    pick(v) {
      if (v == null) return "";
      if (typeof v === "string") return v;
      return v[lang] || v.uz || v.ru || "";
    },
    langs: ["uz", "ru"]
  };
})();
