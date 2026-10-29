import { cx } from "@repo/ui/cx";

/**
 * Why a form's last submit, or a switch's last change, was refused, read
 * out as it appears: beside the button, for a refusal no field shows.
 * Nothing when there is none. Small beside a small control. Red: a failed
 * action is a real problem.
 */
export function FormError({
  error,
  size = "sm",
  className,
}: {
  error: string | null | undefined;
  size?: "xs" | "sm";
  className?: string;
}) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className={cx(
        size === "xs" ? "text-xs" : "text-sm",
        "font-medium text-danger",
        className,
      )}
    >
      {error}
    </p>
  );
}
