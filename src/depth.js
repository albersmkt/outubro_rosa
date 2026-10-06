// Only decoration moves; text, hit targets, photo framing and QR codes stay still.
export function createDepthMotion(totem) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const layers = [...totem.querySelectorAll('.depth-layer')];
  let frame;

  const reset = () => {
    cancelAnimationFrame(frame);
    layers.forEach(layer => { layer.style.transform = ''; layer.getAnimations().forEach(a => a.cancel()); });
  };

  totem.addEventListener('pointermove', event => {
    if (reduce.matches || !pointer.matches || event.pointerType !== 'mouse') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = totem.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      layers.forEach((layer, index) => {
        const distance = rect.width * (index + 1) * .018;
        layer.style.transform = `translate3d(${x * distance}px, ${y * distance}px, 0)`;
      });
    });
  }, { passive: true });
  totem.addEventListener('pointerleave', reset);
  reduce.addEventListener('change', reset);

  return {
    changeScreen(keyboard = false) {
      reset();
      if (reduce.matches || keyboard) return;
      layers.forEach((layer, index) => layer.animate([
        { transform: `translateY(${(index + 1) * 9}px)`, opacity: .3 },
        { transform: 'translateY(0)', opacity: 1 },
      ], { duration: 240, easing: 'cubic-bezier(0.23,1,0.32,1)' }));
    },
  };
}
