Sırasıyla neler yaptık

### 📍 1. Faz: Çıraklık & Konteynır Temelleri (Tek Servis)
* **Neyle Başladık?** Basit bir HTML/CSS sayfasıyla.
* **Ne Öğrendik?** *"Benim bilgisayarımda çalışıyordu, sunucuda çalışmıyor"* krizine son vermeyi.
* **Ne Yaptık?** İlk `Dockerfile` dosyamızı yazdık, `nginx:alpine` tabanlı hafif bir imaj ürettik. `docker build` ve `docker run -p 8080:80` komutlarıyla kendi bilgisayarımızda ilk konteynırımızı ayağa kaldırdık.

---

### 📍 2. Faz: Çok Katmanlı Mimari (Full-Stack & Veritabanı)
* **Gereksinim:** Gerçek dünyada tek başına statik HTML yetmez; arkasında bir API ve veri saklayacak bir veritabanı gerekir.
* **Ne Yaptık?** 
  * **Backend:** Node.js + Express tabanlı bir REST API yazdık (`server.js`).
  * **Veritabanı:** Resmi `postgres:16-alpine` imajını sisteme dahil ettik.
  * **Ağ (Bridge Network):** Konteynırların birbiriyle konuşabilmesi için sanal bir köprü ağı kurduk (`docker network create`).
  * **Kalıcı Veri Kasası (Volume):** Konteynır kapandığında verilerin silinmemesi için `pg_verisi` adında bir Docker Volume oluşturup PostgreSQL'e bağladık.

---

### 📍 3. Faz: Orkestrasyon (Docker Compose)
* **Sorun:** Terminalde her seferinde 3 tane uzun `docker run` komutunu parametreleriyle ezbere yazmak bir eziyetti ve hata yapmaya çok açıktı.
* **Çözüm:** **Docker Compose (`docker-compose.yml`)** yazdık.
* **Kazanım:** Tek bir `docker compose up -d` komutuyla Frontend, Backend ve PostgreSQL'in doğru sırayla (`depends_on`), aynı ağda ve doğru portlarla otomatik açılmasını sağladık.

---

### 📍 4. Faz: Production Güvenlik Sertleştirmesi (12-Factor App)
* **Tehlike:** Şifreleri `docker-compose.yml` içine açıkça yazmak (`POSTGRES_PASSWORD: secret`) büyük bir güvenlik açığıydı.
* **Çözüm (Üçlü Kalkan):**
  1. Gerçek şifreleri **`.env`** dosyasına koyduk.
  2. Git'e şifre sızmasın diye **`.gitignore`** dosyasına `.env`'yi ekledik.
  3. Yeni yazılımcılar için şablon olarak **`.env.example`** dosyasını repoya koyduk.
* **Non-Root Kullanıcı:** Backend Dockerfile'ında `USER node` satırıyla konteynırı `root` (en yetkili) kullanıcısından alıp sıradan kullanıcıya devrettik (En Düşük Yetki Prensibi).

---

### 📍 5. Faz: İmajları Buluta Taşımak (Docker Hub Registry)
* **Amaç:** Kodları sadece kendi Mac bilgisayarımızda tutmaktan çıkarıp tüm dünyanın erişebileceği bir depoya yüklemek.
* **Ne Yaptık?**
  * `docker login` ile Docker Hub hesabına (`bemres`) bağlandık.
  * İmajlarımızı etiketledik: `bemres/devops-backend:1.0.0` ve `bemres/devops-frontend:1.0.0`.
  * `docker push` komutuyla imajları Docker Hub bulutuna fırlattık.

---

### 📍 6. Faz: Dev vs. Prod Reçetesi Ayrımı (`docker-compose.prod.yml`)
* **DevOps Kuralı:** Canlı sunucuya kaynak kodlar (`.js`, `Dockerfile`) kopyalanmaz; sunucu derleme çilesiyle yorulmaz.
* **Ne Yaptık?** Canlı sunucu için `docker-compose.prod.yml` hazırladık. İçinde hiçbir `build:` adımı yoktu; doğrudan Docker Hub'daki mühürlü hazır imajları çekiyordu.

---

