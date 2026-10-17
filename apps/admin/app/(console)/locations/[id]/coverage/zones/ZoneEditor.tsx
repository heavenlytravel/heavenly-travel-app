"use client";

import {
  ZONE_LIMITS,
  circleRing,
  isZoneCircle,
  isZoneDistrict,
  type MultiPolygon,
  type Ring,
  type ZoneOrigin,
  type ZoneShape,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input, inputClassName } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { PlaceInput } from "@repo/ui/place-input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { locationTabHref } from "../../../../../_lib/routes";
import {
  createZoneAction,
  districtPolygonsAction,
  placePointAction,
  updateZoneAction,
} from "../actions";
import {
  ZoneMap,
  type DistrictChoice,
  type DistrictOutline,
  type OtherZone,
} from "./ZoneMap";

type Mode = "district" | "circle" | "polygon";

const DEFAULT_RADIUS_M = 1500;

/** The middle of a stored circle: its ring is symmetric around it. */
function centerOf(ring: Ring): { lat: number; lng: number } {
  const corners = ring.slice(0, -1);
  const sum = corners.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / corners.length, lng: sum.lng / corners.length };
}

/** How a saved zone was made, from what the editor keeps about it. */
function modeOf(
  zone: { drawnFrom: ZoneOrigin | null } | null,
  mapKey: string | null,
): Mode {
  if (zone) {
    if (isZoneDistrict(zone.drawnFrom)) return "district";
    if (isZoneCircle(zone.drawnFrom)) return "circle";
    return "polygon";
  }
  return mapKey ? "polygon" : "district";
}

/**
 * The zone maker: a name, and a shape made one of three ways. A district
 * as it is, picked from the list, islands included; a circle around a
 * place, picked with the autocomplete and given a radius; or a polygon
 * drawn on the map corner by corner, which needs the browser key. The
 * first two work without the map. A saved zone goes back to the tab.
 */
