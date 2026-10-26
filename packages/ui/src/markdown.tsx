import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Whether a link leaves the site: an absolute web address. A path stays. */
const isExternal = (href: string | undefined) =>
  href !== undefined && /^https?:\/\//i.test(href);

/**
 * A blog post's or a site document's Markdown as HTML, with GitHub's
 * tables, strikethrough and bare links. Not a client component: the
 * customer site renders it on the server, the console in the editor's
 * preview. Raw HTML in the text is left out. A `#` heading is shown as a
 * second-level one, since the page's title is its only first-level
 * heading. An image is a plain lazy `<img>`; `sizeOf` reads the width and
 * height its address carries (@repo/db's `imageSizeOf`), so the page
 * reserves its box. A link to another site opens in a new tab. No classes
 * inside: each app styles the elements from the wrapper's `className`.
 */
export function Markdown({
  text,
  className,
  sizeOf,
}: {
  text: string;
  className?: string;
  sizeOf?: (url: string) => { width: number; height: number } | null;
}) {
  const components: Components = {
    h1: ({ children }) => <h2>{children}</h2>,
    img: ({ src, alt }) => {
      const url = typeof src === "string" ? src : "";
      const size = sizeOf?.(url);
      return (
        <img
          src={url}
          alt={alt ?? ""}
          width={size?.width}
          height={size?.height}
          loading="lazy"
          decoding="async"
        />
      );
    },
    a: ({ href, children }) =>
      isExternal(href) ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <a href={href}>{children}</a>
      ),
  };
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
