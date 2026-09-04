# 1. Aşama: Temel İmaj (Base Image)
# Nginx'in ultra hafif (yaklaşık 20-25 MB) Alpine Linux tabanlı sürümünü kullanıyoruz.
FROM nginx:alpine

# 2. Aşama: Dosyaları Konteynır İçine Kopyalama
# Bilgisayarımızdaki statik web dosyalarını, Nginx'in varsayılan olarak yayın yaptığı klasöre kopyalıyoruz.
COPY . /usr/share/nginx/html

# 3. Aşama: Dokümantasyon / Port Bildirimi
# Konteynırın 80 portu üzerinden HTTP trafiği kabul ettiğini belirtiyoruz.
EXPOSE 80

# Not: Nginx arka planda otomatik olarak "daemon off;" ile çalışacak varsayılan bir CMD'ye sahiptir, 
# bu yüzden ekstra bir başlatma komutu yazmamıza gerek yoktur.
