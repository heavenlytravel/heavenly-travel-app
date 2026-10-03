"use client";

import {
  LANDING_PAGE,
  PAGE_LIMITS,
  checkPageLimits,
  checkPageUnpublish,
  formatLocalDateTime,
  isPagePublished,
  isPublicState,
  missingFields,
  pageContentOf,
  pageNameOf,
  pageStatusOf,
  samePageContent,
  wordCount,
  type LocationPageKey,
  type LocationState,
  type PageContent,
  type PageFaq,
  type PageHighlight,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input, Select, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { Card, CardTitle } from "../../../../../_components/Card";
import { PageStatusBadge } from "../../../../../_components/StatusBadges";
import {
  locationAddressesHref,
  locationHref,
} from "../../../../../_lib/routes";
import { RowControls, movedRow } from "../../../_components/RowControls";
import {
  publishPageAction,
  savePageDraftAction,
  unpublishPageAction,
} from "../../../actions";
import { Count } from "./Count";
import { ImageField } from "./ImageField";

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

/**
 * The editor of one page of a location: the fields in their fixed order,
 * each with its limit counted as it is typed, and what the page still needs
 * before it can be published. "Save draft" changes nothing in public;
 * "Publish" saves and makes the content what the public sees, once the
 * location is live; "Unpublish" takes the page from the public and keeps
 * its text. On a location that is public, both ask first. A save is refused
 * when someone else changed the page since the form was opened.
 */
export function PageEditor({
  locationId,
  locationState,
  page,
  draft,
  published: publishedAtOpen,
  publishedAt: publishedAtAtOpen,
  version: versionAtOpen,
  addresses,
}: {
  locationId: string;
  locationState: LocationState;
  page: LocationPageKey;
  draft: PageContent;
  /** The copy the public is shown; null while the page is not published. */
  published: PageContent | null;
  publishedAt: Date | null;
  version: string | null;
  /** The location's saved addresses, which a highlight may point at. */
  addresses: { id: string; name: string }[];
}) {
  const [content, setContent] = useState(() => formContentOf(draft));
  // What the server holds, as of the last save from this form.
  const [saved, setSaved] = useState(draft);
  const [published, setPublished] = useState(publishedAtOpen);
  const [publishedAt, setPublishedAt] = useState(publishedAtAtOpen);
  const [version, setVersion] = useState(versionAtOpen);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextKey = useRef(0);

  const isLanding = page === LANDING_PAGE;
  // The content in its one shape, as it would be stored: what every count,
  // check and comparison reads.
  const normal = pageContentOf(page, content);
  const limits = checkPageLimits(normal);
  const missing = missingFields(page, normal);
  const dirty = !samePageContent(normal, saved);
  const status = pageStatusOf(normal, published);
  const isPublic = isPublicState(locationState);
  const canUnpublish = checkPageUnpublish(locationState, page);
  // What the status means for the public, under the badge.
  const publishedOn = publishedAt ? formatLocalDateTime(publishedAt) : "";
  const standingNote =
    status === "unpublished"
      ? "Not published: the public does not see this page."
      : status === "published"
        ? `Published ${publishedOn}.${isPublic ? "" : " The public sees it once the location is live."}`
        : isPublic
          ? `The public still sees the copy published ${publishedOn}. Publish to replace it.`
          : `The copy published ${publishedOn} is older than this draft. Publish to replace it.`;
  const words = wordCount(normal.intro);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function edit(patch: Partial<FormContent>) {
    setContent((current) => ({ ...current, ...patch }));
    setError(null);
    setNotice(null);
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

  /** Asks before a link leaves the form with edits that are not saved. */
  function confirmLeave(event: MouseEvent) {
    if (dirty && !confirm("Leave the page? Your unsaved edits will be lost.")) {
      event.preventDefault();
    }
  }

  function write(publish: boolean) {
    if (publish && isPublic && !confirm("Publish? This goes public at once.")) {
      return;
    }
    startTransition(async () => {
      const result = await (publish ? publishPageAction : savePageDraftAction)(
        locationId,
        page,
        version,
        normal,
      );
      if (!result.ok) {
        setError(result.error);
        setNotice(null);
        return;
      }
      setVersion(result.version);
      setSaved(normal);
      if (publish) {
        setPublished(normal);
        setPublishedAt(new Date(result.version));
      }
      setError(null);
      setNotice(publish ? "Published." : "Draft saved.");
    });
  }

  function unpublish() {
    if (
      isPublic &&
      !confirm(
        `Unpublish ${pageNameOf(page)}? Visitors to it are sent to the location's landing page.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await unpublishPageAction(locationId, page);
      if (result) {
        setError(result.error);
        setNotice(null);
        return;
      }
      setPublished(null);
      setPublishedAt(null);
      setError(null);
      setNotice("Unpublished. Your text is kept.");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="grid gap-6">
        <Card>
          <CardTitle description="What a search engine and a shared link show. Not on the page itself.">
            Search engines
          </CardTitle>
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
                onChange={(event) => edit({ metaTitle: event.target.value })}
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
                rows={3}
                value={content.metaDescription}
                onChange={(event) =>
                  edit({ metaDescription: event.target.value })
                }
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle description="The top of the page. The image is also what a shared link shows.">
            Hero
          </CardTitle>
          <div className="grid gap-4">
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
                onChange={(event) => edit({ heroHeadline: event.target.value })}
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
              <p className="mb-1.5 text-sm font-medium text-neutral-800">
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

        <Card>
          <CardTitle description="Plain paragraphs. Start a new line for a new paragraph.">
            Intro
          </CardTitle>
          <Field
            label={
              <span className="flex items-baseline justify-between gap-3">
                <span>
                  Text{" "}
                  <span className="text-xs font-normal text-neutral-500 tabular-nums">
                    · {words} {words === 1 ? "word" : "words"}, at least{" "}
                    {PAGE_LIMITS.introWords}
                  </span>
                </span>
                <Count value={normal.intro.length} limit={PAGE_LIMITS.intro} />
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

        <Card>
          <CardTitle
            description={`At least ${PAGE_LIMITS.minFaqs}, at most ${PAGE_LIMITS.maxFaqs}. Shown in this order.`}
          >
            FAQs
          </CardTitle>
          <div className="grid gap-4">
            {content.faqs.length === 0 ? (
              <p className="text-sm text-neutral-500">No FAQs yet.</p>
            ) : (
              <ol className="grid gap-3">
                {content.faqs.map((faq, index) => (
                  <li
                    key={faq.key}
                    className="grid gap-3 rounded-md border border-neutral-200 p-3"
                  >
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
          <Card>
            <CardTitle
              description={`What to see and do here. At least ${PAGE_LIMITS.minHighlights}, at most ${PAGE_LIMITS.maxHighlights}. Shown in this order.`}
            >
              Highlights
            </CardTitle>
            <div className="grid gap-4">
              {content.highlights.length === 0 ? (
                <p className="text-sm text-neutral-500">No highlights yet.</p>
              ) : (
                <ol className="grid gap-3">
                  {content.highlights.map((highlight, index) => (
                    <li
                      key={highlight.key}
                      className="grid gap-3 rounded-md border border-neutral-200 p-3"
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
                        <p className="mb-1.5 text-sm font-medium text-neutral-800">
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
                            <InfoTip text="Optional. With an address, the highlight shows “Take me here”, which fills the drop-off with it. Addresses are kept on the location's page." />
                          </span>
                        }
                        hint={
                          addresses.length === 0 ? (
                            <Link
                              href={locationAddressesHref(locationId)}
                              className="underline underline-offset-4 hover:text-neutral-900"
                              onClick={confirmLeave}
                            >
                              Add saved addresses on the location first
                            </Link>
                          ) : undefined
                        }
                      >
                        <Select
                          value={
                            addresses.some(
                              (address) => address.id === highlight.addressId,
                            )
                              ? (highlight.addressId ?? "")
                              : ""
                          }
                          disabled={addresses.length === 0}
                          onChange={(event) =>
                            editHighlight(highlight.key, {
                              addressId: event.target.value || null,
                            })
                          }
                        >
                          <option value="">No address</option>
                          {addresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {address.name}
                            </option>
                          ))}
                        </Select>
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

      <div className="grid gap-6 lg:sticky lg:top-6">
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              Publishing
              <InfoTip text="Save draft keeps your work and changes nothing in public. Publish makes this content what the public sees, once the location is live. Unpublish takes the page from the public and keeps your text." />
            </span>
          </CardTitle>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PageStatusBadge status={status} />
              {dirty ? (
                <span className="text-xs text-neutral-500">Unsaved edits</span>
              ) : null}
            </div>
            <p className="text-xs text-neutral-600">{standingNote}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={pending || !dirty || !limits.ok}
                onClick={() => write(false)}
              >
                Save draft
              </Button>
              <Button
                disabled={
                  pending ||
                  !limits.ok ||
                  missing.length > 0 ||
                  status === "published"
                }
                onClick={() => write(true)}
              >
                Publish
              </Button>
              {isPagePublished(status) ? (
                <Button
                  variant="danger"
                  disabled={pending || !canUnpublish.ok}
                  onClick={unpublish}
                >
                  Unpublish
                </Button>
              ) : null}
            </div>
            {isPagePublished(status) && !canUnpublish.ok ? (
              <p className="text-xs text-neutral-500">{canUnpublish.error}</p>
            ) : null}
            <p aria-live="polite" className="text-sm empty:hidden">
              {pending ? (
                <span className="text-neutral-500">Saving…</span>
              ) : error ? (
                <span className="text-red-700">{error}</span>
              ) : !limits.ok ? (
                <span className="text-red-700">{limits.error}</span>
              ) : notice ? (
                <span className="text-emerald-700">{notice}</span>
              ) : null}
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle>Before publishing</CardTitle>
          {missing.length === 0 ? (
            <p className="text-sm text-emerald-700">
              Complete. Nothing is missing.
            </p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm text-neutral-700">
              {missing.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          )}
        </Card>

        <p className="text-sm">
          <Link
            href={locationHref(locationId)}
            className="text-neutral-600 underline-offset-4 hover:underline"
            onClick={confirmLeave}
          >
            Back to the location
          </Link>
        </p>
      </div>
    </div>
  );
}
