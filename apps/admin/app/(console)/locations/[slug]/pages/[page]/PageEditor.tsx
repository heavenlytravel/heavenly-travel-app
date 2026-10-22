"use client";

import {
  LANDING_PAGE,
  PAGE_LIMITS,
  changedPageParts,
  checkPageLimits,
  checkPageUnpublish,
  formatLocalDateTime,
  isPagePublished,
  isPublicState,
  pageChecks,
  pageContentOf,
  pageNameOf,
  pageStatusOf,
  samePageContent,
  wordCount,
  type LocationPageKey,
  type LocationState,
  type PageCheck,
  type PageContent,
  type PageEditorTab,
  type PageFaq,
  type PageHighlight,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Tooltip } from "@repo/ui/tooltip";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Field, Input, Textarea } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import { InfoTip } from "@repo/ui/info-tip";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Card, CardTitle } from "../../../../../_components/Card";
import { PageStatusBadge } from "../../../../../_components/StatusBadges";
import { locationAddressesHref } from "../../../../../_lib/routes";
import { useLeaveGuard } from "../../../../../_lib/use-leave-guard";
import { PreviewLink } from "../../../_components/PreviewLink";
import { RowControls, movedRow } from "../../../_components/RowControls";
import {
  publishPageAction,
  savePageDraftAction,
  unpublishPageAction,
} from "../../../actions";
import { Count } from "./Count";
import { ImageField } from "./ImageField";
import {
  CompareDialog,
  HistoryDialog,
  type PagePublishEntry,
} from "./PageHistory";
import { PublishDialog } from "./PublishDialog";
import { SearchResultPreview, SharedLinkPreview } from "./SearchPreviews";
import { errorOf } from "../../../../../_lib/action-state";
import {
  UploadsContext,
  useUploadCount,
} from "../../../../../_components/use-image-upload";

/** A row of a list in the form, with a key that stays while the form is open. */
type Keyed<T> = T & { key: string };

/** The content as the form holds it: as typed, its rows keyed. */
type FormContent = Omit<PageContent, "faqs" | "highlights"> & {
  faqs: Keyed<PageFaq>[];
  highlights: Keyed<PageHighlight>[];
};

const formContentOf = (content: PageContent): FormContent => ({
  ...content,
  faqs: content.faqs.map((faq, i) => ({ ...faq, key: `faq-${i}` })),
  highlights: content.highlights.map((highlight, i) => ({
    ...highlight,
    key: `highlight-${i}`,
  })),
});

/** A label with how much of its limit the text has used. */
function Counted({
  label,
  value,
  limit,
}: {
  label: string;
  value: string;
  limit: number;
}) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      {label}
      <Count value={value.length} limit={limit} />
    </span>
  );
}

const TABS: { key: PageEditorTab; label: string }[] = [
  { key: "content", label: "Page content" },
  { key: "search", label: "Search and sharing" },
];

/** The id of the part of the editor a check is about, which "Go to it" scrolls to. */
const partId = (key: PageCheck["key"]) => `page-${key}`;

/** Where a part lands when "Go to it" scrolls to it: clear of the console header and the publish bar. */
const PART_SCROLL = "scroll-mt-44";

/** A list of rows in a part, the FAQs or the highlights: hairlines between them, no frames. */
const ROWS = "divide-y divide-slate-100";

