import { useConfirm } from "@repo/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps an admin from losing edits they have not saved. While `dirty`, a
 * click on a link to another page of the console is held and an alert
 * dialog asks first, `lost` saying what goes; "Leave" follows the link,
 * "Stay" keeps the admin where they are. Closing or reloading the tab asks
 * the browser's own question, the only one a page may ask there. A link
 * opened in a new tab loses nothing and is let through. The browser's back
 * button is not caught: the App Router gives no way to stop it. Render the
 * returned dialog once.
 */
export function useLeaveGuard(dirty: boolean, lost: string) {
  const router = useRouter();
  const [dialog, confirm] = useConfirm();

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    // On the window in the capture phase, so it runs before React's own
    // listeners: a held click never reaches next/link.
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.download) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      const here = window.location;
      if (url.pathname === here.pathname && url.search === here.search) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void confirm({
        title: "Leave without saving?",
        description: lost,
        action: "Leave",
        cancel: "Stay",
        danger: true,
      }).then((leave) => {
        if (!leave) return;
        if (url.origin === here.origin) {
          router.push(`${url.pathname}${url.search}${url.hash}`);
        } else {
          // Leaving the console: the browser's own question is not asked again.
          window.removeEventListener("beforeunload", warn);
          window.location.assign(url.href);
        }
      });
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("click", guard, true);
    };
  }, [dirty, lost, confirm, router]);

  return dialog;
}
