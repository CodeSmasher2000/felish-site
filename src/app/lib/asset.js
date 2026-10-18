// Turns a site path like "/photos/x.jpg" into one that works wherever the
// site is hosted — at the root of a domain, or in a sub-folder such as
// GitHub Pages' /felish-site/. Full URLs (https://…) are left as they are.
export function asset(path) {
  if (!path || /^[a-z]+:/i.test(path)) return path;
  return import.meta.env.BASE_URL + path.replace(/^\//, "");
}
