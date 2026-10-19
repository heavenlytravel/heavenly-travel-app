"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CONTACT,
  fitsPassengers,
  formatMyr,
  hiddenSearchFields,
  largestGroup,
  modelsLine,
  offersChildSeats,
  seatsLabel,
  TRIP_MAX_CHILD_SEATS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  TRIP_OPTION_FIELDS,
  tripSearchParams,
  type TripCategory,
  type TripSearch,
  type TripView,
} from "@repo/db";
import { Radio } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { useFormErrors } from "@repo/ui/validation";
import { ClassPicture } from "../../../../_components/ClassPicture";
import {
  hasPhotos,
  ModelGallery,
  type GalleryModel,
} from "../../../../_components/ModelGallery";
import {
  tripBookingHref,
  tripConfirmPath,
} from "../../../../_lib/transportation-booking";
import { useNavigate } from "../../../../_lib/useNavigate";
import {
  control,
  Pending,
  primaryButton,
  textLink,
} from "../../../_components/Page";
import { ModelChoice } from "./ModelChoice";
import { TripBar } from "./TripBar";

/** One vehicle class as priced for this trip. Plain data, sent to the browser. */
export type ClassOption = {
  id: string;
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  /** Its picture; null for none. */
  imageUrl: string | null;
  /** The models of the location's vehicles in service, in order, with their photos. */
  models: GalleryModel[];
  /** With any model of the class. */
  totalSen: number;
  /** What choosing one of the models adds; null when the customer cannot choose here. */
  modelChoiceSen: number | null;
  /** Why the class cannot take this trip, or null when it can. */
  unavailable: string | null;
};

/** The gallery open over the form: a class's models, at one of them. */
type OpenGallery = { option: ClassOption; modelId: string | null };

/**
 * The trip bar, then vehicle class, passengers, child seats where the
 * category offers them, flight number and notes. A GET form: the choices
 * join the search in the confirm page's URL, so the confirm step is
 * shareable and survives the sign-in redirect. The browser opens that URL
 * through the router, so the button can say so while the confirm page
 * prices the trip; the form's own action is the same URL, for a click
 * before the page has hydrated. Each class shows its picture when any of
 * them has one. Classes the passenger count does not fit, or whose rules
 * refuse the trip, are shown with the reason but cannot be chosen. The passenger
 * count lives here so the trip bar can carry it over a changed trip; the
 * page gives this form the trip as its key, so a changed trip clears the
 * chosen vehicle. A class names its models; chosen, its card opens on
 * them with their photos, and where the location lets the customer choose
 * one, they may, at the class's charge. The photos open in one gallery
 * kept outside the cards, whose clicks would otherwise choose the class.
 */
