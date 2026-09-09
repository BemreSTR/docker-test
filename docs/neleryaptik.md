# 🐳 DevOps & Docker Öğrenme Yolculuğu: Neler Yaptık?

Bu doküman, sıfırdan başlayarak bir web uygulamasının konteynırlaştırılması, yerel geliştirme süreçleri ve karşılaşılan gerçek hayat DevOps problemlerinin çözümlerini adım adım özetlemektedir.

---

## 📌 BÖLÜM 1: Temel Kavramlar & Zihinsel Model

### 1. Konteynırlaştırma (Containerization) Nedir?
* **Klasik Problem:** *"Benim bilgisayarımda çalışıyordu ama sunucuda çalışmıyor!"* ortam uyuşmazlığı sorunudur.
* **Konteynır Çözümü:** Uygulamanın çalışması için gereken her şeyi (kod, kütüphaneler, runtime, sistem paketleri) izole ve taşınabilir tek bir paket haline getirmektir.

### 2. Sanal Makine (VM) vs. Konteynır (Docker)
* **Sanal Makine:** Her biri kendi içinde devasa bir İşletim Sistemi (Guest OS) çalıştırır, GB'larca yer kaplar, dakikalarca boot eder ve baştan GB'larca RAM kilitler.
* **Docker Konteynır:** Ana makinenin (Host) işletim sistemi çekirdeğini (Linux Kernel) paylaşır. Konteynır aslında ayrı bir bilgisayar değil; Linux Kernel'ın **Namespaces** (görünmez duvarlar) ve **Cgroups** (kaynak kısıtlayıcılar) ile izole ettiği **canlı bir süreçtir (process)**. 
* *Bizim uygulamamızın canlı RAM tüketimi: Sadece **7.6 MB!***

### 3. Temel Dörtlü:
* **Dockerfile:** İmajın nasıl oluşturulacağını tarif eden reçete / kaynak metin.
* **Image (Kalıp):** Dockerfile'ın derlenmiş (build edilmiş), dondurulmuş ve değiştirilemez (read-only) snapshot hali.
* **Container:** Bir imajdan başlatılan canlı, çalışan örnek (Process).
* **Registry (Docker Hub):** İmajların depolandığı ve dağıtıldığı kütüphane.

---

## 🛠️ BÖLÜM 2: Adım Adım Neler Yaptık? (Kronolojik Sıra)

### 1. Aşama: Statik Web Uygulamasının Geliştirilmesi
Önce bilgisayarımıza hiçbir sunucu yazılımı kurmadan saf bir statik web uygulaması yazdık:
* `index.html`: Sayfa iskeleti.
* `style.css`: Modern koyu tema tasarımı.
* `app.js`: Canlı saat, çalışma ortamı tespiti (`file://` vs `http://`).

---

### 2. Aşama: İlk Dockerfile'ın Yazılması
Klasörümüzde `Dockerfile` oluşturduk:
```dockerfile
# Temel İmaj: Ultra hafif (~25MB) Alpine Linux üzerinde Nginx
FROM nginx:alpine

# Statik dosyalarımızı Nginx'in yayın klasörüne kopyala
COPY . /usr/share/nginx/html

# 80 portunu dış dünyaya duyur
EXPOSE 80
```

---

### 3. Aşama: İlk Build ve Karşılaşılan Sorunlar (Troubleshooting)

#### Komut 1: İmajı Build Ettik
```bash
docker build -t benim-web-sitem .
```
* **Sonuç:** Dockerfile okundu, Nginx Alpine indirildi ve katmanlar paketlenerek `benim-web-sitem:latest` imajı üretildi.

#### Komut 2: Konteynırı Çalıştırma Denemesi
```bash
docker run -d -p 8080:80 --name web-uygulamam benim-web-sitem
```
* **Hata 1:** `Bind for 0.0.0.0:8080 failed: port is already allocated`
  * **Nedeni:** Bilgisayarımızdaki `8080` portunu halihazırda başka bir konteynır (`htmltopdf-frontend`) kullanıyordu.
* **Hata 2:** Komut tekrarlandığında: `Conflict. The container name "/web-uygulamam" is already in use`
  * **Nedeni:** İlk çalıştırma port yüzünden ayağa kalkamadı ama Docker diskte `web-uygulamam` adında "Created" durumunda bir kayıt açmıştı.

#### Çözüm:
1. Yarım kalan konteynır silindi:
   ```bash
   docker rm web-uygulamam
   ```
2. Dış port değiştirilerek (8081) başarıyla başlatıldı:
   ```bash
   docker run -d -p 8081:80 --name web-uygulamam benim-web-sitem
   ```
* **Sonuç:** `http://localhost:8081` adresinde Nginx üzerinden sitemiz başarıyla yayına girdi!

---

### 4. Aşama: Uygulamayı Geliştirme & Immutability (Değiştirilemezlik)

Uygulamamızı tüm HTTP metotlarını (GET, POST, PUT, PATCH, DELETE) test edebilen interaktif bir **HTTP Playground** haline getirdik.

* **Öğrenilen Gerçek:** Kodları değiştirmemize rağmen `localhost:8081` sayfasını yenilediğimizde eski site görünmeye devam etti!
* **Nedeni:** Konteynırlar **Immutable (Değiştirilemez)** kalıplardır. `COPY` komutu dosyaların o anki fotoğrafını çeker. Yeni kod için yeniden build gerekir:
  ```bash
  docker build -t benim-web-sitem .
  docker rm -f web-uygulamam
  docker run -d -p 8081:80 --name web-uygulamam benim-web-sitem
  ```

---

### 5. Aşama: Tarayıcı Önbelleği (Browser Cache) ve Cache-Busting

* **Problem:** Yeniden build edip konteynırı açtığımızda tasarım bozuk göründü, ancak `index.html` doğrudan açıldığında düzgündü.
* **Nedeni:** Tarayıcı, Nginx'ten gelen eski `style.css` dosyasını önbelleğinde tuttuğu için yeni HTML ile eski CSS çakıştı.
* **Çözüm (DevOps Standardı):**
  1. HTML içine **Cache-Busting** parametreleri eklendi:
     `<link rel="stylesheet" href="style.css?v=2.0">`
  2. İmajı temiz tutmak için `.dockerignore` dosyası eklendi (.git, *.md, Dockerfile elendi).

---

### 6. Aşama: Volumes - Canlı Geliştirme (Bind Mount)

* **Problem:** Kodda her tek satır değiştiğinde `docker build` + `docker rm` yapmak geliştirme aşamasında çok yavaştır.
* **Çözüm (Bind Mount):** Mac'teki klasörümüzü konteynırın içine canlı ayna gibi bağladık:

```bash
docker run -d -p 8081:80 -v "$PWD":/usr/share/nginx/html --name web-uygulamam nginx:alpine
```

* **Karşılaşılan Tuzak:** `docker: invalid reference format`
  * **Nedeni:** Klasör adımızda (`TUIK staj`) boşluk karakteri olduğu için terminal yolu parçaladı.
  * **Çözüm:** Çift tırnak kullanıldı: `"$PWD"`
* **Sonuç:** `index.html` başlığını değiştirdiğimiz an, build yapmadan tarayıcıda F5 ile değişiklik anında canlıya yansıdı!

---

### 7. Aşama: Volumes - Kalıcı Veri (Named Volume)

* **Problem:** Konteynırlar silindiğinde içlerindeki veriler (ör. veritabanı kayıtları) yok olur.
* **Çözüm:** Docker'ın yönettiği bağımsız depolama kasaları (**Named Volume**).

#### Yaptığımız Deney:
1. `benim_kasa` adlı volume'e bir dosya yazıp konteynırı yok ettik (`--rm`):
   ```bash
   docker run --rm -v benim_kasa:/bilgiler alpine sh -c "echo 'DevOps harika gidiyor!' > /bilgiler/not.txt"
   ```
2. Kasaları listeledik:
   ```bash
   docker volume ls
   # Çıktıda "benim_kasa" sapasağlam duruyordu.
   ```
3. Tamamen farklı sıfır bir konteynır açıp kasanın içindeki dosyayı okuduk:
   ```bash
   docker run --rm -v benim_kasa:/herhangi_bir_yer alpine cat /herhangi_bir_yer/not.txt
   # Çıktı: DevOps harika gidiyor!
   ```
* **Kanıt:** Konteynır ölse bile verilerimiz silinmedi!

---

### 8. Aşama: Full-Stack Dönüşümü (Hikayeleştirilmiş Restoran Analojisi) 🍽️

Konteynırların tek başına değil, birlikte bir takım olarak nasıl çalıştığını anlamak için bir **Lüks Restoran** hayal edelim:

