import { GUIDE_DELETE_IMPACT } from "@repo/db";
import { getGuide, heldBookingsOf, listVendorOptions } from "@repo/db/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { DeleteButton } from "@repo/console/DeleteButton";
import { HistoryLink } from "../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../_lib/access";
import {
  ALL,
  guideHref,
  guidesHref,
  recordHistoryHref,
} from "../../../../../_lib/routes";
import {
  locationsVisible,
  scopeOf,
  type ConsoleScope,
} from "../../../../../_lib/scope";
import { deleteGuideAction, updateGuideAction } from "../actions";
import { GuideForm } from "@repo/console/GuideForm";

/**
 * Route: /[location]/fleet/guides/[guideId]. A tour guide, ours or
 * another vendor's: their name, whether they are active, their
 * languages, their vendor when not ours and their location, then their
 * form (their licence's expiry kept there, not watched), the way to
 * their history and the delete for one entered by mistake. Under `~` any
 * guide opens; under a location, one based elsewhere is not found.
 */
export default async function GuidePage({
  params,
}: PageProps<"/[location]/fleet/guides/[guideId]">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const { guideId } = await params;

  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<FormSkeleton sections={1} fields={4} />}
            side={<CardSkeleton rows={1} />}
          />
        </>
      }
    >
      {() => guideScreen(scope, guideId)}
    </Streamed>
  );
}

async function guideScreen(scope: ConsoleScope, guideId: string) {
  const [guide, held, locations, vendors] = await Promise.all([
    getGuide(guideId),
    heldBookingsOf({ guideId }, "number"),
    locationsVisible(),
    listVendorOptions(),
  ]);
  if (!guide) notFound();
  if (scope.location && guide.locationId !== scope.location.id) notFound();
  const href = guideHref(scope.slug, guide.id);

  return (
    <>
      <PageHeader
        title={guide.name}
        badge={
          <ServiceBadge active={guide.isActive} on="Active" off="Inactive" />
        }
        meta={[
          guide.languages.join(", "),
          guide.vendor.isOurs ? null : guide.vendor.name,
          guide.location.name,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <>
            <HistoryLink href={recordHistoryHref(href)} />
            <DeleteButton
              look="header"
              label="Delete tour guide"
              title={`Delete ${guide.name}?`}
              impact={GUIDE_DELETE_IMPACT}
              note="For a tour guide entered by mistake: one who has been on a trip is made inactive instead. Their history stays in the log. This cannot be undone."
              action={deleteGuideAction.bind(null, guide.id)}
              doneHref={guidesHref(scope.slug)}
              doneMessage={`Deleted ${guide.name}.`}
            />
          </>
        }
      />
      <GuideForm
        key={guide.id}
        scope={scope.slug ?? ALL}
        guide={guide}
        vendors={vendors}
        locations={locations}
        action={updateGuideAction}
        cancelHref={guidesHref(scope.slug)}
        held={held}
      />
    </>
  );
}
