"use client";

import { useSignIn } from "@clerk/nextjs";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/field";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  authErrorMessage,
  authErrorOf,
  isCodeError,
  isLeakedPassword,
  isPasswordError,
} from "./auth-errors";
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthInput,
  CodeInput,
  EmailChip,
  PasswordInput,
  ResendCode,
  TextButton,
} from "./AuthParts";
import { addPasswordHref } from "./account-paths";
import { REDIRECT_PARAM, safeRedirect } from "./redirect";

type Step =
  | "email"
  | "password"
  | "forgot"
  | "code"
  | "reset-code"
  | "new-password"
  | "trust"
  | "second-factor";

/** Where a refusal shows: under a field, or over the button for one no field is about. */
type Where = "email" | "password" | "code" | "form";

type SecondFactor = "email_code" | "phone_code" | "totp";

/**
 * Our own sign-in, on Clerk's custom flow (`useSignIn`), for the three
 * apps. The email first; then the password when the account has one, with
 * "Forgot password?" (a code to reset it, or a code to sign in now) and
 * "Email me a code instead"; an account with no password, one staff made,
 * gets a code at once and, signed in, is offered a password on its
 * account page (`accountPath`). A password found in a leak is reset before
 * it is let in. A new browser's check (Clerk's Device Trust) and a second
 * step, where an account has one, are asked for here too. Errors show at
 * the field they are about. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Our own sign-in".
 */
