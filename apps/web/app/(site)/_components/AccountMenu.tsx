"use client";

import { UserButton } from "@clerk/nextjs";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import { ACCOUNT_BOOKINGS_PATH, ACCOUNT_PATH } from "../../_lib/routes";

/**
 * Clerk's account button with our pages ahead of the built-in entries.
 * Clerk appends custom items unless the built-ins are listed too, so the
 * order here is the order in the menu.
 */
export function AccountMenu() {
  return (
    <UserButton appearance={clerkUserButton}>
      <UserButton.MenuItems>
        <UserButton.Link
          label="My bookings"
          href={ACCOUNT_BOOKINGS_PATH}
          labelIcon={<ListIcon />}
        />
        <UserButton.Link
          label="Account"
          href={ACCOUNT_PATH}
          labelIcon={<PersonIcon />}
        />
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
}

const icon = {
  viewBox: "0 0 16 16",
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  "aria-hidden": true,
} as const;

function ListIcon() {
  return (
    <svg {...icon}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...icon}>
      <circle cx="8" cy="5.5" r="3" />
      <path d="M2.5 14a5.5 5.5 0 0 1 11 0" />
    </svg>
  );
}
