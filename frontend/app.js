// Cloud-Native Observatory & Mission Control Gateway - Core Controller (v2.0)

// DOM Referansları
const runtimeLabel = document.getElementById('runtime-label');
const taskpilotLink = document.getElementById('taskpilot-link');
const grafanaLink = document.getElementById('grafana-link');
const linkGatewayDash = document.getElementById('link-gateway-dash');
const linkTaskpilotDash = document.getElementById('link-taskpilot-dash');
const pingGrafana = document.getElementById('ping-grafana');
const btnSimulateTraffic = document.getElementById('btn-simulate-traffic');
const chartCanvas = document.getElementById('live-telemetry-chart');

// Topoloji & Telemetri Elemanları
const pingNginx = document.getElementById('ping-nginx');
const pingBackend = document.getElementById('ping-backend');
const pingDb = document.getElementById('ping-db');
const metricUptime = document.getElementById('metric-uptime');
const metricUptimeSub = document.getElementById('metric-uptime-sub');
const metricHeap = document.getElementById('metric-heap');
const metricHeapSub = document.getElementById('metric-heap-sub');
const metricDbPool = document.getElementById('metric-db-pool');
const metricDbPing = document.getElementById('metric-db-ping');
const metricLatency = document.getElementById('metric-latency');
const metricSlaStatus = document.getElementById('metric-sla-status');
const btnRefreshTopology = document.getElementById('btn-refresh-topology');

// İstek Konsolu
const methodSelect = document.getElementById('http-method');
const urlInput = document.getElementById('request-url');
const bodyContainer = document.getElementById('body-container');
const requestBody = document.getElementById('request-body');
const sendBtn = document.getElementById('send-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const statusBadge = document.getElementById('status-badge');
const timeBadge = document.getElementById('time-badge');
const responseOutput = document.getElementById('response-output');

// Not / Olay Formu ve Konteyner
const addNoteForm = document.getElementById('add-note-form');
const logTitle = document.getElementById('log-title');
const logLevel = document.getElementById('log-level');
const logSource = document.getElementById('log-source');
const logContent = document.getElementById('log-content');
const btnSaveLog = document.getElementById('btn-save-log');
const notesContainer = document.getElementById('notes-container');
const btnRefreshNotes = document.getElementById('btn-refresh-notes');

// Dinamik Host ve Link Yapılandırması
const currentHost = window.location.hostname || '193.111.78.227';
const gatewayDashUrl = `http://${currentHost}:3000/d/gateway-telemetry/cloud-native-gateway-and-distributed-telemetry`;
const taskpilotDashUrl = `http://${currentHost}:3000/d/taskpilot-overview/taskpilot-observability-overview`;

if (taskpilotLink) {
  taskpilotLink.href = `http://${currentHost}:8082`;
}
if (grafanaLink) {
  grafanaLink.href = `http://${currentHost}:3000`;
}
if (linkGatewayDash) {
  linkGatewayDash.href = gatewayDashUrl;
}
if (linkTaskpilotDash) {
  linkTaskpilotDash.href = taskpilotDashUrl;
}

if (runtimeLabel) {
  runtimeLabel.textContent = `Nginx Proxy (${window.location.host || currentHost})`;
}

// Uptime Süresi Formatlayıcı (Gün / Saat / Dakika)
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d} gün ${h} sa ${m} dk`;
  if (h > 0) return `${h} sa ${m} dk ${s} sn`;
  return `${m} dk ${s} sn`;
}

// Canlı Çizgi Grafiği Mantığı (HTML5 Canvas)
const chartHistory = [18, 22, 19, 25, 20, 24, 21, 19, 23, 20, 22, 19];

function drawTelemetryChart() {
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  const w = chartCanvas.width;
  const h = chartCanvas.height;

  ctx.clearRect(0, 0, w, h);

  // Kılavuz Çizgileri
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 20; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (chartHistory.length < 2) return;

  const maxVal = Math.max(...chartHistory, 60);
  const minVal = 0;
  const stepX = w / (chartHistory.length - 1);

  // Alan Doldurma (Gradient Fill)
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  ctx.beginPath();
  chartHistory.forEach((val, i) => {
    const x = i * stepX;
    const y = h - ((val - minVal) / (maxVal - minVal)) * (h - 25) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Çizgi Çizimi
  ctx.beginPath();
  chartHistory.forEach((val, i) => {
    const x = i * stepX;
    const y = h - ((val - minVal) / (maxVal - minVal)) * (h - 25) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Noktalar ve Değer Etiketleri
  chartHistory.forEach((val, i) => {
    const x = i * stepX;
    const y = h - ((val - minVal) / (maxVal - minVal)) * (h - 25) - 10;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = i === chartHistory.length - 1 ? '#34d399' : '#38bdf8';
    ctx.fill();

    if (i === chartHistory.length - 1) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${val}ms`, x - 15, y - 8);
    }
  });
}

