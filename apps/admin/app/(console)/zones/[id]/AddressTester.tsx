"use client";

import { Button } from "@repo/ui/button";
import { inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useActionState, useId, useState, useTransition } from "react";
import type { ActionState } from "../../../_lib/action-state";
import {
  addZoneDistrictAction,
  testAddressAction,
  type AddressTest,
} from "../actions";

/**
 * The same autocomplete field the website uses. Picking a place shows the
 * town and state Google carries for it and the zone it resolves to, and
 * offers to list the town under this zone when no zone has it yet.
 */
export function AddressTester({
  zoneId,
  zoneName,
  hasGoogle,
}: {
  zoneId: string;
  zoneName: string;
  /** False when the server runs without a Google key and offers seeded names. */
  hasGoogle: boolean;
}) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [placeId, setPlaceId] = useState<string>();
  const [result, setResult] = useState<AddressTest | null>(null);
  const [testing, startTest] = useTransition();

  function test(id: string) {
    startTest(async () => {
      setResult(await testAddressAction(id));
    });
  }

  const [addState, addAction, adding] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const state = await addZoneDistrictAction(previous, formData);
      // The town is listed now: test again so the outcome says so.
      if (!state && placeId) test(placeId);
      return state;
    },
    null,
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-800"
        >
          Address
        </label>
        <PlaceInput
          id={inputId}
          value={value}
          placeId={placeId}
          placeholder="Start typing a hotel, mall or street"
          className={inputClassName}
          onChange={(next, picked) => {
            setValue(next);
            setPlaceId(picked);
            if (picked) test(picked);
            else setResult(null);
          }}
        />
        {!hasGoogle ? (
          <p className="text-xs text-amber-800">
            Google is not set up on this server, so the list offers the seeded
            district names instead of real places.
          </p>
        ) : null}
      </div>

      {testing ? (
        <p className="text-sm text-neutral-500">Checking…</p>
      ) : result === null ? null : !result.ok ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {result.error}
        </p>
      ) : (
        <div aria-live="polite" className="grid gap-3 text-sm">
          <div>
            <p className="text-neutral-900">{result.address}</p>
            <p className="text-neutral-500">
              {result.town
                ? `Town ${result.town}`
                : "Google gives no town for this place"}
              {result.state ? `, state ${result.state}` : ""}
            </p>
          </div>
          <p className="font-medium">
            {result.match
              ? result.match.zoneId === zoneId
                ? `Covered by this zone, on ${result.match.district}`
                : `Covered by ${result.match.zoneName}, on ${result.match.district}`
              : "Not covered"}
          </p>
          {!result.match && result.town ? (
            <form
              action={addAction}
              className="flex flex-wrap items-center gap-3"
            >
              <input type="hidden" name="zoneId" value={zoneId} />
              <input type="hidden" name="district" value={result.town} />
              <input type="hidden" name="state" value={result.state ?? ""} />
              <Button type="submit" variant="secondary" disabled={adding}>
                {adding ? "Adding…" : `Add ${result.town} to ${zoneName}`}
              </Button>
              {addState?.error ? (
                <span className="text-red-700">{addState.error}</span>
              ) : null}
            </form>
          ) : null}
          {!result.match && !result.town ? (
            <p className="text-neutral-500">
              Nothing in the model can place it. Customers pick a hotel or a
              terminal nearby instead.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
