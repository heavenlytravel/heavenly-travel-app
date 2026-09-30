"use client";

import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { XIcon } from "@repo/ui/icons";
import { useActionState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { addZoneDistrictAction, removeZoneDistrictAction } from "../actions";

type District = { id: string; state: string; district: string };

/** One town as a chip with its state dimmed and a remove control. */
function DistrictChip({
  zoneId,
  district,
}: {
  zoneId: string;
  district: District;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    removeZoneDistrictAction,
    null,
  );
  return (
    <li>
      <form
        action={action}
        className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 py-1 pr-1 pl-3 text-sm"
      >
        <input type="hidden" name="zoneId" value={zoneId} />
        <input type="hidden" name="districtId" value={district.id} />
        <span className="font-medium text-neutral-900">
          {district.district}
        </span>
        <span className="text-xs text-neutral-500">{district.state}</span>
        <button
          type="submit"
          disabled={pending}
          aria-label={`Remove ${district.district}`}
          title={`Remove ${district.district}`}
          className="rounded-full p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-50"
        >
          <XIcon className="size-3.5" />
        </button>
      </form>
      {state?.error ? (
        <p aria-live="polite" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
    </li>
  );
}

/**
 * The zone's towns as chips, and a form to add one by hand for a name seen
 * in a customer's address. "Test an address" below adds names from real
 * Google results, which is the surer way.
 */
export function Districts({
  zoneId,
  districts,
}: {
  zoneId: string;
  districts: District[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addZoneDistrictAction,
    null,
  );

  return (
    <div className="grid gap-5">
      {districts.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No districts yet. The zone cannot be turned on until it has one.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {districts.map((district) => (
            <DistrictChip
              key={district.id}
              zoneId={zoneId}
              district={district}
            />
          ))}
        </ul>
      )}

      <form action={action} className="grid gap-3">
        <input type="hidden" name="zoneId" value={zoneId} />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Add district" className="min-w-48 flex-1">
            <Input
              name="district"
              required
              autoComplete="off"
              placeholder="Seri Kembangan"
            />
          </Field>
          <Field label="State" className="min-w-40 flex-1">
            <Input
              name="state"
              required
              autoComplete="off"
              placeholder="Selangor"
            />
          </Field>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
