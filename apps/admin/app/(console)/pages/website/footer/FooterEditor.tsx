"use client";

import {
  BUNDLED_PAYMENT_LOGOS,
  FOOTER_LIMITS,
  FOOTER_LINK_KINDS,
  FOOTER_LINK_KIND_LABELS,
  IMAGE_TYPES,
  SOCIAL_NETWORKS,
  SOCIAL_NETWORK_LABELS,
  changedFooterParts,
  checkFooterLimits,
  footerContentOf,
  footerProblems,
  formatLocalDateTime,
  isFooterLinkKind,
  isSitePageKey,
  isSocialNetwork,
  pageStatusOf,
  sameFooterContent,
  type FooterBadge,
  type FooterContent,
  type FooterLink,
  type FooterLinkTarget,
  type FooterSocial,
  type PageImage,
  type SitePageKey,
  type UploadedImage,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Field, Input, Textarea } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { Card, CardTitle } from "../../../../_components/Card";
import { FormError } from "../../../../_components/FormError";
import { ImageUpload } from "../../../../_components/ImageUpload";
import { Count } from "../../../../_components/page-editor/Count";
import {
  HistoryDialog,
  type PagePublishEntry,
} from "../../../../_components/page-editor/PageHistory";
import {
  BarLink,
  PublishBar,
} from "../../../../_components/page-editor/PublishBar";
import { useSaveShortcut } from "../../../../_components/page-editor/use-save-shortcut";
import {
  UploadsContext,
  useImageUpload,
  useUploadCount,
} from "../../../../_components/use-image-upload";
import { LOCATION_IMAGE_UPLOAD_PATH } from "../../../../_lib/routes";
import { useLeaveGuard } from "../../../../_lib/use-leave-guard";
import {
  RowControls,
  movedRow,
} from "../../../locations/_components/RowControls";
import { publishFooterAction, saveFooterDraftAction } from "./actions";
import { FooterContentView } from "./FooterContentView";
import { logoSrc } from "./logo-src";

/** A row of a list in the form, with an id that stays while the form is open. A logo has its own `key`, UploadThing's. */
type Rowed<T> = T & { rowId: string };

type FormColumn = Rowed<{ heading: string; links: Rowed<FooterLink>[] }>;

/** The footer as the form holds it: as typed, each row with an id, the first year as text. */
type FormContent = Omit<
  FooterContent,
  "columns" | "social" | "badges" | "paymentLogos" | "legalLinks" | "since"
> & {
  columns: FormColumn[];
  social: Rowed<FooterSocial>[];
  badges: Rowed<FooterBadge>[];
  paymentLogos: Rowed<PageImage>[];
  legalLinks: Rowed<FooterLink>[];
  since: string;
};

/** A site page a link may open, and whether the public sees it. */
export type LinkablePage = {
  page: SitePageKey;
  label: string;
  published: boolean;
};

/** A location a link may open, and whether the public sees it. */
export type LinkableLocation = { slug: string; name: string; public: boolean };

const L = FOOTER_LIMITS;

