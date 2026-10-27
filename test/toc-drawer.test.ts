// @vitest-environment node
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { render } from "preact-render-to-string";
import { h } from "preact";
// Tests run against the built bundle (see the "test" script, which builds first)
import { TocDrawer } from "../dist/index.js";

const toc = [
  { depth: 0, text: "Первый", slug: "pervyj" },
  { depth: 1, text: "Второй", slug: "vtoroj" },
];

const renderDrawer = (fileData: Record<string, unknown>, locale = "ru-RU") => {
  const Component = TocDrawer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(h(Component as any, { fileData, cfg: { locale } }));
};

// Same behaviour as the reader mode plugin's inline script (sets reader-mode on <html>
// and fires `readermodechange`), so the drawer logic is tested against the real contract.
const READER_MODE_STUB = `
let isReaderMode = false;
document.addEventListener("nav", () => {
  for (const b of document.getElementsByClassName("readermode")) {
    b.addEventListener("click", () => {
      isReaderMode = !isReaderMode;
      const mode = isReaderMode ? "on" : "off";
      document.documentElement.setAttribute("reader-mode", mode);
      document.dispatchEvent(new CustomEvent("readermodechange", { detail: { mode } }));
    });
  }
});
`;

function setupPage(width: number) {
  const html = renderDrawer({ toc });
  const dom = new JSDOM(
    `<!doctype html><html><body><button class="readermode"></button>${html}</body></html>`,
    { runScripts: "outside-only" },
  );
  const { window } = dom;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (q: string) => ({ matches: width <= 800 && q.includes("800px") });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).addCleanup = () => {};
  window.eval(READER_MODE_STUB);
  window.eval(TocDrawer().afterDOMLoaded as string);
  window.document.dispatchEvent(new window.CustomEvent("nav", { detail: { url: "/" } }));
  return window;
}

describe("TocDrawer markup", () => {
  it("renders the headings as links with data-for and depth classes", () => {
    const html = renderDrawer({ toc });
    expect(html).toContain('class="toc-drawer"');
    expect(html).toContain("Оглавление");
    expect(html).toContain('href="#pervyj"');
    expect(html).toContain('data-for="vtoroj"');
    expect(html).toContain("depth-1");
  });

  it("renders nothing when the page has no table of contents", () => {
    expect(renderDrawer({})).toBe("");
    expect(renderDrawer({ toc: [] })).toBe("");
  });
});

describe("TocDrawer behaviour on a phone", () => {
  it("syncs aria state with the reader mode button", () => {
    const w = setupPage(400);
    const button = w.document.querySelector<HTMLButtonElement>("button.readermode")!;
    const drawer = w.document.querySelector(".toc-drawer")!;

    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    button.click();
    expect(w.document.documentElement.getAttribute("reader-mode")).toBe("on");
    expect(drawer.getAttribute("aria-hidden")).toBe("false");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    button.click();
    expect(w.document.documentElement.getAttribute("reader-mode")).toBe("off");
    expect(drawer.getAttribute("aria-hidden")).toBe("true");
  });

  it("closes through the button when a heading link or Escape is used", () => {
    const w = setupPage(400);
    const button = w.document.querySelector<HTMLButtonElement>("button.readermode")!;
    const link = w.document.querySelector<HTMLAnchorElement>(".toc-drawer a")!;

    button.click();
    link.click();
    expect(w.document.documentElement.getAttribute("reader-mode")).toBe("off");

    button.click();
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.document.documentElement.getAttribute("reader-mode")).toBe("off");
  });

  it("does not touch reader mode on a wide screen", () => {
    const w = setupPage(1200);
    const button = w.document.querySelector<HTMLButtonElement>("button.readermode")!;
    button.click();
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.document.documentElement.getAttribute("reader-mode")).toBe("on");
  });
});
