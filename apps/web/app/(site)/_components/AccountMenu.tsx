"use client";

import { AccountMenu as Menu } from "@repo/auth/AccountMenu";
import { ListIcon } from "@repo/ui/icons";
import { ACCOUNT_BOOKINGS_PATH, ACCOUNT_PATH } from "../../_lib/routes";

const LINKS = [
  { label: "My bookings", href: ACCOUNT_BOOKINGS_PATH, icon: <ListIcon /> },
];

/** The signed-in customer's menu (@repo/auth): their bookings, their account, signing out. */
export function AccountMenu() {
  return <Menu accountHref={ACCOUNT_PATH} links={LINKS} />;
}