```
[ MÜŞTERİ (Tarayıcı - Sen) ]
             │  (Masanın çağrı zili: Port 8081)
             ▼
   [ 1. GARSON (Frontend - Nginx) ]
             │  (Mutfak sipariş fişi: Port 5001)
             ▼
   [ 2. ŞEF AŞÇI (Backend API - Node.js) ]
             │  (Özel Telsiz Hattı: Docker Network "devops-agi")
             ▼
   [ 3. KİLİTLİ DEPO (Database - PostgreSQL) ]
```

1. **Garson (Frontend):** Müşteriyi şık bir masada karşılar, menüyü gösterir (HTML/CSS arayüzü). Müşteri "Not Ekle" butonuna bastığında siparişi alır ama yemeği kendisi pişirmez!
2. **Şef Aşçı (Backend):** Mutfakta bekler. Garsonun getirdiği isteği işler, kuralları kontrol eder. Malzeme almak veya yemeği kaydetmek için depocuya seslenir.
3. **Kilitli Soğuk Hava Deposu (Database):** Malzemelerin (verilerin) bozulmadan saklandığı yerdir. Dışarıdaki müşteriler bu depoya asla giremez (Dış porta kapalıdır)! Sadece Şef Aşçı özel kapıdan girip malzeme alır.

---

### Adım Adım Ne Yaptık ve Neden Yaptık? (Mutfak Nasıl Kuruldu?)

#### 1. Klasörleri Ayırdık (`frontend/` ve `backend/`):
* **Neden?** Garsonun kıyafetiyle (HTML/CSS) Aşçının tencerelerini (Node.js/npm) aynı dolaba koyarsan ortalık karışır. İki servisin sorumlulukları ve Docker reçeteleri tamamen ayrıdır.

#### 2. Özel Telsiz Hattını Açtık (`docker network create devops-agi`):
* **Neden?** Konteynırlar normalde birbirlerine sağır ve dilsizdir. Aşçı ile Depocunun birbirleriyle konuşabilmesi için aralarına özel ve izole bir telsiz kanalı (`devops-agi`) kurduk.

#### 3. Kilitli Depoyu Açtık (PostgreSQL Konteynırı):
* **Komut:** 
  ```bash
  docker run -d --name veritabani --network devops-agi -v pg_verisi:/var/lib/postgresql/data -e POSTGRES_PASSWORD=supersecret postgres:16-alpine
  ```
* **Neden Bu Parametreler?**
  * `--name veritabani`: Aşçı depocuya ismiyle (`veritabani`) seslenebilsin diye (Docker Dahili DNS).
  * `--network devops-agi`: Depoyu telsiz hattına bağladık.
  * `-v pg_verisi:...`: Konteynır ölse bile veriler silinmesin diye **Named Volume (Kasa)** bağladık.
  * `-e POSTGRES_PASSWORD=...`: Deponun kapısına şifre koyduk (Environment Variable).
  * **🛡️ En Önemli DevOps Kuralı:** `-p 5432:5432` yapmadık! Çünkü müşterilerin depoya doğrudan girmesi yasaktır; sadece Aşçı (Backend) içeriden erişmelidir.

#### 4. Şef Aşçıyı Hazırladık ve Pişirdik (`docker build -t benim-backend ./backend`):
* **Neden?** Node.js kodlarımızı ve `package.json` bağımlılıklarımızı dondurulmuş bir kalıp (Image) haline getirdik.
* **Kritik Optimizasyon:** Dockerfile'da önce sadece `package.json` kopyalayıp `npm install` yaptık. Böylece yarın kod satırı değiştiğinde `npm install` katmanı önbellekten (cache) anında gelecek ve build 0.5 saniyede bitecek.

#### 5. Şef Aşçıyı Telsiz Hattına Bağladık (Backend Konteynırı):
* **Komut:**
  ```bash
  docker run -d --name backend-api --network devops-agi -p 5001:5000 -e DB_HOST=veritabani benim-backend
  ```
* **Neden Bu Parametreler?**
  * `-e DB_HOST=veritabani`: Aşçıya dedik ki: *"Depo aynı telsiz ağında ve adı `veritabani`"*. Hiç IP adresi yazmadık, Docker DNS'i halletti!
  * **🍏 Yaşadığımız Mac Tuzağı (Port 5000 Çatışması):** Mac'in kendi AirPlay alıcısı 5000 portunu işgal ettiği için, dış kapı numaramızı **`5001`** yaptık (`5001:5000`).
  * **Sonuç:** Aşçı telsizden depoya seslendi: *"Notes tablosu var mı? Yoksa hemen açıyorum!"* ve veritabanı hazır oldu!

#### 6. Garsonu Masaya Gönderdik (Frontend Konteynırı):
* **Komut:**
  ```bash
  docker run -d -p 8081:80 -v "$PWD/frontend":/usr/share/nginx/html --name web-uygulamam --network devops-agi nginx:alpine
  ```
* **Neden?** Müşterinin (senin) tarayıcıdan `http://localhost:8081` adresinden sipariş verebilmesi için Nginx garsonunu başlattık.

---

### 9. Aşama: Manuel Eziyet ve Kurtarıcımız: Docker Compose Nedir? 🪄

Buraya kadar her şeyi **manuel olarak elle** yaptık. 

#### Manuel Çalışmanın Eziyeti (Geliştirici Kabusu):
1. Önce ağı elle açtık (`docker network create...`)
2. Veritabanını 5 satırlık uzun parametrelerle elle başlattık.
3. Backend imajını elle build ettik.
4. Backend konteynırını yine uzun parametrelerle elle başlattık.
5. Frontend konteynırını elle başlattık.

**Düşünsene:** Şirkete yeni bir yazılımcı katıldı veya projeyi canlı sunucuya (AWS) taşıyacaksın. Bu 5 tane karmaşık komutu ezberleyip terminale tek tek yazmak, sıralamayı karıştırmamak tam bir kabustur!

#### 🎯 Docker Compose Bize Ne Sağlar?

Docker Compose, tüm bu mutfağın **"Restoran Müdürü / Orkestra Şefidir"**.

1. **Tek Bir Reçete (`docker-compose.yml`):**
   Az önce terminale yazdığımız tüm o ağları, portları, şifreleri, volume kasalarını tek bir derli toplu dosyada toplar.
2. **Tek Tuşla Ayağa Kaldırma (`docker compose up -d`):**
   Tek bir komut yazarsın; Docker Compose ağı kendi kurar, veritabanını açar, backend'i derler, frontend'i bağlar ve sistemi 2 saniyede ayağa kaldırır!
3. **Akıllı Sıralama (`depends_on`):**
   Veritabanı açılmadan backend'i başlatmaz; sırayı bilir.
4. **Tek Tuşla Temizlik (`docker compose down`):**
   Akşam işin bittiğinde tek bir komutla tüm konteynırları ve sanal ağları tertemiz silip kapatır; arkasında çöp bırakmaz.

---

---

### 10. Aşama: İlk `docker-compose.yml` Dosyamız ve Satır Satır Anatomisi 🎻

Manuel olarak yazdığımız tüm o dağınık komutları tek bir orkestra şefi dosyasında topladık:

```yaml
services:
  # 1. Kilitli Depo (PostgreSQL)
  db:
    image: postgres:16-alpine
    container_name: veritabani
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: supersecret
      POSTGRES_DB: devops_db
    volumes:
      - pg_verisi:/var/lib/postgresql/data
    # Senior İpucu: Port yönlendirmesi (ports) bilerek yok! 
    # Güvenlik gereği veritabanı sadece iç ağdaki backend'e açıktır.

  # 2. Şef Aşçı (Node.js REST API)
  backend:
    build: ./backend
    container_name: backend-api
    restart: unless-stopped
    ports:
      - "5001:5000"
    environment:
      DB_HOST: db  # Compose sayesinde 'db' servis adıyla konuşur!
      DB_USER: postgres
      DB_PASSWORD: supersecret
      DB_NAME: devops_db
      PORT: 5000
    depends_on:
      - db  # Akıllı Sıralama: Önce veritabanı açılsın, sonra backend!

  # 3. Garson (Nginx Frontend)
  frontend:
    build: ./frontend
    container_name: web-uygulamam
    restart: unless-stopped
    ports:
      - "8081:80"
    depends_on:
      - backend

volumes:
  pg_verisi:  # Kalıcı veri kasası tanımı
```

#### 🔍 Satır Satır Neler Oluyor?
1. **`services:`** Ayağa kalkacak mikroservislerin listesidir (`db`, `backend`, `frontend`).
2. **`build: ./backend`:** Dockerfile'ı oku ve imajı kendin derle demektir.
3. **`depends_on:`** Akıllı bağımlılık zinciridir. Backend'in veritabanı açılmadan önce başlatılmasını engeller.
4. **`restart: unless-stopped`:** Konteynır çökerse veya sunucu yeniden başlarsa Docker onu otomatik olarak ayağa kaldırır.
5. **Otomatik Ağ:** Compose arkada varsayılan izole bir ağ kurar ve servis adlarını (`db`, `backend`) birbirine tanıtır.

