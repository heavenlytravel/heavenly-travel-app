import Link from "next/link";
import {
  OFFERING_FIELD_LABELS,
  TRIP_CATEGORY_LABELS,
  formatMyr,
  isTripCategory,
  modelChoiceOf,
  surchargeLabel,
  type DropoffRule,
} from "@repo/db";
import type { Offering } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { InfoTip } from "@repo/ui/info-tip";
import { cx } from "@repo/ui/cx";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  ThGroup,
  THeadRows,
} from "../../../../_components/Table";

const hours = (n: number) => `${n} h`;

/**
 * A location's classes at their metered rates and under their rules, a
 * row each, on sale or not: what a trip off the grid costs, and what
 * every booking of the class must keep to. The one-way rates go unused
 * when only the routes on the grid can be booked, so they are greyed
 * then; hourly hire is metered under every drop-off rule. With
 * `editHref` each row links to its class's editor at the location. Shown
 * on the location's Rates tab and on Rates across locations.
 */
export function MeteredRates({
  offerings,
  rule,
  editHref,
}: {
  offerings: Offering[];
  rule: DropoffRule;
  /** The editor of an offering, for the admins who change the rates. */
  editHref?: (offeringId: string) => string;
}) {
  const oneWayUnused = rule === "grid";
  const columns = editHref ? 10 : 9;
  const unused = oneWayUnused ? "text-slate-400" : undefined;

  return (
    <Table bare>
      <THeadRows>
        <tr>
          <ThGroup />
          <ThGroup span={3}>
            <span className="inline-flex items-center gap-1.5">
              {oneWayUnused ? "One-way, not used" : "One-way, off the grid"}
              <InfoTip
                text={
                  oneWayUnused
                    ? "Only the routes on the rate grid can be booked here, so no one-way trip is metered. Change the drop-off rule to meter the rest."
                    : "A one-way trip with no price on the grid costs the base fare plus the road distance at the rate per km, and never less than the minimum."
                }
              />
            </span>
          </ThGroup>
          <ThGroup span={2}>Hourly hire</ThGroup>
          <ThGroup />
          <ThGroup span={2}>Every booking</ThGroup>
          {editHref ? <ThGroup /> : null}
        </tr>
        <tr>
          <Th>Class</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.baseFareSen}</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.perKmSen}</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.minimumFareSen}</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.hourlyRateSen}</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.minHourlyHours}</Th>
          <Th align="right">To choose a model</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.minLeadHours}</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.cancellationCutoffHours}</Th>
          {editHref ? (
            <Th>
              <span className="sr-only">Edit</span>
            </Th>
          ) : null}
        </tr>
      </THeadRows>
      <TBody>
        {offerings.length === 0 ? (
          <EmptyRow colSpan={columns}>Nothing is sold here yet.</EmptyRow>
        ) : (
          offerings.map((offering) => {
            const { vehicleClass } = offering;
            const selling = offering.isActive && vehicleClass.isActive;
            const modelChoice = modelChoiceOf(offering);
            const money = (sen: number, dim?: string) => (
              <Td
                className={cx("text-right whitespace-nowrap tabular-nums", dim)}
              >
                {formatMyr(sen)}
              </Td>
            );
            return (
              <tr
                key={offering.id}
                className={selling ? undefined : "text-slate-500"}
              >
                <Td>
                  <span className="flex items-center gap-2 font-medium whitespace-nowrap">
                    {vehicleClass.name}
                    {selling ? null : <Badge>Off sale</Badge>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {isTripCategory(vehicleClass.category)
                      ? TRIP_CATEGORY_LABELS[vehicleClass.category]
                      : vehicleClass.category}
                  </span>
                </Td>
                {money(offering.baseFareSen, unused)}
                {money(offering.perKmSen, unused)}
                {money(offering.minimumFareSen, unused)}
                {money(offering.hourlyRateSen)}
                <Td className="text-right whitespace-nowrap tabular-nums">
                  {hours(offering.minHourlyHours)}
                </Td>
                <Td className="text-right whitespace-nowrap tabular-nums">
                  {modelChoice ? (
                    surchargeLabel(modelChoice)
                  ) : (
                    <span className="text-slate-500">Not offered</span>
                  )}
                </Td>
                <Td className="text-right whitespace-nowrap tabular-nums">
                  {hours(offering.minLeadHours)}
                </Td>
                <Td className="text-right whitespace-nowrap tabular-nums">
                  {hours(offering.cancellationCutoffHours)}
                </Td>
                {editHref ? (
                  <Td className="text-right">
                    <Link
                      href={editHref(offering.id)}
                      aria-label={`Edit ${vehicleClass.name}'s rates and rules`}
                      className="text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline"
                    >
                      Edit
                    </Link>
                  </Td>
                ) : null}
              </tr>
            );
          })
        )}
      </TBody>
    </Table>
  );
}
