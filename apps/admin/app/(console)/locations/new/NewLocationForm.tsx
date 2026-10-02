"use client";

import { LOCATION_LIMITS, slugify } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { LOCATIONS_PATH } from "../../../_lib/routes";
import {
  DistrictPicker,
  type DistrictOption,
} from "../_components/DistrictPicker";
import { SlugField } from "../_components/SlugField";
import { createLocationAction } from "../actions";

/**
 * The form for a new location. The name comes first and fills the slug
 * until Marketing types its own; then the states and districts it lies in.
 * A saved location opens on its page, as a draft.
 */
export function NewLocationForm({
  districts,
}: {
  districts: DistrictOption[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createLocationAction,
    null,
  );
  // Controlled, so a refused save does not clear what was entered.
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTyped, setSlugTyped] = useState(false);
  const [districtCodes, setDistrictCodes] = useState<string[]>([]);
  const [tagline, setTagline] = useState("");

  return (
    <form action={action} className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              name="name"
              required
              autoFocus
              autoComplete="off"
              maxLength={LOCATION_LIMITS.name}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTyped) {
                  setSlug(
                    slugify(event.target.value).slice(0, LOCATION_LIMITS.slug),
                  );
                }
              }}
            />
          </Field>
          <SlugField
            value={slug}
            onChange={(next) => {
              setSlugTyped(true);
              setSlug(next);
            }}
          />
        </div>
        <DistrictPicker
          districts={districts}
          value={districtCodes}
          onChange={setDistrictCodes}
        />
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              Tagline
              <InfoTip text="The short line under the name on a home page card. It can be left empty for now." />
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
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || districtCodes.length === 0}>
          {pending ? "Adding…" : "Add location"}
        </Button>
        <Link
          href={LOCATIONS_PATH}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
