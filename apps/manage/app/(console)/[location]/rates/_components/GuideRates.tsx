"use client";

import {
  GUIDE_LANGUAGES,
  GUIDE_RATE_PRICE_LABELS,
  GUIDE_RATE_PRICES,
  plural,
  ringgitInputValue,
  type GuideRatePrice,
  type GuideRateRow,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { cx } from "@repo/ui/cx";
import { Switch } from "@repo/ui/switch";
import { toast } from "@repo/ui/toast";
import { errorOf } from "@repo/console/action-state";
import { useLeaveGuard } from "@repo/console/use-leave-guard";
import { useCallback, useState, useTransition } from "react";
import { movedRow, RowControls } from "../../../../_components/RowControls";
import { setGuideRatesAction } from "./actions";
import { CellKey, EMPTY_CELL, PriceCell, readCell, senOf } from "./cells";
import { SaveBar, type SaveStatus } from "./SaveBar";

/** One language's row as the page holds it: on sale or not, and each price as typed. */
type Row = { isActive: boolean } & Record<GuideRatePrice, string>;
type Values = Record<string, Row>;

function valuesOf(rows: readonly GuideRateRow[]): Values {
  const stored = new Map(rows.map((row) => [row.language, row]));
  return Object.fromEntries(
    GUIDE_LANGUAGES.map((language) => {
      const row = stored.get(language);
      return [
        language,
        {
          isActive: row?.isActive ?? false,
          ...(Object.fromEntries(
            GUIDE_RATE_PRICES.map((key) => [
              key,
              row?.[key] != null ? ringgitInputValue(row[key]) : "",
            ]),
          ) as Record<GuideRatePrice, string>),
        },
      ];
    }),
  );
}

/**
 * The languages in the location's order: those it keeps, in theirs, then
 * the rest. One stored but no longer on the list is left out, as the grid
 * has no row for it.
 */
function orderOf(rows: readonly GuideRateRow[]): string[] {
  const listed: readonly string[] = GUIDE_LANGUAGES;
  const kept = rows
    .map((row) => row.language)
    .filter((language) => listed.includes(language));
  return [
    ...kept,
    ...GUIDE_LANGUAGES.filter((language) => !kept.includes(language)),
  ];
}

/** The rows as the action reads them (`parseGuideRates`), in their order. */
const postedOf = (values: Values, order: readonly string[]) =>
  order.map((language) => ({ language, ...values[language]! }));

const HEADING =
  "border-b border-hairline px-3 py-2.5 align-bottom font-semibold text-body";

/**
 * A location's tour guide price list, in the rate grid's look: a row per
 * language, switched on to sell it on the website, and its price one-way,
 * for a 4, 8 or 12-hour hire, and per hour past the hire. A language is
 * offered on a trip only while it is on and the trip's prices are set: an
 * empty cell is not sold. Customers see the languages in the order set
 * here, with the arrows. Saved whole.
 * Read only for the teams that read the rates. See
 * docs/261103-tour-guide.md, "Guide rates".
 */
export function GuideRates({
  locationId,
  rows,
  readOnly = false,
}: {
  locationId: string;
  rows: GuideRateRow[];
  readOnly?: boolean;
}) {
  const [saved, setSaved] = useState<Values>(() => valuesOf(rows));
  const [values, setValues] = useState<Values>(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedOrder, setSavedOrder] = useState(() => orderOf(rows));
  const [order, setOrder] = useState(savedOrder);

  const invalid = new Set<string>();
  let changes = order.join() === savedOrder.join() ? 0 : 1;
  for (const language of GUIDE_LANGUAGES) {
    const now = values[language]!;
    const was = saved[language]!;
    if (now.isActive !== was.isActive) changes += 1;
    for (const key of GUIDE_RATE_PRICES) {
      if (!readCell(now[key]).ok) invalid.add(`${language}|${key}`);
      else if (senOf(now[key]) !== senOf(was[key])) changes += 1;
    }
  }
  const dirty = changes + invalid.size > 0;
  const leaveDialog = useLeaveGuard(
    dirty,
    "The tour guide rates changed since the last save are lost.",
  );

  // Stable, as it only sets state, so a price cell redraws alone.
  const edit = useCallback((language: string, patch: Partial<Row>) => {
    setError(null);
    setValues((current) => ({
      ...current,
      [language]: { ...current[language]!, ...patch },
    }));
  }, []);
  /** A price cell, `language|price`, as typed. */
  const editCell = useCallback(
    (cell: string, text: string) => {
      const [language = "", key = ""] = cell.split("|");
      edit(language, { [key]: text });
    },
    [edit],
  );

  function save() {
    if (invalid.size > 0) return;
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(
          setGuideRatesAction(locationId, postedOf(values, order)),
        ),
      );
      if (refused) {
        setError(refused);
        return;
      }
      setSaved(values);
      setSavedOrder(order);
      setError(null);
      toast.success("Tour guide rates saved.");
    });
  }

  let status: SaveStatus;
  if (pending) status = { tone: "idle", text: "Saving…" };
  else if (error) status = { tone: "error", text: error };
  else if (invalid.size > 0) {
    status = {
      tone: "error",
      text: `${invalid.size === 1 ? "One cell is" : `${invalid.size} cells are`} not a price: enter RM with at most two decimals, or leave it empty.`,
    };
  } else if (dirty) {
    status = { tone: "dirty", text: `${plural(changes, "unsaved change")}.` };
  } else status = { tone: "idle", text: "No unsaved changes." };

  const onSale = GUIDE_LANGUAGES.filter(
    (language) =>
      saved[language]!.isActive &&
      GUIDE_RATE_PRICES.some((key) => senOf(saved[language]![key]) !== null),
  ).length;

  return (
    <>
      <div className="relative isolate max-h-[70vh] overflow-auto overscroll-x-contain border-b border-hairline">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-(--layer-raised) bg-shade text-2xs text-muted">
            <tr>
              {readOnly ? null : (
                <th scope="col" className={cx(HEADING, "pl-3 text-left")}>
                  <span className="sr-only">Order</span>
                </th>
              )}
              <th
                scope="col"
                className={cx(HEADING, readOnly ? "pl-5" : "pl-0", "text-left")}
              >
                Language
              </th>
              <th scope="col" className={cx(HEADING, "text-left")}>
                On the Website
              </th>
              {GUIDE_RATE_PRICES.map((key) => (
                <th key={key} scope="col" className={cx(HEADING, "text-right")}>
                  {GUIDE_RATE_PRICE_LABELS[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((language, index) => {
              const row = values[language]!;
              return (
                <tr key={language}>
                  {readOnly ? null : (
                    <td className="border-b border-hairline pr-1 pl-3">
                      <RowControls
                        name={language}
                        isFirst={index === 0}
                        isLast={index === order.length - 1}
                        disabled={pending}
                        onMove={(by) => {
                          setError(null);
                          setOrder(movedRow(order, index, by));
                        }}
                      />
                    </td>
                  )}
                  <th
                    scope="row"
                    className={cx(
                      "border-b border-hairline py-0 pr-3 text-left align-middle font-medium whitespace-nowrap text-ink",
                      readOnly ? "pl-5" : "pl-0",
                    )}
                  >
                    {language}
                  </th>
                  <td className="border-b border-hairline px-3">
                    <Switch
                      checked={row.isActive}
                      disabled={readOnly || pending}
                      label={`Sell a ${language} guide on the website`}
                      onCheckedChange={(isActive) =>
                        edit(language, { isActive })
                      }
                    />
                  </td>
                  {GUIDE_RATE_PRICES.map((key) => {
                    const id = `${language}|${key}`;
                    const text = row[key];
                    return (
                      <PriceCell
                        key={key}
                        label={`${language}, ${GUIDE_RATE_PRICE_LABELS[key]}`}
                        text={text}
                        saved={saved[language]![key]}
                        invalid={invalid.has(id)}
                        readOnly={readOnly}
                        pending={pending}
                        cell={id}
                        onEdit={editCell}
                        className="border-b border-hairline"
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 px-5 py-4 text-xs text-muted">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <CellKey swatch={cx("border-edge", EMPTY_CELL)}>
            Empty: not sold for that trip
          </CellKey>
          {readOnly ? null : (
            <CellKey swatch="border-brand bg-brand-tint">
              Changed, not saved
            </CellKey>
          )}
          <span className="tabular-nums">
            {plural(onSale, "language")} on the website
          </span>
        </p>
        <p className="leading-relaxed">
          A customer sees a language only while it is on the website and the
          trip&apos;s price is set: Transfer for a transfer, the hire&apos;s
          duration for an hourly one, and Extra hour too when they add hours.
          They see the languages in this order. Any other language they may ask
          for, free; Operation amends the trip once a guide is found. A
          guide&apos;s price has no surcharge. A coach must take a guide while a
          language is on sale for it.
        </p>
      </div>

      {readOnly ? null : (
        <>
          <SaveBar
            dirty={dirty}
            pending={pending}
            status={status}
            canSave={invalid.size === 0}
            onDiscard={() => {
              setValues(saved);
              setOrder(savedOrder);
              setError(null);
            }}
            onSave={save}
            label="Save Tour Guide Rates"
          />
          {leaveDialog}
        </>
      )}
    </>
  );
}
