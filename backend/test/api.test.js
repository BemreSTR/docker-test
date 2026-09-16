// Backend API Otomatik Birim & Entegrasyon Testleri
// Node.js'in yerleşik (built-in) test motoru ile çalışır: node --test

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { app } = require('../app');

describe('🧪 Backend API & Telemetry Gateway Test Paketi (Quality Gate)', () => {
  let server;
  let baseUrl;

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

  after(async () => {
    await new Promise((resolve) => {
      server.close(() => {
        console.log('[Test] Test sunucusu kapatıldı.');
        resolve();
      });
    });
  });

  // 1. Test: Sağlık Kontrolü Endpoint Yapısı
  test('1. GET /api/health geçerli durum nesnesi dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();

    assert.ok([200, 503].includes(res.status), `Beklenen durum kodu 200 veya 503 olmalı, gelen: ${res.status}`);
    assert.ok('status' in data, 'Yanıtta "status" alanı bulunmalıdır');
    assert.ok('database' in data, 'Yanıtta "database" alanı bulunmalıdır');
  });

  // 2. Test: Canlı Telemetri ve APM Metrikleri
  test('2. GET /api/telemetry servis ve bellek metriklerini dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/telemetry`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.version, '2.0.0-enterprise');
    assert.ok(data.uptime_seconds >= 0);
    assert.ok(data.memory && typeof data.memory.heap_used_mb === 'number');
    assert.ok(data.runtime && typeof data.runtime.node_version === 'string');
    assert.ok('database_pool' in data);
  });

  // 3. Test: DevSecOps ve Güvenlik Denetimi
  test('3. GET /api/security/audit konteynır ve ağ güvenliğini doğrulamalıdır', async () => {
    const res = await fetch(`${baseUrl}/api/security/audit`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.status, 'COMPLIANT');
    assert.ok(data.container_security.least_privilege_enforced);
    assert.strictEqual(data.network_perimeter.reverse_proxy, 'Nginx (Port 80)');
    assert.strictEqual(data.devsecops_compliance.sast_scanner, 'Aqua Security Trivy');
  });

  // 4. Test: Mikroservis Ekosistem Durumu
  test('4. GET /api/services/status mikroservislerin durumunu raporlamalıdır', async () => {
    const res = await fetch(`${baseUrl}/api/services/status`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.ok(data.gateway && data.gateway.port === 80);
    assert.ok(data.backend && data.backend.port === 5000);
    assert.ok(data.microservice_taskpilot && data.microservice_taskpilot.port === 8082);
    assert.ok(data.observability_grafana && data.observability_grafana.port === 3000);
    assert.ok(data.metrics_prometheus && data.metrics_prometheus.port === 9090);
  });

  // 5. Test: Dayanıklılık & Gecikme Enjeksiyonu
  test('5. POST /api/chaos/latency yapay gecikmeyi başarıyla simüle etmelidir', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/chaos/latency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay_ms: 120 })
    });
    const elapsed = Date.now() - start;

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.injected_delay_ms === 120);
    assert.ok(elapsed >= 100);
  });

  // 6. Test: Başlıksız İstek Doğrulaması
  test('6. POST /api/notes boş gövdede 400 Bad Request dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Sadece içerik' })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.error, 'Başlık (title) alanı zorunludur!');
  });

  // 7. Test: Boşluklu Başlık Doğrulaması
  test('7. POST /api/notes boşluklu başlıkta 400 Bad Request dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '     ', content: 'Boşluklu' })
    });

    assert.strictEqual(res.status, 400);
  });

  // 8. Test: 404 Bilinmeyen Rota
  test('8. GET /api/bilinmeyen-rota için 404 Not Found dönmelidir', async () => {
    const res = await fetch(`${baseUrl}/api/bilinmeyen-rota`);
    assert.strictEqual(res.status, 404);
  });
});
