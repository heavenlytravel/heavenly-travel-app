"use client";

import {
  IMAGE_MAX_MB,
  IMAGE_TYPES,
  imageSizeOf,
  isUploadUrl,
  markdownImagesOf,
  parseMarkdownImport,
  replaceMarkdownImage,
  withImageSize,
  type MarkdownImage,
  type MarkdownImport,
  type UploadedImage,
} from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Dialog } from "@repo/ui/dialog";
import { Input } from "@repo/ui/field";
import { ImageIcon } from "@repo/ui/icons";
import { Markdown } from "@repo/ui/markdown";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Count } from "./page-editor/Count";
import { LOCATION_IMAGE_UPLOAD_PATH } from "../_lib/routes";
import { FormError } from "@repo/console/FormError";
import { useImageUpload } from "@repo/console/use-image-upload";

/**
 * How the console's preview shows a body: the elements styled from the
 * wrapper, in the console's slate tones. The customer site styles its own.
 */
const PROSE =
  "text-sm leading-relaxed text-slate-700 [&>:first-child]:mt-0 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:font-semibold [&_h4]:text-slate-900 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md [&_table]:my-4 [&_table]:w-full [&_table]:text-left [&_th]:border-b [&_th]:border-slate-300 [&_th]:py-1.5 [&_th]:pr-3 [&_td]:border-b [&_td]:border-slate-100 [&_td]:py-1.5 [&_td]:pr-3 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:text-[0.85em] [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_hr]:my-6 [&_hr]:border-slate-200";

/** The files "Import .md" takes, by their name. */
const MARKDOWN_FILE = /\.(md|markdown|txt)$/i;

/** A span of the text: where the selection starts and ends. */
type Span = { start: number; end: number };

/** What a toolbar button does to the text and its selection. */
type Edit = Span & { text: string; select: Span };

/**
 * Wraps the selection in a mark, or takes the mark off a selection it
 * already wraps. With nothing selected, it puts in a placeholder, selected.
 */
function wrap(value: string, { start, end }: Span, mark: string): Edit {
  const before = value.slice(start - mark.length, start);
  const after = value.slice(end, end + mark.length);
  if (before === mark && after === mark && start !== end) {
    const inner = value.slice(start, end);
    const from = start - mark.length;
    return {
      start: from,
      end: end + mark.length,
      text: inner,
      select: { start: from, end: from + inner.length },
    };
  }
  const inner = value.slice(start, end) || "text";
  return {
    start,
    end,
    text: `${mark}${inner}${mark}`,
    select: {
      start: start + mark.length,
      end: start + mark.length + inner.length,
    },
  };
}

