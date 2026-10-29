import {
  ENTRY_LIMITS,
  LOCATION_LIMITS,
  checkEntrySlug,
  checkLocationSlug,
  type Change,
} from "@repo/db";
import { cx } from "@repo/ui/cx";
import { Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";

/**
 * A slug, with where its page will be, or what is wrong with it, said
 * underneath as it is typed: a location's, or a page's under a section.
 * Read-only once `locked` says why. The form receives it as `slug` either
 * way.
 */
function SlugField({
  value,
  onChange,
  check,
  maxLength,
  where,
  info,
  locked = null,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The server's own check of it. */
  check: (slug: string) => Change;
  maxLength: number;
  /** Where a good slug puts its page: "Its pages will be at /langkawi". */
  where: (slug: string) => string;
  /** What the slug is and when it locks, in the tip by its label. */
  info: string;
  /** Why it can no longer change; null while it can. */
  locked?: string | null;
}) {
  const result = check(value);
  const wrong = locked === null && value !== "" && !result.ok;

  return (
    <Field
      label={
        <span className="inline-flex items-center gap-1.5">
          Slug
          <InfoTip text={info} />
        </span>
      }
    >
      <Input
        name="slug"
        required
        autoComplete="off"
        spellCheck={false}
        maxLength={maxLength}
        readOnly={locked !== null}
        aria-invalid={wrong}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span
        aria-live="polite"
        className={cx(
          "mt-1.5 block text-xs",
          wrong ? "text-red-700" : "text-muted",
        )}
      >
        {locked !== null
          ? locked
          : value === ""
            ? "Lower-case letters, digits and dashes."
            : result.ok
              ? where(value)
              : result.error}
      </span>
    </Field>
  );
}

/** A location's slug: the address of its pages, locked once it has been live. */
export function LocationSlugField({
  value,
  onChange,
  locked = false,
}: {
  value: string;
  onChange: (value: string) => void;
  locked?: boolean;
}) {
  return (
    <SlugField
      value={value}
      onChange={onChange}
      check={checkLocationSlug}
      maxLength={LOCATION_LIMITS.slug}
      where={(slug) => `Its pages will be at /${slug}`}
      info="The address of the location's pages. It can be changed until the location first goes live, and is locked from then. A slug that is wrong after that is put right by deleting the location and adding it again."
      locked={
        locked
          ? "Locked: the location has been live. To change it, delete the location and add it again."
          : null
      }
    />
  );
}

/** The slug of a page added to a section: the end of its address, which can change until its first publish. */
export function EntrySlugField({
  value,
  onChange,
  under,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The section's address: "/langkawi/popular-places". */
  under: string;
}) {
  return (
    <SlugField
      value={value}
      onChange={onChange}
      check={checkEntrySlug}
      maxLength={ENTRY_LIMITS.slug}
      where={(slug) => `The page will be at ${under}/${slug}`}
      info="The end of the page's address. It can change until the page is first published, and is locked from then."
    />
  );
}
