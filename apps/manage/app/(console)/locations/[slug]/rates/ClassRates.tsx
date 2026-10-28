import Link from "next/link";
import {
  OFFERING_FIELD_LABELS,
  TRIP_CATEGORY_LABELS,
  formatMyr,
  isTripCategory,
  modelChoiceOf,
  surchargeLabel,
} from "@repo/db";
import type { Offering } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { InfoTip } from "@repo/ui/info-tip";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  ThGroup,
  THeadRows,
} from "@repo/console/Table";

const hours = (n: number) => `${n} h`;

/**
 * A location's classes at their rates and under their rules, a row each,
 * on sale or not: the rate per extra km a one-way trip pays for the road
 * past a zone's edge, the hourly rate, and what every booking of the
 * class must keep to. A one-way trip is otherwise its cell on the grid.
 * With `editHref` each row links to its class's editor at the location.
 * Shown on the location's Rates tab and on Rates across locations.
 */
export function ClassRates({
  offerings,
  editHref,
}: {
  offerings: Offering[];
  /** The editor of an offering, for the admins who change the rates. */
  editHref?: (offeringId: string) => string;
}) {
  const columns = editHref ? 8 : 7;

  return (
    <Table bare>
      <THeadRows>
        <tr>
          <ThGroup />
          <ThGroup>
            <span className="inline-flex items-center gap-1.5">
              One-way
              <InfoTip text="A one-way trip costs its cell on the rate grid. An address outside every zone adds its road to the nearest zone's edge at this rate, when the trip runs past the edge." />
            </span>
          </ThGroup>
          <ThGroup span={2}>Hourly hire</ThGroup>
          <ThGroup />
          <ThGroup span={2}>Every booking</ThGroup>
          {editHref ? <ThGroup /> : null}
        </tr>
        <tr>
          <Th>Class</Th>
          <Th align="right">{OFFERING_FIELD_LABELS.perKmSen}</Th>
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
            const money = (sen: number) => (
              <Td className="text-right whitespace-nowrap tabular-nums">
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
                {money(offering.perKmSen)}
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
