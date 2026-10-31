"use client";

import {
  useClerk,
  useReverification,
  useSession,
  useUser,
} from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { Checkbox } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { authErrorMessage, authErrorOf, type AuthError } from "./auth-errors";
import {
  AuthAlert,
  AuthField,
  AuthInput,
  CodeInput,
  PasswordInput,
  ResendCode,
  TextButton,
} from "./AuthParts";
import { Avatar } from "./AccountMenu";

/**
 * The account window, ours in place of Clerk's: the photo and the name,
 * the email (shown; our team changes it on request), the password (added
 * where there is none, changed where there is), the devices signed in, each
 * to sign out, and signing out here. The same in the three apps, each
 * putting it in its own page. A change Clerk counts as sensitive asks the
 * person to confirm it is them first, in our dialog (`IdentityCheck`).
 * `offerPassword` puts the password first, for an account without one that
 * has just signed in by code; "Not now" goes on to `next`.
 */
export function AccountSettings({
  offerPassword,
  afterSignOutUrl = "/",
}: {
  offerPassword?: { next: string };
  afterSignOutUrl?: string;
}) {
  const { user, isLoaded } = useUser();
  if (!isLoaded || !user) {
    return (
      <div className="grid gap-5">
        <div className="h-40 animate-pulse rounded-card bg-hairline" />
        <div className="h-40 animate-pulse rounded-card bg-hairline" />
      </div>
    );
  }
  const offering =
    offerPassword && !user.passwordEnabled ? offerPassword : null;

  return (
    <IdentityCheck>
      <div className="grid gap-5">
        {offering ? <PasswordSection offer={offering} /> : null}
        <NameSection />
        <EmailSection />
        {offering ? null : <PasswordSection />}
        <DevicesSection />
        <SignOutSection afterSignOutUrl={afterSignOutUrl} />
      </div>
    </IdentityCheck>
  );
}

