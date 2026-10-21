"use client";

import {
  ZONE_LIMITS,
  andList,
  circleRing,
  isZoneCircle,
  isZoneDistrict,
  isZoneReshaped,
  ringsOf,
  type MultiPolygon,
  type ZoneOrigin,
  type ZoneShape,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { cx } from "@repo/ui/cx";
import { Checkbox, Field, Input, Radio, inputClassName } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { PlaceInput } from "@repo/ui/place-input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Card } from "../../../../../_components/Card";
import { locationTabHref } from "../../../../../_lib/routes";
import {
  createZoneAction,
  cutOutAction,
  districtPolygonsAction,
  mukimPolygonsAction,
  placePointAction,
  updateZoneAction,
  type ZoneSaved,
} from "../actions";
import {
  ZoneMap,
  type DistrictChoice,
  type MukimChoice,
  type OtherZone,
} from "./ZoneMap";
import type { DistrictOutline } from "./map-shapes";
import { sameShape } from "./map-shapes";
import { FormError } from "../../../../../_components/FormError";
import { pricedFromSentence, type PricedFrom } from "../zone-lines";

/** A zone the last save found this one overlapping: its id, and its name as the refusal gave it. */
type InTheWay = NonNullable<
  Extract<ZoneSaved, { ok: false }>["overlaps"]
>[number];

/** Where a zone starts: a district or its mukims, a circle around an address, or a circle or square put on the map. */
type Source = "district" | "address" | "draw";

/** What of the district a zone is: all of it, or the mukims ticked. */
type Area = "whole" | "some";

const SOURCES: { key: Source; label: string; hint: string }[] = [
  {
    key: "district",
    label: "A district or mukim",
    hint: "A whole district such as Langkawi or Timur Laut, or some of its mukims, by the official boundaries, islands included.",
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

/** The name the editor gives a zone after what it was made from: the district, its mukims or the place. */
function suggestionOf(
  origin: ZoneOrigin | null | undefined,
  mukims: readonly MukimChoice[],
): string {
  const codes = mukimCodesOf(origin);
  if (codes.length > 0) {
    return andList(
      mukims
        .filter((mukim) => codes.includes(mukim.code))
        .map((mukim) => mukim.name),
    );
  }
  if (
    isZoneDistrict(origin) ||
    isZoneReshaped(origin) ||
    isZoneCircle(origin)
  ) {
    return origin.label;
  }
  return "";
}

/** The mukims a saved zone was made of; none for a whole district or any other zone. */
function mukimCodesOf(origin: ZoneOrigin | null | undefined): string[] {
  return isZoneDistrict(origin) || isZoneReshaped(origin)
    ? (origin.mukimCodes ?? [])
    : [];
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
 * reshaped on the map. A district comes in as its official boundary, or
 * some of its mukims put together as theirs, and stays it, read again on
 * every save, until it is changed on the map, which makes the boundary a
 * reference; a mukim is ticked in the list or clicked on the map. An address draws a circle of the radius
 * around the place, the address kept as a reference only; "Draw" puts a
 * square or a circle in the view. From there every shape is the admin's
 * own, edited piece by piece on the map (./ZoneMap): corners dragged,
 * added and removed with a right-click, a piece moved alone, resized,
 * deleted, or added, each step undone with Undo. A zone may not overlap any
 * other, this location's or another's: when the save is refused for it,
 * either "Cut them out of this zone" takes their ground off this one, to
 * check on the map before saving, or "Cut this zone out of them" saves
 * this one as it is and takes its ground off them, after asking: a small
 * zone drawn inside a big one keeps its shape. A district as it is
 * needs no map; everything else is drawn on it. A saved zone goes back to
 * the Coverage tab.
 */
export function ZoneEditor({
  locationId,
  locationSlug,
  zone,
  mukims: initialMukims,
  districts,
  choices,
  others,
  mapKey,
  hasGoogle,
  pricedFrom,
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
  /** The mukims of the district the zone was made from; none for any other zone. */
  mukims: MukimChoice[];
  /** The outlines under the map. */
  districts: DistrictOutline[];
  /** The districts the zone may be, by state. */
  choices: DistrictChoice[];
  others: OtherZone[];
  /** The browser key, or null when the map is not set up. */
  mapKey: string | null;
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
  /** The other locations whose grids end at the zone: their routes follow its shape. */
  pricedFrom: PricedFrom;
}) {
  const router = useRouter();
  const placeInputId = useId();
  const districtSelectId = useId();
  const origin = zone?.drawnFrom ?? null;
  const [name, setName] = useState(zone?.name ?? "");
  const [source, setSource] = useState<Source>(
    zone ? sourceOf(origin) : mapKey ? "address" : "district",
  );

  // A district: the one picked, its mukims, and what of it the zone is.
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
  const [mukims, setMukims] = useState(initialMukims);
  const [picked, setPicked] = useState<string[]>(mukimCodesOf(origin));
  const [area, setArea] = useState<Area>(
    mukimCodesOf(origin).length > 0 ? "some" : "whole",
  );
  // The district's or the mukims' boundary as last read: while the shape
  // is still it, the zone is the boundary as it is; an edit on the map
  // makes it the admin's own. Unknown for a zone saved reshaped.
  const [official, setOfficial] = useState<ZoneShape | null>(
    isZoneDistrict(origin) && zone ? zone.shape : null,
  );
  // The name the editor last suggested, after what the zone was made from:
  // a name typed over it is kept.
  const [suggested, setSuggested] = useState(() =>
    suggestionOf(origin, initialMukims),
  );

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
  // Counts the shapes the map should frame: a district or a place newly
  // picked, not an edit, a tick or an undo.
  const [frame, setFrame] = useState(0);
  const reframe = () => setFrame((count) => count + 1);
  const [error, setError] = useState<string | null>(null);
  // The zones the last save found this one overlapping: to cut out of
  // this one, or to cut this one out of.
  const [overlaps, setOverlaps] = useState<InTheWay[] | null>(null);
  const [confirmDialog, confirm] = useConfirm();
  const [pending, startTransition] = useTransition();
  // Each preview asked of the server is numbered; an answer that arrives
  // after a newer question is dropped, so quick ticks end on the last.
  const asked = useRef(0);

  const radiusM = Number(radius);
  const asItIs =
    source === "district" &&
    district !== null &&
    official !== null &&
    sameShape(shape, official);
  const circleUntouched = circle !== null && sameShape(shape, circle);
  const pickedNames = mukims
    .filter((mukim) => picked.includes(mukim.code))
    .map((mukim) => mukim.name);

  function changeShape(next: ZoneShape | null) {
    if (sameShape(next, shape)) return;
    if (shape) setHistory((was) => [...was, shape].slice(-HISTORY));
    setShape(next);
    setError(null);
    setOverlaps(null);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((was) => was.slice(0, -1));
    setShape(previous);
  }

  /** Names the zone after what it was made from, unless a name was typed over the last suggestion. */
  function suggest(next: string) {
    setName((current) =>
      current === "" || current === suggested ? next : current,
    );
    setSuggested(next);
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

  /** Asks the server for a preview; the answer is applied unless a newer question was asked meanwhile. */
  function preview<T extends object>(
    question: Promise<T>,
    apply: (answer: Exclude<T, { error: string }>) => void,
  ) {
    const ask = ++asked.current;
    setError(null);
    setOverlaps(null);
    startTransition(async () => {
      const answer = await answerOf(question);
      if (ask !== asked.current) return;
      if ("error" in answer) {
        setError((answer as { error: string }).error);
        return;
      }
      apply(answer as Exclude<T, { error: string }>);
    });
  }

  function pickDistrict(code: string) {
    if (!code) {
      setDistrict(null);
      return;
    }
    preview(districtPolygonsAction(code), (result) => {
      setDistrict({ code, label: result.label });
      setMukims(result.mukims);
      setArea("whole");
      setPicked([]);
      setOfficial(result.polygons);
      changeShape(result.polygons satisfies MultiPolygon);
      reframe();
      suggest(result.label);
    });
  }

  function showWhole() {
    if (!district) return;
    setArea("whole");
    preview(districtPolygonsAction(district.code), (result) => {
      setOfficial(result.polygons);
      changeShape(result.polygons);
      reframe();
      suggest(district.label);
    });
  }

  function showMukims(codes: string[]) {
    if (!district) return;
    // In the district's order, whatever order they were ticked in.
    const ordered = mukims
      .filter((mukim) => codes.includes(mukim.code))
      .map((mukim) => mukim.code);
    setArea("some");
    setPicked(ordered);
    if (ordered.length === 0) {
      asked.current++;
      changeShape(null);
      return;
    }
    const names = mukims
      .filter((mukim) => ordered.includes(mukim.code))
      .map((mukim) => mukim.name);
    preview(mukimPolygonsAction(district.code, ordered), (result) => {
      setOfficial(result.polygons);
      changeShape(result.polygons);
      suggest(andList(names));
    });
  }

  function toggleMukim(code: string) {
    showMukims(
      picked.includes(code)
        ? picked.filter((c) => c !== code)
        : [...picked, code],
    );
  }

  function pickPlace(next: string, pickedId: string | undefined) {
    setPlaceText(next);
    setPlaceId(pickedId);
    if (!pickedId) return;
    preview(placePointAction(pickedId), (point) => {
      setPlaceText(point.label);
      setCenter(point);
      drawCircle(point, radiusM);
      reframe();
      suggest(point.label);
    });
  }

  function cutThemOut() {
    if (!shape || !overlaps) return;
    const cut = overlaps.map((other) => other.label);
    // With others' ground taken off, a district's boundary is the admin's
    // own shape, as after any change.
    preview(cutOutAction(JSON.stringify(shape), zone?.id ?? null), (result) => {
      changeShape(result.polygons);
      toast.success(
        `Cut ${andList(cut)} out of this zone. Check it on the map, then save.`,
      );
    });
  }

  /**
   * Keeps this zone as it is on the map and saves it, the zones in the way
   * losing the ground it covers, once the admin agrees: it changes them too.
   */
  async function cutOutOfThem() {
    if (!overlaps) return;
    const labels = overlaps.map((other) => other.label);
    const one = overlaps.length === 1;
    const go = await confirm({
      title: one
        ? `Cut this zone out of ${labels[0]}?`
        : `Cut this zone out of ${overlaps.length} zones?`,
      description: `${andList(labels)} ${one ? "loses" : "lose"} the ground this zone covers and ${one ? "keeps its" : "keep their"} rates; a pickup there becomes this zone's. This zone is saved as it is on the map.`,
      action: "Cut and save",
    });
    if (go) save(overlaps);
  }

  /** Saves the zone; `cutFrom`, the zones in the way, to cut it out of them. */
  function save(cutFrom?: readonly InTheWay[]) {
    if (!shape) {
      setError(
        source === "district"
          ? district && area === "some"
            ? "Tick at least one mukim."
            : "Pick a district."
          : source === "address"
            ? "Pick a place for the circle."
            : "Put a circle or a square on the map.",
      );
      return;
    }
    const mukimCodes = area === "some" ? { mukimCodes: picked } : {};
    const drawnFrom: ZoneOrigin | null =
      source === "district" && district
        ? asItIs
          ? {
              districtCode: district.code,
              ...mukimCodes,
              label: district.label,
            }
          : {
              reshapedFrom: district.code,
              ...mukimCodes,
              label: district.label,
            }
        : source === "address" && placeId
          ? { placeId, label: placeText, radiusM }
          : null;
    const fields = JSON.stringify({ name, shape, drawnFrom });
    const cutIds = cutFrom?.map((other) => other.id);
    startTransition(async () => {
      const result = await answerOf(
        zone
          ? updateZoneAction(locationId, zone.id, fields, cutIds)
          : createZoneAction(locationId, fields, cutIds),
      );
      if ("error" in result) {
        setError(result.error);
        setOverlaps("overlaps" in result ? (result.overlaps ?? null) : null);
        return;
      }
      const cut = cutFrom
        ? ` and cut it out of ${andList(cutFrom.map((other) => other.label))}`
        : "";
      toast.success(
        zone
          ? `Saved the zone ${name}${cut}.`
          : `Added the zone ${name}${cut}.`,
      );
      router.push(locationTabHref(locationSlug, "coverage"));
    });
  }

  const corners = shape ? cornersOf(shape) : 0;
  const madeOf =
    district && area === "some" && pickedNames.length > 0
      ? `${andList(pickedNames)} in ${district.label}`
      : district?.label;

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
                      setOverlaps(null);
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
          <div className="grid gap-4">
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
            {district && mukims.length > 0 ? (
              <fieldset className="grid gap-1">
                <legend className="mb-1.5 text-sm font-medium text-neutral-800">
                  Area
                </legend>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <Radio
                    name="area"
                    checked={area === "whole"}
                    onChange={showWhole}
                    className="mt-0.5"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-medium text-neutral-900">
                      The whole district
                    </span>
                    <span className="text-xs text-neutral-600">
                      {district.label} by its official boundary, islands
                      included.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <Radio
                    name="area"
                    checked={area === "some"}
                    onChange={() => showMukims(picked)}
                    className="mt-0.5"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-medium text-neutral-900">
                      Some of its mukims
                    </span>
                    <span className="text-xs text-neutral-600">
                      Tick one or more; together they make one zone.
                    </span>
                  </span>
                </label>
                {area === "some" ? (
                  <div className="mt-1 ml-6 grid gap-x-5 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
                    {mukims.map((mukim) => (
                      <label
                        key={mukim.code}
                        className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                      >
                        <Checkbox
                          checked={picked.includes(mukim.code)}
                          onChange={() => toggleMukim(mukim.code)}
                        />
                        <span className="min-w-0 flex-1 truncate text-neutral-900">
                          {mukim.name}
                        </span>
                        <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-px text-[11px] text-neutral-500">
                          {mukim.kind}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </fieldset>
            ) : district ? (
              <p className="text-xs text-neutral-500">
                {district.label} has no mukims in the boundary data, so the zone
                is the whole district.
              </p>
            ) : null}
            {district && shape ? (
              <p className="rounded-md bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
                {asItIs
                  ? `The official boundary of ${madeOf}, read again on every save while it is not changed on the map.`
                  : `Changed on the map from ${madeOf}: the shape is yours now, ${corners} corners. Picking the district or its mukims again starts over from their boundaries.`}
              </p>
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

        {pricedFrom.length > 0 ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
            {pricedFromSentence(pricedFrom)}: a new shape moves where those
            trips end, and removing the zone removes those routes.
          </p>
        ) : null}
      </Card>

      {mapKey ? (
        <ZoneMap
          mapKey={mapKey}
          districts={districts}
          others={others}
          shape={shape}
          frame={frame}
          starters={source === "draw"}
          canUndo={history.length > 0}
          onUndo={undo}
          onShapeChange={changeShape}
          mukims={
            source === "district" && district && area === "some"
              ? mukims
              : undefined
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => save()} disabled={pending}>
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
        <FormError error={error} />
      </div>
      {overlaps ? (
        <div className="-mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={cutThemOut}
            disabled={pending}
          >
            {overlaps.length === 1
              ? `Cut ${overlaps[0]?.label} out of this zone`
              : "Cut them out of this zone"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={cutOutOfThem}
            disabled={pending}
          >
            {overlaps.length === 1
              ? `Cut this zone out of ${overlaps[0]?.label}`
              : "Cut this zone out of them"}
          </Button>
        </div>
      ) : null}
      {confirmDialog}
    </div>
  );
}
