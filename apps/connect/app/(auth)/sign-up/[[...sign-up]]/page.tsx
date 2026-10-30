import { redirect } from "next/navigation";

// Connect takes no sign-ups for now: drivers sign in with the email their
// vendor or Operation entered, and vendors are entered by staff in
// manage. A vendor's own sign-up returns with Connect's landing page and
// its registration form. An old link to here lands on sign-in.
export default function SignUpPage() {
  redirect("/sign-in");
}
