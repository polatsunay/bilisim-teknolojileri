// Okulumuzun Algoritması – öğrenci ve öğretmen sayfalarının ortak kodu · © 2026 Sunay's School

/* ===== AYAR ===== */
// Öğretmen: Apps Script web uygulaması URL'sini tırnakların arasına yapıştırın.
// Boş bırakılırsa sayfalar DENEME MODUNDA çalışır (veriler yalnızca bu tarayıcıda, mail gitmez, panel şifresi: 1234).
const API_URL = '';

const DEMO = !API_URL;

const ROLLER = [
  { id: 'tasarimci', ad: 'Tasarımcı', is: 'AkışLab\'de şekilleri ekler' },
  { id: 'analist', ad: 'Analist', is: 'Girdi–İşlem–Çıktı ve değişkenler' },
  { id: 'testci', ad: 'Testçi', is: 'Testleri yazar ve çalıştırır' }
];
const TURLER = ['Tamsayı', 'Gerçek sayı', 'Metin', 'Mantıksal'];
const DEG_SAYI = 6, ALG_SAYI = 10;
const TESTLER = [{ i: 0, tur: 'Normal' }, { i: 1, tur: 'Sınır' }, { i: 2, tur: 'Hatalı girdi' }, { i: 3, tur: 'Ek test' }];
const KONTROL = [
  'Başla ve Bitir şekilleri var, aradaki tüm oklar doğru yönde.',
  'Tüm değişkenler kullanılmadan önce Tanımla şekliyle tanımlanmış.',
  'En az 1 Girdi ve en az 1 Çıktı var; kullanıcıya ne gireceğini söyleyen mesajlar var.',
  'En az 1 karar yapısı (Eğer) var.',
  'En az 1 döngü (While veya For) var.',
  'Program, test tablosundaki 3 testin üçünde de beklenen sonucu veriyor.'
];

const RUBRIK = [
  { id: 'parca', ad: 'Problemi parçalama', d: ['Tablo eksik ya da yok', 'Birkaç eksik ya da hatalı değişken türü var', 'Küçük bir eksik var', 'Girdi, işlem, çıktı ve tüm değişkenler eksiksiz ve doğru'] },
  { id: 'alg', ad: 'Algoritma ve kontrol yapıları', d: ['Diyagram çalışmıyor', 'Karar ya da döngüden biri eksik veya yanlış yerde', 'İkisi de var, gerekçe zayıf', 'Karar ve döngü doğru yerde, gerekçesi açık'] },
  { id: 'test', ad: 'Test', d: ['Test yapılmamış', 'Yalnızca normal durum test edilmiş', '3 test var, biri zayıf', '3 test türü de var, sınır değeri doğru seçilmiş'] },
  { id: 'iyi', ad: 'İyileştirme', d: ['Takas yapılmamış', 'Geri bildirim alınmış, düzeltme yok', 'Düzeltme var, açıklama eksik', 'Geri bildirime göre düzeltme yapılmış ve açıklanmış'] }
];
const SEVIYE = ['', 'Başlangıç', 'Gelişmekte', 'İyi', 'Çok iyi'];

