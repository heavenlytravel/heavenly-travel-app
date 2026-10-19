"use client";

import { formatMyr, TRIP_OPTION_FIELDS } from "@repo/db";
import { Radio } from "@repo/ui/field";
import type { GalleryModel } from "../../../../_components/ModelGallery";
import { PhotoCarousel } from "../../../../_components/PhotoCarousel";
import { focus } from "../../../_components/Page";

const tile =
  "grid content-start gap-2.5 rounded-[14px] border-2 bg-white p-2.5";
const sizes = "(min-width: 64rem) 340px, (min-width: 40rem) 45vw, 90vw";

/** "View" over a model's photos, opening them large in the gallery. Outside the tile's label, so it does not choose the model. */
function ViewButton({
  model,
  onPhotos,
}: {
  model: GalleryModel;
  onPhotos: (modelId: string) => void;
}) {
  if (model.photos.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => onPhotos(model.id)}
      aria-label={`See the photos of the ${model.name} larger`}
      className={`absolute top-5 right-5 rounded-full bg-white/90 px-3 py-1 text-[0.8rem] font-semibold text-[#073c36] shadow ${focus}`}
    >
      View
    </button>
  );
}

/**
 * The models of a class the customer has chosen, under its card, each in
 * a tile wide enough to see the vehicle, its photos swiped through in
 * place and "View" opening them large. Where the location lets the
 * customer choose, a choice: any model of the class first, which the price
 * includes, or one of the models at the class's charge. Otherwise the
 * models are shown to look at, as what we may send.
 */
export function ModelChoice({
  vehicleClassName,
  models,
  chargeSen,
  modelId,
  onChoose,
  onPhotos,
}: {
  /** "MPV VIP". */
  vehicleClassName: string;
  models: readonly GalleryModel[];
  /** What choosing a model adds; null when the customer cannot choose here. */
  chargeSen: number | null;
  /** The model chosen; null for any. */
  modelId: string | null;
  onChoose: (modelId: string | null) => void;
  onPhotos: (modelId: string) => void;
}) {
  if (models.length === 0) return null;
  const heading = "text-[0.98rem] font-semibold text-[#082f2b]";
  const note = "mt-0.5 text-[0.88rem] text-[#5d6966]";
  const grid = "mt-3 grid gap-3 sm:grid-cols-2";
  const name = "text-[0.98rem] font-semibold text-[#082f2b]";

  if (chargeSen === null) {
    return (
      <div className="border-t border-[#073c36]/15 px-5 pt-4 pb-5">
        <p className={heading}>What we may send</p>
        <p className={note}>
          Whichever of these is free on the day, at the same price.
        </p>
        <ul className={grid}>
          {models.map((model) => (
            <li key={model.id} className={`relative ${tile} border-[#dce3e0]`}>
              <PhotoCarousel
                name={model.name}
                photos={model.photos}
                sizes={sizes}
              />
              <span className={`px-1 pb-0.5 ${name}`}>{model.name}</span>
              <ViewButton model={model} onPhotos={onPhotos} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const chosen = (on: boolean) =>
    on ? "border-[#073c36]" : "border-[#dce3e0] hover:border-[#073c36]/50";
  return (
    <fieldset className="border-t border-[#073c36]/15 px-5 pt-4 pb-5">
      <legend className="sr-only">Model</legend>
      <p className={heading}>
        Choose your model{" "}
        <span className="font-normal text-[#67726f]">(optional)</span>
      </p>
      <p className={note}>
        Any {vehicleClassName} is in the price. To ride in a particular model,
        choose it for {formatMyr(chargeSen)} more.
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
          <span className="text-[0.88rem] text-[#5d6966]">
            Included: whichever is free on the day
          </span>
        </span>
      </label>
      <div className={grid}>
        {models.map((model) => (
          <div key={model.id} className="relative">
            <label
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
                  name={TRIP_OPTION_FIELDS.vehicleModel}
                  value={model.id}
                  checked={modelId === model.id}
                  onChange={() => onChoose(model.id)}
                  className="mt-1"
                />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                  <span className={name}>{model.name}</span>
                  <span className="text-[0.92rem] font-semibold text-[#073c36]">
                    +{formatMyr(chargeSen)}
                  </span>
                </span>
              </span>
            </label>
            <ViewButton model={model} onPhotos={onPhotos} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
