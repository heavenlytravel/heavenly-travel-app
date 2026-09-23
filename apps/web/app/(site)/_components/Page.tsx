import type { ReactNode } from "react";
import Link from "next/link";

/** Presentational pieces the booking pages share. */

export const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

export const eyebrow =
  "text-[0.76rem] font-bold tracking-[0.25em] text-[#073c36] uppercase";

export const primaryButton = `inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-[#073c36] px-6 text-[1rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(7,60,54,0.18)] hover:bg-[#0b5048] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;

/** The quiet counterpart to `primaryButton`: an outlined button on white. */
export const secondaryButton = `inline-flex min-h-[48px] items-center justify-center rounded-[14px] border border-[#dce3e0] bg-white px-5 text-[0.95rem] font-bold whitespace-nowrap text-[#073c36] hover:border-[#073c36] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#dce3e0] ${focus}`;

/** A destructive action: filled red, used only after the customer confirms. */
export const dangerButton = `inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-[#b3261e] px-5 text-[0.95rem] font-bold whitespace-nowrap text-white hover:bg-[#961d16] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;

export const textLink = `font-semibold text-[#073c36] underline-offset-4 hover:underline ${focus}`;

export const control = `w-full rounded-xl border border-[#dce3e0] bg-white px-4 py-3 text-[#082f2b] outline-none placeholder:text-[#64706d]/80 focus:border-[#073c36] ${focus}`;

/** The white card with the home page's shadow, as a class for links and lists. */
export const panel =
  "rounded-[18px] bg-white p-5 shadow-[0_12px_35px_rgba(9,43,39,0.08)] sm:p-7";

export function PageTitle({
  eyebrow: above,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <p className={`${eyebrow} mb-2`}>{above}</p>
      <h1 className="font-(family-name:--font-display) text-[clamp(2.2rem,4vw,3.2rem)] leading-none">
        {title}
      </h1>
      {children && (
        <p className="mt-3 max-w-[60ch] text-[1.02rem] text-[#67726f]">
          {children}
        </p>
      )}
    </div>
  );
}

/** A white card with the home page's shadow. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${panel} ${className}`}>{children}</section>;
}

/** Something stopped the flow: the reason and where to go instead. */
export function Stop({
  title,
  message,
  href = "/#booking",
  linkLabel = "Change the search",
}: {
  title: string;
  message: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <Panel className="max-w-[560px]">
      <h2 className="font-(family-name:--font-display) text-[1.7rem] leading-tight">
        {title}
      </h2>
      <p className="mt-2 text-[#324844]">{message}</p>
      <Link href={href} className={`${primaryButton} mt-6`}>
        {linkLabel}
      </Link>
    </Panel>
  );
}

/** Label and value pairs, one per line. */
export function Rows({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y divide-[#edf0ef]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-6 py-2.5">
          <dt className="shrink-0 text-[#67726f]">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
