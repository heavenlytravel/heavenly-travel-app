"use client";

import { LOCATION_LIMITS, checkAddressNames } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Input, inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useState, useTransition } from "react";
import { RowControls, movedRow } from "../_components/RowControls";
import { setLocationAddressesAction } from "../actions";

/** A saved address as the page hands it over. */
export type SavedAddress = {
  id: string;
  name: string;
  /** The stored Google place: its id, and its label and address to show. */
  placeId: string;
  placeLabel: string;
  placeAddress: string;
  /** The landing page's highlights whose "Take me here" goes to it, by name. */
  usedBy: string[];
  /** It lies outside the location's districts, where no new address may. */
  isStray: boolean;
};

/** A row of the form: a saved address, or one picked and not saved yet. */
type Row = {
  /** Stable while the form is open: the address id, or the new place's id. */
  key: string;
  id?: string;
  placeId: string;
  name: string;
  /** What sits under the name: the place's address, or its label when new. */
  detail: string;
};

const rowOf = (address: SavedAddress): Row => ({
  key: address.id,
  id: address.id,
  placeId: address.placeId,
  name: address.name,
  detail:
    address.placeAddress && address.placeAddress !== address.name
      ? address.placeAddress
      : address.placeLabel,
});

/** "Eagle Square and Night market": the highlights as the question names them. */
function namesOf(highlights: string[]) {
  return highlights.length <= 1
    ? highlights.join("")
    : `${highlights.slice(0, -1).join(", ")} and ${highlights.at(-1)}`;
}

/**
 * The location's saved addresses: the places most customers go to there.
 * Marketing adds exact spots by search, renames them, sets their order and
 * removes them, then saves the whole list at once. Nothing changes for
 * customers until Save. An address has to be in one of the location's
 * districts: Save refuses a new one that is not and says where it is, and a
 * stored one left outside is marked. Removing an address a highlight uses
 * asks first.
 */
export function SavedAddresses({
  locationId,
  addresses,
}: {
  locationId: string;
  addresses: SavedAddress[];
}) {
  const searchId = useId();
  const [rows, setRows] = useState(() => addresses.map(rowOf));
  // A save answers with the stored list, new ids included: start again from it.
  const stored = addresses.map((a) => `${a.id}:${a.name}`).join("|");
  const [shown, setShown] = useState(stored);
  if (shown !== stored) {
    setShown(stored);
    setRows(addresses.map(rowOf));
  }
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSave] = useTransition();

  const changed =
    rows.length !== addresses.length ||
    rows.some(
      (row, i) =>
        row.id !== addresses[i]?.id || row.name !== addresses[i]?.name,
    );
  const full = rows.length >= LOCATION_LIMITS.addresses;

  function edit(next: Row[]) {
    setRows(next);
    setError(null);
    setSaved(false);
  }

  function add(label: string, placeId: string) {
    setSearch("");
    if (rows.some((row) => row.placeId === placeId)) {
      setError(`${label} is already in the list.`);
      return;
    }
    edit([
      ...rows,
      {
        key: placeId,
        placeId,
        name: label.slice(0, LOCATION_LIMITS.addressName),
        detail: label,
      },
    ]);
  }

  /** The stored address a row stands for; none for a new one. */
  const storedOf = (row: Row) =>
    addresses.find((address) => address.id === row.id);

  /** The highlights that point at a row's address; none for a new one. */
  function usedBy(row: Row) {
    return storedOf(row)?.usedBy ?? [];
  }

  function remove(row: Row) {
    const highlights = usedBy(row);
    if (
      highlights.length > 0 &&
      !confirm(
        `Remove ${row.name}? "Take me here" on ${namesOf(highlights)} goes to it. Once this is saved, ${
          highlights.length > 1
            ? "those highlights show"
            : "that highlight shows"
        } no button.`,
      )
    ) {
      return;
    }
    edit(rows.filter((other) => other.key !== row.key));
  }

  function save() {
    const check = checkAddressNames(rows.map((row) => row.name.trim()));
    if (!check.ok) {
      setError(check.error);
      return;
    }
    startSave(async () => {
      const result = await setLocationAddressesAction(
        locationId,
        addresses.map((address) => address.id),
        rows.map((row) =>
          row.id
            ? { id: row.id, name: row.name }
            : { placeId: row.placeId, name: row.name },
        ),
      );
      setError(result?.error ?? null);
      setSaved(result === null);
    });
  }

  return (
    <div className="grid gap-4">
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">
          None yet. The drop-off then shows the normal search.
        </p>
      ) : (
        <ol className="grid gap-2">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="flex flex-wrap items-start gap-2 rounded-md border border-neutral-200 p-3"
            >
              <span className="mt-2.5 w-5 shrink-0 text-xs text-neutral-500 tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-48 flex-1">
                <Input
                  aria-label={`Name of address ${index + 1}`}
                  autoComplete="off"
                  maxLength={LOCATION_LIMITS.addressName}
                  value={row.name}
                  onChange={(event) =>
                    edit(
                      rows.map((other) =>
                        other.key === row.key
                          ? { ...other, name: event.target.value }
                          : other,
                      ),
                    )
                  }
                />
                <span className="mt-1.5 block text-xs text-neutral-500">
                  {row.detail}
                  {row.id ? "" : " · new, not saved yet"}
                </span>
                {usedBy(row).length > 0 ? (
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    “Take me here” on {namesOf(usedBy(row))}
                  </span>
                ) : null}
                {storedOf(row)?.isStray ? (
                  <span className="mt-0.5 block text-xs text-amber-800">
                    Outside this location’s districts. Remove it, or tick its
                    district.
                  </span>
                ) : null}
              </div>
              <div className="pt-1">
                <RowControls
                  name={row.name}
                  isFirst={index === 0}
                  isLast={index === rows.length - 1}
                  onMove={(by) => edit(movedRow(rows, index, by))}
                  onRemove={() => remove(row)}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-1.5">
        <label
          htmlFor={searchId}
          className="text-sm font-medium text-neutral-800"
        >
          Add address
        </label>
        {full ? (
          <p className="text-xs text-neutral-500">
            The list is full at {LOCATION_LIMITS.addresses} addresses. Remove
            one to add another.
          </p>
        ) : (
          <PlaceInput
            id={searchId}
            value={search}
            placeholder="Start typing an airport, a jetty, a hotel or a mall"
            className={inputClassName}
            onChange={(next, placeId) => {
              if (placeId) add(next, placeId);
              else setSearch(next);
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={saving || !changed} onClick={save}>
          {saving ? "Saving…" : "Save addresses"}
        </Button>
        {error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {error}
          </p>
        ) : saved && !changed ? (
          <p aria-live="polite" className="text-sm text-emerald-700">
            Saved.
          </p>
        ) : changed ? (
          <p className="text-sm text-neutral-500">Unsaved changes.</p>
        ) : null}
      </div>
    </div>
  );
}
