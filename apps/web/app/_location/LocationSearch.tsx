"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import type {
  LocationSearch as SearchAreas,
  LocationViewAddress,
} from "@repo/db";
import { usePathname } from "next/navigation";
import { SiteHeader } from "../(site)/_components/SiteHeader";
import { focus } from "../(site)/_components/Page";
import {
  SearchProvider,
  useSearchCard,
} from "../_components/search/SearchProvider";
import { bookableCategory } from "../_lib/transportation-booking";

/** The client pieces of a location's pages. */

/**
 * The site header on a location's pages. These pages do not read the
 * session on the server, so the header asks the browser and shows neither
 * the links nor the sign-in button until it knows.
 */
export function LocationHeader() {
  const { isLoaded, isSignedIn } = useAuth();
  return <SiteHeader signedIn={isLoaded ? isSignedIn === true : null} />;
}

/**
 * The search card's state for a location's pages. The card keeps to the
 * location: `search`, read off its zones and its drop-off rule. The empty
 * drop-off offers the location's saved addresses where a trip may end, and
 * on a product page the card opens on that product's tab: the product is
 * the last part of the address, which no location's slug can be.
 */
export function LocationSearch({
  slug,
  name,
  addresses,
  search,
  preview,
  children,
}: {
  slug: string;
  name: string;
  addresses: LocationViewAddress[];
  /** What the card keeps to; null searches all of Malaysia. */
  search: SearchAreas | null;
  /** Whether this is the staff preview, whose checks read a location the public may not see. */
  preview: boolean;
  children: ReactNode;
}) {
  const product = bookableCategory(usePathname().split("/").at(-1));
  return (
    <SearchProvider
      product={product ?? undefined}
      location={search ? { slug, preview, search } : undefined}
      dropoffs={{
        heading: `Popular in ${name}`,
        options: addresses.map((address) => ({
          placeId: address.placeId,
          label: address.name,
          detail: address.address,
        })),
      }}
    >
      {children}
    </SearchProvider>
  );
}

/**
 * Fills a highlight's saved address into the drop-off and brings the card
 * into view; nothing where the location's rule does not let a trip end, as
 * the card would refuse it.
 */
export function TakeMeHere({ address }: { address: LocationViewAddress }) {
  const { fillDropoff, offersDropoff } = useSearchCard();
  if (!offersDropoff(address.placeId)) return null;
  return (
    <button
      type="button"
      onClick={() =>
        fillDropoff({ label: address.name, placeId: address.placeId })
      }
      className={`mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-[#073c36]/35 px-[17px] text-[0.9rem] font-bold text-[#073c36] hover:border-[#073c36] hover:bg-[#e8f2ef] ${focus}`}
    >
      Take me here <span className="ml-2.5">→</span>
    </button>
  );
}
