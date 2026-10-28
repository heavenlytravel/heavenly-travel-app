"use client";

import {
  ENTRY_LIMITS,
  LOCATION_LIMITS,
  PLACE_SECTIONS,
  PLACE_TYPE_LABELS,
  andList,
  checkEntrySlug,
  isPlaceSection,
  slugify,
  type PlaceSection,
} from "@repo/db";
import { suggestionStateOf, type Bounds } from "@repo/places";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Field, Input, inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import { useId, useState, useTransition, type FormEvent } from "react";
import { EntrySlugField } from "../_components/SlugField";
import { checkAddressPlaceAction } from "../actions";

/** The place an address stands for: as the search picked it, with its address. */
export type PickedPlace = { placeId: string; label: string; detail: string };

/** The page a new address is given, as the type of place it is: a hotel at /langkawi/hotels/its-slug. */
export type AddressPage = { page: PlaceSection; slug: string };

/** Why an address was not saved, and the field it is about: its slug, for its page. */
export type AddressRefusal = { error: string; field?: string };

/** What the dialog is for: a new address, or a new name for one in the list. */
export type AddressDialogMode =
  | { kind: "add"; takenPlaceIds: readonly string[] }
  | { kind: "rename"; name: string; detail: string };

/**
 * The one dialog that adds a saved address, from the Saved addresses list
 * and from a place's page, and renames one in the list. Adding searches an
 * exact place in the box around the location's states (`within`), leaving
 * out a suggestion that names another state (`suggestionStateOf`), Penang
 * in the box around Kedah, then checks the picked place at once by its
 * coordinates: one outside the states, or saved already, is refused here,
 * with where it lies. The place is then named, its own name to start
 * with. From the list (`pagesUnder`), the address may be a popular place,
 * an attraction or a hotel: it then gets a draft page of that type, named
 * as the address, its slug made from the name. Either is saved at once;
 * `onAdd` and `onRename` answer why not, if not, and the dialog keeps what
 * was typed.
 */
export function AddressDialog({
  locationId,
  stateNames,
  within,
  mode,
  pagesUnder,
  onClose,
  onAdd,
  onRename,
}: {
  locationId: string;
  /** The location's states, by name. */
  stateNames: readonly string[];
  /** The box around them, which the search keeps to; null for none. */
  within: Bounds | null;
  /** Open while set. */
  mode: AddressDialogMode | null;
  /** The location's address on the site, "/langkawi", where a new address may get its page; none from a page. */
  pagesUnder?: string;
  onClose: () => void;
  onAdd: (
    place: PickedPlace,
    name: string,
    page: AddressPage | null,
  ) => Promise<AddressRefusal | null>;
  /** Not needed where the dialog only adds. */
  onRename?: (name: string) => Promise<AddressRefusal | null>;
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
          : `An exact place customers often go to here: an airport, a jetty, a hotel or a mall${stateNames.length > 0 ? `, in ${andList([...stateNames])}` : ""}.`
      }
      width="md"
    >
      {mode ? (
        <AddressForm
          locationId={locationId}
          stateNames={stateNames}
          within={within}
          mode={mode}
          pagesUnder={pagesUnder}
          onCancel={onClose}
          onAdd={onAdd}
          onRename={onRename}
        />
      ) : null}
    </Dialog>
  );
}

const NO_PAGE = "";