const LS = (() => { try { localStorage.setItem('_oa', '1'); localStorage.removeItem('_oa'); return localStorage; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function problemAdi(id, kendiAd) { const p = (window.PROBLEMLER || []).find(x => x.id === id); if (!p) return ''; return p.kendi ? 'Kendi problemi: ' + (kendiAd || '') : p.ikon + ' ' + p.ad; }

async function api(action, payload) {
  if (DEMO) return demoApi(action, JSON.parse(JSON.stringify(payload || {})));
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.hata || 'Sunucu hatası');
  return j;
}

/* ===== DENEME MODU: aynı tarayıcıdaki sekmeler arasında paylaşım ===== */
const kanal = ('BroadcastChannel' in window) ? new BroadcastChannel('oa_demo') : null;
function demoOku() { try { return JSON.parse(LS.getItem('oa_demo') || '{}'); } catch (e) { return {}; } }
function demoYaz(db) { LS.setItem('oa_demo', JSON.stringify(db)); if (kanal) kanal.postMessage(1); }
const KORUNAN = /^(ogretmen|teslim|akran)/;
function demoApi(action, p) {
  const db = demoOku(); const now = Date.now(); const yeniId = () => Math.random().toString(36).slice(2, 10);
  const bul = c => { const g = db[String(c || '').trim().toUpperCase()]; if (!g) throw new Error('Bu grup kodu bulunamadı.'); return g; };
  const uye = (g, mid) => { if (!g.data.members[mid]) throw new Error('Bu grubun üyesi değilsin.'); return g.data.members[mid]; };
  const set = (g, k, v, by) => { g.data.fields[k] = { v, t: now, by }; g.version++; };
  const v = (g, k) => g.data.fields[k] ? g.data.fields[k].v : '';
  const sifre = () => { if (p.sifre !== '1234') throw new Error('Şifre yanlış. (Deneme modunda şifre: 1234)'); };
  switch (action) {
    case 'create': {
      let code; const abc = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
      do { code = Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join(''); } while (db[code]);
      const mid = yeniId(); const data = { code, members: { [mid]: { ad: p.name, katilma: now, kurucu: true } }, fields: {} };
      if (p.sube) data.fields['meta.sube'] = { v: p.sube, t: now, by: mid };
      db[code] = { data, version: 1 }; demoYaz(db);
      return { ok: true, code, memberId: mid, data, version: 1 };
    }
    case 'join': {
      const g = bul(p.code);
      let mid = Object.keys(g.data.members).find(k => g.data.members[k].ad.toLowerCase() === p.name.toLowerCase());
      if (!mid) { if (Object.keys(g.data.members).length >= 5) throw new Error('Bu grup dolu (en fazla 5 kişi).'); mid = yeniId(); g.data.members[mid] = { ad: p.name, katilma: now }; g.version++; demoYaz(db); }
      return { ok: true, code: g.data.code, memberId: mid, data: g.data, version: g.version };
    }
    case 'get': {
      const g = bul(p.code); const k = 'oa_pres_' + g.data.code;
      let pres = {}; try { pres = JSON.parse(LS.getItem(k) || '{}'); } catch (e) {}
      if (p.memberId) pres[p.memberId] = { seen: now, focus: p.focus || '' }; LS.setItem(k, JSON.stringify(pres));
      if (g.version === p.version) return { ok: true, same: true, version: g.version, presence: pres };
      return { ok: true, version: g.version, data: g.data, presence: pres };
    }
    case 'patch': {
      const g = bul(p.code); uye(g, p.memberId);
      for (const k in p.changes) if (!KORUNAN.test(k)) g.data.fields[k] = { v: p.changes[k], t: now, by: p.memberId };
      g.version++; demoYaz(db); return { ok: true, version: g.version, data: g.data };
    }
    case 'upload': {
      const g = bul(p.code); uye(g, p.memberId); const img = { url: p.dataUrl, id: 'demo' };
      set(g, 'img.' + p.slot, img, p.memberId); demoYaz(db); return { ok: true, img };
    }
    case 'submit': {
      const g = bul(p.code); const kim = uye(g, p.memberId);
      set(g, 'teslim', { zaman: now, by: kim.ad }, p.memberId);
      const og = v(g, 'ogretmen'); if (og && og.durum === 'duzeltme') { og.durum = 'yeniden'; set(g, 'ogretmen', og, 'ogretmen'); }
      demoYaz(db); return { ok: true, zaman: now, demo: true };
    }
    case 'peek': {
      uye(bul(p.code), p.memberId); const h = bul(p.hedef);
      if (h.data.code === String(p.code).toUpperCase()) throw new Error('Kendi grubunuzun kodunu girdiniz.');
      const alg = []; for (let i = 0; i < 12; i++) if (v(h, 'alg.' + i)) alg.push(v(h, 'alg.' + i));
      return { ok: true, code: h.data.code, ekipAdi: v(h, 'meta.ekipAdi'), sube: v(h, 'meta.sube'), problem: v(h, 'problem'), kendiAd: v(h, 'kendi.ad'),
        gic: { girdi: v(h, 'gic.girdi'), islem: v(h, 'gic.islem'), cikti: v(h, 'gic.cikti') }, alg, img: { diyagram: v(h, 'img.diyagram'), calisir: v(h, 'img.calisir') } };
    }
    case 'akran': {
      const g = bul(p.code); const yazan = uye(g, p.memberId); const h = bul(p.hedef);
      if (h === g) throw new Error('Kendi grubunuza geri bildirim veremezsiniz.');
      if (String(p.metin || '').trim().length < 5) throw new Error('Geri bildirimi biraz daha ayrıntılı yazın.');
      set(h, 'akran.' + g.data.code, { ekip: v(g, 'meta.ekipAdi') || g.data.code, yazan: yazan.ad, metin: p.metin, oneri: p.oneri || '', zaman: now }, 'akran');
      set(g, 'akranVerilen', { hedef: h.data.code, ekip: v(h, 'meta.ekipAdi') || h.data.code, zaman: now, yazan: yazan.ad }, p.memberId);
      demoYaz(db); return { ok: true, version: g.version, data: g.data };
    }
    case 't_list': {
      sifre();
      return { ok: true, gruplar: Object.values(db).map(g => {
        const f = g.data.fields; const say = ['gic.girdi', 'gic.islem', 'gic.cikti', 'var.0.ad', 'var.1.ad', 'alg.0', 'alg.3', 'ger.karar', 'ger.dongu', 'test.0.gercek', 'test.1.gercek', 'test.2.gercek', 'takas.duzeltme'].filter(k => v(g, k)).length + (v(g, 'img.calisir') ? 2 : 0) + (v(g, 'problem') ? 1 : 0);
        const son = Math.max(0, ...Object.values(f).map(x => x.t || 0));
        return { code: g.data.code, sube: v(g, 'meta.sube'), ekipAdi: v(g, 'meta.ekipAdi'), problem: v(g, 'problem'), kendiAd: v(g, 'kendi.ad'),
          uyeler: Object.values(g.data.members).map(m => m.ad), guncelleme: son, teslim: v(g, 'teslim'), ogretmen: v(g, 'ogretmen'),
          akranSay: Object.keys(f).filter(k => k.startsWith('akran.')).length, verdi: !!v(g, 'akranVerilen'), ilerleme: Math.round(say / 16 * 100) };
      }) };
    }
    case 't_get': { sifre(); const g = bul(p.code); return { ok: true, data: g.data, version: g.version }; }
    case 't_grade': {
      sifre(); const g = bul(p.code); const pu = p.puanlar || {}; let top = 0;
      RUBRIK.forEach(r => { pu[r.id] = Math.max(0, Math.min(4, Number(pu[r.id]) || 0)); top += pu[r.id]; });
      set(g, 'ogretmen', { puanlar: pu, toplam: top, yorum: p.yorum || '', durum: p.durum === 'duzeltme' ? 'duzeltme' : 'degerlendirildi', zaman: now }, 'ogretmen');
      demoYaz(db); return { ok: true, version: g.version, data: g.data };
    }
  }
  throw new Error('Bilinmeyen işlem');
}
