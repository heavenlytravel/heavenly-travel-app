"use client";

import { Toaster as Sonner, toast } from "sonner";

/**
 * A short message that a change went through, at the corner of the screen,
 * after shadcn's toast (Sonner): "Draft saved", "Booking confirmed". It
 * fades by itself. Mount `Toaster` once in the app's layout and call
 * `toast.success("…")` after a write; work that takes a while, an
 * upload, shows `toast.loading` under an id and turns into its success.
 * A problem the admin must act on stays beside the field or the button it
 * is about, not in a toast.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={3500}
      gap={8}
      // Above the dock a phone has at its foot, where there is one (styles.css).
      offset={{ bottom: "var(--ui-dock-room, 24px)" }}
      mobileOffset={{ bottom: "var(--ui-dock-room, 16px)" }}
      toastOptions={{
        classNames: {
          toast:
            "ui:rounded-xl ui:border ui:border-slate-200 ui:bg-white ui:text-slate-900 ui:shadow-[0_10px_30px_rgba(15,23,42,0.12)]",
          title: "ui:text-sm ui:font-medium",
          description: "ui:text-sm ui:text-slate-600",
          icon: "ui:text-emerald-600",
        },
      }}
    />
  );
}

export { toast };
