import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-700.css';
import './style.css';

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
const hand = '<svg class="hand" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="m24 33-10-14c-3-4-8 0-5 4l17 25-8-3c-6-2-8 4-3 7l16 9c3 2 6 2 9 0l16-11c3-2 3-6 1-9L45 23c-3-4-7-1-5 3l-3-5c-3-4-7-1-5 3l-3-4c-3-4-8-1-5 3l7 11" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let screen = 0;
let timer;
const IDLE_MS = 90000;
const END_MS = 20000;

// Load the three local artworks before they are needed.
for (const name of ['abertura', 'perguntas', 'encerramento']) {
  const img = new Image();
  img.src = `/assets/${name}.png`;
}

function resetTimer() {
  clearTimeout(timer);
  if (screen > 0) timer = setTimeout(() => show(0), screen === 7 ? END_MS : IDLE_MS);
}

function show(next, keyboard = false) {
  content.getAnimations().forEach(animation => animation.cancel());
  screen = Math.max(0, Math.min(7, next));
  totem.dataset.screen = screen === 0 ? 'welcome' : screen === 7 ? 'end' : 'question';
  artwork.src = `/assets/${screen === 0 ? 'abertura' : screen === 7 ? 'encerramento' : 'perguntas'}.png`;
  if (screen === 0) {
    content.innerHTML = '<h1 class="sr-only">Outubro Rosa. Se toca, mulher! Você conhece o Outubro Rosa?</h1><button class="start" data-action="next" aria-label="Toque na tela para começar"><span class="sr-only">Toque na tela!</span></button>';
  } else if (screen === 7) {
    content.innerHTML = '<h1 class="sr-only">Obrigado por participar! Informação também é prevenção.</h1><button class="restart" data-action="home">Participar novamente <span aria-hidden="true">↻</span></button>';
  } else {
    const [question, verdict, answer] = questions[screen - 1];
    content.innerHTML = `<div class="question-copy"><h1>${question}</h1><p><strong>${verdict}</strong> ${answer}</p></div><button class="next" data-action="next" aria-label="${screen === 6 ? 'Concluir participação' : 'Próxima pergunta'}">Clique aqui!${hand}</button><nav aria-label="Navegação das perguntas"><button class="back" data-action="back" aria-label="Voltar à tela anterior">← <span>Voltar</span></button><span class="progress" aria-label="Pergunta ${screen} de 6">${questions.map((_, i) => `<i class="${i + 1 === screen ? 'current' : ''}" aria-hidden="true"></i>`).join('')}</span><button class="home" data-action="home" aria-label="Voltar ao início">Início <span aria-hidden="true">↗</span></button></nav>`;
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
  show(action === 'home' ? 0 : screen + (action === 'back' ? -1 : 1), event.detail === 0);
});
document.addEventListener('pointerdown', resetTimer, { passive: true });
document.addEventListener('keydown', event => {
  resetTimer();
  if (['ArrowRight', 'ArrowLeft', 'Escape', 'Home'].includes(event.key)) {
    event.preventDefault();
    show(event.key === 'Escape' || event.key === 'Home' ? 0 : screen + (event.key === 'ArrowLeft' ? -1 : 1), true);
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) show(0, true);
});
show(0, true);
