import { formatMyr, priceRows, type TripPriceBreakdown } from "@repo/db";
import { Rows } from "../../_components/Page";

/** The receipt behind a price: the rates used, the distance or hours, the multiplier. */
export function PriceBreakdown({ price }: { price: TripPriceBreakdown }) {
  const rows: [string, React.ReactNode][] = [
    ...priceRows(price),
    [
      "Total",
      <span key="total" className="text-[1.15rem] font-bold text-[#073c36]">
        {formatMyr(price.totalSen)}
      </span>,
    ],
  ];
  return <Rows rows={rows} />;
}
