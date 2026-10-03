import { LOCATION_LIMITS, checkLocationSlug } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";

/**
 * The slug of a location, with where its pages will be, or what is wrong
 * with it, said underneath as it is typed. Read-only once the location has
 * been live: from then a wrong slug is put right by deleting the location
 * and adding it again. The form receives it as `slug` either way.
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
          <InfoTip text="The address of the location's pages. It can be changed until the location first goes live, and is locked from then. A slug that is wrong after that is put right by deleting the location and adding it again." />
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
          ? "Locked: the location has been live. To change it, delete the location and add it again."
          : value === ""
            ? "Lower-case letters, digits and dashes."
            : check.ok
              ? `Its pages will be at /${value}`
              : check.error}
      </span>
    </Field>
  );
}
