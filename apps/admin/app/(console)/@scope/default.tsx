import { RememberedScopeNav } from "./_components/ScopeNav";

/**
 * The sidebar's scope on a page of the whole console opened afresh (the
 * media, the admins, the activity): the scope last worked in. A move to
 * such a page keeps the menu already on screen instead.
 */
export default function ScopeDefault() {
  return <RememberedScopeNav />;
}
