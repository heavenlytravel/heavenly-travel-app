import { redirect } from "next/navigation";

/** Route: /join. Another name for the registration, /register. */
export default function JoinPage() {
  redirect("/register");
}
