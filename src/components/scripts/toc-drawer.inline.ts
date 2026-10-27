// The drawer is opened and closed by the reader mode plugin's button.
// Reader mode sets `reader-mode="on|off"` on <html> and fires `readermodechange`;
// CSS does the sliding, this script only keeps accessibility attributes in sync
// and closes the drawer after a heading was chosen (or Escape was pressed).

const MOBILE_QUERY = "(max-width: 800px)";

const isOpen = () => document.documentElement.getAttribute("reader-mode") === "on";
const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

function syncState() {
  const open = isOpen() && isMobile();
  document.querySelectorAll<HTMLElement>(".toc-drawer").forEach((drawer) => {
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
  });
  document.querySelectorAll<HTMLElement>("button.readermode").forEach((button) => {
    const drawer = document.querySelector<HTMLElement>(".toc-drawer");
    if (drawer) button.setAttribute("aria-controls", drawer.id);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function closeDrawer() {
  if (!isOpen() || !isMobile()) return;
  const button = document.querySelector<HTMLButtonElement>("button.readermode");
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
  syncState();

  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLAnchorElement>(".toc-drawer a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
    cleanups.push(() => link.removeEventListener("click", closeDrawer));
  });

  document.addEventListener("keydown", onKeydown);
  cleanups.push(() => document.removeEventListener("keydown", onKeydown));

  document.addEventListener("readermodechange", syncState);
  cleanups.push(() => document.removeEventListener("readermodechange", syncState));

  window.addCleanup?.(() => cleanups.forEach((fn) => fn()));
}

document.addEventListener("nav", setupTocDrawer);
document.addEventListener("render", setupTocDrawer);
