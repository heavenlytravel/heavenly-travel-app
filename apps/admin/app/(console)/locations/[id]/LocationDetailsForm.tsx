"use client";

import { LOCATION_LIMITS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import {
  DistrictPicker,
  type DistrictOption,
} from "../_components/DistrictPicker";
import { PICKUP_DOT_TIP, PickupDot } from "../_components/PickupDot";
import { SlugField } from "../_components/SlugField";
import { updateLocationAction } from "../actions";

/**
 * The name, the slug, the tagline and the districts of one location, saved
 * together. The slug is read-only once the location has been live. The
 * districts are a list, each with a dot that says whether pickups there are
 * served; "Edit districts" opens the picker in its place.
 */
export function LocationDetailsForm({
  location,
  districts,
}: {
  location: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    districtCodes: string[];
    slugLocked: boolean;
  };
  districts: DistrictOption[];
}) {
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await updateLocationAction(previous, formData);
      setSaved(result === null);
      if (result === null) setPicking(false);
      return result;
    },
    null,
  );
  // Controlled, so a refused save does not put the stored values back.
  const [name, setName] = useState(location.name);
  const [slug, setSlug] = useState(location.slug);
  const [tagline, setTagline] = useState(location.tagline ?? "");
  const [districtCodes, setDistrictCodes] = useState(location.districtCodes);
  const ticked = districts.filter((d) => districtCodes.includes(d.code));

  return (
    <form
      action={action}
      className="grid gap-4"
      onChange={() => setSaved(false)}
    >
      <input type="hidden" name="id" value={location.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input
            name="name"
            required
            autoComplete="off"
            maxLength={LOCATION_LIMITS.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <SlugField
          value={slug}
          onChange={setSlug}
          locked={location.slugLocked}
        />
      </div>
      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            Tagline
            <InfoTip text="The short line under the name on a home page card." />
          </span>
        }
      >
        <Input
          name="tagline"
          autoComplete="off"
          maxLength={LOCATION_LIMITS.tagline}
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
        />
      </Field>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-800">
            Districts
            <InfoTip
              text={`The districts the location lies in. Its saved addresses have to be in one of them. ${PICKUP_DOT_TIP} The dot does not show or hide the pages: with pickups off, the location is still a destination we drive to.`}
            />
          </span>
          {picking ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDistrictCodes(location.districtCodes);
                setPicking(false);
              }}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPicking(true)}
            >
              Edit districts
            </Button>
          )}
        </div>
        {picking ? (
          <DistrictPicker
            districts={districts}
            value={districtCodes}
            onChange={setDistrictCodes}
          />
        ) : (
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {ticked.map((district) => (
              <li key={district.code} className="flex items-center gap-2">
                <input type="hidden" name="districts" value={district.code} />
                <span>
                  {district.name}
                  <span className="text-neutral-500">
                    , {district.stateName}
                  </span>
                </span>
                <PickupDot on={district.isActive} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || districtCodes.length === 0}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : districtCodes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Tick at least one district.
          </p>
        ) : saved ? (
          <p aria-live="polite" className="text-sm text-emerald-700">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
