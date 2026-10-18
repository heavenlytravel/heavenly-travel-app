"use client";

import { ExternalLinkIcon } from "@repo/ui/icons";
import { SidebarLabel, SidebarMenuButton } from "@repo/ui/sidebar";

/**
 * The row at the panel's foot that opens the location's public page in a
 * new tab; collapsed to a rail, the icon alone with the label as its
 * tooltip. A client component so the row's whole content, icon included,
 * is made on the client: a row handed over from the server with a server
 * component inside can reach the row as a lazy reference while the page
 * streams, and would hydrate as a button.
 */
export function PublicPageLink({ href }: { href: string }) {
  return (
    <SidebarMenuButton asChild tooltip="Open the public page">
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLinkIcon />
        <SidebarLabel>Open the public page</SidebarLabel>
      </a>
    </SidebarMenuButton>
  );
}
