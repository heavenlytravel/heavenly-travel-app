"use client";

import { answerOf } from "@repo/ui/action-answer";
import { useState, useTransition } from "react";
import { FormError } from "@repo/ui/form-error";
import { errorOf } from "../../../../_lib/action-state";
import { moveLocationEntryAction } from "../../../../_lib/location-actions";
import { RowControls } from "./RowControls";

/**
 * Up and down for one page Marketing added to a section, on its list on Pages.
 * A move is saved at once and shows on the customer site, as the order of
 * the saved addresses does; why one was refused shows beside the arrows.
 */
export function EntryOrder({
  locationId,
  page,
  slug,
  name,
  isFirst,
  isLast,
}: {
  locationId: string;
  page: string;
  slug: string;
  name: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      <FormError error={error} size="xs" />
      <RowControls
        name={name}
        isFirst={isFirst}
        isLast={isLast}
        disabled={pending}
        onMove={(by) =>
          startTransition(async () => {
            setError(
              errorOf(
                await answerOf(
                  moveLocationEntryAction(locationId, page, slug, by),
                ),
              ),
            );
          })
        }
      />
    </span>
  );
}
