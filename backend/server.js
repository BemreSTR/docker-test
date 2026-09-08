// Backend Sunucu Başlatıcı
const { app, initDatabase } = require('./app');

const PORT = process.env.PORT || 5000;

// Sunucuyu Dinlemeye Başla
app.listen(PORT, async () => {
  console.log(`[Backend API] Express sunucusu ${PORT} portunda çalışıyor. 🚀`);
  await initDatabase();
});