// Row ids only key the rows while the form is open, so a counter will do.
let nextRow = 0;
const rowed = <T extends object>(row: T): Rowed<T> => ({
  ...row,
  rowId: `row-${nextRow++}`,
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

/** The rows of a list in a card: hairlines between them, no frames. */
const ROWS = "divide-y divide-slate-100";

/**
 * The footer's editor: the publish bar on top, then a card per part of the
 * footer in the order the site shows them. "Publish" opens what still
 * needs doing, else what the publish changes; the footer goes live on
 * every page at once. It stays published once it is. A save is refused
 * when someone else changed the footer since the form was opened.
 */
export function FooterEditor({
  draft,
  published: publishedAtOpen,
  publishedAt: publishedAtAtOpen,
  version: versionAtOpen,
  pages,
  locations,
  previewUrl,
  publishes,
  historyHref,
  siteUrl,
}: {
  draft: FooterContent;
  /** The copy the public is shown; null until the first publish. */
  published: FooterContent | null;
  publishedAt: Date | null;
  version: string | null;
  pages: readonly LinkablePage[];
  locations: readonly LinkableLocation[];
  /** The home page's preview, which shows the footer's saved draft. */
  previewUrl: string;
  /** The footer's publishes, newest first. */
  publishes: PagePublishEntry[];
  /** Where every change to the site's pages is listed. */
  historyHref: string;
  /** The customer site, where the logos it ships are. */
  siteUrl: string;
}) {
  const [content, setContent] = useState<FormContent>(() => ({
    ...draft,
    columns: draft.columns.map((column) =>
      rowed({ ...column, links: column.links.map(rowed) }),
    ),
    social: draft.social.map(rowed),
    badges: draft.badges.map(rowed),
    paymentLogos: draft.paymentLogos.map(rowed),
    legalLinks: draft.legalLinks.map(rowed),
    since: draft.since === null ? "" : String(draft.since),
  }));
  // What the server holds, as of the last save from this form.
  const [saved, setSaved] = useState(draft);
  const [published, setPublished] = useState(publishedAtOpen);
  const [publishedAt, setPublishedAt] = useState(publishedAtAtOpen);
  const [version, setVersion] = useState(versionAtOpen);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const uploads = useUploadCount();
  // A logo still uploading is not in the footer yet: saving waits for it.
  const busy = pending || uploads.uploading;
  const [publishing, setPublishing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [readingHistory, setReadingHistory] = useState(false);

  // The footer in its one shape, as it would be stored: what every check and comparison reads.
  const year = content.since.trim();
  const normal = footerContentOf({
    ...content,
    since: /^\d{4}$/.test(year) ? Number(year) : null,
  });
  const limits = checkFooterLimits(normal);
  const problems = footerProblems(normal);
  const dirty = !sameFooterContent(normal, saved);
  const status = pageStatusOf(normal, published);
  const publishedOn = publishedAt ? formatLocalDateTime(publishedAt) : "";
  const standingNote =
    status === "unpublished"
      ? "Every page shows the footer the site started with until you publish."
      : status === "published"
        ? `Published ${publishedOn}.`
        : `Every page shows the copy published ${publishedOn} until you publish again.`;

  const leaveDialog = useLeaveGuard(
    dirty,
    "The edits since the last save are lost.",
  );

  function edit(patch: Partial<FormContent>) {
    setContent((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function write(publish: boolean) {
    startTransition(async () => {
      const result = await answerOf(
        (publish ? publishFooterAction : saveFooterDraftAction)(
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

  useSaveShortcut(() => {
    if (dirty && limits.ok && !busy) write(false);
  });

  const message = uploads.uploading ? (
    <span className="text-slate-500">Uploading the logo…</span>
  ) : pending ? (
    <span className="text-slate-500">Saving…</span>
  ) : error ? (
    <span className="text-red-700">{error}</span>
  ) : !limits.ok ? (
    <span className="text-red-700">{limits.error}</span>
  ) : (
    <span className="text-slate-600">{standingNote}</span>
  );

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

  const changes = published ? changedFooterParts(published, normal) : null;

  return (
    <UploadsContext value={uploads.track}>
      <div className="grid gap-6">
        <PublishBar
          title="Footer"
          status={status}
          dirty={dirty}
          previewUrl={previewUrl}
          canSave={!busy && dirty && limits.ok}
          onSave={() => write(false)}
          canPublish={!busy && status !== "published"}
          publishHint={
            status === "published" ? "Every page shows this already." : null
          }
          onPublish={() => setPublishing(true)}
          path="On every page"
          message={message}
          moves={moves}
        />

        <Card>
          <CardTitle description="The line under the logo.">Tagline</CardTitle>
          <Field
            label={
              <Counted
                label="Tagline"
                value={normal.tagline}
                limit={L.tagline}
              />
            }
          >
            <Textarea
              rows={2}
              value={content.tagline}
              onChange={(event) => edit({ tagline: event.target.value })}
            />
          </Field>
        </Card>

        <Card>
          <CardTitle
            description={`Up to ${L.columns} columns of up to ${L.links} links, such as Destinations and About Heavenly Travel. A link to a site page that is not published, or to a location the public does not see, is left out until it is.`}
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={content.columns.length >= L.columns}
                onClick={() =>
                  edit({
                    columns: [
                      ...content.columns,
                      rowed({ heading: "", links: [] }),
                    ],
                  })
                }
              >
                Add a column
              </Button>
            }
          >
            Link columns
          </CardTitle>
          {content.columns.length === 0 ? (
            <p className="text-sm text-slate-500">No columns yet.</p>
          ) : (
            <div className="grid gap-6">
              {content.columns.map((column, index) => {
                const update = (patch: Partial<FormColumn>) =>
                  edit({
                    columns: content.columns.map((c) =>
                      c.rowId === column.rowId ? { ...c, ...patch } : c,
                    ),
                  });
                const name = column.heading || `column ${index + 1}`;
                return (
                  <div
                    key={column.rowId}
                    className="grid gap-3 rounded-lg bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-end gap-3">
                      <Field
                        className="min-w-48 flex-1"
                        label={
                          <Counted
                            label="Heading"
                            value={column.heading.trim()}
                            limit={L.heading}
                          />
                        }
                      >
                        <Input
                          autoComplete="off"
                          placeholder="Destinations"
                          value={column.heading}
                          onChange={(event) =>
                            update({ heading: event.target.value })
                          }
                        />
                      </Field>
                      <RowControls
                        name={name}
                        isFirst={index === 0}
                        isLast={index === content.columns.length - 1}
                        onMove={(by) =>
                          edit({
                            columns: movedRow(content.columns, index, by),
                          })
                        }
                        onRemove={() =>
                          edit({
                            columns: content.columns.filter(
                              (c) => c.rowId !== column.rowId,
                            ),
                          })
                        }
                      />
                    </div>
                    <LinkRows
                      links={column.links}
                      max={L.links}
                      pages={pages}
                      locations={locations}
                      onChange={(links) => update({ links })}
                      newLink={() => rowed(firstLink(pages))}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle
            description="Each network with its icon and its name."
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={content.social.length >= L.social}
                onClick={() =>
                  edit({
                    social: [
                      ...content.social,
                      rowed({
                        network: unusedNetwork(content.social),
                        url: "",
                      }),
                    ],
                  })
                }
              >
                Add a network
              </Button>
            }
          >
            Follow us on
          </CardTitle>
          <div className="grid gap-4">
            <HeadingField
              value={content.socialHeading}
              placeholder="Follow us on"
              onChange={(socialHeading) => edit({ socialHeading })}
            />
            {content.social.length > 0 ? (
              <ul className={ROWS}>
                {content.social.map((row, index) => {
                  const update = (patch: Partial<FooterSocial>) =>
                    edit({
                      social: content.social.map((r) =>
                        r.rowId === row.rowId ? { ...r, ...patch } : r,
                      ),
                    });
                  return (
                    <li
                      key={row.rowId}
                      className="flex flex-wrap items-center gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <Select
                        aria-label="Network"
                        className="w-40"
                        value={row.network}
                        options={SOCIAL_NETWORKS.map((network) => ({
                          value: network,
                          label: SOCIAL_NETWORK_LABELS[network],
                        }))}
                        onValueChange={(network) => {
                          if (isSocialNetwork(network)) update({ network });
                        }}
                      />
                      <Input
                        aria-label={`${SOCIAL_NETWORK_LABELS[row.network]} address`}
                        className="min-w-56 flex-1"
                        type="url"
                        autoComplete="off"
                        placeholder="https://www.instagram.com/…"
                        value={row.url}
                        onChange={(event) =>
                          update({ url: event.target.value })
                        }
                      />
                      <RowControls
                        name={SOCIAL_NETWORK_LABELS[row.network]}
                        isFirst={index === 0}
                        isLast={index === content.social.length - 1}
                        onMove={(by) =>
                          edit({ social: movedRow(content.social, index, by) })
                        }
                        onRemove={() =>
                          edit({
                            social: content.social.filter(
                              (r) => r.rowId !== row.rowId,
                            ),
                          })
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardTitle description="Each one left empty is left out. Contact us shows these too, with the company's name and registration below.">
            Get in touch
          </CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <HeadingField
              className="sm:col-span-2"
              value={content.contactHeading}
              placeholder="Get in touch"
              onChange={(contactHeading) => edit({ contactHeading })}
            />
            <Field
              label="WhatsApp number"
              hint="The footer links it as WhatsApp us."
            >
              <Input
                type="tel"
                autoComplete="off"
                placeholder="+60 12-527 8808"
                value={content.whatsapp}
                onChange={(event) => edit({ whatsapp: event.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                autoComplete="off"
                placeholder="012-527 8808"
                value={content.phone}
                onChange={(event) => edit({ phone: event.target.value })}
              />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <Input
                type="email"
                autoComplete="off"
                placeholder="sales@heavenlytravel.my"
                value={content.email}
                onChange={(event) => edit({ email: event.target.value })}
              />
            </Field>
            <Field
              className="sm:col-span-2"
              label={
                <Counted
                  label="Office address"
                  value={normal.address}
                  limit={L.address}
                />
              }
              hint="A line each, as it is printed."
            >
              <Textarea
                rows={3}
                value={content.address}
                onChange={(event) => edit({ address: event.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle
            description="The bodies the company is registered with, each with its logo, its name and a line such as the member number."
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={content.badges.length >= L.badges}
                onClick={() =>
                  edit({
                    badges: [
                      ...content.badges,
                      rowed({ image: null, name: "", detail: "" }),
                    ],
                  })
                }
              >
                Add a registration
              </Button>
            }
          >
            Registered with
          </CardTitle>
          <div className="grid gap-4">
            <HeadingField
              value={content.badgesHeading}
              placeholder="Registered with"
              onChange={(badgesHeading) => edit({ badgesHeading })}
            />
            {content.badges.length > 0 ? (
              <ul className={ROWS}>
                {content.badges.map((badge, index) => {
                  const update = (patch: Partial<FooterBadge>) =>
                    edit({
                      badges: content.badges.map((b) =>
                        b.rowId === badge.rowId ? { ...b, ...patch } : b,
                      ),
                    });
                  const name = badge.name || `registration ${index + 1}`;
                  return (
                    <li
                      key={badge.rowId}
                      className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,14rem)_1fr]"
                    >
                      <ImageUpload
                        label={`Logo of ${name}`}
                        uploadPath={LOCATION_IMAGE_UPLOAD_PATH}
                        src={
                          badge.image ? logoSrc(siteUrl, badge.image.url) : null
                        }
                        alt=""
                        look="logo"
                        onChange={(image) =>
                          update({
                            image: image ? { ...image, alt: "" } : null,
                          })
                        }
                      />
                      <div className="grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field
                            label={
                              <Counted
                                label="Name"
                                value={badge.name.trim()}
                                limit={L.badgeName}
                              />
                            }
                          >
                            <Input
                              autoComplete="off"
                              placeholder="MATTA"
                              value={badge.name}
                              onChange={(event) =>
                                update({ name: event.target.value })
                              }
                            />
                          </Field>
                          <Field
                            label={
                              <Counted
                                label="Line under it"
                                value={badge.detail.trim()}
                                limit={L.badgeDetail}
                              />
                            }
                          >
                            <Input
                              autoComplete="off"
                              placeholder="Member no. MA1234"
                              value={badge.detail}
                              onChange={(event) =>
                                update({ detail: event.target.value })
                              }
                            />
                          </Field>
                        </div>
                        <RowControls
                          name={name}
                          isFirst={index === 0}
                          isLast={index === content.badges.length - 1}
                          onMove={(by) =>
                            edit({
                              badges: movedRow(content.badges, index, by),
                            })
                          }
                          onRemove={() =>
                            edit({
                              badges: content.badges.filter(
                                (b) => b.rowId !== badge.rowId,
                              ),
                            })
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </Card>

        <PaymentCard
          content={content}
          max={L.paymentLogos}
          siteUrl={siteUrl}
          onEdit={edit}
          onAdd={(image) =>
            // Uploads land one by one: each joins the list as it is then.
            setContent((current) => ({
              ...current,
              paymentLogos: [...current.paymentLogos, rowed(image)],
            }))
          }
        />

        <Card>
          <CardTitle description="The last line of the footer: the company and its registration, then links such as the terms. Contact us shows the name and the registration too.">
            Copyright line
          </CardTitle>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
              <Field
                label={
                  <Counted
                    label="Company name"
                    value={normal.legalName}
                    limit={L.legalName}
                  />
                }
              >
                <Input
                  autoComplete="off"
                  placeholder="Heavenly Travel Sdn Bhd"
                  value={content.legalName}
                  onChange={(event) => edit({ legalName: event.target.value })}
                />
              </Field>
              <Field
                label={
                  <Counted
                    label="Registration"
                    value={normal.registration}
                    limit={L.registration}
                  />
                }
              >
                <Input
                  autoComplete="off"
                  placeholder="202301000086 (1494005-W)"
                  value={content.registration}
                  onChange={(event) =>
                    edit({ registration: event.target.value })
                  }
                />
              </Field>
              <Field
                label="Since"
                hint={
                  year !== "" && normal.since === null
                    ? "A year, such as 2024."
                    : "The first year shown."
                }
              >
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="2024"
                  value={content.since}
                  onChange={(event) => edit({ since: event.target.value })}
                />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-800">Links</p>
              <LinkRows
                links={content.legalLinks}
                max={L.legalLinks}
                pages={pages}
                locations={locations}
                onChange={(legalLinks) => edit({ legalLinks })}
                newLink={() => rowed(firstLink(pages))}
              />
            </div>
          </div>
        </Card>

        <Dialog
          open={publishing}
          onOpenChange={setPublishing}
          title="Publish the footer"
          description={
            problems.length > 0
              ? `${problems.length === 1 ? "One thing needs" : `${problems.length} things need`} fixing before the footer can be published.`
              : "Every page of the customer site shows it at once."
          }
          width="md"
        >
          <div className="grid gap-5">
            {problems.length > 0 ? (
              <ul className="grid list-disc gap-1.5 pl-5 text-sm text-slate-800">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : changes ? (
              <p className="text-sm text-slate-700">
                {changes.length > 0
                  ? `Changes: ${changes.join(", ")}.`
                  : "Nothing differs from the published footer."}
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                Its first publish: it takes the place of the footer the site
                started with.
              </p>
            )}
            {!limits.ok ? <FormError error={limits.error} size="xs" /> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPublishing(false)}>
                Cancel
              </Button>
              <Button
                disabled={busy || problems.length > 0 || !limits.ok}
                onClick={() => write(true)}
              >
                {pending ? "Publishing…" : "Publish now"}
              </Button>
            </div>
          </div>
        </Dialog>
        {published ? (
          <Dialog
            open={comparing}
            onOpenChange={setComparing}
            title="The published footer and this draft"
            description="What every page shows now beside what you are editing. The parts that differ are marked Changed."
            width="lg"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <section className="min-w-0">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Published
                </h3>
                <FooterContentView
                  content={published}
                  comparedTo={normal}
                  siteUrl={siteUrl}
                />
              </section>
              <section className="min-w-0 md:border-l md:border-slate-200 md:pl-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  This draft
                </h3>
                <FooterContentView
                  content={normal}
                  comparedTo={published}
                  siteUrl={siteUrl}
                />
              </section>
            </div>
          </Dialog>
        ) : null}
        <HistoryDialog
          open={readingHistory}
          onOpenChange={setReadingHistory}
          publishes={publishes}
          allHref={historyHref}
          allLabel="All changes to the site's pages"
        />
        {leaveDialog}
      </div>
    </UploadsContext>
  );
}

/** A heading over a part of the footer. */
function HeadingField({
  value,
  placeholder,
  onChange,
  className,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Field
      className={className}
      label={<Counted label="Heading" value={value.trim()} limit={L.heading} />}
    >
      <Input
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

/** A new link: to the first site page, about us. */
function firstLink(pages: readonly LinkablePage[]): FooterLink {
  const first = pages.find((page) => page.page !== "home") ?? pages[0];
  return {
    label: first?.label ?? "",
    target: first
      ? { kind: "page", page: first.page }
      : { kind: "url", url: "" },
  };
}

/** The first network not in the list yet, for a new row. */
function unusedNetwork(rows: readonly FooterSocial[]) {
  return (
    SOCIAL_NETWORKS.find((n) => !rows.some((row) => row.network === n)) ??
    SOCIAL_NETWORKS[0]
  );
}

/**
 * The links of a column or of the copyright line, each its text and where
 * it goes: one of the site's pages, a location's main page, or any address.
 * A link the public cannot open yet says so under it.
 */
function LinkRows({
  links,
  max,
  pages,
  locations,
  onChange,
  newLink,
}: {
  links: readonly Rowed<FooterLink>[];
  max: number;
  pages: readonly LinkablePage[];
  locations: readonly LinkableLocation[];
  onChange: (links: Rowed<FooterLink>[]) => void;
  newLink: () => Rowed<FooterLink>;
}) {
  const update = (rowId: string, patch: Partial<FooterLink>) =>
    onChange(
      links.map((link) =>
        link.rowId === rowId ? { ...link, ...patch } : link,
      ),
    );

  /** The target a kind starts at, its text filled from it while there is none. */
  function retarget(link: Rowed<FooterLink>, kind: string) {
    if (!isFooterLinkKind(kind) || kind === link.target.kind) return;
    const target: FooterLinkTarget =
      kind === "page"
        ? firstLink(pages).target
        : kind === "location"
          ? { kind: "location", slug: locations[0]?.slug ?? "" }
          : { kind: "url", url: "" };
    update(link.rowId, { target });
  }

  /** A page or location chosen: its name as the text, while the text is still the last one's. */
  function choose(link: Rowed<FooterLink>, target: FooterLinkTarget) {
    const nameOf = (t: FooterLinkTarget) =>
      t.kind === "page"
        ? pages.find((p) => p.page === t.page)?.label
        : t.kind === "location"
          ? locations.find((l) => l.slug === t.slug)?.name
          : undefined;
    const label =
      link.label.trim() === "" || link.label === nameOf(link.target)
        ? (nameOf(target) ?? link.label)
        : link.label;
    update(link.rowId, { target, label });
  }

  return (
    <div className="grid gap-3">
      {links.length > 0 ? (
        <ul className={ROWS}>
          {links.map((link, index) => {
            const { target } = link;
            const hidden =
              target.kind === "page"
                ? pages.find((p) => p.page === target.page)?.published === false
                  ? "Left out until the page is published."
                  : null
                : target.kind === "location"
                  ? locations.find((l) => l.slug === target.slug)?.public ===
                    false
                    ? "Left out until the location is public."
                    : null
                  : null;
            return (
              <li
                key={link.rowId}
                className="grid gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    aria-label="Link text"
                    className="min-w-40 flex-1"
                    autoComplete="off"
                    placeholder="Link text"
                    maxLength={L.linkLabel * 2}
                    value={link.label}
                    onChange={(event) =>
                      update(link.rowId, { label: event.target.value })
                    }
                  />
                  <Select
                    aria-label="Opens"
                    className="w-36"
                    value={target.kind}
                    options={FOOTER_LINK_KINDS.map((kind) => ({
                      value: kind,
                      label: FOOTER_LINK_KIND_LABELS[kind],
                    }))}
                    onValueChange={(kind) => retarget(link, kind)}
                  />
                  {target.kind === "page" ? (
                    <Select
                      aria-label="Site page"
                      className="w-56"
                      value={target.page}
                      options={pages.map((p) => ({
                        value: p.page,
                        label: p.published
                          ? p.label
                          : `${p.label} (not published)`,
                      }))}
                      onValueChange={(page) => {
                        if (isSitePageKey(page)) {
                          choose(link, { kind: "page", page });
                        }
                      }}
                    />
                  ) : target.kind === "location" ? (
                    <Select
                      aria-label="Location"
                      className="w-56"
                      value={target.slug}
                      placeholder="Choose a location"
                      options={locations.map((l) => ({
                        value: l.slug,
                        label: l.public ? l.name : `${l.name} (not public)`,
                      }))}
                      onValueChange={(slug) =>
                        choose(link, { kind: "location", slug })
                      }
                    />
                  ) : (
                    <Input
                      aria-label="Address"
                      className="w-56"
                      autoComplete="off"
                      placeholder="https://… or /booking"
                      value={target.url}
                      onChange={(event) =>
                        update(link.rowId, {
                          target: { kind: "url", url: event.target.value },
                        })
                      }
                    />
                  )}
                  <RowControls
                    name={link.label || `link ${index + 1}`}
                    isFirst={index === 0}
                    isLast={index === links.length - 1}
                    onMove={(by) => onChange(movedRow(links, index, by))}
                    onRemove={() =>
                      onChange(links.filter((l) => l.rowId !== link.rowId))
                    }
                  />
                </div>
                {hidden ? (
                  <p className="text-xs text-amber-700">{hidden}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div>
        <Button
          variant="secondary"
          size="sm"
          disabled={links.length >= max}
          onClick={() => onChange([...links, newLink()])}
        >
          Add a link
        </Button>
      </div>
    </div>
  );
}

/**
 * The ways to pay: their logos, uploaded several at once or one of the
 * HitPay marks the site ships put back, each named, in their order, and
 * the line under them.
 */
function PaymentCard({
  content,
  max,
  siteUrl,
  onEdit,
  onAdd,
}: {
  content: FormContent;
  max: number;
  siteUrl: string;
  onEdit: (patch: Partial<FormContent>) => void;
  /** A logo stored or chosen: it joins the end of the list. */
  onAdd: (image: PageImage) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useImageUpload(
    LOCATION_IMAGE_UPLOAD_PATH,
    "logo",
  );
  const logos = content.paymentLogos;
  const room = max - logos.length;
  // The shipped marks not in the list, to put back.
  const missing = BUNDLED_PAYMENT_LOGOS.filter(
    (mark) => !logos.some((logo) => logo.url === mark.url),
  );

  return (
    <Card>
      <CardTitle
        description={`The logos of the ways to pay, up to ${max}, each named for those who cannot see it. Upload them as PNG or WebP on a plain background.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {missing.length > 0 ? (
              <Select
                aria-label="Put back a HitPay logo"
                className="w-52"
                value=""
                placeholder="Put back a HitPay logo"
                disabled={room <= 0}
                options={missing.map((mark) => ({
                  value: mark.url,
                  label: mark.alt,
                }))}
                onValueChange={(url) => {
                  const mark = missing.find((m) => m.url === url);
                  if (mark) onAdd(mark);
                }}
              />
            ) : null}
            <input
              ref={input}
              type="file"
              multiple
              accept={IMAGE_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-label="Payment logos: choose files"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])].slice(0, room);
                event.target.value = "";
                void upload(files, (image: UploadedImage) =>
                  onAdd({ ...image, alt: "" }),
                );
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={uploading || room <= 0}
              onClick={() => input.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload logos"}
            </Button>
          </div>
        }
      >
        Payment partners
      </CardTitle>
      <div className="grid gap-4">
        <HeadingField
          value={content.paymentHeading}
          placeholder="Payment partners"
          onChange={(paymentHeading) => onEdit({ paymentHeading })}
        />
        <FormError error={error} size="xs" />
        {logos.length > 0 ? (
          <ul className={ROWS}>
            {logos.map((logo, index) => (
              <li
                key={logo.rowId}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a small logo, shown at its own size */}
                <img
                  src={logoSrc(siteUrl, logo.url)}
                  alt=""
                  className="h-10 w-20 rounded border border-slate-200 bg-white object-contain p-1"
                />
                <Input
                  aria-label="Name"
                  className="min-w-40 flex-1"
                  autoComplete="off"
                  placeholder="Name, such as Maybank2u"
                  value={logo.alt}
                  onChange={(event) =>
                    onEdit({
                      paymentLogos: logos.map((l) =>
                        l.rowId === logo.rowId
                          ? { ...l, alt: event.target.value }
                          : l,
                      ),
                    })
                  }
                />
                <RowControls
                  name={logo.alt || `logo ${index + 1}`}
                  isFirst={index === 0}
                  isLast={index === logos.length - 1}
                  onMove={(by) =>
                    onEdit({ paymentLogos: movedRow(logos, index, by) })
                  }
                  onRemove={() =>
                    onEdit({
                      paymentLogos: logos.filter((l) => l.rowId !== logo.rowId),
                    })
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No logos yet. The footer leaves this part out until there are.
          </p>
        )}
        <Field
          label={
            <Counted
              label="Line under the logos"
              value={content.paymentNote.trim()}
              limit={L.paymentNote}
            />
          }
          hint="Optional."
        >
          <Input
            autoComplete="off"
            placeholder="Payments are processed securely by HitPay."
            value={content.paymentNote}
            onChange={(event) => onEdit({ paymentNote: event.target.value })}
          />
        </Field>
      </div>
    </Card>
  );
}
