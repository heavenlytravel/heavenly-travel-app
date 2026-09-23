import { formatMyr, type CarPriceBreakdown } from "@repo/db";
import { Rows } from "../../_components/Page";

/** The receipt behind a price: the rates used, the distance or hours, the multiplier. */
export function PriceBreakdown({ price }: { price: CarPriceBreakdown }) {
  const rows: [string, React.ReactNode][] = [];
  if (price.mode === "oneway" && price.distanceKm !== null) {
    const metered =
      price.rates.baseFareSen +
      Math.round(price.rates.perKmSen * price.distanceKm);
    rows.push(["Base fare", formatMyr(price.rates.baseFareSen)]);
    rows.push([
      `${formatMyr(price.rates.perKmSen)} per km × ${price.distanceKm.toFixed(1)} km`,
      formatMyr(metered - price.rates.baseFareSen),
    ]);
    if (metered < price.rates.minimumFareSen) {
      rows.push(["Minimum fare applies", formatMyr(price.subtotalSen)]);
    }
  } else if (price.hours !== null) {
    rows.push([
      `${formatMyr(price.rates.hourlyRateSen)} per hour × ${price.hours} hours`,
      formatMyr(price.subtotalSen),
    ]);
  }
  if (price.multiplier !== 1) {
    rows.push([`Area rate × ${price.multiplier}`, formatMyr(price.totalSen)]);
  }
  rows.push([
    "Total",
    <span key="total" className="text-[1.15rem] font-bold text-[#073c36]">
      {formatMyr(price.totalSen)}
    </span>,
  ]);
  return <Rows rows={rows} />;
}
