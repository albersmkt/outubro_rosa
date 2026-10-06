import QRCode from 'qrcode';

const SHARE_SECONDS = 45;
const SESSION_MS = 90000;
const CAPTURE_SECONDS = 5;
const escapeHTML = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function startSelfie({ container, goHome }) {
  let stream;
  let photo;
  let photoURL;
  let disposed = false;
  let generation = 0;
  let timer;
  let interval;
  let request;
  let captureTimer;
  let captureInterval;

  const clearCaptureCountdown = () => {
    clearTimeout(captureTimer);
    clearInterval(captureInterval);
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    stream = undefined;
  };
  const armIdle = () => {
    clearTimeout(timer);
    timer = setTimeout(goHome, SESSION_MS);
  };
  const shell = (title, description, body) => {
    container.innerHTML = `<section class="selfie-panel"><header class="selfie-header"><span class="selfie-eyebrow">OUTUBRO ROSA</span><h1>${title}</h1><p class="selfie-description">${description}</p></header><div class="selfie-body">${body}</div><footer class="selfie-footer"><button class="selfie-cancel" data-selfie="exit">Voltar ao início</button></footer></section>`;
  };
  const error = (message, retry) => {
    shell('Vamos tentar de novo?', message, `<div class="selfie-error" role="alert">${retry === 'camera' ? '◎' : '♡'}</div><button class="selfie-primary" data-selfie="${retry}">Tentar novamente</button>`);
    armIdle();
  };

  async function openCamera() {
    const current = ++generation;
    clearCaptureCountdown();
    stopCamera();
    armIdle();
    shell('Um registro de carinho.', 'Permita o acesso à câmera e prepare seu sorriso.', '<div class="camera-frame"><video autoplay muted playsinline aria-label="Prévia da webcam"></video><span class="camera-loading" role="status">Abrindo a câmera…</span></div><button class="selfie-primary" data-selfie="capture" disabled>Tirar foto</button><p class="selfie-note">A foto só será enviada se você escolher gerar o QR Code. O link ficará disponível por 15 minutos.</p>');
    if (!navigator.mediaDevices?.getUserMedia) {
      error('A câmera precisa de uma conexão HTTPS e de um navegador com suporte à webcam.', 'camera');
      return;
    }
    try {
      const incoming = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      if (disposed || current !== generation) {
        incoming.getTracks().forEach(track => track.stop());
        return;
      }
      stream = incoming;
      const video = container.querySelector('video');
      video.srcObject = stream;
      video.onloadeddata = () => {
        if (disposed || current !== generation) return;
        container.querySelector('.camera-loading')?.remove();
        container.querySelector('[data-selfie="capture"]').disabled = false;
      };
      await video.play();
    } catch (e) {
      if (disposed || current !== generation) return;
      stopCamera();
      error(e.name === 'NotAllowedError' ? 'O acesso à câmera foi bloqueado. Permita a câmera nas configurações do navegador para continuar.' : e.name === 'NotFoundError' ? 'Nenhuma webcam foi encontrada. Verifique se ela está conectada ao totem.' : 'Não foi possível abrir a webcam. Verifique se outro aplicativo está usando a câmera.', 'camera');
    }
  }

  function capture() {
    const video = container.querySelector('video');
    const button = container.querySelector('[data-selfie="capture"]');
    if (!video?.videoWidth || !button || button.disabled) return;
    const current = generation;
    button.disabled = true;
    button.textContent = 'Prepare seu sorriso…';
    const countdown = document.createElement('div');
    countdown.className = 'capture-countdown';
    countdown.innerHTML = `<span class="capture-count" aria-hidden="true">${CAPTURE_SECONDS}</span><span class="capture-instruction" role="status">Foto em ${CAPTURE_SECONDS} segundos</span>`;
    container.querySelector('.camera-frame').append(countdown);
    const deadline = Date.now() + CAPTURE_SECONDS * 1000;
    let displayed = CAPTURE_SECONDS;
    captureInterval = setInterval(() => {
      const remaining = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      if (remaining === displayed) return;
      displayed = remaining;
      countdown.querySelector('.capture-count').textContent = remaining;
      countdown.querySelector('.capture-instruction').textContent = `Foto em ${remaining} ${remaining === 1 ? 'segundo' : 'segundos'}`;
    }, 100);
    captureTimer = setTimeout(() => {
      clearCaptureCountdown();
      if (!disposed && current === generation) capturePhoto();
    }, CAPTURE_SECONDS * 1000);
    armIdle();
  }

  async function capturePhoto() {
    const video = container.querySelector('video');
    if (!video?.videoWidth) return;
    container.querySelector('[data-selfie="capture"]').disabled = true;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    // Save the same mirrored framing the visitor saw in the preview.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
    if (disposed) return;
    if (!image) { error('Não foi possível tirar a foto. Tente novamente.', 'camera'); return; }
    stopCamera();
    photo = image;
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = URL.createObjectURL(photo);
    shell('Gostou da sua selfie?', 'Guarde esse momento de cuidado com você.', `<img class="selfie-photo" src="${photoURL}" alt="Sua selfie capturada" /><button class="selfie-primary" data-selfie="share">Gerar QR Code para baixar</button><button class="selfie-secondary" data-selfie="camera">Tirar outra foto</button><p class="selfie-note">Ao gerar o QR Code, a foto será enviada para download temporário.</p>`);
    armIdle();
  }

  async function share() {
    if (!photo) return;
    armIdle();
    shell('Preparando sua foto…', 'Em instantes, você poderá baixar pelo celular.', `<img class="selfie-photo" src="${photoURL}" alt="Sua selfie" /><p class="selfie-note" role="status">Gerando seu QR Code…</p>`);
    request = new AbortController();
    const timeout = setTimeout(() => request?.abort(), 25000);
    try {
      const response = await fetch('/api/selfie', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: photo, signal: request.signal });
      if (!response.ok) throw new Error(response.status === 503 ? 'O download da selfie está indisponível no momento. Peça ajuda à equipe do evento.' : 'Não foi possível enviar sua foto. Verifique a conexão e tente novamente.');
      const result = await response.json();
      if (disposed) return;
      const url = new URL(location.origin);
      url.searchParams.set('selfie', result.id);
      const qr = await QRCode.toDataURL(url.href, { width: 480, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#3c1225', light: '#ffffff' } });
      if (disposed) return;
      shell('Sua selfie está pronta!', 'Aponte a câmera do celular para o QR Code e baixe sua foto.', `<img class="selfie-thumbnail" src="${photoURL}" alt="Sua selfie" /><img class="selfie-qr" src="${qr}" alt="QR Code para abrir sua selfie no celular" /><p class="selfie-note">O link da foto expira em 15 minutos.</p><p class="selfie-return">Voltando ao início em <span>${SHARE_SECONDS}</span> segundos</p>`);
      clearTimeout(timer);
      const deadline = Date.now() + SHARE_SECONDS * 1000;
      timer = setTimeout(goHome, SHARE_SECONDS * 1000);
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        const counter = container.querySelector('.selfie-return span');
        if (counter) counter.textContent = remaining;
      }, 1000);
    } catch (e) {
      if (!disposed) error(e.name === 'AbortError' ? 'O envio demorou mais que o esperado. Verifique a conexão e tente novamente.' : e.message, 'share');
    } finally { clearTimeout(timeout); }
  }

  function onClick(event) {
    const action = event.target.closest('[data-selfie]')?.dataset.selfie;
    if (!action) return;
    if (action === 'exit') goHome();
    else if (action === 'camera') openCamera();
    else if (action === 'capture') capture();
    else if (action === 'share') share();
  }
  container.addEventListener('click', onClick);
  openCamera();
  return () => {
    disposed = true;
    generation++;
    clearCaptureCountdown();
    stopCamera();
    request?.abort();
    clearTimeout(timer);
    clearInterval(interval);
    if (photoURL) URL.revokeObjectURL(photoURL);
    photo = undefined;
    container.removeEventListener('click', onClick);
  };
}

