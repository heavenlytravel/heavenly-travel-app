"use client";

import {
  formatMyr,
  guideOfferIssue,
  requestableLanguages,
  type GuideChoice,
  type GuideOffer,
} from "@repo/db";
import { Checkbox, Radio } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";

/**
 * "Add-ons", under the vehicle on the confirm page: the tour guide, for a
 * car or a coach, one-way or hourly. Only the languages on sale for every
 * trip show, each at its price for them all (the location's guide rates);
 * with none on sale, nothing shows. One language is chosen, ticking the
 * guide chooses the first. A coach must take one (`required`): the guide
 * stays ticked, only its language is chosen. Any other language may be asked for, free:
 * Operation looks for a guide and, when one is found, amends the booking.
 * The choice is the plan's, posted with the trips. See
 * docs/261103-tour-guide.md.
 */
export function AddOns({
  offers,
  guide,
  forWhich,
  required,
  onGuide,
}: {
  /** On sale for every trip, at the sum of their prices. */
  offers: readonly GuideOffer[];
  guide: GuideChoice;
  /** "for the trip", "for both trips". */
  forWhich: string;
  /** A coach's: the guide cannot be left off. */
  required: boolean;
  onGuide: (change: Partial<GuideChoice>) => void;
}) {
  if (offers.length === 0) return null;
  const cheapest = Math.min(...offers.map((offer) => offer.amountSen));
  const others = requestableLanguages(offers);
  const issue = guideOfferIssue(guide.language, offers);

  return (
    <div className="grid gap-4 border-t border-hairline pt-5">
      <h3 className="font-serif text-xl leading-tight">Add-ons</h3>
      <label className="flex items-start gap-3">
        <Checkbox
          className="mt-1"
          checked={guide.language !== null}
          disabled={required}
          onChange={(event) =>
            onGuide({
              language: event.currentTarget.checked
                ? offers[0]!.language
                : null,
            })
          }
        />
        <span className="grid gap-0.5">
          <span className="text-ink">Tour guide</span>
          <span className="text-copy text-body">
            {required
              ? `Every coach comes with a licensed tour guide, ${forWhich}. Choose the language they speak, from ${formatMyr(cheapest)}.`
              : `A licensed tour guide joins you, ${forWhich}. From ${formatMyr(cheapest)}.`}
          </span>
        </span>
      </label>
      {guide.language !== null ? (
        <fieldset className="grid gap-2 sm:ml-7">
          <legend className="mb-2 text-copy text-ink">
            The language your guide speaks
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {offers.map((offer) => (
              <label
                key={offer.language}
                className="flex items-center gap-2 text-copy text-body"
              >
                <Radio
                  name="guideLanguage"
                  checked={guide.language === offer.language}
                  onChange={() => onGuide({ language: offer.language })}
                />
                <span className="flex-1">{offer.language}</span>
                <span className="tabular-nums text-ink">
                  {formatMyr(offer.amountSen)}
                </span>
              </label>
            ))}
          </div>
          {issue ? <FormError size="copy" error={issue} /> : null}
        </fieldset>
      ) : null}
      {others.length > 0 ? (
        <>
          <label className="flex items-start gap-3">
            <Checkbox
              className="mt-1"
              checked={guide.request !== null}
              onChange={(event) =>
                onGuide({
                  request: event.currentTarget.checked ? others[0]! : null,
                })
              }
            />
            <span className="grid gap-0.5">
              <span className="text-ink">
                Ask for a guide in another language
              </span>
              <span className="text-copy text-body">
                Free to ask. We look for one, and if we find one we update your
                booking and send you the price to pay.
              </span>
            </span>
          </label>
          {guide.request !== null ? (
            <fieldset className="grid gap-2 sm:ml-7">
              <legend className="sr-only">The language you ask for</legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {others.map((language) => (
                  <label
                    key={language}
                    className="flex items-center gap-2 text-copy text-body"
                  >
                    <Radio
                      name="guideRequest"
                      checked={guide.request === language}
                      onChange={() => onGuide({ request: language })}
                    />
                    {language}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
