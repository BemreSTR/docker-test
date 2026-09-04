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
    const url = btn.getAttribute('data-url');
    const body = btn.getAttribute('data-body');

    methodSelect.value = method;
    urlInput.value = url;

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
