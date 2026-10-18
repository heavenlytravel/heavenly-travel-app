"use client";

import {
  ZONE_LIMITS,
  circleRing,
  isZoneCircle,
  isZoneDistrict,
  isZoneReshaped,
  ringsOf,
  type MultiPolygon,
  type ZoneOrigin,
  type ZoneShape,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { cx } from "@repo/ui/cx";
import { Field, Input, Radio, inputClassName } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { PlaceInput } from "@repo/ui/place-input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Card } from "../../../../../_components/Card";
import { locationTabHref } from "../../../../../_lib/routes";
import {
  createZoneAction,
  districtPolygonsAction,
  placePointAction,
  updateZoneAction,
} from "../actions";
import { ZoneMap, type DistrictChoice, type OtherZone } from "./ZoneMap";
import type { DistrictOutline } from "./map-shapes";
import { sameShape } from "./map-shapes";

/** Where a zone starts: a district, a circle around an address, or a circle or square put on the map. */
type Source = "district" | "address" | "draw";

const SOURCES: { key: Source; label: string; hint: string }[] = [
  {
    key: "district",
    label: "A district",
    hint: "A whole district such as Langkawi or Timur Laut, islands included, by its official boundary.",
  },
  {
    key: "address",
    label: "An address",
    hint: "A circle around an airport, a jetty or a hotel, to reshape from there. The address stays as a reference.",
  },
  {
    key: "draw",
    label: "Draw",
    hint: "A circle or a square in the middle of the map, to move and reshape into a beach strip or a town.",
  },
];

const DEFAULT_RADIUS_M = 1500;

/** How many undos the editor keeps. */
const HISTORY = 30;

/** Where a saved zone started, from what the editor keeps about it. */
function sourceOf(origin: ZoneOrigin | null | undefined): Source {
  if (isZoneDistrict(origin) || isZoneReshaped(origin)) return "district";
  if (isZoneCircle(origin)) return "address";
  return "draw";
}

const cornersOf = (shape: ZoneShape) =>
  ringsOf(shape).reduce((sum, ring) => sum + ring.length - 1, 0);

/** The middle of a shape's corners: for a circle, its centre, near enough once reshaped. */
function centerOf(shape: ZoneShape): { lat: number; lng: number } | null {
  const corners = ringsOf(shape).flatMap((ring) => ring.slice(0, -1));
  if (corners.length === 0) return null;
  const sum = corners.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / corners.length, lng: sum.lng / corners.length };
}

/**
 * The zone maker: a name, and a shape started one of three ways, then
 * reshaped on the map. A district comes in as its official boundary and
 * stays it, read again on every save, until "Reshape by hand" frees it; an
 * address draws a circle of the radius around the place, the address kept
 * as a reference only; "Draw" puts a circle or a square in the view. From
 * there every shape is the admin's own: corners dragged, added at the
 * edges, removed by a right-click, the whole zone moved, each step undone
 * with Undo. A district as it is needs no map; everything else is drawn on
 * it. A saved zone goes back to the Coverage tab.
 */
