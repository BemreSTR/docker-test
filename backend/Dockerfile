# 1. Aşama: Temel İmaj (Hafif Node.js 20 Alpine)
FROM node:20-alpine

# 2. Aşama: Konteynır içi çalışma dizini
WORKDIR /app

# 3. Aşama: Bağımlılık Reçetesini Kopyala
# Senior DevOps İpucu: Önce sadece package.json'ı kopyalayıp npm install yapıyoruz!
# Böylece kod değiştiğinde npm install katmanı cache'den gelir, build süresi 0.5 saniyeye iner.
COPY package*.json ./

# 4. Aşama: Bağımlılıkları Kur
RUN npm install --production

# 5. Aşama: Kalan tüm backend kodlarını kopyala
COPY . .

# 6. Aşama: Port Bildirimi
EXPOSE 5000

# 7. Aşama: Başlatma Komutu
CMD ["node", "server.js"]
