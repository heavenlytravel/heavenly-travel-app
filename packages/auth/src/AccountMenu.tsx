"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { cx } from "@repo/ui/cx";
import { LogOutIcon, PersonIcon } from "@repo/ui/icons";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@repo/ui/menu";
import Link from "next/link";
import type { ReactNode } from "react";

export type AccountMenuLink = { label: string; href: string; icon?: ReactNode };

/**
 * The signed-in person's menu, ours in place of Clerk's user button: their
 * picture or initials, which open their name and email, the app's own
 * links ("My bookings"), "Your account" and "Sign out". In a header it is
 * the round picture alone; in Connect's side menu (`showName`) the name
 * and email stand beside it. While Clerk loads, a circle keeps its place;
 * signed out, nothing.
 */
export function AccountMenu({
  accountHref,
  links = [],
  afterSignOutUrl = "/",
  showName = false,
  align = "end",
}: {
  accountHref: string;
  links?: readonly AccountMenuLink[];
  afterSignOutUrl?: string;
  showName?: boolean;
  align?: "start" | "end";
}) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (isLoaded && !user) return null;
  if (!user) {
    return (
      <span
        aria-hidden
        className="inline-block size-8 shrink-0 rounded-full bg-hairline"
      />
    );
  }

  const name = user.fullName?.trim() || null;
  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <Menu
      label="Your account"
      align={align}
      trigger={
        <button
          type="button"
          aria-label={`Your account: ${name ?? email}`}
          className={cx(
            "inline-flex min-w-0 items-center gap-2.5 rounded-full focus-ring",
            showName &&
              "w-full rounded-control p-1.5 text-left hover:bg-white/10",
          )}
        >
          <Avatar
            imageUrl={user.hasImage ? user.imageUrl : null}
            name={name ?? email}
          />
          {showName ? (
            <span className="grid min-w-0 leading-tight">
              <span className="truncate text-sm font-semibold">
                {name ?? email}
              </span>
              {name ? (
                <span className="truncate text-xs opacity-70">{email}</span>
              ) : null}
            </span>
          ) : null}
        </button>
      }
    >
      <MenuLabel className="grid gap-0.5 pt-2 pb-2">
        {name ? (
          <span className="truncate text-sm font-semibold text-body">
            {name}
          </span>
        ) : null}
        <span className="truncate font-normal">{email}</span>
      </MenuLabel>
      <MenuSeparator />
      {links.map((link) => (
        <MenuItem key={link.href} asChild>
          <Link href={link.href}>
            {link.icon}
            {link.label}
          </Link>
        </MenuItem>
      ))}
      <MenuItem asChild>
        <Link href={accountHref}>
          <PersonIcon />
          Your account
        </Link>
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => void signOut({ redirectUrl: afterSignOutUrl })}>
        <LogOutIcon />
        Sign out
      </MenuItem>
    </Menu>
  );
}

/** The person's picture, or the first letters of their name on the brand's tint. */
export function Avatar({
  imageUrl,
  name,
  className,
}: {
  imageUrl: string | null;
  name: string;
  className?: string;
}) {
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return imageUrl ? (
    // Clerk's image host, at 32px: not worth next/image's loader.
    <img
      src={imageUrl}
      alt=""
      className={cx("size-8 shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      aria-hidden
      className={cx(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white",
        className,
      )}
    >
      {initials}
    </span>
  );
}
