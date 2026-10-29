import { Button } from "@repo/ui/button";
import { Tooltip } from "@repo/ui/tooltip";
import { ArrowDownIcon, ArrowUpIcon } from "@repo/ui/icons";

/**
 * The buttons of one row of a list Marketing orders by hand: up and down
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
          size="sm"
          disabled={isFirst}
          pending={disabled}
          aria-label={`Move ${name} up`}
          className="w-8 px-0"
          onClick={() => onMove(-1)}
        >
          <ArrowUpIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Move down">
        <Button
          variant="ghost"
          size="sm"
          disabled={isLast}
          pending={disabled}
          aria-label={`Move ${name} down`}
          className="w-8 px-0"
          onClick={() => onMove(1)}
        >
          <ArrowDownIcon />
        </Button>
      </Tooltip>
      {onRemove ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove ${name}`}
          className="text-danger hover:bg-danger-tint hover:text-danger-strong"
          onClick={onRemove}
        >
          Remove
        </Button>
      ) : null}
    </div>
  );
}

/** The rows with the one at `index` moved one place up or down. */
export function movedRow<T>(rows: readonly T[], index: number, by: -1 | 1) {
  const next = [...rows];
  const [row] = next.splice(index, 1);
  if (row !== undefined) next.splice(index + by, 0, row);
  return next;
}