export function ZoneEditor({
  locationId,
  zone,
  districts,
  choices,
  others,
  mapKey,
  hasGoogle,
}: {
  locationId: string;
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
  const [name, setName] = useState(zone?.name ?? "");
  const [mode, setMode] = useState<Mode>(modeOf(zone, mapKey));

  const savedCircle = zone && isZoneCircle(zone.drawnFrom) ? zone : null;
  const savedDistrict = zone && isZoneDistrict(zone.drawnFrom) ? zone : null;
  const savedRing = zone && !zone.drawnFrom ? zone.shape : null;

  const [districtCode, setDistrictCode] = useState(
    savedDistrict && isZoneDistrict(savedDistrict.drawnFrom)
      ? savedDistrict.drawnFrom.districtCode
      : "",
  );
  const [district, setDistrict] = useState<{
    label: string;
    polygons: MultiPolygon;
  } | null>(
    savedDistrict && isZoneDistrict(savedDistrict.drawnFrom)
      ? {
          label: savedDistrict.drawnFrom.label,
          polygons: savedDistrict.shape as MultiPolygon,
        }
      : null,
  );

  const circleOrigin =
    savedCircle && isZoneCircle(savedCircle.drawnFrom)
      ? savedCircle.drawnFrom
      : null;
  const [placeText, setPlaceText] = useState(circleOrigin?.label ?? "");
  const [placeId, setPlaceId] = useState<string | undefined>(
    circleOrigin?.placeId,
  );
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    savedCircle ? centerOf(savedCircle.shape as Ring) : null,
  );
  const [radius, setRadius] = useState(
    String(circleOrigin?.radiusM ?? DEFAULT_RADIUS_M),
  );
  const [circle, setCircle] = useState<Ring | null>(
    savedCircle ? (savedCircle.shape as Ring) : null,
  );
  const [polygon, setPolygon] = useState<Ring | null>(
    savedRing && Array.isArray(savedRing[0]) && !Array.isArray(savedRing[0][0])
      ? (savedRing as Ring)
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const radiusM = Number(radius);
  const shape: ZoneShape | null =
    mode === "district"
      ? (district?.polygons ?? null)
      : mode === "circle"
        ? circle
        : polygon;

  function redrawCircle(
    at: { lat: number; lng: number } | null,
    metres: number,
  ) {
    setCircle(
      at && Number.isFinite(metres) && metres > 0
        ? circleRing(at, metres)
        : null,
    );
  }

  function pickDistrict(code: string) {
    setDistrictCode(code);
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
      setDistrict({ label: result.label, polygons: result.polygons });
      // The district's name is the natural name; a typed name is kept.
      setName((current) =>
        current === "" || current === district?.label ? result.label : current,
      );
    });
  }

  function save() {
    if (!shape) {
      setError(
        mode === "district"
          ? "Pick a district."
          : mode === "circle"
            ? "Pick a place and a radius."
            : "Draw the zone on the map.",
      );
      return;
    }
    const drawnFrom: ZoneOrigin | null =
      mode === "district" && district
        ? { districtCode, label: district.label }
        : mode === "circle" && placeId
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
      router.push(locationTabHref(locationId, "coverage"));
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
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
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium text-neutral-800">
            Shape
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              checked={mode === "district"}
              onChange={() => setMode("district")}
              className="accent-neutral-900"
            />
            A district, as it is
            <InfoTip text="For a whole district such as Langkawi or Timur Laut: its boundary from the map data, islands included. No drawing needed." />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              checked={mode === "circle"}
              onChange={() => setMode("circle")}
              className="accent-neutral-900"
            />
            A circle around a place
            <InfoTip text="For an airport, a jetty or a hotel: the place, and how far around it the zone reaches." />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              checked={mode === "polygon"}
              disabled={!mapKey}
              onChange={() => setMode("polygon")}
              className="accent-neutral-900"
            />
            Drawn on the map
            {!mapKey ? (
              <span className="text-neutral-500">
                (needs the browser key for Google Maps)
              </span>
            ) : (
              <InfoTip text="For a beach strip or a town: click the map corner by corner." />
            )}
          </label>
        </fieldset>

        {mode === "district" ? (
          <div className="grid gap-1.5 sm:max-w-sm">
            <label
              htmlFor={districtSelectId}
              className="text-sm font-medium text-neutral-800"
            >
              District
            </label>
            <select
              id={districtSelectId}
              value={districtCode}
              onChange={(event) => pickDistrict(event.target.value)}
              className={inputClassName}
            >
              <option value="">Pick a district</option>
              {choices.map((group) => (
                <optgroup key={group.state} label={group.state}>
                  {group.districts.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-neutral-500">
              The location&apos;s own states come first; any district may be a
              zone, for an outstation destination.
            </p>
          </div>
        ) : null}

        {mode === "circle" ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <div className="grid gap-1.5">
              <label
                htmlFor={placeInputId}
                className="text-sm font-medium text-neutral-800"
              >
                Place
              </label>
              <PlaceInput
                id={placeInputId}
                value={placeText}
                placeId={placeId}
                placeholder="Start typing an airport, a jetty, a hotel"
                className={inputClassName}
                onChange={(next, picked) => {
                  setPlaceText(next);
                  setPlaceId(picked);
                  setError(null);
                  if (!picked) {
                    setCenter(null);
                    setCircle(null);
                    return;
                  }
                  startTransition(async () => {
                    const point = await placePointAction(picked);
                    if (!point.ok) {
                      setError(point.error);
                      return;
                    }
                    setPlaceText(point.label);
                    setCenter(point);
                    redrawCircle(point, Number(radius));
                  });
                }}
              />
              {!hasGoogle ? (
                <p className="text-xs text-amber-800">
                  Google is not set up on this server, so the list offers the
                  districts themselves instead of real places.
                </p>
              ) : null}
            </div>
            <Field label="Radius (m)">
              <Input
                type="number"
                inputMode="numeric"
                min={ZONE_LIMITS.radiusM.min}
                max={ZONE_LIMITS.radiusM.max}
                step={100}
                value={radius}
                onChange={(event) => {
                  setRadius(event.target.value);
                  redrawCircle(center, Number(event.target.value));
                }}
              />
            </Field>
          </div>
        ) : null}
      </section>

      {mapKey ? (
        <ZoneMap
          mapKey={mapKey}
          districts={districts}
          others={others}
          shape={shape}
          editable={mode === "polygon"}
          onShapeChange={(ring) => {
            setPolygon(ring);
            setError(null);
          }}
        />
      ) : null}

      {mode === "district" && district ? (
        <p className="text-sm text-neutral-600">
          {district.label},{" "}
          {district.polygons.length === 1
            ? "one piece of land"
            : `${district.polygons.length} pieces of land`}
          .
        </p>
      ) : null}

      {mode === "polygon" && polygon ? (
        <p className="text-sm text-neutral-600">
          {polygon.length - 1} corners.{" "}
          <Button variant="ghost" size="sm" onClick={() => setPolygon(null)}>
            Start again
          </Button>
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : zone ? "Save" : "Add zone"}
        </Button>
        <Link
          href={locationTabHref(locationId, "coverage")}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        {error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
