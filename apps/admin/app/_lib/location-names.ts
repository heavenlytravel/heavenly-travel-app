import "server-only";
import { listLocationNames } from "@repo/db/server";
import { cache } from "react";

/**
 * Every location by name, read once per request: the sidebar in the
 * layout and the page's own filter or form share the one query.
 */
export const locationNames = cache(() => listLocationNames());
