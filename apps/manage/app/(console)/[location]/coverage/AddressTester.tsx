"use client";

import Link from "next/link";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { inputClassName } from "@repo/ui/field";
import { SearchIcon } from "@repo/ui/icons";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useState, useTransition } from "react";
import { FormError } from "@repo/ui/form-error";
import { coverageHref } from "../../../_lib/routes";
import { testAddressAction, type AddressTest } from "./tester-actions";

/**
 * "Test an address" in Coverage's header: a dialog with the address
 * tester, for every team that reads the coverage, under `~` and a location
 * alike, since it places an address anywhere. Each opening starts empty.
 */
export function TestAddress({
  hasGoogle,
}: {
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <SearchIcon />
        Test an address
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Test an address"
        description="Pick a real place to see the zone its coordinates fall in and the location that serves it, as a booking would."
        width="md"
      >
        <AddressTester hasGoogle={hasGoogle} />
      </Dialog>
    </>
  );
}

/**
 * The same autocomplete field the website uses. Picking a place shows its
 * coordinates, the zone they fall in and the location that serves it, its
 * name opening that location's coverage, or that no location does, with
 * the district for the record.
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
        <label htmlFor={inputId} className="text-sm font-medium text-body">
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
          <p className="text-xs text-warning">
            Google is not set up on this server, so the list offers the
            districts themselves instead of real places.
          </p>
        ) : null}
      </div>

      {testing ? (
        <p className="text-sm text-muted">Checking…</p>
      ) : result === null ? null : !result.ok ? (
        <FormError error={result.error} />
      ) : (
        <div
          aria-live="polite"
          className="grid gap-1 rounded-lg border border-hairline bg-shade px-4 py-3 text-sm"
        >
          <p className="text-ink">{result.address}</p>
          <p className="text-muted tabular-nums">
            {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
          </p>
          {result.served ? (
            <p className="font-semibold text-ink">
              Served: in the zone {result.served.zone} of{" "}
              <Link
                href={coverageHref(result.served.location.slug)}
                className="text-brand underline-offset-4 hover:underline"
              >
                {result.served.location.name}
              </Link>
              .
            </p>
          ) : (
            <p className="font-semibold text-ink">
              Not served: in no zone of a live location.
            </p>
          )}
          <p className="text-muted">
            {result.district
              ? `${result.district.name}, ${result.district.stateName}.`
              : "In no district: at sea, or outside Malaysia."}
          </p>
        </div>
      )}
    </div>
  );
}
