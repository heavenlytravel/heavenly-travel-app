"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Opens another page from a form, and says so until that page is on
 * screen. A link click is covered by the loading line in the root layout;
 * a form has no link, so its button shows `pending` instead. The move is a
 * transition: the page on screen stays until the next one has rendered,
 * which is when `pending` turns false.
 */
export function useNavigate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (href: string) => startTransition(() => router.push(href));
  return { pending, go };
}
