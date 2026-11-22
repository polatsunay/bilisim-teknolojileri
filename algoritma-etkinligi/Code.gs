/**
 * Okulumuzun Algoritması – ortak çalışma arka ucu (Google Apps Script)
 * © 2026 Sunay's School · Tüm hakları Sunay Öğretmen'e aittir.
 *
 * KURULUM (bir kez):
 *  1) script.google.com → Yeni proje → bu kodu yapıştır → Kaydet.
 *  2) Üstteki fonksiyon listesinden "kurulum" seç → Çalıştır → izinleri onayla.
 *     Alttaki "Yürütme günlüğü"nde öğretmen paneli ŞİFRESİ yazar. Not alın.
 *  3) Dağıt → Yeni dağıtım → Tür: Web uygulaması
 *       Yürütme: Ben   |   Erişim: Herkes   → Dağıt → Web uygulaması URL'sini kopyala.
 *  4) Bu URL'yi sitedeki algoritma-etkinligi/ortak.js dosyasındaki API_URL satırına yapıştır.
 * Kodu sonradan değiştirirseniz: Dağıt → Dağıtımları yönet → Düzenle → Sürüm: Yeni sürüm → Dağıt.
 */

var OGRETMEN_EPOSTA = ''; // Boş bırakılırsa script sahibinin adresi kullanılır.
var PANEL_URL = 'https://polatsunay.github.io/bilisim-teknolojileri/algoritma-etkinligi/ogretmen.html';
var SAYFA_ADI = 'Gruplar';
var KORUNAN = /^(ogretmen|teslim|akran)/; // öğrencilerin doğrudan yazamayacağı alanlar

function kurulum() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SHEET_ID')) {
    var ss = SpreadsheetApp.create('Okulumuzun Algoritması – Gruplar');
    var sh = ss.getSheets()[0];
    sh.setName(SAYFA_ADI);
    sh.appendRow(['Kod', 'Oluşturma', 'Şube', 'Ekip adı', 'Problem', 'Sürüm', 'Güncelleme', 'Teslim', 'Veri (JSON)']);
    sh.setFrozenRows(1);
    p.setProperty('SHEET_ID', ss.getId());
  }
  if (!p.getProperty('FOLDER_ID')) {
    var f = DriveApp.createFolder('Okulumuzun Algoritması – Ekran Görüntüleri');
    p.setProperty('FOLDER_ID', f.getId());
  }
  if (!p.getProperty('SIFRE')) {
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
    for (var i = 0; i < 8; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
    p.setProperty('SIFRE', s);
  }
  MailApp.getRemainingDailyQuota(); // mail iznini şimdi iste
  Logger.log('Kurulum tamam.');
  Logger.log('ÖĞRETMEN PANELİ ŞİFRESİ: ' + p.getProperty('SIFRE'));
  Logger.log('E-tablo: https://docs.google.com/spreadsheets/d/' + p.getProperty('SHEET_ID'));
}

/** Şifreyi değiştirmek için: aşağıdaki tırnağın içine yeni şifreyi yazıp bu fonksiyonu çalıştırın. */
function sifreDegistir() {
  var yeni = 'yeni-sifre-buraya';
  PropertiesService.getScriptProperties().setProperty('SIFRE', yeni);
  Logger.log('Yeni şifre: ' + yeni);
}

/* ---------------- HTTP ---------------- */
function doGet() { return json_({ ok: true, ad: 'Okulumuzun Algoritması API' }); }

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, hata: 'Geçersiz istek' }); }
  try {
    var islemler = { create: create_, join: join_, get: get_, patch: patch_, upload: upload_, submit: submit_,
      peek: peek_, akran: akran_, t_list: tList_, t_get: tGet_, t_grade: tGrade_ };
    var f = islemler[req.action];
    return json_(f ? f(req) : { ok: false, hata: 'Bilinmeyen işlem' });
  } catch (err) {
    return json_({ ok: false, hata: String(err && err.message || err) });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------- depolama ---------------- */
function sheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Öğretmen kurulumu yapılmamış (kurulum fonksiyonu çalıştırılmalı).');
  return SpreadsheetApp.openById(id).getSheetByName(SAYFA_ADI);
}

function findRow_(sh, code) {
  var c = CacheService.getScriptCache();
  var cached = c.get('row_' + code);
  if (cached) {
    var r = Number(cached);
    if (r <= sh.getLastRow() && sh.getRange(r, 1).getValue() === code) return r;
  }
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var codes = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < codes.length; i++) {
    if (codes[i][0] === code) { c.put('row_' + code, String(i + 2), 21600); return i + 2; }
  }
  return 0;
}

