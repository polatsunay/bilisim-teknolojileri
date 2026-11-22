# Okulumuzun Algoritması – Kurulum

9. sınıf algoritma etkinliği: ekipler okuldan bir problem seçer, algoritmasını AkışLab'de kurar, test eder, karşı ekiple geri bildirim alışverişi yapar ve öğretmene gönderir.

| Sayfa | Adres |
| --- | --- |
| Öğrenci sayfası | `https://polatsunay.github.io/bilisim-teknolojileri/algoritma-etkinligi/` |
| Öğretmen paneli | `https://polatsunay.github.io/bilisim-teknolojileri/algoritma-etkinligi/ogretmen.html` |

`API_URL` boşken iki sayfa da **deneme modunda** çalışır: veriler yalnızca o tarayıcıda tutulur, mail gitmez, panel şifresi `1234`'tür.

## Gerçek kullanım için (bir kez, ~10 dakika)

1. [script.google.com](https://script.google.com) → **Yeni proje** → `Code.gs` dosyasının içeriğini yapıştırın → Kaydet.
2. Fonksiyon listesinden **kurulum**'u seçin → **Çalıştır** → izinleri onaylayın.
   Yürütme günlüğünde **öğretmen paneli şifresi** yazar; not alın. Gruplar e-tablosu ve ekran görüntüleri klasörü Drive'ınızda oluşur.
3. **Dağıt → Yeni dağıtım → Web uygulaması**. Yürütme: *Ben*, Erişim: *Herkes* → Dağıt → URL'yi kopyalayın.
4. Bu klasördeki `ortak.js` dosyasında `const API_URL = '';` satırına URL'yi yapıştırıp kaydedin.

Teslimler, scripti çalıştıran Google hesabının Gmail'ine gelir (değiştirmek için `Code.gs` içindeki `OGRETMEN_EPOSTA`).
`Code.gs`'i sonradan değiştirirseniz: **Dağıt → Dağıtımları yönet → Düzenle → Sürüm: Yeni sürüm**.

## Akış

1. Ekipten bir öğrenci grubu oluşturur, 5 harfli kodu arkadaşlarına verir; diğerleri kodla katılır (en fazla 5 kişi). Herkes aynı kaydı canlı doldurur.
2. Takas: ekipler birbirinin kodunu girip karşı ekibin çalışmasını görür ve geri bildirim yazar; geri bildirim karşı ekibin sayfasına düşer.
3. Teslim: eksikler ve "program çalışırken" ekran görüntüsü kontrol edilir, öğretmene mail gider.
4. Öğretmen panelinden rubrikle puanlar, not yazar ya da düzeltme ister; öğrenciler sonucu kendi sayfalarının en üstünde görür.

© 2026 Sunay's School – Tüm hakları saklıdır.
