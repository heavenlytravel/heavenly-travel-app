import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusIcon } from "@repo/ui/icons";
import { Languages } from "lucide-react";
import { FleetList } from "../../_components/FleetList";
import { FleetTabs } from "../../_components/FleetTabs";
import { requireMember, shellMember } from "../../_lib/access";
import { fleetCounts, vendorFleet } from "../../_lib/fleet";
import { Button } from "@repo/ui/button";
import { Avatar } from "../../_ui/parts";
import { BandHeading, Screen } from "../../_ui/Screen";

/**
 * Route: /guides. A vendor's own tour guides, for its owner and staff,
 * each opening the form the admin uses; only for a vendor that offers
 * tour guides or has some. A guide has no account: the vendor accepts
 * each trip for them. See docs/261103-tour-guide.md.
 */
export default async function GuidesPage() {
  const member = await requireMember();
  const fleet = await vendorFleet(member.vendor.id);
  const { guides } = fleet;
  if (!guides) notFound();
  const add = (
    <Button asChild variant="secondary" size="sm">
      <Link href="/~/guides/new">
        <PlusIcon />
        Add
      </Link>
    </Button>
  );
  return (
    <Screen
      member={shellMember(member)}
      band={
        <div className="grid gap-5">
          <BandHeading eyebrow={member.vendor.name} title="Fleet" action={add}>
            We offer you trips with a tour guide where each is based. You accept
            for them and tell them.
          </BandHeading>
          <FleetTabs current="guides" {...fleetCounts(fleet)} />
        </div>
      }
    >
      <FleetList
        items={guides.map((g) => ({
          id: g.id,
          lead: <Avatar name={g.name} />,
          title: g.name,
          detail: `${g.languages.join(", ") || "No language yet"} · ${g.location.name}`,
          isActive: g.isActive,
        }))}
        hrefOf={(id) => `/~/guides/${id}`}
        empty={{
          icon: Languages,
          title: "No tour guide yet",
          text: "Add one to be offered trips with a tour guide.",
          action: (
            <Button asChild>
              <Link href="/~/guides/new">
                <PlusIcon />
                Add a tour guide
              </Link>
            </Button>
          ),
        }}
      />
    </Screen>
  );
}