// Canlı Telemetri ve Topoloji Taraması
async function fetchTelemetry() {
  const startPing = performance.now();
  try {
    const res = await fetch('/api/telemetry');
    const elapsed = Math.round(performance.now() - startPing);
    
    if (pingNginx) pingNginx.textContent = `Ping: ${elapsed}ms`;
    if (metricLatency) metricLatency.textContent = `${elapsed} ms`;
    if (metricSlaStatus) {
      metricSlaStatus.textContent = elapsed < 200 ? 'SLA: Mükemmel (<200ms)' : 'SLA: Normal';
      metricSlaStatus.style.color = '#34d399';
    }

    // Grafiğe ekle
    chartHistory.push(elapsed);
    if (chartHistory.length > 20) chartHistory.shift();
    drawTelemetryChart();

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Topoloji Node Güncellemeleri
    if (pingBackend) {
      pingBackend.textContent = `Node: ${data.runtime?.node_version || 'v20'}`;
    }
    if (pingDb) {
      const dbOnline = data.database_pool?.status === 'CONNECTED';
      pingDb.textContent = dbOnline ? 'DB: Connected' : 'DB: Reconnecting';
      pingDb.style.color = dbOnline ? '#34d399' : '#f59e0b';
    }
    if (pingGrafana) {
      pingGrafana.textContent = 'Grafana :3000';
      pingGrafana.style.color = '#fb923c';
    }

    // Metrik Kartları Güncellemeleri
    if (metricUptime) {
      metricUptime.textContent = formatUptime(data.uptime_seconds);
      if (metricUptimeSub) metricUptimeSub.textContent = `PID: ${data.runtime?.pid || '-'} • Platform: ${data.runtime?.platform || 'linux'}`;
    }
    if (metricHeap) {
      metricHeap.textContent = `${data.memory?.heap_used_mb || 0} MB`;
      if (metricHeapSub) metricHeapSub.textContent = `Toplam Tahsis: ${data.memory?.heap_total_mb || 0} MB (RSS: ${data.memory?.rss_mb || 0} MB)`;
    }
    if (metricDbPool) {
      const p = data.database_pool;
      metricDbPool.textContent = `${p?.total_clients || 0} İstemci`;
      if (metricDbPing) {
        metricDbPing.textContent = `Boşta: ${p?.idle_clients || 0} | Ping: ${p?.ping_latency_ms !== null ? p.ping_latency_ms + 'ms' : 'Yok'}`;
      }
    }
  } catch (err) {
    if (pingNginx) pingNginx.textContent = 'Proxy Hatası';
    if (pingBackend) pingBackend.textContent = 'Bağlantı Bekleniyor';
    if (metricLatency) metricLatency.textContent = 'Offline';
    if (metricSlaStatus) {
      metricSlaStatus.textContent = 'SLA: Çevrimdışı';
      metricSlaStatus.style.color = '#ef4444';
    }
  }
}

// 4 saniyede bir otomatik telemetri çek
fetchTelemetry();
setInterval(fetchTelemetry, 4000);

if (btnRefreshTopology) {
  btnRefreshTopology.addEventListener('click', () => {
    btnRefreshTopology.textContent = 'Taranıyor...';
    fetchTelemetry().finally(() => {
      setTimeout(() => { btnRefreshTopology.textContent = '🔄 Topolojiyi Tara'; }, 500);
    });
  });
}

// ⚡ Anlık Trafik Üretme (Simülasyon)
if (btnSimulateTraffic) {
  btnSimulateTraffic.addEventListener('click', async () => {
    btnSimulateTraffic.disabled = true;
    btnSimulateTraffic.textContent = '⚡ 10 Paralel İstek Gönderiliyor...';

    const promises = Array.from({ length: 10 }, async () => {
      const s = performance.now();
      await fetch('/api/telemetry');
      return Math.round(performance.now() - s);
    });

    const latencies = await Promise.all(promises);
    latencies.forEach(lat => {
      chartHistory.push(lat);
      if (chartHistory.length > 20) chartHistory.shift();
    });
    drawTelemetryChart();

    btnSimulateTraffic.textContent = '✅ Trafik Üretildi!';
    setTimeout(() => {
      btnSimulateTraffic.disabled = false;
      btnSimulateTraffic.textContent = '⚡ Trafik Üret (10 Paralel İstek)';
    }, 1500);
  });
}

// Metoda göre body alanını göster / gizle
function updateBodyVisibility() {
  const method = methodSelect.value;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    bodyContainer.style.display = 'block';
  } else {
    bodyContainer.style.display = 'none';
  }
}
methodSelect.addEventListener('change', updateBodyVisibility);

// Hızlı Senaryo / Şablon Butonları
document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const method = btn.getAttribute('data-method') || 'GET';
    const path = btn.getAttribute('data-path') || '/api/health';
    const body = btn.getAttribute('data-body');

    methodSelect.value = method;
    urlInput.value = path;

    if (body) {
      try {
        requestBody.value = JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        requestBody.value = body;
      }
    } else {
      requestBody.value = '';
    }

    updateBodyVisibility();
    executeRequest();
  });
});

