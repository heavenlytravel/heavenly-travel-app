"use client";

import {
  PAGE_KIND_RULES,
  PAGE_LIMITS,
  changedPageParts,
  checkPageLimits,
  formatLocalDateTime,
  heroLabelsOf,
  isPagePublished,
  pageChecks,
  pageContentOf,
  pageStatusOf,
  samePageContent,
  wordCount,
  type MarkdownImport,
  type PageCheck,
  type PageContent,
  type PageEditorTab,
  type PageFaq,
  type PageKind,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Tooltip } from "@repo/ui/tooltip";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Field, Input, Textarea } from "@repo/ui/field";
import { Switch } from "@repo/ui/switch";
import { toast } from "@repo/ui/toast";
import { scrollBehavior } from "@repo/ui/motion";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { errorOf } from "@repo/console/action-state";
import { useLeaveGuard } from "@repo/console/use-leave-guard";
import { Card, CardTitle } from "@repo/console/Card";
import { Notice } from "@repo/ui/notice";
import { MarkdownField } from "../MarkdownField";
import { UploadsContext, useUploadCount } from "@repo/console/use-image-upload";
import {
  RowControls,
  movedRow,
} from "../../(console)/[location]/pages/_components/RowControls";
import {
  publishPageAction,
  savePageDraftAction,
  unpublishPageAction,
} from "./actions";
import { Count, Counted } from "./Count";
import { ImageField } from "./ImageField";
import {
  SavedAddressPicker,
  type AddressArea,
  type PickableAddress,
} from "../../(console)/[location]/pages/_components/SavedAddressPicker";
import { CompareDialog } from "./PageHistory";
import { BarLink, PublishBar } from "./PublishBar";
import { PublishDialog } from "./PublishDialog";
import { useSaveShortcut } from "./use-save-shortcut";
import { SearchResultPreview, SharedLinkPreview } from "./SearchPreviews";
import type { PageTarget } from "./target";

/** A row of a list in the form, with a key that stays while the form is open. */
type Keyed<T> = T & { key: string };

/** The content as the form holds it: as typed, its FAQs keyed. */
type FormContent = Omit<PageContent, "faqs"> & { faqs: Keyed<PageFaq>[] };

const formContentOf = (content: PageContent): FormContent => ({
  ...content,
  faqs: content.faqs.map((faq, i) => ({ ...faq, key: `faq-${i}` })),
});

/** The id of the part of the editor a check is about, which "Go to it" scrolls to. */
const partId = (key: PageCheck["key"]) => `page-${key}`;

/** Where a part lands when "Go to it" scrolls to it: clear of the console's top bar and the publish bar. */
const PART_SCROLL = "scroll-mt-52";

/** How the tagline is asked for, on the kinds that have one. */
const TAGLINE_FIELD: Partial<
  Record<PageKind, { label: string; placeholder: string; hint: string }>
> = {
  landing: {
    label: "Tagline",
    placeholder: "Island escape",
    hint: "The short line over the headline, and under the name on a home page card. Optional.",
  },
  home: {
    label: "Handwritten word",
    placeholder: "Travel",
    hint: "The word over the headline, in the handwriting type. Optional.",
  },
  connect: {
    label: "Kicker",
    placeholder: "For car-with-driver and coach companies",
    hint: "The short line over the headline: who the page speaks to. Optional.",
  },
};

/**
 * One part of a card of the editor, under its name and a line of help,
 * split from the one before by a hairline. "Go to it" lands on it by its
 * `id`.
 */
