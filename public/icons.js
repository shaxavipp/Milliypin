/* icons.js — Milliy Pin ikonka to'plami.
   Hammasi bitta qo'lda chizilgan: 24×24 to'r, 1.6px chiziq, yumaloq uchlar, to'ldirishsiz.
   Emoji ishlatilmaydi — ikonkalar milliy naqsh geometriyasiga (girih, bodom, paxta guli,
   peshtoq yoyi) tayangan holda chizilgan. */
(function () {
  "use strict";

  // Har bir ikonka — <path>/<circle> ichki markup. O'rash svg() funksiyasida.
  const P = {
    /* ── Navigatsiya: peshtoq yoyi, samolyot, joystik, o'ram, chehra ── */
    arch: '<path d="M4 20v-8a8 8 0 0 1 16 0v8"/><path d="M2 20h20"/><path d="M9 20v-7a3 3 0 0 1 6 0v7"/>',
    plane: '<path d="M21 4 3 10.5l6 2.3L11.3 19 21 4Z"/><path d="m9 12.8 4.2-4.2"/>',
    pad: '<rect x="2.5" y="7.5" width="19" height="10" rx="4"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="16" cy="11.5" r="1.1"/><circle cx="18.4" cy="14" r="1.1"/>',
    scroll: '<path d="M6 3h12v16.5A1.5 1.5 0 0 1 16.5 21H6Z"/><path d="M6 21a1.5 1.5 0 0 1-1.5-1.5V17H6"/><path d="M9 7h6M9 10.5h6M9 14h4"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.6-3.7 3.6-5.6 7.2-5.6s6.6 1.9 7.2 5.6"/>',

    /* ── Amallar ── */
    card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 14.5h3.5"/>',
    wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3"/><rect x="3" y="7.5" width="18" height="11.5" rx="2.5"/><circle cx="16.8" cy="13.2" r="1.2"/>',
    gift: '<rect x="3" y="9" width="18" height="4"/><path d="M4.5 13v7h15v-7"/><path d="M12 9v11"/><path d="M12 9C9.8 9 7 8.6 7 6.6 7 5.2 8.1 4.3 9.3 4.6 10.9 5 12 9 12 9Zm0 0c2.2 0 5-.4 5-2.4 0-1.4-1.1-2.3-2.3-2C13.1 5 12 9 12 9Z"/>',
    crown: '<path d="M3 8.5 6.3 13 12 5.5 17.7 13 21 8.5V18H3Z"/><path d="M3 18h18"/>',
    star4: '<path d="M12 2.5c.6 5.2 3.8 8.4 9 9-5.2.6-8.4 3.8-9 9-.6-5.2-3.8-8.4-9-9 5.2-.6 8.4-3.8 9-9Z"/>',
    star: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8Z"/>',
    megaphone: '<path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H8l8 4.5V5.5L8 10H5.5A1.5 1.5 0 0 0 4 11.5Z"/><path d="M18.5 9.5a4 4 0 0 1 0 5"/><path d="M8 15.5V21"/>',
    eye: '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    heart: '<path d="M12 20S3.5 15 3.5 9.4A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.5 2.1C20.5 15 12 20 12 20Z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.4"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
    flame: '<path d="M12 21c3.6 0 6-2.4 6-5.6 0-4.4-4.6-5.9-4-12.4-3 1.6-5.4 5-5.4 8 0 1.3.4 2.2 1 2.9-1.9.3-3.6 1.7-3.6 4 0 1.8 1.6 3.1 3.4 3.1"/><path d="M12 21c-1.6 0-2.6-1.1-2.6-2.4 0-1.9 2.6-2.6 2.3-5.6 1.6 1.2 2.9 3.2 2.9 5.1 0 1.6-1.1 2.9-2.6 2.9Z"/>',
    sword: '<path d="M20.5 3.5 11 13l-1 3.5 3.5-1 9.5-9.5Z"/><path d="m10 14-6.5 6.5"/><path d="M4 17.5 6.5 20"/><path d="m17 6 1.6 1.6"/>',
    coin: '<ellipse cx="12" cy="7" rx="7.5" ry="3.2"/><path d="M4.5 7v10c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2V7"/><path d="M4.5 12c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2"/>',
    gem: '<path d="M6 3.5h12L22 9l-10 11.5L2 9Z"/><path d="M2 9h20"/><path d="M6 3.5 9 9l3 11.5L15 9l3-5.5"/>',
    castle: '<path d="M3 20V8l2.5 1.5V6l2.5 1.5V5h8v2.5L18.5 6v3.5L21 8v12Z"/><path d="M3 20h18"/><path d="M10 20v-4.5a2 2 0 0 1 4 0V20"/>',
    helmet: '<path d="M4.2 15.5a7.8 7.8 0 0 1 15.6 0v1.8H4.2Z"/><path d="M2.6 17.3h18.8v3H2.6Z"/><path d="M9 7.8V5.2h6v2.6"/>',
    box3: '<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5Z"/><path d="M4 8.5 12 13l8-4.5M12 13v7"/><path d="m8 6.2 8 4.6"/>',
    petal: '<path d="M12 3c3 3 4.5 5.8 4.5 8.4A4.5 4.5 0 0 1 12 16a4.5 4.5 0 0 1-4.5-4.6C7.5 8.8 9 6 12 3Z"/><path d="M12 16v5"/><path d="M9 19.5h6"/>',

    /* ── Interfeys ── */
    globe: '<circle cx="12" cy="12" r="8.8"/><path d="M3.2 12h17.6"/><path d="M12 3.2c2.4 2.6 3.6 5.6 3.6 8.8s-1.2 6.2-3.6 8.8c-2.4-2.6-3.6-5.6-3.6-8.8S9.6 5.8 12 3.2Z"/>',
    moon: '<path d="M20 14.4A8.6 8.6 0 0 1 9.6 4 8.8 8.8 0 1 0 20 14.4Z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/>',
    shield: '<path d="M12 2.8 4.5 5.8v6c0 4.4 3.1 7.9 7.5 9.4 4.4-1.5 7.5-5 7.5-9.4v-6Z"/><path d="m8.8 11.8 2.4 2.4 4-4.6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.5c.5-3.2 3.1-4.9 6.2-4.9s5.7 1.7 6.2 4.9"/><path d="M16 5.4a3.2 3.2 0 0 1 0 5.2"/><path d="M17.5 14.9c2 .6 3.4 2.1 3.7 4.6"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M15.5 5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2"/>',
    // Ulashish — uch tugun va ularni bog'lovchi chiziqlar
    share: '<circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m8.4 10.8 7.2-3.9M8.4 13.2l7.2 3.9"/>',
    // Grafik — tahlil bo'limi: ustunlar va o'sish chizig'i
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 20v-6M12.5 20v-9M17 20v-4"/>',
    // Rasm — admin panelidagi rasm maydonining bo'sh holati
    image: '<rect x="3" y="5" width="18" height="14" rx="2.4"/><circle cx="8.6" cy="10.2" r="1.7"/><path d="m4 17 4.6-4.6a1.6 1.6 0 0 1 2.2 0L15 16.6M14 14.4l1.6-1.6a1.6 1.6 0 0 1 2.2 0L20 15"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
    chevron: '<path d="m9 4.5 7.5 7.5L9 19.5"/>',
    back: '<path d="M15 4.5 7.5 12 15 19.5"/>',
    clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 6.8V12l3.6 2.2"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m15.8 15.8 4.4 4.4"/>',
    plus: '<path d="M12 4.5v15M4.5 12h15"/>',
    minus: '<path d="M4.5 12h15"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.5 3.5V9h-5.5"/>',
    download: '<path d="M12 3.5v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19.5h16"/>',
    send: '<path d="M21 3 3 10.2l7.4 2.9L14 21Z"/><path d="m10.4 13.1 4.4-4.4"/>',
    alert: '<path d="M12 3.5 21.5 20H2.5Z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
    lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.4"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
    tag: '<path d="M11 3.5H20.5V13L11.8 21.7a1.6 1.6 0 0 1-2.3 0l-7.2-7.2a1.6 1.6 0 0 1 0-2.3Z"/><circle cx="16.6" cy="7.4" r="1.5"/>',
    list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.2" cy="6.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>',
    chart: '<path d="M3.5 20.5h17"/><path d="M6.5 20.5V13M11 20.5V6.5M15.5 20.5v-9M20 20.5V9.5"/>',
    box: '<path d="M12 2.8 21 7.4v9.2L12 21.2 3 16.6V7.4Z"/><path d="M3 7.4 12 12l9-4.6M12 12v9.2"/>',
    cog: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2"/>',
    trash: '<path d="M4.5 6.5h15"/><path d="M9.5 6.5V4.2h5v2.3"/><path d="M6.5 6.5 7.4 20a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-13.5"/><path d="M10.5 10.5v7M13.5 10.5v7"/>',
    edit: '<path d="m16.5 3.5 4 4L8 20H4v-4Z"/><path d="m14 6 4 4"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.4 6.9A9.6 9.6 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a17 17 0 0 1-3.3 3.8"/><path d="M6.4 8.3A16.8 16.8 0 0 0 2.5 12S6 17.5 12 17.5c1.2 0 2.3-.2 3.3-.6"/><path d="M9.6 9.9a2.8 2.8 0 0 0 3.9 3.9"/>',
    dome: '<path d="M12 2.5c-3 2-4.8 4.7-4.8 7.6H16.8c0-2.9-1.8-5.6-4.8-7.6Z"/><path d="M6 10.1h12v3H6Z"/><path d="M7.5 13.1V21h9v-7.9"/><path d="M4.5 21h15"/>',
    door: '<path d="M6 21V4.6a1.6 1.6 0 0 1 1.6-1.6h8.8A1.6 1.6 0 0 1 18 4.6V21"/><path d="M4 21h16"/><circle cx="14.6" cy="12.4" r="1"/>'
  };

  const svg = (name, size) => {
    const body = P[name];
    if (!body) return "";
    const s = size || 24;
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + body + '</svg>';
  };

  /* ── Tarixiy me'moriy belgilar (chiziqli, 24×24) ──
     Registon peshtoqi, Go'ri Amir gumbazi, minora — zamonaviy interfeys ustidagi
     tarix qatlami. Ular bezak sifatida emas, bo'lim belgisi sifatida ishlatiladi. */
  Object.assign(P, {
    peshtoq: '<path d="M3 21V9.5L12 2l9 7.5V21"/><path d="M2 21h20"/>' +
             '<path d="M8.5 21v-6.6c0-2 1.6-3.6 3.5-3.6s3.5 1.6 3.5 3.6V21"/>' +
             '<path d="M12 2v2.4"/>',
    gumbaz:  '<path d="M12 2.2c-3.4 2.4-5.4 5.3-5.4 8.4h10.8c0-3.1-2-6-5.4-8.4Z"/>' +
             '<path d="M9.2 3.6c-.8 2.2-1.2 4.6-1.2 7M14.8 3.6c.8 2.2 1.2 4.6 1.2 7"/>' +
             '<path d="M5.6 10.6h12.8v2.6H5.6Z"/><path d="M7.2 13.2V21h9.6v-7.8"/>' +
             '<path d="M4 21h16"/><path d="M11 21v-3.4h2V21"/>',
    minora:  '<path d="M9 21V7.4h6V21"/><path d="M7.6 21h8.8"/>' +
             '<path d="M8.4 7.4 12 3.2l3.6 4.2"/><path d="M12 1.4v1.8"/>' +
             '<path d="M9 11.4h6M9 15.4h6"/>',
    palak:   '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.6"/>' +
             '<path d="M12 3.4v3M12 17.6v3M3.4 12h3M17.6 12h3"/>' +
             '<path d="m6 6 2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18"/>'
  });

  /* Milliy naqsh bo'laklari — sarlavha ostidagi zanjira, ajratgich va medalyon.
     Kartochkalarga takrorlanuvchi fon sifatida emas, ramka sifatida qo'yiladi. */
  const ORN = {
    // Peshtoq (sivri yoy) — sarlavha panelining pastki qirrasi
    arch(color) {
      return '<svg viewBox="0 0 400 26" preserveAspectRatio="none" aria-hidden="true">' +
        '<path d="M0 26V14c11 0 16-8 25-8s14 8 25 8 16-8 25-8 14 8 25 8 16-8 25-8 14 8 25 8 16-8 25-8 14 8 25 8' +
        ' 16-8 25-8 14 8 25 8 16-8 25-8 14 8 25 8 16-8 25-8 14 8 25 8 16-8 25-8 14 8 25 8V26Z" fill="' + color + '"/></svg>';
    },
    // Zanjira — uchburchak va nuqta almashinadigan koshin haoshiyasi
    band: '<svg width="34" height="9" viewBox="0 0 34 9" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="none" stroke="CLR" stroke-width="1" stroke-linejoin="round">' +
      '<path d="M1 8 5.5 1 10 8Z"/><path d="M24 8 28.5 1 33 8Z"/></g>' +
      '<circle cx="17" cy="4.5" r="1.6" fill="CLR"/></svg>',
    // Girih — 8 qirrali yulduz va burilgan kvadrat, fon uchun juda past kontrastda
    girih: '<svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="none" stroke="CLR" stroke-width=".9">' +
      '<path d="M26 4 32 20 48 26 32 32 26 48 20 32 4 26 20 20Z"/>' +
      '<rect x="11" y="11" width="30" height="30" transform="rotate(45 26 26)"/>' +
      '<circle cx="26" cy="26" r="5.5"/></g></svg>',
    // Bodom (paisley) medalyoni — mahsulot kartochkasi ikonkasining orqa fonida
    bodom: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.1" opacity=".5">' +
      '<path d="M24 5c8 6 12 12 12 18a12 12 0 0 1-24 0c0-6 4-12 12-18Z"/>' +
      '<path d="M24 13c4 3.5 6 7 6 10.4a6 6 0 0 1-12 0C18 20 20 16.5 24 13Z"/></g></svg>'
  };

  // Registon peshtoqi silueti — banner va sahifa sarlavhasi uchun keng SVG
  ORN.iwan = '<svg viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M0 64V26C0 26 22 26 30 26 38 26 44 12 60 12s22 14 30 14h140c8 0 14-14 30-14s22 14 30 14h30v38Z" ' +
    'fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/></svg>';

  const dataUri = (tpl, color) =>
    "url(\"data:image/svg+xml;utf8," + tpl.split("CLR").join(color).replace(/"/g, "'").replace(/#/g, "%23") + "\")";

  window.ICO = svg;
  window.ORN = ORN;
  window.ornUri = dataUri;
})();
