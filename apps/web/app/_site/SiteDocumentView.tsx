import Link from "next/link";
import {
  COMPANY,
  CONTACT,
  SITE_PAGE_LABELS,
  type PageContent,
  type SitePageKey,
} from "@repo/db/server";
import { eyebrow, focus } from "../(site)/_components/Page";
import {
  Cover,
  Faqs,
  JsonLd,
  MissingMark,
  MissingPart,
  Prose,
  emptyPartsOf,
  formatPageDate,
  gutter,
} from "../_components/page-parts";
import { faqDataOf } from "../_lib/seo";

/**
 * One of the site's documents: about us, contact us, the terms, the privacy
 * policy, the refunds. Its breadcrumb, title and summary, an optional photo,
 * the text, the FAQs; contact us adds the company's details from code. The
 * public page and the staff preview render this; the preview shows a
 * dashed placeholder where each empty part goes (`emptyPartsOf`).
 */
export function SiteDocumentView({
  page,
  content,
  publishedAt,
  preview = false,
}: {
  page: SitePageKey;
  content: PageContent;
  /** When the copy shown was published, as text; null for a draft. */
  publishedAt: string | null;
  preview?: boolean;
}) {
  const label = SITE_PAGE_LABELS[page];
  const empty = emptyPartsOf("document", preview);
  const faqData = faqDataOf(content);
  return (
    <main className="pb-[60px] sm:pb-[88px]">
      {faqData && <JsonLd data={[faqData]} />}
      <article>
        <header className={`pt-7 ${gutter}`}>
          <div className="mx-auto w-full max-w-[900px]">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-x-2 text-[0.85rem] text-slate-700">
                <li className="flex items-center gap-x-2">
                  <Link
                    href="/"
                    className={`underline-offset-4 hover:underline ${focus}`}
                  >
                    Home
                  </Link>
                  <span aria-hidden>/</span>
                </li>
                <li>
                  <span aria-current="page" className="font-semibold">
                    {label}
                  </span>
                </li>
              </ol>
            </nav>
            <p className={`${eyebrow} mt-8 mb-3`}>Heavenly Travel</p>
            <h1 className="font-(family-name:--font-display) text-[clamp(2.3rem,5.4vw,4rem)] leading-[1.02] text-ink">
              {content.heroHeadline || label}
              {!content.heroHeadline && empty.headline && (
                <MissingMark part={empty.headline} />
              )}
            </h1>
            {content.heroSubheadline ? (
              <p className="mt-4 max-w-[640px] text-[1.12rem] text-slate-700">
                {content.heroSubheadline}
              </p>
            ) : (
              empty.subheadline && (
                <MissingPart
                  part={empty.subheadline}
                  className="mt-4 min-h-11 max-w-[640px] rounded-xl"
                />
              )
            )}
            {publishedAt && page !== "about-us" && page !== "contact-us" && (
              <p className="mt-5 text-[0.9rem] text-slate-500">
                Last updated{" "}
                <time dateTime={publishedAt}>
                  {formatPageDate(publishedAt)}
                </time>
              </p>
            )}
          </div>
          <Cover image={content.heroImage} empty={empty.heroImage} />
        </header>
        <div className={`pt-10 sm:pt-14 ${gutter}`}>
          <div className="mx-auto grid w-full max-w-[900px] gap-12">
            <Prose text={content.body} empty={empty.body} />
            {page === "contact-us" && <CompanyDetails />}
          </div>
        </div>
      </article>
      <Faqs title="Good to know" faqs={content.faqs} empty={empty.faqs} />
    </main>
  );
}

const detailLink = `font-semibold text-brand underline-offset-4 hover:underline ${focus}`;

/** The company's details, as the footer has them, laid out for contact us. */
function CompanyDetails() {
  return (
    <section
      aria-labelledby="company-title"
      className="grid gap-6 rounded-[20px] bg-white p-6 shadow-[0_12px_35px_rgba(0,38,75,0.08)] sm:grid-cols-2 sm:p-8"
    >
      <h2
        id="company-title"
        className="font-(family-name:--font-display) text-[1.8rem] leading-tight text-ink sm:col-span-2"
      >
        {COMPANY.legalName}
      </h2>
      <div>
        <p className={`${eyebrow} mb-2`}>Office</p>
        <address className="leading-relaxed text-slate-700 not-italic">
          {COMPANY.address.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
        <p className="mt-2 text-[0.9rem] text-slate-500">
          {COMPANY.registration}
        </p>
      </div>
      <div className="grid content-start gap-2">
        <p className={`${eyebrow} mb-0`}>Reach us</p>
        <a href={COMPANY.phoneHref} className={detailLink}>
          {COMPANY.phone}
        </a>
        <a href={`mailto:${COMPANY.email}`} className={detailLink}>
          {COMPANY.email}
        </a>
        <a
          href={CONTACT.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={detailLink}
        >
          WhatsApp {CONTACT.whatsappNumber}
        </a>
      </div>
    </section>
  );
}
