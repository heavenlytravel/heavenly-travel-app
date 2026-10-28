import { PLACE_SECTIONS, PLACE_TYPE_LABELS, type PlaceSection } from "@repo/db";
import { Field } from "@repo/ui/field";
import { Select } from "@repo/ui/select";

const OPTIONS = PLACE_SECTIONS.map((section) => ({
  value: section,
  label: PLACE_TYPE_LABELS[section],
}));

/**
 * A place's type: popular place, attraction or hotel, the section it is
 * under, which its address follows. Like the slug, it can change until the
 * page is first published. The form receives it as `page`.
 */
export function PlaceTypeField({
  value,
  onChange,
}: {
  value: PlaceSection;
  onChange: (value: PlaceSection) => void;
}) {
  return (
    <Field
      label="Type"
      hint="Its address follows its type. Its card can be listed under the other types too, in its editor."
    >
      <Select
        name="page"
        value={value}
        onValueChange={(next) => {
          const type = OPTIONS.find((option) => option.value === next);
          if (type) onChange(type.value);
        }}
        options={OPTIONS}
        aria-label="Type"
      />
    </Field>
  );
}