/** One part of the account window: a white card, its title and a line under it. */
function Section({
  title,
  description,
  highlight = false,
  children,
}: {
  title: string;
  description?: ReactNode;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        highlight
          ? "rounded-card border border-brand bg-white p-5 shadow-card ring-4 ring-brand-tint"
          : "rounded-card border border-card-edge bg-white p-5 shadow-card"
      }
    >
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Clerk's refusal in our words, or nothing for a check the person closed. */
function refusalOf(error: unknown): AuthError | null {
  if (isReverificationCancelledError(error)) return null;
  return authErrorOf(error);
}

/** The largest photo Clerk takes. */
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

function NameSection() {
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  if (!user) return null;

  /** Uploads a photo to Clerk, or removes the one it holds with null. */
  async function setPhoto(file: File | null) {
    if (!user) return;
    if (file && !file.type.startsWith("image/")) {
      setError("Choose a photo: a JPG, PNG or WebP.");
      return;
    }
    if (file && file.size > PHOTO_MAX_BYTES) {
      setError("Choose a photo under 10 MB.");
      return;
    }
    setError(null);
    setPhotoBusy(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      toast.success(file ? "Photo saved." : "Photo removed.");
    } catch (caught) {
      const refusal = refusalOf(caught);
      if (refusal) setError(authErrorMessage(refusal));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const data = new FormData(event.currentTarget);
    setError(null);
    setSaving(true);
    try {
      await user.update({
        firstName: String(data.get("firstName") ?? "").trim(),
        lastName: String(data.get("lastName") ?? "").trim(),
      });
      toast.success("Name saved.");
    } catch (caught) {
      const refusal = refusalOf(caught);
      if (refusal) setError(authErrorMessage(refusal));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Your profile"
      description="Your photo, how we greet you, and the name on your bookings."
    >
      <form onSubmit={save} className="grid gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            imageUrl={user.hasImage ? user.imageUrl : null}
            name={
              user.fullName || (user.primaryEmailAddress?.emailAddress ?? "")
            }
            className="size-16 text-base"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                if (file) void setPhoto(file);
              }}
            />
            <Button
              variant="secondary"
              pending={photoBusy}
              onClick={() => photoInput.current?.click()}
            >
              {user.hasImage ? "Change photo" : "Upload photo"}
            </Button>
            {user.hasImage ? (
              <Button
                variant="ghost"
                disabled={photoBusy}
                onClick={() => void setPhoto(null)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <AuthField label="First name">
              {(control) => (
                <AuthInput
                  {...control}
                  name="firstName"
                  autoComplete="given-name"
                  defaultValue={user.firstName ?? ""}
                  required
                />
              )}
            </AuthField>
            <AuthField label="Last name">
              {(control) => (
                <AuthInput
                  {...control}
                  name="lastName"
                  autoComplete="family-name"
                  defaultValue={user.lastName ?? ""}
                />
              )}
            </AuthField>
          </div>
        </div>
        <AuthAlert>{error}</AuthAlert>
        <div>
          <Button type="submit" pending={saving}>
            Save name
          </Button>
        </div>
      </form>
    </Section>
  );
}

/**
 * The email the account signs in with, shown, not changed here: it is who
 * the person is to us, their bookings and their Connect access. Our team
 * changes it on request, in the console's All Users.
 */
function EmailSection() {
  const { user } = useUser();
  if (!user) return null;
  return (
    <Section
      title="Email"
      description="Where your codes and booking emails go, and how you sign in. To change it, contact us."
    >
      <span className="text-sm font-medium text-body">
        {user.primaryEmailAddress?.emailAddress ?? ""}
      </span>
    </Section>
  );
}

function PasswordSection({ offer }: { offer?: { next: string } }) {
  const { user } = useUser();
  const router = useRouter();
  const [error, setError] = useState<{
    at: "current" | "new" | "form";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(Boolean(offer));

  const savePassword = useGuarded(
    async (params: {
      currentPassword?: string;
      newPassword: string;
      signOutOfOtherSessions: boolean;
    }) => {
      if (!user) throw new Error("Signed out.");
      await user.updatePassword(params);
    },
  );

  if (!user) return null;
  const has = user.passwordEnabled;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    setSaving(true);
    try {
      await savePassword({
        currentPassword: has ? String(data.get("currentPassword")) : undefined,
        newPassword: String(data.get("newPassword")),
        signOutOfOtherSessions: data.get("signOutOthers") === "on",
      });
      toast.success(
        has
          ? "Password changed."
          : "Password added. Sign in with it next time, or with a code.",
      );
      form.reset();
      setOpen(false);
      if (offer) router.push(offer.next);
    } catch (caught) {
      const refusal = refusalOf(caught);
      if (refusal) {
        setError({
          at:
            refusal.code === "form_password_incorrect"
              ? "current"
              : refusal.code.startsWith("form_password")
                ? "new"
                : "form",
          text: authErrorMessage(refusal),
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title={has ? "Password" : "Add a password"}
      highlight={Boolean(offer)}
      description={
        has
          ? "You sign in with your password, or with a code sent to your email."
          : offer
            ? "You signed in with a code. Add a password to sign in with it next time; a code still works too."
            : "This account has no password: you sign in with a code sent to your email. Add one to sign in with a password too."
      }
    >
      {open ? (
        <form onSubmit={save} className="grid gap-4">
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={user.primaryEmailAddress?.emailAddress ?? ""}
            readOnly
            hidden
          />
          {has ? (
            <AuthField
              label="Current password"
              error={error?.at === "current" ? error.text : null}
            >
              {(control) => (
                <PasswordInput
                  {...control}
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                />
              )}
            </AuthField>
          ) : null}
          <AuthField
            label={has ? "New password" : "Password"}
            hint="At least 8 characters, one you don't use on any other site."
            error={error?.at === "new" ? error.text : null}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="newPassword"
                autoComplete="new-password"
                minLength={8}
                required
                autoFocus={Boolean(offer)}
              />
            )}
          </AuthField>
          <label className="flex items-center gap-2.5 text-sm text-body">
            <Checkbox name="signOutOthers" defaultChecked={has} />
            Sign out of my other devices
          </label>
          <AuthAlert>{error?.at === "form" ? error.text : null}</AuthAlert>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" pending={saving}>
              {has ? "Change password" : "Add password"}
            </Button>
            {offer ? (
              <Button asChild variant="ghost">
                <Link href={offer.next}>Not now</Link>
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {has ? "Change password" : "Add a password"}
        </Button>
      )}
    </Section>
  );
}

type Device = {
  id: string;
  label: string;
  where: string | null;
  lastActive: Date;
  revoke: () => Promise<unknown>;
};

function DevicesSection() {
  const { user } = useUser();
  const { session } = useSession();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!user) return;
    let live = true;
    user
      .getSessions()
      .then((sessions) => {
        if (!live) return;
        setDevices(
          sessions.map((entry) => {
            const activity = entry.latestActivity;
            const browser = [
              activity?.browserName,
              activity?.browserVersion?.split(".")[0],
            ]
              .filter(Boolean)
              .join(" ");
            return {
              id: entry.id,
              label:
                [browser, activity?.deviceType].filter(Boolean).join(" on ") ||
                (activity?.isMobile ? "A phone" : "A browser"),
              where:
                [activity?.city, activity?.country]
                  .filter(Boolean)
                  .join(", ") || null,
              lastActive: entry.lastActiveAt,
              revoke: () => entry.revoke(),
            };
          }),
        );
      })
      .catch((caught: unknown) => {
        const refusal = refusalOf(caught);
        if (live && refusal) setError(authErrorMessage(refusal));
      });
    return () => {
      live = false;
    };
  }, [user, round]);

  const signOutDevice = useGuarded(async (device: Device) => device.revoke());

  return (
    <Section
      title="Devices"
      description="Where your account is signed in. Sign out of any you don't know or no longer use."
    >
      {devices === null ? (
        error ? (
          <AuthAlert>{error}</AuthAlert>
        ) : (
          <div className="h-16 animate-pulse rounded-control bg-hairline" />
        )
      ) : (
        <ul className="divide-y divide-hairline">
          {devices.map((device) => {
            const current = device.id === session?.id;
            return (
              <li
                key={device.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-body">
                    {device.label}
                    {current ? <Badge tone="green">This device</Badge> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {[
                      device.where,
                      `Last active ${formatWhen(device.lastActive)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {current ? null : (
                  <Button
                    variant="danger"
                    size="sm"
                    pending={busyId === device.id}
                    onClick={async () => {
                      setBusyId(device.id);
                      setError(null);
                      try {
                        await signOutDevice(device);
                        toast.success("Signed out of that device.");
                        setRound((value) => value + 1);
                      } catch (caught) {
                        const refusal = refusalOf(caught);
                        if (refusal) setError(authErrorMessage(refusal));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {devices && error ? <AuthAlert>{error}</AuthAlert> : null}
    </Section>
  );
}

/** "today, 14:05", "3 Oct, 09:12": when a device was last used. */
function formatWhen(date: Date) {
  const sameDay = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `today, ${time}`;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
}

function SignOutSection({ afterSignOutUrl }: { afterSignOutUrl: string }) {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);
  return (
    <div className="flex justify-end">
      <Button
        variant="secondary"
        pending={pending}
        onClick={() => {
          setPending(true);
          void signOut({ redirectUrl: afterSignOutUrl });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}

// --- Confirming it's you -------------------------------------------------

/** What Clerk hands over when a change needs the person to confirm it is them. */
type CheckRequest = { complete: () => void; cancel: () => void };

const IdentityContext = createContext<(request: CheckRequest) => void>(
  () => {},
);

/**
 * A change Clerk counts as sensitive (a new email, the password, signing out
 * a device), wrapped so that when Clerk asks the person to confirm it is
 * them, our dialog asks, then the change runs again by itself.
 */
function useGuarded<Args extends unknown[], Result>(
  work: (...args: Args) => Promise<Result>,
) {
  const ask = useContext(IdentityContext);
  return useReverification(work, { onNeedsReverification: ask });
}

/**
 * The dialog that confirms it is the person: their password where the
 * account has one, else a code to their email. Closed, the change it was
 * asked for is dropped quietly.
 */
function IdentityCheck({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<CheckRequest | null>(null);
  return (
    <IdentityContext.Provider value={setRequest}>
      {children}
      <IdentityDialog
        request={request}
        onDone={(confirmed) => {
          if (confirmed) request?.complete();
          else request?.cancel();
          setRequest(null);
        }}
      />
    </IdentityContext.Provider>
  );
}

function IdentityDialog({
  request,
  onDone,
}: {
  request: CheckRequest | null;
  onDone: (confirmed: boolean) => void;
}) {
  const { session } = useSession();
  const { user } = useUser();
  const [byCode, setByCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const usePassword = Boolean(user?.passwordEnabled) && !byCode;

  function close(confirmed: boolean) {
    setByCode(false);
    setCodeSent(false);
    setError(null);
    onDone(confirmed);
  }

  async function attempt(work: () => Promise<boolean>) {
    setError(null);
    setWorking(true);
    try {
      if (await work()) close(true);
    } catch (caught) {
      const refusal = authErrorOf(caught);
      if (refusal) setError(authErrorMessage(refusal));
    } finally {
      setWorking(false);
    }
  }

  async function sendCode() {
    if (!session) return false;
    const started = await session.startVerification({ level: "first_factor" });
    const factor = started.supportedFirstFactors?.find(
      (option) => option.strategy === "email_code",
    );
    if (!factor || !("emailAddressId" in factor)) {
      setError("We can't send a code to this account. Use your password.");
      return false;
    }
    await session.prepareFirstFactorVerification({
      strategy: "email_code",
      emailAddressId: factor.emailAddressId,
    });
    setCodeSent(true);
    return true;
  }

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
      title="Confirm it's you"
      description={
        usePassword
          ? "Enter your password to make this change."
          : "We send a code to your email to make this change."
      }
    >
      {usePassword ? (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const password = String(
              new FormData(event.currentTarget).get("password"),
            );
            void attempt(async () => {
              if (!session) return false;
              await session.startVerification({ level: "first_factor" });
              const result = await session.attemptFirstFactorVerification({
                strategy: "password",
                password,
              });
              return finished(result.status, setError);
            });
          }}
        >
          <AuthField label="Password" error={error}>
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
            onClick={() => setByCode(true)}
          >
            Email me a code instead
          </TextButton>
          <DialogActions>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" pending={working}>
              Confirm
            </Button>
          </DialogActions>
        </form>
      ) : codeSent ? (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const code = String(new FormData(event.currentTarget).get("code"));
            void attempt(async () => {
              if (!session) return false;
              const result = await session.attemptFirstFactorVerification({
                strategy: "email_code",
                code,
              });
              return finished(result.status, setError);
            });
          }}
        >
          <AuthField label="Code" error={error}>
            {(control) => <CodeInput {...control} />}
          </AuthField>
          <ResendCode
            disabled={working}
            onResend={async () => {
              try {
                return await sendCode();
              } catch (caught) {
                const refusal = authErrorOf(caught);
                if (refusal) setError(authErrorMessage(refusal));
                return false;
              }
            }}
          />
          <DialogActions>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" pending={working}>
              Confirm
            </Button>
          </DialogActions>
        </form>
      ) : (
        <div className="grid gap-4">
          <AuthAlert>{error}</AuthAlert>
          <DialogActions>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              pending={working}
              onClick={() =>
                void attempt(async () => {
                  await sendCode();
                  // Sent, the dialog asks for the code; it is not confirmed yet.
                  return false;
                })
              }
            >
              Send me a code
            </Button>
          </DialogActions>
        </div>
      )}
    </Dialog>
  );
}

/** True once Clerk counts the person confirmed; a second step it asks for is not offered here. */
function finished(status: string, setError: (text: string) => void) {
  if (status === "complete") return true;
  setError("This account needs a second step we can't offer here. Contact us.");
  return false;
}
