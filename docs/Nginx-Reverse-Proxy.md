# Nginx Tersine Vekil (Reverse Proxy) & Backend Güvenlik Sertleştirmesi

Bu plan, uygulamamızı profesyonel **Tersine Vekil (Reverse Proxy)** mimarisine geçirerek port karmaşasını ortadan kaldıracak, CORS engelini kökten çözecek ve Backend API'yi internete tamamen kapatacaktır.

---

## 🎯 Hedeflenen Mimari Değişim

```text
[ÖNCEKİ DURUM]
Tarayıcı ──:8081──> Frontend (Nginx)
Tarayıcı ──:5001──> Backend (Node.js)  <-- DIŞARIYA AÇIK (GÜVENLİK AÇIĞI)

[YENİ DURUM]
Tarayıcı ──:80───> Nginx (Reverse Proxy)
                     ├── "/"       ──> Statik Web Sitesi (HTML/CSS/JS)
                     └── "/api/*"  ──> Docker İç Ağı (http://backend:5000)
                                          │
                                       Backend (Node.js) <-- DIŞ DÜNYAYA KAPALI!
```

---

## 📚 Öğrenilecek Temel Kavramlar (Eğitim Odaklı)

1. **Reverse Proxy (Tersine Vekil) Nedir?**: İstemci ile sunucular arasına girerek gelen istekleri doğru servislere yönlendiren kapı bekçisi.
2. **Same-Origin Policy (Aynı Köken İlkesi) & Sıfır CORS**: Frontend ve Backend aynı domain ve portta buluştuğunda tarayıcı CORS kısıtlamalarını tamamen devre dışı bırakır.
3. **Docker Dahili DNS (`http://backend:5000`)**: Docker Compose ağlarında konteynırların IP yerine doğrudan servis adlarıyla konuşması.
4. **En Düşük Yetki & Yüzey Alanını Daraltma (Attack Surface Reduction)**: Sadece gerekli portu (80) açıp, veritabanı ve backend portlarını dış dünyaya kilitlemek.

---

## 🛠️ Yapılacak Değişiklikler

### 1. Nginx Yapılandırması (`frontend/nginx.conf`) [YENİ]
* Nginx'in varsayılan ayarı yerine özel bir yapılandırma yazacağız:
  * Port 80'i dinleyecek.
  * `/` isteklerini `/usr/share/nginx/html` klasöründen sunacak.
  * `/api/` ile başlayan tüm istekleri Docker iç ağındaki `http://backend:5000` adresine yönlendirecek (`proxy_pass`).

### 2. Frontend Dockerfile (`frontend/Dockerfile`) [GÜNCELLEME]
* Yazdığımız `nginx.conf` dosyasını konteynırın `/etc/nginx/conf.d/default.conf` konumuna kopyalayacak.

### 3. Frontend Kodları (`frontend/app.js` & `index.html`) [GÜNCELLEME]
* Artık `http://<YOUR_VPS_IP>:5001` gibi karmaşık adreslere gerek kalmayacak.
* İstekler doğrudan göreceli yol (`relative path`) olacak: `/api/health`, `/api/notes`.

### 4. Docker Compose Dosyaları (`docker-compose.prod.yml` & `docker-compose.yml`) [GÜNCELLEME]
* **Backend:** `ports:` bölümü tamamen kaldırılacak! Backend sadece Docker iç ağında (`db` ve `frontend` ile) konuşacak.
* **Frontend:** Dışarıya standart `80:80` portuyla açılacak.

### 5. Dokümantasyon (`docs/neleryaptik.md`) [GÜNCELLEME]
* Aşama 18 olarak tüm adımlar, Reverse Proxy mantığı ve mülakat soruları eklenecek.

---

## 🧪 Doğrulama Planı

1. **Lokal Doğrulama:**
   * Değişiklikleri Git'e commit edip push edeceğiz.
2. **CI/CD Otomasyonu:**
   * GitHub Actions imajları derleyecek, Docker Hub'a basacak ve VPS'e SSH ile dağıtacak.
3. **Canlı Sunucu Doğrulaması (VPS):**
   * Tarayıcıda hiçbir port yazmadan doğrudan `http://<YOUR_VPS_IP>` açılacak.
   * `http://<YOUR_VPS_IP>:5001/api/health` adresine gidildiğinde bağlantının reddedildiği (portun dışarıya kapandığı) teyit edilecek.
   * Arayüzden not ekleme/listeleme yapılarak Nginx'in istekleri arkadaki gizli backend'e kusursuz ilettiği doğrulanacak.
