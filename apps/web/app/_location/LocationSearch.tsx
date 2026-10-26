"use client";

import type { ReactNode } from "react";
import type {
  LocationSearch as SearchAreas,
  LocationViewAddress,
} from "@repo/db";
import { usePathname } from "next/navigation";
import { focus } from "../(site)/_components/Page";
import {
  SearchProvider,
  useSearchCard,
} from "../_components/search/SearchProvider";
import { bookableCategory } from "../_lib/transportation-booking";

/** The client pieces of a location's pages. */

/**
 * The search card's state for a location's pages. The card starts at the
 * location and books anywhere, as the home page's: `search`, read off its
 * zones and where its trips may go, puts the location's area first in the
 * place fields. The empty pick-up offers the location's saved addresses
 * where a pickup is served, the empty drop-off those where a trip from it
 * may end. On the pages of a product, its own and its classes', the card
 * opens on that product's tab: the product is the part of the address
 * after the location's slug.
 */
export function LocationSearch({
  slug,
  name,
  addresses,
  search,
  children,
}: {
  slug: string;
  name: string;
  addresses: LocationViewAddress[];
  /** Where the card starts; null suggests all of Malaysia alike and offers every saved address. */
  search: SearchAreas | null;
  children: ReactNode;
}) {
  const parts = usePathname().split("/");
  const product = bookableCategory(parts[parts.indexOf(slug) + 1]);
  return (
    <SearchProvider
      product={product ?? undefined}
      location={search ?? undefined}
      saved={{
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
 * Fills a place's saved address into the drop-off and brings the card
 * into view; nothing where the location's rule does not let a trip from it
 * end, as the empty drop-off does not offer it either. The pick-up may be
 * anywhere, but a trip to a place on the location's pages most likely
 * starts in the location, whose rule then decides; one from elsewhere
 * can still search the place in the drop-off.
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
      className={`mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-brand/35 px-[17px] text-[0.9rem] font-bold text-brand hover:border-brand hover:bg-brand-tint ${focus}`}
    >
      Take me here <span className="ml-2.5">→</span>
    </button>
  );
}