/** A quiet button in the publish bar's second line. */
function BarLink({
  onClick,
  danger = false,
  disabled,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline disabled:opacity-50",
        danger ? "text-red-700" : "text-slate-900",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The editor of one page of a location. On top, the publish bar, held in
 * view while the form scrolls. Its first line is the page's name and
 * where it stands, level with "Preview" of the saved draft, "Save draft"
 * (also Ctrl+S) and "Publish". Its second line is the page's address and
 * what its standing means for the public, then the quiet moves: "Compare"
 * while the draft differs from what the public sees, "History" once it
 * has been published, and "Unpublish" where allowed. Under it, the page in
 * two tabs: its content, and what search engines and shared links show.
 * "Publish" opens the checks the page must pass, each with a way to the
 * part that needs work, and what the publish changes; "Publish now" waits
 * until every check passes. "Unpublish" asks first, takes the page from
 * the public and keeps its text. A save is refused when someone else
 * changed the page since the form was opened.
 */
export function PageEditor({
  title,
  path,
  locationId,
  locationSlug,
  locationName,
  locationState,
  page,
  draft,
  published: publishedAtOpen,
  publishedAt: publishedAtAtOpen,
  version: versionAtOpen,
  addresses,
  previewUrl,
  publicUrl,
  publishes,
  historyHref,
}: {
  /** The page's name: "Main page", "Car with driver". */
  title: string;
  /** Its address on the customer site: "/langkawi". */
  path: string;
  locationId: string;
  /** The location's slug, its address, for the links to its other tabs. */
  locationSlug: string;
  locationName: string;
  locationState: LocationState;
  page: LocationPageKey;
  draft: PageContent;
  /** The copy the public is shown; null while the page is not published. */
  published: PageContent | null;
  publishedAt: Date | null;
  version: string | null;
  /** The location's saved addresses, which a highlight may point at. */
  addresses: { id: string; name: string }[];
  /** The saved draft on the customer site, for staff. */
  previewUrl: string;
  /** The page's public address, as search results show it. */
  publicUrl: string;
  /** The page's publishes, newest first. */
  publishes: PagePublishEntry[];
  /** The location's history, narrowed to its pages. */
  historyHref: string;
}) {
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
  const [tab, setTab] = useState<PageEditorTab>("content");
  const [publishing, setPublishing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [readingHistory, setReadingHistory] = useState(false);
  const nextKey = useRef(0);

  const isLanding = page === LANDING_PAGE;
  // The content in its one shape, as it would be stored: what every count,
  // check and comparison reads.
  const normal = pageContentOf(page, content);
  const limits = checkPageLimits(normal);
  const checks = pageChecks(page, normal);
  const missingIn = (which: PageEditorTab) =>
    checks
      .filter((check) => check.tab === which)
      .reduce((sum, check) => sum + check.missing.length, 0);
  const dirty = !samePageContent(normal, saved);
  const status = pageStatusOf(normal, published);
  const isPublic = isPublicState(locationState);
  const canUnpublish = checkPageUnpublish(locationState, page);
  const publishedOn = publishedAt ? formatLocalDateTime(publishedAt) : "";
  // What the status means for the public, under the badge.
  const standingNote =
    status === "unpublished"
      ? "The public does not see this page."
      : status === "published"
        ? `Published ${publishedOn}.${isPublic ? "" : " The public sees it once the location is live."}`
        : `The public ${isPublic ? "sees" : "will see"} the copy published ${publishedOn} until you publish again.`;
  const words = wordCount(normal.intro);
  const addressNames = new Map(addresses.map((a) => [a.id, a.name]));

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

  function editHighlight(key: string, patch: Partial<PageHighlight>) {
    edit({
      highlights: content.highlights.map((highlight) =>
        highlight.key === key ? { ...highlight, ...patch } : highlight,
      ),
    });
  }

  const newKey = () => `new-${nextKey.current++}`;

  /** Shows the part of the page a check is about: its tab, then the part itself. */
  function goTo(check: PageCheck) {
    setPublishing(false);
    setTab(check.tab);
    requestAnimationFrame(() =>
      document
        .getElementById(partId(check.key))
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function write(publish: boolean) {
    startTransition(async () => {
      const result = await answerOf(
        (publish ? publishPageAction : savePageDraftAction)(
          locationId,
          page,
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
      isPublic &&
      !(await confirm({
        title: `Unpublish ${pageNameOf(page)}?`,
        description:
          "Visitors to it are sent to the location's main page. Your text is kept, and you can publish it again.",
        action: "Unpublish",
      }))
    ) {
      return;
    }
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(unpublishPageAction(locationId, page)),
      );
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

  // Ctrl+S or Cmd+S saves the draft, as an editor would.
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    saveRef.current = () => {
      if (dirty && limits.ok && !busy) write(false);
    };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const message = uploads.uploading ? (
    <span className="text-slate-500">Uploading the image…</span>
  ) : pending ? (
    <span className="text-slate-500">Saving…</span>
  ) : error ? (
    <span className="text-red-700">{error}</span>
  ) : !limits.ok ? (
    <span className="text-red-700">{limits.error}</span>
  ) : (
    <span className="text-slate-600">{standingNote}</span>
  );

  // The quiet moves after the note; the main page of a public location
  // stays published, so it has no "Unpublish" to press in vain.
  const moves: ReactNode[] = [];
  if (status === "changed" && published) {
    moves.push(
      <BarLink key="compare" onClick={() => setComparing(true)}>
        Compare with published
      </BarLink>,
    );
  }
  if (publishes.length > 0) {
    moves.push(
      <BarLink key="history" onClick={() => setReadingHistory(true)}>
        History
      </BarLink>,
    );
  }
  if (isPagePublished(status) && canUnpublish.ok) {
    moves.push(
      <BarLink key="unpublish" danger disabled={pending} onClick={unpublish}>
        Unpublish
      </BarLink>,
    );
  }

  return (
    <UploadsContext value={uploads.track}>
      <div className="grid gap-6">
        {/* Runs to the column's edges, so the form scrolls out of sight under it. */}
        <div className="sticky top-14 z-[5] -mx-5 border-b border-slate-200 bg-slate-50/95 px-5 pt-2 pb-4 backdrop-blur-sm md:-mx-10 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <PageStatusBadge status={status} />
              {dirty ? (
                <span className="text-xs font-medium text-amber-700">
                  Unsaved edits
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PreviewLink
                size="sm"
                href={previewUrl}
                hint={
                  dirty
                    ? "Shows the saved draft: save first to see your latest edits."
                    : undefined
                }
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || !dirty || !limits.ok}
                onClick={() => write(false)}
              >
                Save draft
              </Button>
              <Tooltip
                content={
                  status === "published"
                    ? "The public sees this draft already."
                    : null
                }
              >
                <Button
                  size="sm"
                  disabled={busy || status === "published"}
                  onClick={() => setPublishing(true)}
                >
                  Publish
                </Button>
              </Tooltip>
            </div>
          </div>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="text-slate-500">{path}</span>
            <span aria-live="polite">{message}</span>
            {moves.length > 0 ? (
              <span className="flex flex-wrap gap-x-3">{moves}</span>
            ) : null}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Parts of the page"
          className="flex gap-1 border-b border-slate-200"
        >
          {TABS.map((entry) => {
            const selected = tab === entry.key;
            const missing = missingIn(entry.key);
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                id={`tab-${entry.key}`}
                aria-selected={selected}
                aria-controls={`panel-${entry.key}`}
                onClick={() => setTab(entry.key)}
                className={cx(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-brand text-brand"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                {entry.label}
                {missing > 0 ? (
                  <Tooltip content={`${missing} to do before publishing`}>
                    <span className="rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-800 tabular-nums">
                      {missing}
                    </span>
                  </Tooltip>
                ) : null}
              </button>
            );
          })}
        </div>

        {tab === "content" ? (
          <div
            role="tabpanel"
            id="panel-content"
            aria-labelledby="tab-content"
            className="grid gap-6"
          >
            <Card id={partId("hero")} className={PART_SCROLL}>
              <CardTitle description="The top of the page. Its image is also what a shared link shows, unless a share image is set under Search and sharing.">
                Hero
              </CardTitle>
              <div className="grid gap-4">
                {page === LANDING_PAGE ? (
                  <Field
                    label={
                      <Counted
                        label="Tagline"
                        value={normal.tagline}
                        limit={PAGE_LIMITS.tagline}
                      />
                    }
                  >
                    <Input
                      autoComplete="off"
                      placeholder="Island escape"
                      value={content.tagline}
                      onChange={(event) =>
                        edit({ tagline: event.target.value })
                      }
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      The short line over the headline, and under the name on a
                      home page card. Optional.
                    </p>
                  </Field>
                ) : null}
                <Field
                  label={
                    <Counted
                      label="Headline"
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
                      label="Subheadline"
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
                  <p className="mb-1.5 text-sm font-medium text-slate-800">
                    Image
                  </p>
                  <ImageField
                    label="Hero image"
                    image={content.heroImage}
                    onChange={(heroImage) => edit({ heroImage })}
                  />
                </div>
              </div>
            </Card>
            <Card id={partId("intro")} className={PART_SCROLL}>
              <CardTitle description="Plain paragraphs. Start a new line for a new paragraph.">
                Intro
              </CardTitle>
              <Field
                label={
                  <span className="flex items-baseline justify-between gap-3">
                    <span>
                      Text{" "}
                      <span className="text-xs font-normal text-slate-500 tabular-nums">
                        · {words} {words === 1 ? "word" : "words"}, at least{" "}
                        {PAGE_LIMITS.introWords}
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
            </Card>
            <Card id={partId("faqs")} className={PART_SCROLL}>
              <CardTitle
                description={`At least ${PAGE_LIMITS.minFaqs}, at most ${PAGE_LIMITS.maxFaqs}. Shown in this order.`}
              >
                FAQs
              </CardTitle>
              <div className="grid gap-4">
                {content.faqs.length === 0 ? (
                  <p className="text-sm text-slate-500">No FAQs yet.</p>
                ) : (
                  <ol className={ROWS}>
                    {content.faqs.map((faq, index) => (
                      <li key={faq.key} className="grid gap-3 py-4 first:pt-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">
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
            </Card>
            {isLanding ? (
              <Card id={partId("highlights")} className={PART_SCROLL}>
                <CardTitle
                  description={`What to see and do here. At least ${PAGE_LIMITS.minHighlights}, at most ${PAGE_LIMITS.maxHighlights}. Shown in this order.`}
                >
                  Highlights
                </CardTitle>
                <div className="grid gap-4">
                  {content.highlights.length === 0 ? (
                    <p className="text-sm text-slate-500">No highlights yet.</p>
                  ) : (
                    <ol className={ROWS}>
                      {content.highlights.map((highlight, index) => (
                        <li
                          key={highlight.key}
                          className="grid gap-3 py-4 first:pt-0"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              Highlight {index + 1}
                            </span>
                            <RowControls
                              name={`highlight ${index + 1}`}
                              isFirst={index === 0}
                              isLast={index === content.highlights.length - 1}
                              onMove={(by) =>
                                edit({
                                  highlights: movedRow(
                                    content.highlights,
                                    index,
                                    by,
                                  ),
                                })
                              }
                              onRemove={() =>
                                edit({
                                  highlights: content.highlights.filter(
                                    (other) => other.key !== highlight.key,
                                  ),
                                })
                              }
                            />
                          </div>
                          <Field
                            label={
                              <Counted
                                label="Name"
                                value={normal.highlights[index]?.name ?? ""}
                                limit={PAGE_LIMITS.highlightName}
                              />
                            }
                          >
                            <Input
                              autoComplete="off"
                              value={highlight.name}
                              onChange={(event) =>
                                editHighlight(highlight.key, {
                                  name: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field
                            label={
                              <Counted
                                label="Text"
                                value={normal.highlights[index]?.text ?? ""}
                                limit={PAGE_LIMITS.highlightText}
                              />
                            }
                          >
                            <Textarea
                              rows={3}
                              value={highlight.text}
                              onChange={(event) =>
                                editHighlight(highlight.key, {
                                  text: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <div>
                            <p className="mb-1.5 text-sm font-medium text-slate-800">
                              Image
                            </p>
                            <ImageField
                              label={`Image of highlight ${index + 1}`}
                              image={highlight.image}
                              onChange={(image) =>
                                editHighlight(highlight.key, { image })
                              }
                            />
                          </div>
                          <Field
                            label={
                              <span className="inline-flex items-center gap-1.5">
                                Saved address
                                <InfoTip text="Optional. With an address, the highlight shows “Take me here”, which fills the drop-off with it. Addresses are kept on the Pages tab, under the pages." />
                              </span>
                            }
                            hint={
                              addresses.length === 0 ? (
                                <Link
                                  href={locationAddressesHref(locationSlug)}
                                  className="underline underline-offset-4 hover:text-slate-900"
                                >
                                  Add saved addresses on the location first
                                </Link>
                              ) : undefined
                            }
                          >
                            <Select
                              value={
                                addresses.some(
                                  (address) =>
                                    address.id === highlight.addressId,
                                )
                                  ? (highlight.addressId ?? "")
                                  : ""
                              }
                              disabled={addresses.length === 0}
                              onValueChange={(next) =>
                                editHighlight(highlight.key, {
                                  addressId: next || null,
                                })
                              }
                              options={[
                                { value: "", label: "No address" },
                                ...addresses.map((address) => ({
                                  value: address.id,
                                  label: address.name,
                                })),
                              ]}
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
                      disabled={
                        content.highlights.length >= PAGE_LIMITS.maxHighlights
                      }
                      onClick={() =>
                        edit({
                          highlights: [
                            ...content.highlights,
                            {
                              key: newKey(),
                              name: "",
                              text: "",
                              image: null,
                              addressId: null,
                            },
                          ],
                        })
                      }
                    >
                      Add highlight
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        ) : (
          <div
            role="tabpanel"
            id="panel-search"
            aria-labelledby="tab-search"
            className="grid gap-6"
          >
            <Card id={partId("search")} className={PART_SCROLL}>
              <CardTitle description="What a search result shows. Not on the page itself.">
                Search results
              </CardTitle>
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
                  fallbackTitle={`${locationName} | Heavenly Travel`}
                />
              </div>
            </Card>

            <Card>
              <CardTitle description="What WhatsApp, Facebook and others show when someone shares the page: the meta title and description, with this image.">
                Shared links
              </CardTitle>
              <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-800">
                    Share image
                  </p>
                  <ImageField
                    label="Share image"
                    image={content.shareImage}
                    onChange={(shareImage) => edit({ shareImage })}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
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
            </Card>

            <Card>
              <CardTitle>Set for you</CardTitle>
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Until the site moves to heavenlytravel.my, search engines are
                asked not to list any of its pages. These fields count from
                then; shared links use them already.
              </p>
              <ul className="grid gap-1.5 text-sm text-slate-600">
                <li>
                  The page&apos;s address and its canonical link, so search
                  engines list one address for it.
                </li>
                <li>
                  Its breadcrumbs and its FAQs in the structured form search
                  engines read, so the FAQs can show in results.
                </li>
                <li>
                  A preview, a draft and an unpublished page are never listed.
                  Keywords are left out: search engines no longer read them.
                </li>
              </ul>
            </Card>
          </div>
        )}

        <PublishDialog
          open={publishing}
          onOpenChange={setPublishing}
          pageName={pageNameOf(page)}
          locationName={locationName}
          isPublic={isPublic}
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
            page={page}
            published={published}
            draft={normal}
            addressNames={addressNames}
          />
        ) : null}
        <HistoryDialog
          open={readingHistory}
          onOpenChange={setReadingHistory}
          publishes={publishes}
          allHref={historyHref}
        />
        {confirmDialog}
        {leaveDialog}
      </div>
    </UploadsContext>
  );
}
