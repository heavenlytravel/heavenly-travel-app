"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { StepMark } from "@repo/console/StepMark";
import { cx } from "@repo/ui/cx";
import { ChevronDownIcon, ChevronRightIcon } from "@repo/ui/icons";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuCluster,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebarCollapsed,
} from "@repo/ui/sidebar";
import {
  MENU_ICONS,
  pageOnScreen,
  type Menu,
  type MenuCount,
  type MenuMark,
  type MenuPage,
  type MenuSection,
} from "./menu";

/**
 * The one menu, in the navy sidebar: its groups under their names, each
 * section a row in the same place whatever the location. A section of one
 * page is a link. A section of several opens in place under its row, one
 * at a time: opening another closes the one that was open. The section of
 * the page on screen opens as its page loads. The page on screen is a
 * bright white pill; its open section is lit softly. Counts stand only
 * where something waits. Collapsed to a rail, the open section's pages
 * stand as icons of their own, and a closed section's icon opens it. See
 * docs/261029-manage-signature-overhaul.md, "The menu".
 */
export function ConsoleMenu({ menu }: { menu: Menu }) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const on = pageOnScreen(menu, pathname);
  const onSection = on?.section.key ?? null;
  // The section open, and the one the page on screen was in when it was
  // set, so a page of another section opens that one.
  const [open, setOpen] = useState({ key: onSection, at: onSection });
  if (open.at !== onSection) setOpen({ key: onSection, at: onSection });

  return (
    <nav aria-label={menu.label}>
      {menu.groups.map((group) => (
        <SidebarGroup key={group.key}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.sections.map((section) => {
              const [only] = section.pages;
              if (section.pages.length === 1 && only) {
                return (
                  <PageRow
                    key={section.key}
                    page={only}
                    current={only === on?.page}
                  />
                );
              }
              const isOpen = open.key === section.key;
              const toggle = () =>
                setOpen({ key: isOpen ? null : section.key, at: onSection });
              return collapsed && isOpen ? (
                <SidebarMenuCluster key={section.key} label={section.label}>
                  {section.pages.map((page) => (
                    <PageRow
                      key={page.key}
                      page={page}
                      current={page === on?.page}
                      tooltip={`${section.label} / ${page.label}`}
                    />
                  ))}
                </SidebarMenuCluster>
              ) : (
                <SectionRows
                  key={section.key}
                  section={section}
                  open={isOpen}
                  onToggle={toggle}
                  current={on?.page}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
      {menu.foot && !collapsed ? (
        <p className="px-6 pt-2 pb-3 text-xs text-white/70">{menu.foot}</p>
      ) : null}
    </nav>
  );
}

/** A page's row: its icon and name, then what waits on it or its setup mark. */
function PageRow({
  page,
  current,
  sub = false,
  tooltip,
}: {
  page: MenuPage;
  current: boolean;
  /** Under its section's row, opened in place. */
  sub?: boolean;
  tooltip?: string;
}) {
  const collapsed = useSidebarCollapsed();
  const Icon = MENU_ICONS[page.icon];
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        active={current}
        size={sub ? "sm" : "default"}
        tooltip={tooltip ?? page.label}
      >
        <Link href={page.href}>
          {sub ? null : <Icon />}
          <SidebarLabel className="min-w-0 flex-1">{page.label}</SidebarLabel>
          {collapsed ? null : (
            <RowEnd count={page.count} mark={page.mark} current={current} />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** A section of several pages: its row, which opens or closes it, and its pages under it while open. */
function SectionRows({
  section,
  open,
  onToggle,
  current,
}: {
  section: MenuSection;
  open: boolean;
  onToggle: () => void;
  current: MenuPage | undefined;
}) {
  const collapsed = useSidebarCollapsed();
  const Icon = MENU_ICONS[section.icon];
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;
  return (
    <>
      <SidebarMenuItem>
        {/* On the rail, a closed section's icon opens it there, as its pages' icons. */}
        <SidebarMenuButton
          open={open}
          tooltip={section.label}
          aria-expanded={open}
          onClick={onToggle}
        >
          <Icon />
          <SidebarLabel className="min-w-0 flex-1">
            {section.label}
          </SidebarLabel>
          {collapsed ? null : (
            <>
              {open ? null : (
                <RowEnd count={section.count} mark={section.mark} />
              )}
              <Chevron className="text-azure-light/80" />
            </>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
      {open && !collapsed ? (
        <SidebarMenuSub label={section.label}>
          {section.pages.map((page) => (
            <PageRow
              key={page.key}
              page={page}
              current={page === current}
              sub
            />
          ))}
        </SidebarMenuSub>
      ) : null}
    </>
  );
}

/** What stands at a row's end: its count, its setup mark. */
function RowEnd({
  count,
  mark,
  current = false,
}: {
  count?: MenuCount;
  mark?: MenuMark;
  current?: boolean;
}) {
  return (
    <>
      {count ? <Count count={count} current={current} /> : null}
      {mark ? (
        <StepMark
          done={mark === "done"}
          className={cx(
            "size-4",
            mark === "todo" && !current && "border-white/50 text-white/70",
          )}
        />
      ) : null}
    </>
  );
}

/** What waits on a row, in a pill at its end, read out in words: "3 received". Amber, brand blue on the white pill. */
function Count({ count, current }: { count: MenuCount; current: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cx(
          "grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-2xs font-semibold tabular-nums",
          current ? "bg-brand text-white" : "bg-warning-dot text-ink",
        )}
      >
        {count.value}
      </span>
      <span className="sr-only">, {count.label}</span>
    </>
  );
}