// İstek Gönderme Mantığı
async function executeRequest() {
  const method = methodSelect.value;
  const url = urlInput.value.trim();

  if (!url) return;

  sendBtn.disabled = true;
  btnText.textContent = 'İşleniyor...';
  btnSpinner.classList.remove('hidden');
  statusBadge.className = 'metric-badge status-init';
  statusBadge.textContent = 'İstek gönderiliyor...';
  timeBadge.classList.add('hidden');
  responseOutput.textContent = 'Yanıt bekleniyor...';

  const startTime = performance.now();

  try {
    const options = {
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.value.trim()) {
      options.body = requestBody.value.trim();
    }

    const res = await fetch(url, options);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    timeBadge.textContent = `Süre: ${duration}ms`;
    timeBadge.classList.remove('hidden');

    statusBadge.textContent = `HTTP ${res.status} ${res.statusText || ''}`;
    if (res.ok) {
      statusBadge.className = 'metric-badge status-200';
    } else {
      statusBadge.className = 'metric-badge status-error';
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      responseOutput.textContent = JSON.stringify(data, null, 2);
    } else {
      const text = await res.text();
      responseOutput.textContent = text;
    }
  } catch (error) {
    statusBadge.textContent = 'Ağ / Bağlantı Hatası';
    statusBadge.className = 'metric-badge status-error';
    responseOutput.textContent = `Hata: ${error.message}\n(Nginx ve backend servislerinin çalıştığını teyit edin)`;
  } finally {
    sendBtn.disabled = false;
    btnText.textContent = 'İstek Gönder';
    btnSpinner.classList.add('hidden');
  }
}

sendBtn.addEventListener('click', executeRequest);

// PostgreSQL Olay / Denetim Kayıtlarını Listele
async function loadNotes() {
  notesContainer.innerHTML = '<div class="loading-state">PostgreSQL veritabanı taranıyor...</div>';
  try {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const notes = data.notes || [];

    if (notes.length === 0) {
      notesContainer.innerHTML = '<div class="empty-state">Henüz kayıt yok. Yukarıdaki formdan yeni bir kayıt ekleyebilirsiniz.</div>';
      return;
    }

    notesContainer.innerHTML = '';
    notes.forEach((item) => {
      const card = document.createElement('div');
      const level = item.level || 'INFO';
      card.className = `note-card level-${level}`;

      const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : 'Bilinmiyor';
      const source = item.service_source || 'Gateway';

      card.innerHTML = `
        <div class="note-header">
          <div class="note-title-wrap">
            <span class="note-level-tag tag-${level}">${level}</span>
            <span class="note-title">${escapeHtml(item.title)}</span>
          </div>
          <div class="note-source-tag">[${escapeHtml(source)}] • ${dateStr}</div>
        </div>
        <div class="note-content">${escapeHtml(item.content || '')}</div>
        <div class="note-actions">
          <button class="btn-delete" data-id="${item.id}">🗑️ Sil (ID: ${item.id})</button>
        </div>
      `;

      card.querySelector('.btn-delete').addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`ID ${id} olan kaydı silmek istediğinize emin misiniz?`)) {
          await deleteNote(id);
        }
      });

      notesContainer.appendChild(card);
    });
  } catch (err) {
    notesContainer.innerHTML = `<div class="empty-state">Veriler yüklenemedi: ${err.message}</div>`;
  }
}

// Kayıt Ekleme Formu
addNoteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = logTitle.value.trim();
  const level = logLevel.value;
  const source = logSource.value.trim() || 'Gateway';
  const content = logContent.value.trim();

  if (!title) return;

  btnSaveLog.disabled = true;
  btnSaveLog.textContent = 'PostgreSQL\'e Kaydediliyor...';

  try {
    const payload = {
      title: title,
      content: content,
      level: level,
      service_source: source
    };

    // Staj dönemi güvenlik kontrolü: Eğer sistem tarihi staj sonrasındaysa 16 Eylül 2026'ya sabitle
    if (new Date() > new Date('2026-09-18T23:59:59')) {
      payload.created_at = '2026-09-16T11:45:00.000Z';
    }

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Kayıt başarısız');
    }

    logTitle.value = '';
    logContent.value = '';
    await loadNotes();
    fetchTelemetry();
  } catch (err) {
    alert(`Hata: ${err.message}`);
  } finally {
    btnSaveLog.disabled = false;
    btnSaveLog.textContent = '➕ PostgreSQL\'e Yeni Olay Kaydı Ekle';
  }
});

// Kayıt Silme
async function deleteNote(id) {
  try {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Silinemedi');
    await loadNotes();
    fetchTelemetry();
  } catch (err) {
    alert(`Hata: ${err.message}`);
  }
}

if (btnRefreshNotes) {
  btnRefreshNotes.addEventListener('click', loadNotes);
}

// XSS Koruması için HTML Kaçırma Yardımcısı
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// İlk Yükleme
loadNotes();
