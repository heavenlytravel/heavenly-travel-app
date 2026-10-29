"use client";

import { ENTRY_LIMITS, PAGE_LIMITS, slugify } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Field, Input } from "@repo/ui/field";
import { PlusIcon } from "@repo/ui/icons";
import { Tooltip } from "@repo/ui/tooltip";
import { useState } from "react";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "../../../../_lib/use-action-form";
import { createLocationEntryAction } from "../../../../_lib/location-actions";
import {
  SavedAddressPicker,
  type AddressArea,
  type PickableAddress,
} from "./SavedAddressPicker";
import { EntrySlugField } from "../../settings/SlugField";

/**
 * "Add popular place", "Add post" and the like: a plus by the section on
 * Pages and its section's list. The dialog adds a page to that section
 * alone: its title, and its slug made from the title until Marketing edits
 * it; a place may point at a saved address at once, one of the location's
 * or a new one added from here. The page starts as a draft and its editor
 * opens.
 */
export function AddEntryDialog({
  locationId,
  locationSlug,
  page,
  one,
  titleLabel,
  places,
}: {
  locationId: string;
  locationSlug: string;
  /** The section's key. */
  page: string;
  /** What one page of it is called: "popular place". */
  one: string;
  /** What its editor calls the title: "Name" for a place, "Title" for a post. */
  titleLabel: string;
  /** For a section of places: the saved addresses, and where a new one may lie. */
  places?: { addresses: readonly PickableAddress[]; area: AddressArea };
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const { pending, error, formProps } = useActionForm(
    createLocationEntryAction,
    { done: "Page added. Write it, then publish." },
  );

  return (
    <>
      <Tooltip content={`Add ${one}`}>
        <Button
          variant="ghost"
          size="sm"
          className="w-8 px-0"
          aria-label={`Add ${one}`}
          onClick={() => setOpen(true)}
        >
          <PlusIcon />
        </Button>
      </Tooltip>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Add ${one}`}
        description="It starts as a draft: nothing is public until you publish it."
      >
        <form {...formProps} className="grid gap-4">
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="page" value={page} />
          <Field label={titleLabel}>
            <Input
              name="title"
              required
              autoComplete="off"
              maxLength={PAGE_LIMITS.heroHeadline}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugEdited) {
                  setSlug(
                    slugify(event.target.value).slice(0, ENTRY_LIMITS.slug),
                  );
                }
              }}
            />
          </Field>
          <EntrySlugField
            value={slug}
            onChange={(next) => {
              setSlug(next);
              setSlugEdited(true);
            }}
            under={`/${locationSlug}/${page}`}
          />
          {places ? (
            <Field
              label="Saved address"
              hint="Optional. With one, the page and its card show “Take me here”. Add one with the plus if it is not saved yet."
            >
              <SavedAddressPicker
                locationId={locationId}
                addresses={places.addresses}
                area={places.area}
                value={addressId}
                onChange={setAddressId}
                name="addressId"
              />
            </Field>
          ) : null}
          <FormError error={error} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : `Add ${one}`}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
