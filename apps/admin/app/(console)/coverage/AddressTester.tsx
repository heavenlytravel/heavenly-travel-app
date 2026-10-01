"use client";

import Link from "next/link";
import { inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useState, useTransition } from "react";
import type { PlaceCheck } from "../../_lib/place-check";
import { stateHref } from "../../_lib/routes";
import { testAddressAction } from "./actions";

/**
 * The same autocomplete field the website uses. Picking a place shows its
 * coordinates, the district they fall in and whether it is on.
 */
export function AddressTester({
  hasGoogle,
}: {
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
}) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [placeId, setPlaceId] = useState<string>();
  const [result, setResult] = useState<PlaceCheck | null>(null);
  const [testing, startTest] = useTransition();

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
            if (picked) {
              startTest(async () => {
                setResult(await testAddressAction(picked));
              });
            } else {
              setResult(null);
            }
          }}
        />
        {!hasGoogle ? (
          <p className="text-xs text-amber-800">
            Google is not set up on this server, so the list offers the
            districts themselves instead of real places.
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
        <div aria-live="polite" className="grid gap-1 text-sm">
          <p className="text-neutral-900">{result.address}</p>
          <p className="text-neutral-500 tabular-nums">
            {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
          </p>
          {result.district ? (
            <p className="font-medium">
              {result.district.name},{" "}
              <Link
                href={stateHref(result.district.stateCode)}
                className="underline-offset-4 hover:underline"
              >
                {result.district.stateName}
              </Link>
              {result.district.isActive
                ? ": served"
                : ": not served, the district is off"}
            </p>
          ) : (
            <p className="font-medium">
              In no district: at sea, or outside Malaysia.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
