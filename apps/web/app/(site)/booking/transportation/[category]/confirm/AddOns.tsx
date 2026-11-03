"use client";

import {
  GUIDE_LANGUAGES,
  GUIDE_LANGUAGES_REQUIRED,
  includesGuide,
  type GuideChoice,
  type TripCategory,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Checkbox } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";

/**
 * "Add-ons", under the vehicle on the confirm page, for every trip: the
 * tour guide. A coach's is included, ticked and not to untick; a car's is
 * the customer's to tick. With a guide come the languages they should
 * speak, one or more, from the list guides are kept with, so Operation
 * assigns one who speaks them. The choice is the plan's, posted with the
 * trips. See docs/261103-tour-guide.md.
 */
export function AddOns({
  category,
  guide,
  forWhich,
  onGuide,
}: {
  category: TripCategory;
  guide: GuideChoice;
  /** "for the trip", "for both trips". */
  forWhich: string;
  onGuide: (change: Partial<GuideChoice>) => void;
}) {
  const included = includesGuide(category);
  const on = included || guide.added;

  function toggle(language: string, ticked: boolean) {
    const chosen = new Set(guide.languages);
    if (ticked) chosen.add(language);
    else chosen.delete(language);
    onGuide({ languages: GUIDE_LANGUAGES.filter((l) => chosen.has(l)) });
  }

  return (
    <div className="grid gap-4 border-t border-hairline pt-5">
      <h3 className="font-serif text-xl leading-tight">Add-ons</h3>
      <label className="flex items-start gap-3">
        <Checkbox
          className="mt-1"
          checked={on}
          disabled={included}
          onChange={(event) => onGuide({ added: event.currentTarget.checked })}
        />
        <span className="grid gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-ink">
            Tour guide
            {included ? <Badge tone="green">Included</Badge> : null}
          </span>
          <span className="text-copy text-body">
            {included
              ? `A licensed tour guide comes with every coach trip, at no extra charge: ${forWhich}.`
              : `A licensed tour guide joins you, ${forWhich}.`}
          </span>
        </span>
      </label>
      {on ? (
        <fieldset className="grid gap-2 sm:ml-7">
          <legend className="mb-2 text-copy text-ink">
            Languages your guide should speak
          </legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {GUIDE_LANGUAGES.map((language) => (
              <label
                key={language}
                className="flex items-center gap-2 text-copy text-body"
              >
                <Checkbox
                  checked={guide.languages.includes(language)}
                  onChange={(event) =>
                    toggle(language, event.currentTarget.checked)
                  }
                />
                {language}
              </label>
            ))}
          </div>
          {guide.languages.length === 0 ? (
            <FormError size="copy" error={GUIDE_LANGUAGES_REQUIRED} />
          ) : (
            <p className="text-copy text-muted">
              Choose one or more. We match your guide to them.
            </p>
          )}
        </fieldset>
      ) : null}
    </div>
  );
}
