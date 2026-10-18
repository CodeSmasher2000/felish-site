// A panel over the scene that shows an Instagram post using Instagram's own
// embed (an iframe from instagram.com), with a link out to the post.
// Without a post link it points to the profile instead.
export function createPostViewer({ handle, profile }) {
  const el = document.createElement("div");
  el.className = "post-viewer";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Instagram post");
  el.innerHTML = `
    <div class="post-card">
      <button type="button" class="post-close" aria-label="Close">×</button>
      <div class="post-frame"></div>
      <a class="post-link" target="_blank" rel="noopener"></a>
    </div>`;
  document.body.appendChild(el);

  const frame = el.querySelector(".post-frame");
  const link = el.querySelector(".post-link");
  const close = el.querySelector(".post-close");
  let open = false;

  // https://www.instagram.com/p/CODE/ (or /reel/CODE/) → its embed page.
  const embedUrl = (url) => {
    const m = url.match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned/` : null;
  };

  function show(post) {
    const src = post?.url ? embedUrl(post.url) : null;
    if (src) {
      frame.innerHTML = `<iframe src="${src}" title="Instagram post by @${handle}" loading="lazy" allowtransparency="true" scrolling="no"></iframe>`;
      link.href = post.url;
      link.textContent = "Open on Instagram ↗";
    } else {
      frame.innerHTML = `<div class="post-empty"><p>@${handle}</p><span>More on Instagram</span></div>`;
      link.href = profile;
      link.textContent = `Follow @${handle} ↗`;
    }
    el.classList.add("open");
    open = true;
    close.focus({ preventScroll: true });
  }

  function hide() {
    if (!open) return;
    el.classList.remove("open");
    open = false;
    setTimeout(() => {
      if (!open) frame.innerHTML = ""; // stop the embed once hidden
    }, 300);
  }

  close.addEventListener("click", hide);
  el.addEventListener("click", (e) => {
    if (e.target === el) hide(); // click outside the card
  });
  // Esc closes the panel first (before Esc leaves the sphere).
  window.addEventListener(
    "keydown",
    (e) => {
      if (open && e.key === "Escape") {
        e.stopImmediatePropagation();
        hide();
      }
    },
    true,
  );

  return {
    show,
    hide,
    get isOpen() {
      return open;
    },
  };
}