function Part({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cx(
        "border-t border-hairline pt-5 first:border-t-0 first:pt-0",
        id && PART_SCROLL,
      )}
    >
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {hint ? <p className="mt-0.5 text-caption text-muted">{hint}</p> : null}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

/** What a page under a section, added on demand, offers besides its content: its slug and its delete. */
export type EntryControls = {
  /** Whether the slug can still change: until the first publish. */
  slugLocked: boolean;
  /** "popular place", as the questions name it. */
  one: string;
  /** A place's type, which its address follows and which changes with the slug: "Attraction". */
  type?: string;
  /** Opens the dialog that changes the slug. */
  onRename: () => void;
  /** Asks, then deletes the page; answers why not, or null. */
  onDelete: () => Promise<string | null>;
};

/**
 * The editor of one page: a location's or one of the site's own, under
 * its header (`EditorHeader`). On top, the publish bar, held in view while
 * the form scrolls: where the page stands and what that means for the
 * public, level with "Preview" of the saved draft, "Save draft" (also
 * Ctrl+S) and "Publish"; under them its address and the quiet moves:
 * "Compare" while the draft differs from what the public sees,
 * "Unpublish" where allowed, and on a page added on demand "Delete".
 * Under it, two cards: the page's content, the parts its kind holds, then
 * its SEO, what search engines and shared links show with a preview of
 * each, each card counting what it still needs before a publish.
 * "Publish" opens the checks the page must pass, each with a way to the
 * part that needs work, and what the publish changes; "Publish now" waits
 * until every check passes. A save is refused when someone else changed
 * the page since the form was opened.
 */
export function PageEditor({
  target,
  kind,
  pageName,
  path,
  draft,
  published: publishedAtOpen,
  publishedAt: publishedAtAtOpen,
  version: versionAtOpen,
  goesLive,
  hiddenBecause,
  publishBlocked,
  canUnpublish,
  askBeforeUnpublish,
  places,
  previewUrl,
  publicUrl,
  fallbackTitle,
  entry,
  notice,
  unpublishedNote = "The public does not see this page.",
}: {
  target: PageTarget;
  kind: PageKind;
  /** How a sentence names it: "the main page". */
  pageName: string;
  /** Its address on the customer site: "/langkawi". */
  path: string;
  draft: PageContent;
  /** The copy the public is shown; null while the page is not published. */
  published: PageContent | null;
  publishedAt: Date | null;
  version: string | null;
  /** Where a publish shows at once, the sentence that says so; null where it waits. */
  goesLive: string | null;
  /** Why a published page is not seen yet, a sentence; null when it is. */
  hiddenBecause: string | null;
  /** Why the page cannot be published now, a sentence; null when it can. */
  publishBlocked: string | null;
  canUnpublish: boolean;
  /** Whether unpublishing takes a page the public sees, and so asks first. */
  askBeforeUnpublish: boolean;
  /**
   * On a location's page: the saved addresses a place may point at, and
   * where a new one added from here may lie; null on a site page.
   */
  places: {
    locationId: string;
    addresses: readonly PickableAddress[];
    area: AddressArea;
  } | null;
  /** The saved draft on the customer site, for staff. */
  previewUrl: string;
  /** The page's public address, as search results show it. */
  publicUrl: string;
  /** The title the page shows while no meta title is written. */
  fallbackTitle: string;
  /** On a page added on demand, its slug and its delete. */
  entry?: EntryControls;
  /** A line over the form about what the page is not yet: a class off sale. */
  notice?: ReactNode;
  /** What the public sees while the page is not published. */
  unpublishedNote?: string;
}) {
  const rule = PAGE_KIND_RULES[kind];
  const labels = heroLabelsOf(kind);
  const tagline = rule.tagline ? TAGLINE_FIELD[kind] : undefined;
  const [content, setContent] = useState(() => formContentOf(draft));
  // What the server holds, as of the last save from this form.
  const [saved, setSaved] = useState(draft);
  const [published, setPublished] = useState(publishedAtOpen);
  const [publishedAt, setPublishedAt] = useState(publishedAtAtOpen);
  const [version, setVersion] = useState(versionAtOpen);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const uploads = useUploadCount();
  // An image still uploading is not in the page yet: saving waits for it.
  const busy = pending || uploads.uploading;
  const [publishing, setPublishing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const nextKey = useRef(0);

  // The content in its one shape, as it would be stored: what every count,
  // check and comparison reads.
  const normal = pageContentOf(kind, content);
  const limits = checkPageLimits(normal);
  const checks = pageChecks(kind, normal);
  /** What a card still needs before a publish, beside its name; nothing once it is done. */
  const toDoIn = (card: PageEditorTab) => {
    const missing = checks
      .filter((check) => check.tab === card)
      .reduce((sum, check) => sum + check.missing.length, 0);
    return missing > 0 ? (
      <span className="font-semibold text-warning">
        {missing} to do before publishing
      </span>
    ) : undefined;
  };
  const dirty = !samePageContent(normal, saved);
  const status = pageStatusOf(normal, published);
  const publishedOn = publishedAt ? formatLocalDateTime(publishedAt) : "";
  // What the status means for the public, beside the badge.
  const standingNote =
    status === "unpublished"
      ? unpublishedNote
      : status === "published"
        ? `Published ${publishedOn}.${hiddenBecause ? ` ${hiddenBecause}` : ""}`
        : `The public ${hiddenBecause ? "will see" : "sees"} the copy published ${publishedOn} until you publish again.`;
  const introWords = wordCount(normal.intro);
  const addressNames = new Map(
    (places?.addresses ?? []).map((a) => [a.id, a.name]),
  );
  // What a publish would change for search engines, said before it does.
  const indexingChange =
    published === null || published.indexable === normal.indexable
      ? null
      : normal.indexable
        ? "Once you publish, search engines may list this page again after they next visit it. That can take days or weeks."
        : "Once you publish, search engines are asked to drop this page. It can take days or weeks to leave their results, and as long to come back if you turn this on again; visits from search stop meanwhile.";

  const leaveDialog = useLeaveGuard(
    dirty,
    "The edits since the last save are lost.",
  );
  const [confirmDialog, confirm] = useConfirm();

  function edit(patch: Partial<FormContent>) {
    setContent((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function editFaq(key: string, patch: Partial<PageFaq>) {
    edit({
      faqs: content.faqs.map((faq) =>
        faq.key === key ? { ...faq, ...patch } : faq,
      ),
    });
  }

  const newKey = () => `new-${nextKey.current++}`;

  /** A Markdown file's fields into the page: its title, description and summary where it has them, and its text. */
  function importFile(parsed: MarkdownImport) {
    edit({
      body: parsed.body,
      ...(parsed.title ? { heroHeadline: parsed.title } : {}),
      ...(parsed.summary ? { heroSubheadline: parsed.summary } : {}),
      ...(parsed.description ? { metaDescription: parsed.description } : {}),
      ...(parsed.title &&
      normal.metaTitle === "" &&
      parsed.title.length <= PAGE_LIMITS.metaTitle
        ? { metaTitle: parsed.title }
        : {}),
    });
    toast.success("Imported. Check the fields it filled, then save.");
  }

  /** Shows the part of the page a check is about. */
  function goTo(check: PageCheck) {
    setPublishing(false);
    requestAnimationFrame(() =>
      document
        .getElementById(partId(check.key))
        ?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }),
    );
  }

  function write(publish: boolean) {
    startTransition(async () => {
      const result = await answerOf(
        (publish ? publishPageAction : savePageDraftAction)(
          target,
          version,
          normal,
        ),
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setVersion(result.version);
      setSaved(normal);
      if (publish) {
        setPublished(normal);
        setPublishedAt(new Date(result.version));
        setPublishing(false);
      }
      setError(null);
      toast.success(publish ? "Published." : "Draft saved.");
    });
  }

  async function unpublish() {
    if (
      askBeforeUnpublish &&
      !(await confirm({
        title: `Unpublish ${pageName}?`,
        description:
          "The public no longer sees it. Your text is kept, and you can publish it again.",
        action: "Unpublish",
      }))
    ) {
      return;
    }
    startTransition(async () => {
      const refused = errorOf(await answerOf(unpublishPageAction(target)));
      if (refused) {
        setError(refused);
        return;
      }
      setPublished(null);
      setPublishedAt(null);
      setError(null);
      toast.success("Unpublished. Your text is kept.");
    });
  }

  useSaveShortcut(() => {
    if (dirty && limits.ok && !busy) write(false);
  });

  const message = uploads.uploading ? (
    <span className="text-muted">Uploading the image…</span>
  ) : pending ? (
    <span className="text-muted">Saving…</span>
  ) : error ? (
    <span className="font-medium text-danger">{error}</span>
  ) : !limits.ok ? (
    <span className="font-medium text-danger">{limits.error}</span>
  ) : (
    <span className="text-muted">{standingNote}</span>
  );

  // The quiet moves after the address.
  const moves: ReactNode[] = [];
  if (status === "changed" && published) {
    moves.push(
      <BarLink key="compare" onClick={() => setComparing(true)}>
        Compare with published
      </BarLink>,
    );
  }
  if (isPagePublished(status) && canUnpublish) {
    moves.push(
      <BarLink key="unpublish" danger disabled={pending} onClick={unpublish}>
        Unpublish
      </BarLink>,
    );
  }
  if (entry) {
    moves.push(
      <BarLink
        key="delete"
        danger
        disabled={pending}
        onClick={async () => setError(await entry.onDelete())}
      >
        Delete
      </BarLink>,
    );
  }

  return (
    <UploadsContext value={uploads.track}>
      <PublishBar
        status={status}
        dirty={dirty}
        previewUrl={previewUrl}
        canSave={!busy && dirty && limits.ok}
        onSave={() => write(false)}
        canPublish={!busy && status !== "published" && publishBlocked === null}
        publishHint={
          publishBlocked ??
          (status === "published"
            ? "The public sees this draft already."
            : null)
        }
        onPublish={() => setPublishing(true)}
        path={path}
        message={message}
        moves={moves}
      />

      <div className="mt-3 grid gap-5">
        {notice}

        <Card>
          <CardTitle meta={toDoIn("content")}>Page content</CardTitle>
          <div className="grid gap-5">
            <Part
              id={partId("hero")}
              title={
                kind === "article" || kind === "document" ? "Title" : "Hero"
              }
              hint={
                kind === "place"
                  ? "The top of the page. Its name, short description and image are also its card, wherever the site lists it."
                  : kind === "article"
                    ? "The top of the post. Its title, summary and cover are also its card on the blog."
                    : kind === "document"
                      ? "The top of the page. The image is optional."
                      : kind === "connect"
                        ? "The top of the page. Without an image it shows Connect's offer card in a phone. The buttons to register and sign in are fixed."
                        : "The top of the page. Its image is also what a shared link shows, unless a share image is set under SEO."
              }
            >
              <div className="grid gap-4">
                {tagline ? (
                  <Field
                    label={
                      <Counted
                        label={tagline.label}
                        value={normal.tagline}
                        limit={PAGE_LIMITS.tagline}
                      />
                    }
                  >
                    <Input
                      autoComplete="off"
                      placeholder={tagline.placeholder}
                      value={content.tagline}
                      onChange={(event) =>
                        edit({ tagline: event.target.value })
                      }
                    />
                    <p className="mt-1 text-xs text-muted">{tagline.hint}</p>
                  </Field>
                ) : null}
                <Field
                  label={
                    <Counted
                      label={labels.headline}
                      value={normal.heroHeadline}
                      limit={PAGE_LIMITS.heroHeadline}
                    />
                  }
                >
                  <Input
                    autoComplete="off"
                    value={content.heroHeadline}
                    onChange={(event) =>
                      edit({ heroHeadline: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label={
                    <Counted
                      label={labels.subheadline}
                      value={normal.heroSubheadline}
                      limit={PAGE_LIMITS.heroSubheadline}
                    />
                  }
                >
                  <Textarea
                    rows={2}
                    value={content.heroSubheadline}
                    onChange={(event) =>
                      edit({ heroSubheadline: event.target.value })
                    }
                  />
                </Field>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-body">
                    {kind === "article" ? "Cover image" : "Image"}
                    {rule.heroImage === "optional" ? (
                      <span className="font-normal text-muted">
                        {" "}
                        · optional
                      </span>
                    ) : null}
                  </p>
                  <ImageField
                    label={kind === "article" ? "Cover image" : "Hero image"}
                    image={content.heroImage}
                    onChange={(heroImage) => edit({ heroImage })}
                  />
                </div>
              </div>
            </Part>

            {rule.address && places ? (
              <Part
                title="Saved address"
                hint="Optional. With an address, the page and its card show “Take me here”, which fills the drop-off with it. Not saved yet? Add it with the plus: it is saved at once, to the location's saved addresses."
              >
                <SavedAddressPicker
                  locationId={places.locationId}
                  addresses={places.addresses}
                  area={places.area}
                  value={
                    normal.addressId !== null &&
                    addressNames.has(normal.addressId)
                      ? normal.addressId
                      : null
                  }
                  onChange={(addressId) => edit({ addressId })}
                />
              </Part>
            ) : null}

            {rule.intro !== "none" ? (
              <Part
                id={partId("intro")}
                title="Intro"
                hint={
                  kind === "connect"
                    ? "Who Connect is for, under “A fleet of forty, or one good car”. Plain paragraphs. Start a new line for a new paragraph."
                    : `Plain paragraphs. Start a new line for a new paragraph.${rule.intro === "optional" ? " Optional." : ""}`
                }
              >
                <Field
                  label={
                    <span className="flex items-baseline justify-between gap-3">
                      <span>
                        Text{" "}
                        <span className="text-xs font-normal text-muted tabular-nums">
                          · {introWords} {introWords === 1 ? "word" : "words"}
                          {rule.intro === "required"
                            ? `, at least ${PAGE_LIMITS.introWords}`
                            : ""}
                        </span>
                      </span>
                      <Count
                        value={normal.intro.length}
                        limit={PAGE_LIMITS.intro}
                      />
                    </span>
                  }
                >
                  <Textarea
                    rows={10}
                    value={content.intro}
                    onChange={(event) => edit({ intro: event.target.value })}
                  />
                </Field>
              </Part>
            ) : null}

            {rule.body ? (
              <Part
                id={partId("body")}
                title="Text"
                hint={
                  kind === "connect"
                    ? "Written in Markdown. Each ## heading starts a card, side by side on a computer: “Have these at hand”, “From us”, “From you”. A list under it reads as the card's points."
                    : "Written in Markdown, with a live preview. ## is a section heading and ### a smaller one; the title above is the page's only top heading. Import a .md file to fill the title, the summary and the meta description too. Every image is uploaded here, with its alt text."
                }
              >
                <MarkdownField
                  value={content.body}
                  onChange={(body) => edit({ body })}
                  limit={PAGE_LIMITS.body}
                  onImport={importFile}
                />
              </Part>
            ) : null}

            <Part
              id={partId("faqs")}
              title="FAQs"
              hint={
                rule.faqs === "required"
                  ? `At least ${PAGE_LIMITS.minFaqs}, at most ${PAGE_LIMITS.maxFaqs}. Shown in this order.`
                  : `Optional, at most ${PAGE_LIMITS.maxFaqs}. Shown in this order.`
              }
            >
              <div className="grid gap-4">
                {content.faqs.length === 0 ? (
                  <p className="text-sm text-muted">No FAQs yet.</p>
                ) : (
                  <ol className="divide-y divide-hairline">
                    {content.faqs.map((faq, index) => (
                      <li key={faq.key} className="grid gap-3 py-4 first:pt-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">
                            FAQ {index + 1}
                          </span>
                          <RowControls
                            name={`FAQ ${index + 1}`}
                            isFirst={index === 0}
                            isLast={index === content.faqs.length - 1}
                            onMove={(by) =>
                              edit({ faqs: movedRow(content.faqs, index, by) })
                            }
                            onRemove={() =>
                              edit({
                                faqs: content.faqs.filter(
                                  (other) => other.key !== faq.key,
                                ),
                              })
                            }
                          />
                        </div>
                        <Field
                          label={
                            <Counted
                              label="Question"
                              value={normal.faqs[index]?.question ?? ""}
                              limit={PAGE_LIMITS.faqQuestion}
                            />
                          }
                        >
                          <Input
                            autoComplete="off"
                            value={faq.question}
                            onChange={(event) =>
                              editFaq(faq.key, { question: event.target.value })
                            }
                          />
                        </Field>
                        <Field
                          label={
                            <Counted
                              label="Answer"
                              value={normal.faqs[index]?.answer ?? ""}
                              limit={PAGE_LIMITS.faqAnswer}
                            />
                          }
                        >
                          <Textarea
                            rows={3}
                            value={faq.answer}
                            onChange={(event) =>
                              editFaq(faq.key, { answer: event.target.value })
                            }
                          />
                        </Field>
                      </li>
                    ))}
                  </ol>
                )}
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={content.faqs.length >= PAGE_LIMITS.maxFaqs}
                    onClick={() =>
                      edit({
                        faqs: [
                          ...content.faqs,
                          { key: newKey(), question: "", answer: "" },
                        ],
                      })
                    }
                  >
                    Add FAQ
                  </Button>
                </div>
              </div>
            </Part>
          </div>
        </Card>

        <Card>
          <CardTitle meta={toDoIn("search")}>SEO</CardTitle>
          <div className="grid gap-5">
            <Part
              id={partId("search")}
              title="In a search result"
              hint="What a search result shows. Not on the page itself."
            >
              <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <div className="grid gap-4">
                  <Field
                    label={
                      <Counted
                        label="Meta title"
                        value={normal.metaTitle}
                        limit={PAGE_LIMITS.metaTitle}
                      />
                    }
                  >
                    <Input
                      autoComplete="off"
                      value={content.metaTitle}
                      onChange={(event) =>
                        edit({ metaTitle: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label={
                      <Counted
                        label="Meta description"
                        value={normal.metaDescription}
                        limit={PAGE_LIMITS.metaDescription}
                      />
                    }
                  >
                    <Textarea
                      rows={4}
                      value={content.metaDescription}
                      onChange={(event) =>
                        edit({ metaDescription: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <SearchResultPreview
                  url={publicUrl}
                  title={normal.metaTitle}
                  description={normal.metaDescription}
                  fallbackTitle={fallbackTitle}
                />
              </div>
            </Part>

            <Part
              title="When it is shared"
              hint="What WhatsApp, Facebook and others show when someone shares the page: the meta title and description, with this image."
            >
              <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-body">
                    Share image
                  </p>
                  <ImageField
                    label="Share image"
                    image={content.shareImage}
                    onChange={(shareImage) => edit({ shareImage })}
                  />
                  <p className="mt-1.5 text-xs text-muted">
                    Optional. Without one, a shared link shows the hero image.
                    Best at 1200 by 630 pixels, with what matters in the middle.
                  </p>
                </div>
                <SharedLinkPreview
                  url={publicUrl}
                  title={normal.metaTitle}
                  description={normal.metaDescription}
                  image={normal.shareImage ?? normal.heroImage}
                />
              </div>
            </Part>

            <Part
              title="Search engines"
              hint="Whether Google and other search engines may list this page in their results."
            >
              <div className="flex items-start gap-3">
                <Switch
                  checked={normal.indexable}
                  onCheckedChange={(indexable) => edit({ indexable })}
                  label="Show this page in search engines"
                />
                <div className="text-sm">
                  <p className="font-semibold text-ink">
                    {normal.indexable
                      ? "On: shown in search engines"
                      : "Off: hidden from search engines"}
                  </p>
                  <p className="mt-1 text-muted">
                    {normal.indexable
                      ? "Search engines may list it once they visit it; when is up to them, and a place in their results is never promised. Turn this off for a page meant only for people who have its link."
                      : "The page asks search engines not to list it, so no one finds it through a search and it brings no visits from there. Anyone with its link can still open it, and a shared link still shows its title and image."}
                  </p>
                </div>
              </div>
              {indexingChange ? (
                <Notice className="mt-3">{indexingChange}</Notice>
              ) : null}
            </Part>

            {entry ? (
              <Part
                title={entry.type ? "Type and slug" : "Slug"}
                hint={
                  entry.slugLocked
                    ? `Locked since the page was first published: a new ${entry.type ? "type or slug" : "slug"} needs a redirect from the old address, which comes with the move to heavenlytravel.my.`
                    : `The end of its address on the site${entry.type ? ", after its type" : ""}. It can change until the page is first published; then it is locked.`
                }
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {entry.type ? (
                    <span className="font-medium text-body">{entry.type}</span>
                  ) : null}
                  <code className="rounded-md bg-shade px-2 py-1 text-body">
                    {path}
                  </code>
                  {entry.slugLocked ? null : (
                    <Tooltip content={dirty ? "Save your edits first." : null}>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy || dirty}
                        onClick={entry.onRename}
                      >
                        {entry.type ? "Change type or slug" : "Change slug"}
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </Part>
            ) : null}

            <Part title="Set for you">
              <Notice className="mb-3">
                Until the site moves to heavenlytravel.my, search engines are
                asked not to list any of its pages. These fields count from
                then; shared links use them already.
              </Notice>
              <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted">
                <li>
                  The page&apos;s address and its canonical link, so search
                  engines list one address for it.
                </li>
                <li>
                  Its breadcrumbs and its FAQs in the structured form search
                  engines read, so the FAQs can show in results
                  {kind === "article"
                    ? "; and the post's dates and cover, as an article"
                    : ""}
                  .
                </li>
                <li>
                  A preview, a draft and an unpublished page are never listed.
                  Keywords are left out: search engines no longer read them.
                </li>
              </ul>
            </Part>
          </div>
        </Card>

        <PublishDialog
          open={publishing}
          onOpenChange={setPublishing}
          pageName={pageName}
          goesLive={goesLive}
          checks={checks}
          limitsError={limits.ok ? null : limits.error}
          changes={published ? changedPageParts(published, normal) : null}
          pending={pending}
          onPublish={() => write(true)}
          onGoTo={goTo}
        />
        {published ? (
          <CompareDialog
            open={comparing}
            onOpenChange={setComparing}
            kind={kind}
            published={published}
            draft={normal}
            addressNames={addressNames}
          />
        ) : null}
        {confirmDialog}
        {leaveDialog}
      </div>
    </UploadsContext>
  );
}