export function ZoneEditor({
  locationId,
  locationSlug,
  zone,
  districts,
  choices,
  others,
  mapKey,
  hasGoogle,
}: {
  locationId: string;
  /** The location's slug, its address, for the way back to the tab. */
  locationSlug: string;
  /** Absent for a zone that does not exist yet. */
  zone: {
    id: string;
    name: string;
    shape: ZoneShape;
    drawnFrom: ZoneOrigin | null;
  } | null;
  /** The outlines under the map. */
  districts: DistrictOutline[];
  /** The districts the zone may be, by state. */
  choices: DistrictChoice[];
  others: OtherZone[];
  /** The browser key, or null when the map is not set up. */
  mapKey: string | null;
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
}) {
  const router = useRouter();
  const placeInputId = useId();
  const districtSelectId = useId();
  const origin = zone?.drawnFrom ?? null;
  const [name, setName] = useState(zone?.name ?? "");
  const [source, setSource] = useState<Source>(
    zone ? sourceOf(origin) : mapKey ? "address" : "district",
  );

  // A district: the one picked, and whether it is still the boundary as it is.
  const [district, setDistrict] = useState<{
    code: string;
    label: string;
  } | null>(
    isZoneDistrict(origin)
      ? { code: origin.districtCode, label: origin.label }
      : isZoneReshaped(origin)
        ? { code: origin.reshapedFrom, label: origin.label }
        : null,
  );
  const [asItIs, setAsItIs] = useState(!isZoneReshaped(origin));

  // An address: the place, where it is, and the circle's radius.
  const [placeText, setPlaceText] = useState(
    isZoneCircle(origin) ? origin.label : "",
  );
  const [placeId, setPlaceId] = useState<string | undefined>(
    isZoneCircle(origin) ? origin.placeId : undefined,
  );
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    isZoneCircle(origin) && zone ? centerOf(zone.shape) : null,
  );
  const [radius, setRadius] = useState(
    String(isZoneCircle(origin) ? origin.radiusM : DEFAULT_RADIUS_M),
  );

  // The shape, and the shapes before it for Undo.
  const [shape, setShape] = useState<ZoneShape | null>(zone?.shape ?? null);
  // The circle last drawn around the address: while the shape is still it,
  // a new radius redraws it; once reshaped, only "Redraw the circle" does.
  const [circle, setCircle] = useState<ZoneShape | null>(null);
  const [history, setHistory] = useState<ZoneShape[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const radiusM = Number(radius);
  const lockedDistrict = source === "district" && district !== null && asItIs;
  const circleUntouched = circle !== null && sameShape(shape, circle);

  function changeShape(next: ZoneShape | null) {
    if (sameShape(next, shape)) return;
    if (shape) setHistory((was) => [...was, shape].slice(-HISTORY));
    setShape(next);
    setError(null);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((was) => was.slice(0, -1));
    setShape(previous);
  }

  function drawCircle(at: { lat: number; lng: number } | null, metres: number) {
    if (at && Number.isFinite(metres) && metres > 0) {
      const ring = circleRing(at, metres);
      setCircle(ring);
      // A new radius on a circle not yet reshaped is one step, not one per keystroke.
      if (circleUntouched) setShape(ring);
      else changeShape(ring);
    }
  }

  function pickDistrict(code: string) {
    setError(null);
    if (!code) {
      setDistrict(null);
      return;
    }
    startTransition(async () => {
      const result = await districtPolygonsAction(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDistrict({ code, label: result.label });
      setAsItIs(true);
      changeShape(result.polygons satisfies MultiPolygon);
      // The district's name is the natural name; a typed name is kept.
      setName((current) =>
        current === "" || current === district?.label ? result.label : current,
      );
    });
  }

  function pickPlace(next: string, picked: string | undefined) {
    setPlaceText(next);
    setPlaceId(picked);
    setError(null);
    if (!picked) return;
    startTransition(async () => {
      const point = await placePointAction(picked);
      if (!point.ok) {
        setError(point.error);
        return;
      }
      setPlaceText(point.label);
      setCenter(point);
      drawCircle(point, radiusM);
      setName((current) => (current === "" ? point.label : current));
    });
  }

  function save() {
    if (!shape) {
      setError(
        source === "district"
          ? "Pick a district."
          : source === "address"
            ? "Pick a place for the circle."
            : "Put a circle or a square on the map.",
      );
      return;
    }
    const drawnFrom: ZoneOrigin | null =
      source === "district" && district
        ? asItIs
          ? { districtCode: district.code, label: district.label }
          : { reshapedFrom: district.code, label: district.label }
        : source === "address" && placeId
          ? { placeId, label: placeText, radiusM }
          : null;
    const fields = { name, shape, drawnFrom };
    startTransition(async () => {
      const result = zone
        ? await updateZoneAction(locationId, zone.id, fields)
        : await createZoneAction(locationId, fields);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        zone ? `Saved the zone ${name}.` : `Added the zone ${name}.`,
      );
      router.push(locationTabHref(locationSlug, "coverage"));
    });
  }

  const corners = shape ? cornersOf(shape) : 0;

  return (
    <div className="grid gap-6">
      <Card className="grid gap-5">
        <Field label="Name" className="max-w-sm">
          <Input
            required
            autoComplete="off"
            maxLength={ZONE_LIMITS.name}
            placeholder="Langkawi Airport"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium text-neutral-800">
            Start from
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {SOURCES.map((option) => {
              const unavailable = option.key !== "district" && !mapKey;
              const chosen = source === option.key;
              return (
                <label
                  key={option.key}
                  className={cx(
                    "flex items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors",
                    chosen
                      ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                      : "border-neutral-200",
                    unavailable
                      ? "cursor-not-allowed opacity-60"
                      : !chosen && "cursor-pointer hover:border-neutral-300",
                  )}
                >
                  <Radio
                    name="source"
                    checked={chosen}
                    disabled={unavailable}
                    onChange={() => {
                      setSource(option.key);
                      setError(null);
                    }}
                    className="mt-0.5"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-medium text-neutral-900">
                      {option.label}
                    </span>
                    <span className="text-xs text-neutral-600">
                      {unavailable
                        ? "Needs the browser key for Google Maps."
                        : option.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {source === "district" ? (
          <div className="grid gap-3">
            <div className="grid gap-1.5 sm:max-w-sm">
              <label
                htmlFor={districtSelectId}
                className="text-sm font-medium text-neutral-800"
              >
                District
              </label>
              <Select
                id={districtSelectId}
                value={district?.code ?? ""}
                onValueChange={pickDistrict}
                placeholder="Pick a district"
                options={choices.map((group) => ({
                  label: group.state,
                  options: group.districts.map((entry) => ({
                    value: entry.code,
                    label: entry.name,
                  })),
                }))}
              />
              <p className="text-xs text-neutral-500">
                The location&apos;s own states come first; any district may be a
                zone, for an outstation destination.
              </p>
            </div>
            {district && shape ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md bg-neutral-50 px-3 py-2.5 text-sm">
                <p className="min-w-0 flex-1 text-neutral-700">
                  {asItIs
                    ? `The official boundary of ${district.label}, read again on every save, so it always matches.`
                    : `Reshaped by hand from ${district.label}: the shape is yours now, ${corners} corners.`}
                </p>
                {mapKey ? (
                  asItIs ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAsItIs(false)}
                    >
                      Reshape by hand
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pickDistrict(district.code)}
                    >
                      Back to the official boundary
                    </Button>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {source === "address" ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <div className="grid gap-1.5">
              <label
                htmlFor={placeInputId}
                className="text-sm font-medium text-neutral-800"
              >
                Address
              </label>
              <PlaceInput
                id={placeInputId}
                value={placeText}
                placeId={placeId}
                placeholder="Start typing an airport, a jetty, a hotel"
                className={inputClassName}
                onChange={pickPlace}
              />
              {!hasGoogle ? (
                <p className="text-xs text-amber-800">
                  Google is not set up on this server, so the list offers the
                  districts themselves instead of real places.
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  A reference only: the zone is the shape on the map, which you
                  can move and reshape.
                </p>
              )}
            </div>
            <Field
              label="Radius (m)"
              hint={
                center && !circleUntouched ? (
                  <button
                    type="button"
                    onClick={() => drawCircle(center, radiusM)}
                    className="font-medium text-neutral-900 underline-offset-4 hover:underline"
                  >
                    Redraw the circle
                  </button>
                ) : undefined
              }
            >
              <NumberField
                min={ZONE_LIMITS.radiusM.min}
                max={ZONE_LIMITS.radiusM.max}
                step={100}
                value={radius}
                onChange={(event) => {
                  setRadius(event.target.value);
                  if (circleUntouched) {
                    drawCircle(center, Number(event.target.value));
                  }
                }}
              />
            </Field>
          </div>
        ) : null}
      </Card>

      {mapKey ? (
        <ZoneMap
          mapKey={mapKey}
          districts={districts}
          others={others}
          shape={shape}
          editable={!lockedDistrict}
          starters={source === "draw"}
          canUndo={history.length > 0}
          onUndo={undo}
          onShapeChange={changeShape}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : zone ? "Save zone" : "Add zone"}
        </Button>
        <Link
          href={locationTabHref(locationSlug, "coverage")}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        {shape ? (
          <span className="text-xs text-neutral-500 tabular-nums">
            {corners} of {ZONE_LIMITS.corners} corners
          </span>
        ) : null}
        {error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
