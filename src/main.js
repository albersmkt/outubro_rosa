import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-700.css';
import './style.css';
import { startSelfie, showSharedSelfie } from './selfie.js';
import { createDepthMotion } from './depth.js';

const questions = [
  ['O câncer de mama sempre causa dor?', 'NÃO.', 'Em fases iniciais, pode não causar dor nem outros sintomas.'],
  ['Conhecer o próprio corpo ajuda a perceber alterações nas mamas?', 'SIM.', 'É importante observar e procurar atendimento ao notar mudanças persistentes.'],
  ['Mudanças no formato ou na aparência da mama podem ser sinais de alerta?', 'SIM.', 'Alterações na pele, no mamilo ou no formato da mama merecem atenção e avaliação profissional.'],
  ['O risco de câncer de mama aumenta com a idade?', 'SIM.', 'A maioria dos casos ocorre após os 50 anos.'],
  ['A mamografia de rastreamento é recomendada mesmo na ausência de sintomas?', 'SIM.', 'No SUS, o rastreamento é recomendado dos 50 aos 74 anos, a cada dois anos.'],
  ['Mulheres com menos de 50 anos podem precisar de mamografia?', 'SIM.', 'O exame pode ser indicado para investigar alterações suspeitas ou conforme avaliação profissional.'],
];

const totem = document.querySelector('#totem');
const content = document.querySelector('#content');
const artwork = document.querySelector('#artwork');
const campaignVideo = document.querySelector('#campaign-video');
const reduceVideoMotion = matchMedia('(prefers-reduced-motion: reduce)');
campaignVideo.muted = true;
campaignVideo.defaultMuted = true;
const depth = createDepthMotion(totem);
const nextArrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M12 5l7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let screen = 0;
let timer;
let closeSelfie;
const sharedPhoto = new URLSearchParams(location.search).get('selfie');
const IDLE_MS = 90000;
const END_MS = 20000;

// Load the three local artworks before they are needed.
for (const path of ['abertura-video.svg', 'perguntas.png', 'encerramento-video.svg']) {
  const img = new Image();
  img.src = `/assets/${path}`;
}

function syncCampaignVideo() {
  const shouldPlay = !document.hidden && !sharedPhoto && !closeSelfie && (screen === 0 || screen === 7) && !reduceVideoMotion.matches;
  campaignVideo.autoplay = shouldPlay;
  if (shouldPlay) {
    campaignVideo.play().catch(() => { /* The local poster remains visible if autoplay is unavailable. */ });
  } else campaignVideo.pause();
}
reduceVideoMotion.addEventListener('change', syncCampaignVideo);

function resetTimer() {
  clearTimeout(timer);
  if (closeSelfie || sharedPhoto) return;
  if (screen > 0) timer = setTimeout(() => show(0), screen === 7 ? END_MS : IDLE_MS);
}

function show(next, keyboard = false) {
  closeSelfie?.();
  closeSelfie = undefined;
  content.getAnimations().forEach(animation => animation.cancel());
  depth.changeScreen(keyboard);
  screen = Math.max(0, Math.min(7, next));
  totem.dataset.screen = screen === 0 ? 'welcome' : screen === 7 ? 'end' : 'question';
  artwork.src = `/assets/${screen === 0 ? 'abertura-video.svg' : screen === 7 ? 'encerramento-video.svg' : 'perguntas.png'}`;
  syncCampaignVideo();
  if (screen === 0) {
    content.innerHTML = `<h1 class="sr-only">Outubro Rosa. Se toca, mulher! Você conhece o Outubro Rosa?</h1><button class="start side-next" data-action="next" aria-label="Toque na tela para começar">${nextArrow}<span class="side-next-label">Começar</span></button>`;
  } else if (screen === 7) {
    content.innerHTML = '<h1 class="sr-only">Obrigado por participar!</h1><div class="end-actions"><p class="end-message">Informação também é prevenção.</p><button class="selfie-choice" data-action="selfie">Tirar uma selfie <span aria-hidden="true">◎</span></button><button class="end-home" data-action="home">Não, obrigado · Voltar ao início</button></div>';
  } else {
    const [question, verdict, answer] = questions[screen - 1];
    content.innerHTML = `<div class="question-copy"><h1>${question}</h1><p><strong>${verdict}</strong> ${answer}</p></div><button class="next side-next" data-action="next" aria-label="${screen === 6 ? 'Concluir participação' : 'Próxima pergunta'}">${nextArrow}<span class="side-next-label">${screen === 6 ? 'Concluir' : 'Próximo'}</span></button><nav aria-label="Navegação das perguntas"><button class="back" data-action="back" aria-label="Voltar à tela anterior">← <span>Voltar</span></button><span class="progress" aria-label="Pergunta ${screen} de 6">${questions.map((_, i) => `<i class="${i + 1 === screen ? 'current' : ''}" aria-hidden="true"></i>`).join('')}</span><button class="home" data-action="home" aria-label="Voltar ao início">Início <span aria-hidden="true">↗</span></button></nav>`;
  }
  if (!keyboard && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    content.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(0.23,1,0.32,1)' });
  }
  // Keep focus inside the current screen without displaying a focus ring after touch.
  content.querySelector('button')?.focus({ preventScroll: true });
  resetTimer();
}

content.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'selfie') {
    clearTimeout(timer);
    totem.dataset.screen = 'selfie';
    campaignVideo.autoplay = false;
    campaignVideo.pause();
    closeSelfie = startSelfie({ container: content, goHome: () => show(0) });
    return;
  }
  show(action === 'home' ? 0 : screen + (action === 'back' ? -1 : 1), event.detail === 0);
});
document.addEventListener('pointerdown', resetTimer, { passive: true });
document.addEventListener('keydown', event => {
  if (sharedPhoto) return;
  if (closeSelfie) {
    if (event.key === 'Escape' || event.key === 'Home') show(0, true);
    return;
  }
  resetTimer();
  if (['ArrowRight', 'ArrowLeft', 'Escape', 'Home'].includes(event.key)) {
    event.preventDefault();
    show(event.key === 'Escape' || event.key === 'Home' ? 0 : screen + (event.key === 'ArrowLeft' ? -1 : 1), true);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && closeSelfie) show(0, true);
  else if (!document.hidden && !sharedPhoto) show(0, true);
  syncCampaignVideo();
});
if (sharedPhoto) { campaignVideo.autoplay = false; campaignVideo.pause(); showSharedSelfie({ container: content, id: sharedPhoto }); }
else show(0, true);
