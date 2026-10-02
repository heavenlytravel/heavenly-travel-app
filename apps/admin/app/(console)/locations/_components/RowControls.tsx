import { Button } from "@repo/ui/button";

/**
 * The buttons of one row of a list Marketing orders by hand: up, down and
 * remove. `name` is what a screen reader hears the row called.
 */
export function RowControls({
  name,
  isFirst,
  isLast,
  onMove,
  onRemove,
}: {
  name: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={isFirst}
        aria-label={`Move ${name} up`}
        onClick={() => onMove(-1)}
      >
        Up
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isLast}
        aria-label={`Move ${name} down`}
        onClick={() => onMove(1)}
      >
        Down
      </Button>
      <Button
        variant="danger"
        size="sm"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
      >
        Remove
      </Button>
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
