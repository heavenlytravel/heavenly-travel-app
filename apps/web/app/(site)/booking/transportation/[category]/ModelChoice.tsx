"use client";

import { formatMyr, TRIP_OPTION_FIELDS } from "@repo/db";
import { Radio } from "@repo/ui/field";
import { useId, useRef, useState, type ReactNode } from "react";
import type { GalleryModel } from "../../../../_components/ModelGallery";
import { PhotoCarousel } from "../../../../_components/PhotoCarousel";
import { focus, secondaryButton } from "../../../_components/Page";

const tile =
  "grid content-start gap-2.5 rounded-[14px] border-2 bg-white p-2.5";
const sizes = "(min-width: 64rem) 340px, (min-width: 40rem) 45vw, 90vw";
/** The models shown before "Show all": two rows of two. */
const FIRST_MODELS = 4;

/** "View" over a model's photos, opening them large in the gallery, that model's alone. Outside the tile's label, so it does not choose the model. */
function ViewButton({
  model,
  onPhotos,
}: {
  model: GalleryModel;
  onPhotos: (model: GalleryModel) => void;
}) {
  if (model.photos.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => onPhotos(model)}
      aria-label={`See the photos of the ${model.name} larger`}
      className={`absolute top-5 right-5 rounded-full bg-white/90 px-3 py-1 text-[0.8rem] font-semibold text-brand shadow ${focus}`}
    >
      View
    </button>
  );
}

/**
 * The models' tiles, two to a row from a tablet up: the first few, and
 * "Show all" for the rest when there are more, so a class with ten models
 * does not push the next class far down the page. Shown, the rest stay
 * shown, and the focus moves to the first of them. A model chosen among
 * them keeps them shown when the grid comes back, the class closed and
 * opened again by a change of passengers, so the choice stays in the
 * form and in its price.
 */
function ModelGrid({
  models,
  chosenId = null,
  tile,
}: {
  models: readonly GalleryModel[];
  /** The model chosen, if any. */
  chosenId?: string | null;
  /** A model's `<li>`. */
  tile: (model: GalleryModel) => ReactNode;
}) {
  const [all, setAll] = useState(
    () => models.findIndex((model) => model.id === chosenId) >= FIRST_MODELS,
  );
  const list = useRef<HTMLUListElement>(null);
  const shown = all ? models : models.slice(0, FIRST_MODELS);

  function showAll() {
    setAll(true);
    // Once the rest are drawn, the focus goes to the first of them.
    requestAnimationFrame(() => {
      const first = list.current?.children[FIRST_MODELS];
      (
        first?.querySelector("input") ?? first?.querySelector("button")
      )?.focus();
    });
  }

  return (
    <>
      <ul ref={list} className="mt-3 grid gap-3 sm:grid-cols-2">
        {shown.map(tile)}
      </ul>
      {shown.length < models.length ? (
        <button
          type="button"
          onClick={showAll}
          className={`mt-3 w-full ${secondaryButton}`}
        >
          Show all {models.length} models
        </button>
      ) : null}
    </>
  );
}

/**
 * The models of a class the customer has chosen, under its card, each in
 * a tile wide enough to see the vehicle, its photos swiped through in
 * place and "View" opening them large. Where the location lets the
 * customer choose, a choice: any model of the class first, which the price
 * includes, or one of the models at the class's charge, chosen by a tap
 * anywhere on its tile but the photo arrows. Otherwise the models are
 * shown to look at, as what we may send.
 */
export function ModelChoice({
  vehicleClassName,
  models,
  chargeSen,
  chargePercent,
  modelId,
  onChoose,
  onPhotos,
}: {
  /** "MPV VIP". */
  vehicleClassName: string;
  models: readonly GalleryModel[];
  /** What choosing a model adds; null when the customer cannot choose here. */
  chargeSen: number | null;
  /** The share of the fare it is, 10 for 10%; null for an amount of its own. */
  chargePercent: number | null;
  /** The model chosen; null for any. */
  modelId: string | null;
  onChoose: (modelId: string | null) => void;
  onPhotos: (model: GalleryModel) => void;
}) {
  const radioIds = useId();
  if (models.length === 0) return null;
  const heading = "text-[0.98rem] font-semibold text-ink";
  const note = "mt-0.5 text-[0.88rem] text-slate-600";
  const name = "text-[0.98rem] font-semibold text-ink";

  if (chargeSen === null) {
    return (
      <div className="border-t border-brand/15 px-5 pt-4 pb-5">
        <p className={heading}>What we may send</p>
        <p className={note}>
          Whichever of these is free on the day, at the same price.
        </p>
        <ModelGrid
          models={models}
          tile={(model) => (
            <li key={model.id} className={`relative ${tile} border-slate-200`}>
              <PhotoCarousel
                name={model.name}
                photos={model.photos}
                sizes={sizes}
              />
              <span className={`px-1 pb-0.5 ${name}`}>{model.name}</span>
              <ViewButton model={model} onPhotos={onPhotos} />
            </li>
          )}
        />
      </div>
    );
  }

  const chosen = (on: boolean) =>
    on ? "border-brand" : "border-slate-200 hover:border-brand/50";
  return (
    <fieldset className="border-t border-brand/15 px-5 pt-4 pb-5">
      <legend className="sr-only">Model</legend>
      <p className={heading}>
        Choose your model{" "}
        <span className="font-normal text-slate-500">(optional)</span>
      </p>
      <p className={note}>
        Any {vehicleClassName} is in the price. To ride in a particular model,
        choose it for {formatMyr(chargeSen)} more
        {chargePercent !== null ? `, ${chargePercent}% of the fare` : ""}.
      </p>
      <label
        className={`mt-3 flex cursor-pointer items-start gap-3 rounded-[14px] border-2 bg-white px-4 py-3 ${chosen(modelId === null)}`}
      >
        <Radio
          name={TRIP_OPTION_FIELDS.vehicleModel}
          value=""
          checked={modelId === null}
          onChange={() => onChoose(null)}
          className="mt-1"
        />
        <span className="grid gap-0.5">
          <span className={name}>Any {vehicleClassName}</span>
          <span className="text-[0.88rem] text-slate-600">
            Included: whichever is free on the day
          </span>
        </span>
      </label>
      <ModelGrid
        models={models}
        chosenId={modelId}
        tile={(model) => {
          // The label names its radio: left to itself it would take the
          // photo arrows, its first buttons, and a tap would page the photos.
          // The radio is named by the model and its charge alone, without
          // the arrows' names.
          const radioId = `${radioIds}${model.id}`;
          const nameId = `${radioId}-name`;
          return (
            <li key={model.id} className="relative">
              <label
                htmlFor={radioId}
                className={`${tile} cursor-pointer ${chosen(modelId === model.id)}`}
              >
                <PhotoCarousel
                  name={model.name}
                  photos={model.photos}
                  sizes={sizes}
                  decorative
                />
                <span className="flex items-start gap-2.5 px-1 pb-0.5">
                  <Radio
                    id={radioId}
                    aria-labelledby={nameId}
                    name={TRIP_OPTION_FIELDS.vehicleModel}
                    value={model.id}
                    checked={modelId === model.id}
                    onChange={() => onChoose(model.id)}
                    className="mt-1"
                  />
                  <span
                    id={nameId}
                    className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3"
                  >
                    <span className={name}>{model.name}</span>
                    <span className="text-[0.92rem] font-semibold text-brand">
                      +{formatMyr(chargeSen)}
                    </span>
                  </span>
                </span>
              </label>
              <ViewButton model={model} onPhotos={onPhotos} />
            </li>
          );
        }}
      />
    </fieldset>
  );
}
