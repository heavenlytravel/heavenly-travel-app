"use client";

import { LOCATION_LIMITS, slugify } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@repo/console/Card";
import { FormError } from "@repo/console/FormError";
import { settingsHref } from "../../../../_lib/routes";
import { useActionForm } from "../../../../_lib/use-action-form";
import { LocationSlugField } from "../SlugField";
import { StatePicker, type StateOption } from "../StatePicker";
import { createLocationAction } from "../../../../_lib/location-actions";
import { FORM_WIDTH } from "@repo/console/PageColumn";

/**
 * The form for a new location: the three things only a person can say. The
 * name comes first and fills the slug until Marketing types its own; then
 * the state it lies in. A saved location opens on its dashboard, as a
 * draft, with the rest of the setup ahead on its checklist.
 */
export function NewLocationForm({ states }: { states: StateOption[] }) {
  const { pending, error, formProps } = useActionForm(createLocationAction, {
    done: "Location added, as a draft.",
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTyped, setSlugTyped] = useState(false);
  const [stateCodes, setStateCodes] = useState<string[]>([]);

  return (
    <form {...formProps} className={`grid gap-6 ${FORM_WIDTH}`}>
      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              name="name"
              required
              autoFocus
              autoComplete="off"
              maxLength={LOCATION_LIMITS.name}
              placeholder="Langkawi"
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
          <LocationSlugField
            value={slug}
            onChange={(next) => {
              setSlugTyped(true);
              setSlug(next);
            }}
          />
        </div>
        <StatePicker
          states={states}
          value={stateCodes}
          onChange={setStateCodes}
        />
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || stateCodes.length === 0}>
          {pending ? "Adding…" : "Add location"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={settingsHref(null)}>Cancel</Link>
        </Button>
        {error ? (
          <FormError error={error} />
        ) : stateCodes.length === 0 ? (
          <p className="text-sm text-muted">Tick at least one state.</p>
        ) : null}
      </div>
    </form>
  );
}