function load_(code) {
  code = String(code || '').trim().toUpperCase();
  var sh = sheet_();
  var row = findRow_(sh, code);
  if (!row) throw new Error('Bu grup kodu bulunamadı.');
  var v = sh.getRange(row, 1, 1, 9).getValues()[0];
  return { sh: sh, row: row, data: JSON.parse(v[8] || '{}'), version: Number(v[5]) || 0, submitted: v[7] };
}

function save_(g) {
  g.version += 1;
  var f = g.data.fields || {};
  g.sh.getRange(g.row, 3, 1, 7).setValues([[
    val_(f['meta.sube']), val_(f['meta.ekipAdi']), val_(f['problem']), g.version, new Date(), g.submitted || '', JSON.stringify(g.data)
  ]]);
  CacheService.getScriptCache().put('ver_' + g.data.code, String(g.version), 21600);
}

function val_(x) { return x ? x.v : ''; }
function set_(g, k, v, by) { g.data.fields[k] = { v: v, t: Date.now(), by: by || 'sistem' }; }
function lock_() { var l = LockService.getScriptLock(); l.waitLock(20000); return l; }
function uye_(g, mid) { if (!g.data.members[mid]) throw new Error('Bu grubun üyesi değilsin.'); return g.data.members[mid]; }

function newCode_() {
  var abc = 'ABCDEFGHJKLMNPRSTUVYZ23456789', s = '';
  for (var i = 0; i < 5; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function cleanName_(n) {
  n = String(n || '').trim().slice(0, 40);
  if (!n) throw new Error('Adını yazmalısın.');
  return n;
}

/* ---------------- öğrenci işlemleri ---------------- */
function create_(req) {
  var name = cleanName_(req.name);
  var l = lock_();
  try {
    var sh = sheet_();
    var code; do { code = newCode_(); } while (findRow_(sh, code));
    var mid = Utilities.getUuid().slice(0, 8);
    var data = { code: code, members: {}, fields: {} };
    data.members[mid] = { ad: name, katilma: Date.now(), kurucu: true };
    if (req.sube) data.fields['meta.sube'] = { v: String(req.sube).slice(0, 20), t: Date.now(), by: mid };
    sh.appendRow([code, new Date(), req.sube || '', '', '', 1, new Date(), '', JSON.stringify(data)]);
    CacheService.getScriptCache().put('ver_' + code, '1', 21600);
    return { ok: true, code: code, memberId: mid, data: data, version: 1 };
  } finally { l.releaseLock(); }
}

function join_(req) {
  var name = cleanName_(req.name);
  var l = lock_();
  try {
    var g = load_(req.code);
    var mid = null;
    for (var k in g.data.members) if (g.data.members[k].ad.toLowerCase() === name.toLowerCase()) mid = k; // aynı ad = aynı kişi
    if (!mid) {
      if (Object.keys(g.data.members).length >= 5) throw new Error('Bu grup dolu (en fazla 5 kişi).');
      mid = Utilities.getUuid().slice(0, 8);
      g.data.members[mid] = { ad: name, katilma: Date.now() };
      save_(g);
    }
    return { ok: true, code: g.data.code, memberId: mid, data: g.data, version: g.version };
  } finally { l.releaseLock(); }
}

function presence_(code, mid, focus) {
  var c = CacheService.getScriptCache();
  var p = JSON.parse(c.get('pres_' + code) || '{}');
  if (mid) p[mid] = { seen: Date.now(), focus: focus || '' };
  c.put('pres_' + code, JSON.stringify(p), 21600);
  return p;
}

function get_(req) {
  var code = String(req.code || '').toUpperCase();
  var pres = presence_(code, req.memberId, req.focus);
  var cv = CacheService.getScriptCache().get('ver_' + code);
  if (cv && Number(cv) === Number(req.version)) return { ok: true, same: true, version: Number(cv), presence: pres };
  var g = load_(code);
  return { ok: true, version: g.version, data: g.data, presence: pres };
}

function patch_(req) {
  var ch = req.changes || {};
  var l = lock_();
  try {
    var g = load_(req.code);
    uye_(g, req.memberId);
    for (var k in ch) {
      if (!/^[a-zA-Z0-9_.]{1,40}$/.test(k) || KORUNAN.test(k)) continue;
      var v = ch[k];
      if (typeof v === 'string') v = v.slice(0, 3000);
      set_(g, k, v, req.memberId);
    }
    save_(g);
    return { ok: true, version: g.version, data: g.data };
  } finally { l.releaseLock(); }
}

function upload_(req) {
  var slot = String(req.slot || '');
  if (!/^(diyagram|calisir|ek)$/.test(slot)) throw new Error('Geçersiz alan');
  var m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(req.dataUrl || '');
  if (!m) throw new Error('Yalnızca resim yüklenebilir.');
  var bytes = Utilities.base64Decode(m[3]);
  if (bytes.length > 4 * 1024 * 1024) throw new Error('Resim çok büyük.');
  var code = String(req.code || '').toUpperCase();
  uye_(load_(code), req.memberId);
  var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  var file = folder.createFile(Utilities.newBlob(bytes, m[1], code + '_' + slot + '_' + Date.now() + '.' + (m[2] === 'jpeg' ? 'jpg' : m[2])));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var info = { id: file.getId(), url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600' };
  var ch = {}; ch['img.' + slot] = info;
  patch_({ code: code, memberId: req.memberId, changes: ch });
  return { ok: true, img: info };
}

/** Takas: karşı ekibin çalışmasını görmek için (yalnızca bir grubun üyesi görebilir). */
function peek_(req) {
  uye_(load_(req.code), req.memberId);
  var h = load_(req.hedef);
  if (h.data.code === String(req.code).toUpperCase()) throw new Error('Kendi grubunuzun kodunu girdiniz.');
  var f = h.data.fields, v = function (k) { return f[k] ? f[k].v : ''; };
  var alg = [];
  for (var i = 0; i < 12; i++) if (v('alg.' + i)) alg.push(v('alg.' + i));
  return { ok: true, code: h.data.code, ekipAdi: v('meta.ekipAdi'), sube: v('meta.sube'), problem: v('problem'), kendiAd: v('kendi.ad'),
    gic: { girdi: v('gic.girdi'), islem: v('gic.islem'), cikti: v('gic.cikti') }, alg: alg,
    img: { diyagram: v('img.diyagram'), calisir: v('img.calisir') } };
}

/** Takas: karşı ekibe geri bildirim yaz (onların sayfasında görünür). */
function akran_(req) {
  var metin = String(req.metin || '').trim().slice(0, 1500), oneri = String(req.oneri || '').trim().slice(0, 1500);
  if (metin.length < 5) throw new Error('Geri bildirimi biraz daha ayrıntılı yazın.');
  var l = lock_();
  try {
    var g = load_(req.code), yazan = uye_(g, req.memberId);
    var h = load_(req.hedef);
    if (h.data.code === g.data.code) throw new Error('Kendi grubunuza geri bildirim veremezsiniz.');
    set_(h, 'akran.' + g.data.code, { ekip: val_(g.data.fields['meta.ekipAdi']) || g.data.code, yazan: yazan.ad, metin: metin, oneri: oneri, zaman: Date.now() }, 'akran');
    save_(h);
    g = load_(req.code); // h ile aynı satır değil; tazele
    set_(g, 'akranVerilen', { hedef: h.data.code, ekip: val_(h.data.fields['meta.ekipAdi']) || h.data.code, zaman: Date.now(), yazan: yazan.ad }, req.memberId);
    save_(g);
    return { ok: true, version: g.version, data: g.data };
  } finally { l.releaseLock(); }
}

/* ---------------- teslim ---------------- */
function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function submit_(req) {
  var l = lock_(), g;
  try {
    g = load_(req.code);
    var kim = uye_(g, req.memberId);
    g.submitted = new Date();
    set_(g, 'teslim', { zaman: Date.now(), by: kim.ad }, req.memberId);
    var og = val_(g.data.fields['ogretmen']);
    if (og && og.durum === 'duzeltme') { og.durum = 'yeniden'; set_(g, 'ogretmen', og, 'ogretmen'); }
    save_(g);
  } finally { l.releaseLock(); }

  var code = g.data.code, f = g.data.fields, val = function (k) { return f[k] ? f[k].v : ''; };
  var members = g.data.members, ad = function (id) { return members[id] ? members[id].ad : ''; };
  var rep = req.report || {};
  var inline = {}, attach = [], imgsHtml = '';
  ['diyagram', 'calisir', 'ek'].forEach(function (s) {
    var im = val('img.' + s);
    if (im && im.id) {
      try {
        var blob = DriveApp.getFileById(im.id).getBlob();
        inline['img_' + s] = blob;
        imgsHtml += '<h3 style="color:#341f78">' + { diyagram: 'Akış diyagramı', calisir: 'Program çalışırken', ek: 'Ek görüntü' }[s] +
          '</h3><img src="cid:img_' + s + '" style="max-width:100%;border:1px solid #ccc;border-radius:8px">';
        attach.push(blob.copyBlob().setName(code + '_' + s + '.' + (blob.getContentType() === 'image/png' ? 'png' : 'jpg')));
      } catch (e) { imgsHtml += '<p>(' + s + ' görüntüsü okunamadı)</p>'; }
    }
  });
  var rows = function (pairs) {
    return '<table style="border-collapse:collapse;width:100%;font-size:14px">' + pairs.map(function (p) {
      return '<tr><td style="border:1px solid #ddd;padding:6px;background:#f4f2ff;width:30%;vertical-align:top"><b>' + esc_(p[0]) +
        '</b></td><td style="border:1px solid #ddd;padding:6px;vertical-align:top">' + esc_(p[1]) + '</td></tr>';
    }).join('') + '</table>';
  };
  var sec = function (t) { return '<h2 style="color:#6c5ce7;border-bottom:2px solid #ffc42a;padding-bottom:4px">' + esc_(t) + '</h2>'; };
  var akranlar = Object.keys(f).filter(function (k) { return k.indexOf('akran.') === 0; }).map(function (k) { var a = f[k].v; return [a.ekip + ' (' + a.yazan + ')', a.metin + (a.oneri ? '\nÖneri: ' + a.oneri : '')]; });
  var uyeler = Object.keys(members).map(function (k) { return members[k].ad; }).join(', ');
  var html = '<div style="font-family:Arial,sans-serif;max-width:860px;color:#22184a">' +
    '<div style="background:#341f78;color:#fff;padding:16px;border-radius:12px"><div style="font-size:12px;opacity:.8">OKULUMUZUN ALGORİTMASI · TESLİM</div>' +
    '<div style="font-size:22px;font-weight:bold">' + esc_(val('meta.ekipAdi') || 'Adsız ekip') + ' · ' + esc_(val('meta.sube')) + '</div>' +
    '<div>Grup kodu: <b>' + code + '</b> · Teslim eden: ' + esc_(ad(req.memberId)) + ' · ' + Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm') + '</div>' +
    '<div style="margin-top:10px"><a href="' + PANEL_URL + '#' + code + '" style="background:#ffc42a;color:#22184a;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:bold">Öğretmen panelinde değerlendir →</a></div></div>' +
    sec('Ekip') + rows([['Üyeler', uyeler]].concat((rep.roller || []).map(function (r) { return [r.rol, '1. ders: ' + ad(val(r.k1)) + ' · 2. ders: ' + ad(val(r.k2))]; }))) +
    sec('Problem') + rows([['Seçilen problem', rep.problemAdi || val('problem')], ['Açıklama', rep.problemAciklama || '']]) +
    sec('Girdi – İşlem – Çıktı') + rows([['Girdi', val('gic.girdi')], ['İşlem', val('gic.islem')], ['Çıktı', val('gic.cikti')]]) +
    sec('Değişkenler') + rows((rep.degiskenler || []).map(function (i) { return [val('var.' + i + '.ad') + ' (' + val('var.' + i + '.tur') + ')', val('var.' + i + '.aciklama')]; })) +
    sec('Algoritma (cümlelerle)') + '<ol>' + (rep.adimlar || []).map(function (i) { return '<li>' + esc_(val('alg.' + i)) + '</li>'; }).join('') + '</ol>' +
    sec('Tasarım gerekçesi') + rows([['Karar yapısı', val('ger.karar')], ['Döngü', val('ger.dongu')]]) +
    sec('Test tablosu') + '<table style="border-collapse:collapse;width:100%;font-size:13px"><tr style="background:#efedff">' +
    ['Test türü', 'Girdi', 'Beklenen', 'Gerçek', 'Doğru mu?', 'Düzeltme'].map(function (h) { return '<th style="border:1px solid #ddd;padding:5px;text-align:left">' + h + '</th>'; }).join('') + '</tr>' +
    (rep.testler || []).map(function (t) {
      return '<tr><td style="border:1px solid #ddd;padding:5px"><b>' + esc_(t.tur) + '</b></td>' + ['girdi', 'beklenen', 'gercek', 'dogru', 'duzeltme'].map(function (c) {
        return '<td style="border:1px solid #ddd;padding:5px">' + esc_(val('test.' + t.i + '.' + c)) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</table>' +
    sec('Kontrol listesi') + '<ul>' + (rep.kontrol || []).map(function (c, i) { return '<li>' + (val('chk.' + i) ? '✅ ' : '⬜ ') + esc_(c) + '</li>'; }).join('') + '</ul>' +
    sec('Takas ve iyileştirme') + rows(akranlar.concat([['Sözlü geri bildirim', val('takas.geribildirim')], ['Yaptığımız düzeltme', val('takas.duzeltme')],
      ['Bizim geri bildirim verdiğimiz ekip', (val('akranVerilen') || {}).ekip || val('takas.ekip')]])) +
    sec('AkışLab ekran görüntüleri') + (imgsHtml || '<p>Görüntü yok.</p>') +
    '<p style="color:#888;font-size:12px;margin-top:24px">© 2026 Sunay\'s School · Tüm hakları Sunay Öğretmen\'e aittir.</p></div>';

  var to = OGRETMEN_EPOSTA || Session.getEffectiveUser().getEmail();
  var subject = '[Algoritma Etkinliği] ' + (val('meta.sube') || '') + ' – ' + (val('meta.ekipAdi') || code) + ' – ' + (rep.problemAdi || '');
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, inlineImages: inline, attachments: attach, name: 'Okulumuzun Algoritması' });
  return { ok: true, zaman: Date.now() };
}

/* ---------------- öğretmen işlemleri ---------------- */
function sifre_(req) {
  var s = PropertiesService.getScriptProperties().getProperty('SIFRE');
  if (!s || String(req.sifre || '') !== s) throw new Error('Şifre yanlış.');
}

function tList_(req) {
  sifre_(req);
  var sh = sheet_(), last = sh.getLastRow();
  if (last < 2) return { ok: true, gruplar: [] };
  var vals = sh.getRange(2, 1, last - 1, 9).getValues();
  var out = vals.map(function (r) {
    var d = {}; try { d = JSON.parse(r[8] || '{}'); } catch (e) {}
    var f = d.fields || {}, v = function (k) { return f[k] ? f[k].v : ''; };
    var akranSay = Object.keys(f).filter(function (k) { return k.indexOf('akran.') === 0; }).length;
    var dolu = ['gic.girdi', 'gic.islem', 'gic.cikti', 'var.0.ad', 'var.1.ad', 'alg.0', 'alg.3', 'ger.karar', 'ger.dongu', 'test.0.gercek', 'test.1.gercek', 'test.2.gercek', 'takas.duzeltme']
      .filter(function (k) { return v(k) !== '' && v(k) != null; }).length + (v('img.calisir') ? 2 : 0) + (v('problem') ? 1 : 0);
    var t = r[6] instanceof Date ? r[6].getTime() : (r[6] ? new Date(r[6]).getTime() : 0);
    return { code: r[0], sube: v('meta.sube'), ekipAdi: v('meta.ekipAdi'), problem: v('problem'), kendiAd: v('kendi.ad'),
      uyeler: Object.keys(d.members || {}).map(function (k) { return d.members[k].ad; }),
      guncelleme: t, teslim: v('teslim'), ogretmen: v('ogretmen'), akranSay: akranSay, verdi: !!v('akranVerilen'), ilerleme: Math.round(dolu / 16 * 100) };
  });
  return { ok: true, gruplar: out };
}

function tGet_(req) {
  sifre_(req);
  var g = load_(req.code);
  return { ok: true, data: g.data, version: g.version };
}

function tGrade_(req) {
  sifre_(req);
  var p = req.puanlar || {}, top = 0;
  ['parca', 'alg', 'test', 'iyi'].forEach(function (k) { var n = Number(p[k]) || 0; p[k] = Math.max(0, Math.min(4, n)); top += p[k]; });
  var durum = req.durum === 'duzeltme' ? 'duzeltme' : 'degerlendirildi';
  var l = lock_();
  try {
    var g = load_(req.code);
    set_(g, 'ogretmen', { puanlar: p, toplam: top, yorum: String(req.yorum || '').slice(0, 3000), durum: durum, zaman: Date.now() }, 'ogretmen');
    save_(g);
    return { ok: true, version: g.version, data: g.data };
  } finally { l.releaseLock(); }
}
