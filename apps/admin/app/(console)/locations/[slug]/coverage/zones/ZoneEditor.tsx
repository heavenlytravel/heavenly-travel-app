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
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { cx } from "@repo/ui/cx";
import { Checkbox, Field, Input, Radio, inputClassName } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { PlaceInput } from "@repo/ui/place-input";
import { Tooltip } from "@repo/ui/tooltip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Card } from "../../../../../_components/Card";
import { locationTabHref } from "../../../../../_lib/routes";
import {
  checkOverlapsAction,
  createZoneAction,
  districtPolygonsAction,
  mukimPolygonsAction,
  placePointAction,
  updateZoneAction,
  type OverlapAnswer,
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

/** What the check after a change found in the way of a shape, with the shape it was asked for. */
type Overlap = Extract<OverlapAnswer, { ok: true }> & { of: ZoneShape };

/**
 * How long after a change of the shape what is in its way is checked: a
 * radius typed is one check, not one a keystroke.
 */
const CHECK_DELAY_MS = 300;

/** Whether `ids` names the zones, all of them and no other. */
const sameZones = (ids: readonly string[], zones: readonly { id: string }[]) =>
  ids.length === zones.length && zones.every((zone) => ids.includes(zone.id));

/** Where a zone starts: a district or its mukims, a circle around an address, or a circle or square put on the map. */
type Source = "district" | "address" | "draw";

/** What of the district a zone is: all of it, or the mukims ticked. */
type Area = "whole" | "some";

/** A district, with its mukims to tick, and those ticked: none for the whole district. */
type DistrictPick = {
  district: { code: string; label: string };
  mukims: MukimChoice[];
  picked: string[];
};

/**
 * The boundary a shape was read from: while the shape is still it, the
 * zone is the boundary as it is. Each step of Undo and Redo keeps the
 * boundary its shape came with, so stepping back over a pick brings the
 * pick back too.
 */
type Boundary = DistrictPick & { shape: ZoneShape };

/** One step of Undo or Redo: a shape and the boundary it came with. */
type Step = { shape: ZoneShape; boundary: Boundary | null };

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
 * deleted, or added, each step undone with Undo and done again with Redo. A zone may not overlap any
 * other, this location's or another's: a moment after every change the
 * server says what is in its way, by the check the save makes, and a bar
 * over the map's tools names it, so one side gives up the shared ground.
 * "Trim this zone" takes their ground off this one; "Trim <zone>" shows the
 * zones in the way trimmed of this one's ground, and the save trims them,
 * so a small zone drawn inside a big one keeps its shape. Either is
 * checked on the map before anything is saved, and a choice to trim them
 * holds through further edits while the same zones are in the way. A
 * district as it is needs no map, and the bar shows under Save instead;
 * everything else is drawn on it. A saved zone goes back to the Coverage
 * tab.
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
  // The boundary the shape came from, as last read: what the zone is made
  // from, whatever the controls above show after a request that failed.
  // An edit on the map makes the shape the admin's own. Unknown for a zone
  // saved reshaped.
  const [boundary, setBoundary] = useState<Boundary | null>(
    isZoneDistrict(origin) && zone
      ? {
          district: { code: origin.districtCode, label: origin.label },
          mukims: initialMukims,
          picked: mukimCodesOf(origin),
          shape: zone.shape,
        }
      : null,
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

  // The shape, the shapes before it for Undo, and the shapes Undo took
  // back for Redo, which a new change forgets.
  const [shape, setShape] = useState<ZoneShape | null>(zone?.shape ?? null);
  // The circle last drawn around the address: while the shape is still it,
  // a new radius redraws it; once reshaped, only "Redraw the circle" does.
  const [circle, setCircle] = useState<ZoneShape | null>(null);
  const [history, setHistory] = useState<Step[]>([]);
  const [future, setFuture] = useState<Step[]>([]);
  // Counts the shapes the map should frame: a district or a place newly
  // picked, not an edit, a tick or an undo.
  const [frame, setFrame] = useState(0);
  const reframe = () => setFrame((count) => count + 1);
  const [error, setError] = useState<string | null>(null);
  // What the last check found in the shape's way, and the zones in the way
  // the admin chose to trim: shown trimmed on the map, and trimmed by the
  // save, while the same zones are in the way. A save that finds zones the
  // check had not yet asks it again.
  const [overlap, setOverlap] = useState<Overlap | null>(null);
  const [trimIds, setTrimIds] = useState<string[] | null>(null);
  const [recheck, setRecheck] = useState(0);
  const [pending, startTransition] = useTransition();
  // Each preview and each check asked of the server is numbered; an answer
  // that arrives after a newer question is dropped, so quick ticks end on
  // the last.
  const asked = useRef(0);
  const checked = useRef(0);
  const zoneId = zone?.id ?? null;

  const radiusM = Number(radius);
  const asItIs =
    source === "district" &&
    boundary !== null &&
    sameShape(shape, boundary.shape);
  // What the zone is made from: the boundary its shape came from, else,
  // for a zone saved reshaped, the district and mukims it names.
  const madeFrom: DistrictPick | null =
    boundary ??
    (district
      ? { district, mukims, picked: area === "some" ? picked : [] }
      : null);
  const circleUntouched = circle !== null && sameShape(shape, circle);
  // What is in the way of the shape as last checked, shown until the shape
  // as it is now is checked; trimming this zone waits for that.
  const inTheWay =
    shape && overlap && overlap.zones.length > 0 ? overlap : null;
  const checkedNow = inTheWay !== null && sameShape(inTheWay.of, shape);
  const theirs = inTheWay?.trimOthers;
  const trimming =
    theirs?.ok && inTheWay && trimIds && sameZones(trimIds, inTheWay.zones)
      ? theirs.zones
      : null;
  const trimLabels = trimming
    ? andList(trimming.map((other) => other.label))
    : "";

  // A moment after every change of the shape, what is in its way, by the
  // check the save makes, so an overlap shows while the zone is drawn. An
  // answer for a shape changed since is dropped; a check that did not go
  // through says nothing, and the save checks again.
  useEffect(() => {
    const ask = ++checked.current;
    if (!shape) return;
    const of = shape;
    const timer = window.setTimeout(async () => {
      const answer = await answerOf(
        checkOverlapsAction(locationId, JSON.stringify(of), zoneId),
      );
      if (ask !== checked.current || !("ok" in answer) || !answer.ok) return;
      setOverlap({ ...answer, of });
      setTrimIds((ids) => (ids && sameZones(ids, answer.zones) ? ids : null));
    }, CHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [shape, recheck, locationId, zoneId]);

  /** Puts a shape on the map; the check of it follows. */
  function show(next: ZoneShape | null) {
    setShape(next);
    setError(null);
  }

  /** A change of the shape, one step of Undo; `from`, a boundary newly read. */
  function changeShape(
    next: ZoneShape | null,
    from: Boundary | null = boundary,
  ) {
    setBoundary(from);
    if (sameShape(next, shape)) return;
    if (shape) {
      setHistory((was) => [...was, { shape, boundary }].slice(-HISTORY));
    }
    setFuture([]);
    show(next);
  }

  /** Brings back a step of Undo or Redo, the pick it came with in the controls. */
  function restore(step: Step) {
    setBoundary(step.boundary);
    if (step.boundary && step.boundary !== boundary) {
      setDistrict(step.boundary.district);
      setMukims(step.boundary.mukims);
      setPicked(step.boundary.picked);
      setArea(step.boundary.picked.length > 0 ? "some" : "whole");
    }
    show(step.shape);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((was) => was.slice(0, -1));
    if (shape) setFuture((later) => [...later, { shape, boundary }]);
    restore(previous);
  }

  function redo() {
    const next = future.at(-1);
    if (!next) return;
    setFuture((later) => later.slice(0, -1));
    if (shape) {
      setHistory((was) => [...was, { shape, boundary }].slice(-HISTORY));
    }
    restore(next);
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
      // A new radius on a circle not yet reshaped is one step, not one per
      // keystroke; a change all the same, so Redo has nothing to bring back.
      if (circleUntouched) {
        setFuture([]);
        show(ring);
      } else changeShape(ring);
    }
  }

  /**
   * Asks the server for a preview; the answer is applied unless a newer
   * question was asked meanwhile.
   */
  function preview<T extends object>(
    question: Promise<T>,
    apply: (answer: Exclude<T, { error: string }>) => void,
  ) {
    const ask = ++asked.current;
    setError(null);
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
      const chosen = { code, label: result.label };
      setDistrict(chosen);
      setMukims(result.mukims);
      setArea("whole");
      setPicked([]);
      changeShape(result.polygons satisfies MultiPolygon, {
        district: chosen,
        mukims: result.mukims,
        picked: [],
        shape: result.polygons,
      });
      reframe();
      suggest(result.label);
    });
  }

  function showWhole() {
    if (!district) return;
    setArea("whole");
    preview(districtPolygonsAction(district.code), (result) => {
      changeShape(result.polygons, {
        district,
        mukims,
        picked: [],
        shape: result.polygons,
      });
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
      changeShape(result.polygons, {
        district,
        mukims,
        picked: ordered,
        shape: result.polygons,
      });
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

  /**
   * Takes the ground of the zones in the way off this one, as the check of
   * the shape as it is worked it out, to look at on the map before saving.
   */
  function trimThisZone() {
    if (!inTheWay || !checkedNow || !inTheWay.trimThis.ok) return;
    const labels = andList(inTheWay.zones.map((other) => other.label));
    // With others' ground taken off, a district's boundary is the admin's
    // own shape, as after any change; nothing is in its way any more.
    changeShape(inTheWay.trimThis.shape);
    setOverlap(null);
    toast.success(
      `Trimmed this zone where it overlapped ${labels}. Check it on the map, then save.`,
    );
  }

  /**
   * Shows the zones in the way trimmed of this zone's ground, to check on
   * the map; the save then trims them. Nothing changes until it does.
   */
  function trimTheOthers() {
    if (inTheWay?.trimOthers.ok) {
      setTrimIds(inTheWay.zones.map((other) => other.id));
    }
  }

  /** Saves the zone, trimming the zones in the way when the admin chose that. */
  function save() {
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
    const mukimCodes =
      madeFrom && madeFrom.picked.length > 0
        ? { mukimCodes: madeFrom.picked }
        : {};
    const drawnFrom: ZoneOrigin | null =
      source === "district" && madeFrom
        ? asItIs
          ? {
              districtCode: madeFrom.district.code,
              ...mukimCodes,
              label: madeFrom.district.label,
            }
          : {
              reshapedFrom: madeFrom.district.code,
              ...mukimCodes,
              label: madeFrom.district.label,
            }
        : source === "address" && placeId
          ? { placeId, label: placeText, radiusM }
          : null;
    const fields = JSON.stringify({ name, shape, drawnFrom });
    const cutIds = trimming?.map((other) => other.id);
    const trimmed = trimming ? ` and trimmed ${trimLabels}` : "";
    startTransition(async () => {
      const result = await answerOf(
        zone
          ? updateZoneAction(locationId, zone.id, fields, cutIds)
          : createZoneAction(locationId, fields, cutIds),
      );
      if ("error" in result) {
        setError(result.error);
        if ("overlaps" in result && result.overlaps) {
          setRecheck((count) => count + 1);
        }
        return;
      }
      toast.success(
        zone
          ? `Saved the zone ${name}${trimmed}.`
          : `Added the zone ${name}${trimmed}.`,
      );
      router.push(locationTabHref(locationSlug, "coverage"));
    });
  }

  const corners = shape ? cornersOf(shape) : 0;
  const overlapBar = inTheWay ? (
    <OverlapBar
      labels={andList(inTheWay.zones.map((other) => other.label))}
      one={inTheWay.zones.length === 1}
      trimming={trimming !== null}
      ready={checkedNow}
      thisZoneWhy={inTheWay.trimThis.ok ? null : inTheWay.trimThis.error}
      othersWhy={inTheWay.trimOthers.ok ? null : inTheWay.trimOthers.error}
      onTrimThisZone={trimThisZone}
      onTrimTheOthers={trimTheOthers}
      onKeep={() => setTrimIds(null)}
    />
  ) : null;
  const madeOfNames = madeFrom
    ? madeFrom.mukims
        .filter((mukim) => madeFrom.picked.includes(mukim.code))
        .map((mukim) => mukim.name)
    : [];
  const madeOf =
    madeFrom && madeOfNames.length > 0
      ? `${andList(madeOfNames)} in ${madeFrom.district.label}`
      : madeFrom?.district.label;

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
          canRedo={future.length > 0}
          onRedo={redo}
          onShapeChange={changeShape}
          mukims={
            source === "district" && district && area === "some"
              ? mukims
              : undefined
          }
          trims={trimming}
          overlap={overlapBar}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending
            ? "Saving…"
            : trimming
              ? `Save and trim ${trimLabels}`
              : zone
                ? "Save zone"
                : "Add zone"}
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
      {!mapKey ? overlapBar : null}
    </div>
  );
}

/**
 * What the zone overlaps and the two ways out, each naming the zone that
 * shrinks: this one, or the zones in the way. Over the map above its
 * tools, in full screen too, or under Save without a map. Either way shows
 * on the map before a save; one that cannot be taken says why in its
 * tooltip. Once the zones in the way are to be trimmed, it says so, with
 * the way back.
 */
function OverlapBar({
  labels,
  one,
  trimming,
  ready,
  thisZoneWhy,
  othersWhy,
  onTrimThisZone,
  onTrimTheOthers,
  onKeep,
}: {
  labels: string;
  /** One zone in the way, not several. */
  one: boolean;
  /** Whether the zones in the way are to be trimmed. */
  trimming: boolean;
  /** False while the shape as it is now waits for its check, which trimming this zone needs. */
  ready: boolean;
  /** Why this zone cannot be trimmed, or null when it can. */
  thisZoneWhy: string | null;
  /** Why the zones in the way cannot be trimmed, or null when they can. */
  othersWhy: string | null;
  onTrimThisZone: () => void;
  onTrimTheOthers: () => void;
  onKeep: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-md"
    >
      {trimming ? (
        <>
          <span>
            {labels} {one ? "is" : "are"} trimmed when you save, as the map
            shows, and {one ? "keeps its" : "keep their"} rates.
          </span>
          <button
            type="button"
            onClick={onKeep}
            className="font-medium underline underline-offset-4"
          >
            Keep {labels} as {one ? "it is" : "they are"}
          </button>
        </>
      ) : (
        <>
          <span>Overlaps {labels}.</span>
          <span className="flex flex-wrap gap-2">
            <Tooltip
              content={
                thisZoneWhy ??
                `This zone gives up the ground it shares with ${labels}, which ${one ? "stays as it is" : "stay as they are"}. You check it on the map before you save.`
              }
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={onTrimThisZone}
                disabled={!ready || thisZoneWhy !== null}
              >
                Trim this zone
              </Button>
            </Tooltip>
            <Tooltip
              content={
                othersWhy ??
                `${labels} ${one ? "gives" : "give"} up the ground under this zone and ${one ? "keeps its" : "keep their"} rates. You check it on the map before you save.`
              }
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={onTrimTheOthers}
                disabled={othersWhy !== null}
              >
                Trim {labels}
              </Button>
            </Tooltip>
          </span>
        </>
      )}
    </div>
  );
}
