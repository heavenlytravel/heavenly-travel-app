import { redirect } from "next/navigation";

// Connect signs vendors up through their registration, /register: the
// whole form, then the code that makes the account. Drivers sign in with
// the email their vendor entered. An old link to here lands there.
export default function SignUpPage() {
  redirect("/register");
}
