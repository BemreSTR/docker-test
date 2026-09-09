# 🐳 DevOps & DevSecOps Full-Stack Cloud Lab

[![CI/CD Pipeline](https://github.com/BemreSTR/docker-test/actions/workflows/deploy.yml/badge.svg)](https://github.com/BemreSTR/docker-test/actions)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Trivy](https://img.shields.io/badge/Trivy_Security-1904DA?style=for-the-badge&logo=aqua&logoColor=white)
![Ubuntu VPS](https://img.shields.io/badge/Ubuntu_VPS-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)

> **Uçtan Uca Konteynırlaştırma, Tersine Vekil (Reverse Proxy), Otomatik Test & Güvenlik Kapıları ve Sıfır Dokunuş (Zero-Touch) CI/CD Boru Hattı İçeren Kurumsal Seviye Canlı Dağıtım Laboratuvarı.**

---

## 🌟 Proje Özeti

Bu proje; sıradan bir web uygulamasını alıp **12-Factor App**, **Konteynır İzolasyonu**, **Tersine Vekil Mimarisi**, **DevSecOps (Shift-Left)** ve **Tam Otomatik Dağıtım (Continuous Deployment)** prensiplerine göre modernize edilmiş, üretime (Production) hazır hale getirilmiş bir DevOps portfolyo çalışmasıdır.

Lokal geliştirme ortamından başlayarak, bulutta GitHub sanal makinelerinde test edilen, Docker Hub üzerinde versiyonlanan ve bağımsız bir **Ubuntu VPS** sunucusunda sıfır insan müdahalesiyle canlıya alınan çok katmanlı (Multi-Tier) bir sistemdir.

---

## 🏗️ Sistem Mimarisi

Sistem, dış tehditlere karşı **saldırı yüzeyini daraltan (Attack Surface Reduction)** ve istemci ile mikroservisler arasına güvenlik katmanı ören **Nginx Reverse Proxy** modeli üzerine kuruludur:

```text
                                [ İNTERNET / TARAYICI ]
                                          │
                                          │ HTTP İstekleri (Standart Port 80)
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │       Nginx Web Sunucusu (Proxy)        │
                     │       Konteynır: web-uygulamam-prod     │
                     └────────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │                                               │
           İstek: "/" (Statik Dosyalar)                    İstek: "/api/*"
                  │                                               │
                  ▼                                               ▼
         [ HTML / CSS / Vanilla JS ]                     Docker Dahili Bridge Ağı
                                                                  │
                                                                  ▼
                                                   ┌─────────────────────────────┐
                                                   │   Node.js REST API (v1.2.0) │
                                                   │   Konteynır: backend-api    │
                                                   │  🔒 Dış Dünyaya Kapalı (5000)│
                                                   └──────────────┬──────────────┘
                                                                  │
                                                                  ▼ (İç Ağ: 5432)
                                                   ┌─────────────────────────────┐
                                                   │   PostgreSQL 16 Veritabanı  │
                                                   │   Konteynır: veritabani     │
                                                   │  🔒 Dış Dünyaya Kapalı      │
                                                   │  💾 Volume: pg_verisi_prod  │
                                                   └─────────────────────────────┘
```

---

## 🚀 DevSecOps & CI/CD Boru Hattı (Zero-Touch CD)

Kod tabanına atılan her `git push origin main` komutu, GitHub Actions üzerinde aşağıdaki otomatik kalite ve güvenlik aşamalarından geçer:

```text
[Geliştirici: git push origin main]
       │
       ▼
1. Aşama: 🧪 Otomatik Birim Testleri (Quality Gate)
   └── Node.js dahili test koşucusu (node:test) ile API doğrulama testleri koşar.
   └── Başarısız olursa boru hattı DERHAL DURUR, canlı sunucuya asla dokunulmaz!
       │
       ▼ (Testler Yeşilse)
2. Aşama: 🐳 Docker Buildx ile Çoklu Mimari İmaj Derleme
   └── Backend ve Frontend için 'latest' ve SemVer ('v1.2.0') etiketli imajlar üretilir.
       │
       ▼
3. Aşama: 🔑 Docker Hub Kayıt Deposu Dağıtımı
   └── Üretilen mühürlü imajlar Docker Hub registry'sine push edilir.
       │
       ▼
4. Aşama: 🛡️ Aqua Security Trivy Konteynır Güvenlik Taraması
   └── İmajlar bilinen CVE güvenlik açıklarına karşı taranır ve denetim raporu üretilir.
       │
       ▼
5. Aşama: 🚀 SSH Tabanlı Sıfır Dokunuş Canlı Dağıtım (Zero-Touch CD)
   └── GitHub Actions, GitHub Secrets üzerinden canlı VPS sunucusuna bağlanır.
   └── 'docker-compose.prod.yml pull' ve 'up -d --remove-orphans' komutlarını işletir.
   └── Canlı sistem kesintisiz olarak yeni sürüme yükseltilir!
```

---

## ✨ Öne Çıkan Mühendislik & Güvenlik Özellikleri

* **🛡️ Tersine Vekil & Sıfır CORS:** Nginx, statik dosyaları sunarken `/api/*` isteklerini arka plandaki `http://backend:5000` konteynırına iletir. Frontend ve Backend aynı origin altında (Port 80) buluştuğundan CORS kısıtlamaları ve çirkin portlar (`:8081`, `:5001`) tamamen ortadan kalkar.
* **🔒 İzolasyon & En Düşük Yetki (Least Privilege):** Backend ve PostgreSQL servislerinin portları dış internete kapatılmıştır (`ports:` kaldırılmıştır). Backend konteynırı `root` yerine yetkisiz `node` kullanıcısıyla çalışır.
* **💾 Veri Kalıcılığı (Data Persistence):** PostgreSQL verileri host makineden izole, adlandırılmış Docker Volume (`pg_verisi_prod`) üzerinde saklanır. Konteynırlar silinse veya güncellense bile veri kaybı yaşanmaz.
* **⚙️ 12-Factor Yapılandırma:** Kod tabanında hiçbir sabit şifre/kullanıcı adı bulunmaz. Tüm gizli bilgiler `.env` üzerinden enjekte edilir; repoda yalnızca şablon olan `.env.example` barındırılır.
* **🧪 Sola Kaydırılmış Güvenlik (Shift-Left):** Hatalar üretim aşamasında değil, `npm test` ve `Trivy Vulnerability Scanner` ile henüz CI aşamasındayken yakalanır. Bağımlılıklar `npm overrides` ile taranarak **0 Vulnerabilities** seviyesine getirilmiştir.
* **🏭 Dev vs. Prod Reçetesi:** 
  * Geliştirme: `docker-compose.yml` (yerel kaynak koddan derler).
  * Canlı Prod: `docker-compose.prod.yml` (sunucuda tek satır kaynak kod tutmaz, doğrudan Docker Hub'dan hazır imajları çeker).

---

## 📂 Dizin Yapısı

```bash
docker-test/
├── .github/workflows/
│   └── deploy.yml            # Test, Build, Trivy Scan ve SSH Deploy CI/CD iş akışı
├── backend/
│   ├── test/
│   │   └── api.test.js       # Node.js yerleşik test motoruyla yazılmış birim testleri
│   ├── app.js                # Express rotaları ve DB havuzu (Test edilebilir modüler yapı)
│   ├── server.js             # HTTP dinleyici başlatıcı
│   ├── package.json          # Bağımlılıklar ve CVE yamalama (overrides)
│   ├── Dockerfile            # Multi-stage / Non-root Node.js Docker imaj reçetesi
│   └── .dockerignore         # node_modules ve gereksiz dosyaları imaj dışı bırakan kural
├── frontend/
│   ├── nginx.conf            # Reverse Proxy kurallarını içeren özel Nginx konfigürasyonu
│   ├── index.html            # API Playground arayüzü
│   ├── style.css             # Modern koyu tema arayüz stilleri
│   ├── app.js                # Nginx proxy'yi hedefleyen göreceli (/api) istemci mantığı
│   ├── Dockerfile            # Nginx + Özel konfigürasyon içeren Dockerfile
│   └── .dockerignore         # Frontend imaj temizlik kuralları
├── docs/
│   ├── Fazlar.md             # Projenin 11 büyük gelişim fazının detaylı hikayesi
│   ├── neleryaptik.md        # 30+ Soru-Cevap içeren kapsamlı DevOps günlüğü & başucu kaynağı
│   └── Nginx-Reverse-Proxy.md# Tersine Vekil mimarisi teknik uygulama planı
├── docker-compose.yml        # Lokal geliştirme orkestrasyonu
├── docker-compose.prod.yml   # Canlı sunucu (Production) orkestrasyonu
├── .env.example              # Ortam değişkenleri örnek şablonu
└── .gitignore                # Hassas verilerin (.env, .DS_Store) sızmasını önleyen kurallar
```

---

## 💻 Yerel Kurulum (Local Development)

Projeyi kendi yerel bilgisayarınızda çalıştırmak için:

### Gereksinimler
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
* [Node.js](https://nodejs.org/) (v20+ - Opsiyonel, yerel testler için)

### Adımlar

1. **Repoyu klonlayın:**
   ```bash
   git clone https://github.com/BemreSTR/docker-test.git
   cd docker-test
   ```

2. **Ortam değişkenlerini hazırlayın:**
   ```bash
   cp .env.example .env
   # .env dosyasını dilediğiniz gibi düzenleyebilirsiniz
   ```

3. **Tüm sistemi tek komutla ayağa kaldırın:**
   ```bash
   docker compose up -d --build
   ```

4. **Tarayıcınızdan erişin:**
   * **Web Arayüzü:** `http://localhost:8081`
   * Sistem otomatik olarak arka plandaki PostgreSQL ve Node.js API ile haberleşecektir.

5. **Birim testlerini yerelde koşturmak için:**
   ```bash
   cd backend
   npm install
   npm test
   ```

---

## 🌐 Canlı Sunucu (Production) Dağıtımı

Canlı sunucuda kaynak kodlara ihtiyaç yoktur. Yalnızca orkestrasyon dosyası ve ortam değişkenleri kullanılır:

```bash
# 1. Canlı sunucuda klasör oluşturun ve compose dosyasını çekin
mkdir -p /opt/docker-test && cd /opt/docker-test
# (docker-compose.prod.yml ve .env dosyanızı yerleştirin)

# 2. İmajları Docker Hub'dan çekip konteynırları başlatın
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --remove-orphans
```

Tüm güncellemeler, GitHub Actions üzerinden `main` dalına push yapıldığında sunucuya **otomatik olarak** yansıtılır.

---

## 📚 Mühendislik Dokümantasyonu & Öğrenim Notları

Proje boyunca karşılaşılan production krizleri, mimari kararlar ve DevOps mülakat soruları detaylı dokümante edilmiştir:
* 📖 **[Fazlar Özeti (docs/Fazlar.md)](docs/Fazlar.md)**: Sıfırdan zirveye 11 adımda mimarinin evrimi.
* 📕 **[DevOps Rehberi (docs/neleryaptik.md)](docs/neleryaptik.md)**: 30 kıdemli soru-cevap, Docker hata çözümleri (`KeyError: ContainerConfig`), ağ mimarileri ve komutlar sözlüğü.

---

## 👤 Geliştirici

**Bekir Emre**  
* GitHub: [@BemreSTR](https://github.com/BemreSTR)
* Proje: TÜİK Staj DevOps & Cloud Architecture Lab
