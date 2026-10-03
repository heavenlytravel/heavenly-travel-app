"use client";

import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useState, useTransition } from "react";
import { deleteLocationAction } from "../actions";

/**
 * Deletes a location. One that has never been live goes after a plain
 * question: nothing of it was public. One that has been live has a public
 * address, so the card says what the delete costs and the button works only
 * once the admin has typed the location's slug. A deleted location opens
 * the list.
 */
export function DeleteLocation({
  locationId,
  name,
  slug,
  hasBeenLive,
}: {
  locationId: string;
  name: string;
  slug: string;
  hasBeenLive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  function remove() {
    if (
      !hasBeenLive &&
      !confirm(
        `Delete ${name}? Its pages and saved addresses are deleted with it. This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteLocationAction(
        locationId,
        hasBeenLive ? typed : null,
      );
      setError(result?.error ?? null);
    });
  }

  return (
    <div className="grid gap-3">
      {hasBeenLive ? (
        <>
          <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            <p>
              This location is public at /{slug}. Deleting it turns that address
              into “page not found”: every link to it breaks, search engines
              drop it, and its ranking is not given back if the location is
              added again.
            </p>
            <p>
              To stop selling it for a while, pause it instead. Delete it only
              to remove it for good, or to put a wrong slug right by adding the
              location again. Its pages and saved addresses are deleted with it,
              and this cannot be undone.
            </p>
          </div>
          <Field label={`Type ${slug} to confirm`} className="max-w-xs">
            <Input
              aria-label="Slug of the location to delete"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                setError(null);
              }}
            />
          </Field>
        </>
      ) : (
        <p className="text-sm text-neutral-600">
          This location has never been live, so nothing public is lost. Its
          pages and saved addresses are deleted with it. To try something out,
          keep a location in draft and use Preview: a draft is never public.
        </p>
      )}
      <div>
        <Button
          variant="danger"
          size="sm"
          disabled={pending || (hasBeenLive && typed !== slug)}
          onClick={remove}
        >
          {pending ? "Deleting…" : "Delete location"}
        </Button>
      </div>
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
