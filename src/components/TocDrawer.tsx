import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types";
import { classNames } from "../util/lang";
import { i18n } from "../i18n";
import style from "./styles/toc-drawer.scss";
// @ts-expect-error - inline script imported as string by the Quartz bundler
import script from "./scripts/toc-drawer.inline.ts";

export interface TocDrawerOptions {
  /** Heading shown at the top of the drawer. Defaults to the localized "Table of Contents". */
  title?: string;
}

let numDrawers = 0;

export default ((opts?: Partial<TocDrawerOptions>) => {
  const TocDrawer: QuartzComponent = (props: QuartzComponentProps) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { fileData, cfg } = props as any;
    // `fileData.toc` is produced by the table-of-contents plugin (transformer)
    if (!fileData?.toc || fileData.toc.length === 0) {
      return null;
    }

    const displayClass = (props as { displayClass?: "mobile-only" | "desktop-only" }).displayClass;
    const id = `toc-drawer-${numDrawers++}`;
    const title = opts?.title ?? i18n(cfg?.locale ?? "en-US").components.tableOfContents.title;

    return (
      <nav
        class={classNames(displayClass, "toc-drawer")}
        id={id}
        aria-label={title}
        aria-hidden="true"
      >
        <h3 class="toc-drawer-title">{title}</h3>
        <ul class="toc-drawer-list">
          {fileData.toc.map((tocEntry: Record<string, unknown>) => {
            const slug = String(tocEntry.slug);
            const depth = String(tocEntry.depth);
            const text = String(tocEntry.text);
            return (
              <li key={slug} class={`depth-${depth}`}>
                <a href={`#${slug}`} data-for={slug}>
                  {text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  };

  TocDrawer.css = style;
  TocDrawer.afterDOMLoaded = script;
  return TocDrawer;
}) satisfies QuartzComponentConstructor<Partial<TocDrawerOptions>>;