/** The fields, mounted afresh each time the dialog opens. */
function AddressForm({
  locationId,
  stateNames,
  within,
  mode,
  pagesUnder,
  onCancel,
  onAdd,
  onRename,
}: {
  locationId: string;
  stateNames: readonly string[];
  within: Bounds | null;
  mode: AddressDialogMode;
  pagesUnder?: string;
  onCancel: () => void;
  onAdd: (
    place: PickedPlace,
    name: string,
    page: AddressPage | null,
  ) => Promise<AddressRefusal | null>;
  onRename?: (name: string) => Promise<AddressRefusal | null>;
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [name, setName] = useState(mode.kind === "rename" ? mode.name : "");
  const [section, setSection] = useState<PlaceSection | null>(null);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<AddressRefusal | null>(null);
  const [checking, startCheck] = useTransition();
  const [saving, startSave] = useTransition();
  const trimmed = name.trim();

  /** The slug made from the name, until it is edited. */
  const slugOf = (text: string) => slugify(text).slice(0, ENTRY_LIMITS.slug);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Opened from a page's form, React would carry the submit on to it.
    event.stopPropagation();
    if (!trimmed) return;
    startSave(async () => {
      const refused =
        mode.kind === "rename"
          ? await onRename?.(trimmed)
          : place
            ? await onAdd(
                place,
                trimmed,
                section ? { page: section, slug } : null,
              )
            : null;
      setError(refused ?? null);
    });
  }

  /** A place picked from the list: refused at once when taken or outside the states. */
  function pick(label: string, placeId: string, taken: readonly string[]) {
    if (taken.includes(placeId)) {
      setError({ error: `${label} is already in the list.` });
      return;
    }
    startCheck(async () => {
      const result = await answerOf(
        checkAddressPlaceAction(locationId, placeId, label),
      );
      if ("error" in result) {
        setError({ error: result.error });
        return;
      }
      const named = label.slice(0, LOCATION_LIMITS.addressName);
      setPlace({ placeId, label, detail: result.detail });
      setName(named);
      if (!slugEdited) setSlug(slugOf(named));
    });
  }

  const slugError = error?.field === "slug" ? error.error : null;
  const formError = error && !slugError ? error.error : null;

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
            keep={(suggestion) => {
              const state = suggestionStateOf(suggestion.detail);
              return state === null || stateNames.includes(state);
            }}
            inline
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
          ) : formError ? (
            <p aria-live="polite" className="text-xs text-red-700">
              {formError}
            </p>
          ) : place ? (
            <p className="text-xs text-slate-500">{place.detail}</p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">{mode.detail}</p>
          {formError ? (
            <p aria-live="polite" className="text-xs text-red-700">
              {formError}
            </p>
          ) : null}
        </>
      )}

      {mode.kind === "rename" || place ? (
        <Field label="Name">
          <Input
            autoComplete="off"
            autoFocus={mode.kind === "rename"}
            maxLength={LOCATION_LIMITS.addressName}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugEdited) setSlug(slugOf(event.target.value));
            }}
          />
        </Field>
      ) : null}

      {mode.kind === "add" && place && pagesUnder ? (
        <>
          <Field
            label="Its page"
            hint="Optional. A popular place, an attraction or a hotel gets a draft page of its own, named as the address, with “Take me here” to it."
          >
            <Select
              aria-label="Its page"
              value={section ?? NO_PAGE}
              onValueChange={(next) => {
                setSection(isPlaceSection(next) ? next : null);
                setError(null);
              }}
              options={[
                { value: NO_PAGE, label: "No page" },
                ...PLACE_SECTIONS.map((value) => ({
                  value,
                  label: PLACE_TYPE_LABELS[value],
                })),
              ]}
            />
          </Field>
          {section ? (
            <div className="grid gap-1.5">
              <EntrySlugField
                value={slug}
                onChange={(next) => {
                  setSlug(next);
                  setSlugEdited(true);
                  setError(null);
                }}
                under={`${pagesUnder}/${section}`}
              />
              {slugError ? (
                <p aria-live="polite" className="text-xs text-red-700">
                  {slugError}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            !trimmed ||
            checking ||
            saving ||
            (mode.kind === "add" && !place) ||
            (section !== null && !checkEntrySlug(slug).ok)
          }
        >
          {mode.kind === "rename"
            ? saving
              ? "Renaming…"
              : "Rename"
            : saving
              ? "Adding…"
              : section
                ? "Add address and page"
                : "Add address"}
        </Button>
      </div>
    </form>
  );
}
