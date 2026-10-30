"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import {
  authErrorMessage,
  authErrorOf,
  isPasswordError,
} from "@repo/auth/auth-errors";
import {
  AuthField,
  CodeInput,
  PasswordInput,
  ResendCode,
  TextButton,
} from "@repo/auth/AuthParts";
import { Card, CardTitle } from "@repo/console/Card";
import { VendorFieldsSection } from "@repo/console/VendorFieldsSection";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { toast } from "@repo/ui/toast";
import { showFieldError } from "@repo/ui/validation";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { STATUS_PATH } from "../_ui/nav";
import { ALREADY_REGISTERED_HREF } from "./paths";
import { checkRegistrationAction, registerVendorAction } from "./actions";

/** Where the form is kept while the tab is open, so a reload loses nothing. */
const STORAGE_KEY = "connect-registration";

/** The fields never kept: the password, and a signed-in account's own email. */
const NOT_KEPT = new Set(["password"]);

/** The step the dialog over the form asks for. */
type Step =
  /** A new account: the code that confirms the email. */
  | { name: "new" }
  /** An email that has an account: its password, or a code to sign in. */
  | { name: "existing"; way: "password" | "code" }
  /** A browser Clerk has not seen: the code that confirms it. */
  | { name: "trust" };

/**
 * Connect's registration, the whole form first: you, your business, what
 * you run and where, and for someone signed out a password. Sending it
 * checks the fields, then starts the account: a new email gets a code that
 * confirms it and makes the account; an email that has one signs in with
 * the password typed, or its own, or a code; either way the registration
 * goes in once signed in. An account that already registered a business,
 * or drives for one, is not sent a second: it goes home, to its status page
 * or to Connect. Nothing is stored before the email is confirmed; then the
 * names and phone are kept on the account too. The form is kept in the
 * tab's storage. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Connect".
 */
