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

## 🧠 Sık Kullanılan Kritik Docker Komutları Sözlüğü

| Komut | Açıklama |
| :--- | :--- |
| `docker build -t <isim> .` | Bulunulan dizindeki Dockerfile'dan imaj üretir. |
| `docker run -d -p <host>:<container> --name <ad> <imaj>` | Konteynırı arka planda (-d) port yönlendirerek (-p) çalıştırır. |
| `docker ps` | Sadece çalışan aktif konteynırları listeler. |
| `docker ps -a` | Durmuş olanlar dahil tüm konteynırları listeler. |
| `docker rm -f <ad>` | Çalışan konteynırı zorla durdurur ve siler. |
| `docker logs -f <ad>` | Konteynırın canlı konsol / sunucu çıktılarını izler. |
| `docker exec -it <ad> sh` | Çalışan konteynırın içine canlı Linux terminali açar. |
| `docker volume ls` | Docker'daki kalıcı veri kasalarını listeler. |
| `docker volume rm <ad>` | Belirtilen named volume'ü siler. |

---

## 🚀 Sırada Ne Var?
* **2. Adım: Docker Compose:** Frontend + Backend API + PostgreSQL veritabanını tek bir `docker-compose.yml` dosyası ve tek bir komutla (`docker compose up`) aynı ağda çalıştırma.
