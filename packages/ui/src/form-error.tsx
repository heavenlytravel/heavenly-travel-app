import { cx } from "./cx.js";

const SIZES = {
  /** Beside a small control. */
  xs: "ui:text-xs",
  sm: "ui:text-sm",
  /** The site's reading size, under its 15px fields and buttons. */
  copy: "ui:text-copy",
} as const;

/**
 * Why a form's last submit, or a switch's last change, was refused, read
 * out as it appears: beside the button, for a refusal no field shows.
 * Nothing when there is none. Red: a failed action is a real problem.
 */
export function FormError({
  error,
  size = "sm",
  className,
}: {
  error: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className={cx(SIZES[size], "ui:font-medium ui:text-danger", className)}
    >
      {error}
    </p>
  );
}
