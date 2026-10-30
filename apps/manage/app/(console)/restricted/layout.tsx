import { ConsoleShell } from "../../_components/ConsoleShell";

/** The console's chrome round /restricted, on every location: it stays at the root, outside the location's segment. */
export default function RestrictedLayout({
  children,
}: LayoutProps<"/restricted">) {
  return (
    <ConsoleShell scope={{ slug: null, location: null }}>
      {children}
    </ConsoleShell>
  );
}