---

## 🎓 BÖLÜM 3: Kıdemli DevOps Soru-Cevap & Mimari Sırlar

*(Öğrenme sürecinde sorduğun ve sistemin arkasındaki mantığı aydınlatan kritik soruların detaylı yanıtları)*

---

### ❓ Soru 1: Neden Frontend ve Backend için Dockerfile yazdık da PostgreSQL için yazmadık?
* **Cevap:**
  * **Frontend ve Backend:** Bu kodları (HTML/JS, `server.js`) **sen yazdın**. Dünyada başka kimsede bu kodlar yok. Bu nedenle Docker Hub'da hazır bir imajı bulunamaz. Mecburen `Dockerfile` yazıp kendi imajımızı ürettik (`docker build`).
  * **PostgreSQL:** Dünyaca ünlü, standart, açık kaynak bir veritabanıdır. PostgreSQL mühendisleri zaten onun Dockerfile'ını yazmış, build etmiş ve Docker Hub'a resmi imaj olarak yüklemişlerdir (`postgres:16-alpine`). Biz sadece hazır olanı indirip çalıştırdık.
* **💡 Senior Analojisi:** 
  Özel tasarım bir yemek masası yaptırmak marangoza özel çizim vermektir (**Dockerfile build**). 
  Ama mutfağa buzdolabı alırken sıfırdan buzdolabı icat etmezsin; gider Bosch/Arçelik bayisinden hazır alır fişe takarsın (**`image: postgres`**).
* **💡 Senior DevOps Notu:** Peki PostgreSQL için ne zaman Dockerfile yazılır? Sadece içine özel C eklentileri (örneğin Yapay Zeka vektörleri için `pgvector` veya harita verileri için `postgis`) derlemek istediğimizde kendi özel Postgres Dockerfile'ımızı yazarız.

---

### ❓ Soru 2: Ben SQL tablosu oluşturmadıysam satırlar ve sütunlar nasıl oluştu?
* **Cevap:** Arka planda çalışan iki mekanizma vardı:
  1. **Veritabanının Açılması (`devops_db`):** 
     Konteynıra verdiğimiz `-e POSTGRES_DB=devops_db` ortam değişkeni sayesinde PostgreSQL ilk açılışında bu isimde boş bir veritabanı yarattı.
  2. **Tablo ve Sütunların Açılması (`notes`):** 
     Backend kodumuz olan `server.js` dosyasının içine şu SQL kodunu gömmüştük:
     ```sql
     CREATE TABLE IF NOT EXISTS notes (
       id SERIAL PRIMARY KEY,
       title VARCHAR(255) NOT NULL,
       content TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     ```
     Backend ayağa kalktığı saniye veritabanına bağlandı ve bu sorguyu çalıştırarak tabloyu, satır ve sütun kurallarını otomatik inşa etti!
* **💡 Senior DevOps Notu:** Gerçek kurumsal projelerde tablolar koda doğrudan yazılmaz; **Database Migration Araçları** (Prisma, Flyway, Knex, Liquibase) kullanılır. Böylece veritabanı şeması versiyonlanır ve CI/CD sürecinde otomatik güncellenir.

---

### ❓ Soru 3: Veritabanı cihazımda mı çalışıyor yoksa ayrı konteynırda mı? İçine girip bakabilir miyim?
* **Cevap:** Kesinlikle Mac bilgisayarında **değil**, izole bir konteynırın içinde çalışıyor! Mac'ine tek bir veritabanı kütüphanesi kurulmadı.
* **Canlı Kanıtı:** Terminalden şu komutla veritabanı konteynırının içine girdik:
  ```bash
  docker exec -it veritabani psql -U postgres -d devops_db
  ```
  İçeride `\dt` diyerek `notes` tablosunu gördük. `SELECT * FROM notes;` sorgusuyla web sayfamızdan eklediğimiz notları (`İlk Notum`, `ikinci Notum`, `üçüncü Notum - eyvallah`) canlı canlı listeledik ve sildik!

---