export async function showSharedSelfie({ container, id }) {
  container.innerHTML = '<section class="selfie-panel mobile-download"><header class="selfie-header"><span class="selfie-eyebrow">OUTUBRO ROSA</span><h1>Sua selfie, seu momento.</h1><p class="selfie-description" role="status">Carregando sua foto…</p></header><div class="selfie-body"></div><footer class="selfie-footer"></footer></section>';
  const panel = container.querySelector('section');
  try {
    const response = await fetch(`/api/selfie?id=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(response.status === 410 || response.status === 404 ? 'O link desta selfie expirou ou a foto não está mais disponível.' : 'Não foi possível carregar sua selfie. Tente atualizar a página.');
    const imageURL = URL.createObjectURL(await response.blob());
    panel.innerHTML = `<header class="selfie-header"><span class="selfie-eyebrow">OUTUBRO ROSA</span><h1>Um carinho para guardar.</h1><p class="selfie-description">Informação também é prevenção.</p></header><div class="selfie-body"><img class="selfie-photo" src="${imageURL}" alt="Sua selfie do Outubro Rosa" /><a class="selfie-primary" href="/api/selfie?id=${encodeURIComponent(id)}&download=1" download="outubro-rosa-selfie.jpg">Baixar minha selfie</a><p class="selfie-note">No iPhone, se a foto abrir em outra tela, use Compartilhar → Salvar Imagem.</p></div><footer class="selfie-footer"></footer>`;
    window.addEventListener('pagehide', () => URL.revokeObjectURL(imageURL), { once: true });
  } catch (e) {
    panel.innerHTML = `<header class="selfie-header"><span class="selfie-eyebrow">OUTUBRO ROSA</span><h1>Esse momento passou.</h1><p class="selfie-description" role="alert">${escapeHTML(e.message)}</p></header><div class="selfie-body"></div><footer class="selfie-footer"></footer>`;
  }
}
