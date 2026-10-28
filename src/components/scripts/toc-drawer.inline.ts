// The drawer is opened and closed by the reader mode plugin's button.
// Reader mode sets `reader-mode="on|off"` on <html> and fires `readermodechange`;
// CSS does the sliding. This script keeps accessibility attributes in sync, shows a
// copy of the reader mode button above the open drawer (so the same button closes it),
// and closes the drawer after a heading was chosen, on Escape, or when the explorer opens.

const MOBILE_QUERY = "(max-width: 800px)";
const CLOSE_CLASS = "toc-drawer-close";

const isOpen = () => document.documentElement.getAttribute("reader-mode") === "on";
const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

const realButton = () => document.querySelector<HTMLButtonElement>("button.readermode");

// A copy of the reader mode button that sits right after the drawer, outside of it, so it is
// always painted above the drawer no matter how the sidebar's stacking contexts are built.
// It is NOT given the `readermode` class, otherwise the reader mode plugin would attach a
// second toggle handler to it.
function ensureCloseButton(drawer: HTMLElement): HTMLButtonElement | null {
  const real = realButton();
  if (!real) return null;

  let close = drawer.parentElement?.querySelector<HTMLButtonElement>(`:scope > .${CLOSE_CLASS}`);
  if (!close) {
    close = real.cloneNode(true) as HTMLButtonElement;
    close.classList.remove("readermode");
    close.classList.add(CLOSE_CLASS);
    close.removeAttribute("aria-controls");
    drawer.after(close);
  }
  return close;
}

// Put the copy exactly over the real button
function placeCloseButtons() {
  const real = realButton();
  if (!real) return;
  const rect = real.getBoundingClientRect();
  document.querySelectorAll<HTMLElement>(`.${CLOSE_CLASS}`).forEach((close) => {
    close.style.top = `${rect.top}px`;
    close.style.left = `${rect.left}px`;
    close.style.width = `${rect.width}px`;
    close.style.height = `${rect.height}px`;
  });
}

function syncState() {
  const open = isOpen() && isMobile();
  document.querySelectorAll<HTMLElement>(".toc-drawer").forEach((drawer) => {
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
  });
  document.querySelectorAll<HTMLElement>(`button.readermode, .${CLOSE_CLASS}`).forEach((button) => {
    const drawer = document.querySelector<HTMLElement>(".toc-drawer");
    if (drawer) button.setAttribute("aria-controls", drawer.id);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
  if (open) placeCloseButtons();
}

function closeDrawer() {
  if (!isOpen() || !isMobile()) return;
  const button = realButton();
  if (button) {
    // Click the real button so the reader mode plugin keeps its own state consistent
    button.click();
  } else {
    document.documentElement.setAttribute("reader-mode", "off");
    syncState();
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") closeDrawer();
}

function setupTocDrawer() {
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>(".toc-drawer").forEach((drawer) => {
    const close = ensureCloseButton(drawer);
    if (close) {
      close.addEventListener("click", closeDrawer);
      cleanups.push(() => close.removeEventListener("click", closeDrawer));
    }
  });

  document.querySelectorAll<HTMLAnchorElement>(".toc-drawer a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
    cleanups.push(() => link.removeEventListener("click", closeDrawer));
  });

  // Opening the explorer must not leave the table of contents open underneath it
  document.querySelectorAll<HTMLElement>(".explorer-toggle").forEach((toggle) => {
    toggle.addEventListener("click", closeDrawer);
    cleanups.push(() => toggle.removeEventListener("click", closeDrawer));
  });

  document.addEventListener("keydown", onKeydown);
  cleanups.push(() => document.removeEventListener("keydown", onKeydown));

  document.addEventListener("readermodechange", syncState);
  cleanups.push(() => document.removeEventListener("readermodechange", syncState));

  window.addEventListener("resize", syncState);
  cleanups.push(() => window.removeEventListener("resize", syncState));

  syncState();
  window.addCleanup?.(() => cleanups.forEach((fn) => fn()));
}

document.addEventListener("nav", setupTocDrawer);
document.addEventListener("render", setupTocDrawer);