/** A line's own mark at its start, which another of the same kind replaces. */
const LINE_MARK = /^(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/;

/**
 * Starts every line the selection touches with a mark: a heading's, a
 * quote's or a list's, numbered from 1 for `1. `. A line that already has
 * the same kind of mark loses it instead, so pressing twice undoes it.
 */
function prefixLines(
  value: string,
  { start, end }: Span,
  markOf: (line: number) => string,
): Edit {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const to = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(from, to).split("\n");
  // Across several lines, a blank one between paragraphs keeps no mark
  // and takes no number.
  const isGap = (line: string) => lines.length > 1 && line.trim() === "";
  const kindOf = (mark: string) => mark.replace(/\d+/, "1").trim();
  const allMarked = lines
    .filter((line) => !isGap(line))
    .every(
      (line, i) =>
        kindOf(LINE_MARK.exec(line)?.[0] ?? "") === kindOf(markOf(i)),
    );
  let number = 0;
  const text = lines
    .map((line) => {
      if (isGap(line)) return line;
      const bare = line.replace(LINE_MARK, "");
      return allMarked ? bare : `${markOf(number++)}${bare}`;
    })
    .join("\n");
  return {
    start: from,
    end: to,
    text,
    select: { start: from + text.length, end: from + text.length },
  };
}

/** A link around the selection, its address selected to be typed over. */
function link(value: string, { start, end }: Span): Edit {
  const label = value.slice(start, end) || "link text";
  const url = "https://";
  const text = `[${label}](${url})`;
  const at = start + label.length + 3;
  return {
    start,
    end,
    text,
    select: value.slice(start, end)
      ? { start: at, end: at + url.length }
      : { start: start + 1, end: start + 1 + label.length },
  };
}

/**
 * The body of a blog post or a site document, written in Markdown: a
 * toolbar over the text (headings, bold, italic, a link, lists, a quote, an
 * image), the text, and the page as it will read beside it from `lg` up, in
 * a tab of its own below that. A toolbar edit goes through the browser's
 * own typing, so Ctrl+Z undoes it. An image is uploaded here, as every
 * image of a page is, and goes in at the cursor with its alt text and its
 * size. "Import .md" reads a file written elsewhere: its title and
 * descriptions go to `onImport`, which fills the page's fields, or its body
 * alone into this one. Under the text, every image in it, with its alt
 * text to write and, for one that links elsewhere, "Upload" to bring it
 * here: a page publishes only images uploaded here.
 */
export function MarkdownField({
  id,
  value,
  onChange,
  limit,
  onImport,
}: {
  /** The text area's id, for a label outside to name it. */
  id?: string;
  value: string;
  onChange: (next: string) => void;
  /** The most characters the body holds. */
  limit: number;
  /** Fills the page's fields from an imported file; without it the body alone is filled. */
  onImport?: (parsed: MarkdownImport) => void;
}) {
  const ownId = useId();
  const fieldId = id ?? ownId;
  const area = useRef<HTMLTextAreaElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  // The text as last rendered, for what lands after an upload or a read.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  const [view, setView] = useState<"write" | "preview">("write");
  const [importError, setImportError] = useState<string | null>(null);
  const [adding, setAdding] = useState<Span | null>(null);
  const [confirmDialog, confirm] = useConfirm();
  const images = markdownImagesOf(value);

  /**
   * Replaces a span of the text through the browser's typing, so the edit
   * joins the undo history, then selects `select`. Where the browser does
   * not take it, the text is set directly.
   */
  function apply({ start, end, text, select }: Edit) {
    const textarea = area.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    const typed =
      text === ""
        ? document.execCommand("delete")
        : document.execCommand("insertText", false, text);
    if (!typed) {
      const current = latest.current;
      onChange(current.slice(0, start) + text + current.slice(end));
    }
    requestAnimationFrame(() =>
      area.current?.setSelectionRange(select.start, select.end),
    );
  }

  /** What the text area has selected now. */
  function selection(): Span {
    const textarea = area.current;
    return textarea
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : { start: value.length, end: value.length };
  }

  const edit = (make: (value: string, span: Span) => Edit) =>
    apply(make(latest.current, selection()));

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "b" || key === "i") {
      event.preventDefault();
      edit((text, span) => wrap(text, span, key === "b" ? "**" : "_"));
    }
  }

  async function importFile(file: File) {
    setImportError(null);
    if (!MARKDOWN_FILE.test(file.name)) {
      setImportError("Choose a Markdown file: one ending in .md or .markdown.");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError(
        `${file.name} could not be read. Save it again as a Markdown file and choose it again.`,
      );
      return;
    }
    const parsed = parseMarkdownImport(text);
    if (
      latest.current.trim() !== "" &&
      !(await confirm({
        title: "Replace the text with the file's?",
        description: onImport
          ? "What is written here goes, and the file's title and descriptions fill their fields."
          : "What is written here goes.",
        action: "Replace",
      }))
    ) {
      return;
    }
    if (onImport) onImport(parsed);
    else onChange(parsed.body);
  }

  const tool = (
    label: string,
    content: ReactNode,
    make: (value: string, span: Span) => Edit,
    shortcut?: string,
  ) => (
    <ToolButton
      key={label}
      label={shortcut ? `${label} (${shortcut})` : label}
      onClick={() => edit(make)}
    >
      {content}
    </ToolButton>
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="toolbar"
          aria-label="Formatting"
          aria-controls={fieldId}
          className="flex flex-wrap items-center gap-1"
        >
          {tool("Heading", "H2", (text, span) =>
            prefixLines(text, span, () => "## "),
          )}
          {tool("Subheading", "H3", (text, span) =>
            prefixLines(text, span, () => "### "),
          )}
          <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />
          {tool(
            "Bold",
            <span className="font-bold">B</span>,
            (text, span) => wrap(text, span, "**"),
            "Ctrl+B",
          )}
          {tool(
            "Italic",
            <span className="font-serif italic">I</span>,
            (text, span) => wrap(text, span, "_"),
            "Ctrl+I",
          )}
          {tool("Link", "Link", link)}
          <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />
          {tool("Bulleted list", "• List", (text, span) =>
            prefixLines(text, span, () => "- "),
          )}
          {tool("Numbered list", "1. List", (text, span) =>
            prefixLines(text, span, (line) => `${line + 1}. `),
          )}
          {tool("Quote", "“ Quote", (text, span) =>
            prefixLines(text, span, () => "> "),
          )}
          <ToolButton label="Image" onClick={() => setAdding(selection())}>
            <ImageIcon className="size-4" />
            Image
          </ToolButton>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={importInput}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-label="Import a Markdown file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared, so choosing the same file again reads it again.
              event.target.value = "";
              if (file) void importFile(file);
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => importInput.current?.click()}
          >
            Import .md
          </Button>
          <Count value={value.length} limit={limit} />
        </div>
      </div>
      <FormError error={importError} size="xs" />

      <div
        role="tablist"
        aria-label="Write or preview"
        className="flex gap-1 border-b border-slate-200 lg:hidden"
      >
        {(["write", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={view === tab}
            onClick={() => setView(tab)}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              view === tab
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            {tab === "write" ? "Write" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <textarea
          ref={area}
          id={fieldId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck
          rows={22}
          placeholder={
            "Write here. Start a line with ## for a heading.\nLeave a blank line between paragraphs."
          }
          className={cx(
            "block min-h-80 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
            view === "preview" && "hidden lg:block",
          )}
        />
        <div
          aria-label="Preview"
          className={cx(
            "min-h-80 overflow-auto rounded-md border border-slate-200 bg-white px-4 py-3",
            view === "write" && "hidden lg:block",
          )}
        >
          {value.trim() === "" ? (
            <p className="text-sm text-slate-400">
              The text shows here as the page will read it.
            </p>
          ) : (
            <Markdown text={value} sizeOf={imageSizeOf} className={PROSE} />
          )}
        </div>
      </div>

      {images.length > 0 ? (
        <TextImages
          images={images}
          onAlt={(image, alt) =>
            onChange(replaceMarkdownImage(latest.current, image.index, { alt }))
          }
          onUploaded={(image, uploaded) => {
            // The text may have changed while the file went up: the image is
            // found again by the address it had.
            const now = markdownImagesOf(latest.current).find(
              (other) => other.url === image.url,
            );
            if (!now) return;
            onChange(
              replaceMarkdownImage(latest.current, now.index, {
                url: withImageSize(
                  uploaded.url,
                  uploaded.width,
                  uploaded.height,
                ),
              }),
            );
          }}
        />
      ) : null}

      <AddImageDialog
        open={adding !== null}
        onOpenChange={(open) => {
          if (!open) setAdding(null);
        }}
        onAdd={(alt, uploaded) => {
          const at = adding ?? selection();
          setAdding(null);
          const current = latest.current;
          // An image is a block of its own: blank lines around it.
          const before =
            at.start === 0 || current.slice(0, at.start).endsWith("\n\n")
              ? ""
              : current.slice(0, at.start).endsWith("\n")
                ? "\n"
                : "\n\n";
          const image = `![${alt.replace(/[\\[\]]/g, (char) => `\\${char}`)}](${withImageSize(
            uploaded.url,
            uploaded.width,
            uploaded.height,
          )})`;
          const text = `${before}${image}\n\n`;
          // After the dialog has closed and handed the focus back.
          requestAnimationFrame(() =>
            apply({
              ...at,
              text,
              select: {
                start: at.start + text.length,
                end: at.start + text.length,
              },
            }),
          );
        }}
      />
      {confirmDialog}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Keeps the text area's selection: the press must not take the focus.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium text-slate-700 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

/**
 * The image to put in at the cursor: its alt text, then the file, which is
 * uploaded the moment it is chosen and goes in as it lands.
 */
function AddImageDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (alt: string, image: UploadedImage) => void;
}) {
  const altId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const { upload, uploading, error } = useImageUpload(
    LOCATION_IMAGE_UPLOAD_PATH,
    "image",
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!uploading) onOpenChange(next);
        if (!next) setAlt("");
      }}
      title="Add an image"
      description="It goes in where the cursor was, on a line of its own."
    >
      <div className="grid gap-4">
        <div>
          <label
            htmlFor={altId}
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            Alt text
          </label>
          <Input
            id={altId}
            autoComplete="off"
            disabled={uploading}
            placeholder="What the image shows, for someone who cannot see it"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            A page publishes only once every image has one. You can write it
            later under “Images in the text”.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label="Image: choose a file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void upload([file], (uploaded) => {
                onAdd(alt.trim(), uploaded);
                setAlt("");
              });
            }}
          />
          <Button disabled={uploading} onClick={() => input.current?.click()}>
            {uploading ? "Uploading…" : "Choose image"}
          </Button>
          <span className="text-xs text-slate-500">
            JPEG, PNG or WebP, at most {IMAGE_MAX_MB} MB.
          </span>
        </div>
        <FormError error={error} size="xs" />
      </div>
    </Dialog>
  );
}

