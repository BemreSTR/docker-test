FROM nginx:alpine

# Özel Tersine Vekil (Reverse Proxy) yapılandırmasını Nginx'e kopyala
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Statik web dosyalarını web kök dizinine kopyala
COPY . /usr/share/nginx/html

EXPOSE 80
