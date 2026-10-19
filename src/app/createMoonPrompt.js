// A small in-page yes/no prompt: "Visit my sphere?" when the moon is tapped,
// and "Do you want to enter?" at the waterfall.
export function createMoonPrompt({
  onAccept,
  eyebrow = "You found the moon",
  title = "Visit my sphere?",
  yesLabel = "Take me there",
  noLabel = "Not now",
}) {
  const id = `prompt-${Math.random().toString(36).slice(2, 8)}`;
  const el = document.createElement("div");
  el.className = "sphere-prompt";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-labelledby", id);
  el.innerHTML = `
    <p class="sphere-prompt-eyebrow">${eyebrow}</p>
    <h2 id="${id}">${title}</h2>
    <div class="sphere-prompt-actions">
      <button type="button" class="sphere-yes">${yesLabel}</button>
      <button type="button" class="sphere-no">${noLabel}</button>
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
