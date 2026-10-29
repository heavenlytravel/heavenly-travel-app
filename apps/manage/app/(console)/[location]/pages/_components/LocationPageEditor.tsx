"use client";

import { PLACE_TYPE_LABELS, isPlaceSection, type PlaceSection } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentProps } from "react";
import { FormError } from "@repo/console/FormError";
import { PageEditor } from "../../../../_components/page-editor/PageEditor";
import { errorOf } from "../../../../_lib/action-state";
import {
  deleteLocationEntryAction,
  renameLocationEntryAction,
} from "../../../../_lib/location-actions";
import { PlaceTypeField } from "./PlaceTypeField";
import { EntrySlugField } from "../../settings/SlugField";

/** A page Marketing added to a section, as its editor names it to rename or delete it. */
export type EntryOfPage = {
  locationId: string;
  locationSlug: string;
  /** The section's key. */
  page: string;
  slug: string;
  slugLocked: boolean;
  /** "popular place" */
  one: string;
  /** Whether the public sees it now, so a delete takes a public address. */
  isPublic: boolean;
};

/**
 * A location's page in the editor. A page Marketing added to a section
 * also gets its slug, which changes in a dialog until the first publish,
 * and Delete, which asks first.
 */
export function LocationPageEditor({
  entry,
  ...props
}: Omit<ComponentProps<typeof PageEditor>, "entry"> & {
  entry?: EntryOfPage;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [confirmDialog, confirm] = useConfirm();

  async function remove(): Promise<string | null> {
    if (!entry) return null;
    const goAhead = await confirm({
      title: `Delete this ${entry.one}?`,
      description: entry.isPublic
        ? "The public sees it now: its address stops working at once. Its draft and its published copy go; its publishes stay in the location's history."
        : "Its draft goes, and its address is free again. Its publishes stay in the location's history.",
      action: "Delete",
    });
    if (!goAhead) return null;
    const answer = await answerOf(
      deleteLocationEntryAction(
        entry.locationId,
        entry.locationSlug,
        entry.page,
        entry.slug,
      ),
    );
    const refused = errorOf(answer);
    if (refused) return refused;
    toast.success("Deleted.");
    if (answer && "href" in answer) router.push(answer.href);
    return null;
  }

  return (
    <>
      <PageEditor
        {...props}
        entry={
          entry
            ? {
                slugLocked: entry.slugLocked,
                one: entry.one,
                type: isPlaceSection(entry.page)
                  ? PLACE_TYPE_LABELS[entry.page]
                  : undefined,
                onRename: () => setRenaming(true),
                onDelete: remove,
              }
            : undefined
        }
      />
      {entry && !entry.slugLocked ? (
        <RenameDialog
          open={renaming}
          onOpenChange={setRenaming}
          entry={entry}
        />
      ) : null}
      {confirmDialog}
    </>
  );
}

/**
 * Changes the slug of a page not yet published, and a place's type, and
 * opens the editor at its new address. The server's refusal shows under
 * the fields.
 */
function RenameDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EntryOfPage;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(entry.slug);
  const [type, setType] = useState<PlaceSection | null>(
    isPlaceSection(entry.page) ? entry.page : null,
  );
  const page = type ?? entry.page;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const answer = await answerOf(
        renameLocationEntryAction(
          entry.locationId,
          entry.locationSlug,
          entry.page,
          entry.slug,
          page,
          slug,
        ),
      );
      const refused = errorOf(answer);
      if (refused) {
        setError(refused);
        return;
      }
      toast.success(type ? "Address changed." : "Slug changed.");
      onOpenChange(false);
      if (answer && "href" in answer) router.replace(answer.href);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={type ? "Change the type or slug" : "Change the slug"}
      description="The editor opens again at the page's new address."
    >
      <form onSubmit={submit} className="grid gap-4">
        {type ? (
          <PlaceTypeField
            value={type}
            onChange={(next) => {
              setType(next);
              setError(null);
            }}
          />
        ) : null}
        <EntrySlugField
          value={slug}
          onChange={(next) => {
            setSlug(next);
            setError(null);
          }}
          under={`/${entry.locationSlug}/${page}`}
        />
        <FormError error={error} />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending || (slug === entry.slug && page === entry.page)}
          >
            {pending ? "Changing…" : type ? "Change" : "Change slug"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
