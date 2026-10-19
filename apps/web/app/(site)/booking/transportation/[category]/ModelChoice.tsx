"use client";

import { formatMyr, TRIP_OPTION_FIELDS } from "@repo/db";
import { Radio } from "@repo/ui/field";
import Image from "next/image";
import { ClassPicture } from "../../../../_components/ClassPicture";
import type { GalleryModel } from "../../../../_components/ModelGallery";
import { focus } from "../../../_components/Page";

const tile = `relative grid content-start gap-2 rounded-[12px] border-2 bg-white p-2 transition-colors`;

/** "See 4 photos" over a model's cover, opening the gallery at it. Outside the tile's label, so it does not choose the model. */
function PhotosButton({
  model,
  onPhotos,
}: {
  model: GalleryModel;
  onPhotos: (modelId: string) => void;
}) {
  const count = model.photos.length;
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={() => onPhotos(model.id)}
      aria-label={`See the photos of the ${model.name}`}
      className={`absolute top-3.5 right-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[0.78rem] font-semibold text-[#073c36] shadow ${focus}`}
    >
      {count === 1 ? "See photo" : `See ${count} photos`}
    </button>
  );
}

/** A model's cover photo in a tile's frame; empty with none. */
function Cover({ model }: { model: GalleryModel }) {
  const cover = model.photos[0];
  return (
    <span className="relative block aspect-[3/2] overflow-hidden rounded-[8px] bg-[#f3f6f5]">
      {cover ? (
        <Image
          src={cover.url}
          alt=""
          fill
          sizes="(min-width: 40rem) 200px, 45vw"
          className="object-cover"
        />
      ) : null}
    </span>
  );
}

/**
 * The models of a class the customer has chosen, under its card, each
 * with its cover photo and its photos a tap away. Where the location lets
 * the customer choose, a choice: any model of the class, which the price
 * includes and which comes first, or one of the models at the class's
 * charge. Otherwise the models are shown to look at, as what we may send.
 */
export function ModelChoice({
  vehicleClassName,
  imageUrl,
  models,
  chargeSen,
  modelId,
  onChoose,
  onPhotos,
}: {
  /** "MPV VIP". */
  vehicleClassName: string;
  /** The class's picture, for "Any". */
  imageUrl: string | null;
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
  const grid = "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3";

  if (chargeSen === null) {
    return (
      <div className="border-t border-[#073c36]/15 px-5 pt-4 pb-5">
        <p className={heading}>What we may send</p>
        <p className={note}>
          Whichever of these is free on the day, at the same price.
        </p>
        <ul className={grid}>
          {models.map((model) => (
            <li key={model.id} className={`${tile} border-[#dce3e0]`}>
              <Cover model={model} />
              <span className="px-1 pb-1 text-[0.92rem] font-semibold text-[#082f2b]">
                {model.name}
              </span>
              <PhotosButton model={model} onPhotos={onPhotos} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const option = (on: boolean) =>
    `${tile} cursor-pointer ${
      on ? "border-[#073c36]" : "border-[#dce3e0] hover:border-[#073c36]/50"
    }`;
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
      <div className={grid}>
        <label className={option(modelId === null)}>
          <ClassPicture src={imageUrl} sizes="(min-width: 40rem) 200px, 45vw" />
          <span className="flex items-start gap-2 px-1 pb-1">
            <Radio
              name={TRIP_OPTION_FIELDS.vehicleModel}
              value=""
              checked={modelId === null}
              onChange={() => onChoose(null)}
              className="mt-0.5"
            />
            <span className="grid gap-0.5">
              <span className="text-[0.92rem] font-semibold text-[#082f2b]">
                Any {vehicleClassName}
              </span>
              <span className="text-[0.85rem] text-[#5d6966]">Included</span>
            </span>
          </span>
        </label>
        {models.map((model) => (
          <div key={model.id} className="relative">
            <label className={option(modelId === model.id)}>
              <Cover model={model} />
              <span className="flex items-start gap-2 px-1 pb-1">
                <Radio
                  name={TRIP_OPTION_FIELDS.vehicleModel}
                  value={model.id}
                  checked={modelId === model.id}
                  onChange={() => onChoose(model.id)}
                  className="mt-0.5"
                />
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-[0.92rem] font-semibold text-[#082f2b]">
                    {model.name}
                  </span>
                  <span className="text-[0.85rem] font-semibold text-[#073c36]">
                    +{formatMyr(chargeSen)}
                  </span>
                </span>
              </span>
            </label>
            <PhotosButton model={model} onPhotos={onPhotos} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
