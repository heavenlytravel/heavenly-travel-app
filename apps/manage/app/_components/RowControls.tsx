import { movedRow as movedRowIn } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Tooltip } from "@repo/ui/tooltip";
import { ArrowDownIcon, ArrowUpIcon } from "@repo/ui/icons";

/**
 * The buttons of one row of a list ordered by hand (pages, footer links,
 * saved addresses, tour guide languages): up and down
 * as arrows, and remove in red where a row can be removed here, all quiet
 * so a long list does not fill up with boxes. `name` is what a screen
 * reader hears the row called. `disabled` holds the arrows while a move is
 * saved, the one pressed keeping the focus.
 */
export function RowControls({
  name,
  isFirst,
  isLast,
  onMove,
  onRemove,
  disabled = false,
}: {
  name: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (by: -1 | 1) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Tooltip content="Move up">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isFirst}
          pending={disabled}
          aria-label={`Move ${name} up`}
          onClick={() => onMove(-1)}
        >
          <ArrowUpIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Move down">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isLast}
          pending={disabled}
          aria-label={`Move ${name} down`}
          onClick={() => onMove(1)}
        >
          <ArrowDownIcon />
        </Button>
      </Tooltip>
      {onRemove ? (
        <Button
          variant="ghost-danger"
          size="sm"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          Remove
        </Button>
      ) : null}
    </div>
  );
}

/** The rows with the one at `index` moved one place up or down; the same rows when it cannot go that way. */
export function movedRow<T>(rows: readonly T[], index: number, by: -1 | 1) {
  return movedRowIn(rows, index, by) ?? [...rows];
}
