"use client";

import { LOCATION_LIMITS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Field, Input, inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useState, type FormEvent } from "react";

/** The place an address stands for, as the search picked it. */
export type PickedPlace = { placeId: string; label: string };

/** What the dialog is for: a new address, or a new name for one in the list. */
export type AddressDialogMode =
  | { kind: "add"; takenPlaceIds: readonly string[] }
  | { kind: "rename"; name: string; detail: string };

/**
 * The dialog behind "Add address" and a row's rename. Adding searches an
 * exact place, then names it, the place's own name to start with; a place
 * already in the list is refused here. Renaming changes the name alone.
 * Either goes into the list, which is saved with the list's own button.
 */
export function AddressDialog({
  mode,
  onClose,
  onAdd,
  onRename,
}: {
  /** Open while set. */
  mode: AddressDialogMode | null;
  onClose: () => void;
  onAdd: (place: PickedPlace, name: string) => void;
  onRename: (name: string) => void;
}) {
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
          : "An exact place customers often go to here: an airport, a jetty, a hotel or a mall. It has to be in one of this location's states."
      }
      width="md"
    >
      {mode ? (
        <AddressForm
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
  mode,
  onCancel,
  onAdd,
  onRename,
}: {
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

  return (
    <form onSubmit={submit} className="grid gap-4">
      {mode.kind === "add" ? (
        <div className="grid gap-1.5">
          <label
            htmlFor={searchId}
            className="text-sm font-medium text-neutral-800"
          >
            Place
          </label>
          <PlaceInput
            id={searchId}
            value={search}
            placeholder="Start typing an airport, a jetty, a hotel or a mall"
            className={inputClassName}
            onChange={(next, placeId) => {
              setSearch(next);
              setError(null);
              if (!placeId) {
                setPlace(null);
                return;
              }
              if (mode.takenPlaceIds.includes(placeId)) {
                setPlace(null);
                setError(`${next} is already in the list.`);
                return;
              }
              setPlace({ placeId, label: next });
              setName(next.slice(0, LOCATION_LIMITS.addressName));
            }}
          />
          {error ? (
            <p aria-live="polite" className="text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-neutral-600">{mode.detail}</p>
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
          disabled={!trimmed || (mode.kind === "add" && !place)}
        >
          {mode.kind === "rename" ? "Rename" : "Add to the list"}
        </Button>
      </div>
    </form>
  );
}
