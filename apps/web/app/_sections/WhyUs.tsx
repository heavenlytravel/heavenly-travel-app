import { SECTION_LABELS, type PageSectionOf, type WhyUsIcon } from "@repo/db";
import {
  BanknoteIcon,
  CarPlainIcon,
  CheckIcon,
  ClockIcon,
  CoachIcon,
  MapIcon,
  MessageCircleIcon,
  RouteIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@repo/ui/icons";
import { SectionShell, type SectionLook } from "./SectionShell";

/** The icon each point may show, by its name in the content. */
const ICONS: Record<WhyUsIcon, typeof CheckIcon> = {
  check: CheckIcon,
  shield: ShieldCheckIcon,
  price: BanknoteIcon,
  support: MessageCircleIcon,
  clock: ClockIcon,
  team: UsersIcon,
  map: MapIcon,
  route: RouteIcon,
  car: CarPlainIcon,
  coach: CoachIcon,
};

/**
 * Why book with us. On the home page, the quiet strip under the hero, its
 * points side by side, with the title over it only when Marketing wrote
 * one; on a hub, a section of its own with a card for each point.
 */
export function WhyUs({
  look,
  section,
}: {
  look: SectionLook;
  section: PageSectionOf<"why-us">;
}) {
  if (look === "home") {
    return (
      <section
        id="why-us"
        aria-label={section.title ? undefined : SECTION_LABELS["why-us"]}
        aria-labelledby={section.title ? "why-us-title" : undefined}
        className="scroll-mt-8 border-b border-card-edge px-5 py-7 sm:px-[clamp(20px,5vw,78px)] sm:py-9"
      >
        {section.title && (
          <h2
            id="why-us-title"
            className="mb-5 text-center text-caps font-bold tracking-eyebrow text-brand uppercase"
          >
            {section.title}
          </h2>
        )}
        {/* Side by side from sm, or from lg when there are more than three. */}
        <ul
          className={`mx-auto grid max-w-[1240px] ${
            section.points.length > 3
              ? "lg:auto-cols-fr lg:grid-flow-col"
              : "sm:auto-cols-fr sm:grid-flow-col"
          }`}
        >
          {section.points.map((point, i) => {
            const Icon = ICONS[point.icon];
            return (
              <li
                key={i}
                className={`flex gap-[13px] border-b border-card-edge px-[5px] py-[11px] last:border-0 ${
                  section.points.length > 3
                    ? "lg:justify-center lg:border-r lg:border-b-0 lg:px-[22px] lg:py-0"
                    : "sm:justify-center sm:border-r sm:border-b-0 sm:px-[22px] sm:py-0"
                }`}
              >
                <Icon
                  aria-hidden
                  className="mt-0.5 size-6 shrink-0 text-brand"
                />
                <p>
                  <strong className="block">{point.title}</strong>
                  {point.text && (
                    <small className="mt-0.5 block text-caption text-muted">
                      {point.text}
                    </small>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
  return (
    <SectionShell look={look} id="why-us" section={section}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.points.map((point, i) => {
          const Icon = ICONS[point.icon];
          return (
            <li
              key={i}
              className="rounded-card border border-card-edge bg-white p-6"
            >
              <span className="grid size-11 place-items-center rounded-full bg-brand-tint text-brand">
                <Icon aria-hidden className="size-[22px]" />
              </span>
              <h3 className="mt-4 text-lead font-bold text-ink">
                {point.title}
              </h3>
              {point.text && <p className="mt-1.5 text-body">{point.text}</p>}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
