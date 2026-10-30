"use client";

import { UserButton } from "@clerk/nextjs";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import { ListIcon, PersonIcon } from "@repo/ui/icons";
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