### 📍 7. Faz: Sürekli Entegrasyon (CI - GitHub Actions)
* **Sorun:** Kodda her 1 satır değiştiğinde bilgisayarda `docker build` ve `docker push` beklemek amelelikti.
* **Çözüm:** Depomuza `.github/workflows/deploy.yml` dosyasını ekledik.
* **Otomasyon:** Sen sadece `git push origin main` yaptığında, GitHub bulutunda temiz bir Ubuntu makinesi açılıp kodları çekiyor, Docker Hub'a giriş yapıyor ve yeni imajları otomatik derleyip yüklüyordu.

---

### 📍 8. Faz: Canlı İnternet Sunucusuna Geçiş (VPS) & Prod Krizleri
* **Adım:** Kiraladığın gerçek Ubuntu VPS sunucusuna (`<YOUR_VPS_IP>`) bağlandık ve sistemi canlıya aldık.
* **Çözülen Prod Krizleri:**
  * **Kriz 1 (`KeyError: 'ContainerConfig'`):** Ubuntu'nun eski 2021 model Python tabanlı `docker-compose 1.29.2` sürümü, modern imajları tanıyamayıp çöktü. Sunucuya modern **Docker Compose v2** kurarak çözdük.
  * **Kriz 2 (Yetim Konteynır Çakışması):** Çöken eski sürecin arkasında bıraktığı askıda kalan konteynırı `docker rm -f` ile temizledik.

---

### 📍 9. Faz: DevOps'un Zirvesi: Full Continuous Deployment (CD)
* **Soru:** *"Sunucuya hala girip elle `pull` ve `up -d` yazıyorsam CD bunun neresinde?"* dedin.
* **Çözüm:** GitHub Actions içine `appleboy/ssh-action` adımını ekledik.
* **Kazanım (Zero-Touch):** Artık sen sadece kendi bilgisayarından `git push` diyorsun; GitHub Actions imajı derliyor, ardından gizlice senin VPS'ine SSH ile bağlanıp canlıdaki siteyi güncelliyor. Sunucuya terminalden girme devri bitti!

---

### 📍 10. Faz: Kurumsal Tersine Vekil (Nginx Reverse Proxy) & İzolasyon
* **Sorunlar:** Kullanıcı `:8081` yazıyordu, Backend'in `:5001` portu hacker'lara açıktı ve CORS hataları çıkıyordu.
* **Çözüm:** Nginx'i **Tersine Vekil (Reverse Proxy)** yaptık:
  * `frontend/nginx.conf` yazdık: `/api/` isteklerini arkadaki gizli `http://backend:5000`'e yönlendirdi.
  * Backend portunu (`5001`) internete **tamamen kapattık**.
  * Kullanıcıyı standart web portu olan **Port 80**'den içeri aldık (`http://<YOUR_VPS_IP>`). CORS engeli kökten yok oldu!

---

### 📍 11. Faz: DevSecOps Kültürü: Otomatik Test (Quality Gate) & Trivy Taraması
* **Sorun:** Hatalı veya virüslü bir kod push edilirse canlı sistem çökebilirdi.
* **Çözüm (Shift-Left Güvenlik):**
  * **Birim Testleri (`npm test`):** 4 adet otomatik test yazdık. Test patlarsa boru hattı derhal duruyor, canlıya asla bozuk kod gitmiyor.
  * **Aqua Security Trivy:** Üretilen imajı CVE güvenlik açıklarına karşı otomatik tarayan robotu pipeline'a ekledik.
  * **Sıfır Açık:** `backend/package.json` içine `overrides` koyarak orta seviyeli `qs` açığını kapattık (`0 vulnerabilities`).
  * **Temizlik:** `.gitignore` ve `.dockerignore` dosyalarını elden geçirip repoyu sızdırmaz hale getirdik.

---

### 🏆 Büyük Tablo (Nereden Nereye?)

| Özellik | 1. Gün | Bugün |
| :--- | :--- | :--- |
| **Mimari** | Tek bir HTML dosyası | Nginx + Node.js API + PostgreSQL Veritabanı |
| **Çalıştırma** | Yerel bilgisayarda geçici | Canlı VPS'te 7/24 kesintisiz (Port 80) |
| **Dağıtım (Deploy)** | Tamamen manuel | `git push` ile %100 otonom (Full CD) |
| **Güvenlik** | Şifreler ortalıkta, portlar açık | `.env` gizli, backend kilitli, non-root kullanıcı |
| **Test & Kalite** | Sıfır kontrol | Otomatik birim testleri (Quality Gate) |
| **Siber Güvenlik** | Bilinmeyen bağımlılıklar | Trivy ile taranmış, `0 vulnerabilities` onaylı |
