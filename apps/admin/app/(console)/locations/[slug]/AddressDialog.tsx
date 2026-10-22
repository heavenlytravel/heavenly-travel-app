"use client";

import { LOCATION_LIMITS, andList } from "@repo/db";
import type { Bounds } from "@repo/places";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Field, Input, inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useState, useTransition, type FormEvent } from "react";
import { checkAddressPlaceAction } from "../actions";

/** The place an address stands for: as the search picked it, with its address. */
export type PickedPlace = { placeId: string; label: string; detail: string };

/** What the dialog is for: a new address, or a new name for one in the list. */
export type AddressDialogMode =
  | { kind: "add"; takenPlaceIds: readonly string[] }
  | { kind: "rename"; name: string; detail: string };

/**
 * The dialog behind "Add address" and a row's rename. Adding searches an
 * exact place inside the box around the location's states, then checks the
 * picked place at once: one outside the states, or already in the list, is
 * refused here, with where it lies. The place is then named, its own name
 * to start with. Renaming changes the name alone. Either goes into the
 * list, which is saved with the list's own button.
 */
export function AddressDialog({
  locationId,
  stateNames,
  within,
  mode,
  onClose,
  onAdd,
  onRename,
}: {
  locationId: string;
  /** The location's states, by name, for the line under the title. */
  stateNames: readonly string[];
  /** The box around the states, which the search keeps to; null for none. */
  within: Bounds | null;
  /** Open while set. */
  mode: AddressDialogMode | null;
  onClose: () => void;
  onAdd: (place: PickedPlace, name: string) => void;
  onRename: (name: string) => void;
}) {
  const where = andList([...stateNames]);
  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={mode?.kind === "rename" ? `Rename ${mode.name}` : "Add an address"}
      description={
        mode?.kind === "rename"
          ? "The name customers see in the drop-off's list. The place stays the same."
          : `An exact place customers often go to here: an airport, a jetty, a hotel or a mall${where ? `, in ${where}` : ""}.`
      }
      width="md"
    >
      {mode ? (
        <AddressForm
          locationId={locationId}
          within={within}
          mode={mode}
          onCancel={onClose}
          onAdd={onAdd}
          onRename={onRename}
        />
      ) : null}
    </Dialog>
  );
}

/** The fields, mounted afresh each time the dialog opens. */
function AddressForm({
  locationId,
  within,
  mode,
  onCancel,
  onAdd,
  onRename,
}: {
  locationId: string;
  within: Bounds | null;
  mode: AddressDialogMode;
  onCancel: () => void;
  onAdd: (place: PickedPlace, name: string) => void;
  onRename: (name: string) => void;
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [name, setName] = useState(mode.kind === "rename" ? mode.name : "");
  const [error, setError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const trimmed = name.trim();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) return;
    if (mode.kind === "rename") {
      onRename(trimmed);
    } else if (place) {
      onAdd(place, trimmed);
    }
  }

  /** A place picked from the list: refused at once when taken or outside the states. */
  function pick(label: string, placeId: string, taken: readonly string[]) {
    if (taken.includes(placeId)) {
      setError(`${label} is already in the list.`);
      return;
    }
    startCheck(async () => {
      const result = await answerOf(
        checkAddressPlaceAction(locationId, placeId, label),
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPlace({ placeId, label, detail: result.detail });
      setName(label.slice(0, LOCATION_LIMITS.addressName));
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {mode.kind === "add" ? (
        <div className="grid gap-1.5">
          <label
            htmlFor={searchId}
            className="text-sm font-medium text-slate-800"
          >
            Place
          </label>
          <PlaceInput
            id={searchId}
            value={search}
            placeholder="Start typing an airport, a jetty, a hotel or a mall"
            className={inputClassName}
            within={within ?? undefined}
            onChange={(next, placeId) => {
              setSearch(next);
              setError(null);
              setPlace(null);
              if (placeId) pick(next, placeId, mode.takenPlaceIds);
            }}
          />
          {checking ? (
            <p aria-live="polite" className="text-xs text-slate-500">
              Checking where it is…
            </p>
          ) : error ? (
            <p aria-live="polite" className="text-xs text-red-700">
              {error}
            </p>
          ) : place ? (
            <p className="text-xs text-slate-500">{place.detail}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">{mode.detail}</p>
      )}

      {mode.kind === "rename" || place ? (
        <Field label="Name">
          <Input
            autoComplete="off"
            autoFocus={mode.kind === "rename"}
            maxLength={LOCATION_LIMITS.addressName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!trimmed || checking || (mode.kind === "add" && !place)}
        >
          {mode.kind === "rename" ? "Rename" : "Add to the list"}
        </Button>
      </div>
    </form>
  );
}
