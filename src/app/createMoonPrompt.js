// "Visit my sphere?" — a small in-page prompt shown when the moon is tapped.
export function createMoonPrompt({ onAccept }) {
  const el = document.createElement("div");
  el.className = "sphere-prompt";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-labelledby", "sphere-prompt-title");
  el.innerHTML = `
    <p class="sphere-prompt-eyebrow">You found the moon</p>
    <h2 id="sphere-prompt-title">Visit my sphere?</h2>
    <div class="sphere-prompt-actions">
      <button type="button" class="sphere-yes">Take me there</button>
      <button type="button" class="sphere-no">Not now</button>
    </div>`;
  document.body.appendChild(el);

  const yes = el.querySelector(".sphere-yes");
  const no = el.querySelector(".sphere-no");
  let open = false;
  let returnFocus = null;

  function show() {
    if (open) return;
    open = true;
    returnFocus = document.activeElement;
    el.classList.add("open");
    // Focus without scrolling, after the fade starts.
    requestAnimationFrame(() => yes.focus({ preventScroll: true }));
  }

  function hide() {
    if (!open) return;
    open = false;
    el.classList.remove("open");
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus?.({ preventScroll: true });
  }

  yes.addEventListener("click", () => {
    hide();
    onAccept();
  });
  no.addEventListener("click", hide);

  return {
    open: show,
    close: hide,
    get isOpen() {
      return open;
    },
  };
}
