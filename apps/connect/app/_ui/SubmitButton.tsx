"use client";

import { Button, type ButtonProps } from "@repo/ui/button";
import { useFormStatus } from "react-dom";

/** A form's submit that spins while its server action runs: for a plain `<form action>` on a server page. */
export function SubmitButton(props: Omit<ButtonProps, "type" | "pending">) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" pending={pending} />;
}
