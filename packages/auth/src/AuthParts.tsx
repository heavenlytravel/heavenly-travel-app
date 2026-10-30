"use client";

import { cx } from "@repo/ui/cx";
import { inputClassName } from "@repo/ui/field";
import { useFieldError } from "@repo/ui/validation";
import {
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

/**
 * The parts every sign-in, sign-up and account screen is made of, in the
 * three apps alike: the card with the portal it signs in to, a field with
 * its error under it, the password with Show, the code of six digits, and
 * the quiet link-like button. Plain Tailwind on the shared tokens; each app
 * scans this folder (`@source` in its `globals.css`).
 */

/**
 * The white card of an auth screen. Over the title, the portal the session
 * opens: "Manage", "Connect", "Heavenly Travel". One account and one
 * session serve the three, but each screen says where it leads.
 */
export function AuthCard({
  portal,
  title,
  description,
  children,
  footer,
}: {
  portal: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Under the card's content, over a hairline: the way to sign up, or back. */
  footer?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="auth-title"
      className="w-full max-w-[26rem] rounded-card border border-card-edge bg-white text-body shadow-overlay"
    >
      <div className="p-7 sm:p-8">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-navy">
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          {portal}
        </p>
        <h1
          id="auth-title"
          className="font-serif text-[1.65rem] leading-tight tracking-[-0.01em] text-ink"
        >
          {title}
        </h1>
        {description ? (
          <div className="mt-1.5 text-sm text-muted">{description}</div>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? (
        <div className="border-t border-hairline px-7 py-4 text-center text-sm text-muted sm:px-8">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/**
 * A label over a control, a hint or the refusal under it: Clerk's, given
 * as `error`, or the browser's (a field left empty), in our words in place
 * of its bubble. The refusal is read out as it appears and tied to the
 * control, which turns red.
 */
export function AuthField({
  label,
  hint,
  error,
  action,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  /** At the label's right: "Forgot password?". */
  action?: ReactNode;
  children: (control: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => ReactNode;
}) {
  const id = useId();
  const messageId = useId();
  const checked = useFieldError();
  const refusal = error ?? checked.error;
  const message = refusal ?? hint;
  return (
    <div
      className="grid gap-1.5"
      onInvalid={checked.onInvalid}
      onInput={checked.onInput}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-body">
          {label}
        </label>
        {action}
      </div>
      {children({
        id,
        "aria-describedby": message ? messageId : undefined,
        "aria-invalid": refusal ? true : undefined,
      })}
      {refusal ? (
        <p id={messageId} role="alert" className="text-xs text-danger">
          {refusal}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A text control in the kit's look, 16px on a phone so it does not zoom. */
export function AuthInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(inputClassName, "h-11 text-base", className)}
      {...props}
    />
  );
}

/** A password with Show and Hide at its end. */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <AuthInput
        type={shown ? "text" : "password"}
        className={cx("pr-16", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-pressed={shown}
        className="absolute inset-y-1 right-1 rounded-control px-3 text-xs font-semibold text-brand hover:bg-hairline focus-ring"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** How many digits an emailed code has. */
const CODE_LENGTH = 6;

/**
 * The six digits of an emailed code, a box each. One real input lies
 * over the boxes, so typing, deleting, pasting the whole code and the
 * phone filling it from the email (`one-time-code`) all work as in any
 * field; the boxes only draw what it holds, the next box lit while it has
 * focus. Its form is sent as the sixth digit lands.
 */
export function CodeInput({
  className,
  onFocus,
  onBlur,
  ...props
}: Omit<
  ComponentProps<"input">,
  "type" | "onChange" | "value" | "defaultValue"
>) {
  const [digits, setDigits] = useState("");
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(props["aria-invalid"]);
  return (
    <div className={cx("relative", className)}>
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const current =
            focused &&
            (index === digits.length ||
              (digits.length === CODE_LENGTH && index === CODE_LENGTH - 1));
          return (
            <span
              key={index}
              className={cx(
                "grid h-13 place-items-center rounded-control border bg-white font-mono text-2xl text-ink transition-colors",
                invalid ? "border-danger" : "border-edge",
                current &&
                  (invalid
                    ? "outline-2 outline-danger"
                    : "border-ring outline-2 outline-ring"),
              )}
            >
              {digits[index] ??
                (current ? (
                  <span className="h-6 w-px bg-ink motion-safe:animate-pulse" />
                ) : null)}
            </span>
          );
        })}
      </div>
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={CODE_LENGTH}
        required
        autoFocus
        spellCheck={false}
        // Over the boxes, unseen: its caret and text would only show twice.
        className="absolute inset-0 size-full cursor-text appearance-none bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
        value={digits}
        onChange={(event) => {
          const next = event.currentTarget.value
            .replace(/\D/g, "")
            .slice(0, CODE_LENGTH);
          setDigits(next);
          if (next.length === CODE_LENGTH) {
            const form = event.currentTarget.form;
            // Once the boxes show the last digit.
            requestAnimationFrame(() => form?.requestSubmit());
          }
        }}
        onFocus={(event) => {
          setFocused(true);
          // Typing always goes at the end, as the boxes show it.
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
    </div>
  );
}

/** A button that reads as a link: "Email me a code instead", "Use another email". */
export function TextButton({
  className,
  ...props
}: Omit<ComponentProps<"button">, "type">) {
  return (
    <button
      type="button"
      className={cx(
        "rounded-sm text-sm font-semibold text-brand underline-offset-4 hover:underline focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** The email being signed in, with the way back to change it. */
export function EmailChip({
  email,
  onChange,
}: {
  email: string;
  onChange: () => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-control border border-card-edge bg-mist px-3 py-2">
      <span className="min-w-0 truncate text-sm font-medium text-body">
        {email}
      </span>
      <TextButton onClick={onChange} className="shrink-0 text-xs">
        Change
      </TextButton>
    </div>
  );
}

/** A refusal no field shows: the lockout, the network, the bot check. */
export function AuthAlert({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-control border border-danger-edge bg-danger-tint px-3.5 py-2.5 text-sm text-danger"
    >
      {children}
    </p>
  );
}

/**
 * "Send a new code", which waits half a minute between sends, counting
 * down, so a tap that seems to do nothing is not pressed again and again.
 */
export function ResendCode({
  onResend,
  disabled = false,
}: {
  onResend: () => Promise<boolean>;
  disabled?: boolean;
}) {
  const [waitUntil, setWaitUntil] = useState(() => Date.now() + 30_000);
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [left, now]);

  return (
    <p className="text-sm text-muted">
      No email?{" "}
      {left > 0 ? (
        <span>Send a new code in {left}s.</span>
      ) : (
        <TextButton
          disabled={disabled}
          onClick={async () => {
            if (await onResend()) {
              const at = Date.now();
              setWaitUntil(at + 30_000);
              setNow(at);
            }
          }}
        >
          Send a new code
        </TextButton>
      )}
    </p>
  );
}
