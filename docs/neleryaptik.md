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

## 🧠 Sık Kullanılan Kritik Docker & Compose Komutları Sözlüğü

| Komut | Açıklama |
| :--- | :--- |
| `docker compose up -d` | Bütün servisleri derler (build), ağları kurar ve arka planda (-d) sırayla ayağa kaldırır. |
| `docker compose down` | Tüm sistemi (konteynırlar, ağlar) tek komutla kapatır ve temizler. |
| `docker compose down -v` | **DİKKAT:** Konteynırlarla birlikte kalıcı veri kasalarını (Volume) da siler. |
| `docker compose ps` | Compose ile yönetilen servislerin canlı durumunu gösterir. |
| `docker compose logs -f` | Tüm servislerin (frontend, backend, db) loglarını tek ekranda renkli canlı izletir. |
| `docker exec -it <ad> psql -U <user> -d <db>` | PostgreSQL konteynırının içine SQL terminali açar. |
| `docker build -t <isim> <dizin>` | Belirtilen dizindeki Dockerfile'dan imaj üretir. |
| `docker run -d -p <host>:<container> --name <ad> <imaj>` | Tek bir konteynırı manuel çalıştırır. |
| `docker run -v "$PWD":<hedef> ...` | Klasörü canlı ayna olarak bağlar (**Bind Mount**). |
| `docker run -v <kasa_adi>:<hedef> ...` | Kalıcı veri kasası bağlar (**Named Volume**). |
| `docker ps -a` | Tüm konteynırları listeler. |
| `docker rm -f <ad>` | Konteynırı zorla siler. |
| `docker volume ls` | Kalıcı veri kasalarını listeler. |
| `docker network ls` | Mevcut Docker ağlarını listeler. |

---

## 🚀 Sırada Ne Var?
1. `docker compose down` ve `docker compose up -d` ile tek komutla tüm sistemi kapatıp açmayı deneyimlemek.
2. Kalıcı verilerin korunduğunu doğrulamak.
3. Sırada: **İmajlarımızı Docker Hub'a yüklemek ve prod sunucularına dağıtmak!**




