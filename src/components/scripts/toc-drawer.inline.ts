// The drawer is opened and closed by the reader mode plugin's button.
// Reader mode sets `reader-mode="on|off"` on <html> and fires `readermodechange`;
// CSS does the sliding. This script keeps accessibility attributes in sync, makes the drawer
// and the explorer mutually exclusive, and closes the drawer after a heading was chosen
// or on Escape.

const MOBILE_QUERY = "(max-width: 800px)";

const isOpen = () => document.documentElement.getAttribute("reader-mode") === "on";
const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;
// The explorer plugin marks <html> with this class while its sidebar is open on a phone
const isExplorerOpen = () => document.documentElement.classList.contains("mobile-no-scroll");

const readerButton = () => document.querySelector<HTMLButtonElement>("button.readermode");
const explorerButton = () =>
  document.querySelector<HTMLButtonElement>(".explorer button.mobile-explorer");

function syncState() {
  const open = isOpen() && isMobile();
  document.querySelectorAll<HTMLElement>(".toc-drawer").forEach((drawer) => {
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
  });
  const drawer = document.querySelector<HTMLElement>(".toc-drawer");
  document.querySelectorAll<HTMLElement>("button.readermode").forEach((button) => {
    if (drawer) button.setAttribute("aria-controls", drawer.id);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function closeDrawer() {
  if (!isOpen() || !isMobile()) return;
  const button = readerButton();
  if (button) {
    // Click the real button so the reader mode plugin keeps its own state consistent
    button.click();
  } else {
    document.documentElement.setAttribute("reader-mode", "off");
    syncState();
  }
}

function closeExplorer() {
  if (!isMobile() || !isExplorerOpen()) return;
  // Click the real button so the explorer plugin keeps its own state consistent
  explorerButton()?.click();
}

function onReaderModeChange() {
  // The table of contents and the explorer must never be open at the same time
  if (isOpen() && isMobile()) closeExplorer();
  syncState();
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

  // Opening the explorer closes the table of contents
  document.querySelectorAll<HTMLElement>(".explorer-toggle").forEach((toggle) => {
    toggle.addEventListener("click", closeDrawer);
    cleanups.push(() => toggle.removeEventListener("click", closeDrawer));
  });

  document.addEventListener("keydown", onKeydown);
  cleanups.push(() => document.removeEventListener("keydown", onKeydown));

  // Opening the table of contents closes the explorer
  document.addEventListener("readermodechange", onReaderModeChange);
  cleanups.push(() => document.removeEventListener("readermodechange", onReaderModeChange));

  window.addCleanup?.(() => cleanups.forEach((fn) => fn()));
}

document.addEventListener("nav", setupTocDrawer);
document.addEventListener("render", setupTocDrawer);
