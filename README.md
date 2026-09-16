# 🌐 Cloud-Native Distributed Architecture & Telemetry Gateway (v2.0.0)

[![CI/CD Pipeline](https://github.com/BemreSTR/docker-test/actions/workflows/deploy.yml/badge.svg)](https://github.com/BemreSTR/docker-test/actions)
![Architecture](https://img.shields.io/badge/Architecture-Multi--Tier%20Microservices-blue?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Golang](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx%20L7-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![DevSecOps](https://img.shields.io/badge/Trivy%20Scan-Passed-1904DA?style=for-the-badge&logo=aqua&logoColor=white)

> **Modern Bulut-Bilişim (Cloud-Native), Dağıtık Sistem Mimarisi, Mikroservis Eşzamanlılığı, L7 Tersine Vekil Yönlendirmesi, DevSecOps Kalite Kapıları ve Dağıtık Telemetri (Observability) Platformu.**

---

## 📌 Proje Genel Bakışı & Mühendislik Kapsamı

Bu proje; kurumsal ölçekte modern yazılım mühendisliği pratiklerini, dağıtık sistem prensiplerini ve bulut bilişim yaşam döngüsünü (SDLC) uçtan uca uygulamak amacıyla geliştirilmiştir. Sistem; **12-Factor App** metodolojisi, **Çok Katmanlı (Multi-Tier) Mikroservis Ayrıştırması**, **Katman-7 (L7) Ağ İzolasyonu**, **Statik Güvenlik Analizi (Shift-Left DevSecOps)**, **Otomatik Test Kalite Kapıları (Quality Gates)** ve **Dağıtık Metrik İzleme (Observability)** mimarisi üzerine inşa edilmiştir.

### 📐 Mimari Bileşenler ve Servis Ekosistemi

Platform, birbirinden bağımsız çalışan, izole ağ protokolleriyle haberleşen ve ölçeklenebilir 5 ana modülden meydana gelmektedir:

1. **Katman-7 Edge Router & Tersine Vekil (Nginx Reverse Proxy):**
   * Tüm istemci trafiğini tek bir güvenli uç noktadan (`Port 80`) karşılayarak arkadaki servislere yük dağıtan ve dinamik API yönlendirmesi yapan tersine vekil katmanı.
   * Çapraz Kaynak Paylaşımı (CORS) kısıtlamalarını ortadan kaldıran ve arka uç servislerinin doğrudan internete maruz kalmasını engelleyen saldırı yüzeyi daraltma (Attack Surface Reduction) mekanizması.

2. **Asenkron RESTful Telemetri ve Veri Servisi (Node.js / Express):**
   * Olay tabanlı (event-driven) ve bloklamasız G/Ç (non-blocking I/O) mimarisine sahip REST API servisi.
   * PostgreSQL ilişkisel veri tabanı bağlantı havuzu (Connection Pooling), parametrik SQL injection koruması, telemetri ara katmanları (middleware) ve sistem sağlık denetleyicileri.

3. **Yüksek Eşzamanlı Görev İşleme Mikroservisi (TaskPilot Core - Go / Chi Engine):**
   * Go dilinin yerel `goroutine` ve `channel` eşzamanlılık (concurrency) mekanizmalarını kullanan yüksek performanslı arka uç servisi (`Port 8082`).
   * Durumsuz (stateless) JWT kimlik doğrulaması, tip-güvenli yönlendirme (Chi router), yapılandırılmış loglama ve yerleşik veritabanı şema migrasyon motoru.

4. **İlişkisel Veri Depolama Katmanı (PostgreSQL 16 Relational Engine):**
   * ACID (Atomicity, Consistency, Isolation, Durability) garantisi sunan ilişkisel veri depolama katmanı.
   * Dış internet erişimine tamamen kapatılmış, yalnızca konteynır içi köprü (bridge) ağı üzerinden erişilen ve kalıcı Docker Volume (`pg_verisi_prod`) ile mühürlenmiş veri mimarisi.

5. **Dağıtık Gözlenebilirlik ve Telemetri Hattı (Prometheus & Grafana Observability Hub):**
   * Çekme (pull-based) mimarisiyle çalışan Prometheus zaman serisi veri toplayıcısı (`scrape_configs`).
   * İki ayrı organizasyonel panoyla telemetri görselleştirmesi sunan Grafana izleme merkezi (`Port 3000`):
     * **Pano 1 (Gateway & System Observatory):** Sistem çalışma süresi (uptime), Liveness kontrolleri, p95/p50 yanıt gecikmeleri, istek hızları (RPS), V8 Heap bellek dağılımı.
     * **Pano 2 (TaskPilot Go Core):** Go HTTP işlem trafiği, çalışma zamanı goroutine sayıları, Garbage Collection (GC) duraksama süreleri ve thread metrikleri.

---

## 🏛️ Dağıtık Sistem ve Ağ Topolojisi

Sistem, **Sıfır Güven (Zero-Trust)** ağ izolasyonu prensibiyle katmanlandırılmıştır. Dış dünyaya yalnızca Katman-7 Tersine Vekil açık olup; veritabanı ve uygulama sunucuları izole bir Docker ağı arkasında korunmaktadır:

```text
                                [ DIŞ İNTERNET / İSTEMCİLER ]
                                              │
                                              │ HTTP / HTTPS (Port 80)
                                              ▼
                    ┌──────────────────────────────────────────────────┐
                    │      Katman-7 Tersine Vekil (Nginx Edge)         │
                    │      - Statik Varlık Dağıtımı & Önbellek         │
                    │      - Dinamik /api Yönlendirmesi                │
                    │      - Saldırı Yüzeyi İzolasyonu                 │
                    └────────┬────────────────────────────────┬────────┘
                             │                                │
                 [ / ] İstemci Paneli                [ /api/* ] Dahili Yönlendirme
                             │                                │
                             ▼                                ▼
                    ┌─────────────────┐       ┌────────────────────────────────┐
                    │ Mission Control │       │   İzole Docker Köprü Ağı       │
                    │ Observatory UI  │       │   (backend-network / 172.x.x.x)│
                    └─────────────────┘       └───────────────┬────────────────┘
                                                              │
                                     ┌────────────────────────┼────────────────────────┐
                                     │                        │                        │
                                     ▼                        ▼                        ▼
                      ┌─────────────────────────┐  ┌────────────────────┐  ┌───────────────────────┐
                      │ Node.js Telemetry API   │  │ TaskPilot Core     │  │ Prometheus Telemetry  │
                      │ - Non-root (node:1000)  │  │ - Go Chi Engine    │  │ - Zaman Serisi Havuzu │
                      │ - Express REST Router   │  │ - Goroutine Pools  │  │ - Periyodik Kazıma    │
                      │ - Dış Porta Kapalı      │  │ - Port: 8082       │  │ - Port: 9090 (İç Ağ)  │
                      └────────────┬────────────┘  └─────────┬──────────┘  └───────────┬───────────┘
                                   │                         │                         │
                                   └────────────┬────────────┘                         │
                                                │ (Port 5432)                          ▼
                                                ▼                             ┌─────────────────┐
                                 ┌─────────────────────────────┐              │ Grafana Hub     │
                                 │ PostgreSQL 16 Veri Katmanı  │              │ - Dual Dashboard│
                                 │ - Dış Dünyaya Tamamen Kapalı│              │ - Port: 3000    │
                                 │ - Volume: pg_verisi_prod    │              └─────────────────┘
                                 └─────────────────────────────┘
```

---

## 🔬 Uygulanan Bilgisayar Mühendisliği Disiplinleri

### 1. Yazılım Tasarımı ve RESTful API Mimarisi
* **Katmanlı Tasarım (Layered Architecture):** Veri tabanı erişimi (DAL), servis iş mantığı (BLL) ve sunum katmanı (API Controller) birbirinden ayrılmıştır.
* **Asenkron G/Ç & Event-Loop Verimliliği:** Node.js tek iş parçacıklı asenkron modelinde CPU bloklanmalarını önleyen `async/await` ve Promise tabanlı veritabanı sorgu akışları.
* **SQL Injection Savunması:** Tüm veritabanı sorguları dinamik string birleştirme yerine kesin parametrelendirme (`$1, $2`) ile çalıştırılmaktadır.
* **Tip Güvenliği ve Eşzamanlılık (Go):** TaskPilot mikroservisinde bellek güvenliği sağlayan Go yapıları (structs), type assertion kontrolleri ve thread-safe veri manipülasyonu.

### 2. Ağ İzolasyonu ve Güvenlik Mühendisliği (Least Privilege)
* **DMZ & Tersine Vekil:** PostgreSQL (5432) ve Node.js Backend (5000) konteynırlarının ana makineye port eşlemesi (`ports:`) kaldırılmış, servisler sadece dahili Docker Bridge ağı içerisinde birbiriyle konuşacak şekilde yalıtılmıştır.
* **En Az Yetki İlkesi (Least Privilege):** Konteynır imajları varsayılan `root` kullanıcısı yerine sınırlandırılmış sistem kullanıcısı (`USER node`, UID 1000) kimliğiyle çalışacak şekilde yapılandırılmıştır.
* **Güvenli Konfigürasyon Yönetimi (12-Factor):** Kaynak koda hiçbir gizli anahtar (secret) veya parola gömülmemiş, tüm yapılandırmalar ortam değişkenleri (`.env`) üzerinden sisteme dinamik olarak enjekte edilmiştir.

### 3. Kalite Güvencesi ve Otomasyon (CI/CD Quality Gates)
* **Otomatik Birim ve Entegrasyon Testleri:** Node.js yerleşik `node:test` kütüphanesiyle yazılmış 8 kapsamlı test senaryosu her kod gönderiminde GitHub sanal makinelerinde koşar:
  * Servis liveness ve health check doğrulaması
  * Sistem servis durum matrisi doğrulaması
  * REST API CRUD yaşam döngüsü doğrulaması
  * Parametrik telemetri yanıt yapısı doğrulaması
  * Güvenlik denetim (Security Audit) kontrolleri doğrulaması
  * Kaos mühendisliği ve gecikme toleransı (Chaos Latency) testi
* **Katı Kalite Kapısı (Strict Quality Gate):** Tek bir test bile başarısız olduğunda boru hattı derhal durdurulur; hatalı kodun derlenmesine veya dağıtılmasına izin verilmez.

### 4. DevSecOps & Güvenlik Taraması (Shift-Left)
* **Aqua Security Trivy Entegrasyonu:** CI/CD aşamasında derlenen Docker imajları, CVE veritabanları üzerinden statik güvenlik analizine tabi tutulur.
* **Bağımlılık Güvenliği (Dependency Auditing):** `package.json` içerisindeki `overrides` direktifleriyle kritik bağımlılık zafiyetleri yamalanmış ve temiz imaj üretimi güvence altına alınmıştır.

---

## 🔄 Sürekli Entegrasyon ve Dağıtım (CI/CD) Boru Hattı

Sistem, **Sıfır Dokunuş (Zero-Touch Continuous Deployment)** felsefesiyle yapılandırılmıştır. Geliştirici ortamında onaylanan kod `main` dalına itildiği andan itibaren insan müdahalesi olmaksızın şu aşamaları tamamlar:

```text
[ Git Push: main ] 
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Aşama 1: 🧪 Otomatik Testler & Kalite Doğrulama          │
│ - Node.js test motoru (node:test) ile 8 test çalıştırılır│
│ - Başarısızlık durumunda boru hattı KESİLİR              │
└──────────────────────────┬───────────────────────────────┘
                           │ Testler Geçti (Success)
                           ▼
┌──────────────────────────────────────────────────────────┐
│ Aşama 2: 🐳 Çoklu Mimari İmaj Derleme (Docker Buildx)    │
│ - Frontend (Nginx) ve Backend (Node.js) imajları derlenir│
│ - SemVer (Semantic Versioning) ve 'latest' etiketlenir   │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ Aşama 3: 🛡️ Aqua Security Trivy Güvenlik Analizi         │
│ - CVE zafiyet taraması gerçekleştirilir                  │
│ - Güvenlik denetim raporu üretilir                       │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ Aşama 4: 📦 Docker Hub Registry Dağıtımı                 │
│ - Mühürlü konteynır imajları Docker Hub deposuna yüklenir│
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ Aşama 5: 🚀 Canlı Sunucuya Sıfır Dokunuş Dağıtım (CD)   │
│ - GitHub Secrets üzerinden SSH ile VPS'e bağlanılır      │
│ - 'docker-compose.prod.yml pull' işletilir               │
│ - Konteynırlar sıfır kesintiyle yeni sürüme güncellenir  │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 Dağıtık Telemetri ve Gözlenebilirlik (Observability)

Grafana (`Port 3000`) üzerinde ayrıştırılmış iki kurumsal izleme panosu bulunmaktadır:

| Pano Adı | Kapsam | İzlenen Kritik Metrikler |
| :--- | :--- | :--- |
| **Platform 1: Gateway & Distributed Telemetry** | L7 Proxy, Node.js Gateway, PostgreSQL Havuzu | Sistem Çalışma Süresi (Uptime), Liveness Probları, İstek Hızı (RPS Rate), p95 / p50 API Gecikme Histogramı, V8 Heap RAM Kullanımı, Prometheus Örnek Toplama Hızı |
| **Platform 2: TaskPilot Go Core** | Go Mikroservis Çalışma Zamanı (Runtime) | Go HTTP İstek Dağılımı, Çalışan Goroutine Sayısı, Eşzamanlı İş Parçacıkları (Threads), Sanal Bellek ve GC Duraksamaları |

---

## 📡 REST API Uç Noktaları Spesifikasyonu

Gateway servisi tarafından sunulan temel RESTful uç noktalar:

| Yöntem | Uç Nokta | Açıklama | Yanıt Durumu |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Servis sağlık durumu ve veritabanı liveness probe kontrolü | `200 OK` |
| `GET` | `/api/telemetry` | V8 bellek istatistikleri, çalışma süresi ve platform metrikleri | `200 OK` |
| `GET` | `/api/security/audit` | CIS uyumluluk göstergeleri, non-root doğrulama ve ağ izolasyon raporu | `200 OK` |
| `GET` | `/api/services/status` | Çoklu servis topolojisi durum matrisi (Nginx, Go Core, Node, Postgres) | `200 OK` |
| `GET` | `/api/notes` | İlişkisel veritabanından kalıcı veri kayıtlarının listelenmesi | `200 OK` |
| `POST` | `/api/notes` | Parametrik SQL doğrulamasıyla yeni veri kaydı oluşturma | `201 Created` |
| `POST` | `/api/chaos/latency` | Kaos mühendisliği testleri için yapay gecikme enjeksiyon simülasyonu | `200 OK` |

---

## 💾 Veritabanı Şeması (Database Schema)

Sistemde PostgreSQL üzerinde çalışan ana veri tablosu:

```sql
CREATE TABLE IF NOT EXISTS notlar (
    id SERIAL PRIMARY KEY,
    icerik TEXT NOT NULL,
    eklenme_tarihi TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notlar_eklenme_tarihi ON notlar(eklenme_tarihi DESC);
```

---

## 🧪 Kalite Güvencesi ve Test Doğrulama

Yerel ortamda otomatik birim ve entegrasyon testlerini koşturmak için:

```bash
cd backend
npm install
npm test
```

**Test Çıktısı Örneği:**
```text
✔ Sistem Liveness ve Sağlık Durumu (/api/health) (38ms)
✔ Mikroservis Topolojisi Durum Matrisi (/api/services/status) (14ms)
✔ Dağıtık Telemetri ve Çalışma Metrikleri (/api/telemetry) (12ms)
✔ DevSecOps Güvenlik Denetim Özeti (/api/security/audit) (11ms)
✔ Kalıcı Veri Listeleme Servisi (/api/notes - GET) (15ms)
✔ Parametrik Güvenli Kayıt Ekleme Servisi (/api/notes - POST) (18ms)
✔ Giriş Doğrulama ve Hatalı İstek Kontrolü (/api/notes - Geçersiz İstek) (8ms)
✔ Kaos ve Gecikme Enjeksiyon Simülatörü (/api/chaos/latency) (62ms)

ℹ tests 8 | pass 8 | fail 0 | cancelled 0 | skipped 0 | todo 0
```

---

## 🛠️ Yerel Geliştirme Ortamı Kurulumu

Projeyi yerel makinenizde konteynır mimarisiyle ayağa kaldırmak için:

### Ön Koşullar
* [Docker & Docker Compose](https://www.docker.com/) (v24.0+)
* [Node.js](https://nodejs.org/) (v20+ - Yalnızca yerel testler için)

### Çalıştırma Adımları

```bash
# 1. Depoyu klonlayın
git clone https://github.com/BemreSTR/docker-test.git
cd docker-test

# 2. Ortam değişkenlerini yapılandırın
cp .env.example .env

# 3. İzole servis kümesini derleyin ve başlatın
docker compose up -d --build

# 4. Tarayıcıdan erişin
# Mission Control UI: http://localhost:8081
```

---

## 🌐 Canlı Sistem ve Servis Dağıtımı

Sistem, bağımsız bir **Ubuntu VPS** üzerinde `docker-compose.prod.yml` orkestrasyonu ile canlıda hizmet vermektedir:

* 🚀 **Ana Gateway & Telemetri Portalı:** `http://193.111.78.227/` (Port 80)
* ⚡ **TaskPilot Go Mikroservis Çekirdeği:** `http://193.111.78.227:8082/` (Port 8082)
* 📊 **Grafana Observability Hub:** `http://193.111.78.227:3000/` (Port 3000)
  * *İzleme Yetkisi:* `admin` / `bekir123`

---

## 📁 Dizin Organizasyonu

```bash
docker-test/
├── .github/workflows/
│   └── deploy.yml            # CI/CD: Test, Buildx, Trivy Scan, Docker Hub ve SSH Deploy
├── backend/
│   ├── test/
│   │   └── api.test.js       # Otomatik 8 kalite kapısı entegrasyon testi (node:test)
│   ├── app.js                # Express REST API, havuz yönetimi ve telemetri servisleri
│   ├── server.js             # HTTP sunucu başlatıcı ve graceful shutdown dinleyicisi
│   ├── package.json          # Paket manifestosu ve CVE yamalama (overrides) kuralları
│   ├── Dockerfile            # Non-root (node:1000) tabanlı multi-stage Docker reçetesi
│   └── .dockerignore         # İmaj temizliği ve katman boyutu optimizasyonu
├── frontend/
│   ├── nginx.conf            # Katman-7 Tersine Vekil ve yönlendirme kuralları
│   ├── index.html            # Mission Control Telemetri Paneli arayüzü
│   ├── style.css             # Kurumsal koyu tema stilleri ve topoloji haritası
│   ├── app.js                # Canvas gecikme grafiği, asenkron REST istemcisi ve trafik üretici
│   ├── Dockerfile            # Nginx Edge sunucu Docker imaj reçetesi
│   └── .dockerignore         # Dağıtım dışı varlık filtresi
├── docs/
│   ├── Fazlar.md             # Mimarinin 11 fazlık gelişim günlüğü ve mühendislik kararları
│   ├── neleryaptik.md        # Detaylı DevOps, mimari ve altyapı dokümantasyonu
│   └── Nginx-Reverse-Proxy.md # L7 Tersine Vekil mimarisi tasarım dokümanı
├── docker-compose.yml        # Geliştirme ortamı (Development) servis orkestrasyonu
├── docker-compose.prod.yml   # Canlı ortam (Production) konteynır orkestrasyonu
├── .env.example              # Ortam değişkenleri şablonu (12-Factor uyumlu)
└── .gitignore                # Güvenlik ve gizlilik filtreleme kuralları
```

---

## 👨‍💻 Geliştirici & Mühendislik Bilgileri

**Bekir Emre Sarıpınar**  
* GTÜ Bilgisayar Mühendisliği (Öğrenci No: 220104004039)  
* GitHub: [@BemreSTR](https://github.com/BemreSTR)  
* Proje: Bulut-Bilişim ve Dağıtık Sistem Mimarisi Geliştirme Laboratuvarı
