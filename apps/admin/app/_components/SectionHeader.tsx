import { Header, type HeaderProps } from "./PageHeader";

/**
 * The heading of a part of a page that already has its `PageHeader`: a tab
 * of a location, or an editor under it. The same shape, one level down.
 */
export function SectionHeader(props: HeaderProps) {
  return <Header level={2} {...props} />;
}
