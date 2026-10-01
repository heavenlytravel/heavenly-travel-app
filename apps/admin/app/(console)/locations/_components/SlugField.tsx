import { LOCATION_LIMITS, checkLocationSlug } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";

/**
 * The slug of a location, with where its pages will be, or what is wrong
 * with it, said underneath as it is typed. Read-only once the location has
 * been live. The form receives it as `slug` either way.
 */
export function SlugField({
  value,
  onChange,
  locked = false,
}: {
  value: string;
  onChange: (value: string) => void;
  locked?: boolean;
}) {
  const check = checkLocationSlug(value);
  const wrong = !locked && value !== "" && !check.ok;

  return (
    <Field
      label={
        <span className="inline-flex items-center gap-1.5">
          Slug
          <InfoTip text="The address of the location's pages. It can be changed until the location first goes live, and is locked from then." />
        </span>
      }
    >
      <Input
        name="slug"
        required
        autoComplete="off"
        spellCheck={false}
        maxLength={LOCATION_LIMITS.slug}
        readOnly={locked}
        aria-invalid={wrong}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span
        aria-live="polite"
        className={cx(
          "mt-1.5 block text-xs",
          wrong ? "text-red-700" : "text-neutral-500",
        )}
      >
        {locked
          ? "Locked: the location has been live."
          : value === ""
            ? "Lower-case letters, digits and dashes."
            : check.ok
              ? `Its pages will be at /${value}`
              : check.error}
      </span>
    </Field>
  );
}
