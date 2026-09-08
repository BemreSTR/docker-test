
# CI Pipeline'ına Otomatik Test & Güvenlik Taraması (DevSecOps) Uygulama Planı

Bu plan, CI/CD boru hattımızı profesyonel **DevSecOps (Geliştirme + Güvenlik + Operasyon)** standartlarına taşıyarak hatalı kodların ve güvenlik açığı barındıran imajların canlı prodüksiyon ortamına sızmasını engelleyen **Otomatik Kalite ve Güvenlik Kapıları (Quality & Security Gates)** kuracaktır.

---

## 🎯 Neden-Sonuç Analizi (Mevcut Riskler ve Çözümler)

| Mevcut Durum (Risk) | Neden Tehlikeli? | Ekleyeceğimiz Çözüm | Sonuç (Kazanım) |
| :--- | :--- | :--- | :--- |
| **Test Yok:** Kodda yazım veya mantık hatası olsa bile doğrudan derlenip canlıya atılıyor. | Bir yazılımcı yanlışlıkla bir virgülü unuttuğunda canlı sunucu çöker ve müşteriler hizmet alamaz (**Downtime**). | **Otomatik Birim Testleri (`npm test`):** Derleme öncesinde tüm fonksiyonlar test edilir. | Test başarısız olursa boru hattı **derhal durdurulur**. Canlı sunucuya asla dokunulmaz; eski çalışan sürüm yayında kalır. |
| **Güvenlik Taraması Yok:** İmaj içindeki Linux paketlerinde veya npm modüllerinde açıklar olabilir. | Hacker'lar bilinen bir kütüphane açığıyla (CVE) sunucuya sızabilir. | **Trivy Güvenlik Taraması:** İmaj derlendikten sonra otomatik zafiyet taramasından geçirilir. | Kritik açıklar önceden tespit edilir ve güvenlik raporu üretilir (**Shift-Left Security**). |

---

## 🏗️ Yeni DevSecOps Akış Şeması

```text
[Geliştirici: git push]
       │
       ▼
1. Aşama: Kodları Çek (Checkout)
       │
       ▼
2. Aşama: 🧪 OTOMATİK TEST KAPISI (Quality Gate)
   ├── npm test çalıştır
   ├── Başarısız ise ──❌ BORU HATTI DURUR! (Canlıya dokunulmaz!)
   └── Başarılı ise  ──✅ Devam et
       │
       ▼
3. Aşama: 🛡️ GÜVENLİK TARAMASI (Trivy Security Scan)
   ├── Docker İmajlarını tara (CVE / Zafiyet Analizi)
   └── Güvenlik raporu oluştur
       │
       ▼
4. Aşama: Docker Hub'a Push Et
       │
       ▼
5. Aşama: VPS'e SSH ile Canlı Dağıtım (Full CD)
```

---

## 🛠️ Yapılacak Somut Değişiklikler

### 1. Backend Kodunun Test Edilebilir Hale Getirilmesi (`backend/server.js` & `backend/app.js`)
* **Neden:** `server.js` içinde `app.listen()` doğrudan çağrıldığı için dosya `require` edildiğinde sunucu hemen ayağa kalkmaya çalışır ve testleri kilitler.
* **Ne Yapacağız:** Express uygulamasını (`app`) ayrı bir modül olarak dışa aktaracağız (`module.exports = app`). `server.js` sadece dinlemeyi başlatacak.

### 2. Backend Test Paketi Yazılması (`backend/test/api.test.js`)
* Node.js'in modern yerleşik test motorunu (`node:test` ve `node:assert`) ve hafif `supertest` kütüphanesini kullanarak:
  * `GET /api/health` endpoint'inin 200 dönüp dönmediğini,
  * `POST /api/notes` eksik parametre gönderildiğinde 400 Bad Request verip vermediğini test edeceğiz.
* `backend/package.json` dosyasına `"test": "node --test"` script'ini ekleyeceğiz.

### 3. GitHub Actions Pipeline Güncellemesi (`.github/workflows/deploy.yml`)
* **Yeni Adım 1:** Node.js ortamı kur ve `npm test` çalıştır.
* **Yeni Adım 2 (Trivy Scan):** `aquasecurity/trivy-action` kullanarak üretilen imajı güvenlik açıkları için tara ve GitHub paneline özet bas.
* Sadece bu test ve tarama aşamaları **yeşil (başarılı)** olursa imajlar Docker Hub'a push edilip canlı sunucuya dağıtılacak!

### 4. Dokümantasyon (`docs/neleryaptik.md`)
* 19. Aşama: DevSecOps & Otomatik Test / Güvenlik Taraması.
* Neden-sonuç ilkeleri ve mülakat soruları eklenecek.

---

## 🧪 Doğrulama Planı

1. **Başarılı Akış Testi:**
   * Testler geçer ➔ İmaj taranır ➔ Canlıya sorunsuz dağıtılır.
2. **Kasıtlı Hata (Bozuk Kod) Testi:**
   * Bir testi bilerek bozacağız (veya kodda hata yapacağız).
   * GitHub Actions'ın kırmızı yanarak derlemeyi durdurduğunu ve canlı sunucudaki sitemizin hiç etkilenmeden tıkır tıkır çalışmaya devam ettiğini bizzat göreceğiz!
