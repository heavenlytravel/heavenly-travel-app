"use client";

import type { Bounds } from "@repo/places";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { Select } from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import { Tooltip } from "@repo/ui/tooltip";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { AddressDialog } from "./AddressDialog";
import { addLocationAddressAction } from "../../../../_lib/location-actions";

/** A saved address as a place picks it. */
export type PickableAddress = { id: string; name: string; placeId: string };

/** Where a new saved address may lie, for the dialog that adds one. */
export type AddressArea = {
  /** The location's states, by name. */
  stateNames: readonly string[];
  /** The box around them, which the search keeps to; null for none. */
  within: Bounds | null;
};

/**
 * The saved address a place points at: one of the location's, none, or a
 * new one added here through the same dialog as the Saved addresses list,
 * saved at once and picked. `name` puts the choice in a form; without it
 * the choice goes to `onChange` alone.
 */
export function SavedAddressPicker({
  locationId,
  addresses,
  area,
  value,
  onChange,
  name,
  disabled = false,
}: {
  locationId: string;
  addresses: readonly PickableAddress[];
  area: AddressArea;
  value: string | null;
  onChange: (id: string | null) => void;
  name?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  // Added here and not yet in `addresses`, until the refresh brings them.
  const [added, setAdded] = useState<PickableAddress[]>([]);
  const all = [
    ...addresses,
    ...added.filter((one) => !addresses.some((saved) => saved.id === one.id)),
  ];

  return (
    <div className="flex items-center gap-2">
      <Select
        name={name}
        aria-label="Saved address"
        className="min-w-0 flex-1"
        disabled={disabled}
        value={value ?? ""}
        onValueChange={(next) => onChange(next || null)}
        options={[
          { value: "", label: "No address" },
          ...all.map((address) => ({ value: address.id, label: address.name })),
        ]}
      />
      <Tooltip content="Add a saved address">
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-10 shrink-0 px-0"
          aria-label="Add a saved address"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          <PlusIcon />
        </Button>
      </Tooltip>
      {/* On the body: the picker may sit in a form, and a form in a form is not allowed. */}
      {adding
        ? createPortal(
            <AddressDialog
              locationId={locationId}
              stateNames={area.stateNames}
              within={area.within}
              mode={{
                kind: "add",
                takenPlaceIds: all.map((address) => address.placeId),
              }}
              onClose={() => setAdding(false)}
              onAdd={async (place, label) => {
                const answer = await addLocationAddressAction(
                  locationId,
                  place.placeId,
                  label,
                );
                if ("error" in answer) return answer;
                setAdded((list) => [
                  ...list,
                  { id: answer.id, name: label, placeId: place.placeId },
                ]);
                onChange(answer.id);
                setAdding(false);
                toast.success("Address saved.");
                router.refresh();
                return null;
              }}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
