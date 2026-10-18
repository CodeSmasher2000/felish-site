// Fade an element's opacity over `ms` and resolve when it's done.
export function fadeTo(el, opacity, ms) {
  return new Promise((resolve) => {
    el.style.transition = `opacity ${ms}ms ease`;
    // Force the start state to apply before changing it.
    void el.offsetWidth;
    el.style.opacity = String(opacity);
    el.classList.toggle("blocking", opacity > 0);
    setTimeout(resolve, ms);
  });
}

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