/**
 * Every image in the text, each with its alt text to write and, for one
 * that links elsewhere, "Upload" to bring it here.
 */
function TextImages({
  images,
  onAlt,
  onUploaded,
}: {
  images: MarkdownImage[];
  onAlt: (image: MarkdownImage, alt: string) => void;
  onUploaded: (image: MarkdownImage, uploaded: UploadedImage) => void;
}) {
  const away = images.filter((image) => !isUploadUrl(image.url)).length;
  return (
    <section aria-label="Images in the text" className="grid gap-2">
      <h3 className="text-sm font-medium text-slate-800">
        Images in the text
        {away > 0 ? (
          <span className="ml-2 text-xs font-normal text-amber-800">
            {away === 1
              ? "1 is not uploaded here"
              : `${away} are not uploaded here`}
          </span>
        ) : null}
      </h3>
      <ol className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {images.map((image) => (
          // The address and the place together: the same file may be in twice.
          <li key={`${image.index}-${image.url}`}>
            <TextImage
              image={image}
              onAlt={(alt) => onAlt(image, alt)}
              onUploaded={(uploaded) => onUploaded(image, uploaded)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TextImage({
  image,
  onAlt,
  onUploaded,
}: {
  image: MarkdownImage;
  onAlt: (alt: string) => void;
  onUploaded: (uploaded: UploadedImage) => void;
}) {
  const altId = useId();
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useImageUpload(
    LOCATION_IMAGE_UPLOAD_PATH,
    "image",
  );
  const here = isUploadUrl(image.url);

  return (
    <div className="flex flex-wrap items-start gap-3 p-3">
      {here ? (
        <Image
          src={image.url}
          alt=""
          width={96}
          height={64}
          sizes="96px"
          className="h-16 w-24 shrink-0 rounded border border-slate-200 object-cover"
        />
      ) : (
        <span className="grid h-16 w-24 shrink-0 place-items-center rounded border border-dashed border-amber-300 bg-amber-50 px-1 text-center text-[11px] leading-tight text-amber-800">
          Not uploaded here
        </span>
      )}
      <div className="grid min-w-0 flex-1 gap-1.5">
        <label htmlFor={altId} className="sr-only">
          Alt text of image {image.index + 1}
        </label>
        <Input
          id={altId}
          autoComplete="off"
          placeholder="Alt text: what the image shows"
          value={image.alt}
          onChange={(event) => onAlt(event.target.value)}
          className="h-8"
        />
        {here ? null : (
          <p className="truncate text-xs text-slate-500" title={image.url}>
            Links to {image.url}
          </p>
        )}
        <FormError error={error} size="xs" />
      </div>
      {here ? null : (
        <>
          <input
            ref={input}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label={`Image ${image.index + 1}: choose a file to upload`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload([file], onUploaded);
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </>
      )}
    </div>
  );
}
