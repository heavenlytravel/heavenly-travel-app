"use client";

import { useSignUp } from "@clerk/nextjs";
import { Button } from "@repo/ui/button";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { authErrorMessage, authErrorOf } from "./auth-errors";
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
import { openSignedIn, REDIRECT_PARAM, safeRedirect } from "./redirect";

type Where = "firstName" | "lastName" | "email" | "password" | "code" | "form";

/** The sign-up form's fields, kept while the code is asked for, so "Change" brings them back. */
type Details = {
  firstName: string;
  lastName: string;
  email: string;
};

/**
 * Our own sign-up, on Clerk's custom flow (`useSignUp`): the names, the
 * email and a password, then the code sent to the email, which makes the
 * account and signs it in. The password is the way in, as the CEO wants;
 * the sign-in also offers a code. `?email=` fills the email (a guest's
 * booking emails link here with it), and the bot check runs in
 * `#clerk-captcha` as the details are sent. The website's only; Connect
 * signs up through its registration. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Our own sign-in".
 */
export function SignUpFlow({
  portal,
  fallbackRedirect = "/",
  footer,
  signInPath,
}: {
  portal: string;
  fallbackRedirect?: string;
  /** Under the first card: the way to sign in. */
  footer?: ReactNode;
  /** The sign-in, opened with the email filled for an email that has an account. */
  signInPath: string;
}) {
  const { signUp, fetchStatus } = useSignUp();
  const params = useSearchParams();
  const busy = fetchStatus === "fetching";

  const [step, setStep] = useState<"details" | "code">("details");
  const [details, setDetails] = useState<Details>({
    firstName: "",
    lastName: "",
    email: params.get("email") ?? "",
  });
  const [error, setError] = useState<{ at: Where; text: ReactNode } | null>(
    null,
  );
  const errorAt = (where: Where) => (error?.at === where ? error.text : null);

  function fail(raw: unknown, where: Where): false {
    const refusal = authErrorOf(raw);
    if (!refusal) return false;
    const param = (refusal.meta.paramName ?? refusal.meta.param_name) as
      string | undefined;
    if (
      refusal.code === "form_identifier_exists" ||
      refusal.code === "form_email_address_exists"
    ) {
      setError({
        at: "email",
        text: (
          <>
            There&rsquo;s already an account with this email.{" "}
            <a
              href={`${signInPath}?${new URLSearchParams({ email: details.email })}`}
              className="font-semibold underline underline-offset-2"
            >
              Sign in instead
            </a>
            .
          </>
        ),
      });
      return false;
    }
    const at: Where = refusal.code.startsWith("form_password")
      ? "password"
      : param === "first_name"
        ? "firstName"
        : param === "last_name"
          ? "lastName"
          : param === "email_address" ||
              refusal.code === "form_param_format_invalid"
            ? "email"
            : where;
    setError({ at, text: authErrorMessage(refusal) });
    return false;
  }

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const typed: Details = {
      firstName: String(data.get("firstName") ?? "").trim(),
      lastName: String(data.get("lastName") ?? "").trim(),
      email: String(data.get("email") ?? "")
        .trim()
        .toLowerCase(),
    };
    setDetails(typed);
    const { error: refusal } = await signUp.password({
      emailAddress: typed.email,
      password: String(data.get("password")),
      firstName: typed.firstName,
      lastName: typed.lastName || undefined,
    });
    if (refusal) return fail(refusal, "form");
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) return fail(sent.error, "form");
    setStep("code");
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const code = String(new FormData(event.currentTarget).get("code"));
    const { error: refusal } = await signUp.verifications.verifyEmailCode({
      code,
    });
    if (refusal) return fail(refusal, "code");
    if (signUp.status !== "complete") {
      setError({
        at: "form",
        text: "The account isn't finished. Start again, or contact us.",
      });
      return;
    }
    const destination = safeRedirect(
      params.get(REDIRECT_PARAM),
      fallbackRedirect,
      window.location.origin,
    );
    const done = await signUp.finalize({
      navigate: (session) => openSignedIn(session, destination),
    });
    if (done.error) fail(done.error, "form");
  }

  if (step === "code") {
    return (
      <AuthCard
        portal={portal}
        title="Check your email"
        description="Enter the 6-digit code we sent to confirm your email. It makes your account."
      >
        <EmailChip email={details.email} onChange={() => setStep("details")} />
        <form onSubmit={submitCode} className="grid gap-4">
          <AuthField label="Code" error={errorAt("code")}>
            {(control) => <CodeInput {...control} />}
          </AuthField>
          <AuthAlert>{errorAt("form")}</AuthAlert>
          <Button type="submit" size="lg" pending={busy} className="w-full">
            Create my account
          </Button>
        </form>
        <div className="mt-5 grid justify-items-center gap-2">
          <ResendCode
            disabled={busy}
            onResend={async () => {
              setError(null);
              const { error: refusal } =
                await signUp.verifications.sendEmailCode();
              return refusal ? fail(refusal, "form") : true;
            }}
          />
          <TextButton onClick={() => setStep("details")}>
            Change my details
          </TextButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      portal={portal}
      title="Create your account"
      description="Book faster, and find every booking in one place."
      footer={footer}
    >
      <form onSubmit={submitDetails} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField label="First name" error={errorAt("firstName")}>
            {(control) => (
              <AuthInput
                {...control}
                name="firstName"
                autoComplete="given-name"
                defaultValue={details.firstName}
                required
                autoFocus
              />
            )}
          </AuthField>
          <AuthField label="Last name" error={errorAt("lastName")}>
            {(control) => (
              <AuthInput
                {...control}
                name="lastName"
                autoComplete="family-name"
                defaultValue={details.lastName}
              />
            )}
          </AuthField>
        </div>
        <AuthField label="Email" error={errorAt("email")}>
          {(control) => (
            <AuthInput
              {...control}
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={details.email}
              required
            />
          )}
        </AuthField>
        <AuthField
          label="Password"
          hint="At least 8 characters. You can also sign in with a code sent to your email."
          error={errorAt("password")}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          )}
        </AuthField>
        {/* Clerk's bot check draws itself here when it needs to ask. */}
        <div id="clerk-captcha" />
        <AuthAlert>{errorAt("form")}</AuthAlert>
        <Button type="submit" size="lg" pending={busy} className="w-full">
          Continue
        </Button>
      </form>
    </AuthCard>
  );
}
