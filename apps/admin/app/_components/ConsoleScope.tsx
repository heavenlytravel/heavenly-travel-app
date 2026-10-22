"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SCOPE_COOKIE,
  scopeKey,
  scopeOfKey,
  scopeOfPath,
  type ConsoleScope,
} from "../_lib/routes";

/** A year: the scope is a habit of the admin's, not of a session. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const ScopeContext = createContext<ConsoleScope>("all");

/** The scope the console is in, for the picker in its header. */
export function useConsoleScope() {
  return useContext(ScopeContext);
}

/**
 * The scope of the page on screen: the location the path is inside, or
 * every location on the home and the sections across locations. A page
 * of the whole console keeps the scope last worked in, as the sidebar's
 * slot keeps its menu, and the cookie remembers it for such a page opened
 * afresh, where the slot reads it on the server. `remembered` is the
 * cookie as the layout read it.
 */
export function ConsoleScopeProvider({
  remembered,
  children,
}: {
  remembered: string;
  children: ReactNode;
}) {
  const fromPath = scopeOfPath(usePathname());
  const pathKey = fromPath ? scopeKey(fromPath) : null;
  const [lastKey, setLastKey] = useState(remembered);
  if (pathKey !== null && pathKey !== lastKey) setLastKey(pathKey);

  useEffect(() => {
    if (pathKey === null) return;
    document.cookie = `${SCOPE_COOKIE}=${pathKey}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }, [pathKey]);

  const key = pathKey ?? lastKey;
  const scope = useMemo(() => scopeOfKey(key), [key]);
  return (
    <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
  );
}