export function SignInFlow({
  portal,
  fallbackRedirect = "/",
  accountPath,
  noAccount,
  footer,
}: {
  /** The app it signs in to: "Manage", "Connect", "Heavenly Travel". */
  portal: string;
  /** Where a sign-in goes with no `redirect_url`. */
  fallbackRedirect?: string;
  /** The app's account page, where an account without a password is offered one. */
  accountPath: string;
  /** What to do when no account has the email: each app says its own. */
  noAccount: ReactNode;
  /** Under the first card: the way to sign up, where there is one. */
  footer?: ReactNode;
}) {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const params = useSearchParams();
  const busy = fetchStatus === "fetching";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [hasPassword, setHasPassword] = useState(true);
  const [secondFactor, setSecondFactor] = useState<SecondFactor>("email_code");
  const [error, setError] = useState<{ at: Where; text: ReactNode } | null>(
    null,
  );
  const [leaked, setLeaked] = useState(false);

  const errorAt = (where: Where) => (error?.at === where ? error.text : null);

  /** Shows a refusal where it belongs; false, so a step can `return fail(…)`. */
  function fail(raw: unknown, where: Where): false {
    const refusal = authErrorOf(raw);
    if (!refusal) return false;
    if (refusal.code === "session_exists") {
      void go(false);
      return false;
    }
    if (refusal.code === "form_identifier_not_found") {
      setError({
        at: "email",
        text: <>There&rsquo;s no account with this email. {noAccount}</>,
      });
      return false;
    }
    const at: Where = isPasswordError(refusal)
      ? "password"
      : isCodeError(refusal)
        ? "code"
        : refusal.code.startsWith("form_identifier") ||
            refusal.code === "form_param_format_invalid"
          ? "email"
          : ["user_locked", "too_many_requests", "network"].includes(
                refusal.code,
              ) || refusal.code.startsWith("captcha")
            ? "form"
            : where;
    setLeaked(isLeakedPassword(refusal));
    setError({ at, text: authErrorMessage(refusal) });
    return false;
  }

  function moveTo(next: Step) {
    setError(null);
    setStep(next);
  }

  /** Activates the session and leaves: to the account page to add a password, or where the sign-in was asked from. */
  async function go(offerPassword: boolean) {
    const destination = safeRedirect(
      params.get(REDIRECT_PARAM),
      fallbackRedirect,
      window.location.origin,
    );
    const to = offerPassword
      ? addPasswordHref(accountPath, destination)
      : destination;
    const { error: refusal } = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl(to);
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
    if (refusal) fail(refusal, "form");
  }

  /** After a password, a code or a reset: done, a second step, or a new password. */
  async function next(byCode: boolean) {
    switch (signIn.status) {
      case "complete":
        return go(byCode && !hasPassword);
      case "needs_new_password":
        return moveTo("new-password");
      case "needs_client_trust":
      case "needs_second_factor": {
        const strategies = signIn.supportedSecondFactors.map(
          (factor) => factor.strategy,
        );
        const strategy = (["email_code", "phone_code", "totp"] as const).find(
          (option) => strategies.includes(option),
        );
        if (!strategy) {
          setError({
            at: "form",
            text: "This account needs a second step we can't offer here. Contact us to sign in.",
          });
          return;
        }
        setSecondFactor(strategy);
        if (strategy === "email_code") {
          const { error: refusal } = await signIn.mfa.sendEmailCode();
          if (refusal) return fail(refusal, "form");
        }
        if (strategy === "phone_code") {
          const { error: refusal } = await signIn.mfa.sendPhoneCode();
          if (refusal) return fail(refusal, "form");
        }
        return moveTo(
          signIn.status === "needs_client_trust" ? "trust" : "second-factor",
        );
      }
      default:
        setError({
          at: "form",
          text: "The sign-in didn't finish. Start again.",
        });
    }
  }

  async function sendSignInCode() {
    const { error: refusal } = await signIn.emailCode.sendCode();
    if (refusal) return fail(refusal, "form");
    return true;
  }

  async function sendResetCode() {
    const { error: refusal } = await signIn.resetPasswordEmailCode.sendCode();
    if (refusal) return fail(refusal, "form");
    return true;
  }

  async function startOver() {
    await signIn.reset();
    setLeaked(false);
    moveTo("email");
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = String(new FormData(event.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();
    setEmail(typed);
    setError(null);
    const { error: refusal } = await signIn.create({ identifier: typed });
    if (refusal) return fail(refusal, "email");
    const withPassword = signIn.supportedFirstFactors.some(
      (factor) => factor.strategy === "password",
    );
    setHasPassword(withPassword);
    if (withPassword) return moveTo("password");
    if (await sendSignInCode()) moveTo("code");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const password = String(new FormData(event.currentTarget).get("password"));
    const { error: refusal } = await signIn.password({ password });
    if (refusal) return fail(refusal, "password");
    await next(false);
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const code = String(new FormData(event.currentTarget).get("code"));
    const { error: refusal } =
      step === "reset-code"
        ? await signIn.resetPasswordEmailCode.verifyCode({ code })
        : step === "code"
          ? await signIn.emailCode.verifyCode({ code })
          : secondFactor === "email_code"
            ? await signIn.mfa.verifyEmailCode({ code })
            : secondFactor === "phone_code"
              ? await signIn.mfa.verifyPhoneCode({ code })
              : await signIn.mfa.verifyTOTP({ code });
    if (refusal) return fail(refusal, "code");
    await next(step === "code");
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const { error: refusal } =
      await signIn.resetPasswordEmailCode.submitPassword({
        password: String(data.get("password")),
        signOutOfOtherSessions: data.get("signOutOthers") === "on",
      });
    if (refusal) return fail(refusal, "password");
    setLeaked(false);
    await next(false);
  }

  const chip = <EmailChip email={email} onChange={() => void startOver()} />;
  const formError = <AuthAlert>{errorAt("form")}</AuthAlert>;

  if (step === "email") {
    return (
      <AuthCard
        portal={portal}
        title={`Sign in to ${portal}`}
        description="Enter your email to continue."
        footer={footer}
      >
        <form onSubmit={submitEmail} className="grid gap-4">
          <AuthField label="Email" error={errorAt("email")}>
            {(control) => (
              <AuthInput
                {...control}
                name="email"
                type="email"
                autoComplete="username email"
                defaultValue={email}
                required
                autoFocus
              />
            )}
          </AuthField>
          {formError}
          <Button type="submit" size="lg" pending={busy} className="w-full">
            Continue
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "password") {
    return (
      <AuthCard portal={portal} title="Enter your password">
        {chip}
        <form onSubmit={submitPassword} className="grid gap-4">
          {/* For a password manager, which saves the pair. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <AuthField
            label="Password"
            error={errorAt("password")}
            action={
              <TextButton onClick={() => moveTo("forgot")} className="text-xs">
                Forgot password?
              </TextButton>
            }
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                autoComplete="current-password"
                required
                autoFocus
              />
            )}
          </AuthField>
          {leaked ? (
            <Button
              variant="secondary"
              onClick={async () => {
                if (await sendResetCode()) moveTo("reset-code");
              }}
            >
              Set a new password
            </Button>
          ) : null}
          {formError}
          <Button type="submit" size="lg" pending={busy} className="w-full">
            Sign in
          </Button>
          <TextButton
            disabled={busy}
            className="justify-self-center"
            onClick={async () => {
              setError(null);
              if (await sendSignInCode()) moveTo("code");
            }}
          >
            Email me a code instead
          </TextButton>
        </form>
      </AuthCard>
    );
  }

  if (step === "forgot") {
    return (
      <AuthCard
        portal={portal}
        title="Forgot your password?"
        description="Choose how to get back in."
      >
        {chip}
        <div className="grid gap-3">
          <ChoiceButton
            title="Reset my password"
            detail="We email you a code, then you choose a new password."
            disabled={busy}
            onClick={async () => {
              setError(null);
              if (await sendResetCode()) moveTo("reset-code");
            }}
          />
          <ChoiceButton
            title="Email me a code to sign in"
            detail="Sign in now with a code. Your password stays as it is."
            disabled={busy}
            onClick={async () => {
              setError(null);
              if (await sendSignInCode()) moveTo("code");
            }}
          />
          {formError}
          <TextButton
            className="justify-self-center"
            onClick={() => moveTo("password")}
          >
            Back to my password
          </TextButton>
        </div>
      </AuthCard>
    );
  }

  if (step === "new-password") {
    return (
      <AuthCard
        portal={portal}
        title="Choose a new password"
        description={
          leaked
            ? "Your old password turned up in a data leak elsewhere. Choose one you don't use on any other site."
            : "Use one you don't use on any other site."
        }
      >
        {chip}
        <form onSubmit={submitNewPassword} className="grid gap-4">
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <AuthField
            label="New password"
            hint="At least 8 characters."
            error={errorAt("password")}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                autoComplete="new-password"
                minLength={8}
                required
                autoFocus
              />
            )}
          </AuthField>
          <label className="flex items-center gap-2.5 text-sm text-body">
            <Checkbox name="signOutOthers" defaultChecked />
            Sign out of my other devices
          </label>
          {formError}
          <Button type="submit" size="lg" pending={busy} className="w-full">
            Save and sign in
          </Button>
        </form>
      </AuthCard>
    );
  }

  // The steps that ask for a code: to sign in, to reset, a new browser, a second step.
  const codeCopy: Record<
    "code" | "reset-code" | "trust" | "second-factor",
    { title: string; description: ReactNode }
  > = {
    code: {
      title: "Check your email",
      description: (
        <>
          We sent a 6-digit code to{" "}
          <strong className="text-body">{email}</strong>.
        </>
      ),
    },
    "reset-code": {
      title: "Reset your password",
      description: (
        <>
          Enter the code we sent to{" "}
          <strong className="text-body">{email}</strong>, then choose a new
          password.
        </>
      ),
    },
    trust: {
      title: "Confirm it's you",
      description: (
        <>
          You&rsquo;re signing in on a browser we haven&rsquo;t seen before. We
          sent a code to <strong className="text-body">{email}</strong>. This
          browser is asked once.
        </>
      ),
    },
    "second-factor": {
      title: "One more step",
      description:
        secondFactor === "totp"
          ? "Enter the 6-digit code from your authenticator app."
          : secondFactor === "phone_code"
            ? "We sent a 6-digit code to your phone."
            : "We sent a 6-digit code to your email.",
    },
  };
  const copy = codeCopy[step];

  return (
    <AuthCard portal={portal} title={copy.title} description={copy.description}>
      {step === "code" && !hasPassword ? (
        <p className="mb-5 rounded-control border border-brand/20 bg-brand-tint px-3.5 py-2.5 text-sm text-navy">
          This account has no password yet, so you sign in with a code. Once
          you&rsquo;re in, you can add a password.
        </p>
      ) : null}
      <form key={step} onSubmit={submitCode} className="grid gap-4">
        <AuthField label="Code" error={errorAt("code")}>
          {(control) => <CodeInput {...control} />}
        </AuthField>
        {formError}
        <Button type="submit" size="lg" pending={busy} className="w-full">
          Continue
        </Button>
      </form>
      <div className="mt-5 grid justify-items-center gap-2">
        {secondFactor === "totp" && step === "second-factor" ? null : (
          <ResendCode
            key={step}
            disabled={busy}
            onResend={async () => {
              setError(null);
              if (step === "code") return sendSignInCode();
              if (step === "reset-code") return sendResetCode();
              const { error: refusal } =
                secondFactor === "phone_code"
                  ? await signIn.mfa.sendPhoneCode()
                  : await signIn.mfa.sendEmailCode();
              return refusal ? fail(refusal, "form") : true;
            }}
          />
        )}
        {step === "code" && hasPassword ? (
          <TextButton onClick={() => moveTo("password")}>
            Use my password instead
          </TextButton>
        ) : null}
        <TextButton onClick={() => void startOver()}>
          Use another email
        </TextButton>
      </div>
    </AuthCard>
  );
}

/** One of two ways on, a title and a line under it, the whole box pressable. */
function ChoiceButton({
  title,
  detail,
  disabled,
  onClick,
}: {
  title: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid gap-0.5 rounded-control border border-card-edge bg-white px-4 py-3 text-left transition-colors hover:border-brand hover:bg-mist focus-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="text-xs text-muted">{detail}</span>
    </button>
  );
}
