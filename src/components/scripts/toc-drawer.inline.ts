// The drawer is opened and closed by the reader mode plugin's button.
// Reader mode sets `reader-mode="on|off"` on <html> and fires `readermodechange`;
// CSS does the sliding. This script:
//  - keeps accessibility attributes in sync,
//  - shows copies of the reader mode button and the explorer button above the open drawer,
//    pinned to the place where the real buttons are at the top of the page (the real ones scroll
//    away together with the page, e.g. after jumping to a heading),
//  - makes the drawer and the explorer mutually exclusive,
//  - closes the drawer after a heading was chosen or on Escape.

const MOBILE_QUERY = "(max-width: 800px)";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ButtonCopy {
  /** selector of the real button */
  real: string;
  /** class of the copy, styled in toc-drawer.scss */
  copyClass: string;
  /** classes of the real button that must NOT be on the copy (other plugins hook into them) */
  strip: string[];
  /** what a click on the copy does */
  onClick: () => void;
}

const isOpen = () => document.documentElement.getAttribute("reader-mode") === "on";
const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;
// The explorer plugin marks <html> with this class while its sidebar is open on a phone
const isExplorerOpen = () => document.documentElement.classList.contains("mobile-no-scroll");

const readerButton = () => document.querySelector<HTMLButtonElement>("button.readermode");
const explorerButton = () =>
  document.querySelector<HTMLButtonElement>(".explorer button.mobile-explorer");

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
  explorerButton()?.click();
}

const COPIES: ButtonCopy[] = [
  {
    real: "button.readermode",
    copyClass: "toc-drawer-close",
    // without this the reader mode plugin would attach a second toggle handler to the copy
    strip: ["readermode"],
    onClick: closeDrawer,
  },
  {
    real: ".explorer button.mobile-explorer",
    copyClass: "toc-drawer-explorer",
    strip: ["explorer-toggle", "mobile-explorer", "hide-until-loaded"],
    onClick: () => {
      closeDrawer();
      if (!isExplorerOpen()) explorerButton()?.click();
    },
  },
];

// Where each real button sits at the top of the page, remembered while it is fully on screen
const homeRects = new Map<string, Rect>();

const toRect = (r: DOMRect): Rect => ({
  top: r.top,
  left: r.left,
  width: r.width,
  height: r.height,
});

function measure(copy: ButtonCopy): Rect | null {
  const real = document.querySelector<HTMLElement>(copy.real);
  if (!real) return null;
  const r = real.getBoundingClientRect();
  const fullyVisible = r.width > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
  if (fullyVisible) {
    homeRects.set(copy.copyClass, toRect(r));
    return toRect(r);
  }
  // The page was scrolled and the real button is out of sight: use where it was at the top
  const home = homeRects.get(copy.copyClass);
  if (home) return home;
  if (r.width > 0) {
    return {
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
    };
  }
  return null;
}

function ensureCopy(drawer: HTMLElement, copy: ButtonCopy): HTMLButtonElement | null {
  const real = document.querySelector<HTMLButtonElement>(copy.real);
  if (!real) return null;

  let el = drawer.parentElement?.querySelector<HTMLButtonElement>(`:scope > .${copy.copyClass}`);
  if (!el) {
    el = real.cloneNode(true) as HTMLButtonElement;
    el.classList.remove(...copy.strip);
    el.classList.add(copy.copyClass);
    el.removeAttribute("data-mobile");
    drawer.after(el);
  }
  return el;
}

function placeCopies() {
  for (const copy of COPIES) {
    const rect = measure(copy);
    document.querySelectorAll<HTMLElement>(`.${copy.copyClass}`).forEach((el) => {
      if (!rect) {
        el.style.display = "none";
        return;
      }
      el.style.display = "";
      el.style.top = `${rect.top}px`;
      el.style.left = `${rect.left}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
    });
  }
}

function syncState() {
  const open = isOpen() && isMobile();
  document.querySelectorAll<HTMLElement>(".toc-drawer").forEach((drawer) => {
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
  });
  const drawer = document.querySelector<HTMLElement>(".toc-drawer");
  document.querySelectorAll<HTMLElement>("button.readermode, .toc-drawer-close").forEach((b) => {
    if (drawer) b.setAttribute("aria-controls", drawer.id);
    b.setAttribute("aria-expanded", open ? "true" : "false");
  });
  placeCopies();
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
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>(".toc-drawer").forEach((drawer) => {
    for (const copy of COPIES) {
      const el = ensureCopy(drawer, copy);
      if (!el) continue;
      el.addEventListener("click", copy.onClick);
      cleanups.push(() => el.removeEventListener("click", copy.onClick));
    }
  });

  document.querySelectorAll<HTMLAnchorElement>(".toc-drawer a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
    cleanups.push(() => link.removeEventListener("click", closeDrawer));
  });

  // Opening the explorer (its real button) closes the table of contents
  document.querySelectorAll<HTMLElement>(".explorer-toggle").forEach((toggle) => {
    toggle.addEventListener("click", closeDrawer);
    cleanups.push(() => toggle.removeEventListener("click", closeDrawer));
  });

  document.addEventListener("keydown", onKeydown);
  cleanups.push(() => document.removeEventListener("keydown", onKeydown));

  document.addEventListener("readermodechange", onReaderModeChange);
  cleanups.push(() => document.removeEventListener("readermodechange", onReaderModeChange));

  window.addEventListener("resize", syncState);
  cleanups.push(() => window.removeEventListener("resize", syncState));

  // Remember the real buttons' places while the page is still at the top
  COPIES.forEach(measure);
  syncState();
  window.addCleanup?.(() => cleanups.forEach((fn) => fn()));
}

document.addEventListener("nav", setupTocDrawer);
document.addEventListener("render", setupTocDrawer);
