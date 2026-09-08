// Backend API Otomatik Birim & Entegrasyon Testleri
// Node.js'in yerleşik (built-in) test motoru ile çalışır: node --test

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { app } = require('../app');

describe('🧪 Backend API Otomatik Test Paketi (Quality Gate)', () => {
  let server;
  let baseUrl;

  // Testler başlamadan önce geçici rastgele bir portta (port 0) sunucuyu aç
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`[Test] Test sunucusu geçici portta açıldı: ${baseUrl}`);
        resolve();
      });
    });
  });

  // Testler bittikten sonra sunucuyu kapat ve belleği temizle
  after(async () => {
    await new Promise((resolve) => {
      server.close(() => {
        console.log('[Test] Test sunucusu kapatıldı.');
        resolve();
      });
    });
  });

  // 1. Test: Sağlık Kontrolü Endpoint Yapısı
  test('1. GET /api/health endpointi geçerli bir durum nesnesi dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();

    // Veritabanı bağlı değilse 503, bağlıysa 200 dönmelidir; her iki durumda da 'status' ve 'database' alanları bulunmalıdır
    assert.ok([200, 503].includes(res.status), `Beklenen durum kodu 200 veya 503 olmalı, gelen: ${res.status}`);
    assert.ok('status' in data, 'Yanıtta "status" alanı bulunmalıdır');
    assert.ok('database' in data, 'Yanıtta "database" alanı bulunmalıdır');
  });

  // 2. Test: Başlık Olmadan Not Ekleme Doğrulaması (Validation)
  test('2. POST /api/notes boş gövde veya başlıksız istekte 400 Bad Request dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Başlıksız sadece içerik' })
    });

    const data = await res.json();

    assert.strictEqual(res.status, 400, 'Başlıksız istek 400 durum kodu ile reddedilmelidir');
    assert.strictEqual(data.error, 'Başlık (title) alanı zorunludur!');
  });

  // 3. Test: Boşluklardan Oluşan Başlık Doğrulaması
  test('3. POST /api/notes sadece boşluk içeren başlıkta 400 Bad Request dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ', content: 'Boşluklu başlık' })
    });

    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.error, 'Başlık (title) alanı zorunludur!');
  });

  // 4. Test: Olmayan Endpoint için 404 Kontrolü
  test('4. GET /api/bilinmeyen-rota için 404 Not Found dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/bilinmeyen-rota`);
    assert.strictEqual(res.status, 404);
  });
});
