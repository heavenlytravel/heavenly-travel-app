"use client";

import { inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useState, useTransition } from "react";
import type { PlaceCheck } from "../../../_lib/place-check";
import { checkLocationPlaceAction } from "../actions";

type CheckedPlace = Extract<PlaceCheck, { ok: true }>;

/** "Langkawi, Kedah. Pickups there are on." */
export function districtSentence(district: {
  name: string;
  stateName: string;
  isActive: boolean;
}) {
  return `${district.name}, ${district.stateName}. Pickups there are ${
    district.isActive ? "on" : "off"
  }.`;
}

/**
 * The place of a location: the console's place search with areas allowed,
 * since a location is a town, an island or an area of a city. Picking a
 * place shows the district its pin falls in and whether pickups there are
 * on. The form receives the pick as `placeId`, and only while it is a place
 * a location can take: one that falls in a district, and not the place the
 * location already has.
 */
export function LocationPlaceField({
  current,
  hasGoogle,
  onPlace,
}: {
  /** The place the location has; absent on the "new" page. */
  current?: { placeId: string; label: string };
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
  /**
   * Called with each place that can be the location's as it is picked, and
   * with null when the field no longer holds one.
   */
  onPlace?: (place: CheckedPlace | null) => void;
}) {
  const inputId = useId();
  const [value, setValue] = useState(current?.label ?? "");
  const [placeId, setPlaceId] = useState(current?.placeId);
  const [result, setResult] = useState<PlaceCheck | null>(null);
  const [checking, startCheck] = useTransition();

  const picked = placeId !== undefined && placeId !== current?.placeId;
  const usable = picked && result?.ok === true && result.district !== null;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-800">
        Place
      </label>
      <PlaceInput
        id={inputId}
        value={value}
        placeId={placeId}
        includeAreas
        placeholder="Start typing a town, an island or an area"
        className={inputClassName}
        onChange={(next, pickedId) => {
          setValue(next);
          setPlaceId(pickedId);
          setResult(null);
          onPlace?.(null);
          if (!pickedId || pickedId === current?.placeId) return;
          startCheck(async () => {
            const check = await checkLocationPlaceAction(pickedId);
            setResult(check);
            if (check.ok && check.district) onPlace?.(check);
          });
        }}
      />
      {usable ? <input type="hidden" name="placeId" value={placeId} /> : null}

      {!hasGoogle ? (
        <p className="text-xs text-amber-800">
          Google is not set up on this server, so the list offers the districts
          themselves instead of real places.
        </p>
      ) : null}
      {checking ? (
        <p className="text-xs text-neutral-500">Checking…</p>
      ) : result === null ? (
        current && placeId === undefined ? (
          <p className="text-xs text-neutral-500">
            Pick a place from the list, or the place stays {current.label}.
          </p>
        ) : null
      ) : !result.ok ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {result.error}
        </p>
      ) : result.district ? (
        <div aria-live="polite" className="grid gap-0.5 text-xs">
          <p className="text-neutral-600">{result.address}</p>
          <p className="font-medium text-neutral-900">
            {districtSentence(result.district)}
          </p>
        </div>
      ) : (
        <p aria-live="polite" className="text-xs text-red-700">
          That place is in no district: at sea, or outside Malaysia. Pick
          another.
        </p>
      )}
    </div>
  );
}
