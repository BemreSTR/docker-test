const methodSelect = document.getElementById('http-method');
const urlInput = document.getElementById('request-url');
const bodyContainer = document.getElementById('body-container');
const requestBody = document.getElementById('request-body');
const sendBtn = document.getElementById('send-btn');
const btnText = document.getElementById('btn-text');
const statusBadge = document.getElementById('status-badge');
const timeBadge = document.getElementById('time-badge');
const responseOutput = document.getElementById('response-output');
const runtimeLabel = document.getElementById('runtime-label');

// Çalışma ortamı kontrolü
if (window.location.protocol.startsWith('http')) {
  runtimeLabel.textContent = `Nginx Web Sunucusu (${window.location.host})`;
} else {
  runtimeLabel.textContent = 'Doğrudan Yerel Dosya (file://)';
}

// Dinamik API Sunucusu Tespiti:
// Tarayıcı bu sayfayı hangi IP veya domain üzerinden açtıysa (örn: 193.111.78.227 veya localhost),
// Backend API de aynı sunucunun 5001 portunda çalışır.
const currentHost = window.location.hostname || 'localhost';
const API_BASE = `http://${currentHost}:5001`;

const detectedApiUrlEl = document.getElementById('detected-api-url');
if (detectedApiUrlEl) {
  detectedApiUrlEl.textContent = API_BASE;
}

// Varsayılan input URL'si
if (urlInput && !urlInput.value) {
  urlInput.value = `${API_BASE}/api/health`;
}

// Metoda göre body alanını gizle / göster
function updateBodyVisibility() {
  const method = methodSelect.value;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    bodyContainer.style.display = 'flex';
  } else {
    bodyContainer.style.display = 'none';
  }
}

methodSelect.addEventListener('change', updateBodyVisibility);
updateBodyVisibility();

// Hızlı Şablon butonları
document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const method = btn.getAttribute('data-method');
    const path = btn.getAttribute('data-path');
    const action = btn.getAttribute('data-action');
    let body = btn.getAttribute('data-body');

    // Eğer dinamik test notu ise zaman damgalı içerik üret
    if (action === 'auto-note') {
      const timeStr = new Date().toLocaleTimeString('tr-TR');
      body = JSON.stringify({
        title: `CI/CD Canlı Test Notu 🚀 (${timeStr})`,
        content: `Bu kayıt, ${currentHost} üzerindeki v1.1.0 sürümünden PostgreSQL veritabanına başarıyla yazıldı.`
      });
    }

    methodSelect.value = method;
    urlInput.value = path ? `${API_BASE}${path}` : (btn.getAttribute('data-url') || '');

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
  });
});

// İstek Gönderme Mantığı
sendBtn.addEventListener('click', async () => {
  const method = methodSelect.value;
  const url = urlInput.value.trim();

  if (!url) {
    alert('Lütfen geçerli bir URL girin!');
    return;
  }

  // Yükleniyor durumu
  sendBtn.disabled = true;
  btnText.textContent = 'Gönderiliyor...';
  statusBadge.className = 'metric-badge status-init';
  statusBadge.textContent = 'İstek yapılıyor...';
  timeBadge.classList.add('hidden');
  responseOutput.textContent = 'Yanıt bekleniyor...';

  const startTime = performance.now();

  try {
    const options = {
      method: method,
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      options.headers['Content-Type'] = 'application/json; charset=UTF-8';
      const bodyContent = requestBody.value.trim();
      if (bodyContent) {
        options.body = bodyContent;
      }
    }

    const response = await fetch(url, options);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // Süre rozeti
    timeBadge.textContent = `Süre: ${duration}ms`;
    timeBadge.className = 'metric-badge status-time';
    timeBadge.classList.remove('hidden');

    // Durum rozeti
    statusBadge.textContent = `${response.status} ${response.statusText || ''}`;
    if (response.ok) {
      statusBadge.className = 'metric-badge status-success';
    } else {
      statusBadge.className = 'metric-badge status-error';
    }

    // Yanıt başlıklarını topla
    const headersObj = {};
    response.headers.forEach((val, key) => {
      headersObj[key] = val;
    });

    let bodyData;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      bodyData = await response.json();
    } else {
      bodyData = await response.text();
    }

    // Çıktıyı formatla
    const formattedResult = {
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: headersObj,
      data: bodyData
    };

    responseOutput.textContent = JSON.stringify(formattedResult, null, 2);

  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    statusBadge.textContent = 'Bağlantı Hatası';
    statusBadge.className = 'metric-badge status-error';
    timeBadge.textContent = `Süre: ${duration}ms`;
    timeBadge.className = 'metric-badge status-time';
    timeBadge.classList.remove('hidden');

    responseOutput.textContent = JSON.stringify({
      error: error.message,
      detail: 'CORS engeli, geçersiz URL veya ağ hatası oluşmuş olabilir.'
    }, null, 2);
  } finally {
    sendBtn.disabled = false;
    btnText.textContent = 'İstek Gönder';
  }
});
