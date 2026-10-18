"use client";

import { LOCATION_LIMITS, checkAddressNames } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { PencilIcon, PlusIcon } from "@repo/ui/icons";
import { InfoTip } from "@repo/ui/info-tip";
import { useState, useTransition } from "react";
import { Card, CardTitle } from "../../../_components/Card";
import { RowControls, movedRow } from "../_components/RowControls";
import { setLocationAddressesAction } from "../actions";
import { AddressDialog, type AddressDialogMode } from "./AddressDialog";

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
  /** It lies outside the location's states, where no new address may. */
  isStray: boolean;
};

/** A row of the list: a saved address, or one added and not saved yet. */
type Row = {
  /** Stable while the list is open: the address id, or the new place's id. */
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
 * The location's saved addresses, in their card: the places most
 * customers go to there, in the order the drop-off offers them. "Add
 * address" opens a dialog that searches an exact spot and names it; each
 * row is renamed in the same dialog, moved up or down, or removed. The
 * list is saved at once with "Save addresses", which shows with "Discard"
 * once something changed; nothing reaches customers before. An address
 * has to be in one of the location's states: Save refuses a new one that
 * is not and says where it is, and a stored one left outside is marked.
 * Removing an address a highlight uses asks first.
 */
export function SavedAddresses({
  id,
  locationId,
  addresses,
}: {
  /** The card's id, which links to the list land on. */
  id: string;
  locationId: string;
  addresses: SavedAddress[];
}) {
  const [rows, setRows] = useState(() => addresses.map(rowOf));
  // A save answers with the stored list, new ids included: start again from it.
  const stored = addresses.map((a) => `${a.id}:${a.name}`).join("|");
  const [shown, setShown] = useState(stored);
  if (shown !== stored) {
    setShown(stored);
    setRows(addresses.map(rowOf));
  }
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSave] = useTransition();
  const [dialog, confirm] = useConfirm();
  const [editing, setEditing] = useState<{
    mode: AddressDialogMode;
    rowKey: string | null;
  } | null>(null);

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

  /** The stored address a row stands for; none for a new one. */
  const storedOf = (row: Row) =>
    addresses.find((address) => address.id === row.id);

  /** The highlights that point at a row's address; none for a new one. */
  const usedBy = (row: Row) => storedOf(row)?.usedBy ?? [];

  async function remove(row: Row) {
    const highlights = usedBy(row);
    if (
      highlights.length > 0 &&
      !(await confirm({
        title: `Remove ${row.name}?`,
        description: `“Take me here” on ${namesOf(highlights)} goes to it. Once the list is saved, ${
          highlights.length > 1
            ? "those highlights show"
            : "that highlight shows"
        } no button.`,
        action: "Remove",
      }))
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
    <Card id={id} flush>
      <CardTitle
        inset
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={full}
            title={
              full
                ? `The list is full at ${LOCATION_LIMITS.addresses} addresses. Remove one to add another.`
                : undefined
            }
            onClick={() =>
              setEditing({
                mode: {
                  kind: "add",
                  takenPlaceIds: rows.map((row) => row.placeId),
                },
                rowKey: null,
              })
            }
          >
            <PlusIcon />
            Add address
          </Button>
        }
      >
        <span className="inline-flex items-center gap-1.5">
          Saved addresses
          <InfoTip text="The places most customers go to here, in this order. The drop-off offers them before anything is typed; typing still searches any exact place. Exact spots only, never an area, each in one of the location's states." />
        </span>
      </CardTitle>

      {rows.length === 0 ? (
        <p className="border-t border-neutral-200 px-6 py-8 text-center text-sm text-neutral-500">
          None yet. The drop-off then shows the normal search.
        </p>
      ) : (
        <ol className="divide-y divide-neutral-100 border-t border-neutral-200">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-600 tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-48 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-900">
                  {row.name}
                  {row.id ? null : <Badge tone="blue">New</Badge>}
                </span>
                <span className="block text-xs text-neutral-500">
                  {row.detail}
                </span>
                {usedBy(row).length > 0 ? (
                  <span className="block text-xs text-neutral-500">
                    “Take me here” on {namesOf(usedBy(row))}
                  </span>
                ) : null}
                {storedOf(row)?.isStray ? (
                  <span className="block text-xs text-amber-800">
                    Outside this location’s states. Remove it, or tick its
                    state.
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Rename ${row.name}`}
                  title="Rename"
                  className="w-8 px-0"
                  onClick={() =>
                    setEditing({
                      mode: {
                        kind: "rename",
                        name: row.name,
                        detail: row.detail,
                      },
                      rowKey: row.key,
                    })
                  }
                >
                  <PencilIcon />
                </Button>
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

      {changed || error || saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-neutral-200 bg-neutral-50/70 px-6 py-3">
          {error ? (
            <p aria-live="polite" className="text-sm text-red-700">
              {error}
            </p>
          ) : saved && !changed ? (
            <p aria-live="polite" className="text-sm text-emerald-700">
              Saved.
            </p>
          ) : (
            <p className="text-sm text-neutral-600">
              Unsaved changes. Customers see the list once it is saved.
            </p>
          )}
          {changed ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => edit(addresses.map(rowOf))}
              >
                Discard
              </Button>
              <Button disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save addresses"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <AddressDialog
        mode={editing?.mode ?? null}
        onClose={() => setEditing(null)}
        onAdd={(place, name) => {
          edit([
            ...rows,
            {
              key: place.placeId,
              placeId: place.placeId,
              name,
              detail: place.label,
            },
          ]);
          setEditing(null);
        }}
        onRename={(name) => {
          edit(
            rows.map((row) =>
              row.key === editing?.rowKey ? { ...row, name } : row,
            ),
          );
          setEditing(null);
        }}
      />
      {dialog}
    </Card>
  );
}
