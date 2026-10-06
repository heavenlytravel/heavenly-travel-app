import Link from "next/link";
import { formatLocalDateTime, formatMultiplier } from "@repo/db";
import { listStates } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { InfoTip } from "@repo/ui/info-tip";
import { Card, CardTitle } from "../../_components/Card";
import { PageHeader } from "../../_components/PageHeader";
import { Streamed, TableSkeleton } from "../../_components/Skeleton";
import { Table, TBody, Td, Th, THead } from "../../_components/Table";
import { requireAdmin } from "../../_lib/access";
import { stateHref } from "../../_lib/routes";
import { AddressTester } from "./AddressTester";

/**
 * Route: /coverage. Where the site sells: Malaysia's states, each with how
 * many of its districts are on and its price multiplier, and a field to
 * place a real address. Operation's screen behind `coverage.manage`.
 */
export default async function CoveragePage() {
  await requireAdmin("coverage.manage");

  return (
    <>
      <PageHeader
        title="Coverage"
        description="Each state lists its districts with a switch. A pickup is placed in a district by its coordinates; one outside every district that is on is told the area is not served yet."
      />

      <Card className="mt-6">
        <CardTitle description="Pick a real place to see the district its coordinates fall in and whether that district is on, as a booking would.">
          Test an address
        </CardTitle>
        <AddressTester hasGoogle={hasGooglePlaces} />
      </Card>

      <div className="mt-6">
        <Streamed fallback={<TableSkeleton columns={4} rows={8} />}>
          {() => statesTable()}
        </Streamed>
      </div>
    </>
  );
}

/** Every state with its districts on, its multiplier and its last change. */
async function statesTable() {
  const states = await listStates();

  return (
    <Table>
      <THead>
        <Th>State</Th>
        <Th>Districts on</Th>
        <Th>
          <span className="inline-flex items-center gap-1.5">
            Price
            <InfoTip text="The state's multiplier, applied to every price with a pickup in the state. ×1.00 means no change." />
          </span>
        </Th>
        <Th>Changed</Th>
      </THead>
      <TBody>
        {states.map((state) => {
          const on = state.districts.filter((d) => d.isActive).length;
          return (
            <tr
              key={state.code}
              className={on > 0 ? undefined : "text-neutral-500"}
            >
              <Td className="font-medium">
                <Link
                  href={stateHref(state.code)}
                  className="underline-offset-4 hover:underline"
                >
                  {state.name}
                </Link>
              </Td>
              <Td className="tabular-nums">
                {on} of {state.districts.length}
              </Td>
              <Td className="tabular-nums">
                {state.multiplier === 1
                  ? "no change"
                  : formatMultiplier(state.multiplier)}
              </Td>
              <Td className="text-neutral-600 tabular-nums">
                {state.changedAt ? formatLocalDateTime(state.changedAt) : "—"}
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );
}
