"use client";

import Link from "next/link";
import { answerOf } from "@repo/ui/action-answer";
import { inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useState, useTransition } from "react";
import { testAddressAction, type AddressTest } from "../(console)/actions";
import { locationHref } from "../_lib/routes";

/**
 * The same autocomplete field the website uses. Picking a place shows its
 * coordinates, the zone they fall in and the location that serves it, or
 * that no location does, with the district for the record.
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
  const [result, setResult] = useState<AddressTest | null>(null);
  const [testing, startTest] = useTransition();

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-800">
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
                const answer = await answerOf(testAddressAction(picked));
                setResult(
                  "ok" in answer ? answer : { ok: false, error: answer.error },
                );
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
        <p className="text-sm text-slate-500">Checking…</p>
      ) : result === null ? null : !result.ok ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {result.error}
        </p>
      ) : (
        <div aria-live="polite" className="grid gap-1 text-sm">
          <p className="text-slate-900">{result.address}</p>
          <p className="text-slate-500 tabular-nums">
            {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
          </p>
          {result.served ? (
            <p className="font-medium">
              Served: in the zone {result.served.zone} of{" "}
              <Link
                href={locationHref(result.served.location.slug)}
                className="underline-offset-4 hover:underline"
              >
                {result.served.location.name}
              </Link>
              .
            </p>
          ) : (
            <p className="font-medium">
              Not served: in no zone of a live location.
            </p>
          )}
          <p className="text-slate-600">
            {result.district
              ? `${result.district.name}, ${result.district.stateName}.`
              : "In no district: at sea, or outside Malaysia."}
          </p>
        </div>
      )}
    </div>
  );
}
