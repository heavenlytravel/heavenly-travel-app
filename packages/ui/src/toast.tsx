"use client";

import { Toaster as Sonner, toast } from "sonner";

/**
 * A short message that a change went through, at the corner of the screen,
 * after shadcn's toast (Sonner): "Draft saved", "Booking confirmed". It
 * fades by itself. Mount `Toaster` once in the app's layout and call
 * `toast.success("…")` after a write. A problem the admin must act on stays
 * beside the field or the button it is about, not in a toast.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={3500}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "ui:rounded-xl ui:border ui:border-neutral-200 ui:bg-white ui:text-neutral-900 ui:shadow-[0_10px_30px_rgba(15,23,42,0.12)]",
          title: "ui:text-sm ui:font-medium",
          description: "ui:text-sm ui:text-neutral-600",
          icon: "ui:text-emerald-600",
        },
      }}
    />
  );
}

export { toast };
