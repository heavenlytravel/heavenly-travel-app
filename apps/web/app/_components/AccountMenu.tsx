"use client";

import { UserButton } from "@clerk/nextjs";
import { ACCOUNT_BOOKINGS_PATH } from "../_lib/routes";

/**
 * Clerk's account button with My bookings ahead of the built-in entries.
 * Clerk appends custom items unless the built-ins are listed too, so the
 * order here is the order in the menu.
 */
export function AccountMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="My bookings"
          href={ACCOUNT_BOOKINGS_PATH}
          labelIcon={<ListIcon />}
        />
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
}

function ListIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
    </svg>
  );
}
