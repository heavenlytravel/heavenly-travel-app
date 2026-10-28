"use client";

import { LOCATION_LIMITS } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { PencilIcon, PlusIcon } from "@repo/ui/icons";
import { InfoTip } from "@repo/ui/info-tip";
import { toast } from "@repo/ui/toast";
import { Tooltip } from "@repo/ui/tooltip";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardTitle } from "../../../_components/Card";
import { errorOf } from "../../../_lib/action-state";
import { RowControls, movedRow } from "../_components/RowControls";
import type { AddressArea } from "../_components/SavedAddressPicker";
import {
  addLocationAddressAction,
  setLocationAddressesAction,
} from "../actions";
import { AddressDialog, type AddressDialogMode } from "./AddressDialog";

/** A saved address as the page hands it over. */
export type SavedAddress = {
  id: string;
  name: string;
  /** The stored Google place: its id, and its label and address to show. */
  placeId: string;
  placeLabel: string;
  placeAddress: string;
  /** The pages whose "Take me here" goes to it, by name: popular places, attractions, hotels. */
  usedBy: string[];
  /** It lies outside the location's states, where no new address may. */
  isStray: boolean;
};

/** What sits under an address's name: the place's address, or its label where they match. */
const detailOf = (address: SavedAddress) =>
  address.placeAddress && address.placeAddress !== address.name
    ? address.placeAddress
    : address.placeLabel;

/** "Eagle Square and Night market": the pages as the question names them. */
function namesOf(pages: string[]) {
  return pages.length <= 1
    ? pages.join("")
    : `${pages.slice(0, -1).join(", ")} and ${pages.at(-1)}`;
}

/**
 * The location's saved addresses, in their card: the places most
 * customers go to there, in the order the drop-off offers them. The plus
 * opens the dialog a place's page adds one with, which searches an exact
 * spot around the location and names it, and may give it a page as a
 * popular place, an attraction or a hotel. Each row is renamed in the same
 * dialog, moved up or down, or removed. Every change is saved at once and
 * reaches customers then, as the dialog's add does from a page. An address
 * has to be in one of the location's states; a stored one left outside is
 * marked. Removing an address a page uses asks first.
 */
export function SavedAddresses({
  id,
  locationId,
  locationSlug,
  area,
  addresses,
}: {
  /** The card's id, which links to the list land on. */
  id: string;
  locationId: string;
  locationSlug: string;
  /** Where a new address is searched. */
  area: AddressArea;
  addresses: SavedAddress[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [dialog, confirm] = useConfirm();
  const [editing, setEditing] = useState<{
    mode: AddressDialogMode;
    address: SavedAddress | null;
  } | null>(null);
  const full = addresses.length >= LOCATION_LIMITS.addresses;

  /**
   * Saves the list as `next` makes it, over the list as it was read: a
   * rename, a move or a removal. Answers why not, if not.
   */
  async function save(
    next: { id: string; name: string }[],
    done: string,
  ): Promise<string | null> {
    const refused = errorOf(
      await answerOf(
        setLocationAddressesAction(
          locationId,
          addresses.map((address) => address.id),
          next,
        ),
      ),
    );
    if (refused) return refused;
    toast.success(done);
    router.refresh();
    return null;
  }

  /** A move or a removal, its refusal shown under the list. */
  function change(next: { id: string; name: string }[], done: string) {
    setError(null);
    startSave(async () => setError(await save(next, done)));
  }

  const listed = addresses.map(({ id, name }) => ({ id, name }));

  async function remove(address: SavedAddress) {
    const pages = address.usedBy;
    if (
      !(await confirm({
        title: `Remove ${address.name}?`,
        description:
          pages.length > 0
            ? `“Take me here” on ${namesOf(pages)} goes to it. ${
                pages.length > 1 ? "Those pages show" : "That page shows"
              } no button once it is removed.`
            : "Customers no longer see it in the drop-off's list.",
        action: "Remove",
      }))
    ) {
      return;
    }
    change(
      listed.filter((other) => other.id !== address.id),
      `${address.name} removed.`,
    );
  }

  return (
    <Card id={id} flush>
      <CardTitle
        inset
        action={
          <Tooltip
            content={
              full
                ? `The list is full at ${LOCATION_LIMITS.addresses} addresses. Remove one to add another.`
                : "Add an address"
            }
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-8 px-0"
              aria-label="Add an address"
              disabled={full || saving}
              onClick={() =>
                setEditing({
                  mode: {
                    kind: "add",
                    takenPlaceIds: addresses.map((address) => address.placeId),
                  },
                  address: null,
                })
              }
            >
              <PlusIcon />
            </Button>
          </Tooltip>
        }
      >
        <span className="inline-flex items-center gap-1.5">
          Saved addresses
          <InfoTip text="The places most customers go to here, in this order. The drop-off offers them before anything is typed; typing still searches any exact place. Exact spots only, never an area, each in one of the location's states." />
        </span>
      </CardTitle>

      {addresses.length === 0 ? (
        <p className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
          None yet. The drop-off then shows the normal search.
        </p>
      ) : (
        <ol className="divide-y divide-slate-100 border-t border-slate-200">
          {addresses.map((address, index) => (
            <li
              key={address.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-48 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  {address.name}
                </span>
                <span className="block text-xs text-slate-500">
                  {detailOf(address)}
                </span>
                {address.usedBy.length > 0 ? (
                  <span className="block text-xs text-slate-500">
                    “Take me here” on {namesOf(address.usedBy)}
                  </span>
                ) : null}
                {address.isStray ? (
                  <span className="block text-xs text-amber-800">
                    Outside this location’s states. Remove it, or tick its
                    state.
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-0.5">
                <Tooltip content="Rename">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Rename ${address.name}`}
                    className="w-8 px-0"
                    disabled={saving}
                    onClick={() =>
                      setEditing({
                        mode: {
                          kind: "rename",
                          name: address.name,
                          detail: detailOf(address),
                        },
                        address,
                      })
                    }
                  >
                    <PencilIcon />
                  </Button>
                </Tooltip>
                <RowControls
                  name={address.name}
                  isFirst={index === 0}
                  isLast={index === addresses.length - 1}
                  disabled={saving}
                  onMove={(by) =>
                    change(
                      movedRow(listed, index, by),
                      `${address.name} moved.`,
                    )
                  }
                  onRemove={() => remove(address)}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {error ? (
        <p
          aria-live="polite"
          className="rounded-b-xl border-t border-slate-200 bg-slate-50/70 px-6 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <AddressDialog
        locationId={locationId}
        stateNames={area.stateNames}
        within={area.within}
        mode={editing?.mode ?? null}
        pagesUnder={`/${locationSlug}`}
        onClose={() => setEditing(null)}
        onAdd={async (place, name, page) => {
          const answer = await addLocationAddressAction(
            locationId,
            place.placeId,
            name,
            page,
          );
          if ("error" in answer) return answer;
          setEditing(null);
          toast.success(
            page
              ? `${name} saved, with its page as a draft.`
              : `${name} saved.`,
          );
          router.refresh();
          return null;
        }}
        onRename={async (name) => {
          const renamed = editing?.address;
          if (!renamed) return null;
          const refused = await save(
            listed.map((address) =>
              address.id === renamed.id ? { ...address, name } : address,
            ),
            `Renamed to ${name}.`,
          );
          if (refused) return { error: refused };
          setEditing(null);
          return null;
        }}
      />
      {dialog}
    </Card>
  );
}
