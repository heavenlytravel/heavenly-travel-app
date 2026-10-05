import Link from "next/link";
import { formatLocalDateTime } from "@repo/db";
import { getState, listCoverageActivity } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  HeaderSkeleton,
  Streamed,
  TableSkeleton,
} from "../../../_components/Skeleton";
import { Table, TBody, Td, Th, THead } from "../../../_components/Table";
import { requireAdmin } from "../../../_lib/access";
import { COVERAGE_PATH } from "../../../_lib/routes";
import { DistrictSwitch } from "./DistrictSwitch";
import { MultiplierForm } from "./MultiplierForm";

/**
 * Route: /coverage/[code]. One state for Operation: its districts with
 * their switches, its multiplier, and the history of both.
 */
export default async function StatePage({
  params,
}: PageProps<"/coverage/[code]">) {
  await requireAdmin("coverage.manage");
  const { code } = await params;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={COVERAGE_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All states
        </Link>
      </p>
      <Streamed
        fallback={
          <>
            <HeaderSkeleton />
            <DetailSkeleton
              main={<TableSkeleton columns={3} rows={8} />}
              side={
                <>
                  <CardSkeleton rows={1} />
                  <CardSkeleton rows={4} />
                </>
              }
            />
          </>
        }
      >
        {() => stateDetails({ code })}
      </Streamed>
    </>
  );
}

/** The state under its name: its districts, its multiplier and its history. */
async function stateDetails({ code }: { code: string }) {
  const state = await getState(code);
  if (!state) notFound();
  const history = await listCoverageActivity(state);
  const on = state.districts.filter((d) => d.isActive).length;

  return (
    <>
      <PageHeader
        title={state.name}
        description={`${on} of ${state.districts.length} districts on.`}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-6">
          <Table>
            <THead>
              <Th>District</Th>
              <Th>
                <span className="inline-flex items-center gap-1.5">
                  Served
                  <InfoTip text="Off means a pickup in this district is told the area is not served yet. Existing bookings are not changed." />
                </span>
              </Th>
              <Th>Changed</Th>
            </THead>
            <TBody>
              {state.districts.map((district) => (
                <tr
                  key={district.code}
                  className={district.isActive ? undefined : "text-neutral-500"}
                >
                  <Td className="font-medium">{district.name}</Td>
                  <Td>
                    <DistrictSwitch
                      stateCode={state.code}
                      code={district.code}
                      name={district.name}
                      active={district.isActive}
                    />
                  </Td>
                  <Td className="text-neutral-600 tabular-nums">
                    {formatLocalDateTime(district.updatedAt)}
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Price
                <InfoTip text="Applied to every price with a pickup in this state, on new quotes at once. A booking keeps the price it was made at." />
              </span>
            </CardTitle>
            <MultiplierForm code={state.code} multiplier={state.multiplier} />
          </Card>
          <Card>
            <CardTitle>History</CardTitle>
            <ActivityHistory
              entries={history}
              emptyMessage="No changes recorded for this state or its districts."
            />
          </Card>
        </div>
      </div>
    </>
  );
}