export function TripOptionsForm({
  category,
  search,
  trip,
  classes,
  initialPassengers,
}: {
  category: TripCategory;
  search: TripSearch;
  trip: TripView;
  classes: ClassOption[];
  initialPassengers: number;
}) {
  // The largest class in the category is the most the field accepts.
  const maxPassengers = largestGroup(classes);
  const [passengersText, setPassengersText] = useState(
    String(Math.min(initialPassengers, maxPassengers)),
  );
  const passengers = Number(passengersText);
  const [chosen, setChosen] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<OpenGallery | null>(null);
  const pictured = classes.some((c) => c.imageUrl !== null);
  const choosable = (c: ClassOption) =>
    c.unavailable === null && fitsPassengers(c, passengers);
  const selected = chosen && classes.find((c) => c.id === chosen);
  const canContinue = Boolean(selected && choosable(selected));
  const model =
    selected && selected.modelChoiceSen !== null
      ? (selected.models.find((m) => m.id === modelId) ?? null)
      : null;
  const totalSen = selected
    ? selected.totalSen + (model ? (selected.modelChoiceSen ?? 0) : 0)
    : null;

  function choose(id: string) {
    if (id === chosen) return;
    setChosen(id);
    setModelId(null);
  }
  const { pending, go } = useNavigate();
  const { errors, formProps } = useFormErrors();
  const passengersError = errors[TRIP_OPTION_FIELDS.passengers];

  function continueToConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = new URLSearchParams();
    // An empty choice is no choice: "Any" model, no flight, no notes.
    new FormData(e.currentTarget).forEach((value, name) => {
      if (value !== "") query.append(name, String(value));
    });
    go(`${tripConfirmPath(category)}?${query}`);
  }

  return (
    <TripBar
      category={category}
      search={search}
      trip={trip}
      passengers={passengers}
    >
      <form
        method="get"
        action={tripConfirmPath(category)}
        onSubmit={continueToConfirm}
        {...formProps}
        className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start"
      >
        {hiddenSearchFields(search).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <fieldset className="grid gap-3">
          <legend className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
            Choose your vehicle
          </legend>
          {classes.map((c) => {
            const ok = choosable(c);
            const on = chosen === c.id && ok;
            return (
              <div
                key={c.id}
                className={`overflow-hidden rounded-[16px] border-2 transition-colors has-[:disabled]:opacity-50 ${
                  on
                    ? "border-[#073c36] bg-[#e8f2ef]"
                    : "border-[#dce3e0] bg-white hover:border-[#073c36]/50"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-4 p-5 has-[:disabled]:cursor-not-allowed">
                  <Radio
                    name={TRIP_OPTION_FIELDS.vehicleClass}
                    value={c.id}
                    checked={on}
                    disabled={!ok}
                    required
                    onChange={() => choose(c.id)}
                    className="mt-1.5"
                  />
                  {pictured ? (
                    <ClassPicture
                      src={c.imageUrl}
                      sizes="(min-width: 40rem) 144px, 96px"
                      className="w-24 shrink-0 sm:w-36"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="text-[1.1rem] font-bold text-[#082f2b]">
                        {c.name}
                      </span>
                      <span className="text-[1.15rem] font-bold text-[#073c36]">
                        {formatMyr(c.totalSen)}
                      </span>
                    </span>
                    <span className="text-[0.95rem] text-[#324844]">
                      {c.description}
                    </span>
                    {c.models.length > 0 ? (
                      <span className="flex flex-wrap items-baseline gap-x-3 text-[0.9rem] text-[#324844]">
                        {modelsLine(c.models.map((m) => m.name))}, or similar
                        {!on && hasPhotos(c.models) ? (
                          // A button in the label opens the gallery without choosing the class.
                          <button
                            type="button"
                            onClick={() =>
                              setGallery({ option: c, modelId: null })
                            }
                            className={textLink}
                          >
                            See photos
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                    <span className="text-[0.85rem] text-[#67726f]">
                      {seatsLabel(c)}
                      {" · "}
                      {c.luggage}
                      {c.unavailable
                        ? ` · ${c.unavailable}`
                        : !ok && " · Does not fit your group"}
                    </span>
                  </span>
                </label>
                {on ? (
                  <ModelChoice
                    vehicleClassName={c.name}
                    imageUrl={c.imageUrl}
                    models={c.models}
                    chargeSen={c.modelChoiceSen}
                    modelId={model?.id ?? null}
                    onChoose={setModelId}
                    onPhotos={(id) => setGallery({ option: c, modelId: id })}
                  />
                ) : null}
              </div>
            );
          })}
        </fieldset>

        <div className="grid gap-4 rounded-[18px] bg-white p-5 shadow-[0_12px_35px_rgba(9,43,39,0.08)] sm:p-6">
          <h2 className="font-(family-name:--font-display) text-[1.5rem]">
            Your details
          </h2>
          <label className="block">
            <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
              Passengers
            </span>
            <NumberField
              bare
              name={TRIP_OPTION_FIELDS.passengers}
              min={1}
              max={maxPassengers}
              required
              value={passengersText}
              onChange={(e) =>
                // Typing past the largest class stops at it; an empty field
                // stays empty so the number can be typed again.
                setPassengersText(
                  Number(e.target.value) > maxPassengers
                    ? String(maxPassengers)
                    : e.target.value,
                )
              }
              className={control}
            />
            {passengersError && (
              <span
                role="alert"
                className="mt-1.5 block text-[0.85rem] text-[#b3261e]"
              >
                {passengersError}
              </span>
            )}
          </label>
          <p className="-mt-2.5 text-[0.85rem] text-[#67726f]">
            Up to {maxPassengers} passengers. Larger group?{" "}
            <LargerGroupLink category={category} search={search} />
          </p>
          {offersChildSeats(category) && (
            <label className="block">
              <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
                Child seats
              </span>
              <Select
                bare
                name={TRIP_OPTION_FIELDS.childSeats}
                defaultValue="0"
                options={Array.from(
                  { length: TRIP_MAX_CHILD_SEATS + 1 },
                  (_, n) => ({
                    value: String(n),
                    label: n === 0 ? "None" : String(n),
                  }),
                )}
                className={control}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
              Flight number{" "}
              <span className="font-normal text-[#67726f]">(optional)</span>
            </span>
            <input
              name={TRIP_OPTION_FIELDS.flightNumber}
              maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
              placeholder="MH 1234"
              autoComplete="off"
              className={`${control} uppercase`}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
              Notes for the driver{" "}
              <span className="font-normal text-[#67726f]">(optional)</span>
            </span>
            <textarea
              name={TRIP_OPTION_FIELDS.notes}
              maxLength={TRIP_MAX_NOTES_LENGTH}
              rows={3}
              placeholder="Meeting point, extra stops, anything we should know"
              className={control}
            />
          </label>
          <button
            type="submit"
            disabled={!canContinue || pending}
            className={`${primaryButton} mt-2`}
          >
            {pending ? (
              <Pending>Preparing your booking…</Pending>
            ) : canContinue && totalSen !== null ? (
              `Continue · ${formatMyr(totalSen)}`
            ) : (
              "Choose a vehicle to continue"
            )}
          </button>
        </div>
      </form>
      {gallery ? (
        <ModelGallery
          key={`${gallery.option.id}:${gallery.modelId ?? ""}`}
          title={gallery.option.name}
          models={gallery.option.models}
          initialModelId={gallery.modelId}
          open
          onOpenChange={(open) => {
            if (!open) setGallery(null);
          }}
        />
      ) : null}
    </TripBar>
  );
}

/**
 * Where a group too large for the category goes: from cars to the coach page
 * with the same trip, from coaches to the team. The only bridge between the
 * two categories. Outside the passengers label, so it is not part of the
 * field's name.
 */
function LargerGroupLink({
  category,
  search,
}: {
  category: TripCategory;
  search: TripSearch;
}) {
  if (category === "car-with-driver") {
    return (
      <Link
        href={tripBookingHref("coach-charter", tripSearchParams(search))}
        className={textLink}
      >
        See coach charter
      </Link>
    );
  }
  return (
    <a
      href={CONTACT.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={textLink}
    >
      Contact us
    </a>
  );
}