export function RegisterFlow({
  signedIn,
  locations,
}: {
  /** The account already signed in, whose names fill the form; null for a visitor. */
  signedIn: { email: string; firstName: string; lastName: string } | null;
  locations: { id: string; name: string }[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { signUp, fetchStatus: upStatus } = useSignUp();
  const { signIn, fetchStatus: inStatus } = useSignIn();
  const [step, setStep] = useState<Step | null>(null);
  // The email the code went to, as sent: the dialog names it.
  const [email, setEmail] = useState(signedIn?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<ReactNode>(null);
  const [sending, setSending] = useState(false);
  const busy = sending || upStatus === "fetching" || inStatus === "fetching";

  // Back from a reload: the form as it was, but the password.
  useEffect(() => {
    const kept = sessionStorage.getItem(STORAGE_KEY);
    const target = form.current;
    if (!kept || !target) return;
    try {
      const values = JSON.parse(kept) as Record<string, string[]>;
      for (const element of Array.from(target.elements)) {
        if (!(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ))
          continue;
        const value = values[element.name];
        // A signed-in account's email is its own, never the one kept.
        if (!value || element.readOnly) continue;
        if (
          element instanceof HTMLInputElement &&
          (element.type === "checkbox" || element.type === "radio")
        ) {
          element.checked = value.includes(element.value);
        } else {
          element.value = value[0] ?? "";
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function keep() {
    if (!form.current) return;
    const values: Record<string, string[]> = {};
    for (const [name, value] of new FormData(form.current)) {
      if (NOT_KEPT.has(name) || typeof value !== "string") continue;
      (values[name] ??= []).push(value);
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }

  /** The registration as the server reads it: the contact is the person, by name. */
  function registration() {
    const data = new FormData(form.current ?? undefined);
    const name = [data.get("firstName"), data.get("lastName")]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(" ");
    data.set("contactName", name);
    data.delete("password");
    return data;
  }

  /** A refusal about a field shows at it; any other beside the button. */
  function refuse(message: string, field?: string) {
    setStep(null);
    if (!field || !showFieldError(form.current, field, message)) {
      setError(message);
    }
  }

  /** Sends the registration from a signed-in session, then goes where the server says. */
  async function send() {
    const answer = await registerVendorAction(registration());
    if (answer && "error" in answer) {
      refuse(answer.error, answer.field);
      return;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    const href = answer?.href ?? STATUS_PATH;
    if (href === ALREADY_REGISTERED_HREF) {
      toast.info(
        "This account has registered already. Here is where it stands.",
      );
    } else {
      toast.success(
        "Sent. We check every registration and email you once Connect opens.",
      );
    }
    router.push(href);
  }

  /** Activates the session the code or the password opened, stays on the page, and sends. */
  async function finishAndSend(finalize: () => Promise<{ error: unknown }>) {
    const { error: refusal } = await finalize();
    if (refusal) {
      const message = authErrorOf(refusal);
      setStepError(message ? authErrorMessage(message) : null);
      return;
    }
    setStep(null);
    await send();
  }

  /** After a password or a code to an account that exists: in, a new browser's check, or not here. */
  async function afterSignIn() {
    if (signIn.status === "complete") {
      return finishAndSend(() =>
        signIn.finalize({ navigate: () => undefined }),
      );
    }
    if (
      signIn.status === "needs_client_trust" &&
      signIn.supportedSecondFactors.some(
        (factor) => factor.strategy === "email_code",
      )
    ) {
      const { error: refusal } = await signIn.mfa.sendEmailCode();
      if (refusal) return stepFail(refusal);
      setStepError(null);
      setStep({ name: "trust" });
      return;
    }
    setStep(null);
    setError(
      "This account needs a step we can't offer here. Sign in first, then come back to send it.",
    );
  }

  function stepFail(raw: unknown) {
    const refusal = authErrorOf(raw);
    if (refusal) setStepError(authErrorMessage(refusal));
    return undefined;
  }

  /** The email has an account: the password typed may be its own; else ask for it, or send a code. */
  async function signInExisting(address: string, typedPassword: string) {
    const { error: refusal } = await signIn.create({ identifier: address });
    if (refusal) {
      const message = authErrorOf(refusal);
      return refuse(message ? authErrorMessage(message) : "Try again.");
    }
    const hasPassword = signIn.supportedFirstFactors.some(
      (factor) => factor.strategy === "password",
    );
    if (hasPassword && typedPassword) {
      const tried = await signIn.password({ password: typedPassword });
      if (!tried.error) return afterSignIn();
    }
    setStepError(null);
    if (hasPassword) {
      setStep({ name: "existing", way: "password" });
      return;
    }
    await sendSignInCode();
  }

  async function sendSignInCode() {
    const { error: refusal } = await signIn.emailCode.sendCode();
    if (refusal) return stepFail(refusal);
    setStepError(null);
    setStep({ name: "existing", way: "code" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read before the first wait: React lets go of the event after it.
    const typed = new FormData(event.currentTarget);
    setError(null);
    setSending(true);
    try {
      const data = registration();
      const checked = await checkRegistrationAction(data);
      if (checked && "error" in checked)
        return refuse(checked.error, checked.field);
      if (signedIn) return await send();

      const address = String(typed.get("email") ?? "")
        .trim()
        .toLowerCase();
      const password = String(typed.get("password") ?? "");
      setEmail(address);
      const { error: refusal } = await signUp.password({
        emailAddress: address,
        password,
        firstName: String(typed.get("firstName") ?? "").trim(),
        lastName: String(typed.get("lastName") ?? "").trim() || undefined,
      });
      if (refusal) {
        const message = authErrorOf(refusal);
        if (!message) return;
        if (message.code === "form_identifier_exists") {
          return await signInExisting(address, password);
        }
        return refuse(
          authErrorMessage(message),
          isPasswordError(message)
            ? "password"
            : message.code.startsWith("form_identifier") ||
                message.code === "form_param_format_invalid"
              ? "email"
              : undefined,
        );
      }
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        const message = authErrorOf(sent.error);
        return refuse(message ? authErrorMessage(message) : "Try again.");
      }
      setStepError(null);
      setStep({ name: "new" });
    } finally {
      setSending(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!step) return;
    setStepError(null);
    setSending(true);
    try {
      const data = new FormData(event.currentTarget);
      const code = String(data.get("code") ?? "");
      if (step.name === "new") {
        const { error: refusal } = await signUp.verifications.verifyEmailCode({
          code,
        });
        if (refusal) return stepFail(refusal);
        if (signUp.status !== "complete") {
          setStepError("The account isn't finished. Contact us on WhatsApp.");
          return;
        }
        return await finishAndSend(() =>
          signUp.finalize({ navigate: () => undefined }),
        );
      }
      const { error: refusal } =
        step.name === "trust"
          ? await signIn.mfa.verifyEmailCode({ code })
          : step.way === "code"
            ? await signIn.emailCode.verifyCode({ code })
            : await signIn.password({
                password: String(data.get("password") ?? ""),
              });
      if (refusal) return stepFail(refusal);
      await afterSignIn();
    } finally {
      setSending(false);
    }
  }

  const stepCopy: Record<string, { title: string; description: ReactNode }> = {
    new: {
      title: "Check your email",
      description: (
        <>
          We sent a 6-digit code to{" "}
          <strong className="text-body">{email}</strong>. It confirms your email
          and sets up your account; your registration goes in right after.
        </>
      ),
    },
    "existing-password": {
      title: "This email already has an account",
      description:
        "Enter its password to confirm it's you. Your registration goes in right after.",
    },
    "existing-code": {
      title: "This email already has an account",
      description: (
        <>
          We sent a 6-digit code to{" "}
          <strong className="text-body">{email}</strong> to confirm it&rsquo;s
          you. Your registration goes in right after.
        </>
      ),
    },
    trust: {
      title: "Confirm this browser",
      description: (
        <>
          It&rsquo;s the first time this browser signs in to your account. We
          sent a code to <strong className="text-body">{email}</strong>.
        </>
      ),
    },
  };
  const copyKey = step
    ? step.name === "existing"
      ? `existing-${step.way}`
      : step.name
    : "new";
  const copy = stepCopy[copyKey]!;
  const asksPassword = step?.name === "existing" && step.way === "password";

  return (
    <>
      <form ref={form} onSubmit={submit} onInput={keep} className="grid gap-5">
        <Card>
          <CardTitle>You</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input
                name="firstName"
                required
                autoComplete="given-name"
                defaultValue={signedIn?.firstName}
              />
            </Field>
            <Field label="Last name">
              <Input
                name="lastName"
                autoComplete="family-name"
                defaultValue={signedIn?.lastName}
              />
            </Field>
            <Field
              label="Email"
              hint={
                signedIn
                  ? "Your account's email: where we write to you."
                  : "Where we write to you, and how you sign in."
              }
            >
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                readOnly={signedIn !== null}
                defaultValue={signedIn?.email}
              />
            </Field>
            <Field
              label="Phone number"
              hint="Your WhatsApp, with the country code. We reach you here, and keep it on your account."
            >
              <Input
                name="contactPhone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+60 12-345 6789"
              />
            </Field>
          </div>
        </Card>

        <VendorFieldsSection locations={locations} applicant />

        {signedIn ? null : (
          <Card>
            <CardTitle>Signing in</CardTitle>
            <div className="grid gap-4">
              <Field
                label="Password"
                hint="At least 8 characters. You can also sign in with a code sent to your email."
              >
                <PasswordInput
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              {/* Clerk's bot check draws itself here when it needs to ask. */}
              <div id="clerk-captcha" />
            </div>
          </Card>
        )}

        <div className="grid gap-3 rounded-card border border-card-edge bg-white p-5 shadow-card sm:flex sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {signedIn ? (
              <>
                Sending as{" "}
                <strong className="text-body">{signedIn.email}</strong>.
              </>
            ) : (
              "We'll set up your account with this email and send a code to confirm it."
            )}
          </p>
          <Button type="submit" size="lg" pending={busy && step === null}>
            <Send aria-hidden className="size-4" />
            Send my registration
          </Button>
        </div>
        <FormError error={error} />
      </form>

      <Dialog
        open={step !== null}
        onOpenChange={(open) => {
          if (!open) setStep(null);
        }}
        title={copy.title}
        description={copy.description}
      >
        <form key={copyKey} onSubmit={confirm} className="grid gap-4">
          {asksPassword ? (
            <>
              <input
                type="email"
                name="username"
                autoComplete="username"
                value={email}
                readOnly
                hidden
              />
              <AuthField label="Password" error={stepError}>
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
              <TextButton
                className="justify-self-start"
                disabled={busy}
                onClick={() => void sendSignInCode()}
              >
                Forgot it? Email me a code instead
              </TextButton>
            </>
          ) : (
            <>
              <AuthField label="Code" error={stepError}>
                {(control) => <CodeInput {...control} />}
              </AuthField>
              <ResendCode
                key={copyKey}
                disabled={busy}
                onResend={async () => {
                  const { error: refusal } =
                    step?.name === "new"
                      ? await signUp.verifications.sendEmailCode()
                      : step?.name === "trust"
                        ? await signIn.mfa.sendEmailCode()
                        : await signIn.emailCode.sendCode();
                  if (refusal) {
                    stepFail(refusal);
                    return false;
                  }
                  return true;
                }}
              />
            </>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setStep(null)}>
              {step?.name === "new" ? "Change my email" : "Cancel"}
            </Button>
            <Button type="submit" pending={busy}>
              Confirm and send
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