### ❓ Soru 4: `docker compose down` ile sistemi durdursam veriler silinir mi?
* **Cevap: HAYIR, KESİNLİKLE SİLİNMEZ!**
* **Neden?** Çünkü `docker-compose.yml` içinde veritabanına bir **Named Volume (`pg_verisi`)** bağladık.
* Konteynır sadece bir "motordur"; veriler ise Mac'inin diskindeki güvenli `pg_verisi` kasasında durur. Konteynır silinse de kasa silinmez.
* Sistemi tekrar `docker compose up -d` ile açtığında verilerin aynen geri gelir.
* **Veriler Ne Zaman Silinir?** Yalnızca sen özellikle `docker compose down -v` (`-v` = volume'leri de sil) dersen silinir.

---

### ❓ Soru 5: `down` ettikten sonra Docker'daki imaj isimlerini değiştirsem bir sıkıntı olur mu?
* **Cevap: HİÇBİR SIKINTI OLMAZ! Veriler sapasağlam kalır.**
* **Neden?** İmaj ismi sadece çalışan yazılımın adıdır. `pg_verisi` ise bilgisayardaki harici hard disktir.
* **Analoji:** Bilgisayarına format atıp Windows 10 yerine Windows 11 kursan bile, harici hard diskini (USB) tekrar taktığında içindeki fotoğrafların silinmez. Yeni imaj da aynı kasaya (`pg_verisi`) bağlandığı sürece verileri okur.

---

### ❓ Soru 6: `pg_verisi:/var/lib/postgresql/data` adresini değiştirirsem ne olur?
Bu adres iki parçadan oluşur: `[SOL TARAF (Kasa Adı)] : [SAĞ TARAF (Konteynır İçi Yol)]`

* **Durum A (Sol tarafı değiştirirsen - örn: `yeni_kasa:...`):**
  Docker diskte `yeni_kasa` adında sıfır ve boş bir kasa açar. Konteynır boş bir veritabanıyla başlar. 
  **Eski verilerin silindi mi? HAYIR!** Eski verilerin `pg_verisi` kasasında aynen durur (USB belleği çıkarıp başka boş USB takmak gibi). Dosyayı tekrar `pg_verisi` yaparsan eski veriler anında geri gelir.
* **Durum B (Sağ tarafı değiştirirsen - örn: `pg_verisi:/baska_yer`):**
  PostgreSQL motoru standart olarak verilerini `/var/lib/postgresql/data` yolunda arar. Sen kasayı başka klasöre bağlarsan PostgreSQL kendi klasörünü boş bulur ve hata verir. Sağ taraf sabit kalmalıdır.

---

### ❓ Soru 7: Konteynırlar neden varsayılan olarak `root` çalışır ve `USER node` eklemek neyi değiştirir?
* **Cevap:**
  * Dockerfile içinde bir kullanıcı belirtmezsen, Docker içindeki tüm süreçleri **`root` (en yetkili sistem yöneticisi)** olarak çalıştırır.
  * **Tehlike (Konteynır Kaçışı - Container Escape):** Eğer backend API kodunda uzaktan kod çalıştırma (RCE) gibi bir açık varsa, hacker konteynırın içine `root` olarak sızar! Konteynır içindeki sistem dosyalarını değiştirebilir, paketler yükleyebilir ve bazı durumlarda ana makineye (host) sızma kapısı arayabilir.
  * **Çözüm (`En Düşük Yetki Prensibi - Least Privilege`):**
    `node:alpine` imajının içinde zaten sıradan, yetkisiz bir `node` kullanıcısı tanımlıdır.
    ```dockerfile
    COPY --chown=node:node . .
    USER node
    ```
    Bu iki satır sayesinde uygulama sıradan bir kullanıcıya devredilir. Saldırgan sızsa bile sistem dosyalarını değiştiremez, sadece o klasörde hapsolur.

---

### ❓ Soru 8: `.env`, `.env.example` ve `.gitignore` üçlüsü neden DevOps'un altın kuralıdır?
* **Cevap:**
  * **`.env`:** Gerçek şifrelerin bulunduğu yerdir. Sadece yerel bilgisayarında veya canlı prod sunucusunda gizlice yaşar.
  * **`.gitignore`:** `.env` dosyasını Git deposunun dışına iter. Böylece `git push` yaptığında şifrelerin GitHub'a kazara sızması imkansız hale gelir.
  * **`.env.example`:** GitHub'a giden şablondur. Yeni bir yazılımcı projeyi klonladığında: *"Hangi değişkenlere ihtiyacım var?"* sorusunun cevabını bu şablondan bakar, dosyayı kopyalayıp `.env` yapar ve kendi şifresini yazar.
* **💡 Senior DevOps Kuralı:** Şifreleri koda gömmek yerine ortam değişkeni (`environment variable`) olarak dışarıdan beslemek, **12-Factor App** metodolojisinin 3. kuralıdır (Config kuralı). Kod her ortamda (Dev, Test, Prod) aynı kalır, sadece `.env` değişir!

---

### 11. Aşama: Production Güvenlik Sertleştirmesi (Security Hardening) 🛡️

Gerçek bir prod ortamında çalışan sistemlerin en büyük zafiyeti sızıntılar ve yetkisiz erişimlerdir. Bu aşamada projemize kurumsal güvenlik katmanları ekledik:

#### 1. Kod ile Şifreleri Ayırmak (12-Factor App Prensibi)
* **Tehlike:** Şifreleri `docker-compose.yml` içine açık metin olarak yazmak (`POSTGRES_PASSWORD: supersecret`). Bu dosya Git'e gönderildiği an şirketin veritabanı şifreleri internete sızar.
* **Uyguladığımız Çözüm (Üçlü Güvenlik Kalkanı):**
  1. **`.env` Dosyası:** Gerçek şifreler, kullanıcı adları ve portlar sadece bu dosyada tutulur.
  2. **`.gitignore` Dosyası:** Git'e `.env` dosyasını takip etmemesini ve asla repoya göndermemesini tembihledik.
  3. **`.env.example` Dosyası:** GitHub'a giden, içinde gerçek şifre barındırmayan ama hangi değişkenlerin doldurulması gerektiğini gösteren örnek şablon.
* **`docker-compose.yml` Parametrik Hale Geldi:**
  ```yaml
  POSTGRES_USER: ${DB_USER}
  POSTGRES_PASSWORD: ${DB_PASSWORD}
  POSTGRES_DB: ${DB_NAME}
  ports:
    - "${BACKEND_PORT:-5001}:5000"
  ```
  *(Artık YAML dosyamızda tek bir gizli şifre dahi kalmadı!)*

#### 2. Konteynır İçi Non-Root Kullanıcı (En Düşük Yetki Prensibi - Least Privilege)
* **Tehlike:** Docker konteynırları varsayılan olarak `root` (en üst yetkili) kullanıcısıyla çalışır. Eğer backend kodunda bir güvenlik açığı bulunursa, saldırgan konteynır içinde `root` yetkisi elde eder!
* **Uyguladığımız Çözüm (`backend/Dockerfile`):**
  ```dockerfile
  COPY --chown=node:node . .
  USER node
  ```
  Backend sürecimizi Node.js imajının içindeki yetkisiz sıradan `node` kullanıcısına devrettik. Saldırgan sızsa bile sistem dosyalarına dokunamaz, işletim sistemine zarar veremez.

#### 3. Compose Proje Ön Eki Tuzağı ve Çözümü:
* **Öğrenilen İpucu:** Docker Compose varsayılan olarak her volume ve ağın başına bulunduğu klasör adını ön ek yapar (`docker-test_pg_verisi`).
* Daha önce elle açtığımız `pg_verisi` kasasındaki eski verilerimizin (`selam - PostgreSQL kaydedildi`) kaybolmaması için Compose dosyasında açıkça `name: pg_verisi` eşleştirmesi yaptık. Eski veriler anında geri bağlandı!

---

### 12. Aşama: İmajları Buluta Taşımak (Docker Hub Registry & Tagging) 🚀

Yerel bilgisayarımızda çalışan sistemi tüm dünyaya açmak için Docker Hub'a yükledik:

1. **Terminalden Güvenli Giriş (`docker login`):**
   * Docker Desktop ve Hub hesabımız (`bemres`) terminale bağlandı.
2. **İmaj Adlandırma Standardı (`docker tag`):**
   * Docker Hub kuralı: `<kullanici_adi>/<imaj_adi>:<versiyon>`
   * `docker-test-backend:latest` ➔ `bemres/devops-backend:1.0.0`
   * `docker-test-frontend:latest` ➔ `bemres/devops-frontend:1.0.0`
3. **Buluta Yükleme (`docker push`):**
   * `docker push bemres/devops-backend:1.0.0`
   * `docker push bemres/devops-frontend:1.0.0`
   * Katmanlar (Layers) Docker Hub'a yüklendi. Artık dünyanın herhangi bir yerindeki sunucu bu imajları tek komutla çekebilir!

---

### 13. Aşama: Development vs. Production Compose Ayrımı (`docker-compose.prod.yml`) 🏭

DevOps dünyasında en kritik ayrım şudur:

| Özellik | Geliştirme Ortamı (`docker-compose.yml`) | Canlı Prod Ortamı (`docker-compose.prod.yml`) |
| :--- | :--- | :--- |
| **Kaynak Kod** | Sunucuda/Mac'te kodlar durur. | **Sunucuda tek satır kaynak kod YOKTUR!** |
| **Nasıl Çalışır?** | `build: ./backend` (Kodları yerinde derler). | `image: bemres/devops-backend:1.0.0` (Doğrudan Hub'dan çeker). |
| **Yeniden Başlama** | `restart: unless-stopped` | `restart: always` (Sunucu kapansa da mutlaka geri açılır). |
| **Çalıştırma** | `docker compose up -d` | `docker compose -f docker-compose.prod.yml up -d` |

---

### 14. Aşama: DevOps'un Zirvesi: CI/CD Pipeline (GitHub Actions) 🤖

Artık imajları elle `docker build`, `docker tag` ve `docker push` yapma dönemi kapandı. Tüm süreci **GitHub Actions** ile otomatize ettik:

#### 1. Çalışma Prensibi:
* Biz kod yazıp sadece `git push origin main` yaptığımız an:
  1. GitHub bulutunda temiz bir **Ubuntu Sanal Makinesi (Runner)** açılır.
  2. Depodaki en güncel kodlar çekilir (`actions/checkout`).
  3. GitHub'ın gizli kasasından (`GitHub Secrets`) Docker Hub kullanıcı adı ve token'ı güvenle okunup giriş yapılır (`docker/login-action`).
  4. Backend ve Frontend Dockerfile'ları otomatik derlenir ve Docker Hub'a etiketlenerek yüklenir (`docker/build-push-action`).
  5. İşlem bitince sanal makine kendini imha eder. Sıfır el emeği, %100 otomasyon!

#### 2. Workflow Dosyamızın Konumu:
* **[`.github/workflows/deploy.yml`](file:///Users/bemres/Desktop/TUIK%20staj/docker-test/.github/workflows/deploy.yml)**

---

## 🎓 BÖLÜM 3'e Ek: Yeni Kıdemli Soru-Cevaplar

### ❓ Soru 9: Neden canlı sunucuda `build: ./backend` yerine doğrudan Docker Hub imajı kullanırız?
* **Cevap:**
  1. **Kaynak Tüketimi (CPU/RAM Tasarrufu):** Bir sunucuda kod derlemek (`npm install`, C derleyicileri, build araçları) sunucunun işlemcisini ve RAM'ini kilitler. Canlıdaki kullanıcılar yavaşlık yaşar.
  2. **Güvenlik (Fikri Mülkiyet):** Şirketin kaynak kodlarını prod sunucularına dosya dosya kopyalamak güvenlik açığıdır. Sunucu hacklense bile karşılarında kaynak kodu değil, sadece derlenmiş mühürlü imajı bulurlar.
  3. **Hız (Saniyeler İçinde Dağıtım):** Docker Hub'dan hazır imajı çekmek 3 saniye sürerken, sunucuda sıfırdan derlemek dakikalar sürer.

---

### ❓ Soru 10: `docker compose -f <dosya> up -d` komutundaki `-f` bayrağı ne anlama gelir?
* **Cevap:**
  * Docker Compose varsayılan olarak her zaman `docker-compose.yml` isimli dosyayı arar.
  * Eğer özel bir dosya ismi kullandıysan (örneğin `docker-compose.prod.yml`), Docker'a *"Standart dosyayı değil, şu belirttiğim dosyayı oku"* demek için **`-f` (file)** bayrağı verilir:
    `docker compose -f docker-compose.prod.yml up -d`

---

### ❓ Soru 11: CI/CD nedir ve bir yazılımcının hayatını nasıl değiştirir?
* **Cevap:**
  * **CI (Continuous Integration - Sürekli Entegrasyon):** Yazılımcıların yazdığı kodların otomatik olarak birleştirilmesi, test edilmesi ve Docker imajı haline getirilmesidir.
  * **CD (Continuous Deployment - Sürekli Dağıtım):** Testlerden başarıyla geçen imajların insan müdahalesi olmadan canlı sunucuya gönderilip yayına alınmasıdır.
  * **Farkı:** Eskiden haftalar süren sürüm çıkarma krizleri, CI/CD sayesinde günde onlarca kez tek bir `git push` ile hatasız ve stressiz yapılır.

---

### ❓ Soru 12: GitHub Actions benim bilgisayarımı mı kullanır?
* **Cevap:**
  * **HAYIR!** GitHub kendi veri merkezlerindeki devasa sunuculardan senin için anlık ücretsiz bir Linux makinesi (Ubuntu Runner) tahsis eder.
  * Senin Mac bilgisayarın kapalı bile olsa, GitHub Actions bulutta derleme ve push işlemlerini tamamlar.

---

### ❓ Soru 13: GitHub Secrets neden gereklidir ve güvenliği nasıl sağlar?
* **Cevap:**
  * `deploy.yml` dosyası herkese açık bir Git deposunda durabilir. İçine Docker Hub şifreni yazarsan herkes görür.
  * **GitHub Secrets**, GitHub'ın arka planda banka seviyesinde şifrelediği özel bir kasadır.
  * YAML dosyasına şifre yerine sadece `${{ secrets.DOCKERHUB_TOKEN }}` yazarız. GitHub bunu derleme anında gizlice çözer, loglarda bile `***` olarak maskeler.

---

### ❓ Soru 14: CI/CD yaptık ama şu an projemiz nerede çalışıyor? İnternetten bir arkadaşım bu siteye erişebilir mi?
* **Cevap: HENÜZ HAYIR!**
* **Neden? (Fabrika vs. Mağaza vs. Restoran Analojisi):**
  1. **GitHub:** Senin tasarım ofisin (kodlar burada).
  2. **GitHub Actions (CI):** Senin **otomatik fabrikan**. Sen `git push` yapınca kutuları paketler.
  3. **Docker Hub:** Senin **dağıtım depon**. Hazır paketler (`bemres/devops-backend:latest`) bu depoda bekler.
* **Eksik Kalan Parça:** Paketler depoda hazır ama henüz müşterilerin girebileceği bir **dükkan / restoran (Bulut Sunucu)** kiralamadık!
* Bir sitenin tüm dünyadan erişilebilmesi için 7/24 açık, sabit bir **Genel IP Adresi (Public IP)** olan bir sunucuya (AWS EC2, DigitalOcean vb.) gidip o depodaki paketleri indirmemiz (`docker compose -f docker-compose.prod.yml up -d`) gerekir.

---

### ❓ Soru 15: Normalde manuel olarak yapacağım 8 adımlık eziyet neydi ve GitHub Actions CD bunu nasıl otomatiğe bağlar?
* **Cevap:**
  * **Eski Usul Manuel Eziyet Listesi:**
    1. Kodda 1 satır değiştir.
    2. Terminali aç, `docker build` bekle.
    3. `docker tag` yaz.
    4. `docker push` ile Docker Hub'a gönder (dakikalarca bekle).
    5. Terminalden `ssh root@sunucu-ip` ile sunucuya bağlan.
    6. Sunucu şifreni gir.
    7. Sunucuda `docker compose -f docker-compose.prod.yml pull` yaz.
    8. Sunucuda `docker compose up -d` yazıp konteynırları yeniden başlat.
  * **GitHub Actions ile CD (Continuous Deployment) Mucizesi:**
    * Sen sadece **`git push`** yaparsın ve kahveni alırsın.
    * GitHub Actions, `deploy.yml` içine eklenen SSH adımıyla (`appleboy/ssh-action`) senin yerine sunucuya gizlice SSH ile bağlanır:
      ```bash
      cd /opt/my-app
      docker compose -f docker-compose.prod.yml pull
      docker compose -f docker-compose.prod.yml up -d
      ```
    * 60 saniye içinde sen elini bile sürmeden canlı sunucudaki web sitesi yeni kodla güncellenmiş olur!

---

## 🧠 Sık Kullanılan Kritik Docker & Compose Komutları Sözlüğü

| Komut | Açıklama |
| :--- | :--- |
| `docker login` | Docker Hub hesabına terminalden kimlik doğrulaması yapar. |
| `docker tag <eski> <kullanici/imaj:tag>` | İmajı Docker Hub standartlarına uygun etiketler / versiyonlar. |
| `docker push <kullanici/imaj:tag>` | Etiketlenmiş imajı Docker Hub bulutuna yükler. |
| `docker compose -f <dosya> up -d` | Belirtilen özel compose dosyasıyla (ör. prod) servisleri ayağa kaldırır. |
| `docker compose config` | `.env` değişkenlerinin YAML içine nasıl yerleştiğini doğrular. |
| `docker compose up -d` | Bütün servisleri derler (build), ağları kurar ve arka planda (-d) sırayla ayağa kaldırır. |
| `docker compose up -d --build` | Kodlarda değişiklik varsa imajları yeniden derleyip ayağa kaldırır. |
| `docker compose down` | Tüm sistemi (konteynırlar, ağlar) tek komutla kapatır ve temizler. |
| `docker compose down -v` | **DİKKAT:** Konteynırlarla birlikte kalıcı veri kasalarını (Volume) da siler. |
| `docker compose ps` | Compose ile yönetilen servislerin canlı durumunu gösterir. |
| `docker compose logs -f` | Tüm servislerin (frontend, backend, db) loglarını tek ekranda renkli canlı izletir. |
---

### 15. Aşama: Canlı Bulut Sunucusuna (VPS) Dağıtım 🌍

Yerel bilgisayarımızdaki testlerin ardından gerçek bir internet sunucusunda (Ubuntu VPS - `<YOUR_VPS_IP>`) sistemimizi yayına aldık:

1. **Sunucuya Sadece Gerekli Prod Dosyalarını Klonlama:**
   * Sunucuda kaynak koda gerek yoktur; sadece `docker-compose.prod.yml` ve `.env.example` kopyalandı.
2. **Sunucuda `.env` Yapılandırması:**
   * `.env.example` kopyalanıp `.env` yapıldı ve canlı ortam için güçlü bir veritabanı şifresi belirlendi.
3. **Servislerin Ayağa Kaldırılması:**
   * `docker-compose -f docker-compose.prod.yml up -d`
   * Docker Hub'dan `devops-backend` ve `devops-frontend` otomatik indi ve PostgreSQL ile birlikte canlı yayına geçti!

---

### 16. Aşama: Canlı Ortam Tarayıcı Ağ Dinamiği & Akıllı API Tespiti 🧠🌐

Sitemiz yayına girdikten sonra önemli bir mimari problemle karşılaştık ve akıllı bir mantıkla çözdük:

1. **Problem (Hardcoded Localhost & CORS/Ağ Hatası):**
   * Frontend kodunda API adresi `http://localhost:5001` olarak sabit (hardcoded) yazılmıştı.
   * Tarayıcı `http://<YOUR_VPS_IP>:8081` üzerinden siteyi açtığında, `localhost` kullanıcının kendi bilgisayarını temsil ettiği için kullanıcının bilgisayarında 5001 portunda çalışan bir sunucu bulamadı (`Failed to fetch`).
2. **Uygulanan Akıllı Dinamik Çözüm (`frontend/app.js`):**
   * Frontend koduna dinamik host çözümleme eklendi:
     ```javascript
     const currentHost = window.location.hostname || 'localhost';
     const API_BASE = `http://${currentHost}:5001`;
     ```
   * Artık site `localhost:8081`'de açılırsa backend olarak `localhost:5001`'e, VPS IP'si `http://<YOUR_VPS_IP>:8081`'de açılırsa `http://<YOUR_VPS_IP>:5001`'e, ileride bir alan adı (`app.sitem.com`) bağlanırsa otomatik olarak o alan adına istek atar!
3. **Yeni Arayüz Özellikleri (`v1.1.0`):**
   * Sağ üst köşeye **v1.1.0 CI/CD ✨** rozeti eklendi.
   * Hangi API sunucusuna istek atıldığını gösteren canlı **Hedef API Bilgi Çubuğu** eklendi.
   * Tek tıkla PostgreSQL'e dinamik saat damgalı kayıt atan **🚀 CI/CD Test Notu Ekle** butonu eklendi.

---

---

### 17. Aşama: DevOps'un Kutsal Kasesi: Full Continuous Deployment (CD) 🚀🤖

Daha önce Docker imajlarımız GitHub Actions ile otomatik derlenip Docker Hub'a atılıyordu, ancak sunucuya girip elle `pull` ve `up -d` dememiz gerekiyordu (**Continuous Delivery**). Bu aşamada insan müdahalesini **tamamen sıfıra indirerek** gerçek **Continuous Deployment (Sürekli Dağıtım)** sistemini kurduk:

#### 1. Sıfır Müdahale (Zero-Touch) SSH Mimarisi:
* GitHub Secrets kasasına 3 kritik güvenlik anahtarı tanımladık:
  * `VPS_HOST`: Canlı sunucumuzun IP adresi (`<YOUR_VPS_IP>`).
  * `VPS_USERNAME`: Sunucu kullanıcı adı (`root`).
  * `VPS_PASSWORD`: Sunucu erişim parolası.
* `.github/workflows/deploy.yml` dosyasına 6. adım olarak SSH tetikleyicisi eklendi:
  ```yaml
  # 6. Aşama: VPS Sunucusuna Bağlan ve Canlıyı Güncelle (Full CD)
  - name: Deploy to VPS via SSH
    uses: appleboy/ssh-action@v1.0.3
    with:
      host: ${{ secrets.VPS_HOST }}
      username: ${{ secrets.VPS_USERNAME }}
      password: ${{ secrets.VPS_PASSWORD }}
      script: |
        cd /opt/docker-test
        git pull origin main
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml up -d
  ```

#### 2. Karşılaşılan Prod Krizleri ve Kıdemli Çözümleri:
1. **Kriz 1: `KeyError: 'ContainerConfig'` (Eski Python Compose Hatası)**
   * **Neden:** VPS'teki Ubuntu `apt install docker-compose` ile kurulan 2021 model Python tabanlı Docker Compose v1.29.2 sürümünü kullanıyordu. GitHub Actions BuildKit (2024+) imajlarında eski `ContainerConfig` etiketi bulunmadığı için compose çöktü.
   * **Çözüm:** VPS'e modern Go tabanlı **Docker Compose v2** (`v2.x+`) kuruldu:
     ```bash
     curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
     chmod +x /usr/local/bin/docker-compose
     cp /usr/local/bin/docker-compose /usr/bin/docker-compose
     ```
2. **Kriz 2: `Conflict: container name is already in use` (Yetim Konteynır Çakışması)**
   * **Neden:** Compose v1 çökerken eski konteynırı geçici bir isimle (`222a773441cc_backend-api-prod`) yeniden adlandırmış ve silemeden çöktüğü için konteynır hafızada asılı kalmıştı.
   * **Çözüm:** Asılı kalan yetim konteynır zorla silindi:
     ```bash
     docker rm -f 222a773441cc_backend-api-prod backend-api-prod
     ```

---

## 🎓 BÖLÜM 4: Canlı Sunucu (VPS), CD ve Ağ Mimarisi Soru-Cevapları

### ❓ Soru 16: VPS sunucusundaki `.env` dosyasına şifre olarak ne yazmalıyım? İstediğim şifreyi girebilir miyim?
* **Cevap: EVET, kesinlikle istediğin güçlü şifreyi girebilirsin!**
* **Neden?**
  * `.env` dosyası sadece o sunucuya özel bir sırdır.
  * Sen `DB_PASSWORD=cok_guclu_bir_sifre_123` yazdığında, Docker Compose hem PostgreSQL konteynırını bu şifreyle kurar hem de Backend API konteynırına bu şifreyi verir.
  * İkisi aynı şifreyi aldığı sürece mükemmel bir uyumla birbirine bağlanır.

---

### ❓ Soru 17: `unknown shorthand flag: 'f' in -f` hatası neden oldu? `docker compose` ile `docker-compose` farkı nedir?
* **Cevap:**
  * **Eski Sürüm (Docker Compose v1):** Python ile yazılmış bağımsız bir programdı ve komutu tireliydi: `docker-compose -f ...`
  * **Yeni Sürüm (Docker Compose v2):** Docker motorunun içine yerleşik bir Go eklentisidir: `docker compose -f ...`
  * VPS sunucundaki Docker kurulumunda `docker-compose` eklentisi bağımsız ikili (`standalone binary`) olarak kurulu olduğunda, tireli komut (`docker-compose -f ...`) çalışır. Tire koymadan yazdığında `docker` komutu `-f` bayrağını tanımadığı için bu hatayı vermiştir.

---

### ❓ Soru 18: Canlı sunucuya girdiğimde GET isteğinde neden `Failed to fetch / CORS` hatası aldım?
* **Cevap:**
  * **En Büyük Yanılgı:** Backend ile Frontend'in aynı Docker ağında (`networks`) konuşması, tarayıcının da oraya eriştiği anlamına gelmez!
  * HTML ve JavaScript kodları **senin evindeki bilgisayarın tarayıcısında** çalışır.
  * Tarayıcıdaki kod `http://localhost:5001`'e istek attığında, sunucudaki konteynıra değil senin evindeki bilgisayara bağlanmaya çalıştı.
  * Ayrıca modern tarayıcılar, genel bir IP adresinden (`<YOUR_VPS_IP>`) senin yerel ağındaki bir cihaza (`localhost`) istek atılmasını **Private Network Access (PNA)** güvenlik kuralı gereği doğrudan engeller.
  * Çözüm, istek atılacak hedefi sayfanın açıldığı IP'ye (`window.location.hostname`) dinamik olarak yönlendirmektir.

---

### ❓ Soru 19: CI/CD boru hattımızın (Pipeline) çalıştığını canlıda adım adım nasıl doğrularız?
* **Cevap (Tam Döngü):**
  1. **Kod Geliştirme (Lokal):** `frontend/app.js`, `index.html` ve `style.css` dosyalarında `v1.1.0` özelliklerini geliştirdik.
  2. **Push:** `git commit` ve `git push origin main` yaptık.
  3. **GitHub Actions (Bulut Fabrikası):** GitHub saniyeler içinde yeni imajları derleyip Docker Hub'a `bemres/devops-frontend:latest` ve `1.1.0` olarak yükledi.
  4. **Canlı Sunucu Güncellemesi (VPS):** GitHub Actions SSH ile sunucuya sızıp `pull` ve `up -d` komutlarını çalıştırdı.
  5. **Sonuç:** Tarayıcıda sayfayı yenilediğimizde `v1.1.0` sürümü ve çalışan istekler anında karşımıza çıktı! Tek bir dosya kopyalamadan canlı sistem güncellendi.

---

### ❓ Soru 20: Continuous Delivery ile Continuous Deployment arasındaki fark nedir?
* **Cevap:**
  * **Continuous Delivery (Sürekli Teslimat):** Kod otomatik derlenir, test edilir ve Docker Hub gibi bir depoya koyulur. Ancak canlıya almak için bir buton tıklaması veya sunucuda manuel komut (`pull`) gerekir. İnsan onayı devrededir.
  * **Continuous Deployment (Sürekli Dağıtım):** İnsan müdahalesi %0'dır. Kod `main` dalına push edildiği an derlenir, test edilir ve arka planda sunucuya otomatik fırlatılır. Geliştirici arkasına yaslanıp kahvesini yudumlar.

---

### ❓ Soru 21: `KeyError: 'ContainerConfig'` hatası neden yaşandı?
* **Cevap:**
  * 2021 yılında geliştirilmesi durdurulan **Docker Compose v1 (Python)**, konteynırları güncellerken imajın metaverilerinde `ContainerConfig` adında eski bir Docker alanını arar.
  * GitHub Actions'ta kullandığımız modern **BuildKit (2024+)** derleyicisi ise OCI standartlarına uygun modern imajlar ürettiği için bu gereksiz alanı basmaz.
  * Eski Compose bu alanı bulamayınca Python `KeyError` vererek patlar. Çözüm, resmi Go diliyle yazılmış modern **Docker Compose v2** eklentisine terfi etmektir.

---

### ❓ Soru 22: `Conflict: container name is already in use` hatası nedir ve nasıl temizlenir?
* **Cevap:**
  * Docker'da her konteynır adı benzersiz (unique) olmak zorundadır.
  * Bir güncelleme işlemi yarıda çökerse, Docker eski konteynırı silemez ama yenisini de aynı isimle başlatamaz.
  * `docker rm -f <konteynir_adi>` komutu ile çakışan veya askıda kalan yetim (orphaned) konteynır zorla kaldırılarak yol açılır.

---

### ❓ Soru 23: Gerçek ve kurumsal (Enterprise) düzeyde DevOps süreçleri bu şekilde mi işler? Farklılıklar nelerdir?
* **Cevap:**
  * **Kısa Cevap: EVET! Temel felsefe ve mimari akış %100 birebir aynıdır.**
  * Dünyanın en büyük teknoloji devleri (Netflix, Google, Trendyol, bankalar) de özünde şu çarkı işletir:
    `Kod Yazılır` ➔ `Git Push` ➔ `CI (Otomatik Test & İmaj Üretimi)` ➔ `Kayıt Deposu (Registry)` ➔ `CD (Canlıya Dağıtım)`.
  * Bizim şu an kurduğumuz sistem **Startup / KOBİ / Orta Ölçekli Proje** seviyesidir. Binlerce mühendisin ve milyonlarca kullanıcının olduğu kurumsal şirketlerde şu katmanlar eklenir:

#### Kurumsal Farklılıklar Karşılaştırma Tablosu:

| Aşama / Katman | Bizim Yaptığımız (Pratik & Öz) | Kurumsal Düzey (Devasa Ölçek - Enterprise) |
| :--- | :--- | :--- |
| **Konteynırlaştırma** | `Dockerfile` | `Dockerfile` (Birebir aynı, ek olarak Trivy ile güvenlik zafiyet taraması yapılır). |
| **Kayıt Deposu (Registry)** | Docker Hub | Docker Hub, AWS ECR, Google Artifact Registry veya JFrog Artifactory. |
| **CI (Sürekli Entegrasyon)**| GitHub Actions | GitHub Actions, GitLab CI veya Jenkins (Otomatik birim/entegrasyon testleri & SonarQube kod analizleri eklenir). |
| **CD (Sürekli Dağıtım)** | GitHub Actions SSH Action (Push-based) | **GitOps (Pull-based / ArgoCD, FluxCD):** Sunucu dışarıdan SSH'a kapatılır. Kümenin içindeki bir ajan Git'i dinleyip güncellemeleri kendi çeker. |
| **Orkestrasyon** | Docker Compose (Tek Sunucu) | **Kubernetes (K8s) / AWS ECS:** 50+ sunuculu kümeler. Trafik arttığında otomatik olarak 2 konteynırdan 50 konteynıra çıkar (**Auto-scaling**). |
| **Ortam Ayrımı (Pipelines)** | Doğrudan `main` ➔ Prod | `dev` ➔ `staging/qa` (Canlının kopyası) ➔ `prod` (Kıdemli mühendis kod incelemesi ve onay kapısı ile). |
| **Ağ ve Güvenlik** | Ham IP ve Port (`<YOUR_VPS_IP>:8081`) | **Load Balancer + Tersine Vekil (Nginx/Traefik) + SSL:** Backend portları asla internete açılmaz; sadece **443 (HTTPS)** açıktır, alan adı bağlanır (`https://app.sitem.com`). |
| **Şifre Yönetimi** | Sunucuda `.env` + GitHub Secrets | HashiCorp Vault, AWS Secrets Manager, Doppler. |
| **İzlenebilirlik (Observability)**| `docker logs` | **Prometheus + Grafana + ELK Stack / Datadog:** Canlı metrik panoları, sunucu çöktüğünde telefonlara anında giden acil durum alarmları. |

* **💡 Kıdemli Mühendis Tavsiyesi:**
  Docker'ın nasıl çalıştığını, Linux süreçlerini, port eşlemelerini, ağları ve CI/CD mantığını elini kirleterek öğrenmeyen birisi Kubernetes veya ArgoCD dünyasında kaybolur. Bugün öğrendiğin temeller, gelecekte göreceğin tüm gelişmiş kurumsal teknolojilerin değişmez omurgasıdır!

---

---

### 18. Aşama: Tersine Vekil (Reverse Proxy) Mimarisi ve Backend İzolasyonu 🛡️🌐

Önceki mimarimizde kullanıcılar siteye `http://<YOUR_VPS_IP>:8081` ile giriyor ve backend'in `5001` portu doğrudan internete açık kalıyordu. Bu aşamada sektörel standartlara geçerek **Nginx Reverse Proxy** mimarisine geçiş yaptık:

```text
[YENİ GÜVENLİ MİMARİ]
Kullanıcı (İnternet)
       │
       ▼ (Tek Açık Port: 80)
http://<YOUR_VPS_IP>
       │
       ▼
[ Nginx Web Sunucusu (Reverse Proxy) ]
       ├── "/"       ──> Statik Web Sayfası (HTML / CSS / JS)
       └── "/api/*"  ──> Docker Dahili Ağ (http://backend:5000)
                            │
                         [ Node.js API ] ──🔒 DIŞ DÜNYAYA KAPALI!
                            │
                         [ PostgreSQL ]  ──🔒 DIŞ DÜNYAYA KAPALI!
```

#### Neler Yaptık?
1. **`frontend/nginx.conf` Yapılandırması:**
   * Nginx'e `/api/` ile başlayan tüm istekleri Docker iç ağındaki `http://backend:5000` adresine yönlendirme kuralı (`proxy_pass`) yazdık.
2. **`frontend/Dockerfile` Güncellemesi:**
   * Hazırladığımız `nginx.conf` ayarını imajın içine `/etc/nginx/conf.d/default.conf` olarak kopyaladık.
3. **Frontend Kod Sadeleştirmesi (`app.js` & `index.html`):**
   * Artık `http://<YOUR_VPS_IP>:5001` gibi karmaşık adreslere gerek kalmadı. Tüm API istekleri `/api/health`, `/api/notes` gibi temiz göreceli yollara (relative paths) çekildi.
4. **`docker-compose.prod.yml` Güvenlik Sertleştirmesi:**
   * Backend servisinin `ports:` bölümü tamamen kaldırıldı (Port 5001 dış dünyaya kilitlendi).
   * Frontend doğrudan standart web portu olan `80:80`'e bağlandı.

---

## 🎓 BÖLÜM 5: Tersine Vekil (Reverse Proxy) ve Ağ Güvenliği Soru-Cevapları

### ❓ Soru 24: Reverse Proxy (Tersine Vekil) nedir ve Forward Proxy'den farkı nedir?
* **Cevap:**
  * **Forward Proxy (Vekil Sunucu - Örn: VPN, Okul/Şirket Filtresi):** İstemcinin (kullanıcının) önüne oturur. Kullanıcı internete çıkarken onun kimliğini gizler veya yasaklı siteleri engeller. Hedef sunucu kullanıcının gerçek IP'sini görmez.
  * **Reverse Proxy (Tersine Vekil - Örn: Nginx, Cloudflare):** Sunucuların önüne oturur. Kullanıcı hangi backend sunucusuna gittiğini bilmez; sadece kapıdaki Nginx ile konuşur. Nginx isteği arkadaki servislere paylaştırır, önbelleğe alır ve backend'i doğrudan saldırılardan korur.

---

### ❓ Soru 25: Nginx konfigürasyonunda neden `proxy_pass http://backend:5000;` yazabildik? IP adresine ne oldu?
* **Cevap:**
  * Docker Compose her ayağa kalktığında servisler için sanal bir köprü ağı (Bridge Network) kurar ve içine dahili bir **DNS Sunucusu (Embedded DNS Server)** yerleştirir.
  * `backend` ismi, `docker-compose.yml` dosyasındaki servis adıdır.
  * Nginx konteynırı `backend` adını çözümlemek istediğinde Docker DNS hemen araya girer ve onu backend konteynırının o anki iç IP'sine (örneğin `172.18.0.3`) yönlendirir.
  * Böylece konteynır IP'si değişse bile konfigürasyonumuz asla bozulmaz!

---

### ❓ Soru 26: Backend portunu (`5001`) Compose dosyasından silince frontend ona nasıl erişebiliyor?
* **Cevap:**
  * `ports:` direktifi bir portu **sunucunun dışına (internete / host işletim sistemine)** açmak içindir.
  * `backend` ve `frontend` aynı Docker ağı içinde yaşadıkları için birbirleriyle tüm portlardan özgürce konuşabilirler.
  * `ports:` bölümünü silmek, sadece dışarıdaki yabancıların (internet kullanıcılarının) doğrudan backend'e sızmasını engeller. Nginx ise aynı ağın içinde olduğu için `backend:5000` portuna rahatça ulaşır.

---

### ❓ Soru 27: Reverse Proxy mimarisi CORS sorununu nasıl kökten çözer?
* **Cevap:**
  * Tarayıcıların **Aynı Köken İlkesi (Same-Origin Policy)** kuralına göre: Protokol (`http`), Alan Adı (`<YOUR_VPS_IP>`) ve Port (`80`) aynı olduğu sürece istekler "aynı kökenden" kabul edilir ve CORS kuralları devreye bile girmez.
  * Artık HTML sayfamız da, attığımız `/api/notes` isteği de aynı `http://<YOUR_VPS_IP>` (Port 80) üzerinden geçtiği için tarayıcı bunu kendi evi gibi görür. Sıfır CORS hatası!

---

---

### 19. Aşama: DevSecOps Kültürü: Otomatik Test (Quality Gate) & Trivy Güvenlik Taraması 🧪🛡️

CI/CD boru hattımız daha önce her gelen kodu gözü kapalı derleyip canlıya atıyordu. Bu durum, yanlışlıkla bozuk bir kod push edildiğinde canlıdaki sitenin çökmesine sebep olabilirdi. Bu aşamada sektörel **DevSecOps (Geliştirme + Güvenlik + Operasyon)** ve **Shift-Left** prensiplerini sisteme entegre ettik:

```text
[Geliştirici: git push origin main]
       │
       ▼
1. Aşama: Depodaki Kodları Çek (Checkout)
       │
       ▼
2. Aşama: 🧪 OTOMATİK BİRİM TESTLERİ (Quality Gate - npm test)
   ├── Başarısız ise ──❌ BORU HATTI DERHAL DURDURULUR! (Canlıya dokunulmaz!)
   └── Başarılı ise  ──✅ Derleme Aşamasına Geç
       │
       ▼
3. Aşama: Docker İmajlarını Derle ve Docker Hub'a Push Et
       │
       ▼
4. Aşama: 🛡️ TRIVY GÜVENLİK MÜFETTİŞİ (Vulnerability Scan)
   ├── Üretilen imajı bilinen CVE zafiyetlerine karşı tara
   └── Güvenlik denetim raporu oluştur
       │
       ▼
5. Aşama: VPS'e SSH ile Canlı Dağıtım (Full CD)
```

#### Neler Yaptık?
1. **Test Edilebilir Mimari (`backend/app.js` & `backend/server.js`):**
   * Express uygulamasını (`app`) dinleme mantığından ayırarak modüler hale getirdik. Böylece test ortamında veritabanı olmadan veya geçici portlarda test edilebildi.
2. **Otomatik Test Paketi (`backend/test/api.test.js`):**
   * Node.js'in modern yerleşik test motoru (`node --test` ve `node:assert`) ile 4 kritik fonksiyonel testi yazdık:
     * Sağlık kontrolü endpoint yapısı testi,
     * Başlıksız not ekleme doğrulama (validation) testi (`400 Bad Request`),
     * Sadece boşluk içeren başlık reddi testi,
     * Olmayan rotalar için 404 testi.
3. **CI Pipeline'ına Test Kapısı (Quality Gate):**
   * `.github/workflows/deploy.yml` içine `npm ci && npm test` adımı eklendi. Test başarısız olursa derleme ve canlı dağıtım **kesinlikle başlamaz**.
4. **Aqua Security Trivy Güvenlik Taraması:**
   * CI boru hattına Trivy entegre edildi. Üretilen Docker imajları bilinen açıklar (CVE) için otomatik taranır ve GitHub loglarına güvenlik raporu basılır.

---

## 🎓 BÖLÜM 6: DevSecOps, Otomatik Test ve Güvenlik Soru-Cevapları

### ❓ Soru 28: "Shift-Left" felsefesi DevOps ve DevSecOps'ta ne anlama gelir?
* **Cevap:**
  * Geleneksel yazılım süreçlerinde test ve güvenlik en son aşamada, yani kod canlıya çıktıktan (sağ tarafta) sonra yapılırdı. Bu aşamada bir hata bulmak şirkete binlerce dolar ve itibar kaybına mal olurdu.
  * **Shift-Left (Sola Kaydırma):** Test ve güvenlik kontrollerini sürecin en başına (zaman çizgisinde sola), yani yazılımcı kodu yazar yazmaz **CI aşamasına** çekmektir. Hata canlıya gitmeden, henüz GitHub'dayken anında yakalanır ve engellenir.

---

### ❓ Soru 29: Neden testleri Docker Build aşamasından ÖNCE çalıştırırız?
* **Cevap:**
  * **Zaman ve Kaynak Tasarrufu (Fail Fast İlkesi):** Docker imajı derlemek ve Docker Hub'a yüklemek dakikalar sürer ve sunucu kaynaklarını tüketir.
  * Birim testleri ise saniyenin onda birinde (`300 milisaniye`) biter. Kodda bir hata varsa boşuna dakikalarca Docker imajı derlemekle vakit kaybetmeyiz; sistem saniyeler içinde kırmızı yanarak hatayı bildirir (**Hızlı Başarısız Ol - Fail Fast**).

---

### ❓ Soru 30: Trivy nedir ve konteynır güvenliğinde CVE taraması neden hayati önem taşır?
* **Cevap:**
  * Yazdığın kodda sıfır hata olsa bile, kullandığın temel Linux imajında (`alpine`, `ubuntu`) veya indirdiğin üçüncü parti kütüphanelerde (`express`, `pg`) dünyaca bilinen açıklar (**CVE - Common Vulnerabilities and Exposures**) bulunabilir.
  * **Trivy (Aqua Security):** Konteynır imajının içindeki her bir paketin sürümünü global siber güvenlik veritabanlarıyla karşılaştırır. Saldırganların sunucuya sızabileceği kritik bir zafiyet varsa bunu raporlar.

---

## 🧠 Sık Kullanılan Kritik Docker & Compose Komutları Sözlüğü

| Komut | Açıklama |
| :--- | :--- |
| `npm test` | Node.js projesinde tanımlı otomatik birim/entegrasyon testlerini çalıştırır. |
| `node --test` | Node.js 18+ ile gelen yerleşik, harici kütüphane gerektirmeyen test motoru. |
| `docker login` | Docker Hub hesabına terminalden kimlik doğrulaması yapar. |
| `docker tag <eski> <kullanici/imaj:tag>` | İmajı Docker Hub standartlarına uygun etiketler / versiyonlar. |
| `docker push <kullanici/imaj:tag>` | Etiketlenmiş imajı Docker Hub bulutuna yükler. |
| `docker-compose -f <dosya> pull` | Compose dosyasındaki imajların en güncel sürümlerini Docker Hub'dan indirir. |
| `docker-compose -f <dosya> up -d` | Belirtilen özel compose dosyasıyla (ör. prod) servisleri ayağa kaldırır. |
| `docker-compose -f <dosya> up -d --remove-orphans` | Servisleri kaldırırken eskiyen yetim konteynırları otomatik temizler. |
| `docker-compose version` | Kurulu olan Docker Compose sürümünü (v1 vs v2) görüntüler. |
| `docker rm -f <konteynir>` | Çalışan veya kilitlenmiş bir konteynırı zorla durdurup siler. |
| `docker container prune -f` | Durdurulmuş tüm gereksiz konteynırları topluca temizler. |
| `docker compose config` | `.env` değişkenlerinin YAML içine nasıl yerleştiğini doğrular. |
| `docker compose up -d` | Bütün servisleri derler (build), ağları kurar ve arka planda (-d) sırayla ayağa kaldırır. |
| `docker compose up -d --build` | Kodlarda değişiklik varsa imajları yeniden derleyip ayağa kaldırır. |
| `docker compose down` | Tüm sistemi (konteynırlar, ağlar) tek komutla kapatır ve temizler. |
| `docker compose down -v` | **DİKKAT:** Konteynırlarla birlikte kalıcı veri kasalarını (Volume) da siler. |
| `docker compose ps` | Compose ile yönetilen servislerin canlı durumunu gösterir. |
| `docker compose logs -f` | Tüm servislerin (frontend, backend, db) loglarını tek ekranda renkli canlı izletir. |
| `docker exec -it <ad> psql -U <user> -d <db>` | PostgreSQL konteynırının içine SQL terminali açar. |
| `docker build -t <isim> <dizin>` | Belirtilen dizindeki Dockerfile'dan imaj üretir. |
| `docker run -d -p <host>:<container> --name <ad> <imaj>` | Tek bir konteynırı manuel çalıştırır. |
| `docker volume ls` | Kalıcı veri kasalarını listeler. |
| `docker network ls` | Mevcut Docker ağlarını listeler. |

---

## 🏁 Tebrikler: DevOps Uçtan Uca Tamamlandı!
1. Konteynırlaştırma ve Dockerfile temelleri ✅
2. Kalıcı Veri (Volumes) & Ağ (Networks) ✅
3. Çoklu Servis Orkestrasyonu (Docker Compose) ✅
4. Production Güvenliği (.env & non-root user) ✅
5. Docker Hub Registry & İmaj Dağıtımı ✅
6. CI Otomasyonu (GitHub Actions Build & Push) ✅
7. Canlı VPS Sunucusunda Canlı Dağıtım & Doğrulama ✅
8. Full CD Otomasyonu (GitHub Actions SSH ile Sıfır Dokunuş Canlı Dağıtım) ✅
9. Tersine Vekil (Reverse Proxy) Mimarisi ve Backend Dış İzolasyonu (v1.2.0) ✅
10. DevSecOps Kültürü: Otomatik Test (Quality Gate) & Trivy Güvenlik Taraması ✅











